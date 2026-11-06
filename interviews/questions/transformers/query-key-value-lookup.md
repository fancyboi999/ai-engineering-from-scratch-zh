---
id: query-key-value-lookup
title: 一分钟讲清查询、键和值
card: transformers
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, ai-developer-relations-engineer, inference-engineer]
rounds: [screen, ml-breadth]
tags: [attention, query-key-value, encoder-decoder, self-attention]
minutes: 6
lessons: [phases/05-nlp-foundations-to-advanced/10-attention-mechanism, phases/07-transformers-deep-dive/02-self-attention-from-scratch]
manuals: []
practice: [scaled-dot-product-attention]
cheatsheet: [transformers-attention]
related: []
updated: 2026-11-03
---

一位新同事已经读过上百次「注意力」这个词，还是说不出查询、键和值分别是什么。请用一分钟给他讲清楚这三样东西。然后告诉我，2014 年编码器-解码器里的版本和 transformer 里的版本之间变了什么。

## Short answer

注意力是一种软查找。每个 token 产出一个查询，表示它要找什么信息；一个键，表示它自己有什么；一个值，表示它被选中时交出去的内容。查询和每个键算分数，分数经过 softmax，输出是各个值的加权和。2014 年的版本里，查询是解码器状态，键和值是同一组编码器状态；transformer 则通过三个可学习的投影，从同一个序列里得到这三样东西。

## Full answer

### 三个投影

对一个有 n 个 token、每个 token d 维的序列 X：

```text
Q = X @ Wq    (n, dk)   what each token looks for
K = X @ Wk    (n, dk)   what each token contains
V = X @ Wv    (n, dv)   what each token returns when picked
scores = Q @ K.T        (n, n)
```

分数矩阵的第 i 行是一个 token 对整个序列的看法。softmax 把这一行变成总和为 1 的权重。token i 的输出是所有值向量的加权和。

### 数据库的比喻

真正的数据库把查询匹配到一个键，返回一个值。注意力用相似度分数把查询和每个键都匹配一遍，返回所有值的混合。正是这种混合，让模型能在一步之内组合多个位置的信息。

### 2014 年的版本是什么样

2014 年的编码器-解码器注意力用前一个解码器状态作为查询，和每个编码器隐藏状态算分数。上下文向量是这些编码器状态的加权平均。在那个设计里，键和值是同一个东西。常见的分数函数有两种：加性分数，把这一对向量送进 tanh 和一个可学习的向量；乘性分数，直接算点积。这三行代码的改动打破了编码器-解码器的固定长度瓶颈。

### transformer 改了什么

自注意力让一个序列对自己做查询，并用不同的可学习投影把键和值分开。多头注意力把多个这样的计算并行跑。值的加权和还是同一个思路。分数函数变了：加性的 tanh 分数和普通点积，被除以键宽度平方根的点积取代。

## Follow-ups

- **Level 1:** 一个 token 的输出是什么形状？ Expected: 值的维度，因为输出是值向量的加权和。
- **Level 2:** 为什么给键和值分别设投影？ Expected: 一个 token 可以凭一种信息被匹配上，交出去的却是另一种信息。
- **Level 2:** 为什么普通点积分数要求查询和键维度相同？ Expected: 点积只对等长向量有定义；一般形式在中间插入一个矩阵 W 来去掉这个约束。
- **Level 3:** 说出两种经典分数函数之间的约定陷阱。 Expected: 一种用当前步之前的解码器状态，另一种用当前步之后的状态；两者混用会产生细微的梯度错误。

## Wrong answers

- "键和值必须是同一个向量。" 经典版本里是这样，但 transformer 为它们学习了不同的投影。
- "注意力挑出最匹配的那一个 token。" softmax 给每个位置都分配权重，输出混合了所有的值。
- "查询来自编码器。" 在编码器-解码器注意力中，查询来自解码器，键和值来自编码器。

## Taught in

[注意力机制一课](../../../phases/05-nlp-foundations-to-advanced/10-attention-mechanism/)实现了经典版本，[从零实现自注意力一课](../../../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)实现了三个投影。
