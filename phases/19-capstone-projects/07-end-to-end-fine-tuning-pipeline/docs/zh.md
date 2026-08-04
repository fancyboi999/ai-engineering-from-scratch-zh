# 顶点项目 07 —— 端到端微调流水线（数据到 SFT 到 DPO 到服务）

> 一个在你自己的数据上训练、用你自己的偏好做 DPO 对齐、量化、推测解码、并以可测量的 $/100 万 token 提供服务的 8B 模型。2026 年的开源栈是 Axolotl v0.8、TRL 0.15、迭代用 Unsloth、量化用 GPTQ/AWQ/GGUF、服务用带 EAGLE-3 的 vLLM 0.7。这个顶点项目就是可复现地跑完整条流水线——输入 YAML，输出一个服务端点——并在 2026 Model Openness Framework 下发一张 model card。

**类型：** Capstone
**语言：** Python（流水线）、YAML（配置）、Bash（脚本）
**前置要求：** 第 2 阶段（ML）、第 3 阶段（DL）、第 7 阶段（transformer）、第 10 阶段（从零做 LLM）、第 11 阶段（LLM 工程）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P2 · P3 · P7 · P10 · P11 · P17 · P18
**预计时间：** 35 小时

## 问题背景

2026 年每个像样的 AI 团队都随时备着一条微调流水线。不是因为他们要发一个前沿基座模型，而是因为下游适配——领域 SFT、针对已标注偏好的 DPO、给推测解码蒸馏出的 draft、用 EAGLE-3 提供服务——才是可测量收益所在。Axolotl v0.8 搞定多 GPU 的 SFT 配置。TRL 0.15 搞定 DPO 和 GRPO。Unsloth 让你在单 GPU 上快速迭代。带 EAGLE-3 的 vLLM 0.7 把解码吞吐提到 2-3 倍且不损质量。工具是好用的；手艺在那些 YAML、数据卫生，以及评测纪律上。

你将把一个 8B 基座（Llama 3.3、Qwen3 或 Gemma 3）在任务专属数据上先过 SFT 再过 DPO，量化以提供服务，并对照 lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro 衡量收益。你将在 2026 Model Openness Framework 下产出一张 model card。重点是可复现性——一条命令端到端重跑整条流水线。

## 核心概念

流水线有五个阶段。**Data（数据）**：去重（MinHash / Datatrove）、质量过滤（Nemotron-CC 风格的分类器）、PII 擦洗、对照公开基准做污染检查的切分卫生。**SFT**：Axolotl YAML、8 卡 H100 上的 ZeRO-3、余弦调度、打包序列、2-3 个 epoch。**DPO 或 GRPO**：TRL 配置、1 个 epoch、偏好对（人标或模型评判）、调 beta。**Quantize（量化）**：GPTQ + AWQ + GGUF，部署更灵活。**Serve（服务）**：带 EAGLE-3 推测头的 vLLM 0.7（或带 SpecForge 的 SGLang）、K8s 部署、按 queue-wait 做 HPA。

消融就是交付物：在三个任务专属基准上 仅 SFT vs SFT+DPO vs SFT+GRPO。服务指标：批大小 1 / 8 / 32 下的 tokens/s、EAGLE-3 接受率、$/100 万 token。安全评测：Llama Guard 4 通过率。model card：偏见评估、可复现随机种子、数据许可。

## 架构

```
raw data (HF datasets + internal)
    |
    v
Datatrove dedup + Nemotron-CC quality filter + PII scrub
    |
    v
split hygiene (MMLU-Pro contamination check)
    |
    v
Axolotl SFT config (YAML)  ---> 8xH100, ZeRO-3
    |
    v
TRL DPO / GRPO config       ---> 4xH100, 1 epoch
    |
    v
GPTQ + AWQ + GGUF quantize
    |
    v
vLLM 0.7 + EAGLE-3 speculative decoding
    |
    v
K8s deployment, HPA on queue-wait
    |
    v
lm-eval-harness + RewardBench-2 + MT-Bench-v2 + MMLU-Pro
    |
    v
model card (2026 MOF) + safety eval (Llama Guard 4)
```

## 技术栈

- 数据：去重用 Datatrove，质量用 Nemotron-CC 分类器，PII 用 Presidio
- 基座：Llama 3.3 8B、Qwen3 14B 或 Gemma 3 12B
- SFT：带 ZeRO-3、Flash Attention 3、打包序列的 Axolotl v0.8
- 偏好调优：DPO 或 GRPO 用 TRL 0.15；单 GPU 迭代用 Unsloth
- 量化：GPTQ（Marlin）、AWQ、通过 llama.cpp 的 GGUF
- 服务：带 EAGLE-3 推测解码的 vLLM 0.7（或 SGLang 0.4 + SpecForge）
- 评测：lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro
- 安全评测：Llama Guard 4、ShieldGemma-2
- 基础设施：Kubernetes + NVIDIA device plugin，按 queue-wait 指标做 HPA
- 可观测性：训练用 W&B，推理用 Langfuse

```figure
ce-finetune-stages
```

## 动手构建

1. **数据流水线。** 在原始语料上跑 Datatrove 去重。施加 Nemotron-CC 风格的质量分类器。Presidio 擦洗 PII。用明确的随机种子写出 train/val 切分。

2. **污染检查。** 对每个验证切分，对照 MMLU-Pro、MT-Bench-v2、RewardBench-2 测试集计算 MinHash。拒绝任何重叠。

3. **Axolotl SFT。** 带 ZeRO-3、FA3、序列打包的 YAML。8 卡 H100 上 2-3 个 epoch。记到 W&B。

4. **TRL DPO / GRPO。** 拿 SFT 的 checkpoint，在偏好对上跑一个 epoch 的 DPO（或在数学/代码上用可验证奖励跑 GRPO）。扫 beta。

5. **量化。** 产出三种量化：GPTQ-INT4-Marlin、AWQ-INT4、给 llama.cpp 的 GGUF-Q4_K_M。记录大小和标称吞吐。

6. **用推测解码提供服务。** vLLM 0.7 配置，配上用 Red Hat Speculators 训练的 EAGLE-3 draft 头。衡量批大小 1 / 8 / 32 下的接受率和尾延迟。在同一份评测上报告 $/100 万 token 跟 Anthropic / OpenAI 的对比。

7. **评测矩阵。** 在 base、仅 SFT、SFT+DPO、SFT+GRPO 上跑 lm-eval-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro。产出一张表。

8. **安全评测。** 在开发集上的 Llama Guard 4 通过率。ShieldGemma-2 输出过滤器。

9. **model card。** MOF 2026 模板：数据、训练、评测、安全、许可、带 YAML 和 commit SHA 的可复现性章节。

## 实际使用

```
$ ./pipeline.sh config/llama3.3-8b-domainX.yaml
[data]    300k deduped, 12k filtered, 280k accepted (seed=7)
[SFT]     3 epochs, 8xH100, 6h12m, val loss 1.42 -> 1.03
[DPO]     1 epoch, beta=0.08, 4xH100, 1h40m
[quant]   GPTQ-INT4 4.6 GB, AWQ-INT4 4.8 GB, GGUF-Q4_K_M 5.1 GB
[serve]   vLLM 0.7, EAGLE-3 acceptance 0.74, p99 126ms @ bs=8
[eval]    MMLU-Pro +3.2, MT-Bench-v2 +0.41, RewardBench-2 +0.08
[card]    model-card.md generated under 2026 MOF
```

## 拿去用

`outputs/skill-finetuning-pipeline.md` 描述交付物。一条命令把数据过 SFT、过 DPO、过量化、过服务、过评测，产出一张 model card 加那个服务端点。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 对比基座的评测差值 | 在目标任务上测得的收益（MMLU-Pro、MT-Bench-v2、任务专属） |
| 20 | 流水线可复现性 | 一条命令用相同随机种子端到端重跑 |
| 20 | 数据卫生 | 去重率、PII 擦洗覆盖率、污染检查为绿 |
| 20 | 服务效率 | bs=1/8/32 下的 tokens/s、EAGLE-3 接受率、$/100 万 token |
| 15 | model card + 安全评测 | 2026 MOF 完整度 + Llama Guard 4 通过率 |
| **100** | | |

## 练习

1. 在同一个任务专属基准上跑 仅 SFT vs SFT+DPO vs SFT+GRPO。报告哪种偏好方法赢、赢多少。

2. 把 Llama 3.3 8B 换成 Qwen3 14B。在质量持平时衡量 $/100 万 token。

3. 衡量 EAGLE-3 在领域数据上 vs 通用 ShareGPT 上的接受率。报告差值，以及它对延迟预算意味着什么。

4. 注入 1% 的污染（把 MMLU-Pro 答案泄进训练数据）并重跑评测。看着 MMLU-Pro 准确率不真实地跳高。搭一个能抓住这事的污染检查 CI 闸门。

5. 加 LoRA SFT 作为全量微调的替代方案。在内存低 10 倍时衡量质量差距。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Axolotl | “SFT 训练器” | 统一的、YAML 驱动的训练器，支持 SFT、DPO 和蒸馏 |
| TRL | “偏好调优器” | Hugging Face 的库，在 LLM 上做 DPO、GRPO、PPO |
| GRPO | “组相对策略优化” | DeepSeek R1 的 RL 配方，带可验证奖励 |
| EAGLE-3 | “推测解码 draft” | 预测往前 N 个 token 的 draft 头；vLLM 用目标模型来验证 |
| MOF | “Model Openness Framework” | 2026 年从数据、代码、许可对模型发布评级的标准 |
| Contamination check（污染检查） | “切分卫生” | 基于 MinHash 检测测试集泄进训练 |
| Acceptance rate（接受率） | “EAGLE / MTP 指标” | 目标模型接受的、被 draft 出来的 token 占比 |

## 延伸阅读

- [Axolotl documentation](https://axolotl-ai-cloud.github.io/axolotl/) —— 参考级的 SFT / DPO 训练器
- [TRL documentation](https://huggingface.co/docs/trl) —— DPO 和 GRPO 的参考实现
- [Unsloth](https://github.com/unslothai/unsloth) —— 单 GPU 迭代参考
- [DeepSeek R1 paper (arXiv:2501.12948)](https://arxiv.org/abs/2501.12948) —— GRPO 方法论
- [vLLM + EAGLE-3 documentation](https://docs.vllm.ai) —— 参考服务栈
- [SGLang SpecForge](https://github.com/sgl-project/SpecForge) —— 备选的推测解码训练器
- [Model Openness Framework 2026](https://isocpp.org/) —— 开源发布评级标准
- [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) —— 标准评测运行器
