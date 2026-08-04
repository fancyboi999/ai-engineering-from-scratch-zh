# 顶点项目 03 —— 实时语音助手（ASR 到 LLM 到 TTS）

> 一个手感对的语音 agent，端到端延迟在 800ms 以下，知道你什么时候说完了，能处理打断（barge-in），还能调用工具而不卡顿。2026 年，Retell、Vapi、LiveKit Agents、Pipecat 都达到了这条线。它们靠的是同一套形态：流式 ASR、一个轮次检测器、流式 LLM、流式 TTS，全部通过 WebRTC 串起来，每一跳都卡着激进的延迟预算。做一个出来，测 WER、MOS 和误截断率，再让它在丢包下跑一跑。

**类型：** Capstone
**语言：** Python（agent + 流水线）、TypeScript（web 客户端）
**前置要求：** 第 6 阶段（语音与音频）、第 7 阶段（transformer）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（agent）、第 17 阶段（基础设施）
**涉及阶段：** P6 · P7 · P11 · P13 · P14 · P17
**预计时间：** 30 小时

## 问题背景

语音是 2025-2026 年走得最快的 AI 体验品类。技术天花板每个季度都在往下掉。OpenAI Realtime API、Gemini 2.5 Live、Cartesia Sonic-2、ElevenLabs Flash v3、LiveKit Agents 1.0、Pipecat 0.0.70，全都把 800ms 以下的首音输出变得触手可及。这条线不只是延迟，更是交互手感：不打断用户、不被打断、从一句话中途被打断后能恢复、对话中途调用工具而不卡住音频、扛得住抖动的移动网络。

你没法靠拼三个 REST 调用走到那一步。架构是端到端的流水线式流式处理。把它做出来，失败模式就显形了：一个为电话音频调过的 VAD 被背景里的电视触发了、一个轮次检测器在等一个永远不会来的标点、一个 TTS 在吐字前缓冲了 400ms。这个顶点项目就是在负载下一个个修掉它们，再发一份延迟与质量报告。

## 核心概念

流水线有五个流式阶段：**音频输入**（来自浏览器或 PSTN 的 WebRTC）、**ASR**（来自 Deepgram Nova-3 或 faster-whisper 的流式部分转写）、**轮次检测**（VAD 加一个小的轮次检测模型，读部分转写找说完的线索）、**LLM**（一判定轮次结束就流式吐 token）、**TTS**（在第一个 LLM token 之后约 200ms 内流式吐音频）。

三个横切关注点。**Barge-in（打断）**：当 agent 在说话时用户开口，TTS 取消，ASR 立刻接上。**工具使用**：对话中途的函数调用（天气、日历）必须跑在旁路上，不能卡住音频；如果延迟超过 300ms，agent 先填一个确认 token（“稍等……”）。**反压（backpressure）**：丢包时，部分转写被暂存，VAD 抬高语音门限阈值，agent 避免压着一条还没被确认的消息说话。

衡量这条线是定量的。在 15 dB SNR 的 Hamming VAD 基准上 WER 低于 8%。100 次实测通话的首音输出 p50 低于 800ms。误截断率低于 3%。TTS 的 MOS 高于 4.2。单台 g5.xlarge 上 50 路并发通话。这些数字就是交付物。

## 架构

```
browser / Twilio PSTN
        |
        v
   WebRTC / SIP edge
        |
        v
  LiveKit Agents 1.0  (or Pipecat 0.0.70)
        |
   +----+--------------+--------------+-----------------+
   |                   |              |                 |
   v                   v              v                 v
  ASR              VAD v5         turn-detector     side-channel
(Deepgram         (Silero)          (LiveKit)        tools
 Nova-3 /         speech-gate    completion score    (weather,
 Whisper-v3)      per 20ms        on partials        calendar)
   |                   |              |
   +--------+----------+--------------+
            v
        LLM (streaming)
     GPT-4o-realtime / Gemini 2.5 Flash /
     cascaded Claude Haiku 4.5
            |
            v
        TTS streaming
     Cartesia Sonic-2 / ElevenLabs Flash v3
            |
            v
     audio back to caller
            |
            v
   OpenTelemetry voice traces -> Langfuse
```

## 技术栈

- 传输：LiveKit Agents 1.0（WebRTC）加 Twilio PSTN 网关；Pipecat 0.0.70 作为备选框架
- ASR：Deepgram Nova-3（流式，首个部分转写 300ms 以下）或自托管的 faster-whisper Whisper-v3-turbo
- VAD：Silero VAD v5 加 LiveKit 轮次检测器（一个读部分转写的小 transformer）
- LLM：紧密集成用 OpenAI GPT-4o-realtime，或 Gemini 2.5 Flash Live，或级联式 Claude Haiku 4.5（流式补全，独立的音频路径）
- TTS：Cartesia Sonic-2（首字节最低）、ElevenLabs Flash v3，或自托管用开源的 Orpheus
- 工具：天气/日历/预订走 FastMCP 旁路；工具耗时 >300ms 时 agent 先吐填充语
- 可观测性：OpenTelemetry 语音 span，带音频回放的 Langfuse 语音 trace
- 部署：自托管 Whisper + Orpheus 用单台 g5.xlarge（24GB 显存）；要最低延迟就用托管 API

```figure
ce-voice-latency
```

## 动手构建

1. **WebRTC 会话。** 立起一个 LiveKit room 和一个流式推送麦克风音频的 web 客户端。服务端挂一个加入这个 room 的 agent worker。

2. **ASR 流式。** 把 20ms 的 PCM 帧喂给 Deepgram Nova-3（或 GPU 上的 faster-whisper）。订阅部分转写和最终转写。记录每个部分转写的延迟。

3. **VAD 与轮次检测器。** 在帧流上跑 Silero VAD v5。语音结束事件触发时，对最新的部分转写跑 LiveKit 轮次检测器。只有当 VAD 报告静默达 500ms 且轮次检测器的完成分 > 0.6 时，才提交“轮次结束”。

4. **LLM 流。** 轮次结束时，用进行中的对话加最终转写发起 LLM 调用。流式吐 token。在第一个 token 处，交棒给 TTS。

5. **TTS 流。** Cartesia Sonic-2 流式回吐音频块。第一块必须在第一个 LLM token 之后 200ms 内离开服务端。把音频块吐给 LiveKit room；客户端通过 WebRTC 抖动缓冲播放。

6. **Barge-in。** 当 TTS 正在播放时 VAD 检测到新的用户语音，立刻取消 TTS 流，丢掉剩余的 LLM 输出，重新武装 ASR。发一个 `tts_canceled` span。

7. **工具旁路。** 把天气和日历注册成 function-calling 工具。被调用时，并发触发该调用；若 300ms 内没返回，让 LLM 吐一句“稍等，我查一下”作填充语；工具返回后恢复。

8. **评测外壳。** 录 100 通通话。计算 WER（对照留出的转写）、误截断率（用户话说一半时 TTS 被取消）、首音输出 p50、TTS 的 MOS（人评或 NISQA），以及一个抖动丢包测试（丢 3% 的包）。

9. **压力测试。** 用合成呼叫者在单台 g5.xlarge 上驱动 50 路并发通话。衡量持续的首音输出 p95。

## 实际使用

```
caller: "what is the weather in tokyo tomorrow"
[asr  ] partial @280ms: "what is the"
[asr  ] partial @540ms: "what is the weather"
[turn ] completion score 0.82 at @820ms; commit
[llm  ] first token @960ms
[tool ] weather.tokyo tomorrow -> 68/52 partly cloudy @1140ms
[tts  ] first audio-out @1040ms: "Tokyo tomorrow will be partly cloudy..."
turn latency: 1040ms user-stop -> audio-out
```

## 拿去用

`outputs/skill-voice-agent.md` 是交付物。给定一个领域（客服、排程或自助终端），它会立起一个 LiveKit agent，把 ASR/VAD/LLM/TTS 流水线调到衡量线上。评分标准：

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 端到端延迟 | 100 通录制通话上首音输出 p50 低于 800ms |
| 20 | 轮次切换质量 | 在 Hamming VAD 基准上误截断率低于 3% |
| 20 | 工具使用正确性 | 对话中途的工具调用能返回正确数据且不卡音频 |
| 20 | 丢包下的可靠性 | 注入 3% 丢包后的 WER 和轮次切换稳定性 |
| 15 | 评测外壳完整度 | 可复现的测量，配置公开 |
| **100** | | |

## 练习

1. 把 Deepgram Nova-3 换成 g5.xlarge 上的 faster-whisper v3 turbo。衡量延迟和 WER 的差距。指出 CPU vs GPU 的取舍在哪里重要。

2. 加一条打断仲裁策略：用户在一次工具调用期间打断时，agent 怎么办？比较三种策略（硬取消、把工具做完再停、把下一轮排队）。

3. 跑一个对抗式轮次检测测试：让用户在句子中途长时间停顿。调 VAD 静默阈值和轮次检测器的分数阈值，在不冲破 900ms 的前提下把误截断率压到最低。

4. 通过 Twilio 把同一个 agent 部署到 PSTN 上。比较 PSTN 与 WebRTC 的首音输出。解释抖动缓冲和编解码器的差异。

5. 给非英语语言（日语、西班牙语）加语音活动检测。衡量 Silero VAD v5 的误触发率，并跟语言专用的微调版本对比。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Turn detection（轮次检测） | “话说完了” | 给定 VAD 静默和一段部分转写，判定用户已说完的分类器 |
| Barge-in（打断） | “打断处理” | VAD 检测到新的用户语音时，在播放途中取消 TTS |
| First-audio-out（首音输出） | “延迟” | 从用户停止说话到第一个音频包离开服务端的时间 |
| VAD | “语音门” | 把音频帧分类为语音还是静默的模型；Silero VAD v5 是 2026 年的默认选择 |
| Jitter buffer（抖动缓冲） | “音频平滑” | 客户端缓冲区，短暂滞留数据包以吸收网络抖动 |
| Filler（填充语） | “确认 token” | 工具慢时 agent 吐出的短句，用来避免冷场 |
| MOS | “平均意见分” | 感知层面的语音质量评分；NISQA 是自动化代理指标 |

## 延伸阅读

- [LiveKit Agents 1.0](https://github.com/livekit/agents) —— 参考 WebRTC agent 框架
- [Pipecat](https://github.com/pipecat-ai/pipecat) —— 备选的 Python 优先流式 agent 框架
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) —— 集成式语音模型的参考
- [Deepgram Nova-3 documentation](https://developers.deepgram.com/docs) —— 流式 ASR 参考
- [Silero VAD v5](https://github.com/snakers4/silero-vad) —— VAD 参考模型
- [Cartesia Sonic-2](https://docs.cartesia.ai) —— 低延迟 TTS 参考
- [Retell AI architecture](https://docs.retellai.com) —— 生产级语音 agent 架构
- [Vapi.ai production stack](https://docs.vapi.ai) —— 备选的生产级参考
