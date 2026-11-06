---
id: loss-shift-flatten
title: 损失降到零却什么也没学到的训练
card: coding
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, debugging]
tags: [cross-entropy, loss-alignment, training-loop]
minutes: 8
lessons: [phases/19-capstone-projects/36-training-loop-eval]
manuals: []
practice: [softmax-cross-entropy]
cheatsheet: [gpt-from-scratch-training]
related: [coding/softmax-shift-max, coding/bigram-beats-unigram]
updated: 2026-11-03
---

一位同事说，他们的语言模型在训练很早期损失就接近零，生成的样本却是乱码。batch 代码如下：

```python
def calc_loss_batch(model, tokens):
    logits = model(tokens)
    return cross_entropy(logits.reshape(-1, logits.shape[-1]), tokens.reshape(-1))
```

哪里出错了？正确的版本是什么样？

## Short answer

目标就是输入，所以模型学会的是预测刚拿到的那个 token，这件事很平凡，损失收敛到零，却什么也没学到。位置 `t` 的目标必须是位置 `t + 1` 的输入。对输入切片去掉最后一个 token，对目标切片去掉第一个 token，再把两者分别展平成 batch 乘 time 再乘词表，以及 batch 乘 time。

## Full answer

### 对齐

对输入 token `t0, t1, t2, t3`，目标是 `t1, t2, t3, t4`。每个位置都预测下一个 token，所以一个训练样本要覆盖上下文长度再加一个原始 id。可以由 batch 生成器直接产出已经错开的两个张量，也可以由损失函数来错开：

```python
def calc_loss_batch(model, inputs, targets):
    logits = model(inputs)
    V = logits.shape[-1]
    return cross_entropy(logits.reshape(-1, V), targets.reshape(-1))
```

其中 `inputs = window[:-1]`，`targets = window[1:]`。

### 为什么要展平

交叉熵接收一个行乘类别的矩阵和一个类别 id 向量。把 batch 和 time 展平成一个轴，三维的 logits 就成了这个矩阵，二维的目标就成了这个向量，对行取均值就是对每个预测位置取均值。展平不是 bug；缺少错位才是。

### 为什么症状是损失接近零

用当前 token 预测当前 token，只需要经过嵌入和输出头的一个恒等映射，共享权重的输出头直接就能提供。损失塌缩，评估损失也塌缩，只有看生成样本才能发现什么都没学到。所以训练循环在每个探针步都会打印一段生成的续写，而不只是两个损失。

### 数值方面

练习还检查交叉熵是否用平移后的 softmax 计算，避免大 logits 溢出，以及损失是对样本取均值而不是求和。

## Follow-ups

- **Level 2:** 训练循环里哪个信号最先发现这个 bug？ Expected: 探针步生成的样本；两个损失看起来都很好。
- **Level 2:** 验证损失也接近零。为什么留出数据没发现？ Expected: 目标泄漏在损失定义里，两个切分用的是同一个定义。
- **Level 3:** 滑动窗口数据集怎样从源头避免这个问题？ Expected: 它返回长度为上下文长度加一的窗口，并在数据集内部拆成输入和目标，循环永远看不到没有错开的配对。
- **Level 3:** 你的监督微调数据会遮住指令 token。这个掩码相对错位放在哪里？ Expected: 放在错位之后，让被忽略的位置和错开后的目标对齐。

## Wrong answers

- "学习率太高。" 学习率太高会发散或震荡；损失塌缩到零说明目标函数有泄漏。
- "展平把 batch 轴和 time 轴混在了一起。" 展平是必需的；每一行都是独立的预测，顺序不影响均值。
- "模型过拟合了训练集。" 过拟合表现为训练损失和验证损失之间有差距；这里两者都塌缩了。

## Taught in

[训练循环课](../../../phases/19-capstone-projects/36-training-loop-eval/)解释了损失对齐和定性探针，[softmax 与交叉熵练习](../../../practice/softmax-cross-entropy/)检查 batch 损失。
