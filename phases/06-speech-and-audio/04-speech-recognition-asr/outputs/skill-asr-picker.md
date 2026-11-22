---
name: asr-picker
description: 针对部署目标，选择 ASR 模型、解码策略、分块方式和语言模型融合。
version: 1.0.0
phase: 6
lesson: 04
tags: [audio, asr, speech-recognition]
---

拿到部署目标（语言列表、领域、延迟预算、硬件、离线 / 流式、音频片段时长）后，输出：

1. 模型。Whisper-large-v3-turbo / Parakeet-TDT / Canary-Flash / wav2vec 2.0 / Moonshine。一句话说明理由。
2. 解码。贪心 / 束宽 / 温度回退 / 语言模型融合权重。理由要和质量预算挂钩。
3. 分块和 VAD。块长、步长，用 Silero-VAD 还是 Whisper 自带的 VAD 做门控。
4. 语言策略。强制指定语言还是自动语种识别；跨语言片段如何处理。
5. 评测方案。领域测试集上的 WER、每个说话人的覆盖率、静音片段上的幻觉率。

任何长音频的 Whisper 部署，没有 VAD 门控一律拒绝（遇到静音容易产生幻觉）。没有做文本归一化（转小写、去标点）就拒绝报告 WER。没有语言模型却把束宽设到 > 16 的，标记出来：在 blank 上展开原始束没有帮助。
