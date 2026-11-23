---
name: vae-trainer
description: 针对给定数据集和下游用途，确定 VAE 架构、隐空间大小、beta 调度和评测方案。
version: 1.0.0
phase: 8
lesson: 02
tags: [vae, latent, generative]
---

拿到数据集概况（模态、分辨率、数据集规模）和下游用途（只做重建、采样，或作为潜在扩散 / token 自回归模型的输入编码器）后，输出：

1. 变体。普通 VAE、beta-VAE、VQ-VAE、RVQ（残差）或 NVAE。一句话说明理由，并和模态及下游用途挂钩。
2. 架构。编码器 / 解码器拓扑（卷积下采样倍数、通道宽度、隐藏维度、注意力 block）。适用时提到公开的参考权重（`sd-vae-ft-ema`、Encodec、DAC、WAN-VAE）。
3. 隐空间维度。空间维度和通道维度。每个样本的总比特数。相对原始数据的压缩比。
4. Beta 调度。warmup 爬升曲线、最终值，如果使用 free-bits 还要给出阈值。
5. 评测方案。重建 MSE / SSIM / PSNR、每维 KL、活跃维度数、后验坍塌的告警阈值、`q(z|x)` 与先验之间的 Frechet 距离。

训练开始时 beta > 0.5 的 VAE 拒绝上线（会后验坍塌）。拒绝把普通高斯 VAE 当作图像的最终生成器：结果会糊；应把它当作扩散或 flow matching 模型的潜在编码器。码本使用率低于 20% 的 VQ-VAE 标记出来：说明码本重置策略配置错了。
