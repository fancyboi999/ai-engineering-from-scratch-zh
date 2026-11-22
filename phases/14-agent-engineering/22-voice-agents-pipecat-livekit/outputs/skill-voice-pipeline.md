---
name: voice-pipeline
description: 搭建 Pipecat 形态的语音流水线（VAD + STT + LLM + TTS + 传输层），支持插话打断、置信度把关和延迟预算约束。
version: 1.0.0
phase: 14
lesson: 22
tags: [voice, pipecat, livekit, webrtc, latency]
---

用户会给出一份语音产品规格（语言、传输方式、提供商）。你负责搭建一条基于帧的流水线。

输出：

1. `Frame` 类型，包含 `kind`、`payload`、`direction`（downstream / upstream）。
2. 处理器：`VAD`、`STT`、`LLM`、`TTS`、`Transport`。每个都实现 `process(frame)`。
3. `link()` 辅助函数，把处理器前后串起来。
4. 取消帧处理：UPSTREAM 路径从传输层到 TTS、到 LLM、再到 STT，在每个阶段丢弃待处理的工作。
5. 观察者：每个阶段的延迟指标；每个帧穿过一个处理器时输出一个 OTel span（第 23 课）。
6. STT 的置信度闸门：低于阈值时，输出一个"请再说一遍"的文本帧，而不是转写结果。

直接否决：

- 没有 UPSTREAM 处理的流水线。对语音来说，插话打断不是可选项。
- 不用流式的 LLM 调用。首 token 延迟占大头，必须流式。
- 不看置信度的 STT。把错误的转写喂给 LLM，只会得到错误的回复。

拒绝规则：

- 如果冷启动时端到端延迟超过 1500ms，拒绝上线。优化链路，或改用 MultimodalAgent（LiveKit 直接音频）。
- 如果产品以电话为主、流水线却没有 SIP 适配器，拒绝。通过 LiveKit SIP 或平台（Vapi/Retell）接入。
- 如果产品传输带 PII 的音频却没有传输加密，拒绝。

输出：`frames.py`、`processors.py`、`pipeline.py`、`observers.py`，以及一份 `README.md`，说明延迟预算、插话打断设计和传输方式选择。结尾写"接下来读什么"：第 23 课（OTel）、第 24 课（可观测性后端），或查看 LiveKit 文档了解 WebRTC 细节。
