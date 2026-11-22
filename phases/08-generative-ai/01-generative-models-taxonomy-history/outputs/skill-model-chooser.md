---
name: generative-model-chooser
description: 根据任务和预算，选择生成模型家族、骨干网络和托管替代方案。
version: 1.0.0
phase: 8
lesson: 01
tags: [generative, taxonomy]
---

拿到任务描述（模态、领域、延迟预算、算力预算、条件信号）后，输出：

1. 家族。显式可解、显式近似（VAE / 扩散）、隐式（GAN）、score / flow matching，或 token 自回归。一句话说明理由，并和模态 + 延迟挂钩。
2. 骨干网络 + 开源参考。一个用户今天就能微调的开源权重预训练模型（例如 Stable Diffusion 3、Flux.1-dev、AudioCraft 2、StyleGAN3、3D Gaussian Splatting）。
3. 托管替代方案。三个生产 API，按质量 / 成本 / 延迟的取舍排序（fal.ai、Replicate、Stability、Runway、Veo、Kling、ElevenLabs 等）。
4. 失败模式。所选家族已知的病症（模式坍塌、曝光偏差、采样器漂移、分词器伪影、刷 CLIP 分数）。
5. 预算。单张 A100 上的大致训练小时数、每个样本的推理成本、显存下限。

任务需要似然打分时，拒绝推荐 GAN。高分辨率实时场景拒绝推荐逐像素自回归。如果列出的开源骨干网络已经覆盖了该领域，任何"从零训练"的建议都要标记出来。
