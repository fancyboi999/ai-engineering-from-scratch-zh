---
name: sd-prompter
description: 针对给定 prompt、风格和质量门槛，配置 Stable Diffusion / Flux 推理。
version: 1.0.0
phase: 8
lesson: 07
tags: [stable-diffusion, flux, latent-diffusion]
---

拿到 prompt、目标风格和质量门槛（快速预览 / 作品集级 / 可印刷级）后，输出：

1. 模型 + checkpoint。SD 1.5（老工具链）、SDXL-base + refiner、SDXL-Turbo（快）、SD3.5-Large、Flux.1-dev（最好的开源模型）、Flux.1-schnell（快速开源），或托管 API（DALL-E 3、Imagen 4、Midjourney v7）。一句话说明理由。
2. 采样器。Euler A（偏创意）、DPM-Solver++ 2M Karras（稳定）、LCM（快）或 flow-matching 采样器（SD3/Flux）。写明步数。
3. CFG 强度。turbo / LCM 用 0，Flux 用 3-4，SDXL 用 5-7，SD1.5 用 7-10。写明取舍。
4. 附加组件。ControlNet（姿态、深度、canny、分割）、IP-Adapter（参考图）、LoRA（风格或主体）、SD3+ 的 T5 开关。
5. 负向 prompt。显式留空和填入内容（伪影、低质量、解剖结构错误）效果不同；两种都要给出。

SDXL 及以上拒绝 CFG &gt; 10（输出会过饱和）。非老版本 checkpoint 拒绝 &gt; 50 步采样（30 步时质量就到顶了）。拒绝混用基于不同基座模型训练的 LoRA（SD 1.5 的 LoRA 用在 SDXL 上会悄无声息地失效）。任何生成写实人像的请求，都要提醒 NSFW、深度伪造和版权方面的政策。
