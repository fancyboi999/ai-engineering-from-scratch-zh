---
id: vq-tokenizer-ceiling
title: 为什么分词器限制了生成图像的质量上限
card: multimodal
kind: concept
level: 3
roles: [applied-ai-engineer]
rounds: [ml-depth]
tags: [vq-vae, tokenizer-ceiling, transfusion, image-generation]
minutes: 12
lessons: [phases/12-multimodal-ai/11-chameleon-early-fusion-tokens, phases/12-multimodal-ai/12-emu3-next-token-for-generation, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified]
manuals: []
practice: []
cheatsheet: [unified-multimodal, image-generation-compared]
related: [multimodal/emu3-generation-cost, multimodal/early-or-late-fusion]
updated: 2026-11-03
---

在统一多模态生成技术家族中，常有论断称生成图像的画质上限完全被分词器（Tokenizer）限制，而非受制于 Transformer 本身。请解释背后的技术根因，展示两代大模型之间是如何突破这一瓶颈的，并指出哪种架构设计能够彻底规避该瓶颈以及代价是什么。

## Short answer

离散图像分词器本质上是极其有损的：像素解码器只能渲染离散编码所携带的信息，因此模型所能生成的最佳图像极限仅仅是分词器自身对真实图像的重构质量。初代共享词表模型针对 512 × 512 图像仅使用来自 8,192 码本的 1,024 个代码，重构质量仅约 26 到 28 dB；第二代模型将编码数量翻至 4 倍（4,096 个代码）并将码本扩大 4 倍（32,768 条目），将重构质量提升至 30.5 dB（极为逼近连续潜空间扩散模型的 32 dB 水平）。避开该上限的设计是将图像 patch 保持为连续向量，在同一个 Transformer 内与文本联合训练去噪扩散损失；它彻底抛弃了离散量化器并实现了极高保真度，代价是必须手动平衡两套不同量级的损失函数并在推理时引入多步扩散去噪采样循环。

## Full answer

### 为什么画质天花板客观存在

Transformer 主干网络只负责预测离散编码。像素解码器在没有任何额外输入的前提下，单凭这些离散编码将其还原为像素。离散量化器在最初编码压缩阶段扔掉的任何微观细节都永远无法被找回：即使有一个数学上完美的 Transformer 能够百分之百准确预测出某张真实图像的离散编码，解码器还原出来的上限也仅仅是分词器对该图像的重构版本，绝不可能更好。因此，分词器的重构质量构成了对真实图像高保真还原的上限（如下表中的 PSNR/dB 测量所示）。分布相似度类指标衡量的是宏观真实感，不受这一绝对上限约束。

### 两代模型如何打破并提高天花板

| 模型代际 | 512 × 512 图像的编码数量 | 码本容量（Codebook） | 物理重构保真度（PSNR） |
|---|---|---|---|
| 初代共享词表早期融合模型 | 1024 个代码 | 8192 | 约 26 到 28 dB |
| 新一代统一 Next-token 生成模型 | 4096 个代码 | 32768 | 30.5 dB |
| 连续潜空间扩散模型（对比基准） | 连续实数向量 | 无离散码本 | 约 32 dB |

4 倍的编码数量承载了 4 倍密集的空间几何细节，而 4 倍庞大的码本为每个离散位置提供了更细腻的表征取值。新一代模型的最核心突破正在于推出了更优质的分词器，从而在纯自回归 Next-token 预测框架下在图像生成基准上追平了专用扩散模型。

### 增加编码数量的推理代价

在传统的逐 token 自回归生成中，每个编码意味着一次完整的前向解码 pass，因此 4 倍的代码量直接导致生成耗时翻 4 倍。掩码并行解码方案虽然保留了离散编码，但它在单步内并发预测所有被掩蔽的位置，仅需约 16 次 pass 即可生成整张图像，从而在工程上抵消了高密度网格带来的时延负担。

### 彻底根除天花板的技术路线：连续型扩散

将图像完全保持为连续特征。通过单一线性层将连续图像 patch 投射到隐层维度（与 ViT 完全一致），在单个 Transformer 中联合训练文本因果交叉熵与带噪 patch 上的流匹配回归损失。由于完全不存在离散量化器，图像的细节保真度上限被彻底打破；论文实测该方案的生图指标比同参数规模的离散模型高出 3 到 5 分。其代价包括：两套数值尺度迥异的损失函数需要精细调优平衡权重、块下三角复合注意力掩码，以及生成图像时必须经历数十步扩散去噪采样。

### 架构选型指引

当业务需要单一 Next-token 技术栈以极简的单损失函数同时通吃多模态理解、文生图与视频生成时，选用离散编码流派并坦然接受分词器的质量瓶颈；当图像保真度是首要考虑且可以接受双损失方案时，选用连续 patch 扩散方案。

## Follow-ups

- **Level 3:** 为什么在训练 Transformer 之前，首先应该检查分词器的重构指标？ Expected: 因为重构质量是整个系统的绝对天花板；无论主干 Transformer 的参数规模扩展得多大，它生成的画面极限都不会超过分词器自身解码的质量。
- **Level 3:** 除了扩大码本容量和增加编码数量，还有什么机制能改善分词器性能？ Expected: 改进量化器本身的架构设计；新一代模型采用了反向瓶颈量化器（Inverse-bottleneck quantizer），能充分激活利用超大码本，而朴素的量化器往往导致大量码本死条目无法被有效利用。
- **Level 4:** 连续型扩散模型中的注意力掩码如何设计？ Expected: 块下三角掩码：文本之间单向因果，同一图像 patch 之间全双向，文本关注位于其之前的已闭合图像，图像 patch 关注位于其之前的文本 prompt。
- **Level 4:** 掩码离散解码流派在上述权衡光谱中处于什么位置？ Expected: 它依然归属于受制于分词器天花板的离散路线，但通过十几步的并行解码摆脱了逐 token 串行的龟速；它以适度的保真度换取了极简的单损失训练与极速采样。

## Wrong answers

- "只要加大 Transformer 参数量，生成的图像就会越来越清晰锐利。" Transformer 只是在预测离散编码；超出分词器重构极限之外的高频清晰度在编码空间中根本不存在。
- "单单把码本扩大 4 倍就足够了。" 编码总数决定了空间几何密度，码本大小决定了单点数值精度；新一代模型必须两者同时扩大，且依赖量化器防止码本失活。
- "连续 patch 方案全面优于离散方案，离散编码已经被彻底淘汰。" 连续 patch 必须付出调平两套损失的复杂代价并在推理时跑漫长的去噪循环；离散家族维持了万物皆 Next-token 的统一性，因此两者长期共存。

## Taught in

[Chameleon 课程](../../../phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/)指出了分词器是不可逾越的重构天花板，[Emu3 课程](../../../phases/12-multimodal-ai/12-emu3-next-token-for-generation/)展示了更优分词器如何拔高天花板，而[Transfusion 课程](../../../phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/)给出了连续方案的架构细节与代价。
