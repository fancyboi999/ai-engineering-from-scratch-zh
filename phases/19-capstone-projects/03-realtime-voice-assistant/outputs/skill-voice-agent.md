---
name: voice-agent
description: 构建实时语音 agent，首段音频输出低于 800ms，支持用户插话打断和对话中途调用工具。
version: 1.0.0
phase: 19
lesson: 03
tags: [capstone, voice, webrtc, livekit, pipecat, asr, tts, streaming]
---

给定一个业务领域（客服、日程安排、零售助手），部署一个 WebRTC 语音 agent，端到端首段音频输出保持在 800ms 以内，同时能处理插话打断、工具调用和丢包。

构建计划：

1. 搭一个 LiveKit Agents 1.0 房间，配一个推送麦克风音频流的 Web 客户端。加一个 Twilio PSTN 网关以支持电话接入。
2. 运行流式 ASR（托管的 Deepgram Nova-3，或在 g5.xlarge 上跑 faster-whisper Whisper-v3-turbo）。订阅中间转写和最终转写。
3. 在 20ms 帧上运行 Silero VAD v5。检测到语音结束时，用 LiveKit 的轮次检测器给最新的中间转写打分；只有当 VAD 静音 >= 500ms 且完成度分数 >= 0.6 时，才判定本轮结束。
4. 流式调用 LLM（GPT-4o-realtime、Gemini 2.5 Flash Live，或级联的 Claude Haiku 4.5）。在 200ms 内把第一个 token 交给 TTS。
5. 流式 TTS（Cartesia Sonic-2 或 ElevenLabs Flash v3）。第一段音频必须在 LLM 首个 token 产生后 200ms 内离开服务器。
6. 插话打断：在 SPEAKING 或 THINKING 状态下，VAD 一旦检测到用户新的语音，就取消 TTS、丢弃剩余的 LLM 输出、重新启动 ASR。发布一个 `tts_canceled` span。
7. 工具旁路：函数调用并发执行；如果延迟 > 300ms，先播一句确认性的填充语，保证音频流永不卡住。
8. 录制 100 通通话。测量：相对留出转写的 WER、Hamming VAD 基准上的误截断率、首段音频输出 p50、NISQA MOS，以及 3% 丢包下的表现。
9. 用合成呼叫方在单台 g5.xlarge 上压测 50 路并发通话；报告持续负载下的首段音频输出 p95。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 端到端延迟 | 100 通录制通话的首段音频输出 p50 低于 800ms |
| 20 | 轮次切换质量 | Hamming VAD 基准上误截断率低于 3% |
| 20 | 工具调用正确性 | 对话中途的工具调用返回正确数据，且音频不卡顿 |
| 20 | 丢包下的可靠性 | 注入 3% 丢包时的 WER 和轮次切换稳定性 |
| 15 | 评估 harness 完整度 | 测量结果可复现，配置公开 |

直接否决：

- 非流式流水线（批量 ASR、批量 TTS）达不到延迟目标。
- 插话打断策略没有立即清空 TTS 缓冲区。延迟取消会造成最严重的用户体验退化。
- 工具调用同步阻塞 LLM 流。它们必须走旁路。

拒绝规则：

- 没有 VAD 或轮次检测器时拒绝部署。固定超时的轮次切换会导致无法接受的截断率。
- 报告 MOS 时，如果没写明是人工评分还是 NISQA 代理评分，拒绝报告。
- 没有至少 100 通录制通话并公开通话 trace，就拒绝报告"p50 延迟低于 X"。

输出：一个仓库，包含 LiveKit agent worker、PSTN 网关配置、100 通通话的评估 harness、一个公开的 Langfuse 语音看板、与一家托管竞品（Retell、Vapi，或直接用 OpenAI Realtime API）的并排对比，以及一份说明文档，写出你观察到的三个最大的轮次切换失败，以及修复每一个的检测器调参。
