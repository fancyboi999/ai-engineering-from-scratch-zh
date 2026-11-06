---
id: retries-that-amplify
title: 服务商变慢，你的服务却崩溃了
card: production-mlops
kind: debug
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer, applied-ai-engineer]
rounds: [debugging, system-design]
tags: [retries, backoff, fallback, rate-limits]
minutes: 12
lessons: [phases/11-llm-engineering/13-production-app, phases/17-infrastructure-and-production/24-chaos-engineering-llm]
manuals: []
practice: []
cheatsheet: [production-llm-app, sre-for-ai]
related: [production-mlops/budget-burn-pauses-chaos, production-mlops/checks-in-order-of-cost]
updated: 2026-11-03
---

服务商变慢时，开始返回限流错误。几分钟内，你自己的服务就耗尽内存并崩溃，尽管入站流量没有变化。还原故障过程，并修正重试策略。

## Short answer

网关重试了每个被限流的调用，每个等待重试的请求都将连接、缓冲区和请求状态保留在内存中。重试让在途并发量达到真实流量的数倍，内存占用随之增加。策略应改用带抖动的指数退避、固定且较少的尝试次数、在途请求上限，以及切换备用方案而非一直等待的降级链。

## Full answer

### 故障链条

1. 服务商对部分调用返回 429。
2. 网关逐个重试。每次重试在等待时保留连接、缓冲区和请求状态。
3. 在途请求数变成流量乘以尝试次数。混沌工程课程称之为重试放大的并发。
4. 内存占用随在途请求数增加，一分钟前还健康的服务耗尽了内存。

### 生产应用综合项目的重试策略

带抖动的指数退避：等待约 1 秒，再等 2 秒、4 秒，每次等待都加上随机偏移；重试 3 次后放弃，返回降级响应。课程表格区分了几种情况：

| 故障 | 重试 | 降级 |
|---|---|---|
| 429，限流 | 是，带退避 | 请求入队，并告诉用户正在处理 |
| 500，服务端错误 | 是，尝试 3 次 | 切换备用模型 |
| 超时超过 30 秒 | 是，尝试 1 次 | 使用更短的 prompt 或更小的模型 |

抖动与退避同样重要。没有抖动时，所有客户端同时重试，服务商每个周期都会遭遇一波请求。

### 限制并发，而不只是尝试次数

尝试次数只限制单个请求的重试，限制不了同时等待的请求数量。在网关设置在途请求上限，并将重试预算设为流量的一定比例。达到上限后立即转入队列或降级流程，而不再占着内存等待。

### 降级链

先用主模型，再用备用模型，再返回缓存响应，最后返回简短的不可用提示。每一步都用质量换取可用性，用户始终能收到回应。

### 下次变慢前先测试

混沌工程课程的首个模型专属实验会让服务商限流几分钟，观察降级表现。大多数团队在这里才发现，降级从未得到完整演练。

## Follow-ups

- **Level 3:** 为什么只用退避阻止不了内存增长？ Expected: 退避拉开重试时间，每个等待重试的请求仍保留状态。修复还需要限制在途请求数。
- **Level 3:** 队列能做什么，是重试做不到的？ Expected: 不占连接或工作线程就能保存请求，并向用户返回进度提示，而非超时。
- **Level 4:** 备用模型更便宜也更弱，谁决定可以接受，如何监控？ Expected: 产品负责人指定哪些路径可以降级。按路径记录降级比例，持续偏高时告警。

## Wrong answers

- "加快重试，在内存耗尽前清空队列。" 加快重试只会增加发往已经限流的服务商的请求速率。
- "提高最大重试次数，让用户看不到错误。" 每次尝试都占内存，更多尝试会成倍增加在途状态。
- "故障是服务商造成的，我们没什么可修。" 服务商造成了错误，重试策略才把错误变成了停机。

## Taught in

[生产应用课程](../../../phases/11-llm-engineering/13-production-app/)给出退避、重试限制和降级链，[混沌工程课程](../../../phases/17-infrastructure-and-production/24-chaos-engineering-llm/)指出重试风暴是需要测试的故障。
