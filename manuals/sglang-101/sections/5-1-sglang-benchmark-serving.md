# sglang.benchmark.serving

> 一次基准只测一个并发，因此要扫描并发，直到额外负载不再增加吞吐量，只增加等待。

同事在团队频道发了一句：“SGLang 在我笔记本上能跑每秒 255 个 token。”数字是真的，来自我们的捕获记录，但单独看毫无用处。同一服务器在一种负载下达到这个吞吐量时，首 token 中位数为 0.8 s，另一种负载下为 3.9 s。不附带延迟的吞吐量，无法描述用户实际感受到什么。

读完本节，你能为 `sglang.benchmark.serving` 的设置给出理由，读懂报告每一行，并找出继续增加并发不再划算的拐点。你也能区分哪些测量结论可推广到 GPU，哪些不能。

## 我们运行的命令

服务器在捕获记录使用的 Mac 上以单个进程运行 `mlx-community/Qwen3-0.6B-4bit`。本节所有运行都连接这台服务器。

```listing
title: 被测服务器
source: capture/out/server-default.command.txt
lang: text
note: 捕获工具启动服务器时使用的完整命令。
---
SGLANG_USE_MLX=1 sglang serve --model-path mlx-community/Qwen3-0.6B-4bit --disable-cuda-graph --host 127.0.0.1 --port 30000 --enable-cache-report --enable-metrics --mem-fraction-static 0.4
```

命令里有两个参数需要说明。SGLang 的 Apple silicon 指南仍传入 `--disable-cuda-graph`，但 v0.5.22 帮助已将其标为弃用，建议使用 `--cuda-graph-backend-{decode,prefill}=disabled`。MLX 后端除非添加 `--mlx-enable-sampling`，否则 decode 采用贪心路径，我们测的也是它。基准默认发送温度 0，因此这里客户端与服务器行为一致。

客户端使用 SGLang 自带基准模块。我们运行三次，并发上限分别为 1、8、32。上限 8 的命令如下：

```bash
python -m sglang.benchmark.serving --backend sglang --port 30000 \
  --dataset-name random --random-input-len 512 --random-output-len 128 \
  --random-range-ratio 1.0 --num-prompts 32 --max-concurrency 8 --seed 7
```

**路径变了。** 基准工具在 2026-06 移入 `sglang.benchmark` 包。`python -m sglang.bench_serving` 仍可作为弃用别名，导入新模块。但 `python -m sglang.bench_one_batch` 和 `python -m sglang.bench_offline_throughput` 在 v0.5.22 已无法运行。[PR #40795](https://github.com/sgl-project/sglang/pull/40795) 在 2026-09-22 删除了这两个别名 {{code}}。教程若还使用这两条路径，就针对旧版本，它的其他参数也值得怀疑。

## 四个改变结果的默认值

客户端在开始测量前就做了选择。每项都会改变最终报告的数字，多数公开基准却不说保留了哪些默认值。

| 设置 | v0.5.22 默认值 | 如何影响结果 |
|---|---|---|
| `--random-range-ratio` | 0.0 | 每个长度从 1 到指定长度之间抽取，所以平均 prompt 约为 `--random-input-len` 的一半 |
| `ignore_eos` | 开启 | 服务器忽略结束 token，每个请求恰好生成 `--random-output-len` 个 token |
| `--request-rate` | `inf` | 所有请求在时刻 0 发送，只有 `--max-concurrency` 限流 |
| `--warmup-requests` | 1 | 计时前先运行一个请求 |

第一行是陷阱。默认比例下，`--random-input-len 512` 产生的平均 prompt 接近 256 token。报告却写 512，实际工作量只有一半。我们设为 1.0，报告也证实了这一点：32 个 512 token 的 prompt 得到 `Total input tokens: 16384`。开启 `ignore_eos` 后，`Total generated tokens: 4096`，恰好为 32 乘以 128。

**我们的建议：** 每次都传 `--random-range-ratio 1.0`，否则就在结果旁写明长度分布。隐藏长度的基准无法与其他结果比较。

## 分块阅读报告

```listing
title: 并发上限 8 的报告
source: capture/out/bench-random-c8.txt
lang: text
note: 节选自完整输出，省略参数转储、进度条，以及 P90、P95 行。
---
============ Serving Benchmark Result ============
Backend:                                 sglang
Traffic request rate:                    inf
Max request concurrency:                 8
Successful requests:                     32
Benchmark duration (s):                  16.02
Total input tokens:                      16384
Total generated tokens:                  4096
Request throughput (req/s):              2.00
Output token throughput (tok/s):         255.63
Peak output token throughput (tok/s):    440.00
Peak concurrent requests:                16
Total token throughput (tok/s):          1278.13
Concurrency:                             7.96
…
Median TTFT (ms):                        785.79
P99 TTFT (ms):                           2180.87
…
Mean TPOT (ms):                          23.02
Median TPOT (ms):                        22.52
…
Median ITL (ms):                         20.35
P99 ITL (ms):                            78.79
Max ITL (ms):                            1948.37
```

基准模块中的 `calculate_metrics` 计算每一行。其中五项容易误读。

**Concurrency：** 所有请求端到端延迟之和除以运行总时长。这是运行后测得的平均在途请求数。这里上限为 8，实际值 7.96，只说明达到了上限，不能说明更多。

**Peak concurrent requests：** 将运行切成一秒一个桶，请求只要与桶的时间区间有交集，就在该桶计数。报告取最大桶计数。两个请求即使在同一秒内先后运行，也都计入，因此数值可能超过上限。这就是上限 8 却报告 16、上限 32 却报告 64 的原因。

**TTFT：** 从发送请求到收到首个流式数据块的时间，包括排队、prefill 和网络。

**TPOT：** 对每个请求，首 token 之后的时间除以剩余 token 数，即 `(latency - ttft) / (output_len - 1)`，报告按请求统计均值与分位数。**ITL：** 汇总所有请求中相邻两个流式数据块之间的时间差。包含多个 token 的数据块，也只算一个间隔。

**Max ITL：** 单个最长间隔，这里为 1,948 ms。新 prompt 做 prefill 时，一个请求在两个 token 之间等了近两秒。20 ms 的 ITL 中位数掩盖了这次停顿，79 ms 的 P99 只显示了部分影响。

```figure
id: fig-5-1b
kind: structure
title: 报告每一行由什么计算得到
claim: Concurrency 和 Peak concurrent requests 都由运行后的请求时间戳计算，因此两者都不是重复你设置的上限。
caption: 每行从左向右读：报告字段、calculate_metrics 中的公式、上限 8 时的实测值。橄榄色框为客户端测量。来源：capture/out/bench-random-c8.txt 和 v0.5.22 基准模块。
```

## 扫描与拐点

一次运行只能给出一个点。分别把上限设为 1、8、32 的三次运行，才能展示曲线形状。

| 上限 | 输出 tok/s | TTFT 中位数 | P99 TTFT | TPOT 中位数 | Concurrency |
|---|---|---|---|---|---|
| 1 | 175.15 | 162.98 ms | 270.18 ms | 4.38 ms | 0.99 |
| 8 | 255.63 | 785.79 ms | 2180.87 ms | 22.52 ms | 7.96 |
| 32 | 252.74 | 3917.54 ms | 8262.86 ms | 93.61 ms | 31.94 |

**我们在捕获使用的 Mac 上实测。** 从 1 到 8，输出吞吐量增长 46%，首 token 中位数却慢了 4.8 倍。从 8 到 32，吞吐量下降约 1%，首 token 中位数慢了 5 倍，每 token 耗时中位数慢了 4.2 倍。

```figure
id: fig-5-1
kind: comparison
title: 吞吐量在上限 8 停止增长，延迟没有
claim: 上限从 8 提至 32，没有增加吞吐量，却让首 token 中位数慢了五倍。
caption: 左侧为各上限下的每秒输出 token 数，右侧为相同上限的 TTFT 中位数，使用统一刻度。橄榄色柱为客户端测量，玫瑰色表示越过拐点的运行。来源：capture/out/bench-random-c1.txt、c8.txt 和 c32.txt。
```

拐点就是吞吐量停止增长的并发上限。这台机器的拐点在 8 或更低。越过拐点后，服务器已没有空闲算力可分配，新请求只能争用同样的 decode 步骤。[第 2.2 节](#s-the-scheduler-loop-and-schedule-policy) 的调度器仍会接纳它们，因为这台 Mac 的准入上限为 `max_running_requests=4096`。

**哪些结论可推广到 GPU。** 绝对数字不能。Apple silicon 上的 0.6B 模型无法说明 H100 的表现。但曲线形状可以推广：每台服务器都有拐点，越过后延迟增长快于吞吐量，而默认准入上限远高于它。

## 把同样的 GPU 扫描当作实验运行

GPU 上的一次运行告诉了我们一件错事。GPU 工具在 NVIDIA GB10 上启动 Qwen3-30B-A3B 默认服务器，每种上限只运行一次。

```listing
title: GB10 上的被测服务器
source: capture/gpu/out-gb10/server-default.command.txt
lang: text
note: GPU 工具启动服务器时使用的完整命令。
---
sglang serve --model-path Qwen/Qwen3-30B-A3B-Instruct-2507 --host 127.0.0.1 --port 30000 --enable-cache-report --enable-metrics --mem-fraction-static 0.7
```

上限 8 时，单次运行报告 TTFT 中位数 677.61 ms；上限 32 时却为 390.38 ms。负载更大，首 token 反而更快，队列解释不了这一点。一次运行只是一个样本，它可能因你未观察到的原因而失真。

所以我们像模型团队比较训练实验那样运行扫描。[扫描脚本](manuals/sglang-101/capture/gpu/sweep.py)将 1 至 64 的各并发上限分别运行三次，seed 为 1、2、3。它传入 `--output-details`，每次保留每个请求的 TTFT 和 token 间隔。[汇总脚本](manuals/sglang-101/capture/gpu/summarize.py)将每个点的三次运行汇总为中位数、最小值、最大值。

| 上限 | 单次工具运行的 TTFT 中位数 | 三个 seed 的 TTFT 中位数（最小至最大） |
|---|---|---|
| 8 | 677.61 ms | 209.98 ms (185.25 至 216.02) |
| 32 | 390.38 ms | 416.37 ms (338.06 至 434.64) |

**我们在 GB10 上测得两组结果，但来自不同服务器。** 单次工具运行的池容量为 227,243 token，采集日期为 2026-10-17。扫描服务器的池容量为 234,600 token，采集日期为 2026-10-16。后续扫描没有重现 677.61 ms。从上限 2 起，首 token 随上限增大而变慢，符合队列预期。

后来我们从单次工具运行的服务器日志中找到了异常原因：工具为每次运行使用 seed 7，也没有清理前缀缓存。使用同一种子时，客户端每次都会发送相同的首批 prompt {{code}}。因此每次运行都可能从前一次运行的缓存命中 prompt：

```listing
title: 一次从缓存命中 prompt 的扫描
source: capture/gpu/out-gb10/server-default.log
lang: text
note: cap 32 的工具运行中三行 prefill 日志。前两行各有 29 个请求，只需要计算一个新 token；第三行是第一个缓存中没有的 prompt。长行已截断。
---
[2026-10-17 14:23:00] Prefill batch, #new-seq: 14, #new-token: 14, #cached-token: 6879, token usage: 0.07, …
[2026-10-17 14:23:00] Prefill batch, #new-seq: 15, #new-token: 15, #cached-token: 7634, token usage: 0.07, …
[2026-10-17 14:23:47] Prefill batch, #new-seq: 1, #new-token: 510, #cached-token: 2, token usage: 0.01, …
```

我们统计了每次工具运行的 prefill 日志。上限 8 时，64 个 prompt 里有 16 个在运行前已缓存。上限 32 时，128 个 prompt 里有 64 个已缓存；上限 64 时，256 个里有 128 个已缓存。缓存命中跳过 prefill，因此这些请求能更快拿到首 token。缓存优势分别覆盖上限 32 时一半的请求、上限 8 时四分之一的请求，所以首 token 中位数会下降。

```figure
id: fig-5-1c
kind: chart
title: GB10 上输出吞吐量与并发的关系
claim: 每个点三个 seed 的结果接近，因此曲线代表测量，曲线间的差距真实存在。
caption: 每条曲线从左向右读，代表一种服务器配置。色带表示三个 seed 的最小和最大值。Qwen3-30B-A3B，输入 512、输出 128 token。来源：capture/gpu/summary/gb10.json。
```

图中最宽的区间是上限 8 时的 EAGLE-3，范围 86.93 至 107.23 tok/s。其他区间都在各自中位数约 10% 以内。相对于这种波动，两倍差距是可信的。上限 64 时，FP8 为 440.86 tok/s，BF16 为 235.38。关闭 CUDA graphs 的曲线与默认曲线重合，原因见[第 4.1 节](#s-forwardmode-and-cuda-graphs)。

### 中位数隐藏了两类请求

`--output-details` 写出每个请求的首 token 时间。我们将上限 16、三个 seed 的所有请求排序后画图。

```figure
id: fig-5-1e
kind: chart
title: 上限 16、三次运行的 TTFT 分位数
claim: 约一半请求的等待时间比另一半高几倍，因此中位数无法描述任何一组。
caption: 每条曲线从汇总请求中抽取 51 个分位数绘制，从最快到最慢。玫瑰色线标记 P90，时间轴为对数刻度。来源：capture/gpu/summary/gb10.json 中上限 16 的逐请求负载扫描记录。
```

**我们在 GB10 上测到了两组请求。** BF16 中，最快一半请求的首 token 为 186.3 至 211.8 ms。从第 68 百分位开始，等待时间升至 1,639.8 至 1,743.4 ms。中位数为 237.6 ms，P90 为 1,721.5 ms，是中位数的 7.2 倍。FP8 也分两组。快的一半为 122.7 至 139.5 ms，慢的一半为 589.9 至 1,162.2 ms。

EAGLE-3 的中位数最慢，为 579.3 ms，尾部却最短，P90 为 1,007.4 ms。它的每 token 耗时分布反而最宽：中位数 82.8 ms，P99 191.3 ms。因为每一步接受的草稿 token 数会变化。

**我们对两组请求的解释：负载造成了它们。** `--random-range-ratio 1.0` 固定长度，每个请求恰好要求 128 个 token。因此一起开始的请求一起结束，替补请求也一起到达。每一波都排在前面的请求之后等待 prefill。真实流量长度混杂。如果使用固定长度测试，应将 P90 理解为突发流量成本，而非普通请求成本。

### 我们在 L4 上检验了波次假设

只有改变被归因的变量，解释才能超出假设。我们在单张 L4 上运行 Qwen3-8B，上限 16，64 个 prompt，每个点三个 seed。只改变 `--random-range-ratio`，从 1.0 到 0.5，再到 0.0。

```listing
title: L4 固定长度下的一波请求
source: capture/gpu/out-l4/server-waves-default.log
lang: text
note: 比例 1.0 的运行中连续五行日志。时间本身就是重点，因此保留时间戳。
---
[2026-10-17 15:54:33] Prefill batch, #new-seq: 8, #new-token: 4096, #cached-token: 1, token usage: 0.34, #running-req: 1, #queue-req: 0, #pending-token: 513, cuda graph: True, input throughput (token/s): 3509.80
[2026-10-17 15:54:34] Prefill batch, #new-seq: 8, #new-token: 3583, #cached-token: 0, token usage: 0.34, #running-req: 8, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 3503.78
[2026-10-17 15:54:35] Decode batch, #running-req: 16, #token: 8240, token usage: 0.34, cuda graph: True, gen throughput (token/s): 2.62, #queue-req: 0
[2026-10-17 15:54:37] Decode batch, #running-req: 16, #token: 8880, token usage: 0.37, cuda graph: True, gen throughput (token/s): 231.07, #queue-req: 0
[2026-10-17 15:54:40] Decode batch, #running-req: 16, #token: 9520, token usage: 0.40, cuda graph: True, gen throughput (token/s): 229.85, #queue-req: 0
```

日志中能看到波次。当时只有一个请求仍在运行，说明十五个请求刚刚一起结束，替补也一起到达。调度器用两个最多 4,096 token 的块做 prefill，随后全部 16 个请求一起 decode。

```figure
id: fig-5-1h
kind: chart
title: 固定长度用较慢首 token 换取平滑 decode
claim: 固定长度下，TTFT 中位数为 1,996 ms、P99 ITL 为 82 ms；混合长度则为 291 ms 和 300 ms。
caption: 实线为 TTFT 中位数，虚线为 P99 token 间延迟，每个点三个 seed，对数刻度。梅紫色为 BF16，绿色为 FP8 搭配 FP8 KV 缓存。来源：capture/gpu/summary/l4.json。
```

| 比例 | BF16 TTFT 中位数 | BF16 P99 ITL | FP8 TTFT 中位数 | FP8 P99 ITL |
|---|---|---|---|---|
| 1.0 | 1,996 ms | 82 ms | 1,526 ms | 55 ms |
| 0.5 | 364 ms | 396 ms | 130 ms | 95 ms |
| 0.0 | 291 ms | 300 ms | 129 ms | 95 ms |

**我们测得**固定长度下，BF16 首 token 慢了 6.9 倍，FP8 慢了 11.8 倍。混合长度发送的 token 更少，seed 1 的输入为 17,870，而非 32,768，因此部分差距来自工作量减少。但它解释不了另一个结果：混合长度下，P99 ITL 从 82 升至 300 ms。新 prompt 逐个到达，每次 prefill 都打断运行中的 decode；固定长度则只在波次之间做 prefill。

GB10 上的 Qwen3-30B-A3B 也呈现相同形状，每个点使用三个 seed。固定长度下，BF16 的 TTFT 中位数为 1,650 ms，P99 ITL 为 169 ms。混合长度时，它们分别为 320 ms 和 230 ms。FP8 的对应数值从 1,050 ms 和 92 ms 变为 188 ms 和 127 ms。两张 GPU、两个模型都呈现相同取舍，说明原因在负载，而非硬件。

两种设置实际测了两种不同服务形态。固定长度测突发：首 token 慢，之后输出平滑。混合长度测稳定流量：首 token 快，流式输出中有停顿。比较两个构建时保留 `--random-range-ratio 1.0`，因为它精确可重复。但用它制定延迟目标前，也要测试真实长度分布。

## Goodput 找到吞吐量隐藏的拐点

GB10 的 KV 池可容纳 234,600 个 token，因此 BF16 吞吐量到上限 64 仍在上升。没有拐点的吞吐量曲线不能告诉你哪里该停，延迟目标可以。

**Goodput：** 每秒在延迟目标内完成的请求数。`capture/gpu/summarize.py` 将首 token 小于 1 s、平均每 token 耗时小于 100 ms 的请求计为达标。

| 上限 | BF16 goodput | BF16 TPOT 中位数 | FP8 goodput | FP8 TPOT 中位数 |
|---|---|---|---|---|
| 4 | 0.44 req/s | 71.01 ms | 0.80 req/s | 38.60 ms |
| 8 | 0 | 102.21 ms | 1.07 req/s | 54.96 ms |
| 16 | 0 | 154.24 ms | 1.10 req/s | 81.90 ms |
| 32 | 0 | 201.91 ms | 0 | 104.12 ms |

BF16 的 goodput 在上限 4 时最高。从上限 8 起，请求中位数每 token 超过 100 ms，goodput 为 0。但该上限的吞吐量为 74.11 tok/s，仍在上升。FP8 直到上限 16 都能保持目标。**我们的建议：** 按自己的延迟目标选择 goodput 对应上限，吞吐量曲线只用于解释。

并发上限构成闭环。每个客户端等到答案才发送下一请求，服务器永远不会收到比已完成工作更多的新工作。真实用户不会互相等待。`--request-rate` 则按泊松到达时间发送请求，服务器慢于到达速率时队列会增长。我们在同一模型上测了每秒 0.5 至 16 个请求，每个点三个 seed。

```figure
id: fig-5-1d
kind: chart
title: 随输入负载变化的完成请求数与达标请求数
claim: 输入每秒 1 个请求时，FP8 每秒有 1.03 个请求达标；BF16 在各输入速率下几乎没有请求达标。
caption: 虚线为每秒完成请求数，实线为达标请求数，色带表示三个 seed 的范围。绿色为 FP8 搭配 FP8 KV 缓存，梅紫色为 BF16。来源：capture/gpu/summary/gb10.json 的速率扫描。
```

**我们在 GB10 上实测。** 每秒 0.5 个请求时，BF16 每 token 耗时中位数已经达到 177.5 ms。请求会重叠：每秒 0.52 个请求、每个 128 token、每 token 177.5 ms，约有 12 个请求共享每个 decode 步骤。每秒仅 0.07 个请求达标。FP8 在每秒不超过 1 个请求时全部达标，输入速率为 2 时降至每秒 0.17 个达标。

每秒输入 16 个请求时，BF16 每秒完成 3.88 个，P99 首 token 为 55,640.4 ms；FP8 每秒完成 8.26 个。输入速率不超过每秒 4 个时，GPU 时钟保持 2,496 MHz；达到 16 时，温度升至 89 C，7.3% 的采样处于热降频。最后一个 BF16 点既测了满队列，也测了热 GPU。

我们在单张 24 GB L4 上用 Qwen3-8B 做了相同开环测试，每次运行前降温至 72°C。

```figure
id: fig-5-1g
kind: chart
title: 在 24 GB L4 上运行相同开环测试
claim: L4 上，输入每秒 4 个请求时，FP8 每秒有 3.18 个达标；BF16 从输入 4 起没有达标请求。
caption: 虚线为每秒完成请求数，实线为达标请求数，色带表示三个 seed 的范围。绿色为 FP8 搭配 FP8 KV 缓存，梅紫色为 BF16。来源：capture/gpu/summary/l4.json 的速率扫描。
```

**我们在小卡上测到了不同形状。** 两台服务器在每秒不超过 1 个请求时全部达标。输入速率为 2 时，BF16 每秒还有 0.88 个达标；从 4 起没有达标请求。FP8 在输入 4 时，每秒有 3.18 个达标，是 BF16 最佳点的三倍。

超过峰值后，输入越多，BF16 完成越少：输入 4 时每秒完成 2.01，输入 8 时完成 1.91，输入 16 时完成 1.62。遥测揭示了原因：SM 时钟中位数从输入 4 时的 1,320 MHz，降至输入 16 时的 465 MHz。输入 16 时，70% 采样显示热降频。被动散热显卡过载时，吞吐量与延迟都会受损。

## 每次运行都记录 GPU 时钟

我们在 NVIDIA L4 上的首次扫描报告 CUDA graphs 没有效果。上限 1 时，开关计算图的每 token 耗时中位数都是 103.4 ms。该上限下，三个 seed 的结果为 10.0 至 14.9 tok/s，跨度达到中位数的一半。随后我们在扫描过程中读了 `nvidia-smi`。

```listing
title: 首次扫描中的 L4
source: capture/gpu/incidents/l4-thermal-throttle.txt
lang: text
note: 表头和运行扫描的 GPU 所在行。
---
index, temperature.gpu, power.draw [W], power.limit [W], clocks.current.sm [MHz], clocks.max.sm [MHz], clocks_event_reasons.active, clocks_event_reasons.sw_thermal_slowdown, clocks_event_reasons.hw_thermal_slowdown, clocks_event_reasons.sw_power_cap, utilization.gpu [%]
0, 87, 58.36 W, 72.00 W, 360 MHz, 2040 MHz, 0x0000000000000020, Active, Not Active, Not Active, 100 %
```

GPU 温度 87 C，软件热降频已激活，SM 时钟只有 360 MHz，额定值是 2040 MHz。L4 是 72 W 被动散热卡，同一机箱的第二张卡当时也在做其他工作。我们测到的是热 GPU，问题不在上面的服务器。

现在 `capture/gpu/sweep.py` 每秒采样一次 `nvidia-smi`，写入每次运行旁的 `.gpu.csv` 文件。每次运行前最多等 900 s，让 GPU 低于 `--cool` 温度限制，默认 65 C。这个机箱中的 L4 始终降不到 69 C 以下，所以我们用 `--cool 72`。`capture/gpu/summarize.py` 为每个点添加 SM 时钟中位数、最高温度、热降频位为真的采样占比。[图 5.1c](#fig-5-1c) 的 GB10 负载扫描早于遥测采样器，因此它较窄的波动区间是唯一检查依据。

我们用相同命令加降温等待，重新扫描 L4。下一张图的玫瑰色曲线是降频扫描。

```figure
id: fig-5-1f
kind: chart
title: 同一台服务器、同一张 L4：热卡与降温后测量
claim: 同卡同命令下，热卡扫描报告的吞吐量最多比降温扫描低 39%。
caption: 蓝色为降至 72 C 且记录时钟的扫描，玫瑰色为无遥测的首次扫描。色带为三个 seed 的范围。Qwen3-8B，输入 512、输出 128 token。来源：capture/gpu/summary/l4.json 和 capture/gpu/summary/l4-throttled.json。
```

**我们在 L4 上测到了差异。** 上限 32 时，降温后为 270.11 tok/s，热卡为 194.16 tok/s。上限 1 时，每 token 耗时中位数分别为 60.16 ms 和 103.38 ms。

降温后的运行也没达到全速。SM 时钟中位数为 1,080 至 1,515 MHz，额定值 2,040。上限 1 与 64 时，仍有 41% 至 49% 的采样带有热降频位。降温消除了最严重的错误，记录的时钟则告诉你还剩多少影响。

**我们的建议：** 没有每次运行的时钟和温度，基准就不构成证据。先看时钟，再看吞吐量。

## 我们的建议

报告仍符合延迟目标的最高并发，同时报告该点的吞吐量，以及 p50、p99 TTFT 和 TPOT。“上限 8，255 tok/s，首 token 中位数 0.79 s”是结果；“255 tok/s”只是口号。

随后在引擎外落实拐点限制。引擎自身的上限按内存设置，而延迟早已不可接受时，内存往往还没耗尽。把上限放进客户端、网关或 `--max-running-requests`，数值由扫描确定。

## 事故：手写计时脚本

[Issue #3196](https://github.com/sgl-project/sglang/issues/3196) 报告，八张 H200 上的 DeepSeek V3 只有 13 tok/s，而 DeepSeek API 为 60 tok/s {{issue #3196}}。另一位用户用两个 H100 节点达到 33 tok/s。测量脚本按空格切分统计单词，还把首 token 时间算进速度。单词不是 token，TTFT 不是 decode 时间，因此脚本低估了服务器。修复方式是用基准客户端，它按 token 计数，并区分 TTFT 和 TPOT。

```takeaways
- 使用 `python -m sglang.benchmark.serving`，不要手写计时循环。
- 传入 `--random-range-ratio 1.0`，否则说明使用的长度分布。
- 制定延迟目标前先测真实长度组合，因为固定长度会形成波次。
- 至少扫描三个并发上限，绘制吞吐量与 TTFT 中位数的关系。
- 报告吞吐量时，必须附上同一上限的 p50、p99 TTFT 和 TPOT。
- 将 Concurrency 理解为实际平均在途请求数，Peak concurrent requests 理解为按秒计数。
- 在客户端或网关落实拐点上限，引擎会接纳远多于此的请求。
- 每个点运行三个 seed，画出最小和最大结果。
- 根据延迟目标对应的 goodput 选择并发上限。
- 每次运行记录 SM 时钟与温度，剔除降频运行。
```

来源：python/sglang/benchmark/serving.py (calculate_metrics, argument defaults), python/sglang/benchmark/datasets/common.py (compute_random_lens), python/sglang/bench_serving.py, PR #40795, all at v0.5.22 (baa9befa); capture/out/serve-help.txt, capture/out/server-default.command.txt, capture/out/server-default.log, capture/out/bench-random-c1.txt, capture/out/bench-random-c8.txt, capture/out/bench-random-c32.txt; capture/gpu/sweep.py, capture/gpu/summarize.py, capture/gpu/summary/gb10.json, capture/gpu/summary/l4.json, capture/gpu/out-gb10/server-default.command.txt, capture/gpu/out-gb10/server-default.log, capture/gpu/out-gb10/bench-random-c8.txt, capture/gpu/out-gb10/bench-random-c32.txt, capture/gpu/incidents/l4-thermal-throttle.txt, capture/gpu/out-l4/server-waves-default.log.
