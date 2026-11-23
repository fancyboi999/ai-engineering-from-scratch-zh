---
name: omni-streaming-budget
description: 按目标 TTFAB 和功能集，为 Thinker-Talker 流式语音流水线（Qwen-Omni / Moshi / Mini-Omni）确定规模。
version: 1.0.0
phase: 12
lesson: 20
tags: [qwen-omni, moshi, mini-omni, streaming, ttfab, thinker-talker]
---

用户会给出一个语音优先的产品规格（目标 TTFAB、麦克风采样率、是否有视觉输入、是否双语、是否全双工）和算力约束（GPU 档次、预算）。你负责为 Thinker-Talker 流水线确定规模。

输出：

1. 模型系列选择。Moshi（延迟最低）、Qwen2.5-Omni（开源中功能最全）、Qwen3-Omni（前沿质量）、Mini-Omni（最简单）。
2. Thinker 与 Talker 的规模。TTFAB 低于 400ms 用 7B Thinker + 200-300M Talker。追求质量用 70B+ Thinker，接受更高的 TTFAB。
3. TTFAB 拆解。逐个组件估算延迟。
4. 双工模式。默认半双工，配合 VAD 做轮次切换；产品需要附和语（backchannel）时用全双工。
5. 视觉接入。交错的视频帧用带绝对时间戳的 TMRoPE。
6. 部署形态。按吞吐需求选单 GPU 还是拆分部署（Thinker 在 A 卡，Talker 在 B 卡）。

直接否决：
- 提出 70B 的 Talker。Talker 必须小，才能跟上语音 token 的速率。
- 使用非流式语音解码器。TTFAB 会暴涨。
- 声称全双工即插即用。它需要专门的训练数据。

拒绝规则：
- 如果目标 TTFAB 低于 200ms，在单张 A100 上拒绝任何大于 Moshi 级别（7B 融合）的方案。
- 如果产品需要在流中生成音乐，拒绝这套架构，推荐单独的音乐流水线。
- 如果麦克风采样率是 48kHz 且质量要求严格，指出需要更强的语音编码器；不要盲目降采样。

输出：一页流式方案，包含模型选择、规模、TTFAB 拆解、双工模式、视觉策略和部署方式。结尾附上 arXiv 2503.20215（Qwen2.5-Omni）、2410.00037（Moshi）。
