---
id: half-the-relus-are-dead
title: 两层里大多数 ReLU 输出恰好为零
card: deep-learning
kind: debug
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [dead-relu, activation-functions, learning-rate, debugging]
minutes: 12
lessons: [phases/03-deep-learning-core/04-activation-functions, phases/03-deep-learning-core/13-debugging-neural-networks]
manuals: []
practice: []
cheatsheet: [nn-debugging]
related: [deep-learning/sigmoid-gradient-after-ten-layers, deep-learning/zero-init-symmetry]
updated: 2026-11-03
---

用较高的学习率训练几百步后，一个 ReLU 网络的损失不再下降。你记录了每个 ReLU 之后的激活值，发现有两层在每个 batch 上都有一半以上恰好为零。解释这些单元发生了什么，为什么它们自己恢复不了，以及你要改什么。

## Short answer

先确认这些单元是死了，而不只是稀疏：在大量样本上，死单元对每个输入都输出零。一个 ReLU 单元的预激活对所有输入都为负时，输出为零，导数也为零，所以它得不到梯度，权重再也不会动。高学习率带来的一次大更新，把这些单元的权重和偏置推到足够负，任何输入都拉不回来。降低学习率，重新初始化死掉的单元或层，并换成负半轴有梯度的激活函数，比如 leaky 变体或 GELU。

## Full answer

### 什么是死单元

ReLU 是 max(0, x)。输入为正时导数为 1，否则为 0。一个单元的输入在每个样本上都为负时，它输出 0，传给权重的梯度为 0，损失里也没有别的东西会碰这些权重。它在剩下的训练中都是死的。激活函数课说，实践中 ReLU 网络里可能有 10% 到 40% 的单元死掉。调试课的阈值是某个 ReLU 层之后零值超过一半：到这个程度就换激活函数，或者降低学习率。

### 高学习率是怎么造成的

一次过大的更新把单元的偏置或权重推到很负的地方。这一步之后，每个输入都落在零以下。调试课的演示把权重填成 -1.0、偏置填成 -5.0，直接构造出这种状态，结果是损失平坦，大多数激活值为零。高学习率会意外地达到同样的状态。

### 区分死单元和稀疏

有一些零是正常的；ReLU 本来就是稀疏的。在大量样本上，统计每个单元输出为正的输入比例。死单元在所有输入上都是零。激活函数课的检测器根据这个比例，把单元报告为死亡、勉强存活和健康。

### 要改什么

1. 降低学习率，并加上梯度裁剪，让单个坏 batch 不能再产生这样的一步。
2. 用 Kaiming 抽样重新初始化死单元的输入权重，然后继续训练；网络其他部分保留已有进度。这就是调试课里的死神经元复活练习。
3. 换激活函数。leaky ReLU 在负半轴保留一个小斜率，单元可以恢复。GELU 是平滑的，完全避开了这种故障；除非有特别的理由，激活函数课更推荐 GELU 而不是 leaky 变体。
4. 检查初始化。Kaiming 抽样让预激活在开始时以零为中心，一开始就处在负值的单元更少。

## Follow-ups

- **Level 3:** 为什么单元会一直死着，而不是慢慢漂回来？ Expected: 输出为零，传给权重的梯度就是零，损失里也没有别的东西会碰它们。
- **Level 3:** 怎样区分死单元和稀疏激活的单元？ Expected: 在大量样本上统计它输出为正的输入比例；死单元全为零，稀疏单元只在一小部分输入上为正。
- **Level 4:** 高学习率和单元死亡之间有什么联系？ Expected: 一次大更新把偏置或权重推到很负的地方，每个输入都落在零以下；梯度裁剪和较小的学习率能限制步长。
- **Level 4:** 不从头训练，能把死单元救回来吗？ Expected: 用 Kaiming 抽样重新初始化它们的输入权重，然后继续训练；网络其他部分保留已有进度。

## Wrong answers

- "一半是零是 ReLU 正常的稀疏性。" 有一些零是正常的；对每个输入都为零的单元是死的，什么也不贡献，课里会标记零值超过一半的层。
- "提高学习率，让单元跳回来。" 不管学习率多大，梯度都是零；没有哪一步能碰到它们。
- "换成 sigmoid 来避免零。" sigmoid 用随深度消失的梯度换掉了死单元；leaky 变体或 GELU 能保留 ReLU 的好处。

## Taught in

[激活函数课](../../../phases/03-deep-learning-core/04-activation-functions/)解释了死单元并构建了检测器，[调试课](../../../phases/03-deep-learning-core/13-debugging-neural-networks/)复现了这种故障并设定了阈值。
