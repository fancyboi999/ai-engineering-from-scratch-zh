---
id: vocab-size-tradeoff
title: 词表扩到 128K，用数字算清代价和收益
card: tokenization-decoding
kind: estimate
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [screen, system-design]
tags: [vocabulary-size, embedding-matrix, compression, inference-cost, estimation]
minutes: 8
lessons: [phases/10-llms-from-scratch/01-tokenizers, phases/05-nlp-foundations-to-advanced/19-subword-tokenization]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/why-subword-tokens]
updated: 2026-11-03
---

一个团队想把新模型的词表从 32K 扩到 128K 个 token。嵌入维度是 4,096。用数字说明这个改动的代价和收益。

## Short answer

嵌入矩阵从 32,000 乘 4,096（约 1.31 亿参数）变成 128,000 乘 4,096（约 5.24 亿），仅分词器一项就多出约 400M 参数；输出头如果不和嵌入共享权重，还要再多同样一份。换来的是压缩：一段在 32K 下约 100 个 token 的英文段落，在 128K 下约 70 个 token。生成这段话所需的前向次数因此少了约 30%，非英语文字获益最多。课程的经验值是：1B 参数以下用 32k，1 到 10B 用 50 到 100k，多语言或前沿模型用 200k 及以上。

## Full answer

### 代价

```text
32,000  x 4,096 = about 131M parameters
128,000 x 4,096 = about 524M parameters
difference      = about 400M
```

每一行都是模型要学的一个嵌入，罕见的行得到的梯度更新很少。小模型配超大词表，会把很大一部分参数花在一张查找表上。

### 收益

| 词表 | 每个英文词的 token 数 |
|---|---|
| 30,522 | 约 1.4 |
| 50,257 | 约 1.3 |
| 100,256 | 约 1.2 |
| 128,256 | 约 1.1 |
| 200,019 | 约 1.0 |

每词 token 越少，序列越短，每个回答需要的前向次数越少，同一个上下文窗口装下的文本越多。对一个服务数百万请求的模型来说，这类输出所需的前向次数少约 30%。

### 谁获益最多

英语在 32K 下已经压缩得不错。被偏英语词表切成字节的那些文字获益要大得多，这也是某个模型家族把词表从 32K 扩大四倍到 128K 的原因。

### 怎么定

词表大小随模型规模和语言配比变化。1B 参数以下，嵌入会压过模型其余部分，所以保持在 32k 左右。1 到 10B 之间，用 50 到 100k。不管规模多大，多语言都会把它推向 200k 甚至更高。用留出集上的每词 token 数、unknown 比率、压缩比和字节级精确的往返来验证这个选择。

## Follow-ups

- **Level 2:** 每词 token 更少，为什么推理更快？ Expected: 生成每个 token 要一次前向，同样的文本 token 更少，前向次数就更少。
- **Level 3:** 128K 词表对模型的输出端有什么影响？ Expected: 输出头每个 token 一行，所以它随嵌入一起变大；不共享权重的输出头会让额外参数翻倍。
- **Level 3:** 课程里那个模型家族为什么从 32K 改到 128K？ Expected: 为了让各语言的压缩更公平；偏英语的词表让其他文字的有效上下文窗口只有一半。
- **Level 4:** 训练之前怎样验证词表大小？ Expected: 在留出文本上统计每种语言的每词 token 数、unknown 比率、相对参考编码器的压缩比，以及字节级精确的往返。

## Wrong answers

- "词表越大越好。" 1B 参数以下，多出来的行会压过模型其余部分，罕见的行也训练不足。
- "和模型比起来，嵌入只是个零头。" 128K 乘 4,096 时，它约有 5.24 亿参数。
- "词表大小不影响一次请求的成本。" 每词 token 数决定序列长度，序列长度决定前向次数和上下文预算。

## Taught in

[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)算了嵌入的账并给出了每词 token 数表，[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)给出了大小经验值和验证方案。
