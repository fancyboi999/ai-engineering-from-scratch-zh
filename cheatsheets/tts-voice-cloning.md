---
id: tts-voice-cloning
title: 文本转语音、声音克隆与编解码器
code: TV
subtitle: 从文本到音素、mel 与波形，在获得同意并加水印后克隆声音，用 RVQ 编解码器将音频转为 token。
hue: 320
sources: phases/06-speech-and-audio/07-text-to-speech, phases/06-speech-and-audio/08-voice-cloning-conversion, phases/06-speech-and-audio/13-neural-audio-codecs
source_hash: 53e9822dd54baed4
---

## TTS 与克隆流程
type: architecture
from: phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md

```arch
node | text | 1,1 | 文本 | 先规范化 | client
node | g2p | 2,1 | 音素转换器 | espeak、G2P 回退 | process
node | ac | 3,1 | 声学模型 | 文本到 mel，80 通道 | model
node | voc | 4,1 | 声码器 | HiFi-GAN，mel 到波形 | model
node | ref | 2,2 | 参考片段 | 5 s 加对应转录 | store
node | spk | 3,2 | 说话人编码器 | 说话人嵌入 | model
node | wm | 4,2 | 水印 | 约 32 bit 载荷 | process
edge | text | g2p |
edge | g2p | ac | 音素
edge | ac | voc | mel
edge | ref | spk |
edge | spk | ac | 嵌入
edge | voc | wm | 波形
```

## 代码中的任务
type: task-table
from: phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/code/main.py
span: 2

| 任务 | 代码 |
|---|---|
| 转换为音素 | `phonemize("Hello world", language="en-us", backend="espeak")` |
| 在 CPU 上运行 Kokoro | `KPipeline(lang_code="a")`，再调用 `tts(text, voice="af_bella")` |
| 零样本克隆 | `F5TTS().infer(ref_file=<wav>, ref_text=<text>, gen_text=<text>)` |
| 声音转换 | `vc.convert(source=<wav>, target_pool=[<wav>, <wav>])` |
| 嵌入水印 | `sc.embed(wav, sr=24000, message=payload)` |
| 6 kbps 的 EnCodec | `model.set_target_bandwidth(6.0)` |
| Mimi 语义拆分 | `semantic = codes[:, 0]`、`acoustic = codes[:, 1:]` |
| 玩具 RVQ | `rvq_encode(values, codebook_size=8, n_codebooks=4)` |

## 克隆与水印
type: annotated-code
lang: python
from: phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md, phases/06-speech-and-audio/07-text-to-speech/docs/zh.md

```python
from f5_tts.api import F5TTS
tts = F5TTS()
wav = tts.infer(ref_file="my_voice_5s.wav",                    # 5 s 参考音频
    ref_text="The quick brown fox jumps over the lazy dog.",    # 必须精确匹配
    gen_text="Please remind me to water the plants.")
sc = SilentCipher(model="2024-06-01")
payload = b"consent_id:abc123;ts:1745353200"
watermarked = sc.embed(wav, sr=24000, message=payload)  # 约 32 bit
detected = sc.detect(watermarked, sr=24000)             # 载荷字节
```

## 使用编解码器编码
type: annotated-code
lang: python
from: phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md

```python
model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)            # kbps，8 个码本
with torch.no_grad():
    encoded = model.encode(wav)
codes, scale = encoded[0]                  # (1, n_codebooks, n_frames)
wav_recon = model.decode([(codes, scale)])
mimi = loaders.get_mimi()                  # 来自 moshi.models
codes = mimi.encode(wav)                   # (1, 8, frames@12.5Hz)
semantic = codes[:, 0]                     # 内容，与 WavLM 对齐
acoustic = codes[:, 1:]                    # 音色、韵律、噪声
```

## 同意闸门
type: flow
from: phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md

1. **闸门**：`verify_signature(consent_record)` 必须通过，否则返回 "Signed consent required"。
2. **说话人**：`consent_record["speaker_id"]` 必须等于 `hash_speaker(ref_audio)`。
3. **克隆**：`tts.infer(ref_file=ref_audio, gen_text=text)`。
4. **标记**：`watermark(wav, payload=consent_record["id"])`。
5. **日志**：将同意记录保存到可检测篡改的日志。

## 公式与数值
type: concepts
from: phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/code/main.py, phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/07-text-to-speech/code/main.py

- **RVQ**：码本 1 量化编码器输出，后续各码本逐级量化残差。
- **解码**：解码器将每帧选中的码向量相加。
- **词表**：8 个各含 1024 个码的码本给出 $1024^8 = 10^{24}$。
- **LM token**：10 s 的 Mimi 音频为 $10 \times 12.5 \times 8 = 1000$ 个 token。
- **玩具 RVQ 位数**：8 个码需 3 bit，每帧位数为 3 乘码本数。
- **Mel 帧移**：24 kHz 下 12.5 ms 为 300 个采样点。
- **HiFi-GAN**：上采样率 8、8、2、2 合计 256 倍，将 mel 帧率转换为音频采样率。

## 编解码器数值
type: defaults
from: phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md, phases/06-speech-and-audio/07-text-to-speech/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| EnCodec-24k 帧率 | 75 Hz | 默认 4 个码本，1.5 kbps |
| DAC-44.1k 帧率 | 86 Hz | 最高保真度、全频带 |
| SNAC-24k 粗粒度帧率 | ~12 Hz | 细节层为 50 Hz |
| Mimi 帧率 | 12.5 Hz | 8 个码本，4.4 kbps |
| 每码本的码数 | 1024 | 每个码为 0-1023 |
| 码本数量 | 8-12 | 更多码本提高保真度，也增加序列长度 |
| Kokoro 输出 | 24 kHz | 下游需要 16 kHz 时重采样 |

## 模型
type: concepts
from: phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md

- **Tacotron 2**：自回归 seq2seq，速度慢，长文本不稳定。
- **FastSpeech 2**：时长预测器，单次前向，比 Tacotron 快 10 倍。
- **VITS**：编码器、流式时长模型与 HiFi-GAN，端到端训练，25M。
- **F5-TTS**：流匹配扩散 transformer，可从 5 s 音频克隆，335M。
- **Kokoro**：82M，可在 CPU 运行，仅支持英语。
- **KNN-VC**：将每个 WavLM 源帧替换为目标池中最近的帧。
- **Mimi**：码本 0 从 WavLM 蒸馏，码本 1-7 表示声学信息。

## 缩写
type: glossary
from: phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md

- **TTS**：文本转语音，包含文本前端、声学模型、声码器。
- **VC**：声音转换，将 A 的语音改成 B 的声音。
- **PPG**：音素后验图，使用逐帧 ASR 后验概率表示内容。
- **RVQ**：残差向量量化，由多个小码本级联组成。
- **SECS**：说话人嵌入余弦相似度，超过 0.70 时多数听众难以区分。
- **UTMOS**：无需参考音频的 MOS 预测器，真实音频得分为 4.08。
- **CMOS**：比较 MOS，衡量 A 与 B 的偏好。
- **PESQ / ViSQOL**：与 MOS 相关的客观指标。

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "Dr." 被读作 "Drive" | 没有文本规范化器 | 音素转换前先规范化 |
| 专有名词读错 | 词表外 token | 提供回退 G2P 模型 |
| 输出超出 ±1.0 | Mel 缩放不匹配 | `np.clip(wav, -1, 1)` |
| 下游出现混叠 | 将 24 kHz Kokoro 输出送入 16 kHz 流程 | 重采样 |
| 克隆对齐失效 | 参考文本与音频不同 | 精确匹配，包括标点 |
| 克隆有回声 | 参考音频有混响 | 近距离录制干声 |
| 法语克隆保留原口音 | 语言泄漏 | XTTS 或 VALL-E X |
| LM 静默失败 | 先用 12.5 Hz Mimi，后用 50 Hz EnCodec | 保持同一帧率 |

## 选择条件
type: tips
from: phases/06-speech-and-audio/07-text-to-speech/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md, phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md

- CPU 上实时英语：Kokoro。
- 从 5 s 参考音频克隆：F5-TTS 或 OpenVoice v2。
- 将源语音转换为目标声音：KNN-VC 或 Diff-HierVC。
- 音频生成模型：从 Mimi 或 SNAC 开始。
- 压缩流程：使用 Opus，每 bit 的效果更好。
- 最高保真度重建：DAC-44.1k。
- 每次克隆：加水印并保存同意记录。

## 问答
type: qa
from: phases/06-speech-and-audio/13-neural-audio-codecs/docs/zh.md, phases/06-speech-and-audio/08-voice-cloning-conversion/docs/zh.md

- **为什么拆分语义与声学 token？** 纯重建 token 从文本生成的语音含混不清。
- **为什么用 RVQ 而非一个码本？** 一个大码本需要数百万个码。
- **Mimi 哪个码本重要？** 码本 0，丢失它会破坏可懂度。
- **克隆还是转换？** 克隆接收文本，转换接收源语音。
- **少样本微调需要多少？** 目标声音 5-30 分钟，LoRA 训练一小时。
