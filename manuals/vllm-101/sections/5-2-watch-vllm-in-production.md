# 在生产环境监控 vLLM

> 五个指标就能在大多数问题被用户报告之前发现异常。

你的服务器已经运行在生产环境中，需要及时发现故障。读完本节，你可以选择要设置告警的指标。

## 抓取指标接口 {#s-watch-vllm-in-production-scrape-the-endpoint}

vLLM 会在 API 使用的同一个端口上，通过 /metrics 导出 Prometheus 指标。无须设置启动参数。在 Prometheus 配置的 scrape_configs 列表中添加以下 job，并将 target 改成你的服务器：

```yaml
scrape_configs:
  - job_name: vllm
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ["vllm-host:8000"]
```

我们没有在自己的服务器上运行 Prometheus。

## 根据五个指标设置告警 {#s-watch-vllm-in-production-alert-on-five-metrics}

| 指标 | 触发告警的条件 | 常见含义 |
|---|---|---|
| vllm:num_requests_waiting | 持续一分钟高于 0 | 服务器无法及时接收所有流量 |
| vllm:kv_cache_usage_perc | 持续一分钟高于 0.95 | 缓存池已满，新请求需要等待或抢占 |
| vllm:num_preemptions_total | 速率高于 0 | 请求被暂停，之后需要重新计算 |
| vllm:time_to_first_token_seconds | 99 百分位数超过你的目标 | 用户等待首个 token |
| vllm:inter_token_latency_seconds | 99 百分位数超过你的目标 | 流式输出的 token 间隔过长 |

延迟目标应根据产品需求设置，不要直接采用监控面板的默认值。我们的 sweep 使用了首 token 1,000 ms、每个输出 token 100 ms 的目标。

这两个延迟指标都是 histogram，需要通过 PromQL 查询计算 99 百分位数。下面这个表达式在过去五分钟首 token 时间的 P99 超过 1 秒时会返回大于 0 的值：

```text
histogram_quantile(0.99, sum by (le) (rate(vllm:time_to_first_token_seconds_bucket[5m]))) > 1
```

对 token 间隔使用 vllm:inter_token_latency_seconds_bucket，并将阈值设为 0.1。

## 联合查看指标 {#s-watch-vllm-in-production-read-them-together}

只看一个指标容易误判。应组合查看：

- **等待数大于 0，但 cache 使用率低于 0.9。** 缓存池有空间，但 batch 已满。接收上限可能来自 --max-num-seqs 或 --max-num-batched-tokens。
- **等待数大于 0，且 cache 使用率接近 1。** 缓存池限制了接收能力。增加内存，或降低这块 GPU 上服务的用户数。
- **首 token 较慢，但没有等待请求。** 提示词较长，或 API server 中的 tokenizer 较慢。比较队列时间 vllm:request_queue_time_seconds 和首 token 时间。
- **长回答期间出现 preemption。** 运行中的请求逐渐增长，直到缓存池耗尽。降低并发量，或使用 FP8 KV cache。

## 监控缓存和 speculation {#s-watch-vllm-in-production-watch-the-cache-and-speculation}

还有两组计数器能判断某项功能是否有效：

- 前缀缓存命中数除以查询数就是命中率。应用发布后命中率下降，通常表示提示词开头发生了变化。
- 使用 speculative decoding 时，accepted token 数除以 draft token 数就是 acceptance rate。该值下降表示 proposer 在当前流量上的猜测效果变差。

## 同时监控 GPU {#s-watch-vllm-in-production-watch-the-gpu-too}

vLLM 指标不包含 GPU 时钟或温度。GPU 过热或被共享时速度会下降，各项延迟也会升高，但 vLLM 指标本身可能没有变化。应同时导出 nvidia-smi 数据，或在 vLLM 指标旁运行 NVIDIA DCGM exporter。

我们没有在自己的硬件上测量。Sweep 没有抓取 /metrics。小缓存池的测试中，请求在队列中等待，但我们没有保存日志或指标。[Chat 调优](#s-tune-chat-for-many-users)展示了该测试。

```takeaways
- 对等待数、缓存使用率、preemption，以及 TTFT 和 ITL 的 99 百分位数设置告警。
- 联合查看等待数和缓存使用率，找出请求受限的位置。
- 同时导出 GPU 时钟和温度指标。
```

来源：vLLM 0.31.0 文档（docs/design/metrics.md），vLLM 0.31.0 源码（vllm/v1/metrics/loggers.py），capture/gpu/summary/l4.json（slo）。
