---
name: skill-probability-reasoning
description: 为具体的机器学习问题选择合适的概率分布
version: 1.0.0
phase: 1
lesson: 6
tags: [probability, distributions, modeling]
---

# 概率分布的选择

在建模数据、设计损失函数或设定先验时，如何挑选合适的分布。

## 决策清单

1. 结果是离散的（类别、计数）还是连续的（测量值、分数）？
2. 结果有界（例如 [0, 1]）还是无界？
3. 可能的结果有多少个？两个？k 个？无穷多？
4. 数据是对称的还是偏斜的？
5. 事件之间独立还是相关？
6. 你要建模的是速率、计数、比例还是测量值？

## 分布决策树

```
Is the variable discrete?
  Yes --> Only 2 outcomes? --> Bernoulli (p)
     |    k outcomes, one trial? --> Categorical (p1...pk)
     |    k outcomes, n trials? --> Multinomial (n, p1...pk)
     |    Count of successes in n trials? --> Binomial (n, p)
     |    Count of events per interval? --> Poisson (lambda)
     |    Count of trials until first success? --> Geometric (p)
     |    Count of trials until r successes? --> Negative Binomial (r, p)
  No --> Symmetric, bell-shaped? --> Normal (mu, sigma)
     |   Positive values, right-skewed? --> Log-normal or Exponential
     |   Bounded in [0, 1]? --> Beta (alpha, beta)
     |   Positive values, flexible shape? --> Gamma (alpha, beta)
     |   Time between events? --> Exponential (lambda)
     |   Heavy tails needed? --> Student's t (nu) or Cauchy
     |   Multivariate, bell-shaped? --> Multivariate Normal
     |   On a simplex (sums to 1)? --> Dirichlet (alpha)
```

## 真实机器学习场景与分布的对应

| 场景 | 分布 | 参数 |
|---|---|---|
| 二分类输出 | 伯努利（Bernoulli） | p = sigmoid(logit) |
| 多分类输出 | 类别分布（Categorical） | p = softmax(logits) |
| 语言模型中的 token 预测 | 词表上的类别分布 | p 来自 softmax |
| 像素强度（归一化后） | Beta 或 [0, 1] 均匀分布 | 取决于图像统计量 |
| 文档中的词数 | 泊松（Poisson） | lambda = 平均词数 |
| 用户请求的时间间隔 | 指数分布 | lambda = 请求速率 |
| 测量误差 | 正态分布 | mu = 0，sigma 由数据估计 |
| 权重初始化 | 正态或均匀分布 | Kaiming/Xavier 规则 |
| VAE 隐空间先验 | 标准正态分布 | mu = 0, sigma = 1 |
| 比例的贝叶斯先验 | Beta | alpha、beta 来自先验信念 |
| 类别权重的贝叶斯先验 | 狄利克雷（Dirichlet） | alpha 向量 |
| 回归目标中的噪声 | 正态分布 | mu = 0，sigma 需估计 |
| 对离群值稳健的回归 | Student t 分布 | 低自由度 |
| 时长/寿命建模 | Weibull 或 Gamma | 形状和尺度参数 |
| 每篇文档的主题分布（LDA） | 狄利克雷 | alpha < 1 得到稀疏分布 |

## 分布选错的情形

- 数据有硬性下界（例如价格、距离）时用正态分布。正态分布会给负值分配非零概率。改用对数正态或 Gamma 分布。
- 方差与均值不等时用泊松分布。泊松假设均值 = 方差。如果方差 > 均值，改用负二项分布。
- 多分类问题用伯努利分布。伯努利严格只有两类。k > 2 时用类别分布。
- 观测相关时却假设独立。时间序列、空间数据和分组数据都违背独立性。使用自回归模型或层次模型。

## 常见错误

- 把 PDF 的值当成概率。PDF 可以大于 1。概率要在区间上对 PDF 积分得到。
- 忘了 softmax 输出是类别概率，而不是相互独立的伯努利概率。它们按构造加起来等于 1。
- 明明有领域知识却用均匀先验。选得好的信息性先验能降低方差，又不会让结果产生偏差。
- 把对数概率当成概率。对数概率总是负数（或零），加起来也不等于 1。

## 速查：分布性质

| 分布 | 支撑集 | 均值 | 方差 | 关键性质 |
|---|---|---|---|---|
| Bernoulli(p) | {0, 1} | p | p(1-p) | 最简单的离散分布 |
| Binomial(n, p) | {0..n} | np | np(1-p) | n 个伯努利之和 |
| Poisson(lam) | {0, 1, 2, ...} | lam | lam | 均值 = 方差 |
| Normal(mu, s^2) | (-inf, inf) | mu | s^2 | 给定均值/方差时熵最大 |
| Exponential(lam) | [0, inf) | 1/lam | 1/lam^2 | 无记忆性 |
| Beta(a, b) | [0, 1] | a/(a+b) | ab/((a+b)^2(a+b+1)) | 二项分布的共轭先验 |
| Gamma(a, b) | (0, inf) | a/b | a/b^2 | 泊松分布的共轭先验 |
| Dirichlet(alpha) | 单纯形 | alpha_i/sum | （见公式） | 类别分布的共轭先验 |
