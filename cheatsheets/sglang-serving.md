---
id: sglang-serving
title: 使用 SGLang 提供 LLM 服务
subtitle: 启动、查询、规划容量、衡量并排查 SGLang 服务。固定使用 SGLang 0.5.22。
hue: 200
sources: manuals/sglang-101
code: LS
---

## 任务
type: task-table
from: manuals/sglang-101/capture/out/server-default.command.txt, manuals/sglang-101/capture/one_request.py, manuals/sglang-101/capture/run.py, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md, manuals/sglang-101/sections/5-2-the-metrics-endpoint.md, manuals/sglang-101/sections/7-1-operating-sglang.md

| 任务 | 代码 |
|---|---|
| 启动服务 | `sglang serve --model-path <model> --port 30000` |
| 原生请求 | `POST /generate {"text": "<prompt>"}` |
| OpenAI 风格请求 | `POST /v1/chat/completions` |
| 就绪探测 | `GET /ready` |
| 读取指标 | `GET /metrics` |
| 固定并发上限的基准 | `--max-concurrency 8` |
| 固定请求速率的基准 | `--request-rate <rps>` |
| 排空后停止 | `docker stop <container>` |

## 启动服务（终端 1）
type: annotated-code
lang: bash
from: manuals/sglang-101/capture/out/server-default.command.txt, manuals/sglang-101/sections/r-1-flags-and-defaults.md, manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md

```bash
sglang serve --model-path <model> \  # 要加载的权重
  --port 30000 \  # HTTP 端口
  --enable-cache-report \  # 在 usage 中提供 cached_tokens
  --enable-metrics \  # 开启 /metrics
  --mem-fraction-static 0.4  # 权重加 KV 池的内存比例
```

## 运行基准（终端 2）
type: annotated-code
lang: bash
from: manuals/sglang-101/capture/run.py, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md, manuals/sglang-101/sections/r-1-flags-and-defaults.md, manuals/sglang-101/capture/out/bench-random-c8.txt, manuals/sglang-101/capture/out/bench-random-c32.txt

```bash
# 并发上限为 8。终端 1 中的服务必须已启动。
python -m sglang.benchmark.serving --backend sglang \
  --port 30000 --dataset-name random \
  --random-input-len 512 --random-output-len 128 \
  --random-range-ratio 1.0 \  # 默认 0.0 会将 prompt 长度减半
  --num-prompts 32 --max-concurrency 8  # 捕获运行中为 255.63 tok/s
```

## 关键选项
type: command-table
from: manuals/sglang-101/sections/r-1-flags-and-defaults.md, manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md, manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md, manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md

| 命令 | 作用 |
|---|---|
| `--mem-fraction-static <f>` | 权重加 KV 池占用的内存比例 |
| `--max-total-tokens <n>` | 按 token 数固定 KV 池大小 |
| `--max-running-requests <n>` | 限制解码请求数，设在性能拐点 |
| `--chunked-prefill-size <n>` | 单步处理的最大 prompt 分块 |
| `--schedule-policy lpm` | 按最长前缀匹配排序 |
| `--schedule-conservativeness 1.3` | 提高预测余量，减少回撤 |
| `--disable-radix-cache` | 关闭前缀复用，仅用于测量 |
| `--tp-size <n>` | 将每层拆到 n 张 GPU |

## 三个进程
type: architecture
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md, manuals/sglang-101/sections/3-3-radixcache.md

```arch
node | client | 1,1 | 客户端 | HTTP :30000 | client
node | tok | 2,1 | TokenizerManager | 主进程、分词 | process
node | sched | 3,1 | Scheduler | 持有 GPU | gpu
node | detok | 2,2 | DetokenizerManager | 标识转文本 | process
node | radix | 3,2 | UnifiedRadixCache | 前缀树 | store
node | pool | 3,3 | KV 池 | 每个 token 一个槽位 | store
edge | client | tok | HTTP
edge | tok | sched | ZMQ
edge | sched | detok | ZMQ
edge | detok | tok | ZMQ
edge | sched | radix | 匹配
edge | radix | pool | 槽位
```

## 一次请求的端到端流程
type: flow
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md, manuals/sglang-101/sections/3-3-radixcache.md

1. **TokenizerManager**：应用对话模板、分词，再通过 ZMQ 发送。
2. **Scheduler**：按策略顺序加入等待队列。
3. **RadixCache**：`match_prefix` 查找缓存前缀，以 `#cached-token` 显示。
4. **Scheduler**：prompt 加 `max_new_tokens` 能放入池时才接纳。
5. **Scheduler**：分块预填充 `#new-token` 并采样首 token。
6. **Scheduler**：每步解码一个 token，直到达到停止条件。
7. **DetokenizerManager**：将标识转为文本，供 TokenizerManager 流式返回。

## 代码默认值
type: defaults
from: manuals/sglang-101/sections/r-1-flags-and-defaults.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--mem-fraction-static` | `None` | 启动时推导，捕获工具设为 0.4 |
| `--max-running-requests` | `None` | 依据池大小与上下文推导 |
| `--chunked-prefill-size` | `None` | 依据显存推导 |
| `--schedule-conservativeness` | 1.0 | 出现回撤时提高 |
| `--schedule-policy` | `fcfs` | 共享前缀较长时尝试 `lpm` |
| `--enable-cache-report` | `False` | 建议始终开启 |
| `--enable-metrics` | `None` | 最终解析为关闭 |
| `--watchdog-timeout` | 300 s | 允许较长的前向传播 |

## 关键指标
type: concepts
from: manuals/sglang-101/sections/r-2-metrics.md, manuals/sglang-101/sections/5-2-the-metrics-endpoint.md

- **sglang:time_to_first_token_seconds**：直方图，按 5 分钟窗口的 p99 告警。
- **sglang:inter_token_latency_seconds**：直方图，反映流式输出卡顿。
- **sglang:queue_time_seconds**：直方图，首次预填充前的等待。
- **sglang:num_queue_reqs**：仪表，持续数分钟大于 0 表示超过拐点。
- **sglang:token_usage**：仪表，接近 1.0 表示池已满。
- **sglang:num_retracted_reqs**：仪表，大于 0 时告警。
- **sglang:prefill_effective_tokens_total**：计数器，按不同模式计算窗口命中率。
- **sglang:cache_hit_rate**：仪表，仅代表上个日志区间。

## 应阅读的日志行
type: command-table
from: manuals/sglang-101/capture/out/server-default.log, manuals/sglang-101/capture/out/server-small-pool.log, manuals/sglang-101/capture/out/oom-exploratory.log, manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md

| 日志 | 含义 |
|---|---|
| `bytes_per_slot=114688, pool_size=181574` | 每 token 的 KV 字节数与池槽位数 |
| `max_total_num_tokens=181574` | SGLang 计算出的池大小 |
| `max_running_requests=4096` | 计算出的请求上限 |
| `#new-token: 3, #cached-token: 2` | 新 token 加缓存 token 等于 prompt |
| `#running-req: 5, ... #queue-req: 11` | 接纳控制正在限制请求 |
| `KV cache pool is full. Retract requests.` | 发生回撤，应作为性能告警 |
| `crashed with exit code -15` | 捕获时发出的 SIGTERM，并非故障 |
| `Insufficient Memory` | 池之外的内存不足 |

## 故障排查
type: troubleshooting
from: manuals/sglang-101/sections/r-3-incident-index.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md, manuals/sglang-101/sections/1-2-one-request-end-to-end.md, manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md

| 现象 | 原因 | 修正 |
|---|---|---|
| Metal `Insufficient Memory` | 池占用了 87% 空闲内存 | `--mem-fraction-static 0.4` |
| MLX 首批次出现 `RuntimeError` | 使用了 `--disable-overlap-schedule` | 保持重叠调度开启 |
| 反复回撤 | 接纳预测过于激进 | 提高 `--schedule-conservativeness` |
| TTFT 高、TPOT 快 | 超过拐点，请求排队 | 将并发限制在拐点 |
| usage 没有 `cached_tokens` | 未设 `--enable-cache-report` | 添加该选项 |
| `#cached-token` 接近 0 | prompt 开头的标识不断变化 | 共享文本放最前 |
| 负载下出现 "health check failed" | 20 秒无反分词输出 | 使用 `/ready` 做就绪检查 |
| 关闭时出现崩溃日志 | SIGTERM 发给整个进程组 | 仅向主进程发送 SIGTERM |

## 术语表
type: glossary
from: manuals/sglang-101/sections/r-4-glossary.md, manuals/sglang-101/sections/3-3-radixcache.md, manuals/sglang-101/capture/out/bench-shared-prefix.txt

- **TTFT**：首 token 时间，从发送到首个流式块。
- **TPOT**：首 token 之后，每个输出 token 的时间。
- **ITL**：token 间延迟，两个流式块之间的间隔。
- **KV 缓存**：保留先前 token 的键与值。
- **TP**：张量并行，将各层权重切分到多张 GPU。
- **DP**：数据并行，多个完整模型副本，各自持有 KV 缓存。
- **EP**：专家并行，将 MoE 专家分布到多张 GPU。
- **PD**：预填充与解码解耦，使用独立服务。

## 问答
type: qa
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md, manuals/sglang-101/sections/3-3-radixcache.md, manuals/sglang-101/sections/5-2-the-metrics-endpoint.md, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md

- **为何需要三个进程？** GIL，文本处理不能延误 GPU 步骤。
- **4,096 token 能放多少个输入 256、输出 512 的请求？** 五个，每个预留 768。
- **2,999 token 为何只缓存 2,998 个？** prompt 最后一个 token 始终需要预填充。
- **仪表 0.942、计数器 0.636，信哪个？** 仪表仅代表上个区间，应信任计数器。
- **什么是拐点？** 吞吐不再随并发上升的位置，此处在 8 或更低。

## 提示
type: tips
from: manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md, manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md, manuals/sglang-101/sections/3-3-radixcache.md, manuals/sglang-101/sections/7-1-operating-sglang.md

- 每次基准都传入 `--random-range-ratio 1.0`。
- 报告吞吐量及 TTFT、TPOT 的 p50 和 p99。
- 每次仅将 `--mem-fraction-static` 提高 0.02。
- 保持 radix 缓存开启，按功能衡量命中率。
- 固定 `lmsysorg/sglang:v0.5.22`，不要用 `latest`。
- 将 `~/.cache/sglang` 挂载到持久卷。
