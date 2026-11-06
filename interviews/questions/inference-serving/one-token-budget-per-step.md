---
id: one-token-budget-per-step
title: 用一个 token 预算代替两个阶段
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer]
rounds: [ml-depth, system-design]
tags: [continuous-batching, chunked-prefill, token-budget, scheduler]
minutes: 8
lessons: [phases/17-infrastructure-and-production/04-vllm-serving-internals]
manuals: [vllm-101#s-why-one-token-budget-replaces-a-prefill-phase, vllm-101#s-keep-long-prompts-from-stalling-short-ones]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

大多数讲连续批处理的材料，都说 GPU 上有一个 prefill 阶段和一个 decode 阶段在轮流运行。请描述 vLLM 调度器在一步里实际做的事。在这个设计里，chunked prefill 从何而来？控制它的值在哪里看？

## Short answer

调度器对每个请求问同一个问题：它还需要计算多少个 token？每一步有一个 token 预算，由 `--max-num-batched-tokens` 设定，运行中的请求先拿走它们的下一个 token。等待中的 prompt 填满剩下的预算，所以长 prompt 会被分到好几步里，chunked prefill 不需要额外的机制。

## Full answer

### 对每个请求问同一个问题

新请求需要计算它全部的 prompt token。运行中的请求需要一个 token，开启推测解码时更多。代码里没有 prefill 阶段，也没有 decode 阶段，只有一个还要计算多少 token 的计数。

### 一步之内的顺序

1. 每个运行中的请求拿到它需要的 token，直到预算用完。
2. 只要还有预算和空间，就准入等待中的请求。`--max-num-seqs` 限制运行中的请求数。

一个 prompt 放不进剩下的预算时，这一步先算一部分，其余留到后面几步。这就是 chunked prefill，它默认开启，因为预算设计不需要别的东西来支持它。

### 默认值取决于 vLLM 读到的显存

| vLLM 读到的 GPU 显存 | 预算，`vllm serve` | 预算，`LLM` 类 | `--max-num-seqs`，两者相同 |
|---|---|---|---|
| 160 GiB 或以上 | 16,384 | 16,384 | 1,024 |
| 70 GiB 或以上，但不是 A100 | 8,192 | 16,384 | 1,024 |
| 更少，或未知 | 2,048 | 8,192 | 256 |

手册里那台统一内存机器有 121.69 GiB 由 CPU 和 GPU 共享，它的日志显示的仍是 2,048，也就是小 GPU 或未知 GPU 的值。改之前，先看清你的服务器用的是什么值。在 0.31.0 中，日志不会以预算自己的名字打印它；在引擎配置那一行里找 `compile_ranges_endpoints`，列表里最大的数就是预算。

### 为什么 decode 先来

运行中的请求先拿，这样已经在看流式输出的用户能继续看到它。新 prompt 等着用剩下的。预算小，流更平稳；预算大，长 prompt 的首 token 更快。2,048 这个小默认值是偏向流的选择。

### 为什么只用一个预算

所有类型的工作共用一个预算，调度器就很简单。前缀缓存只是减少要计算的 token 数。推测解码只是增加运行中请求要计算的数。同一个循环处理所有这些情况。代价是由一个数字决定首 token 和流之间的平衡，而没有哪个值适合所有负载。

课里的玩具调度器用固定的 512 token 分块。真实引擎在 0.31.0 中没有单独的分块大小：分块就是这一步剩下的预算。

## Follow-ups

- **Level 2:** 前缀缓存开启，一个 2,048 token prompt 的请求在缓存里找到了 1,024 个 token。调度器给它记多少？ Expected: 还要计算 1,024 个 token；缓存只是减少计数，同一个循环处理这个请求。
- **Level 3:** 一台有 121.69 GiB 统一内存的服务器在日志里记录的预算是 2,048。为什么不是 8,192？ Expected: 默认值取决于 vLLM 读到的显存，而统一内存机器被识别为偏小或未知显存，所以拿到了小值；改之前先看 compile_ranges_endpoints。
- **Level 4:** 开启推测解码，draft token 为三个。预算规则怎么变？ Expected: 不变；运行中的请求现在每一步需要不止一个 token，所以它的计数变大，预算还是按同样的顺序分配。

## Wrong answers

- "chunked prefill 是一个要手动开启的参数。" 它是预算的自然结果：放不进剩余预算的 prompt 先算一部分、其余后算，所以它默认开启，也没有单独的机制。
- "新 prompt 先来，这样首 token 更快。" 运行中的请求先拿 token，这样已经在看流的用户能继续看到它；新 prompt 等着用剩下的预算。
- "每张 GPU 上的预算都是 2,048。" 它取决于 vLLM 读到的显存：70 GiB 以下是 2,048，70 GiB 或以上是 8,192，160 GiB 或以上是 16,384，离线的 LLM 类用的值更大。

## Taught in

[为什么一个 token 预算能代替 prefill 阶段](../../../manuals/vllm-101/sections/8-2-why-one-token-budget-replaces-a-prefill-phase.md)和[长 prompt 一节](../../../manuals/vllm-101/sections/3-3-keep-long-prompts-from-stalling-short-ones.md)给出了规则和默认值，[服务引擎内部机制一课](../../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/en.md)提供了玩具调度器。
