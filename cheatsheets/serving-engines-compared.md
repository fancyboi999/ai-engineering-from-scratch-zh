---
id: serving-engines-compared
title: 推理服务引擎对比
code: SN
subtitle: 对比 vLLM、SGLang、TRT-LLM 和 llama.cpp 的调度、KV 复用、精度、卸载与选型。
hue: 262
sources: phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/06-sglang-radixattention, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache, phases/17-infrastructure-and-production/28-self-hosted-serving-selection
source_hash: 82105bbb2f0e2a47
---

## 引擎对比
type: comparison
span: 2
from: phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/06-sglang-radixattention, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/28-self-hosted-serving-selection

| 维度 | vLLM | SGLang | TRT-LLM | llama.cpp |
|---|---|---|---|---|
| 核心思路 | PagedAttention、连续批处理、分块预填充 | RadixAttention、缓存感知调度器 | NVFP4 权重、FP8 KV、MTP | CPU 上最快，模型支持最广 |
| 调度 | V1 调度器、FCFS | 深度优先分发、分支级 LRU | 预填充与解码分离 | 完全控制线程 |
| 硬件 | NVIDIA、AMD ROCm | NVIDIA、AMD | 仅 NVIDIA、Blackwell | CPU、Apple Silicon Metal |
| 代表数字 | H100、70B FP8 下 2,200-2,400 tok/s | 8B 上约 16,200 对 12,500 tok/s | GB200 NVL72 上 $0.012/M token | Ollama 慢 15-30% |
| 权重格式 | HF safetensors | HF safetensors | 按 GPU SKU 编译 | GGUF |
| 弱点 | 前缀密集流量 | 独特 prompt 时回到 vLLM 水平 | 不支持 AMD、Intel、ARM | 不作为流程的生产阶段 |

## 各引擎的适用条件
type: concepts
from: phases/17-infrastructure-and-production/28-self-hosted-serving-selection, phases/17-infrastructure-and-production/06-sglang-radixattention, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache

- **vLLM**：通用聊天、100 人以上用户、AMD GPU 或混合硬件。
- **SGLang**：共享长前缀的 agent、RAG 与聊天。
- **TRT-LLM**：纯 NVIDIA 基础设施，Blackwell 上成本优先的任务。
- **llama.cpp**：CPU、边缘端或 Apple Silicon。
- **Ollama**：开发笔记本上的单用户，不用于共享生产。
- **TGI**：仅现有部署，自 2025 年 12 月 11 日起进入维护模式。
- **原生 CPU 卸载**：单个引擎面临 HBM 压力。
- **LMCache**：多个引擎共享前缀，或抢占频繁。

## vLLM 调度器循环
type: annotated-code
lang: python
from: phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/zh.md

```python
while True:
    finished = [s for s in RUNNING if s.is_done()]
    for s in finished: release_blocks(s); RUNNING.remove(s)  # 释放块
    while WAITING and have_free_blocks_for(WAITING[0]):  # KV 有空闲时接纳
        s = WAITING.pop(0)
        allocate_initial_blocks(s)
        RUNNING.append(s)
    batch = []
    for s in RUNNING:
        if s.in_prefill:
            batch.append(next_prefill_chunk(s))  # 例如 512 个 token
        else:
            batch.append(decode_one_token(s))  # 1 个 token
    run_forward(batch)  # 一次融合 GPU 调用
```

## 基数树中的一次请求
type: flow
from: phases/17-infrastructure-and-production/06-sglang-radixattention/docs/zh.md

1. **请求**：系统 prompt 加 "Context: <doc A>" 加 "Question: Carol"。
2. **调度器**：遍历树，系统前缀匹配，复用 124 个块。
3. **调度器**：doc A 分支匹配，复用 31 个块。
4. **分配器**：仅为 "Question: Carol" 分配 4 个新块。
5. **结果**：只预填充 4 个块而非 160 个，预填充量约减少 40 倍。
6. **驱逐**：从使用最短的叶节点开始移除整个分支。

## 生产技术栈
type: architecture
from: phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/docs/zh.md

```arch
node | client | 1,1 | 客户端 | 请求 | client
node | router | 2,1 | 路由器 | 缓存感知、KV 事件 | process
node | eng | 3,1 | vLLM 引擎 | 每 GPU 或 TP/PP 组一个 | gpu
node | conn | 3,2 | Connector API | v0.9.0+，0.11.0 起异步 | process
node | lmc | 2,2 | LMCache 服务端 | 共享 CPU DRAM | store
node | ceph | 1,2 | Ceph/S3 层 | DRAM 下的磁盘层 | store
node | obs | 3,3 | 可观测性 | Prometheus、Grafana、OTel | process
edge | client | router | HTTP
edge | router | eng | 路由
edge | eng | conn | 卸载
edge | conn | lmc | 存储
edge | lmc | ceph | 溢出
edge | eng | obs | 抓取
```

## main.py 中的精度与技术栈经济性
type: comparison
span: 2
from: phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell

| 维度 | H100 + BF16 + vLLM | H100 + FP8 + vLLM | B200 + NVFP4 + FP8 + TRT-LLM | GB200 NVL72 + TRT-LLM + Dyn |
|---|---|---|---|---|
| 每 GPU 的 HBM，GB | 80 | 80 | 192 | 192 |
| HBM 带宽，TB/s | 3.35 | 3.35 | 8.00 | 8.00 |
| 权重位数 | 16 | 8 | 4 | 4 |
| KV 缓存位数 | 16 | 8 | 8 | 8 |
| MTP 因子 | 1.0 | 1.0 | 1.8 | 1.8 |
| 分离因子 | 1.0 | 1.0 | 1.6 | 2.5 |
| 每 GPU 小时价格 | 2.50 | 2.50 | 4.80 | 6.20 |

## 运行模拟器
type: task-table
from: phases/17-infrastructure-and-production/04-vllm-serving-internals/code/main.py, phases/17-infrastructure-and-production/06-sglang-radixattention/code/main.py, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell/code/main.py, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache/code/main.py, phases/17-infrastructure-and-production/28-self-hosted-serving-selection/code/main.py

| 任务 | 代码 |
|---|---|
| 静态批处理 | `simulate_static(reqs, batch=16)` |
| 连续批处理加分块 | `simulate_continuous(reqs, chunked=True)` |
| 缓存感知基数树排序 | `simulate(requests, "CACHE_AWARE")` |
| 打乱前缀顺序 | `workload_scrambled(n=80, docs=4)` |
| 各技术栈的 HBM 占用 | `hbm_footprint_gb(params_b, active_b, seq_len, stack)` |
| 每百万 token 成本 | `cost_per_million_tokens(active_b, stack)` |
| HBM 压力下的 LMCache | `simulate("LMCACHE", reqs)` |
| 适合约束的引擎 | `pick_engine(hardware, scale, workload)` |

## 故障排查
type: troubleshooting
from: phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/06-sglang-radixattention, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache

| 现象 | 原因 | 修正 |
|---|---|---|
| 长 prompt 期间解码停滞 | 预填充阻塞解码 | 分块预填充，P99 ITL 从约 50 ms 降至约 15 ms |
| 共享 prompt 命中率只有 7% | 前缀包含动态内容 | 不变部分放前面，7% 提升至 74% |
| 6.4 倍收益消失 | 每次请求的模板顺序变化 | 固定组件顺序 |
| HBM 100%，同一 prompt 再次预填充 | 抢占驱逐 KV | 原生 CPU 卸载或 LMCache |
| 使用 LMCache 后慢 3-5% | HBM 压力小 | 关闭 LMCache |
| NVFP4 后准确率下降 | 推理任务使用 FP4 权重 | FP8 权重加 FP4 激活 |
| FP4 KV 导致注意力崩溃 | KV 需要动态范围 | KV 缓存保持 FP8 |
| 多项功能组合后失效 | 兼容性矩阵未包含该组合 | 检查所用版本的矩阵 |

## 问答
type: qa
from: phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/06-sglang-radixattention, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache

- **FCFS 为什么不适合前缀流量？** 它会为了接纳短前缀请求而驱逐热门分支。
- **分块预填充保护什么？** TTFT 尾延迟与 ITL，而非平均吞吐量。
- **TRT-LLM 的 7 倍差距来自哪里？** HBM 带宽、NVFP4 权重、MTP 与预填充分离。
- **少于 1K token 的 prompt 适合 LMCache 吗？** 不适合。传输时间超过重新预填充。
- **需要启用 PagedAttention 吗？** 没有开关，它是 vLLM 唯一提供的分配器。
- **vLLM 能复用前缀吗？** 能，使用 `--enable-prefix-caching`。SGLang 则以基数树为核心。

## 术语表
type: glossary
from: phases/17-infrastructure-and-production/04-vllm-serving-internals, phases/17-infrastructure-and-production/06-sglang-radixattention, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/18-vllm-production-stack-lmcache

- **ITL**：token 间延迟，两个解码 token 之间的时间。
- **TTFT**：首 token 时间，包含预填充、排队与网络。
- **FCFS**：先到先服务，会破坏前缀局部性。
- **NVFP4**：NVIDIA 用于权重与激活的 4 位微缩放格式。
- **MTP**：多 token 预测，TRT-LLM 集成的草稿机制。
- **MXFP8**：Blackwell Tensor Core 上的微缩放 FP8 变体。
- **Connector API**：vLLM 0.9.0+ 的可插拔 KV 存储接口。
- **抢占**：HBM 满时重新腾挪 KV 缓存。
