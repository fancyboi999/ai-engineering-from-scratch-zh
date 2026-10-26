# --tp-size、--dp-size 与 --attn-dp-size

> 张量并行让模型装得下，数据并行增加容量，注意力数据并行则消除张量并行为 MLA 模型复制的 KV 缓存。

你有八张 GPU 和一个大模型。多数人首先输入 `--tp-size 8`，模型也能加载。接着，同事问：640 GB 内存运行 DeepSeek 模型，为什么只能保存这么少的 KV 缓存 token？答案在于 SGLang 如何跨 GPU 拆分模型，以及一个在 v0.5.22 改变了含义的参数。

读完本节，你能根据模型和 GPU 数量选择 `--tp-size`、`--dp-size` 和 `--attn-dp-size`。你也能说明哪些 GPU 共享哪些工作，并读懂使用 `--enable-dp-attention` 的旧配置。

## 一个 world，多种拆分方式 {#s-tp-size-dp-size-and-attn-dp-size-one-world-many-ways-to-split-it}

**模型 world：** 共同保存一份模型的 GPU 集合。SGLang 只用两个数字构建它。当 world 大小不等于 `tp_size` 乘以 `pp_size` 时，代码会报错 {{code}}。

**张量并行（TP）：** 每层权重矩阵切成 `--tp-size` 份，每张 GPU 一份。随后，每层都以集合通信结束，将各份结果汇合。**流水线并行（PP）：** 按顺序将完整层分配给不同 GPU，`--pp-size` 设置阶段数。

其他并行方式都拆分同一个 world。注意力数据并行、专家并行和上下文并行不会增加 GPU。它们针对不同层，按不同方式重新划分 TP 组中的 GPU。

记住这个模型，后续参数就容易理解：TP 大小是一份模型使用的 GPU 数，其他宽度是划分这个集合的方式。

```figure
id: fig-6-1
kind: layers
title: 八张 GPU 的 TP 组，三种划分方式
claim: 设置 --tp-size 8、--attn-dp-size 4 和 --ep-size 8 后，同样八张 GPU 组成一个 TP 组、四个注意力组和一个专家组。
caption: 每行表示一种层，每个方块是一张 GPU。注意力组使用连续的 rank 范围，与 TP 组大小相等的专家组会复用该组。依据 v0.5.22 的组构建代码。
```

这些参数的默认值都是 1 {{code}}。因此，直接运行 `sglang serve` 会使用一张 GPU、一个调度器和一份模型。

## 数据并行的两种含义 {#s-tp-size-dp-size-and-attn-dp-size-two-meanings-of-data-parallel}

**数据并行（DP）：** 多份完整模型，每份处理自己的请求，保存自己的 KV 缓存。`--dp-size 2` 配合 `--tp-size 4` 使用八张 GPU，组成两个各有四张卡的 world。数据并行控制器进程将每个新请求交给其中一个副本 {{code}}。默认方法 `auto` 在非 prefill-decode 分离模式下解析为 `round_robin`。

```figure
id: fig-6-1b
kind: tree
title: 一个控制器后的两个数据并行副本
claim: 轮询将请求交替发往两个不共享 KV 缓存的 world，因此重复前缀在另一个 world 中可能未命中。
caption: 从上往下读。控制器采用默认 round_robin 方法。每个 world 是四张 GPU 的 TP 组，拥有独立缓存。依据 v0.5.22 的数据并行控制器和服务 hook 代码。
```

**注意力数据并行：** 在一个 TP 组内，注意力层以数据并行运行，前馈层或专家层仍分布在全部 GPU 上。每个注意力组都有自己的调度器、请求和 KV 缓存。`--attn-dp-size 4` 配合 `--tp-size 8` 得到四个各有两张 GPU 的注意力组。

v0.5.22 之前，一个参数承载两种含义。`--dp-size` 原本表示模型副本数；同时设置 `--enable-dp-attention` 后，它又表示注意力组数。PR [#41818](https://github.com/sgl-project/sglang/pull/41818) 解释了修改原因：`--dp-size` 有两种含义，读者每次都必须同时查看两个参数，才能判断它指哪一种。该 PR 于 2026-09-30 合并。

v0.5.22 对旧写法作如下处理 {{code}}：

| 你传入 | SGLang 的处理 |
|---|---|
| `--dp-size 8 --enable-dp-attention` | 改写为 `--attn-dp-size 8 --dp-size 1`，并打印弃用警告 |
| `--attn-dp-size 8` | 新写法，布局相同 |
| `--dp-size 2 --attn-dp-size 4` | 报错：不支持副本与注意力数据并行组合 |

警告会指出新参数，代码注释要求在 2026-12-31 之后移除旧参数 {{code}}。网上许多 DeepSeek 配置仍使用旧写法。它们当前能用，后续版本将不再支持。

## 为什么注意力需要独立的数据并行模式 {#s-tp-size-dp-size-and-attn-dp-size-why-attention-gets-its-own-data-parallel-mode}

DeepSeek 模型使用多头潜在注意力（MLA）。MLA 为每个 token、每层保存一个压缩潜在向量，相当于一个 KV 头。[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool) 推导了它的大小。张量并行无法将一个头分到多张 GPU，因此 `--tp-size 8` 时，每张 GPU 都保存全部 token 的完整潜在缓存。八张 GPU 就保存了八份相同的 KV 缓存。

SGLang 团队在 v0.4 加入该模式时给出了这一理由 {{team 2024-12}}。采用注意力数据并行后，每个注意力组只保存自己的请求。服务器的 KV 容量随组数增加。团队报告 DeepSeek 模型的 decode 吞吐量最高提升至 1.9 倍，这是他们的报告值。

对于使用分组查询注意力（GQA）的稠密模型，这一理由不成立。GQA 有多个 KV 头，张量并行已经能拆分缓存，无须复制。

## 注意力数据并行还会改变什么 {#s-tp-size-dp-size-and-attn-dp-size-what-attention-data-parallelism-changes-for-you}

开启注意力数据并行，会自动修改另外两个设置，无须另设参数 {{code}}：

- `chunked_prefill_size` 除以 `--attn-dp-size`。单 GPU 上调好的分块大小，在每个注意力组中会缩小。服务器日志打印修改前后的值。
- `schedule_conservativeness` 乘以 0.3。调度器接纳新请求时，为未来 token 留出的空间更少。[第 2.3 节](#s-admission-and-retraction) 解释了这种预留。

第一项尤其容易被忽略。团队用 `--chunked-prefill-size 8192` 测过 TTFT，再增加 `--attn-dp-size 8` 后，实际运行的分块变成 1024 token。长 prompt 需要更多调度步骤才能完成 prefill。

## 我们的建议 {#s-tp-size-dp-size-and-attn-dp-size-our-position}

只用满足模型装载需要的最小张量并行规模。通过数据并行副本增加容量，可以在一个服务器内使用 `--dp-size`，也可以在[第 6.4 节](#s-sgl-model-gateway)的网关后运行独立服务器。各副本的池大小应接近。我们唯一测试的双卡池大小不等，在所有负载下都更慢。DeepSeek、Kimi 等 MLA 混合专家模型应让 `--attn-dp-size` 等于 `--tp-size`；稠密 GQA 模型则保持为 1。

一份实践报告支持这个顺序。学生团队在 H100 和 H200 节点上为竞赛调优 DeepSeek-R1 {{field Lowndes 2025-11}}。单纯 `--tp 16` 的离线吞吐量约每秒 5.9k token。他们最好的布局在一个 H200 节点上结合 TP4、DP4、PP2 和注意力数据并行，达到每秒 17,417 token。这只能作为一个数据点，因为[文章](https://luca.lowndes.net/blog/sglang-optimisations)对 `--mem-fraction-static` 的解释有误。

Ant Group 在生产中作出了类似选择。他们的 DeepSeek-R1 decode 使用两个节点、16 个注意力组和 16 路专家并行 {{field Ant-Group 2025-09}}。

## 多节点 {#s-tp-size-dp-size-and-attn-dp-size-several-nodes}

一个模型 world 可以跨机器。三个参数描述这种布局 {{code}}：

| 参数 | 默认值 | 含义 |
|---|---|---|
| `--nnodes` | 1 | 一个 world 的机器数 |
| `--node-rank` | 0 | 本机的位置，从 0 开始 |
| `--dist-init-addr` | 无 | 所有 rank 汇合并构建通信组的 `host:port` |

只有节点 0 运行分词器和 HTTP API。其他节点只运行调度器进程和小型健康服务 {{code}}。负载均衡器应指向节点 0。相邻 rank 也应放在同一机器，因为 TP 组使用连续 rank 范围，其集合通信需要机内快速链路。

真实事故说明网络细节能让整个系统停住。一名用户跨节点运行注意力数据并行，在 `--dist-init-addr` 使用 IPv6 地址（[issue #19953](https://github.com/sgl-project/sglang/issues/19953)）。服务器向调度器发送第一条消息时挂起，一个请求也没能处理。原因是控制器绑定的 ZeroMQ socket 未启用 IPv6。讨论中提出了修复，但我们无法确认是否合并。

## 要测量什么 {#s-tp-size-dp-size-and-attn-dp-size-what-to-measure}

增加 GPU 前，先用[第 5.1 节](#s-sglang-benchmark-serving)的基准测一个副本。观察[第 5.2 节](#s-the-metrics-endpoint)的 `sglang:num_queue_reqs` 和 `sglang:token_usage`。队列增长而 token 使用率仍低，指向计算限制，增加副本会有帮助。token 使用率接近 1.0，指向 KV 内存限制，应先减少每 token 的 KV 缓存。

注意力数据并行还应观察 `sglang:dp_attention_token_imbalance_ratio`。它是最繁忙组的 token 数除以平均值，1.0 表示均衡。我们的 `/metrics` 捕获记录即使在单台 Mac 上也列出了它，因此可以提前加入仪表盘。

## 两张 L4 上发生了什么 {#s-tp-size-dp-size-and-attn-dp-size-what-happened-on-two-l4s}

一台机器里有两张 NVIDIA L4，第二张还运行另一团队的两个小型 pod，每个占用 1,746 MiB。我们以 `--tp-size 2` 启动 `Qwen/Qwen3-8B`，NCCL 启动两秒后服务器便停止。

```listing
title: 张量并行拒绝负载不均的双卡
source: capture/gpu/incidents/l4-tp-unbalanced-memory.txt
lang: text
note: 服务器日志中的调度器异常，省略其他行。
---
RuntimeError: The memory capacity is unbalanced. Some GPUs may be occupied by other processes. pre_model_load_memory=18.28375244140625, local_gpu_memory=21.70391845703125, local_gpu_memory * 0.9=19.533526611328124
```

加载权重前，每个 rank 测量空闲内存，全组取最小值。若该值低于本地空闲内存的 90%，服务器就停止 {{code}}。第二张卡空闲 18.28 GB，低于检查要求的 19.53 GB。v0.5.22 没有关闭检查的参数。

停止是合理的。TP 组每个 rank 保存相同比例的权重和相同大小的池。最小的卡决定所有卡的大小。共享机器上，应给 TP 组分配完整 GPU。`--dp-size 2` 没有这项检查，各副本独立确定池大小，因此能在同一双卡上启动。

## 同一双卡上的数据并行更慢 {#s-tp-size-dp-size-and-attn-dp-size-data-parallelism-on-the-same-pair-lost}

我们预期两个副本的服务能力约为一个的两倍，结果却低于一个。我们运行[第 4.3 节](#s-quantization)的闭环扫描，每个点用三个 seed。每个请求输入 512 token、输出 128 token。第一次只用一张 L4，第二次用两张卡和 `--dp-size 2`。

```listing
title: 两个副本，两个差异悬殊的池
source: capture/gpu/out-l4/server-dp2.log
lang: text
note: 启动行，以及 2026-10-17 07:26 在 64 个运行中请求下记录的四行 decode 日志，省略时间戳。
---
… DP0] Load weight end. elapsed=3.61 s, type=Qwen3ForCausalLM, avail mem=6.59 GB, mem usage=15.28 GB.
… DP1] Load weight end. elapsed=3.73 s, type=Qwen3ForCausalLM, avail mem=3.17 GB, mem usage=15.28 GB.
… DP0] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
… DP1] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 2925, K size: 0.20 GB, V size: 0.20 GB
… DP1] Decode batch, #running-req: 4, #token: 2385, token usage: 0.82, cuda graph: True, gen throughput (token/s): 25.48, #queue-req: 59
… DP0] Decode batch, #running-req: 1, #token: 590, token usage: 0.02, cuda graph: True, gen throughput (token/s): 9.67, #queue-req: 0
… DP1] Decode batch, #running-req: 4, #token: 2545, token usage: 0.87, cuda graph: True, gen throughput (token/s): 25.79, #queue-req: 59
… DP0] Decode batch, #running-req: 3, #token: 1665, token usage: 0.07, cuda graph: True, gen throughput (token/s): 9.49, #queue-req: 0
```

加载权重后，第二张卡空闲 3.17 GB，第一张为 6.59 GB，其余内存被两个 pod 占用。**我们测得**该副本的池只有 2,925 token，是第一个的八分之一。四个各有 640 token 的请求就能填满它。

控制器仍把每隔一个请求发给该副本，因为 `round_robin` 不查看池或队列。基准同时保持 64 个请求打开。并发 64 时，63 个落在小副本上，4 个运行、59 个等待。大副本只有一到三个请求，池使用率仅 2% 至 7%。小副本释放名额前，客户端无法再向大副本发送工作。

```figure
id: fig-6-1c
kind: chart
title: 两份模型的服务能力低于一份
claim: 一张 L4 达到每秒 270 token，共享双卡的 --dp-size 2 峰值为 64，并随时钟下降跌至 42。
caption: 横轴为最大并发，纵轴为输出吞吐量，每点三个 seed。梅紫色为一张 L4，玫红色为第二张卡被共享的双卡 --dp-size 2。来源：capture/gpu/summary/l4.json。
```

**我们测得**尾部延迟也有代价。并发 64 时，三个 seed 的 p99 TTFT 中位数，单 L4 为 33.4 秒，两个副本为 391 秒。单卡运行于 2026-10-16，双卡运行于 2026-10-17。32 和 64 用户下，双卡时钟为 765 和 675 MHz，低于我们的时钟下限。单卡则为 1,320 和 1,080 MHz，因此部分损失来自时钟。

并发不超过 4 时，两个副本已经慢了 16% 至 41%，原因尚未隔离。1 用户时，双卡每 token 耗时 79.6 ms，单卡为 60.2 ms，而双卡时钟更高。

[第 5.1 节](#s-sglang-benchmark-serving)的开环扫描结果一致。请求按固定速率到达时，两个副本在延迟目标内最多每秒完成 0.21 个请求，单 L4 则为 0.96。

随后，我们测了两种可能有帮助的设置之一。`--load-balance-method total_tokens` 把每个请求发往持有 token 最少的副本。

```listing
title: 相同的不均衡双卡，按 token 路由
source: capture/gpu/out-l4/server-dp2-tokens.log
lang: text
note: 启动时两个池的大小。第二张卡仍被共享，其副本池只有另一个的八分之一。
---
[2026-10-19 00:24:05 DP0] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
[2026-10-19 00:24:06 DP1] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 2925, K size: 0.20 GB, V size: 0.20 GB
```

**我们测得**相较轮询有大幅提升，但仍不如单卡。三次运行日期分别为 2026-10-19、2026-10-17 和 2026-10-16。

64 用户下，按 token 路由的双卡为 114.7 tok/s，轮询为 41.7，单 L4 为 250.9。8 用户下则分别为 92.1、64.2 和 112.6。64 用户下 TTFT 中位数从 4,763 降至 3,977 ms。该并发的时钟中位数为 1,020 MHz，轮询时为 675 MHz，因此部分收益可能来自显卡状态。

另一种设置是在[第 6.4 节](#s-sgl-model-gateway)的网关后运行两个独立服务器，各自赋予权重。我们没有测它，也没有测池大小相同的双卡。在这对池大小不等的卡上，`--dp-size 2` 在所有负载下都更慢。我们预期，只有各副本的池大小接近，数据并行才会增加容量。相信总容量前，先检查各 `DP` rank 的 `#tokens` 行。

```takeaways
- 将 --tp-size 设为能容纳模型及 KV 缓存的最小 GPU 数。
- 只有各副本池大小接近，才通过 --dp-size 或独立服务器增加容量。
- 仅对 MLA 混合专家模型，将 --attn-dp-size 设为等于 --tp-size。
- 依赖 --dp-size 的容量前，检查每个 DP rank 的 #tokens 行。
- 将旧配置 --dp-size N --enable-dp-attention 改写为 --attn-dp-size N。
- 开启注意力数据并行后，重新检查分块 prefill 大小。
- 向节点 0 发送请求，并将每个 TP 组放在同一机器内。
```

来源：python/sglang/srt/distributed/parallel_state.py (initialize_model_parallel)、python/sglang/srt/distributed/bootstrap.py (_check_tp_memory_balance)、capture/gpu/incidents/l4-tp-unbalanced-memory.txt、capture/gpu/out-l4/server-dp2.log、capture/gpu/summary/l4.json、python/sglang/srt/arg_groups/fields/parallel.py、python/sglang/srt/arg_groups/parallel_hook.py (handle_deprecated_dp_attention, handle_data_parallelism)、python/sglang/srt/server_args.py、python/sglang/srt/entrypoints/engine.py 和 python/sglang/srt/managers/data_parallel_controller.py，均为 v0.5.22。capture/out/metrics.txt。PR #41818，issue #19953。LMSYS，SGLang v0.4，2024-12-04。Luca Lowndes，SGLang optimisations，2025-11-07。Ant Group 发表于 LMSYS 博客的文章，2025-09-26；capture/gpu/out-l4/server-dp2-tokens.log、capture/gpu/summary/l4.json (load.dp2-tokens)。
