---
id: gqa-checkpoint-pooling
title: 把多头检查点转换成分组查询头
card: coding
kind: estimate
level: 4
roles: [inference-engineer, applied-ai-engineer]
rounds: [coding, ml-depth]
tags: [gqa, kv-cache, checkpoint-conversion, memory]
minutes: 15
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention]
manuals: []
practice: [grouped-query-attention]
cheatsheet: [attention-variants, inference-optimization]
related: [coding/gqa-repeat-not-tile, coding/split-heads-reshape]
updated: 2026-11-03
---

你有一个训练好的模型，有 64 个 query 头和 64 个 key、value 头。你想用 8 个 key、value 头来部署它，以缩小缓存。写出把检查点的 key 投影按组池化的函数，说明 key 和 value 的缓存内存下降多少倍，并解释池化后的模型为什么还要再训练才能用。

## Short answer

新投影的第 `g` 组是连续头 `g r` 到 `g r + r - 1` 的均值，在投影矩阵的列上计算，其中 `r` 是每组的 query 头数。缓存只存 8 个头而不是 64 个头的 key 和 value，所以这部分内存降为八分之一。几个头的均值不是模型训练时见过的头，质量会下降，直到一次短的继续训练让 query 头适应它们共享的组。

## Full answer

### 池化

```python
def mean_pool_kv_heads(w, n_heads, n_kv_heads):
    if n_heads % n_kv_heads:
        raise ValueError("query heads must be a multiple of kv heads")
    D, cols = w.shape
    d_head = cols // n_heads
    r = n_heads // n_kv_heads
    grouped = w.reshape(D, n_kv_heads, r, d_head)
    return grouped.mean(axis=2).reshape(D, n_kv_heads * d_head)
```

reshape 把组放在前面，组内的头放在后面，因为同一组的头是连续的列块。按 `(D, r, G, d_head)` reshape 会把相隔 `G` 的头池化在一起，形状对了，分组却错了。用均值而不是求和，投影后 key 的尺度才接近原来，注意力分数也保持在正常范围内。

### 内存倍数

缓存为每层、每个头、每个 token 存一个 key 向量和一个 value 向量。query 头数不参与计算。key、value 头从 64 个降到 8 个，每个 token 存的字节数除以八，这正是多头课给出的一个大型开源模型的例子。权重下降得少得多，因为 query 投影和输出投影不变，只有 key 和 value 投影变小。

### 为什么要训练

query 头训练时对着的是各自的 key 头。池化后，八个 query 头读同一个平均出来的 key 头，它们在训练中都没见过这个头。课里讲的演进脉络把多头检查点转成分组查询检查点描述为一个带继续训练步骤的配方：池化给出一个接近原模型的起点，继续训练找回大部分质量。直接部署池化后的权重也能跑，但上线前必须重新跑评估。

### 什么不变

头的大小、query 投影、输出投影和注意力函数本身都不变。只有 key、value 投影和注意力内部的重复会变，加载器和块的其余部分都不用动。

## Follow-ups

- **Level 3:** 为什么池化连续的头，而不是每隔八个取一个？ Expected: 注意力里 query 头 `h` 读的是 `h` 整除 `r` 得到的组，所以被池化的头必须是之后共享一个组的那些头。
- **Level 4:** 用更长的上下文部署时，缓存节省有什么变化？ Expected: 倍数不变；节省是按 token 计算的，所以节省的绝对字节数随缓存的 token 数增长。
- **Level 4:** 多头潜在注意力变体把 key 和 value 压缩成低秩潜在向量。它用什么换来了额外的节省？ Expected: 计算量，因为计算注意力时要把潜在向量投影回完整的 key 和 value。

## Wrong answers

- "池化是无损的，因为均值保留了平均的 key。" 各个头本身丢了；query 是对着它们训练的，所以模型适应之前质量会下降。
- "缓存按 query 头数和总头数的比例缩小。" 缓存里只有 key 头和 value 头；倍数是原来的 key、value 头数除以新的头数。
- "把头加起来，就不会丢信息。" 求和会把 key 放大到组大小倍，分数超出 softmax 训练时的范围。

## Taught in

[多头注意力课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)给出了分组查询的演进脉络和缓存倍数，[分组查询练习](../../../practice/grouped-query-attention/)实现了多头检查点的池化。
