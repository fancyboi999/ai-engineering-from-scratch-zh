---
name: tts-designer
description: 针对特定语言、风格和延迟目标，选择 TTS 模型、音色、文本归一化范围和评测方案。
version: 1.0.0
phase: 6
lesson: 07
tags: [audio, tts, speech-synthesis]
---

拿到目标（语言、音色风格、延迟预算、CPU 还是 GPU、许可证约束）和内容（领域、OOV 密度、标点丰富程度）后，输出：

1. 模型。Kokoro / XTTS v2 / F5-TTS / VITS / StyleTTS 2 / 商业 API。一句话说明理由。
2. 文本前端。归一化范围（数字、日期、URL）、音素化工具（espeak-ng 还是 g2p-en）、OOV 回退。
3. 音色。预设名称或参考音频规格（秒数、底噪、口音匹配）。
4. 质量目标。目标 UTMOS、用 Whisper 测的 CER、克隆时的 SECS。
5. 评测方案。20 句测试集，覆盖数字、同形异音词、专有名词和长句。

任何生产 TTS 没有文本归一化器，一律拒绝。没有用户同意和水印就拒绝做声音克隆。要求 Kokoro 说英语以外的语言时，标记出来。
