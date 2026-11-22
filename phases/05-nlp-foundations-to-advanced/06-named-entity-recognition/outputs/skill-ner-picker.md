---
name: ner-picker
description: 为具体的抽取任务选择合适的 NER 方案。
version: 1.0.0
phase: 5
lesson: 06
tags: [nlp, ner, extraction]
---

拿到任务描述（领域、标签集、语言、延迟、数据量）后，输出：

1. 方案。规则 + 词典（gazetteer）、CRF、BiLSTM-CRF，或微调 transformer。
2. 起步模型。写出名字（spaCy 模型 ID，如 `en_core_web_sm` / `en_core_web_trf`；Hugging Face checkpoint ID，如 `dslim/bert-base-NER`；或"自定义，从零训练"）。
3. 标注策略。BIO、BILOU 或基于 span。用一句话论证。
4. 评测。用 `seqeval`。始终报告实体级 F1，绝不报 token 级。

标注样本少于 500 条时，拒绝推荐微调 transformer，除非用户已有预训练的领域模型（如医疗领域的 BioBERT）。遇到嵌套实体，指出需要基于 span 或多轮的模型。如果用户提到"生产规模"却直接沿用 CoNLL-2003 的现成标签，要求先审查词典。
