---
id: bpe-wordpiece-unigram
title: 构建子词词表的三种方法
card: tokenization-decoding
kind: tradeoff
level: 2
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [ml-breadth, screen]
tags: [bpe, wordpiece, unigram, sentencepiece, vocabulary]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/19-subword-tokenization, phases/10-llms-from-scratch/01-tokenizers]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/bpe-training-loop]
updated: 2026-11-03
---

主流的子词算法有三种：字节对编码（BPE）、WordPiece 和 Unigram。对比它们各自怎样构建词表，说出哪一种会有意给同一个词两种不同的切分，再说说你会选哪些库。

## Short answer

字节对编码自底向上，合并频次最高的相邻符号对。WordPiece 也自底向上合并，但给一对打分时，用合并后片段的计数除以两个组成部分计数的乘积，所以它偏好共现多于偶然的符号对；它还用双井号前缀标记词中的续接片段。Unigram 自顶向下：先有一个很大的候选集，给每个片段一个概率，再剪掉那些删了对语料似然损害最小的片段，也正因如此，它可以采样其他切分来做正则化。

## Full answer

### 准则对照

```text
BPE merge criterion:        count(A, B)
WordPiece merge criterion:  count(AB) / (count(A) * count(B))
Unigram:                    prune the piece whose removal least lowers the corpus log-likelihood
```

第一种问哪一对出现得最多。第二种问哪一对一起出现的次数比由各部分推算的预期更多。第三种问语料最不需要哪些片段。

### 谁在用哪种

| 算法 | 方向 | 标记方式 | 使用者 |
|---|---|---|---|
| 字节对编码 | 自底向上合并 | 词首片段保留前导空格 | 大多数解码器家族，词表有 50,257、128,256 或更大 |
| WordPiece | 按似然比自底向上合并 | 续接片段用 `##` | 经典编码器，30,522 个 token |
| Unigram | 自顶向下剪枝 | 不做预分词训练时用 `▁` 表示空格 | 一个编码器-解码器家族，32,000 个 token |

### 采样切分

Unigram 模型在推理时是概率性的。它可以返回最可能的切分，也可以采样另一种切分，这就是训练时的子词正则化：同一个词以几种形式出现，模型学到的片段更稳健。基于合并的算法是确定性的。

### 库

第一个库直接在原始文本上训练合并或剪枝算法的词表，把空格编码成可见符号，不需要预分词，所以是多语言场景的默认选择。第二个是 Rust 实现的编码器，速度快，词表与一个广泛使用的 API 家族一致，但只能编码。第三个库在同一处训练并服务这两种算法。

### 怎么选

训练单语言模型：字节对编码。训练多语言模型：字符覆盖率接近 0.9995 的 Unigram。对接现有 API 词表做服务：只编码的那个库。用小模型做边缘推理：词表更小的 Unigram。

## Follow-ups

- **Level 2:** 什么是子词正则化？ Expected: 用 Unigram 模型采样出的切分来训练，让同一个词以几种形式出现。
- **Level 2:** 可见的空格符号带来了什么？ Expected: 空格成了普通符号，分词器不需要预分词，也能处理不用空格分词的文字。
- **Level 3:** 多语言词表用哪种算法、什么设置？ Expected: 在原始文本上训练 Unigram，字符覆盖率接近 0.9995，让罕见文字被保留，而不是映射成未知符号。
- **Level 3:** 为什么只能编码的库训练不了你的分词器？ Expected: 它提供的是预构建词表和快速编码器；训练在另外两个库里。

## Wrong answers

- "同一语料上，WordPiece 和字节对编码得到的词表相同。" 准则不同，合并就不同；似然比偏好出人意料地常在一起的符号对，而不只是高频的符号对。
- "Unigram 和合并类算法一样是确定性的。" 它是概率性的，可以有意采样切分。
- "把空格编码成符号的那个库本身是一种算法。" 它是一个库，在原始文本上训练合并或剪枝算法。

## Taught in

[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)对比了这三种算法和这几个库，[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)给出了合并准则与词表规模。
