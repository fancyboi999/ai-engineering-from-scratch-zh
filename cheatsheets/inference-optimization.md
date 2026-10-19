---
id: inference-optimization
title: 推理优化：KV 缓存、量化与批处理
subtitle: 估算 KV 缓存、持续批处理、选择量化格式，并衡量用户实际感受到的性能。
hue: 180
sources: phases/07-transformers-deep-dive/12-kv-cache-flash-attention, phases/10-llms-from-scratch/11-quantization, phases/10-llms-from-scratch/12-inference-optimization, phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding, phases/17-infrastructure-and-production/08-inference-metrics-goodput, phases/17-infrastructure-and-production/09-production-quantization
code: IO
---

## 任务
type: task-table
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md

| 任务 | 代码 |
|---|---|
| 复用共享 prompt 的 KV | `--enable-prefix-caching` |
| 以 FP8 存储 KV 缓存 | `--kv-cache-dtype fp8` |
| 将模型拆到 4 张 GPU | `--tensor-parallel-size 4` |
| 限制序列长度 | `--max-model-len 32768` |
| 设置 KV 块的 HBM 比例 | `--gpu-memory-utilization 0.9` |
| 开启 EAGLE-3 草稿 | `speculative_config` 中设 `"method": "eagle3"` |
| 读取每次请求的接受量 | `spec_decode_metrics.accepted_tokens_per_request` |
| 在 transformers 中使用 Flash Attention | `attn_implementation="flash_attention_2"` |

## 部署模型服务
type: annotated-code
lang: bash
from: phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md

```bash
pip install vllm  # 安装引擎
vllm serve meta-llama/Llama-3.1-70B-Instruct \  # 要部署的模型
    --tensor-parallel-size 4 \  # 权重分到 4 张 GPU
    --max-model-len 32768 \  # 最长序列
    --enable-prefix-caching \  # 复用共享前缀的 KV
    --kv-cache-dtype fp8  # FP8 KV，需要验证精度
```

## Python 离线批处理
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md, phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md

```python
from vllm import LLM, SamplingParams
llm = LLM(
    model="meta-llama/Meta-Llama-3-70B-Instruct",
    tensor_parallel_size=4,  # 4 张 GPU
    enable_prefix_caching=True,  # 跳过共享前缀的预填充
    max_model_len=8192,  # 上下文上限
    gpu_memory_utilization=0.9,  # KV 块的 HBM 比例
)
params = SamplingParams(temperature=0.7, max_tokens=256)
outputs = llm.generate(["<prompt>"], params)  # 内部采用持续批处理
```

## 公式
type: concepts
from: phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md

- **KV 缓存大小**：`2 * num_layers * num_kv_heads * head_dim * seq_len * bytes_per_param`。
- **Llama 3 70B，BF16**：每 token 320 KB，4,096 token 为 1.28 GB，128K 为 40 GB。
- **ops:byte**：每 token 的 FLOPs 除以读取字节数。批量 1 时解码约为 1，因此受内存带宽限制。
- **TTFT**：`queue_time + network_request + prefill_time`。
- **E2E**：`TTFT + TPOT * output_tokens + network_response`。
- **推测加速比**：`(1 + K * alpha) / (1 + epsilon)`，K=5、alpha=0.7 时为 4.1x。
- **INT8 缩放**：先 `max(abs(tensor)) / 127`，再 `clamp(round(tensor / scale), -128, 127)`。
- **有效吞吐率**：同时满足 TTFT、TPOT、E2E 上限的请求比例。

## 推理服务引擎
type: architecture
from: phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md

```arch
node | wait | 1,1 | 等待队列 | 新请求
node | sched | 2,1 | 调度器 | 每个解码步骤运行
node | run | 3,1 | RUNNING 列表 | 预填充与解码
node | pool | 2,2 | KV 块池 | 每块 16 个 token
node | table | 1,2 | 块表 | 逻辑到物理映射
node | gpu | 3,2 | 融合前向传播 | 一次 GPU 调用
node | draft | 3,3 | 草稿头 | 提议 K 个 token
edge | wait | sched | 接纳
edge | sched | run | 批次
edge | sched | pool | 分配
edge | table | pool | 映射
edge | run | gpu | 前向传播
edge | draft | gpu | 验证
```

## 调度器的一次迭代
type: flow
from: phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md

1. **调度器**：移除达到 EOS 或 max_tokens 的序列。
2. **分配器**：将已完成序列的块归还池中。
3. **调度器**：只要有空闲 KV 块，就接纳等待中的序列。
4. **调度器**：为预填充中的 prompt 添加一个 512 token 的分块。
5. **调度器**：为其他每个运行中序列添加一个解码 token。
6. **GPU**：一次融合前向传播运行整个批次。
7. **分配器**：序列超出现有块容量时再添加一个块。

## 常用默认值
type: defaults
from: phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| PagedAttention 块 | 16 token | 碎片率低于 4% |
| 分块预填充分片 | 512 token | 保护 P99 ITL |
| `--gpu-memory-utilization` | 0.9 | 扣除权重后用于 KV 的 HBM |
| `speculative_config` | 主动开启 | 没有配置就不加速 |
| GGUF 量化 | Q4_K_M | CPU 与边缘推理 |
| 数据中心 INT4 | AWQ | 需要多 LoRA 时除外 |
| PTQ 校准数据 | 128-1024 个样例 | 与部署领域一致 |

## 选择量化格式
type: command-table
from: phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 命令 | 作用 |
|---|---|
| `GGUF Q4_K_M` | 通过 llama.cpp 在 CPU 与边缘部署 |
| `GPTQ` | vLLM 上的多 LoRA，使用 Marlin 内核 |
| `AWQ` | 无 LoRA 的 GPU 对话，7B 约 741 tok/s |
| `FP8` | 推理、代码、医疗领域，接近无损 |
| `NVFP4` | Blackwell，逐模型验证质量 |
| `FP8 KV` | 独立选择，会影响注意力精度 |

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md, phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 长 prompt 导致 P99 ITL 跃升 | 预填充阻塞解码 | 按 512 token 分块预填充 |
| 推测解码拖慢尾延迟 | Alpha 低于 0.55 | 关闭或训练领域草稿模型 |
| 平均 ITL 降低，P99 ITL 升高 | 草稿被拒绝时需要两次处理 | 监控并调优 P99 |
| 4 位模型仍耗尽 HBM | KV 缓存仍为 FP16 或 FP8 | 同时预算权重、KV 和激活 |
| INT4 后领域质量下降 | 使用通用网络文本校准 | 使用领域内数据校准 |
| MATH 分数下降 | AWQ INT4 损失 3 至 5 个百分点 | 使用 FP8 或 BF16 |
| 工具报告的 TPOT 不同 | 某工具的 ITL 排除 TTFT | 注明工具与定义 |
| 两个功能组合后失败 | 不支持该组合 | 检查兼容性矩阵 |

## 术语表
type: glossary
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

- **TTFT**：首 token 时间，排队加网络加预填充。
- **TPOT**：每输出 token 时间，首 token 之后每 token 的解码成本。
- **ITL**：token 间延迟，多数工具中等同于 TPOT。
- **E2E**：一次请求的端到端延迟。
- **P99**：最慢 1% 的延迟边界，用于衡量用户体验。
- **HBM**：高带宽内存，H100 上为 80 GB，约 3 TB/s。
- **Alpha**：目标模型接受的草稿 token 比例。
- **PTQ**：训练后量化，无需重新训练。

## 问答
type: qa
from: phases/10-llms-from-scratch/12-inference-optimization/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md

- **解码为何受内存带宽限制？** 批量为 1 时，每加载一个权重约只做一次运算。
- **GQA 为何重要？** 8 个 KV 头的 Llama 3 70B 每 token 每层仅需 4 KB。
- **推测解码精确吗？** 是，输出分布等于目标模型分布。
- **Flash Attention 是近似算法吗？** 不是，在线 softmax 保持结果精确。
- **为何优先有效吞吐率？** 高吞吐却只有 60% 请求达标，仍然是失败。

## 提示
type: tips
from: phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/zh.md, phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/zh.md, phases/07-transformers-deep-dive/12-kv-cache-flash-attention/docs/zh.md, phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md

- 报告 P50、P90、P99，不要只报告均值。
- 开启推测解码前，先在真实流量上衡量 alpha。
- Agent 的工具 prompt 重复时使用前缀缓存。
- 使用领域内数据校准，数百个样本通常足够。
- 在峰值两倍并发下运行 30 至 50 轮基准。
- 公开工具、版本、模型、硬件、并发与 prompt 组成。
