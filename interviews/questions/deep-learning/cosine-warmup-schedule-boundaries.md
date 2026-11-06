---
id: cosine-warmup-schedule-boundaries
title: 边界固定的预热加余弦调度
card: deep-learning
kind: take-home
level: 4
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [take-home, coding]
tags: [learning-rate, schedules, warmup, cosine, testing]
minutes: 25
lessons: [phases/19-capstone-projects/44-cosine-lr-warmup, phases/03-deep-learning-core/09-learning-rate-schedules]
manuals: []
practice: []
cheatsheet: [optimizers-schedules]
related: [deep-learning/warmup-before-the-peak-rate, deep-learning/pick-the-peak-rate-and-schedule]
updated: 2026-11-03
---

课后作业。把学习率调度实现成关于步数的一个函数：从零线性升到峰值，从峰值按余弦降到下限，最后一步之后固定在下限。交付的测试要固定每个边界上的值，证明曲线没有跳变，并说明恢复训练后会落在正确的值上。描述你的设计和测试。

## Short answer

写一个有三个分支的函数：到预热步为止，学习率是峰值乘以步数与预热长度之比；在预热步和总步数之间，是下限加上以下乘积：差值的一半乘以（一加上 pi 乘预热结束后进度的余弦）；超过总步数，就是下限。测试固定点：第零步为零，预热结束时两个分支都给出峰值，最后一步是下限，再多一步还是下限。再加一个限制单步变化的连续性测试，以及一个从保存的全局步数计算调度的恢复测试。

## Full answer

### 函数

```text
if warmup_steps > 0 and step <= warmup_steps:
    lr = lr_max * step / warmup_steps
elif step <= total_steps:
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    lr = lr_min + 0.5 * (lr_max - lr_min) * (1 + cos(pi * progress))
else:
    lr = lr_min
```

余弦在预热结束时等于 1，得到峰值，和线性上升的终点一致；在总步数处等于 -1，得到下限。综合项目课强调，正是这种连续性，让我们把它写成一个关于步数的函数，而不是把三段拼起来：拼接的调度在第一次改峰值或步数时就会丢掉一个边界。有两个保护。上升分支只在预热大于零时运行，所以预热为零步时从峰值开始，立即衰减，不会除以零。构造函数拒绝不小于总步数的预热，课里的代码也是直接报错，因为否则学习率会在最后一步停在峰值，再多一步就掉到下限。

### 为什么固定在下限，而不是报错

训练器超出配置的总步数时，仍然有可用的学习率，并记录一条警告。要延长训练，就改配置里的总步数，不改循环。下限故意不为零：课里把它保持在峰值的 10% 左右，让优化器在长尾阶段继续学习，并提醒下限为零在图上好看，却会让模型训练不足。

### 测试

1. **固定点。** 预热不为零时，lr(0) 为 0，lr(warmup) 在上升分支和余弦分支上都等于峰值，lr(total) 等于下限，lr(total + 1) 等于下限。
2. **连续性。** 从 0 到 total 的每一步，相邻两步之间的变化不超过两个斜率中较大的那个：预热斜率，即峰值除以预热步数；以及余弦的最大斜率，即 pi 乘差值除以两倍衰减长度。课里的练习指出，较短的余弦段可能比上升段更陡，所以只用上升斜率作上界并不安全。
3. **恢复。** 保存一个带全局步数的检查点，重新加载，断言下一个值等于 lr(global step + 1)。调度从检查点读取单调递增的全局步数，而不是 epoch 计数器或循环变量，因为分片数据集和重启的加载器会打乱 epoch 到步数的映射。
4. **形状。** 把调度渲染成文本图和 CSV，每步一行，把图存进运行目录，评审者不用运行任何东西就能看到曲线。

### 课里的生产实践

调度的四个数字放在带版本的配置里，不写在代码里。预热是总步数的一个比例，大约 1% 到 3%，这样训练变长时形状不变。日志行依次是步数、学习率、梯度 L2 范数和损失，方便看板读取。

## Follow-ups

- **Level 3:** 为什么把三个区间写在一个函数里？ Expected: 这样上升的终点和余弦的起点用同一个公式算峰值，修改峰值或步数不会在边界上留下缺口。
- **Level 4:** 连续性测试的正确上界是什么？ Expected: 上升斜率（峰值除以预热步数）和余弦最大斜率（pi 乘差值除以两倍衰减长度）中较大的那个；短的余弦段可能比上升段更陡。
- **Level 4:** 为什么最后一步之后固定在下限，而不是抛异常？ Expected: 超出步数的训练器仍有可用的学习率，并记录警告；延长训练应该改配置里的总步数，而不是改循环。
- **Level 4:** 什么能让恢复后的训练落在正确的值上？ Expected: 调度读取检查点里保存的单调全局步数，而不是 epoch 计数器或局部循环变量。

## Wrong answers

- "把下限设成零，让调度干净地结束。" 课里保留一个约为峰值 10% 的非零下限，让优化器在长尾继续学习；下限为零看起来干净，却会让模型训练不足。
- "测中间的几步就行，边界由公式保证。" 边界上差一正是课里警告的 bug；它会在训练跑了几个小时后，在关键时刻表现为学习率偏差 1%。
- "根据 epoch 和 batch 下标计算学习率。" 分片数据集和重启的加载器会破坏这个映射；全局步数才是可靠的坐标轴。

## Taught in

[余弦预热综合项目](../../../phases/19-capstone-projects/44-cosine-lr-warmup/)构建了这个调度及其边界契约和生产模式，[学习率调度课](../../../phases/03-deep-learning-core/09-learning-rate-schedules/)把它和其他调度做了比较。
