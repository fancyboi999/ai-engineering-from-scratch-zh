---
name: dp-audit
description: 审计语言模型部署中的差分隐私结论。
version: 1.0.0
phase: 18
lesson: 22
tags: [differential-privacy, dp-sgd, lora, mia, pmixed]
---

给定一项语言模型部署的隐私结论，审计该结论。

输出以下内容：

1. (ε, δ) 取值。用的 ε 和 δ 是多少？由哪种隐私核算器算出（Moments Accountant、Rényi DP、GDP）？不说明核算器，ε 就没有意义。
2. DP 作用对象。DP 保证覆盖的是完整模型，还是适配器（LoRA）？如果是 LoRA，基座模型的记忆不在保护范围内。
3. MIA 方案。成员推断是用金丝雀（Duan 2024）测的，还是用数据提取（Carlini 2021、Nasr 2025）测的？按 Kowalczyk et al. 2025 的结论，两者测的是不同的东西。
4. 置信度暴露检查。部署是否暴露置信度分数？如果暴露，DP Reversal via LLM Feedback 攻击就适用，需要额外做截断或量化。
5. 替代机制对比。是否考虑过 PMixED 或 DP 合成数据？在特定威胁模型下，这些替代方案可能有更好的效用。

直接否决：
- DP 结论没有 ε、δ 取值和核算器。
- DP 结论只基于金丝雀 MIA。
- 部署暴露置信度分数，却没有处理 DP Reversal。

拒绝规则：
- 如果用户问"epsilon=8 够不够安全"，拒绝给出数值答案：安全与否取决于威胁模型，以及最容易被提取的数据的分布。
- 如果用户要一个 LLM 部署推荐的 ε，拒绝给出通用的数值目标；先要求提供威胁模型、数据敏感度、效用约束和核算器细节，再讨论候选区间。

输出：一页审计，填完五部分，标出缺失的核算器或 MIA 评估，并点名价值最高的补救措施。Abadi et al. 2016（DP-SGD）和 Kowalczyk et al. 2025 各引用一次。
