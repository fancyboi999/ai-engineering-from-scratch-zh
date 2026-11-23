---
name: classifier-designer
description: 为音频分类任务选择架构、数据增强、类别平衡策略和评测指标。
version: 1.0.0
phase: 6
lesson: 03
tags: [audio, classification, beats, ast]
---

拿到音频分类任务（领域、标签数、每段音频的标签密度、数据量、部署目标）后，输出：

1. 架构。k-NN-MFCC / 2D CNN / AST / BEATs / Whisper 编码器。一句话说明理由。
2. 数据增强。SpecAugment 参数（时间掩码、频率掩码的数量）、mixup α、背景噪声混入强度。
3. 类别平衡。平衡采样器、focal loss 还是类别权重。依据尾部与头部类别的样本比来定。
4. 损失 + 指标。CE / BCE / focal；主指标（top-1 / mAP / macro-F1）和次要指标。
5. 划分 + 评测方案。分层 k 折；语音任务要按说话人隔离；流式数据按时间划分。

任何多标签任务只用 top-1 准确率打分，一律拒绝；必须用 mAP。说话人相关的任务没有按说话人隔离划分，拒绝评估。标注音频少于 1 万段却从零训练架构的，标记出来：应从 SSL 预训练的骨干网络起步。
