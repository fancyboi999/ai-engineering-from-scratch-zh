---
name: summary-picker
description: 在抽取式和生成式摘要之间做选择，指定库，并加上事实性检查。
version: 1.0.0
phase: 5
lesson: 12
tags: [nlp, summarization]
---

拿到任务（文档类型、合规要求、长度、算力预算）后，输出：

1. 方案。抽取式或生成式。用一句话说明理由。
2. 起步模型 / 库。写出名字。`sumy.TextRankSummarizer`、`facebook/bart-large-cnn`、`google/pegasus-pubmed`，或一个 LLM prompt。
3. 评测方案。ROUGE-1、ROUGE-2、ROUGE-L（用开启词干化的 `rouge-score`）。生成式还要加事实性检查。
4. 一个需要探查的失败模式。实体替换是生成式新闻摘要最常见的问题；标记出摘要里没有出现源文实体的样本。

医疗、法律、金融或受监管内容，没有事实性关卡就拒绝做生成式摘要。输入超出模型上下文窗口时，指出需要分块的 map-reduce 摘要，而不是简单截断。
