---
name: positional-encoding-picker
description: 根据上下文长度和训练预算，选择位置编码（RoPE、ALiBi、正弦）及扩展策略。
version: 1.0.0
phase: 7
lesson: 4
tags: [transformers, positional-encoding, rope, alibi]
---

拿到 transformer 规格（推理时的目标上下文长度、训练时的上下文长度、外推需求、以 token 计的微调预算）后，输出：

1. 基础编码。从以下选一个：RoPE、ALiBi、正弦、可学习绝对位置。一句话说明理由。
2. 超参数。RoPE：`base` 取值，以及 `d_head` 需要能均分的要求。ALiBi：斜率公式。正弦：`max_len`。
3. 扩展策略。目标长度 > 训练长度时：NTK-aware 缩放因子、YaRN 配置、LongRoPE 规格，或位置插值比例。写明微调的 token 预算。
4. 测试计划。最大上下文下 NIAH（大海捞针）通过率目标，困惑度与训练长度基线相差不超过 X。
5. 后备方案。长上下文评测失败时怎么办：用更大的 `base` 重新训练、换成 ALiBi，或限制部署的上下文长度。

2026 年的新模型拒绝推荐正弦或可学习绝对位置编码：它们无法外推，而且所有现代技术栈都默认 RoPE 或 ALiBi。没有微调阶段，拒绝把 RoPE 扩展到训练长度的 8 倍以上。长上下文配置没有在完整部署长度上跑过 NIAH，拒绝上线。
