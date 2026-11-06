---
id: bpe-training-loop
title: 字节对编码的一步训练及其产物
card: tokenization-decoding
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [screen, coding]
tags: [bpe, merge-table, training, pair-counting, determinism]
minutes: 6
lessons: [phases/10-llms-from-scratch/01-tokenizers, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/05-nlp-foundations-to-advanced/19-subword-tokenization]
manuals: []
practice: [bpe-merge-step]
cheatsheet: [tokenization]
related: [tokenization-decoding/why-subword-tokens]
updated: 2026-11-03
---

在一个小语料上，带我走一遍字节对编码（BPE）的一步训练，再说说训练出来的产物到底是什么。

## Short answer

先把每个词拆成基础符号，即字节或字符。在整个语料上统计所有相邻符号对，按每个词的出现次数加权；把最高频的一对合并成一个新符号，分配下一个空闲 ID，改写它的每一处出现，然后重复，直到词表达到目标大小。产物是有序的合并列表；词表由它推出，之后编码时用的也正是这份列表，按同样的顺序应用。

## Full answer

### 推演一步

语料："lower" 出现 5 次，"lowest" 出现 2 次，"newest" 出现 6 次。

```text
l o w e r      (x5)
l o w e s t    (x2)
n e w e s t    (x6)

pair counts: (w,e): 13   (e,s): 8   (s,t): 8   (l,o): 7   (o,w): 7   (n,e): 6   (e,r): 5
merge (w,e) -> we

l o we r       (x5)
l o we s t     (x2)
n e we s t     (x6)
```

重新计数后，下一步里 (we,s) 和 (s,t) 都是 8，打平了。课程的实现按符号对本身排序来打破平局，所以在同一语料上跑两次，得到的合并表相同。步数足够多以后，"west" 会成为一个完整符号。

### 这个循环体现的三个事实

1. 按词频加权，常见词里的符号对会先胜出。
2. 先按空白和标点预切分，合并就只发生在词内部。词尾标记还能把独立成词的 "low" 和作为 "lower" 开头的 "low" 区分开。
3. 合并列表是有序的。编码按训练时的顺序应用合并，所以顺序也是产物的一部分。

### 字节级

以字节为基础符号时，前 256 个 ID 就是字节值，第 k 次合并的 ID 是 256 加 k。把语料看作一组符号序列，一步的开销与它的总长度成线性关系；每次合并都会缩短序列，所以 100 万个词训练到 1 万个 ID 只要几秒。

### 交付什么

合并表和特殊 token 表。字节串词表可以由它们重建。

## Follow-ups

- **Level 1:** 为什么要按词频给符号对加权，而不是每个不同的词只算一次？ Expected: 合并要服务于模型将来看到的文本，而常见词会出现很多次。
- **Level 2:** 符号对计数打平时，为什么必须用确定的规则打破平局？ Expected: 同一语料上的两次训练必须得到同一张表，否则同一段文本会得到不同的 ID。
- **Level 2:** 目标词表从 300 增长到 600 时，一句话编码后的长度会怎么变？ Expected: 变短，因为更多合并覆盖了更长的片段；这条曲线就是压缩曲线。
- **Level 3:** 为什么统计符号对之前要先把语料切成词？ Expected: 不切的话，合并会跨越词边界，词表里会塞满无法泛化的完整短语。

## Wrong answers

- "BPE 挑的是能组成最有意义片段的那一对。" 它挑的是频次最高的一对；意义只是副产品，基于似然的变体是另一种算法。
- "词表才是产物，合并列表可以丢掉。" 编码需要按顺序应用合并；只有词表，说明不了新文本该怎么切。
- "所有合并都根据初始的符号对计数一次选定。" 每次合并都会改变计数，所以循环每一步之后都要重新计数。

## Taught in

[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)推演了这个例子，[BPE 综合项目](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)实现了按确定规则打破平局的循环，[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)点明了这三个事实。
