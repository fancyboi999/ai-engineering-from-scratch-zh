---
id: chameleon-diverged
title: 早期融合模型在大规模训练下的发散问题
card: multimodal
kind: debug
level: 3
roles: [applied-ai-engineer, inference-engineer]
rounds: [debugging, ml-depth]
tags: [early-fusion, training-stability, qk-norm, divergence]
minutes: 12
lessons: [phases/12-multimodal-ai/11-chameleon-early-fusion-tokens, phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion]
manuals: []
practice: []
cheatsheet: [unified-multimodal]
related: [multimodal/vq-tokenizer-ceiling]
updated: 2026-11-03
---

你用交错排列的文本和图像编码预训练早期融合模型。小规模训练正常，但大规模训练一段时间后，损失突然上升并发散，注意力得分也逐层增长。发生了什么？已发表的训练方案做了哪些改动，才让这样的训练收敛？

## Short answer

大规模早期融合训练不稳定，因为图像编码和文本 token 共用一个 softmax 和一条残差流，而两者的梯度和范数不同；注意力 logits 随深度增长，直到 softmax 饱和、损失暴涨。已发表的 34B 参数训练方案在缺少以下三项改动时，曾在多个检查点发散：点积前对 query 和 key 投影做归一化；每次残差相加后都加 dropout，而不只是放在注意力和 MLP 后；残差分支采用前置归一化，并在最后一个块的跳跃连接上额外做归一化。训练方案与架构本身同样是这项工作的贡献。

## Full answer

### 典型特征

范数增长。query 和 key 向量的模长逐层增长，注意力 logits 随之增大，softmax 接近独热分布，梯度出现尖峰。小规模训练没有达到让这种效应不断累积的深度或步数，大规模训练则会达到。

### 为什么早期融合会加重问题

包含 65,536 个条目的共享词表容纳了文本 token 和 8192 个图像编码，一张图像对应连续的 1024 个编码。长串图像编码的梯度尺度与文本不同，可能主导一次更新。两种模态也占据隐空间的不同区域，进一步拉大范数差距。

### 三项改动

1. QK-Norm。在注意力内部、计算点积之前，对 query 和 key 投影应用层归一化。这限制了各个深度的 logit 幅度，后续多个大模型也采用了这一做法。
2. Dropout 位置。每次残差相加后都加 dropout，而不只放在注意力和 MLP 后。在图像编码梯度可能占主导的地方加强正则化。
3. 归一化顺序。残差分支保留常规的前置归一化，并在最后一个块的跳跃连接上额外做归一化，以稳定最后一层的梯度流。

### 如何在自己的训练中确认

- 训练期间记录各层 query 和 key 的范数，以及最大注意力 logit；发散应发生在深层数值增长之后。
- 按 token 模态分别记录梯度范数；图像编码梯度占主导，说明问题指向第二项改动。
- 从激增前的检查点启用 QK-Norm 重新训练，对比 logit 曲线。

### 另一类方案

连续表示方案在文本损失之外，对图像 patch 使用扩散损失，避免了图像编码共享 softmax 的问题，但也有自己的平衡难题：两种损失的尺度不同，它们的权重也需要单独搜索。

## Follow-ups

- **Level 3:** 为什么归一化 query 和 key 能限制 logits？ Expected: 两个归一化向量的点积受其尺度约束，因此 logits 不会随着残差流增长而无限增大。
- **Level 3:** 为什么不改为降低学习率？ Expected: 较低的学习率会减慢增长，却不能消除这一机制；范数仍随深度漂移，训练还要多花步数，而归一化能消除这个问题。
- **Level 4:** 论文报告的 34B 模型在缺少这些改动时有什么表现？ Expected: 注意力 logits 增长、范数爆炸，导致多个检查点反复发散；三项改动消除了这一问题。
- **Level 4:** 连续表示的双损失设计如何用一个问题换来另一个问题？ Expected: 它移除了图像编码上的共享 softmax，却引入了量级不同的两种损失；如果不仔细设置损失权重和调度，一个输出头就可能占主导。

## Wrong answers

- "早期融合天生不稳定，改用小模型。" 已发表的方案采用三项改动后在 34B 规模收敛；不稳定是训练方案的问题。
- "加大梯度裁剪力度。" 裁剪限制的是更新，不是引发饱和的 logit 增长；即使裁剪，范数仍会漂移。
- "所有位置都用后置归一化，它更稳定。" 方案保留了残差分支的前置归一化，只在范数增长的地方增加归一化：query、key 和最后一个块的跳跃连接。

## Taught in

[Chameleon 课程](../../../phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/)记录了三项稳定性改动和大规模训练的发散现象，[Transfusion 课程](../../../phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/)介绍了连续表示的替代方案及其平衡问题。
