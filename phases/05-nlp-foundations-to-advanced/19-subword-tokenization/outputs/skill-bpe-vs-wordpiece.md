---
name: skill-bpe-vs-wordpiece
description: 根据语料和部署目标，选择分词算法、词表大小和库。
version: 1.0.0
phase: 5
lesson: 19
tags: [nlp, tokenization]
---

拿到语料（规模、语言、领域）和部署目标（从零训练 / 微调 / 兼容 API 的推理）后，输出：

1. 算法。BPE、Unigram 或 WordPiece。一句话说明理由。
2. 库。SentencePiece、HF Tokenizers 或 tiktoken。说明理由。
3. 词表大小。取整到最接近的 1k。理由要和模型规模及语言覆盖挂钩。
4. 覆盖设置。`character_coverage`、`byte_fallback`、特殊 token 列表。
5. 验证方案。留出集上的平均每词 token 数、OOV 率、压缩比、编码后解码能否还原。

语料含稀有文字时，拒绝训练 character-coverage <0.995 的分词器。CI 里没有对冻结的 `tokenizer.json` 做哈希校验，就拒绝发布词表。任何词表低于 16k 的单语分词器，标记为很可能规格不足。
