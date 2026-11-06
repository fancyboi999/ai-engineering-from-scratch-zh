---
id: prefill-and-decode
title: 一个请求的两个阶段
card: inference-serving
kind: concept
level: 1
roles: [inference-engineer, applied-ai-engineer]
rounds: [screen, ml-breadth]
tags: [prefill, decode, ttft, tpot, itl]
minutes: 6
lessons: [phases/17-infrastructure-and-production/04-vllm-serving-internals]
manuals: [vllm-101#s-understand-what-happens-to-your-request]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

用户向服务引擎发了一个对话请求，回答以流式返回：一开始慢，之后一个词一个词地出来。描述从请求到达到最后一个 token，GPU 都做了什么。说出这些阶段的名字，以及你会为每个阶段在看板上放哪些数字。

## Short answer

一个请求有两个阶段。prefill 一次读完整个 prompt，把它的 key 和 value 写进 KV cache，这时 GPU 忙于计算。之后 decode 每一步为每个请求写一个 token，为此每一步都要读一遍所有权重，这时 GPU 在等显存。衡量它们的有四个数字：TTFT 衡量首 token 之前的等待，TPOT 和 ITL 衡量流，每秒输出 token 数衡量整台服务器。

## Full answer

### Prefill

prefill 在一步里处理很多 prompt token。每个 prompt token 的 key 和 value 都写进 KV cache。这一步每读一个字节要做很多计算，所以是计算受限。prompt 越长，首 token 越晚。

### Decode

decode 每一步为每个运行中的请求生成一个新 token。不管 batch 多大，这一步都要把模型的全部权重读一遍。这一步搬运大量字节，计算却很少，所以受限于显存带宽。这就是为什么在 dense 模型上，加大 batch 每一步几乎不额外花钱：一步里所有请求共用一次权重读取。

### 四个数字

| 数字 | 衡量什么 | 谁能感受到 |
|---|---|---|
| TTFT | 从请求到首 token 的等待，主要是排队时间和 prefill | 等着回答开始的人 |
| TPOT | 首 token 之后 token 之间的平均时间 | 读长回答的人 |
| ITL | 两个 token 之间的每一段间隔；它的 P99 显示最严重的停顿 | 看着流时停时走的人 |
| 吞吐量 | 所有用户合起来每秒的输出 token 数 | 为 GPU 付钱的人 |

四个数字一起报告。单独一个吞吐量数字会掩盖用户感受到的延迟。

### 负载对它们的影响

手册用 vLLM 0.31.0 测量了 Qwen/Qwen3-30B-A3B 从 1 个用户到 64 个用户同时使用的情况：

| 同时在线用户 | 中位 TTFT | 中位 TPOT | 每秒输出 token |
|---|---|---|---|
| 1 | 257 ms | 32.3 ms | 29.5 |
| 64 | 965 ms | 243.8 ms | 239.3 |

64 个用户时，服务器每秒写出的 token 约为 8 倍。每个用户等首 token 的时间变为原来的将近 4 倍，每个 token 的时间变为原来的约 7.5 倍。繁忙的服务器每个 token 更便宜，对每个用户却更慢。每个调优选择都会改善这四个数字中的一个，同时让另一个付出代价。

### 一个调度器，不是两个阶段

引擎并不把两个阶段作为分开的步骤来运行。在 vLLM 中，每个调度步有一个 token 预算。运行中的请求先拿到下一个 decode token。剩下的预算分块给 prompt token。prefill 只是一个还有很多 token 要计算的请求。

## Follow-ups

- **Level 1:** 对读长回答的人来说，四个数字里哪个最重要？ Expected: TPOT，即 token 之间的平均间隔，再加上反映最严重停顿的 P99 ITL。
- **Level 2:** 为什么 decode 受限于显存带宽，prefill 受限于计算？ Expected: 一个 decode 步要读完所有权重，才为每个请求产出一个 token，所以搬运的字节占主导；一个 prefill 步一次处理几百个 prompt token，所以每个字节对应的计算量很高。
- **Level 3:** 在手册的运行中，64 个用户的输出约为 1 个用户的 8 倍。为什么每 token 成本和每个用户的等待会往相反方向变？ Expected: 每个 decode 步为所有运行中的请求读一次权重，所以更多请求共用一次读取；而每个请求也要等更长的一步。
- **Level 4:** 课里描述了 prefill 阶段和 decode 阶段。vLLM 调度器用的是什么？ Expected: 每一步一个 token 预算；运行中的请求先拿下一个 token，prompt 分块填满剩下的，所以 prefill 就是一个还有很多 token 要计算的请求。

## Wrong answers

- "要优化的是吞吐量，其他的自然会跟上。" 吞吐量是 GPU 的主人付钱买的东西；用户感受到的是 TTFT 和 token 之间的间隔，64 个用户时，手册的服务器写出了 8 倍的 token，而每个用户等待每个 token 的时间变为原来的约 7.5 倍。
- "prefill 和 decode 在引擎里是两个分开的步骤。" vLLM 调度器每一步有一个 token 预算；运行中的请求先拿一个 decode token，prompt 分块填满剩下的，所以两个阶段在同一步里混在一起。
- "TPOT 和 ITL 是同一个数字。" TPOT 是一个请求每个输出 token 的平均时间；ITL 是两个 token 之间的每一段间隔，它的 P99 显示了平均值掩盖的停顿。

## Taught in

请求的流程见 [vLLM 101 中请求经历了什么一节](../../../manuals/vllm-101/sections/1-3-understand-what-happens-to-your-request.md)和[服务引擎内部机制一课](../../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/en.md)。
