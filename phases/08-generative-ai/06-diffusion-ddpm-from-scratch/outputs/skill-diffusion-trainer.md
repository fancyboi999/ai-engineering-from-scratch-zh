---
name: diffusion-trainer
description: 配置一次扩散模型训练：噪声调度、预测目标、采样器和评测方案。
version: 1.0.0
phase: 8
lesson: 06
tags: [diffusion, ddpm, training]
---

拿到数据集概况（模态、分辨率、数据集规模）、算力预算（GPU 小时数、显存下限）和质量门槛（FID 目标或下游用途）后，输出：

1. 调度。线性、余弦（Nichol）或 sigmoid。步数 T（DDPM 基线用 1000；更快的变体用 256）。
2. 预测目标。epsilon、v-prediction 或 x_0。理由要和分辨率及整个调度中的信噪比挂钩。
3. 架构。像素扩散用 U-Net（深度 + 通道宽度），潜在扩散用 DiT，视频用 3D U-Net / DiT。写明时间嵌入方案（正弦 + MLP、FiLM 或 AdaLN）。
4. 采样器。DDIM（20-50 步）、DPM-Solver++（10-20 步）、Euler-A（偏创意）或蒸馏后的 1-4 步采样。给出引导强度（CFG w）的建议。
5. 评测方案。FID / KID / CLIP-score / 人类偏好，写明样本数（FID 要 >=10k），以及 CFG w 的扫描方案。

潜在扩散能用 1/16 的 FLOPs 达到同样质量时，拒绝推荐在 &gt;=256x256 分辨率上训练像素空间扩散。条件生成不带 CFG 就拒绝上线：条件模型直接零样本无条件采样，结果通常是退化的。beta_T &gt; 0.1 的调度标记出来：很可能导致饱和或训练不稳定。
