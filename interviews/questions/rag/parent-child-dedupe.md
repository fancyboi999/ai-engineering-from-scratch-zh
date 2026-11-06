---
id: parent-child-dedupe
title: 读懂父文档检索函数
card: rag
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [chunking, parent-child, code-reading, context-budget]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag, phases/11-llm-engineering/07-advanced-rag]
manuals: []
practice: []
cheatsheet: [rag]
related: [rag/chunk-size-by-query-type, rag/cosine-is-the-default]
updated: 2026-11-03
---

阅读分块课程里的这个检索函数。两级布局解决什么问题？`seen` 集合做什么？函数能返回多少个父块？

```python
def retrieve_parent(child_query, mapping, encoder, top_k=3):
    child_embs = encoder.encode([m["child"] for m in mapping], normalize_embeddings=True)
    q_emb = encoder.encode([child_query], normalize_embeddings=True)[0]
    scores = child_embs @ q_emb
    top = np.argsort(-scores)[:top_k]
    seen, parents = set(), []
    for i in top:
        if mapping[i]["parent_idx"] not in seen:
            parents.append(mapping[i]["parent"])
            seen.add(mapping[i]["parent_idx"])
    return parents
```

## Short answer

索引小子块以精确匹配，返回大父块提供上下文，从而兼顾命中精度与周围文本。多个高排名子块映射同一父块时，`seen` 删除重复父块，避免 prompt 重复接收文本。映射非空且 `top_k` 为正时，返回一到 `top_k` 个父块，共用父块时更少；空映射或 `top_k` 为零时不返回父块。

## Full answer

### 布局

普通分块必须取舍：小块匹配精确但缺上下文，大块有上下文却涵盖多个主题。两级布局索引小子块，同时保存来源父块。分块课程默认父块大小 2048、子块 256；进阶 RAG 课程画的是一个 512-token 父块配四个 128-token 子块。细节问题精确命中子块，prompt 收到包含周围行的整个父块。

### 逐步阅读函数

1. 对所有子块和查询启用归一化编码，使矩阵乘积等于余弦。
2. 按分数排序子块，保留前 k 个索引。
3. 查询每个高排名子块的父索引；尚未出现过就追加父文本并记录。
4. 按各父块最佳子块的顺序返回父块。

### 为什么去重

同一父块中的多个子块位于同一节，常匹配相同查询。不用集合时，同一父文本会进入 prompt 两三次，浪费上下文预算。课程将去重称为这一模式的关键。

### 生产环境要改什么

函数每次调用都会重新编码所有子块。真实索引应只存一次子块向量，每次只编码查询。两级布局也能平稳退化：子块匹配得不好时，仍会返回一个合理的父块。

## Follow-ups

- **Level 2:** 为什么索引子块而非父块？ Expected: 小块能精确匹配具体问题，大块涉及多个主题，嵌入方向不明确。
- **Level 2:** 为什么直接矩阵乘积，不另外计算余弦？ Expected: 编码时已经归一化，点积等于余弦。
- **Level 3:** 函数每次调用做了什么生产代码不该做的事？ Expected: 重新编码全部子块；应在索引时保存向量，每次只编码查询。
- **Level 3:** 两个父块各有一个命中子块，第三个父块有三个不错的子块却都在截断线以下，会漏掉什么？ Expected: 函数只按最佳子块排序；除非按父块聚合子块分数，多个不错子块不会带来额外收益。

## Wrong answers

- "返回每个高排名子块的父块，包括重复项。" 多个子块映射同一父块，重复文本浪费上下文。
- "让子块和父块一样大。" 这样没有精度收益；关键就是小匹配单元与大上下文单元。
- "函数总返回恰好 top_k 个父块。" 子块共用父块时，返回数量会更少。

## Taught in

[分块策略](../../../phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/)课程给出函数与去重原理，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程展示父子布局。
