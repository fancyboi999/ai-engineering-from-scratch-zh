---
id: quantization
title: 量化格式对比
code: QF
subtitle: 按硬件、引擎与工作负载选择权重格式。速查位宽、内存、命令及损失准确率的陷阱。
hue: 30
sources: phases/10-llms-from-scratch/11-quantization, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell, phases/17-infrastructure-and-production/09-production-quantization, phases/11-llm-engineering/08-fine-tuning-lora
source_hash: 991ba4f402ad8ee5
---

## 生产格式对比
type: comparison
span: 2
from: phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md

| 因素 | GGUF Q4_K_M | GPTQ | AWQ | FP8 |
|---|---|---|---|---|
| 位宽 | 4-5 | 4-8 | 4 | 8 |
| 最适场景 | CPU、边缘端、笔记本 | vLLM 上多 LoRA | 数据中心 GPU 生产服务 | Hopper/Ada/Blackwell 数据中心 |
| 引擎 | llama.cpp、Ollama | vLLM、TGI | vLLM（Marlin-AWQ）、TGI | vLLM、TRT-LLM、SGLang |
| vLLM 上 7B 速度 | ~93 tok/s | ~712 tok/s | ~741 tok/s | 未给数字 |
| 内核收益 | GPU 上没有 | Marlin：比非 Marlin 快 2.6x | Marlin-AWQ：比简单实现快 10.9x | Hopper Tensor Core 原生支持 |
| 质量 | 4-5 位接近 BF16 | 需校准 | INT4 中 Pass@1 最好 | 接近无损 |

## 如何选择
type: tips
from: phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md, phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md

- CPU 或边缘服务：GGUF Q4_K_M。
- GPU 服务、日常聊天、无 LoRA：AWQ。
- GPU 多 LoRA 服务：带 Marlin 的 GPTQ。
- 推理工作负载：FP8。
- Blackwell 数据中心且质量已验证：NVFP4 + FP8 KV。
- 单张消费级 GPU 微调：NF4 基座上的 QLoRA。
- 不确定：对每种候选格式运行 1,000 样本评估。

## 位布局
type: concepts
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell/docs/zh.md

- **FP32**：1 位符号、8 位指数、23 位尾数，用于累加。
- **BF16**：1 位符号、8 位指数、7 位尾数，范围与 FP32 相同。
- **FP16**：1 位符号、5 位指数、10 位尾数，最大值约 65,504。
- **FP8 E4M3**：1 位符号、4 位指数、3 位尾数，用于推理权重与激活。
- **FP8 E5M2**：1 位符号、5 位指数、2 位尾数，用于训练梯度。
- **INT8**：从 -128 到 127 的 256 个值，需要缩放因子。
- **INT4**：16 个级别，需要 GPTQ 或 AWQ 保持质量。
- **NVFP4**：4 位浮点，每块一个缩放因子，用于 Blackwell。

## 量化与反量化
type: annotated-code
lang: python
from: phases/10-llms-from-scratch/11-quantization/code/main.py, phases/10-llms-from-scratch/11-quantization/docs/zh.md

```python
def quantize_symmetric(tensor, num_bits=8):
    qmin = -(2 ** (num_bits - 1))  # 8 位时为 -128
    qmax = 2 ** (num_bits - 1) - 1  # 8 位时为 127
    abs_max = np.max(np.abs(tensor))  # 每个张量一个缩放因子
    if abs_max == 0:
        return np.zeros_like(tensor, dtype=np.int32), 1.0
    scale = abs_max / qmax
    quantized = np.clip(np.round(tensor / scale), qmin, qmax).astype(np.int32)
    return quantized, float(scale)

def dequantize_symmetric(quantized, scale):
    return quantized.astype(np.float64) * scale  # 误差最多为 scale / 2

zero_point = int(np.round(qmin - t_min / scale))  # 非对称偏移
```

## Llama 3 70B 实测
type: comparison
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 因素 | FP16 | FP8 | GPTQ INT4 | AWQ INT4 |
|---|---|---|---|---|
| 大小 | 140GB | 70GB | 35GB | 35GB |
| 困惑度（WikiText-2） | 3.12 | 3.14 | 4.32 | 4.18 |
| MMLU | 79.5% | 79.3% | 77.8% | 78.1% |
| token/秒（A100） | 38 | 55 | 72 | 75 |

## PTQ 与 QAT
type: comparison
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 因素 | PTQ | QAT |
|---|---|---|
| 成本 | 数分钟到数小时 | 完整训练 |
| INT8 质量 | 优秀，损失 < 0.1% | 优秀 |
| INT4 质量 | GPTQ/AWQ 较好，损失 1-3% | 更好，损失 < 1% |
| INT2 质量 | 较差 | 部分任务可用 |
| 校准数据 | 128-1024 个样本 | 完整训练集 |

## 敏感度：从低到高
type: flow
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

1. **权重**：接近零的高斯分布，GPTQ 或 AWQ 可用 INT4。
2. **激活**：范围更广且有离群值，谨慎使用 INT8。
3. **KV 缓存**：误差会影响后续所有 token，使用 FP8 或 INT8。
4. **注意力 logits**：softmax 放大误差，保留 FP16。

## HBM 预算：AWQ 70B
type: architecture
from: phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md

```arch
node | w | 1,1 | 权重 | ~35 GB INT4 | store
node | kv | 2,1 | KV 缓存 | ~20 GB，128 x 2k | store
node | act | 3,1 | 激活 | ~5 GB | store
node | gpu | 2,2 | H100 80GB | 总计 ~60 GB | gpu
edge | w | gpu |
edge | kv | gpu |
edge | act | gpu |
```

## 量化与服务
type: task-table
span: 2
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 任务 | 代码 |
|---|---|
| 转换为 GGUF | `python llama.cpp/convert_hf_to_gguf.py <model> --outtype f16 --outfile <f16>.gguf` |
| 生成 Q4_K_M | `llama.cpp/build/bin/llama-quantize <f16>.gguf <out>.gguf Q4_K_M` |
| 提供 GGUF 服务 | `llama.cpp/build/bin/llama-server -m <out>.gguf -c 4096 -ngl 99` |
| GPTQ 配置 | `GPTQConfig(bits=4, group_size=128)` |
| GPTQ 校准 | `model.quantize(calibration_texts[:128], batch_size=1)` |
| AWQ 配方步骤 | `AWQModifier(duo_scaling="both")` |
| AWQ 方案 | `QuantizationModifier(ignore=["lm_head"], scheme="W4A16_ASYM", targets=["Linear"])` |
| 提供 AWQ 或 GPTQ 服务 | `vllm serve <model> --max-model-len 8192` |

## 4 位 QLoRA 基座
type: annotated-code
lang: python
from: phases/11-llm-engineering/08-fine-tuning-lora/docs/zh.md

```python
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,  # 冻结的 4 位基座
    bnb_4bit_quant_type="nf4",  # 级别位于正态分布分位点
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,  # 将缩放常数量化为 fp8
)
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B",
    quantization_config=bnb_config,
    device_map="auto",
)
model = get_peft_model(model, lora_config)  # 适配器使用 fp16 训练
```

## 常见问题排查
type: troubleshooting
from: phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell/docs/zh.md, phases/10-llms-from-scratch/11-quantization/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| HumanEval Pass@1 下降数个百分点 | 用通用网页文本校准 | 使用领域内数据校准 |
| 4 位模型仍耗尽 HBM | KV 缓存仍为 FP16/FP8 | 同时预算权重、KV 与激活 |
| MATH 下降约 3-5 个百分点 | 推理模型使用 AWQ INT4 | 发布 FP8 或 BF16 |
| vLLM 上 7B 仅约 93 tok/s | GGUF 引擎选错 | 用 llama.cpp 提供 GGUF 服务 |
| 注意力分数崩溃 | KV 缓存使用 FP4 | KV 缓存保留 FP8 |
| 简单 INT4 破坏模型 | 舍入误差累积 | 使用带校准的 GPTQ 或 AWQ |
| 困惑度差值 > 2.0 | 某处出错 | 检查方法与缩放因子 |
| NVFP4 无 LoRA | 尚不支持 LoRA（2026 年初） | 在 vLLM 中使用 GPTQ-Int4 |

## 问答
type: qa
from: phases/10-llms-from-scratch/11-quantization/docs/zh.md, phases/17-infrastructure-and-production/07-tensorrt-llm-blackwell/docs/zh.md, phases/17-infrastructure-and-production/09-production-quantization/docs/zh.md

- **多大困惑度差值算好？** 低于 0.5 很优秀。
- **GPTQ 需要多少校准样本？** 通常为 128 个。
- **Blackwell 常见配置？** NVFP4 权重与激活、FP8 KV 缓存、FP32 注意力累加器。
- **AWQ 还是 GPTQ？** 都是 4 位占用，按 LoRA 支持选择。
- **70B 的 GGUF Q4_K_M 呢？** 约 40GB，64GB M3 Max 上为 10-15 token/秒。
