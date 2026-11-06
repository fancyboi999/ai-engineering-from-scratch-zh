---
id: loss-becomes-nan-mid-run
title: 平滑的损失几小时后变成 inf，再变成 NaN
card: deep-learning
kind: debug
level: 4
roles: [applied-ai-engineer, inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [nan-loss, exploding-gradients, gradient-clipping, learning-rate, debugging]
minutes: 15
lessons: [phases/03-deep-learning-core/13-debugging-neural-networks, phases/03-deep-learning-core/06-optimizers, phases/03-deep-learning-core/09-learning-rate-schedules, phases/19-capstone-projects/44-cosine-lr-warmup]
manuals: []
practice: []
cheatsheet: [nn-debugging]
related: [deep-learning/pick-the-peak-rate-and-schedule, deep-learning/half-the-relus-are-dead]
updated: 2026-11-03
---

一次训练跑了几个小时，损失一直平滑。然后在三个日志间隔内，损失跳起来，变成 inf，之后每个值都是 NaN。同一套配方在更小的模型上能用。按可能性排出原因，给出区分它们的证据，以及防止再次发生的改动。

## Short answer

一个干净的训练在后期死掉，几乎总是因为更新过大：峰值学习率对更大的模型来说太高，某个罕见 batch 产生了巨大的梯度，或者调度在模型已经很敏感的时候到达了峰值。日志能区分这些情况：爆炸时梯度范数先于损失飙升；而前向溢出，比如没减最大值的 softmax，或者在零方差上做归一化，表现为范数正常、损失一步就变成 inf。修复办法是按范数在 1.0 处裁剪梯度，降低峰值并加上预热，从 logits 计算损失，然后从最后一个正常的检查点恢复。

## Full answer

### 给原因排序

1. **更新对这个模型来说太大。** 调试课的表格：损失在若干步后变成 NaN，说明学习率太高，第一步是把它降低 10 倍。在小模型上安全的峰值，在大模型上已经接近边缘。综合项目课建议在小模型上扫描峰值作为先验，并说最优值会随规模移动，所以要验证，不要照搬。
2. **一个坏 batch。** 一个离群的 batch 产生的梯度大到一步就能损坏每个权重。没有裁剪，就没有东西能挡住它。
3. **调度位置。** 检查损失跳起时调度走到了哪里。预热太短，或者在错误的时间到达峰值，会让最大的步落在承受不了的模型上。
4. **前向溢出。** 手写 softmax 里没减最大值的 exp，对零取 log，或者归一化里除以零方差。这些会立刻产生 inf，通常在第一步，所以对一个干净跑了几小时的训练，它们排在后面；但罕见的 batch 也可能在后期触发它们。

### 日志能说明什么

- 每一步在学习率旁边记录梯度 L2 范数。综合项目课的规则：发散的训练，范数先于损失飙升。溢出时范数正常，损失在一步之内变成 inf。
- 逐层梯度统计。调试课把平均绝对梯度超过 100 的层标为爆炸，并能看出哪一层先出事。
- 重放。加载最后一个正常的检查点，送入出事那一步的 batch，观察范数。如果单靠这个 batch 就能复现尖峰，它就是诱因；如果不能，问题在调度或学习率。
- 打开 autograd 引擎的异常检测，找出产生第一个 NaN 的操作。

### 防止再次发生的改动

- 在更新之前，按全局范数在 1.0 处裁剪梯度。按范数裁剪保持方向；逐元素裁剪做不到。
- 降低峰值，保留占总步数 1% 到 5% 的预热，让最大的步在优化器统计量稳定之后才出现。
- 用融合的稳定函数从 logits 计算损失，在 log 和除法里保留 epsilon。
- 检查点存得足够频繁，让恢复只花几分钟；损失出现 NaN 时报警，让训练停在第一个坏步，而不是几小时之后。

## Follow-ups

- **Level 3:** 日志里什么能区分更新过大和前向溢出？ Expected: 爆炸时梯度范数在损失之前连续几步上升；溢出时范数正常，损失一步之内变成 inf。
- **Level 4:** 为什么按范数裁剪，而不是按值裁剪？ Expected: 按范数裁剪会整体缩放梯度，保持它的方向；逐元素裁剪会改变方向。
- **Level 4:** 这套配方为什么在小模型上能用？ Expected: 在那里安全的峰值，对大模型来说接近边缘；小模型上的扫描只是先验，最优值随规模移动，所以要验证，不要照搬。
- **Level 4:** 你会加什么，让训练不再悄无声息地死掉？ Expected: 每一步在学习率旁记录梯度范数，损失为 NaN 时报警，检查点存得足够频繁以便恢复，并带着裁剪和预热重新开始。

## Wrong answers

- "给损失加个 epsilon，然后重启。" epsilon 修的是第一步对零取 log；后期的爆炸来自更新大小，训练还会再死。
- "把学习率减半，碰碰运气。" 减半是猜的；课里的做法是降低 10 倍，同时加上裁剪，并检查调度位置。
- "NaN 说明数据里有一行坏数据。" 坏数据在第一个 epoch 就会暴露，而不是在干净训练几小时之后；怪数据之前，先在检查点上重放出事的 batch。

## Taught in

[调试课](../../../phases/03-deep-learning-core/13-debugging-neural-networks/)给出了总表里关于 NaN 的几行，[优化器课](../../../phases/03-deep-learning-core/06-optimizers/)把裁剪放进循环，[学习率调度课](../../../phases/03-deep-learning-core/09-learning-rate-schedules/)讲了预热和峰值，[余弦预热综合项目](../../../phases/19-capstone-projects/44-cosine-lr-warmup/)在学习率旁记录梯度范数。
