---
id: mtp-sequential-vs-parallel
title: 哪种多 token 预测设计能白送一个草稿
card: tokenization-decoding
kind: concept
level: 3
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, design-review]
tags: [multi-token-prediction, speculative-decoding, pretraining, causal-chain, shared-head]
minutes: 10
lessons: [phases/10-llms-from-scratch/18-multi-token-prediction]
manuals: []
practice: []
cheatsheet: [speculative-decoding]
related: [tokenization-decoding/hidden-state-drafts]
updated: 2026-11-03
---

一个预训练团队想让每个位置监督的不只是下一个 token。一种设计是在主干上挂几个独立的输出头。另一种是把小模块串起来，每多一个深度就加一个模块。哪种设计能在推理时给你一个可用的推测解码草稿？训练时要付出什么代价？

## Short answer

串联的设计。第 k 个模块接收上一深度的隐藏状态和实际下一个 token 的嵌入，跑自己的一个小 transformer 块，并复用共享的嵌入和共享的输出头；所以它对位置 t 加 k 加 1 的预测，以位置 t 加 k 的 token 为条件，这和解码器走的因果链相同，让模块在推理时可以起草 token，深度 1 上接受率 80% 或更高，吞吐约 1.8 倍。独立的头都读同一个隐藏状态，彼此无法互为条件。训练代价是预训练慢约 10%，每个模块约 14 h 平方个参数，损失权重前期 0.3、后期 0.1。

## Full answer

### 串联的配方

对截至位置 i 的前缀，深度 0 是主干，深度 k 建在深度 k 减 1 之上：

```text
h_i^(k) = T_k( M_k · concat( RMSNorm(h_i^(k-1)), RMSNorm(E(t_{i+k})) ) )
logits_{i+k+1} = Out( h_i^(k) )
L_k = cross-entropy( logits_{i+k+1}, t_{i+k+1} )
L_MTP = (lambda / D) · sum over k of L_k
```

`E` 是嵌入表，`Out` 是输出头，都与主模型共享。`M_k` 把上一深度的隐藏状态和下一个 token 的嵌入合成一个向量。`T_k` 是一个 transformer 块。总损失是主模型的下一个 token 损失加 `L_MTP`，lambda 在训练前 10% 取 0.3，之后取 0.1。

### 链为什么重要

要预测往后第二个 token，模块一能看到下一个 token 实际是什么。推理时，你改为喂给它起草出来的 token，它就预测再下一个。这正是隐藏状态草稿的工作方式，所以训练好的模块等于白送一个草稿网络。并行的头都从同一个隐藏状态出发，第二个头用不上第一个头的答案。验证器仍然可以检查它们的猜测，只是被接受得更少。

### 算账

每个模块：投影是 `2 h^2`，块内注意力加门控 MLP 约 `12 h^2`，合计约 `14 h^2`。隐藏维度 7168、一个模块时，纸面上约 720M；公开数字是在 671B 的主模型上加了 14B，约 2%，因为模块的 MLP 继承了主模型的专家结构。嵌入和输出头是共享的，不增加参数。

### 得到什么

1. 更密的训练信号：每个隐藏状态都在 D 加 1 个目标上受监督，报告显示推理、数学和代码评测都有稳定提升。
2. 推理时的草稿：深度 1 上接受率 80% 或更高，生成吞吐约 1.8 倍；训练时付出的代价，模型第一次上线服务就能收回。

### 与事后草稿对比

| | 事后的隐藏状态草稿 | 内置模块 |
|---|---|---|
| 何时训练 | 预训练之后 | 预训练期间 |
| 能否用于已有权重 | 能 | 不能，需重训 |
| 草稿参数 | 一到两层 | 一个块加一层投影 |
| 接受率 | 0.88 到 0.92 | 深度 1 上 0.80 及以上 |
| 速度以外的收益 | 无 | 更密的训练信号 |

预训练归你管、隐藏维度至少 4096 时，用内置设计；在 1B 规模上，这部分开销弊大于利。权重已经存在时，用事后草稿。

## Follow-ups

- **Level 3:** 为什么嵌入和输出头要与主模型共享？ Expected: 不增加参数，而且模块和主干在同一个词表空间里预测。
- **Level 3:** 为什么公开的参数增量比 `14 h^2` 的估算大？ Expected: 模块的 MLP 和主模型有同样的专家结构，参数因此成倍增加。
- **Level 4:** 有两个模块时，第二个的输入是什么？ Expected: 第一个模块的隐藏状态，加上往后第二个 token 的嵌入，用来预测往后第三个 token。
- **Level 4:** 团队想给已有的稠密模型微调一个新头来加上这个能力。你怎么回答？ Expected: 模块没有经过训练，主干也没被额外损失塑造过；课程的立场是它需要一次预训练，已有权重该用事后草稿。

## Wrong answers

- "额外损失取代了下一个 token 预测。" 它以小权重加在主损失上；主目标保持不变。
- "快速微调一下，就能把模块装到训练好的模型上。" 这是预训练阶段的设计选择；已有权重应该用事后草稿。

## Taught in

[多 token 预测课程](../../../phases/10-llms-from-scratch/18-multi-token-prediction/)给出了串联配方、损失、参数核算，以及与事后草稿的对比。
