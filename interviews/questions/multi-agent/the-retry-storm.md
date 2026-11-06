---
id: the-retry-storm
title: 支付故障拖垮了库存服务
card: multi-agent
kind: debug
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, system-design]
tags: [retry-storm, circuit-breaker, cascading-failure, retry-budget, mast]
minutes: 12
lessons: [phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink]
manuals: []
practice: []
cheatsheet: [agent-failure-modes, multi-agent]
related: [multi-agent/a-worker-died-mid-run]
updated: 2026-11-03
---

某支付服务开始出现约 10 percent 的请求失败。几分钟之内，从未失败过的库存服务宕机了，调用这两项服务的订单 agent 全部停滞。支付服务本身自行恢复了。请解释该链路，说出其所属的故障类别，并说明你添加了什么以使其无法复发。

## Short answer

这是一场重试风暴，属于级联可靠性故障。订单 agent 重试了每次失败的支付，每次重试都运行一次新的库存检查，库存承受了约两倍于正常的负载并开始超时，然后每个订单也重试库存检查，库存承受了十倍的负载并崩溃。修复方法是经典的：在每个对外调用上设置熔断器，当下游错误率超过阈值时开启并提供缓存或默认结果，加上每个请求有上限的重试预算。

## Full answer

### 故障链

```text
payment fails about 10 percent of requests
  -> the order agent retries payment, with backoff but no cap
  -> each retry runs a new order-inventory check
  -> inventory sees about twice its normal load
  -> inventory starts to time out
  -> every order retries the inventory check
  -> inventory sees about ten times its normal load
  -> the cluster goes down
```

链路中没有任何内容是模型错误。这是组件之间的协调失败，其重试逻辑是逐个组件分别编写的。

### 故障类别

课程的分类法将其归于级联可靠性故障，这是 agent 放大彼此错误的五种模式之一。它与单一文化、从众、缺失关于彼此信念的模型以及妥协漂移并列。在分类法的所有缓解措施中，熔断器是少数直接取自分布式系统而无需任何改动的措施之一。

### 熔断器

| 状态 | 行为 |
|---|---|
| 关闭（Closed） | 调用通过，熔断器在一个窗口期内记录每次结果 |
| 开启（Open） | 调用被拒绝并提供缓存或默认结果，直到冷却期过去 |
| 半开（Half-open） | 放行一次探测调用；成功则关闭熔断器，失败则重新开启 |

课程的发布默认值是在 5 到 10 percent 的错误率下开启。在课程仿真中，熔断器限制了放大效应：成功计数可能会下降，下游得以存活。

### 重试预算

熔断器保护被调用方。每个请求的重试预算保护系统免受调用方的损害：固定次数的尝试，之后请求失败并记录失败。没有上限的重试就是风暴。

### 更早发现它

重试率是课程列出的缓慢故障代理指标之一，此外还有一致率、输出长度分布以及 agent 版本之间的编辑距离。监视重试激增的检测 agent 可以在库存崩溃之前发现该模式。

## Follow-ups

- **Level 3:** 明明是支付存在错误，为什么最终失败的是库存服务？ Expected: 订单 agent 的重试循环在每次支付重试时都重新运行库存检查，因此库存的负载跟随支付的失败。
- **Level 3:** 熔断器在开启时提供什么？ Expected: 订单 agent 可以在降级模式下依据其行动的缓存或默认结果，因此用户得到较慢的答案而不是没有答案。
- **Level 4:** 熔断器阈值属于哪里，由谁拥有？ Expected: 属于调用方针对下游服务的配置，由运行调用方的团队拥有，并在依赖项的正常错误率变化时复查。
- **Level 4:** 如何在不发生生产事故的情况下测试该修复？ Expected: 模拟器在下游注入 10 percent 的故障率，并测量有和没有熔断器时的总调用数，正如课程所做的那样。

## Wrong answers

- "为支付重试添加指数退避。" 退避减缓了风暴但没有限制它，且每次重试仍会运行库存检查。
- "扩容库存服务以吸收峰值。" 峰值是正常的十倍且由浪费的重试组成，扩容是为风暴买单而不是阻止它。
- "这是模型问题，因此改进 agent 的 prompt。" 链路中没有模型决策，且 prompt 无法看到下游服务的错误率。

## Taught in

[故障模式课程](../../../phases/16-multi-agent-and-swarms/23-failure-modes-mast-groupthink/)模拟了有和没有熔断器情况下的重试风暴。
