---
id: rerank-pool-size
title: 选择重排模型的候选数量
card: rag
kind: tradeoff
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, ml-depth]
tags: [reranking, cross-encoder, latency, recall]
minutes: 10
lessons: [phases/19-capstone-projects/66-reranker-cross-encoder]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/bi-encoder-vs-cross-encoder, rag/cross-encoder-passes-per-query]
updated: 2026-11-03
---

混合检索器后新增了交叉编码器，prompt 最终接收 K 个文本块。团队要确定重排模型评分的候选数量 N，有人建议为了延迟预算把 N 设小。你怎样选择 N，又会拒绝哪些做法？

## Short answer

结合重排输出的召回率曲线与延迟预算选择 N。在留出查询集上扫描 N，质量提升通常在 20 到 50 个候选附近出现拐点，此后每多一个候选都要多一次前向传播，却毫无收益。N 至少取 K 的三倍，因为重排模型只能提升已经进入候选池的文本块。

## Full answer

### 一个可调参数

两阶段流水线只有一个可调参数。双编码器返回 N 个候选，交叉编码器为每个文本对评分并保留 K 个。课程用示意值描述曲线：N 从 5 增到 20，recall@1 上升；增到 50 时提升变小；增到 100 时不再变化。这些数值不是测试数据上的实测结果，但拐点是真实存在的。

### 召回上限

交叉编码器的召回率无法超过双编码器的 recall@N。N 太小限制的不只是延迟，也包括质量。如果 N 等于 K，重排模型只能重新排列 K 个候选，无法引入新候选，因此 recall@K 无法变化，看起来提升为零。

### 成本因素

- 将 N 个文本对合为一个批次执行前向传播。逐个评分会让延迟乘以 N。
- 规划内存。22M 参数交叉编码器的 float32 权重在处理批次前就占 88 MB。
- 用查询哈希和文档 ID 作为键缓存重排输出。语料稳定时重排结果不变，缓存命中可直接减少延迟。

### 三者一起固定

双编码器、交叉编码器与 N 是同一个选型组合。任意一个发生变化，原评估就失效，因此模型变化后要重新扫描 N。

## Follow-ups

- **Level 3:** 曲线为什么趋平？ Expected: 拐点之后新增候选很少相关，重排模型没有更多值得提升的项，每个候选却仍要一次前向传播。
- **Level 3:** 为省延迟把 N 从 50 降到 10，还改变了什么？ Expected: 召回上限，因为重排模型看不到池外的块；应重新评估，不能凭假设决定。
- **Level 4:** 嵌入模型升级后，原 N 还有效吗？ Expected: 无效；新双编码器改变 recall@N，发布前必须重新扫描。
- **Level 4:** 不缩小 N，怎样降低延迟？ Expected: 对 N 个文本对执行批量前向传播，并以查询和文档 ID 为键缓存。

## Wrong answers

- "为节省时间，让 N 等于 K。" 这样重排模型只能给这 K 个块重新排序，引入不了新块，recall@K 无法变化。
- "N 越大越好。" 拐点后质量提升饱和，每多一个候选仍要一次前向传播。
- "选定 N 后一直保持。" N 与两个模型绑定，任一模型变化都会使原选择失效。

## Taught in

[交叉编码器](../../../phases/19-capstone-projects/66-reranker-cross-encoder/)课程给出延迟与质量曲线、三倍 K 规则，以及批处理和内存说明。
