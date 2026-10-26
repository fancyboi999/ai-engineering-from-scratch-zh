# RadixCache

> RadixCache 在树中索引每段已缓存 token；新请求复用最长匹配前缀，只对其后 token 做 prefill。

聊天产品每次提问都发送相同的 2,000-token system prompt。没有前缀复用的服务每次都重算，用户为相同工作重复等待。上游 Mac 上，共享前缀基准关闭缓存耗时 129.7 秒，开启后只需 48.8 秒。

读完本节，你能解释树如何查找前缀、运行请求为何能保留前缀、淘汰如何移除缓存 token，以及哪些日志能证明命中。

## 相同负载，开启与关闭树

捕获工具两次运行 SGLang 自带共享前缀基准：四组各 16 个 prompt，每组共享 2,048-token system prompt，各自追加 128-token 问题。第二个服务器设置 `--disable-radix-cache`。

| 结果 | 基数缓存开启 | --disable-radix-cache |
|---|---|---|
| 基准时长 | 48.81 s | 129.68 s |
| TTFT 中位数 | 1,358 ms | 7,222 ms |
| P99 TTFT | 3,277 ms | 13,548 ms |
| 每秒输出 token | 83.91 | 31.59 |

上游实测总运行时间缩短为约 1/2.7，首 token 等待中位数缩短为约 1/5.3。调度日志说明了时间花在哪里。

```listing
title: 开启基数缓存的一批 prefill
source: capture/out/server-default.log
lang: text
note: 默认配置共享前缀基准的一行。
---
[2026-10-16 14:01:00] Prefill batch, #new-seq: 7, #new-token: 955, #cached-token: 15102, token usage: 0.05, #running-req: 1, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 1472.94
```

```listing
title: 关闭基数缓存的 prefill 批次
source: capture/out/server-no-radix-cache.log
lang: text
note: 同一基准设置 --disable-radix-cache 的连续三行。
---
[2026-10-16 14:02:34] Prefill batch, #new-seq: 3, #new-token: 4096, #cached-token: 0, token usage: 0.06, #running-req: 2, #queue-req: 3, #pending-token: 7883, cuda graph: False, input throughput (token/s): 2261.21
[2026-10-16 14:02:36] Prefill batch, #new-seq: 3, #new-token: 4096, #cached-token: 0, token usage: 0.08, #running-req: 4, #queue-req: 1, #pending-token: 3787, cuda graph: False, input throughput (token/s): 2245.89
[2026-10-16 14:02:38] Prefill batch, #new-seq: 2, #new-token: 3787, #cached-token: 0, token usage: 0.10, #running-req: 6, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 1626.02
```

有树时，七个新请求只需 955 个新 token，另有 15,102 个来自缓存。无树时，八个请求占满三个最多 4,096-token 的批次，全部从零计算。4,096 是[第 2.2 节](#s-the-scheduler-loop-and-schedule-policy)的 prefill 分块大小。

```figure
id: fig-3-3
kind: comparison
title: 一个基准，两种缓存设置
claim: 基数缓存将共享前缀基准从 129.7 缩短到 48.8 秒，首 token 中位数从 7,222 降至 1,358 ms。
caption: 每对条形从左向右读。相同 Mac、相同 64 prompt。来源：capture/out/bench-shared-prefix.txt 和 capture/out/no-radix-cache-bench-shared-prefix.txt。
```

## 24 GB L4 上的同一测试

Mac 的每次 prefill 都慢，因此上游在 NVIDIA L4 上用 `Qwen/Qwen3-8B` 重复测试。共享 system prompt 长度从 0 到 4,096 token。每次四组各 16 个 prompt，问题 128 token，输出 64 token，并发上限 8，每个长度三个种子。

```listing
title: L4 开启基数缓存的 prefill
source: capture/gpu/out-l4/server-prefix-default.log
lang: text
note: 共享 prompt 长 2,048 token 运行中的两行，删去时间戳。
---
… Prefill batch, #new-seq: 3, #new-token: 405, #cached-token: 12952, token usage: 0.58, #running-req: 1, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 1452.28
… Prefill batch, #new-seq: 4, #new-token: 546, #cached-token: 17269, token usage: 0.58, #running-req: 4, #queue-req: 0, #pending-token: 0, cuda graph: True, input throughput (token/s): 2532.09
```

```listing
title: L4 关闭基数缓存的 prefill
source: capture/gpu/out-l4/server-prefix-no-radix-cache.log
lang: text
note: 共享 prompt 长 4,096 token 运行中的两行，删去时间戳。
---
… Prefill batch, #new-seq: 2, #new-token: 4096, #cached-token: 0, token usage: 0.68, #running-req: 1, #queue-req: 0, #pending-token: 5527, cuda graph: True, input throughput (token/s): 1632.42
… Prefill batch, #new-seq: 2, #new-token: 4096, #cached-token: 0, token usage: 0.74, #running-req: 2, #queue-req: 0, #pending-token: 1431, cuda graph: True, input throughput (token/s): 1634.70
```

这次运行中，发生降频的 L4 prefill 约 1,600 token/s。每个 4,096-token 批次耗时约 2.5 秒，没有树时每个请求都要支付完整 prompt 成本。

```figure
id: fig-3-3c
kind: chart
title: 共享 prompt 越长，树节省越多
claim: L4 共享 4,096-token prompt 时，基数缓存把 TTFT 中位数从 14,706 降至 479 ms。
caption: TTFT 中位数对共享 prompt 长度，每点三个种子，对数刻度。绿色默认，玫红为 --disable-radix-cache。来源：capture/gpu/summary/l4.json。
```

| 共享 prompt | TTFT 中位数，开启 | TTFT 中位数，关闭 | 输出 tok/s，开启 | 输出 tok/s，关闭 |
|---|---|---|---|---|
| 0 | 349 ms | 379 ms | 113.56 | 113.33 |
| 1,024 | 462 ms | 2,202 ms | 105.76 | 70.15 |
| 4,096 | 479 ms | 14,706 ms | 88.87 | 20.80 |

开启缓存时，SM 时钟中位数为 1,440 MHz；关闭时为 930 MHz。关闭缓存的运行每个 seed 都低于我们 1,000 MHz 的时钟下限。

**我们实测**共享 4,096 token 时，等待中位数缩短约 30.7 倍，吞吐量增加约 4.3 倍。两组都应视为上限。关闭缓存的样本中 62% 带热降频标志，时钟低 35%。卡温较低时差距会缩小，但 35% 的时钟差解释不了 30 倍差距。没有共享 prompt 时，TTFT 中位数差 8%，仍在 seed 波动范围内，吞吐量相同。

使用 `Qwen/Qwen3-30B-A3B-Instruct-2507` 的 GB10 扫描也呈现差异，但小于 L4。共享 4,096 token 时，开启缓存的 TTFT 中位数为 589 ms，关闭为 5,208 ms，相差 8.8 倍。输出吞吐量分别为 120.66 和 49.73 tok/s。两次运行相隔一天。关闭缓存时 SM 时钟中位数为 2,376 MHz，37% 样本带降频标志；开启缓存时为 2,496 MHz。

我们的假设是 GB10 上的 prefill 更便宜。Qwen3-30B-A3B 每 token 约激活 30 亿参数，因此重算重复 prompt 的成本较低。RadixCache 会省下重复 prefill；prefill 越便宜，缓存省下的成本就越小。两个干扰因素仍存在：L4 关闭缓存时的降频放大了差异；GB10 两次运行相隔一天，时钟状态也不同。

## 树

**RadixCache：** token 序列上的基数树，节点保存对应边上 token 的 KV 槽位索引。设计来自 SGLang 论文，其机制称 RadixAttention {{paper}}。边保存一段 token，因此一个节点可容纳整份 system prompt。

**TreeNode：** 树节点，保存以首 token 为键的子节点，以及自身边上的 token 段 {{code}}。它还保存 KV 槽位索引、锁计数、最后访问时间与命中次数。

四种操作完成全部工作。

1. **match_prefix** 从根按首 token 匹配子节点。若匹配在边中间结束，就拆分节点，让边界精确。路径上每个节点更新时间。
2. **insert** 同样遍历，为未匹配 token 添加叶子。其他请求若已插入相同 token，SGLang 释放重复槽位，让请求指向树内副本。
3. **inc_lock_ref** 与 **dec_lock_ref** 统计使用节点的运行请求。计数大于零就保护通向根的整条路径。
4. **evict** 释放无请求锁定的叶子，最老优先；叶子消失后沿分支向上处理。

一条规则容易让人意外：匹配最多覆盖 prompt 长度减一 {{code}}。最后一个 prompt token 总要经过 prefill，因为模型需要它的 logits 采样首输出 token。缓存实验印证了该规则：2,999-token prompt 报告 2,998 个缓存 token、1 个新 token。

```figure
id: fig-3-3b
kind: tree
title: 共享前缀基准的两组存入一棵树
claim: 两个运行请求共享 system prompt 节点，树在问题开头精确拆分。
caption: 从根向下读。节点数字为第 1 组两请求运行时的锁计数。机制来自 v0.5.22 RadixCache，token 数来自 capture/out/bench-shared-prefix.txt 的基准设置。
```

## v0.5.22 使用哪种树

旧博客和 issue 中的类名是 `RadixCache`。v0.5.22 默认 `UnifiedRadixCache`，同一棵树也处理滑动窗口与 Mamba 状态 {{code}}。自 v0.5.21 起，树遍历默认使用 Rust 核心。Mac 日志显示例外：

```listing
title: 捕获 Mac 上的树
source: capture/out/server-default.log
lang: text
note: 默认配置启动日志三行。
---
[2026-10-16 13:58:06] Using the Python TreeCore: the Rust TreeCore supports Linux only
[2026-10-16 13:58:06] Init Unified Radix Cache. Components: (<ComponentType.FULL: 0>,). Tree Core: UnifiedTreeCore
[2026-10-16 13:58:06] Tree cache initialized: source=default impl=UnifiedRadixCache hybrid_swa=False hybrid_ssm=False hicache_attached=False
```

关闭缓存的服务器输出相同三行。`--disable-radix-cache` 仍构造 `UnifiedRadixCache`，但以不匹配也不插入的禁用模式运行。旧文章中的独立 `ChunkCache` 类已在 2026-10-08 删除 {{issue #43201}}。

## 调度器如何使用树

默认 `--schedule-policy` 为先到先服务的 `fcfs` {{code}}。论文的最长前缀匹配顺序 `lpm` 需要主动选择。只有等待请求不超过 128 时，代码才按前缀长度排序，因为逐个匹配有时间成本 {{code}}。超过后，`lpm` 使用 FCFS。

调度器也避免单轮内浪费：多个等待请求共享尚未缓存的前缀时，先让一个完成共享部分 prefill，其余下轮复用。策略细节见[第 2.2 节](#s-the-scheduler-loop-and-schedule-policy)。

## 本手册的建议：保持基数缓存开启

我们在 L4 和 GB10 上测得，没有共享 prompt 时缓存成本低于可测范围。我们没有测试频繁淘汰时的成本。缓存 token 与运行请求共用同一池，淘汰会按需释放。只有在排查错误答案是否来自复用 KV 时才考虑关闭缓存。即便如此，也先试 `--kv-canary log`，它能在缓存保持开启时检查槽位损坏 {{code}}。

每添加其他功能，都应连同命中率一起测量。Issue #32459 是警示 {{issue #32459}}。团队回放多轮 agent 流量时，不开推测解码深层 prompt 命中率为 97%，开启 EAGLE 后只有 40至53%；输入吞吐量从 43,981 降到 12,881 token/s，日志无错误。待确认解释是推测解码额外预留 KV，迫使树淘汰缓存 prompt。

实践报告也让传说回归尺度。vLLM 同样复用前缀，引擎比较其实是比较两个缓存。一份 A10G 上 16 模型的独立测试发现 SGLang 在重复前缀占优 {{field Varad More 2026-04}}，7B至9B 模型首 token 收益为 20至40 ms。RunPod 用缓存 7,000-token 上下文的 70B 模型测得每流 35.0 对 32.8 token/s {{field RunPod 2025-06}}。SGLang 论文报告最高 6.4 倍吞吐量 {{paper}}，那是作者相对 2024 年系统的最佳情形。

```takeaways
- 保持基数缓存开启，仅隔离 KV bug 时关闭。
- 共享 prompt 越长，预期收益越大。
- 从 prefill 行读 #cached-token 与 #new-token 证明命中。
- 即使全部命中，最后一个 prompt token 仍要 prefill。
- 只有共享前缀、短队列的离线批次才选择 lpm。
- 添加推测解码后重新测命中率。
```

Sources: python/sglang/srt/mem_cache/radix_cache.py (TreeNode, match_prefix, insert, evict, inc_lock_ref), python/sglang/srt/mem_cache/unified_radix_cache.py, python/sglang/srt/mem_cache/unified_cache/tree_core_registry.py, python/sglang/srt/mem_cache/registry.py, python/sglang/srt/managers/schedule_batch.py (_compute_max_prefix_len), python/sglang/srt/managers/schedule_policy.py, python/sglang/srt/arg_groups/fields/schedule.py at v0.5.22, capture/out/bench-shared-prefix.txt, capture/out/no-radix-cache-bench-shared-prefix.txt, capture/out/server-default.log, capture/out/server-no-radix-cache.log, capture/out/cache-experiment.txt, the SGLang paper (arXiv 2312.07104), issues #32459 and #43201, the RunPod report of 2025-06-15, the Varad More benchmark of 2026-04-22. capture/gpu/out-l4/server-prefix-default.log, capture/gpu/out-l4/server-prefix-no-radix-cache.log, capture/gpu/summary/l4.json. capture/gpu/summary/gb10.json.
