---
name: realtime-voice-pipeline
description: 按端到端延迟目标，选择传输层、VAD、流式 STT、LLM、流式 TTS 和编排框架。
version: 1.0.0
phase: 6
lesson: 11
tags: [voice-agent, livekit, pipecat, silero, streaming, latency]
---

拿到目标（延迟 P50/P95、语言、渠道、离线还是云端、通话量）后，输出：

1. 传输层。WebRTC（LiveKit / Daily）· WebSocket · SIP 中继（Twilio / Telnyx）。理由要和抖动容忍度及使用场景挂钩。
2. VAD + 轮次切换。Silero VAD（开源，99.5% TPR）· Cobra（商业）· LiveKit turn-detector。阈值、最短语音时长、静音拖尾时间。
3. 流式 STT。Parakeet TDT（最快的开源方案）· Kyutai STT（配合 flush 技巧）· Deepgram Nova-3（API，约 150 ms）· Whisper-streaming。说明理由。
4. LLM + 流式输出。TTS 启动前先固定前 20 个 token。模型 + 流式配置 + prompt 注入护栏。
5. 流式 TTS。Kokoro-82M（约 100 ms TTFA）· Orpheus · Cartesia Sonic · ElevenLabs Turbo。音色包或克隆防护（第 8 课）。
6. 编排。LiveKit Agents · Pipecat · Vapi · Retell · 自研 Rust。理由要和团队技能及规模挂钩。
7. 可观测性。各阶段 P50/P95/P99 直方图；误打断率；掉线率；通话样本上的 WER。

在 STT 之前缓存整句语音的部署，一律拒绝。不支持流式的 TTS，拒绝。拒绝用平均延迟做评估，必须看 P95。每月 &gt; 10 万分钟的量，没有和自建方案做成本对比，就拒绝托管平台（Vapi / Retell）。

示例输入："车险报价语音 agent。P95 &lt; 500 ms。英语，美国。每周 5 万分钟。合规：接近 HIPAA（日志里不能有 PII）。"

示例输出：
- 传输层：LiveKit Agents + Twilio SIP。已在呼叫中心规模上验证过，可选开启 HIPAA 模式。
- VAD：Silero VAD，阈值 0.45，最短语音 220 ms，静音拖尾 400 ms。叠加 LiveKit turn-detector。
- STT：Deepgram Nova-3 英语（P95 约 150 ms）；需要本地部署审计时回退到 Parakeet-TDT。
- LLM：通过 OpenAI realtime API 流式调用 GPT-4o；用后置过滤器防 prompt 注入；前 20 个 token 固定后再交给 TTS。
- TTS：Cartesia Sonic 2（约 150 ms TTFA，不用声音克隆，使用预设音色）。
- 编排：LiveKit Agents。生产可观测性用 Hamming AI。
- 日志：持久化之前，用正则 + NER 去掉 CVV / SSN / DOB。保留 30 天。
