# /metrics 端点

> Gauge 描述一个时刻，缓存命中率 gauge 描述一个日志区间；应基于时间窗口内的 counter 和 histogram 告警。

仪表盘显示前缀缓存命中率 94%。同一次运行中，服务器实际计算了 104,057 个 prompt token，从缓存取出 182,079 个，真实命中率为 64%。两个数字都来自我们捕获记录中的同一次指标抓取。前者是只记住最后一次记录的 prefill batch 的 gauge，后者是一对记录了全部历史的 counter。

读完本节，你能开启端点，区分 gauge、counter 和 histogram，计算有意义的命中率，并为越过拐点的服务器写出六种告警。

## 先开启它 {#s-the-metrics-endpoint-turn-it-on-first}

端点默认关闭。v0.5.22 的 `enable_metrics` 字段默认为 `False` {{code}}。不传 `--enable-metrics` 时，服务不会挂载 `/metrics`。我们的捕获服务器启动时设置了参数，见[第 5.1 节](#s-sglang-benchmark-serving)。默认实验结束后，它导出了 81 个指标族，共 603 行以 `sglang:` 开头的样本。

**我们的建议：** 每台服务器都带上 `--enable-metrics`，包括笔记本上的服务器。我们没有测量它的成本，预计与 decode 步骤相比很小。缺少历史数据的一次事故，成本却是整场调查。

## 三类时间序列 {#s-the-metrics-endpoint-three-kinds-of-series}

**Gauge：** 调度器每个日志区间都会覆盖的值，例如运行请求数。每次抓取只能看到最新值。**Counter：** 只增不减的累计值，例如已处理 prompt token 数。读取时应计算时间窗口内的增长速率。**Histogram：** 一组按桶划分的 counter，统计落在各个上限内的请求数。读取时应根据时间窗口内的增长速率计算分位数。

以下快照在默认实验全部结束、服务器空闲时抓取。

```listing
title: 空闲时的 gauge
source: capture/out/metrics.txt
lang: text
note: 省略标签。完整行带有 engine_type、model_name 和 rank 标签。
---
sglang:num_running_reqs{…} 0.0
sglang:num_queue_reqs{…} 0.0
sglang:gen_throughput{…} 0.0
sglang:token_usage{…} 0.0
sglang:cache_hit_rate{…} 0.9418739997090062
sglang:num_retracted_reqs{…} 0.0
```

五个 gauge 显示服务器空闲，另一个没有。缓存命中率仍保留最后运行的 prefill batch 的值，那是共享前缀基准。Gauge 回答“上个区间发生了什么”；没有新事件时，有些值衰减，有些保留原值。

## 两种缓存命中率 {#s-the-metrics-endpoint-the-cache-hit-rate-two-ways}

调度器根据一个日志区间内的 prefill token 计算 gauge：命中 token 数除以命中加实际计算 token 数。下面的 counter 则从服务器启动起累计同样两个量。

```listing
title: 命中率背后的 counter
source: capture/out/metrics.txt
lang: text
note: 除 mode 外省略标签，完整展示 HELP 行。
---
# HELP sglang:prefill_effective_tokens_total Effective prefill tokens with retracted-request re-counts excluded, updated on each log interval. mode: device_hit, host_hit, storage_hit, input. Windowed prefix cache hit rate = rate(sum of *_hit) / rate(sum of all modes); per-tier rate uses a single *_hit mode in the numerator.
sglang:prefill_effective_tokens_total{…mode="input"…} 104057.0
sglang:prefill_effective_tokens_total{…mode="device_hit"…} 182079.0
sglang:prefill_effective_tokens_total{…mode="host_hit"…} 0.0
sglang:prefill_effective_tokens_total{…mode="storage_hit"…} 0.0
```

HELP 文本称重复计算的 token 不计入，但代码只有 `input` 模式符合这句话。三种命中模式都加原始命中数，因此回撤后可能重复计入相同 token {{code}}。我们的运行没有回撤，所以下面的数字准确。

根据 counter，全程命中率为 182,079 除以 286,136，即 0.636；gauge 则为 0.942。两者都正确，但回答不同问题：gauge 描述末尾的共享前缀基准，counter 描述整个运行，也包括无法命中的随机 prompt 基准。

```figure
id: fig-5-2
kind: comparison
title: 同一台服务器，两种缓存命中率
claim: Gauge 报告最后一个 prefill 区间的值 0.942，整个运行的 counter 则给出 0.636。
caption: 左侧为 gauge 和它记住的区间，右侧为两个 counter 及其比值。绿色为缓存 token，梅紫色为实际计算的 prefill token。来源：默认实验后的 capture/out/metrics.txt。
```

Counter 的 HELP 文本给出了窗口速率公式，对应 PromQL 如下：

```promql
sum(rate(sglang:prefill_effective_tokens_total{mode=~".*_hit"}[5m]))
  / sum(rate(sglang:prefill_effective_tokens_total[5m]))
```

设置 `--disable-radix-cache` 的服务器，其快照 gauge 为 0.0，说明没有可能命中时，它确实会归零。Counter 算出的低命中率，才是[第 3.4 节](#s-prefix-friendly-prompts) 教你采取行动的信号。

## 对什么告警 {#s-the-metrics-endpoint-what-to-alert-on}

以下六条时间序列覆盖本手册中的故障，每个名称都出现在捕获记录中。

| 时间序列 | 类型 | 告警条件 | 原因 |
|---|---|---|---|
| `time_to_first_token_seconds` | histogram | 5 分钟 p99 超过目标 | 用户先等首 token，才能看到任何内容 |
| `inter_token_latency_seconds` | histogram | 5 分钟 p99 超过目标 | prefill batch 会阻塞运行中的 decode，第 5.1 节的 1,948 ms 间隔就是例子 |
| `num_queue_reqs` | gauge | 连续数分钟大于 0 | 服务器已越过拐点，新请求只会等待 |
| `token_usage` | gauge | 连续数分钟接近 1.0 | KV 池已满，下一步就是回撤 |
| `num_retracted_requests_total` | counter | 每分钟速率超过约 1 | 调度器移出请求后重新计算，见[第 2.3 节](#s-admission-and-retraction) |
| `prefill_effective_tokens_total` | counter | 部署后窗口命中率下降 | prompt 变化破坏了前缀，见第 3.4 节 |

Histogram 的 p99 由桶计算：

```promql
histogram_quantile(0.99,
  sum by (le) (rate(sglang:time_to_first_token_seconds_bucket[5m])))
```

**我们在同一快照中测得两个 histogram。** 排队时间共 266 个请求，总和 251.7 s，平均 0.95 s；流式 TTFT 共 261 个请求，总和 612.7 s，平均 2.35 s。这两条时间序列统计的请求不同，因此二者之比只是估计值，并非测得的占比。它提示这台 Mac 的首 token 时间中，排队占了很大部分。要得到精确占比，应比较同一批请求的排队时间与 TTFT。

```listing
title: 排队时间与首 token 时间对照
source: capture/out/metrics.txt
lang: text
note: 除 is_streaming 外省略标签。
---
sglang:queue_time_seconds_sum{…} 251.74525608913973
sglang:queue_time_seconds_count{…} 266.0
sglang:time_to_first_token_seconds_sum{…is_streaming="true"…} 612.7282021734864
sglang:time_to_first_token_seconds_count{…is_streaming="true"…} 261.0
```

## 我们的建议 {#s-the-metrics-endpoint-our-position}

延迟和活动量告警，使用时间窗口内的 histogram 分位数和 counter 速率。状态告警只有条件持续时才使用 gauge，例如 `num_queue_reqs` 持续大于 0，或 `token_usage` 连续数分钟接近 1.0。一次 gauge 抓取只描述最后几秒。Gauge 与 counter 不一致时，如本节的缓存命中率，应信任 counter。

依赖新指标前，先读其 HELP 文本和代码。不是每个 gauge 都正常工作。

## 事故 {#s-the-metrics-endpoint-the-incidents}

**始终不变的 gauge。** v0.5.22 的调度器代码有注释，称 `sglang:utilization` 自一次回归后始终为 0，注释链接到 #22713 {{code}}。捕获记录与之相符：服务器连续忙碌数分钟后，gauge 仍为 0.0。基于它的面板会在事故中显示整个集群空闲。

**健康探测不断累积任务。** [Issue #35884](https://github.com/sgl-project/sglang/issues/35884) 报告，超时的 `/health` 调用未取消调度器中的请求 {{issue #35884}}。每次失败探测都留下一个孤儿请求，在负载下进一步增加本想检测的负载。相关[issue #22511](https://github.com/sgl-project/sglang/issues/22511) 展示大模型高负载时出现“health check failed” {{issue #22511}}。应观察队列和延迟，将失败探测视为另一个症状。

```takeaways
- 每台服务器启动都传 `--enable-metrics`，端点默认关闭。
- 基于时间窗口内的 histogram 分位数和 counter 速率告警，不依赖单次 gauge 抓取。
- 从 `prefill_effective_tokens_total` 计算缓存命中率，不使用 `cache_hit_rate` gauge。
- `num_queue_reqs` 持续大于 0，或 `token_usage` 接近 1.0 时通知值班人员。
- 忽略 v0.5.22 的 `sglang:utilization`，因为它始终为 0。
- 比较同一请求的排队时间和 TTFT，判断多少延迟来自等待。
```

来源：python/sglang/srt/arg_groups/fields/observability.py (enable_metrics), python/sglang/srt/managers/scheduler_components/metrics_reporter.py （缓存命中率和利用率）, python/sglang/srt/observability/metrics_collector.py, 均为 v0.5.22 (baa9befa); capture/out/metrics.txt, capture/out/no-radix-cache-metrics.txt, capture/out/server-default.command.txt; issues #35884 and #22511.
