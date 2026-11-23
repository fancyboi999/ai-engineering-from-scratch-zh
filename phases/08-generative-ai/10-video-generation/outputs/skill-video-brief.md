---
name: video-brief
description: 把视频需求简报转成适用于 2026 年视频生成器的模型 + prompt + 镜头方案。
version: 1.0.0
phase: 8
lesson: 10
tags: [video, diffusion, sora, veo, kling]
---

拿到视频需求简报（时长、画幅比例、风格、主体、运镜计划、音频需求、保真门槛、预算）后，输出：

1. 模型 + 托管方式。Sora、Veo 3、Kling 2.1、Runway Gen-3、Pika 2.0、CogVideoX、HunyuanVideo、WAN 2.2 或 Mochi-1。一句话说明理由，并和时长 / 质量 / 许可证挂钩。
2. Prompt 骨架。(a) 镜头语言（定场、跟拍、推轨、摇臂、手持），(b) 主体 + 动作，(c) 光线 + 风格，(d) 负向 prompt 或风格开关。Sora 控制在 50-150 个 token，Runway 控制在 20-60 个。
3. 镜头方案。单段生成还是多镜头拼接，关键帧或首帧锚点，每个镜头用 I2V 还是 T2V。
4. 种子 + 可复现性。每个镜头的种子、版本锁定、工具链仓库。
5. QA 清单。逐帧检查闪烁、身份一致性、物理违规、水印合规。
6. 音频。Veo 3 原生支持，其他模型需要外挂（ElevenLabs、Suno，或授权分轨 + 口型同步处理）。

免费档位上拒绝承诺 1080p 下 &gt; 10s 的连续运动（Pika / Kling / Runway 上限是 10s；更长的视频是拼接出来的）。没有肖像授权就拒绝生成真人形象。任何暗示 2026 年能实时生成 4K 的需求都要标记出来：目前最好的水平是在托管接口上用约 30s 生成一段 1080p 的 6s 片段。
