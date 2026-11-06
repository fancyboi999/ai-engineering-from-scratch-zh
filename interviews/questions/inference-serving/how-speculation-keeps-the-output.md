---
id: how-speculation-keeps-the-output
title: 推测解码怎样保证输出不变
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, screen]
tags: [speculative-decoding, eagle3, ngram, acceptance, rejection-sampling]
minutes: 8
lessons: [phases/17-infrastructure-and-production/05-eagle3-speculative-decoding]
manuals: [vllm-101#s-how-speculative-decoding-checks-drafts, sglang-101#s-speculative-decoding, vllm-101#s-use-n-gram-speculation-for-copy-heavy-work]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

推测解码承诺每一步产出好几个 token，同时不改变模型写出的内容。解释引擎怎样兑现这个承诺，加速从哪里来，以及为什么共享服务器的用户越多，收益越小。

## Short answer

一个廉价的提议器先猜接下来的几个 token，目标模型对所有猜测只跑一次，在每个位置算出自己的分布。拒绝采样器保留目标模型认可的每个猜测，在第一个被拒绝的位置从目标模型采样一个正确的 token，然后停止，所以一次验证至少产出一个 token，至多产出猜测数加一个，输出分布与普通解码相同。收益来自 GPU 的空闲时间：小 decode batch 在等显存，batch 变大后这段空闲消失，验证被拒绝猜测的开销就开始占用真正的算力。

## Full answer

### 先猜，再验证

小 batch 上的一个 decode 步要读完所有权重，才能为每个请求产出一个 token，GPU 大部分时间在等显存，处于空闲。推测解码利用的就是这段空闲时间。用贪心采样时，猜测只有等于目标模型在该位置的最高概率 token 才会保留。用随机采样时，拒绝规则让输出分布与目标模型的分布保持一致。在 SGLang 中，接受阈值默认是 1.0，所以贪心请求产出的 token 和不开推测解码时完全相同。

接受长度是每次验证提交的 token 数：被接受的 draft 加上目标模型给出的一个额外 token。在我们的 L4 上，一个真实的 Qwen3-8B 请求每次验证约得到 1.8 个 token。

### 提议器

| 方法 | 猜测从哪里来 |
|---|---|
| `ngram` | 同一请求中与最后几个 token 匹配的前文 |
| `suffix` | 基于之前 prompt 和回答构建的后缀树 |
| `eagle`, `eagle3` | 一个读取目标模型隐藏状态的小 draft head |
| `*_mtp` | 部分模型自带的额外预测头 |
| `draft_model` | 一个单独的小模型 |

N-gram 几乎没有成本，也不需要额外权重。回答需要复制 prompt 时，它能带来收益：编辑文档、引用原文的摘要、保留大部分行的代码修改、从长输入里抽取信息。在我们的 L4 上用随机 prompt 测试，1 个用户时它把每 token 时间从 241.7 ms 降到 76.6 ms，而 4 个用户时 P99 ITL 从 290 ms 升到 1,691 ms。它还会关闭异步调度，日志里只有一条警告。EAGLE3 head 需要针对你的目标模型训练；Qwen3-8B 的公开 head 只有一层，draft 词表有 32,000 个 token。

### 收益为什么随负载下降

只有当一步读显存的时间多于计算时间，这段空闲才存在。batch 变大后，每读一个字节要做的计算更多，空闲时间就消失了。这时验证被拒绝的猜测会花掉真正的算力。一份报告在同一张 GPU、同一个模型上展示了两头的情况：batch 为 1 时，输出从每秒 42.0 个 token 升到 92.5 个；并发 20 时，从 217.8 降到 164.4。维护者的回复是，推测解码本来就是为小 batch 设计的。动态模式正是按这条规则来的：它根据 batch 大小设定猜测数量，batch 大时不再猜测。

### 课里的算术

目标模型每次前向的期望 token 数是 1 + K x alpha，K 是 draft 长度，alpha 是接受率。K 为 5、alpha 为 0.7，验证开销约 10% 时，结果是 4.5 除以 1.1，约 4.1 倍。实际收益多在 2 到 3 倍，因为生产流量上 alpha 很少这么高，而且开销随 batch 增大。课里把高并发下的盈亏平衡 alpha 定在 0.45 到 0.55 附近。

### 要看什么

引擎会导出候选 token 数和被接受的 token 数。用接受数除以候选数得到接受率，再看每步平均 token 数。接受率很高、每 token 时间却没有下降，说明 batch 已经是计算受限。

## Follow-ups

- **Level 2:** 哪种提议器不需要额外的模型？什么时候划算？ Expected: n-gram，它用输出的最后几个 token 去匹配请求里的前文；在编辑、引用、代码修改和信息抽取上划算，在开放式聊天上不行。
- **Level 3:** 接受率很高，每 token 时间却没有下降。这说明什么？ Expected: batch 已经是计算受限；推测解码利用的显存等待时间没有了，所以验证花掉的和省下的一样多。
- **Level 3:** 用贪心采样时，验证在每个位置怎样判定？ Expected: 猜测只有等于目标模型在该位置的最高概率 token 才保留；第一个不匹配的位置换成目标模型的 token，其余全部丢弃。
- **Level 4:** 为什么一次验证提交的 token 永远不会超过 draft 长度加一？ Expected: 目标模型在每个 draft 位置以及最后一个猜测之后的一个位置计算分布，所以所有猜测都通过时，采样器还会从最后那个分布里再抽一个额外 token；遇到拒绝时，它在该位置采样一个正确的 token，然后停止。

## Wrong answers

- "推测解码会稍微改变输出，你是在用一点质量换速度。" 贪心采样时，猜测只有等于目标模型的最高概率 token 才保留，随机采样时，拒绝规则让输出分布与目标模型一致，所以质量不变，不过某一次采样的结果可能与不开推测解码时不同。
- "速度来自 draft，所以 draft 越快越好。" 收益来自小 batch 时 GPU 的空闲时间；一个很快但接受率低的 draft 会增加要花算力的验证，有一份报告在并发 20 时损失了四分之一的吞吐量。
- "压力测试时也开着它。" 有一份报告在 batch 为 1 时速度提高了一倍多，在并发 20 时反而更慢；维护者的回复是，推测解码是为小 batch 准备的。

## Taught in

[推测解码怎样验证 draft](../../../manuals/vllm-101/sections/8-7-how-speculative-decoding-checks-drafts.md)和 [SGLang 推测解码一节](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md)解释了验证规则，[n-gram 一节](../../../manuals/vllm-101/sections/4-2-use-n-gram-speculation-for-copy-heavy-work.md)测量了这个免费的提议器，[EAGLE-3 一课](../../../phases/17-infrastructure-and-production/05-eagle3-speculative-decoding/docs/en.md)给出了接受率的算术。
