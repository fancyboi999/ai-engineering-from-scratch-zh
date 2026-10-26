# 理解请求的处理过程

> 请求处理分成读取提示词和生成答案两个阶段，四个指标分别衡量这两个阶段。

你发送请求后，答案一开始等了一会儿，随后逐个 token 返回。读完本节，你可以说出请求处理的两个阶段，以及本手册所有基准都会报告的四个数字。

**我们的测量结果：**在 DGX Spark 上，64 个用户的总输出量是单个用户的 8 倍。每个用户生成一个 token 的等待时间约为单用户时的 7.5 倍。

## 两个阶段 {#s-understand-what-happens-to-your-request-two-phases}

**Prefill（提示词处理）：**一次性读取完整提示词，并把它的 key 和 value 写入 KV cache。一次 prefill 会处理许多提示词 token，因此 GPU 主要在执行计算。

**Decode（逐 token 生成）：**逐步生成答案，每个请求每步生成一个 token。每一步都要读取模型的全部权重，为每个正在运行的请求生成一个 token。此时 GPU 更多是在等内存，而不是等计算。

vLLM 不会把这两个阶段拆成独立流水线。每个调度步骤共用一个 token 预算。正在运行的请求先获得下一个 decode token，调度器再把剩余预算用于分块处理提示词。长提示词可能需要多个步骤。[第 8 部分](#s-why-one-token-budget-replaces-a-prefill-phase)会解释 vLLM 为什么采用这种方式。

```figure
id: fig-1-3
kind: flow
title: 一个请求经过三个进程
claim: 一个请求经过三个进程：API server 为它分词，engine core 负责调度，GPU worker 运行模型。
caption: 实线箭头表示请求前进，虚线箭头表示 token ID 返回，点线箭头表示文本流。来源：vLLM 0.31.0 源码。
```

## 四个数字 {#s-understand-what-happens-to-your-request-four-numbers}

| 指标 | 衡量内容 | 影响谁 |
|---|---|---|
| TTFT（首 token 延迟） | 从收到请求到返回第一个 token 的时间，主要包括排队和 prefill | 等待答案开始的用户 |
| TPOT（每个输出 token 的耗时） | 第一个 token 之后，生成相邻 token 的平均间隔 | 阅读长答案的用户 |
| ITL（token 间隔延迟） | 相邻 token 之间的每个时间间隔；其 99 百分位数能反映最严重的卡顿 | 看到输出时断时续的用户 |
| 吞吐量 | 所有用户合计每秒生成的输出 token 数 | 为 GPU 付费的人 |

## 同一台服务器，两种负载 {#s-understand-what-happens-to-your-request-one-server-two-loads}

用户数量增加时，这些指标会相互牵制。下表记录 DGX Spark 使用 vLLM 0.31.0 服务 Qwen3-30B-A3B 时，从 1 个并发用户增加到 64 个并发用户的结果。

| 并发用户 | TTFT 中位数 | TPOT 中位数 | 每秒输出 token 数 |
|---|---|---|---|
| 1 | 257 ms | 32.3 ms | 29.5 |
| 64 | 965 ms | 243.8 ms | 239.3 |

64 个用户并发时，服务器每秒输出约 8 倍的 token。每个用户等待首 token 的时间接近 4 倍，每个 token 的生成时间则超过 7 倍。服务器越忙，每个 token 的成本越低，但单个用户的响应也越慢。

本手册的每个调优章节都会改变这四个数字之一，并说明它以哪个数字为代价。

```figure
id: fig-1-3b
kind: chart
title: 同一台服务器，两种负载
claim: 在 DGX Spark 上，64 个用户的总输出量是单用户时的 8 倍，每个用户生成一个 token 的等待时间则约为 7.5 倍。
caption: 左图表示服务器整体，右图表示单个用户。带状范围表示三次运行中的最小值和最大值。来源：capture/gpu/summary/gb10.json。
```

```takeaways
- 同时报告 TTFT、TPOT、P99 ITL 和吞吐量。
- 调优前先确定用户最在意哪个指标。
```

来源：vLLM 0.31.0 文档（docs/design/metrics.md、docs/configuration/optimization.md），capture/gpu/summary/gb10.json（load.vllm），capture/gpu/out-gb10/server-load-vllm.log。
