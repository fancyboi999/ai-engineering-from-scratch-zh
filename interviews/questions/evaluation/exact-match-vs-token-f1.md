---
id: exact-match-vs-token-f1
title: 精确匹配给正确答案打了零分
card: evaluation
kind: concept
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [screen, ml-breadth]
tags: [exact-match, token-f1, normalization, metrics]
minutes: 5
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks, phases/19-capstone-projects/41-eval-pipeline]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/tokenizer-is-the-benchmark]
updated: 2026-11-03
---

你的问答系统返回 "June 29th, 2007."，参考答案是 "June 29, 2007."。队友报告这个样本得了 0 分，要求把整套评测换成 token F1。你怎么回复？

## Short answer

两个指标各自适合不同形态的答案。精确匹配在归一化后比较整个字符串，多一个字符就是 0 分。token F1 比较两边的 token 词袋，这一对大约能得 75%。先给精确匹配加上归一化，再按要评分的答案形态选择指标。

## Full answer

### 各自比较什么

精确匹配先把两边归一化，再判断是否相等。综合项目里的精确匹配评测会转小写、去掉首尾空白、合并连续空白；如果两边只差结尾的标点，还会去掉它。经过这一步，"Paris"、"Paris." 和 "  paris  " 都算同一个答案。"29th" 里的后缀不是标点，所以这一对仍然判错。

token F1 把两边切成 token，计算多重集的交集，再取精确率和召回率的调和平均。它容忍语序变化和改写。但它会被字面重合骗过：一个预测和参考答案共享大部分 token、却改了一个事实，照样能拿高分。

### 用哪个

| 答案形态 | 指标 |
|---|---|
| 日期、数字、选项字母、标签 | 带归一化的精确匹配 |
| 有几种合理措辞的短语 | token F1，取所有参考答案中的最高分 |
| 句子或段落 | token F1 作为下限，再用校准过的 judge 判断含义 |

### 为什么不全换掉

token F1 奖励的是共享的词，不是正确性。一个先复述问题、再给出错误实体的长答案，得分可能比简短的正确答案还高。答案确定的地方保留精确匹配。改写很常见的地方用 token F1。只有含义才算数的地方用 judge，并且先校准。

## Follow-ups

- **Level 1:** token F1 等于 1 是什么意思？ Expected: 归一化后，预测和参考答案的 token 多重集完全相同，顺序不限。
- **Level 2:** 参考答案是 "Paris"，预测是 "Paris."。不做归一化时，哪个指标会判错？ Expected: 精确匹配；加上结尾标点规则后就能通过。
- **Level 2:** 什么时候要在多个参考答案中取最高分？ Expected: 一个问题有不止一个合理的答案字符串时；F1 和 ROUGE-L 都取得分最高的那个目标。
- **Level 3:** token F1 很高，答案却是错的。怎么回事？ Expected: 字面重合但内容错误，比如一句话和参考答案共享大部分 token，里面的实体却是错的；对实体单独做精确匹配，或者用 judge。

## Wrong answers

- "精确匹配坏了，删掉它。" 对日期、数字和选择题字母，带归一化的精确匹配就是正确的指标；缺的只是归一化这一步。
- "token F1 能理解含义。" 它只数共享的 token；两个没有共同 token 的答案可能都对，一个错误答案也可能共享大部分 token。
- "人会给这个打 100 分，所以一律用 judge。" judge 要花钱，还要先跑一轮校准；对日期来说，归一化的精确匹配免费而且精确。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)就是以这一对答案开篇的，[评测流水线综合项目](../../../phases/19-capstone-projects/41-eval-pipeline/)给出了精确匹配和 token F1 的归一化规则。
