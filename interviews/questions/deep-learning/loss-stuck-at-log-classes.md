---
id: loss-stuck-at-log-classes
title: 十分类问题上一直停在 2.3 的损失
card: deep-learning
kind: debug
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [debugging, ml-depth]
tags: [debugging, cross-entropy, data-pipeline, overfit-one-batch]
minutes: 12
lessons: [phases/03-deep-learning-core/13-debugging-neural-networks, phases/03-deep-learning-core/05-loss-functions]
manuals: []
practice: []
cheatsheet: [nn-debugging]
related: [deep-learning/overfit-one-batch-first, deep-learning/mse-predicts-half-for-everything]
updated: 2026-11-03
---

一个十分类模型训练了很多个 epoch，交叉熵损失在训练数据和验证数据上一直停在 2.3 左右。没有任何崩溃。这个数字告诉你什么？你按什么顺序调试？

## Short answer

十分之一的自然对数取负约为 2.3，这是给每个类别相同概率的模型的损失，课里的表格把停在这里的损失解读为均匀预测、没有可用信号。只看均值说明不了原因。先做单 batch 过拟合测试：失败说明问题在损失、反向传播、优化器挂接或标签错位；通过的话就去数据路径检查标签和输入是否对齐。之后才去看学习率、梯度和架构。

## Full answer

### 读懂这个数

在 one-hot 目标上，分类交叉熵就是真实类别概率的负对数。在 10 个类别里随机猜，每个类别概率为 0.1，损失为负 log 0.1，约 2.3。调试课的总表里有这一行：损失停在负 log(1 除以类别数) 意味着模型预测均匀分布，首先要检查数据流水线，以及标签是否和输入对应。没有可用信号的模型会停在相等的 logits 上，因为在类别平衡的标签集上，这样做能让期望损失最小。

### 顺序

1. **过拟合一个 batch。** 取 8 到 32 个样本，只在它们上面训练几百步。损失必须降到接近零，训练准确率必须到 100%。做不到，说明模型或循环坏了：损失写错、反向传播断了、优化器没连到参数上，或者输入和标签没对齐。课里的通过标准是最终损失低于 0.1。
2. **看数据。** 打印 5 个随机样本和它们的标签。检查打乱后每个输入仍和它的标签配对，输入被归一化到均值 0、标准差 1，标签是损失期望的整数类型。
3. **学习率。** 试三个相差 10 倍的值，比如 1e-2、1e-3 和 1e-4。学习率太低时曲线看起来平，但不会在很多个 epoch 里正好停在均匀值上。
4. **梯度。** 全为零说明有死掉的 ReLU，或者计算图被断开了。
5. **架构。** 前面都排除之后才看：太小的模型会欠拟合，但在自己的训练数据上仍然能胜过均匀猜测。

### 和起步慢有什么不同

损失从 2.3 附近开始、慢慢下降，是学习率或容量的问题。损失在训练集上很多个 epoch 都停在 2.3，说明根本没有信号到达模型。

## Follow-ups

- **Level 3:** 为什么是均匀分布，而不是别的错误答案？ Expected: 没有可用信号时，相等的 logits 能让类别平衡的标签集上的期望交叉熵最小，代价是类别数的对数。
- **Level 3:** 这里单 batch 过拟合测试能告诉你什么？ Expected: 模型和循环到底能不能学；正常的配置几百步内就能把一个小 batch 的损失降到接近零，失败则说明损失、反向传播、优化器挂接坏了，或者标签错位。
- **Level 4:** 单 batch 测试通过了，完整训练仍然停在 2.3。下一步查哪里？ Expected: 完整的数据路径，比如打乱时破坏了输入和标签的配对，或者输入没有归一化，因为给它一致的 batch 时模型是能学的。
- **Level 4:** 这个症状和损失从 2.3 开始慢慢下降有什么区别？ Expected: 慢慢下降是学习率或容量的问题；很多个 epoch 平在 2.3，说明没有信号到达模型。

## Wrong answers

- "训练久一点，这只是起步慢。" 很多个 epoch 平在均匀损失上，意味着没有信号，而不是信号慢。
- "把模型做大。" 模型在自己的训练数据上连均匀猜测都赢不了时，问题不在容量。
- "降低学习率。" 学习率改变的是损失移动的快慢，而这里损失根本不动；先查数据。

## Taught in

[调试课](../../../phases/03-deep-learning-core/13-debugging-neural-networks/)给出了总表和单 batch 过拟合测试，[损失函数课](../../../phases/03-deep-learning-core/05-loss-functions/)计算了均匀损失。
