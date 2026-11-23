---
name: skill-statistical-testing
description: 为比较机器学习模型和评估实验选择合适的统计检验
version: 1.0.0
phase: 1
lesson: 15
tags: [statistics, hypothesis-testing, model-comparison]
---

# 机器学习中的统计检验

比较模型、做 A/B 实验或验证结果时，如何挑选合适的检验。

## 决策清单

1. 你在比较什么？均值、比例、分布还是相关性？
2. 有几组？单样本对参照值、两组，还是多组？
3. 观测是配对的（同一测试集、同一批折）还是独立的？
4. 数据服从正态分布吗？n < 30 且明显不像正态时，用非参数检验。
5. 数据是连续型、有序型还是类别型？
6. 你要做几次检验？多于一次就要做校正。

## 决策树

```text
Comparing means?
  Two groups?
    Paired (same data splits)? --> Paired t-test (or Wilcoxon signed-rank if non-normal)
    Independent? --> Welch's t-test (or Mann-Whitney U if non-normal)
  Multiple groups?
    Paired? --> Repeated measures ANOVA (or Friedman test)
    Independent? --> One-way ANOVA (or Kruskal-Wallis)

Comparing proportions?
  Two groups? --> Chi-squared test or Fisher's exact test (small n)
  Multiple groups? --> Chi-squared test

Comparing distributions?
  Is one distribution a reference? --> Kolmogorov-Smirnov test
  Are both empirical? --> Two-sample KS test

Measuring association?
  Both continuous, roughly normal? --> Pearson correlation
  Ordinal or non-normal? --> Spearman rank correlation
  Categorical x Categorical? --> Chi-squared test of independence

Running many tests?
  Apply Bonferroni correction: alpha_adjusted = alpha / number_of_tests
  Or use Holm-Bonferroni (less conservative, still controls family-wise error)
```

## 各检验的适用场景

| 检验 | 数据类型 | 假设 | 机器学习用例 |
|---|---|---|---|
| 配对 t 检验 | 连续型，配对 | 差值服从正态 | 在相同的 k 折划分上比较 2 个模型 |
| Wilcoxon 符号秩检验 | 连续型/有序型，配对 | 无（非参数） | 比较 2 个模型，k 较小（5-10 折） |
| Welch t 检验 | 连续型，独立 | 大致正态 | 在两个不同数据集上比较模型 |
| Mann-Whitney U 检验 | 连续型/有序型，独立 | 无 | 比较延迟分布 |
| ANOVA | 连续型，3 组及以上 | 正态，方差相等 | 比较多种模型架构 |
| Kruskal-Wallis 检验 | 连续型/有序型，3 组及以上 | 无 | 比较多个模型，指标非正态 |
| 卡方检验 | 类别计数 | 期望计数 >= 5 | 比较类别分布、混淆矩阵 |
| Fisher 精确检验 | 类别计数 | 小样本 | 比较罕见事件 |
| KS 检验 | 连续型 | 无 | 检查预测是否服从预期分布 |
| Bootstrap 置信区间 | 任意统计量 | 无 | AUC、F1 或任意指标的置信区间 |
| McNemar 检验 | 配对二值 | 无 | 在同一测试集上比较两个分类器 |

## 模型比较流程

1. 跑实验之前，先定好指标和显著性水平（alpha = 0.05）。
2. 两个模型在相同的 k 折交叉验证划分上运行（k = 5 或 10）。
3. 收集配对分数：(a_1, b_1), (a_2, b_2), ..., (a_k, b_k)。
4. 计算差值：d_i = b_i - a_i。
5. 做配对检验（k <= 10 用 Wilcoxon，k > 10 或差值正态时用配对 t 检验）。
6. 报告：p 值、平均差值、95% 置信区间、效应量（Cohen's d）。
7. 如果 p < alpha 并且效应量有实际意义，说明差异真实存在，值得据此行动。

## 常见错误

- 数据是配对的却用独立检验。如果两个模型在同一批测试折上评估，必须用配对检验。独立检验丢掉了配对信息，统计功效会下降。
- 报告 p < 0.05 却不给效应量。统计上显著的 0.1% 准确率提升不值得部署。一定要计算 Cohen's d 或原始平均差值。
- 在不同的测试集上比较模型。两个模型的测试集必须完全相同。测试集不同，比较就没有意义。
- 做了 20 次比较，不做 Bonferroni 校正就报告最好的那个。在 alpha = 0.05 下做 20 次检验，预期会有 1 次纯属偶然的假阳性。
- 在不平衡数据上用准确率。多数类占 99% 时，一个平凡的分类器就能达到 99%。改用 F1、精确率-召回率 AUC 或 Matthews 相关系数。
- 把交叉验证的各折当作独立样本。它们共享训练数据，违背了独立性假设。校正重采样 t 检验（corrected resampled t-test）考虑了这一点。

## 速查：效应量解读

| Cohen's d | 解读 |
|---|---|
| 0.2 | 小效应 |
| 0.5 | 中等效应 |
| 0.8 | 大效应 |
| > 1.0 | 非常大的效应 |

| 要报告什么 | 原因 |
|---|---|
| p 值 | 差异是真实的吗？ |
| 置信区间 | 差异可能有多大？ |
| 效应量（Cohen's d） | 差异有实际意义吗？ |
| 样本量（n 或 k 折） | 结果可信吗？ |
