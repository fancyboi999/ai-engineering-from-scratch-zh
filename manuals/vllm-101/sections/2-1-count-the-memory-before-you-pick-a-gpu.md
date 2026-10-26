# 选择 GPU 前先计算内存

> 决定能容纳多少用户的是 KV cache，而不是模型权重；根据模型配置中的四个数字就能计算容量。

你选了一块 GPU，服务器能容纳的用户数却比计划少。读完本节，你可以根据模型和上下文长度预测 KV cache 容量与可容纳的用户数。

**我们的测量结果：**在 L4 上运行 Qwen3-8B 时，24,096 个 token 的 KV cache 容量可容纳 37 个用户，每人持有 640 个 token；但启动日志显示的并发量只有 2.94。

## 计算每个 token 占用的字节数 {#s-count-the-memory-before-you-pick-a-gpu-count-the-bytes-for-one-token}

运行中的每个请求都会把 key 和 value 保留在 GPU 内存中，直到请求结束。模型配置中的四个数字决定了其大小：

```text
每个 token 的 KV 字节数 = 层数 x KV 头数 x 头维度 x 2 x 每个值的字节数
```

从 `config.json` 读取前三个数字：`num_hidden_layers`、`num_key_value_heads` 和 `head_dim`。BF16 的每个值占 2 字节，FP8 KV cache 的每个值占 1 字节。

| 模型 | 层数 | KV 头数 | 头维度 | BF16 下每个 token 的 KV 大小 |
|---|---|---|---|---|
| `Qwen/Qwen3-8B` | 36 | 8 | 128 | 144 KiB |
| `Qwen/Qwen3-30B-A3B-Instruct-2507` | 48 | 4 | 128 | 96 KiB |

混合专家模型的权重接近稠密模型的 4 倍，但每个 token 占用的 KV 内存更少。这个数字由 KV 头数决定，而不是由参数量决定。

```figure
id: fig-2-1
kind: structure
title: 每个 token 占用的字节数
claim: Qwen3-8B 的每个 token 占用 144 KiB KV cache，Qwen3-30B-A3B 占用 96 KiB，因为后者的 KV 头更少。
caption: 将每行的五个数字相乘。最后一个因子表示 BF16 下每个值占 2 字节。来源：Hugging Face Hub 上的模型配置。
```

## 从字节数计算用户数 {#s-count-the-memory-before-you-pick-a-gpu-turn-bytes-into-users}

vLLM 会将权重和启动 profile 使用后剩余的内存分配给 KV cache。用这部分内存除以每个 token 的字节数，可得缓存 token 容量。再用缓存容量除以每个用户持有的上下文长度：

```text
可容纳的用户数 = KV cache 的 token 容量 /（提示词 token 数 + 每个用户生成的输出 token 数）
```

请求需要的 block 超过空闲数量时，会在队列中等待。如果正在运行的请求需要新 block，但一个也没有空闲，vLLM 会暂停该请求，之后再重新计算。

## 用启动日志核对计算结果 {#s-count-the-memory-before-you-pick-a-gpu-check-the-count-against-the-startup-log}

每次启动后都检查两行日志。下面是在 DGX Spark 上使用 `Qwen/Qwen3-30B-A3B-Instruct-2507` 并设置 `--gpu-memory-utilization 0.75` 时的结果：

```listing
title: GB10 启动日志中的内存信息
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 权重占用 56.93 GiB，剩余 31.32 GiB 可分配给 KV cache。
---
(EngineCore pid=143) INFO 10-21 10:58:45 [model_runner.py:407] Model loading took 56.93 GiB memory and 330.542793 seconds
(EngineCore pid=143) INFO 10-21 10:59:46 [gpu_worker.py:692] Available KV cache memory: 31.32 GiB
```

每个 token 占 96 KiB 时，31.32 GiB 能容纳约 342,000 个 token。

**固定缓存池：**我们的 sweep 使用 `--num-gpu-blocks-override` 手动设置缓存池大小。这个参数控制 16-token block 的数量。我们让 vLLM 和同一机器上的 SGLang 使用相同大小的缓存池，以便两套 engine 使用相同内存空间。DGX Spark 的缓存池是 234,960 个 token，L4 的缓存池是 24,096 个 token。你的服务器会根据空闲内存计算缓存池，所以实际会使用全部可用空间。

下一行日志会显示缓存池的 token 数，以及在请求达到最大上下文长度时能容纳多少用户：

```listing
title: L4 对比测试中的缓存池信息
source: capture/gpu/out-l4/server-h2h-vllm.log
lang: text
note: 24,096 个 token，每个占 144 KiB，共需 3.31 GiB KV cache。
---
INFO 10-17 20:13:17 [kv_cache_utils.py:2464] GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
```

`Maximum concurrency` 假设每个用户的请求都达到完整的 `--max-model-len`。真实请求通常更短，因此可以容纳更多用户。提示词为 512 token、输出为 128 token 时，24,096-token 的缓存池可容纳 37 个用户。在负载 sweep 中，日志显示有 40 个请求正在运行，cache 使用率为 99.5%。这是因为有些用户还在生成答案，持有的 token 较少。

```figure
id: fig-2-1b
kind: comparison
title: 缓存池决定用户数
claim: 相同的 24,096-token 缓存池，在用户都用满上下文时只能容纳 2.94 人；每人持有 640 token 时则可容纳 37 人。
caption: 每个蓝色方块表示一位用户。虚线部分表示满长度请求不会用完的缓存空间。来源：capture/gpu/out-l4/server-h2h-vllm.log。
```

## 决定调整哪项设置 {#s-count-the-memory-before-you-pick-a-gpu-decide-what-to-change}

如果计算结果不能满足负载需求，有四种选择，成本由低到高排列：

1. 将 `--max-model-len` 调低到用户实际发送的最长上下文。缓存池大小不变，但单个长请求无法独占缓存。
2. 使用 FP8 KV cache，将每个 token 的字节数减半。[FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache)一节会说明代价。
3. 使用 FP8 权重，释放内存给缓存使用。[FP8 权重](#s-fit-a-bigger-model-with-fp8-weights)一节会说明何时值得这样做。
4. 使用更大内存的 GPU，或将模型拆分到多块 GPU。[并行策略](#s-choose-tensor-pipeline-or-data-parallelism)一节会介绍这些方式。

```takeaways
- 买或租 GPU 前，先根据四个配置数字计算每个 token 的 KV 大小。
- 用 KV 缓存容量除以每个用户实际持有的上下文，不要除以最大模型长度。
- 每次启动后，将计算结果与内存和缓存池日志核对。
```

来源：vLLM 0.31.0 文档（docs/configuration/optimization.md、docs/design/prefix_caching.md），Qwen/Qwen3-8B 和 Qwen/Qwen3-30B-A3B-Instruct-2507 模型配置，capture/gpu/out-gb10/server-load-vllm.log、capture/gpu/out-l4/server-h2h-vllm.log、capture/gpu/summary/l4.json、capture/gpu/summary/gb10.json。
