---
id: design-tokenizer-for-new-model
title: 为多语言代码模型设计分词器
card: tokenization-decoding
kind: design
level: 4
roles: [ai-data-engineer, applied-ai-engineer, inference-engineer]
rounds: [system-design, design-review]
tags: [tokenizer-design, vocabulary-size, character-coverage, multilingual, code]
minutes: 15
lessons: [phases/05-nlp-foundations-to-advanced/19-subword-tokenization, phases/10-llms-from-scratch/01-tokenizers, phases/10-llms-from-scratch/02-building-a-tokenizer]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/vocab-size-tradeoff, tokenization-decoding/multilingual-tax, tokenization-decoding/tokenizer-drift-ci]
updated: 2026-11-03
---

你要启动一个 7B 模型，它要服务多种语言，代码能力也要强。请设计它的分词器：算法、库、词表大小、覆盖率设置，以及训练启动前必须通过的验证方案。

## Short answer

在一个与目标语言和代码配比一致的语料上，训练带字节回退的子词词表；预分词器保留词前空格，把数字和标点单独切开，让代码切得干净。1 到 10B 的模型，经验值是 5 万到 10 万个 token，多语言需求会把它推到区间上端甚至更高；字符覆盖率设在 0.9995 附近，罕见文字才会被保留，而不是映射成 unknown。验证门槛看各语言的每词 token 数、unknown 比率、相对参考编码器的压缩比，以及字节级精确的往返还原；第一步训练之前，在 CI 里冻结分词器文件的哈希。

## Full answer

### 算法与库

课程的表格建议：多语言场景用在原始文本上训练的剪枝类算法，因为它不需要语言相关的预分词，也能处理不用空格分词的文字；单语言语料用合并类算法。混合需求下，只要语料对，两种都行；语料配比比算法影响更大。选能训练的库，不要选只能按别人词表编码的库。两种情况都要开字节回退，这样任何输入都不会是 unknown。

### 词表大小

| 模型规模 | 经验值 |
|---|---|
| 1B 以下 | 约 32k |
| 1 到 10B | 50k 到 100k |
| 多语言或前沿模型 | 200k 及以上 |

文字种类多的 7B 模型落在中间一行的上端。每多一行就多一个要学的嵌入（embedding），128,000 行乘 4,096 维的嵌入矩阵约有 524M 参数，所以词表大小是预算决策，不是常数。收益体现在每词 token 数（fertility）上：偏英语的词表让其他文字每个词要 2 到 3 个 token 甚至更多，非拉丁文本的 token 数可能多出 5 到 10 倍；更大的多语言词表修复的正是这一点。

### 覆盖率与代码

- 混合语料的字符覆盖率设在 0.9995 附近；有罕见文字时，低于 0.995 的设置一律不接受。
- 覆盖率仍漏掉的字符，全部交给字节回退。
- 预分词器保留词前空格，切开连续数字和标点，并处理连续空白，让代码里的缩进和运算符成为稳定的片段。每个汉字占 3 个字节，需要专属的合并，所以语料里汉字必须足够多。
- 一开始就为特殊 token 和对话标记预留固定 ID，任何合并都产生不了这些 ID。

### 语料

按你希望模型擅长的比例，为分词器采样训练文本。也可以在代码语料上训练一个领域词表，再与基础词表合并。在偏英语的样本上训练出的分词器，会在模型整个生命周期里亏待其他所有文字。

### 验证方案

1. 在留出文本上统计每种语言和代码的每词 token 数；这就是你要公布的每词 token 数表。
2. unknown 比率，有字节回退时必须为零。
3. 在同一份留出文本上，计算相对参考编码器的压缩比。
4. 对全部留出文本做往返：先编码再解码，包括 emoji 和特殊 token 的字面字符串。分词器没有归一化器时必须字节级一致；有 NFKC 这类归一化器时，与归一化后的文本比对。
5. 在 CI 里冻结分词器文件哈希和标准 token ID（golden ids），让训练和服务之间不会漂移。

单语言词表低于 16k 的，标记为规格不足；没有哈希检查的词表不准交付。

## Follow-ups

- **Level 3:** 为什么语料配比比算法选择更重要？ Expected: 合并或剪枝留下的片段跟随训练文本里的频次，样本里罕见的文字，不管用哪种算法都分不到几个片段。
- **Level 4:** 空白处理对代码有什么影响？ Expected: 缩进是连续的空格或制表符；预分词器把连续空白单独成块，它们就能成为稳定的 token，而不是粘在下一个词上。
- **Level 4:** 训练六个月后，团队想改词表。你怎么回答？ Expected: 嵌入和所有权重都是按当前 ID 训练的；改词表就要重训，所以分词器决策要在第一步之前过门槛。
- **Level 4:** 分词器信息怎样随模型一起发布？ Expected: 每种语言的每词 token 数表、词表大小和覆盖率、特殊 token 列表，以及文件哈希。

## Wrong answers

- "选 32k，因为以前的模型都用它。" 这个大小服务的是 1B 以下的单语言模型；7B 多语言代码模型会在每种语言上付出代价。
- "保险起见，字符覆盖率设成 1.0。" 全覆盖会把词表浪费在只出现一次的字符上；0.9995 附近加字节回退，既保留罕见文字，又不浪费行。
- "先用英语训练，其他语言以后再加。" 训练之后不重训就改不了词表；所有语言从一开始就必须在分词器语料里。

## Taught in

[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)给出了选型表、大小经验值、覆盖率规则和验证方案，[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)给出了嵌入规模和每词 token 数的计算，[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)讲了预分词、字节数和特殊 token。
