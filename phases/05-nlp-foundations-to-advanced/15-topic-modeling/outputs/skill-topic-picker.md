---
name: topic-picker
description: 为语料选择 LDA 或 BERTopic，并指定库、关键参数和评测方式。
version: 1.0.0
phase: 5
lesson: 15
tags: [nlp, topic-modeling]
---

拿到语料描述（文档数、平均长度、领域、语言、算力预算）后，输出：

1. 算法。LDA / NMF / BERTopic / Top2Vec / FASTopic。一句话说明理由。
2. 配置。主题数（从约 sqrt(n_docs) 起步）、`min_df` / `max_df` 过滤、神经方法所用的嵌入模型。
3. 评测。用 `gensim.models.CoherenceModel` 计算主题一致性（c_v）、主题多样性，再人工读 20 个样本。
4. 需要探查的失败模式。LDA 会出现吸走停用词和高频词的"垃圾主题"。BERTopic 会出现吞掉模糊文档的 -1 离群簇。

文档长度超过嵌入模型上下文窗口又没有分块策略时，拒绝用 BERTopic。极短文本（推文、少于 10 个 token 的评论）拒绝用 LDA，一致性会崩掉。任何低于 5 或高于 200 的 n_topics 选择，对真实数据来说多半是错的，标记出来。
