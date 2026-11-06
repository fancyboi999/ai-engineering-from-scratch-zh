---
id: loops-hold-the-pool
title: 几个停不下来的回答，占满了所有人的缓存池
card: cost-capacity
kind: debug
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [kv-pool, output-cap, graceful-shutdown, capacity]
minutes: 12
lessons: []
manuals: [sglang-101#s-operating-sglang, vllm-101#s-watch-vllm-in-production]
practice: []
cheatsheet: [sglang-serving, serving-engines-compared]
related: [cost-capacity/size-the-pool-from-peak, cost-capacity/autoscale-on-the-right-signal]
updated: 2026-11-03
---

一台自建服务器的 KV 池连续几个小时接近满载，请求速率却很正常。有几个请求各自已经生成了好多分钟，其他请求背后的用户都在等。这是怎么回事？今晚改什么，明天改什么？

## Short answer

有几个请求陷入了生成循环。运行中的请求，它的每个 token 都会留在池里直到请求结束，所以一个停不下来的请求会不断变大，直到把其他请求挤出去。今晚先限制输出长度，让每个请求都能结束，并给容易循环的工作负载加上 presence penalty。明天按新的上限设置停机宽限期，因为跑到上限的请求决定了一次优雅重启要多久。

## Full answer

### 机制

池里保存着每个运行中请求的每个 token 的 key 和 value。陷入循环的请求一直在生成，就一直在占槽位，直到碰到输出上限或上下文长度。没有上限时，一个循环请求能在整个上下文长度内占住池的一大部分，新请求只能等待，或者运行中的请求会被撤回（retract）。

### 一份形态相同的生产报告

SGLang 手册总结了一个学术服务的经历：它服务了一千亿个 token，遇到了占住 KV cache 的模型循环。它的流量来自 agent 编程工具，prompt 长度的中位数是 2,179 个 token，第 95 百分位是 99,746 个 token。它的修法是运维层面的，没有改内核：输出上限设为 32K token，并对容易循环的工作负载加 presence penalty。手册建议读这类报告时看它修复的先后顺序，这个服务在调任何别的东西之前，先限制了输出。

### 读指标

vLLM 手册的告警表里有这个模式：缓存使用率超过 0.95 持续一分钟以上，等待请求数大于零，抢占率大于零。它的成对解读规则点出了原因：长回答伴随抢占，说明运行中的请求不断变长，直到池被用完。它列出的修法是降低并发或改用 FP8 KV cache，而输出上限才能让长回答变成有界的回答。

### 为什么先定上限，再定宽限期

优雅停机会先把运行中的请求排空再停止。宽限期必须比最长的请求更长，而最长的请求就是跑到上限的那个。SGLang 手册算过：一个 32K token 的回答，以每秒 30 个 token 生成，需要 18 分钟以上。先限制输出，再按上限设置终止宽限期；否则排空永远来不及完成，滚动更新会在回答到一半时杀掉请求。

### 明天

- 找出循环：以长度原因结束、且停在上限的请求，按租户和 prompt 模板分组。
- 设置产品方认可的按租户输出上限。
- 如果长回答其实是真实的 agent 会话，就用 FP8 KV cache 或更多内存扩大池，并调低并发上限。
- 对这对信号告警：缓存使用率接近 1，同时请求速率正常。

## Follow-ups

- **Level 3:** 为什么一个循环请求伤害的不只是它自己，还有其他用户？ Expected: 池是共享的。一个永远不结束的请求一直占着自己的槽位，新请求只能等待，或者运行中的请求会被撤回。
- **Level 3:** 事后怎么找出那些循环的请求？ Expected: 找以长度原因结束、且停在上限的请求，按租户和 prompt 模板分组。
- **Level 4:** 为什么要先定输出长度上限，再决定排空可以花多久？ Expected: 宽限期必须比最长的请求更长，而最长的请求会跑到上限。手册算出，32K token 以每秒 30 个 token 生成需要 18 分钟以上。
- **Level 4:** 如果长回答是正当的 agent 会话，怎么办？ Expected: 用 FP8 KV cache 或更多内存扩大池，调低并发上限，并保留一个产品方认可的输出上限。

## Wrong answers

- "重启服务器，把池清空。" 所有运行中的请求都会失败，下一个 prompt 来了循环还会出现。
- "调大内存比例。" 更大的池只是推迟症状。一个没有上限的请求能填满任何池。
- "调低温度来阻止循环。" 采样设置只改变出现循环的概率。只有上限能保证请求一定会结束。

## Taught in

[SGLang 101 的运维一节](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)报告了输出上限和宽限期的算法，[vLLM 101 的生产监控一节](../../../manuals/vllm-101/sections/5-2-watch-vllm-in-production.md)把抢占计数和回答长度放在一起解读。
