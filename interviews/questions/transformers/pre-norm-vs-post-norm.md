---
id: pre-norm-vs-post-norm
title: norm 为什么挪到了子层前面
card: transformers
kind: tradeoff
level: 2
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, coding]
tags: [pre-norm, post-norm, layer-norm, rmsnorm, warmup]
minutes: 8
lessons: [phases/07-transformers-deep-dive/05-full-transformer, phases/19-capstone-projects/34-transformer-block]
manuals: []
practice: [layer-norm-rms-norm]
cheatsheet: [transformers-attention]
related: []
updated: 2026-11-03
---

2017 年的论文把层归一化放在残差相加之后。大约 2019 年以后，几乎所有模型都把它放在子层之前。变的是什么？你怎么用一个下午演示出差别？RMSNorm 在此之上又改了什么？

## Short answer

post-norm 让跳连路径上的梯度在每一层都经过一次归一化，所以层数一深，梯度就会缩小，训练要靠 warmup 调度才能撑下来。pre-norm 让跳连路径保持不归一化，梯度可以干净地传到 embedding，深层堆叠不靠 warmup 技巧也能训练。演示方法：两种变体各堆十二层，用相同的初始化，做一次反向传播后打印 embedding 处的梯度范数。RMSNorm 进一步去掉了减均值，少一步运算，实践中稳定性相同。

## Full answer

### 两种放法

```text
pre-norm:   x + sublayer(LN(x))
post-norm:  LN(x + sublayer(x))
```

形状相同，训练表现不同。post-norm block 在残差相加之后接 norm，所以沿堆叠向下流动的信号每层都被归一化一次，回传的梯度也必须穿过每一个 norm。在十二层深、学习率 `3e-4` 时，这个梯度缩小得够快，需要 warmup。pre-norm block 把 norm 放在分支内部，注意力之前和 MLP 之前，跳连路径传递的是原始信号。

### 一个下午的实验

1. 搭一个六层或十二层的堆叠，带一个 `pre_ln` 开关。
2. 两种变体用相同的权重，输入同一份随机数据。
3. 做一次反向传播，打印 embedding 处的梯度范数。

学习率相同时，pre-norm 堆叠在 embedding 处的梯度比 post-norm 大约一个数量级。

### pre-norm 需要而 post-norm 不需要的东西

输出头之前的最后一个 norm。pre-norm 模型的残差流没有归一化，所以输出头之前需要在最后做一次归一化。

### RMSNorm

LayerNorm 先减均值，再除以标准差。RMSNorm 除以均方根，跳过减均值。它少一步运算，经验上稳定性至少一样好，所以现代 block 用它。

### dropout 放在哪里

放在注意力 softmax 之后，放在注意力输出上、残差相加之前，以及 MLP 第二个线性层之后。绝不放在跳连路径本身上，因为那会破坏让梯度在深层流动的加法恒等关系。

## Follow-ups

- **Level 2:** pre-norm block 里 norm 具体放在哪里？ Expected: 放在每个残差分支内部，注意力之前和 MLP 之前，另外在输出头之前再加一个最后的 norm。
- **Level 3:** 为什么 pre-norm 模型需要最后一个 norm，而 post-norm 模型不需要？ Expected: pre-norm 的跳连路径没有归一化，没有最后的 norm，输出头会看到一个没有界的残差流。
- **Level 3:** 你的六层 post-norm 模型训练正常，二十四层的版本却发散了。为什么？ Expected: 跳连路径的梯度在每个 norm 处都会衰减，效果随深度累积；加 warmup，或者换成 pre-norm。
- **Level 4:** 什么能让你保留 LayerNorm 而不换 RMSNorm？ Expected: 在你自己的训练上测到了质量或稳定性的差异；课程的证据是 RMSNorm 与它持平，而且更便宜。

## Wrong answers

- "两种放法只是用不同顺序算同一个函数。" 两者的复合方式不同：一种对残差流做归一化，另一种只对分支的输入做归一化。
- "warmup 是学习率的细节，和 norm 无关。" 课程把对 warmup 的需要直接归因于 post-norm 的梯度路径。
- "RMSNorm 需要均值才能稳定。" 它故意省掉均值，实践中与 LayerNorm 持平。

## Taught in

[完整 transformer 一课](../../../phases/07-transformers-deep-dive/05-full-transformer/)解释了为什么改用 pre-norm 和 RMSNorm，[block 综合项目](../../../phases/19-capstone-projects/34-transformer-block/)实现了两种变体并测量了梯度。
