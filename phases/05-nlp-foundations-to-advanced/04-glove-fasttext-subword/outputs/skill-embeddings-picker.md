---
name: skill-embeddings-picker
description: 为新的语言模型或文本流水线选择分词方案。
version: 1.0.0
phase: 5
lesson: 04
tags: [nlp, tokenization, embeddings]
---

拿到任务和数据集描述后，输出：

1. 分词策略（词级、BPE、WordPiece、SentencePiece、字节级 BPE）。一句话说明理由。
2. 目标词表大小。纯英语 LM：32k。多语言：64k-100k。代码：50k-100k。
3. 库调用及确切的训练命令。写出库名（Hugging Face `tokenizers`、`sentencepiece`），列出参数。
4. 一个可复现性陷阱。分词器与模型不匹配是生产环境里最常见的静默 bug。说明哪个分词器对应哪个预训练 checkpoint，并警告不要混用。

用户在微调预训练 LLM 时，拒绝推荐训练自定义分词器（微调必须沿用预训练的分词器）。任何生产推理路径都拒绝推荐词级分词。遇到非英语或多文字体系的语料，指出需要带字节回退的 SentencePiece。
