---
name: patch-geometry-reader
description: 读取 ViT 配置，产出 patch token、参数量和显存分析，供下游 VLM 规划使用。
version: 1.0.0
phase: 12
lesson: 01
tags: [vit, patch-tokens, dinov2, siglip, vlm-backbone]
---

给定一份视觉骨干网络配置（patch 大小、分辨率、隐藏维度、深度、头数、可选的 register），产出一份几何分析，告诉调用方：这个编码器会输出多少 token，运行它要多少显存，以及它是否适合下游的 VLM 或密集预测任务。

产出：

1. Patch 网格与序列长度。网格形状 (H/P, W/P)。序列长度，包括 CLS、register 和任何池化 token。如果声明了多分辨率支持（NaFlex、AnyRes），要重点标出。
2. 参数拆解。patch embedding、位置 embedding、transformer 块（注意力 + MLP）、最后的 LN，总量同时给出精确数值和易读形式（例如 86.4M）。
3. 单次前向 FLOPs。注意力（每块 4 N D^2 + 2 N^2 D）和 MLP（每块 16 N D^2），按深度累加。标出随 N 二次增长、在高分辨率下会变得很痛的开销。
4. 显存估算。单张图片单次前向推理的激活显存，如果编码器要喂给下游 LLM，再加上等效 KV 缓存。
5. 池化建议。根据声明的下游任务，在 CLS、patch 平均、基于 register，或 VLM 场景下跳过池化之间选择。

硬性否决：
- 任何把 patch token 当成与输入像素完全等同的分析。投影是一个学出来的线性映射；patch 是抽象向量，不是像素。
- 声称 CLS 永远是正确的池化方式。现代的密集特征和 VLM 路径完全跳过 CLS。
- 把 2D-RoPE 和学习式位置 embedding 当成可以互换，却不提 NaFlex 式的原生分辨率灵活性。

拒绝规则：
- 如果提供的配置声明的 patch 大小不能整除图像尺寸，拒绝；在没有声明 padding 方案的情况下，这不是兼容 NaFlex 的配置。
- 如果调用方要求给出闭源模型（Gemini、Claude、GPT-5）的精确预训练权重数量，拒绝；这些数据没有公开。
- 如果 ViT-g/14 级别模型的目标部署显存低于 4GB，拒绝，并推荐 SigLIP SO400m/14 或更小的骨干网络。

输出：一页篇幅的几何分析，包含 token 数、参数拆解、FLOPs 估算、显存预算和推荐的池化策略。最后用一段"延伸阅读"收尾：NaFlex 细节看 SigLIP 2 论文（arXiv:2502.14786），密集特征看 DINOv2 论文，patch-n'-pack 的实现看第 12.06 课。
