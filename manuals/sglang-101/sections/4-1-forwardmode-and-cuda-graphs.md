# ForwardMode 与 CUDA graphs

> 一个 decode 步骤太小，无法让 GPU 持续忙碌；因此 SGLang 将内核启动过程记录为 CUDA graph，之后每一步都重放这份记录。

你在 H100 上用一个小模型服务一名用户，看着 token 不断返回。GPU 很快，性能分析器却显示内核之间有空档。Hazy Research 的实践报告 {{field Hazy Research 2025-09}} 测得，在 batch 为 1 时，SGLang 和 vLLM 运行 Llama-1B 都只用了大约一半的 H100 内存带宽。GPU 在等 CPU 告诉它接下来做什么。

读完本节，你能判断每次前向传播的模式，解释 CUDA graph 省下了什么。你也能看懂 SGLang 捕获的 batch 大小，让繁忙的 decode 仍在计算图中运行。

## 每次前向传播都有模式

**ForwardMode：** 标在 batch 上、告诉模型执行器该运行哪种前向传播的标签。调度器设置它，模型执行器、注意力后端和计算图执行器都会读取它。

| 模式 | 这次前向传播做什么 |
|---|---|
| `EXTEND` | Prefill。为多个新 token 写入 KV 条目。部分 prompt 可能已在缓存中。 |
| `DECODE` | 为每个运行中的请求生成一个新 token。 |
| `MIXED` | 在同一个 batch 中放入一块 prefill 和 decode token。默认关闭，需传入 `--enable-mixed-chunk`。 |
| `IDLE` | 没有 token。注意力数据并行中没有任务的 rank 仍运行它，使集合通信调用保持匹配。 |
| `TARGET_VERIFY` | 推测解码：目标模型为草稿 token 打分。 |
| `DRAFT_EXTEND_V2` | 推测解码：草稿模型读取已接受的 token。 |
| `PREBUILT` | Prefill-decode 分离中的 decode worker。KV 缓存由另一台服务器传来。 |
| `SPLIT_PREFILL` | 每次只执行几层的 prefill，用于 prefill-decode 多路复用。 |

SGLang 把每个请求写入多个 KV 条目的前向传播统称为“extend”。因此代码也将 `TARGET_VERIFY` 算作 extend。目标模型会计算每个请求的多个草稿位置，类似带树形 mask 的小型 prefill。

## 代价：一个 decode 步骤要启动许多小内核

Transformer 的每层由一串内核组成：归一化、QKV 投影、注意力、输出投影、第二次归一化和 MLP。28 层模型生成一个 token，要启动数百个内核。Prefill 时，每个内核处理数千个 token，启动时间相对计算时间很短。Decode 时，每个内核只处理每个请求的一个 token。

Batch 为 1 时，GPU 常常已经完成一个内核，而 Python 进程还没发出下一个。直观的修复是缩短启动路径，例如减少 Python 调用。这能帮上一点忙，但每个内核仍需 CPU 单独启动，内核数量也没有减少。

**CUDA graph：** 记录张量形状和地址固定的一组内核启动操作，GPU 可以通过一次 CPU 调用重放整份记录。

```figure
id: fig-4-1
kind: comparison
title: 一个 decode 步骤：逐个启动与重放
claim: Eager 模式下，CPU 启动每层的每个内核；计算图模式下，一次重放调用运行整段已记录的 decode 步骤。
caption: 每列从上往下读。内核名称对应 Llama 风格一层中的操作。右列仅在 batch 能放入已捕获大小时运行。依据 v0.5.22 的 decode CUDA graph runner。
```

记录也有代价。每种捕获的形状都会占用 GPU 内存，batch 必须与某个已捕获形状完全一致。SGLang 为 decode 承担这项开销，把每个 batch 填充到下一个已捕获的大小。

## SGLang 捕获什么，何时放弃重放

**捕获桶：** SGLang 在启动时为之记录 decode 计算图的某个 batch 大小。不使用推测解码时，v0.5.22 会捕获 1、2、4、8、12，之后从 16 到 256 每隔 8 捕获一次；超过 256 后每隔 16 捕获一次，直到 511；再往上每隔 32 捕获一次，直到最大值。13 个请求的 batch 会重放大小为 16 的计算图，浪费三个槽位。

最大桶 `max_bs` 取决于 GPU 内存和张量并行规模。不设置 `--cuda-graph-max-bs-decode` 时，启动代码会替你选择。

| GPU 内存 | GPU 示例 | TP 小于 4 时 decode 的 `max_bs` | TP 大于等于 4 时 | `chunked_prefill_size` |
|---|---|---|---|---|
| 小于 20 GB | T4, RTX 4080 | 8 | 8 | 2048 |
| 20 至 35 GB | A10, RTX 4090, RTX 5090 | 48 | 160 | 4096 |
| 35 至 60 GB | A100 40 GB, L40 | 32 | 160 | 4096 |
| 60 至 90 GB | H100, A100 80 GB | 256 | 512 | 8192 |
| 90 至 160 GB | H200 | 256 | 512 | 8192 |
| 160 GB 及以上 | B200, MI300X | 512 | 512 | 16384 |

Decode batch 大于 `max_bs` 时，计算图执行器无法重放。这一步转为 eager 模式，每个内核分别启动。服务器不会失败，也没有 warning。该 batch 的调度器日志会显示 `cuda graph: False`，每个 token 的延迟随之上升。

```figure
id: fig-4-2
kind: decision
title: 哪些 decode batch 能重放计算图
claim: Decode batch 不超过 max_bs 时，重放下一个已捕获大小的计算图；超过时以 eager 模式逐个启动内核。
caption: 从左向右读。桶列表来自 v0.5.22 在 80 GB GPU、TP 1、不使用推测解码时的默认值。大小为 300 的 batch 运行 eager 模式。
```

代码不会以同样方式改变 prefill 的形状。从 PR #29458（2026-07-01）起，CUDA 构建为 prefill 使用可中断计算图。**可中断计算图：** 遇到标记为 eager 执行的操作就结束当前片段，单独执行该操作，再开始下一片段。即使模型中有一个操作无法放进计算图，其余操作仍可使用计算图。其他平台默认关闭 prefill 计算图，我们的 Mac 捕获日志记录了这两点。

```listing
title: 启动日志和首批 batch 中的计算图状态
source: capture/out/server-default.log
lang: text
note: 默认服务器日志中的两行。省略了时间戳和 batch 日志末尾。
---
… Disable prefill CUDA graph because cuda_graph_config resolved prefill.backend='disabled' (e.g. via --cuda-graph-backend-prefill=disabled or auto-disable rules).
… Prefill batch, #new-seq: 1, #new-token: 6, #cached-token: 0, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, …
```

每条调度器 batch 日志的末尾都有 `cuda graph:`。在 CUDA 服务器上，观察 decode batch 的这个字段。

较早的 prefill 计算图 torch.compile 路径正在 PR #42285 至 #42287 中移除。若博客说“分段 CUDA graphs 使用 torch.compile”，描述的就是旧路径。

## 实践报告中的延迟陡升

Jarvislabs 的实践报告 {{field Jarvislabs 2026-05}} 在一张 H100 上使用 SGLang 默认参数运行 Qwen2.5-7B。并发 300 时，平均 token 间延迟为 17.72 ms，vLLM 为 12.28 ms。不设并发上限时，两者分别是 100.92 ms 和 28.84 ms。文章没有记录 SGLang 版本和服务器日志。

我们将以下解释明确标为假设。该 GPU 上默认 decode `max_bs` 为 256，而延迟断点恰好略高于它。维护者也在较小的显卡上观察到类似现象。20 至 35 GB 档位的代码注释说，旧上限“在 bs>=32 时强制 eager decode，导致相对 vLLM 的高并发吞吐量崩塌” {{code}}。PR #37898 在 2026-09-04 将这个上限从 24 提高到 48。

## 我们在 GB10 上测到了什么

上面的代价分析假定 GPU 很快、模型很小。我们测了另一种情况：在一张 NVIDIA GB10 上运行混合专家模型 `Qwen/Qwen3-30B-A3B-Instruct-2507`。GB10 的 CPU 与 GPU 共享内存，带宽低于数据中心 GPU 的 HBM。

**我们实测**了两台服务器，并发从 1 到 64，每种并发使用三个 seed。默认服务器在每个 decode batch 都重放计算图，日志显示 `cuda graph: True`。另一台服务器把两个计算图后端都设为 `disabled`，日志显示 `cuda graph: False`。结果几乎相同：

| 并发 | 使用计算图的 TPOT 中位数 | 不使用计算图的 TPOT 中位数 | 使用计算图的输出 tok/s | 不使用计算图的输出 tok/s |
|---|---|---|---|---|
| 1 | 32.52 ms | 33.09 ms | 29.14 | 28.72 |
| 8 | 102.21 ms | 104.77 ms | 74.11 | 73.46 |
| 64 | 254.06 ms | 253.77 ms | 235.38 | 235.79 |

[图 5.1c](#fig-5-1c) 中的两条曲线几乎重合。计算图仍然消耗启动时间和内存：decode 捕获花了 4.61 s、占 1.73 GB；prefill 捕获花了 35.06 s、占 2.14 GB。

我们的解释是：batch 为 1 时，这个模型的一个 decode 步骤约需 32 ms。计算图消除的启动时间相对这一步很短。每步都要读取各 token 选中的专家权重，耗时由内存带宽决定。

## 上游在 L4 上测到了什么

上游最初在 L4 上用稠密 `Qwen/Qwen3-8B` 做的扫描有误。显卡温度达到 87 C，发生热降频，SM 时钟仅为 360 MHz，额定值为 2,040 MHz。降频使每一步都变慢，节省的启动时间被噪声淹没。上游已移除那组数字。每次基准都应记录 GPU 时钟和温度，方法见[第 5.1 节](#s-sglang-benchmark-serving)。

上游随后在降温后的 L4 上重复对照。每次运行从不超过 72 C 开始。SM 时钟中位数低于 1,000 MHz 的运行会重试，最多三次。开启计算图的服务器运行于 2026-10-16，关闭计算图的服务器运行于 2026-10-18，两者池容量均为 24,094 token。

```listing
title: 相同 batch 开启和关闭计算图
source: capture/gpu/out-l4/server-load-graphs-on-off.log
lang: text
note: 两台服务器各截取一行 33 个运行中请求的 decode 日志。第一台重放计算图，第二台使用 eager 模式。
---
[2026-10-16 20:32:22] Decode batch, #running-req: 33, #token: 19597, token usage: 0.81, cuda graph: True, gen throughput (token/s): 319.70, #queue-req: 0
[2026-10-18 18:01:00] Decode batch, #running-req: 33, #token: 20422, token usage: 0.85, cuda graph: False, gen throughput (token/s): 350.78, #queue-req: 0
```

| 并发 | TPOT 中位数，开启 / 关闭计算图 | 输出 tok/s，开启 / 关闭 | P99 ITL，开启 / 关闭 |
|---|---|---|---|
| 1 | 60.16 / 60.63 ms | 13.42 / 13.81 | 104 / 104 ms |
| 8 | 66.01 / 66.64 ms | 112.62 / 111.60 | 71 / 68 ms |
| 32 | 96.18 / 94.11 ms | 270.11 / 270.80 | 103 / 89 ms |
| 64 | 107.42 / 106.70 ms | 250.85 / 256.41 | 114 / 98 ms |

**上游实测** L4 上的差异也很小。不超过 16 用户时，计算图在 60 至 70 ms 的一步中节省 0.5 至 0.6 ms，不到 1%。所有并发下吞吐量差距均在 3% 内。从 32 用户起，关闭计算图的服务器 P99 ITL 更低；32 用户时为 89 对 103 ms。上游尚未查明机制，且两台服务器在不同日期运行，因此这只能作为线索，不能视为结论。

上游的解释是：batch 为 1 时，8B 模型每步约从内存读取 16 GB 权重。计算图消除的启动时间相对这次读取很短。

## 我们的建议

保持 CUDA graphs 开启，并根据流量设置大小。默认 `max_bs` 适合中等并发。如果基准或生产峰值的请求数超过它，在测量前将 `--cuda-graph-max-bs-decode` 和 `--max-running-requests` 设为目标值。SemiAnalysis InferenceX 的配置 {{field InferenceX 2026-05}} 会根据测试并发推导这两个值。

不要指望计算图在任何机器上都能让慢 decode 变快。在 GB10 上，混合专家模型一个 decode 步骤需要数十毫秒，计算图带来的变化不超过 3%。L4 上的稠密 8B 模型节省不到 1%。先分别测量开启和关闭计算图的结果，再判断是否应归咎于启动路径。

不要靠关闭计算图解决内存问题。捕获时内存不足，应降低 `--cuda-graph-max-bs-decode` 或 `--mem-fraction-static`。没有 decode 计算图的服务器，必须为每位用户的每个 token 支付启动开销。

v0.5.22 改了两个参数名，旧配置会因此失效。`--disable-cuda-graph` 仍然有效，但帮助文本已标记为弃用。

```listing
title: sglang serve --help 中已弃用的计算图参数
source: capture/out/serve-help.txt
lang: text
note: 帮助文本末尾弃用参数部分的两行。
---
  --disable-cuda-graph  Deprecated. Use --cuda-graph-
                        backend-{decode,prefill}=disabled instead.
```

参数 `--cuda-graph-max-bs` 已不存在。我们将它传给 v0.5.22 的参数解析器，进程退出并返回 `ambiguous option: --cuda-graph-max-bs could match --cuda-graph-max-bs-decode, --cuda-graph-max-bs-prefill`。

## 事故

**使用注意力数据并行时，捕获计算图耗尽内存。** Issue #23769（2026-04-26）：在两个各有八张 H200 的节点上，DeepSeek-V4-Pro-FP8 在捕获计算图时退出。注意力数据并行下，计算图 batch 大小按每个 rank 计算，因此捕获的图超过了实际流量所需。修复方式是降低计算图 batch 大小或 `--mem-fraction-static`。

**字段重命名破坏了 Python API。** Issue #36478（2026-08-26）：`sgl.Engine(..., disable_piecewise_cuda_graph=True)` 抛出 `TypeError`，命令行参数却仍然有效。PR #23906 将该字段合入按阶段配置的计算图设置，只保留了命令行别名。应改为 `cuda_graph_backend_prefill="disabled"`。

**新 GPU 需要 eager 模式。** joshua8.ai 的实践报告 {{field joshua8 2026-01}} 在 RTX PRO 6000 Blackwell（SM120）上运行 SGLang，必须使用 `--disable-cuda-graph` 才能启动。面对新架构，比较引擎前先检查捕获能否正常工作。

```takeaways
- 关注目标 decode batch 的调度器日志，读取 cuda graph 字段。
- 基准测试前，将 --cuda-graph-max-bs-decode 和 --max-running-requests 设为峰值并发。
- 用更小的计算图 batch 大小解决捕获内存问题，保持计算图开启。
- 调优前，先在自己的 GPU 和模型上分别测量开启与关闭计算图的 decode。
- 将旧配置的 --cuda-graph-max-bs 和 --disable-cuda-graph 换成 v0.5.22 按阶段设置的参数。
```

来源：capture/out/server-default.log, capture/out/serve-help.txt, capture/gpu/out-gb10/server-default.log, capture/gpu/out-gb10/server-no-cuda-graph.log, capture/gpu/summary/gb10.json, capture/gpu/incidents/l4-thermal-throttle.txt, capture/gpu/out-l4/server-load-graphs-on-off.log, capture/gpu/summary/l4.json (load.default, load.no-cuda-graph), python/sglang/srt/model_executor/forward_batch_info.py (ForwardMode), model_executor/model_runner.py (_forward_raw), model_executor/cuda_graph_config.py (default_prefill_backend), model_executor/runner/decode_cuda_graph_runner.py (can_run_graph), arg_groups/memory_hook.py (_handle_gpu_memory_settings), arg_groups/cuda_graph_hook.py (generate_decode_cuda_graph_batch_sizes), and server_args.py (deprecated flags) at v0.5.22; the argument parser of the installed v0.5.22 package; PRs #23906, #29458, #37898, #42285; issues #23769 and #36478; field reports by Hazy Research (2025-09-28), Jarvislabs (2026-05-18), joshua8.ai (2026-01-10), and SemiAnalysis InferenceX (2026-05-26).
