# --tp-size、--dp-size 与 --attn-dp-size

> 张量并行让模型装得下，数据并行增加容量，注意力数据并行则消除张量并行为 MLA 模型制造的 KV 副本。

你有八张 GPU 和一个大模型。多数人先输入 `--tp-size 8`，模型成功加载。随后同事问，为什么 640 GB 内存上的 DeepSeek 模型只能容纳这么少 KV token？答案在于 SGLang 如何跨 GPU 拆分模型，以及一个在 v0.5.22 改变含义的参数。

读完本节，你能根据模型与 GPU 数量选择 `--tp-size`、`--dp-size` 和 `--attn-dp-size`，说出哪些 GPU 共享什么工作，也能看懂使用 `--enable-dp-attention` 的旧配置。

## 一个 world，多种拆分方式

**模型 world：** 共同容纳一份模型的 GPU 集合。SGLang 只由两个数字构造它。World 大小不是 `tp_size` 乘以 `pp_size` 时，代码会报错 {{code}}。

**张量并行（TP）：** 每层权重矩阵切成 `--tp-size` 片，每张 GPU 一片。每层最后通过集合通信合并各片。**流水线并行（PP）：** 将完整层按顺序放到不同 GPU，`--pp-size` 设置阶段数。

其他并行方式都在拆分同一个 world。注意力数据并行、专家并行、上下文并行不会增加 GPU，只是在不同层重新分组 TP 组中的 GPU。

记住一个模型就能读懂后续参数：TP 大小是一份模型使用的 GPU 数，其他宽度描述如何切分这个集合。

```figure
id: fig-6-1
kind: layers
title: 八张 GPU 的一个 TP 组，三种拆法
claim: --tp-size 8、--attn-dp-size 4、--ep-size 8 下，同样八张 GPU 组成一个 TP 组、四个注意力组、一个专家组。
caption: 每行代表一种层类型，每个方块为一张 GPU。注意力组使用连续 rank 范围；专家组与 TP 组相同时复用它。依据 v0.5.22 的组构造代码。
```

这些参数默认都为 1 {{code}}。因此普通 `sglang serve` 使用一张 GPU、一个调度器、一份模型。

## “数据并行”的两种含义

**数据并行（DP）：** 多个完整模型副本，各自拥有请求和 KV 缓存。`--dp-size 2` 搭配 `--tp-size 4`，使用八张 GPU 构成两个各含四张卡的 world。数据并行控制器进程把每个新请求交给其中一个副本 {{code}}。默认方法 `auto` 在非 prefill-decode 分离场景解析为 `round_robin`。

```figure
id: fig-6-1b
kind: tree
title: 一个控制器后面的两个数据并行副本
claim: 轮询将交替请求发到两个不共享 KV 缓存的 world，重复前缀因此可能在另一个 world 未命中。
caption: 从上往下读。控制器采用默认 round_robin。每个 world 是四张 GPU 的 TP 组，拥有独立缓存。依据 v0.5.22 数据并行控制器和 serving hook 代码。
```

**注意力数据并行：** 在一个 TP 组内，注意力层按数据并行运行，前馈或专家层仍跨全部 GPU 拆分。每个注意力组都有自己的调度器、请求和 KV 缓存。`--attn-dp-size 4` 搭配 `--tp-size 8`，得到四个、每组两张 GPU 的注意力组。

v0.5.22 之前，一个参数承担两种含义：`--dp-size` 通常表示模型副本数，同时设置 `--enable-dp-attention` 后却表示注意力组数。[PR #41818](https://github.com/sgl-project/sglang/pull/41818) 用一句话说明原因：“`--dp-size` 有两种含义……读者必须同时检查两个参数，才能知道是哪一种。”该 PR 于 2026-09-30 合并。

v0.5.22 代码对旧写法做三种处理 {{code}}：

| 传入内容 | SGLang 行为 |
|---|---|
| `--dp-size 8 --enable-dp-attention` | 重写为 `--attn-dp-size 8 --dp-size 1`，打印弃用警告 |
| `--attn-dp-size 8` | 新写法，相同布局 |
| `--dp-size 2 --attn-dp-size 4` | 报错：不支持模型副本与注意力数据并行组合 |

警告给出新参数名，代码注释称 2026-12-31 后移除旧参数 {{code}}。网上多数 DeepSeek 配置仍使用旧写法。它们现在有效，之后某个版本会失效。

## 注意力为什么单独需要数据并行

DeepSeek 模型采用多头潜在注意力（MLA）。每个 token、每层只存一个压缩潜在向量，相当于一个 KV“头”，大小计算见[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool)。张量并行无法把一个头跨 GPU 拆开，因此 `--tp-size 8` 时，每张 GPU 都存储每个 token 的完整潜在缓存。八张 GPU 存了八份相同 KV 缓存。

SGLang 团队在 v0.4 引入此模式时给出了这个理由 {{team 2024-12}}。启用注意力数据并行后，每个注意力组只保留自己的请求，服务器 KV 容量随组数增加。团队称 DeepSeek 的 decode 吞吐量最高提升 1.9 倍，这是他们的主张。

对于使用分组查询注意力（GQA）的稠密模型，这个理由不成立。GQA 有多个 KV 头，张量并行已经可以拆分缓存，无需复制。

## 注意力数据并行还改变什么

启用注意力数据并行后，还会自动改变两个没有单独开关的设置 {{code}}：

- `chunked_prefill_size` 除以 `--attn-dp-size`。你在单 GPU 调好的 chunk 大小，到每个注意力组会变小。服务器日志打印原值与新值。
- `schedule_conservativeness` 乘以 0.3。调度器为未来 token 保留更少空间，因而接纳更多新请求。保留机制见[第 2.3 节](#s-admission-and-retraction)。

第一项最容易令人意外。团队先用 `--chunked-prefill-size 8192` 测 TTFT，再添加 `--attn-dp-size 8`，实际运行的 chunk 就只有 1024 token。长 prompt 的 prefill 需要更多调度步骤。

## 我们的建议

张量并行只用来让模型装得下。扩容用数据并行副本，可以在一台服务器内使用 `--dp-size`，也可以在[第 6.4 节](#s-sgl-model-gateway) 的网关后部署独立服务器。DeepSeek、Kimi 等 MLA 混合专家模型，可将 `--attn-dp-size` 设为等于 `--tp-size`；稠密 GQA 模型保持 1。

一份实践报告支持这个顺序。学生团队为竞赛在 H100、H200 节点上调优 DeepSeek-R1 {{field Lowndes 2025-11}}。普通 `--tp 16` 离线约每秒 5.9k token；最佳布局在一个 H200 节点上使用 TP4、DP4、PP2 和注意力数据并行，达到每秒 17,417 token。数字只作为一个数据点，因为[文章](https://luca.lowndes.net/blog/sglang-optimisations) 对 `--mem-fraction-static` 的解释有误。

Ant Group 在生产中做了相似选择。其 DeepSeek-R1 decode 在两个节点运行，使用 16 个注意力组和 16 路专家并行 {{field Ant-Group 2025-09}}。

## 多个节点

一个模型 world 可以跨机器。三个参数描述它 {{code}}：

| 参数 | 默认值 | 含义 |
|---|---|---|
| `--nnodes` | 1 | 一个 world 的机器数 |
| `--node-rank` | 0 | 本机的位置，从 0 开始 |
| `--dist-init-addr` | 无 | 所有 rank 汇合构建通信组的 `host:port` |

只有节点 0 运行 tokenizer 和 HTTP API。其他节点只运行调度器进程和小型健康服务器 {{code}}。负载均衡器应指向节点 0。相邻 rank 尽量留在同一机器，因为 TP 组使用连续 rank 范围，集合通信需要机内高速互联。

一次真实事故说明，网络细节足以让整套系统停止。用户跨节点运行注意力数据并行，在 `--dist-init-addr` 中使用 IPv6 地址（[issue #19953](https://github.com/sgl-project/sglang/issues/19953)）。服务器向调度器发第一条消息时挂起，没有服务任何请求。原因是控制器绑定 ZeroMQ socket 时未启用 IPv6。讨论中提出了修复，但我们无法确认是否合并。

## 应该测什么

添加 GPU 前，先用[第 5.1 节](#s-sglang-benchmark-serving) 基准测量一个副本。观察[第 5.2 节](#s-the-metrics-endpoint) 的 `sglang:num_queue_reqs` 和 `sglang:token_usage`。队列增长、token 使用率低，提示算力限制，增加副本有帮助。Token 使用率接近 1.0，提示 KV 内存限制，应先减少每 token 的 KV 缓存。

注意力数据并行应观察 `sglang:dp_attention_token_imbalance_ratio`。它报告最繁忙组的 token 数与平均值的比率，1.0 表示均衡。我们单台 Mac 的 `/metrics` 捕获中也列出该指标，因此可在真正需要前将其加入仪表盘。

## 两张 L4 上发生了什么

我们在一台机器上有两张 NVIDIA L4，第二张同时运行另一团队的两个小 pod，每个占 1,746 MiB。使用 `--tp-size 2` 启动 `Qwen/Qwen3-8B`，NCCL 启动两秒后服务器就停止。

```listing
title: 张量并行拒绝负载不均的两张卡
source: capture/gpu/incidents/l4-tp-unbalanced-memory.txt
lang: text
note: 服务器日志中的调度器异常，省略其他行。
---
RuntimeError: The memory capacity is unbalanced. Some GPUs may be occupied by other processes. pre_model_load_memory=18.28375244140625, local_gpu_memory=21.70391845703125, local_gpu_memory * 0.9=19.533526611328124
```

加载权重前，每个 rank 测可用内存，组内保留最小值。如果最小值低于本地可用内存的 90%，服务器停止 {{code}}。第二张卡只有 18.28 GB 可用，检查要求 19.53 GB。v0.5.22 没有关闭这项检查的参数。

停止是正确的。TP 组每个 rank 保存相同比例的权重和相同的池，最小的卡决定全组大小。共享机器上，应为 TP 组分配完整 GPU。`--dp-size 2` 没有此检查，因为各副本自行确定池容量，因此同一对卡能成功启动 DP。

## 同一对卡的数据并行反而更差

我们原以为两份副本能承接约两倍工作，结果却不如一份。使用[第 4.3 节](#s-quantization) 的闭环扫描，每个点三个 seed，请求输入 512、输出 128 token。第一次用一张 L4，第二次在两张卡上用 `--dp-size 2`。

```listing
title: 两份副本，两个差异巨大的池
source: capture/gpu/out-l4/server-dp2.log
lang: text
note: 启动日志，以及 seed 1 的 c64 运行中四条 decode 日志。省略时间戳。
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

权重加载后，第二张卡可用 3.17 GB，第一张为 6.59 GB，差值被两个 pod 占用。**我们测得**第二个副本的池只有 2,925 token，是第一个的八分之一。四个 640 token 请求就能填满它。

控制器仍然将每隔一个请求交给该副本，因为 `round_robin` 不看池和队列。基准同时维持 64 个请求。并发 64 时，其中 63 个落在小副本上，4 个运行、59 个等待；大副本只有一至三个请求，池使用率 2% 至 7%。小副本不释放槽位，客户端就无法给大副本发送更多工作。

```figure
id: fig-6-1c
kind: chart
title: 两份模型副本服务量不如一份
claim: 单 L4 达到每秒 270 token，共享卡上的 --dp-size 2 峰值只有 64，随后降至 42。
caption: 输出吞吐量与最大并发的关系，每点三个 seed。梅紫色为单 L4，玫瑰色为两张 L4 上的 --dp-size 2，第二张卡与其他任务共享。来源：capture/gpu/summary/l4.json。
```

**我们也测了尾部代价。** 并发 64、三个 seed 的 p99 TTFT 中位数，单 L4 为 33.4 秒，双副本为 391 秒。并发不超过 4 时，两副本慢 16% 至 41%，两边的池都还未满；严重损失从小池填满时开始。

[第 5.1 节](#s-sglang-benchmark-serving) 的开环扫描也一致。固定到达速率下，双副本每秒最多只有 0.21 个请求满足延迟目标，单 L4 为 0.96。

上游随后测量了两种可能改进的设置之一。`--load-balance-method total_tokens` 将请求发给持有 token 最少的副本。

```listing
title: 同一组容量不均的副本，按 token 路由
source: capture/gpu/out-l4/server-dp2-tokens.log
lang: text
note: 启动时的两个池。第二张卡仍与其他任务共享，副本池容量只有约八分之一。
---
[2026-10-19 00:24:05 DP0] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 24094, K size: 1.65 GB, V size: 1.65 GB
[2026-10-19 00:24:06 DP1] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 2925, K size: 0.20 GB, V size: 0.20 GB
```

**上游实测相对轮询有明显改善，但仍不如单卡。** 64 用户时，按 token 路由的双副本输出 114.7 tok/s，轮询为 41.7，单 L4 为 250.9。8 用户时，三者依次为 92.1、64.2 和 112.6。64 用户时 TTFT 中位数从 4,763 降至 3,977 ms，时钟中位数则为 1,020 MHz，轮询运行时为 675 MHz。因此部分提升可能来自显卡状态。

另一种设置是将两台独立服务器放在[第 6.4 节](#s-sgl-model-gateway) 的网关后，各自设置权重。上游尚未测量。更直接的教训是，只有各副本的池容量相近，数据并行才增加容量。相信容量之和前，先检查每个 `DP` rank 的 `#tokens` 行。

```takeaways
- 将 --tp-size 设为能装下模型和 KV 缓存的最少 GPU 数。
- 使用 --dp-size 副本或网关后的独立服务器扩容。
- 仅对 MLA 混合专家模型，将 --attn-dp-size 设为等于 --tp-size。
- 依赖 --dp-size 容量前，检查每个 DP rank 的 #tokens 行。
- 将旧配置 --dp-size N --enable-dp-attention 改为 --attn-dp-size N。
- 开启注意力数据并行后，重新检查分块 prefill 大小。
- 将请求发给节点 0，每个 TP 组尽量留在同一机器。
```

来源：python/sglang/srt/distributed/parallel_state.py (initialize_model_parallel), python/sglang/srt/distributed/bootstrap.py (_check_tp_memory_balance), capture/gpu/incidents/l4-tp-unbalanced-memory.txt, capture/gpu/out-l4/server-dp2.log, capture/gpu/out-l4/server-dp2-tokens.log, capture/gpu/summary/l4.json, python/sglang/srt/arg_groups/fields/parallel.py, python/sglang/srt/arg_groups/parallel_hook.py (handle_deprecated_dp_attention, handle_data_parallelism), python/sglang/srt/server_args.py, python/sglang/srt/entrypoints/engine.py, and python/sglang/srt/managers/data_parallel_controller.py, all at v0.5.22. capture/out/metrics.txt. Pull request #41818, issue #19953. LMSYS, "SGLang v0.4", 2024-12-04. Luca Lowndes, "SGLang optimisations", 2025-11-07. Ant Group on the LMSYS blog, 2025-09-26.
