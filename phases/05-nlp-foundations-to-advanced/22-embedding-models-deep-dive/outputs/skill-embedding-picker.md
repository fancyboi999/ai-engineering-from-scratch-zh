---
name: embedding-picker
description: 根据语料和部署方式，选择嵌入模型、维度和检索模式。
version: 1.0.0
phase: 5
lesson: 22
tags: [nlp, embeddings, retrieval]
---

拿到语料（规模、语言、领域、平均长度）、部署目标（云 / 边缘 / 本地机房）、延迟预算和存储预算后，输出：

1. 模型。指名的 checkpoint 或 API。一句话说明理由。
2. 维度。完整维度 / Matryoshka 截断 / int8 量化。理由要和存储预算挂钩。
3. 模式。稠密 / 稀疏 / 多向量 / 混合。说明理由。
4. 模型卡要求时，给出查询前缀 / 模板。
5. 评测方案。与领域相关的 MTEB 任务 + 用 nDCG@10 做的留出领域评测。

没有领域验证就把 Matryoshka 截到 <64 维的建议，一律拒绝。语料少于 1 万段时拒绝 ColBERTv2（开销不划算）。长文档语料（>8k token）被路由到 512 token 窗口的模型时，标记出来。
