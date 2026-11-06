---
id: read-the-rrf-function
title: 读懂排名融合函数
card: rag
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [coding, screen]
tags: [rrf, code-reading, hybrid-search]
minutes: 8
lessons: [phases/11-llm-engineering/07-advanced-rag, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense]
manuals: []
practice: [reciprocal-rank-fusion]
cheatsheet: [rag-production]
related: [rag/rrf-beats-score-sum]
updated: 2026-11-03
---

阅读进阶 RAG 课程的融合函数。解释分母中的 `+ 1`，说明函数有意忽略了什么，再说说只出现在一个列表中的文档会怎样。

```python
def reciprocal_rank_fusion(ranked_lists, k=60):
    scores = {}
    for ranked_list in ranked_lists:
        for rank, (doc_id, _) in enumerate(ranked_list):
            if doc_id not in scores:
                scores[doc_id] = 0.0
            scores[doc_id] += 1.0 / (k + rank + 1)
    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return fused
```

## Short answer

`enumerate` 从零开始，`+ 1` 将索引转为从一开始的排名，因此排第一的文档按公开公式得到 1/61。函数丢弃检索器原始分数，因为检索器之间可比较的是排名。只在一个列表中出现的文档只获得一次贡献，不因另一个列表缺失而受罚；若该列表排名高，仍可能名列前茅。

## Full answer

### 逐步阅读循环

1. 外层循环遍历每个排名列表，例如向量列表和 BM25 列表。
2. 内层循环将条目解包为一对值，丢弃第二项，即检索器自身的分数。
3. 从零开始的索引 `rank` 对应的贡献为 `1.0 / (k + rank + 1)`，也就是 1 除以 k 与从一开始的排名之和。
4. 按文档 ID 累加不同列表的贡献。
5. 按贡献总和降序排列结果。

### 调用方怎样使用

同一课程中的混合搜索让每个检索器返回最终 top k 三倍数量的候选，融合后取前 k 个。更深的候选列表让在两种检索器中都表现不错的文档进入最终结果，即使它在任何一个列表中都不是首位。

### 综合项目版本

混合检索课程增加 `weights` 列表，为每个排名列表的贡献提供一个乘数；权重数量与列表数量不同就报错。它还维护文档 ID 到文档的映射，因此能返回文档而非只有 ID。

### 融合键

融合以文档 ID 为键。同一文档的两个块是两个键。综合项目课程建议按文档去重：BM25 对词表外词贡献为零，稠密检索却仍返回噪声，按文档融合可吸收这类影响。

## Follow-ups

- **Level 2:** 删掉 `+ 1` 会怎样？ Expected: 首篇文档得到 1/60 而非 1/61，曲线略微偏移，常数也不再符合公开定义。
- **Level 2:** 为什么每个检索器获取最终 k 三倍的结果？ Expected: 更深列表让两个检索器中排名都不错的文档进入融合前 k 个，即使它在两边都不是第一。
- **Level 3:** 综合项目怎样偏重某个检索器？ Expected: 为各列表提供 weights 乘数并应用于排名贡献，长度不匹配时报错。
- **Level 3:** 融合键是什么，对文本块有何影响？ Expected: 文档 ID；除非按文档去重，同一文档的不同块会作为不同键，课程建议去重。

## Wrong answers

- "函数对两个分数取平均。" 它从不读取分数，而是累加排名函数值。
- "在一个列表中缺失的文档会受罚。" 它只是没有该列表的贡献，并未扣分；另一列表排首位时仍可能最终第一。
- "k 是保留结果数量。" k 是分母中的衰减常数；调用方另外截取最终 top k。

## Taught in

[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程给出函数及调用方，[混合检索](../../../phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/)课程增加权重和去重建议。
