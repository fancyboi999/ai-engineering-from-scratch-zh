---
id: pre-tokenization-regex
title: 合并之前那一刀切分是做什么的
card: tokenization-decoding
kind: concept
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, ml-depth]
tags: [pre-tokenization, regex, bpe, whitespace, word-boundaries]
minutes: 8
lessons: [phases/10-llms-from-scratch/02-building-a-tokenizer, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/05-nlp-foundations-to-advanced/19-subword-tokenization]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/bpe-training-loop]
updated: 2026-11-03
---

任何合并执行之前，生产分词器都会先用一个正则表达式把文本切成块。说说经典模式会把 `Hello, world! Don't stop.` 切成什么样；再解释既然合并可以直接在原始字符流上跑，为什么还要切这一刀。

## Short answer

这个模式把句子切成八块：`Hello`、`,`、` world`、`!`、` Don`、`'t`、` stop` 和 `.`。第一个词之后的每个词都带着前面的空格，缩约形式在撇号处拆开，标点单独成块。之后的合并只在块内运行，绝不跨块边界拼接符号；不切的话，训练会学到跨词的合并，词表里塞满完整短语，片段在新文本上的泛化也更差。

## Full answer

### 这个模式

```text
'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+
```

依次是：常见的缩约形式词尾、可带前导空格的词、可带前导空格的连续数字、连续标点，以及空白。`\p{L}` 和 `\p{N}` 这两个类需要第三方的 `regex` 模块；标准库会退回到 ASCII 字符类，这对多语言文本是错的。

### 前导空格为什么跟着词走

` hello` 和 `hello` 是不同的 token。空格留在词上，词首片段和词中片段就能区分开，解码器只凭 token 就能还原空格。也因为这一点，每个调用方都必须明确：prompt 开头要不要加前缀空格。

### 为什么要切

合并循环按频次贪心。在原始字符流里，"e" 后面跟空格再跟 "t" 很常见，循环会乐于学出一个把前一个词结尾和后一个词开头连在一起的片段。这种片段迁移不了：下一段文本里的词对不一样。先切开，每次合并都留在词内，而能泛化的规律正在词内。

### 另一种设计

直接在原始文本上工作的分词器把空格当作普通符号，让合并或剪枝算法自己找边界。它不需要语言规则，能处理不用空格分词的文字，也允许跨词片段；这种片段压缩率稍好一点，可读性稍差一点。

### 综合项目的版本

一个按空白和标点做的简单切分。对小训练集来说，这足以把合并留在词内，流水线的其余部分不变。

## Follow-ups

- **Level 2:** 为什么开头没有空格的 prompt 和开头有空格的 prompt 分词结果不同？ Expected: 空格是词首 token 的一部分，第一个词会映射到不同的 ID；要显式设定前缀空格的行为。
- **Level 3:** 对这个模式来说，`regex` 模块为什么重要？ Expected: 它的 Unicode 字母类和数字类覆盖 ASCII 以外的文字，标准库的引擎没有这种支持。
- **Level 3:** 不切、直接在原始文本上跑，取舍是什么？ Expected: 好处是不要语言规则，对不用空格的文字表现好；代价是跨词片段，压缩率略好但更难解读。
- **Level 3:** 分词器文件没变，两台机器上的 ID 却不一样。这个阶段有什么可能的原因？ Expected: 一台机器缺了 `regex` 模块，退回到 ASCII 模式，切出的块就不同了。

## Wrong answers

- "预分词就是按空格切。" 这个模式还处理缩约形式、数字、标点和连续空白，并把空格留在词上。
- "切分只是表面功夫，合并自己也会找到同样的片段。" 不切的话，合并会跨越词边界，词表会塞满短语。
- "把标点粘到它前面的词上。" 那样 `world!` 和 `world` 就是不同的片段，每种标点变体都要占用词表。

## Taught in

[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)给出了这个模式及其输出，[BPE 综合项目](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)解释了合并为什么留在词内，[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)列出了空白相关的坑。
