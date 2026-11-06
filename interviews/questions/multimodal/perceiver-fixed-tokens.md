---
id: perceiver-fixed-tokens
title: 图像数量不限，每张图像输出固定数量的 token
card: multimodal
kind: concept
level: 2
roles: [applied-ai-engineer]
rounds: [ml-depth]
tags: [perceiver-resampler, gated-cross-attention, interleaved, few-shot]
minutes: 12
lessons: [phases/12-multimodal-ai/04-flamingo-gated-cross-attention, phases/12-multimodal-ai/03-blip2-qformer-bridge]
manuals: []
practice: []
cheatsheet: [vlm-architectures]
related: [multimodal/image-tokens-per-image]
updated: 2026-11-03
---

某个多模态模型必须能够接收包含任意数量图像（有些尺寸很小，有些尺寸很大）与文本相互交错的 prompt，并基于上下文中的几个少样本（few-shot）示例对最后一张图像生成描述。请解释是哪一个模块使得图像数量与尺寸变得完全可控，以及文本 token 是如何知道该关注哪一张图像的。

## Short answer

一个包含固定可学习隐向量集合的重采样器（Perceiver Resampler）将每张图像的 patch token 统一转换为固定数量的视觉 token。在参考架构中，无论视觉编码器输出了 196 个 patch（小图）还是 900 个 patch（大图），64 个隐变量都会通过 6 个交叉注意力与自注意力 block 将其聚合，每张图像最终都输出为统一通道维度的 64 个 token。随后，文本 token 通过插入在冻结语言模型层间的门控交叉注意力层读取这些视觉 token，并通过特定掩码保证每个文本 token 仅关注其在序列中前面最近的一张图像。

## Full answer

### 重采样器（Perceiver Resampler）的工作机制

每个 block 包含两步计算：首先，K 个可学习隐向量（Latents）与视觉编码器产出的 N 个 patch token 做交叉注意力聚合（Query 来自隐向量，Key 和 Value 来自图像 patch）；随后，这 K 个隐向量相互之间做自注意力计算并经过前馈网络。历经 6 个 block 之后，无论输入的 patch 数量 N 是多少，输出始终是 K 个通道维度为 1024 的视觉 token。对于视频数据，重采样器在每个单帧上分别运行并注入时间位置编码，因此视频片段的 token 总数就是帧数乘以 64。

### 为什么“固定数量”至关重要

交错图文 prompt 可能包含零张、一张或许多张图像。如果每张图像输出固定数量的 token，那么无论 prompt 如何复杂，任意一个文本 token 在交叉注意力中所面对的视觉特征矩阵在维度上都是严格对齐的。token 总数随图片数量增长，但单个文本 token 每次仅聚焦单一图像的特征隐变量。

### 门控交叉注意力桥接层

在冻结的大语言模型每隔 4 个 block 之间，插入一个带有残差门控的全新交叉注意力层：该层的输出等于语言模型原 block 的输出，加上双曲正切函数（tanh）作用于可学习标量后再乘以交叉注意力的计算结果。该标量初始化为 0，因此在训练刚开始时新插入的层完全不生效，模型整体严格等价于预训练纯文本语言模型。

### 掩码矩阵的作用

在形如“图像 A、描述 A、图像 B、描述 B、图像 C、问题”的交错序列中，文本 token 仅被允许关注其在序列中直接位于其之前的最近一张图像的重采样 token；序列中其余所有图像全部被注意力掩码遮蔽。允许关注其之前的所有图像是一种备选方案，但基准设计选用了关注最近一张图像的策略。

### 上下文少样本能力（In-Context Few-Shot）

三组“图片加描述”范例后紧跟一张新图片构成的 prompt，冻结的纯文本大模型凭借其固有的语言续写能力天然就能直接理解并完成少样本补全。门控交叉注意力层负责将各图像的内容注入上下文，而语言模型固有的 In-context 泛化能力在无需一步梯度更新的情况下沿用。这正是保持语言模型冻结并将门控标量初始化为零的核心价值。

### 对比输入层的单次桥接结构

早期基于 Query 的桥接方案（如 BLIP-2 Q-Former）同样使用可学习查询向量，但它仅在语言模型的第一层输入端执行一次（使用 32 个 query）。而重采样器搭配门控交叉注意力则是每隔若干层反复读取视觉隐变量，虽然增加了参数量与推理计算，却换取了处理任意交错图文以及少样本学习的强大泛化能力。

## Follow-ups

- **Level 2:** 为什么是由隐向量提供 Query、patch 提供 Key/Value，而不是反过来？ Expected: 注意力输出矩阵的行数由 Query 决定，由隐向量提供 Query 才能固定输出行数；若反过来，输出行数依然等于 patch 数量。
- **Level 2:** 时间位置编码对视频起到了什么作用？ Expected: 每一帧都生成相同的 64 个隐向量，若没有时间信号，模型将无法区分第一帧和最后一帧；时间编码显式标记了帧的时间序列索引。
- **Level 3:** 为什么将掩码限制在“最近一张图像”，而不是“之前的所有图像”？ Expected: 它保持了每个文本 token 看到的视觉矩阵形状严格恒定，且贴合交错图文阅读逻辑（描述往往紧随其所对应的图片）；关注之前所有图像是另一种不同取舍的备选方案。
- **Level 3:** 这类模型在微调后纯文本能力大幅下降，首先排查哪里？ Expected: 检查门控标量；若门控开启过快过大，视觉噪声会覆盖文本残差流，应逐层对比门控数值与初始基准的漂移。

## Wrong answers

- "把每张图像填充到相同的 patch 数量。" 填充在大图上浪费计算，在小图上丢失细节；重采样器能在避免这两者的同时输出固定数量的 token。
- "让文本 token 直接对所有原始图像 patch 做交叉注意力。" 这样每个文本 token 面对的视觉 token 数量就会随图片尺寸和张数剧烈波动，多图输入会淹没注意力；隐向量能将其固定。
- "将门控标量初始化为开启状态，以便模型学得更快。" 初始开启门控会瞬间破坏预训练语言模型原本精密的纯文本特征空间；从零初始化正是保护语言能力的基石。

## Taught in

[Flamingo 课程](../../../phases/12-multimodal-ai/04-flamingo-gated-cross-attention/)深入剖析了重采样器、门控层和交错图文掩码，[BLIP-2 课程](../../../phases/12-multimodal-ai/03-blip2-qformer-bridge/)给出了与之横向对比的输入端查询桥接层。
