---
id: permutation-blind-attention
title: 打乱词序，注意力察觉不到
card: transformers
kind: concept
level: 1
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [screen, ml-depth]
tags: [positional-encoding, permutation, sinusoidal, rope, alibi]
minutes: 6
lessons: [phases/07-transformers-deep-dive/04-positional-encoding, phases/19-capstone-projects/32-token-positional-embeddings]
manuals: []
practice: [sinusoidal-positional-encoding]
cheatsheet: [positional-encoding]
related: []
updated: 2026-11-03
---

拿一个句子，把它的词打乱。把两个版本都送进一个没有任何位置信号的自注意力层。两个输出之间是什么关系？你会说出哪三类修复方案？

## Short answer

输出的各行按同样的方式被打乱，除此之外什么都不变，因为注意力只计算 token 两两之间的相似度。在语言和代码里，顺序承载着意义，所以模型需要第二个信号。三类修复是：把位置向量加到 embedding 上，可以是可学习的表，也可以是固定的正弦编码；把查询和键旋转一个随位置增大的角度；以及在分数上加一个距离惩罚。

## Full answer

### 这一层为什么看不见顺序

分数矩阵是 `softmax(Q K^T / sqrt(d)) V`，由 token 两两之间的点积构成。打乱 X 的行，每个点积的值都不变；变的只是它在矩阵里的位置。这一层天生就是置换等变的。

### 修复一：给输入加位置向量

可学习的表每个位置一行，所以它增加 `max_context_length` 乘 D 个参数，而且训练长度之外的位置没有对应的行。固定正弦编码使用公式

```text
angle = p / (10000 ** (2 * k / D))
emb[p, 2k]     = sin(angle)
emb[p, 2k + 1] = cos(angle)
```

不需要参数。波长沿维度按几何级数变化。低维每个位置转过的角度最大、波长最短，所以编码精细的位置；高维波长最长，编码粗略的位置。位置 p 加 k 处的向量是位置 p 处向量的线性函数，这让注意力很容易学到相对偏移。位置向量和 token 向量是相加，不是拼接，所以 D 保持不变，模型可以按每个特征决定位置有多重要。

### 修复二：旋转查询和键

旋转位置编码把 Q 和 K 中每一对坐标旋转 `pos * theta_i`，其中 `theta_i = base ** (-2i / d_head)`，基数默认是 10000。这样，旋转后的查询和旋转后的键的点积只取决于两者的距离。这是 2026 年的主流选择。

### 修复三：给分数加偏置

线性偏置注意力给查询 i 和键 j 的分数加上 `-m_h * |i - j|`，每个头有自己的斜率。没有表，没有旋转，对更长输入的外推能力很强。

### 各自作用在哪里

第一类改变的是第一层的输入。另外两类在注意力内部起作用，作用于投影或分数，所以它们遵守和 embedding 阶段相同的形状约定，又不碰 embedding。

## Follow-ups

- **Level 1:** 为什么把两个向量相加，而不是拼接？ Expected: 相加让 D 在整个网络里保持不变，并让模型按每个特征权衡 token 和位置。
- **Level 2:** 可学习的位置表比正弦编码多付出什么？ Expected: `max_context_length` 乘 D 个参数，而且训练长度之外的位置无法索引。
- **Level 2:** 正弦编码的高维为什么编码粗略的位置？ Expected: 它们的波长最长，所以随位置变化得很慢。
- **Level 3:** 旋转作用在 block 的哪个环节？ Expected: 作用在注意力内部的 Q 和 K 上，在投影之后、计算分数的矩阵乘法之前，从不作用在 V 上。

## Wrong answers

- "softmax 让注意力感知顺序。" softmax 只是对一行相似度做归一化；它不知道哪一列在前。
- "在 embedding 上额外加一个表示位置的数就行。" 一个标量没法给点积提供可用的信号；现有方案都把位置分散到许多维度上，或者放进分数里。
- "只有长序列才需要位置。" 两个词的句子，交换词序就已经改变了意思。

## Taught in

[位置编码一课](../../../phases/07-transformers-deep-dive/04-positional-encoding/)比较了这三类方案，[embedding 综合项目](../../../phases/19-capstone-projects/32-token-positional-embeddings/)实现了可学习的位置表和正弦位置表。
