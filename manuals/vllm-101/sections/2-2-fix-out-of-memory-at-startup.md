# 修复启动时的内存不足

> GPU 内存比例是决定大多数启动失败的关键设置；缩短最大上下文或降低并发上限，则能解决其余大多数问题。

服务器还没打印 KV cache 容量行就停止了。读完本节，你可以从日志末尾找到原因，并选择能修复问题的参数。

## 了解 vLLM 启动时会预留什么 {#s-fix-out-of-memory-at-startup-know-what-vllm-claims-at-startup}

vLLM 在处理请求前会做四件事：

1. 加载权重。
2. 用完整 batch 运行一次 profile，测量激活内存。
3. 捕获 CUDA graph。
4. 将 GPU 剩余空间分给 KV cache。

`--gpu-memory-utilization` 用于设置内存比例。默认值是 0.92，也就是 vLLM 会为自身预留 GPU 总内存的 92%。这个值是单个 vLLM 实例的上限，不是服务器启动时的空闲内存比例。在 DGX Spark 这样的统一内存机器上，它也不一定是硬性上限，详见[DGX Spark 内存](#s-size-memory-on-a-dgx-spark)。

## 从日志定位故障 {#s-fix-out-of-memory-at-startup-find-your-failure-in-the-log}

查看服务器日志最后 30 行。大多数启动失败属于以下三种情况：

| 日志内容 | 原因 | 修复方法 |
|---|---|---|
| 单个最大长度请求所需的 KV cache 大于可用内存 | 权重和 profile 用掉太多内存，无法容纳一个满长度请求 | 降低 `--max-model-len`。错误信息会给出可用的最大长度。 |
| 设备的空闲内存少于目标 GPU 内存比例 | 其他进程占用了 GPU 内存 | 将 `--gpu-memory-utilization` 降到空闲内存比例以下，或停止其他进程 |
| profile 或 graph capture 期间 CUDA 内存不足 | profile batch 或 CUDA graph 需要的内存超过了剩余空间 | 降低 `--max-num-seqs` 或 `--max-num-batched-tokens`，也可降低 `--max-cudagraph-capture-size` |

```figure
id: fig-2-2
kind: decision
title: 启动在哪一步失败
claim: 启动失败前最后一行日志会告诉你应该调整三个设置中的哪一个。
caption: 按列从上到下阅读：日志停止的位置、原因和需要调整的参数。来源：vLLM 0.31.0 源码和我们在 L4 上的运行记录。
```

## 修复共享 GPU 上的启动问题 {#s-fix-out-of-memory-at-startup-fix-a-shared-gpu}

共享 GPU 上应手动设置内存比例。我们在另一团队也会使用的 L4 上运行 vLLM 0.31.0。由于对方进程占用了部分内存，我们设置了 `--gpu-memory-utilization 0.83`，并将缓存池设为 2,928 个 token。

第一次启动仍然失败，因为我们同时把最大长度设成 2,928 token。该长度的单个请求需要的 KV cache 略大于空闲空间，错误信息指出最多只能容纳 2,912 token：

```listing
title: 共享 L4 GPU 上的最大长度错误
source: capture/gpu/incidents/l4-gpu1-vllm-maxlen-oom.txt
lang: text
note: 第一行列出设置。第二行给出错误和可容纳的最大长度。捕获内容将第二行截断在 420 个字符。vLLM 0.31.0 的完整消息建议提高内存比例或缩短最大长度。
---
(APIServer pid=3681321) INFO 10-22 00:35:04 [api_utils.py:286] non-default args: {'model_tag': 'Qwen/Qwen3-8B', 'host': '127.0.0.1', 'port': 30100, 'model': 'Qwen/Qwen3-8B', 'max_model_len': 2928, 'gpu_memory_utilization': 0.83, 'num_gpu_blocks_override': 183}
(EngineCore pid=3682071) ERROR 10-22 00:36:18 [core.py:1433] ValueError: To serve at least one request with the model's max seq len (2928), (0.4 GiB KV cache is needed, which is larger than the available KV cache memory (0.4 GiB). Based on the available memory, the estimated maximum model length is 2912. Try increasing `gpu_memory_utilization` (which also controls CPU memory on the CPU backend) or decreasing `max_mod
```

我们将 `--max-model-len` 降到 2048。640-token 请求足够使用这个长度，服务器也成功启动。之后我们又将它提高到 2,304 token，以便测试 2,048-token 前缀。

在共享 GPU 上，内存比例和最大长度要一起考虑。应先将最大长度降低到你实际会发送的最长请求，再考虑降低内存比例。

## 直接设置 KV cache 大小 {#s-fix-out-of-memory-at-startup-set-the-kv-cache-size-directly}

如果你知道需要多大的 KV cache，可以用 `--kv-cache-memory-bytes` 按字节指定。此时 vLLM 会忽略用于 KV cache 的 `--gpu-memory-utilization`。当两个 vLLM 实例共用一块 GPU，且各自需要固定容量时，可以使用它。

测试时，`--num-gpu-blocks-override` 会设置 16-token block 的数量，见[我们的固定缓存池](#s-count-the-memory-before-you-pick-a-gpu)。不要在生产环境中使用它，因为该参数不会检查实际内存是否足够。

## 检查修复结果 {#s-fix-out-of-memory-at-startup-check-the-fix}

像[首次启动](#s-install-vllm-and-serve-your-first-model)那样，用 `tee server.log` 重新启动服务器，然后等待缓存池日志行出现：

```bash
grep "GPU KV cache size" server.log
```

如果这行日志出现，说明服务器已创建缓存池。将它的大小与你的[估算结果](#s-count-the-memory-before-you-pick-a-gpu)比较。

```takeaways
- 查看日志最后 30 行，将故障归入三种情况之一。
- 共享 GPU 上先降低最大模型长度，再降低内存比例。
- 两个实例共用一块 GPU 时，按需设置 KV 内存大小。
```

来源：capture/gpu/incidents/l4-gpu1-vllm-maxlen-oom.txt，vLLM 0.31.0 文档（docs/configuration/optimization.md），vLLM 0.31.0 源码（vllm/config/cache.py、vllm/config/scheduler.py），我们在 2026-10-22 对共享 GPU 进行的 L4 运行。
