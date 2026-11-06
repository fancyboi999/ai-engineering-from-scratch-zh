---
id: dropout-off-at-eval
title: 评估时仍在起作用的 dropout
card: coding
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [coding, debugging]
tags: [dropout, evaluation, training-loop]
minutes: 8
lessons: [phases/19-capstone-projects/36-training-loop-eval, phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [inverted-dropout]
cheatsheet: [deep-learning-training]
related: [coding/loss-shift-flatten]
updated: 2026-11-03
---

在同一个检查点、同一组固定验证 batch 上跑两次评估，报告的损失不一样。dropout 层是这样写的：

```python
def dropout_forward(x, p, rng, training):
    mask = rng.random(x.shape) >= p
    if training:
        return x * mask / (1 - p), mask
    return x * (1 - p), mask
```

找出推理路径上的所有问题，并说明评估函数期望它怎样表现。

## Short answer

反向 dropout 在训练时放大保留的单元，这样推理时就是恒等变换；但这条推理路径把输入乘以一减 p，这属于非反向形式，会缩小每个激活值。它还在推理模式下从生成器取随机数，改变了这次运行之后的每个随机数，例如下一个训练掩码和下一个探针样本。推理必须原样返回输入，并且不能动生成器。

## Full answer

### 两个 bug

1. 推理时缩放。反向 dropout 在训练时除以一减 p，所以激活值的期望已经和没有 dropout 时一致。推理时再缩放一次，在比率为二分之一时信号会减半，之后的每一层都会受影响。
2. 推理时取随机数。掩码在分支之前采样。评估消耗了随机数，所以探针之后的生成采样，以及之后的任何训练步，看到的随机数流都和没有探针的运行不同。

### 修复

```python
def dropout_forward(x, p, rng, training):
    if not training:
        return x.copy(), np.ones(x.shape, dtype=bool)
    mask = rng.random(x.shape) >= p
    return x * mask / (1 - p), mask
```

推理时，这一层返回输入的副本和一个全为真的掩码，不取随机数。随机数大于等于 p 时保留该元素，这样取补的规则才对；保留的元素除以一减 p。反向传播把传入的梯度乘以同一个掩码，再除以同一个系数。

### 评估期望什么

训练循环的评估函数在不算梯度、不开 dropout 的情况下跑固定数量的验证 batch；给定相同的种子和切分，结果必须能在多次运行之间复现。这一遍里模型内部只要有随机性，两次运行的比较就失效，因为差异衡量的是随机数流，而不是模型。组装课里的模型在嵌入上有 0.1 的 dropout，所以每次评估都会经过这一层。

## Follow-ups

- **Level 2:** 训练时为什么要除以一减 p？ Expected: 让每个激活值在有掩码和无掩码时期望相同，推理就成了恒等变换。
- **Level 2:** 反向传播为什么必须用同一个掩码？ Expected: 梯度只能以相同的缩放流过被保留的单元，否则梯度和前向计算对不上。
- **Level 3:** 评估已经可复现，但结果仍和跳过探针的运行不同。还有什么在取随机数？ Expected: 探针那一步的采样生成会从共享生成器取随机数；给探针一个单独的生成器。

## Wrong answers

- "像最初的 dropout 论文那样，在推理时缩小。" 那种形式训练时不缩放；两种形式混用会让激活值变小。
- "每次评估前重新设置生成器的种子。" 这能掩盖多取的随机数，但之后的训练随机数流仍然会变；推理路径根本不应该取随机数。
- "随机数小于 p 时保留该元素。" 这样保留的是比例 p，其余都丢掉，正好是目标掩码的补集。

## Taught in

[训练循环课](../../../phases/19-capstone-projects/36-training-loop-eval/)要求评估跳过梯度和 dropout，[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)设置了嵌入 dropout，[反向 dropout 练习](../../../practice/inverted-dropout/)检查推理时的恒等变换。
