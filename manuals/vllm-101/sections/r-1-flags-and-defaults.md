# Flag 与默认值

> 本节按使用场景列出手册提到的 flag，以及 vLLM 0.31.0 中的默认值。

本节供你查找正文提到的 flag。

以下默认值适用于 CUDA GPU 上的 `vllm serve`，来源是 vLLM 配置类。

## Server {#s-ref-flags-and-defaults-server}

| Flag | 默认值 | 作用 | 详见 |
|---|---|---|---|
| `--host` | 未设置，监听所有网络接口 | 服务器监听的地址 | [server 选项](#s-set-the-server-options-every-deployment-needs) |
| `--port` | 8000 | HTTP 端口 | [server 选项](#s-set-the-server-options-every-deployment-needs) |
| `--served-model-name` | 模型名称 | 客户端在 `model` 中发送的名称 | [server 选项](#s-set-the-server-options-every-deployment-needs) |
| `--api-key` | 未设置 | `/v1` 路由需要的 key | [server 选项](#s-set-the-server-options-every-deployment-needs) |
| `--chat-template` | 模型自带的 template | 以文件或文本形式提供的 chat template | [server 选项](#s-set-the-server-options-every-deployment-needs) |
| `--default-chat-template-kwargs` | 未设置 | 所有请求共用的 template 值 | [推理模型](#s-serve-reasoning-models) |
| `--reasoning-parser` | 未设置 | 将思考内容从答案中分离出来的 parser | [推理模型](#s-serve-reasoning-models) |
| `--enable-log-requests` | 关闭 | 为每个请求记录一行日志 | [server 选项](#s-set-the-server-options-every-deployment-needs) |

## 内存与长度 {#s-ref-flags-and-defaults-memory-and-length}

| Flag | 默认值 | 作用 | 详见 |
|---|---|---|---|
| `--gpu-memory-utilization` | 0.92 | 单个实例可使用的 GPU 总内存比例 | [启动](#s-fix-out-of-memory-at-startup) |
| `--kv-cache-memory-bytes` | 未设置 | KV cache 的字节数；设置后会覆盖其内存比例 | [启动](#s-fix-out-of-memory-at-startup) |
| `--max-model-len` | 模型配置值 | 单个请求允许的 prompt 与答案总长度 | [长上下文](#s-serve-long-contexts-and-hybrid-models) |
| `--block-size` | 16 | 每个 KV block 的 token 数，或 attention backend 的偏好值 | [Block pool](#s-how-the-block-pool-manages-kv-memory) |
| `--kv-cache-dtype` | `auto` | KV cache 的数据类型，例如 `fp8` | [Attention backend](#s-how-vllm-picks-an-attention-backend) |
| `--num-gpu-blocks-override` | 未设置 | 为测试指定的 KV block 数量 | [启动](#s-fix-out-of-memory-at-startup) |

## 调度 {#s-ref-flags-and-defaults-scheduling}

| Flag | 默认值 | 作用 | 详见 |
|---|---|---|---|
| `--max-num-batched-tokens` | `vllm serve` 在显存低于 70 GiB 或使用 A100 时为 2048；从 70 GiB 起为 8192；从 160 GiB 起为 16384 | 每个调度步骤的 token 预算 | [Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase) |
| `--max-num-seqs` | 显存低于 70 GiB 的 GPU 或 A100 为 256；从 70 GiB 起为 1024 | 同时运行的最大请求数 | [Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase) |
| `--enable-chunked-prefill` | 开启 | 将长 prompt 拆到多个步骤执行 | [Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase) |
| `--async-scheduling` | 多数生成模型中开启 | GPU 运行当前步骤时规划下一步 | [Model Runner V2](#s-what-model-runner-v2-changed) |
| `--scheduling-policy` | `fcfs` | 先来先服务，或 `priority` | [Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase) |
| `--long-prefill-token-threshold` | 未设置 | 限制单步处理的 prefill token 数 | [Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase) |

## Cache {#s-ref-flags-and-defaults-cache}

| Flag | 默认值 | 作用 | 详见 |
|---|---|---|---|
| `--enable-prefix-caching` | 开启 | 重用缓存的前缀 block | [Block pool](#s-how-the-block-pool-manages-kv-memory) |
| `--prefix-caching-hash-algo` | `sha256` | 对每个 block 使用的 hash 算法 | [Block pool](#s-how-the-block-pool-manages-kv-memory) |
| `--disable-hybrid-kv-cache-manager` | 关闭 | 所有层使用一个 group | [长上下文](#s-serve-long-contexts-and-hybrid-models) |
| `--kv-transfer-config` | 未设置 | KV connector 及其 role | [KV connector](#s-how-kv-connectors-move-the-cache) |

## 执行 {#s-ref-flags-and-defaults-execution}

| Flag | 默认值 | 作用 | 详见 |
|---|---|---|---|
| `-O0` 到 `-O3` | `-O2` | compile 和 CUDA graph 级别 | [Compile 和 graph](#s-how-compile-and-cuda-graphs-are-captured) |
| `--enforce-eager` | 关闭 | 禁用 compile、CUDA graph 和 kernel warmup | [Compile 和 graph](#s-how-compile-and-cuda-graphs-are-captured) |
| `--max-cudagraph-capture-size` | 由优化级别决定 | 可捕获 graph 的最大 batch | [Compile 和 graph](#s-how-compile-and-cuda-graphs-are-captured) |
| `--attention-backend` | 从候选列表选择 | 以 enum 名称指定 attention kernel | [Attention backend](#s-how-vllm-picks-an-attention-backend) |
| `--speculative-config` | 未设置 | 以 JSON 设置 speculative decoding 方法和选项 | [Speculative decoding](#s-how-speculative-decoding-checks-drafts) |

## 并行 {#s-ref-flags-and-defaults-parallelism}

| Flag | 默认值 | 作用 |
|---|---|---|
| `--tensor-parallel-size`, `-tp` | 1 | 拆分每层计算的 GPU 数量 |
| `--pipeline-parallel-size`, `-pp` | 1 | 分阶段拆分各层计算的 GPU 数量 |
| `--data-parallel-size`, `-dp` | 1 | 完整模型副本的数量 |
| `--enable-expert-parallel` | 关闭 | 将 mixture-of-experts 模型的 expert 分布到多块 GPU |

## 环境变量 {#s-ref-flags-and-defaults-environment-variables}

| Variable | 默认值 | 作用 |
|---|---|---|
| `VLLM_ENABLE_V1_MULTIPROCESSING` | `1` | 让 engine core 在独立进程中运行 |
| `VLLM_USE_V2_MODEL_RUNNER` | 未设置 | 固定选择 model runner |
| `VLLM_BATCH_INVARIANT` | `0` | 设为 `1` 时启用 batch-invariant 模式 |
| `VLLM_API_KEY` | 未设置 | 设置 API key，与 `--api-key` 相同 |
| `VLLM_LOGGING_LEVEL` | `INFO` | vLLM 日志级别 |
| `VLLM_NO_USAGE_STATS` | `0` | 设为 `1` 时关闭使用情况统计 |

Sources: the vLLM source at v0.31.0 (vllm/config/cache.py, vllm/config/scheduler.py, vllm/config/compilation.py, vllm/config/model.py, vllm/config/parallel.py, vllm/engine/arg_utils.py, vllm/envs.py, vllm/entrypoints/launchers/cli_args.py, vllm/config/structured_outputs.py).
