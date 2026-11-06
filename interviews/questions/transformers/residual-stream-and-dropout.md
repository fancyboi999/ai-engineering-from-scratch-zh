---
id: residual-stream-and-dropout
title: 跳连路径的作用，以及 dropout 能放在哪里
card: transformers
kind: concept
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [ml-depth, screen]
tags: [residual-stream, dropout, feed-forward, swiglu, block]
minutes: 8
lessons: [phases/07-transformers-deep-dive/05-full-transformer, phases/19-capstone-projects/34-transformer-block]
manuals: []
practice: []
cheatsheet: [transformers-attention]
related: [transformers/pre-norm-vs-post-norm]
updated: 2026-11-03
---

一个 transformer block 有两条跳连路径，一条绕过注意力，一条绕过前馈网络。它们对训练起什么作用？两个子层中，哪个在 token 之间传递信息？为什么把 dropout 层直接放在跳连路径上会弄坏东西？

## Short answer

跳连路径让梯度沿深度变成相加的关系，所以在十二层的堆叠中，梯度范数保持在同一量级，而不是每层缩小一次；它还让每个 block 学习对一个持续传递的表示做小幅更新，而不是整个替换。只有注意力混合 token；MLP 对每个位置单独应用同样的两层。dropout 应该放在注意力 softmax 之后、残差相加之前的注意力输出上，以及 MLP 第二个线性层之后；放在跳连路径上，会破坏承载梯度的恒等关系，早期这样做的堆叠训练起来很脆弱。

## Full answer

### 把 block 看成一个函数

解码器 block 接收形状为 `(batch, sequence, embedding)` 的张量，返回同样形状的张量。内部由两个子层完成工作：

```text
x = x + attention(norm(x))
x = x + mlp(norm(x))
```

每一行都是对一条数据流的加法更新，这条流自上而下穿过每个 block。课程把这个张量叫作残差流。

### 加法路径为什么重要

没有跳连路径，梯度在约六层之后就会消失。有了它，损失对前面某层的梯度里有一个不穿过子层的直接项，所以深度增加的是相加的项，而不是连乘的衰减。第二个作用在表示上：block 不需要复现自己的输入，只需要把学到的东西加上去。

### 谁和谁交流

注意力是 token 之间交换信息的唯一地方。MLP 是逐位置的：同样的权重独立作用于每个 token，经典 block 里隐藏宽度是 embedding 宽度的四倍，激活函数是 GELU。现代 block 用 SwiGLU，三个矩阵、宽度约 2.6 倍，这样参数量和旧的四倍 MLP 持平，并且去掉了偏置项。

### dropout 放在分支上，绝不放在恒等项上

注意力 dropout 放在 softmax 之后，残差 dropout 放在注意力输出上，以及 MLP 第二个线性层之后。对恒等项做 dropout 会随机去掉其中一部分，让深度变得可训练的那条梯度路径就不再可靠。

## Follow-ups

- **Level 2:** 如果模型只需要逐 token 的变换，你会去掉哪个子层？ Expected: 注意力；MLP 从不跨位置查看。
- **Level 3:** 现代 FFN 的扩展倍数为什么约是 2.6，而不是 4？ Expected: SwiGLU 有三个权重矩阵，所以 2.6 倍宽度和两个矩阵、四倍宽度的 MLP 参数量持平。
- **Level 3:** 现代堆叠为什么去掉线性层的偏置项？ Expected: 课程报告这样困惑度略有改善，模型也更小。
- **Level 4:** 一位评审想对小模型的恒等项做 dropout 来正则化。你怎么回答？ Expected: 不行；dropout 留在分支输出上，因为正是加法的恒等关系让梯度能传到前面的层。

## Wrong answers

- "跳连路径是为了让输出形状和输入形状一致。" 没有它形状也一致；跳连路径关乎梯度流动和加法更新。
- "dropout 放在 block 里任何地方都一样。" 放在恒等项上会损坏梯度路径；放在分支输出上不会。
- "前馈网络在 token 之间混合信息。" 它对每个位置单独应用同一个 MLP；混合只发生在注意力里。

## Taught in

[完整 transformer 一课](../../../phases/07-transformers-deep-dive/05-full-transformer/)列出了 block 的六个组成部分，[block 综合项目](../../../phases/19-capstone-projects/34-transformer-block/)解释了残差流和 dropout 的位置。
