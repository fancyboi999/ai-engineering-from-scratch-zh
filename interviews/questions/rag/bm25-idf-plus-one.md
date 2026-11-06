---
id: bm25-idf-plus-one
title: 读懂给 BM25 词项打分的四行代码
card: rag
kind: code-reading
level: 3
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [bm25, code-reading, idf, lexical]
minutes: 10
lessons: [phases/11-llm-engineering/07-advanced-rag, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense]
manuals: []
practice: [bm25]
cheatsheet: [rag-production]
related: [rag/error-code-query-misses, rag/rrf-beats-score-sum]
updated: 2026-11-03
---

阅读进阶检索课程中的四行 BM25 评分代码。解释对数里的 `+ 1`，说明 `k1` 和 `b` 各控制什么，再说说一个词出现在超过一半的文档中会怎样。

```python
idf = math.log((self.n_docs - df + 0.5) / (df + 0.5) + 1)
numerator = tf * (self.k1 + 1)
denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avg_dl)
score += idf * numerator / denominator
```

## Short answer

对数里的 `+ 1` 用于平滑逆文档频率：没有它，出现在大多数文档中的词会得到负权重；有了它，权重保持为正。`k1` 决定词重复出现时分数多快停止增长，`b` 决定长文档受多大惩罚。出现在大多数文档中的词权重接近零，停用词正该这样处理。

## Full answer

### 逆文档频率

对数内的比值是“不含该词的文档数加二分之一”除以“含该词的文档数加二分之一”。含词文档少于不含词文档时，比值大于一，对数为正。超过半数文档含词时，比值小于一，单独取对数会变成负值。`+ 1` 使它保持为正。综合项目课程指出，这一点对停用词很重要，因为停用词出现在大多数文档中；对小语料库也很重要，因为一个常见词就可能越过半数这条线。

### 词频饱和

词频因子是 `tf * (k1 + 1)` 除以 `tf + k1 * (...)`。随着 `tf` 增大，因子趋于 `k1 + 1`，因此重复某词 50 次的文档并不比只出现一次的文档相关 50 倍。进阶 RAG 课程默认 `k1` 为 1.2；综合项目课程用 1.5，称之为公开推荐值，并建议没有基准测试就不要改。

### 长度归一化

`b` 缩放长度项。`b` 为零时忽略文档长度，`b` 为一时长度惩罚全额生效。两门课默认都是 0.75：惩罚较长文档，但不是线性惩罚。

### 字段权重

综合项目课程把字段加权实现为索引时对词频乘一个系数，例如把符号名在正文上方重复一遍。评分代码不用改。

## Follow-ups

- **Level 3:** 每篇文档都有的词权重是多少？ Expected: df 等于文档总数，对数内的比值接近零，对约等于一的数取对数接近零，所以这个词几乎不加分。
- **Level 3:** 一篇文档把某个查询词重复了 50 次。它的分数和只出现一次的文档相比如何？ Expected: 不会高 50 倍；词频因子会饱和，趋近 k1 加 1。
- **Level 4:** 什么情况下调整 `b`？ Expected: 长文档确实每个词承载的信息更少时调高；文档长度与主题无关时往零调低。
- **Level 4:** 两门课的 `k1` 默认值不同，该怎么办？ Expected: 除非在自己语料上的基准测试另有结论，否则保留公开默认值；调 k1 和 b 要靠重跑评估工具，不靠直觉。

## Wrong answers

- "+1 是为了避免对零取对数。" 分子里加了二分之一，比值永远不为零；+1 是为了在词超过半数文档时不让权重变负。
- "k1 是要保留的结果数。" k1 是词频饱和常数。
- "b 越高越偏好长文档。" b 越高，长度惩罚越重；b 为零时忽略长度。

## Taught in

[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程给出评分代码，[混合检索](../../../phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/)课程解释平滑 IDF、默认值和字段加权。
