---
id: hyde-invents-a-symbol
title: 编造的段落让代码搜索变差了
card: rag
kind: debug
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [hyde, query-rewriting, bm25, hybrid-search]
minutes: 10
lessons: [phases/19-capstone-projects/67-query-rewriting-hyde, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/pick-the-query-rewriter, rag/error-code-query-misses]
updated: 2026-11-03
---

代码搜索助手启用假设答案改写后，某子系统的问题效果变差：原本排第 2 的标准文档，现在掉出了词法检索前 10 名。假设片段读起来很流畅。发生了什么，应如何改？

## Short answer

模型编造了索引中不存在的函数名。改写后的查询里，原本负责词法匹配的真实符号不见了；段落其余部分是通用文字，在许多文档上都能得分；稠密检索还会为虚构 token 返回看似合理的邻近项。应把假设答案限制为两三句，降低改写查询在融合中的 BM25 权重，并让已有字面符号的查询绕过改写器。

## Full answer

### 改写器为何存在

用户和语料用词不同。改写器让模型以文档口吻写出可能回答问题的片段，用该片段的嵌入代替查询。模型不了解你的语料，所以这段文字作为事实是错的；对稠密检索来说这没关系，因为检索器关心 token 分布，而不是真假。

### 为什么这里失败

代码搜索是这个技巧最糟的场景。模型会自信地编造标识符。在词法侧，编造名称替代真实符号，原本能在正确文档上获得高分的罕见词缺失，周围通用文字把分数分散到许多文档。稠密侧即使面对语料中完全不存在的 token，也会产生看似合理的向量，返回貌似正确的错误邻近项。融合只有在词法侧正确投票时才能纠正它，这里词法侧也已经失效。

### 按顺序修正

1. 把假设答案限制在两三句。段落越长，噪声 token 越多；越短，又会丢掉这个技巧需要的词法信号。
2. 按课程建议，对改写查询降低融合中的 BM25 列表权重。
3. 按查询选择策略。课程的启发式规则把术语密集的改述查询交给假设答案；已含精确符号的查询属于字面查询，词法检索无需帮助就能将其排到第 1。
4. 用证据验证。按查询类别切分评估，分别比较开关改写器时的召回率，只在确有提升的类别启用。

## Follow-ups

- **Level 3:** 假设答案越长为什么可能越差？ Expected: 会积累更多在许多文档上得分的 token；课程将长度限制为两三句。
- **Level 3:** 哪些查询应绕过改写？ Expected: 已经包含字面符号的查询，词法检索无需帮助就能将其排首位。
- **Level 4:** 如何用证据证明修复？ Expected: 把评估按查询类别切片，逐个切片比较开关改写器时的召回率，只在有收益的切片启用。
- **Level 4:** 稠密侧为什么救不回来？ Expected: 虚构 token 仍产生貌似合理的向量并返回错误邻近项；只有词法侧正确投票时，融合才能修正。

## Wrong answers

- "告诉模型不要编造名称。" 模型无从知道你的语料里有哪些名称；课程明确说，这段文字按设计就是事实错误的。
- "所有查询都关闭改写。" 改写在措辞与语料不一致的查询上胜出；应按查询类别路由。
- "提高 BM25 权重，找回词法信号。" 被虚构 token 损害的正是词法信号；课程建议降低改写查询的 BM25 权重。

## Taught in

[查询改写](../../../phases/19-capstone-projects/67-query-rewriting-hyde/)课程说明虚构标识符故障及两项修正，[混合检索](../../../phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/)课程解释两个检索器如何处理词表外 token。
