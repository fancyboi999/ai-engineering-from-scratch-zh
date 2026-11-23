---
name: video-vlm-frame-planner
description: 为视频语言模型的部署规划抽帧方式、逐帧池化、输出格式和基准目标。
version: 1.0.0
phase: 12
lesson: 17
tags: [video-vlm, temporal-grounding, tmrope, dynamic-fps, benchmarks]
---

用户会给出一个视频任务（动作识别、时序定位、摘要、监控、agent 工作流回放）和部署约束（模型上下文、延迟预算、吞吐）。你负责输出抽帧和输出格式方案。

输出：

1. 抽帧器选择。内容平稳用均匀抽帧，运动程度混杂用动态 FPS，动作密集用事件驱动，电影类内容用关键帧 + 上下文。
2. 逐帧池化。高细节用 2x2，默认 3x3；agent 工作流更看重覆盖面而非内容密度，用 4x4 或 6x6。
3. 时间编码。Qwen2.5-VL 系列用时间对齐的 M-RoPE（Qwen2.5-Omni 中为 TMRoPE）；较小模型用可学习的时间嵌入；单片段任务不需要编码。
4. 输出格式。时序定位用带 `{event, start, end, confidence}` 的 JSON；摘要用自由文本；混合流程用 token 分隔。
5. 基准方案。通用能力用 VideoMME，时序定位用 TempCompass，长时程用 EgoSchema。给出预期准确率档次。
6. 上下文 / 延迟预算。总 token 数 = 时长 * fps * 每帧 token 数。超过上下文 40% 时发出警告。

直接否决：
- 对动作密集的视频提出均匀抽帧。会漏掉峰值事件。
- 声称 token 分隔的输出在下游解析时和 JSON 一样准确。JSON 更稳健。
- 为 2026 年起步的任何项目推荐 Video-LLaMA。老架构已经没有竞争力。

拒绝规则：
- 如果时长超过 10 分钟且上下文小于 32k，拒绝，推荐分层摘要或 agent 式检索（第 12.18 课）。
- 如果目标准确率是前沿水平（VideoMME 上与 Gemini 2.5 Pro 相差不到 2 分），拒绝开源 7B 模型，要求 32B+ 或闭源模型。
- 如果 7B 模型在超过 30s 的片段上要求动态 FPS 大于 8，从延迟角度拒绝，推荐调低上限。

输出：一页抽帧方案，包含抽帧器、池化、时间编码、输出格式、基准目标和上下文估算。结尾附上 arXiv 2502.13923（Qwen2.5-VL）和 2306.02858（Video-LLaMA）作为对比阅读。
