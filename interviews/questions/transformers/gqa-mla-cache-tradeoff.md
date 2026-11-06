---
id: gqa-mla-cache-tradeoff
title: 为 70B 解码器选择注意力变体
card: transformers
kind: tradeoff
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, system-design]
tags: [grouped-query-attention, multi-query-attention, latent-attention, kv-cache]
minutes: 10
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention, phases/07-transformers-deep-dive/12-kv-cache-flash-attention]
manuals: []
practice: [grouped-query-attention]
cheatsheet: [attention-variants]
related: [transformers/heads-are-nearly-free, inference-serving/kv-pool-users-fit]
updated: 2026-11-03
---

你要为一个新的 70B 级解码器选择注意力变体：完整多头、多查询、分组查询，或者带压缩潜向量的 MLA。每种变体对解码时每个 token 占用的显存有什么影响？各自要放弃什么？

## Short answer

四种变体的查询头数量相同；区别在于有多少个键值头，而解码时只存键和值。多查询让所有查询头共用一个键值头，cache 最小，质量有一些损失。分组查询使用一组键值头，cache 缩小到原来的 `n_heads / n_kv_heads` 分之一，质量几乎不损失，所以它是默认选择。潜在注意力把键和值压缩成一个低秩向量，在算注意力时再解压，所以省的显存更多，代价是额外的 FLOPs。

## Full answer

### 演进脉络

| 变体 | 查询头 | 键值头 | cache 开销 |
|---|---|---|---|
| 多头 | N | N | 完整 |
| 多查询 | N | 1 | 最小，有质量损失 |
| 分组查询 | N | G，例如 N / 8 | 缩小为 N / G 分之一 |
| 多头潜在注意力 | N | 压缩成一个低秩潜向量 | 更小，计算更多 |

### cache 里存的是什么

每层每个 token 存的字节数是 `2 * n_kv_heads * d_head * dtype_size`，其中 2 对应键和值。过去 token 的查询不会再用到，所以不存。一个 70B 级模型，80 层，头大小 128，8 个键值头，16 位类型，每 token 每层存 4096 字节，32K 上下文约 10 GiB，128K 约 40 GiB。同一个模型如果有 64 个键值头，就要多存 8 倍，32K 时约 80 GiB。这相当于一张大加速卡的全部显存只服务一个请求。

### 质量这一侧

分组查询保留了所有查询头，所以每个头仍然提自己的问题；共享的只是它能查到的答案。已发表的工作用微调把训练好的多头检查点转换成分组查询，报告的质量几乎不损失。多查询让所有头共用一套答案，损失更多。潜在注意力用计算换显存：每一步都要把潜向量投影回键和值。

### 分组查询的代码

只有键和值的投影变了。它们产出 `n_kv_heads` 个头，每个头重复若干次，以对齐查询头：

```python
def gqa_project(X, W, n_kv_heads, n_heads):
    kv = split_heads(X @ W, n_kv_heads)
    repeat = n_heads // n_kv_heads
    return np.repeat(kv, repeat, axis=0)
```

推理时 cache 里只有 `n_kv_heads` 份，没有重复出来的那些。

### 怎么选

对要服务长上下文的 70B 解码器，小分组的分组查询是稳妥的默认选择。如果显存是硬约束，并且你接受额外的计算开销和工程投入，就选潜在注意力。

## Follow-ups

- **Level 2:** 每个 token 存多少字节由哪些数决定？ Expected: 层数、键值头数、头大小和每个值的字节数，再乘以 2 计入键和值；参数量不在其中。
- **Level 3:** 为什么潜在注意力每一步的计算更多？ Expected: 每个解码步算分数之前，都要把存下的潜向量投影回完整的键和值。
- **Level 3:** 能把已有的多头检查点迁到分组查询吗？ Expected: 能，分组查询的论文就是转换训练好的检查点再微调；上线前在你自己的评测上测量质量。
- **Level 4:** 产品想在 40 GB 的卡上以批大小 1 跑 128K 上下文。选哪种变体，还要做什么？ Expected: 只用分组查询，128K 时 cache 就已占满这张卡，所以要用潜在注意力或更小的键值类型，而且权重还要另占显存。

## Wrong answers

- "分组查询减少了注意力的计算量。" 每个查询头仍然要算分数；省下的是存储的键和值。
- "多查询没有代价。" 它让所有头共用一套答案，课程记录了质量损失。
- "cache 大小跟着参数量走。" 它取决于键值头数、层数、头大小和数据类型。

## Taught in

[多头注意力一课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)给出了各种变体和分组查询的代码，[KV cache 一课](../../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)完成了显存算术。
