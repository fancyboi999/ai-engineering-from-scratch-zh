---
name: finetuning-pipeline
description: 运行一条可复现的微调流水线（数据 → SFT → DPO → 部署），包含消融、量化，以及符合 2026 Model Openness Framework 的模型卡。
version: 1.0.0
phase: 19
lesson: 07
tags: [capstone, fine-tuning, axolotl, trl, dpo, grpo, vllm, eagle-3, mof]
---

给定一个基座模型（Llama 3.1 8B、Qwen3 14B 或 Gemma 3 12B）和一份特定任务的数据集，构建一条一键运行的流水线，产出一个在线服务端点和一张可复现的模型卡。

构建计划：

1. 数据阶段：Datatrove 去重、Nemotron-CC 式质量过滤、Presidio PII 清洗、固定种子的训练/验证集划分。
2. 污染检查：用 MinHashLSH 对照 MMLU-Pro、MT-Bench-v2、RewardBench-2。有重叠就拒绝。
3. SFT：Axolotl v0.8，配合 ZeRO-3、Flash Attention 3、序列打包，在 8xH100 上跑 2-3 个 epoch。
4. 偏好调优：TRL 0.15 DPO（或带可验证奖励的 GRPO）跑 1 个 epoch，对 beta 做扫参。
5. 量化：GPTQ-INT4-Marlin + AWQ-INT4 + GGUF-Q4_K_M。
6. 部署：vLLM 0.7 配合 EAGLE-3 投机解码（draft head 由 Red Hat Speculators 或 SGLang SpecForge 训练）。K8s 部署，HPA 按排队等待时间扩缩。
7. 评估：在 base / 仅 SFT / SFT+DPO / SFT+GRPO 上跑 lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro。
8. 安全：Llama Guard 4 通过率、ShieldGemma-2 输出过滤。
9. 按 2026 Model Openness Framework 编写模型卡，包含数据、训练、评估、安全、可复现性各章节。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 相对基座的评估提升 | 在 MMLU-Pro、MT-Bench-v2 和任务专用基准上实测的提升 |
| 20 | 流水线可复现性 | 一条命令用相同种子重跑，得到一致的哈希 |
| 20 | 数据卫生 | 去重率、PII 清洗覆盖率、污染检查通过 |
| 20 | 推理服务效率 | batch 1/8/32 下的 tokens/s、EAGLE-3 接受率、$/1M tokens |
| 15 | 模型卡 + 安全评估 | 2026 MOF 完整度 + Llama Guard 4 通过率 |

直接否决：

- 流水线跳过 MinHash 污染检查。把 MMLU-Pro 泄漏进训练集，是最典型的评估作弊式失败。
- 训练运行没有附上随机种子或 YAML。可复现性是硬性要求。
- 部署时没有 EAGLE-3 或同等的投机解码配置。基线 tokens/s 达不到 2026 年的标准。
- 缺少安全评估。每次微调交付都要附 Llama Guard 4 通过率。

拒绝规则：

- 模型卡声称了基准分数，却没附 lm-eval-harness 的 commit SHA，拒绝发布。
- 数据许可证禁止派生模型时，拒绝在其上微调。MOF 会对数据许可打分。
- 没有在评估矩阵上测量质量损失，拒绝交付量化模型。

输出：一个仓库，包含流水线编排器、Llama 3.1 8B 及另一个备选基座的 YAML、SFT 和 DPO 的 W&B 运行日志、量化产物、在线服务端点、三项基准的评估矩阵、安全评估、2026 MOF 模型卡，以及一份说明文档，写出你发现并修复的三个最大的数据卫生问题。
