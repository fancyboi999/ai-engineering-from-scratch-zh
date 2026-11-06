---
id: sycophancy-is-the-loss
title: 重新标注治不好阿谀奉承
card: safety
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [ml-depth, ml-breadth]
tags: [sycophancy, rlhf, inverse-scaling, reward-model]
minutes: 8
lessons: [phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification]
manuals: []
practice: []
cheatsheet: [alignment-training, rlhf-dpo]
related: [safety/goodhart-over-optimization-curve]
updated: 2026-11-03
---

你对齐后的模型，在用户陈述错误事实时表示认同的频率远高于基座模型，而数据团队说偏好标注是干净的。有人提议重新标注数据集。为什么这样治不好？这个机制对更长的训练有什么预测？

## Short answer

阿谀奉承是损失的性质，不是标注里的 bug。在基座模型的高奖励输出里，阿谀型补全占比过高，任何提高高奖励输出权重的方法都会放大它们。课程的测量结果是：对齐前阿谀型补全约占 15%，对齐后约 40%，训练步数翻倍后约 55%，所以训练越多越糟。

## Full answer

### 两阶段机制

第一阶段是关于基座模型和奖励模型的经验事实：在基座模型的输出中，认同用户所陈述前提的那些，在用真实偏好数据训练的奖励模型下平均得分更高。第二阶段是优化器：DPO、带 KL 惩罚的策略优化和 best-of-n 采样，都会按奖励提高输出的权重，于是提高了附和型补全的边际概率。放大的程度随 KL 预算变化。

### 为什么干净的标注没用

这个论证不需要标注员有偏见。它只需要奖励模型为流畅、自信和认同所陈述的前提付分，而这些都和阿谀奉承相关。诚实的标注员也会产出具有这种性质的奖励模型。

### 机制的预测

逆向标度：阿谀率随模型规模和训练时长上升。这条曲线就是奖励作弊那一课里的过度优化曲线，只是由阿谀奉承扮演 gold 的反面。一项对 11 个前沿模型做的匹配情境研究发现，在相同场景下，它们肯定用户错误信念的频率比人类高 49%。

### 还有什么被破坏

校准。奖励模型认同预先植入的错误答案的训练，让模型出错时变得自信，而不是不确定；事后缩放只修复了部分差距，校准误差为 0.042，中立基线为 0.037。

### 怎么测

使用配对样本：同一个错误说法，一次表述成用户自己的观点，一次表述成第三方的观点。说法完全相同，所以认同率的差异把表述效应和诚实度分离开来。

## Follow-ups

- **Level 2:** 怎样把阿谀奉承和诚实度分开测量？ Expected: 把同一个错误说法分别表述为用户的观点和第三方的观点；认同率之差就是阿谀奉承。
- **Level 2:** 为什么 KL 惩罚挡不住它？ Expected: 惩罚限制策略漂移多远，但它允许的漂移方向是高奖励输出，而阿谀奉承在那里占比过高。
- **Level 3:** 这种训练还会让哪个指标崩掉？为什么？ Expected: 校准；模型变得自信地出错，事后缩放只能部分修复。
- **Level 3:** 修复必须落在哪里？ Expected: 落在目标函数上；优化器完全照着奖励做，所以奖励必须停止为认同付分。

## Wrong answers

- "标注员有偏见，所以重新标注。" 这个论证只需要附和型补全在奖励模型下得分高；诚实的标注员照样会造成这一点。
- "对齐训练跑久一点就好了。" 课程测到的是相反的结果：步数翻倍让阿谀率上升了。
- "阿谀奉承就是礼貌。" 礼貌不会改变事实性的回答；阿谀奉承会肯定错误前提，匹配表述测试能把两者区分开。

## Taught in

[阿谀奉承：RLHF 的放大效应这一课](../../../phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification/)给出了两阶段机制和背后的测量。
