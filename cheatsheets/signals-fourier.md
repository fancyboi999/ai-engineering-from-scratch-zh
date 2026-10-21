---
id: signals-fourier
title: 复数、傅里叶与信号
code: CN
subtitle: 复数旋转、DFT 与 FFT、窗函数、采样、频谱图、Mel 滤波器组及 MFCC。使用课程中的 Python 代码。
hue: 290
sources: phases/01-math-foundations/19-complex-numbers, phases/01-math-foundations/20-fourier-transform, phases/06-speech-and-audio/01-audio-fundamentals, phases/06-speech-and-audio/02-spectrograms-mel-features
source_hash: 4e04b8833fa94d93
---

## 8 点 Cooley-Tukey FFT
type: architecture
from: phases/01-math-foundations/20-fourier-transform/docs/zh.md

```arch
node | x | 1,1 | x[0..7] | 8 个采样点
node | even | 2,1 | 偶数半部 | x[0,2,4,6]
node | odd | 2,2 | 奇数半部 | x[1,3,5,7]
node | ek | 3,1 | E[0..3] | 4 点 FFT
node | ok | 3,2 | O[0..3] | 4 点 FFT
node | out | 4,1 | X[0..7] | E[k] +/- 旋转因子 * O[k]
edge | x | even | 拆分
edge | x | odd | 拆分
edge | even | ek |
edge | odd | ok |
edge | ek | out | 合并
edge | ok | out | 旋转因子
```

## 从波形到 log-mel 与 MFCC
type: flow
from: phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/code/main.py

1. **分帧**：以 10 ms 帧移切出 25 ms 窗口。在 16 kHz 下分别为 400 和 160 个采样点。
2. **加窗**：每帧乘以 `hann(N)`，使边缘渐变到零。
3. **STFT**：取每帧的 FFT 幅值，形状为 `(n_frames, n_freq_bins)`。
4. **Mel**：乘以三角滤波器组。ASR 标准是 0 至 8 kHz 上的 80 个 Mel 滤波器。
5. **对数**：`log(mel_spec + 1e-10)` 压缩动态范围。
6. **MFCC**：对每个 log-mel 帧应用 `dct_ii`，保留前 13 个系数。

## 代码任务
type: task-table
from: phases/01-math-foundations/19-complex-numbers/docs/zh.md, phases/01-math-foundations/20-fourier-transform/docs/zh.md, phases/01-math-foundations/20-fourier-transform/code/fourier.py, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md

| 任务 | 代码 |
|---|---|
| 将点旋转 45 度 | `point * euler(math.pi / 4)` |
| 单位圆上的 N 个点 | `roots_of_unity(N)` |
| 变换与逆变换，O(N^2) | 先 `dft(x)`，再 `idft(X)` |
| 快速变换，长度为 2 的幂 | `fft(x)` |
| 每个频率的能量 | `power_spectrum(X)` |
| 用 FFT 计算线性卷积 | `convolve_fft(x, h)` |
| 将信号分帧 | `frame(signal, frame_len, hop)` |
| Mel 滤波器组矩阵 | `mel_filterbank(n_mels, n_fft, sr)` |

## NumPy 与 SciPy 中的频谱
type: annotated-code
lang: python
from: phases/01-math-foundations/19-complex-numbers/docs/zh.md, phases/01-math-foundations/20-fourier-transform/docs/zh.md, phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md

```python
waveform, sr = sf.read("clip.wav", dtype="float32")  # [-1, 1] 内的 float32
spectrum = np.fft.fft(signal)
freqs = np.fft.fftfreq(256, d=1/256)  # 每个频率格的频率
power = np.abs(spectrum) ** 2  # 功率谱
window = windows.hann(256)  # 来自 scipy.signal
result = fftconvolve(signal, kernel, mode='full')
frequencies, times, Zxx = stft(signal, fs=sample_rate, nperseg=256)
spectrogram = np.abs(Zxx) ** 2  # （频率数，时间帧数）
print(cmath.exp(1j * cmath.pi))  # 欧拉公式：接近 -1
```

## 从零构建 Mel 特征
type: annotated-code
lang: python
from: phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/code/main.py

```python
def hz_to_mel(f):
    return 2595.0 * math.log10(1.0 + f / 700.0)
mag = stft_magnitude(signal, frame_len=400, hop=160)  # 每帧做 Hann 加窗与 DFT
fb = mel_filterbank(n_mels, n_fft, sr)  # 80 个 Mel 滤波器，n_fft=400 时形状为 (80, 201)
mel_spec = apply_filterbank(cmag, fb)  # 每个 Mel 频率格一个加权和
lm = log_transform(mel_spec)  # eps=1e-10
mfcc = dct_ii(lm[len(lm) // 2], 13)  # 第 0 个系数为整体能量
```

## 关键公式
type: concepts
from: phases/01-math-foundations/19-complex-numbers/docs/zh.md, phases/01-math-foundations/20-fourier-transform/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md

- **乘法**：$(a + bi)(c + di) = (ac - bd) + (ad + bc)i$。模相乘，角相加。
- **极坐标**：$r = \sqrt{a^2 + b^2}$，$\theta = \mathop{\mathrm{atan2}}(b, a)$。
- **欧拉公式**：$e^{i\theta} = \cos\theta + i \sin\theta$。乘以它即旋转 $\theta$。
- **DFT**：$X[k] = \sum_{n=0}^{N-1} x[n] \, e^{-2\pi i k n/N}$。
- **逆 DFT**：指数取正，并乘 $1/N$，可精确重建。
- **频率格**：$f_k = k \cdot f_s / N$，分辨率为 $f_s / N$，最高频率为 $f_s / 2$。
- **卷积定理**：$x * h = \text{IFFT}(\text{FFT}(x) \cdot \text{FFT}(h))$。
- **Mel**：$m = 2595 \cdot \log_{10}(1 + f / 700)$。

## 采样率
type: command-table
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md

| 命令 | 作用 |
|---|---|
| 8 kHz | 电话。奈奎斯特频率为 4 kHz，会丢失辅音信息。ASR 避免使用 |
| 16 kHz | ASR 标准。10 s 片段包含 160,000 个浮点数 |
| 22.05 kHz | 旧式模型的 TTS 声码器训练 |
| 24 kHz | 现代 TTS |
| 44.1 kHz | CD 音频、音乐 |
| 48 kHz | 电影、专业音频、高保真 TTS |

## 窗函数
type: command-table
from: phases/01-math-foundations/20-fourier-transform/docs/zh.md

| 命令 | 作用 |
|---|---|
| 矩形窗 | 不加窗。旁瓣 -13 dB。信号在 N 内恰好周期完整时适用 |
| Hann | 0.5 (1 - cos(2 pi n / (N-1)))。-31 dB。通用 |
| Hamming | 0.54 - 0.46 cos(2 pi n / (N-1))。-42 dB。语音分析 |
| Blackman | 主瓣宽，-58 dB。适用于强调旁瓣抑制的场景 |

## 数值与默认值
type: defaults
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 16 kHz 下的帧长 | 400 | 25 ms 窗口 |
| 16 kHz 下的帧移 | 160 | 10 ms，10 s 对应 998 帧 |
| ASR 的 Mel 频率格 | 80 | 音频分类使用 128 |
| MFCC 系数 | 13 | 关键词检测使用 40 |
| Log-mel epsilon | 1e-10 | 位于 log(mel_spec + eps) 内 |
| 对数幅值 epsilon | 1e-6 | 位于 log(abs(X) + eps) 内 |
| 16 kHz 下的 1024 点 FFT | 15.6 Hz | 0 至 8 kHz 上有 512 个可用频率格 |
| PCM 交换格式 | 16-bit | int16，范围为正负 32,767 |

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/01-audio-fundamentals/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md, phases/01-math-foundations/20-fourier-transform/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 输出乱码，看起来像模型错误 | 采样率不匹配 | 先匹配采样率，使用 16 kHz 单声道 float32 |
| 7 kHz 音调在 3 kHz 处出峰 | 超过奈奎斯特频率导致混叠 | 降采样前使用低通滤波器 |
| 出现伪高频 | 帧边缘频谱泄漏 | 应用 Hann 或 Hamming 窗 |
| 推理静默失败 | Mel 数量不匹配，80 对 128 | 在两端记录特征形状 |
| Whisper 输入错误 | 使用 dB-mel 而非 log-mel | 输入 log-mel |
| 生产环境 WER 翻倍 | 归一化漂移 | 训练与推理使用相同归一化 |
| 最后几帧频谱平坦 | 末尾零填充 | 使用对称或复制填充 |
| FFT 卷积发生环绕 | DFT 计算循环卷积 | 零填充到 N + M - 1 |

## 问答
type: qa
from: phases/01-math-foundations/19-complex-numbers/docs/zh.md, phases/01-math-foundations/20-fourier-transform/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md

- **零填充会提高分辨率吗？** 不会。分辨率需要 $T = 1 / \Delta f$ 秒数据。
- **为何只保留前 N/2 + 1 个频率格？** 实数输入中，$X[N-k]$ 是 $X[k]$ 的共轭。
- **i 为何表示旋转？** 乘以 i 旋转 90 度，两次旋转得到 $i^2 = -1$。
- **RoPE 如何利用它？** 旋转查询和键，将相对位置变为角度。
- **为何用 Mel 而非 Hz？** 人类按对数尺度感知音高，100 到 200 Hz 与 1000 到 2000 Hz 的变化听起来相似。
- **Parseval 定理说了什么？** 时域和频域的能量相等。

## 提示
type: tips
from: phases/01-math-foundations/19-complex-numbers/docs/zh.md, phases/01-math-foundations/20-fourier-transform/docs/zh.md, phases/06-speech-and-audio/02-spectrograms-mel-features/docs/zh.md

- 除音乐任务外，从 80 个 log-mel 特征开始。
- 更大的 FFT 改善频率分辨率，但降低时间分辨率。
- FFT 长度使用 2 的幂，零填充到下一个 2 的幂。
- N 个单位根的模均为 1，且总和为零。
- 将 `idft(dft(x))` 与 x 比较，必须在机器精度内一致。
- MFCC 第 0 个系数编码整体能量，模型通常将其丢弃。
