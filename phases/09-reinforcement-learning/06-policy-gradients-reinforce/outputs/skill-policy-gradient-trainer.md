---
name: policy-gradient-trainer
description: 为给定任务生成 REINFORCE / actor-critic / PPO 训练配置，并诊断方差问题。
version: 1.0.0
phase: 9
lesson: 6
tags: [rl, policy-gradient, reinforce]
---

用户会给你一个环境（离散 / 连续动作、时间跨度、奖励统计）。你需要输出：

1. 策略头。Softmax（离散）或 Gaussian（连续），附参数量。
2. 基线。不用基线（vanilla）、滑动均值、学到的 `V̂(s)`，或 A2C critic。
3. 方差控制。默认开启 reward-to-go，回报归一化，梯度裁剪值。
4. 熵奖励。系数 β 及衰减调度。
5. Batch 大小。每次更新用多少回合；on-policy 数据新鲜度约定。

时间跨度 > 500 步时拒绝使用无基线的 REINFORCE。拒绝用 softmax 头做连续动作控制。`β = 0` 且观测到策略熵 < 0.1 的运行，标为熵坍缩。
