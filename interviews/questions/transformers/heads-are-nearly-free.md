---
id: heads-are-nearly-free
title: 八个头比一个头多花了什么
card: transformers
kind: concept
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, screen]
tags: [multi-head-attention, head-dimension, output-projection, fused-qkv]
minutes: 8
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention, phases/19-capstone-projects/33-multihead-self-attention]
manuals: []
practice: [multi-head-split-merge]
cheatsheet: [transformers-attention, attention-variants]
related: [transformers/why-scale-by-sqrt-dk]
updated: 2026-11-03
---

你把一个注意力层从一个头改成八个头，模型宽度不变。参数量、计算量，以及这一层能表示的东西，各会怎样变化？为什么从业者不肯让头的宽度小于约 32？

## Short answer

参数不变：四个投影仍然是 `d_model` 乘 `d_model`，多头只是把同样的矩阵 reshape 成宽度为 `d_model / n_heads` 的切片。计算量也基本不变，因为每个头的注意力沿头这一轴作为一次批量矩阵乘法来跑。每个头可以专门处理自己的一种关系，而各个头在输出投影里混合。课程的经验法则是头宽度保持在 32 或以上，因为更窄的头能看到的维度太少，超过 256 又会失去许多小专家分工的好处；而 `sqrt` 缩放本身在任何宽度下都让分数方差保持不变。

## Full answer

### 拆分、注意、合并

```python
def split_heads(X, n_heads):
    n, d = X.shape
    d_head = d // n_heads
    return X.reshape(n, n_heads, d_head).transpose(1, 0, 2)

def combine_heads(H):
    h, n, d_head = H.shape
    return H.transpose(1, 0, 2).reshape(n, h * d_head)
```

把 X 投影成 Q、K 和 V，各自拆成多个头，每个头做缩放点积注意力，再把各头堆回去，乘上输出矩阵 `W_o`。GPU 把每个头的分数看成一次批量矩阵乘法，形状是 `(heads, N, d_head)` 乘 `(heads, d_head, N)`。加头加的是批次条目，不是权重。

### 输出投影为什么重要

在注意力这一步里，各个头互不交流；它们在不同的子空间上工作。形状为 `(d_model, d_model)` 的 `W_o` 是它们的输出混合的地方。没有它，各个头只能靠后面的层重新组合，block 会受到不必要的限制。

### 头学到了什么

2019 到 2024 年的探测研究发现了不同的角色：关注前一个 token 的头、复制头、跟踪命名实体的头，以及归纳头。归纳头是成对的头，它们找到当前 token 之前出现的位置，并复制当时跟在后面的内容，上下文学习就建立在它们之上。只有一个头的话，所有这些功能都得糊进同一个 softmax 里。

### 选头宽度

| 模型规模 | d_model | n_heads | d_head |
|---|---|---|---|
| 小型（约 125M） | 768 | 12 | 64 |
| 基础（约 350M） | 1024 | 16 | 64 |
| 大型（约 1B） | 2048 | 16 | 128 |
| 前沿（约 70B） | 8192 | 64 | 128 |

头宽度几乎每次都落在 64 或 128。它是一个头能看到多少东西的单位。

### 生产中的实现

用一个线性层把 D 映射到 3D，再切成 Q、K 和 V。三个独立的层算的是同一个结果，因为用三个 `(D, D)` 权重做三次矩阵乘法，等于用一个堆叠起来的 `(3D, D)` 权重做一次，但融合后的层只启动一个 kernel，而不是三个。

## Follow-ups

- **Level 2:** 数学完全相同，为什么融合的 QKV 投影更快？ Expected: 一次 kernel 启动、一次矩阵乘法，而不是三次；堆叠的权重给出相同的结果。
- **Level 3:** 去掉输出投影会出什么问题？ Expected: 各个头只能通过后面的层混合，所以即使形状都对得上，block 的表达能力也变弱了。
- **Level 3:** 什么是归纳头？ Expected: 一对头，找到当前 token 之前出现的位置，并复制当时跟在它后面的 token；它是上下文学习背后的电路。
- **Level 4:** 分组查询注意力保留查询头，缩小的是别的部分。缩小了什么，为什么？ Expected: 键头和值头，因为只有它们存在解码时的 cache 里；减少它们能省 cache 显存，查询头保留下来维持质量。

## Wrong answers

- "头越多参数越多。" 投影的大小不变；多头只是同样矩阵的 reshape。
- "各个头在做注意力时交换信息。" 它们在各自的子空间上工作；混合只发生在输出投影和后面的层里。
- "宽度允许的话，头越多越好。" 头宽度低于课程经验法则的 32 时，看到的东西太少；常见的宽度是 64 和 128。

## Taught in

[多头注意力一课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)实现了拆分并给出头宽度表，[注意力综合项目](../../../phases/19-capstone-projects/33-multihead-self-attention/)融合了投影并解释了输出矩阵。
