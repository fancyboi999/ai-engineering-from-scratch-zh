---
id: voice-assistants-realtime
title: 实时语音助手
code: RT
subtitle: VAD、轮次检测、打断、延迟预算与全双工语音，让语音 agent 及时作答。
hue: 285
sources: phases/06-speech-and-audio/11-real-time-audio-processing, phases/06-speech-and-audio/12-voice-assistant-pipeline, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking, phases/06-speech-and-audio/15-streaming-speech-to-speech-moshi-hibiki, phases/14-agent-engineering/22-voice-agents-pipecat-livekit, phases/19-capstone-projects/03-realtime-voice-assistant
source_hash: b60d80b848a54eb2
---

## 级联语音流水线
type: architecture
from: phases/06-speech-and-audio/12-voice-assistant-pipeline/docs/zh.md, phases/19-capstone-projects/03-realtime-voice-assistant/docs/zh.md

```arch
node | mic | 1,1 | 麦克风 | 16 kHz 单声道，20 ms | client
node | vad | 2,1 | VAD | Silero，语音门控 | process
node | stt | 3,1 | 流式 STT | 部分转录结果 | model
node | turn | 4,1 | 轮次检测器 | 分数高于 0.6 | model
node | llm | 4,2 | 带工具的 LLM | 流式输出 token | model
node | tool | 3,2 | 工具侧通道 | 300ms 后说过渡语 | process
node | tts | 2,2 | 流式 TTS | 200ms 内首块输出 | model
node | spk | 1,2 | 扬声器 | WebRTC 抖动缓冲区 | client
edge | mic | vad | 帧
edge | vad | stt | 语音
edge | stt | turn | 部分结果
edge | turn | llm | 提交
edge | llm | tool | 调用
edge | llm | tts | tokens
edge | tts | spk | 音频
edge | vad | tts | 打断取消
```

## 综合项目调度器的一轮
type: flow
from: phases/19-capstone-projects/03-realtime-voice-assistant/code/ts/src/orchestrator.ts, phases/19-capstone-projects/03-realtime-voice-assistant/code/main.py

1. **IDLE**：首个语音帧将状态切换到 LISTENING。
2. **LISTENING**：每个静音帧为 `silenceRunMs` 增加 20 ms。
3. **LISTENING**：静音达到 500 ms 时，`turnCompletionScore` 读取最后的部分结果。
4. **WAITING**：分数达到 0.6 时提交轮次，并设置 `turnCompleteMs`。
5. **THINKING**：发起工具调用。300 ms 时 agent 说“等一下，我查一下”。
6. **THINKING**：工具在 420 ms 时返回，首个 LLM token 再过 140 ms 到达。
7. **SPEAKING**：首个音频输出在首个 LLM token 后 180 ms 到达。
8. **打断**：THINKING 或 SPEAKING 状态下检测到语音时，取消 TTS 并重新启用 ASR。

## 每轮延迟预算
type: defaults
from: phases/06-speech-and-audio/11-real-time-audio-processing/docs/zh.md, phases/06-speech-and-audio/12-voice-assistant-pipeline/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 麦克风到缓冲区 | 20 ms | 一帧 |
| VAD | 10 ms | Silero 每帧耗时低于 1 ms |
| ASR（流式） | 150 ms | 部分转录结果 |
| LLM（首个 token） | 100 ms | 流式输出 token |
| TTS（首块） | 100 ms | 完整回答产生前开始 |
| 渲染到扬声器 | 20 ms | 一帧 |
| 总计 | 约 400 ms | 超过 500 ms 会显得机械 |
| 笔记本 CPU 的首个 TTS 音频 | 800 ms | 第 6 阶段综合项目目标 |

## VAD 与轮次设置
type: defaults
from: phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md, phases/06-speech-and-audio/11-real-time-audio-processing/docs/zh.md, phases/19-capstone-projects/03-realtime-voice-assistant/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Silero 阈值 | 0.5 | 0.3 更灵敏，较少截掉首词 |
| 最短语音 | 250 ms | 排除咳嗽与椅子噪声 |
| 静音保持 | 500-800 ms | 太短会打断用户 |
| 预录缓冲区 | 300-500 ms | 保留首词 |
| 能量门控 | -40 dBFS | 高于此值的任何噪声都会触发 |
| 帧大小 | 20 ms | 16 kHz 下为 320 个采样点 |
| 环形缓冲区 | 32,000 个采样点 | 16 kHz 下为 2 s |
| 轮次提交（综合项目） | 0.6 | 还需 500ms 的 VAD 静音 |

## Silero VAD 分段
type: annotated-code
lang: python
from: phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md

```python
from silero_vad import load_silero_vad, get_speech_timestamps
vad = load_silero_vad()
audio = torch.tensor(waveform_16k, dtype=torch.float32)
segments = get_speech_timestamps(
    audio, vad, sampling_rate=16000,
    threshold=0.5,  # 0.3 更灵敏
    min_speech_duration_ms=250,  # 丢弃咳嗽
    min_silence_duration_ms=500,  # 静音保持
    speech_pad_ms=300,  # 预录填充
)
for s in segments:
    print(f"{s['start']/16000:.2f}s - {s['end']/16000:.2f}s")
```

## 打断与强制刷新技巧
type: annotated-code
lang: python
from: phases/06-speech-and-audio/12-voice-assistant-pipeline/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md

```python
tts_task = asyncio.create_task(tts_loop())
while True:
    chunk = await mic.get()
    if vad(chunk):  # 用户在 TTS 期间说话
        tts_task.cancel()  # 停止回答
        await speaker.stop()
        await new_turn()  # 重启 STT
        break

def flush_on_end(stt_client, audio_buffer):
    stt_client.send_audio(audio_buffer)
    stt_client.send_flush()  # 立即强制输出
    return stt_client.recv_transcript(timeout_ms=150)
```

## 运行课程
type: command-table
from: phases/06-speech-and-audio/11-real-time-audio-processing/code/main.py, phases/06-speech-and-audio/12-voice-assistant-pipeline/docs/zh.md, phases/19-capstone-projects/03-realtime-voice-assistant/code/main.py, phases/19-capstone-projects/03-realtime-voice-assistant/code/ts/README.md

| 命令 | 作用 |
|---|---|
| `python3 code/main.py` | 运行课程模拟器 |
| `python main.py` | 综合项目调度器，运行正常与打断调用 |
| `pip install silero-vad` | 用真实 VAD 替代桩实现 |
| `npm install` | 安装 TypeScript 客户端 |
| `npm start` | 运行两个离线会话与一次 ws 探测，退出码为 0 |
| `npm start -- --serve` | 保持 ws 服务端运行 |
| `npm test` | 通过 tsx 运行 node --test 测试器 |
| `npm run typecheck` | 运行 `tsc --noEmit` |

## 核心术语
type: concepts
from: phases/06-speech-and-audio/11-real-time-audio-processing/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md, phases/19-capstone-projects/03-realtime-voice-assistant/docs/zh.md, phases/14-agent-engineering/22-voice-agents-pipecat-livekit/docs/zh.md

- **环形缓冲区**：固定循环缓冲区，热路径中不做内存分配。
- **抖动缓冲区**：重排迟到数据包。太小会断音，太大会增加延迟。
- **预录**：保留 VAD 触发前的音频，避免截掉首词。
- **静音保持**：VAD 回到 0 后，到轮次结束前的等待时间。
- **语义端点**：读取词语的分类器，不只看静音。
- **强制刷新技巧**：语音结束时刷新 STT，将 500 ms 前瞻等待缩短到约 125 ms。
- **过渡语**：工具耗时超过 300ms 时说出的短句。
- **DOWNSTREAM**：Pipecat 从源到接收端的帧，包括音频输入与语音输出。
- **UPSTREAM**：Pipecat 控制帧，例如取消、指标和打断。

## 全双工 Moshi 的一个 80 ms 步骤
type: flow
from: phases/06-speech-and-audio/15-streaming-speech-to-speech-moshi-hibiki/docs/zh.md, phases/06-speech-and-audio/15-streaming-speech-to-speech-moshi-hibiki/code/main.py

1. **Mimi**：以 12.5 Hz、8 个码本编码用户音频。
2. **Temporal Transformer**：7B 参数，读取用户 token 和自身上一批 token。
3. **Temporal Transformer**：输出下一个文本 token，即内部独白。
4. **Depth Transformer**：2 层，依次预测 8 个码本。
5. **客户端**：`decode_audio_mimi` 将 token 转为音频并播放。
6. **预算**：80 ms 帧加 80 ms 声学延迟，共 160 ms。在一个 L4 GPU 上为 200 ms。

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/12-voice-assistant-pipeline/docs/zh.md, phases/06-speech-and-audio/11-real-time-audio-processing/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 首词缺失 | VAD 启动稍晚 | 阈值设为 0.3 并加入预录 |
| 机器人盖过用户说话 | 打断后 LLM 仍继续 | 连接 VAD 来取消 LLM |
| 静音时出现“Thanks for watching” | Whisper 处理静音帧 | 始终使用 VAD 门控 |
| ASR 听到机器人声音 | 缺少回声消除 | 使用 WebRTC AEC3 |
| agent 在句中打断用户 | 静音保持太短 | 使用 500-800 ms 和轮次检测器 |
| 首次回答慢 | TTS 在首个请求时预热 | 用模拟运行预热 |
| 听到声码器伪影 | TTS 块短于 200 ms | 使用 320 ms 块 |
| 负载下出现卡顿 | GIL 使音频线程饥饿 | 使用 C 回调音频库 |

## 术语表
type: glossary
from: phases/06-speech-and-audio/11-real-time-audio-processing/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md, phases/14-agent-engineering/22-voice-agents-pipecat-livekit/docs/zh.md

- **AEC**：回声消除，减去扬声器到麦克风路径的声音。
- **TPR @ 5% FPR**：VAD 基准点。Silero 为 87.7%，WebRTC VAD 为 50.0%。
- **MultimodalAgent**：LiveKit 类。音频输入、音频输出，中间无文本。
- **VoicePipelineAgent**：LiveKit 类。由 STT、LLM、TTS 组成，可在文本层控制。

## 问答
type: qa
from: phases/06-speech-and-audio/11-real-time-audio-processing/docs/zh.md, phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/zh.md, phases/06-speech-and-audio/15-streaming-speech-to-speech-moshi-hibiki/docs/zh.md, phases/14-agent-engineering/22-voice-agents-pipecat-livekit/docs/zh.md, phases/19-capstone-projects/03-realtime-voice-assistant/docs/zh.md

- **人类轮流说话有多快？** 约 230 ms。超过 1500 ms 会显得失灵。
- **流水线还是 Moshi？** 需要工具时用流水线，Moshi 未经过工具调用训练。
- **Whisper 流式处理为何不能强制刷新？** 它按块处理，总会等待完整块。
- **端到端的优质延迟是多少？** 450 至 600 ms，常见值为 800 至 1200 ms。
- **综合项目验收线是什么？** 首音频输出 p50 低于 800ms，错误截断率低于 3%。
- **Pipecat 的打断需要什么？** 向 TTS 和 LLM 回传 UPSTREAM 取消帧。
