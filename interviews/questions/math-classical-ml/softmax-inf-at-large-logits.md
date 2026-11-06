---
id: softmax-inf-at-large-logits
title: 在真实批次上返回 inf 的交叉熵实现
card: math-classical-ml
kind: debug
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [numerical-stability, softmax, log-sum-exp, overflow]
minutes: 8
lessons: [phases/01-math-foundations/13-numerical-stability, phases/01-math-foundations/06-probability-and-distributions]
manuals: []
practice: [softmax-cross-entropy]
cheatsheet: [information-numerics]
related: [math-classical-ml/log-probs-instead-of-products, math-classical-ml/variance-of-large-numbers]
updated: 2026-11-03
---

一个从零实现的交叉熵损失在小数值 logits 的单元测试中顺利通过。然而在真实训练批次上，损失计算结果却返回了 inf。你打印了出问题的批次，发现其中一个 logit 向量为 [100, 101, 102]。请为我详细分析原因与修复方案，并说明为什么该修复方案并非近似计算。

## Short answer

100 的指数约为 2.69 乘以 10 的 43 次方，远超 float32 约 3.4 乘以 10 的 38 次方的表示上限，导致 Softmax 分母中的每一项都发生数值溢出，最终比值为 inf 或 nan。修复方法是在计算指数之前，从每个 logit 中减去当前向量中的最大 logit。在理论算术中这一平移后的概率与原概率严格等价，且此时最大项变为 exp(0) 即 1。

## Full answer

### inf 溢出的根源

Softmax 将单个 logit 的指数值除以所有 logits 指数值的总和。指数函数 exp 是机器学习代码中产生数值溢出的主要源头：在 float32 中 exp(88.7) 已逼近表示极限，而 exp(89.0) 便直接溢出为 inf。对于题目中的向量 [100, 101, 102]，每一项的指数全部溢出，分母总和为 inf，比值变为 nan，其对数也随之变为 nan 或 inf。

### 平移不变性技巧

令 c 为向量中的最大 logit。分子分母同时乘以 exp(-c)：

```text
softmax(x_i) = exp(x_i - c) / sum_j exp(x_j - c)
```

公因式 exp(c) 在分子分母中精确抵消，因此数学函数值保持不变。平移处理后，最大的指数项变为 exp(0) = 1，其余各项指数均不超过 1，因此绝不会发生数值溢出；且由于至少存在一项为 1，分母总和必然大于等于 1，分母的对数绝不可能触发负无穷大。题目中的向量经平移后变为 -2、-1 和 0，对应指数值为 0.135、0.368 和 1.000，计算出的概率为 0.090、0.245 和 0.665。

### 直接计算对数概率

工程上不应先计算概率再取对数，而应直接从 logits 计算对数概率：

```text
log_softmax(x_i) = (x_i - c) - log(sum_j exp(x_j - c))
loss = -log_softmax(x_true)
```

这就是著名的 log-sum-exp 技巧。现代深度学习框架中接收 logits 的损失函数正是出于完全相同的原因将这两步融合在一起。该技巧同样解决了所有 logits 均为绝对值极大的负数时的下溢困境：如果不平移，每个 exp 都会下溢为 0，导致对数计算返回负无穷大。

## Follow-ups

- **Level 2:** 为什么平移最大值不会改变计算出的概率值？ Expected: exp(c) 因式在分子与分母中同时存在，可以直接约分抵消。
- **Level 2:** 当所有 logits 都是很大的负数时会出现什么问题？ Expected: 每一项指数都会下溢为 0，导致分母求和为 0 且对数变为负无穷大；减去最大值同样能解决该问题，因为最大项会变成 exp(0) = 1。
- **Level 3:** 为什么损失应该基于 log-softmax 计算，而非先计算 softmax 再取 log？ Expected: 若概率下溢为 0，取对数就会产生负无穷大；log-softmax 通过减去 log-sum-exp 规避了显式生成微小概率值的环节。
- **Level 3:** 为什么主流深度学习框架的损失函数接收 logits 而非概率值？ Expected: 它在一个数值稳定的算子中融合了 log-softmax 与负对数似然计算，防止调用方在前置步骤中发生下溢或溢出。

## Wrong answers

- "将所有 logits 简单截断在 80 以下即可。" 一旦某个 logit 超过截断阈值，硬截断就会强行篡改真实的相对概率分布；而平移技巧能适用于任意尺度的 logits 且保持概率完全精确。
- "直接改用 float64 双精度浮点。" 更大的指数范围只是推迟了溢出的发生节点；模型在训练中 logits 会持续放大，依然可能突破上限。
- "在对数函数内部添加一个微小的 epsilon。" 溢出发生在计算对数之前的指数阶段；对一个已经无穷大的分母加上 epsilon 没有任何挽救作用。

## Taught in

[数值稳定性课程](../../../phases/01-math-foundations/13-numerical-stability/)推导了 log-sum-exp 技巧，[概率与分布课程](../../../phases/01-math-foundations/06-probability-and-distributions/)构建了稳定的 softmax 与 log-softmax。
