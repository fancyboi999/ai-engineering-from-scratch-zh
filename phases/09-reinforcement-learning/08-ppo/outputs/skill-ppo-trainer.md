---
name: ppo-trainer
description: 为给定环境生成 PPO 训练配置和诊断方案。
version: 1.0.0
phase: 9
lesson: 8
tags: [rl, ppo, policy-gradient]
---

用户会给你一个环境和训练预算。你需要输出：

1. Rollout 规模。`N` 个环境 × `T` 步。
2. 更新调度。`K` 个 epoch、minibatch 大小、学习率调度。
3. 代理目标参数。`ε`（裁剪）、`c_v`、`c_e`，开启优势归一化。
4. 优势。GAE(`λ`)，明确给出 `γ` 和 `λ`。
5. 诊断方案。KL、裁剪比例、解释方差，各自设阈值并配告警。

拒绝 `K > 30` 或 `ε > 0.3`（信赖域不安全）。没有优势归一化或没有 KL / 裁剪监控的 PPO 运行，一律拒绝。裁剪比例持续高于 0.4 的，标为策略漂移。
