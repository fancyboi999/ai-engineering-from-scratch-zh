---
id: adamw-decoupled-decay
title: 混进梯度的权重衰减
card: coding
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [adamw, weight-decay, optimizer]
minutes: 10
lessons: [phases/19-capstone-projects/36-training-loop-eval, phases/19-capstone-projects/44-cosine-lr-warmup]
manuals: []
practice: [adam-step]
cheatsheet: [optimizers-schedules]
related: [coding/decay-split-param-groups, coding/lr-peak-sweep]
updated: 2026-11-03
---

一段手写的优化器单步更新被标成了 AdamW。请审查它：

```python
def adam_step(params, grad, m, v, t, lr, beta1, beta2, eps, weight_decay):
    grad = grad + weight_decay * params
    m = beta1 * m + (1 - beta1) * grad
    v = beta2 * v + (1 - beta2) * grad * grad
    m_hat = m / (1 - beta1 ** t)
    v_hat = v / (1 - beta2 ** t)
    return params - lr * m_hat / (np.sqrt(v_hat) + eps), m, v
```

这是 AdamW 吗？要改什么？这个区别为什么对语言模型重要？

## Short answer

不是，这是把 L2 惩罚并进梯度的 Adam。AdamW 在自适应步之外直接对参数做衰减，衰减量乘以学习率。惩罚走梯度时会被二阶矩估计除掉，梯度大的参数几乎得不到衰减，整个模型的正则化强度因此不均匀。

## Full answer

### 修正后的单步更新

```python
def adam_step(params, grad, m, v, t, lr, beta1, beta2, eps, weight_decay):
    m = beta1 * m + (1 - beta1) * grad
    v = beta2 * v + (1 - beta2) * grad * grad
    m_hat = m / (1 - beta1 ** t)
    v_hat = v / (1 - beta2 ** t)
    new = params - lr * (m_hat / (np.sqrt(v_hat) + eps) + weight_decay * params)
    return new, m, v
```

衰减项加在更新量上，不加在梯度上。它从不经过矩估计。

### 这个区别改变了什么

Adam 用每个坐标的历史梯度幅度对它做归一化。惩罚作为梯度的一部分进入时也会被归一化：梯度大且噪声大的权重几乎不衰减，梯度很小的权重反而被大幅衰减。解耦衰减让每个权重每步按相同比例收缩，这才是正则项的本意。语言模型的训练配方都用解耦形式，训练课里的循环也围绕它来划分参数组。

### 练习还锁定了三个细节

- 步数计数器从 1 开始。用 `t = 0` 时偏差校正会除以零；用 `t + 1` 时第一步会按第二步计算。
- epsilon 放在平方根外面。放进根号里，小梯度得到的步长会比预期小得多。
- 函数返回新的状态数组。原地更新 `m` 和 `v` 会改掉调用方的状态，检查点恢复也会出错。

### 衰减不该加在哪里

即使形式正确，衰减也只该加在矩阵形状的权重上。归一化层的缩放系数和偏置不做衰减，这是参数组划分要处理的问题。

## Follow-ups

- **Level 2:** 偏差校正在最初几步修正了什么？ Expected: 矩估计从零开始，早期偏低；除以 `1 - beta**t` 把它们放大回正确尺度。
- **Level 2:** 为什么返回新数组，而不是原地更新？ Expected: 纯函数不改调用方的状态，一步可以重试或对比，检查点也保持一致。
- **Level 3:** 学习率调度和解耦衰减怎样相互作用？ Expected: 衰减量要乘以当前学习率，所以预热和余弦衰减也会在训练过程中同步缩放正则化强度。

## Wrong answers

- "L2 和权重衰减是一回事。" 两者只在普通梯度下降里等价，在会归一化梯度的自适应优化器里不等价。
- "为了数值稳定，把 epsilon 放进平方根里。" 这会改变小梯度时的步长；参考实现在开方之后再加 epsilon。
- "像数组下标一样，步数计数器从 0 开始。" 这样第一步的偏差校正会除以零。

## Taught in

[训练循环课](../../../phases/19-capstone-projects/36-training-loop-eval/)配置了带衰减分组的 AdamW，[余弦调度课](../../../phases/19-capstone-projects/44-cosine-lr-warmup/)把它和预热、衰减配合使用，[Adam 练习](../../../practice/adam-step/)检查解耦形式。
