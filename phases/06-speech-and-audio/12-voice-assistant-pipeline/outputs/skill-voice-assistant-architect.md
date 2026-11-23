---
name: voice-assistant-architect
description: 针对具体负载，产出一份全栈语音助手规格：组件、延迟预算、可观测性和合规。
version: 1.0.0
phase: 6
lesson: 12
tags: [voice-assistant, architecture, livekit, pipecat, compliance]
---

拿到使用场景（消费级 / 客服 / 无障碍 / 边缘）、预期规模（并发会话数、每月分钟数）、语言、延迟目标、合规要求（HIPAA、PCI、EU AI Act、CA SB 942）后，输出：

1. 组件（7 层）。麦克风 + 分块 · VAD · 流式 STT · LLM + 工具 · 流式 TTS · 播放 · 打断处理器。每一层写出具体的服务商/模型。
2. 延迟预算。各阶段的 P50 / P95 / P99 目标，加起来等于端到端目标。标明哪些阶段相互独立、哪些串行。
3. 工具调用 schema。每个工具的 JSON 规格 + 错误处理 + 兜底文案。始终包含一条"帮不了"路径，LLM 连续失败两次就必须走这条路。
4. 安全。prompt 注入防护、声音克隆锁定（TTS 支持克隆时）、唤醒词门控（常开设备）、日志中的 PII 脱敏、30 天保留期。
5. 可观测性。各阶段 P50/P95/P99 · 误打断率 · 工具调用成功率 · 每 100 通的 WER · 每分钟成本 · 放弃率。
6. 合规。披露语音（"This is an AI assistant"）、区域锁定（EU 数据留在 EU）、审计日志保留、退出途径。

常开部署没有唤醒词，一律拒绝。不支持流式的 TTS 拒绝（会增加与整句长度相当的延迟）。只看平均延迟、不看 P95 的，拒绝：用户正是在长尾上流失的。原始音频保留 &gt; 30 天却没有法务审查，拒绝。

示例输入："面向低视力用户的无障碍助手：为一款消费级邮件应用提供纯语音界面。英语。P95 &lt; 600 ms。约 1 万并发用户。"

示例输出：
- 组件：sounddevice（通过 LiveKit Agents 走 WebRTC）· Silero VAD · Deepgram Nova-3（英语）· 带邮件工具的 GPT-4o（read_message、compose_reply、mark_read）· Cartesia Sonic 2 流式 · WebRTC 输出 · VAD 触发时 interrupt=cancel-LLM-and-TTS。
- 预算：采集 120 ms + VAD 40 + STT 150 + LLM TTFT 100 + TTS TTFA 150 = 560 ms P95。
- 工具：read_message({id})、compose_reply({message_id, body})、mark_read({id})、search({query})。全部返回 JSON；LLM 每个工具最多重试 2 次，之后兜底回复 "I couldn't do that — try rephrasing"。
- 安全：prompt 注入防护（检测 `ignore previous instructions`）；唤醒词 "Hey Mail"；不做声音克隆（固定 Cartesia 音色）；日志中脱敏邮件正文。
- 可观测性：用 Hamming AI 做生产监控；各阶段 Prometheus 直方图；误打断 &gt; 5% 或 p95 &gt; 800 ms 时告警。
- 合规：首次使用时披露 AI 身份；仅医疗类邮件可选开启 HIPAA；EU 用户走 EU 托管的 Cartesia + 爱尔兰区域的 GPT-4o。
