---
id: rrf-beats-score-sum
title: 混合检索为什么融合排名而非分数
card: rag
kind: concept
level: 2
roles: [applied-ai-engineer, ai-data-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-depth]
tags: [rrf, hybrid-search, rank-fusion, bm25]
minutes: 8
lessons: [phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense, phases/11-llm-engineering/07-advanced-rag]
manuals: []
practice: [reciprocal-rank-fusion]
cheatsheet: [rag-production]
related: [rag/read-the-rrf-function, rag/error-code-query-misses]
updated: 2026-11-03
---

同一个查询得到了 BM25 和向量检索两个排名列表。工程师建议按 alpha × BM25 分数 + (1 - alpha) × 余弦相似度合并。问题在哪里？你会怎么做？

## Short answer

BM25 分数没有固定上界，并随语料变化；余弦相似度则在 -1 到 1 之间，因此每次重建索引都需要重新调整加权和的 alpha。倒数排名融合改用排名：每篇文档得分为各列表中 1 / (k + rank) 之和，k 取 60。两种检索器的排名可以直接比较，无需校准分数尺度。

## Full answer

### 公式与计算示例

文档在向量列表排第 1、BM25 列表排第 5，得分为 1/(60+1) + 1/(60+5) = 0.0164 + 0.0154 = 0.0318。另一文档分别排第 3 和第 2，得分为 1/(60+3) + 1/(60+2) = 0.0159 + 0.0161 = 0.0320。第二篇略胜：在两个列表中都表现好的文档，胜过只在一个列表排首位、在另一个列表排名较低的文档。

### k 的作用

k 为 60 时，第 1 名贡献 1/61，第 10 名贡献 1/70。贡献下降较慢，靠后的候选仍有投票权。k 越小，头部结果影响越大；k 越大，曲线越平。

### 为什么不用原始分数

分数线性组合需要为每个语料调整 alpha；每次重建索引时 BM25 分数分布变化，平衡就可能失效。排名没有尺度问题。综合项目课程指出，自 2010 年以来，这个基于排名的基线在每一届公开 TREC 赛道中都胜过分数插值；公开记录过混合搜索做法的生产搜索引擎也得出了同样结论。

### 不破坏方法的可调权重

若有证据表明某个检索器在自己的数据上更好，可为其排名贡献乘一个权重。排名衰减形状和不依赖分数尺度的性质均保持不变。

## Follow-ups

- **Level 2:** 常数 k 控制什么？ Expected: 排名贡献衰减速度；k 为 60 时，第 1 名贡献 1/61，第 10 名贡献 1/70，因此较深候选仍有影响。
- **Level 2:** 何时降低 k？ Expected: 希望各列表头部结果主导融合顺序时。
- **Level 3:** 已知 BM25 在当前语料中更好，如何表达？ Expected: 给 BM25 列表的排名贡献乘一个列表权重，保留衰减形状和不依赖分数尺度的性质。
- **Level 3:** 为什么排名融合能适应重建索引，而加权分数不能？ Expected: 语料变化后排名含义仍然一致，但 BM25 分数及其分布会变，原先的 alpha 不再适合。

## Wrong answers

- "把两个分数归一化到 0 到 1，再相加。" 两者分布仍会随查询和语料不同；重建索引后平衡仍可能漂移。
- "选两个列表中原始分数最高的文档。" 这样某个无上界的 BM25 分数会主导每一个查询；可比较的单位是排名。
- "融合只是两个列表之间的平局裁决。" 演示中每类查询的首位都由融合决定；两个列表都表现好的文档胜过只在一个列表领先的文档。

## Taught in

[混合检索](../../../phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/)课程给出公式、k 的作用及不用分数插值的原因，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程演算两篇文档的例子。
