# 淘汰策略与 HiCache

> GPU 池满时，SGLang 默认淘汰最近最少使用的前缀；HiCache 将被淘汰前缀保存在主机内存与可选存储中。

编程 agent 的会话已有八轮，历史超过 25,000 token。GPU 池只能装几十个这样的会话。第九十一个用户到达时，SGLang 必须淘汰缓存前缀腾空间。第一个用户返回时，历史已不在缓存，服务器又重算全部 25,000 token。

读完本节，你能根据实测命中率选择淘汰策略，判断分层缓存何时值得付出成本，以及先改哪些设置。

## 淘汰移除什么

淘汰只移除没有运行请求锁定的缓存 token，即[基数树](#s-radixcache)叶子。绝不移除运行请求的 KV；后者叫回撤，见[第 2.3 节](#s-admission-and-retraction)。淘汰从最低得分叶子开始，向根推进。

`--radix-eviction-policy` 决定得分 {{code}}，默认 `lru`。

| 策略 | 优先淘汰 | 适用场景 |
|---|---|---|
| `lru` | 最后访问时间最早的前缀 | 多数负载，默认 |
| `lfu` | 命中最少者，相同则最老者 | 稳定数小时的热门 prompt 集 |
| `slru` | 命中少于 2 次的前缀，其次最老者 | 稳定热门集合混有一次性 prompt 流 |
| `priority` | 低优先级请求的前缀 | 带请求优先级的混合流量 |
| `tlru` | 不影响下一轮 prefill 时间的历史 | 有尾延迟目标的多轮 agent |

**尾延迟优化 LRU（tlru）：** 只保留满足下一轮延迟目标所需的会话部分，优先淘汰其余部分。来自代码引用的论文 arXiv 2510.15152。SGLang 团队报告在并发 32 的 DeepSeek-V4-Pro 上 P99 token 间延迟下降 43.9% {{team 2026-10}}。数字来自 v0.5.21 发布说明，手册未找到独立测试。

## 本手册的建议：没有测量依据就保留 lru

SGLang 文档也建议从 `lru` 开始，仅依据实测命中率修改 {{docs}}。流行度变化时，频率策略会受损：昨天热门的 prompt 留在内存，今天的 prompt 为此付费。只有能说清新策略服务哪种负载时才修改，并比较前后命中率。

## HiCache：一棵树的三层存储

**HiCache：** SGLang 分层缓存，将基数树从 GPU 内存延伸至主机内存和存储后端。通过 `--enable-hierarchical-cache` 开启，默认关闭 {{code}}。代码与文档中的各层名称为：

- **L1：** [第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool)的 GPU 池。
- **L2：** 锁页主机内存池，一个服务器实例私有。
- **L3：** 跨实例共享的可选存储后端，通过 `--hicache-storage-backend` 设置，可选 `file`、`mooncake`、`hf3fs`、`nixl` 等。

树记录各节点的 KV 位于何处。匹配返回 GPU 与主机命中长度，再把主机部分载入新 GPU 槽位，领先需要它的计算一层 {{docs}}。

`--hicache-write-policy` 决定何时生成主机副本，默认 `write_through`。代码对 `write_through` 设置命中阈值 1，对 `write_through_selective` 设 2 {{code}}。因此前者首次命中就复制，后者等第二次；`write_back` 则仅在 GPU 淘汰节点时复制。

```figure
id: fig-3-5
kind: flow
title: 一个前缀经过 HiCache 三层
claim: write_through 在首次命中时生成主机副本，GPU 淘汰后无需完整 prefill。
caption: 写入从左向右，回载从右向左。阈值与默认值来自 v0.5.22 UnifiedRadixCache。
```

## 决定收益的设置

L3 预取有自己的规则。存储命中少于 256 token 时跳过预取 {{code}}。默认预取策略 `timeout`，等待存储的时长随 prompt 增长。

文档与代码对超时有冲突。文档给出基础 2 秒、每 1,024 token 加 0.1 秒、最多 30 秒 {{docs}}；v0.5.22 代码为基础 1.0 秒、每 1,024 token 加 0.25 秒 {{code}}。手册未在缓存代码找到最大值。以代码为准：100,000-token prompt 可能等存储约 25 秒，才回退重算。

主机池大小由 `--hicache-ratio` 或 `--hicache-size` 确定。两者都不设时，最多使用 `--hicache-host-memory-fraction`，默认为可用主机内存的 0.8 {{code}}。

## 其他团队测到了什么

上游未能在捕获 Mac 上运行 HiCache，外部证据也较少。下一小节是 L4 上的上游测试。找到的外部数字来自 SGLang 团队与合作方。

- SGLang RBG 团队和 Mooncake 团队在 Kubernetes 上运行多轮基准 {{field Alibaba Cloud 2026-03}}。仅 GPU 内存时平均 TTFT 5.91 秒，L2 降到 3.77 秒，再加 Mooncake L3 降到 2.58 秒。
- SGLang HiCache 文章引用 Novita {{team 2025-09}}：平均 TTFT 下降 56%，命中率从 40% 升至 80%。

失败报告比成功报告记录更充分。Issue #35129 中，回载找不到空间时淘汰其他会话 GPU 前缀，250,000 次 evict 对应 376 次完成回载 {{issue #35129}}。Issue #30760 中，一个张量并行 rank 永远等待预取检查，其余 rank 继续 {{issue #30760}}。Issue #42465 中，540,000-token prompt 突发在开启 HiCache 时挂住全部 rank，关闭则能运行 {{issue #42465}}。

## L4 实测

上游在 24 GB L4 上用 `Qwen/Qwen3-8B` 测试 L2。每组八请求共享 2,048-token system prompt，各加 64-token 问题。组数从 4 增至 64，并发上限 8，每点三个种子。第二个服务添加 `--enable-hierarchical-cache --hicache-ratio 4`。

GPU 池容纳 24,094 token，约 11 份 system prompt。16 组及以上时，默认服务器必然淘汰之后仍需使用的 prompt。

```listing
title: L4 的主机层
source: capture/gpu/out-l4/server-working-set-hicache.log
lang: text
note: 启动主机池，以及 64 组运行中的两行 prefill。
---
[2026-10-17 17:35:15] Allocating kv hierarchical KV host pool: 96377 tokens, 14.21 GB host memory.
[2026-10-17 18:19:03] Prefill batch, #new-seq: 4, #new-token: 4096, #cached-token: 2196, token usage: 0.65, #running-req: 2, #queue-req: 0, #pending-token: 5234, cuda graph: True, input throughput (token/s): 1431.87
[2026-10-17 18:19:03] Prefill batch, #new-seq: 3, #new-token: 953, #cached-token: 4281, token usage: 0.65, #running-req: 5, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 1251.76
```

```listing
title: 仅 GPU 池的相同负载
source: capture/gpu/out-l4/server-working-set-default.log
lang: text
note: 默认服务 64 组运行中的两行 prefill。
---
[2026-10-17 17:34:02] Prefill batch, #new-seq: 3, #new-token: 4096, #cached-token: 0, token usage: 0.65, #running-req: 5, #queue-req: 0, #pending-token: 1138, cuda graph: True, input throughput (token/s): 1573.58
[2026-10-17 17:34:03] Prefill batch, #new-seq: 1, #new-token: 1138, #cached-token: 0, token usage: 0.65, #running-req: 7, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 1347.58
```

```figure
id: fig-3-5c
kind: chart
title: HiCache 保存 GPU 池淘汰的 prompt
claim: L4 上 32 份不同 system prompt 时，HiCache 将 TTFT 中位数从 5,449 降至 817 ms。
caption: TTFT 中位数对不同 system prompt 数，每点三个种子，对数刻度。玫红仅 GPU，绿色增加主机层。来源：capture/gpu/summary/l4.json。
```

| 组数 | 需保留 prompt token | TTFT 中位数，仅 GPU | TTFT 中位数，HiCache | 输出 tok/s，仅 GPU | 输出 tok/s，HiCache |
|---|---|---|---|---|---|
| 4 | 8,192 | 360 ms | 361 ms | 82.39 | 81.64 |
| 16 | 32,768 | 3,259 ms | 553 ms | 37.95 | 74.75 |
| 32 | 65,536 | 5,449 ms | 817 ms | 25.72 | 69.29 |
| 64 | 131,072 | 6,821 ms | 3,610 ms | 21.37 | 35.93 |

**上游实测**四组全部装进 GPU 时没有额外成本。32 组时，主机层把等待中位数缩短为约 1/6.7，吞吐量增加到 2.7 倍。64 组需要的 prompt 超过 GPU 加主机总容量（约 120,000 token），HiCache 仍将等待减半，却无法接近四组结果。

这些运行卡温较高。从 16 组起，两种服务的 52至95% 样本有热降频标志。默认服务重算更多、温度更高，因此部分损失来自时钟。上面的缓存命中日志则不依赖时钟。

GB10 运行相同负载作对照，没有开启 HiCache。GB10 的 CPU/GPU 共用内存，主机副本会与原池占用同一来源。

```listing
title: GB10 的池与 64 组运行的两行 prefill
source: capture/gpu/out-gb10/server-working-set-default.log
lang: text
note: 先是启动池，再是连续两行 prefill；长行已裁剪。
---
[2026-10-17 19:33:31] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 260013, K size: 11.90 GB, V size: 11.90 GB
[2026-10-17 19:52:36] Prefill batch, #new-seq: 1, #new-token: 67, #cached-token: 2196, token usage: 0.01, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 29.36
[2026-10-17 19:52:36] Prefill batch, #new-seq: 7, #new-token: 476, #cached-token: 15146, token usage: 0.06, #running-req: 1, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 1605.53
```

其池容纳 260,013 token，足以同时保存 64 份 system prompt。第二行 prefill 为七个新请求找到 15,146 个缓存 token。从 4 到 64 组，TTFT 中位数始终为 448至460 ms。没有淘汰，也就没有需要主机层回载的内容。

实验规则取决于工作集大小：加总用户在几分钟内会返回使用的不同前缀。总量超过 GPU 池时，主机层值得；低于时，只是白加一份副本。

## 本手册的建议：长会话分步加 HiCache

会话寿命超过 GPU 池留存时间时，HiCache 才有回报：多轮聊天、编程 agent、重复提问的长文档。短的一次性 prompt 只增加复制与回载，无内容可复用。按以下顺序添加，每步测命中率和 P99 TTFT。

1. 先按[第 3.4 节](#s-prefix-friendly-prompts)稳定 prompt 前缀。
2. 只开启 L2，保留默认 `write_through`。
3. 主机复制占太多 PCIe 带宽时，改为 `write_through_selective`。
4. 多实例需要共享前缀时，添加 L3。
5. 最后再改淘汰策略。

```takeaways
- 重复前缀大于 GPU 池时添加主机层。
- 没有实测理由就保留 lru。
- 长多轮会话用 HiCache，一次性 prompt 不用。
- 先仅用主机内存，测量后再加存储。
- v0.5.22 的预取超时以代码为准。
- 部署 HiCache 前关注 issue 中的淘汰风暴与 rank 挂起。
```

Sources: python/sglang/srt/mem_cache/evict_policy.py, python/sglang/srt/mem_cache/unified_radix_cache.py (write_through_threshold, prefetch_timeout_base), python/sglang/srt/mem_cache/hybrid_cache/hybrid_pool_assembler.py (prefetch_threshold), python/sglang/srt/arg_groups/fields/memory.py at v0.5.22, docs/docs/advanced_features/hicache_design.mdx and radix_eviction_policy.mdx at v0.5.22, the v0.5.21 release notes, the SGLang HiCache post of 2025-09-10, the RBG and Mooncake post on the Alibaba Cloud blog of 2026-03-10, issues #35129, #30760, and #42465, arXiv 2510.15152. capture/gpu/out-l4/server-working-set-hicache.log, capture/gpu/out-l4/server-working-set-default.log, capture/gpu/summary/l4.json. capture/gpu/summary/gb10.json. capture/gpu/out-gb10/server-working-set-default.log.
