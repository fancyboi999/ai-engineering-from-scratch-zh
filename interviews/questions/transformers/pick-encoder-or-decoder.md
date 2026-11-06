---
id: pick-encoder-or-decoder
title: 三个产品，各选编码器、解码器还是两者都用
card: transformers
kind: tradeoff
level: 2
roles: [applied-ai-engineer, forward-deployed-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [system-design, ml-breadth]
tags: [encoder-only, decoder-only, encoder-decoder, cross-attention, pretraining-loss]
minutes: 8
lessons: [phases/07-transformers-deep-dive/05-full-transformer, phases/07-transformers-deep-dive/07-gpt-causal-language-modeling]
manuals: []
practice: []
cheatsheet: [bert-gpt-t5]
related: [transformers/causal-mask-minus-infinity]
updated: 2026-11-03
---

你手上有三个产品：一个文档搜索排序模型，一个写代码的编程助手，一个语音转文字系统。每个产品分别选哪种 transformer 结构？预训练损失和这个选择有什么关系？

## Short answer

排序和 embedding 用纯编码器，生成用纯解码器，输入是明确的源序列时用编码器-解码器，比如要转写的音频。编码器能看到每个位置的两侧，用掩码预测训练，表示能力强，但没法生成。解码器在因果 mask 下用下一个 token 预测训练，所以能生成，而且扩展起来最顺，这就是它在语言上胜出的原因。损失决定了模型到底能不能产出文本。

## Full answer

### 三种骨架

| 需求 | 结构 | 原因 |
|---|---|---|
| 分类、embedding、基于文本的问答 | 纯编码器 | 双向注意力一次看到整个输入 |
| 文本生成、对话、代码、推理 | 纯解码器 | 因果 mask 加下一个 token 损失；每层一次注意力和一次 FFN |
| 结构化输入到结构化输出、翻译、语音识别 | 编码器-解码器 | 编码器负责源序列；解码器负责生成，并通过交叉注意力读取源序列 |

### 区分它们的那一句话

解码器根据前面的 token 预测每个 token 的概率。编码器根据没被遮住的 token 预测被遮住的 token。同样的 block，同样的注意力，mask 和目标不同。只有前一种损失能产出一个会接着写序列的模型。

### 交叉注意力

编码器-解码器模型里的解码器 block 有三个子层：带 mask 的自注意力、交叉注意力和 FFN。交叉注意力中，查询来自解码器，键和值来自编码器的输出。这是信息从源序列流向输出的唯一位置。纯解码器去掉了它。

### 纯解码器为什么在语言上胜出

它用一种架构同时处理理解和生成，扩展得很顺，而上下文学习让一个模型看几个例子就能照做，不用为每个任务加新的输出头。当输入有很强的源序列属性时，编码器-解码器仍然最合适：一段波形，一句另一种语言的话，一张要总结的表格。

### 三个答案

1. 排序：用编码器，或者基于编码器的 embedding 模型，因为你需要整篇文档的表示，不需要生成。
2. 编程助手：用解码器，因为产品就是生成，而因果损失让生成成为可能。
3. 语音转文字：用编码器-解码器，因为音频是一种自成一类的源序列，文本是另一个序列。

## Follow-ups

- **Level 2:** 哪个子层只存在于编码器-解码器结构中？ Expected: 交叉注意力，查询来自解码器，键和值来自编码器。
- **Level 3:** 为什么纯解码器模型也能做理解类任务？ Expected: 同一个下一个 token 模型靠续写 prompt 回答问题，上下文学习让它不用任务头就能照着例子做。
- **Level 3:** 什么样的文本任务你仍然会选编码器-解码器？ Expected: 输入是明确的源序列、输出是对它的变换时，比如翻译，或对一份固定文档做摘要。
- **Level 4:** 排序团队想复用已经在服务的解码器。怎么做？ Expected: 给它 prompt 并读取某个标签 token 的 logits，或者接一个输出头再微调；把成本和一次前向就能给文档打分的编码器做比较。

## Wrong answers

- "纯解码器模型不能做分类。" 它能，通过 prompt 或加一个输出头；要点在于编码器做这件事往往更便宜。
- "编码器一次生成一个 token。" 它没有因果损失，预测的是被遮住的位置；它没被训练去续写序列。
- "每个 transformer block 都有交叉注意力。" 只有编码器-解码器模型的解码器 block 才有。

## Taught in

[完整 transformer 一课](../../../phases/07-transformers-deep-dive/05-full-transformer/)给出了三种结构和选型表，[因果语言建模一课](../../../phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/)对比了两种损失。
