---
id: layernorm-not-batchnorm
title: transformer 为什么跨特征归一化，而不是跨 batch
card: deep-learning
kind: tradeoff
level: 3
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, design-review]
tags: [normalization, layer-norm, batch-norm, rmsnorm, transformers]
minutes: 12
lessons: [phases/03-deep-learning-core/07-regularization]
manuals: []
practice: [layer-norm-rms-norm, batch-norm]
cheatsheet: [deep-learning-training]
related: [deep-learning/train-mode-and-eval-mode, deep-learning/inverted-dropout-scale]
updated: 2026-11-03
---

一个团队把视觉的训练配方移植到 transformer 上，保留了批归一化。训练不稳定，一次生成一条序列时输出的是乱码。解释 transformer 为什么改用层归一化，以及什么时候你会更进一步，用 RMSNorm。

## Short answer

批归一化在 batch 上对每个特征做归一化，所以它的统计量取决于 batch 大小，以及哪些序列在同一个 batch 里；batch 小时统计量噪声大，batch 为一时没有意义，训练和推理还走不同的代码路径。层归一化在一个样本的特征上做归一化，不依赖 batch，两种模式下完全一样，这正是变长序列和单序列生成所需要的。RMSNorm 去掉了减均值和平移参数，精度不变，归一化开销省了约 10%，所以最近的大多数大语言模型都用它。

## Full answer

### 批归一化和它的两个依赖

对每个特征，批归一化减去 batch 均值，除以加了 epsilon 的 batch 标准差，再应用可学习的缩放 gamma 和平移 beta。这带来两个后果。第一，一个样本的结果取决于同一 batch 里的其他样本。课里把下限定在 batch 大约为 32；低于它统计量噪声大，batch 为一时方差为零。第二，推理时看不到 batch，所以要用训练时以 0.1 的动量收集的滑动平均，这是第二条代码路径，也是第二个 bug 来源。序列模型两个问题都会碰上：长度不一，内存限制了 batch，生成时一次只跑一条序列。

### 层归一化

层归一化在一个样本的 D 个特征上算均值和方差，只对这个样本做归一化。不依赖 batch，没有滑动平均，训练和推理的计算相同。transformer 在每个注意力块和每个前馈块周围应用它：Post-LN 放在块之后，Pre-LN 放在块之前，课里指出 Pre-LN 训练更稳定。

### RMSNorm

RMSNorm 将特征除以其均方根，再乘以 gamma。没有减均值，也没有 beta。它背后的观察是：重新中心化对精度帮助不大，却要花计算，去掉它精度相同，归一化开销少了约 10%。在数十亿参数的规模下，这个节省是实打实的，现代大多数大语言模型都用它。

### 批归一化到底为什么有用

最早发表的解释，也就是内部协变量偏移，已经被证明是错的。收益来自更平滑的损失曲面和更可预测的梯度，优化器因此能迈更大的步。层归一化和 RMSNorm 提供了同样的效果，却不依赖 batch。

## Follow-ups

- **Level 3:** 批归一化在推理时需要什么，而层归一化不需要？ Expected: 训练时收集的均值和方差的滑动平均；层归一化从样本自身计算统计量。
- **Level 3:** transformer 块把归一化放在哪里？ Expected: Post-LN 放在每个注意力块和前馈块之后，Pre-LN 放在它们之前，后者训练更稳定。
- **Level 4:** RMSNorm 去掉了什么，代价是什么？ Expected: 减均值和平移参数；课里报告精度相同，归一化开销少了约 10%。
- **Level 4:** 批归一化最初的解释为什么不再被接受？ Expected: 后来的研究表明，收益来自更平滑、Lipschitz 常数更小的损失曲面，这让优化器能迈更大的步。

## Wrong answers

- "批归一化只需要更大的 batch。" 生成时一次只跑一条序列，序列长度也各不相同；解决办法是一种不跨 batch 看的归一化。
- "层归一化是更弱的正则化，所以是一种妥协。" 它跨特征归一化，这是序列的正确轴，而且消除了训练和推理之间的不一致。
- "RMSNorm 是会损失精度的近似。" 课里报告精度相同；重新中心化帮助不大，还要花计算。

## Taught in

[正则化课](../../../phases/03-deep-learning-core/07-regularization/)构建了这三种归一化，并解释了 transformer 为什么这样选。
