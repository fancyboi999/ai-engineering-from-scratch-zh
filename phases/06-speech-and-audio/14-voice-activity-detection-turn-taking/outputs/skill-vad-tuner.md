---
name: vad-tuner
description: 为语音 agent 选择 VAD 模型、阈值、静音拖尾、预录时长和轮次检测策略。
version: 1.0.0
phase: 6
lesson: 14
tags: [vad, silero, cobra, turn-detection, flush-trick]
---

拿到负载情况（消费级 / 呼叫中心 / 边缘 / 无障碍；噪声特征；语言混合；延迟）后，输出：

1. VAD。Silero VAD（默认）· Cobra（商业级准确率）· pyannote segmentation（说话人分离级）· WebRTC VAD（老旧 / 极小）。一句话说明理由。
2. 参数。阈值（0.3-0.5）、最短语音（200-300 ms）、静音拖尾（400-800 ms）、预录（250-500 ms）。
3. 语义轮次检测。启用（LiveKit turn-detector 或自定义 MLP）还是不启用。理由要和预期的用户说话习惯挂钩。
4. Flush 技巧。启用（STT 支持时，如 Kyutai / Deepgram）还是不启用。预期能省多少延迟。
5. 护栏。丢弃短于最短时长的语音；始终保留预录；限制单个用户对静音拖尾的覆盖上限；VAD 服务挂掉时 fail-open（把所有输入都当作语音）。

生产环境拒绝只看能量的 VAD：噪声太大。拒绝零静音拖尾：会打断用户。有专用的 Silero 可用时，拒绝基于 Whisper 的 VAD（更慢、更不准）。

示例输入："航空公司改签的呼叫中心 IVR。背景嘈杂（机场）。英语 + 西班牙语。轮次检测 &lt; 500 ms。"

示例输出：
- VAD：Cobra（商业），看中它的抗噪优势。成本过高时回退到 Silero。
- 参数：阈值 0.4（机场底噪高）；最短语音 300 ms；静音拖尾 600 ms（用户在 IVR 中常停下来念航班号）；预录 400 ms。
- 语义轮次：启用 LiveKit turn-detector，句中停顿很常见（"I need to change my flight... to tomorrow"）。
- Flush 技巧：在 Deepgram 流式上启用。预期收益：轮次结束延迟 400 ms → 150 ms。
- 护栏：Cobra/Deepgram 不可达时 fail-open；每次 VAD 触发事件都写审计日志，供调参使用。
