---
id: audio-features
title: 音频特征、分类与指标
code: AF
subtitle: 音频采样、分帧、加窗、mel、MFCC、分类与评分。使用课程中的 Python 标准库实现。
hue: 25
sources: phases/06-speech-and-audio/01-audio-fundamentals, phases/06-speech-and-audio/02-spectrograms-mel-features, phases/06-speech-and-audio/03-audio-classification, phases/06-speech-and-audio/17-audio-evaluation-metrics
source_hash: 3bb3d8d60296efba
---

## 从波形到标签
type: architecture
from: phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/03-audio-classification/docs/zh.md, phases/06-speech-and-audio/03-audio-classification/code/main.py

```arch
node | wav | 1,1 | 波形 | [-1, 1] 内的浮点数 | client
node | frame | 2,1 | 帧 | 400 个采样点，帧移 160 | process
node | stft | 3,1 | STFT | Hann 窗、FFT | process
node | mel | 4,1 | Mel 滤波器组 | 80 个三角滤波器 | process
node | log | 4,2 | Log-mel | Whisper 输入 | store
node | mfcc | 3,2 | MFCC | DCT-II，保留 13 项 | process
node | pool | 2,2 | 池化 | 均值 + 方差，26 维 | process
node | clf | 1,2 | 分类器 | k-NN、CNN、AST、BEATs | model
edge | wav | frame |
edge | frame | stft |
edge | stft | mel | 幅度
edge | mel | log | log
edge | log | mfcc | DCT
edge | mfcc | pool |
edge | pool | clf | 余弦
```

## 公式
type: concepts
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/03-audio-classification/docs/zh.md

- **时间**：$t = n / sr$。16 kHz 下 10 s 的片段有 160,000 个浮点数。
- **奈奎斯特频率**：$sr / 2$。高于该频率的能量会混叠到较低频点。
- **混叠**：以 10 kHz 采样的 7 kHz 音调会折叠到 $10 - 7 = 3$ kHz。
- **频点**：频点 $k$ 对应 $k \cdot sr / N$ Hz。分辨率为 $sr / N$。
- **Mel**：$m = 2595 \cdot \log_{10}(1 + f / 700)$
- **Hann**：$w(n) = 0.5 (1 - \cos(2 \pi n / (N - 1)))$
- **帧数**：$1 + (T - L) / hop$。16 kHz 下 10 s 得到 998 帧。
- **Mixup**：$x = \lambda x_1 + (1 - \lambda) x_2$，$y$ 同理。

## 特征默认值
type: defaults
from: phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 帧长 | 400 | 16 kHz 下为 25 ms |
| 帧移 | 160 | 16 kHz 下为 10 ms |
| 窗函数 | Hann | 将帧边缘逐渐衰减到零 |
| ASR 的 mel 频带数 | 80 | 覆盖 0 至 8 kHz |
| 分类的 mel 频带数 | 128 | AST、PANNs、BEATs |
| MFCC 数量 | 13 | 丢弃表示能量的第 0 项系数 |
| 对数下限 `eps` | 1e-10 | log(mel_spec + 1e-10) |
| 关键词检测 | 40 个 MFCC | 用于微型设备 |

## 代码中的任务
type: task-table
from: phases/06-speech-and-audio/01-audio-fundamentals/code/main.py, phases/06-speech-and-audio/02-spectrograms-mel-features/code/main.py, phases/06-speech-and-audio/03-audio-classification/code/main.py

| 任务 | 代码 |
|---|---|
| 合成音调 | `sine(freq_hz, sr, seconds, amp=0.5)` |
| 找出主频 | `peak_freq(samples, sr)` |
| 信号分帧 | `frame_signal(signal, frame_len, hop)` |
| STFT 幅度 | `stft_magnitude(signal, frame_len, hop)` |
| Mel 滤波器组 | `mel_filterbank(n_mels, n_fft, sr)` |
| Log-mel | `log_transform(mel_spec, eps=1e-10)` |
| MFCC | `dct_ii(x, n_coeffs)` |
| k-NN 投票 | `knn(q, bank, labels, k=3)` |

## MFCC k-NN 基线
type: annotated-code
lang: python
from: phases/06-speech-and-audio/03-audio-classification/code/main.py

```python
sr = 8000                                   # 代码中的演示采样率
mag = stft_mag(signal, frame_len, hop)      # Hann 加窗后逐帧做 DFT
fb = mel_filterbank(n_mels, frame_len, sr)  # n_mels x (n_fft // 2 + 1)
mels = apply_filterbank(mag, fb)            # 每个 mel 频带内加权求和
lm = log_transform(mels)                    # log(max(v, eps))
feats = [dct_ii(f, n_mfcc) for f in lm]     # 每帧 13 项系数
emb = summarize(feats)                      # 均值 + 方差，26 维
pred = knn(emb, X_train, y_train, k=3)      # 余弦相似度前 k 名，多数投票
```

## 模型评分
type: annotated-code
lang: python
from: phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md
span: 2

```python
from jiwer import wer, Compose, ToLowerCase, RemovePunctuation, Strip
transform = Compose([ToLowerCase(), RemovePunctuation(), Strip()])
score = wer(truth="Please turn on the lights.", hypothesis="please turn on the light",
            truth_transform=transform, hypothesis_transform=transform)
sv = EncoderClassifier.from_hparams("speechbrain/spkrec-ecapa-voxceleb")
secs = torch.nn.functional.cosine_similarity(emb_ref, emb_clone, dim=-1).item()  # SECS
fad = FrechetAudioDistance()
score = fad.get_fad_score("generated_folder/", "reference_folder/")  # 越低越好
```

## 库与工具
type: command-table
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/03-audio-classification/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

| 命令 | 作用 |
|---|---|
| `soundfile` | 以 float32 读取 WAV、FLAC、OGG |
| `torchaudio.transforms.Resample` | 重采样，内置抗混叠 |
| `numpy.fft.rfft` | 对实数音频执行实数 FFT |
| `torch.stft` | 向量化 STFT |
| `librosa.power_to_db` | 相对参考值规范化的 dB |
| `ffprobe` | 报告文件的采样率、声道和编解码器 |
| `jiwer` | 带规范化的 WER 与 CER |
| `ASTForAudioClassification.from_pretrained` | 加载 AST 以进行微调 |

## 选择分类器
type: concepts
from: phases/06-speech-and-audio/03-audio-classification/docs/zh.md

- **少于 1000 个片段**：使用 MFCC 均值上的 k-NN，并做音频增强。
- **1K 至 100K 个片段**：微调 BEATs 或 AST。
- **超过 100K 个片段**：从零训练，或微调 Whisper 编码器。
- **实时、边缘设备**：40-MFCC CNN，量化为 int8。
- **多标签**：BEATs-iter3 配合 BCE 损失、mixup 和 SpecAugment。
- **互斥类别**：报告 top-1 与 top-5 准确率。
- **类别不均衡**：报告逐类别召回率与宏平均 F1。

## 指标
type: glossary
from: phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

- **WER**：词错误率。规范化后计算 (S + D + I) / N。
- **CER**：字错误率。用于声调语言。
- **RTFx**：每秒实际时间处理的音频秒数，越高越好。
- **MOS**：平均意见分，范围 1 至 5，至少 20 位听众、100 个样本。
- **UTMOS**：学习得到的 MOS 预测器，与人类 MOS 的相关性约为 0.9。
- **SECS**：参考音频与克隆音频 ECAPA 嵌入的余弦相似度。超过 0.75 即可辨认。
- **EER**：FAR 等于 FRR 时的阈值。ECAPA 在 VoxCeleb1-O 上为 0.87%。
- **DER**：(FA + Miss + Confusion) / 说话人总时长。
- **FAD**：VGGish 嵌入上的 Fréchet 距离，越低越好。

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 输出混乱，看起来像模型故障 | 将 44.1 kHz 立体声音频输入 Whisper | 重采样为 16 kHz 单声道 float32 |
| FFT 峰出现在错误频率 | 高于奈奎斯特频率的能量发生混叠 | 下采样前做低通滤波 |
| 部署后静默失败 | 训练使用 80 个 mel 频带，推理使用 128 个 | 在两端记录特征形状 |
| Mel 特征看起来不同 | 在 22.05 kHz 下提取特征 | 提取特征前先统一采样率 |
| Whisper 输入不正确 | 使用 dB-mel 而非 log-mel | 输入 log-mel。自定义代码不会自动识别 |
| 生产 WER 翻倍 | 训练逐句规范化，推理全局规范化 | 使用相同规范化方法 |
| 尾部帧平坦 | 片段末尾补零 | 对称填充或复制边缘 |
| 总体 5% WER 掩盖口音上的 30% | 只报告汇总 WER | 按人群切片报告 |

## 问答
type: qa
from: phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

- **为什么用 mel 而非 Hz？** 人类按对数尺度感知音高。
- **为什么加窗？** 减少帧边缘造成的频谱泄漏。
- **为什么用对数幅度？** 原始幅度跨越 5-6 个数量级。
- **FFT 更大有什么影响？** 频率分辨率更好，时间分辨率更差。
- **为什么用 FFT 而非 DFT？** DFT 为 O(N²)，FFT 为 O(N log N)。
- **为什么用 minDCF？** 它对选定工作点上的成本加权。

## 提示
type: tips
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/03-audio-classification/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

- 先匹配采样率，再匹配其他设置。
- 如果不是处理音乐，从 80 个 log-mel 频带开始。
- 从冻结的骨干网络开始，不必重新训练模型。
- 训练时使用均衡采样，评估时不用。
- 计算 WER 前先规范化文本，并报告规则。
- 延迟报告 P50/P95/P99。
- 保留内部留出集，公开基准会饱和。
