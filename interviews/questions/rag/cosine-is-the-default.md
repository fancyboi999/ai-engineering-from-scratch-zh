---
id: cosine-is-the-default
title: 向量搜索为什么默认按余弦排序
card: rag
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [screen, ml-breadth]
tags: [embeddings, cosine, vector-search]
minutes: 5
lessons: [phases/11-llm-engineering/06-rag, phases/05-nlp-foundations-to-advanced/13-question-answering]
manuals: []
practice: [cosine-top-k]
cheatsheet: [embeddings-vector-search]
related: []
updated: 2026-11-03
---

实现检索流水线搜索步骤时，同事想直接用查询向量与每个文本块向量的原始点积排序。你会改用什么？点积何时才是正确选择？

## Short answer

使用余弦相似度，即点积除以两个向量的长度。它只衡量夹角，让长块与短块按方向竞争，而非按向量大小竞争。只有向量长度本身承载了需要奖励的信号时，才应使用原始点积。

## Full answer

### 三种度量

| 度量 | 定义 | 行为 |
|---|---|---|
| 余弦 | 两个向量夹角的余弦，范围 -1 到 1 | 忽略长度，检索默认选择 |
| 点积 | 对应分量乘积之和 | 较长向量得分更高 |
| L2 距离 | 两点间直线距离 | 越小越接近，对长度敏感 |

余弦按长度归一化，不同大小的文本块只比较方向。人们说向量搜索，几乎总是指余弦相似度。

### 代码

```python
def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
```

向量长度为零时返回零，避免空文本块造成除零。

### 什么时候两者相同

很多嵌入模型直接返回单位长度的向量，或者由调用方要求输出归一化结果。问答课程编码时打开归一化，再用普通矩阵乘积排序。单位向量的点积等于余弦，因此成本更低的操作也能给出相同顺序。

## Follow-ups

- **Level 1:** 余弦为 1、0、-1 分别表示什么？ Expected: 同方向、正交、反方向。
- **Level 2:** 嵌入模型返回单位向量，选择还重要吗？ Expected: 不重要。单位向量的点积与余弦相等，所以课程先归一化，再用矩阵乘积。
- **Level 2:** 为什么 L2 对长短块的处理不同？ Expected: 它衡量直线距离，即使方向相同，更长的向量也会离得更远。
- **Level 3:** 什么时候有意保留原始点积？ Expected: 模型训练时让长度携带了信号（例如文档越长内容越多），而你希望排序用上这个信号。

## Wrong answers

- "点积和余弦总给出相同顺序。" 只有所有向量等长才成立，否则点积偏向更长向量。
- "余弦越小越匹配。" 余弦越大夹角越小；只有 L2 之类距离才是越小越近。
- "向量库默认什么就用什么。" 度量必须与向量的生成和归一化方式匹配，所以先查嵌入模型，再看向量库。

## Taught in

[RAG](../../../phases/11-llm-engineering/06-rag/)课程定义三种度量和除零保护，[问答](../../../phases/05-nlp-foundations-to-advanced/13-question-answering/)课程用矩阵乘积给归一化向量排序。
