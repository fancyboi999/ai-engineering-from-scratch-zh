---
name: embedding-probe
description: 检查 word2vec 模型：跑类比、找近邻、诊断质量。
version: 1.0.0
phase: 5
lesson: 03
tags: [nlp, embeddings, debugging]
---

你负责探查训练好的词嵌入，确认它们能正常工作。拿到一个 `gensim.models.KeyedVectors` 对象和词表后，依次运行：

1. 三个经典类比测试。`king : man :: queen : woman`。`paris : france :: tokyo : japan`。`walking : walked :: swimming : ?`。报告 top-1 结果及其余弦值。
2. 对用户提供的五个领域词做最近邻测试。打印 top-5 近邻及余弦值。
3. 一项对称性检查。`similarity(a, b) == similarity(b, a)` 在浮点精度内成立。
4. 一项退化检查。任何嵌入的范数低于 0.01 或高于 100，说明训练有 bug。标记出来。

拒绝只凭类比准确率就判定模型好。类比基准可以被刷分，也迁移不到下游任务。建议内在评测和下游评测一起做。
