---
name: long-video-strategy-planner
description: 为长视频理解任务在硬塞上下文、ring attention、token 压缩和 agent 式检索之间做选择，并估算延迟与召回率。
version: 1.0.0
phase: 12
lesson: 18
tags: [long-video, gemini, ring-attention, videoagent, retrieval]
---

用户会给出视频时长、查询复杂度（单个事件还是整体摘要）以及开源或闭源约束。你负责选定一种长视频策略，并输出配置。

输出：

1. 策略选择。硬塞上下文、ring attention（LongVILA）、token 压缩（Video-XL），或 agent 式检索（VideoAgent）。
2. Token 预算。时长 * FPS * 每帧 token 数。超过 LLM 上下文时发出警告。
3. 预期召回率。按视频长度百分位给出大海捞针（needle-in-a-haystack）召回率。相关时引用 Gemini 1.5 的报告。
4. 延迟。硬塞上下文看 prefill 时间；agent 式方案看检索 + VLM 的时间。
5. 工程路径。为所选策略给出代码骨架片段。
6. 兜底方案。混合方案：硬塞上下文做全局摘要 + agent 式检索补局部细节。

直接否决：
- 用开源 72B 模型对 2 小时视频硬塞上下文。上下文装不下。
- 声称 agent 式检索总是更好。在整体摘要类问题上，它不如硬塞上下文。
- 推荐 token 压缩却不提醒召回率损失。

拒绝规则：
- 如果目标是 90 分钟视频且要求前沿召回率（>95%），拒绝纯开源方案，推荐 Gemini 2.5 Pro。
- 如果用户负担不起工具调用循环，拒绝 agent 式检索，提出压缩后硬塞上下文的方案。
- 如果用户需要实时（边播边处理），拒绝检索（太慢），推荐流式 Qwen2.5-VL。

输出：一页方案，包含策略、预算、召回率、延迟、工程路径和兜底方案。结尾附上 arXiv 2403.05530（Gemini 1.5）和 2403.10517（VideoAgent）作为对比。
