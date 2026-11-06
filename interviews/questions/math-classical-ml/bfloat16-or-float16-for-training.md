---
id: bfloat16-or-float16-for-training
title: 训练与推理的 16 位浮点格式选型
card: math-classical-ml
kind: tradeoff
level: 3
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, system-design]
tags: [numerical-stability, bfloat16, float16, mixed-precision, loss-scaling]
minutes: 12
lessons: [phases/01-math-foundations/13-numerical-stability]
manuals: []
practice: []
cheatsheet: [information-numerics]
related: [math-classical-ml/variance-of-large-numbers, math-classical-ml/softmax-inf-at-large-logits]
updated: 2026-11-03
---

你的训练技术栈支持在 float16 或 bfloat16 下运行。一位同事选择了 float16，理由是它保留了更多有效位数。你在训练和推理中分别选择哪种格式？其中哪一种需要额外的辅助机制？

## Short answer

训练阶段选择 bfloat16。它具有与 float32 相同的 8 位指数位，覆盖高达约 3.4e38 的动态范围，激活值、logits 和梯度即使冲过 65,504 也不会溢出。float16 拥有 10 位尾数位和更高的精度，但其 5 位指数位上限仅为 65,504，且会导致低于约 6e-8 的梯度发生下溢，因此训练时必须引入损失缩放（loss scaling）。在数值有界且对精度要求更高的推理阶段，float16 则是常规选择。

## Full answer

### 两种布局格式

```text
float16:   [1 sign] [5 exponent]  [10 mantissa]   max about 65,504
bfloat16:  [1 sign] [8 exponent]  [7 mantissa]    max about 3.4e38
```

尾数决定精度，指数决定动态范围。模型训练需要更宽的动态范围：突发的损失尖峰、较大的 logit 或微小的梯度都远偏离 1。推理阶段的数值受限于已训练好的权重边界，此时 float16 多出的 3 个尾数位价值更高。

### float16 会出现什么问题

- 溢出：超过 65,504 的激活值会变成 inf，而 inf 会污染其下游的所有数值。
- 下溢：梯度通常在 1e-8 或更小量级，float16 会将低于约 6e-8 的任何数值直接舍入为 0。权重停止更新，且不会产生任何报错。

### 损失缩放

混合精度训练会保留一份 float32 的主权重副本，在前向传播和反向传播中采用 16 位格式，并在 float32 下计算损失。为了让 float16 梯度保持在下溢阈值之上，在反向传播前将损失乘以一个较大的常数（如 1024），使每个梯度放大 1024 倍，然后在权重更新前再将梯度除以该常数。实际更新量保持不变。动态损失缩放会从高数值起步（课程中为 65536），遇到首个 inf 梯度时将缩放因子减半，在平稳运行若干步后再次翻倍。

### 为什么 bfloat16 能省去多数复杂操作

bfloat16 本质是 float32 的高 16 位：直接截断低位尾数，指数位保持不变。其动态范围覆盖了梯度的取值范围，因此通常无需损失缩放，类型转换只需截断。代价则是精度损失：有效位数约为 2 到 3 位十进制数，而 float16 为 3 到 4 位。

### 指向此问题的典型症状

课程的问题清单中记录了三个由此引发的现象：切换到 float16 后验证准确率比论文低 1 到 3 个百分点、部分层的梯度范数为 0.0、以及从 float32 切换到 float16 后训练发散。对应的修复手段正是损失缩放或改用 bfloat16。

## Follow-ups

- **Level 3:** 为什么小梯度在 float16 中会消失，而在 bfloat16 中不会？ Expected: float16 的最小正规数在 6e-8 附近，更小的梯度会被舍入为 0；bfloat16 的指数位则覆盖了 float32 的动态范围。
- **Level 3:** 动态损失缩放遇到梯度变成 inf 时会怎么处理？ Expected: 跳过该优化步，将缩放因子减半，并在连续平稳运行若干步后重新翻倍。
- **Level 4:** 从 float32 切换到 float16 后，未报任何错误但验证准确率下降了几个百分点，发生了什么？ Expected: 梯度下溢导致微小更新归零；应启用损失缩放或切换到 bfloat16。
- **Level 4:** 为什么 float32 转换到 bfloat16 开销极低？ Expected: 它就是 float32 的高 16 位，转换时只需丢弃低位尾数，指数位保持原样。

## Wrong answers

- "尾数位越多说明训练效果越好，因此 float16 胜出。" 训练的瓶颈在于动态范围；超过 65,504 的 logit 尖峰在 float16 中会变成 inf，而在 bfloat16 中完全正常。
- "损失缩放会改变训练结果。" 在参数更新前除以相同的缩放因子会还原原本的更新量；缩放只是为了将微小数值提升到下溢阈值之上。
- "在包括推理的所有场景中都使用 bfloat16。" 推理数值是有界的，此时 float16 的额外精度更有帮助；课程将 float16 作为推理的默认选择。

## Taught in

[数值稳定性课程](../../../phases/01-math-foundations/13-numerical-stability/)对比了各浮点格式，讲解了损失缩放，并列出了混合精度训练的常见缺陷。
