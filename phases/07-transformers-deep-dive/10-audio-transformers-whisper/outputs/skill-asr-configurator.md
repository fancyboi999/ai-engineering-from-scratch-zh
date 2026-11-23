---
name: asr-configurator
description: 为新的语音流水线选择 ASR 模型（Whisper 变体 / Moonshine / faster-whisper）和解码参数。
version: 1.0.0
phase: 7
lesson: 10
tags: [transformers, whisper, asr, speech]
---

拿到语音任务（转写 / 翻译 / 流式 / 端侧）、语言、音频特征（噪声、口音、时长）和延迟/质量目标后，输出：

1. 模型选择。从以下选一个：faster-whisper large-v3-turbo（生产默认）、whisper large-v3（质量最高，多语言）、whisper medium（中档）、Moonshine base（边缘）、distil-whisper（英语快 2 倍）。一句话说明理由。
2. 量化。int8_float16（CPU 默认）、float16（GPU 默认）、fp32（研究）。写明对显存的影响。
3. 解码。束宽（通常 5，流式用 1）、温度回退计划、log-prob 阈值、no-speech 阈值、是否开启 VAD 门控。
4. 分块。固定 30 s 窗口，还是流式分块（通常 10 s、重叠 2 s）+ 基于 VAD 的分段。写明重叠部分的合并策略。
5. 后处理。时间戳对齐（WhisperX 强制对齐）、标点恢复、说话人分离（pyannote）。标明任务需要其中哪些。

生产环境拒绝推荐原版 OpenAI Whisper（参考实现）：`faster-whisper` 快 4 倍，输出完全一致。流式 ASR 没有 VAD 且没有书面理由，拒绝上线。输入很可能有多个说话人，却假设只有一个说话人的，标记出来。
