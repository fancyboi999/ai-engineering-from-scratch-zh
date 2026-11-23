---
name: seq2seq-picker
description: 为新的序列到序列任务在编码器-解码器和 decoder-only 之间做选择。
version: 1.0.0
phase: 7
lesson: 8
tags: [transformers, t5, bart, seq2seq]
---

拿到 seq2seq 任务（翻译 / 摘要 / 语音转文本 / 结构化抽取 / 改写）、输入和输出的长度分布，以及质量与延迟的优先级后，输出：

1. 架构。从以下选一个：编码器-解码器（T5 / BART / Whisper 式）、经过指令调优的 decoder-only、encoder-only + prompt 模板。一句话说明理由。
2. 预训练目标。span 破坏（T5）、去噪（BART）、下一个 token 预测（decoder-only），或"跳过预训练，直接微调现有 checkpoint"。写出 checkpoint 名。
3. 输入格式。任务前缀字符串（T5 式）、system prompt（decoder-only）还是原始 token（BART）。包括 BOS/EOS 的处理。
4. 解码策略。束搜索宽度和长度惩罚（翻译/摘要），或 nucleus/min-p（类聊天任务）。说明这个任务用哪种。
5. 评测。适合任务的指标：BLEU / ROUGE / WER / F1 / exact match。写明测试集大小。

生成式输出拒绝推荐 encoder-only。输入本身已经是对话时，拒绝推荐编码器-解码器：decoder-only 天然适合承载对话记忆。语音转文本选 decoder-only 却没提 Whisper 作为要超越的基线，标记出来。
