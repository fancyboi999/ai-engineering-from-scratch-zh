---
id: emu3-generation-cost
title: 单张生成图像在离散编码与耗时上的成本估算
card: multimodal
kind: estimate
level: 2
roles: [applied-ai-engineer, inference-engineer]
rounds: [screen, system-design]
tags: [emu3, tokens, latency, image-generation, video]
minutes: 10
lessons: [phases/12-multimodal-ai/12-emu3-next-token-for-generation, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified, phases/12-multimodal-ai/11-chameleon-early-fusion-tokens]
manuals: []
practice: []
cheatsheet: [unified-multimodal, image-generation-compared]
related: [multimodal/early-or-late-fusion]
updated: 2026-11-03
---

某个统一的 Next-token 预测模型将 512 × 512 的图像生成为一段离散编码序列。请在典型解码速度下估算生成单张图像需要多长时间，并与扩散模型对比，再计算一段低分辨率 4 秒视频片段在编码数量上的成本。最后，指出哪些工程与算法杠杆可以改变这一计算结果。

## Short answer

参考模型的分词器将 8 × 8 像素压缩为一个代码，因此 512 × 512 的图像包含 4,096 个编码；在约每秒 30 个编码的典型自回归解码速度下，单张图片耗时约 2 分钟，而同等画质梯队的扩散模型只需 2 到 5 秒。一段 8 帧/秒的 4 秒视频片段包含 32 帧；在相同的 8 倍空间压缩与 4 帧时间压缩下，256 × 256 分辨率的片段包含 32 × 32 × 8 即 8,192 个编码。可调节的杠杆包括：改变单图的编码密度、通过推测解码或 KV cache 提升解码速度，以及改用掩码并行解码等新方案（每张图像约需 16 次前向计算，而非每个编码一次）。

## Full answer

### 图像生成的数学计算

```text
512 / 8 = 64 codes per side
64 x 64 = 4096 codes per image
4096 codes at about 30 per second = about 2 minutes
```

扩散模型在连续潜空间中通常只需几十步采样即可出图，耗时在 2 到 5 秒之间。自回归图像生成在架构设计上就是计算密集的：每一个代码都需要执行一次完整的 Transformer 前向传播。

### 视频生成的数学计算

视频分词器是三维时空架构：单个代码覆盖 4 帧 × 8 像素 × 8 像素的体积块。

```text
frames: 4 s x 8 per second = 32
codes: (256 / 8) x (256 / 8) x (32 / 4) = 32 x 32 x 8 = 8,192
```

### 为什么该模型甘愿付出这一高昂代价

相同的网络权重通过单一的 Next-token 损失函数同时搞定图像生成、图像理解以及视频建模，无需扩散调度和独立的文本编码器。分词器的质量决定了能力天花板：参考论文报告其重构质量达到 30.5 dB（连续潜空间约为 32 dB），编码数量是早期方案的 4 倍，码本容量也是早期方案的 4 倍。

### 推理阶段的调节杠杆

- **无分类器引导（Classifier-Free Guidance, CFG）**：在有图像描述条件和无该条件时分别生成并按权重（通常为 3.0 到 7.0）融合 logits；这使得每个编码的前向 pass 次数直接翻倍。
- **采样温度（Temperature）**：参考配方中图像生成采用 0.8，多模态理解采用 1.0。
- **推测解码与 KV cache**：能有效缩小与扩散模型的吞吐差距，但仍不能消除差距。

### 替代性解码范式：掩码并行解码

掩码并行解码（Masked Parallel Decoding）虽然仍采用离散编码，但它在单步中并发预测所有被掩蔽的位置并择优保留高置信度编码，生成单张图像仅需约 16 次 pass，而连续扩散约为 20 次，纯自回归 Next-token 方案则需要数千次 pass。

## Follow-ups

- **Level 2:** 为什么 CFG 引导会让生成成本翻倍？ Expected: 每个自回归步骤都需要分别做一次有条件前向和一次无条件前向计算，然后加权融合两者的 logits。
- **Level 2:** 当图像分辨率提升至 1024 × 1024 时，单张生成耗时会发生什么变化？ Expected: 在相同压缩比下编码数量增加到 4 倍，因此解码耗时大致变为原来的 4 倍；课程练习要求精确核算该编码数。
- **Level 3:** 该模型的画质上限取决于什么，它是如何从初代共享词表模型提升上来的？ Expected: 取决于离散分词器的重构质量；通过将单图编码数提升至 4 倍并将码本容量扩大 4 倍，将重构 PSNR 提升到了 30.5 dB。
- **Level 3:** 在什么场景下你依然会放弃扩散模型而选择这种自回归方案？ Expected: 当需要用单一损失和单一模型同时统一图像、视频与文本的理解与生成，且业务场景允许分钟级延迟或批处理流水线时。

## Wrong answers

- "一张图像只有几百个 token，就像 VLM 的视觉输入一样。" 那是用于多模态理解的降采样投影 token；离散图像生成必须匹配分词器的物理重构密度，在该尺寸下为 4,096 个编码。
- "扩散模型更慢，因为它是多次迭代出来的。" 扩散模型是对整张画面的所有像素同时迭代数十次；而纯自回归是逐个代码串行推进，单图需要数千次前向。
- "扩大码本尺寸可以加速图像生成。" 扩大码本提高的是重构图像的画质保真度；生成的 pass 次数完全由编码总数决定，与码本条目数无关。

## Taught in

[Emu3 课程](../../../phases/12-multimodal-ai/12-emu3-next-token-for-generation/)统计了图像和视频的编码数量并给出了推理成本，[Show-o 课程](../../../phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/)对比了三种解码范式的前向 pass 次数。
