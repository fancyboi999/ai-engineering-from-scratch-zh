---
name: grammar-pipeline
description: 为下游 NLP 任务设计经典的词性标注 + 依存句法分析流水线。
version: 1.0.0
phase: 5
lesson: 07
tags: [nlp, pos, parsing]
---

拿到下游任务（信息抽取、改写校验、查询分解、词形还原）后，输出：

1. 标签集。纯英语的老流水线用 Penn Treebank，多语言或跨语言用 Universal Dependencies。
2. 库。大多数生产场景用 spaCy（`en_core_web_sm` / `_lg` / `_trf`），学术级多语言用 stanza，追求最高 UD 准确率用 trankit。
3. 集成代码片段。调用库并使用 `.pos_`、`.dep_`、`.head` 的 3-5 行代码。
4. 要测试的失败模式。名词动词歧义（`saw`、`book`、`can`）和介词短语挂接歧义是经典陷阱。抽 20 条输出人工过一遍。

拒绝推荐自己手写句法分析器。从零造分析器是研究课题，不是应用任务。任何使用词性标签却不处理大小写变体的流水线，都标记为脆弱。
