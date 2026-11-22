---
name: retrieval-picker
description: 根据语料和查询模式选择检索技术栈。
version: 1.0.0
phase: 5
lesson: 14
tags: [nlp, retrieval, rag, search]
---

拿到需求（语料规模、查询模式、延迟预算、质量门槛、基础设施约束）后，输出：

1. 技术栈。只用 BM25、只用稠密检索、混合（BM25 + 稠密 + RRF）、混合 + cross-encoder 重排，或三路（BM25 + 稠密 + 学习型稀疏）。
2. 稠密编码器。写出具体模型（`all-MiniLM-L6-v2`、`bge-large-en-v1.5`、`e5-large-v2`、`paraphrase-multilingual-MiniLM-L12-v2`）。与语言、领域、上下文长度匹配。
3. 重排器。如果使用，写出 cross-encoder 模型名（`cross-encoder/ms-marco-MiniLM-L-6-v2`、`BAAI/bge-reranker-large`）。注明对 top-30 重排会增加约 30-100ms 延迟。
4. 评测方案。Recall@10 是检索器的首要指标。多答案场景用 MRR。先建基线，之后每项改进都和基线比。

语料中有命名实体、错误码或产品 SKU 时，拒绝推荐只用稠密检索，除非用户有证据表明稠密检索能处理精确匹配。高风险检索（法律、医疗）中最终 top-5 决定用户拿到的答案，拒绝跳过重排。
