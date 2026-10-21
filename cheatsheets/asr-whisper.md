---
id: asr-whisper
title: 语音识别与 Whisper
code: SR
subtitle: 解码 CTC、运行和调优 Whisper、使用 VAD 门控，并交付 WAV 转字幕流水线。
hue: 265
sources: phases/06-speech-and-audio/04-speech-recognition-asr, phases/06-speech-and-audio/05-whisper-architecture-finetuning, phases/07-transformers-deep-dive/10-audio-transformers-whisper, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking, projects/voice-note-transcriber-pipeline
source_hash: d0d712ad067027f3
---

## 代码任务
type: task-table
from: phases/06-speech-and-audio/04-speech-recognition-asr/code/main.py, phases/06-speech-and-audio/04-speech-recognition-asr/docs/zh.md, phases/06-speech-and-audio/05-whisper-architecture-finetuning/code/main.py, phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md, phases/07-transformers-deep-dive/10-audio-transformers-whisper/code/main.py, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/code/main.py
span: 2

| 任务 | 代码 |
|---|---|
| 贪心 CTC 解码 | `ctc_greedy(frame_probs)` |
| 束搜索 CTC 解码 | `ctc_beam(frame_probs, beam_width=8)` |
| 词错误率 | `wer(ref, hyp)` |
| 为 10 min 音频规划分块 | `chunk_schedule(600.0, chunk_s=30.0, stride_s=5.0)` |
| 轮次结束状态机 | `TurnDetector(silence_hangover_ms=500, min_speech_ms=250)` |
| 在注意力层上应用 LoRA | `LoraConfig(r=16, lora_alpha=32, target_modules=["q_proj", "v_proj"])` |

## Whisper 内部结构
type: architecture
from: phases/07-transformers-deep-dive/10-audio-transformers-whisper/docs/zh.md, phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md

```arch
node | audio | 1,1 | 音频 | 16 kHz，补齐或截断至 30 s | client
node | mel | 2,1 | 对数梅尔谱 | 80 个梅尔频带 x 3000 帧 | process
node | stem | 3,1 | 卷积前端 | 卷积核 3，步长 2 | process
node | enc | 4,1 | 编码器 | 1500 个时间步 | model
node | prompt | 3,2 | 任务 token | 语言、任务、时间戳 | store
node | dec | 4,2 | 解码器 | 因果自注意力 + 交叉注意力 | model
node | text | 2,2 | BPE token | 51,865 个 token 的词表 | client
edge | audio | mel |
edge | mel | stem |
edge | stem | enc | 1500
edge | enc | dec | 交叉注意力
edge | prompt | dec | 前缀
edge | dec | text |
```

## 使用 Whisper 转录
type: annotated-code
lang: python
from: phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("clip.wav",
    language="en",                     # 防止语言识别漂移
    task="transcribe",                 # 或用 <|translate|> 翻译为英语
    temperature=0.0,                   # 不使用采样回退
    condition_on_previous_text=False)  # 防止失控重复
print(result["text"])
for seg in result["segments"]:         # 每段的 start、end、text
    print(seg["start"], seg["end"], seg["text"])
```

## 更快的运行时与 VAD
type: annotated-code
lang: python
from: phases/07-transformers-deep-dive/10-audio-transformers-whisper/docs/zh.md, phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md
span: 2

```python
from faster_whisper import WhisperModel
model = WhisperModel("large-v3-turbo", compute_type="int8_float16")  # 速度为 4x
segments, info = model.transcribe("meeting.wav", vad_filter=True)    # VAD 门控
from silero_vad import load_silero_vad, get_speech_timestamps
vad = load_silero_vad()
segments = get_speech_timestamps(audio, vad, sampling_rate=16000, threshold=0.5,
    min_speech_duration_ms=250, min_silence_duration_ms=500, speech_pad_ms=300)
```

## ASR 形式
type: concepts
from: phases/06-speech-and-audio/04-speech-recognition-asr/docs/zh.md, phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md, phases/07-transformers-deep-dive/10-audio-transformers-whisper/docs/zh.md

- **CTC**：逐帧 token 加空白符。没有内部语言模型，速度快。
- **贪心 CTC**：合并重复，移除空白。`a a _ _ a b b _ c` 得到 `a a b c`。
- **RNN-T**：预测网络加联合网络。支持流式处理，内置语言模型。
- **注意力编码器-解码器**：离线质量最好。需要额外工程才能流式处理。
- **WER**：$(S + D + I) / N$。高于 20% 不可用，低于 5% 达到人类水平。
- **Turbo**：解码器从 32 层减至 4 层。速度为 8×，WER 损失 <1%。
- **Prompt**：`<|startoftranscript|>`、`<|en|>`、`<|transcribe|>` 或 `<|translate|>`，之后为 `<|notimestamps|>`。

## 默认值
type: defaults
from: phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md, projects/voice-note-transcriber-pipeline/solution/pipeline.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| `temperature` | 0.0 | 覆盖回退链 |
| `condition_on_previous_text` | False | 阻止幻觉级联 |
| `no_speech_threshold` | 0.6 | 静音检测 |
| Silero `threshold` | 0.5 | 0.3 更敏感 |
| `min_speech_duration_ms` | 250 | 排除咳嗽和椅子噪声 |
| 静音延后判定时长 | 500-800 ms | 过短会打断，过长显得迟钝 |
| 前置缓冲 | 300-500 ms | 保留第一个词 |

## 运行项目
type: annotated-code
lang: bash
from: projects/voice-note-transcriber-pipeline/README.md
span: 2

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --all --solution --strict
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
ffmpeg -i YOUR_NOTE.m4a -ac 1 -ar 16000 -c:a pcm_s16le YOUR_NOTE.wav  # 单声道 16 位 PCM
python3 pipeline.py --input YOUR_NOTE.wav --endpoint <url> --model YOUR_MODEL --out voice-output
```

## 项目流水线
type: flow
from: projects/voice-note-transcriber-pipeline/solution/pcm.py, projects/voice-note-transcriber-pipeline/solution/activity.py, projects/voice-note-transcriber-pipeline/solution/transcribe.py, projects/voice-note-transcriber-pipeline/solution/provider.py, projects/voice-note-transcriber-pipeline/solution/captions.py, projects/voice-note-transcriber-pipeline/solution/pipeline.py

1. **decode_wav**：只接受单声道、16 位、未压缩音频。采样值除以 32768。
2. **activity**：仅启用 `--segment` 时运行。对每个 `frame_ms=20` 帧计算 RMS，`threshold=0.02`，合并 `gap_ms=40` 的间隙，丢弃短于 `min_ms=40` 的区间。
3. **transcribe**：对每个区间调用 `encode_wav`。遇到 `TimeoutError` 最多重试 `retries=1` 次。每行保留 `audio_sha256` 与 `attempts`。
4. **http_recognizer**：multipart 中包含 `model` 与 `file` 字段。响应上限 1 MB，超时 30 s。
5. **captions**：使用 `WEBVTT` 头。用 `stamp()` 将字幕时间格式化为 hh:mm:ss.mmm。时间重叠则失败。
6. **export_transcript**：写出 transcript.json、captions.vtt、audio.wav 和 index.html。

## 项目参数
type: command-table
from: projects/voice-note-transcriber-pipeline/solution/pipeline.py, projects/voice-note-transcriber-pipeline/README.md

| 命令 | 作用 |
|---|---|
| `--input <wav>` | 单声道 16 位 PCM WAV，最大 20 MB |
| `--out <dir>` | 输出目录，默认为 `voice-output` |
| `--transcript-file <json>` | 与音频 SHA256 绑定的离线参考文本 |
| `--endpoint <url>` | 将 WAV 上传至 audio/transcriptions 端点 |
| `--segment` | 识别前按 RMS 活动分段 |
| `--review-file <json>` | 重新渲染编辑后的 transcript.json |

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/04-speech-recognition-asr/docs/zh.md, phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md, projects/voice-note-transcriber-pipeline/solution/pcm.py, projects/voice-note-transcriber-pipeline/solution/provider.py, projects/voice-note-transcriber-pipeline/README.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 静音时输出“Thanks for watching!” | 没有 VAD | 调用 Whisper 前进行 VAD 门控 |
| 含噪音频被识别成日语 | 自动语言识别漂移 | 强制 `language="en"` |
| 一个错误在后续窗口重复 | 前文引发级联 | `condition_on_previous_text=False` |
| 2 s 音频的填充部分出现文字 | 补齐至 30 s | `pad=False` 或 VAD 门控 |
| 输出接近随机 | 使用 librosa 梅尔谱，统计值错误 | `whisper.audio.log_mel_spectrogram` |
| agent 打断用户 | 延后判定时长过短 | 使用 500-800 ms 延后判定与语义端点 |
| "16-bit mono PCM required" | 输入为立体声或压缩格式 | 用 `ffmpeg -ac 1 -ar 16000` 转换 |
| "Remote endpoints require HTTPS" | 通过 HTTP 访问远程主机 | 使用 HTTPS。HTTP 仅用于环回地址 |

## 问答
type: qa
from: phases/06-speech-and-audio/04-speech-recognition-asr/docs/zh.md, phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md

- **何时冻结编码器？** 数据少于 10 小时时。仅调优解码器。
- **微调需要多少数据？** 10 至 100 小时目标领域音频及转录文本。
- **为何 CTC 用束搜索而非贪心？** 束搜索支持语言模型融合。CTC 没有内部语言模型。
- **什么是 flush 技巧？** 语音结束时刷新 STT。500 ms 缓冲约在 125 ms 内结束。
- **生产环境能用能量 VAD 吗？** 不能。高于 -40 dBFS 的任何噪声都会触发它。
