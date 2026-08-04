# 语音活动检测与轮转 —— Silero、Cobra，以及 flush 技巧

> 每个语音 agent 的成败都系于两个判断：用户现在在说话吗，以及他们说完了吗？VAD 回答第一个。轮次检测（VAD + 静音挂起 + 语义端点模型）回答第二个。任一个搞错，你的助手要么打断用户，要么说个没完。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 6 · 11（实时音频）、阶段 6 · 12（语音助手）
**预计时间：** ~45 分钟

## 问题背景

语音 agent 在每个 20 ms 块上做的三个不同判断：

1. **这一帧是语音吗？** —— VAD。二元、逐帧。
2. **用户开始一句新话了吗？** —— 起始检测。
3. **用户说完了吗？** —— 端点判定（轮次结束）。

朴素答案（能量阈值）碰上任何噪声就垮——交通声、键盘声、人群嘈杂声。2026 年的答案：Silero VAD（开源、深度学习）+ 一个轮次检测模型（语义端点判定）+ 一段经 VAD 校准的静音挂起。

## 核心概念

![VAD 级联：能量 → Silero → 轮次检测器 → flush 技巧](../assets/vad-turn-taking.svg)

### 三级 VAD 级联

**第 1 级：能量闸门。** 最便宜。在 -40 dBFS 处对 RMS 设阈值。滤掉明显的静音，但任何超过阈值的噪声都会触发它。

**第 2 级：Silero VAD**（2020-2026，MIT）。100 万参数。在 6000+ 种语言上训练。单 CPU 线程上每 30 ms 块约 1 ms。在 5% FPR 下 87.7% TPR。开源默认。

**第 3 级：语义轮次检测器。** LiveKit 的轮次检测模型（2024-2026）或你自己的小分类器。区分「句中停顿」和「说完了」。用语言上下文（语调 + 最近的词），不只是静音。

### 关键参数及其默认值

- **阈值。** Silero 输出一个概率；在 &gt; 0.5（默认）或 &gt; 0.3（灵敏）处判为语音。阈值越低 = 首词被切越少，误报越多。
- **最短语音时长。** 拒掉短于 250 ms 的语音——通常是咳嗽或椅子噪声。
- **静音挂起（端点判定）。** VAD 回到 0 之后，等 500-800 ms 再宣布轮次结束。太短 → 打断用户。太长 → 显得迟钝。
- **预滚缓冲。** 在 VAD 触发前留 300-500 ms 音频。防止「hey」被切。

### flush 技巧（Kyutai 2025）

流式 STT 模型有前瞻延迟（Kyutai STT-1B 是 500 ms，STT-2.6B 是 2.5 s）。正常情况下语音结束后你得等那么久才拿到转写。flush 技巧：VAD 触发语音结束时，**给 STT 发一个 flush 信号**强制它立即输出。STT 以约 4 倍实时速度处理，所以那 500 ms 缓冲约 125 ms 就跑完。

端到端：125 ms VAD + flush STT = 对话级延迟。

### 2026 年 VAD 对比

| VAD | 5% FPR 下的 TPR | 延迟 | 许可证 |
|-----|--------------|---------|---------|
| WebRTC VAD（Google，2013） | 50.0% | 30 ms | BSD |
| Silero VAD（2020-2026） | 87.7% | ~1 ms | MIT |
| Cobra VAD（Picovoice） | 98.9% | ~1 ms | 商用 |
| pyannote 分段 | 95% | ~10 ms | 类 MIT |

Silero 是正确的默认。Cobra 是合规 / 准确度的升级。只用能量的 VAD 在 2026 年的生产里没有立足之地。

```figure
sp-vad-cascade
```

## 动手构建

### 第 1 步：能量闸门

```python
def energy_vad(chunk, threshold_dbfs=-40.0):
    rms = (sum(x * x for x in chunk) / len(chunk)) ** 0.5
    dbfs = 20.0 * math.log10(max(rms, 1e-10))
    return dbfs > threshold_dbfs
```

### 第 2 步：Python 里的 Silero VAD

```python
from silero_vad import load_silero_vad, get_speech_timestamps

vad = load_silero_vad()
audio = torch.tensor(waveform_16k, dtype=torch.float32)
segments = get_speech_timestamps(
    audio, vad, sampling_rate=16000,
    threshold=0.5,
    min_speech_duration_ms=250,
    min_silence_duration_ms=500,
    speech_pad_ms=300,
)
for s in segments:
    print(f"{s['start']/16000:.2f}s - {s['end']/16000:.2f}s")
```

### 第 3 步：轮次结束状态机

```python
class TurnDetector:
    def __init__(self, silence_hangover_ms=500, min_speech_ms=250):
        self.state = "idle"
        self.speech_ms = 0
        self.silence_ms = 0
        self.silence_hangover_ms = silence_hangover_ms
        self.min_speech_ms = min_speech_ms

    def update(self, is_speech, chunk_ms=20):
        if is_speech:
            self.speech_ms += chunk_ms
            self.silence_ms = 0
            if self.state == "idle" and self.speech_ms >= self.min_speech_ms:
                self.state = "speaking"
                return "START"
        else:
            self.silence_ms += chunk_ms
            if self.state == "speaking" and self.silence_ms >= self.silence_hangover_ms:
                self.state = "idle"
                self.speech_ms = 0
                return "END"
        return None
```

### 第 4 步：flush 技巧骨架

```python
def flush_on_end(stt_client, audio_buffer):
    stt_client.send_audio(audio_buffer)
    stt_client.send_flush()
    return stt_client.recv_transcript(timeout_ms=150)
```

STT（Kyutai、Deepgram、AssemblyAI）必须支持 flush 这才管用。Whisper streaming 不支持——它是基于块的，总在等待分块。

## 实际使用

| 情形 | VAD 选择 |
|-----------|-----------|
| 开源、快、通用 | Silero VAD |
| 商用呼叫中心 | Cobra VAD |
| 端侧（手机） | Silero VAD ONNX |
| 研究 / 说话人分离 | pyannote 分段 |
| 零依赖兜底 | WebRTC VAD（遗留） |
| 需要轮次结束质量 | Silero + LiveKit 轮次检测器叠加 |

经验法则：除非真的别无选择，否则永远别上线只用能量的 VAD。

## 坑

- **固定阈值。** 安静时管用，嘈杂时垮掉。要么在端侧校准，要么换 Silero。
- **静音挂起太短。** Agent 句中打断。500-800 ms 是对话语音的甜点。
- **挂起太长。** 显得迟钝。和目标用户做 A/B 测试。
- **没有预滚缓冲。** 用户音频的前 200-300 ms 丢失。永远保留一段滚动预滚。
- **忽视语义端点判定。** 「Hmm, let me think...」里含长停顿。用户讨厌被在思考中途打断。用 LiveKit 的轮次检测器或类似的。

## 拿去用

存为 `outputs/skill-vad-tuner.md`。为一种负载挑选 VAD 模型、阈值、挂起、预滚和轮次检测策略。

## 练习

1. **简单。** 跑 `code/main.py`。它模拟一段 语音 + 静音 + 语音 + 咳嗽 的序列，测试三级 VAD。
2. **中等。** 装上 `silero-vad`，处理一段 5 分钟录音，调阈值同时把首词被切和误触发都压到最小。报告精确率/召回率。
3. **困难。** 搭一个迷你轮次检测器：Silero VAD + 一个作用在最后 10 个词嵌入上的 3 层 MLP（用 sentence-transformers）。在一个手工标注的轮次结束数据集上训练。F1 比只用 Silero 高 10%。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| VAD | 语音检测器 | 二元、逐帧：这是语音吗？ |
| 轮次检测 | 端点判定 | VAD + 静音挂起 + 语义端点。 |
| 静音挂起 | 说完后等待 | 宣布轮次结束前等待的时间；500-800 ms。 |
| 预滚（Pre-roll） | 说话前缓冲 | 在 VAD 触发前留 300-500 ms 音频。 |
| flush 技巧 | Kyutai 的妙招 | VAD → flush-STT → 125 ms 而不是 500 ms 延迟。 |
| 语义端点 | 「他们是真要停吗？」 | 看词而不只看静音的 ML 分类器。 |
| 5% FPR 下的 TPR | ROC 点 | 标准 VAD 基准；Silero 87.7%，WebRTC 50%。 |

## 延伸阅读

- [Silero VAD](https://github.com/snakers4/silero-vad) —— 参考的开源 VAD。
- [Picovoice Cobra VAD](https://picovoice.ai/products/cobra/) —— 商用准确度领跑者。
- [Kyutai — Unmute + flush trick](https://kyutai.org/stt) —— 亚 200 ms 的工程妙招。
- [LiveKit — turn detection](https://docs.livekit.io/agents/logic/turns/) —— 生产里的语义端点判定。
- [WebRTC VAD](https://webrtc.googlesource.com/src/) —— 遗留基线。
- [pyannote segmentation](https://github.com/pyannote/pyannote-audio) —— 说话人分离级别的分段。
