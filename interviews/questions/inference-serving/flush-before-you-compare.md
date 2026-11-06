---
id: flush-before-you-compare
title: 前缀缓存藏起来的拐点
card: inference-serving
kind: debug
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, screen]
tags: [benchmark, prefix-cache, flush, knee, ttft]
minutes: 8
lessons: []
manuals: [vllm-101#s-benchmark-your-server-in-15-minutes, sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

你在 L4 上做的第一轮并发压测显示，16 个用户以内首 token 中位数是 0.3 秒，32 个用户时是 1.8 秒，于是你把生产上限定为每个副本 20 个用户。第二轮压测在每次运行前做了重置，16 个用户时首 token 就已经是 1.6 秒。你相信哪一轮？两轮为什么不一致？

## Short answer

相信做了重置的那一轮。第一轮所有用户数共用一台服务器，又用固定的随机种子，在每个用户数下发出相同的前几个 prompt，所以 32 个用户以下，很多请求在前缀缓存里找到了自己的 prompt，跳过了 prefill。重置之后，中位首 token 时间每一档都在上升，4 个用户约 0.65 秒，8 个约 1.0 秒，16 个约 1.6 秒，P99 ITL 从 8 个用户时约 70 ms 跳到 16 个用户时 522 ms，所以这张卡的拐点在 8 到 16 个用户之间，不在 16 到 32 之间。

## Full answer

### 缓存怎样美化了第一轮

用固定种子的 random 数据集，每次运行都发出同样的 prompt。第一轮在同一台服务器上跑完了所有用户数，所以每次运行都会在缓存里找到前面几次运行的 prompt。它产出的表如下，Qwen/Qwen3-8B，vLLM 0.31.0，每个点三个种子：

| 用户数 | 输出 tok/s | 中位 TTFT | 中位 TPOT | P99 ITL |
|---|---|---|---|---|
| 1 | 13.5 | 191 ms | 60.4 ms | 105 ms |
| 8 | 112.8 | 253 ms | 65.8 ms | 67 ms |
| 16 | 201.3 | 288 ms | 69.5 ms | 85 ms |
| 32 | 275.1 | 1,800 ms | 101.8 ms | 613 ms |
| 64 | 242.3 | 11,181 ms | 129.2 ms | 1,233 ms |

16 到 32 个用户之间的跳变看起来像拐点。其实那是吞吐量的峰值。命中缓存的 prompt 跳过了 prefill，所以首 token 来得很快，而 32 个用户以下的大多数请求都占了这个便宜。

### 清空后的对比

同样的压测，频率 900 MHz，每次运行前重置缓存，并与同一会话中不清空的运行对比：

| 用户数 | vLLM，清空 / 不清空 | SGLang，清空 / 不清空 |
|---|---|---|
| 4 | 650 / 145 ms | 532 至 645 / 141 ms |
| 8 | 951 至 978 / 264 至 274 ms | 1,174 至 1,273 / 173 至 178 ms |
| 16 | 1,550 至 1,587 / 294 至 295 ms | 1,804 至 1,944 / 218 ms |
| 32 | 1,982 至 2,084 / 2,012 至 3,091 ms | 3,216 至 3,228 / 2,710 至 2,917 ms |

从 32 个用户起，排队占了主导，重置几乎没有影响。在此之下，快速的首 token 大多来自缓存。

### 同一负载上的影响有多大

16 个用户下把同样的 64 个 prompt 连续跑四次，中位 TTFT（ms）：vLLM 首次 925，不清空重跑 148，清空后重跑 1,163，再不清空重跑 184。SGLang 分别是 394、82.5、289 和 77。不清空的重跑，首 token 时间在 vLLM 上缩短至约六分之一，在 SGLang 上缩短至约 1/4.8。每个 token 的时间变化不到 15%，因为命中只省掉 prefill 的工作，decode 的工作不变。

在 GB10 上，这个效应甚至让一轮压测的结果倒了过来。工具包的一次运行中，上限 8 时首 token 中位时间是 677.61 ms，上限 32 时是 390.38 ms：负载更大，首 token 反而更快。prefill 日志说明了原因。上限 8 时，64 个 prompt 中有 16 个在运行开始前就已经在缓存里；上限 32 时是 128 个中的 64 个；上限 64 时是 256 个中的 128 个。换成三个种子、每次用全新的服务器之后，首 token 时间恢复了正常顺序，8 时 209.98 ms，32 时 416.37 ms。

### 规范流程

1. 每次运行都从空缓存开始。重启服务器，或调用重置接口：vLLM 上是 `POST /reset_prefix_cache`，它只在 `VLLM_SERVER_DEV_MODE=1` 时存在，绝不能对外暴露；SGLang 客户端用 `--flush-cache`，它会在预热之后调用 `/flush_cache`。SGLang 只在没有请求运行或等待时才清空，否则接口返回 HTTP 400，日志里也会写明。
2. 每次运行换一个新种子，让 random 数据集发出新的 prompt。
3. 记录命中缓存的 token 数。在运行前后读取前缀缓存计数器，或者开启按响应统计，vLLM 上是 `--enable-prompt-tokens-details`，SGLang 上是 `--enable-cache-report`。
4. 把缓存设置和命中的 token 数写在结果旁边。

vLLM 的 sweep 工具会在两次运行之间替你重置服务器缓存。

## Follow-ups

- **Level 2:** 清空和不清空的两组运行之间，为什么每个 token 的时间几乎没变？ Expected: 缓存命中只省掉 prefill 的工作，decode 的工作不变，所以 TTFT 下降，TPOT 的变化不到 15%。
- **Level 3:** 在 GB10 上，一次运行里上限 32 的首 token 比上限 8 还快。这怎么可能？ Expected: 几次运行共用一台服务器和同一个种子，所以上限 32 那次在缓存里找到了之前运行留下的 128 个 prompt 中的 64 个，一半请求跳过了 prefill；三个种子加全新服务器让首 token 时间恢复了正常顺序。
- **Level 3:** SGLang 的清空接口返回了 HTTP 400。发生了什么？ Expected: 服务器只在没有请求运行或等待时才清空；当时还有请求未完成，所以清空没有执行，日志里写明了这一点，这次运行要么等待，要么重启服务器。
- **Level 4:** 如果要有意把热缓存效应纳入基准测试，你怎么做？ Expected: 把它当成单独的一个维度来测；从计数器或按响应字段记录每次运行命中的 token 数，并把热缓存一行和冷缓存一行并排报告，各自附上命中率，而不是让两者不明比例的混合决定拐点。

## Wrong answers

- "16 到 32 个用户之间从 0.3 秒跳到 1.8 秒，这就是拐点。" 那轮压测没有重置，32 个用户以下的大多数请求跳过了 prefill；重置后 P99 ITL 在 8 到 16 个用户之间从约 70 ms 跳到 522 ms，那才是拐点。
- "做基准测试时把前缀缓存关掉。" 生产环境是开着它的；应该在两次运行之间重置它，每次换新种子，并记录命中的 token 数。
- "每个 token 的时间也虚高了，所以整轮压测都作废。" 命中只省掉 prefill 的工作；清空与不清空的运行之间，每个 token 的时间变化不到 15%，所以 TPOT 那一列可用，TTFT 那一列不可用。
- "random 数据集每次运行都会给出新的 prompt。" 种子相同时，客户端发出的 prompt 也相同；这个数据集只在不同种子之间是随机的，所以每次运行要换新种子。

## Taught in

[15 分钟压测你的服务器](../../../manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md)和 [SGLang 基准测试一节](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)给出了清空与不清空的运行对比以及重置流程。
