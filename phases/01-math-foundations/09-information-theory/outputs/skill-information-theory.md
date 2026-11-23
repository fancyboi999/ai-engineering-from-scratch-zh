---
name: skill-information-theory
description: 把信息论概念用于机器学习的损失函数、模型评估和特征选择
version: 1.0.0
phase: 1
lesson: 9
tags: [information-theory, entropy, loss-functions]
---

# 机器学习中的信息论

在机器学习系统中，什么时候用熵、交叉熵、KL 散度和互信息。

## 决策清单

1. 衡量单个分布的不确定性？用**熵**。
2. 衡量模型对真实标签的逼近程度？用**交叉熵**（这就是分类损失）。
3. 衡量两个分布之间的距离？用 **KL 散度**。
4. 检查两个变量是否相关？用**互信息**。
5. 报告语言模型的质量？用**困惑度**（交叉熵的指数）。
6. 把一个模型蒸馏到另一个模型？最小化从教师到学生的 **KL 散度**。

## 各度量的适用场景

| 度量 | 公式 | 用途 | 机器学习应用 |
|---|---|---|---|
| 熵 H(P) | -sum(p log p) | 这个分布有多不确定？ | 数据复杂度、最大熵模型 |
| 交叉熵 H(P,Q) | -sum(p log q) | 模型 Q 预测真实分布 P 的效果如何？ | 分类损失、语言模型损失 |
| KL 散度 D(P\|\|Q) | sum(p log(p/q)) | P 和 Q 差别有多大？ | VAE 损失（ELBO）、知识蒸馏、RLHF |
| 互信息 I(X;Y) | H(X) - H(X\|Y) | Y 能告诉我们多少关于 X 的信息？ | 特征选择、表示学习 |
| 困惑度 | exp(H(P,Q)) 或 2^H | 模型有多困惑？ | 语言模型评估 |
| 条件熵 H(X\|Y) | -sum(p(x,y) log p(x\|y)) | 已知 Y 后 X 剩余的不确定性 | 特征的信息量 |

## 关键关系

```
Cross-entropy  = Entropy + KL divergence
H(P, Q)        = H(P)   + D_KL(P || Q)

Since H(P) is constant during training:
  Minimizing cross-entropy = Minimizing KL divergence

Mutual information = Entropy - Conditional entropy
I(X; Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)

Perplexity = exp(cross-entropy in nats)
           = 2^(cross-entropy in bits)
```

## 速查：公式与单位

| 公式 | 比特（以 2 为底） | 奈特（以 e 为底） |
|---|---|---|
| 信息量：-log(p) | -log2(p) | -ln(p) |
| 熵：-sum(p log p) | 比特 | 奈特 |
| 1 奈特 = | 1.4427 比特 | 1 奈特 |
| PyTorch 默认 | -- | 奈特 |
| 信息论论文 | 比特 | -- |

## 数值解读

| 熵值 | 含义 |
|---|---|
| 0 | 确定性的。某个结果的概率为 1。 |
| log(n) | 不确定性最大。n 个结果上的均匀分布。 |
| 低 | 分布尖锐。模型很有把握。 |
| 高 | 分布平坦。模型拿不准。 |

| 困惑度 | 语言模型质量 |
|---|---|
| 1 | 完美预测（实践中从不出现） |
| 10 | 平均相当于在约 10 个等可能的 token 中做选择 |
| 50 | GPT-2 在标准基准上的水平 |
| < 10 | 在语料充分的领域达到当前最佳水平 |

## 常见错误

- 计算 KL 散度时把它当成对称的。D_KL(P||Q) != D_KL(Q||P)。需要对称度量时，用 Jensen-Shannon 散度：JS = 0.5 * KL(P||M) + 0.5 * KL(Q||M)，其中 M = 0.5*(P+Q)。
- 忘了 one-hot 标签下的交叉熵可化简为 -log(p_true_class)。真实分布是 one-hot 时，不需要对所有类别求和。
- 代码里用以 2 为底的对数，汇报时却用奈特（或反过来）。PyTorch 默认用自然对数。乘以 log2(e) = 1.4427 即可把奈特换算成比特。
- 对空事件或零概率事件计算熵。约定：0 * log(0) = 0，因为 lim(p->0) p*log(p) = 0。
- 跨不同词表比较困惑度。词表大小 50k、困惑度 30 的模型，和词表大小 10k、困惑度 30 的模型不能直接比较。

## 各概念在生产级机器学习中的位置

| 概念 | 出现位置 |
|---|---|
| 交叉熵损失 | 每个分类模型（nn.CrossEntropyLoss） |
| KL 散度 | VAE ELBO、PPO 裁剪、知识蒸馏 |
| 熵正则化 | 强化学习中的探索奖励（熵越高 = 探索越多） |
| 互信息 | 特征选择、InfoNCE 损失（对比学习） |
| 困惑度 | 语言模型基准（越低越好） |
| 标签平滑 | 用软目标替换 one-hot，降低交叉熵带来的过度自信 |
| 温度缩放 | softmax 之前把 logits 除以 T，控制输出的熵 |
