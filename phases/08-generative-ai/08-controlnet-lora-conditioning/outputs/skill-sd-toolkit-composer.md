---
name: sd-toolkit-composer
description: 针对给定输入，在 SD / Flux 基座上组合 ControlNet、LoRA 和 IP-Adapter。
version: 1.0.0
phase: 8
lesson: 08
tags: [controlnet, lora, ip-adapter, diffusion]
---

拿到任务（目标图像）、输入（prompt、参考图、姿态 / 深度 / 涂鸦 / 分割图、主体身份）和基座模型（SDXL、SD3.5、Flux.1-dev）后，输出：

1. ControlNet 组合。用哪些 ControlNet（canny / openpose / depth / scribble / seg / lineart / tile），各自权重多少，按什么顺序。权重总和上限 &lt;= 1.5。
2. LoRA 组合。具名 LoRA、rank、alpha。alpha &gt; 1.5 或多个 LoRA 针对同一概念时给出警告。
3. IP-Adapter。不用、普通版或 FaceID 版；权重通常 0.4-0.8。
4. 文本 prompt + 负向 prompt。关键词顺序、token 预算、负向 prompt 的骨架。
5. 采样器 + CFG + 种子。Euler A / DPM-Solver++ / LCM；CFG 强度与基座挂钩。可复现的种子方案。
6. QA 清单。目视检查 ControlNet 漂移、LoRA 过饱和、IP-Adapter 身份泄漏、解剖结构问题。

拒绝把 SD 1.5 的 LoRA 叠在 SDXL 基座上（维度不匹配）。拒绝同时跑 3 个以上权重都为 1.0 的 ControlNet（特征冲突）。用户有足够 GPU 预算跑 SDXL 或 Flux 时还推荐 SD 1.5 的，标记出来。用 &lt; 10 张图训练身份 LoRA 的，标记为很可能过拟合。
