---
id: refuse-when-confidence-is-low
title: 让助手在证据不足时说不知道
card: rag
kind: design
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [refusal, hallucination, citations, threshold]
minutes: 10
lessons: [phases/19-capstone-projects/69-end-to-end-rag-system, phases/05-nlp-foundations-to-advanced/13-question-answering, phases/19-capstone-projects/08-production-rag-chatbot, phases/19-capstone-projects/66-reranker-cross-encoder]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/design-rag-over-company-docs, rag/faithfulness-vs-relevance]
updated: 2026-11-03
---

文档助手对每个问题都回答，包括语料未覆盖的问题，而用户最记得那些编造的回答。设计允许系统说“不知道”的路径，并说明怎样衡量它是否有效。

## Short answer

为每个查询记录重排模型第 1 名的分数，低于语料专属阈值就拒答，不把弱相关块交给生成器。要求生成器只依据片段回答、每条论断都带引用，片段答不了就说不知道。测拒答校准：在文档库里没有答案的问题上统计系统拒答的比例，并跟踪错误自信率。

## Full answer

### 第一关：生成之前

重排模型课程记录交叉编码器第 1 名的分数。第 1 名分数低于语料专属阈值，说明命中的是域外内容，端到端课程这时直接拒答：生成器返回不带引用的拒答文本。生产综合项目称之为不确定模式，并测量错误自信下降了多少。问答课程的起点更简单：对检索最高相似度设阈值，在留出集上调。

### 第二关：生成之中

prompt 要求只用片段、每项论断用锚点引用、片段不能回答时说不知道。问答课程测得，明确的依据约束和拒答指令，相比朴素 prompt 可降低 40 到 60% 的幻觉。

### 第三关：生成之后

解析答案，将每项论断与其锚点引用的片段核对。没有锚点，或引用片段不支持该论断，就删除或要求重问。即使弱答案通过分数门槛，也不能交付引用材料不支持的论断。

### 怎样测量

- **拒答校准。** 文档库无答案的问题中，系统拒答的比例。
- **错误自信率。** 这些问题中，系统仍作答的比例。
- **错误拒答率。** 语料内有答案的问题中，被拒答的比例；阈值过高会使它恶化。

在留出集调整阈值，不根据生产轶事调参。嵌入模型、重排模型或语料变化后重新校准。

## Follow-ups

- **Level 3:** 阈值从哪里来？ Expected: 从已知语料内外问题组成的留出集第 1 名分数分布中确定，它依赖语料。
- **Level 3:** 除“只用上下文”，生成 prompt 还要什么？ Expected: 逐项用锚点引用，无法作答时说不知道；问答课程中明确指令减少 40 到 60% 幻觉。
- **Level 4:** 过多拒答也是失败，如何平衡？ Expected: 同时跟踪域外问题错误自信率和域内问题错误拒答率，在留出集调整阈值。
- **Level 4:** 引用后过滤怎样与拒答门槛配合？ Expected: 每项论断核对引用片段；无锚点或片段不支持就删除或重问，使通过分数门槛的弱答案也无法交付无依据论断。

## Wrong answers

- "告诉模型小心一点。" 指令看不到检索分数，第一关应在生成之前。
- "返回块少于 k 个就拒答。" 数量不等于置信度，弱相关块也能填满 k 个位置。
- "用样本设一次阈值就够了。" 阈值依赖语料，会随嵌入模型、重排模型和语料变化。

## Taught in

[端到端 RAG](../../../phases/19-capstone-projects/69-end-to-end-rag-system/)课程构建拒答路径和带引用的生成器，[问答](../../../phases/05-nlp-foundations-to-advanced/13-question-answering/)课程定义拒答校准，综合项目[生产 RAG](../../../phases/19-capstone-projects/08-production-rag-chatbot/)加入不确定模式，[交叉编码器](../../../phases/19-capstone-projects/66-reranker-cross-encoder/)课程记录第 1 名分数。
