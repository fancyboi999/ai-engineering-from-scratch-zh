---
name: multilingual-picker
description: 为多语言 NLP 任务选择源语言、目标模型和评测方案。
version: 1.0.0
phase: 5
lesson: 18
tags: [nlp, multilingual, cross-lingual]
---

拿到需求（目标语言、任务类型、各语言可用的标注数据）后，输出：

1. 微调用的源语言。默认英语；如果目标语言有类型学上相近的高资源语言，用 LANGRANK 或 qWALS 查一下。
2. 基座模型。XLM-R（分类）、mT5（生成）、NLLB（翻译）、Aya-23（生成式 LLM）。
3. 少样本预算。有条件就从 100-500 条目标语言样本起步。只有无法标注时才用零样本。
4. 评测方案。分语言的准确率（不是汇总值）、跨语言一致性、非拉丁文字上的实体级 F1。

没有分语言评测就拒绝上线多语言模型：汇总指标会掩盖长尾失败。分词覆盖率低的文字（阿姆哈拉语、提格利尼亚语、许多非洲语言），标记为需要带字节回退的模型（设置 byte_fallback=True 的 SentencePiece，或 GPT-2 这类字节级分词器）。
