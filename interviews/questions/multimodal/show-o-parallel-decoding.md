---
id: show-o-parallel-decoding
title: 单一 Transformer 生成图像的三种方式
card: multimodal
kind: tradeoff
level: 3
roles: [applied-ai-engineer, inference-engineer]
rounds: [system-design, ml-depth]
tags: [masked-diffusion, parallel-decoding, inpainting, unified-models]
minutes: 12
lessons: [phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified, phases/12-multimodal-ai/12-emu3-next-token-for-generation, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion]
manuals: []
practice: []
cheatsheet: [unified-multimodal, image-generation-compared]
related: [multimodal/emu3-generation-cost, multimodal/vq-tokenizer-ceiling]
updated: 2026-11-03
---

你们团队需要一个能够同时兼顾图像问答（VQA）、文生图（T2I）和局部图像修复（Inpainting）的单一开源大模型，且生成延迟必须达到可落地的生产可用水平。候选方案中：一个采用逐个自回归生成图像离散编码；一个在共享网络中去噪连续 patch；第三个同样采用离散编码但在若干轮前向中并行填充。请从前向 pass 次数、训练复杂度以及自带原生附赠能力三个维度对比这三种方案。

## Short answer

基于离散编码的 Next-token 生成每个代码需要一次 pass，单图需 1,024 到 4,096 次 pass，训练仅需单一交叉熵损失。共享 Transformer 内的连续扩散去噪仅需约 20 次 pass，但需要在不同尺度上联合训练两套截然不同的损失函数。掩码离散解码维持离散编码和单一交叉熵损失，每次 pass 并发预测所有被掩蔽的位置并逐步保留高置信度代码，单图仅需约 16 次 pass；其局部修复（Inpainting）能力是天然附赠的，因为其预训练任务本就是从已知上下文预测被掩盖的代码。对于追求以可用时延在单一开源模型中实现上述三大任务的产品，掩码离散解码是最佳契合方案；而在保真度压倒一切时连续扩散则是首选。

## Full answer

### 掩码离散解码（Masked Discrete Decoding）的工作机制

训练阶段均匀采样掩码比例，按该比例随机掩蔽图像编码，训练 Transformer 恢复这些被遮盖的代码。这本质上泛化了传统的 Next-token 预测：纯文本自回归只掩蔽最后一个位置，而图像生成则掩蔽随机子集。在推理阶段，从一个完全被掩蔽的网格起步，并发预测所有掩码位置的概率分布，挑选置信度最高的一批离散编码正式提交，重新掩蔽剩余低置信度位置，并按预设调度循环迭代。余弦调度将掩码比例设为 pi 乘当前步除以总步数两倍的余弦值，能将计算重点聚焦在中等掩码比例区间，而这正是预测信息量最大的阶段。

### 注意力掩码的混合拓扑

文本 token 严格保持单向因果注意力（Causal）。同一张图像内部的离散编码之间则采用全双向注意力（Bidirectional），使任意被掩蔽的位置都能通盘感知其周围所有的邻近代码。文本可以关注先前的图像，图像编码关注先前的文本。

### 三种方案对比

| 架构范式 | 单图前向 Pass 次数 | 训练损失复杂度 | 原生附赠的额外能力 |
|---|---|---|---|
| 基于离散编码的 Next-token 自回归 | 每个代码 1 次 pass，单图 1024 到 4096 次 | 单一交叉熵损失 | 借助 3D 分词器自然支持视频；单栈搞定一切 |
| 共享主干下的连续扩散 | 约 20 次 pass | 交叉熵加上针对 patch 的扩散回归损失 | 画质保真度最高，彻底摆脱量化器硬天花板 |
| 掩码离散解码 | 约 16 次 pass | 针对被掩盖位置的单一交叉熵损失 | 图像修复；一个检查点用于问答、写作和生成 |

单 pass 成本上，掩码方案比连续扩散更便宜，因为它输出离散 logits，而不是在每个 patch 上做连续回归。

### 掩码离散方案付出的代价

它同样继承了所有离散模型的固有痛点：分词器的重构质量是不可逾越的画质上限。如果试图一步到位在单次 pass 中解开所有掩码，生成结果不连贯，因为所有代码在单步中是条件独立预测的；因此必须设计多步迭代调度，让每轮锁定的高置信度代码为剩余位置提供明确的上下文条件约束。

### 为什么局部修复是原生附赠的

直接把待编辑区域的代码人工涂上 mask，连同其余完整的图像编码和编辑 prompt 一起送入模型，执行正常的去掩码预测即可。不需要新目标，也不需要新的输出头；训练任务本来就是如此。

## Follow-ups

- **Level 3:** 为什么模型不能在单次 pass 中直接解除全部掩码生成图像？ Expected: 每个掩码位置都是基于边缘分布独立采样的，各位置之间缺乏联合概率约束，一次性生成会导致画面元素彻底破碎互不协调；多步调度能让先确认的高置信度代码为后续步骤提供条件引导。
- **Level 3:** 为什么余弦调度比线性调度表现更好？ Expected: 它把更多前向步数分配在每个代码预测最具信息量的中间掩码比例阶段，而线性调度更早进入平台期。
- **Level 4:** 掩码离散解码与连续扩散在单步推理计算成本上存在什么差异？ Expected: 两者虽然都是全量 Transformer 前向，但离散预测头是在码本分类分布上计算 logits，而连续扩散头要在每个 patch 上回归多维速度向量；因此离散单步计算量更低。
- **Level 4:** 什么样苛刻的业务需求会迫使你放弃这种统一大模型而退回专用生成模型？ Expected: 业务对纹理画质有严苛要求（超过了离散量化器重构上限），或者即使 16 次全量 pass 依然超出了极其严苛的低延迟预算，此时专业优化的独立扩散模型更胜一筹。

## Wrong answers

- "掩码解码本质就是扩散模型，因此也需要噪声调度。" 它是纯离散的：位置被直接置为 mask token 而不是加噪，调度器控制的是每轮迭代锁定的代码数量。
- "Next-token 自回归是最快的，因为单步计算量很小。" 它的单步依然是跨越整段序列的全量 Transformer 前向，而一张图要串行重复数千次。
- "局部图像修复必须训练一个单独的专业 Inpainting 模型。" 掩码预训练本身就是局部修复；在推理阶段直接给待编辑区域打上 mask 就是模型被训练完成的标准任务。

## Taught in

[Show-o 课程](../../../phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/)详解了掩码并行解码、余弦调度以及单模型多任务形态，[Emu3 课程](../../../phases/12-multimodal-ai/12-emu3-next-token-for-generation/)给出了逐 token 解码开销，[Transfusion 课程](../../../phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/)给出了连续扩散备选方案。
