# 在 vLLM 和 SGLang 之间做选择

> 在我们的机器上，固定用户数时两种 engine 的吞吐量接近；延迟取决于流量形态。

你要选择 serving engine，希望依据测量结果，而不是名声。读完本节，你可以将自己的流量与我们并排运行的测试进行匹配，并判断结果适用范围。

**我们的测量结果：**在 L4 上，并发不超过 32 个用户时，吞吐量差异在 3% 以内。在 DGX Spark 上，并发从 32 个用户开始，vLLM 的最差 token 间隔约为 SGLang 的两倍。

## 了解比较范围 {#s-decide-between-vllm-and-sglang-know-what-we-compared}

我们在两台机器上以默认设置运行了 vLLM 0.31.0 和 SGLang 0.5.22：

- NVIDIA L4，使用 BF16 的 Qwen/Qwen3-8B，测试处于[完整时钟时段](#s-front-l4-sessions)。两个缓存池均约为 24,100 个 token。负载测试在 2026-10-17 进行，速率和 waves 测试在 2026-10-18 进行。
- DGX Spark，使用 BF16 的 Qwen/Qwen3-30B-A3B-Instruct-2507。vLLM 缓存池为 234,960 个 token，SGLang 在 233,303 到 251,910 个 token 之间。每次 SGLang 测试都和对应的 vLLM 测试在同一天进行，日期为 2026-10-21。

每个数据点都是三个随机种子的中位数，并且两个 engine 使用了[同一个 benchmark client](#s-benchmark-your-server-in-15-minutes)。这只是两块 GPU 上的两种模型。应将结果用作自己的测试参考，不要当成普遍规律。

## 根据流量选择 {#s-decide-between-vllm-and-sglang-read-the-result-for-your-traffic}

| 流量形态 | 我们的测量 | 选择建议 |
|---|---|---|
| 高并发，接近缓存池上限 | L4 上并发不超过 32 个用户时，吞吐量差异在 3% 以内。vLLM 首 token 更快，SGLang 输出更平滑。 | 重视首 token 时选 vLLM；重视输出平滑度时选 SGLang |
| 固定请求速率超过 GPU 处理能力 | L4 每秒 4 个请求时，vLLM 的输出量高 11% | vLLM |
| 混合长度提示词，16 个并发用户 | 两台机器上 vLLM 的 P99 ITL 都更低 | 默认选择 vLLM |
| 相同长度提示词，16 个并发用户 | 两台机器上 SGLang 的 P99 ITL 都更低 | SGLang |
| 固定速率下的混合长度长提示词，DGX Spark | 每秒 0.5 个请求时 vLLM 的 P99 ITL 较低；每秒 2 个请求时 SGLang 较低 | 按实际速率测量 |
| 可放入缓存池的重复前缀 | 两个 engine 的首 token 延迟相差约 100 ms 以内 | 两者均可 |
| DGX Spark 上的 MoE 模型，高并发 | 吞吐量接近；并发 32 个用户起，vLLM 的 P99 ITL 约为 SGLang 的两倍 | 重视输出平滑度时选 SGLang |

## 查看各项测量数据 {#s-decide-between-vllm-and-sglang-see-the-numbers-behind-each-row}

**L4 上的高并发。**并发 32 个用户时，vLLM 吞吐量为 273.9 tok/s，SGLang 为 271.3。vLLM 首 token 中位延迟为 1,813 ms，SGLang 为 2,871 ms。vLLM 的 P99 ITL 为 619 ms，SGLang 为 102 ms。并发 64 个用户时，吞吐量相差 6%。但 vLLM 的时钟中位数更低，为 1,013 MHz，而 SGLang 为 1,215 MHz，因此不把这项差距计入比较。

这些测试没有重置前缀缓存。2026-10-23，我们在锁定 900 MHz 后重跑，并重置了缓存，整体趋势仍然相同。并发 32 个用户时，vLLM 的首 token 中位延迟为 2.0 至 2.1 s，SGLang 为 3.2 s。vLLM 的 P99 ITL 为 668 至 964 ms，SGLang 为 105 至 106 ms。并发 16 个用户时，分别为 522 ms 和 82 ms。

**L4 上的固定请求速率。**每秒 4 个请求时，vLLM 输出量为 286.6 tok/s，SGLang 为 257.5。随机种子的结果范围没有重叠。每秒 8 个请求时，两者结果范围重叠。每秒 16 个请求时，测试时钟低于我们的运行下限，因此没有纳入比较。

**两台机器上的混合长度和相同长度。**Waves 负载在 16 个并发用户下发送了 64 个提示词，长度比例用于控制提示词和输出长度的变化范围。[实验记录](#s-ref-lab-notes)解释了该设置。L4 上混合长度测试的 P99 ITL：vLLM 为 191 ms，SGLang 为 363 ms。相同长度测试：vLLM 为 502 ms，SGLang 为 81 ms。DGX Spark 上趋势一致：混合长度为 188 和 198 ms，相同长度为 394 和 159 ms。

**DGX Spark 上的 MoE 模型。**并发 64 个用户时，vLLM 输出量为 239.3 tok/s，SGLang 为 245.1，差异落在随机种子范围内。vLLM 的 P99 ITL 为 528 ms，SGLang 为 271 ms；并发 32 个用户时为 478 和 220 ms。两者的随机种子结果范围没有重叠。从并发 2 个用户开始，vLLM 的首 token 中位延迟也始终更长。

**DGX Spark 上的低速率长提示词。**每秒 0.5 个请求、提示词约 1,000 到 4,000 个 token 时，vLLM 的 P99 ITL 较低，为 571 ms，SGLang 为 922 ms。每秒 1 个和 2 个请求时，SGLang 的 P99 ITL 较低。这个 sweep 中 SGLang 的缓存池比 vLLM 大 7%，因此要谨慎解读这一行。

```figure
id: fig-5-3
kind: chart
title: L4 上的吞吐量
claim: 在我们的 L4 上使用 Qwen3-8B 时，并发不超过 32 个用户，vLLM 和 SGLang 的输出量相差不超过 3%。
caption: 两个服务器使用相同 KV 缓存池。带状范围表示三次运行。来源：capture/gpu/summary/l4.json。
```

```figure
id: fig-5-3b
kind: chart
title: GB10 上最差 token 间隔
claim: 在我们的 DGX Spark 上，并发 32 个用户时，vLLM 的 token 间隔 99 百分位数超过 SGLang 的两倍。
caption: 线越高，输出越不平滑。带状范围表示三次运行。来源：capture/gpu/summary/gb10.json。
```

## 设置建议 {#s-decide-between-vllm-and-sglang-decide}

先根据调优之前不会变化的因素做选择：

1. **模型支持。** 确认你的模型和量化格式可以在所选 engine 和固定版本上运行。
2. **启动时间。** 在我们的 DGX Spark 上，加载 57 GiB 权重时，vLLM 用了 330 秒。
3. **硬件。** L4 或 GB10 上的结果不能直接套用到数据中心 GPU，必须重新测试。

然后使用两个 engine 在自己的流量上运行[性能 sweep](#s-benchmark-your-server-in-15-minutes)。两边都使用同一个 benchmark client 和相等大小的缓存池。

```takeaways
- 固定用户数时，两台机器上的吞吐量差异都在几个百分点以内。请求速率超过容量时，vLLM 在 L4 上的输出量高 11%。
- 提示词长度混合时，vLLM 输出更平滑；提示词长度相同时，SGLang 更平滑。
- 在 DGX Spark 上运行 MoE 模型并处于高负载时，SGLang 的输出更平滑。
- 先根据模型支持、启动时间和硬件做选择，再测量自己的流量。
```

来源：capture/gpu/summary/l4.json（vllm 和 sglang 的 load、rate、waves、prefix），capture/gpu/summary/gb10.json（vllm 和 sglang 的 load、mixed、waves），capture/gpu/out-l4/server-h2h-vllm.log、capture/gpu/out-gb10/server-load-vllm.log、capture/gpu/out-l4/load-flushed-vs-unflushed.txt。
