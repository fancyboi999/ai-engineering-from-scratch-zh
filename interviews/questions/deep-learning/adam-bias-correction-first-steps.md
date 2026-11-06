---
id: adam-bias-correction-first-steps
title: Adam 的偏差校正在最初几步做了什么
card: deep-learning
kind: concept
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [ml-depth, screen]
tags: [optimizers, adam, bias-correction, learning-rate]
minutes: 8
lessons: [phases/03-deep-learning-core/06-optimizers]
manuals: []
practice: [adam-step]
cheatsheet: [optimizers-schedules]
related: [deep-learning/adamw-not-adam-plus-l2, deep-learning/warmup-before-the-peak-rate]
updated: 2026-11-03
---

Adam 维护梯度的滑动平均和梯度平方的滑动平均，在更新前把两者分别除以一减 beta 的 t 次方。一位同事为了简化代码，删掉了这两个除法。训练最初几步会有什么变化？这个变化什么时候不再重要？

## Short answer

两个平均值都从零开始，所以第一步时一阶矩只有梯度的 (1 - beta1) 倍，beta1 为 0.9 时是十分之一；beta2 为 0.999 时，二阶矩只有梯度平方的千分之一。这两个除法把它们放大回无偏估计。去掉除法后，二阶矩的平方根比一阶矩缩得更多，所以在平均值预热期间，比值和步长都偏大。一阶矩的系数大约 50 步后就接近 1，但二阶矩的系数 1 - 0.999 的 t 次方在几千步内都明显小于 1，所以去掉除法后，步长在这么长的时间里都偏大。

## Full answer

### 两个平均值

```text
m = beta1 * m + (1 - beta1) * g        first moment, the mean gradient
v = beta2 * v + (1 - beta2) * g^2      second moment, the mean squared gradient
m_hat = m / (1 - beta1^t)
v_hat = v / (1 - beta2^t)
w = w - lr * m_hat / (sqrt(v_hat) + eps)
```

一阶矩就是动量：beta1 为 0.9 时，由 1 除以 (1 - 0.9) 可知它大约平均最近十个梯度。二阶矩给每个参数设定步长：梯度大的权重除以一个大数，移动得少；梯度小的权重移动得多。

### 为什么平均值一开始是错的

第一步时，m 是梯度的 0.1 倍。平均值还没预热，课里说它小了十倍。v 也一样，系数是 0.001。第一步把 m 除以 (1 - 0.9)，就得回梯度。到第 100 步，系数 (1 - 0.9 的 100 次方) 约等于 1.0，校正也就没有作用了。课里对一阶矩的规则是：它在最初 10 步左右重要，50 步之后无关紧要。二阶矩慢得多。beta2 为 0.999 时，它的系数要几千步后才接近 1，所以它的校正持续得久得多。

### 删掉之后会怎样

两个矩被不同的系数缩小，而更新取的是开平方之后的比值。一阶矩缩小为 0.1 倍。二阶矩缩小为 0.001 倍，它的平方根缩小到不足原来的 0.1 倍，所以分母太小，步长太大。早期的更新基于只有一两个梯度的统计量，却迈出过大的步。症状是损失在最初几步跳动，有时训练在稳定下来之前就发散了。

### 还有什么在保护最初几步

预热，也就是在最初几步从小学习率逐渐升高，出于另一个原因保护同一段时间：校正修正的是平均值的尺度，不是它们的噪声。课里给出的调参建议是：先改学习率，再改 beta2，几乎从不改 beta1 或 epsilon。

## Follow-ups

- **Level 2:** 一阶矩估计什么，二阶矩估计什么？ Expected: 梯度的滑动均值，也就是动量；以及梯度平方的滑动均值，它给每个参数设定步长。
- **Level 2:** beta1 为 0.9 时，一阶矩大约平均多少个过去的梯度？ Expected: 大约十个，由 1 除以 (1 - 0.9) 得到。
- **Level 3:** 既然有偏差校正，Adam 为什么还需要预热？ Expected: 校正修正的是平均值的尺度，不是噪声；只有几步的统计量估计得很差，早期用小学习率能限制损害。
- **Level 3:** 训练不稳定时，你先改 Adam 的哪个超参数？ Expected: 学习率，然后是 beta2；几乎从不改 beta1 或 epsilon。

## Wrong answers

- "这个除法和 epsilon 一样，是数值安全项。" epsilon 防止分母为零；除以一减 beta 的 t 次方是在修正平均值从零初始化带来的偏差。
- "没有它，最初几步的步长偏小，训练只是慢一点。" 二阶矩的平方根比一阶矩缩得更多，所以比值和步长都偏大。
- "两个校正大约 50 步后都不再重要。" 这只对一阶矩成立。beta2 为 0.999 时，二阶矩的系数在几千步内都明显小于 1。

## Taught in

[优化器课](../../../phases/03-deep-learning-core/06-optimizers/)从零构建 Adam，并演算了第一步的例子。
