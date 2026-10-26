# 阅读他人发布的 SGLang 基准

> 公开 SGLang 结果取决于版本、负载、内存预算、计算图上限和内核；先读这五项，再读数字。

网上被引用最多的 SGLang 数字是“比 vLLM 快 29%”：每秒 16,215 对 12,553 个 token。它来自分析公司 AIMultiple 的一次离线测试，页面更新于 2026-01-25 {{field AIMultiple 2026-01}}。页面将 SGLang“v0.2.3”与 vLLM 0.11.0 并列，版本发布时间相差约两年。至少五篇后续文章重复了这组数字，有些还冠以其他公司名字，但没有一家重跑测试。

读完本节，你能将公开 SGLang 基准拆解为五项输入，判断是否适用于自己，指出背后的机制。你也能说出独立测试在哪些方面一致，这个清单比标题暗示的短得多。

## 每个结果背后的五项输入 {#s-reading-other-peoples-benchmarks-the-five-inputs-behind-every-result}

基准结果是五项输入的函数。公开报告的多数分歧，都能追溯到其中之一。

1. **负载形状。** 输入长度、输出长度、并发、prompt 重复部分的比例。只有前缀重复时基数缓存才有帮助。长输入压迫 prefill，高并发压迫调度器和 KV 池。
2. **内存预算。** 不设置时，SGLang 根据 GPU 计算 `--mem-fraction-static`。vLLM 使用 `--gpu-memory-utilization 0.9`。只设置其中一方，就在比较两个不同的 KV 池。
3. **CUDA graph 上限。** Decode 只有在 batch 大小不超过限制时，才能重放已捕获的计算图。超过后逐个启动内核，以 eager 模式执行。机制见[第 4.1 节](#s-forwardmode-and-cuda-graphs)。
4. **内核路径。** 注意力后端、MoE 内核和量化格式。下面若干报告的胜负，取决于某张 GPU 是否有相应内核。
5. **版本与日期。** 一位分析者在同一 AMD GPU 上测同一模型，每 GPU 吞吐量先为 20.4，26 天后为 2,256 token/s。

**代码**在启动时根据 GPU 内存设置第三项。以 TP 小于 4 的 80 GB H100 为例，默认 decode graph 上限为 256，分块 prefill 大小 8,192。32 GB 卡的上限为 48，在 2026-09-04 从 24 上调。该改动的代码注释称，旧上限使高并发吞吐量远远落后于 vLLM {{code}}。

## 相信数字前先问六个问题 {#s-reading-other-peoples-benchmarks-six-questions-before-you-trust-a-number}

```figure
id: fig-5-3
kind: decision
title: 审视公开 SGLang 基准的六个问题
claim: 未交代版本或负载的结果，无论数字多大，都不能说明你的服务器表现。
caption: 从上往下读。每个问题要么继续下一问，要么终止于玫瑰色说明，指出结果还剩什么参考价值。依据本节引用的实践报告。
```

1. **是否给出 SGLang 版本？** 没有版本，结果描述的就是未知构建。
2. **负载与你的一致吗？** 独立 prompt 无法说明使用长共享系统 prompt 的聊天服务器表现。
3. **不同引擎的内存预算是否一致？**
4. **并发是否超过 decode graph 上限？** 超过就测到了 eager decode。
5. **参数是否正确对应？** 同一概念在各引擎中可能用不同参数名。
6. **谁支付测试费用？** GPU 云、硬件厂商、竞争对手或 SGLang 团队，都可能有偏好某个答案的理由。

## 独立测试在哪些方面一致 {#s-reading-other-peoples-benchmarks-where-independent-tests-agree}

这些报告来自 SGLang 团队之外。每行指出前面章节中能解释结果的机制。

| 发现 | 实践报告 | 机制 |
|---|---|---|
| 稠密模型、独立 prompt：基本持平 | Spheron，SGLang 0.5.9，单张 H100 上 Llama 3.3 70B FP8，50 用户：1,920 对 1,850 tok/s。Modal：8 张 H100 上两者都约每秒 17 次查询。Varad More：A10G 上 7B 至 9B 模型差距在 3% 内 | 两种引擎如今使用相同内核家族、分页 KV 和连续批处理 |
| 重复前缀：SGLang 胜出，但优势小于传说 | Steve Rawlinson，SGLang 0.5.6，2 张 H100，单用户首 token 583 对 2,141 ms。RunPod：缓存的 7k 上下文，每流 35.0 对 32.8 tok/s。Varad More：16 个模型中 10 个 SGLang 领先 20 至 40 ms | 基数缓存，见[第 3.3 节](#s-radixcache) |
| 长 prompt：首 token 更慢，后续 token 更快 | Jarvislabs，单张 H100，60 用户，16k token prompt：首 token 10,802 对 1,874 ms，每 token 63 至 81 对 97 至 120 ms | 8,192 token 分块 prefill 拆分长 prompt，保护运行中的 decode |
| 默认配置下极高负载：decode 延迟崩塌 | Jarvislabs，无并发上限：平均 ITL 100.92 对 28.84 ms | 可能是 decode 超过 256 的计算图上限。这是我们的假设，不是报告作者的结论 |
| 多 GPU 上的 DeepSeek 级 MoE：SGLang 是参考实现 | SemiAnalysis InferenceMAX 选择 SGLang 作为 DeepSeek R1 默认引擎。Crusoe 经审计的 MLPerf v6.1 使用 SGLang 0.5.15.post1，512 张 MI355X | 注意力数据并行与专家并行，见[第 6.2 节](#s-moe-serving-deepep-and-eplb) |
| 推测解码：有助于大 GPU，可能伤害小 GPU | InferenceX，B200、4 用户，GLM-5 加 MTP：每 token 耗时从 18.43 降至 9.92 ms。Varad More，A10G：慢 7% 至 28% | 草稿成本与接受率的取舍，见[第 4.4 节](#s-speculative-decoding) |

链接：[Spheron](https://www.spheron.network/blog/vllm-vs-tensorrt-llm-vs-sglang-benchmarks/) {{field Spheron 2026}}、[Modal](https://modal.com/llm-almanac/summary) {{field Modal 2025-06}}、[Varad More](https://github.com/varad-more/inference-engine-benchmark-system) {{field Varad-More 2026-04}}、[Steve Rawlinson](https://rawlinson.ca/articles/vllm-vs-sglang-performance-benchmark-h100) {{field Rawlinson 2025-12}}、[RunPod](https://runpod.ghost.io/when-to-choose-sglang-over-vllm-multi-turn-conversations-and-kv-cache-reuse/) {{field RunPod 2025-06}}、[Jarvislabs](https://jarvislabs.ai/blog/vllm-sglang-trtllm-comparison) {{field Jarvislabs 2026-05}}、[SemiAnalysis](https://newsletter.semianalysis.com/p/inferencemax-open-source-inference) {{field SemiAnalysis 2025-10}}、[Crusoe](https://www.crusoe.ai/resources/blog/serving-5-75-million-tokens-per-second-crusoes-mlperf-inference-v6-1-results-on-amd-mi355x) {{field Crusoe 2026-09}}、[InferenceX](https://inferencex.semianalysis.com/blog/mi355x-glm5-fp8-sglang-40-cheaper-than-b200) {{field InferenceX 2026-05}}。

数字必须连同限制一起读。Rawlinson 保留 SGLang 默认内存，将 vLLM 设为 0.9，两者 KV 池不同。Jarvislabs 没记录任一引擎版本。Spheron、RunPod、Modal、Jarvislabs 都出售 GPU 时间，这是做测试的理由，不是偏袒某个引擎的理由。这里唯一通过外部审计的是 Crusoe，其每 token 耗时 p99 为 79.98 ms，限制为 80 ms。

```figure
id: fig-5-3b
kind: structure
title: 六项发现及各自背后的机制
claim: 本节每个独立结果都能追溯到一个可在自己服务器上测试的机制。
caption: 每行从左向右，依次为负载、报告结果、SGLang 机制。橄榄色为客户端，紫色为内核，绿色为缓存。依据本节实践报告。
```

## 新硬件上比较脆弱 {#s-reading-other-peoples-benchmarks-fragile-on-new-hardware}

相同报告还显示了另一个规律。[joshua8.ai](https://joshua8.ai/llm-inference-benchmark/) {{field joshua8 2026-01}} 报告，一张 Blackwell 工作站卡只有传入 `--disable-cuda-graph` 才能运行 SGLang。另一套混合集群在旧卡加入时崩溃，因为 FP4 路径要求计算能力 10.0。[Pivot News](https://pivotnews.ai/build/benchmarking-vllm-vs-sglang-vs-llama-cpp-on-a-mixed-blackwel) 转述了该社区帖子 {{field Pivot-News 2026-05}}。快速路径按 GPU 代际编写，其他 GPU 的可用路径更少。面对新硬件，应预期首个 SGLang 版本可能慢或无法工作，并每周重新测量。

## 我们自己的机器展示了什么 {#s-reading-other-peoples-benchmarks-what-our-own-machines-showed}

实践报告告诉你该测哪些机制。我们在配备 GB10 的 DGX Spark，以及有两张 24 GB L4 的机器上测试。以下每行都链接到含 listing、seed 和图表的章节。

| 环境 | 运行内容 | 结果 | 机制 |
|---|---|---|---|
| L4 | 4,096 token 共享 prompt，开关缓存 | TTFT 中位数 479 对 14,706 ms，吞吐量 4.3 倍，关闭缓存的运行时钟为 930 MHz，低于我们的时钟下限，[第 3.3 节](#s-radixcache) | 基数缓存 |
| L4 | 64 用户，FP8 权重和 KV 对 BF16 | 736 对 251 tok/s，池容量 142,369 对 24,094 token，[第 4.3 节](#s-quantization) | 每 GB 容纳更多 KV |
| GB10 | Qwen3-30B-A3B 开启 EAGLE-3 | 每 token 耗时的加速比为 1.56 至 1.89，在 16 至 64 用户时收益最大，[第 4.4 节](#s-speculative-decoding) | MoE 验证复用已读取的专家权重 |
| L4 | 稠密 Qwen3-8B 开启 EAGLE-3 | 单用户吞吐量 2.37 倍，但默认配置的时钟低 19%；32 用户时为 1.00 倍，[第 4.4 节](#s-speculative-decoding) | 草稿占掉 59% 的池 |
| 两张 L4 | 一张卡与其他任务共享，`--dp-size 2` | 64 用户时 42 对 251 tok/s，双卡运行的时钟为 675 MHz，低于我们的时钟下限，[第 6.1 节](#s-tp-size-dp-size-and-attn-dp-size) | 轮询把请求交给池容量只有八分之一的副本 |
| L4 | SGLang 0.5.22 对 vLLM 0.31.0，相同池，64 用户 | 257 对 241 tok/s，P99 ITL 114 对 1,363 ms，TTFT 中位数 18,356 对 10,953 ms，[见下文](#s-reading-other-peoples-benchmarks) | 满池时不同的准入选择 |
| L4 | 同一对引擎，4,096 token 共享 prompt | 88.4 对 86.8 tok/s，TTFT 中位数 474 对 375 ms，[见下文](#s-reading-other-peoples-benchmarks) | 两个都能命中的前缀缓存 |
| L4 | 同一对引擎，泊松到达，每秒 4 个请求 | 257.5 对 286.6 tok/s，P99 TPOT 127 对 187 ms，[见下文](#s-reading-other-peoples-benchmarks) | 固定速率下相同的准入取舍 |
| L4 | 同一对引擎，混合 prompt 长度，16 用户 | 159.6 对 169.6 tok/s，P99 ITL 363 对 191 ms，[见下文](#s-reading-other-peoples-benchmarks) | 各引擎如何将 prefill 混入流式输出 |
| 两张 L4 | 一张卡与其他任务共享，`--tp-size 2` | 启动时被拒绝，[第 6.1 节](#s-tp-size-dp-size-and-attn-dp-size) | 内存平衡检查 |
| 两张 L4 | 通过 TCP 分离 prefill 和 decode | 第三分钟后所有请求都返回 HTTP 200，但内容为空，[第 6.3 节](#s-prefill-decode-disaggregation) | 传输会话失败且未恢复 |

多数行体现相同规律：无论哪种引擎，某种机制移除重复工作时，就能带来大幅收益，例如共享 prompt 的 prefill，以及每个缓存 token 占用的字节数。某项功能占用了 batch 所需内存，或部署的两个部分容量不一致时，就会受损。运行时的这些损失都没有输出仪表盘能显示的错误，其中两项在基准汇总里还像成功。

## 同一 L4 上的 SGLang 与 vLLM {#s-reading-other-peoples-benchmarks-sglang-against-vllm-on-the-same-l4}

上面的实践报告都比较了别人配置的引擎。我们在单张 L4 上，用 `Qwen/Qwen3-8B` 和[第 5.1 节](#s-sglang-benchmark-serving) 的闭环扫描做自己的对照。为只保留引擎差异，做了三个选择。

- **相同 KV 池。** vLLM 设置 `--num-gpu-blocks-override 1506`，即 1,506 个、每个 16 token 的块。SGLang 在同卡自行分配了 24,094 token。
- **相同显卡状态。** 两种引擎在同一会话、同一 GPU 上运行，每次开始时温度不超过 72 C。SM 时钟中位数低于 1,000 MHz 的运行被移出并重试，最多三次。
- **避免意外劣势。** vLLM 设置 `--max-model-len 8192`，足够容纳所有请求；设置 `VLLM_USE_FLASHINFER_SAMPLER=0`，因为本地安装的 FlashInfer 采样器无法编译。基准使用贪心解码，因此采样器不改变输出。

```listing
title: 两个相同大小的池
source: capture/gpu/out-l4/server-h2h-sglang.log
lang: text
note: SGLang 启动时的池，以及上限 64 时的一条 decode 日志。
---
[2026-10-17 18:27:40] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
[2026-10-17 20:12:04] Decode batch, #running-req: 37, #token: 22162, token usage: 0.92, cuda graph: True, gen throughput (token/s): 432.55, #queue-req: 27
```

```listing
title: vLLM 池与上限 64 时的 vLLM
source: capture/gpu/out-l4/server-h2h-vllm.log
lang: text
note: vLLM 启动时的池，以及上限 64 时的一条统计日志。
---
INFO 10-17 20:13:17 [kv_cache_utils.py:2464] GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
INFO 10-17 22:35:43 [loggers.py:320] Engine 000: Avg prompt throughput: 460.3 tokens/s, Avg generation throughput: 323.6 tokens/s, Running: 40 reqs, Waiting: 11 reqs, GPU KV cache usage: 99.5%, Prefix cache hit rate: 8.7%
```

| 并发 | 输出 tok/s，SGLang / vLLM | TTFT 中位数，SGLang / vLLM | P99 ITL，SGLang / vLLM | SM 时钟中位数，SGLang / vLLM |
|---|---|---|---|---|
| 1 | 13.84 / 13.51 | 185 / 192 ms | 104 / 105 ms | 1,290 / 1,290 MHz |
| 8 | 112.46 / 112.79 | 170 / 253 ms | 71 / 68 ms | 1,485 / 1,470 MHz |
| 16 | 201.13 / 200.90 | 212 / 289 ms | 81 / 80 ms | 1,470 / 1,425 MHz |
| 32 | 271.28 / 273.93 | 2,871 / 1,813 ms | 102 / 619 ms | 1,320 / 1,275 MHz |
| 64 | 256.62 / 241.39 | 18,356 / 10,953 ms | 114 / 1,363 ms | 1,215 / 1,013 MHz |

```figure
id: fig-5-3c
kind: chart
title: 相同吞吐量，满池时两种选择
claim: L4 上 64 用户时，vLLM 首 token 快 1.7 倍，SGLang 的 P99 token 间延迟则低 12 倍。
caption: 实线为 TTFT 中位数，虚线为 P99 token 间延迟，每点三个 seed，对数刻度。蓝色为 SGLang，琥珀色为 vLLM。来源：capture/gpu/summary/l4.json。
```

**我们测得吞吐量基本持平。** 不超过 32 用户时，两者差距在 3% 内，每 token 耗时差距在 6% 内。64 用户时，每 token 耗时中位数 SGLang 为 106 ms，vLLM 为 129 ms。池未满时，SGLang 更早给出首 token：8 用户时为 170 对 253 ms。

超过这个点后，引擎做了不同选择，统计日志展示了两者。SGLang 运行 37 个请求、27 个等待，池使用率 92%。vLLM 运行 40 个、11 个等待，池使用率 99.5%，同时以每秒 460 token 做新 prompt 的 prefill。

vLLM 启动更多请求，因此首 token 更早。但每次新 prefill 都与运行中的 decode 共享步骤，流式输出于是停顿。64 用户时，vLLM 的 P99 token 间隔为 1,363 ms，SGLang 为 114 ms。

最后一行必须附带时钟限制。即使重试三次，64 用户下 vLLM 时钟中位数仍为 1,013 MHz，SGLang 为 1,215 MHz。因此 64 用户的部分吞吐量差距可能来自显卡，但 17% 的时钟差解释不了 12 倍 token 间延迟差。

### 同一对引擎与共享 prompt {#s-reading-other-peoples-benchmarks-the-same-pair-on-shared-prompts}

随后我们在同一对引擎上运行[第 3.3 节](#s-radixcache) 的前缀扫描，池容量和降温规则相同。每次在 8 用户下发送 64 个 prompt，分成 4 组，每组 16 个。组内共享 0 至 4,096 token 的系统 prompt，后接 128 token 问题，输出 64 token。SGLang 使用基数缓存，vLLM 使用 0.31.0 默认开启的前缀缓存。

```listing
title: 两个缓存都命中
source: capture/gpu/out-l4/server-h2h-prefix-vllm.log
lang: text
note: vLLM 启动时的池，以及共享 4,096 token 时的一条统计日志。
---
INFO 10-17 23:37:11 [kv_cache_utils.py:2464] GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
INFO 10-18 00:43:16 [loggers.py:320] Engine 000: Avg prompt throughput: 231.0 tokens/s, Avg generation throughput: 93.6 tokens/s, Running: 8 reqs, Waiting: 0 reqs, GPU KV cache usage: 77.2%, Prefix cache hit rate: 87.2%
```

SGLang 日志也用自己的字段说明相同现象。共享 4,096 token 时，某个 prefill batch 有 12,952 token 来自缓存，只有 406 个新 token。

| 共享 prompt token 数 | 输出 tok/s，SGLang / vLLM | TTFT 中位数，SGLang / vLLM | P99 TTFT，SGLang / vLLM |
|---|---|---|---|
| 0 | 113.5 / 113.8 | 354 / 408 ms | 483 / 485 ms |
| 256 | 110.9 / 111.5 | 470 / 488 ms | 856 / 616 ms |
| 1,024 | 105.7 / 106.0 | 466 / 396 ms | 1,887 / 1,303 ms |
| 2,048 | 100.4 / 100.2 | 441 / 410 ms | 2,317 / 1,767 ms |
| 4,096 | 88.4 / 86.8 | 474 / 375 ms | 4,275 / 4,019 ms |

```figure
id: fig-5-3d
kind: chart
title: 两个前缀缓存，相同结果
claim: L4 上，两种前缀缓存在各共享长度都将 TTFT 中位数保持在 500 ms 以下，关闭缓存的运行则达到 14,706 ms。
caption: 8 用户下 TTFT 中位数与共享 prompt 长度的关系，每点三个 seed，对数刻度。蓝色为基数缓存开启的 SGLang，琥珀色为前缀缓存开启的 vLLM。玫瑰色虚线为第 3.3 节此前测得的关闭缓存 SGLang。来源：capture/gpu/summary/l4.json。
```

**我们测得吞吐量持平**，各共享长度差距在 2% 内。两种引擎的 TTFT 中位数都保持在 354 至 488 ms。共享 0 和 256 token 时，SGLang 首 token 更早，且差距超过 seed 波动范围，分别为 354 对 408 ms、470 对 488 ms。从 1,024 token 起，seed 范围重叠。

vLLM 的尾部略占优势。从共享 256 token 起，它的 P99 TTFT 更低；1,024 时为 1,303 对 1,887 ms。4,096 时，SGLang 的每 token 耗时更短，为 75.6 对 80.8 ms。所有运行的 SM 时钟中位数均不低于 1,395 MHz。

结果的量级体现在第三条对照。另一次关闭缓存的 SGLang 运行，在共享 4,096 token 时需要 14,706 ms 才得到首 token 中位数。那张卡的时钟低于我们的时钟下限。两个开启缓存的运行都低于 500 ms。两种缓存的差距约 100 ms。

随后，我们给 vLLM 服务器设置 `--no-enable-prefix-caching`，使用相同池容量和相同扫描。日志显示缓存已关闭，每个 prompt token 都重新执行 prefill。

```listing
title: 关闭前缀缓存的 vLLM
source: capture/gpu/out-l4/server-h2h-prefix-vllm-no-cache.log
lang: text
note: 启动时的池，以及共享 4,096 token 时的一行统计。没有复用，因此 prompt 吞吐量很高。
---
INFO 10-21 06:20:24 [kv_cache_utils.py:2464] GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
INFO 10-21 08:07:49 [loggers.py:320] Engine 000: Avg prompt throughput: 1607.0 tokens/s, Avg generation throughput: 6.4 tokens/s, Running: 8 reqs, Waiting: 0 reqs, GPU KV cache usage: 76.7%
```

| 共享 prompt token 数 | TTFT 中位数，缓存开启 / 关闭，SGLang | TTFT 中位数，缓存开启 / 关闭，vLLM | 输出 tok/s，缓存关闭，SGLang / vLLM |
|---|---|---|---|
| 256 | 470 / 985 ms | 488 / 753 ms | 99.4 / 99.1 |
| 1,024 | 466 / 2,202 ms | 396 / 1,213 ms | 70.2 / 70.9 |
| 4,096 | 474 / 14,706 ms | 375 / 13,353 ms | 20.8 / 19.6 |

**我们测得**两种引擎获得了同等量级的收益。共享 4,096 token 时，缓存使 SGLang 的首 token 中位数降至约 1/31，vLLM 降至约 1/36。输出吞吐量分别增至 4.2 倍和 4.4 倍。关闭缓存时，两种引擎的吞吐量差距在 7% 内，基本持平。

没有缓存时，共享 256 至 2,048 token 的 vLLM 服务器更早给出首 token。对应的 SGLang 运行在另一天。vLLM 关闭缓存的运行日期为 2026-10-21，比开启缓存的运行晚四天。共享 4,096 token 的运行重试三次后，时钟仍低于我们的下限，分别为 930 和 675 MHz。这一行应看量级，而非精确值。

### 同一对引擎与固定到达速率 {#s-reading-other-peoples-benchmarks-the-same-pair-at-a-fixed-arrival-rate}

闭环只有一个请求返回，才发送下一个，因此节奏由引擎决定。生产流量不会等待引擎。我们在同一对引擎上运行[第 5.1 节](#s-sglang-benchmark-serving) 的速率扫描，池容量、热状态和时钟规则相同。请求按每秒 0.5 至 16 的泊松速率到达，输入 512、输出 128 token。每次至少发送 32 个 prompt，或持续 30 秒的到达流量。

```listing
title: 固定速率下相同的准入选择
source: capture/gpu/out-l4/server-h2h-rate-sglang.log
lang: text
note: SGLang 启动时的池，以及请求等待时的一条 decode 日志。
---
[2026-10-18 00:43:57] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
[2026-10-18 03:13:55] Decode batch, #running-req: 37, #token: 22424, token usage: 0.93, cuda graph: True, gen throughput (token/s): 370.33, #queue-req: 71
```

```listing
title: 相同速率下，vLLM 接纳更多请求
source: capture/gpu/out-l4/server-h2h-rate-vllm.log
lang: text
note: vLLM 启动时的池，以及请求等待时的一条统计日志。
---
INFO 10-18 03:15:35 [kv_cache_utils.py:2464] GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
INFO 10-18 06:10:22 [loggers.py:320] Engine 000: Avg prompt throughput: 1326.7 tokens/s, Avg generation throughput: 158.4 tokens/s, Running: 43 reqs, Waiting: 30 reqs, GPU KV cache usage: 99.7%, Prefix cache hit rate: 0.6%
```

| 每秒请求数 | 输出 tok/s，SGLang / vLLM | TTFT 中位数，SGLang / vLLM | TPOT 中位数，SGLang / vLLM | P99 TPOT，SGLang / vLLM | SM 时钟中位数，SGLang / vLLM |
|---|---|---|---|---|---|
| 0.5 | 70.6 / 70.6 | 284 / 317 ms | 74.7 / 72.7 ms | 81 / 78 ms | 1,485 / 1,485 MHz |
| 1 | 123.3 / 123.6 | 166 / 180 ms | 74.0 / 68.2 ms | 76 / 69 ms | 1,500 / 1,485 MHz |
| 2 | 226.3 / 227.8 | 221 / 233 ms | 99.9 / 88.7 ms | 120 / 109 ms | 1,433 / 1,418 MHz |
| 4 | 257.5 / 286.6 | 9,575 / 8,304 ms | 115.1 / 126.9 ms | 127 / 187 ms | 1,350 / 1,245 MHz |
| 8 | 253.9 / 261.8 | 37,211 / 27,510 ms | 105.2 / 126.0 ms | 151 / 248 ms | 1,215 / 1,035 MHz |
| 16 | 218.2 / 205.8 | 97,542 / 94,322 ms | 115.2 / 185.2 ms | 189 / 322 ms | 600 / 450 MHz |

```figure
id: fig-5-3e
kind: chart
title: 固定到达速率下的相同取舍
claim: L4 上每秒 4 个请求时，vLLM 多生成 11% 输出，SGLang 的 P99 每 token 耗时低 32%。
caption: 实线为 TTFT 中位数，虚线为 P99 每输出 token 耗时，每点三个 seed，对数刻度。蓝色为 SGLang，琥珀色为 vLLM。来源：capture/gpu/summary/l4.json。
```

**我们测得每秒不超过 2 个请求时持平。** 两种引擎都跟得上到达速率，吞吐量差距在 1% 内。每秒 0.5 和 1 时，SGLang 首 token 更早，差距超出 seed 波动，中位数分别为 284 对 317 ms、166 对 180 ms。vLLM 每 token 耗时更短：每秒 1 时为 68 对 74 ms，超出波动范围；每秒 2 时为 89 对 100 ms。

Goodput 展示了这对延迟目标的含义。我们设首 token 1 s、每 token 100 ms 为目标。每秒输入 2 个请求时，vLLM 每秒达标请求数中位数为 1.36，SGLang 为 0.88。Seed 范围有重叠，分别为 1.09 至 1.44 和 0.54 至 1.18。SGLang 的每 token 耗时中位数为 99.9 ms，恰在目标边界。

从每秒 4 个请求起，两种引擎都跟不上到达速率，没有请求达标。统计日志显示与闭环相同的准入选择：SGLang 运行 37 个请求，池占用 93%；vLLM 运行 43 个，池占用 99.7%。

每秒 4 个请求时，vLLM 为 286.6 tok/s，SGLang 为 257.5，前者多 11%，差距超过 seed 波动范围。首 token 中位数为 8.3 对 9.6 s，但这两个 seed 范围重叠。代价在流式输出：P99 每 token 耗时为 187 对 127 ms，差距超过波动范围。

每秒 4 时，时钟解释不了差距，因为 vLLM 的时钟中位数更低，为 1,245 对 1,350 MHz。每秒 8 时吞吐量范围重叠。每秒 16 时，两种引擎所有运行重试三次后仍低于 1,000 MHz，因此我们不比较这一行。

### 同一对引擎与波次到达 {#s-reading-other-peoples-benchmarks-the-same-pair-on-waves}

最后一种负载来自[第 5.1 节](#s-sglang-benchmark-serving)，请求按波次到达。每次运行发送 64 个 prompt，输入 512 token、输出 128 token，上限为 16 用户。只改变 `--random-range-ratio`。设为 1.0 时，所有 prompt 等长，请求同时完成，替补请求也同时到达。设为 0.5 和 0.0 时，长度混合，请求逐个到达。

```listing
title: 波次中的 vLLM
source: capture/gpu/out-l4/server-h2h-waves-vllm.log
lang: text
note: vLLM 启动时的池，以及 16 个运行中请求时的一行统计日志。
---
INFO 10-18 18:38:07 [kv_cache_utils.py:2464] GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
INFO 10-18 19:14:22 [loggers.py:320] Engine 000: Avg prompt throughput: 960.0 tokens/s, Avg generation throughput: 187.3 tokens/s, Running: 16 reqs, Waiting: 0 reqs, GPU KV cache usage: 22.6%, Prefix cache hit rate: 8.5%
```

| 长度比例 | 输出 tok/s，SGLang / vLLM | TTFT 中位数，SGLang / vLLM | TPOT 中位数，SGLang / vLLM | P99 ITL，SGLang / vLLM |
|---|---|---|---|---|
| 1.0，等长 | 182.3 / 181.7 | 1,775 / 1,499 ms | 74.7 / 76.8 ms | 81 / 502 ms |
| 0.5，混合 | 159.6 / 169.6 | 325 / 353 ms | 87.8 / 81.4 ms | 363 / 191 ms |
| 0.0，混合 | 158.2 / 174.4 | 283 / 284 ms | 86.7 / 75.0 ms | 302 / 202 ms |

**我们测得不同流量形态下，胜出者不同。** 等长时两种引擎吞吐量持平，取舍与满池时一致。vLLM 首 token 更早，为 1,499 对 1,775 ms，差距超过 seed 波动范围。SGLang 流式输出更平稳，P99 ITL 为 81 对 502 ms。

混合长度时，vLLM 领先。比例为 0.5 时，输出为 169.6 对 159.6 tok/s，高 6%，差距超过 seed 波动范围。每 token 耗时中位数为 81.4 对 87.8 ms，P99 ITL 为 191 对 363 ms。比例为 0.0 时，吞吐量范围重叠，但 vLLM 的每 token 耗时和 P99 ITL 仍更低。所有时钟中位数均不低于 1,410 MHz。

我们的解释是：新 prompt 逐个到达时，每次 prefill 与运行中的 decode 共用一步。vLLM 的工作拆分减少了流式输出停顿。

为了检验这个解释，我们在 2026-10-21 给 SGLang 设置 `--enable-mixed-chunk` 后重新运行，扫描和池容量相同。这个参数把运行中的 decode 放进 prefill batch，让新 prompt 不再停止流式输出。日志显示一次 514 token 的 prefill，与 15 个运行中请求处于同一 batch。

```listing
title: 波次中启用 mixed chunk 的 SGLang
source: capture/gpu/out-l4/server-waves-mixed-chunk.log
lang: text
note: 启动时的池、16 用户时的一次 decode，以及与 15 个 decode 一起运行的一次 prefill。
---
[2026-10-21 08:34:19] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
[2026-10-21 08:39:51] Decode batch, #running-req: 16, #token: 8889, token usage: 0.37, cuda graph: True, gen throughput (token/s): 231.46, #queue-req: 0
[2026-10-21 08:40:22] Prefill batch, #new-seq: 1, #new-token: 514, #cached-token: 0, token usage: 0.34, #running-req: 15, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 2569.89
```

| 长度比例 | 输出 tok/s，SGLang mixed chunk / vLLM | TPOT 中位数，SGLang mixed chunk / vLLM | P99 ITL，SGLang 默认 / mixed chunk / vLLM |
|---|---|---|---|
| 1.0，等长 | 182.3 / 181.7 | 73.1 / 76.8 ms | 81 / 203 / 502 ms |
| 0.5，混合 | 171.8 / 169.6 | 80.8 / 81.4 ms | 363 / 193 / 191 ms |
| 0.0，混合 | 171.9 / 174.4 | 76.8 / 75.0 ms | 302 / 196 / 202 ms |

**我们测得** mixed chunk 消除了差距。混合长度下，SGLang 的吞吐量、每 token 耗时和 P99 ITL 现在与 vLLM 持平，所有 seed 范围都重叠。相比未设置此参数的 SGLang，比例 0.5 时，P99 ITL 从 363 降至 193 ms；比例 0.0 时，从 302 降至 196 ms。输出吞吐量增加约 8%。

等长时，这个参数也有代价。P99 ITL 的中位数从 81 升至 203 ms，三个 seed 的范围为 83 至 349 ms。整波请求同时到达时，prefill 现在与 decode 共用步骤，流式输出因此失去原先波次间清晰分隔的空档。vLLM 在这里仍更差，为 502 ms。

GB10 上的 Qwen3-30B-A3B，与同一天的默认配置运行相比，也朝相同方向变化，但每项变化都在 seed 波动范围内。混合长度下，比例 0.5 的 P99 ITL 中位数从 198 降至 164 ms，比例 0.0 则从 214 降至 202 ms。等长时从 159 升至 210 ms。此参数还使比例 0.0 的 TTFT 中位数从 324 升至 442 ms，超出波动范围。GB10 结果只能视为较弱的第二个迹象，不能视为第二份证明。

有一项限制。L4 上 SGLang 默认配置的运行日期为 2026-10-18，比 mixed chunk 运行早三天。启用参数时，时钟中位数为 1,425 至 1,508 MHz，未启用时为 1,440 至 1,485 MHz。时钟解释不了这个差距。

这些结果只覆盖一个模型、一张 GPU 和四种负载。主要结论与实践报告一致：稠密模型配独立 prompt，在不超过 32 用户的闭环测试中，两种引擎吞吐量差距在 3% 内。负载增大后，差距最多为 11%。

扫描还补上了吞吐量图表隐藏的信息。池满时，需要在首 token 快和流式输出平稳之间取舍，两种引擎的默认选择不同。混合 prompt 长度时，vLLM 默认在吞吐量和流式平稳程度上领先。SGLang 的首 token 仍在同一时间或更早到达。一个 SGLang 参数 `--enable-mixed-chunk` 就消除了前述领先优势。

想了解不同 GPU 的数字为何不同，可以运行 [Inside an LLM Serving GPU](https://aieng-zh.cn/inside-an-llm-serving-gpu) 交互演示。它与本节从相同的 L4 和 GB10 汇总记录读取池容量、步骤耗时和吞吐量。某项设置没有测量时，它会明确说明。

## 我们的建议 {#s-reading-other-peoples-benchmarks-our-position}

在我们的 L4 上，Qwen3-8B 配独立 prompt 时，选择引擎主要是延迟决策，吞吐量通常不是决定因素。流量形态决定胜出者。满池或波次到达时，请求一起到达，SGLang 保护流式输出，vLLM 保护首 token。混合长度 prompt 逐个到达时，vLLM 默认在吞吐量和流式平稳程度上领先。开启 mixed chunk 后，SGLang 与它持平。

在我们的 L4 上，每秒 4 个请求、超过满池点时，vLLM 还多提供 11% 输出。每秒 8 个请求时，seed 范围重叠。应先考虑模型支持、启动时间和现有硬件，再测量自己的长度分布。

重复前缀场景，先检查前缀缓存已开启，再测量。在我们的 L4 上，前缀能装入池时，两种缓存持平，TTFT 都低于 500 ms。关闭缓存后，SGLang 为 14,706 ms，vLLM 为 13,353 ms。决定这个结果的是缓存。多 GPU 上的 DeepSeek 级 MoE，优先从 SGLang 开始，因为实践报告使用它运行这些模型。

最重要的是，不要直接照搬结果。用自己的负载运行[第 5.1 节](#s-sglang-benchmark-serving) 的扫描。公开数字只能告诉你应该测试哪种机制。

## 事故 {#s-reading-other-peoples-benchmarks-the-incidents}

**看似内存优势，实为参数错误。** [vLLM discussion #17221](https://github.com/vllm-project/vllm/discussions/17221) 中，用户最初在单张 A10 上看到 SGLang 使用 7 GB、vLLM 使用 21 GB {{field vLLM-discussion 2025-04}}。随后发现，对应 vLLM `--max-model-len` 的参数是 `--context-length`，不是 `--max-total-tokens`。使用正确参数后，内存占用基本相同。

**已经无法解析的建议。** 2026 年的实践报告建议用 `--cuda-graph-max-bs` 提高 decode graph 上限。v0.5.22 已将它拆为 `--cuda-graph-max-bs-decode` 和 `--cuda-graph-max-bs-prefill`。**代码**拒绝旧写法，`sglang serve` 参数解析器会停止并返回 `ambiguous option: --cuda-graph-max-bs could match --cuda-graph-max-bs-decode, --cuda-graph-max-bs-prefill`。调优配置与基准一样，严格依赖版本。

**被重复转述的数字。** 本节开头 29% 的对照在 2026-08-04 被 DeepInfra 质疑版本差距 {{field DeepInfra 2026-08}}。作者在 2026-10-14 回应，该结果不能推广到长上下文 {{field AIMultiple 2026-10}}。SGLang 团队在 2024 年给过更大的主张：Llama-70B 吞吐量最高达到 3.1 倍 {{team 2024-07}}。本次研究找到的独立报告中，没有一份在稠密模型、独立 prompt 上复现这种差距。

```takeaways
- 只在 KV 池和 GPU 时钟匹配时比较引擎。
- 结合 TTFT 读取 P99 ITL，满池时两者需要取舍。
- 阅读数字前，先找到 SGLang 版本和日期。
- 将负载形状与自己的场景匹配，包括重复前缀占比。
- 比较重复 prompt 前，确认两个引擎都开启前缀缓存。
- 也测试固定到达速率，因为闭环不会落后于输入。
- 检查两个引擎的内存预算和上下文参数是否匹配。
- 对照 GPU 的 decode graph 上限检查测试并发。
- 用混合 prompt 长度比较前，开启 SGLang 的 --enable-mixed-chunk，并同时测试等长情况。
- 标明来源是独立研究、GPU 云、厂商、竞争对手还是 SGLang 团队。
- v0.5.22 使用 `--cuda-graph-max-bs-decode`，旧参数有歧义。
```

来源：python/sglang/srt/arg_groups/memory_hook.py （GPU 内存分档）, python/sglang/srt/arg_groups/fields/exec_.py (cuda_graph_max_bs_decode), python/sglang/srt/arg_groups/fields/schedule.py, 均为 v0.5.22 (baa9befa); 正文链接的实践报告，获取日期为 2026-10-16; aimultiple.com/inference-engines; deepinfra.com/blog/vllm-vs-sglang; lmsys.org/blog/2024-07-25-sglang-llama3; inferencex.semianalysis.com/blog/mi355x-deepseek-v4-pro-sglang-110x-in-26-days. capture/gpu/out-l4/server-h2h-sglang.log, capture/gpu/out-l4/server-h2h-vllm.log, capture/gpu/out-l4/server-h2h-prefix-sglang.log, capture/gpu/out-l4/server-h2h-prefix-vllm.log, capture/gpu/out-l4/server-h2h-rate-sglang.log, capture/gpu/out-l4/server-h2h-rate-vllm.log, capture/gpu/out-l4/server-h2h-waves-vllm.log, capture/gpu/summary/l4.json, capture/gpu/sweep.py （vllm 和 sglang-h2h 配置）, capture/gpu/incidents/l4-vllm-flashinfer-jit.txt; capture/gpu/out-l4/server-h2h-prefix-vllm-no-cache.log, capture/gpu/summary/l4.json (prefix.vllm-no-prefix-cache); capture/gpu/out-l4/server-waves-mixed-chunk.log, capture/gpu/summary/l4.json (waves.mixed-chunk), capture/gpu/summary/gb10.json (waves.mixed-chunk, waves.graphs-on-b).
