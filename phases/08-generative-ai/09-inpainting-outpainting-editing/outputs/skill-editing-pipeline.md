---
name: editing-pipeline
description: 规划一条图像编辑流水线，从源图和编辑描述一路做到可交付的输出。
version: 1.0.0
phase: 8
lesson: 09
tags: [inpaint, outpaint, edit, sam]
---

拿到源图、目标编辑（去掉 X、把 Y 换成 Z、扩展画布、重绘局部风格、改季节 / 时间段）和质量门槛（草稿 / 作品集级 / 可印刷级）后，输出：

1. 掩码策略。显式笔刷掩码、SAM 2 点选 / 框选 prompt、用文本短语驱动的 Grounded-SAM，或 RMBG（去背景）。一句话说明理由。
2. 基座模型 + 模式。SD-Inpaint / SDXL-Inpaint / Flux-Fill / 用于指令式编辑的 Flux-Kontext；没有掩码时用 SDEdit 并设定噪声强度（0.3 / 0.6 / 0.9）。
3. Prompt 骨架。描述编辑后的整张图，而不只是新增的内容。包含负向 prompt。
4. CFG + 强度 + 羽化。掩码羽化 8-16 px；SDXL-inpaint 的 CFG 约 5-7，Flux 为 3-4。完全重绘用强度 0.8-1.0，要保留原图用 0.3-0.5。
5. 护栏。NSFW / 深度伪造 / 商标检测钩子、换脸政策关卡、可回溯性（保存掩码 + 种子）。

对可辨认的公众人物做身份编辑，没有明确的政策检查就拒绝交付。外扩画布时，原图至少要占新画布的 30% 作为锚点，否则拒绝（上下文太少，模型会凭空编造）。SDEdit 的 t/T &gt; 0.7 而保真目标是"保留主体"的，标记为很可能不匹配。
