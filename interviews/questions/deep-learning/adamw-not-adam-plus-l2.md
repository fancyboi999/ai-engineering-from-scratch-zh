---
id: adamw-not-adam-plus-l2
title: 权重衰减放在损失里还是优化器里
card: deep-learning
kind: tradeoff
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [ml-depth, design-review]
tags: [optimizers, adamw, weight-decay, regularization]
minutes: 8
lessons: [phases/03-deep-learning-core/06-optimizers, phases/03-deep-learning-core/07-regularization]
manuals: []
practice: [adam-step]
cheatsheet: [optimizers-schedules]
related: [deep-learning/adam-bias-correction-first-steps, deep-learning/train-mode-and-eval-mode]
updated: 2026-11-03
---

你想给一个用 Adam 训练的 transformer 加权重衰减。一位工程师在损失里加上对权重的 L2 惩罚。另一位用 AdamW 优化器，传入权重衰减参数。他们说两者是一回事。是吗？你选哪个？

## Short answer

只有在普通 SGD 下两者才相同。在 Adam 里，损失中的惩罚会成为梯度的一部分，和其他项一样除以历史梯度大小的估计值，所以梯度方差大的权重衰减得少，方差小的权重衰减得多。AdamW 在自适应更新之后再减去 lr 乘 lambda 乘 w，每个权重都按相同比例收缩。选 AdamW；课里正因为这个原因把它作为 transformer 的默认选项。

## Full answer

### 两者一致的地方

L2 项是 lambda 除以 2 乘以 w 的平方和，它的梯度是 lambda w。在 SGD 下，更新从每个权重中减去 lr 乘 lambda w，按定义这就是权重衰减。两个名字描述的是同一个操作。

### Adam 在哪里打破了等价

Adam 不直接应用梯度。它把梯度平均进一阶矩，把梯度平方平均进二阶矩，再除以二阶矩的平方根。随梯度一起进来的惩罚会被这个除法按参数重新缩放。梯度大且噪声大的权重二阶矩大，分到的衰减少。梯度平稳的权重分到的衰减多。正则化不均匀，课里说它在几乎所有任务上收敛到的解都比解耦形式差。

### AdamW 的做法

```text
w = w - lr * m_hat / (sqrt(v_hat) + eps) - lr * lambda * w
```

衰减项在自适应系数之外。每一步，每个权重都损失同样的比例 lr 乘 lambda。在课里从零写的类中，这只是 Adam 更新之后多出的一行：减去 lr 乘权重衰减再乘参数。

### 课里给出的数值

- transformer 上的 AdamW 用 0.01；微调的默认值也是 0.01。
- CNN 上的 SGD 用 1e-4，这时两种形式一致。
- 严重过拟合的模型最高可到 0.1。

### 一个能看出差别的测试

课里的练习：用大幅值初始化权重，用相同的衰减分别训练带 L2 的 Adam 和 AdamW，画出权重范数随训练的变化。AdamW 收缩得更快、更均匀。

## Follow-ups

- **Level 2:** AdamW 的衰减为什么是均匀的？ Expected: 它直接作用在权重上，位于自适应除法之外，所以每个权重每步被移除的比例都是 lr 乘 lambda。
- **Level 3:** 惩罚在 Adam 内部到底在哪里出了问题？ Expected: 它进入梯度，被平均进一阶矩、平方后进二阶矩，再被除以二阶矩的平方根，按参数重新缩放。
- **Level 3:** 课里给出了哪些衰减值？ Expected: transformer 上的 AdamW 用 0.01，CNN 上的 SGD 用 1e-4，严重过拟合的模型最高 0.1。
- **Level 4:** 什么实验用几行代码就能展示差别？ Expected: 从大幅值的权重开始，用相同衰减训练两者，画出权重范数；AdamW 收缩得更快、更均匀。

## Wrong answers

- "按定义，权重衰减和 L2 是一回事。" 两者在 SGD 下一致；在自适应优化器里，惩罚会按参数重新缩放。
- "用带 L2 的 Adam，加大 lambda 来弥补。" 加大 lambda 修不了不均匀；有些权重仍然几乎得不到衰减。
- "Adam 会自适应，所以不需要权重衰减。" 自适应设定的是步长，不会收缩权重。过拟合的 transformer 仍然需要衰减。

## Taught in

[优化器课](../../../phases/03-deep-learning-core/06-optimizers/)构建了 Adam 和 AdamW 并解释了解耦，[正则化课](../../../phases/03-deep-learning-core/07-regularization/)给出了衰减值。
