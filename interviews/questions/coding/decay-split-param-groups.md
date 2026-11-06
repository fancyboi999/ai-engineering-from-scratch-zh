---
id: decay-split-param-groups
title: 哪些参数该做权重衰减
card: coding
kind: code-reading
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [adamw, weight-decay, parameter-groups, layernorm]
minutes: 10
lessons: [phases/19-capstone-projects/36-training-loop-eval]
manuals: []
practice: [adam-step]
cheatsheet: [optimizers-schedules, gpt-from-scratch-training]
related: [coding/adamw-decoupled-decay, coding/rmsnorm-vs-layernorm]
updated: 2026-11-03
---

一次训练在最初几千步看起来正常，之后损失开始上升，生成的样本变差。优化器只用了一个参数组：

```python
optimizer = AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
```

写一个正确构建参数组的函数，并解释哪些张量必须排除在衰减之外，以及原因。

## Short answer

衰减只加在矩阵形状的张量上，也就是线性层权重和嵌入表，不加在归一化缩放系数和偏置上。被衰减的 LayerNorm 缩放系数会在几千步里逐渐趋向零，直到归一化失效，这和训练后期才出问题的现象一致。按形状把参数分成衰减组和不衰减组，两组都传给优化器。

## Full answer

### 分组

```python
def build_param_groups(model, weight_decay):
    decay, no_decay = [], []
    for name, p in model.named_parameters():
        if not p.requires_grad:
            continue
        (decay if p.dim() >= 2 else no_decay).append(p)
    return [
        {"params": decay, "weight_decay": weight_decay},
        {"params": no_decay, "weight_decay": 0},
    ]
```

二维及以上的张量是权重矩阵或嵌入表。一维张量是缩放或平移，包括 LayerNorm 参数和所有偏置。按维度分组的规则很简单，也和标准配方一致。

### 为什么衰减缩放系数有害

权重衰减每一步都把被衰减的参数拉向零。线性层权重在很多方向上都有梯度压力，这个拉力起到正则化作用。LayerNorm 缩放系数只负责一件事：设定归一化后激活值的幅度。持续把它拉向零，会缩小每个块的残差流，直到信号小到后面的层没法用。这个效应累积得很慢，所以训练一开始看起来没问题。

### 为什么衰减偏置是浪费

衰减偏置在数学上无害，但会把更新花在正则化不需要控制的参数上。分组时它和缩放系数一起被排除。

### 怎样测试分组

单元测试可以遍历具名参数，断言每个缩放系数和偏置都在不衰减组，每个线性层权重和嵌入权重都在衰减组。循环课把这个测试列为第一道练习。

## Follow-ups

- **Level 3:** 语言模型的输出头和 token 嵌入共享权重。它在哪个组？出现几次？ Expected: 只出现一次，在衰减组，因为它和嵌入表是同一个张量。
- **Level 3:** 模型用 RMSNorm 代替 LayerNorm。规则要变吗？ Expected: 不变；RMSNorm 的权重是一维的，留在衰减组之外。
- **Level 4:** 为什么问题出现在训练后期，而不是一开始？ Expected: 衰减每步只把缩放系数缩小一小部分，损害要累积几千步，激活值才会变得太小。

## Wrong answers

- "按定义，权重衰减作用于所有权重。" 标准配方排除了归一化张量和偏置张量；处处都加衰减，久而久之会破坏归一化。
- "按参数名判断，排除所有叫 bias 的参数。" 不同实现的命名不一样；按维度判断更可靠。
- "把权重衰减调小，直到训练稳定。" 调小只会减慢漂移，缩放系数仍然被拉向零。

## Taught in

[训练循环课](../../../phases/19-capstone-projects/36-training-loop-eval/)定义了 AdamW 的两组划分和对应的测试，[Adam 练习](../../../practice/adam-step/)实现了这些参数组所用的解耦衰减。
