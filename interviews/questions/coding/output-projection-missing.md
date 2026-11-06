---
id: output-projection-missing
title: 从不混合的注意力头
card: coding
kind: debug
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, debugging, ml-depth]
tags: [multi-head-attention, output-projection, softmax-axis]
minutes: 10
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention]
manuals: []
practice: [multi-head-split-merge]
cheatsheet: [transformers-attention]
related: [coding/split-heads-reshape, coding/gqa-repeat-not-tile]
updated: 2026-11-03
---

一个多头注意力前向通过了拆分和合并测试，却没通过对照参考实现的端到端测试，加载训练好的检查点后生成的是乱码：

```python
def multi_head_attention(x, w_q, w_k, w_v, w_o, n_heads):
    Q, K, V = split_heads(x @ w_q, n_heads), split_heads(x @ w_k, n_heads), split_heads(x @ w_v, n_heads)
    d_head = Q.shape[-1]
    scores = Q @ K.swapaxes(-1, -2) / np.sqrt(d_head)
    weights = softmax(scores, axis=-2)
    return merge_heads(weights @ V), weights
```

找出两处缺陷，并解释各自对模型有什么影响。

## Short answer

softmax 在 query 轴上归一化，而不是在 key 轴上，所以每一列之和为一，一个 query 的权重不再是 key 上的分布。输出投影也缺了：合并后的头直接返回，没有乘以 `w_o`，而这是头之间交换信息的唯一位置。在最后一个轴上归一化，并把合并结果乘以输出矩阵。

## Full answer

### 缺陷一：softmax 的轴

分数的形状是 batch、头、query、key。每个 query 行都必须成为 key 上的分布，所以 softmax 在最后一个轴上做。在倒数第二个轴上做，变成每个 key 列在所有 query 上之和为一，对 value 的加权和也就不再表示「这个 token 关注什么」。

### 缺陷二：输出投影

每个头在自己的子空间里计算注意力，注意力计算本身期间头与头之间没有任何交互。拼接之后乘以输出矩阵，才是头混合的地方。没有它，模型输出只是各个头独立结果的堆叠，下一层看到的函数和权重训练时的不一样，加载的检查点只会产生噪声。

### 修正后的函数

```python
def multi_head_attention(x, w_q, w_k, w_v, w_o, n_heads):
    Q = split_heads(x @ w_q, n_heads)
    K = split_heads(x @ w_k, n_heads)
    V = split_heads(x @ w_v, n_heads)
    d_head = Q.shape[-1]
    scores = Q @ K.swapaxes(-1, -2) / np.sqrt(d_head)
    weights = softmax(scores, axis=-1)
    return merge_heads(weights @ V) @ w_o, weights
```

### 为什么 reshape 测试能通过

两处缺陷都在拆分之后、合并之前，或者在合并之后。reshape 辅助函数是对的，而且因为 `w_o` 是方阵，最终输出的形状和参考实现一致。只有和参考实现比较数值，或者用真实检查点，才能发现它们。

### 为什么缩放仍然是对的

除数用的是头大小，不是完整宽度。提交的这一部分是对的；除以完整宽度的平方根是第三种常见错误，练习也会测试。

## Follow-ups

- **Level 3:** 输出投影的形状为什么是完整宽度乘完整宽度？ Expected: 它把所有头的拼接结果（宽度就是完整宽度）映射回模型宽度，也是唯一一个读取每个头的矩阵。
- **Level 3:** 你会加什么测试，尽早发现缺失的投影？ Expected: 一个 `w_o` 不是单位矩阵的用例，这样投影前后的输出会不同。
- **Level 4:** 一项探测研究发现某个头关注前一个 token。在这段代码里，这个头的结果从哪里进入残差流？ Expected: 只通过它在拼接结果中的那一块列，以及 `w_o` 里读取这块列的行；`w_o` 决定下一层能看到这个头的多少。

## Wrong answers

- "softmax 的轴无所谓，因为分数是对称的。" 分数是 query 乘 key，并不对称；对任何真实输入，两种归一化的结果都不同。
- "去掉输出投影能省参数，合并已经把头重新组合了。" 合并只是拼接；没有投影，头之间永远不会交互。
- "检查点里没有输出投影时，就用单位矩阵代替。" 训练好的检查点一定有输出投影；缺少这个张量说明名称映射错了。

## Taught in

[多头注意力课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)解释了头只通过输出投影混合，[拆分与合并练习](../../../practice/multi-head-split-merge/)检查 softmax 的轴和投影。
