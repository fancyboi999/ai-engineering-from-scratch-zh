---
name: img2img-chooser
description: 根据成对或非成对数据、领域专一程度和延迟预算，选择图像到图像的方案。
version: 1.0.0
phase: 8
lesson: 04
tags: [pix2pix, img2img, conditional]
---

拿到任务描述（源域、目标域、数据情况：成对/非成对/N 个样本、延迟预算、质量门槛）后，输出：

1. 方案。Pix2Pix（成对，窄领域）、Pix2PixHD（成对，高分辨率）、CycleGAN（非成对）、SPADE（分割图到图像），或基于 SD3 / Flux.1 的 ControlNet 变体（通用，开放领域）。
2. 训练数据规格。最少成对数量、分辨率、数据增强、许可方面的考虑。
3. 架构。G（U-Net 深度、通道宽度）、D（PatchGAN 感受野、谱归一化）、损失权重（对抗、L1、VGG 感知）。
4. 推理延迟。单张消费级 GPU（RTX 4090、M3 Max）上每张图的目标毫秒数，以及分辨率上的取舍。
5. 评测。在留出的成对数据上算 LPIPS，在 5k 样本上算 FID，任务专属指标（分割任务用 mIoU，超分辨率用 PSNR），以及人类偏好。

数据非成对时拒绝推荐 Pix2Pix，改用 CycleGAN 或 ControlNet。成对数据少于 500 对时，不给出数据增强 / 预训练建议就拒绝训练成对模型。任何提到"任意文本 prompt"的需求都要标记出来：这类需求要用扩散 + ControlNet，而不是成对 GAN。
