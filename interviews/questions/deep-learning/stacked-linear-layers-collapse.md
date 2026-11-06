---
id: stacked-linear-layers-collapse
title: 没有激活函数的十层网络退化为单层网络
card: deep-learning
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [screen, ml-breadth]
tags: [activation-functions, nonlinearity, linear-layers, depth]
minutes: 5
lessons: [phases/03-deep-learning-core/04-activation-functions]
manuals: []
practice: []
cheatsheet: [neural-net-basics]
related: [deep-learning/xor-needs-a-hidden-layer, deep-learning/sigmoid-gradient-after-ten-layers]
updated: 2026-11-03
---

一位初级工程师为了提升运行速度，将一个 10 层网络中的所有激活函数全部删除，并汇报称模型依然能正常训练且损失还在稳步下降。他实际构建出了什么？为什么该模型在 XOR 异或问题或螺旋（spiral）数据集上注定彻底失效？

## Short answer

两个线性层复合后依然是一个线性层：W2 (W1 x + b1) + b2 等于 (W2 W1) x + (W2 b1 + b2)，可以合并为一个单矩阵和一个单偏置。十个无激活函数的线性层在数学上完全等价于带有冗余参数的单个线性层，其决策边界依然是单个超平面。XOR 问题或螺旋数据集需要弯曲复杂的非线性边界，因此无论网络扩展得多么宽或深，该模型都绝对无法拟合它们。

## Full answer

### 矩阵乘法的复合代数特性

```text
h = W1 x + b1
y = W2 h + b2 = W2 W1 x + W2 b1 + b2 = A x + c
```

矩阵乘法具有可复合性，因此线性映射的线性映射依然是线性映射。通过反复代入展开，十个连续的线性层在代数上完全塌缩为一个等效权重矩阵 A 和一个等效偏置向量 c。缺乏非线性激活函数的网络深度只是一种幻觉：该模型只具备单层线性感知机的表达容量，但却徒增了成倍的计算与参数开销。

### 激活函数带来的本质改变

在层与层之间插入非线性激活函数 g，使得隐藏层状态为 h = g(W1 x + b1)。此时代数塌缩被彻底打破，因为 W2 g(W1 x + b1) + b2 无法化简为 A x + c。每一次带有非线性激活的深层堆叠都真正扩展了函数的假设表征空间。这正是深度神经网络能够扭曲特征空间、围绕螺旋缠绕出复杂边界、或成功分离 XOR 点集的根本源泉。

### 应该如何规范补齐激活函数

课程给出的标准默认配置：全连接 MLP 或卷积 CNN 首选 ReLU，Transformer 架构首选 GELU，循环神经网络 RNN 内部单元采用 Tanh。输出层是唯一允许不带激活函数的例外位置：回归任务直接输出任意实数，二分类任务输出层接入 Sigmoid，多分类任务输出层接入 Softmax。

### 为什么损失依然能够在训练中下降

多层线性网络依然能够通过梯度下降拟合出数据集的最佳线性超平面。在 XOR 或螺旋数据上，最佳线性拟合虽然准确率接近瞎猜，但其误差表现依然优于纯粹的随机初始权重，因此损失曲线会有所下降。损失下降丝毫不能证明模型具备拟合非线性目标的能力。

## Follow-ups

- **Level 1:** 整个网络中哪一层允许不加激活函数？ Expected: 回归模型的输出层，该层必须有能力输出任意实数。
- **Level 2:** 这个深层纯线性网络的训练速度是否比单层网络更快？ Expected: 不会；它计算的是完全相同的线性函数，却耗费了多倍的参数量与矩阵乘法计算。
- **Level 2:** 在全连接 MLP 和 Transformer 中，你应该分别添加哪种默认激活函数？ Expected: MLP 默认添加 ReLU，Transformer 默认添加 GELU。
- **Level 3:** 为什么这种线性塌缩不能反向证明网络深度是无用的？ Expected: 只要层间引入非线性激活，线性塌缩即被打破，每一层都会增加表达能力；深层网络可以用少得多的参数拟合浅层极宽网络才能拟合的函数。

## Wrong answers

- "十层网络比单层更深，因此一定能学到更高级的抽象特征。" 没有非线性激活，多层矩阵的连乘在数学上等价于单矩阵；深度在此处不增加任何表征容量。
- "带有偏置向量 b 就已经是具有非线性的了。" 偏置仅仅平移了超平面在空间中的位置，完全无法弯曲超平面本身。
- "既然训练损失能够正常下降，说明网络学得很好。" 模型只是找到了数据的最佳线性逼近；对于 XOR 或螺旋数据，最佳线性拟合的表现接近随机水平。

## Taught in

[激活函数课程](../../../phases/03-deep-learning-core/04-activation-functions/)严格证明了纯线性层的代数塌缩现象，并为各类深度学习架构给出了默认激活函数选型方案。
