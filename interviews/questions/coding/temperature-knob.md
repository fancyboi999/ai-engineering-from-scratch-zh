---
id: temperature-knob
title: 温度对采样做了什么
card: coding
kind: concept
level: 1
roles: [applied-ai-engineer, inference-engineer, ai-developer-relations-engineer]
rounds: [coding, screen]
tags: [sampling, temperature, generation]
minutes: 6
lessons: [phases/19-capstone-projects/35-gpt-model-assembly]
manuals: []
practice: [lab-sampling-temperature]
cheatsheet: [bert-gpt-t5]
related: [coding/top-k-then-sample, coding/top-p-crossing-token]
updated: 2026-11-03
---

写出把采样温度作用到一个 logits 向量上的那一行代码，再说明温度趋向零、等于一、大于一时，分布分别会怎样变化。

## Short answer

在 softmax 之前用 logits 除以温度。温度接近零时，除法拉大了 logits 之间的差距，最大的那个几乎拿走全部概率质量，采样变成贪心。温度为一时用的是模型自己的分布；温度大于一时差距缩小，分布变平，罕见 token 被抽中的次数变多。

## Full answer

### 这一行

```python
probs = softmax(logits / temperature)
```

在完整的采样器里顺序很重要：生成循环读取最后一个位置的 logits，除以温度，应用 top-k 或 top-p 过滤（如果有），做 softmax，然后抽一个 token。

### 三种区间

| 温度 | 对 logits 间差距的影响 | 表现 |
|---|---|---|
| 趋向零 | 差距无限增大 | argmax；每次都是同一个 token |
| 等于一 | 不变 | 模型的自然分布 |
| 大于一 | 差距缩小 | 分布更平，更多意外，更多错误 |

### 为什么是除法而不是乘法

把 logits 乘以温度，效果和大家预期的相反：数值越高，分布越尖。练习实验里有一个犯了这个错误的变异体，测试首先检查的就是效果的方向。

### 怎样看效果

两个测量能看出温度做了什么：最高 token 的概率，以及分布的熵。温度升高时，最高概率下降，熵上升。在固定的 logits 上扫一遍温度，不用跑模型就能看到这两条曲线。

## Follow-ups

- **Level 1:** 代码里温度为零为什么要特殊处理？ Expected: 会除以零；把它实现成 argmax，而不是做除法。
- **Level 2:** 一个产品要求确定性输出。温度设为零够吗？ Expected: 它去掉了采样的随机性，但平局和不同 batch 之间的数值差异仍可能改变 argmax。
- **Level 2:** 温度和 top-p 截断怎样相互作用？ Expected: 截断必须在温度缩放后的概率上做，否则它是在温度为一时切分布，这个设置的作用就比预期小。

## Wrong answers

- "温度在 softmax 之后缩放概率。" 缩放概率再重新归一化什么也不会改变；除法作用在 logits 上。
- "温度越高，模型越聪明。" 它只是让分布变平，用更多错误换来更少重复。
- "温度为一表示不采样。" 它表示从未经改变的分布中采样；贪心对应温度为零或 argmax。

## Taught in

[GPT 组装课](../../../phases/19-capstone-projects/35-gpt-model-assembly/)在生成循环里描述了三种温度区间，[温度实验](../../../practice/lab-sampling-temperature/)在固定的 logits 上扫描它们。
