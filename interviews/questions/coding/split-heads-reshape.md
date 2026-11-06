---
id: split-heads-reshape
title: 形状正确、数值错乱的拆头
card: coding
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, debugging]
tags: [multi-head-attention, reshape, transpose]
minutes: 8
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention]
manuals: []
practice: [multi-head-split-merge]
cheatsheet: [transformers-attention]
related: [coding/output-projection-missing, coding/gqa-repeat-not-tile]
updated: 2026-11-03
---

一份提交用一次调用，把形状为 batch、token 数、特征数的张量拆成多个头：

```python
def split_heads(x, n_heads):
    B, T, D = x.shape
    return x.reshape(B, n_heads, T, D // n_heads)
```

形状测试通过了，所有注意力测试都失败。解释这个函数实际对数据做了什么，并写出正确的版本。

## Short answer

单独一个 reshape 只是重新解释内存。它保持字节顺序不变，只换了标签，所以头这个轴横切了 token 和特征，而不是切分特征轴。正确的拆分先 reshape 成 batch、token 数、头数、头大小，再交换 token 轴和头轴，这样对每个 token，头 `h` 都持有一块由 `d_head` 个相邻列组成的连续块。

## Full answer

### 这个 bug 做了什么

行优先的内存先列出 token 零的特征，再列出 token 一的特征，依此类推。直接 reshape 成 batch、头数、token 数、头大小，会把这串扁平数据切成相等的几段。第一个「头」拿到的是前 `T` 乘 `d_head` 个数，也就是前几个 token 的完整特征向量，而不是每个 token 的一个切片。形状对得上。数值是乱的。

### 修复

```python
def split_heads(x, n_heads):
    B, T, D = x.shape
    if D % n_heads:
        raise ValueError("features must divide into heads")
    d_head = D // n_heads
    return x.reshape(B, T, n_heads, d_head).transpose(0, 2, 1, 3)


def merge_heads(x):
    B, H, T, d_head = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, H * d_head)
```

先 reshape 成 batch、token 数、头数、头大小，这一步只拆最后一个轴。然后转置，让头轴排在 token 轴前面。合并就是把这两步反过来。一次 reshape、一次转置，不用循环；框架版本内部做的也是这件事。

### 这个 bug 的跨步变体

另一个错误版本让头 `h` 拿到列 `h`、`h + H`、`h + 2H` 等等。它切的是特征轴，所以每个头的注意力能跑，但不符合「一个头拥有一块连续列」的约定，用标准排列训练的检查点也就加载不进去。

### 怎样测试

`merge_heads(split_heads(x, H))` 必须精确返回 `x`，并且 `split_heads(x, H)[b, h, t, j]` 必须等于 `x[b, t, h * d_head + j]`。两个错误版本都会在第二项检查上失败。

## Follow-ups

- **Level 2:** 往返测试为什么能发现单纯 reshape 的 bug？ Expected: `merge_heads` 在 reshape 之前先交换头轴和 token 轴，所以它撤销不了单纯的 reshape，特征会以另一种顺序回来；只有同样写成单纯 reshape 的合并才会掩盖这个 bug。
- **Level 2:** 拆分之后缩放因子变成什么？ Expected: 头大小的平方根，而不是完整特征维度的平方根。
- **Level 3:** 拆分之后，所有头的注意力怎样一次算完？ Expected: 在前面的 batch 轴和头轴上做一次批量 matmul，所以增加头数不会多出 kernel 启动。

## Wrong answers

- "尺寸相同时，reshape 和转置是一回事。" reshape 原地重新标记内存；转置会重新排列它。
- "只要合并能还原，怎么拆都行。" 注意力测试和任何加载的检查点都依赖每个头拥有一块相邻的列。
- "遍历各个头，按列切片。" 这样是对的但慢；reshape 加转置用两个操作就得到同样的结果。

## Taught in

[多头注意力课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)把拆分与合并写成先 reshape 再转置，[拆分与合并练习](../../../practice/multi-head-split-merge/)检查拆分结果的每个元素。
