# KV 池与每个 token 的字节数

> SGLang 将所有运行请求的每个 token 放进固定槽位池，因此模型每个 token 的字节数决定单张 GPU 能服务多少用户。

你为 80 亿参数模型租了一张 80 GB GPU。权重约 16 GB，多数人以为能容纳大量用户。但并发几十个会话时服务就开始排队，GPU 计算仍有余量。填满内存的不是权重，而是每个 token 的 key 和 value。

读完本节，你能根据模型配置计算 KV 成本，在启动日志找到相同数字，并解释 SGLang 为何以 token 计容量。

## 缓存为何存在

**KV 缓存：** 保存每层此前所有 token 的 key 和 value，让 decode 不必重算。一次 decode 生成一个新 token，它要注意此前全部 token 的 key 和 value。没有缓存，每个新 token 都要重做整个会话的 prefill。

因此缓存随会话长度和同时运行的会话数增长。除权重外，它是推理服务引擎最大的内存用户。[第 2 部分](#p-2)的每个调度决定，本质上都在管理这块内存。

## 公式与第一个实测数字

普通多头或分组查询注意力模型，每 token 的字节成本为：

`2 × layers × KV heads × head dim × bytes per value`

2 表示 key 和 value。**分组查询注意力：** 多个 query head 共用一个 key/value head，因此现代模型的 KV head 数远少于 attention head 数。SGLang 启动时计算该数字 {{code}}。上游 Mac 的 MLX 后端在日志开头输出它。

```listing
title: 启动时计算的 KV 池
source: capture/out/server-default.log
lang: text
note: 默认工具配置启动日志中的两行。
---
[2026-10-16 13:58:03] Auto-sized attention KV pool: sys_available=48.49 GB, mlx_limit=51.8 GB, mlx_used=0.31 GB, kv_budget=19.39 GB, bytes_per_slot=114688, pool_size=181574
…
[2026-10-16 13:58:08] MlxAttentionKVPool: 181575 slots x 28 layers x 8 heads x 128 dim, dtype=mlx.core.bfloat16, ~19859.8 MB
```

Qwen3-0.6B 的上游实测值为 `bytes_per_slot=114688`。第二行给出了全部因子：28 层、8 个 KV head、head dimension 128、每值 2 字节的 bfloat16。因此成本为 2 × 28 × 8 × 128 × 2 = 114,688 字节，即每 token 112 KiB。公式与日志精确到字节一致。

对公开模型配置做相同计算，得到：

| 模型 | 注意力 | 每 token 字节数，bf16 | 每张 GPU |
|---|---|---|---|
| Qwen3-0.6B（本手册捕获） | GQA，28 层，8 KV head | 112 KiB | 单 GPU 上 112 KiB |
| Llama-3.1-8B | GQA，32 层，8 KV head | 128 KiB | 单 GPU 上 128 KiB |
| Llama-3.1-70B | GQA，80 层，8 KV head | 320 KiB | 8 路张量并行时 40 KiB |
| DeepSeek-V3 | MLA，61 层，潜变量 512 加 64 | 68.6 KiB | 每张 GPU 均为 68.6 KiB |

两个结果常让人意外：0.6B 模型的每 token 成本几乎等于 8B 模型，因为决定成本的是层数与 KV head 数，不是参数量。Llama-3.1-8B 的 100,000-token 会话占用 12.5 GiB KV，已接近权重大小。

**多头潜在注意力（MLA）：** DeepSeek 的注意力机制，每 token 保存一个压缩潜变量，而非各 head 独立的 key 和 value。MLA 每 token 小，但所有张量并行 rank 都保存完整潜变量 {{code}}。增加张量并行 GPU 并不会增加可容纳 token 数。[第 6.1 节](#s-tp-size-dp-size-and-attn-dp-size)说明注意力数据并行如何处理该问题。

```figure
id: fig-3-1
kind: structure
title: Qwen3-0.6B 每个 token 的成本
claim: Qwen3-0.6B 一个 token 占 114,688 字节，是模型配置五个数字的乘积。
caption: 从左向右读。各框是启动日志 bytes_per_slot 的一个因子。来源：capture/out/server-default.log。
```

## 两张表，一个池

SGLang 的 KV 缓存使用固定槽位池，每 token 一个槽位。前方两张表各回答不同问题 {{code}}。

**ReqToTokenPool：** 每个运行请求占一行，每个 token 位置占一列。单元格存 KV 池槽位索引。第 0 行是 padding，让批次填充项写入无害位置。

**TokenToKVPoolAllocator：** KV 槽位空闲列表。请求需要空间时分配索引，结束时回收。槽位 0 同样保留给 padding，因此日志中 181,574-token 池对应 181,575 个缓冲槽位。

物理池保存 tensor。注意力内核通过请求在 `ReqToTokenPool` 中的行读取 key 和 value。该设计的重要作用是：共享前缀的两个请求可将行指向同一槽位，使共享 token 在内存只有一份。[第 3.3 节](#s-radixcache)介绍找到这些槽位的基数树。

```figure
id: fig-3-1b
kind: structure
title: 请求行指向同一个槽位池
claim: 共享 system prompt 的两请求将前缀指向相同 KV 槽位，使内存中前缀只有一份。
caption: 自上而下读。每行是一个 ReqToTokenPool 条目，下方条带是 KV 池。机制来自 v0.5.22 代码，大小为示意。
```

## 缓存就是池

SGLang 没有独立缓存大小设置。论文直接说明设计：缓存 token 与当前运行请求共享同一个内存池 {{paper}}。缓存前缀就是当前没有运行请求锁定的 KV。新请求需要空间时，从同一个池淘汰没有请求锁定的前缀。

因此启动日志只有 `max_total_num_tokens` 一个数，没有两个。上游 Mac 设置 `--mem-fraction-static 0.4` 后为 181,574 token。模型上下文允许 40,960 token，因此池可容纳四个满长会话，或约 180 个各 1,000-token 会话。运行请求与缓存前缀争用同一批槽位。

## 本手册的建议：数 token，不数 GB

按 `max_total_num_tokens` 而非空闲内存规划部署。将典型上下文长度乘所需并发，与该值比较。若乘积更大，调度器将回撤或排队，代价见[第 2.3 节](#s-admission-and-retraction)。

改变该数字的两个旋钮是[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)的内存比例，以及 KV 数据类型。`--kv-cache-dtype` 默认 `auto`，保留模型类型，除非 checkpoint 要求 FP8 {{code}}。FP8 将每 token 字节数减半。

实践报告说明了影响幅度。Cloudflare 报告 FP8 KV 使 Kimi K2.6 内存中容纳的上下文从约 686,000 token 增至约 137 万 {{field Cloudflare 2026-08}}。同一报告测得低并发时每请求吞吐量低了几个百分点。并发 64 时 BF16 内存耗尽，而 FP8 达到 2,192 token/s。这是用少量每 token 速度换取两倍用户容量。照搬前应阅读 [Cloudflare 文章](https://blog.cloudflare.com/smaller-faster-safer-models/)中的准确性检查。

## 测量什么

- 读取或计算 `bytes_per_slot`，核对两者一致。
- 从启动日志读取 `max_total_num_tokens`，除以典型上下文长度。
- 观察调度日志的 `token usage`，它表示运行请求与缓存前缀占据的池比例。

如想了解 SGLang 下层机制，[推理优化课](phases/10-llms-from-scratch/12-inference-optimization)会从零构建 KV 缓存。

```takeaways
- 根据层数、KV head 数、head dimension 和类型计算每 token 字节数。
- 核对计算值与启动日志 bytes_per_slot。
- 按 max_total_num_tokens 以 token 规划容量，不按 GB。
- MLA KV 在每个 TP rank 均有完整副本，增加 rank 不增加 token 容量。
- 购买更多 GPU 前可试 FP8 KV，并在自己的数据核对准确性。
```

Sources: python/sglang/srt/model_executor/pool_configurator.py (_compute_cell_size, calculate_pool_sizes), python/sglang/srt/mem_cache/memory_pool.py (ReqToTokenPool), python/sglang/srt/mem_cache/allocator/token.py (TokenToKVPoolAllocator), python/sglang/srt/hardware_backend/mlx/model_runner.py (_compute_pool_size), python/sglang/srt/arg_groups/fields/model.py (kv_cache_dtype) at v0.5.22, capture/out/server-default.log, the SGLang paper (arXiv 2312.07104), the Cloudflare report of 2026-08-03.
