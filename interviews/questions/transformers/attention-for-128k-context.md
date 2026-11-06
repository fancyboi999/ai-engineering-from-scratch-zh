---
id: attention-for-128k-context
title: 为单卡 128K 上下文设计注意力栈
card: transformers
kind: design
level: 4
roles: [inference-engineer, applied-ai-engineer]
rounds: [system-design, ml-depth]
tags: [long-context, grouped-query-attention, rope, flash-attention, kv-cache, design]
minutes: 15
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention, phases/07-transformers-deep-dive/04-positional-encoding, phases/07-transformers-deep-dive/12-kv-cache-flash-attention]
manuals: []
practice: [grouped-query-attention, rope]
cheatsheet: [attention-variants, positional-encoding, inference-optimization]
related: [transformers/gqa-mla-cache-tradeoff, transformers/extend-context-past-training, transformers/flash-attention-is-exact]
updated: 2026-11-03
---

为一个新的 70B 级解码器设计注意力栈。它要在单张 80 GB 加速卡上，以批大小 1 服务 128K token 的上下文。请覆盖头布局、位置方案、kernel，以及把这几项串起来的显存算术。

## Short answer

先算显存，因为显存决定其余选择。按 8 个键值头、80 层、头大小 128、16 位类型计算，存下的键和值每 token 每层占 4096 字节；还没加载任何权重，32K 时就约 10 GiB，128K 时约 40 GiB。所以头布局选分组查询注意力或潜在注意力，存储类型降到 FP8 把这些字节减半，位置方案用带基数缩放的旋转编码，让模型不靠位置表也能到 128K，kernel 用分块实现，让 N 乘 N 的分数矩阵从不进入主存。然后再算一遍：16 位下，70B 级模型光是权重就比 80 GB 的卡还大，所以权重也要用 4 位类型，KV cache 和激活值才放得下。

## Full answer

### 头布局

在这个规模下，用 64 个键值头的普通多头注意力存储量约为前者的 8 倍，32K 时约 80 GiB，整张卡就满了。8 个键值头的分组查询注意力是生产环境的默认选择，质量几乎不损失。如果显存还是不够，潜在注意力把键和值压缩成一个低秩向量，每一步多花一些 FLOPs 做解压。两种方案下，查询头都保持 64 个，头大小都是 128。

### 显存表

```text
per token per layer = 2 * n_kv_heads * d_head * bytes
                    = 2 * 8 * 128 * 2 = 4096 bytes (4 KiB)
32K context         = about 10 GiB
128K context        = about 40 GiB
```

FP8 KV cache 把每个值的字节数减半，128K 那一行也随之减半。然后加上权重。16 位下，70B 级模型每个参数占两个字节，还没存任何 KV cache 就超过了整张 80 GB 的卡。8 位下，权重仍然占掉卡的大部分。只有 4 位权重类型，才能给 128K 的 FP8 KV cache 和激活值留出空间。批大小为 1 是题目给定的要求；每多一个并发请求，就多一份 KV cache。

### 位置方案

对查询和键做旋转，并用 NTK-aware 缩放或 YaRN 按目标长度缩放基数。它不增加参数，编码的是相对距离，课程里的参考模型家族就是这样从 8K 扩到 128K 的。可学习的位置表需要 128K 行，而且长度到此为止。线性偏置注意力是训练阶段的合理替代，外推能力强，但旋转编码的调节旋钮更干净，也和现有生态一致。

### Kernel

从约 2K token 起，注意力就受内存带宽限制，所以在 128K 下分块 kernel 不是可选项。针对硬件用当前的分块实现，硬件代际支持时用 FP8；训练用的 kernel 留在有反向传播的版本上。

### 定方案前要测什么

1. 做完长上下文微调后，分别测目标长度和原始短长度下的困惑度。
2. 量化权重、KV cache 和激活值都放在卡上时 128K 的峰值显存，以及 4 位权重带来的质量损失。
3. 对比 128K 和 8K 的每 token 耗时，确认 kernel 和 KV cache 的表现是线性的。

## Follow-ups

- **Level 3:** 线性偏置注意力外推能力强，为什么不选它？ Expected: 对新模型来说它是合理选择，但旋转编码有长上下文工具链，也有可以缩放的基数；而且两种方案训练完都换不了。
- **Level 4:** 产品后来要求在 128K 下支持批大小 8。哪些地方要变？ Expected: KV cache 乘以 8，所以要换潜在注意力、更小的存储类型、更短的最大长度，或者加卡；权重不变。
- **Level 4:** 分组查询注意力是从头训练，还是由多头检查点转换？ Expected: 新模型从头训练；转换后再微调适用于已有的检查点，并且需要做质量检查。
- **Level 4:** Flash Attention 到哪一步就帮不上忙了？ Expected: 它消除的是 N 乘 N 的读写流量，并不缩小 KV cache；KV cache 仍随上下文线性增长，所以在 128K 下起决定作用的是 KV cache 的账。

## Wrong answers

- "为了质量用完整的多头注意力，显存很便宜。" 在 128K 下，光是完整的 KV cache 就超过了整张卡。
- "正弦编码能处理任意长度，所以位置方案已经解决了。" 公式可以延伸，但模型从没见过那些相位；实践中到达 128K 靠的是带基数缩放的旋转编码。
- "重视质量的模型不用分块 kernel，因为它会改变输出。" 它在 16 位运算的重排误差内是精确的，长上下文的成本能负担得起，靠的正是它。

## Taught in

[多头注意力一课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)给出各种头变体，[位置编码一课](../../../phases/07-transformers-deep-dive/04-positional-encoding/)给出缩放技巧，[KV cache 与 Flash Attention 一课](../../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)完成显存算术。
