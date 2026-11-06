---
id: block-parameter-count
title: 手算一个解码器堆栈的参数量
card: transformers
kind: estimate
level: 3
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, screen]
tags: [parameter-count, feed-forward, swiglu, embeddings, estimation]
minutes: 10
lessons: [phases/07-transformers-deep-dive/05-full-transformer]
manuals: []
practice: []
cheatsheet: [transformers-attention]
related: [transformers/residual-stream-and-dropout]
updated: 2026-11-03
---

手算一个解码器堆栈的参数量：模型宽度 4096，32 层，前馈网络用 SwiGLU，扩展倍数 2.6。再加上不共享权重的嵌入和输出头，词表大小 128K。总数落在哪里？同等规模的公开模型为什么和它略有不同？

## Short answer

每个 block 里，注意力的四个投影共 `4 d^2`，SwiGLU 是 `3 d (r d)`，约 `3 r d^2`。按给定的宽度和扩展倍数，分别约 67M 和 131M，每个 block 约 198M，32 个 block 约 6.3B。不共享的嵌入和输出头再加约 1B，所以整个堆栈落在公开的 8B 附近。真实模型用了分组查询注意力，缩小了键和值的投影，又把 FFN 扩展倍数加宽到 3.5，参数从注意力挪到了 FFN，总数仍然接近。

## Full answer

### 每个 block 的算术

```text
attention:  Q, K, V, O projections, each d x d        -> 4 d^2
FFN:        three matrices of d x (r d)               -> 3 r d^2
norms:      two vectors of length d                   -> negligible
```

代入 `d = 4096` 和 `r = 2.6`：

```text
4 * 4096^2        = about 67M
3 * 2.6 * 4096^2  = about 131M
per block         = about 198M
32 blocks         = about 6.3B
```

### 嵌入

不共享权重的模型有一个形状为 `(vocab, d)` 的 token 嵌入，外加一个同样大小的独立输出头。128K 乘 4096 时，这一对约增加 1B。共享权重的模型两者共用一个矩阵，省下其中一半。

### 公开数字为什么不同

有两个架构选择改变了各部分的数量，但总数变化不大：

1. **分组查询注意力。** 键和值的投影把 `d` 映射到 `n_kv_heads * d_head`，而不是 `d` 到 `d`，所以注意力的参数少于 `4 d^2`。
2. **更宽的 FFN。** 公开模型的扩展倍数约为 3.5，所以 FFN 的参数比上面算的 `3 * 2.6 * d^2` 多。

总数仍然落在 8B 附近。两种版本里，FFN 都占 block 参数的约三分之二。

### 这个数算来做什么

估算某种数据类型下权重占多少显存，卡上剩下的 cache 预算上限是多少，以及在配置文件或模型卡看起来不对时做一次快速核对。

## Follow-ups

- **Level 2:** 为什么 norm 的参数可以忽略？ Expected: 每个 norm 只有一两个长度为 d 的向量，几千个参数，而每个矩阵有几百万。
- **Level 3:** 分组查询注意力怎样改变每个 block 的参数量？ Expected: K 和 V 的投影缩小为 `d` 乘 `n_kv_heads * d_head`，所以注意力的参数少于 `4 d^2`。
- **Level 3:** 为什么两个矩阵、扩展倍数 4，等于三个矩阵、扩展倍数约 2.6？ Expected: `2 * 4 d^2 = 8 d^2`，而 `3 * 2.6 d^2` 约等于 `8 d^2`；现代 block 保住了参数预算，换掉的是激活函数。
- **Level 4:** 团队让嵌入和输出头共享权重。参数量怎么变，你要检查什么？ Expected: 那 1B 里约有一半消失；检查输出 logits 仍然用的是嵌入的转置，并确认质量没有下降。

## Wrong answers

- "参数量随序列长度增长。" 没有任何权重依赖序列长度；长度改变的是激活显存和计算量，不是参数。
- "嵌入只是个零头。" 128K 乘 4096 约为 1B，超过模型的十分之一。
- "大部分参数在注意力里。" 每个 block 约三分之二的参数在 FFN。

## Taught in

[完整 transformer 一课](../../../phases/07-transformers-deep-dive/05-full-transformer/)做了这个计算，并解释了公开模型为什么不同。
