---
id: negative-r-squared
title: 测试集上的 R 平方指标小于零
card: math-classical-ml
kind: concept
level: 1
roles: [ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, ml-breadth]
tags: [regression, r-squared, metrics, baseline]
minutes: 5
lessons: [phases/02-ml-fundamentals/02-linear-regression, phases/02-ml-fundamentals/09-model-evaluation]
manuals: []
practice: [gradient-descent-linear-regression]
cheatsheet: [classical-ml]
related: [math-classical-ml/scaler-fit-before-split]
updated: 2026-11-03
---

一份回归评测报告显示测试集上的 R 平方（R-squared）为负数。一位同事认为评测指标代码肯定写错了，因为 R 平方的取值范围应该在 0 到 1 之间。你该如何回答？

## Short answer

R 平方定义为 1 减去残差平方和与围绕均值的总平方和之比。完美拟合时为 1，仅预测样本均值的基准模型得分为 0，而当模型的预测效果甚至劣于该常数基准时，得分就会小于零。负值是完全真实的评估结果，它表明拟合的模型在该数据分布上带来了负收益。

## Full answer

### 计算公式

```text
R-squared = 1 - SS_res / SS_tot
SS_res = sum of (y_true - y_pred)^2
SS_tot = sum of (y_true - y_mean)^2
```

总平方和（SS_tot）是最简单朴素模型的预测误差：无论输入是什么都始终预测均值。当模型输出的残差平方和超过该值时，两者的比值大于 1，R 平方便变为负数。数学上它不存在任何下限。

### 测试集上如何出现负值

模型是在训练集上拟合完成的。在测试集上，一个过度拟合了训练噪声的模型、或者数据分布发生偏移时，其预测值可能比测试集自身的标签均值更加偏离真实目标。课程在模型输出旁专门打印了预测均值的基线得分，受测模型必须超越该基线。该基线使用的是训练集目标的均值；仅当测试集均值与训练集均值非常接近时得分才接近 0，两者均值存在偏差时其本身得分也会低于 0。

### 拿到该数值后如何处理

1. 对比训练集 R 平方。训练集得分极高而测试集得分为负，提示过拟合或训练集与测试集之间的分布偏移。
2. 检查数据集划分方式。在划分前被错误打乱的时间序列数据，或者在全量数据上拟合的标准化缩放器，都会导致反常的指标偏差。
3. 同时汇报 RMSE 与 MAE 指标。RMSE 具有与目标变量相同的物理量纲，反映典型误差的大小；R 平方则是无量纲的方差解释比例，两者回答不同维度的问题。

## Follow-ups

- **Level 1:** 始终预测训练集均值的基准模型在测试集上会得到什么 R 平方得分？ Expected: 当测试集均值接近训练集均值时接近 0，因为此时残差平方和与总平方和几乎相等；当两个均值不同时得分小于 0。
- **Level 2:** 训练集 R 平方很高而测试集为负，这一差距说明了什么？ Expected: 模型拟合了训练集特定模式且无法迁移泛化；需高度怀疑过拟合或数据集分布偏移。
- **Level 2:** 为什么要在汇报 RMSE 的同时汇报 R 平方？ Expected: RMSE 带有真实目标的物理单位，能直观反映典型误差幅度；R 平方是方差的比例，没有单位。
- **Level 3:** 若目标变量具有重尾（厚尾）分布，还应该检查什么？ Expected: 检查 MAE 与 MSE 的对比；因为平方误差项会让少数极大离群值主导 MSE 和 R 平方。

## Wrong answers

- "R 平方不可能为负，因此代码一定存在 bug。" 它的定义中不存在数学下限；任何预测效果差于均值基线的模型都会得到负值。
- "负数意味着回归直线的斜率为负。" R 平方衡量的是残差与均值方差的比值，与回归拟合线的斜率正负毫无关联。
- "在评测报告中直接将负值截断归零。" 这会掩盖模型表现甚至不如常数均值预测这一致命事实。

## Taught in

[线性回归课程](../../../phases/02-ml-fundamentals/02-linear-regression/)定义了 R 平方指标，[模型评估课程](../../../phases/02-ml-fundamentals/09-model-evaluation/)对比了模型与常数均值基线的表现。
