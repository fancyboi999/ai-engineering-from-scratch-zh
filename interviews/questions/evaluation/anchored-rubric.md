---
id: anchored-rubric
title: 两名工程师用同一个 judge，均值却不同
card: evaluation
kind: design
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [design-review, ml-depth]
tags: [rubric, llm-as-judge, reproducibility, criteria]
minutes: 8
lessons: [phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/judge-calibration-before-trust, evaluation/pairwise-position-bias]
updated: 2026-11-03
---

两名工程师用同一个 judge 给同样的 100 个回答打分，指令都是“按 1 到 5 分评价回答质量”，得到的均值却差了将近一分。你怎么重写评分量表，让分数可复现？judge 的 prompt 里还要放什么？

## Short answer

把每个分数档锚定到读者能核对的行为上。与没有锚点的量表相比，写清 5 分、4 分、3 分分别是什么样的量表，能把 judge 的方差降低 30% 到 40%。把几个维度分开打分，把输入、输出和参考答案都交给 judge，并要求它在分数旁边写出理由。

## Full answer

### 从模糊到锚定

差的量表只问回答有多好。好的量表描述每一档：

- **5**：事实正确，直接回应问题，包含具体细节，给出可操作的信息。
- **4**：正确且切题，但细节不足或略显啰嗦。
- **3**：大体正确但有小错，或部分偏离了意图。
- **2**：有明显的事实错误，或只沾到一点边。
- **1**：错误、跑题或有害。

### 一个维度一个分数

相关性、正确性、有用性和安全性各用一个量表打分。单一总分会把几个维度压成一个；去优化它，会得到技术上正确、实际上没用的简短回答。

### judge 能看到什么

输入、输出、参考答案（如果有），以及该维度的锚定量表。要求 judge 输出结构化结果，包含分数和简短理由，方便评审人审查 judge。

### 证明它可复现

对每个样本让 judge 跑三次，计算几次运行之间的一致性统计量。低于 0.7 说明量表仍有歧义。如果 judge 总在相邻两档之间摇摆，就把这个维度改成成对比较，这样就不再需要绝对刻度。

## Follow-ups

- **Level 2:** 为什么要按四个维度打分，而不是只打一个总分？ Expected: 一个分数会把维度压扁；模型可以正确但没用，单一数字掩盖了这种取舍。
- **Level 2:** 怎么证明新量表可复现？ Expected: 每个样本让 judge 跑几次，计算一致性统计量；低于 0.7 就再改。
- **Level 3:** judge 仍在很多样本上于 3 和 4 之间摇摆。什么设计改动能消除这个问题？ Expected: 成对比较，它只问哪个输出更好。
- **Level 3:** 一个维度有参考答案，另一个没有。量表要变吗？ Expected: 要；正确性锚定到参考答案，有用性和安全性只锚定到输出本身的属性。

## Wrong answers

- "把 judge 的温度调低。" 确定性的 judge 在不同样本上照样会用不同的标准解读模糊量表；要修的是量表。
- "多跑几次取平均。" 对噪声取平均要花钱，量表本身还是会被两个读者理解成两回事。
- "一个总分更简单。" 读起来简单，拿来优化就错；课程提醒，只优化单一指标会产生简短而无用的回答。

## Taught in

[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)给出了锚定量表、四个维度和一致性检查。
