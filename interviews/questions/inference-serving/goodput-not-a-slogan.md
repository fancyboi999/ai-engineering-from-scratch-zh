---
id: goodput-not-a-slogan
title: 为什么“每秒 255 个 token”只是口号
card: inference-serving
kind: concept
level: 1
roles: [inference-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, ml-breadth]
tags: [goodput, throughput, p99, ttft, tpot]
minutes: 6
lessons: [phases/17-infrastructure-and-production/08-inference-metrics-goodput]
manuals: [sglang-101#s-sglang-benchmark-serving, vllm-101#s-benchmark-your-server-in-15-minutes]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

一位同事在团队频道里说，服务器每秒能跑 255 个 token。这算一个结果吗？你会追问什么？哪一个数字能告诉你该在什么时候停止加用户？

## Short answer

这是口号，不是结果，因为不带同时测得的延迟，吞吐量数字描述不了用户能感受到的任何东西。要问清并发数，该并发下首 token 时间和每 token 时间的中位数与 P99，还有客户端、temperature 和 GPU 频率。决定上限的是 goodput：同时满足所有延迟目标的请求每秒有多少个，或者占多大比例；在手册的 GB10 上，BF16 服务器的 goodput 在上限为 4 时最高，而吞吐量一直涨到上限 64。

## Full answer

### 同一台服务器，两种负载

255 这个数来自手册自己的一次采集。同一台服务器在一种负载下给出这个吞吐量时，首 token 中位时间是 0.8 秒，在另一种负载下是 3.9 秒：

| 上限 | 输出 tok/s | 中位 TTFT | P99 TTFT | 中位 TPOT |
|---|---|---|---|---|
| 1 | 175.15 | 162.98 ms | 270.18 ms | 4.38 ms |
| 8 | 255.63 | 785.79 ms | 2180.87 ms | 22.52 ms |
| 32 | 252.74 | 3917.54 ms | 8262.86 ms | 93.61 ms |

从上限 8 到 32，吞吐量下降约 1%，首 token 中位时间变为原来的 5 倍，每 token 中位时间变为原来的 4.2 倍。服务器已经没有空闲算力；新用户只能等待与其他请求共享同样的 decode 步。

### Goodput

goodput 是同时满足所有延迟上限的请求所占的比例，或者每秒的请求数：首 token 时间低于上限，每 token 时间低于上限，端到端时间也低于上限。任何一项没达到，这个请求就不算好。课里的规则是：goodput 只有 60% 时，吞吐量再高也是失败；goodput 99% 时，吞吐量低一些才是目标。

手册的目标是首 token 低于 1 秒，每 token 平均时间低于 100 ms。在 GB10 上运行 Qwen3-30B-A3B：

| 上限 | BF16 goodput | BF16 中位 TPOT | FP8 goodput | FP8 中位 TPOT |
|---|---|---|---|---|
| 4 | 0.44 req/s | 71.01 ms | 0.80 req/s | 38.60 ms |
| 8 | 0，有一个种子最高 0.04 | 102.21 ms | 1.07 req/s | 54.96 ms |
| 16 | 0 | 154.24 ms | 1.10 req/s | 81.90 ms |
| 32 | 0 | 201.91 ms | 0 | 104.12 ms |

BF16 的 goodput 在上限 4 时最高。到上限 8 时，中位请求每个 token 超过了 100 ms，所以至少一半请求没有达标，goodput 为 0，有一个种子最高 0.04，而这时吞吐量是每秒 74.11 个 token，还在上涨。FP8 一直到上限 16 都能达标。按你自己目标下的 goodput 选上限，吞吐量曲线只用来解释这个选择。

### 为什么平均值是错误的统计量

课里给出了分布的形状：一个 decode batch 里如果有一个做长 prefill 的邻居，大部分 token 在每个 7 ms 左右，少数在 60 ms 左右，于是平均值是 9 ms，P99 是 65 ms，而用户经常会碰上 P99。把中位数、P90 和 P99 一起报告。各个工具的定义也不一致：一个请求首 token 用 500 ms，之后用 700 ms decode 出 100 个 token，排除首 token 的工具报告每 token 7.07 ms，包含首 token 的工具报告 12.00 ms。每个数字都要写明工具和定义。

### 拐点在哪里，由谁来执行

闭环测试永远不会落后，因为每个客户端都要等到回答后才发下一个请求。固定到达率不会等。在固定到达率下，GB10 的 BF16 服务器在每秒 0.5 个请求时，每 token 中位时间就已经是 177.5 ms，只有每秒 0.07 个请求达标；FP8 在每秒 1 个请求以内每个请求都达标，到每秒 2 个时降到 0.17。在引擎之外的客户端或网关里，按拐点限制并发，因为引擎自己的准入上限来自显存，在那台服务器上是 4096 个运行请求，远高于拐点。

### 一个数字背后的下限

课里说明了 L4 上每 token 时间从何而来：一次 decode 要读 16.41 GB 权重，在 300 GB/s 下至少要 54.7 ms，实测这一步是 60.16 ms。每 token 100 ms 的目标，在这张卡上给 BF16 的 8B 模型留下的余地很小，所以池和精度比调度器更先起作用。

## Follow-ups

- **Level 1:** 吞吐量数字旁边应该写上哪些数？ Expected: 并发数或请求速率，该点上首 token 时间和每 token 时间的中位数与 P99，再加上客户端、temperature 和频率作为背景。
- **Level 2:** 上限为 8 时 goodput 降到零，吞吐量却还在涨。这两者怎么可能同时成立？ Expected: 服务器每秒写出了更多 token，但中位请求每个 token 超过了 100 ms，所以至少一半请求没有达标，几乎没有请求满足所有上限；吞吐量数的是 token，goodput 数的是按时到达的请求。
- **Level 3:** 为什么平均值不适合衡量每 token 时间？ Expected: 这个分布有长长的右尾；一个 batch 里有一个做长 prefill 的邻居时，大部分 token 在 7 ms 左右，少数在 60 ms 左右，于是平均值是 9 ms，P99 却是 65，而用户经常碰上 P99。
- **Level 4:** 两个工具对同一次运行报告了不同的每 token 时间。为什么？你怎么办？ Expected: 一个在计算 token 间隔时排除了首 token，另一个包含了它，课里的例子是 7.07 ms 对 12.00 ms；每个数字都写明工具和定义，要比较的所有运行都用同一个工具。

## Wrong answers

- "每秒 255 个 token 就是这台服务器的容量。" 同一台服务器给出这个吞吐量时，在一种负载下首 token 中位时间是 0.8 秒，在另一种负载下是 3.9 秒；不带延迟的数字不是结果。
- "一直加用户，吞吐量不涨了就停。" 在 GB10 上，BF16 吞吐量一直涨到上限 64，而从上限 8 起 goodput 就是 0 或接近 0；决定上限的是延迟目标，不是吞吐量曲线。
- "报告每 token 的平均时间。" 这个分布右偏，9 ms 的平均值可能藏着 65 的 P99；要报告中位数、P90 和 P99。
- "引擎自己的准入上限会保护用户。" 引擎的上限来自显存，而显存要等延迟早已不可接受之后很久才会用完；要在客户端或网关里按拐点限制并发。

## Taught in

[SGLang 基准测试一节](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)和 [15 分钟压测你的服务器](../../../manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md)测出了拐点，[推理指标一课](../../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/en.md)给出了 goodput 的定义。
