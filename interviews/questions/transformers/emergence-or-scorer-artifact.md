---
id: emergence-or-scorer-artifact
title: 基准分数在两个模型规模之间跳变
card: transformers
kind: concept
level: 4
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, inference-engineer]
rounds: [ml-depth, design-review]
tags: [scaling-laws, emergence, metrics, cross-entropy, evaluation]
minutes: 12
lessons: [phases/07-transformers-deep-dive/13-scaling-laws, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling]
manuals: []
practice: []
cheatsheet: [scaling-laws-pretraining]
related: [transformers/compute-split-params-tokens]
updated: 2026-11-03
---

在两个模型规模之间，某个基准的准确率从接近零跳到很高。团队称之为涌现能力，并申请更大的预算去找下一次跳变。签字之前，你怎么评估这个说法？

## Short answer

先问评分方式是什么。精确匹配和带阈值的准确率是不连续的：一个模型答对了大多数数位，但在全部答对之前得分都是零，所以底层概率的平滑提升会显示成一道悬崖。用连续指标重新给同一批检查点打分，比如目标答案的交叉熵；如果这条曲线是平滑的，跳变属于评分方式，而不属于模型。按连续曲线规划预算，scaling law 能可靠地预测它。

## Full answer

### 论证

2023 年对涌现的一项分析表明，常被引用的那些能力，包括算术和多步推理，都是用不连续的评分方式测出来的。换成连续指标，同样的模型随规模平滑提升。到 2026 年，业内的共识是：根据连续损失做的预测是可靠的，基准分数的跳变常常是评分方式造成的假象。

### 已有的检查点怎么用

1. 固定 prompt 和目标答案。
2. 对每个检查点，记录正确答案每个 token 的概率，以及答案 token 上的交叉熵。
3. 分别以参数量和训练算力为横轴，画出这两个指标。
4. 加一个给部分分的评分方式，比如答对数位的比例，看悬崖在哪里消失。

如果概率曲线是平滑的，说明模型一直在逐步接近答案，只是基准把这一点藏住了。

### 这对预算意味着什么

在这些检查点上拟合损失，读出下一个规模会落在连续曲线的什么位置。然后用这条曲线校准不连续的基准：损失降到多少时，准确率会越过产品门槛？在那个点附近多采样几个规模，而不是押注一次意外。一个产品门槛对用户来说可以是真实的，对规划者来说仍然可以预测。

### 真正的机制变化出现在哪里

上下文学习，即不微调、只看几个例子就照着做，通常被描述为在 6B 到 13B 的范围出现。课程的立场仍然是：在称它为不连续之前，先用连续指标测量，因为同样的评分问题也适用于它。

## Follow-ups

- **Level 3:** 举一个不连续的评分方式和它对应的连续指标。 Expected: 多位数答案的精确匹配，对应同一答案的对数概率或逐位准确率。
- **Level 4:** 这会怎样改变你规划训练预算的方式？ Expected: 用定律预测损失，用损失校准基准，把训练放在门槛附近，而不是指望一次跳变。
- **Level 4:** 对用户来说，产品门槛确实是二元的。假象这个论点还重要吗？ Expected: 重要；门槛对产品是真实的，但它的位置能从平滑曲线预测出来，而做预算需要的正是这个位置。
- **Level 4:** 什么能让你相信一次跳变不是评分方式的假象？ Expected: 连续指标在同一规模上也出现拐点，并且在不同随机种子和数据顺序下都能复现。

## Wrong answers

- "准确率才是真实答案，损失只是替代指标。" 带硬阈值的准确率丢掉了显示趋势的信息；损失才是模型优化的对象，也是定律预测的对象。
- "涌现说明 scaling law 失效了。" 定律描述的是连续损失；带阈值的分数跳变时，连续损失的形状不变。
- "训练更大的模型试试就知道了。" 这正是这项分析能让你省掉的昂贵实验；先给手头已有的检查点重新打分。

## Taught in

[scaling law 一课](../../../phases/07-transformers-deep-dive/13-scaling-laws/)对比了涌现和平滑的损失，[因果语言建模一课](../../../phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/)把上下文学习放到了规模轴上。
