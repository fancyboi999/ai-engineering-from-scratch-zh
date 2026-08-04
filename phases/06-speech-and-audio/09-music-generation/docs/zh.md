# 音乐生成 —— MusicGen、Stable Audio、Suno，以及那场版权大地震

> 2026 年的音乐生成：商用领域由 Suno v5 和 Udio v4 主导；开源领域由 MusicGen、Stable Audio Open 和 ACE-Step 领跑。技术问题基本解决了。法律问题（华纳音乐 5 亿美元和解、环球音乐和解）在 2025-2026 年重塑了整个领域。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 6 · 02（频谱图）、阶段 4 · 10（扩散模型）
**预计时间：** ~75 分钟

## 问题背景

文本 → 一段 30 秒到 4 分钟、带歌词、人声和结构的音乐。三个子问题：

1. **器乐生成。** 像「带温暖键盘的 lo-fi 嘻哈鼓」这样的文本 → 音频。MusicGen、Stable Audio、AudioLDM。
2. **歌曲生成（带人声 + 歌词）。** 「一首关于德州雨夜的乡村歌」→ 完整歌曲。Suno、Udio、YuE、ACE-Step。
3. **条件 / 可控生成。** 续写一段已有音频、重新生成一个过门、换曲风、分离音轨、或局部重绘。Udio 的局部重绘 + 音轨分离是 2026 年要对标的功能。

## 核心概念

![音乐生成：token-LM vs 扩散，2026 年的模型地图](../assets/music-generation.svg)

### 在神经编解码 token 上的 token LM

Meta 的 **MusicGen**（2023，MIT）和众多衍生品：以文本/旋律嵌入为条件，自回归预测 EnCodec token（32 kHz，4 个码本），用 EnCodec 解码。300M - 3.3B 参数。强基线；超过 30 秒就吃力。

**ACE-Step**（开源，4B XL 于 2026 年 4 月发布）把这套扩展到完整歌曲的歌词条件生成。是开源社区最接近 Suno 的东西。

### 在梅尔或潜变量上的扩散

**Stable Audio（2023）** 和 **Stable Audio Open（2024）**：在压缩音频上做潜扩散。擅长循环段、音效设计、氛围纹理。做有结构的完整歌曲不太行。

**AudioLDM / AudioLDM2**：通过 T2I 风格的潜扩散做文本到音频，泛化到音乐、音效、语音。

### 混合式（生产）—— Suno、Udio、Lyria

闭权重。很可能是 AR 编解码 LM + 基于扩散的声码器，配专门的人声 / 鼓 / 旋律头。Suno v5（2026）是 ELO 1293 的质量领跑者。Udio v4 加了局部重绘 + 音轨分离（贝斯、鼓、人声分别下载）。

### 评估

- **FAD（Fréchet 音频距离）。** 用 VGGish 或 PANNs 特征，在嵌入层面衡量生成音频与真实音频分布之间的距离。越低越好。MusicGen small 在 MusicCaps 上 FAD 4.5；SOTA 约 3.0。
- **音乐性（主观）。** 人类偏好。Suno v5 ELO 1293 领跑。
- **文本-音频对齐。** prompt 与输出之间的 CLAP 分数。
- **音乐性瑕疵。** 不在拍子上的转换、人声乐句漂移、超过 30 秒后丢失结构。

## 2026 年模型地图

| 模型 | 参数量 | 长度 | 人声 | 许可证 |
|-------|--------|--------|--------|---------|
| MusicGen-large | 3.3B | 30 s | 无 | MIT |
| Stable Audio Open | 1.2B | 47 s | 无 | Stability 非商用 |
| ACE-Step XL (Apr 2026) | 4B | &gt; 2 min | 有 | Apache-2.0 |
| YuE | 7B | &gt; 2 min | 有，多语种 | Apache-2.0 |
| Suno v5 (闭源) | ? | 4 min | 有，ELO 1293 | 商用 |
| Udio v4 (闭源) | ? | 4 min | 有 + 音轨 | 商用 |
| Google Lyria 3 (闭源) | ? | 实时 | 有 | 商用 |
| MiniMax Music 2.5 | ? | 4 min | 有 | 商用 API |

## 法律格局（2025-2026）

- **华纳音乐诉 Suno 和解。** 5 亿美元。WMG 现在对 Suno 上的 AI 声音肖像、音乐版权和用户生成曲目拥有监督权。Udio 上有类似的环球音乐和解。
- **欧盟 AI 法案** + **加州 SB 942**：AI 生成的音乐必须披露。
- MIT 下的 **Riffusion / MusicGen** 没有合规包袱，但也没有商用人声。

可安全上线的模式：

1. 只生成器乐（MusicGen、Stable Audio Open、MIT/CC0 输出）。
2. 用带逐次生成许可的商用 API（Suno、Udio、ElevenLabs Music）。
3. 在自有或已授权的曲库上训练（大多数企业最后都走到这一步）。
4. 给生成物打上水印 + 元数据标签。

```figure
sp-codec-tokens
```

## 动手构建

### 第 1 步：用 MusicGen 生成

```python
from audiocraft.models import MusicGen
import torchaudio

model = MusicGen.get_pretrained("facebook/musicgen-small")
model.set_generation_params(duration=10)
wav = model.generate(["upbeat synthwave with driving drums, 128 BPM"])
torchaudio.save("out.wav", wav[0].cpu(), 32000)
```

三种尺寸：`small`（300M，快）、`medium`（1.5B）、`large`（3.3B）。`small` 足够判断「这个点子成不成立」。

### 第 2 步：旋律条件

```python
melody, sr = torchaudio.load("humming.wav")
wav = model.generate_with_chroma(
    ["jazz piano cover"],
    melody.squeeze(),
    sr,
)
```

MusicGen-melody 接收一个色度图，在换音色的同时保留曲调。适合「把这段旋律给我做成弦乐四重奏」。

### 第 3 步：FAD 评估

```python
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()

fad.get_fad_score("generated_folder/", "reference_folder/")
```

计算 VGGish 嵌入距离。适合曲风级别的回归测试；替代不了人类听众。

### 第 4 步：接入 LLM-音乐工作流

把第 7-8 课的想法结合起来：

```python
prompt = "Write a 30-second jazz loop. Describe the drums, bass, and piano voicing."
description = llm.complete(prompt)
music = musicgen.generate([description], duration=30)
```

## 实际使用

| 目标 | 工具栈 |
|------|-------|
| 器乐音效设计 | Stable Audio Open |
| 游戏 / 自适应音乐 | Google Lyria RealTime（闭源） |
| 带人声的完整歌曲（商用） | 带明确许可的 Suno v5 或 Udio v4 |
| 带人声的完整歌曲（开源） | ACE-Step XL 或 YuE |
| 短广告口播曲 | 以哼唱参考做旋律条件的 MusicGen |
| 音乐视频背景 | MusicGen + Stable Video Diffusion |

## 2026 年仍在上线的坑

- **洗版权的 prompt。** 「Taylor Swift 风格的歌」——商用 Suno/Udio 现在会过滤这类，开源模型不会。自己加一份过滤清单。
- **超过 30 秒后重复 / 漂移。** AR 模型会打转。把多次生成做交叉淡入淡出，或用 ACE-Step 求结构连贯性。
- **速度漂移。** 模型会偏离 BPM。在 prompt 里用 BPM 标签，并用 librosa 的 `beat_track` 做后过滤。
- **人声可懂度。** Suno 很出色；开源模型在咬字上常常糊成一团。如果歌词重要，用商用 API 或微调。
- **单声道输出。** 开源模型生成单声道或假立体声。用正经的立体声重建升级（ezst、Cartesia 的立体声扩散）。

## 拿去用

存为 `outputs/skill-music-designer.md`。为一次音乐生成部署挑选模型、许可策略、长度 / 结构方案和披露元数据。

## 练习

1. **简单。** 跑 `code/main.py`。它把一段「生成式」和弦进行 + 鼓点用 ASCII 符号产出来——一幅音乐生成的漫画。想听的话用任意 MIDI 渲染器放出来。
2. **中等。** 装上 `audiocraft`，用 MusicGen-small 跨 4 个曲风 prompt 生成 10 秒片段，对一组参考曲风测量 FAD。
3. **困难。** 用 ACE-Step（或 MusicGen-melody），用不同音色 prompt 给同一段曲调生成三个变体。计算对 prompt 的 CLAP 相似度来验证对齐。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| FAD | 音频版 FID | 真实与生成的嵌入分布之间的 Fréchet 距离。 |
| 色度图（Chromagram） | 把旋律表示成音高 | 逐帧 12 维向量；旋律条件的输入。 |
| 音轨（Stems） | 各乐器轨 | 分离出的 贝斯 / 鼓 / 人声 / 旋律 WAV。 |
| 局部重绘（Inpainting） | 重生成某一段 | 遮蔽一个时间窗；模型只重新生成那一段。 |
| CLAP | 文本-音频版 CLIP | 对比式音频-文本嵌入；评估文本-音频对齐。 |
| EnCodec | 音乐编解码 | Meta 的神经编解码，MusicGen 用它；32 kHz，4 个码本。 |

## 延伸阅读

- [Copet et al. (2023). MusicGen](https://arxiv.org/abs/2306.05284) —— 开源自回归基准。
- [Evans et al. (2024). Stable Audio Open](https://arxiv.org/abs/2407.14358) —— 音效设计的默认选择。
- [ACE-Step](https://github.com/ace-step/ACE-Step) —— 开源 4B 完整歌曲生成器，2026 年 4 月。
- [Suno v5 platform docs](https://suno.com) —— 商用质量领跑者。
- [AudioLDM2](https://arxiv.org/abs/2308.05734) —— 用于音乐 + 音效的潜扩散。
- [WMG-Suno settlement coverage](https://www.musicbusinessworldwide.com/suno-warner-music-settlement/) —— 2025 年 11 月的先例。
