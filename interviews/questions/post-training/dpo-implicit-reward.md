---
id: dpo-implicit-reward
title: DPO 中的奖励模型到底去了哪里
card: post-training
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [ml-depth]
tags: [dpo, implicit-reward, preference-tuning, beta]
minutes: 12
lessons: [phases/10-llms-from-scratch/08-dpo, phases/19-capstone-projects/40-dpo-from-scratch, phases/18-ethics-safety-alignment/03-direct-preference-optimization-family]
manuals: []
practice: [dpo-loss]
cheatsheet: [rlhf-dpo, alignment-training]
related: [post-training/kl-penalty-purpose]
updated: 2026-11-03
---

DPO 通常被描述为“不需要奖励模型的 RLHF”。请带我完整推导奖励模型究竟去了哪里：从带 KL 惩罚项的经典 RLHF 目标函数出发，一直推导到最终工程落地的损失函数。

## Short answer

带 KL 惩罚的优化目标拥有闭式解析最优解：最优策略等于参考策略乘以“奖励除以 beta”的指数项，并在各个 prompt 下归一化。反解该式，奖励函数便等于 beta 乘以当前策略对参考策略概率比的对数，外加一个仅依赖于 prompt 的配分函数项。将该隐式奖励代入 Bradley-Terry 偏好概率模型中，由于正向回答与负向回答共享同一个 prompt，仅依赖 prompt 的配分项在做差时完全相消。最终剩下的，是一个完全基于策略自身对数概率表示的损失函数：负的对数 sigmoid，其自变量为 beta 乘以两个概率比的对数之差。

## Full answer

### 四行核心数学推导

```text
optimum:  pi*(y|x) = pi_ref(y|x) * exp( r(x,y) / beta ) / Z(x)
invert:   r(x,y) = beta * log( pi*(y|x) / pi_ref(y|x) ) + beta * log Z(x)
BT:       P(y_w > y_l | x) = sigmoid( r(x,y_w) - r(x,y_l) )
loss:     -log sigmoid( beta * [ log pi(y_w|x)/pi_ref(y_w|x) - log pi(y_l|x)/pi_ref(y_l|x) ] )
```

其中 log Z 项仅取决于 prompt 本身，因此对于选定回答与拒绝回答而言取值完全相同，在作差时自动相消。

### 每个数据对需要计算的内容

需要计算 4 个序列对数概率值：当前策略与参考模型在选定回答上的对数概率，以及二者在拒绝回答上的对数概率。每个值都是回答部分各 token 的下一 token 对数概率之和，prompt 位置用掩码排除。参考模型的前向传播在无梯度环境下运行。

### 隐式奖励

`beta * (log pi(y|x) - log pi_ref(y|x))` 是 DPO 赋予任意回答的隐式奖励。在训练中记录选定回答与拒绝回答之间的隐式奖励边际；该边际在正常训练中应稳步扩大。针对选定回答对数概率的梯度项为 `-beta * (1 - sigmoid(z))`，对于任意 z 恒为负数，因此梯度下降会持续推高选定项的概率并压低拒绝项。

### 显式 KL 惩罚去哪了

最终的损失函数中没有显式的 KL 散度项。对参考模型的约束是结构性的：策略若严重偏离参考模型，概率比的对数会变得极大，导致 sigmoid 函数进入饱和区，梯度随之衰减消失。超参数 beta 决定了策略偏离参考模型的允许跨度。DPO 课程给出的取值区间为 0.1 到 0.5，通常黄金平衡点在 0.1 到 0.3。过小的 beta 允许策略大幅漂移，存在生成退化回答的风险；逼近 1.0 的取值则将策略死死锚定在参考模型上。

### 带来的显存与工程节约

显存中仅需驻留 2 个模型副本（策略模型与参考模型），而不是传统 RLHF 所需的 3 到 4 个，且使用简单的单循环有监督训练替代了复杂的 PPO。对于 70B 模型，FP16 下每个副本占据 140GB，省去一个常驻的奖励模型是硬件层级上的巨大减负。

## Follow-ups

- **Level 2:** 为什么策略模型必须以参考模型权重的精确副本开始训练？ Expected: 数学推导将最优策略视为在参考策略基础上的学习增量，以权重副本启动能使所有数据对的初始隐式奖励严格从零出发。
- **Level 2:** 正值的概率比的对数意味着什么？ Expected: 当前策略赋予该回答的概率已经高于参考模型赋予的概率。
- **Level 3:** 为什么推导必须建立在“回答对共享同一个 prompt”的前提之上？ Expected: 配分函数 Z 仅依赖于 prompt；如果两个回答的 prompt 不同，Z 项在做差时无法相消，各回答间的隐式奖励便无法直接横向对比。
- **Level 4:** 原始数学推导中的哪些假设在工业实践中会失效？ Expected: 最优解可达的假设、偏好对在参考模型分布内的假设，以及参考模型是真实锚点的假设；DPO 家族后续的各项变体逐一修补了这些失效假设。

## Wrong answers

- "DPO 没有参考模型，这就是它的核心意义。" DPO 移除了奖励模型和 PPO 循环；冻结的参考模型依然常驻在损失函数中，彻底丢弃参考模型是后续演进变体的做法。
- "DPO 旨在最大化正向选定回答的概率。" 它最大化的是两个概率比的对数之间的边际；选定回答的绝对概率完全可能在下降，只要拒绝回答下降得更快。
- "Beta 是优化器的学习率。" Beta 是缩放隐式奖励并决定策略允许偏离参考模型程度的超参数；优化器的更新步长是另一项独立的设置。

## Taught in

[DPO 课程](../../../phases/10-llms-from-scratch/08-dpo/)推导了损失函数并做了 beta 参数搜索，[DPO 从零构建综合项目](../../../phases/19-capstone-projects/40-dpo-from-scratch/)通过测试验证了梯度符号与参考模型不变性，而 [DPO 家族课程](../../../phases/18-ethics-safety-alignment/03-direct-preference-optimization-family/)列举了底层理论假设。
