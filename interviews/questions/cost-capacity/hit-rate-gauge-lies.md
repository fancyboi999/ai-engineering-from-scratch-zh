---
id: hit-rate-gauge-lies
title: 同一次抓取里的两个缓存命中率
card: cost-capacity
kind: debug
level: 2
roles: [inference-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [debugging, ml-breadth]
tags: [metrics, prefix-cache, prometheus, gauges]
minutes: 8
lessons: [phases/17-infrastructure-and-production/14-prompt-semantic-caching]
manuals: [sglang-101#s-the-metrics-endpoint]
practice: []
cheatsheet: [sglang-serving, llm-cost-caching]
related: [cost-capacity/two-cache-layers, inference-serving/prefix-cache-order]
updated: 2026-11-03
---

看板上的一个面板显示，一台自建服务器的前缀缓存命中率是 94%。同一次运行中，服务器的计数器显示它计算了 104,057 个 prompt token，从缓存取了 182,079 个。两个读数来自对同一个端点的同一次抓取。做成本决策时你信哪一个？它们为什么不一样？

## Short answer

信计数器。gauge 保存的是调度器最后一次记录的 prefill 区间的命中率，空闲时它一直停在最后一批请求的值上，而那一批是一个共享前缀的基准测试。计数器把服务器启动以来的每个 prefill token 都加了进去，整个运行期间的比值是 0.636，不是 0.942。做成本决策时，用计数器在一个时间窗口上算出命中率。

## Full answer

### 三类序列

gauge 是调度器在每个日志间隔覆盖写入的一个值。一次抓取只能看到最新的值。counter 是只增不减的总量，读的时候算它在一个窗口内的速率。histogram 是一组 counter，每个桶一个，读的时候在一个窗口内算分位数。

### 两个命中率

gauge 用一个日志间隔内的命中 token 数，除以同一间隔内命中 token 与计算 token 之和。没有请求运行时，它保持最后一个值。计数器记录的是启动以来的同样两个量，按模式拆分：input 表示计算的 token，device、host 和 storage 表示各层命中的缓存 token。整个运行期间，182,079 个缓存 token 对应总共 286,136 个 prefill token，比值是 0.636。gauge 的 0.942 描述的是最后跑的那个共享前缀基准测试。两个数都没错，它们回答的是不同的问题。

### 按窗口计算的命中率

计数器的 HELP 文本给出了公式，写成 PromQL 是：

```promql
sum(rate(sglang:prefill_effective_tokens_total{mode=~".*_hit"}[5m]))
  / sum(rate(sglang:prefill_effective_tokens_total[5m]))
```

代码里有一个注意点：命中模式累加的是原始命中数，所以请求被撤回（retraction）之后，同一批 token 可能被算两次。input 模式排除了这种重复计数。手册那次运行没有发生撤回，所以数字是准确的。

### 为什么这是成本问题

命中率决定你要不要重排 prompt 结构、加一个感知缓存的路由器，或者买更多内存。来自最后一次基准测试的 gauge 告诉你 prompt 没问题。计数器告诉你，整个运行期间超过三分之一的 prompt token 是算出来的。缓存经济学课程对提供商缓存也是同样的说法：用每个响应里的 usage 字段测自己的命中率，不要把公开的数字当成你的。

### 该对什么告警

对计数器和 histogram 按窗口告警。只有当条件持续好几分钟时才对 gauge 告警，例如排队请求数大于零，或者 token 使用率接近 1。在一个指标上做面板之前，先读它的 HELP 文本和代码。手册就发现有一个利用率 gauge 在它固定的版本上一直是零。

## Follow-ups

- **Level 2:** gauge 回答什么问题，counter 回答什么问题？ Expected: gauge 回答上一个间隔发生了什么。counter 回答从启动到现在一共发生了多少，在窗口上取速率就能看出趋势。
- **Level 3:** 为什么发生撤回后，按计数器算出的命中率会偏高？ Expected: 命中模式累加原始命中数，一个被撤回后重跑的请求会把它的缓存 token 算两次，而 input 模式排除了这种重复计数。
- **Level 3:** 哪些 gauge 可以触发呼叫，按什么规则？ Expected: 排队请求数大于零和 token 使用率接近 1，而且只在条件持续好几分钟时触发，绝不凭一次抓取。
- **Level 4:** 一次故障期间，这台服务器的一个面板显示利用率为零。为什么？ Expected: 因为一个已知的回归，这个 gauge 在固定的版本上一直是零，所以面板显示整个集群都闲着。在一个指标上搭东西之前，先读 HELP 文本和代码。

## Wrong answers

- "gauge 是最新的值，所以最准。" 它是一个间隔的快照，空闲时还会停在最后一个值上。
- "把两个数取个平均。" 它们回答的是不同的问题，计数器本来就已经包含了整个运行期间。
- "真实命中率更低，那就把缓存关掉。" 0.636 的命中率意味着三分之一的 prompt token 是算出来的。该改的是 prompt 布局或路由，不是缓存。

## Taught in

[SGLang 101 的指标端点一节](../../../manuals/sglang-101/sections/5-2-the-metrics-endpoint.md)在一台服务器上测出了这两个命中率，[缓存经济学课程](../../../phases/17-infrastructure-and-production/14-prompt-semantic-caching/)要求用你自己的 usage 字段计算命中率。
