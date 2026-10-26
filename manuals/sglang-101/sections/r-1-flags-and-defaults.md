# 参数与默认值

> 本表列出手册修改或解释的参数，包括代码默认值、Mac 上解析出的值，以及何时需要修改。

0.5.22 的 `sglang serve --help` 列出 535 个选项（[帮助输出捕获](manuals/sglang-101/capture/out/serve-help.txt)）。多数选项平时用不到。下表保留本手册主要使用的参数，各节还在适用位置介绍少量其他参数。

许多默认值在代码中为 `None`。启动 hook 会根据 GPU、模型和空闲内存替换成具体值。Mac 实际值列来自[默认服务器日志](manuals/sglang-101/capture/out/server-default.log)的 `server_args` 行。

## 内存与准入 {#s-ref-flags-and-defaults-memory-and-admission}

| 参数 | 代码默认值 | Mac 实际值 | 修改条件 | 章节 |
|---|---|---|---|---|
| `--mem-fraction-static` | `None`，启动时按 GPU 大小推导 | `0.4`，由工具设置 | 机器运行其他程序，或服务器在大 batch 下崩溃 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| `--max-total-tokens` | `None`，按内存预算推导 | 池中 181,574 token | 测试需要固定池大小 | [2.3](#s-admission-and-retraction) |
| `--max-running-requests` | `None`，按池和上下文长度推导 | 4,096 | 已知并发上限，或开启推测解码 | [2.3](#s-admission-and-retraction) |
| `--chunked-prefill-size` | `None`，按 GPU 内存推导 | 4,096 | 长 prompt 阻塞 decode，或 prefill 太慢 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| `--max-prefill-tokens` | 16,384 | 16,384 | 很少需要修改 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| `--schedule-conservativeness` | 1.0 | 1.0 | 日志出现 retract 时调高 | [2.3](#s-admission-and-retraction) |
| `--page-size` | `None`，按注意力后端推导 | 1 | 注意力后端需要页 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |

## 调度 {#s-ref-flags-and-defaults-scheduling}

| 参数 | 代码默认值 | Mac 实际值 | 修改条件 | 章节 |
|---|---|---|---|---|
| `--schedule-policy` | `fcfs` | `fcfs` | 多个排队请求共享长前缀时，尝试 `lpm` | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| `--disable-overlap-schedule` | `False` | `False` | 仅用于调试；0.5.22 的 MLX 路径会崩溃，不要关闭 | [2.4](#s-the-overlap-scheduler) |
| `--stream-interval` | 1 | 1 | 向大量客户端流式输出，希望减少消息数 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |

## 缓存 {#s-ref-flags-and-defaults-cache}

| 参数 | 代码默认值 | Mac 实际值 | 修改条件 | 章节 |
|---|---|---|---|---|
| `--disable-radix-cache` | `False` | `False` | 仅用于测量缓存，如本捕获工具所做 | [3.3](#s-radixcache) |
| `--radix-eviction-policy` | `lru` | `lru` | 少数前缀很热，多数前缀很冷 | [3.5](#s-eviction-policies-and-hicache) |
| `--enable-hierarchical-cache` | 关闭 | 关闭 | 前缀工作集大于 GPU 内存 | [3.5](#s-eviction-policies-and-hicache) |
| `--kv-cache-dtype` | `auto` | `auto` | 每张 GPU 需要更多上下文，且能测试质量 | [4.3](#s-quantization) |
| `--enable-cache-report` | `False` | `True`，由工具设置 | 始终开启，让客户端看到 `cached_tokens` | [3.4](#s-prefix-friendly-prompts) |

## 执行 {#s-ref-flags-and-defaults-execution}

| 参数 | 代码默认值 | Mac 实际值 | 修改条件 | 章节 |
|---|---|---|---|---|
| `--attention-backend` | `None`，按 GPU 和模型选择 | `torch_native`，MLX 不使用它 | 测到更适合模型的后端 | [4.2](#s-attention-backend) |
| `--grammar-backend` | `None`，解析为 `xgrammar` | `xgrammar` | 某个语法编译失败 | [4.5](#s-structured-outputs-with-xgrammar) |
| `--disable-cuda-graph`，已弃用 | `False` | `True`，依 Apple 安装说明 | Apple silicon 没有 CUDA graphs；优先使用 `--cuda-graph-backend-decode disabled` 和 `--cuda-graph-backend-prefill disabled` | [4.1](#s-forwardmode-and-cuda-graphs) |
| `--speculative-algorithm` | `None` | `None` | 低并发 decode 延迟最重要 | [4.4](#s-speculative-decoding) |
| `--enable-deterministic-inference` | `False` | `False` | 要求相同输入在任意 batch 下都产生相同输出 | [4.6](#s-deterministic-inference-and-logprobs) |

`--disable-cuda-graph` 在 0.5.22 仍可使用，按阶段设置的 `--cuda-graph-backend-decode` 和 `--cuda-graph-backend-prefill` 取代了它。

## 并行与运维 {#s-ref-flags-and-defaults-parallelism-and-operations}

| 参数 | 代码默认值 | Mac 实际值 | 修改条件 | 章节 |
|---|---|---|---|---|
| `--tp-size` | 1 | 1 | 单张 GPU 放不下权重 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| `--dp-size` | 1 | 1 | 一个模型副本饱和，且有 GPU 可运行另一个 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| `--attn-dp-size` | 1 | 1 | 多 GPU 服务 DeepSeek 等 MLA 模型 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| `--ep-size` | 1 | 1 | 服务大型 MoE 模型 | [6.2](#s-moe-serving-deepep-and-eplb) |
| `--enable-metrics` | `False` | `True`，由工具设置 | 生产环境始终开启 | [5.2](#s-the-metrics-endpoint) |
| `--watchdog-timeout` | 300 s | 300 s | 单次前向传播可能超过五分钟 | [7.1](#s-operating-sglang) |

来源：v0.5.22 的 python/sglang/srt/arg_groups/fields/schedule.py、memory.py、exec_.py、model.py、parallel.py、spec.py、serving.py、observability.py、device.py；capture/out/serve-help.txt、server-default.log、server-small-pool.log。
