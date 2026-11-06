---
id: softmax-shift-max
title: softmax 为什么先减去行最大值
card: coding
kind: code-reading
level: 1
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, screen]
tags: [softmax, numerical-stability, numpy]
minutes: 6
lessons: [phases/07-transformers-deep-dive/02-self-attention-from-scratch]
manuals: []
practice: [softmax-cross-entropy]
cheatsheet: [transformers-attention]
related: [coding/loss-shift-flatten, coding/scale-by-sqrt-dk]
updated: 2026-11-03
---

一位候选人为一批 logits 写了这个 softmax，小输入上测试都通过，到了真实的注意力行却返回 NaN：

```python
def softmax(x):
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)
```

哪里错了？怎样修？为什么修复不改变结果？

## Short answer

大的 logit 会让指数溢出成无穷大，无穷大除以无穷大得到 NaN。在取指数之前先减去每一行的最大值。一行的每个元素都减去同一个常数，softmax 结果不变，因为这个常数在分子和分母之间抵消了。

## Full answer

### 故障

注意力分数和语言模型的 logits 可以到几十甚至几百。这么大的值取指数后放不进浮点数，这一行变成无穷大，除法得到 NaN。小的测试输入永远暴露不了它。

### 修复

```python
def softmax(x):
    shifted = x - np.max(x, axis=-1, keepdims=True)
    e = np.exp(shifted)
    return e / e.sum(axis=-1, keepdims=True)
```

平移之后，每行最大的元素是零，所以最大的指数是一，不会溢出。远低于最大值的元素下溢成零，这正是正确的极限值。

### 为什么结果一样

一行的 softmax 用每个元素的指数除以这一行所有指数之和。减去一个常数等于把每个指数乘以同一个系数，这个系数在比值里抵消了。平移必须按行、在最后一个轴上做。在整个 batch 上取一个最大值不影响正确性，但一个值很大的行会把其他所有行推到下溢。

### 还有两个容易出错的细节

- 用 `keepdims=True` 保留维度，减法才会沿行广播，而不是沿 batch 广播。
- 调用方还需要 logits 时，不要原地做减法。

## Follow-ups

- **Level 1:** 同样的平移在注意力里出现在哪里？ Expected: 在缩放后分数的 softmax 里，所以注意力课先写的就是平移版本。
- **Level 2:** 为什么在整个 batch 上取全局最大值是 bug？ Expected: 一行里有一个很大的 logit，其他行都会被平移到远低于零，这些行下溢成全零，然后除以零。
- **Level 2:** 练习还要求求平均交叉熵的梯度。它是什么？ Expected: softmax 减去 one-hot 目标，再除以 batch 大小。

## Wrong answers

- "把 logits 截到一个安全范围。" 截断会改变分布；平移不会。
- "换成 float64 问题就没了。" 它只是移动了阈值，长行里的注意力分数仍然会溢出。
- "减均值而不是最大值。" 均值限制不住最大的元素，一行仍然可能溢出。

## Taught in

[自注意力课](../../../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)第一步就构建平移版 softmax，[softmax 与交叉熵练习](../../../practice/softmax-cross-entropy/)用很大的 logits 检查它。
