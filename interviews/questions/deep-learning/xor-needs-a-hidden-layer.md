---
id: xor-needs-a-hidden-layer
title: 为什么单个感知机永远无法学会异或 XOR
card: deep-learning
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, ml-breadth]
tags: [perceptron, xor, linear-separability, hidden-layer]
minutes: 5
lessons: [phases/03-deep-learning-core/01-the-perceptron, phases/03-deep-learning-core/02-multi-layer-networks]
manuals: []
practice: [train-xor-mlp]
cheatsheet: [neural-net-basics]
related: [deep-learning/stacked-linear-layers-collapse, deep-learning/weight-matrix-rows-and-columns]
updated: 2026-11-03
---

单个感知机在短短几个 epoch 内就能完美学会 AND 和 OR 逻辑门。然而在 XOR 异或门上，即使训练 1000 个 epoch 也永远无法收敛。为什么会这样？能够让 XOR 变得可学习的最小模型改造是什么？

## Short answer

单层感知机计算输入的加权和，加上偏置并经过阈值切分，因此其决策边界在几何上是一条严格的直线。AND 与 OR 逻辑门将其正样本划分在单条直线的同侧。XOR 将正样本落在 (0, 1) 与 (1, 0)，负样本落在 (0, 0) 与 (1, 1)，没有任何一条单一的直线能将这两对样本分割开。给模型增加一个隐藏层：由两个分别计算 OR 和 NAND 的神经元构成隐藏层，再由一个输出神经元对二者执行 AND 操作，即可精确表示 XOR。

## Full answer

### 单个感知机能够绘制的几何边界

当 w1 x1 + w2 x2 + b 大于等于 0 时输出为 1，否则为 0。加权和等于 0 的所有解在二维平面上构成一条直线，感知机学习算法本质上是在平移和旋转该直线。其权重更新规则极为简洁：当预测错误时，将学习率乘误差乘输入加到权重上，并将误差加到偏置上；当预测正确时误差为 0，参数保持不变。在线性可分的数据集上，该算法必然能收敛找到分离超平面。而 XOR 数据集非线性可分，因此权重会陷入永无止境的死循环震荡。课程实验在 1000 个 epoch 训练后明确输出了未收敛的报告。

### 最小的网络架构改造

异或在布尔代数上等价于 (x1 OR x2) AND NOT (x1 AND x2)。由分布在两层中的三个感知机即可精确实现：

```text
OR neuron:    weights [1.0, 1.0],   bias -0.5
NAND neuron:  weights [-1.0, -1.0], bias 1.5
AND neuron:   weights [1.0, 1.0],   bias -1.5   on the two hidden outputs
```

隐藏层的第一层将二维输入的 4 个原始点非线性映射到了全新的特征空间。在该隐藏特征空间中，正负两类样本变成了线性可分的分布，末层神经元只需画出一条直线即可完成分类。

### 从人工硬编码到梯度反向传播学习

阶跃函数没有可用的梯度，因此阶跃感知机的隐藏层权重无法通过反向传播学习。将其替换为平滑可微的 Sigmoid 激活函数后，相同的 2-2-1 架构便能直接从纯随机初始权重出发，通过梯度下降自发学会 XOR。多层网络课程展示了手工配置权重的 Sigmoid 异或版本（权重取 20 和 -20，偏置取 -10、30 和 -30，大权重使得 Sigmoid 呈现极其陡峭的近似阶跃形态）。这正是历史单层感知机跨越到现代深度神经网络的关键转折点。

## Follow-ups

- **Level 1:** 当感知机的预测正确时，其更新法则会做什么操作？ Expected: 误差为 0，因此权重和偏置保持不变，不发生任何更新。
- **Level 2:** 为什么阶跃激活函数阻碍了双层网络通过梯度学习？ Expected: 阶跃函数除了在零点不可导外其余区域导数恒为零，反向传播无法将误差责任传导至隐藏层；平滑的 Sigmoid 处处有梯度。
- **Level 2:** 为什么在 Sigmoid 版本的异或网络中手工设置 20 与 -20 的大权重能够生效？ Expected: 大权重使 Sigmoid 表现得像阶跃函数，因此每个隐藏神经元都近似明确的 OR 门或 NAND 门。
- **Level 3:** 三输入的多数表决函数（Majority function）是线性可分的吗？ Expected: 是线性可分的；当三个输入中至少有两个为 1 时输出 1，在三维空间中构成半空间，单个感知机即可完全拟合。

## Wrong answers

- "继续加大训练轮数或调大学习率即可解决收敛问题。" 在二维平面上没有任何直线能分离异或的四个点，无论训练多少个 epoch 都注定徒劳。
- "在同一个单层中增加更多输入或更多并排神经元。" 没有隐藏层深度，单个输出神经元依然只能在原始平面上切出单条直线。
- "增加一个不带任何激活函数的纯线性隐藏层。" 两个线性层复合后在数学上依然等价于单层线性映射，依然只能画出一条直线；隐藏层必须引入非线性激活。

## Taught in

[感知机课程](../../../phases/03-deep-learning-core/01-the-perceptron/)展示了异或问题的不可分失效并给出了三门解决方案，[多层神经网络课程](../../../phases/03-deep-learning-core/02-multi-layer-networks/)构建了基于平滑 Sigmoid 的可训练异或网络。
