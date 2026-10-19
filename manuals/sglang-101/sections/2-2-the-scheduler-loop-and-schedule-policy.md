# 调度循环与 --schedule-policy

> 调度器每隔几毫秒回答一次“GPU 下一步计算哪些 token”；v0.5.22 默认先到先服务。

八个用户同一秒发送 prompt。一个粘贴 4,000-token 文档，其余各输入一句。先处理长的还是短的？与昨天流量共享 system prompt 的请求能否插队？每一步都得有人决定，在 SGLang 中就是调度循环。

读完本节，你能解读 `Prefill batch` 和 `Decode batch` 日志，说出排序等待队列的策略，并判断是否需要修改。

## 排错顺序的代价

不论计算一个还是八个请求的 token，GPU 单步成本差不多，因此调度器希望批次大。排队用户什么也看不到，因此调度器又希望队列短。每种策略都在权衡这两类成本。

直观修法是聪明排序，例如先运行缓存前缀最多的请求。SGLang 论文提出的正是最长前缀匹配，并证明它对离线批次最优 {{paper}}。但在线流量不是离线批次，聪明排序每一步都要花 CPU 时间。

## 循环的一轮

**调度循环：** scheduler 进程中持续运行的函数。每轮接收新请求、选下一批、在 GPU 运行，再处理结果。

一轮按顺序做四件事 {{code}}：

1. **接收。** 从 ZMQ socket 取尽新请求，加入等待队列。
2. **选择。** 若上批是 prefill，将其合入正在运行的 decode 批次。随后尝试从等待队列创建新 prefill 批次；能创建就运行，否则为每个运行中请求执行一步 decode。
3. **运行。** 从 `ScheduleBatch` 构造 `ForwardBatch` 并运行模型。
4. **处理。** 追加采样 token、检查停止条件、释放或缓存已完成请求的 KV，将结果发送到 detokenizer。

请求先进入 prefill 批次，可能跨多个块，再加入长期存在的 decode 批次直到结束。只要能准入新请求，就优先 prefill。该规则压低 TTFT，[第 2.3 节](#s-admission-and-retraction)解释决定“能准入”的预算检查。

```figure
id: fig-2-2
kind: flow
title: 调度循环的一轮
claim: 每轮接收请求，按策略排序，准入预算能容纳的请求，再运行一个 prefill 批次或一步 decode。
caption: 自上而下读。琥珀色框为调度阶段，绿框为 KV 预算检查，梅紫色框为 GPU 工作。函数名来自 v0.5.22 scheduler。
```

## 两种日志

每个 prefill 批次输出一行。Decode 默认每 40 步输出一行，由 `--decode-log-interval` 控制 {{code}}。这些是服务最有用的日志。下面是并发 8 的基准中连续三行。

```listing
title: 八个请求、两个 prefill 批次、一个 decode 批次
source: capture/out/server-default.log
lang: text
note: 并发 8 基准中的连续三行。
---
[2026-10-16 13:59:07] Prefill batch, #new-seq: 1, #new-token: 511, #cached-token: 1, token usage: 0.00, #running-req: 0, #queue-req: 7, #pending-token: 0, cuda graph: False, input throughput (token/s): 155.03
[2026-10-16 13:59:09] Prefill batch, #new-seq: 7, #new-token: 3553, #cached-token: 2, token usage: 0.02, #running-req: 1, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 1914.13
[2026-10-16 13:59:09] Decode batch, #running-req: 8, #token: 4075, token usage: 0.02, cuda graph: False, gen throughput (token/s): 98.37, #queue-req: 0
```

字段含义：

- `#new-seq` 为本次 prefill 准入的请求数，`#new-token` 为实际计算的 prompt token 数，`#cached-token` 为从基数缓存复用的数量。
- `token usage` 为 KV 池占用比例。这里池很大，占用接近零。
- `#running-req` 统计正在 decode 的请求，`#queue-req` 统计等待请求。
- Mac 上 `cuda graph: False` 符合预期。CUDA 上为 `True` 表示 decode 重放了已捕获计算图，其意义见[第 4.1 节](#s-forwardmode-and-cuda-graphs)。

首行准入一个请求，另外七个等待。下一次 prefill 同时准入剩余七个，一步计算 3,553 个新 token，速度 1,914 token/s。随后八个请求作为同一批次 decode。吞吐量来自 prefill 批处理，日志展示了过程。

## 策略

**调度策略：** 准入前排序等待队列的规则，通过 `--schedule-policy` 设置。

v0.5.22 默认为 `fcfs` {{code}}，选项分两组。

| 分组 | 策略 | 使用的信息 |
|---|---|---|
| 感知缓存 | `lpm`, `dfs-weight`, `hrrn`, `shortest-prefill-first` | 基数树：每个 prompt 已缓存多少 |
| 不感知缓存 | `fcfs`, `lof`, `random`, `routing-key`, `priority` | 到达顺序、输出长度、路由键或优先级 |

很多读者以为默认是论文中的 `lpm`。它在 v0.4.3 是默认值，到 v0.4.6 已变为 `fcfs`。本手册研究未找到修改它的 PR。

代码中的两条规则限制了感知缓存的策略 {{code}}：

- 等待队列超过 128 个请求时，该轮 `lpm` 和 `hrrn` 改为 FCFS。注释解释：队列大时关闭昂贵的前缀匹配与排序。
- 基数缓存关闭时，所有感知缓存策略都退化为 FCFS。

因此 `lpm` 只在较窄范围内有益：队列足够长，值得重排；又低于 128；并且包含大量共享前缀。

## 长 prompt 下的分块大小

**分块 prefill：** 将长 prompt 切为不超过 `--chunked-prefill-size` token 的片段，每个 prefill 批次处理一片。默认值取决于 GPU 内存，见[第 4.1 节](#s-forwardmode-and-cuda-graphs)表格：22 GB L4 为 4,096，GB10 为 8,192。

常见建议是缩小块，让长 prompt 的片段之间更频繁地执行 decode。上游测试了该建议：每次发送 48 个长度 1,024至4,096 token 的 prompt，输出 256 token；到达服从每秒 0.5、1 或 2 次的泊松过程，使用三个种子。

| GPU、模型 | 分块 | 每秒请求数 | 输出 tok/s | TTFT 中位数 | P99 ITL | SM 时钟中位数 |
|---|---|---|---|---|---|---|
| GB10, Qwen3-30B-A3B | 8,192，默认 | 0.5 | 70.1 | 892 ms | 929 ms | 2,411 MHz |
| GB10, Qwen3-30B-A3B | 1,024 | 0.5 | 68.1 | 1,253 ms | 1,977 ms | 2,398 MHz |
| GB10, Qwen3-30B-A3B | 8,192，默认 | 2 | 129.3 | 269 ms | 312 ms | 2,411 MHz |
| GB10, Qwen3-30B-A3B | 1,024 | 2 | 130.1 | 256 ms | 260 ms | 2,411 MHz |
| L4, Qwen3-8B | 4,096，默认 | 0.5 | 44.1 | 36.0 s | 2,579 ms | 773 MHz |
| L4, Qwen3-8B | 1,024 | 0.5 | 43.3 | 37.4 s | 2,922 ms | 690 MHz |
| L4, Qwen3-8B | 4,096，默认 | 2 | 46.2 | 59.8 s | 2,512 ms | 915 MHz |
| L4, Qwen3-8B | 1,024 | 2 | 44.0 | 62.5 s | 2,930 ms | 825 MHz |

**上游实测**在两台机器都没发现小块的收益。GB10 比较了默认值、显式 8,192 与 1,024。每秒 1、2 请求时三者都落在彼此种子波动范围内。每秒 0.5 请求时，1,024 更差：P99 ITL 为 1,977 ms，对照为 929 ms，种子范围没有重叠。

L4 在所有速率下都无法承受该负载。输出维持约 44 token/s，首 token 中位数耗时 36至62 秒。这次扫描没有设置时钟下限，卡温很高，中位时钟为 690至915 MHz。不论哪种分块，最差 token 间隔都为 2.5至2.9 秒。

本节开头的调度规则能解释 L4 结果：只要能准入就优先 prefill。队列满时，小块会在 decode 之前增加更多 prefill 轮次，流仍在等待。

`--enable-mixed-chunk` 将 decode token 放进 prefill 批次，使 decode 不必等一个 prefill 轮次。上游在同一会话中用 L4 与新的默认配置记录比较，中位时钟为 953至1,095 MHz。

| 每秒请求数 | 输出 tok/s，默认 / mixed chunk | P99 ITL，默认 / mixed chunk |
|---|---|---|
| 0.5 | 46.5 / 46.5 | 2,521 / 2,406 ms |
| 1 | 46.6 / 47.5 | 2,491 / 2,289 ms |
| 2 | 47.3 / 47.6 | 2,572 / 2,418 ms |

Mixed chunk 将 P99 ITL 的中位数降低 5至8%，但各速率下种子范围均重叠。最差 token 间隔仍超过 2.2 秒。显卡跟不上 prompt 时，两种参数都无法让输出平滑。需要增加 prefill 容量，或减少每秒长 prompt 数。

```listing
title: 未能启动的更大分块
source: capture/gpu/incidents/l4-chunk-8192-prefill-graph-oom.txt
lang: text
note: L4 上的 SGLang 0.5.22，设置 --chunked-prefill-size 8192。末行错误指向 PyTorch，原因在上方两行。
---
[2026-10-18 07:27:15] Memory pool end. avail mem=2.90 GB
Capturing prefill shape (num_tokens=8192 avail_mem=2.33 GB)
torch.AcceleratorError: CUDA error: out of memory
[2026-10-18 07:28:44] RuntimeError: num_active_captures_ > 0 INTERNAL ASSERT FAILED at "/__w/pytorch/pytorch/c10/cuda/CUDACachingAllocator.cpp":3209, please report a bug to PyTorch. markCaptureEnd called with no captures in progress
```

另一方向在 L4 启动时失败。块大小为 8,192 时，KV 池仍占用原来的 24,094 token，但 8,192-token prefill graph 所需内存超过剩余 2.33 GB。日志末行是要求提交 bug 的 PyTorch 断言，真正错误是上方的内存耗尽。

## 本手册的建议

保留 `fcfs`。它公平，不在热路径做前缀匹配，基数缓存仍能提供命中。先到的共享前缀已在树中，后续请求无论以何种顺序都能匹配。

仅在三个条件同时满足时改用 `lpm`：流量共享长前缀；队列经常有几个到 128 个请求；已用 `/metrics` 测量切换前后缓存命中率。[第 5.2 节](#s-the-metrics-endpoint)说明应比较的 `cache_hit_rate` 序列。

若需要用户分层，用 `--enable-priority-scheduling`，而不是缓存策略。新请求的优先级超过运行请求至少 `--priority-scheduling-preemption-threshold` 时可抢占，阈值默认为 10 {{code}}。

## 事故：设置的限制不等于实际限制

一位用户部署混合 Mamba 模型并设置 `--max-running-requests 8` {{issue #36889}}。服务器接受并报告 8，但吞吐量仍在 2 个流时封顶。只有一条 info 日志说明，Mamba 状态缓存把 `max_running_requests` 限到 2。

调度循环同时检查所有限制，最小者决定结果。报告者增加 Mamba 缓存，用 bf16 状态、`--max-mamba-cache-size 40` 和 `--mem-fraction-static 0.90`，在并发 12 时提升 75% 吞吐量。v0.5.22 会对这种限制发出 warning。应从日志读取循环实际使用的上限，而不是只看输入值。

```takeaways
- 通过 Prefill batch 和 Decode batch 行观察准入、缓存与排队。
- 没有测得 lpm 的缓存收益就保留默认 fcfs。
- 等待请求超过 128 时，lpm 会改用 FCFS。
- 设置限制后从日志核对实际生效值。
- 缩小 prefill 块前先测 P99 ITL，上游实验没有收益。
- 块大于 GPU 默认值时，启动需要更多空闲内存。
```

Sources: python/sglang/srt/managers/scheduler.py (run_event_loop, event_loop_normal, get_next_batch_to_run, run_batch, process_batch_result), python/sglang/srt/managers/schedule_policy.py (CacheAwarePolicy, CacheAgnosticPolicy, WAITING_QUEUE_PREFIX_MATCH_MAX, _determine_active_policy, _validate_and_adjust_policy), python/sglang/srt/arg_groups/fields/schedule.py at v0.5.22; SGLang paper, arXiv 2312.07104; capture/out/server-default.log; issue https://github.com/sgl-project/sglang/issues/36889; capture/gpu/summary/gb10.json and capture/gpu/summary/l4.json (mixed); capture/gpu/sweep.py (mixed sweep); capture/gpu/incidents/l4-chunk-8192-prefill-graph-oom.txt.
