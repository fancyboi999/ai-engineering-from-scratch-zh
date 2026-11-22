---
name: vit-configurator
description: 为新的视觉任务选择 ViT 变体、patch 大小和预训练来源。
version: 1.0.0
phase: 7
lesson: 9
tags: [transformers, vit, vision]
---

拿到视觉任务（分类 / 分割 / 检测 / 检索）、图像分辨率、数据集规模（有标注 + 无标注）和部署目标后，输出：

1. 骨干网络。从以下选一个：DINOv2 ViT-L/14（检索/分类的默认选择）、SAM 3 编码器（分割）、SigLIP（视觉-语言）、ConvNeXt（延迟敏感）。一句话说明理由。
2. Patch 大小。224 分辨率的标准分类用 16，DINOv2 用 14，高分辨率稠密预测用 8。写出序列长度 `(H/P)^2 + 1` 和注意力开销 `O(N^2)`。
3. 预训练来源。checkpoint 名。小标注集（<10k）：冻结 DINOv2 特征 + 线性探针。>100k：微调最后几个 block。说明原因。
4. 训练配方。优化器（AdamW）、lr、数据增强（RandAug、MixUp、Random Erasing）、标签平滑（通常 0.1）、EMA。
5. 风险提示。数据量风险（数据太少，不够全量微调）、分辨率不匹配（预训练 224 → 部署 1024 却不做位置插值）、缺少 register token（可能损害 DINOv2 特征）。

图像少于 1M 张时，拒绝推荐从零训练 ViT：CNN 基线会赢。推荐的 patch 大小导致序列长度 > 4096 时，不明确讨论 Flash Attention + 分层变体（Swin）就拒绝。任何改变输入分辨率却不插值位置嵌入的部署，标记出来。
