---
id: gqa-repeat-not-tile
title: 把 query 头配错组的 GQA
card: coding
kind: code-reading
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [coding, ml-depth]
tags: [gqa, kv-heads, attention-variants]
minutes: 10
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention]
manuals: []
practice: [grouped-query-attention]
cheatsheet: [attention-variants]
related: [coding/gqa-checkpoint-pooling, coding/split-heads-reshape]
updated: 2026-11-03
---

一个 GQA 实现用下面这行把 key 和 value 头扩展到 query 头的数量，其中 `kv` 的形状是 batch、组数、token 数、头大小：

```python
kv_full = np.tile(kv, (1, n_heads // n_kv_heads, 1, 1))
```

形状都对，但只要组数多于一个，输出就是错的。解释每个 query 头最后对应到哪个组，并写出正确的扩展。

## Short answer

tile 会重复整个组块，所以 query 头 `h` 读的是 `h` 对组数取模得到的组。约定是相邻的 query 头共享一个组：头 `h` 读 `h` 整除重复倍数得到的组。应该沿头的维度原地重复每个组，而不是平铺整个组块。

## Full answer

### 两种排列

四个 query 头、两个组时，重复倍数是二。正确的扩展得到组序列 `0, 0, 1, 1`：前两个 query 头共享组零，后两个共享组一。tile 得到 `0, 1, 0, 1`，头一和头二互换了搭档。每个头仍然拿到形状正确的 key 和 value 张量，所以形状检查都不会失败，但一半的头在用错误的 key 计算注意力。

### 修复

```python
def repeat_kv(kv, n_heads):
    B, G, T, d_head = kv.shape
    if n_heads % G:
        raise ValueError("query heads must be a multiple of kv heads")
    r = n_heads // G
    return np.repeat(kv, r, axis=1)
```

沿组的维度用 `np.repeat`，会把每个组紧挨着自己复制 `r` 次，得到的就是整除映射。整除检查要放在这里，因为重复倍数不是整数时会被悄悄截断，丢掉一些头。

### 为什么这个映射是约定，不是选择

训练好的检查点里，投影权重是在某一种映射下学出来的。多头课讲了演进脉络：多头注意力每个头一个组，多查询注意力只有一个共享组，分组形式介于两者之间，前 `r` 个头用组零。用池化连续头的方法从多头权重转换来的模型，只有在注意力按同样的连续顺序读组时才能正常工作。

### 为什么要用它

缓存里只有 `G` 个 key、value 头，而不是 `H` 个，所以缓存缩小到 `H / G` 分之一，质量仍接近标准多头注意力。课里的例子是一个大型开源模型，64 个 query 头只对应 8 个共享组。

## Follow-ups

- **Level 3:** 只有一个组时，这个函数算的是什么？ Expected: 多查询注意力；所有 query 头共享唯一的 key 头和 value 头。
- **Level 3:** 重复之后，缩放系数从哪里来？ Expected: 头大小的平方根，和多头注意力一样；除以完整宽度的平方根是另一个常见 bug。
- **Level 4:** 框架怎样避免真的生成这些重复副本？ Expected: 在注意力 kernel 内部对组的维度做广播，或者注意力调用直接接受更少的 key、value 头，这样内存里只存组。

## Wrong answers

- "形状一致时，tile 和 repeat 的结果一样。" 两者给出的头到组的分配不同；只有一种和训练好的权重对得上。
- "把各组平均，所有头共用一个 key 张量。" 这会把模型变成多查询注意力，用的却是没为它训练过的权重。
- "映射无所谓，因为注意力具有置换不变性。" 注意力在一个头内部对 key 置换不变，但 query 头读哪个 key 头并不是置换不变的。

## Taught in

[多头注意力课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)讲了分组查询变体和它的重复操作，[分组查询练习](../../../practice/grouped-query-attention/)检查头到组的映射。
