# 语音 Agent：Pipecat 与 LiveKit

> 语音 agent 在 2026 年是一等的生产类别。Pipecat 给你一条 Python 的、基于帧的流水线（VAD → STT → LLM → TTS → 传输）。LiveKit Agents 通过 WebRTC 把 AI 模型桥接给用户。高端技术栈的生产延迟目标落在端到端 450–600ms。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 12（工作流模式）
**预计时间：** ~60 分钟

## 学习目标

- 描述 Pipecat 基于帧的流水线：DOWNSTREAM（源→汇）和 UPSTREAM（控制）。
- 说出标准语音流水线的各个阶段，以及 Pipecat 支持哪些传输。
- 解释 LiveKit Agents 的两种语音 agent 类（MultimodalAgent、VoicePipelineAgent）以及各自何时合适。
- 总结 2026 年的生产延迟预期，以及它们如何驱动架构选择。

## 问题背景

语音 agent 不是一个文本循环硬加上 TTS。延迟预算很残酷（~600ms），部分音频是默认情况，回合检测是个模型，传输从电话 SIP 到 WebRTC 都有。要么你构建一条基于帧的流水线（Pipecat），要么你倚靠一个平台（LiveKit）。

## 核心概念

### Pipecat（pipecat-ai/pipecat）

- Python 的基于帧的流水线框架。
- `Frame` → `FrameProcessor` 链。
- 两个流动方向：
  - **DOWNSTREAM** —— 源 → 汇（音频进，TTS 出）。
  - **UPSTREAM** —— 反馈与控制（取消、指标、插话）。
- `PipelineTask` 用事件（`on_pipeline_started`、`on_pipeline_finished`、`on_idle_timeout`）和用于指标/tracing/RTVI 的观察者来管理生命周期。

典型流水线：

```
VAD (Silero) → STT → LLM (context alternates user/assistant) → TTS → transport
```

传输：Daily、LiveKit、SmallWebRTCTransport、FastAPI WebSocket、WhatsApp。

Pipecat Flows 加了结构化对话（状态机）。Pipecat Cloud 是托管运行时。

### LiveKit Agents（livekit/agents）

- 通过 WebRTC 把 AI 模型桥接给用户。
- 关键概念：`Agent`、`AgentSession`、`entrypoint`、`AgentServer`。
- 两种语音 agent 类：
  - **MultimodalAgent** —— 通过 OpenAI Realtime 或等价物的直接音频。
  - **VoicePipelineAgent** —— STT → LLM → TTS 级联；给你文本级控制。
- 通过一个 transformer 模型做语义回合检测。
- 原生 MCP 集成。
- 通过 SIP 做电话。
- 通过 LiveKit Inference 无需 API key 的 50+ 模型；通过插件再加 200+。

### 商业平台

Vapi（在一个优化过的高端技术栈上约 450–600ms）和 Retell（180 通测试呼叫中端到端约 600ms）建在这些之上。当你想要一个托管语音栈、又不想要一支 WebRTC 团队时，挑一个平台。

### 这个模式在哪里会出错

- **没处理插话。** 用户打断；agent 还在说。在 Pipecat 里需要 UPSTREAM 取消帧，LiveKit 里有等价物。
- **忽略 STT 置信度。** 把低置信度的转录当圣旨喂给 LLM。按置信度设关卡或请求确认。
- **TTS 句中截断。** 当流水线在话语中途取消时，TTS 需要知道或者切掉音频。
- **忽略延迟预算。** 每个组件加 50–200ms。上线前把你的链路加总。

### 2026 年典型延迟

- VAD：20–60ms
- STT 部分结果：100–250ms
- LLM 首 token：150–400ms
- TTS 首段音频：100–200ms
- 传输 RTT：30–80ms

端到端 450–600ms 算高端。800–1200ms 很常见。任何 > 1500ms 都感觉坏了。

```figure
voice-pipeline
```

## 动手构建

`code/main.py` 是一条基于帧的玩具流水线，带：

- `Frame` 类型（audio、transcript、text、tts_audio、control）。
- 带 `process(frame)` 的 `Processor` 接口。
- 一条五阶段流水线（VAD → STT → LLM → TTS → 传输），用脚本化的 processor。
- 一个 UPSTREAM 取消帧来演示插话。

运行它：

```
python3 code/main.py
```

轨迹展示正常流程，以及一次在话语中途停掉 TTS 的插话取消。

## 实际使用

- **Pipecat** 用于完全控制 —— 自定义 processor、Python 优先、可插拔提供方。
- **LiveKit Agents** 用于 WebRTC 优先的部署和电话。
- **Vapi / Retell** 用于不要 WebRTC 团队的托管语音 agent。
- **OpenAI Realtime / Gemini Live** 用于直接音频进/音频出（MultimodalAgent）。

## 拿去用

`outputs/skill-voice-pipeline.md` 脚手架出一条 Pipecat 形态的语音流水线，带 VAD + STT + LLM + TTS + 传输外加插话处理。

## 练习

1. 给你的玩具流水线加一个指标观察者：统计每阶段每秒的帧数。延迟在哪里累积？
2. 实现置信度设关卡的 STT：低于阈值时请求「能再说一遍吗？」
3. 加语义回合检测：简单规则 —— 如果转录以「?」结尾，就是回合结束。
4. 读 Pipecat 的传输文档。把标准库传输换成 SmallWebRTCTransport 配置（桩）。
5. 在同一个查询上度量 OpenAI Realtime vs STT+LLM+TTS 级联。文本级控制带来多少延迟成本？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Frame | 「事件」 | 流水线里带类型的数据单元（音频、转录、文本、控制） |
| Processor | 「流水线阶段」 | 带 process(frame) 的处理器 |
| DOWNSTREAM | 「前向流」 | 源到汇：音频进，语音出 |
| UPSTREAM | 「反馈流」 | 控制：取消、指标、插话 |
| VAD | 「语音活动检测」 | 检测用户何时在说话 |
| Semantic turn detection | 「智能回合结束」 | 基于模型判断用户说完了 |
| MultimodalAgent | 「直接音频 agent」 | 音频进，音频出；中间没有文本 |
| VoicePipelineAgent | 「级联 agent」 | STT + LLM + TTS；文本级控制 |

## 延伸阅读

- [Pipecat docs](https://docs.pipecat.ai/getting-started/introduction) —— 基于帧的流水线、processor、传输
- [LiveKit Agents docs](https://docs.livekit.io/agents/) —— WebRTC + 语音原语
- [Vapi](https://vapi.ai/) —— 托管语音平台
- [Retell AI](https://www.retellai.com/) —— 托管语音，做过延迟基准测试
