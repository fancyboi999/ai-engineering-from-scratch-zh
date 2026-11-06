---
id: logistic-loss-on-separable-data
title: 权重持续无止境增长的逻辑回归
card: math-classical-ml
kind: concept
level: 3
roles: [applied-ai-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [ml-depth, debugging]
tags: [logistic-regression, cross-entropy, convexity, regularization]
minutes: 12
lessons: [phases/02-ml-fundamentals/03-logistic-regression, phases/02-ml-fundamentals/02-linear-regression]
manuals: []
practice: [logistic-regression]
cheatsheet: [classical-ml]
related: [math-classical-ml/threshold-precision-or-recall, math-classical-ml/cross-entropy-is-kl-plus-entropy]
updated: 2026-11-03
---

你使用梯度下降在一个小型数据集上拟合逻辑回归，该数据集线性可分（一条直线即可无差错地划分两类）。训练中每个 epoch 损失都在下降、权重都在增长，模型却始终无法收敛稳定。一位同事建议改用均方误差损失，理由是它有明确的最小值。此时究竟发生了什么？你该如何解决？

## Short answer

在可分数据上对数损失不存在有限的最小值：等比例放大权重会使每个预测概率进一步逼近其真实标签，并使损失持续趋向于零，导致梯度下降永远不会停止。改用经过 Sigmoid 的均方误差是更差的选择，因为该代价曲面是非凸的，存在导数消失的平坦区域。应保留对数损失并引入 L2 正则化项，从而确保存在唯一有限的全局极小值。

## Full answer

### 为什么对数损失是正确的损失函数

模型计算线性得分 z = w x + b 并传入 Sigmoid 函数，二元交叉熵损失是负的 y log p 加 (1 - y) log (1 - p) 的均值。对于该线性模型，该损失函数是凸函数，所有局部极小值即为全局极小值，梯度下降不会陷入不良局部低谷。其梯度形式与线性回归一样简洁，即 (p - y) 乘以 x 的均值，其中 p 是 Sigmoid 的输出而非原始得分。

### 线性可分数据带来的影响

当一条直线能完全正确分类所有样本点时，将 w 和 b 乘以一个大于 1 的常数不会改变分类边界的位置，却会使每个样本的预测概率进一步趋近 0 或 1。每一步这样的更新都会降低损失，因此不存在任何有限的 w 能成为损失的极小值点。在训练过程中你会观察到损失不断下降、权重持续增大、概率极度饱和，代码中的 Sigmoid 数值截断保护开始触发。然而，决策边界本身早已不再发生变化。

### 为什么均方误差无法解决问题

在 Sigmoid 输出上使用均方误差是非凸的。它存在多个局部极小值，并且在 Sigmoid 饱和的区域其导数接近于零，导致置信度极高的错误预测几乎得不到任何梯度修正。课程中明确指出在分类任务中避免使用均方误差正是由于这一曲面特性。

### 解决方案

在损失函数中增加 L2 惩罚项，即 lambda 乘以权重平方和。其梯度（两倍 lambda 乘以 w）会在每一步将权重拉回零点。这一拉力随权重增大而增强，而数据损失的梯度拉力则随概率饱和而减弱，二者最终在有限数值点达到平衡，形成唯一的极小值点。课程中的库实现在默认情况下启用正则化正是出于这一原因。

## Follow-ups

- **Level 3:** 为什么本模型下的交叉熵是凸函数，而均方误差不是？ Expected: Sigmoid 的对数与线性得分复合后为凸函数；对 Sigmoid 与标签的差值取平方会产生平坦区域与多个局部极小值。
- **Level 3:** 在权重持续增长的过程中，决策边界发生了什么变化？ Expected: 直线 w x + b = 0 几乎未移动；只是跨越边界的 Sigmoid 斜率变得更陡峭，预测置信度过度饱和。
- **Level 4:** L2 惩罚项如何改变每一次梯度更新步？ Expected: 它在梯度中增加了一个与 w 成正比的项，使每一步都会衰减权重，衰减拉力与变大拉力在有限点达成平衡。
- **Level 4:** 如果数据只是近似可分，该问题会消失吗？ Expected: 有限极小值确实存在，但权重依然过大且预测概率过度自信；L2 正则化仍有助于改善概率校准，验证集损失能够证明这一点。

## Wrong answers

- "损失在下降说明模型仍在提升，继续训练即可。" 分类边界早已停止改进；增长的只是置信度，直到权重溢出或概率完全饱和。
- "改用均方误差以获得定义明确的极小值。" 带有 Sigmoid 输出的均方误差曲面是非凸的，梯度下降可能停在劣质局部极小值，且在饱和区梯度消失。
- "引入早停机制即可解决。" 早停虽限制了训练时间，但权重仍停留在时间耗尽时的位置；正则化能给出与训练轮数无关的确定解。

## Taught in

[逻辑回归课程](../../../phases/02-ml-fundamentals/03-logistic-regression/)解释了对数损失的凸性以及可分数据不存在有限极小值点的原因，[线性回归课程](../../../phases/02-ml-fundamentals/02-linear-regression/)引入了 L2 惩罚项。
