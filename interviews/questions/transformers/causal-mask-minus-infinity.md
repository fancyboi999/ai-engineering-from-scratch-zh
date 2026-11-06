---
id: causal-mask-minus-infinity
title: 负无穷三角从何而来
card: transformers
kind: concept
level: 2
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, coding]
tags: [causal-mask, softmax, decoder, prefix-average]
minutes: 8
lessons: [phases/07-transformers-deep-dive/07-gpt-causal-language-modeling, phases/19-capstone-projects/33-multihead-self-attention, phases/19-capstone-projects/34-transformer-block]
manuals: []
practice: []
cheatsheet: [transformers-attention, gpt-from-scratch-training]
related: []
updated: 2026-11-03
---

解码器不能读取当前位置之后的 token。一位同事提议先做 softmax，再把后面位置的权重置零。这为什么不对？常见的负无穷三角到底是从哪来的？

## Short answer

在 softmax 之后把权重置零，每行之和就不再是 1，而且后面的 token 已经参与了归一化。mask 是在 softmax 之前给分数加上负无穷，指数在那些位置给出精确的零，每一行就只是过去位置上的分布。这个三角不是给注意力打的补丁：因果的累积平均本身就是一个按行归一化的下三角矩阵，mask 只是把同一个零模式写在 softmax 的输入域里。

## Full answer

### 三个阶段，一个不变量

从最简单的因果汇总开始：位置 i 变成位置 0 到 i 的平均值。写成矩阵：

```python
A = np.tril(np.ones((n, n)))
A = A / A.sum(axis=1, keepdims=True)
out = A @ X
```

对角线上方的零就是因果性。这里没有任何遮蔽；未来本来就不在求和里。

现在把那些 1 换成学到的分数 S。各行之和不再是 1，所以每行用 softmax 归一化。softmax 从不输出精确的零，所以未来的位置必须以负无穷进入，因为 `exp(-inf) = 0`：

```python
S = S + np.triu(np.full((n, n), -np.inf), k=1)
A = softmax(S, axis=1)
```

最后让分数取决于 token：`S = Q @ K.T / sqrt(d_k)`。先 mask，再 softmax，再矩阵乘法。mask 是从平均那一步留下来的，从来不是后加到注意力上的。

### 为什么是负无穷，不是零

分数为零时，归一化之前仍然得到 `exp(0) = 1` 的权重。只有负无穷才给出零权重。

### 它在训练时带来什么

有了 mask，对 N 个 token 的序列做一次前向就能得到 N 个下一个 token 的预测，每个预测只看到自己的过去。这就是训练能沿序列并行的原因。没有 mask，模型会读到自己的目标，损失崩到很低，模型却学不到有用的东西。

### 生产中的 block 怎么存它

在构造时把 mask 注册成 buffer，大小按最大上下文定，前向时切出左上角的 (T, T)。这样它和权重在同一个设备上，也永远不进梯度图。每次调用都重建它，长上下文下 mask 会变成内存分配器的热点。

## Follow-ups

- **Level 2:** 为什么不把未来的分数乘以零？ Expected: 分数为零时，归一化前仍会拿到 `exp(0)` 的权重，未来仍然有贡献。
- **Level 2:** 在真实的 block 里 mask 放在哪里，为什么？ Expected: 按最大上下文长度注册的 buffer，每次前向切片使用；这样它在正确的设备上，也不会每次调用都分配内存。
- **Level 3:** 编码器需要这个三角吗？ Expected: 不需要，编码器是双向的；它需要的是 padding mask，同样用负无穷，但跟着批次走，不沿对角线。
- **Level 3:** mask 和并行训练有什么关系？ Expected: 它让一次前向同时产出所有下一个 token 的预测，而每个预测只看到自己的过去，所以这 N 个损失可以一起成立。

## Wrong answers

- "把未来的分数设成零。" 零是合法的分数，经过指数后仍然得到权重；只有负无穷才给出零权重。
- "mask 只是训练时的技巧，推理时可以去掉。" 推理时 prompt 也是一次前向处理完的，没有 mask，prompt 里的 token 就会读到自己的未来。
- "编码器也需要这个三角。" 编码器按设计就能看到两侧；正是这个三角让解码器成为解码器。

## Taught in

[因果语言建模一课](../../../phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/)从前缀平均推出这个三角，[注意力综合项目](../../../phases/19-capstone-projects/33-multihead-self-attention/)和 [block 综合项目](../../../phases/19-capstone-projects/34-transformer-block/)把它注册成 buffer。
