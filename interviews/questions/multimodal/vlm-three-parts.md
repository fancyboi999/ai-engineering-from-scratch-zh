---
id: vlm-three-parts
title: 视觉语言模型的三个部分
card: multimodal
kind: concept
level: 1
roles: [applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [vlm, projector, vision-encoder, alignment]
minutes: 8
lessons: [phases/04-computer-vision/25-vision-language-models, phases/19-capstone-projects/60-projection-layer-modality-align, phases/12-multimodal-ai/05-llava-visual-instruction-tuning]
manuals: []
practice: []
cheatsheet: [vlm-architectures, vlm-from-scratch]
related: [multimodal/train-only-the-projector, multimodal/image-tokens-per-image]
updated: 2026-11-03
---

请画出用于回答图像相关提问的标准视觉语言模型（VLM）架构图。列出它的三个核心组成部分，说明各部分的技术贡献，并指出当某个团队在几千张打标图像上微调时，通常主要训练其中的哪一部分。

## Short answer

视觉编码器、投影层与大语言模型。视觉编码器（预训练 Vision Transformer）将输入图像切分并转化为 patch token。投影层（通常为 2 到 4 层的轻量 MLP 或基于查询的桥接层）将这些视觉 token 映射至大语言模型的嵌入向量空间，在此替换 prompt 中的图像占位符 token。解码器大语言模型将图像 token 与文本 token 作为一个整体混合序列读入并自回归生成答案；在绝大多数微调场景中，视觉编码器和语言模型保持冻结或仅挂载轻量适配器，训练主要发生在投影层。

## Full answer

### 三个部分

1. **视觉编码器（Vision Encoder）**：预训练的视觉 Transformer（通过对比学习或自监督预训练），为每个图像 patch 提取特征 token。在 336 像素输入与 14 像素 patch 下，基准模型产出 576 个通道维度为 1024 的 token。
2. **投影层（Projector）**：夹在中间的两层 MLP（层间带 GELU 激活），负责将特征从编码器维度映射到语言模型维度（参考模型为 1024 映射到 4096 再到 4096）。实战项目中的极简投影头（768 到 1024 到 512）仅占约 1.3M 参数量。
3. **大语言模型（Language Model）**：纯 Decoder 架构的大语言模型，接收替换了图像占位符后的视觉 token 以及随后的文本 token，自回归解码生成纯文本回复。

### 各模块在流水线中如何交汇

用户 prompt 中包含一个图像占位符 token。在执行前向传播前，该位置对应的嵌入向量被物理覆盖替换为经过投影层映射后的视觉 token 序列，并在批次内做填充对齐。大语言模型眼中看到的只是一段由连续向量构成的标准 token 序列，语言模型底座没有任何特殊处理。

### 训练阶段的角色分工

- **第一阶段（特征对齐）**：冻结视觉编码器和大语言模型，仅微调训练轻量投影层，使用图文对数据计算文本描述上的语言模型自回归损失。实战项目的极简对齐采用池化图像向量与文本向量间的余弦对齐损失，在单张卡上仅需 200 步就能驱动损失从约 1.07 降至约 0.80。
- **第二阶段（视觉指令微调）**：解冻大语言模型（通常借助适配器），维持投影层可训练，并在图像、问题、答案三元组上训练。
- 前沿工业团队在这两者之间还会插入大规模交错图文预训练，但对于算力有限的小团队通常难以企及。

### 为什么单训投影层就足够了

视觉编码器已经充分掌握了图像特征表征，大语言模型也早已具备了强大的文本逻辑推导。投影层唯一的职责就是在两大模态各自的向量空间之间搭起一座几何坐标变换桥梁，而这仅需对特征空间施加轻微的非线性扭曲即可完成。实战项目中 86M 的视觉编码器搭配约 1.3M 的投影层，在单张 GPU 上训练几百步。

## Follow-ups

- **Level 1:** 为什么投影层需要两层而非单层？ Expected: 单一线性层只能旋转和缩放；层间夹带 GELU 的双层结构能提供非线性流形弯曲，足以弥合对比视觉特征与自回归语言嵌入之间的表征间隙。
- **Level 2:** 在图像原本所在的占位符位置，大语言模型究竟看到了什么？ Expected: 一连串连续的稠密嵌入向量（每个对应一个经过投影的 patch token）；模型将它们作为普通 token 无差别处理。
- **Level 2:** 基于固定可学习 Query 的桥接层（如 Q-Former）改变了什么？ Expected: 它将任意数量的 patch token 强制压缩至固定的数量，极大节省了上下文空间，但带来了信息瓶颈；而 MLP 则完整透传每个 patch。
- **Level 3:** 三大部件中哪一部分决定了最终复杂多模态推理能力的上限？ Expected: 大语言模型；视觉编码器只负责提供输入事实，语言底座才负责推导思考，因此扩大语言模型参数量比改动桥接层更能拉动推理基准跑分。

## Wrong answers

- "大语言模型是通过跨模态交叉注意力直接去读取物理像素的。" 在这一经典主流范式中，图像被直接作为 token 拼接进输入序列；交叉注意力桥接属于 Flamingo 等完全不同的另一个流派。
- "微调时应该优先微调视觉编码器，因为它是负责看图的。" 视觉编码器在第一阶段严格冻结；对于几千张图的小规模微调，小团队的训练预算用在投影层上。
- "投影层必须做成超大网络才能承载整张图像的信息。" 实战项目中投影层是个仅 1.3M 参数的双层 MLP，远小于编码器，几分钟内即可完成训练。

## Taught in

[视觉语言模型基础课程](../../../phases/04-computer-vision/25-vision-language-models/)梳理了经典架构三部件与三阶段训练流，[模态对齐投影层实战](../../../phases/19-capstone-projects/60-projection-layer-modality-align/)演示了单训投影层，[LLaVA 课程](../../../phases/12-multimodal-ai/05-llava-visual-instruction-tuning/)提供了开源权威基准配方。
