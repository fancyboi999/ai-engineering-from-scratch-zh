---
id: train-mode-and-eval-mode
title: 权重相同，测试准确率却在变化
card: deep-learning
kind: concept
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, inference-engineer]
rounds: [screen, debugging]
tags: [dropout, batch-norm, eval-mode, inference]
minutes: 5
lessons: [phases/03-deep-learning-core/07-regularization, phases/03-deep-learning-core/10-mini-framework]
manuals: []
practice: [inverted-dropout, batch-norm]
cheatsheet: [deep-learning-training]
related: [deep-learning/inverted-dropout-scale, deep-learning/layernorm-not-batchnorm]
updated: 2026-11-03
---

一个已保存的模型在完全相同的权重以及未被打乱（不带 shuffle）的同一个测试集上，每次运行评测得出的测试准确率均不相同。最可能的根因是什么？具体涉及哪两种层类型？

## Short answer

在测试推理阶段模型依然处于训练模式。Dropout 持续随机置零神经元，导致每次前向传播运行的实际上是不同的随机子网络；而批归一化持续使用当前测试批次的均值与方差，而非训练阶段维护的全局滑动统计量。推理前必须切换至评估模式并关闭梯度跟踪计算。

## Full answer

### 随模式切换呈现不同行为的两种层

| 层类型 | 训练模式（Training mode） | 评估模式（Evaluation mode） |
|---|---|---|
| Dropout | 按概率 p 随机置零神经元，其余元素除以 (1 - p) | 直接原样透传所有激活值，不改变张量 |
| 批归一化（BatchNorm） | 使用当前输入批次的均值与方差归一化，更新滑动统计量 | 使用训练期记录积累的全局滑动均值与方差归一化 |

这两种层均依赖同一个状态开关：模块内部的 training 标识。在微型框架中，Sequential 容器的 train 与 eval 方法会在容器及其内部的所有模块上设置该标识。主流框架同样调用 model.train() 与 model.eval() 做到这一点。

### 为什么评测准确率会发生随机波动

当 Dropout 保持激活时，每次前向传播都会重新随机抽样生成一份全新的随机掩码，导致相同输入产生不同输出，部分临界样本的预测概率会在分类阈值两侧反复横跳。当批归一化使用当前测试批次统计量时，每个样本的预测结果受同批次中其他样本的影响，且若测试批次大小为 1，批次方差为零会导致归一化彻底失效失真。课程将遗漏调用 eval 评为深度学习中最普遍的典型低级失误之一，而评测准确率无法复现正是其标志性症状。

### 修复方案与其镜像失误

推理前调用 eval，并用 no_grad 包裹该次运行，这还能节省内存。然后在下一个 epoch 之前再次调用 train。其镜像失误同样常见：在验证后留在评估模式的模型，在训练时关闭了 dropout，并且冻结了批归一化的滑动平均，因此失去了正则化约束，其推理统计量也会过时。

## Follow-ups

- **Level 1:** Dropout 层在评估模式下执行什么操作？ Expected: 不做任何处理；直接原样透传所有输入值，因为缩放已在训练期间完成。
- **Level 2:** 为什么在测试推理阶段批大小为 1 时批归一化无法使用当前批次统计量？ Expected: 单个样本的方差为零，统计量没有意义；必须使用训练期维护的全局滑动均值与方差。
- **Level 2:** 神经网络容器是如何将模式状态下发给内部各个子模块的？ Expected: 容器的 train 与 eval 方法会设置容器自身及其内部所有模块的状态标识。
- **Level 3:** 在验证结束后忘记切回训练模式，接下来的训练会发生什么？ Expected: Dropout 保持关闭且 BatchNorm 滑动统计量停止更新，模型在没有正则化的情况下训练，推理统计量也会过时。

## Wrong answers

- "在每次评测前手动固定一个随机数种子即可解决。" 这只是掩盖了症状；模型仍在启用 Dropout 和批次统计量的状态下评估，准确率依然错误，只是每次都重复同样的错误。
- "这是由 GPU 浮点计算的非确定性（nondeterminism）引起的正常现象。" 硬件浮点误差引起的微小波动远不足以导致分类结果频繁跳跃并改变宏观准确率。
- "直接从模型架构中将 Dropout 层彻底剔除。" Dropout 是训练期的核心正则化技术；正确的工程做法是遵循规范切换运行模式，而不是删除网络层。

## Taught in

[正则化课程](../../../phases/03-deep-learning-core/07-regularization/)构建了这两种层在两种模式下的完整逻辑，[微型框架课程](../../../phases/03-deep-learning-core/10-mini-framework/)将 training 模式标识添加到了所有模块基类中。
