---
id: why-subword-tokens
title: 为什么语言模型读取子词并以字节为基底
card: tokenization-decoding
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [screen, ml-breadth]
tags: [tokenization, subword, byte-level-bpe, unknown-token, vocabulary]
minutes: 6
lessons: [phases/05-nlp-foundations-to-advanced/19-subword-tokenization, phases/10-llms-from-scratch/01-tokenizers]
manuals: []
practice: []
cheatsheet: [tokenization]
related: []
updated: 2026-11-03
---

为什么目前所有的语言模型都采用子词 token，而不是直接读取完整单词或单个字符？为什么绝大多数模型都在原始字节之上构建词表？

## Short answer

单词级词表无法容纳所有词，新词会变成 unknown token，模型就丢失了这部分信号。字符级分词不会遇到未知输入，但会让序列延长数倍，把注意力花在拼写上。子词保留完整的常见词，把罕见词拆成有意义的片段；以 256 个字节值为基础，任何文字的输入都能编码，不会出现 unknown token。

## Full answer

### 三种分词粒度的权衡

| 粒度层次 | 词表规模 | 典型失效模式 |
|---|---|---|
| 单词级 | 极其庞大且仍不完备 | 遇到未登录词直接退化为 unknown token；仅英语就有超百万种词形 |
| 字符级 | 仅需数百个 | 10 个词的句子会膨胀为约 50 个 token；模型不得不反复重新学习 t、h、e 拼在一起代表一个词 |
| 子词级 | 30K 至 128K | 无上述缺陷；罕见词拆成片段 |

像 "unhappiness" 这样的罕见词，在字符级下是 11 个字符 token，在子词级下仅需 3 个子词片段：un、happi、ness。这些片段带有模型可以复用的含义。

### 为什么要在最底层选用字节

字节级词表将 256 个字节值作为最底层的基础 token，并在其上迭代学习合并规则。任何字符串在任何编码下都是字节序列，所以不会出现 unknown token，也不需要为任何语言做特殊处理。业界熟知的 50,257 规模词表，精确构成为：256 个基础字节加 50,000 条合并规则加 1 个特殊 token。

### 为什么分词器是模型架构的一部分，而非简单的数据预处理

分词器决定了模型整个生命周期中看到的输入。词表若把一个常见词拆成四个片段，每次请求都会浪费上下文和算力，训练后也无法撤销这个选择。计费和延迟都按 token 计算，所以分词器也是成本模型的一部分。

## Follow-ups

- **Level 1:** 每词 token 数（fertility）衡量什么？ Expected: 平均每个词生成的 token 数量；1.0 表示一词对应一 token，数值越大代表模型为表达相同内容付出的计算量越大。
- **Level 2:** 为什么在字节级词表下 unknown token 会彻底消失？ Expected: 每个字节本身就是一个合法的基底 token，任何输入在应用合并规则前就已经完全可由已知 token 表达。
- **Level 2:** 过小的词表在推理阶段会带来什么额外代价？ Expected: 序列显著变长，因此生成答案需要执行更多的前向传播步数，且单次上下文窗口能容纳的实际文本量变少。
- **Level 3:** 为什么在模型训练完成后无法修补一个糟糕的分词器？ Expected: 嵌入矩阵的各行以及模型的全部内部权重都是针对这套特定 token ID 学习出来的；更换新 ID 无法继承已学表征，且旧文本会被映射到完全不同的 ID。

## Wrong answers

- "字符级分词是最稳妥的选择，因为它永远不会出现 unknown。" 字节级分词具备完全相同的完备性保证，而字符级会让序列长度剧增数倍。
- "引入更大规模的词典列表就能解决 unknown 问题。" 新词、拼写错误、源代码以及各种语言不断涌现；没有哪份词表是完备的。
- "一个 token 就代表一个单词。" token 可以是一个字节、一个子词片段、一个完整单词，甚至是一小段短语，这完全取决于学习到的合并规则。

## Taught in

[子词分词课程](../../../phases/05-nlp-foundations-to-advanced/19-subword-tokenization/)对比了不同分词算法，而[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)结合具体示例推导了三种粒度的选型。
