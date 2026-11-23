---
name: duplex-pipeline
description: 为语音 agent 负载在全双工（Moshi）和流水线（VAD + STT + LLM + TTS）架构之间做选择。
version: 1.0.0
phase: 6
lesson: 15
tags: [moshi, hibiki, full-duplex, voice-agent, streaming]
---

拿到负载情况（延迟目标、工具调用需求、语言覆盖、硬件预算、云端还是边缘）后，输出：

1. 架构。全双工（Moshi / GPT-4o Realtime / Gemini Live）还是流水线（LiveKit + STT + LLM + TTS，第 12 课）。一句话说明理由。
2. 模型。Moshi · Hibiki · Hibiki-Zero · Sesame CSM · GPT-4o Realtime · Gemini 2.5 Live · 传统流水线。说明理由。
3. 规模。每个会话的 GPU 成本（Moshi 会占住一个槽位）、最大并发会话数、冷启动影响。
4. 工具调用路径。如有需要，用混合流水线（全双工 + 外部 LLM 负责工具调用）还是纯流水线。说明取舍。
5. 语言覆盖。全双工模型支持的语言很少；流水线能继承 LLM 的多语言能力。

需要工具调用 / 检索的企业 agent，拒绝纯全双工架构：Moshi 是对话模型，不是 agent 框架。低于 250 ms 的对话 agent，拒绝纯流水线：各阶段延迟会累加。单张 GPU 上 &gt; 4 个并发会话时拒绝 Moshi：会出现资源争用。

示例输入："语言学习的语音陪练：练习对话流利度。英语 + 法语。响应 &lt; 250 ms。日活 1 万。"

示例输出：
- 架构：全双工（Moshi）。低于 250 ms 的延迟要求 + 对话流利度，正好是 Moshi 的强项。
- 模型：Moshi。英语和法语都支持得很好。CC-BY 4.0 许可证。
- 规模：一张 L4 GPU 承载 4-6 个并发会话 → 1 万日活、10% 并发时，峰值约需 1500 张 GPU。规划一个端侧轻量模式，用 Kyutai Pocket TTS + 本地 Whisper 处理低负载路径。
- 工具调用：很少。"显示语法提示"和"翻译这句话"可以通过一个小型 LLM 旁路处理；大部分交互是开放式对话，正是 Moshi 发挥所长的地方。
- 语言覆盖：英语 + 法语（原生）；西班牙语 / 德语 / 日语通过 Hibiki-Zero 适配（每种新语言需要 1000 h 音频）。
