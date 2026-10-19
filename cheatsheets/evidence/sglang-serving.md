# 证据对照：使用 SGLang 提供 LLM 服务

中文主题：[使用 SGLang 提供 LLM 服务](../sglang-serving.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 任务

对应主题区块：**任务**（`task-table`）。

来源文件：

- [`manuals/sglang-101/capture/out/server-default.command.txt`](../../manuals/sglang-101/capture/out/server-default.command.txt)
- [`manuals/sglang-101/capture/one_request.py`](../../manuals/sglang-101/capture/one_request.py)
- [`manuals/sglang-101/capture/run.py`](../../manuals/sglang-101/capture/run.py)
- [`manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md`](../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)
- [`manuals/sglang-101/sections/5-2-the-metrics-endpoint.md`](../../manuals/sglang-101/sections/5-2-the-metrics-endpoint.md)
- [`manuals/sglang-101/sections/7-1-operating-sglang.md`](../../manuals/sglang-101/sections/7-1-operating-sglang.md)

构建器核对的标识与数值：

- `--model-path`
- `--port`
- `--max-concurrency`
- `--request-rate`

## 启动服务（终端 1）

对应主题区块：**启动服务（终端 1）**（`annotated-code`）。

来源文件：

- [`manuals/sglang-101/capture/out/server-default.command.txt`](../../manuals/sglang-101/capture/out/server-default.command.txt)
- [`manuals/sglang-101/sections/r-1-flags-and-defaults.md`](../../manuals/sglang-101/sections/r-1-flags-and-defaults.md)
- [`manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md`](../../manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md)
- [`manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md`](../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md)

构建器核对的标识与数值：

- `--model-path`
- `--port`
- `--enable-cache-report`
- `--enable-metrics`
- `--mem-fraction-static`

## 运行基准（终端 2）

对应主题区块：**运行基准（终端 2）**（`annotated-code`）。

来源文件：

- [`manuals/sglang-101/capture/run.py`](../../manuals/sglang-101/capture/run.py)
- [`manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md`](../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)
- [`manuals/sglang-101/sections/r-1-flags-and-defaults.md`](../../manuals/sglang-101/sections/r-1-flags-and-defaults.md)
- [`manuals/sglang-101/capture/out/bench-random-c8.txt`](../../manuals/sglang-101/capture/out/bench-random-c8.txt)
- [`manuals/sglang-101/capture/out/bench-random-c32.txt`](../../manuals/sglang-101/capture/out/bench-random-c32.txt)

构建器核对的标识与数值：

- `--backend`
- `sglang.benchmark.serving`
- `--port`
- `--dataset-name`
- `--random-input-len`
- `--random-output-len`
- `--random-range-ratio`
- `--num-prompts`
- `--max-concurrency`

## 关键选项

对应主题区块：**关键选项**（`command-table`）。

来源文件：

- [`manuals/sglang-101/sections/r-1-flags-and-defaults.md`](../../manuals/sglang-101/sections/r-1-flags-and-defaults.md)
- [`manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md`](../../manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md)
- [`manuals/sglang-101/sections/2-3-admission-and-retraction.md`](../../manuals/sglang-101/sections/2-3-admission-and-retraction.md)
- [`manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md`](../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md)
- [`manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md`](../../manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md)
- [`manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md`](../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)

构建器核对的标识与数值：

- `--mem-fraction-static`
- `--max-total-tokens`
- `--max-running-requests`
- `--chunked-prefill-size`
- `--schedule-policy`
- `--schedule-conservativeness`
- `--disable-radix-cache`
- `--tp-size`

## 三个进程

对应主题区块：**三个进程**（`architecture`）。

来源文件：

- [`manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md`](../../manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md)
- [`manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md`](../../manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md)
- [`manuals/sglang-101/sections/3-3-radixcache.md`](../../manuals/sglang-101/sections/3-3-radixcache.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 一次请求的端到端流程

对应主题区块：**一次请求的端到端流程**（`flow`）。

来源文件：

- [`manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md`](../../manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md)
- [`manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md`](../../manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md)
- [`manuals/sglang-101/sections/2-3-admission-and-retraction.md`](../../manuals/sglang-101/sections/2-3-admission-and-retraction.md)
- [`manuals/sglang-101/sections/3-3-radixcache.md`](../../manuals/sglang-101/sections/3-3-radixcache.md)

构建器核对的标识与数值：

- `match_prefix`
- `max_new_tokens`

## 代码默认值

对应主题区块：**代码默认值**（`defaults`）。

来源文件：

- [`manuals/sglang-101/sections/r-1-flags-and-defaults.md`](../../manuals/sglang-101/sections/r-1-flags-and-defaults.md)

构建器核对的标识与数值：

- `--mem-fraction-static`
- `--max-running-requests`
- `--chunked-prefill-size`
- `--schedule-conservativeness`
- `1.0`
- `--schedule-policy`
- `fcfs`
- `--enable-cache-report`
- `--enable-metrics`
- `--watchdog-timeout`
- `300 s`

## 关键指标

对应主题区块：**关键指标**（`concepts`）。

来源文件：

- [`manuals/sglang-101/sections/r-2-metrics.md`](../../manuals/sglang-101/sections/r-2-metrics.md)
- [`manuals/sglang-101/sections/5-2-the-metrics-endpoint.md`](../../manuals/sglang-101/sections/5-2-the-metrics-endpoint.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 应阅读的日志行

对应主题区块：**应阅读的日志行**（`command-table`）。

来源文件：

- [`manuals/sglang-101/capture/out/server-default.log`](../../manuals/sglang-101/capture/out/server-default.log)
- [`manuals/sglang-101/capture/out/server-small-pool.log`](../../manuals/sglang-101/capture/out/server-small-pool.log)
- [`manuals/sglang-101/capture/out/oom-exploratory.log`](../../manuals/sglang-101/capture/out/oom-exploratory.log)
- [`manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md`](../../manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md)
- [`manuals/sglang-101/sections/2-3-admission-and-retraction.md`](../../manuals/sglang-101/sections/2-3-admission-and-retraction.md)

构建器核对的标识与数值：

- `bytes_per_slot`
- `pool_size`
- `max_total_num_tokens`
- `max_running_requests`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`manuals/sglang-101/sections/r-3-incident-index.md`](../../manuals/sglang-101/sections/r-3-incident-index.md)
- [`manuals/sglang-101/sections/2-3-admission-and-retraction.md`](../../manuals/sglang-101/sections/2-3-admission-and-retraction.md)
- [`manuals/sglang-101/sections/1-2-one-request-end-to-end.md`](../../manuals/sglang-101/sections/1-2-one-request-end-to-end.md)
- [`manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md`](../../manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md)
- [`manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md`](../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)

构建器核对的标识与数值：

- `--mem-fraction-static`
- `--disable-overlap-schedule`
- `--schedule-conservativeness`
- `--enable-cache-report`
- `cached_tokens`

## 术语表

对应主题区块：**术语表**（`glossary`）。

来源文件：

- [`manuals/sglang-101/sections/r-4-glossary.md`](../../manuals/sglang-101/sections/r-4-glossary.md)
- [`manuals/sglang-101/sections/3-3-radixcache.md`](../../manuals/sglang-101/sections/3-3-radixcache.md)
- [`manuals/sglang-101/capture/out/bench-shared-prefix.txt`](../../manuals/sglang-101/capture/out/bench-shared-prefix.txt)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md`](../../manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md)
- [`manuals/sglang-101/sections/2-3-admission-and-retraction.md`](../../manuals/sglang-101/sections/2-3-admission-and-retraction.md)
- [`manuals/sglang-101/sections/3-3-radixcache.md`](../../manuals/sglang-101/sections/3-3-radixcache.md)
- [`manuals/sglang-101/sections/5-2-the-metrics-endpoint.md`](../../manuals/sglang-101/sections/5-2-the-metrics-endpoint.md)
- [`manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md`](../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md`](../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)
- [`manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md`](../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md)
- [`manuals/sglang-101/sections/3-3-radixcache.md`](../../manuals/sglang-101/sections/3-3-radixcache.md)
- [`manuals/sglang-101/sections/7-1-operating-sglang.md`](../../manuals/sglang-101/sections/7-1-operating-sglang.md)

构建器核对的标识与数值：

- `--random-range-ratio`
- `--mem-fraction-static`

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: cheatsheets/sglang-serving.md (after trim pass)

Paths are relative to /private/tmp/aiefs-cheatsheets/manuals/sglang-101/. S = sections/, C = capture/, O = capture/out/.

## Front matter
- subtitle pin 0.5.22: manual.json lines 9-15

## Tasks (task-table, 8)
- sglang serve --model-path --port 30000: O/server-default.command.txt:1
- POST /generate {"text": ...}: C/one_request.py:13
- POST /v1/chat/completions: C/one_request.py:17
- GET /ready readiness: S/7-1:49,57
- GET /metrics: C/run.py:94, S/5-2:11
- fixed concurrency cap --max-concurrency 8: C/run.py:34, S/5-1:29
- fixed request rate --request-rate (default inf): S/5-1:42
- docker stop sends SIGTERM to main process: S/7-1:118

## Start the server (terminal 1) (annotated-code, 5 lines)
- sglang serve --model-path --port 30000 --enable-cache-report --enable-metrics --mem-fraction-static 0.4: O/server-default.command.txt:1
- cache report and metrics meaning: S/r-1:35,57. fraction meaning: S/3-2:55

## Benchmark it (terminal 2) (annotated-code, 5 lines)
- benchmark --backend sglang --port 30000 --dataset-name random --random-input-len 512 --random-output-len 128 --random-range-ratio 1.0: C/run.py:23,26, S/5-1:27-29
- default range ratio 0.0 halves prompts: S/5-1:40,45
- --num-prompts 32 --max-concurrency 8: C/run.py:34. 255.63 tok/s: O/bench-random-c8.txt:23

## Key flags (command-table, 8)
- --mem-fraction-static: S/3-2:55
- --max-total-tokens: S/r-1:12
- --max-running-requests at the knee: S/r-1:13, S/5-1:131
- --chunked-prefill-size: S/r-1:14, meaning S/2-1:75
- --schedule-policy lpm: S/2-2:62-71
- --schedule-conservativeness 1.3: S/2-3:114
- --disable-radix-cache: S/r-1:31
- --tp-size: S/6-1:13

## Three processes (architecture, 6 nodes, 6 edges)
- TokenizerManager main process: S/2-1:19. Scheduler owns GPU: S/2-1:21. DetokenizerManager: S/2-1:23
- ZMQ links: S/2-1:25. port 30000: S/2-1:46
- UnifiedRadixCache, match_prefix: S/3-3:60,77
- KV pool one slot per token: S/3-1:59

## One request, end to end (flow, 7)
- 1: S/2-1:19,25. 2: S/2-2:21,62. 3: S/3-3:60, S/2-2:53. 4: S/2-3:19
- 5: S/2-2:22,26. 6: S/2-2:22,24. 7: S/2-1:23

## Defaults in the code (8, all S/r-1)
- mem-fraction-static None: r-1:11. max-running-requests None: r-1:13. chunked-prefill-size None: r-1:14
- schedule-conservativeness 1.0: r-1:16. schedule-policy fcfs: r-1:23. enable-cache-report False: r-1:35
- enable-metrics None, resolves to off: r-1:57. watchdog-timeout 300 s: r-1:58

## Key metrics (concepts, 8)
- TTFT, ITL, queue time histograms: S/r-2:11,12,15. p99 over 5 min alert: S/5-2:81
- num_queue_reqs, token_usage, num_retracted_reqs alerts: S/5-2:83-85
- prefill_effective_tokens_total windowed hit rate: S/5-2:47,66
- cache_hit_rate last interval: S/5-2:39

## Log lines to read (command-table, 8)
- bytes_per_slot=114688, pool_size=181574: O/server-default.log:61
- max_total_num_tokens=181574, max_running_requests=4096: O/server-default.log:70
- #new-token: 3, #cached-token: 2: O/server-default.log:94, S/2-1 listing via 1-2:87
- #running-req: 5 ... #queue-req: 11: O/server-small-pool.log:118
- KV cache pool is full. Retract requests.: S/2-3:82
- crashed with exit code -15: O/server-default.log:566, S/2-1:111
- Insufficient Memory: O/oom-exploratory.log:15, S/3-2:43 (memory outside the pool)

## Troubleshooting (8)
- Insufficient Memory, 87 percent, 0.4: S/r-3:11
- RuntimeError, --disable-overlap-schedule, keep overlap on: S/r-3:12
- retractions, raise conservativeness: S/2-3:114, S/r-3:21
- high TTFT fast TPOT, past knee, cap: S/2-3:65-74, S/5-1:123,131
- no cached_tokens without --enable-cache-report: S/1-2:133
- #cached-token near 0, id at start, shared text first: S/3-4:29-33
- health check failed, 20 s, /ready: S/r-3:70
- crash line at shutdown, process group: S/r-3:13

## Glossary (8)
- TTFT: S/r-4:71, expansion S/3-3:16. TPOT: S/r-4:69, O/bench-shared-prefix.txt:40. ITL: S/r-4:34, O/bench-shared-prefix.txt:46
- KV cache: S/r-4:35. TP: S/r-4:65. DP: S/r-4:20. EP: S/r-4:25. PD: S/r-4:55

## Q&A (5)
- GIL: S/2-1:3,13. Five requests, 768 each: S/2-3:38. 2,998 of 2,999: S/3-3:65
- 0.942 vs 0.636, trust counters: S/5-2:56,111. Knee at or below 8: S/5-1:123

## Tips (6)
- --random-range-ratio 1.0: S/5-1:47. p50/p99 TTFT and TPOT: S/5-1:129
- steps of 0.02: S/3-2:88. radix cache on, measure hit rate per feature: S/3-3:98-102
- pin lmsysorg/sglang:v0.5.22: S/7-1:24,161. mount ~/.cache/sglang: S/7-1:41,162
````
