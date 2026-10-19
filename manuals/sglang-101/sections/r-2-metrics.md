# 指标

> 本表列出手册读取的 Prometheus 序列、测量内容，以及它们回答的生产问题。

`--enable-metrics` 开启 `/metrics`。默认关闭，未设置时端点不存在。上游默认服务导出 81 个以 `sglang:` 开头的指标族（capture/out/metrics.txt）。[第 5.2 节](#s-the-metrics-endpoint)说明哪些应报警，此表保留手册使用的指标。

## 延迟

| 序列 | 类型 | 测量内容 | 回答的问题 |
|---|---|---|---|
| `sglang:time_to_first_token_seconds` | histogram | 到达至首输出 token 的时间 | 用户看到内容前是否等待 |
| `sglang:inter_token_latency_seconds` | histogram | 两个输出 token 间的时间 | 流式输出是否卡顿 |
| `sglang:request_time_per_output_token_seconds` | histogram | 每请求 decode 时间除以首 token 之后的输出 token 数 | 各用户的 decode 是否慢 |
| `sglang:e2e_request_latency_seconds` | histogram | 到达至最后 token 的时间 | 完整答案耗时多久 |
| `sglang:queue_time_seconds` | histogram | 首次 prefill 前排队时间 | 调度器是否推迟请求 |

## 负载与内存

| 序列 | 类型 | 测量内容 | 回答的问题 |
|---|---|---|---|
| `sglang:num_running_reqs` | gauge | 运行批次中的请求数 | 当前 GPU 工作量 |
| `sglang:num_queue_reqs` | gauge | 等待队列请求数 | 准入是否为瓶颈 |
| `sglang:token_usage` | gauge | 已用池槽位比例 | 池距离满载多近 |
| `sglang:num_retracted_reqs` | gauge | 被调度器移回队列的请求数 | 准入预测是否失误 |
| `sglang:max_total_num_tokens` | gauge | KV 池 token 容量 | 启动计算决定了什么 |
| `sglang:kv_cache_memory_usage_gb` | gauge | KV 池占用内存 | 缓存占多少内存 |
| `sglang:gen_throughput` | gauge | 上一时间段的每秒输出 token | 服务是否在生成 token |
| `sglang:scheduler_idle_seconds_total` | counter | 无可运行或排队任务的时间 | 服务是否利用不足 |

## 缓存与 token

| 序列 | 类型 | 测量内容 | 回答的问题 |
|---|---|---|---|
| `sglang:cache_hit_rate` | gauge | 前缀缓存命中率 | Prompt 是否复用缓存 |
| `sglang:cached_tokens_total` | counter | 按 device、host、storage 来源区分的缓存 prompt token | 哪层缓存提供命中 |
| `sglang:prompt_tokens_total` | counter | 已处理的 prefill token | 到达了多少 prompt 工作 |
| `sglang:uncached_prompt_tokens_histogram` | histogram | 需要计算的 prompt token | 新增了多少 prompt 工作 |
| `sglang:generation_tokens_total` | counter | 已生成的输出 token | 完成多少 decode 工作 |
| `sglang:num_requests_total` | counter | 已完成请求 | 服务了多少请求 |
| `sglang:num_paused_reqs` | gauge | 因权重更新暂停的请求 | RL 训练器是否暂停服务 |

## 上游运行记录

共享前缀基准后，默认服务器的 `sglang:cache_hit_rate` 为 0.94，`--disable-radix-cache` 服务器对同一基准报告 0.0（capture/out/metrics.txt、no-radix-cache-metrics.txt）。默认服务器统计 286,102 个 prompt token，其中 182,079 个来自缓存。每组标签各有一份 counter，因此先对行求和，再做除法。

Sources: python/sglang/srt/observability/ at v0.5.22; capture/out/metrics.txt, no-radix-cache-metrics.txt, small-pool-metrics.txt.
