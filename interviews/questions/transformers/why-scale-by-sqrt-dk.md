---
id: why-scale-by-sqrt-dk
title: 注意力分数为什么要在 softmax 之前做除法
card: transformers
kind: concept
level: 1
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [screen, ml-depth]
tags: [attention, softmax, scaling, gradients]
minutes: 6
lessons: [phases/07-transformers-deep-dive/02-self-attention-from-scratch, phases/07-transformers-deep-dive/03-multi-head-attention, phases/19-capstone-projects/33-multihead-self-attention]
manuals: []
practice: [scaled-dot-product-attention]
cheatsheet: [transformers-attention]
related: []
updated: 2026-11-03
---

注意力公式里，原始分数在进入 softmax 之前要先做一次除法。一位新工程师认为这个除法只是惯例，为了省一次乘法把它删了。训练会怎样？你怎么在十分钟内展示这个影响？

## Short answer

两个向量的点积随长度增长，所以不做除法，分数就随键的维度增大。分数太大会把 softmax 推进一个区域：一个键拿走几乎全部权重，流向其他每个键的梯度都接近零，学习就停滞了。除以 `sqrt(d_k)` 让分数的方差在任何头大小下都基本不变。用 `d_k = 64` 的随机 Q 和 K 来展示：分别打印做与不做除法时的分数范围和 softmax 权重。

## Full answer

### 分数有多大

一个分数是 `d_k` 个乘积之和。Q 和 K 的各分量方差为 1 时，这个和的方差是 `d_k`，所以一个典型分数的大小约为 `sqrt(d_k)`。在 `d_k = 64` 时，原始分数在几十的范围内。对几十量级的分数做 softmax，几乎全部质量都落在最大的那一项上。

### 模型为什么停止学习

当一个权重接近 1、其余接近 0 时，softmax 对分数的梯度很小。注意力层的表现就像一次固定的查找。损失进入平台期，没有任何明显的报错。课程把这种状态描述为「一项拿走了几乎全部质量，其余各项小到可以忽略」。

### 修复方法和取值范围

在 softmax 之前把分数除以 `sqrt(d_k)`：

```text
weights = softmax(Q @ K.T / sqrt(d_k))
output  = weights @ V
```

在多头注意力中，根号下的维度是头宽度 `d_head = d_model / n_heads`，而不是模型宽度。生产模型的 `d_head` 落在 64 或 128。缩放让分数方差在任何宽度下都保持不变。课程的经验法则是头宽度保持在 32 或以上，因为更窄的头看到的维度太少；并且低于 256，因为更宽的头会失去许多小专家分工的好处。

### 十分钟的演示

1. 从标准正态分布中采样 Q 和 K，`d_k = 64`。
2. 分别打印做与不做除法时的 `(Q @ K.T).max()`。
3. 两种情况下各打印一行中最大的 softmax 权重。不做除法时它接近 1。

## Follow-ups

- **Level 1:** n 个 token 的序列，分数矩阵是什么形状？ Expected: (n, n)，每个查询一行，每个键一列。
- **Level 2:** 为什么缺了除法会静默失败，而不是抛异常？ Expected: softmax 饱和，梯度变得很小，损失进入平台期，没有任何报错。
- **Level 2:** 这个除法改变了这一层能表示的东西吗？ Expected: 没有，投影可以吸收一个常数；它改变的是初始化时分数的尺度，而训练能否推进正取决于这个阶段。
- **Level 3:** 宽度 512 的模型有八个宽度 64 的头，根号下放哪个数？ Expected: 64，即头宽度，因为每个头对自己的分数做自己的 softmax。

## Wrong answers

- "除法是为了让注意力权重之和为 1。" softmax 对任何分数都会归一化到和为 1；除法控制的是分数的离散程度，不是总和。
- "调大学习率就能找回丢掉的梯度。" softmax 饱和时，梯度几乎不携带其他键的信息，更大的步长也造不出信息。
- "缩放值，而不是缩放分数。" 值是在权重确定之后才相加的，所以它们的尺度碰不到 softmax。

## Taught in

[从零实现自注意力一课](../../../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)解释了饱和，[多头注意力一课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)给出了头宽度，[注意力 block 综合项目](../../../phases/19-capstone-projects/33-multihead-self-attention/)在批量 block 里应用了这个缩放。
