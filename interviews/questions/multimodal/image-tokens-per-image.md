---
id: image-tokens-per-image
title: 单张图像占用多少上下文 token
card: multimodal
kind: estimate
level: 1
roles: [applied-ai-engineer, inference-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [visual-tokens, context-budget, anyres, q-former]
minutes: 8
lessons: [phases/12-multimodal-ai/05-llava-visual-instruction-tuning, phases/12-multimodal-ai/03-blip2-qformer-bridge, phases/12-multimodal-ai/07-open-weight-vlm-recipes]
manuals: []
practice: []
cheatsheet: [vlm-architectures, vlm-model-families]
related: [multimodal/vlm-three-parts]
updated: 2026-11-03
---

一位产品经理询问，在配备 336 像素视觉编码器的 LLaVA 架构模型中，一张图片需要占用多大的上下文窗口。请给出具体的数值，解释该数值的来源，并说明在高分辨率切片（AnyRes tiling）或基于查询向量的桥接层（Query-based bridge）下该数值会如何变化。

## Short answer

单张图像消耗 576 个 token：编码器将 336 像素的输入图像切分为 14 像素的 patch，构成 24 × 24 的网格，投影层将每个 patch 对应的 token 原样送入语言模型。在 2,048 的上下文窗口中，这将为文本留下 1,472 个 token 的空间；而在 32k 或 128k 窗口中其占比微不足道。切片切块机制会让 token 数量成倍增加：2 × 2 宫格切片加上 1 张全局缩略图共产生约 2,880 个 token；而 1 × 3 宫格切片加上缩略图产生的数量更少，因为少了一个切片。基于查询向量的桥接层（如 Q-Former）可将任意图片强制压缩至固定 32 个 token，而重采样器（Perceiver Resampler）则通常压缩至 64 个 token。

## Full answer

### Token 数量的推导过程

```text
336 / 14 = 24 patches per side
24 x 24 = 576 patch tokens
each token: 1024 wide from the encoder, 4096 wide after the projector
```

更早期的 224 像素编码器产生 256 个 token。升级至 336 像素后 token 数量升至 576 个，而当时的训练序列长度基准依然保持在 2,048 个 token。

### 上下文预算占比

| 上下文窗口大小 | 单张图像的开销与影响 |
|---|---|
| 2048 | 占用 576 个 token，剩余 1472 个 token 供文本使用 |
| 32k | 仅占极小的一部分比例 |
| 128k | 几乎可以忽略不计 |

### 面向高分辨率的切片机制（AnyRes Tiling）

高密度文档与复杂图表需要更多物理像素。动态切片方案将原图拆分为 2 × 2 或 1 × 3 的 336 像素局部切块，外加一张低分辨率全局缩略图，并将所有切块的视觉 token 串联起来：对于 2 × 2 网格，单图约产生 2,880 个视觉 token；而 1 × 3 网格少了一个切片，产生的 token 相应更少。文档 OCR 与图表理解分数随之迎来显著提升。

### 压缩型桥接层架构

基于 Query 的桥接层用固定集合的 32 个可学习查询向量与图像 patch token 做交叉注意力，将任意分辨率的图像统一压缩为固定 32 个 token。包含 64 个隐变量的重采样器（Perceiver Resampler）则固定产出 64 个 token。代价是形成了信息瓶颈：语言模型永远无法看到原始底层的细粒度 patch。

### 业务到底需要多少视觉 Token

训练配方课程的消融实验表明，大多数任务的合适范围是单图 576 到 1,024 个视觉 token；64 个 token 不足以读文字；2,048 个及以上只对文档和图表有用。实测表明，视觉 token 数量对基准跑分方差的解释力远超连接器本身的架构差异。

## Follow-ups

- **Level 1:** 为什么提高输入图像分辨率会直接拉高视觉 Token 数量？ Expected: Patch 物理尺寸是固定的，单边像素越多意味着单边 patch 越多，token 总数随单边长度的平方呈二次方增长。
- **Level 2:** 哪些业务任务能证明为高分辨率切片付出昂贵 token 开销是值得的？ Expected: 图像中的密集文本阅读、信息图表与扫描文档；一般的场景问答从中获益很少。
- **Level 2:** 32-token 的压缩型桥接层在什么时候最具优势？ Expected: 当上下文预算极度吃紧时，例如长视频理解或单次 prompt 包含大量图片的场景；对于长上下文下仅处理单张图片的任务，这种压缩收益不大。
- **Level 3:** 如何为视频任务规划视觉 Token 预算？ Expected: 单帧 token 数乘以抽样帧数；因此只有使用压缩型桥接层或大幅降低抽帧率才能塞进数分钟的视频，在选型连接器之前必须先算清 token 账。

## Wrong answers

- "一张图像只占用一个 token，即占位符。" 占位符只是个记号，在真正前向计算前会被展开替换为几百个 patch 嵌入向量；数量完全由视觉编码器的网格决定。
- "提高输入分辨率是免费的，因为视觉编码器结构固定。" 更多 patch 意味着送进大语言模型的视觉 token 更多，语言模型自注意力计算量随之激增。
- "连接器决定质量，所以应该先选桥接层。" 在固定 token 数量下不同连接器性能几乎持平；视觉 token 数量和编码器本身的表征能力重要得多。

## Taught in

[LLaVA 课程](../../../phases/12-multimodal-ai/05-llava-visual-instruction-tuning/)精确计算了单图与切片图像的 token 数量，[BLIP-2 课程](../../../phases/12-multimodal-ai/03-blip2-qformer-bridge/)详解了固定数量的桥接层，而[开源训练配方课程](../../../phases/12-multimodal-ai/07-open-weight-vlm-recipes/)给出了视觉 token 预算的消融实验。
