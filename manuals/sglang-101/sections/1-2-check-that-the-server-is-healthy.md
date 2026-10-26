# 检查服务是否健康

> 收到真实流量前，先确认服务有响应、模型可以生成 token，并检查服务实际分配的显存是否符合预期。

日志里的 ready 行只表示服务启动。它不能证明服务适合承接你的流量。显存池过小或模型无法生成 token 时，同样会打印这行。

读完本节，你能为脚本或探针选择合适的健康检查端点，也能看懂用于规划显存的三行启动日志、预热服务并读取首批指标。

## 等待 `/health` 返回 200 {#s-check-that-the-server-is-healthy-wait-until-health-returns-200}

在脚本中，可以持续请求 `/health`，直到收到 200：

```bash
until curl -sf -o /dev/null http://127.0.0.1:30000/health; do sleep 2; done
```

捕获套件也每隔 2 秒执行一次检查。服务启动期间，日志记录了状态从 503 变为 200：

```listing
title: 我们的 L4 服务启动时的 /health 日志
source: capture/gpu/out-l4/server-default.log
lang: text
note: 取自日志第 36 至 43 行；省略 /model_info 请求和前两行 prefill 日志。
---
[2026-10-17 14:43:37] INFO:     127.0.0.1:58250 - "GET /health HTTP/1.1" 503 Service Unavailable
…
[2026-10-17 14:43:38] INFO:     127.0.0.1:58272 - "POST /generate HTTP/1.1" 200 OK
[2026-10-17 14:43:38] INFO:     127.0.0.1:58288 - "POST /freeze_gc HTTP/1.1" 200 OK
[2026-10-17 14:43:38] The server is fired up and ready to roll!
[2026-10-17 14:43:40] Prefill batch, #new-seq: 1, #new-token: 1, #cached-token: 0, token usage: 0.00, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 0.58
[2026-10-17 14:43:40] INFO:     127.0.0.1:58298 - "GET /health HTTP/1.1" 200 OK
```

注意 200 行前的日志。调度器为健康检查运行了一次只含一个 token 的 prefill。默认的 `/health` 会把请求交给模型并等待结果，并非只报告进程状态。

## 按用途选择端点 {#s-check-that-the-server-is-healthy-choose-the-endpoint-for-the-job}

SGLang 提供三个健康检查端点 {{code}}。按你要确认的问题选择：

- **服务是否启动并已准备好接收请求？** 使用 `/ready`。Tokenizer manager 就绪后返回 200，不会向模型发送请求。
- **现在能否生成一个 token？** 使用 `/health_generate`。它会发送一个 token 请求；20 秒内没有结果时返回 503。
- **`/health`** 与 `/health_generate` 共用处理器。默认设置下它也会生成一个 token。

启动脚本可以用任一端点等待。但在 Kubernetes 探针中，选择会影响高负载下的行为。会生成 token 的探针和用户请求一起排队。[第 7.1 节](#s-operating-sglang)给出推荐配置和相关事故。

## 查看三行启动日志 {#s-check-that-the-server-is-healthy-read-the-three-startup-lines}

启动日志中的三行会告诉你服务能容纳多少内容。SGLang 会自动计算这些值，每次启动都要检查：

```listing
title: 我们的 L4 服务容量信息
source: capture/gpu/out-l4/server-default.log
lang: text
note: 摘录启动日志中的三行；省略其间内容。
---
[2026-10-17 14:42:45] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 22939, K size: 1.58 GB, V size: 1.58 GB
…
[2026-10-17 14:43:36] max_total_num_tokens=22939, chunked_prefill_size=4096, max_prefill_tokens=16384, max_running_requests=2048, context_len=40960, available_gpu_mem=1.31 GB
…
[2026-10-17 14:43:36] Tree cache initialized: source=default impl=UnifiedRadixCache hybrid_swa=False hybrid_ssm=False hicache_attached=False
```

**KV 池：** 用于保存服务器保留的所有请求 token 的 key 和 value 的 GPU 显存。我们的池能容纳 22,939 个 token。

将它和 `context_len=40960` 比较。单个请求就可能长过整个显存池；一条长请求便能占满它。23 个用户各有 1,000 个 token 时，也会占满。

`max_running_requests=2048` 表示调度器最多同时运行多少请求。该值由服务计算得出，我们没有手动设置。池容量会远早于 2,048 个请求成为实际限制。

最后一行说明使用哪种前缀缓存。默认的 `UnifiedRadixCache` 是基数缓存；`hicache_attached=False` 表示 HiCache 未开启。要了解何时启用它，请看[第 3.5 节](#s-eviction-policies-and-hicache)。

如果池比流量所需的容量小，先到[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool)计算显存需求，再到[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)调整池大小。

## 测量前预热 {#s-check-that-the-server-is-healthy-warm-up-the-server-before-you-measure}

本节开头的日志在 ready 行前出现了 `POST /generate` 和 `POST /freeze_gc`。服务先向自己发送一个请求，然后冻结 Python 垃圾回收器，避免持续扫描启动时创建的对象。

这项设置来自一次事故。一份 LinkedIn 工程报告在小型排序模型上发现，垃圾回收每隔几秒就会暂停 100 到 300 毫秒 {{field LinkedIn 2026-02}}。修复方法是先预热服务，再冻结垃圾回收器；相关改动已合入 pull request 9241。

预热无法保证每台机器上的首个请求都很快。在我们的 L4 上，启动后的首个请求花了 68 毫秒才得到第一个 token；在 Mac 上，同类请求用了 889 毫秒。测量前先发送几个自己的请求。

## 查看首批指标 {#s-check-that-the-server-is-healthy-check-the-first-metrics}

使用 `--enable-metrics` 启动的服务会在 `/metrics` 提供 Prometheus 指标。现在查看下面四项，并留好这条命令供后续使用：

```bash
curl -s http://127.0.0.1:30000/metrics | grep -E '^sglang:(num_running_reqs|num_queue_reqs|token_usage|cache_hit_rate)\{'
```

```listing
title: 我们的 L4 基准运行后的四项指标
source: capture/gpu/out-l4/metrics.txt
lang: text
note: 默认服务的基准运行结束后，从 /metrics 截取四行。
---
sglang:num_running_reqs{engine_type="unified",model_name="Qwen/Qwen3-8B",moe_ep_rank="0",pp_rank="0",tp_rank="0"} 0.0
sglang:num_queue_reqs{engine_type="unified",model_name="Qwen/Qwen3-8B",moe_ep_rank="0",pp_rank="0",tp_rank="0"} 0.0
sglang:cache_hit_rate{engine_type="unified",model_name="Qwen/Qwen3-8B",moe_ep_rank="0",pp_rank="0",tp_rank="0"} 0.956268221574344
sglang:token_usage{engine_type="unified",model_name="Qwen/Qwen3-8B",moe_ep_rank="0",pp_rank="0",tp_rank="0"} 0.0
```

- `num_running_reqs` 与 `num_queue_reqs` 分别统计正在运行和正在排队的请求。
- `token_usage` 表示 KV 池的使用比例，范围为 0 到 1。
- `cache_hit_rate` 表示命中前缀缓存的 prompt token 比例。

这里的命中率为 0.956，因为基准发送了很多共享前缀的 prompt。空闲服务上的四项指标都接近 0。

指标端点默认关闭。如果命令没有输出，重新启动时加上 `--enable-metrics`。[第 5.2 节](#s-the-metrics-endpoint)列出了需要配置告警的指标。

```takeaways
- 用 /ready 等待服务启动，用 /health_generate 确认模型可以生成。
- 每次启动都检查 KV 池、max_running_requests 和 tree cache 日志。
- 发送预热请求后再做测量。
- 查看 num_queue_reqs 和 token_usage，再判断回答变慢的原因。
```

来源： capture/gpu/out-l4/server-default.log, capture/gpu/out-l4/metrics.txt, capture/gpu/out-l4/generate.txt, capture/gpu/run.py, capture/out/generate.txt; python/sglang/srt/entrypoints/http_server.py (health, health_generate, ready, _execute_server_warmup, _freeze_gc_after_server_warmup)，v0.5.22; LinkedIn Engineering, "Scaling LLM-based ranking systems with SGLang at LinkedIn" (https://www.linkedin.com/blog/engineering/ai/scaling-llm-based-ranking-systems-with-sglang-at-linkedin, 2026-02-20); PR 9241 (https://github.com/sgl-project/sglang/pull/9241).
