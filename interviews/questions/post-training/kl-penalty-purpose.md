---
id: kl-penalty-purpose
title: RLHF 中 KL 散度惩罚守护的到底是什么
card: post-training
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [ml-depth]
tags: [rlhf, kl-penalty, reward-hacking, ppo, alignment-tax]
minutes: 10
lessons: [phases/09-reinforcement-learning/09-reward-modeling-rlhf, phases/10-llms-from-scratch/07-rlhf, phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal]
manuals: []
practice: [ppo-clip-loss]
cheatsheet: [rlhf-dpo, alignment-training]
related: [post-training/reward-model-pairwise]
updated: 2026-11-03
---

在 RLHF 的 PPO 优化阶段，目标函数会减去当前策略与 SFT 模型冻结副本之间的 KL 散度项。一位新入职的同事疑惑：为什么整个训练流水线仅仅为了这一项，就要在显存中常驻维护第二份完全相同的模型副本？请解释该项防止了何种严重失效，以及你如何调优其惩罚系数。

## Short answer

奖励模型是在长相与 SFT 输出高度相似的文本回答上训练出来的。如果没有该 KL 惩罚项，PPO 会将策略模型迅速推向奖励模型从未见过的未知分布盲区，并搜寻出那些在奖励模型看来得分极高、但人类极其厌恶的作弊字符串。KL 项对策略脱离 SFT 分布施加成本惩罚，它扮演的是软性正则化约束而非硬性绝对限制。根据实测的 KL 散度动态调优参数 beta：beta 过小，奖励值会与 KL 散度一同上升；beta 过大，策略模型将几乎无法脱离 SFT 状态。

## Full answer

### 优化目标函数的数学形式

```text
maximize  E[ R(x, y) ]  -  beta * KL( policy(. | x) || reference(. | x) )
```

其中参考模型是冻结的 SFT checkpoint。奖励模型为整段完整回答打分；而 KL 散度在每个回答的所有生成 token 上累加，并从总奖励中扣除。

### 缺失 KL 散度项的灾难性后果

奖励模型只是人类主观偏好的有限近似拟合，天生存在海量盲区。比如反复出现暗示有帮助性的短语、空洞无物的冗长官话、无处不在的项目符号列表：这些在真实的生产流水线中都曾骗取过极高的虚假奖励分。一旦失去参考锚点的约束，策略会迅速退化坍塌到少数几个能轻松骗取高奖励的畸形模式中。在 InstructGPT 课程展示的三阶段微型流水线中，当 beta 设为 0 时，策略在50 个更新步内就出现了这种退化。

### 监控与解读 KL 散度

在每次参数更新时，持续追踪单个回答的平均 KL 散度。奖励建模课程指出：在 token 上累加的 KL 达到 5 到 10 nats 时，表明当前策略已经严重脱离了 SFT 原始分布；此时要么是 beta 设得过低，要么是严重的奖励作弊已经发生。

### Beta 参数的科学调优方法

基准参考值：奖励建模课程推荐 0.01 到 0.05，RLHF 课程实践推荐 0.02。业界通用的成熟技巧是采用带有目标 KL 的自适应动态 beta 控制器：当观测到的 KL 超过设定目标时，beta 自动翻倍；当 KL 跌落到目标值的一半以下时，beta 自动减半。课程演示的工业级代码库在自适应控制器下采用 6.0 作为目标 KL。

### 第二个必须守护的锚点

KL 惩罚保护的是文本风格与分布不发生严重漂移。但它无法防范那些奖励模型从未考核过的通用基准测试能力衰减。这种通用能力的下降被称为对齐税，其修复方案是在强化学习目标中混合引入预训练对数似然梯度。

## Follow-ups

- **Level 2:** 为什么该项被称为正则化约束而非信赖域？ Expected: 它只是施加随距离增大而增加的成本；没有任何硬性机制阻止策略支付该代价，因此足够大的虚假奖励依然能够诱使策略迈出巨大的漂移步伐。
- **Level 2:** 代码中对参考模型必须确保哪两点实现细节？ Expected: 权重永远不接收任何梯度更新，且绝对不能与策略模型共享任何底层网络模块；共享模块会悄无声息地毁掉整个参考锚点。
- **Level 3:** 监控显示奖励在涨、KL 在涨，但人工盲测评测却完全平直。首先调整哪个旋钮？ Expected: 调大 beta 系数或立即执行早停；随后扩充奖励模型的训练数据集，将策略所利用的作弊盲区覆盖进去。
- **Level 3:** RLHF 之后模型在阅读理解基准上的测试成绩下降，这是 KL 散度能够挽救的吗？ Expected: 不能；这是典型的对齐税，必须在优化目标中混入预训练语言建模损失项，正如 PPO-ptx 架构所做的那样。

## Wrong answers

- "丢掉参考模型以节省显存，把 PPO 的概率截断比率设得更严苛即可。" PPO 截断仅仅限制了单步参数更新的幅度；它根本无法约束跨越多步之后累积发生的全局策略漂移，而这正是 KL 的核心使命。
- "把 beta 设得极大以策万全。" 过大的 beta 会将策略死死焊死在 SFT 原地，花费昂贵算力的强化学习将一无所获。
- "KL 惩罚是一种用于过滤有害文本的安全过滤器。" 它只度量与 SFT 文本分布的统计几何距离，对具体的文本内容善恶一无所知；只有当参考模型本身足够安全时它才有意义。

## Taught in

[奖励建模课程](../../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/)将 KL 解释为防御奖励作弊的核心调控旋钮，[RLHF 课程](../../../phases/10-llms-from-scratch/07-rlhf/)构建了带惩罚的目标函数，而[对齐信号课程](../../../phases/18-ethics-safety-alignment/01-instruction-following-alignment-signal/)涵盖了对齐税与应对方案。
