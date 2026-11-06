---
id: batch-lane-triage
title: 把工作负载分成交互、异步和 batch 三类
card: cost-capacity
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [batch-api, workload-triage, latency-sla, cost]
minutes: 5
lessons: [phases/17-infrastructure-and-production/15-batch-apis]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/two-cache-layers]
updated: 2026-11-03
---

一个团队把夜间报表流水线和聊天产品放在同一个同步端点上跑，理由是这条流水线属于生产。你怎样给模型工作负载分类？这一条该归到哪里？

## Short answer

按用户能接受的延迟给每个工作负载分类，不按它运行在哪里。交互工作负载有用户在等第一个 token，保持同步调用并启用 prompt 缓存；半交互工作负载几分钟内返回，走异步队列。用户等得起完整承诺时限的任务都该走 batch API，它有 50% 的折扣，承诺 24 小时内返回，通常几小时就返回。如果到 24 小时上限才返回仍能赶上截止时间，或者有同步回退兜住迟到的 batch，夜间报表就属于 batch。

## Full answer

### 三条道

| 道 | 用户 | 路径 |
|---|---|---|
| 交互 | 等第一个 token | 同步调用，启用 prompt 缓存 |
| 半交互 | 提交后过几分钟回来看 | 异步队列，带同步回退 |
| batch | 早上或下班前拿到结果即可 | batch API，再叠加输入缓存 |

### 分错道

课程的规则说得很直白：生产不是延迟规格，SLA 才是。常见错误是只因为跑在生产里，就把所有东西都算成交互。它的近亲是部分交互陷阱：一份带刷新按钮的报表，用户乐意等上十分钟，却做成了同步调用。课程算过，50 个并发刷新的成本，是同一份报表走 batch 生成、再用邮件送达的 10 倍。

### batch 承诺什么

24 小时内返回，通常几小时就返回，因为提供商在算力空闲时才跑 batch。课程把这叫作异步，而不是慢。

### 和缓存叠加

夜间流水线的每次调用都共用一个系统 prompt。缓存这个前缀，再把流水线放到 batch 上跑，按课程的算法，成本落在同步无缓存成本的 10% 左右。课程开头的例子只改了三项配置，就把一条要同步跑四小时的夜间流水线改成 batch，账单降到原来的约 9%。

### 另一个陷阱

各家提供商的 batch 文件格式不同，所以一个 batch 客户端要为每家提供商写一个适配器；号称支持多提供商 batch 的网关，底下也还是在包装各家的原始格式。

## Follow-ups

- **Level 1:** 用哪个问题给工作负载分道？ Expected: 等一天对这个用户意味着什么。如果用户根本不会注意到，就是 batch。
- **Level 2:** 用户点了健康报告的刷新按钮，毫无怨言地等了十分钟。这属于哪条道？ Expected: 最多算半交互；如果报告可以邮件送达，就是 batch。做成同步调用就掉进了部分交互陷阱。
- **Level 2:** 课程为什么说 batch 是异步而不是慢？ Expected: 它承诺一天内返回，通常几小时就返回，因为提供商在算力空闲时运行它。
- **Level 3:** 为两家提供商写一个通用的 batch 客户端，会在哪里出问题？ Expected: 两家的文件格式不同，所以每家都需要一个适配器。

## Wrong answers

- "它跑在生产里，所以是交互。" 生产只说明它在哪里运行。分到哪条道取决于用户能接受的延迟。
- "batch 意味着要等一天才有结果。" 承诺的是一天以内。通常几小时就返回。
- "50% 的折扣不值得增加这些复杂度。" 在共享前缀上，它和缓存叠加后成本约为同步调用的十分之一，课程称之为最省钱却没人采用的手段。

## Taught in

[batch API 课程](../../../phases/17-infrastructure-and-production/15-batch-apis/)定义了三条道和两个陷阱。
