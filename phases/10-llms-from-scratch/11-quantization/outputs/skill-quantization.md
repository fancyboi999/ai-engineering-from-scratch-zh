---
name: skill-quantization
description: 根据硬件、质量和延迟约束，为 LLM 部署选择合适的量化策略
version: 1.0.0
phase: 10
lesson: 11
tags: [quantization, inference, deployment, optimization, fp8, int4, int8, gptq, awq, gguf]
---

# 量化决策框架

部署语言模型时，用这套框架选择数值格式、量化方法和质量验证策略。

## 输入要求

请提供：
- **模型**（名称、参数量、原始精度）
- **目标硬件**（GPU 型号/显存、CPU、Apple Silicon、边缘设备）
- **延迟目标**（token/秒、首 token 时间）
- **质量底线**（可接受的最大 perplexity 增幅、基准分数差值）
- **服务模式**（batch 大小、最大上下文长度、并发用户数）

## 快速选择

| 你的情况 | 格式 | 方法 | 预期质量损失 |
|---------------|--------|--------|----------------------|
| H100 GPU，追求最大吞吐 | FP8 E4M3 | H100 原生转换 | < 0.1% |
| A100/A10，需要 2 倍吞吐 | INT8 | LLM.int8() 或 SmoothQuant | < 0.5% |
| 单张 24GB GPU 跑 70B 模型 | INT4 | AWQ 或 GPTQ | 1-3% |
| MacBook / Apple Silicon | INT4 GGUF | 通过 llama.cpp 用 Q4_K_M | 1-2% |
| 手机 / 边缘设备 | INT4 或 INT3 | QAT + 针对设备的优化 | 2-5% |
| 最大压缩，可接受一定损失 | INT2 | QuIP# 或 AQLM | 5-15% |
| 训练（混合精度） | BF16 + FP32 累加 | 框架原生支持 | 0% |

## 按组件选择精度

不是所有张量都该一视同仁。

| 组件 | 安全下限 | 推荐 | 避免 |
|-----------|-------------|-------------|-------|
| FFN 权重 | INT4 | INT4（AWQ/GPTQ） | 不做 QAT 的 INT2 |
| 注意力权重 | INT4 | INT8 或 FP8 | INT2 |
| 嵌入层 | INT8 | FP16（保持原样） | INT4 |
| 输出头 | INT8 | FP16（保持原样） | INT4 |
| KV cache | FP8 | FP8 或 INT8 | 长上下文下用 INT4 |
| 注意力 logits | FP16 | FP16 或 BF16 | INT8 |
| 激活值（推理） | INT8 | FP8 或 INT8 | INT4 |

## 方法对比

### GPTQ
- **适用场景：** GPU 推理，需要与 Hugging Face 兼容的模型
- **校准数据：** 128 条样本，每条 2048 token
- **耗时：** 70B 模型在 A100 上 30-60 分钟
- **工具：** `gptqmodel`、`exllama`、`exllamav2`
- **优势：** 经过充分验证，Hugging Face 上现成模型极多
- **劣势：** 量化过程比 AWQ 慢，在部分模型上质量略低于 AWQ

### AWQ
- **适用场景：** GPU 推理，追求每 bit 的最佳质量
- **校准数据：** 128 条样本
- **耗时：** 70B 模型在 A100 上 15-30 分钟
- **工具：** `llmcompressor`、`vLLM`（原生支持）
- **优势：** INT4 质量最好，量化快，与 vLLM 集成
- **劣势：** 现成模型比 GPTQ 少

### GGUF
- **适用场景：** CPU 推理、Apple Silicon、llama.cpp 生态
- **变体：** Q2_K、Q3_K_S/M/L、Q4_K_S/M、Q5_K_S/M、Q6_K、Q8_0、F16
- **推荐默认值：** Q4_K_M（质量与体积的最佳平衡）
- **工具：** `llama.cpp`、`ollama`、`LM Studio`
- **优势：** 单文件自包含，支持混合精度，生态庞大
- **劣势：** 对 GPU 不是最优（为 CPU/Metal 设计）

### SmoothQuant
- **适用场景：** GPU 上的 INT8，权重和激活都要量化
- **核心思路：** 通过逐通道缩放，把量化难度从激活值转移到权重上
- **工具：** `smoothquant`、`TensorRT-LLM`
- **优势：** 支持 W8A8（权重和激活都用 INT8），提速 2 倍
- **劣势：** 只支持 INT8，无法扩展到 INT4

## 质量验证流程

量化之后、部署之前，先做验证：

1. **Perplexity 测试。** 在 WikiText-2 或你的领域语料上计算。差值 < 0.5 为优秀，0.5-1.0 为良好，> 2.0 就有问题。

2. **基准测试扫描。** 跑 MMLU（通用）、GSM8K（数学）、HumanEval（代码）。数学和代码对精度损失最敏感。

3. **输出对比。** 用原始模型和量化模型各生成 100 条回答，用 LLM-as-judge 计算胜率。目标：量化模型在 > 90% 的 prompt 上胜出或打平。

4. **延迟测量。** 分别在 batch 大小为 1 和目标 batch 大小下测 token/秒。确认提速值得付出的质量代价。

5. **长上下文测试。** 如果要服务长上下文（> 4K token），在最大上下文长度下测试。KV cache 的量化误差会随序列长度累积。

## 内存预算计算

```
Weight memory (GB) = parameters (B) * bits / 8 / 1.073741824
KV cache per token (MB) = 2 * num_layers * d_model * bits / 8 / 1048576
KV cache for context (GB) = kv_per_token * max_context_length / 1024
Activation memory (GB) ~ 1-4 GB (relatively constant, depends on batch size)
Total = weight_memory + kv_cache + activation_memory + overhead (10-20%)
```

以 INT4 的 Llama 3 70B、32K 上下文为例：
- 权重：70B * 4 / 8 / 1.07 = 32.6 GB
- KV cache（FP16）：2 * 80 * 8192 * 16 / 8 / 1e9 * 32768 = 约 40 GB
- KV cache（FP8）：约 20 GB
- 用 FP8 KV 时合计：约 55 GB（一张 80GB A100 放得下）

## 常见错误

| 错误 | 为什么会出问题 | 修复 |
|---------|-------------|-----|
| 把嵌入层量化到 INT4 | 第一层的误差会被放大，传遍整个模型 | 嵌入层保持 FP16 或 INT8 |
| INT4 用逐张量缩放 | 一行离群值就毁掉所有行的精度 | 用逐通道或逐组缩放 |
| GPTQ/AWQ 不做校准 | 没有代表性数据，缩放因子就是错的 | 用你领域里的 128 条样本 |
| 所有层用相同位宽 | 首尾层更敏感 | 混合精度：首尾层用更高位宽 |
| 超长上下文下量化 KV cache | 误差随序列长度按平方累积 | KV cache 用 FP8，不要用 INT4 |
| 跳过质量验证 | 有些模型量化效果很差（尤其在边界处） | 每次都跑 perplexity + 任务评估 |

## 部署方案

### 方案 1：vLLM + AWQ（GPU 服务器）
```
pip install vllm
vllm serve model-awq --quantization awq --dtype half --max-model-len 8192
```

### 方案 2：llama.cpp + GGUF（MacBook）
```
./llama-server -m model.Q4_K_M.gguf -c 4096 -ngl 99
```

### 方案 3：TensorRT-LLM + FP8（H100）
```
trtllm-build --model_dir model --output_dir engine --dtype float16 --use_fp8
```
