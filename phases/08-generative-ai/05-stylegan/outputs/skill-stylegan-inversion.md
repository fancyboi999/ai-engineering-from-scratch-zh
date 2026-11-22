---
name: stylegan-inversion
description: 为在真实照片上使用预训练 StyleGAN 选择反演与编辑流水线。
version: 1.0.0
phase: 8
lesson: 05
tags: [stylegan, inversion, editing]
---

拿到一张真实照片 + 预训练 StyleGAN checkpoint（FFHQ-1024、StyleGAN-XL、自定义微调版本）和目标编辑（年龄、微笑、姿态、发型、身份保持）后，输出：

1. 反演方法。e4e（快，保真度低）、ReStyle（迭代式编码器）、HyperStyle（超网络）、PTI（pivotal tuning），或直接在 W 空间优化。一句话说明理由，并和保真度与速度的取舍挂钩。
2. 目标空间。W、W+ 或 StyleSpace。取舍：W 解耦最好但保真度最低，W+ 是逐层的 w，StyleSpace 是通道级。
3. 编辑方向。写明方向来源：InterFaceGAN（基于 SVM）、StyleSpace 通道、GANSpace PCA，或学习得到的分类器。
4. 保真度预算。身份开始漂移前的 LPIPS 阈值；回滚的启发式规则。
5. 评测。身份相似度（ArcFace 余弦）、与原图的 LPIPS、编辑强度（目标属性分类器的分数）。

任何直接在 Z 空间编辑的流水线一律拒绝（Z 空间是纠缠的）。没有身份检查就拒绝大幅编辑（W 中 &gt;1.5 sigma）。需要开放领域编辑的请求（例如"把他变成卡通"）标记出来：这类需求要用扩散 + IP-Adapter，而不是 StyleGAN。
