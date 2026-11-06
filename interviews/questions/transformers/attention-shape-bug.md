---
id: attention-shape-bug
title: 注意力能跑通，但上下文张量的形状不对
card: transformers
kind: debug
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [debugging, coding]
tags: [attention, shapes, broadcasting, encoder-decoder, testing]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/10-attention-mechanism, phases/07-transformers-deep-dive/02-self-attention-from-scratch]
manuals: []
practice: [scaled-dot-product-attention]
cheatsheet: [transformers-attention]
related: [transformers/query-key-value-lookup]
updated: 2026-11-03
---

编码器和解码器之间的一个注意力模块运行时没有任何异常，但模型的准确率慢慢落后于参考实现。打印上下文张量后，你发现它的第二维是编码器长度，而不是解码器长度。请讲讲你怎么诊断。

## Short answer

模块能跑，形状却不对，这是广播 bug；静默广播是最糟的注意力 bug，因为它不会崩溃，只会拉低准确率。先写出预期形状：分数和权重是批大小乘解码器长度乘编码器长度，上下文是批大小乘解码器长度乘编码器状态宽度。然后找到操作数写反或漏了转置的那次矩阵乘法，用一次转置或 reshape 修好，再加上断言，检查形状，并检查权重之和为 1。

## Full answer

### 形状表

| 张量 | 形状 |
|---|---|
| 编码器状态 H | (T_enc, d_h)；双向编码器的 d_h 是隐藏层大小的两倍 |
| 解码器状态 s | (d_s,) |
| 单个编码器位置的分数 | 标量 |
| softmax 之后的权重 | 单个解码步为 (T_enc,) |
| 上下文向量 | (d_h,)，与单个编码器状态形状相同 |

在解码步上按批计算时，权重是 `(batch, T_dec, T_enc)`，上下文是 `(batch, T_dec, d_h)`。

### 错误的形状从哪来

上下文等于 `weights @ H`。如果查询张量被换成了编码器状态，代码把分数算成了 `H @ H.T`，形状照样能相乘，结果里本该是解码器长度的位置变成了编码器长度。没有任何报错。下游的层会广播或 reshape 这个张量，损失照样下降，只是更慢。

### 诊断步骤

1. 打印每个中间张量的形状，和形状表对照。
2. 检查分数公式。加性形式里，投影向量把注意力维度的向量压成标量；点积形式里，查询和键必须同宽，而双向编码器会让键的宽度翻倍，所以除非中间夹一个矩阵 W，点积形式行不通。
3. 检查哪个解码器状态作为查询。一种经典写法用当前步之前的状态，另一种用当前步之后的状态。两者混用会产生细微的梯度错误，很难发现。
4. 用一次转置、reshape 或投影修复。只靠广播让不匹配不再报错的修法，一律不接受。

### 回归测试

```text
assert output.shape == (batch, T_dec, d_h)
assert weights.shape == (batch, T_dec, T_enc)
assert weights.sum(dim=-1) is close to 1
```

第三行能抓住 softmax 用错轴的情况，这是这一层的另一个静默 bug。

## Follow-ups

- **Level 2:** 哪一个测试能抓住大多数注意力 bug？ Expected: 断言权重的形状是批大小乘解码器长度乘编码器长度，并且沿最后一轴求和为 1。
- **Level 2:** 分数矩阵在编码器维度上成了方阵。发生了什么？ Expected: 键在和自己算分数；查询张量被换成了编码器状态。
- **Level 3:** 为什么接双向编码器时，普通点积分数行不通？ Expected: 编码器状态是隐藏宽度的两倍，和解码器状态对不上；改用中间带一个矩阵的一般形式。
- **Level 3:** 为什么状态约定是梯度问题，而不是形状问题？ Expected: 两种状态形状相同，什么都不会报错；梯度流到了错误的步，模型学到一个略有偏差的对齐。

## Wrong answers

- "把输出 reshape 成预期形状，接着训练。" 里面的值是错的；reshape 只是把不匹配藏起来。
- "调低学习率，模型只是不稳定。" 训练并没有不稳定，它算的是一个错误的量。
- "加一个 mask 来修正形状。" mask 改变的是哪些位置获得权重，不改变张量的布局。

## Taught in

[注意力机制一课](../../../phases/05-nlp-foundations-to-advanced/10-attention-mechanism/)给出形状表和排查形状用的 prompt，[从零实现自注意力一课](../../../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)给出各个投影。
