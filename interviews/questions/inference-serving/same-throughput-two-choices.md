---
id: same-throughput-two-choices
title: 吞吐量相同，池满时的两种选择
card: inference-serving
kind: tradeoff
level: 4
roles: [inference-engineer]
rounds: [design-review, system-design]
tags: [engine-choice, p99-itl, ttft, full-pool, benchmark]
minutes: 12
lessons: []
manuals: [sglang-101#s-reading-other-peoples-benchmarks, vllm-101#s-tune-chat-for-many-users]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

同一张 L4 上运行 Qwen/Qwen3-8B，KV 池同为 24,096 token，64 个用户的闭环压测中，vLLM 每秒输出 241 个 token，SGLang 为 257 个，吞吐量基本打平。但对话团队说，这个负载下一个引擎不可用，另一个没问题。他们看到了什么？你会为对话服务选哪个引擎？

## Short answer

他们看到的是池满时的两种不同选择。64 个用户时，vLLM 运行 40 个请求、11 个等待，池占用 99.5%，首 token 时间缩短为另一引擎的约 1/1.7，即 10,953 对 18,356 ms；但每个新 prefill 都与运行中的 decode 共享调度步，P99 token 间隔是 1,363 ms，而 SGLang 为 114 ms，后者运行 37 个请求、27 个等待。对话场景要在真实负载和流量形态下把 P99 ITL 与首 token 时间一起看，因为两个引擎默认选择了不同的取舍，SGLang 上一个参数就能改变这种取舍。

## Full answer

### 对齐池和频率

手册做了三项设置，让差异只来自引擎。vLLM 设置 `--num-gpu-blocks-override 1506`，即 1,506 个 16 token 块，共 24,096 token；SGLang 自行分配了 24,094 token。两者在同一会话、同一 GPU 上运行，每次开始时温度不超过 72 ℃；SM 频率中位数低于 1,000 MHz 的运行被剔除并重测，最多三次。vLLM 设置 `--max-model-len 8192`，足以容纳所有请求，也绕过了采样器编译问题；基准测试用贪心采样，因此采样器不改变输出。

### 闭环测试

| 并发用户数 | 输出吞吐（tok/s，SGLang / vLLM） | 中位 TTFT（SGLang / vLLM） | P99 ITL（SGLang / vLLM） | SM 中位频率（SGLang / vLLM） |
|---|---|---|---|---|
| 1 | 13.84 / 13.51 | 185 / 192 ms | 104 / 105 ms | 1,290 / 1,290 MHz |
| 8 | 112.46 / 112.79 | 170 / 253 ms | 71 / 68 ms | 1,485 / 1,470 MHz |
| 16 | 201.13 / 200.90 | 212 / 289 ms | 81 / 80 ms | 1,470 / 1,425 MHz |
| 32 | 271.28 / 273.93 | 2,871 / 1,813 ms | 102 / 619 ms | 1,320 / 1,275 MHz |
| 64 | 256.62 / 241.39 | 18,356 / 10,953 ms | 114 / 1,363 ms | 1,215 / 1,013 MHz |

不超过 32 个用户时，两引擎的吞吐量差异在 3% 以内，每 token 时间差异在 6% 以内。池未满时，SGLang 首 token 更快，8 个用户时为 170 对 253 ms。

### 统计日志说明了什么

超过这个点，两引擎的选择不同。SGLang 运行 37 个请求、27 个等待，池占用 92%。vLLM 运行 40 个请求、11 个等待，池占用 99.5%，同时以每秒 460 个 token 为新 prompt 做 prefill。更多请求得以启动，因此首 token 更快。但每个新 prefill 都与运行中的 decode 共享调度步，流就会停顿。最后一行还要附上频率限制：即使尝试三次，vLLM 在 64 个用户时的频率中位数仍为 1,013 MHz，对方为 1,215 MHz，所以部分吞吐量差距来自卡本身。但 17% 的频率差解释不了 token 间隔尾部 12 倍的差距。

### 固定到达率

每秒不超过 2 个请求时，两引擎吞吐量打平。每秒 0.5 个请求时，SGLang 首 token 更快，为 284 对 317 ms；每秒 1 个请求时，vLLM 每 token 时间更短，为 68 对 74 ms。每秒 2 个请求时，vLLM 在延迟目标内服务的请求速率中位数为每秒 1.36 个，SGLang 为 0.88 个，不同种子的范围重叠。从每秒 4 个请求起，两者都跟不上到达率，同样的准入取舍再次出现：vLLM 每秒输出 286.6 对 257.5 个 token，高 11%，但 P99 每 token 时间为 187 对 127 ms。

### 波浪式到达与混合长度

16 个用户、固定 prompt 长度时，请求成批涌入，两引擎吞吐量打平，vLLM 首 token 更快，为 1,499 对 1,775 ms；SGLang 流更平稳，P99 ITL 为 81 对 502 ms。混合长度时，vLLM 默认领先：每秒 169.6 对 159.6 个 token，P99 ITL 为 191 对 363 ms。随后 SGLang 开启 `--enable-mixed-chunk`，把运行中的 decode 放进 prefill 批次，差距缩小到 193 对 191 ms；代价是固定长度时 P99 ITL 从 81 恶化到 203 ms。

### 共享 prompt

共用系统 prompt 时，两边的缓存都能命中，每个共享长度下，两引擎的中位首 token 时间都低于 500 ms。关闭缓存后，共享 4,096 token 时，SGLang 用 14,706 ms，vLLM 用 13,353 ms。这个结果来自缓存，不是引擎。

### GB10

GB10 上，两引擎在 32 和 64 个用户时输出相同；32 个用户时，vLLM 的 P99 ITL 约为另一引擎的两倍，为 478 对 220 ms。

### 怎样选择

这张卡上使用各不相同的 prompt 时，选择主要取决于延迟，流量形态决定胜负。请求同时到达、池满或成批涌入时，SGLang 保护流的平稳性，vLLM 优先首 token。混合长度时 vLLM 默认领先，一个参数便消除了领先。先考虑模型支持、启动时间和现有硬件，再测你自己的长度分布，把 P99 ITL 与首 token 时间一起看。比较引擎必须对齐池和频率，否则不要比较。

## Follow-ups

- **Level 3:** 相同吞吐量下，为什么 vLLM 首 token 更快，流却更差？ Expected: 它准入更多请求，40 对 37，池占用 99.5%，同时以每秒 460 个 token 为新 prompt 做 prefill；每个新 prefill 都与运行中的 decode 共享调度步，所以首 token 更快，流却停顿。
- **Level 4:** 混合 prompt 长度时 vLLM 的流领先，后来 SGLang 追平了。改了什么？ Expected: mixed-chunk 参数把运行中的 decode 放进 prefill 批次，新 prompt 不再中断流；混合长度的 P99 ITL 从 363 降到 193 ms，代价是固定长度时从 81 恶化到 203 ms，因为整批到达的请求也与 decode 共享调度步。
- **Level 4:** 一篇公开对比说一个引擎领先 29%。相信之前你会问什么？ Expected: 版本和日期，负载是否与你的一致，包括重复前缀的比例；显存预算和上下文参数是否对齐，并发是否超过 decode graph 上限，参数是否正确映射，以及谁支付了测试费用。

## Wrong answers

- "吞吐量打平，随便选一个。" 64 个用户、相同输出下，两个引擎的 P99 token 间隔是 1,363 ms 对 114 ms；对话用户感受到的就是这个数字。
- "首 token 更快的引擎更适合对话。" 它用流的停顿换来了首 token；P99 ITL 是另一引擎的 12 倍，没有哪个并发上限能解决；两个数字都要看。
- "基准测试里更快的引擎就是更快。" 只比较池和频率对齐的结果；一篇公开测试让一个引擎用自动显存比例，另一个用 GPU 显存的 0.9，两个池并不相同。
- "结果适用于我们的混合流量。" 胜负随流量形态变化：池满和成批到达时，一个引擎保护流；混合长度时另一个默认领先，一个参数便消除了领先；测你自己的长度分布。

## Taught in

[阅读他人的 SGLang 基准测试](../../../manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md)给出了池对齐的对比，[为大量用户调优对话服务](../../../manuals/vllm-101/sections/3-1-tune-chat-for-many-users.md)补充了 GB10 的 P99 ITL。
