---
id: multilingual-tax
title: 同一个 prompt，用韩语要多花 token
card: tokenization-decoding
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, forward-deployed-ai-engineer]
rounds: [screen, customer]
tags: [tokenization, multilingual, fertility, context-window, bytes]
minutes: 6
lessons: [phases/10-llms-from-scratch/01-tokenizers, phases/05-nlp-foundations-to-advanced/19-subword-tokenization, phases/10-llms-from-scratch/02-building-a-tokenizer]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/vocab-size-tradeoff]
updated: 2026-11-03
---

一位韩国客户反馈：同一个 prompt，韩语版占用的上下文窗口比英语版多得多，账单也更高。为什么会这样？模型构建方该怎么做？

## Short answer

词表是在以英语为主的文本上训练的，合并主要覆盖英语，其他文字只能退回到短片段或原始字节。在较旧的词表上，韩语平均每个词 2 到 3 个 token；表达同样的意思，非拉丁文本的 token 数可能是英语的 5 到 10 倍；一个汉字在 UTF-8 里占 3 个字节，没有合并时，每个字就是好几个 token。构建方的办法是在多语言数据上训练更大的词表，这也是某个模型家族把词表从 32K 扩到 128K 的原因。

## Full answer

### token 花在了哪里

字节级分词器永远不会失败，但只能压缩它有合并可用的内容。每个汉字 3 个字节，日文字符 3 到 4 个字节，一个 emoji 4 个字节，可能占 5 个 token。训练语料里某种文字很少时，合并表里给它的片段就很少，文本基本是一个字节一个 token。

### 客户感受到什么

- 上下文窗口是 token 预算，同一份文档更难放进去。
- 按 token 计价，同一个请求更贵。
- 延迟按生成的 token 计算，用这种文字回答更慢。

课程的说法是：用这种文字的用户，实际拿到的上下文窗口只有英语用户的一半。

### 构建方怎么做

1. 在与目标语言配比一致的语料上训练词表。
2. 扩大词表，让更多合并服务于非拉丁文字；某个家族从 32K 扩到 128K，主要就是为此。
3. 用能直接在原始文本上训练、不需要预分词的库，让不用空格分词的文字也能切好。
4. 测量每种语言的每词 token 数（fertility），随模型一起公布。

### 怎么测

从同一个平行语料里取意思对齐的 10 个句子，覆盖英语、西班牙语、中文、韩语和阿拉伯语，用候选词表分别分词，比较每个字符平均的 token 数。这些比值就是这笔税；如果句子没有对齐，只能作为抽查结果报告。

## Follow-ups

- **Level 1:** 用一句话定义每词 token 数指标。 Expected: 分词器平均每个词产生的 token 数，越高说明模型处理同样文本要干的活越多。
- **Level 2:** 怎样为一个新词表测量这笔税？ Expected: 把几种语言里对齐的句子分词，比较每个字符或每个词的 token 数。
- **Level 2:** 为什么更大的词表对英语以外的文字有帮助？ Expected: 可以把更多合并用在这些文字的字节模式上，每个字符或词需要的 token 就更少。
- **Level 3:** 这笔税对产品的成本模型有什么影响？ Expected: 按 token 计价和按 token 计算的延迟都随 token 数增长，同一功能在受影响的语言里更贵、更慢，上下文预算也变小。

## Wrong answers

- "韩语对模型来说更难理解。" 模型看到的是 ID；额外成本来自分词器的合并，不来自语言本身。
- "给韩语用字符级分词器。" 按字符切会让每条序列更长；正确做法是让合并覆盖这种文字。
- "模型给韩语的上下文窗口更小。" 窗口的 token 数相同；只是分词器在每个词上花了更多 token。

## Taught in

[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)提出了多语言税，[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)列出了相关的坑，[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)给出了各种文字的字节数。
