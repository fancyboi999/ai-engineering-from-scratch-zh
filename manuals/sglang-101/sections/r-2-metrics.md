# 指标

> 本表列出手册读取的 Prometheus 序列、各序列的测量对象，以及它在生产中回答的问题。

`--enable-metrics` 开启 `/metrics`。默认关闭，不加参数就没有该端点。默认服务器导出 81 个以 `sglang:` 开头的指标族（[指标捕获](manuals/sglang-101/capture/out/metrics.txt)）。[第 5.2 节](#s-the-metrics-endpoint)解释哪些指标需要告警，本表保留手册用到的指标。

## 延迟 {#s-ref-metrics-latency}

| 序列 | 类型 | 测量对象 | 回答的问题 |
|---|---|---|---|
| `sglang:time_to_first_token_seconds` | histogram | 从请求到达到首个输出 token 的时间 | 用户在看到输出前是否等待太久 |
| `sglang:inter_token_latency_seconds` | histogram | 两个输出 token 之间的时间 | 输出流是否卡顿 |
| `sglang:request_time_per_output_token_seconds` | histogram | 每个请求的 decode 时间除以首个 token 之后的输出 token 数 | 各用户的 decode 是否缓慢 |
| `sglang:e2e_request_latency_seconds` | histogram | 从请求到达到最后 token 的时间 | 完整回答需要多久 |
| `sglang:queue_time_seconds` | histogram | 请求首次 prefill 前的等待时间 | 调度器是否让请求排队 |

## 负载与内存 {#s-ref-metrics-load-and-memory}

| 序列 | 类型 | 测量对象 | 回答的问题 |
|---|---|---|---|
| `sglang:num_running_reqs` | gauge | 运行 batch 中的请求数 | GPU 当前处理多少工作 |
| `sglang:num_queue_reqs` | gauge | 等待队列中的请求数 | 准入是否成为瓶颈 |
| `sglang:token_usage` | gauge | 池槽位的使用比例 | 池距离填满还有多远 |
| `sglang:num_retracted_reqs` | gauge | 上个日志间隔内，调度器退回队列的请求数 | 准入预测刚才是否失败 |
| `sglang:num_retracted_requests_total` | counter | 启动以来调度器退回队列的请求数 | 准入预测多常失败 |
| `sglang:max_total_num_tokens` | gauge | KV 池的 token 容量 | 启动时确定了多大的池 |
| `sglang:kv_cache_memory_usage_gb` | gauge | KV 池占用的内存 | 缓存占有多少内存 |
| `sglang:gen_throughput` | gauge | 上个间隔每秒输出 token 数 | 服务器是否在生成 token |
| `sglang:scheduler_idle_seconds_total` | counter | 没有可运行或排队工作的时间 | 服务器是否未充分利用 |

## 缓存与 token {#s-ref-metrics-cache-and-tokens}

| 序列 | 类型 | 测量对象 | 回答的问题 |
|---|---|---|---|
| `sglang:cache_hit_rate` | gauge | 前缀缓存命中率 | prompt 是否复用缓存 |
| `sglang:cached_tokens_total` | counter | 按 device、host 或 storage 来源划分的缓存 prompt token | 哪层缓存提供命中 |
| `sglang:prompt_tokens_total` | counter | 已处理的 prefill token | 到达了多少 prompt 工作 |
| `sglang:uncached_prompt_tokens_histogram` | histogram | 需要计算的 prompt token | 多少 prompt 工作是新的 |
| `sglang:generation_tokens_total` | counter | 已生成的输出 token | 完成了多少 decode 工作 |
| `sglang:num_requests_total` | counter | 已完成请求 | 服务了多少请求 |
| `sglang:num_paused_reqs` | gauge | 因权重更新暂停的请求 | RL 训练器是否在暂停服务器 |

## 捕获记录中的值 {#s-ref-metrics-what-our-runs-recorded}

共享前缀基准之后，[默认服务器](manuals/sglang-101/capture/out/metrics.txt)报告 `sglang:cache_hit_rate` 为 0.94。[开启 `--disable-radix-cache` 的服务器](manuals/sglang-101/capture/out/no-radix-cache-metrics.txt)在相同基准下为 0.0。该 gauge 覆盖近期窗口。

counter 覆盖服务器整个生命周期，两台服务器在抓取前运行的基准集合不同。默认服务器共计 286,134 个 prompt token，即 286,102 个流式 token 加 32 个。其中 182,079 来自缓存，生命周期比率为 0.64。每组标签各有一行 counter，先将各行求和，再相除。

来源：v0.5.22 的 python/sglang/srt/observability/；capture/out/metrics.txt、no-radix-cache-metrics.txt、small-pool-metrics.txt。
