---
id: flash-attention-is-exact
title: 分块注意力 kernel 是近似计算吗
card: transformers
kind: concept
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, design-review]
tags: [flash-attention, tiling, memory-bound, running-softmax, hbm]
minutes: 10
lessons: [phases/07-transformers-deep-dive/12-kv-cache-flash-attention]
manuals: []
practice: [flash-attention-online-softmax]
cheatsheet: [attention-variants, inference-optimization]
related: [transformers/count-attention-ops-with-cache]
updated: 2026-11-03
---

一位同事拒绝在一个对质量敏感的模型上开启 Flash Attention，理由是「近似注意力会改变输出」。它是近似计算吗？请解释这个 kernel 改变了什么、保留了什么，并给出促成它的显存论证。

## Short answer

它是精确的。kernel 把计算分块，完整的 N 乘 N 分数矩阵从不落到 GPU 主存里；每个块在片上内存中算分数、取指数、累加，并维护一个滑动最大值和一个滑动和，最终的归一化与一次性 softmax 的结果一致，差别只在浮点运算的顺序。改变的是内存流量：三次主存往返变成每个输出块写一次，占用从 N 的平方降到 N。从 kernel 出来的数和标准注意力一样。

## Full answer

### 标准注意力为什么慢

```text
S = Q @ K^T       read Q and K, write an N x N matrix
P = softmax(S)    read N x N, write N x N
O = P @ V         read N x N and V, write N x d
```

这是三次高带宽内存往返。在参考加速卡上，这种内存每秒搬约 3 TB，片上内存每秒搬约 30 TB，所以和把数据留在片上相比，每次往返都慢十倍。从约 2K token 起，注意力先受内存限制，还没到受算力限制，经典 kernel 对硬件的利用率低了 4 到 10 倍。

### 分块

```text
for each block of Q (about 128 x 128):
    load the Q tile on chip
    for each block of K, V:
        load the K and V tiles on chip
        scores for the tile
        running softmax aggregation
        accumulate into the output tile
    write the output tile once
```

分数矩阵每次只存在一个块。反向传播时重新计算一部分值，而不是把它们存下来，这是第二处显存上的节省。

### 结果为什么是精确的

softmax 需要一行的全局最大值和全局和，而 kernel 每次只看到一个块。它维护一对滑动值，最大值和总和；每当新块抬高了最大值，就把之前的和与之前的部分输出乘以旧最大值减新最大值的指数，重新缩放。到最后，每一项都以同一个全局最大值为基准，并除以同一个全局和。课程的描述是「输出与标准注意力逐位相同」，附带一个前提：16 位运算不满足结合律，所以重新排序可能改变最后几位。

### 版本

| 版本 | 年份 | 改动 | 在参考硬件上的加速 |
|---|---|---|---|
| Flash 1 | 2022 | 片上分块 kernel | 在较早的加速卡上 2 倍 |
| Flash 2 | 2023 | 更好的并行，因果优先的顺序 | 同一卡上 3 倍 |
| Flash 3 | 2024 | 在较新的加速卡上用异步和 FP8 | 1.5 到 2 倍 |
| Flash 4 | 2026 | 为最新一代硬件设计的五级流水线 | 推理优先，发布时只有前向 |

### 怎么跟同事说

在相同的输入上跑两个 kernel，比较输出。差异在 16 位舍入的量级，和换一个批大小带来的噪声一样，不是对模型的改变。

## Follow-ups

- **Level 3:** kernel 为什么要维护滑动最大值，而不只是滑动和？ Expected: 为了数值稳定；原始分数取指数会溢出，所以每个指数都相对于目前见到的最大值来算，最大值变化时重新缩放。
- **Level 3:** 训练时为什么重新计算，而不是存下 softmax 的输出？ Expected: 存下它就意味着把 N 乘 N 矩阵实际写出来，而这正是 kernel 要避免的。
- **Level 4:** 最新版本发布时只有前向。这对你的技术栈意味着什么？ Expected: 推理服务可以用它，训练继续用上一个版本，直到反向 kernel 发布。
- **Level 4:** 不同批大小下输出完全一样吗？ Expected: 不是逐位一样，因为 16 位运算里归约顺序变了；这是确定性问题，不是近似问题。

## Wrong answers

- "它丢掉了很小的注意力权重来省计算。" 什么都没丢；每个键都参与了滑动求和。
- "它只在很长的上下文下才有用。" 只要注意力受内存限制它就有用，课程报告在普通长度下，较早的加速卡上也有 2 到 4 倍的加速。
- "它减少了注意力的 FLOPs。" 算术量一样；省下的是内存流量。

## Taught in

[KV cache 与 Flash Attention 一课](../../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)讲解了分块、滑动 softmax 和版本表。
