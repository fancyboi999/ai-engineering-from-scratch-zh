---
id: missing-zero-grad
title: 几步之后损失开始来回摆动的训练循环
card: deep-learning
kind: code-reading
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, debugging]
tags: [training-loop, zero-grad, gradient-accumulation, debugging]
minutes: 10
lessons: [phases/03-deep-learning-core/13-debugging-neural-networks, phases/03-deep-learning-core/10-mini-framework]
manuals: []
practice: []
cheatsheet: [nn-debugging]
related: [deep-learning/overfit-one-batch-first, deep-learning/weight-matrix-rows-and-columns]
updated: 2026-11-03
---

这个循环在一个固定 batch 上，用普通 SGD 和较小的学习率训练一个小网络。

```python
for step in range(50):
    out = model(x)
    loss = criterion(out, y)
    loss.backward()
    optimizer.step()
```

损失下降了几步，然后上下摆动。读一下这个循环，指出 bug，解释原理，并说明修复放在哪里。

## Short answer

循环从不把梯度清零，所以每次 backward 都把新梯度叠加到之前所有梯度上。每一步应用的是一个不断变大的和，效果就像学习率每步都在升高，损失因此振荡。在 backward 之前加上优化器的 zero_grad 调用，课里正确的循环就把它放在这里。

## Full answer

### 梯度为什么会变大

梯度存储本来就设计成累加器。一个参数在多处使用时，会把各处的贡献加起来；backward 调用是往已存的梯度上加，而不是替换它。迷你框架里，Linear 层的 backward 就是这样做的，对权重梯度用加等于，优化器的 zero_grad 把每个梯度容器重置为 0.0。框架也一样。没有重置，第一步应用 g1，第二步应用 g1 加 g2，第三步应用前三个之和，依此类推。方向在一段时间内大致正确，幅度却不断上升，直到更新冲过头。

### 课里的顺序

```text
zero_grad, forward, loss, backward, (clip), step, (schedule)
```

调试课把忘记 zero_grad 列为最浪费时间的 bug 之首，症状就是：梯度跨 batch 累加，损失振荡。它的演示复现了上面这个循环，并报告了这个问题。优化器课补充了最后两个调用的顺序规则：调度器在优化器之后 step，两者调换是一个不易察觉的 bug。

### 怎样在日志里看出来

在固定 batch 上，损失下降时梯度范数应该下降或持平。有这个 bug 时，它一步比一步大，损失先变好，然后以越来越大的幅度摆动。这个循环和单 batch 过拟合测试很像，那个测试也会因此无法把损失降到接近零。

### 什么时候累加是有意的

在几个小 batch 上累加梯度，可以模拟一个大 batch：对每个微 batch 运行 backward 但不清零，然后整组只做一次 step 和一次 zero_grad，损失按组大小缩放。这是框架课里的一道练习。它和这个 bug 的区别是每组只 step 一次，并且做了除法。

## Follow-ups

- **Level 3:** 框架为什么累加梯度，而不是覆盖？ Expected: 一个参数在多处使用时要把贡献加起来，跨微 batch 累加还能模拟更大的 batch；何时重置交给调用方。
- **Level 3:** 裁剪和调度在顺序里放在哪里？ Expected: zero_grad、forward、loss、backward、clip、step、schedule；调度器在优化器之后 step。
- **Level 4:** 不读代码，你怎样从日志发现这个 bug？ Expected: 在固定 batch 上，梯度范数本该缩小或持平，却一步比一步大，损失以越来越大的幅度振荡。
- **Level 4:** 什么时候某些步跳过 zero_grad 是对的？ Expected: 有意在几个微 batch 上累加，整组之后做一次 step 和一次 zero_grad，损失按组大小缩放。

## Wrong answers

- "学习率太高了。" 学习率很小；变大的是累加的梯度。
- "每隔几步才重置梯度，让它更平滑。" 这是不做除法的累加；步长随组大小放大，损失还是会摆动。
- "每步把损失 detach 掉，阻止累积。" detach 断开的是计算图，不是已存的梯度；梯度缓冲区里仍然是累加和。

## Taught in

[调试课](../../../phases/03-deep-learning-core/13-debugging-neural-networks/)复现了这个 bug，并把它列为训练循环常见错误之首，[迷你框架课](../../../phases/03-deep-learning-core/10-mini-framework/)展示了梯度为什么会累加，以及 zero_grad 重置了什么。
