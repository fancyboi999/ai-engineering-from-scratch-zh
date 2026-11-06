---
id: kaiming-factor-of-two
title: Kaiming 初始化里的 2 从哪里来
card: deep-learning
kind: concept
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [ml-depth, screen]
tags: [weight-initialization, kaiming, xavier, variance]
minutes: 8
lessons: [phases/03-deep-learning-core/08-weight-initialization]
manuals: []
practice: []
cheatsheet: [deep-learning-training]
related: [deep-learning/zero-init-symmetry, deep-learning/residual-scaling-deep-transformer]
updated: 2026-11-03
---

Xavier 初始化把权重方差设为 2 除以 fan in 与 fan out 之和。Kaiming 初始化把它设为 2 除以 fan in。两者都叫作方差保持。解释它们各自保持的是什么，Kaiming 里的 2 从哪里来，以及一个从普通标准正态分布开始的 50 层 ReLU 网络会发生什么。

## Short answer

一层的预激活方差等于 fan in 乘以权重方差再乘以输入方差，所以权重方差取 1 除以 fan in，信号大小在线性层中保持不变。Xavier 在前向和反向之间平衡这个条件，得到 2 除以两个 fan 之和，适合在零附近接近线性的 sigmoid 和 tanh。ReLU 把一半的输入置零，每层把方差减半，所以 Kaiming 把每个权重的方差加倍到 2 除以 fan in 来补偿。fan in 为 512 时，标准正态分布每层都把方差乘以 512，信号几层之内就会爆炸。

## Full answer

### 经过一层的方差

z 是 fan in 项 w_i x_i 之和，权重和输入彼此独立：

```text
Var(z) = fan_in * Var(w) * Var(x)
```

课里的两种失败由此直接得出。Var(w) 为 1、fan in 为 512 时，每层把方差乘以 512，10 层之后系数是 512 的十次方，约为 1.2 乘以 10 的 27 次方。Var(w) 为 0.001 时，每层的系数是 0.512，10 层之后信号只剩原来的 0.00013。目标是让 Var(z) 等于 Var(x)。

### Xavier

Glorot 和 Bengio 要求两个方向的方差都保持不变：前向经过 fan in，反向经过 fan out。折中的结果是 Var(w) 等于 2 除以 (fan in 加 fan out)，抽样时用这个方差的正态分布，或者用上下限为 6 除以同一个和再开平方的均匀分布。它适用于 sigmoid 和 tanh，因为在尺度合适的初始化下，它们的输入位于零附近的近似线性区域。

### Kaiming

ReLU 把每个负的预激活置零。平均有一半单元关闭，所以传到下一层的方差只有线性分析预测的一半。何恺明等人把权重方差加倍来抵消它：Var(w) 等于 2 除以 fan in。没有这个 2，信号每层缩小约 0.5，50 层之后是 0.5 的 50 次方，约为 8.8 乘以 10 的负 16 次方。GELU 和 Swish 用同样的规则。框架里的线性层默认用 Kaiming 均匀抽样，所以浅层网络不用考虑它也能训练。

### 检查

把随机输入送进未训练的网络，记录每层激活值的平均幅度。课里的实验在第 1、5、10、25 和 50 层打印它：标准正态分布会爆炸，标准差为 0.01 的正态分布会消失，Xavier 配 sigmoid、Kaiming 配 ReLU 都能到第 50 层仍保持在 1.0 附近。

## Follow-ups

- **Level 2:** 零初始化的方差保持不变，为什么还是会失败？ Expected: 每个神经元计算同一个函数、得到同样的梯度，这一层实际上只有一个神经元；随机权重打破了这种对称性。
- **Level 3:** GELU 配哪种初始化？ Expected: Kaiming，和 ReLU 一样。
- **Level 3:** 不训练，怎样验证一个初始化？ Expected: 把随机数据送进网络，记录每层的平均激活幅度；它在每个深度都应保持在一个范围内，比如 0.5 到 2.0。
- **Level 4:** 残差网络为什么在 Kaiming 之外还需要额外的缩放？ Expected: 每次残差相加都会增加方差，残差流随层数增长；GPT-2 的方案把残差权重乘以 1 除以 2N 的平方根。

## Wrong answers

- "随机就是随机，只要够小，尺度无所谓。" 太小会消失，太大会爆炸；课里两种都演示了，50 层时余量很小。
- "Xavier 也适用于 ReLU，差别不大。" Xavier 把 ReLU 需要的方差低估了一半，50 层之后信号降到约 8.8 乘以 10 的负 16 次方。
- "Kaiming 的 2 代表前向和反向两遍。" 这个 2 补偿的是 ReLU 把一半激活值置零；平衡两遍的是 Xavier 的 2。

## Taught in

[权重初始化课](../../../phases/03-deep-learning-core/08-weight-initialization/)推导了两个公式，并运行了 50 层的实验。
