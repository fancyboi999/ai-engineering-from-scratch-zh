---
id: take-home-bpe-tokenizer
title: 带回家的作业：带测试的字节级分词器
card: tokenization-decoding
kind: take-home
level: 3
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [take-home, coding]
tags: [take-home, bpe, byte-level, special-tokens, round-trip]
minutes: 15
lessons: [phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/10-llms-from-scratch/02-building-a-tokenizer, phases/10-llms-from-scratch/01-tokenizers]
manuals: []
practice: [bpe-merge-step]
cheatsheet: [tokenization]
related: [tokenization-decoding/bpe-training-loop, tokenization-decoding/read-the-decoder-round-trip]
updated: 2026-11-03
---

这是我们发出的一道带回家作业：实现一个字节级的字节对编码分词器，包含训练、编码和解码，有两个预留的特殊 token，再附一套测试。说说你会提交什么设计、附带哪些测试，以及报告里放哪一张图。

## Short answer

ID 0 到 255 留给原始字节，紧接着的一小段留给文本结束标记和填充标记；语料按空白和标点预切分；训练时统计按词频加权的相邻符号对，用确定的规则打破平局后合并最高的一对；编码时反复应用能用上的 rank 最低的合并，直到没有可用的；解码时拼接各 ID 展开的字节，再做一次 UTF-8 解码。测试锁住字节级精确的往返，覆盖没见过的句子、emoji，以及允许标志开和关两种情况下的特殊 token 字面字符串，另外锁住合并顺序和预留 ID。那张图是压缩曲线：目标词表从 300 增长到 600 时，一句留出句子的编码长度。

## Full answer

### 设计

```text
ids 0..255        raw bytes
next few ids      <|endoftext|>, <|pad|>
then              one id per merge, in training order
```

- **保留输入字节原样**，让往返做到字节级精确。兼容性归一化会把连字或全角字母映射成普通形式，这是有损的；只有报告把往返承诺限定在归一化后的文本时，才加上它。
- **预切分**成词和标点，让合并留在词内；大型生产分词器的正则模式是可选扩展。
- **训练**：在切分后的语料上统计相邻符号对，按词频加权；把最高的一对合并成下一个空闲 ID，记录这条合并，重复到目标大小。平局按符号对本身打破，两次运行得到同一张表。
- **编码**：允许标志打开时，先精确匹配特殊 token；普通文本从字节开始，反复应用 rank 最低的可用合并。
- **解码**：特殊 ID 映射回标记字符串，其他 ID 映射回字节；拼接全部字节后解码一次，末尾不完整的字符用替换字符处理。

### 测试

1. 在分词器没见过的句子上做往返。
2. 在带 emoji 的句子上做往返，这个字符的 4 个字节可能跨越多个 token。
3. 在包含文本结束字面字符串的句子上做往返：标志关闭时它变成字节，打开时变成预留 ID。
4. 合并顺序：一个留出的词编码成记录好的 ID，打乱后的表则不会。
5. 预留 ID 从不作为合并结果出现，也从不与字节 ID 冲突。
6. 确定性：在同一语料上训练两次，得到同一张表。

### 那张图

训练到几个不同的目标大小，每次编码同一句留出句子，画 token 数随词表大小的变化。合并覆盖的片段越长，数量越少。再画一条压缩比曲线，即 token 数除以输入字节数，0.50 表示 token 数是字节数的一半；它用一个可以跨语料比较的单位表达同一件事。

### 评审看什么

往返的正确性、确定性、特殊 token 路径和合并路径分离得是否干净、测试的质量，以及报告里有没有写出候选人自己踩到的 bug。速度不评分：这个规模下 Python 不到一秒就跑完，用编译型语言写的生产库跑同一算法会快 10 到 100 倍。

## Follow-ups

- **Level 2:** 为什么原始字节先占 ID 0 到 255？ Expected: 这样在有任何合并之前，任何输入都能用词表表示，永远不会有 unknown。
- **Level 3:** 输入以纯文本写出了文本结束标记。允许标志改变什么？ Expected: 关闭时，这个字符串是普通字节和片段；打开时，它映射到预留 ID，合并循环跳过它。
- **Level 3:** 符号对计数打平时，为什么必须用确定的规则打破平局？ Expected: 同一语料上的两次运行必须得到同一张表，否则同一段文本在不同机器上会得到不同的 ID。
- **Level 4:** 把简单切分换成生产用的正则模式。你比较什么？ Expected: 在同一语料上比较两份词表和编码长度，看缩约形式、数字和前导空格分别怎样处理。

## Wrong answers

- "用 Unicode 码点做基础符号。" 码点有几十万个，没见过的字符会留下空缺；字节只有 256 个，而且完备。
- "每个 token 解码成字符串，再把字符串拼起来。" 一个 token 可能只装着多字节字符的一部分；要先拼字节，再解码一次。
- "跳过预切分，压缩率更好。" 那样合并会跨越词边界，词表里塞满迁移不了的短语。

## Taught in

[BPE 综合项目](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)定义了设计、特殊 token 和测试，[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)补充了归一化和正则扩展，[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)定义了压缩比。
