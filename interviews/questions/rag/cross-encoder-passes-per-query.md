---
id: cross-encoder-passes-per-query
title: 估算重排模型扫描整个索引的工作量
card: rag
kind: estimate
level: 2
roles: [applied-ai-engineer, ai-data-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [reranking, cross-encoder, estimate, latency]
minutes: 8
lessons: [phases/19-capstone-projects/66-reranker-cross-encoder, phases/11-llm-engineering/07-advanced-rag]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/bi-encoder-vs-cross-encoder, rag/rerank-pool-size]
updated: 2026-11-03
---

有人提议用交叉编码器替换向量检索器，对 1000 万个文本块逐一评分，保证不漏结果。估算一个问题的工作量，并说出你的替代方案。

## Short answer

每个文本块一次前向传播，一个问题就需要 1000 万次，请求预算无法承受。保留双编码器作为第一阶段，因为文档向量只需在建索引时计算一次；交叉编码器只处理 50 到 200 个候选。进阶 RAG 课程给出的每对文本计算成本，是双编码器向量比较的 100 到 1000 倍。

## Full answer

### 计算次数

| 阶段 | 索引时的工作 | 每次查询的工作 |
|---|---|---|
| 双编码器 | 每个文本块计算一次嵌入并保存 | 计算一次查询嵌入，再逐个比较文本块向量 |
| 交叉编码器 | 分数依赖查询，无法预存 | 每个文本对一次前向传播，即候选池中每个块一次 |

交叉编码器若扫描整个索引，候选池就是索引本身。1000 万个块意味着一个问题执行 1000 万次前向传播。

### 分阶段方案

先用低成本阶段召回较大的候选集，例如混合检索前 50 个，再由交叉编码器重排，最终取前 5 个。昂贵模型只需运行 50 次，而非 1000 万次，质量收益集中在最重要的最终排序上。

### 还要规划两个数值

- 约 22M 参数的生产交叉编码器，float32 权重占 88 MB。只加载一次并常驻内存。
- 将 N 个候选作为一个批次处理。若逐个评分，延迟会乘以 N。

## Follow-ups

- **Level 2:** 双编码器哪部分成本只支付一次？ Expected: 索引时的文档嵌入；每次查询只计算一次查询嵌入并执行比较。
- **Level 2:** 为什么在前 50 个候选上运行昂贵模型值得？ Expected: 50 次前向传播放得进请求预算，而质量提升正集中在候选的最终顺序上。
- **Level 3:** 索引规模翻倍，哪个阶段的单次查询成本增加？ Expected: 第一阶段，因为它要与每个块比较；只要 N 固定，重排模型仍是 N 次前向传播。
- **Level 3:** 这种规模下第一阶段也不能暴力扫描，应使用什么，有何代价？ Expected: 近似最近邻索引，以少量召回损失换速度；进阶 RAG 课程指出，200 万个块时近似误差可能把相关块挤出前 k 个。

## Wrong answers

- "全部打分，GPU 很快。" 每个问题 1000 万次前向传播，用户等不了这么久；课程里的模型还没处理任何批次就已占 88 MB。
- "预计算每个块的交叉编码器分数。" 分数依赖查询，无法提前计算。
- "用更小的交叉编码器扫描全库。" 更小的重排模型丢掉的质量多于省下的延迟，前向传播次数也没有减少。

## Taught in

[交叉编码器](../../../phases/19-capstone-projects/66-reranker-cross-encoder/)课程估算计算次数和模型大小，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程给出成本差距及从前 50 个缩减到前 5 个的流程。
