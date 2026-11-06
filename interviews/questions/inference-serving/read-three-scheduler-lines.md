---
id: read-three-scheduler-lines
title: 解读三条调度器日志
card: inference-serving
kind: code-reading
level: 2
roles: [inference-engineer]
rounds: [debugging, screen]
tags: [scheduler-log, radix-cache, kv-pool, prefill-batch, metrics]
minutes: 8
lessons: []
manuals: [sglang-101#s-the-scheduler-loop-and-schedule-policy, sglang-101#s-radixcache, sglang-101#s-reading-other-peoples-benchmarks]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

下面是两个服务引擎在负载下的三行日志。逐个读取字段，说明服务器当时在做什么、用户感受到什么，以及你会针对哪个数字采取行动。

```text
[2026-10-16 14:01:00] Prefill batch, #new-seq: 7, #new-token: 955, #cached-token: 15102, token usage: 0.05, #running-req: 1, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 1472.94
[2026-10-16 13:59:09] Decode batch, #running-req: 8, #token: 4075, token usage: 0.02, cuda graph: False, gen throughput (token/s): 98.37, #queue-req: 0
INFO 10-17 22:35:43 [loggers.py:320] Engine 000: Avg prompt throughput: 460.3 tokens/s, Avg generation throughput: 323.6 tokens/s, Running: 40 reqs, Waiting: 11 reqs, GPU KV cache usage: 99.5%, Prefix cache hit rate: 8.7%
```

## Short answer

第一行是 SGLang 的 prefill 批次：准入 7 个请求，计算 955 个新 prompt token，另有 15,102 个来自 radix 缓存，池占用 5%，没有请求等待，这是缓存正常工作的共享前缀负载。第二行是 8 个运行中请求的一个 decode 步，每秒输出 98.37 个 token，队列为空，服务器健康且负载较轻。第三行是 vLLM 的池已满：40 个运行、11 个等待，缓存使用率 99.5%，命中率 8.7%，新请求在等显存，需要处理的是池的容量。

## Full answer

### 逐字段读取 SGLang prefill 日志

- `#new-seq` 是这批 prefill 准入的请求数：7。
- `#new-token` 是计算的 prompt token 数：955。`#cached-token` 是从 radix 树复用的 token 数：15,102。7 个请求共用一段已被更早请求计算过的长系统 prompt，所以只有各自的问题是新的。
- `token usage` 是运行中请求与缓存前缀合计占用的 KV 池比例：0.05，说明池几乎为空。
- `#running-req` 统计正在 decode 的请求：1。`#queue-req` 统计等待的请求：0。`#pending-token` 统计已准入请求中尚未完成 prefill 的 token：0。
- `cuda graph` 表示这一步是否回放了捕获的 graph。日志来自不支持 graph 的平台，False 符合预期。
- `input throughput` 是这个批次的 prefill 速度：每秒 1,472.94 个 token。

同一基准测试关闭 radix 缓存后，8 个请求填满了三个 prefill 批次，每批最多 4,096 个 token，每批都是 `#cached-token: 0`。4,096 是 prefill 分块大小。

### decode 日志

SGLang 为每个 prefill 批次打印一行，默认每 40 个 decode 步打印一行 decode 日志。这行显示 8 个请求一起 decode，占用 4,075 个 token，池使用率 2%，每秒输出 98.37 个 token，没有排队。同一次运行前面的日志说明了批次如何形成：先准入 1 个请求，7 个等待；随后其余 7 个一起准入，以每秒 1,914 个 token 的速度计算 3,553 个新 token；最后 8 个请求作为同一个批次 decode。prefill 批处理带来了吞吐量，日志展示了这一过程。

### vLLM 统计日志

`Running` 和 `Waiting` 是运行和排队的请求数：40 和 11。`GPU KV cache usage` 是池的使用比例：99.5%。`Prefix cache hit rate` 是来自缓存的 prompt token 比例：8.7%。prompt 和生成吞吐量说明了引擎在这个时间段内的工作：40 个请求在 decode 时，它以每秒 460.3 个 token 的速度为新 prompt 做 prefill，因此每次新 prefill 都与运行中的流共享调度步。那次运行在 L4 上有 64 个用户，中位首 token 时间是 10,953 ms，P99 token 间隔是 1,363 ms。低命中率不是故障：基准测试发送的 prompt 各不相同，可共享的内容很少。

### 针对什么采取行动

- 第 1 行：无需操作。确认工作集变大时仍能命中，因为缓存前缀和运行中请求处在同一个池里。
- 第 2 行：无需操作。服务器还有余量，压测能说明余量有多大。
- 第 3 行：池的容量。用 FP8 cache 或 FP8 权重扩大池，或者减少每个副本的用户数。限制运行请求数只会决定谁来等待。

也要读取启动时的池容量日志。同一张卡上写的是 `GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x`，其中 2.94 假设每个请求都用满最大长度。

### 日志没有显示什么

这些日志都没显示 GPU 频率、发送负载的客户端，以及运行前是否清空了缓存。结果中应把这些信息放在日志旁边。

## Follow-ups

- **Level 2:** 第一行里，为什么缓存数比新计算数大得多？ Expected: 7 个请求共用一段长系统 prompt，更早的请求已经算过它，所以由树提供，只有问题是新的；同一基准测试关闭缓存后，每批有 4,096 个新 token，缓存数为零。
- **Level 3:** 第三行命中率是 8.7%。缓存坏了吗？ Expected: 没有；随机基准测试发送各不相同的 prompt，共享内容很少；命中率取决于 prompt，这行重要的是池占用 99.5%，11 个请求在等待。
- **Level 3:** token usage 字段包含什么？什么时候需要担心？ Expected: 运行中请求与缓存前缀合计占用的池比例；接近 1.0 时池已满，新请求排队，缓存前缀被驱逐。
- **Level 4:** 限制运行请求数能帮助第三行中的服务器吗？ Expected: 不能；池已满，上限只决定谁等待，把等待移到首 token 之前；用 FP8 cache 或 FP8 权重扩大池，或者减少每个副本的用户数。

## Wrong answers

- "命中率 8.7% 说明前缀缓存配置有误。" 各不相同的 prompt 共享内容很少；命中率反映的是 prompt，同一引擎在共享前缀的运行中高得多。
- "token usage 为 0.05 说明服务器几乎空闲。" 它说明池几乎为空；GPU 仍可能很忙，每秒 1,472.94 个 prompt token 就说明了这一点；要看运行和排队数来判断负载。
- "cuda graph: False 说明有问题。" 它表示这一步没有回放捕获的 graph，在不支持 graph 的平台以及 prefill 批次中符合预期；在 CUDA 上，要看 decode 日志中的值。
- "Waiting: 11 队列很短，可以忽略。" 池占用 99.5% 时，每个排队请求都在等某个运行中请求结束，那张卡上 64 个用户时的中位首 token 时间是 10,953 ms；瓶颈是池。

## Taught in

[调度器循环与 --schedule-policy](../../../manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md)和 [RadixCache](../../../manuals/sglang-101/sections/3-3-radixcache.md)解释了 SGLang 日志，[阅读他人的 SGLang 基准测试](../../../manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md)展示了满池时的 vLLM 统计日志。
