---
id: per-token-or-per-minute
title: 白天负载该按 token 计费还是按分钟计费
card: cost-capacity
kind: tradeoff
level: 2
roles: [applied-ai-engineer, forward-deployed-ai-engineer, inference-engineer]
rounds: [system-design, customer]
tags: [pricing, utilization, dedicated-capacity, inference-platforms]
minutes: 8
lessons: [phases/17-infrastructure-and-production/02-inference-platform-economics, phases/17-infrastructure-and-production/01-managed-llm-platforms]
manuals: []
practice: []
cheatsheet: [managed-llm-platforms]
related: [cost-capacity/warm-pool-or-cold-start, cost-capacity/batch-lane-triage]
updated: 2026-11-03
---

两家推理平台为同一个开放模型给你报价。一家按每百万 token 计费，另一家按分钟出租一块独占 GPU。你的流量在整个工作日都很平稳，夜里接近零。哪种计费更划算？哪个数字决定结果？

## Short answer

决定结果的是持续利用率。按 token 计费只收你用掉的部分，所以在流量突发或很低、独占 GPU 会闲着的时候更划算。按分钟计费收的是挂钟时间，所以一旦你能让 GPU 保持忙碌，它就更划算；课程的经验法则把交叉点放在持续利用率 30% 左右。只在白天运行的负载正好落在这条线附近，所以签约前先测一整周的利用率。

## Full answer

### 同一份输出，两个成本函数

按 token 定价反映的是平台自己在所有客户身上的利用率曲线，你不为任何空闲时间付费。按分钟或按秒定价反映的是独占：GPU 归你，不管有没有请求进来，账单都在走。输出都一样，就是一次模型响应。

### 交叉点

经济学课程给出了规则：独占 GPU 的持续利用率超过约 30% 时，按分钟开始胜过按 token。低于这个值，按 token 更划算，因为你不为空闲付费。托管平台课程在超大规模云厂商的预留容量上看到了同样的形状：盈亏平衡点在持续利用率 40% 到 60% 左右，高利用率时最多能省 70%，而预留容量空闲时也照样计费。

### 用你自己的流量算一遍

1. 取一周内每天每个小时的请求数，以及每个请求的 token 数。
2. 按 token 的账单 = token 总数乘以单价。
3. 按分钟的账单 = 租用小时数乘以单价。除非夜里缩容到零，否则就是全部小时数；而缩容到零意味着每天早上一次冷启动。
4. 利用率 = 忙碌时间除以租用时间。拿它和交叉点比较。

### 价格没体现的东西

- 独占容量不用排在其他租户后面。托管平台课程测得，同一类模型在预留容量上的首 token 中位延迟，比共享按需实例更低。
- 微调模型可能改变按 token 的价格。课程里有一家平台按基座模型的价格提供微调模型，这是它的差异化卖点。独占 GPU 跑哪种模型，按小时的价格都一样。
- 非交互的工作还有第三个选项：batch 档，价格约为 serverless 的一半。

### 混合方案

用独占容量承接白天的基线流量，把溢出的部分和夜间 batch 交给按 token 计费或 batch 计费。这样独占的那部分利用率一直很高，突发流量也不用为一块闲置的 GPU 付钱。

## Follow-ups

- **Level 2:** 高利用率时，为什么按 token 计费比你自己的 GPU 时间更贵？ Expected: 平台的利润和它的空闲时间都算进了按 token 的单价。高利用率时，你在为自己并没有的空闲付费。
- **Level 2:** 夜里把独占 GPU 缩容到零，会有什么变化？ Expected: 你不再为夜里付费，但每天早上要经历一次冷启动，当天最早的那批请求要用延迟来买单。
- **Level 3:** 为什么独占方案的尾延迟更好？ Expected: 共享的按需容量要和其他所有客户的流量竞争，独占容量不用。托管平台课程测出的预留与按需首 token 延迟差距，就来自这里。
- **Level 3:** 微调模型怎样改变这个比较？ Expected: 按 token 计费的平台可能按基座模型价格提供微调模型，也可能为它加价。独占 GPU 无论跑哪种，按小时的价格都一样。

## Wrong answers

- "按 token 总是更便宜，因为从不为空闲付费。" 利用率超过交叉点后，按 token 的单价里包含了平台的空闲和利润，你自己的 GPU 反而更便宜。
- "规模大了，独占总是更便宜。" 只有你能让它保持忙碌时才成立。只在白天运行的负载会让它一半时间闲着。
- "直接比较标价。" 两个价格的单位不同。只有你自己的流量画像才能把它们变成账单。

## Taught in

[推理平台经济学课程](../../../phases/17-infrastructure-and-production/02-inference-platform-economics/)给出了按 token 与按分钟的交叉点，[托管平台课程](../../../phases/17-infrastructure-and-production/01-managed-llm-platforms/)给出了预留容量的盈亏平衡点。
