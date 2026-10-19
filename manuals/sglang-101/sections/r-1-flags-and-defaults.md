# 参数与默认值

> 本表列出手册修改或解释的参数、代码默认值、上游 Mac 实际解析值，以及修改时机。

`sglang serve --help` 在 0.5.22 列出 535 个选项（capture/out/serve-help.txt），多数与你无关。下表保留本手册使用的选项。许多代码默认值为 `None`，启动 hook 按 GPU、模型和空闲内存替换为实际值。“上游 Mac”列来自 capture/out/server-default.log 的 `server_args` 行。

## 内存与准入

| 参数 | 代码默认值 | 上游 Mac | 修改时机 | 章节 |
|---|---|---|---|---|
| `--mem-fraction-static` | `None`，启动时按 GPU 容量推导 | `0.4`，工具设置 | 机器还运行其他程序，或大批次导致服务崩溃 | [3.2](#s-mem-fraction-static-and-startup-sizing) |
| `--max-total-tokens` | `None`，按内存预算推导 | 池内 181,574 token | 测试需要固定池容量 | [2.3](#s-admission-and-retraction) |
| `--max-running-requests` | `None`，按池容量与上下文长度推导 | 4,096 | 已知并发上限，或开启推测解码 | [2.3](#s-admission-and-retraction) |
| `--chunked-prefill-size` | `None`，按 GPU 内存推导 | 4,096 | 长 prompt 阻塞 decode，或 prefill 太慢 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| `--max-prefill-tokens` | 16,384 | 16,384 | 很少需要 | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| `--schedule-conservativeness` | 1.0 | 1.0 | 日志出现回撤时提高 | [2.3](#s-admission-and-retraction) |
| `--page-size` | `None`，按注意力后端推导 | 1 | 注意力后端需要分页 | [3.1](#s-kv-bytes-per-token-and-the-kv-pool) |

## 调度

| 参数 | 代码默认值 | 上游 Mac | 修改时机 | 章节 |
|---|---|---|---|---|
| `--schedule-policy` | `fcfs` | `fcfs` | 许多排队请求共享长前缀时尝试 `lpm` | [2.2](#s-the-scheduler-loop-and-schedule-policy) |
| `--disable-overlap-schedule` | `False` | `False` | 仅用于调试；0.5.22 的 MLX 上会崩溃，不要关闭 | [2.4](#s-the-overlap-scheduler) |
| `--stream-interval` | 1 | 1 | 面向大量流式客户端，希望减少消息 | [2.5](#s-streaming-stop-strings-and-the-openai-api) |

## 缓存

| 参数 | 代码默认值 | 上游 Mac | 修改时机 | 章节 |
|---|---|---|---|---|
| `--disable-radix-cache` | `False` | `False` | 仅用于测量缓存，如本工具 | [3.3](#s-radixcache) |
| `--radix-eviction-policy` | `lru` | `lru` | 少数前缀热门，多数冷门 | [3.5](#s-eviction-policies-and-hicache) |
| `--enable-hierarchical-cache` | 关闭 | 关闭 | 前缀工作集大于 GPU 内存 | [3.5](#s-eviction-policies-and-hicache) |
| `--kv-cache-dtype` | `auto` | `auto` | 需要单 GPU 容纳更多上下文，且能测试质量 | [4.3](#s-quantization) |
| `--enable-cache-report` | `False` | `True`，工具设置 | 始终开启，让客户端看到 `cached_tokens` | [3.4](#s-prefix-friendly-prompts) |

## 执行

| 参数 | 代码默认值 | 上游 Mac | 修改时机 | 章节 |
|---|---|---|---|---|
| `--attention-backend` | `None`，按 GPU 和模型选择 | `torch_native` | 已测得更适合模型的后端 | [4.2](#s-attention-backend) |
| `--grammar-backend` | `None`，解析为 `xgrammar` | `xgrammar` | 语法无法编译 | [4.5](#s-structured-outputs-with-xgrammar) |
| `--disable-cuda-graph` | `False` | `True`，按 Apple 安装说明 | Apple silicon 没有 CUDA graphs | [4.1](#s-forwardmode-and-cuda-graphs) |
| `--speculative-algorithm` | `None` | `None` | 最关心低并发 decode 延迟 | [4.4](#s-speculative-decoding) |
| `--enable-deterministic-inference` | `False` | `False` | 需要任意批次中相同输入得到相同输出 | [4.6](#s-deterministic-inference-and-logprobs) |

`--disable-cuda-graph` 在 0.5.22 仍可用，替代项是按阶段设置的 `--cuda-graph-backend-decode` 和 `--cuda-graph-backend-prefill`。

## 并行与运维

| 参数 | 代码默认值 | 上游 Mac | 修改时机 | 章节 |
|---|---|---|---|---|
| `--tp-size` | 1 | 1 | 单 GPU 装不下权重 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| `--dp-size` | 1 | 1 | 单模型副本已饱和，且有 GPU 可增加副本 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| `--attn-dp-size` | 1 | 1 | 多 GPU 部署 DeepSeek 等 MLA 模型 | [6.1](#s-tp-size-dp-size-and-attn-dp-size) |
| `--ep-size` | 1 | 1 | 部署大型 MoE 模型 | [6.2](#s-moe-serving-deepep-and-eplb) |
| `--enable-metrics` | `None`，解析为关闭 | `True`，工具设置 | 生产始终开启 | [5.2](#s-the-metrics-endpoint) |
| `--watchdog-timeout` | 300 s | 300 s | 单次前向传播可能超过五分钟 | [7.1](#s-operating-sglang) |

Sources: python/sglang/srt/arg_groups/fields/schedule.py, memory.py, exec_.py, model.py, parallel.py, spec.py, serving.py, observability.py, device.py at v0.5.22; capture/out/serve-help.txt, server-default.log, server-small-pool.log.
