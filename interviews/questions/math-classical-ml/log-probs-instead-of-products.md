---
id: log-probs-instead-of-products
title: 计算结果精确为零的句子得分
card: math-classical-ml
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, ml-breadth]
tags: [probability, log-probability, underflow, cross-entropy]
minutes: 5
lessons: [phases/01-math-foundations/06-probability-and-distributions]
manuals: []
practice: []
cheatsheet: [probability-statistics]
related: [math-classical-ml/softmax-inf-at-large-logits]
updated: 2026-11-03
---

语言模型将每个词的概率相乘计算整句得分。对于长句子，计算出的得分精确为零，导致无法再比较两个长句子。这里出了什么问题？应该改为什么计算方式？

## Short answer

大量小概率相乘在浮点数运算中会发生下溢归零。改为将对数概率相加，求和结果便始终为一个有限负数。更负的总和代表概率更低的句子，且句子的相对排序保持不变。

## Full answer

### 为什么乘积会归零

每个词的概率都小于 1，通常远小于 1。课程展示了概率乘积在约 30 项后便彻底归零为 0.0。一旦乘积变为零，所有更长的句子都会得到完全相同的零分，彼此之间的比较便失去了意义。

### 对数运算的作用

对数将乘积转换为求和：log(a 乘 b) 等于 log(a) 加 log(b)。由于每个概率至多为 1，每一项都小于等于 0，因此总和是一个负数，其绝对值随句子长度增长但永远不会发生下溢。课程给出了一个极端示例：50 个概率为 0.01 的词，其原始概率连乘结果为 10 的负 100 次方，而对数概率约为负 230.26。

### 现有的典型应用

交叉熵损失正是正确类别的负对数概率。训练分类器或语言模型本来就在对数空间中运行。Log-Softmax 直接从 logits 计算对数概率，从而从一开始就避免了形成微小概率值。

### 句子长度不同的比较方式

即使每个词的概率都很高，较长句子的对数概率之和也会更小。为了比较不同长度的句子，可以除以 token 数量得到平均对数概率，或计算困惑度，即平均负对数概率的指数。

## Follow-ups

- **Level 1:** 为什么每个对数概率都小于等于零？ Expected: 概率取值在 0 到 1 之间，这类数值的对数至多为 0。
- **Level 2:** 如何比较两个长度不同的句子？ Expected: 比较每个 token 的平均对数概率或困惑度，而非原始对数求和。
- **Level 2:** 这一思想在损失函数中体现在哪里？ Expected: 交叉熵是正确类别的负对数概率，因此模型训练本身就是在对数空间中运行的。
- **Level 3:** 如何在不显式计算概率的前提下直接从 logits 获得对数概率？ Expected: 使用 log-softmax，即从每个 logit 中减去所有 logits 的 log-sum-exp。

## Wrong answers

- "改用更高精度的浮点类型即可解决乘积下溢。" 更宽的格式只能推迟下溢发生的时机；50 个概率为 0.01 的词其乘积已达 10 的负 100 次方，更长的句子会进一步突破表示极限。
- "先将所有概率相乘，最后取对数。" 在取对数之前乘积已经下溢为零，而零的对数是负无穷大。
- "将每个概率截断到一个最小值。" 这会篡改每个罕见词的真实得分，且在句子足够长时仍然会发生下溢。

## Taught in

[概率与分布课程](../../../phases/01-math-foundations/06-probability-and-distributions/)展示了数值下溢现象、对数法则以及 log-softmax 函数。
