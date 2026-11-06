---
id: cross-entropy-is-kl-plus-entropy
title: 为什么最小化交叉熵等价于最小化 KL 散度
card: math-classical-ml
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [ml-depth, screen]
tags: [information-theory, cross-entropy, kl-divergence, entropy]
minutes: 8
lessons: [phases/01-math-foundations/09-information-theory]
manuals: []
practice: [softmax-cross-entropy]
cheatsheet: [information-numerics]
related: [math-classical-ml/perplexity-from-cross-entropy, math-classical-ml/softmax-inf-at-large-logits]
updated: 2026-11-03
---

你的分类器使用交叉熵损失训练。一位评审者询问为什么不直接根据真实标签与预测分布之间的 KL 散度训练。请解释两者的数学关系，并说明如果换成 KL 散度，训练过程会有什么改变（如果有的话）。

## Short answer

P 与 Q 的交叉熵等于 P 的熵加上 P 到 Q 的 KL 散度。真实标签固定了分布 P，因此其熵在训练过程中是一个常数，两个目标函数对模型参数的梯度完全相同。在单热标签下真实分布的熵为零，两者的数值也完全相等：等于真实类别预测概率的负对数。

## Full answer

### 三个核心量

```text
H(P)     = - sum_x p(x) log p(x)             entropy of the true distribution
H(P, Q)  = - sum_x p(x) log q(x)             cross-entropy, P true, Q predicted
KL(P||Q) =   sum_x p(x) log (p(x) / q(x))    = H(P, Q) - H(P)
```

熵是用 P 自身的编码表示其事件时的平均惊讶程度。交叉熵是用 Q 编码来自 P 的事件时的平均惊讶程度。KL 散度是额外的惊讶程度，即用 Q 代替 P 编码所浪费的比特数。

### 为什么优化器无法区分二者

模型决定了 Q。标签固定了 P，因此 H(P) 对每个样本都是常数。常数的梯度为零，因此 H(P, Q) 与 KL(P||Q) 关于模型参数的梯度完全相同。在单热标签下求和中只有一项非零，H(P) 为 0，此时损失就是真实类别预测概率的负对数。

### 两者数值何时不同

当目标分布的熵为正时，两者数值不同。标签平滑将硬标签转换为软标签，知识蒸馏中教师模型的 Softmax 输出从一开始就是软分布。此时交叉熵不可能低于 H(P)，而 KL 散度在完美匹配时能达到 0。但它们的梯度依然完全一致，因此这一选择只会改变记录在日志中的指标数值，不会改变训练得到的模型本身。

### 值得当面指出的两个事实

- KL 散度不具有对称性。KL(P||Q) 与 KL(Q||P) 使用不同分布对对数比值加权，因此它不是数学意义上的距离度量。
- 交叉熵关于 logits 的梯度等于预测概率减去目标值。这种极其简洁的形式正是它通常与 Softmax 搭配使用的原因。

## Follow-ups

- **Level 2:** 为什么 KL 散度不是真正的距离度量？ Expected: 它不具备对称性；每个方向使用不同的分布对对数比值加权。
- **Level 3:** 在使用标签平滑时，交叉熵损失永远无法降至零，为什么？ Expected: 软目标分布具有正熵，而交叉熵必定不小于目标分布自身的熵；而在完美匹配时 KL 散度可以降至零。
- **Level 3:** 对损失函数关于每个 logit 求导，会得到什么形式？ Expected: 每个类别对应的预测概率减去目标标签值。
- **Level 4:** 在知识蒸馏中目标是教师模型的 Softmax 输出，你在日志中记录哪一个数值？ Expected: 记录 KL 散度，因为教师分布的熵是每个样本固定的偏移量，会掩盖学生模型与教师模型的接近程度；但两者的优化梯度是相同的。

## Wrong answers

- "它们是不同的目标函数，会训练出不同的模型。" 两者仅相差标签分布的熵，该项与模型参数无关，因此梯度完全相同。
- "交叉熵是两个分布之间的距离度量。" 它不具备对称性，且在两分布相同时也不为零，完美匹配时其值等于分布 P 自身的熵。
- "KL 散度的数值更小，因此是更好的损失函数。" KL 散度只是交叉熵减去一个常数，优化器感知到的梯度斜率完全一样。

## Taught in

[信息论课程](../../../phases/01-math-foundations/09-information-theory/)从零推导了熵、交叉熵和 KL 散度，并展示了分类损失的三种视角。
