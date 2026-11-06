---
id: sft-learning-rate-gap
title: 在 SFT 中直接复用预训练学习率的代价
card: post-training
kind: concept
level: 2
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, debugging]
tags: [sft, learning-rate, catastrophic-forgetting, epochs]
minutes: 8
lessons: [phases/10-llms-from-scratch/06-instruction-tuning-sft]
manuals: []
practice: []
cheatsheet: [llm-pipeline-capstone]
related: [post-training/sft-data-quality-wins]
updated: 2026-11-03
---

一位同事把预训练的训练配置全盘照搬到了 SFT 任务中：完全相同的峰值学习率、完全相同的预热步数，在 27,000 条样本上训练了 3 个 epoch。SFT 训练集上的损失迅速下降，大家都皆大欢喜。当你在真实场景测试该模型时，预期会看到什么？你应该做出什么修改？

## Short answer

预期会出现灾难性遗忘：模型能按照训练格式回答，但它在原始文本上的损失上升，在代码、数学和数据集之外的任何内容上都会变差。预训练的峰值学习率大约是课程中 SFT 值的 15 倍，3e-4 对比 2e-5。将学习率降到 1e-5 到 5e-5 范围内，保持一到三个 epoch，并在跟踪 SFT 损失的同时跟踪原始文本损失。

## Full answer

### 两种截然不同的训练范式

| 配置项 | 预训练 | SFT |
|---|---|---|
| 峰值学习率 | 3e-4 | 2e-5 |
| Epoch 数 | 1 | 2 |
| 预热步数 | 2,000 | 0 到 100 |
| 数据 | 2T tokens | 27,000 个样本 |

SFT 调整的是已经能正常工作的模型。大步长会用小集合的模式覆盖预训练特征。

### 如何观察损伤

留出一部分原始文本，测量 SFT 前后的下一个 token 损失。课程的规则：上升超过 10% 到 15% 说明训练过于激进。降低学习率或减少 epoch。同时在 SFT 数据集之外的任务上运行小规模评估。

### 三种缓解措施

1. 较低的学习率，1e-5 到 5e-5。
2. 较短的训练，1 到 3 个 epoch。在小集合上超过 3 个 epoch 会导致死记硬背，模型会逐字重复训练样本。
3. 在 SFT 批次中混入 2% 到 5% 的未处理预训练文本，不加掩码，让模型保持通用能力。

### 为什么损失曲线会误导人

在高学习率下，SFT 损失快速下降是对小集合的过拟合，而不是学到了东西。课程的练习对比了 1e-4、2e-5 和 1e-6：高学习率下降快且最终损失更高，低学习率几乎不动，中间值则是最合适的值。

## Follow-ups

- **Level 2:** 为什么适合预训练的学习率会毁掉 SFT 训练？ Expected: 预训练从噪声开始，并在数万亿 token 上求平均；SFT 从能工作的模型和小集合开始，每个大步长都会覆盖小集合未覆盖的特征。
- **Level 2:** 应该跑几个 epoch，如何决定？ Expected: 一到三个；当留出集指令损失停止改善且原始文本损失未超过预算时停止。
- **Level 3:** 原始文本损失上升了四分之一，但产品团队喜欢现在的回答。可以发布吗？ Expected: 不能照现状发布；模型丢失了用户会触及的通用能力；用更低的学习率或混入预训练文本重新运行，并在集合外的评估上做对比。
- **Level 3:** LoRA 如何改变这种情况？ Expected: 基座权重保持冻结，因此破坏被限制在适配器内，且合并是可逆的；适配器也比全量更新更能承受较高的学习率。

## Wrong answers

- "SFT 损失下降了，说明训练有效。" 集合上的损失说明不了模型遗忘了什么；测量原始文本损失以及集合外的评估。
- "像预训练一样预热 2,000 步。" SFT 集合总共只有很少的步数；课程使用 0 到 100 步预热。
- "为了更快完成，用更高的学习率，反正数据量很小。" 在小集合上使用高学习率会导致过拟合并覆盖预训练知识；小数据需要更小的步长，而不是更大的。

## Taught in

[SFT 课程](../../../phases/10-llms-from-scratch/06-instruction-tuning-sft/)横向对比了预训练与 SFT 的超参数范式，并利用无监督文本损失系统度量了灾难性遗忘。
