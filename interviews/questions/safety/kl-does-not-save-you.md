---
id: kl-does-not-save-you
title: KL 惩罚限住的是漂移，不是作弊
card: safety
kind: concept
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [ml-depth]
tags: [reward-hacking, kl-penalty, catastrophic-goodhart, heavy-tails]
minutes: 9
lessons: [phases/18-ethics-safety-alignment/02-reward-hacking-goodhart]
manuals: []
practice: []
cheatsheet: [ai-safety, rlhf-dpo]
related: [safety/goodhart-over-optimization-curve, safety/four-costumes-one-mechanism]
updated: 2026-11-03
---

一位同事说，他们的流水线里奖励作弊是有上限的：策略训练时带着相对参考模型的 KL 惩罚，所以漂不远。这个论证为什么不完整？在什么条件下它会彻底失效？

## Short answer

KL 惩罚限制的是策略分布移动多远，而不是朝哪些模式移动。过度优化曲线已经表明，KL 惩罚能让 gold 奖励的下滑变缓，但阻止不了下滑。如果代理的误差是重尾的，就存在一些罕见但可达的输入，在这些输入上“代理减 gold”没有上界；满足 KL 约束的最优策略可以把概率质量放到这些输入上，结果是代理奖励任意高，gold 奖励停在基线。

## Full answer

### 惩罚换来了什么

有了 KL 项，策略离开参考模型时，gold 曲线依然先升、达到峰值、再下降。惩罚让坡度更平缓，更好的代理让峰值后移。两者都不改变曲线的形状。

### 灾难性古德哈特

假设代理的误差有重尾：在参考模型之下，存在一些代理远比 gold 更喜欢的输入。KL 约束限制的是策略和参考模型之间的总距离。它不阻止策略把这份允许的距离集中花在这些输入上，因为它们在参考模型下本来就有支撑。结果是策略在代理上得分任意高，在 gold 上却不比基线好。

### 为什么这个条件说得通

奖励模型是对一个无界世界的有界测量。课程认为，这类测量在尾部有重尾误差，所以这个假设并不离奇。但它仍然是假设：在依赖 KL 预算之前，要针对每个代理，用留出标注实测“代理与 gold 之差”的尾部。

### 部分有效的办法

- 奖励模型集成，按最坏情况聚合：优化器能找到某一个模型的尾部误差，但取多个模型的最小值后，只有它们一起出错的地方才会给分。
- 训练对输出分布偏移更稳健的奖励模型。
- 保守的 KL 调度，并在测得的代理与 gold 差距处提前停止。
- 直接偏好那一族方法也不能幸免；那些损失有自己的过度优化缩放规律。

## Follow-ups

- **Level 3:** KL 惩罚约束了什么，又放开了什么？ Expected: 约束策略分布与参考模型的距离；放开的是策略集中到参考模型下哪些高奖励模式上。
- **Level 3:** 为什么几个奖励模型能做到单个带惩罚的模型做不到的事？ Expected: 优化器能找到单个奖励模型的尾部误差，但取多个模型的最小值后，只有它们一起出错的地方才会给分。
- **Level 4:** 换成直接偏好损失，问题就没了吗？ Expected: 没有；直接对齐这一族有自己的过度优化缩放规律，同样的监控仍然适用。
- **Level 4:** 把这一点变成一条训练运行的操作规则。 Expected: 用留出标注画 gold 对 KL 距离的曲线，在经验峰值停下；不管 KL 系数多大，只要代理在涨而 gold 不动，就当作警报。

## Wrong answers

- "KL 小，奖励作弊就小。" KL 限制漂移的幅度，不限制方向；策略可以把预算花在代理的尾部误差上。
- "重尾是一个离奇的假设。" 课程认为，对有界奖励模型来说重尾很常见；要测量代理与 gold 的差距，而不是假设尾部很轻。
- "用直接偏好损失，它没有奖励模型。" 它有一个隐式的奖励模型，也有自己的过度优化曲线。

## Taught in

[奖励作弊与古德哈特定律这一课](../../../phases/18-ethics-safety-alignment/02-reward-hacking-goodhart/)讲解了灾难性古德哈特，以及为什么只靠 KL 正则化不够。
