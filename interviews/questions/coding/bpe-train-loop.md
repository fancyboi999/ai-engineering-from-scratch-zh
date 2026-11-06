---
id: bpe-train-loop
title: 从词频训练 BPE 合并列表
card: coding
kind: take-home
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, take-home]
tags: [bpe, tokenization, merge-table]
minutes: 30
lessons: [phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/10-llms-from-scratch/01-tokenizers]
manuals: []
practice: [bpe-merge-step]
cheatsheet: [tokenization]
related: [coding/bpe-merge-no-overlap, coding/tokenizer-roundtrip-specials]
updated: 2026-11-03
---

给你一个语料字典：键是词，每个词是字节 id 组成的元组；值是这个词出现的次数。写出生成有序合并列表的训练循环，并说明让循环保持确定性的三条规则。然后说明循环不能对调用方的数据做什么。

## Short answer

每一步统计每个词内部所有相邻字符对，按词频加权；选出计数最高的字符对，把它的每次出现改写成一个新 id，并记录这次合并。三条规则是：字符对不跨越词边界，计数相同时取元组顺序最小的字符对，没有字符对重复出现时停止。输入字典和其中的元组始终不变；循环每一步构建一个新语料。

## Full answer

### 循环

```python
def train(units, num_merges, first_id=256):
    merges = []
    units = dict(units)
    for i in range(num_merges):
        pairs = count_pairs(units)
        best = best_pair(pairs)
        if best is None or pairs[best] < 2:
            break
        new_id = first_id + i
        units = {apply_merge(word, best, new_id): freq for word, freq in units.items()}
        merges.append((best, new_id))
    return merges, units
```

最前面的 id 留给原始字节，所以第一次合并拿到下一个空闲 id，之后每次合并依次再取下一个。按训练顺序排列的合并列表就是分词器。给新文本编码时，按同样的顺序应用同样的合并；推理时顺序一变，解码的就是另一串 id。

### 加权计数

一个出现五次的词里的字符对，给计数加五，而不是加一。每次出现只算一次，罕见的长词就会压过常见的短词，合并顺序也会改变。字符对不会从一个词的结尾跨到下一个词的开头；按词切分，合并才会留在词内，并且能够泛化。

### 平局和停止规则

两个计数相同的字符对，每次运行都必须用同样的方式决出，所以元组顺序最小的那个胜出。没有固定规则时由字典顺序决定，同一份语料训练两次会得到不同的分词器。最高计数低于二时，循环提前停止，因为只出现一次的字符对压缩不了任何东西，只会占用词表位置。

### 不要修改输入

调用方的字典和元组保持原样。原地清空再重新填充字典，或者借助列表改写元组，都会改动调用方可能还在使用的数据。每一步都用合并后的词构建一个新字典。

## Follow-ups

- **Level 2:** 训练推进时符号数量为什么会下降？这对每一步的开销有什么影响？ Expected: 每次合并都会缩短词，语料上的字符对数量随之减少，后面的步更便宜。
- **Level 2:** 平局规则保护的是什么？ Expected: 可复现性；同一份语料在每台机器上都必须得到同一个合并列表。
- **Level 3:** 某一步之后，两个词合并成了同一个元组。新字典要怎么处理？ Expected: 把它们的频次相加，而不是只保留最后一个。
- **Level 3:** 词表大小和合并次数是什么关系？ Expected: 基础字节块，加上每次合并一个 id，再加上预留的特殊 id。

## Wrong answers

- "每个字符对在每个词里只计一次。" 正是频率加权让常见字符对更早胜出。
- "取第一个计数最大的字符对。" 字典顺序在不同输入之间不稳定，分词器会无法复现。
- "一直合并到预算用完。" 只出现一次的字符对没有收益，还浪费词表。

## Taught in

[从零实现 BPE 课](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)给出了训练循环和合并表契约，[分词器课](../../../phases/10-llms-from-scratch/01-tokenizers/)手工演示了一个合并序列，[BPE 练习](../../../practice/bpe-merge-step/)检查平局规则和停止规则。
