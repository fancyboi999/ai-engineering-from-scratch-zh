---
id: chunk-size-by-query-type
title: 首次建索引前评审分块方案
card: rag
kind: tradeoff
level: 2
roles: [applied-ai-engineer, ai-data-engineer, forward-deployed-ai-engineer]
rounds: [design-review, ml-depth]
tags: [chunking, chunk-size, overlap, recall]
minutes: 10
lessons: [phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag, phases/11-llm-engineering/06-rag, phases/19-capstone-projects/64-chunking-strategies-advanced]
manuals: []
practice: []
cheatsheet: [rag]
related: [rag/overlap-measure-first, rag/take-home-stratified-eval]
updated: 2026-11-03
---

团队准备为新语料建索引，请你评审分块器。他们因为博客推荐，选了语义切分、每块 1000 个 token、重叠 20%。你会怎么说？

## Short answer

从查询类型出发，而不是照搬文章。事实型问题适合 256 到 512 个 token，分析或多跳问题适合 512 到 1024，整节理解问题适合 1024 到 2048。先用 512-token 递归切分、零重叠，在 50 条查询集上测 recall@5，再调整参数。

## Full answer

### 为什么大小取决于问题

文本块要足够大，包含答案及局部上下文；又要足够小，让前 k 个结果主要包含答案而非噪声。64 到 128 个 token 太小，可能只剩“上季度增长了 15%”，却不知道主语。2048 个 token 及以上太大，一块可能只有 10% 谈收入、90% 谈人数，它的嵌入就没有明确指向。

| 查询类型 | 块大小 |
|---|---|
| 事实型 | 256 到 512 个 token |
| 分析或多跳 | 512 到 1024 个 token |
| 整节理解 | 1024 到 2048 个 token |

### 测量结果说明什么

- 分块研究中，512-token 递归切分以 69% 对 54% 胜过语义切分。
- 稀疏检索研究中，重叠没有可测收益；每个重叠的 token 都要再嵌入、再存储一次，索引成本随重叠增长。
- 上下文达到约 2,500 个 token 时，回答质量急剧下降，块越大越容易撞上这道断崖。
- 语义切分不设最小大小时，会产生损害检索的 40-token 碎片。

### 尚无基准时怎样选默认值

第一个分块器由三项属性决定：文档类型、段落长度、格式是否带结构。无结构的散文用递归切分；Markdown 和 API 文档用标题切分器；代码用语法感知切分器。拿不准时，递归切分是最强的单一基线。

### 然后测量

建立按查询类型分层的 50 条评估集，逐个候选测 recall@5。每个分块器都要限定最小和最大大小，绝不让一个块跨两篇文档。

## Follow-ups

- **Level 2:** 为什么块大小依赖问题类型？ Expected: 块必须装下答案及其上下文，又要足够小，让前 k 个结果讲的是答案而不是周围的噪声。
- **Level 2:** 语料是 Markdown API 文档，先试什么？ Expected: 结构化的标题切分器，因为这种格式带显式结构；删除或合并只有标题的块。
- **Level 3:** 不论用哪种策略，每个分块器都需要哪两道防护？ Expected: 最小和最大大小，因为 5 个 token 和 5000 个 token 的块都会破坏检索。
- **Level 3:** 之后更换嵌入模型，要重跑什么？ Expected: 分块评估，因为最优方案依赖语料与模型，语义切分的边界也会随模型变化。

## Wrong answers

- "语义切分遵循含义，因此最好。" 在实测研究中它输给 512-token 递归切分；不设下限还会产生碎片。
- "重叠是安全余量，应该保留。" 研究发现重叠常常毫无收益，还会按其大小成比例地增加索引成本；任何重叠都要用消融实验证明其价值。
- "大块给模型更多上下文。" 约 2,500-token 上下文时质量会下降，多主题文本块也会稀释自身嵌入。

## Taught in

[分块策略](../../../phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/)课程给出大小表和测量，[RAG](../../../phases/11-llm-engineering/06-rag/)课程说明块过小与过大的故障，[分块比较](../../../phases/19-capstone-projects/64-chunking-strategies-advanced/)根据三种属性选择默认方案。
