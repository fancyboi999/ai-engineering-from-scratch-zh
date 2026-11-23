---
name: feature-extractor
description: 选择特征类型、mel 数量、帧长/帧移和归一化方式，使其匹配下游音频模型。
version: 1.0.0
phase: 6
lesson: 02
tags: [audio, features, spectrogram, mel]
---

拿到目标模型（ASR / TTS / 分类器 / 说话人 / 音乐）和输入音频（采样率、领域）后，输出：

1. 特征类型。log-mel、mel、MFCC、原始波形，或离散编解码 token（EnCodec、SoundStream）。一句话说明理由。
2. mel 数量和频率范围。`n_mels`、`fmin`、`fmax`。理由要和领域（语音还是音乐）及模型目标挂钩。
3. 帧长和帧移。`frame_len`、`hop_len`、窗函数类型。理由要和所需的时间分辨率挂钩。
4. 归一化。逐条语音的均值/方差、全局统计量，或固定参考的 dB；在特征提取之前还是之后做。
5. 验证代码片段。用 Python 在一段 1 秒参考音频上打印输出形状、最小/最大值、均值/标准差，并断言它们与训练时一致。

特征流水线的帧长/帧移/mel 数量与目标模型公开的训练配置不一致时，拒绝上线。任何给 Whisper 或 Parakeet 用 MFCC 的方案都标记为错误：这些模型吃的是 log-mel。任何没有归一化断言的特征提取器，标记出来。
