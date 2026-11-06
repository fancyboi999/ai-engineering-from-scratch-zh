---
id: scale-to-zero-policy
title: 按层级配置热副本，并算清这笔账
card: cost-capacity
kind: design
level: 4
roles: [inference-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [warm-pool, scale-to-zero, cold-start, tiers]
minutes: 18
lessons: [phases/17-infrastructure-and-production/10-cold-start-mitigation, phases/17-infrastructure-and-production/02-inference-platform-economics]
manuals: []
practice: []
cheatsheet: [llm-cost-caching, serving-engines-compared]
related: [cost-capacity/warm-pool-or-cold-start, cost-capacity/cold-start-anatomy, cost-capacity/per-token-or-per-minute]
updated: 2026-11-03
---

你在一个 serverless GPU 平台上运行三个层级：实时聊天里的付费用户、同一个聊天里的试用用户，以及一条夜间 batch 流水线。请为每个层级设计 warm pool 策略，给出背后的算法，并说明一个月后你会测量什么来重新评估它。

## Short answer

付费聊天配一到两个热副本，因为它的首 token 目标承受不了大模型几分钟的冷启动。试用用户给更小的余量，或者让他们借用付费池的空余容量；batch 流水线缩容到零，因为它能容忍几分钟的冷启动。这笔账是 GPU 每小时价格乘以空闲小时数，对比冷启动期间会错过目标的请求；一个月后，按层级比较实测的利用率、冷启动次数和错过目标的次数。

## Full answer

### 课程给出的算法

一个热副本每小时都要花一个 GPU 小时。每个产品一个副本，不管有没有人调用，就是一整个月的 GPU 小时；课程的例子是五个产品各留一个热副本，每月空闲 3,600 个 GPU 小时。课程说这笔交易对小模型很残酷，你每小时付 0.85 到 1.50 美元，只为避开 30 秒的启动；对大模型则很友好，每小时约 4 美元就能避开 5 分钟的启动。它给出的必须配 warm pool 的门槛是：70B 及以上的模型，首 token 的 P99 目标低于 60 秒。

### 各层级的策略

| 层级 | 策略 | 原因 |
|---|---|---|
| 付费实时聊天 | 一到两个热副本 | 课程所说的高价值交互路径，冷启动就等于故障 |
| 试用聊天 | 零个热副本，或以较低优先级溢出到付费池 | 损失的是一次转化，可以测量，要拿它和一个月的 GPU 小时比 |
| 夜间 batch | 缩容到零 | 课程接受后台路径上 5 到 10 分钟的冷启动 |

课程的练习要求的正是这种划分，并要求写出算式。付费层由 SLA 决定。batch 层由它的容忍度决定。试用层才是真正要做的决定，而且它是一次实验：第一次会话遇到冷启动造成的转化损失，对比一块空闲 GPU 的价格。

### 缩短启动，让策略更便宜

每一层缓解措施都会把某个层级往零推。预置节点镜像省掉拉镜像，模型流式加载把权重加载时间减半，GPU 显存快照只用一小部分时间就能恢复已加载状态，分层加载把权重留在主机内存里。课程的表格把 328 秒的冷启动降到了约 15 秒。启动只要 15 秒时，试用层可以缩容到零而损失很小，付费池也可以只留一个副本而不是两个。

### 让计费方式匹配层级

热副本的利用率很高，正是按分钟计费胜过按 token 的区域，经济学课程给出的线是持续利用率约 30% 以上。试用的突发流量和夜间 batch 都在这条线以下，所以适合按 token 计费，或者价格约为 serverless 一半的 batch 档。

### 一个月后测量什么

- 每个层级逐小时的利用率。
- 每天的冷启动次数和持续时间。
- 错过首 token 目标的请求，以及它们是否落在冷启动期间。
- 遇到冷启动的试用会话与没遇到的会话的转化率对比。
- 用课程模拟器算出的各层级盈亏平衡请求速率，与实测速率对比。

## Follow-ups

- **Level 3:** 为什么不给试用用户和付费用户一样的 warm pool？ Expected: 不管试用流量来不来，一个热副本都要花一个月的 GPU 小时。要比较的是冷启动造成的转化损失和这笔成本，一个月的测量会给出答案。
- **Level 4:** 冷启动缩短到 15 秒，策略会怎么变？ Expected: 能容忍几秒延迟的层级都可以缩容到零，warm pool 缩小到只覆盖目标在一两秒内的路径。
- **Level 4:** 哪个信号说明热副本数太少？ Expected: 扩容期间错过首 token 目标的请求比例，再加上每天的冷启动次数。

## Wrong answers

- "每个层级都留热副本，成本不高。" 每个产品一个副本，每个都是一个月的 GPU 小时。五个产品空闲着，就是好几千小时。
- "试用层缩容到零，反正这些用户不付钱。" 第一次试用会话遇到几分钟的冷启动，就是一次流失的转化。先测量，再决定。
- "让 batch 流水线保持热状态，好早点跑完。" batch 能容忍几分钟。给它留一块热 GPU，一天里剩下的时间都是在为空闲付费。

## Taught in

[冷启动课程](../../../phases/17-infrastructure-and-production/10-cold-start-mitigation/)给出了 warm pool 的算法和分层策略练习，[推理平台经济学课程](../../../phases/17-infrastructure-and-production/02-inference-platform-economics/)给出了按分钟与按 token 的交叉点。
