---
id: bag-or-boost-the-base-model
title: 深层决策树用 Bagging，决策树桩用 Boosting
card: math-classical-ml
kind: tradeoff
level: 3
roles: [ai-data-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [ml-depth, system-design]
tags: [ensembles, bagging, boosting, bias-variance, random-forest]
minutes: 12
lessons: [phases/02-ml-fundamentals/11-ensemble-methods, phases/02-ml-fundamentals/10-bias-variance, phases/02-ml-fundamentals/04-decision-trees]
manuals: []
practice: [lab-bias-variance]
cheatsheet: [ml-model-comparison]
related: [math-classical-ml/mdi-ranks-noise-feature, math-classical-ml/past-the-interpolation-threshold]
updated: 2026-11-03
---

你有一个表格数据集和两个候选基学习器：几乎能完美拟合训练样本的深层决策树，以及性能勉强胜过常数预测的决策树桩（stump）。你的预算允许为每类基学习器各采用一种集成方法。哪一个用 Bagging，哪一个用 Boosting？为什么？

## Short answer

深层树采用 Bagging，决策树桩采用 Boosting。深层树具有低偏差和高方差，对 Bootstrap 抽样训练出的多棵深树取平均，可以在不增加偏差的前提下消除方差。决策树桩具有高偏差和低方差，Boosting 按顺序串行构建基学习器，使每个新树桩纠正此前集成模型的误差，从而逐步降低偏差。

## Full answer

### 将集成方法与误差项匹配

期望误差可以分解为偏差平方、方差和不可避免的噪声。这两种集成方法分别针对不同的误差项。

| 方法 | 主要降低 | 偏差 | 方差 | 注意事项 |
|---|---|---|---|---|
| Bagging、随机森林 | 方差 | 不变 | 降低 | 对降低偏差无效 |
| Boosting | 偏差 | 降低 | 可能增加 | 迭代轮数过多会过拟合 |

### 为什么 Bagging 适合深层树

每棵树都在一个 Bootstrap 样本上训练，即与原数据集同等大小的有放回抽样，其中约包含 63.2% 的去重样本行。其余约 36.8% 的样本属于袋外（out-of-bag）数据，天然构成一个免费的验证集。对 N 个方差为 sigma 平方的独立预测取平均，其方差为 sigma 平方除以 N。由于各棵树看到的数据相似，它们并非完全独立，因此实际收益小于这一理论值；随机森林在每次分裂时随机选取特征子集（分类任务中通常为特征总数的平方根），促使各棵树之间产生更大的差异。增加树的数量能降低方差且绝不增加偏差，因此测试准确率会趋于平稳而不会下降。

### 为什么 Boosting 适合决策树桩

Boosting 串行训练基学习器。AdaBoost 会提高此前集成模型预测错误样本的权重，使下一个树桩专注于这些困难样本。梯度提升（Gradient Boosting）则让每个新树拟合损失函数的负梯度，在均方误差下即为残差。每一轮都在消除一部分系统误差，也就是偏差。学习率用于缩放每棵树的贡献；课程给出的范围是 0.01 到 0.3，较小的学习率需要更多的树，泛化效果通常更好。由于后续轮次会不断拟合最棘手的样本，Boosting 容易拟合噪声，因此需要在验证集损失上设置早停机制。

### 为什么不能反过来使用

对深层树使用 Boosting 时，由于几乎没有残余偏差可消除，堆叠高方差的基学习器会导致迅速过拟合。对决策树桩使用 Bagging 则是在平均许多共同遗漏同一模式的模型，其平均结果同样会遗漏该模式。多样性是这两种方法的核心前提：课程中准确率为 60% 的 21 个独立分类器经多数表决后准确率可达约 74%，101 个独立分类器可达约 84%，这完全得益于它们的错误互不相同。

## Follow-ups

- **Level 3:** 为什么对深层树做 Bagging 无法解决偏差问题？ Expected: 多个遗漏相同模式的模型取平均后仍然会遗漏该模式；平均操作只能消除模型之间的分歧。
- **Level 3:** 梯度提升中的学习率起什么作用？ Expected: 它缩放每棵树的贡献；较小的学习率需要更多的树，泛化性能通常更好。
- **Level 4:** Boosting 的训练误差持续下降但验证误差上升，发生了什么？如何处理？ Expected: 后续轮次在拟合噪声或错误标记的样本；应基于验证集损失执行早停，或降低学习率与树的深度。
- **Level 4:** 为什么随着树的增加，随机森林的测试准确率会趋于平稳而不会下降？ Expected: 每棵树都在降低方差且不增加偏差，因此增加树不会像增加 Boosting 轮次那样引起过拟合。

## Wrong answers

- "对深层树使用 Boosting，因为 Boosting 是更强的方法。" 低偏差、高方差的学习器几乎没有多余偏差可消除，Boosting 会放大其方差。
- "对树桩使用 Bagging 可以让它们变强。" 对全部欠拟合的树桩取平均仍会欠拟合；Bagging 无法改变原有的偏差。
- "只要集成足够多的模型，效果就一定胜过单个模型。" 收益源于错误的多样性；犯同样错误的一组模型无法通过集成相互抵消。

## Taught in

[集成方法课程](../../../phases/02-ml-fundamentals/11-ensemble-methods/)构建了这两种方法，[偏差方差权衡课程](../../../phases/02-ml-fundamentals/10-bias-variance/)给出了选型规则，[决策树课程](../../../phases/02-ml-fundamentals/04-decision-trees/)构建了随机森林。
