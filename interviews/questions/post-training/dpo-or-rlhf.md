---
id: dpo-or-rlhf
title: 小团队应该选 DPO 还是全套 RLHF
card: post-training
kind: tradeoff
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [system-design, ml-depth]
tags: [dpo, rlhf, compute-budget, preference-data, alignment]
minutes: 12
lessons: [phases/10-llms-from-scratch/08-dpo, phases/09-reinforcement-learning/09-reward-modeling-rlhf]
manuals: []
practice: []
cheatsheet: [rlhf-dpo]
related: [post-training/dpo-implicit-reward, post-training/kl-penalty-purpose]
updated: 2026-11-03
---

一个拥有 8 张 GPU 的 4 人工程团队，为客服助手场景收集了约 20,000 条偏好数据对，并希望在三周内完成对齐。一位工程师建议采用包含奖励模型和 PPO 的全套 RLHF 流水线；另一位工程师则主张使用 DPO。你会如何做技术选型？在什么条件下你会推翻这一决策？

## Short answer

选择 DPO。在数万条偏好对的数据规模下，DPO 能够匹敌或超越全套流水线；它只需在有监督循环中针对冻结的参考模型训练一个策略模型，仅需约三分之一的计算量，且每次实验耗时为数小时而非数天。当信号包含多个维度且需要一个可检查与复用的习得奖励模型时、当你需要给新样本打分的在线循环时，或者当 DPO 在评测上遭遇平台期时，推翻这一选择。

## Full answer

### DPO 带来的收益

| 比较维度 | 基于 PPO 的 RLHF | DPO |
|---|---|---|
| 需训练的模型数 | 3 个：SFT、奖励模型、策略模型 | 1 个：策略模型 |
| 显存常驻模型数 | PPO 期间为 3 或 4 个 | 2 个：策略模型与参考模型 |
| 超参数 | 学习率、KL 系数、截断比例、奖励模型学习率、各阶段 epoch 数 | 学习率、beta、epoch 数 |
| 稳定性 | 对设置敏感 | 接近 SFT |

对于 70B 模型而言，FP16 精度下每份副本占用 140GB，显存中少一个模型意味着属于完全不同的硬件层级。

### 何时选择 DPO

- 小型数据集，5,000 至 20,000 条偏好对。奖励模型需要足够的数据才能泛化，低于该规模容易过拟合；DPO 从不需要拟合奖励模型。
- 算力受限。单个训练循环代替三个阶段，大约是全套方案的三分之一。
- 快速迭代。尝试 10 组偏好数据集只需运行 10 次数小时的训练，无需为每组数据重新训练奖励模型。

课程的参考结果：一个在 60K 偏好对上使用 DPO 对齐的 7B 模型，在对话基准测试中得分为 6.47，而使用全套方案训练的 70B 对话模型得分为 6.86，与参数量为其十倍的模型差距在百分之六以内。

### 何时全套方案胜出

- 同时权衡多个质量维度，例如帮助性、无害性与诚实性。奖励模型学习权衡；DPO 将每个偏好对视为单个二元信号。
- 在线循环：从当前策略中采样、打分、重新训练奖励模型并继续。DPO 针对固定数据集工作。
- 可复用于 Best-of-N 采样或解码期 judge的奖励模型。
- 最大的参数规模，在已发表的技术管线中独立的奖励模型捕捉到了更多细微差别。

### 实用工程路径

从 DPO 起步。当评测陷入平台期时切换至全套方案。多个生产管线两者兼备：先用全套方案做广泛对齐，随后用 DPO 定向精细微调。

## Follow-ups

- **Level 3:** DPO 训练中依然需要从 RLHF 体系继承什么关键要素？ Expected: 一个 SFT 检查点作为冻结参考模型、一套留出集评估，以及承担类似 KL 系数调节作用的 beta 超参数。
- **Level 3:** 如果偏好对来自于旧版本其他模型的输出，对 DPO 会有影响吗？ Expected: 有重大影响；在当前参考模型下本身极其罕见的数据对会产生任意虚假的隐式奖励，因此应优先使用当前 SFT 模型采样生成数据，或基于参考模型似然度对数据做清洗过滤。
- **Level 4:** 在不引入 PPO 的前提下，你如何在这三周内组织迭代循环？ Expected: 运行 DPO 训练策略、用新策略采样生成一批新文本、在这些新样本上收集标注偏好、再次运行 DPO；课程练习将其称为迭代式 DPO。
- **Level 4:** 两种方法共同面临哪种本质失效模式？ Expected: 针对代理度量的过度优化；在传统 RLHF 中表现为攻击奖励模型，在 DPO 中表现为攻击相对参考模型的比率；二者都需要借助盲测评估与早停机制来设防。

## Wrong answers

- "RLHF 是经过验证的路径，所以应该从它起步。" 全套方案调节起来很脆弱且需要三个训练循环；课程的实用指导是从 DPO 起步，仅在遭遇平台期时才切换。
- "DPO 不需要 SFT 阶段。" 它需要一个参考策略，而该参考正是 SFT 检查点；单阶段方法采用的是不同的损失。
- "DPO 没有需要担心的超参数。" Beta 决定了策略偏离参考模型的程度，课程的扫描实验表明，取值过小时输出退化回答，取值过大时无法学到内容。

## Taught in

[DPO 课程](../../../phases/10-llms-from-scratch/08-dpo/)从数据、算力与显存维度横向对比了两种方法，而[奖励建模课程](../../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/)给两者在分层对齐技术栈中做了定位。
