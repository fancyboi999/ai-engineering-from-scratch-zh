---
id: bi-encoder-vs-cross-encoder
title: 检索模型与重排模型
card: rag
kind: concept
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-depth]
tags: [reranking, cross-encoder, bi-encoder, latency]
minutes: 6
lessons: [phases/19-capstone-projects/66-reranker-cross-encoder, phases/11-llm-engineering/07-advanced-rag]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/rerank-pool-size, rag/cross-encoder-passes-per-query]
updated: 2026-11-03
---

检索流水线用一个模型查找候选文本块，再用另一个模型排序。说明两个模型分别接收什么输入，以及为什么第二个模型不扫描整个语料库。

## Short answer

双编码器（bi-encoder）分别对查询和文档生成嵌入，再比较向量。因此，每个文档向量只需在建立索引时计算一次。交叉编码器（cross-encoder）把查询和一篇文档作为同一个序列读取，输出一个相关性分数，能直接建模两段文本之间的交互。每个查询与文档对都需要一次前向传播，因此只对较短的候选列表运行交叉编码器。

## Full answer

### 输入形式

双编码器把文本映射为向量。查询向量和文档向量位于同一空间，按余弦相似度排序。两次编码彼此不可见，因此模型必须在不知道问题的情况下，把文档中有用的信息压缩到一个向量中。

交叉编码器接收单个序列 `[CLS] query_tokens [SEP] document_tokens [SEP]`。注意力跨越两段文本，每个文档 token 都能关注每个查询 token。首位置的输出送入线性头，得到一个数值。

### 成本

双编码器对文档编码一次，之后可反复用于查询。交叉编码器则为每个文本对运行一次。若语料库有 1000 万篇文档，一个查询就要执行 1000 万次前向传播，请求预算无法承受。进阶 RAG 课程给出的差距是比双编码器慢 100 到 1000 倍。

### 分阶段处理

先用成本低的模型检索前 N 个候选，再用成本高的模型将 N 个候选重排，取前 K 个。N 通常较小，为 50 到 200。最终质量可达到交叉编码器的水平，但受第一阶段 recall@N 的限制。N 太小限制的不只是延迟，也包括质量。

生产上的选型是约 22M 参数的交叉编码器。更大的重排模型留给离线任务，或 K 很小的场景。

## Follow-ups

- **Level 1:** 查询到来前可以计算哪种输出？ Expected: 双编码器的文档向量；交叉编码器的分数依赖具体查询。
- **Level 2:** 两阶段流水线的质量上限由什么决定？ Expected: 第一阶段 recall@N，因为重排模型只能重新排列检索器返回的候选。
- **Level 2:** 文本对中两段文本的顺序重要吗？ Expected: 重要。交叉编码器不对称；应先输入查询，否则召回率会大幅下降。
- **Level 3:** 团队承诺用 22M 参数重排模型做到 p95 低于 100 ms。首先规划什么？ Expected: 先规划内存和批处理。float32 权重占 88 MB；N 个候选逐个打分，延迟会乘以 N。

## Wrong answers

- "交叉编码器是更好的嵌入模型。" 它不输出嵌入，而是为一个查询与一篇文档输出一个分数。
- "对每个文本块运行交叉编码器就能获得最佳质量。" 1000 万篇文档意味着每次查询要执行 1000 万次前向传播。
- "更大的重排模型总是更好。" 生产选型是 22M 参数这一级；更大的模型损失的延迟多于换来的质量，只留给离线重排或 K 很小的场景。

## Taught in

[交叉编码器](../../../phases/19-capstone-projects/66-reranker-cross-encoder/)课程构建两阶段流水线，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程说明成本差距。
