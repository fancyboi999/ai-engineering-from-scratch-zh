---
id: goodput-sets-the-cap
title: 吞吐量还在涨时怎样选并发上限
card: inference-serving
kind: tradeoff
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, ml-depth]
tags: [goodput, concurrency, tpot, latency-target, benchmark]
minutes: 12
lessons: [phases/17-infrastructure-and-production/08-inference-metrics-goodput]
manuals: [sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: [inference-load-testing]
related: [inference-serving/kv-pool-users-fit]
updated: 2026-11-03
---

你在一张 GPU 上部署一个对话模型。负载压测显示，上限设到 64 个并发请求时，输出吞吐量还在上涨，所以团队想把上限定为 64。产品要求首 token 在 1 秒内到达，之后文字要稳定地流出来。你选哪个上限？怎么为它辩护？

## Short answer

按 goodput 选上限，不按吞吐量。goodput 只统计满足所有延迟目标的请求，所以在吞吐量停止上涨之前很久，它就已经降到零了。在 SGLang 手册的压测里，BF16 的 goodput 在上限 4 时最高，从上限 8 起就是 0。吞吐量曲线只用来解释这个选择。

## Full answer

### 吞吐量为什么会掩盖拐点

KV 池大，服务器就能准入更多请求。在手册的 GB10 上，池能装 234,600 个 token，所以 BF16 的吞吐量在上限 64 时还在上涨。准入的请求越多，每个 decode 步要分给越多请求，每个请求每秒拿到的 token 就越少。吞吐量衡量的是服务器。延迟衡量的是用户。

### 先定目标

手册把首 token 低于 1 秒、每 token 平均时间低于 100 ms 的请求算作好请求。压测之前把目标写下来。不带目标的 goodput 数字没有意义。

### 读压测结果

| 上限 | BF16 goodput | BF16 中位 TPOT | FP8 goodput | FP8 中位 TPOT |
|---|---|---|---|---|
| 4 | 0.44 req/s | 71.01 ms | 0.80 req/s | 38.60 ms |
| 8 | 0 | 102.21 ms | 1.07 req/s | 54.96 ms |
| 16 | 0 | 154.24 ms | 1.10 req/s | 81.90 ms |
| 32 | 0 | 201.91 ms | 0 | 104.12 ms |

上限为 8 时，BF16 的中位请求每个 token 已经超过 100 ms。这时吞吐量是 74.11 tok/s，还在上涨。FP8 一直到上限 16 都能达标。所以答案取决于部署配置：在这台机器上，BF16 约为 4，FP8 约为 16。

### 为选择辩护

- 每个点跑三个种子，并给出范围，让评审能看出差距是真实的。
- 每次运行前重置前缀缓存。热缓存会让首 token 看起来很快。
- 按并发上限做的测试是闭环测试。真实用户按自己的节奏到达，所以还要用请求速率跑一轮开环压测，并检查那里的 goodput。

## Follow-ups

- **Level 2:** 吞吐量和 goodput 有什么区别？ Expected: 吞吐量统计每秒的全部 token 或请求；goodput 只统计满足了所有延迟目标的请求。
- **Level 3:** 为什么闭环的上限测试永远看不到队列在增长？ Expected: 每个客户端都要等到回答后才发下一个请求，所以服务器收到的工作永远不会多于它完成的工作。
- **Level 3:** FP8 在上限 16 时能达标，BF16 不能。切换部署配置之前你要检查什么？ Expected: 在你自己的评测上检查输出质量，再看 KV 池的大小，因为 FP8 腾出显存，池会变大。
- **Level 4:** GPU 在高负载下会变热。这会怎样改变你的压测？ Expected: 每次运行都记录 GPU 频率和热状态，每次运行前让 GPU 冷却到一个固定温度。

## Wrong answers

- "把上限设在吞吐量最高的地方。" 在压测范围内吞吐量曲线没有峰值，而 BF16 从上限 8 起每个请求都没有达标。
- "只看首 token 的中位时间。" 中位数可能藏着慢的那一半请求，而且首 token 很快时，每 token 时间也可能不达标。
- "只用一次运行的 goodput。" 一次运行可能因为你看不到的原因出错，所以要跑三个种子并报告范围。

## Taught in

[SGLang 101 的基准测试一节](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md#goodput-finds-the-knee-that-throughput-hides)测量了不同上限下的 goodput，[推理指标一课](../../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)定义了每个指标。
