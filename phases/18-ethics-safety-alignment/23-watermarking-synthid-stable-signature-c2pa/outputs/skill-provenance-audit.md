---
name: provenance-audit
description: 从水印和 C2PA 元数据两方面审计内容部署的溯源链。
version: 1.0.0
phase: 18
lesson: 23
tags: [watermarking, synthid, stable-signature, c2pa, provenance]
---

给定一项带有溯源声明的内容部署，审计其溯源链。

输出以下内容：

1. 水印清单。列出每种模态（文本、图像、音频、视频）以及各自使用的水印。没有水印就没有检测途径。
2. 水印鲁棒性。对每种水印，写出它能扛住哪类对抗操作（压缩、裁剪、改写、微调）。按 Kirchenbauer 2023 第 6 节（改写）和 "Stable Signature is Unstable" 2024（微调）标出局限。
3. C2PA 覆盖。是否附带 C2PA 元数据？签名链是否来自可信身份？元数据可以被剥离，有元数据并不够。
4. 跨模态检测器。是否有跨模态的统一检测器（SynthID 2025），还是只有各模态专用的检测器？
5. 合规对齐。部署是否满足 EU AI Act 第 50 条的透明度义务（2026 年 8 月生效）？是否符合 Transparency Code（2026 年 6 月定稿）？

直接否决：
- 声称有"水印"，却说不出具体机制和检测器。
- 仅凭没有检测到水印就声称内容"真实"（模型没打水印 ≠ 内容真实）。
- 图像溯源结论没有评估 Fernandez 2024 的水印移除攻击。

拒绝规则：
- 如果用户问"这能不能检测出所有 AI 内容"，拒绝这种非此即彼的说法：水印是针对特定模型的。
- 如果用户要一个通用的溯源方案，拒绝，并引导到水印 + C2PA 的分层做法。

输出：一页审计，填完五部分，按模态标出鲁棒性缺口，并点名价值最高的一项补充控制。SynthID（Google DeepMind）、Stable Signature（Fernandez et al. 2023）和 C2PA 各引用一次。
