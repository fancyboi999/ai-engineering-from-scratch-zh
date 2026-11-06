---
id: merge-order-at-encode
title: 编码器为什么要按顺序重放合并列表
card: tokenization-decoding
kind: concept
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, ml-depth]
tags: [bpe, merge-rank, encoding, determinism, tokenizer]
minutes: 8
lessons: [phases/10-llms-from-scratch/01-tokenizers, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/05-nlp-foundations-to-advanced/19-subword-tokenization]
manuals: []
practice: [bpe-merge-step]
cheatsheet: [tokenization]
related: [tokenization-decoding/bpe-training-loop]
updated: 2026-11-03
---

编码时，BPE 分词器手里有完整的合并表。为什么它必须按学到的顺序重放这些合并？两个合并能在同一位置生效时，会出什么问题？

## Short answer

编码必须重现训练对同一段文本做过的事，而训练是按这个顺序一次一个地看到合并的。如果第一条合并产生了 "th"，第五条合并由 "th" 加 "e" 产生 "the"，那么 "the" 只能在 "th" 出现之后才能形成。两个合并能用在同一位置时，rank 更低、也就是学得更早的那条胜出；改掉这条规则，同一段文本就会得到不同的 ID，模型看到的是一个从没训练过的 ID 分布。

## Full answer

### 朴素编码器

```python
def encode_bpe(word, merges):
    symbols = list(word) + ["</w>"]
    for a, b in merges:
        i = 0
        while i < len(symbols) - 1:
            if symbols[i] == a and symbols[i + 1] == b:
                symbols = symbols[:i] + [a + b] + symbols[i + 2:]
            else:
                i += 1
    return symbols
```

它对每个词都走一遍整张表，开销是词长乘以合并条数。对按字符训练的合并表来说结果正确，但慢。

### 基于 rank 的编码器

综合项目的版本从字节切分开始，反复执行：在当前序列里找出 rank 最低的可用合并，应用它，再扫描一遍，直到表里没有合并可用。生产编码器保留同样的语义，用 rank 查找加候选符号对的优先队列实现，运行时间接近线性。

### 为什么这条规则就是契约

训练循环和编码器共用这张合并表，这种共用就是全部契约。训练先合并频次最高的一对，所以只要输入同时含有一条早期合并的两半，在训练数据里它总是按这种方式合并的。偏好后学合并、或者偏好最长片段的编码器，会给出模型没见过的切分。什么都不会崩溃，只是 ID 变了。

### 特殊 token 在这里怎么处理

文本结束标记这类保留字符串，在合并循环之前就被精确匹配，映射成固定 ID。它们从不参与合并，所以无论表的顺序如何，都不会被拆开或与相邻内容拼在一起。

## Follow-ups

- **Level 2:** 朴素循环为什么慢？ Expected: 每个词都要扫描整张合并表，开销随表大小乘以词长增长。
- **Level 3:** 生产编码器怎样做到接近线性时间？ Expected: 对每个相邻符号对做 rank 查找，再用优先队列始终取出 rank 最低的可用合并。
- **Level 3:** 两个分词器在不同语料上训练到同样的词表大小。它们给出的 ID 一样吗？ Expected: 不一样；语料不同，合并表和 rank 都不同。
- **Level 3:** 用什么测试锁住这个顺序？ Expected: 编码一个留出的词，与记录下来的 ID 比对；综合项目的测试还锁住了往返还原和特殊 token 的预留。

## Wrong answers

- "贪心地取词表里能匹配上的最长 token。" 那是另一种算法，切分结果和训练时不同。
- "顺序无所谓，因为合并可以交换。" 后面的合并依赖前面合并产生的符号，所以不能交换。
- "按 token 长度给合并排序。" 长度不是 rank；长片段可能学得早，短片段可能学得晚。

## Taught in

[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)解释了有序的合并表，[BPE 综合项目](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)实现了基于 rank 的编码器，[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)给出了朴素循环及其开销。
