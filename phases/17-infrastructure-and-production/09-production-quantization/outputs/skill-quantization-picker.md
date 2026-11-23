---
name: quantization-picker
description: 根据硬件、引擎、负载和质量容忍度选择 2026 年的量化格式，并制定校准与验证计划。
version: 1.0.0
phase: 17
lesson: 09
tags: [quantization, awq, gptq, gguf, fp8, nvfp4, calibration]
---

给定硬件（CPU / H100 / H200 / B200 / GB200，以及数量）、引擎（llama.cpp / vLLM / TRT-LLM / SGLang）、模型（规模 + 任务类型：常规聊天 / 推理 / 代码 / multi-LoRA）和质量容忍度（在 HumanEval / MATH / MMLU 上能接受下降 N 分），选出量化格式并制定验证计划。

输出以下内容：

1. 格式推荐。从以下选一个：GGUF Q4_K_M、GGUF Q5_K_M、GPTQ-Int4 + Marlin、AWQ-Int4 + Marlin、FP8、NVFP4 + FP8 KV，或叠加组合。按决策树说明理由：CPU → GGUF；推理 → FP8；vLLM 上的 multi-LoRA → GPTQ；常规 GPU 聊天 → AWQ；Blackwell 且已验证 → NVFP4。
2. 显存预算。报告权重 + KV cache（按上报的并发 × 上下文长度）+ 激活。确认能放进目标 GPU，否则指出需要多 GPU。
3. 校准计划。数据集来源（AWQ/GPTQ 用领域匹配的数据；通用的 C4/WikiText 只作为最后手段）。样本数（领域数据 500-2000 条）。验证集（从校准池留出 10%）。
4. 验证计划。按任务匹配评估集：代码用 HumanEval，推理用 MATH/MMLU，聊天用 MT-Bench。对比 BF16 基线和量化版本。下降幅度 ≤ 质量容忍度才上线。
5. KV cache 决策。与权重量化分开决定。推理任务推荐 FP8 KV；注意力精度勉强够用时用 BF16 KV；INT8 KV 只在验证后使用。
6. 回滚路径。在磁盘上保留 BF16/FP8 权重；生产质量下降时通过开关切回。

直接否决：
- 对推理密集型负载推荐 NVFP4 权重，却不做评估集验证。
- 用通用网页数据校准领域模型。必须用领域内数据。
- HBM 预算里漏掉 KV cache。必须逐项列出。
- 给出吞吐数字却不说明 kernel（Marlin-AWQ 和普通 AWQ 相差 10 倍）。

拒绝规则：
- 如果负载本身对质量很敏感（开放式创意生成、边缘情况推理），拒绝激进的 INT4。保持 FP8 或 BF16。
- 如果引擎是 llama.cpp，拒绝 GGUF 以外的任何格式。格式匹配引擎是基本要求。
- 如果用户跑不了 1,000 条样本的评估，拒绝。生产环境不做盲目量化。

输出：一页量化选型，列出所选格式、HBM 预算、校准计划、验证计划、KV cache 决策和回滚路径。最后用一段"接下来测什么"，根据关键风险，从评估集差值、峰值并发下的 KV cache 压力或真实 batch size 下的吞吐中选一个。
