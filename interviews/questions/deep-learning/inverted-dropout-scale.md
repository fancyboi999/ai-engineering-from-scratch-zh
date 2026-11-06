---
id: inverted-dropout-scale
title: dropout 掩码为什么存 1 除以 (1 减 p)
card: deep-learning
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [dropout, regularization, backward-pass, eval-mode]
minutes: 8
lessons: [phases/03-deep-learning-core/07-regularization, phases/03-deep-learning-core/10-mini-framework]
manuals: []
practice: [inverted-dropout]
cheatsheet: [deep-learning-training]
related: [deep-learning/train-mode-and-eval-mode, deep-learning/layernorm-not-batchnorm]
updated: 2026-11-03
---

这个 dropout 模块来自一个迷你框架。

```python
class Dropout(Module):
    def __init__(self, p=0.5):
        super().__init__()
        self.p = p
        self.mask = None

    def forward(self, x):
        if not self.training:
            return x
        self.mask = [0.0 if random.random() < self.p else 1.0 / (1 - self.p) for _ in x]
        return [v * m for v, m in zip(x, self.mask)]

    def backward(self, grad):
        if self.mask is None:
            return grad
        return [g * m for g, m in zip(grad, self.mask)]
```

掩码里被保留的元素为什么存 1 除以 (1 减 p)，而不是 1？反向传播为什么复用同一个掩码？如果前向保留 1，把缩放移到评估时做，会有什么变化？

## Short answer

每个单元以概率 p 被置零，所以单元的期望值降到原来的 (1 - p) 倍。训练时把保留的单元除以 (1 - p)，就恢复了这个期望，评估时直接运行普通网络，不用任何改动。反向传播乘以同一个掩码，因为前向就是按单元缩放，缩放的导数就是缩放系数本身。把系数移到评估时也可以，但那样每条推理路径都必须知道 dropout 率。

## Full answer

### 期望的论证

掩码元素以概率 p 为 0，否则为 1 除以 (1 - p)。它的期望是 (1 - p) 乘以 1 除以 (1 - p)，等于 1。所以训练时每个单元的期望输出等于关掉 dropout 时的输出。网络在两种模式下看到相同的尺度，评估路径里完全没有 dropout 代码。课里把这叫作反向 dropout。最初的形式让掩码保持为 1，在测试时乘以 (1 - p)，这就迫使推理代码必须知道 p。

### 反向传播

dropout 是按掩码逐元素缩放。输入的梯度等于输出的梯度乘以同一个掩码：被丢弃的单元得到 0，被保留的单元得到乘以 1 除以 (1 - p) 的梯度。掩码必须来自对应的那次前向，因为反向传播求导的是前向实际运行的函数。换一个新掩码，就会把梯度传给当时关掉的单元，并错误地缩放当时开着的单元。对缺失掩码的保护只覆盖在任何训练前向之前就调用反向的情况。评估分支在改动掩码之前就返回了，所以评估前向之后的反向调用会复用最近一次训练前向的掩码。

### dropout 带来了什么

随机置零单元，让神经元不再依赖某些特定神经元的存在，课里把这种依赖叫作共适应。每个掩码选出一个子网络，所以 N 个单元的网络在训练时从大约 2 的 N 次方个子网络中抽样；评估时用缩放后的期望运行完整网络，一次就把它们平均了。默认比率：transformer 为 0.1，MLP 为 0.5，CNN 为 0.2 到 0.3。p 越高，正则化越强，欠拟合的风险也越大。

## Follow-ups

- **Level 2:** 被丢弃的单元得到什么梯度？ Expected: 零，因为它的掩码元素是 0。
- **Level 2:** 反向为什么必须用同一次前向的掩码？ Expected: 反向传播求导的是前向实际运行的函数；新掩码会错误地缩放活跃单元，并把梯度传给不活跃的单元。
- **Level 3:** 从集成的角度怎样理解 dropout？ Expected: 每个掩码定义一个子网络，训练从大约 2 的 N 次方个子网络中抽样，评估时用缩放后的期望运行完整网络，把它们平均起来。
- **Level 3:** 课里给 transformer 的比率是多少？为什么比 MLP 低？ Expected: 0.1 对 0.5；比率越高正则化越强，欠拟合风险也越大，transformer 的默认值是较轻的那个。

## Wrong answers

- "缩放是为了让输出之和为一。" 它恢复的是每个单元的期望值，不是总和。
- "反向时应该抽一个新掩码，增加探索。" 反向传播求导的是前向实际运行的函数；换一个掩码，得到的是另一个函数的梯度。
- "评估模式下也乘以 (1 - p)。" 用反向 dropout 时缩放已经在训练中做过了；评估时再缩放会让每个激活值变小。

## Taught in

[正则化课](../../../phases/03-deep-learning-core/07-regularization/)推导了反向 dropout，[迷你框架课](../../../phases/03-deep-learning-core/10-mini-framework/)把它写成了这个模块。
