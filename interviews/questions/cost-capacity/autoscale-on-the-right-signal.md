---
id: autoscale-on-the-right-signal
title: 按队列和缓存信号自动扩缩模型服务
card: cost-capacity
kind: design
level: 3
roles: [inference-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [autoscaling, kubernetes, probes, cold-start]
minutes: 15
lessons: [phases/17-infrastructure-and-production/10-cold-start-mitigation]
manuals: [vllm-101#s-run-vllm-on-kubernetes, vllm-101#s-watch-vllm-in-production, sglang-101#s-operating-sglang]
practice: []
cheatsheet: [gpu-kubernetes, serving-engines-compared]
related: [cost-capacity/warm-pool-or-cold-start, cost-capacity/size-the-pool-from-peak]
updated: 2026-11-03
---

你的模型服务是一个普通的 Deployment，自动扩缩器按 CPU 使用率伸缩。一次流量高峰中，自动扩缩器加副本加得太晚；新 pod 还在加载权重时，它又继续加副本；存活探针还在高峰中途重启了最忙的那个 pod。请重新设计扩缩策略和探针。

## Short answer

按引擎自己的信号扩缩，不按 CPU：等待中的请求数和 KV cache 使用率，比 CPU 早得多就能说明服务器已经饱和。启动探针的窗口要长于实测的冷启动时间，这样正在加载的 pod 既不会接流量，也不会被重启；存活探针要足够轻，免得服务器一忙，探针在队列里等超时，最忙的 pod 就被重启。把权重和编译缓存放在持久化存储上，新副本的就绪时间只需原来的一小部分。

## Full answer

### 为什么 CPU 是错的信号

GPU 负载不是 CPU 负载。引擎饱和时，等待请求数大于零，缓存使用率接近 1，CPU 却看起来很平静。vLLM 手册对普通 Deployment 说得很直接：它随机路由，而且按错误的信号扩缩。手册列出的路由层读取 `vllm:num_requests_waiting`、`vllm:num_requests_running` 和 `vllm:kv_cache_usage_perc` 来选择副本，自动扩缩器也应该读这几条时间序列。

### 成对解读信号

| 读数 | 含义 |
|---|---|
| waiting 大于 0，缓存使用率低于 0.9 | 限制准入的是批大小或 token 预算，不是显存 |
| waiting 大于 0，缓存使用率接近 1 | 限制准入的是缓存池，需要加显存或加副本 |
| 首 token 慢，但没有请求在等 | prompt 太长或分词器太慢，不是容量问题 |
| 长回答伴随抢占（preemption） | 运行中的请求不断变长，直到缓存池耗尽 |

第二行说明该加副本了，因为缓存池已满。遇到第一行时，缓存池还有空间，先调大批大小上限或 token 预算。如果调完队列还在，或者上限已经调到延迟目标允许的位置，再加副本，因为每个副本都带来一份自己的批大小上限和 token 预算。

### 匹配慢启动的探针

手册示例给启动探针配置了 90 次检查、间隔 10 秒，也就是 15 分钟，并说明手册自己的机器首次启动用了约 8 分钟。窗口要按你实测的冷启动时间来定。就绪探针发一个简短的真实请求，证明引擎能生成；引擎有就绪端点时，也可以用这个端点。存活探针用一个轻量的健康检查路径。SGLang 手册在健康检查端点里关掉了生成，原因是：会生成的探针在高负载下要在队列里排队，20 秒后超时，把一台只是繁忙的服务器标成不健康。在一次事故中，每个失败的探针还在调度器里留下一个孤儿请求，探针反而加重了它本来要检测的负载。

### 阻止过度扩容

新 pod 要花几分钟加载。自动扩缩器看到信号还高，就继续加。给它配置一个不短于冷启动时间的稳定窗口（stabilization window），限制每一步新增的副本数，并直接缩短冷启动：权重放在本地磁盘，编译缓存放在持久卷上，服务器接流量前先预加载。冷启动课程还为交互路径加了 warm pool，保证第一个副本永远不是冷的。

### 缩容时不丢请求

先把 pod 从负载均衡中摘掉，只向主进程发送 SIGTERM，宽限期至少等于输出上限下最长请求的耗时。强制 kill，或者把信号发给整个进程组，会丢掉所有正在运行的请求。

## Follow-ups

- **Level 3:** 哪一对读数说明瓶颈在缓存池，而不在批大小上限？ Expected: 等待请求数大于零，同时缓存使用率接近 1。缓存使用率低于 0.9 时，限制准入的是批大小或 token 预算。
- **Level 3:** 为什么会生成文本的健康探针在高负载下有害？ Expected: 它的请求和其他请求一样在队列里等，然后超时，把一台繁忙的服务器标成不健康。在一次事故中，每个失败的探针还留下了一个孤儿请求。
- **Level 4:** 冷启动期间，怎样防止自动扩缩器过度扩容？ Expected: 稳定窗口至少和实测冷启动一样长，限制每一步新增的副本数，并用持久化的权重和编译缓存缩短冷启动。
- **Level 4:** 缩容要满足什么条件，才能一个请求都不丢？ Expected: 把 pod 从负载均衡中摘掉，只向主进程发送 SIGTERM，宽限期至少等于输出上限下最长请求的耗时。

## Wrong answers

- "改按 GPU 利用率扩缩，不用 CPU。" 请求在排队时利用率可能很高，缓存池已满时利用率也可能很低。队列和缓存使用率才是引擎为此暴露的信号。
- "把存活探针调严，坏 pod 能更快重启。" 高负载下，严格的探针会重启健康但繁忙的 pod。正确做法是用轻量探针，加上足够长的启动窗口。
- "加副本加得更快，就能赶在高峰前面。" 要加载几分钟的副本，在高峰期间帮不上忙，高峰过后还在花钱。应该缩短冷启动，并保留一些预热余量。

## Taught in

[vLLM 101 的 Kubernetes 一节](../../../manuals/vllm-101/sections/6-4-run-vllm-on-kubernetes.md)配置探针并指出错误的扩缩信号，[生产监控一节](../../../manuals/vllm-101/sections/5-2-watch-vllm-in-production.md)成对解读指标，[SGLang 101 的运维一节](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)讲解健康探针事故和排空流程，[冷启动课程](../../../phases/17-infrastructure-and-production/10-cold-start-mitigation/)给出 warm pool 的容量规划。
