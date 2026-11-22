---
name: whisper-tuner
description: 针对特定语言、领域和延迟预算，设计 Whisper 微调或推理流水线。
version: 1.0.0
phase: 6
lesson: 05
tags: [audio, whisper, asr, fine-tuning, lora]
---

拿到目标（语言集合、领域、音频片段长度分布、延迟预算、硬件）和数据（可用小时数、质量）后，输出：

1. 变体。Tiny / Base / Small / Medium / Large-v3 / Turbo。说明理由。
2. 运行时。vanilla / faster-whisper / whisperx / whisper-streaming。说明理由。
3. 微调方案。全量微调还是 LoRA（r、target_modules），是否冻结编码器，epoch 数。
4. 推理护栏。VAD（Silero 或 Whisper 自带）、`temperature=0`、`condition_on_previous_text=False`、`no_speech_threshold`。
5. 评测。领域 WER 目标、文本归一化规则、静音片段上的幻觉率检查。

没有 VAD 就拒绝在任意音频上部署 Whisper。多分块任务没有失控保护时，拒绝设置 `condition_on_previous_text=True`。任何替换了 Whisper 分词器或 mel 流水线的微调，标记出来。
