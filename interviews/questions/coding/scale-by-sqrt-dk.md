---
id: scale-by-sqrt-dk
title: 点积注意力里的缩放因子
card: coding
kind: code-reading
level: 1
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, screen, ml-depth]
tags: [attention, scaling, softmax-saturation]
minutes: 6
lessons: [phases/07-transformers-deep-dive/02-self-attention-from-scratch]
manuals: []
practice: [scaled-dot-product-attention]
cheatsheet: [transformers-attention]
related: [coding/softmax-shift-max, coding/causal-mask-off-by-one]
updated: 2026-11-03
---

这是一份课后作业里提交的注意力函数：

```python
def attention(Q, K, V):
    scores = Q @ K.T / Q.shape[-1]
    return softmax(scores) @ V
```

形状测试通过了，注意力权重的测试没通过。找出 bug，并解释正确的因子防的是什么。

## Short answer

分数除以的是 key 的维度，而不是它的平方根。随机向量的点积随维度增长，没有平方根时，softmax 的输入要么太大，使它饱和、梯度消失，要么太小，使每一行都趋于均匀。正确的写法是除以 key 最后一个维度的平方根。

## Full answer

### 修复

```python
def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)
    return softmax(scores) @ V
```

### 为什么是平方根

query 和 key 的各分量方差为一时，它们点积的方差等于维度。所以点积的典型大小是维度的平方根。除以这个大小，分数回到单位尺度，softmax 在这里有可用的梯度。直接除以维度是矫枉过正，每一行都接近均匀，不管 query 是什么，输出几乎都是 value 的均值。

### 这个 bug 的两个近亲

- 完全不缩放：头大小为 64 时，原始分数能到几十，softmax 饱和成 one-hot 行。
- 对带 batch 的张量用 `K.T`：`.T` 会反转所有轴，batch 乘 token 乘特征的形状会变成特征乘 token 乘 batch。尺寸各不相同时 matmul 会报形状错误；尺寸恰好对得上时，它会不报错地把不同 batch 混在一起。只交换最后两个轴。

### 练习怎样检查

练习比较的是权重，不只是输出形状。错误的缩放会改变每一个权重，所以一个参考权重矩阵立刻就能发现它。

## Follow-ups

- **Level 1:** 一个序列的分数是什么形状？ Expected: token 数乘 token 数，每个 query 一行，覆盖所有 key。
- **Level 2:** 因子错了，形状测试为什么还能通过？ Expected: 缩放不改变形状，只改变数值。
- **Level 2:** 对带 batch 的输入，怎样转置 key？ Expected: 只交换最后两个轴，例如用 `swapaxes(-1, -2)`。

## Wrong answers

- "任何常数都行，模型会自己适应。" 训练中学到的投影能补偿一部分，但练习检查的是固定的参考值；在训练好的模型里，错误的因子会改变每一个头。
- "除以序列长度。" 增长来自特征维度，不是 token 数量。
- "缩放只是为了防止数值溢出。" softmax 内部减最大值负责处理溢出；缩放让 softmax 远离饱和区和平坦区。

## Taught in

[自注意力课](../../../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)解释了平方根缩放因子，[注意力练习](../../../practice/scaled-dot-product-attention/)用参考实现核对权重。
