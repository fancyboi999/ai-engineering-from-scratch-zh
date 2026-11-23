---
name: audio-loader
description: 对照目标模型的要求校验原始音频文件，并安全地重采样。
version: 1.0.0
phase: 6
lesson: 01
tags: [audio, speech, preprocessing]
---

拿到音频文件（路径、声道数、采样率、位深、编码）和目标模型（要求特定采样率和声道数的 ASR / TTS / 分类器）后，输出：

1. 不匹配项。列出文件与目标不符的每个维度（采样率、声道数、最短时长、削波检查）。
2. 重采样方案。源采样率、目标采样率、重采样库（`torchaudio.transforms.Resample` 或 `librosa.resample`）、抗混叠滤波器类型。
3. 声道方案。合成单声道的策略（取平均还是只取左声道），或在模型支持时直通多声道。
4. 归一化。峰值归一化还是 RMS 归一化、dBFS 目标、削波保护。
5. 验证代码片段。用 Python 加载文件、执行变换，并断言最终数组符合 `(target_sr, dtype, channel_count, range)`。

没有抗混叠滤波器就拒绝降采样。没有重建滤波器就拒绝超过 2 倍的升采样。任何削波峰值超过 ±0.999 或直流偏移超过 ±0.01 的输入文件，标记出来。
