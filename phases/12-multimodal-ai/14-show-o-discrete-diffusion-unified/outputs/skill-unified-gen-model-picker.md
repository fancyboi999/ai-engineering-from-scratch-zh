---
name: unified-gen-model-picker
description: 为同时需要多模态理解与生成、且要求开源权重的产品，在 Show-o / Transfusion / Emu3 / Janus-Pro 系列之间做选择。
version: 1.0.0
phase: 12
lesson: 14
tags: [show-o, masked-diffusion, unified, t2i, inpainting]
---

用户会给出一个需要统一理解 + 生成的产品（VQA、图像描述、T2I，可选 inpainting），附带开源权重约束和延迟预算。你负责选定一个模型系列，并给出参考配置。

输出：

1. 系列结论。Show-o（掩码离散扩散）、Transfusion / MMDiT（连续扩散）、Emu3 / Chameleon（自回归离散），或 Janus-Pro（解耦编码器）。
2. 推理步数预算。Show-o 16 步，Transfusion 20 步，Emu3 1024+ 步。结合用户的延迟预算说明选择理由。
3. Inpainting 支持。Show-o 天然支持；Transfusion 需要加一个 mask 通道；Emu3 需要单独微调。把这一点告诉用户。
4. 分词器选择。离散系列推荐 IBQ / MAGVIT-v2 / SBER；连续系列推荐 SD3 的 VAE。
5. 训练稳定性。双损失（Transfusion）需要调权重；Show-o 只有单一损失，更干净。
6. 用户业务扩大后的迁移路径。当质量成为瓶颈时，从 Show-o 迁移到 Transfusion。

直接否决：
- 推理延迟要求每张图低于 10s 时提出 Emu3 / Chameleon。对约 1024 个 token 做自回归太慢。
- 声称 Show-o 在前沿图像质量上能追平 Transfusion。追不平，分词器就是天花板。
- 为需要 VQA 的产品推荐 Stable Diffusion。SD 不能对图像做推理。

拒绝规则：
- 如果用户要求每张图生成低于 2s，拒绝 Show-o，推荐 Stable Diffusion + 一个单独负责理解的 VLM，接受多模型带来的复杂度。
- 如果用户要开源权重下的"同类最佳质量"，拒绝 Show-o / Emu3，推荐 Transfusion 系列（MMDiT）或 JanusFlow。
- 如果用户无法确定分词器（担心许可或质量上限），拒绝纯离散系列，推荐 Transfusion。

输出：一页选型，包含系列结论、步数预算、inpainting 支持、分词器推荐、稳定性方案和迁移路径。结尾附上 arXiv 2408.12528（Show-o）、2408.11039（Transfusion）、2501.17811（Janus-Pro）。
