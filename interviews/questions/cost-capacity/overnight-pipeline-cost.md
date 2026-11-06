---
id: overnight-pipeline-cost
title: 给缓存了 prompt 的 batch 夜间流水线估价
card: cost-capacity
kind: estimate
level: 3
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [system-design, screen]
tags: [batch-api, prompt-caching, cost-per-request, offline-jobs]
minutes: 12
lessons: [phases/17-infrastructure-and-production/15-batch-apis, phases/17-infrastructure-and-production/14-prompt-semantic-caching]
manuals: [vllm-101#s-run-batch-and-offline-jobs]
practice: []
cheatsheet: [llm-cost-caching, inference-load-testing]
related: [cost-capacity/batch-lane-triage, cost-capacity/cache-break-even]
updated: 2026-11-03
---

一条夜间流水线要给 50,000 份文档写摘要，每次调用都以同一个系统 prompt 开头。它同步调用一家提供商，跑四个小时，每晚花约 2,000 美元。估算同样的任务改用 batch API 并缓存系统 prompt 后花多少钱，并说明什么时候你会把它搬到自己的 GPU 上。

## Short answer

batch 对输入和输出 token 统一打 50% 的折扣；缓存系统 prompt 后，首次写入之后重复的输入便宜约十倍。两者叠加，课程的算例只改了三项配置，每晚就降到约 180 美元，接近同步账单的 9%。当任务每晚都跑、利用率很高，而且共享前缀很短，两项折扣都没多少可省时，就把它搬到自己的 GPU 上；规划这次运行的规模时，不断提高并发，直到输出不再增长。

## Full answer

### 三份账单

课程把同步无缓存的账单写成：文档数乘以每次调用按全价计算的输入和输出 token，共享 prompt 约 4000 个 token，每份文档输出约 200 个 token。

1. **同步，无缓存。** 每次调用都为完整的 prompt 和完整的输出付费。
2. **同步，有缓存。** 系统 prompt 写入一次，其余 49999 次调用以约十分之一的输入价格读取它。
3. **batch，有缓存。** 在上面的基础上，读取、写入和输出再打 50% 的折扣。

课程的结论是：batch 加缓存约为同步无缓存账单的 10%，它算的那条流水线从每晚 2,000 美元降到约 180 美元。

### 估算没体现的东西

- 输出 token 只享受 batch 折扣。缓存复用的是 prompt 的注意力状态，对生成的 token 不起作用，所以输出长、prompt 短的任务省得少得多。
- batch 的第一次调用要付缓存写入溢价。和几万次读取相比，这点钱可以忽略。如果 batch 跑的时间超过缓存有效期，读取超过五次后，写入价格为 2 倍的一小时版本就值得用。
- 抽查一部分结果的 usage 字段。如果 batch 里的请求全都没命中缓存，就只会看到写入、没有读取，那第二重折扣根本就没发生。
- 承诺 24 小时内返回，通常几小时返回。一个晚上比承诺的时限短，所以早上的截止时间只有在通常的返回时间内才赶得上。提前一天提交 batch，或者为迟到的 batch 保留同步回退。

### 什么时候自己的 GPU 更划算

课程的练习要求算出共享前缀多长时，batch 加缓存会胜过一台通宵运行的预留 GPU。自己的 GPU 在三个条件同时满足时胜出：任务每晚都能让一台预留 GPU 保持忙碌；共享前缀很短，没多少可缓存；输出很长，提供商那边只剩 batch 折扣这一根杠杆。数据驻留要求本身就可能决定这个选择。

### 怎样规划自建运行的规模

vLLM 手册给离线任务的做法是：一次调用就把整个 prompt 列表传给离线引擎类，或者对一个请求文件运行 batch 命令，然后提高并发，直到输出不再增长。在手册那张卡上，32 个并发请求时输出升到每秒 273.9 个 token，64 个时降到 241.4，因为池满了，GPU 也降频了。为了吞吐，把 token 预算调到 8,192 以上，因为没人等待时，首 token 慢一点没有代价；再对照运行中的请求数和缓存使用率，看是哪个上限在起作用。

## Follow-ups

- **Level 3:** 两种折扣里，哪一种作用在输出 token 上？ Expected: 只有 batch 折扣。缓存降低的是重复输入的价格，对生成的 token 不起作用。
- **Level 3:** 每个 batch 的第一次调用都要付缓存写入溢价。这会改变估算吗？ Expected: 在这个量级上不会。一次写入多付四分之一，对面是几万次十分之一价格的读取。
- **Level 4:** 预留 GPU 什么时候能胜过 batch 加缓存？ Expected: 任务每晚都让 GPU 保持忙碌，共享前缀短，输出长，两种折扣都没多少可省。课程练习算出了盈亏平衡的前缀长度。
- **Level 4:** 在自己的 GPU 上，怎样找到这个任务合适的并发数？ Expected: 把整个列表交给离线引擎或 batch 命令，提高并发直到每秒输出 token 数不再增长，并调高 token 预算。手册那张卡在约 32 个并发请求时达到峰值。

## Wrong answers

- "单靠 batch 就能把成本降到十分之一。" 单靠 batch 只能把账单减半。另一个因素是缓存的共享 prompt。
- "缓存在输出上省的和在输入上一样多。" 缓存复用的是 prompt 的注意力状态。每个输出 token 都要生成，并按全价计费，只扣掉 batch 折扣。
- "batch 对夜间任务来说太慢。" 承诺是一天，通常几小时就返回。提前一天提交，或者为少数迟到的 batch 保留同步回退。

## Taught in

[batch API 课程](../../../phases/17-infrastructure-and-production/15-batch-apis/)在夜间流水线上叠加了两种折扣，[缓存经济学课程](../../../phases/17-infrastructure-and-production/14-prompt-semantic-caching/)给出了缓存写入和读取的价格，[vLLM 101 的 batch 任务一节](../../../manuals/vllm-101/sections/3-6-run-batch-and-offline-jobs.md)找出了自建运行的吞吐上限。
