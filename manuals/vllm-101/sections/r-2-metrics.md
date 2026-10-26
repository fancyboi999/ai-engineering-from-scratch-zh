# 指标

> 本节列出手册使用的 vLLM 指标，以及引用它们的章节。

可在此查找某一节提到的指标。

vLLM 以 Prometheus 格式在 `/metrics` 导出指标，所有名称都以 `vllm:` 开头。

本节表格中的每个 counter 在 `/metrics` 中都会带 `_total` 后缀。

## 负载与内存 {#s-ref-metrics-load-and-memory}

| Metric | 类型 | 统计内容 | 详见 |
|---|---|---|---|
| `vllm:num_requests_running` | gauge | engine 当前正在处理的请求数 | [健康检查](#s-check-that-the-server-is-healthy) |
| `vllm:num_requests_waiting` | gauge | 队列中的请求数 | [健康检查](#s-check-that-the-server-is-healthy) |
| `vllm:kv_cache_usage_perc` | gauge | KV cache 使用比例，范围为 0 到 1 | [健康检查](#s-check-that-the-server-is-healthy) |
| `vllm:num_preemptions_total` | counter | 为释放 block 而停止的请求数 | [故障排查](#s-troubleshoot-by-symptom) |

## 延迟 {#s-ref-metrics-latency}

| Metric | 类型 | 统计内容 |
|---|---|---|
| `vllm:time_to_first_token_seconds` | histogram | 请求到达至发出首 token 的时间 |
| `vllm:inter_token_latency_seconds` | histogram | 单个请求两个 token 之间的时间 |
| `vllm:request_time_per_output_token_seconds` | histogram | 单个请求每个输出 token 的平均时间 |
| `vllm:request_queue_time_seconds` | histogram | 请求开始运行前在队列中等待的时间 |

## Cache 与 token {#s-ref-metrics-cache-and-tokens}

| Metric | 类型 | 统计内容 | 详见 |
|---|---|---|---|
| `vllm:prefix_cache_queries_total` | counter | 在 prefix cache 中查询的 prompt token 数 | [故障排查](#s-troubleshoot-by-symptom) |
| `vllm:prefix_cache_hits_total` | counter | 在 prefix cache 中命中的 prompt token 数 | [故障排查](#s-troubleshoot-by-symptom) |
| `vllm:prompt_tokens_total` | counter | 已处理的 prompt token 数 | |
| `vllm:generation_tokens_total` | counter | 已生成的输出 token 数 | |

## Speculative decoding {#s-ref-metrics-speculative-decoding}

| Metric | 类型 | 统计内容 | 详见 |
|---|---|---|---|
| `vllm:spec_decode_num_draft_tokens_total` | counter | proposer 猜测的 token 数 | [Speculative decoding](#s-how-speculative-decoding-checks-drafts) |
| `vllm:spec_decode_num_accepted_tokens_total` | counter | target model 保留的猜测 token 数 | [Speculative decoding](#s-how-speculative-decoding-checks-drafts) |

## 我们的运行记录包含什么 {#s-ref-metrics-what-our-runs-recorded}

我们的 benchmark client 为每个请求记录 TTFT、TPOT、ITL 和吞吐量。Sampler 每秒记录一次 GPU 时钟频率和温度。Sweep 期间没有抓取 `/metrics`。

Sources: vLLM documentation at v0.31.0 (docs/design/metrics.md), the vLLM source at v0.31.0 (vllm/v1/metrics/loggers.py).
