---
id: causal-mask-off-by-one
title: 把 token 自己也遮住的因果掩码
card: coding
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, debugging]
tags: [attention, causal-mask, decoder]
minutes: 8
lessons: [phases/07-transformers-deep-dive/02-self-attention-from-scratch]
manuals: []
practice: [scaled-dot-product-attention]
cheatsheet: [transformers-attention]
related: [coding/scale-by-sqrt-dk, coding/loss-shift-flatten]
updated: 2026-11-03
---

一个 decoder 的注意力在每个序列的第一行都返回零向量。掩码代码如下：

```python
def causal_mask(T):
    return np.triu(np.ones((T, T), dtype=bool), k=0)

weights = softmax(scores)
weights[mask] = 0
out = weights @ V
```

这里有两处错误。找出这两处，并解释各自对输出有什么影响。

## Short answer

掩码的对角线偏移为零，每个 token 都遮住了自己，第一个 token 没有任何可看的 key，于是留下一个空行。掩码还是在 softmax 之后施加的，所以每行之和不再是一。用偏移一构建掩码，并在 softmax 之前把被遮住的分数设成一个很大的负数。

## Full answer

### 错误一：对角线

因果掩码允许位置 `i` 看到从零到 `i` 的位置，包括它自己。`np.triu` 在 `k=0` 时会把对角线留在被遮住的集合里。第一个 query 的所有 key 都被遮住，所以这段代码把第一行权重全设为零，第一行输出也是零。如果只把掩码移到 softmax 之前并填负无穷，这一行就没有可归一化的值，除法会产生 NaN。用 `k=1`，让对角线保持可见。

### 错误二：在 softmax 之后施加掩码

在归一化之后把权重设为零，每行之和会小于一，差值正好是分给未来 key 的那部分概率质量。输出因此变小，模型要在一个不断变化的尺度上训练。掩码必须在 softmax 之前作用于分数：把被遮住的位置设成很大的负数，它们的指数就是零，剩下的位置会重新归一化。

### 修正后的代码

```python
def causal_mask(T):
    return np.triu(np.ones((T, T), dtype=bool), k=1)

scores = np.where(mask, -1e9, scores)
weights = softmax(scores)
out = weights @ V
```

### 为什么两个 bug 都能通过形状测试

两个 bug 都不改变形状。只有检查权重，或者检查第一行输出不为零，才能发现它们。练习用参考实现核对因果权重，并且包括第一行。

## Follow-ups

- **Level 2:** 为什么用很大的负数，而不是负无穷？ Expected: 负无穷在多数框架里可用，但整行都被遮住时会产生 NaN；有限值能让算术保持有定义。
- **Level 2:** 掩码怎样和 batch 维度配合？ Expected: 掩码的形状是 token 数乘 token 数，在 batch 和头之间广播；每个序列长度只构建一次。
- **Level 3:** 同一个模型先做 prefill，再逐个 token 解码。掩码会变吗？ Expected: 解码时单个 query 能看到所有已缓存的 key，这一步不需要掩码；生成这些 key 时已经应用过因果规则。
- **Level 3:** 填充掩码和因果掩码必须同时生效。怎样组合？ Expected: 在对分数施加掩码之前，用逻辑或合并两个布尔掩码，这样被填充的 key 对每个 query 都被遮住。

## Wrong answers

- "把被遮住的权重设为零，再对每行重新归一化。" 数值上可行，但工作量翻倍；在 softmax 之前遮住分数，重新归一化是顺带完成的。
- "第一个 token 不应该关注任何位置。" 第一个 token 必须关注它自己；空行不构成有效的分布。
- "用全一的下三角矩阵当掩码。" 全一矩阵标出的是允许的位置，必须取反后才能当作遮挡掩码使用。

## Taught in

[自注意力课](../../../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)把这个掩码作为第一道练习，[注意力练习](../../../practice/scaled-dot-product-attention/)会测试被遮挡权重的第一行。
