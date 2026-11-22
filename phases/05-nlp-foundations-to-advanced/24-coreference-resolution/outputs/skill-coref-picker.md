---
name: coref-picker
description: 选择共指消解方案、评测计划和集成策略。
version: 1.0.0
phase: 5
lesson: 24
tags: [nlp, coref, information-extraction]
---

拿到使用场景（单文档 / 多文档、领域、语言）后，输出：

1. 方案。基于规则 / 神经 span 模型 / LLM prompt / 混合。一句话说明理由。
2. 模型。如果用神经方法，写出 checkpoint 名。
3. 集成。操作顺序：分词 → NER → 共指消解 → 下游任务。
4. 评测。在留出集上算 CoNLL F1（MUC + B³ + CEAF-φ4 的平均），再人工审查 20 篇文档的簇。

超过 2,000 token 的文档，没有滑动窗口合并就拒绝纯 LLM 共指消解。任何跑共指消解却没有提及级精确率-召回率报告的流水线，一律拒绝。依赖性别启发式的系统部署在人口构成多样的文本上时，标记出来。
