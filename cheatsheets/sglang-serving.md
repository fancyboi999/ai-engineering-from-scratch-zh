---
id: sglang-serving
title: 使用 SGLang 提供 LLM 服务
code: LS
subtitle: 启动、规划容量、测量并排查 SGLang 服务。基于上游 SGLang 0.5.22 手册与 GPU 捕获记录。
hue: 200
sources: manuals/sglang-101
source_hash: 241e5f7bd3f8e502
---

## 启动服务
type: annotated-code
lang: bash
from: manuals/sglang-101/capture/gpu/out-l4/server-default.command.txt, manuals/sglang-101/capture/README.md, manuals/sglang-101/sections/1-1-install-sglang-and-serve-your-first-model.md

```bash
export HF_HUB_OFFLINE=1   # 模型缓存后不再连接 Hub
sglang serve --model-path <model> --host 127.0.0.1 --port 30000 --enable-cache-report --enable-metrics --mem-fraction-static 0.85   # L4 使用的选项
curl http://127.0.0.1:30000/ready   # 服务可接收请求时返回 200
```

## 三个进程
type: architecture
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md

```arch
node | client | 1,1 | 客户端 | POST /generate | client
node | tok | 2,1 | TokenizerManager | 文本转 token ID | process
node | sched | 3,1 | Scheduler | 批次与 KV 池 | process
node | detok | 4,1 | Detokenizer | ID 转文本 | process
node | gpu | 3,2 | GPU 上的模型 | 前向传播 | model
node | kv | 3,3 | KV 池 | 每个 token 对应槽位 | store
edge | client | tok | HTTP
edge | tok | sched | ZMQ
edge | sched | gpu | 批次
edge | sched | kv | 槽位
edge | sched | detok | ID
edge | detok | client | 文本
```

## 请求与检查
type: task-table
from: manuals/sglang-101/sections/1-1-install-sglang-and-serve-your-first-model.md, manuals/sglang-101/sections/2-5-streaming-stop-strings-and-the-openai-api.md, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md, manuals/sglang-101/sections/4-6-deterministic-inference-and-logprobs.md, manuals/sglang-101/sections/7-1-operating-sglang.md

| 任务 | 代码 |
|---|---|
| 发送一次原生请求 | `POST /generate` |
| 使用 OpenAI 对话格式请求 | `POST /v1/chat/completions` |
| 读取单次请求的缓存命中 | `meta_info` 中的 `cached_tokens` 字段 |
| 就绪探测 | `/ready` |
| 固定基准的长度分布范围 | `--random-range-ratio 1.0` |
| 测量一个并发上限 | `--max-concurrency 8` |
| 按固定到达速率发送 | `--request-rate <rate>` |
| 测试输出稳定性 | `python3 -m sglang.test.test_deterministic --n-trials 50 --test-mode single` |

## 测量服务性能
type: command-table
from: manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md

| 命令 | 作用 |
|---|---|
| `python -m sglang.benchmark.serving --backend sglang --port 30000 --dataset-name random --num-prompts 32 --max-concurrency 8 --seed 7` | 发送 32 个随机 prompt，最多同时处理 8 个请求，然后输出报告。 |
| `--random-input-len 512 --random-output-len 128` | 设置 prompt 与回答长度。 |
| `--random-range-ratio 1.0` | 保持所设长度。默认值 0.0 会使平均长度约减半。 |
| `--request-rate <rate>` | 按固定速率发送请求，模拟真实流量中服务可能积压的情况。 |

## 关键默认值
type: defaults
from: manuals/sglang-101/sections/r-1-flags-and-defaults.md, manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md, manuals/sglang-101/sections/3-5-eviction-policies-and-hicache.md, manuals/sglang-101/sections/6-4-sgl-model-gateway.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `--schedule-policy` | `fcfs` | `lpm` 是论文采用的顺序，不是默认值 |
| `--schedule-conservativeness` | 1.0 | 日志显示回撤时提高 |
| `--radix-eviction-policy` | `lru` | 测量命中率后再改 |
| `--kv-cache-dtype` | `auto` | 保持模型数据类型 |
| `--stream-interval` | 1 | 每步后流式输出 |
| `--tp-size` | 1 | 除非权重需要更多卡，否则用单 GPU |
| `--cache-threshold` | 0.3 | 网关用于前缀亲和性的匹配率 |

## 修正这些错误
type: troubleshooting
from: manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md, manuals/sglang-101/sections/2-3-admission-and-retraction.md, manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md, manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md, manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 32 个请求时出现 `RuntimeError: [METAL] Command buffer execution failed` | 池按空闲内存的 87% 分配 | 传入 `--mem-fraction-static 0.4` 后重启 |
| GPU 仍有空闲显存，TTFT 中位数却接近 28 秒 | 池已满，接纳控制使请求排队 | 提高 `--schedule-conservativeness` 或降低 `--max-running-requests` |
| 反复出现 `KV cache pool is full. Retract requests.` | 预测过于激进 | 提高 `--schedule-conservativeness`，发送合理的 `max_new_tokens` |
| `RuntimeError: The memory capacity is unbalanced` | 某张 TP 卡与其他 pod 共享显存 | 释放另一张卡后重启；没有选项可关闭此检查 |
| 负载下解码日志显示 `cuda graph: False` | 解码批次超过图上限 | 将 `--cuda-graph-max-bs-decode` 设为峰值并发 |
| `ambiguous option: --cuda-graph-max-bs` | v0.5.22 拆分了该选项 | 使用 `--cuda-graph-max-bs-decode` 或 `--cuda-graph-max-bs-prefill` |
| 每次重复请求都为 `#cached-token: 0` | 系统 prompt 开头有随机 ID | 将 ID 移至末尾或删除 |

## 按此顺序调优
type: flow
from: manuals/sglang-101/sections/7-1-operating-sglang.md, manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md, manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md

1. **测量**：使用 `--random-range-ratio 1.0`，以三个并发上限运行 `sglang.benchmark.serving`。
2. **内存**：任何共享机器都应设置 `--mem-fraction-static`。
3. **Prompt**：共享文本放最前，请求 ID 不放开头。
4. **上限**：将 `--max-running-requests` 设在实测拐点。
5. **内核**：图与注意力设置每次只改一项。
6. **并行**：单副本饱和后才增加 `--tp-size` 或 `--dp-size`。

## 应监控的指标
type: concepts
from: manuals/sglang-101/sections/5-2-the-metrics-endpoint.md, manuals/sglang-101/sections/1-3-what-the-server-does-with-your-request.md, manuals/sglang-101/sections/2-5-streaming-stop-strings-and-the-openai-api.md

- **sglang:token_usage**：接近 1.0 表示 KV 池已满。
- **sglang:num_queue_reqs**：持续数分钟高于 0，表示服务已超过拐点。
- **sglang:cache_hit_rate**：单个区间的仪表值。应从 `sglang:prefill_effective_tokens_total` 计算命中率。
- **cached_tokens**：从缓存复用的 prompt token 数。
- **有效吞吐量**：同时满足 TTFT 与 TPOT 目标的每秒请求数。

## 已记录的事故
type: concepts
from: manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md, manuals/sglang-101/sections/4-2-attention-backend.md, manuals/sglang-101/sections/4-4-speculative-decoding.md, manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md

- **Issue #36889**：Mamba 限制将请求上限设为 2，且仅在一行 info 日志中说明。
- **Issue #17411**：FlashInfer 升级使 Hopper 解码慢了七倍。
- **Issue #5274**：EAGLE-3 使批次为 1 时的速度翻倍，却使并发 20 时的速度下降四分之一。
- **Issue #35129**：移除每会话 hash 后，命中率从 66.8% 提升至 94.4%。

## 术语表
type: glossary
from: manuals/sglang-101/sections/1-3-what-the-server-does-with-your-request.md, manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md, manuals/sglang-101/sections/6-2-moe-serving-deepep-and-eplb.md, manuals/sglang-101/sections/6-3-prefill-decode-disaggregation.md

- **ITL**：token 间延迟，即相邻 token 的时间间隔。
- **MLA**：多头潜在注意力，DeepSeek 使用的紧凑 KV 布局。
- **MoE**：混合专家，每个 token 只使用少数专家。
- **EPLB**：跨 GPU 的专家放置负载均衡。
- **PD**：预填充与解码解耦，分别运行在独立服务上。

## 问答
type: qa
from: manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md, manuals/sglang-101/sections/7-1-operating-sglang.md

- **首 token 时间高但 GPU 空闲，先查哪里？** 先查分词器进程，再查内核。
- **池更大为何吞吐量不变？** 上游捕获运行中，64 个用户时池从未填满。
- **应部署 `latest` 吗？** 不应。固定 `v0.5.22` 等标签。

## 提示
type: tips
from: manuals/sglang-101/sections/2-5-streaming-stop-strings-and-the-openai-api.md, manuals/sglang-101/sections/2-1-sglang-serve-and-the-three-processes.md, manuals/sglang-101/sections/5-2-the-metrics-endpoint.md, manuals/sglang-101/sections/7-1-operating-sglang.md

- 启动服务时添加 `--enable-cache-report` 与 `--enable-metrics`。
- 规划客户端容量前，先阅读启动日志中的池大小。
- 仅向主进程发送 SIGTERM。
- 为存活探针设置 `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION=false`。
