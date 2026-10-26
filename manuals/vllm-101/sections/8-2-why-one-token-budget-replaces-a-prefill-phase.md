# 为什么一个 token 预算取代 prefill 阶段

> 本节解释调度器循环、decode 优先，以及通过重算处理抢占。

很多 LLM serving 的讲解会把工作分成 prefill 阶段和 decode 阶段。vLLM 调度器没有这两个阶段。读完本节，你可以用一步说明调度器做了什么，也能解释为什么 chunked prefill 默认开启。

## 对每个请求都问同一个问题 {#s-why-one-token-budget-replaces-a-prefill-phase-one-question-for-every-request}

调度器会问每个请求同一个问题：这个请求还有多少 token 需要计算？新请求需要处理所有 prompt token。正在运行的请求需要一个 token；启用 speculative decoding 时可能需要更多。调度器源码里的注释也是这个意思：不存在 decode 或 prefill 阶段，只有尚待计算的 token 数。

每一步中，调度器都有一个 token 预算，由 `--max-num-batched-tokens` 设置。对于显存小于 70 GiB 的 GPU（例如 L4），`vllm serve` 默认预算是 2,048。它按以下顺序分配预算：

1. 先为每个正在运行的请求分配它所需的 token，直到预算用完。
2. 预算仍有余量、且能够容纳正在运行的请求时，再接纳等待中的请求。`--max-num-seqs` 限制并发运行的请求数。对于 `vllm serve`，显存小于 70 GiB 的 GPU 默认值是 256；A100 以外、显存更大的 GPU 默认值是 1,024。

如果长 prompt 无法塞进当前剩余预算，就先计算其中一段，后续步骤再继续。这就是 chunked prefill。它默认开启，因为这种预算设计无需其他机制就能支持分块。

```figure
id: fig-8-2
kind: timeline
title: 一个 token 预算
claim: 每一步分配 2,048 个 token：先给正在运行的请求一个 decode token，再把剩余预算分给新 prompt 的分块。
caption: 每行代表一个调度步骤。Prompt 分块按比例绘制；decode 块加宽以便看清。虚线空白表示未使用预算。来源：vLLM v0.31.0 源码。
```

## 为什么 decode 优先 {#s-why-one-token-budget-replaces-a-prefill-phase-why-decode-goes-first}

先处理正在运行的请求，已经看到输出流的用户就能继续收到 token。新 prompt 等待剩下的预算。vLLM 文档说明了这种取舍：预算越小，输出流越平滑；预算越大，长 prompt 的首 token 越快。默认值 2,048 偏向保证输出流。显存至少 70 GiB 的 GPU 默认值是 8,192，[长 prompt 章节](#s-keep-long-prompts-from-stalling-short-ones)列出了详细规则。

## 显存耗尽时会发生什么 {#s-why-one-token-budget-replaces-a-prefill-phase-what-happens-when-memory-runs-out}

正在运行的请求每生成 16 个 token 就需要一个新的 KV block。没有空闲 block 时，调度器会抢占一个请求。默认的先来先服务策略会选最新开始运行的请求，释放它占用的所有 block，再把请求放回等待队列最前面。它之后再次运行时，vLLM 会从头重新计算这个请求的 token。

较早的 vLLM 版本还可以先把 block 复制到 CPU 内存，之后再复制回来。当前 engine 只会重算，因为文档认为在这种架构中重算更便宜。代价是被抢占请求的耗时变长，并会反映在 `vllm:num_preemptions` 计数器上。

## 为什么只用一个预算 {#s-why-one-token-budget-replaces-a-prefill-phase-why-one-budget}

所有工作共用一个预算，调度器就能保持简单。Prefix caching 只会减少待计算的 token 数。Speculative decoding 只会增加正在运行请求的 token 数。同一个循环就能处理两者。代价是同一个数值要同时平衡首 token 时间和输出流；没有一个数值适合所有负载。

```takeaways
- 调度器每步用同一个预算分配每个请求尚需计算的 token。
- 正在运行的请求优先获得预算，因此输出流更平滑。
- 显存不足时，vLLM 会释放请求所占空间，并在之后重新计算该请求。
```

Sources: the vLLM source at v0.31.0 (vllm/v1/core/sched/scheduler.py, vllm/config/scheduler.py), vLLM documentation at v0.31.0 (docs/configuration/optimization.md).
