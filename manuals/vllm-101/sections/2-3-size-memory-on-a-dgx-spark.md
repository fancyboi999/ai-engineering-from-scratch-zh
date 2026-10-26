# 估算 DGX Spark 的内存

> 统一内存由 GPU 和操作系统共享，因此要从系统读取可用内存，不能只看 GPU。

你在 DGX Spark 或其他 CPU 与 GPU 共用内存的机器上运行 vLLM。读完本节，你可以选择能为操作系统留出空间的内存比例，也会了解首次启动为什么需要几分钟。

**我们的测量结果：**内存比例设为 0.75 时，模型权重占用 56.93 GiB，KV cache 占用 31.32 GiB，机器总内存为 121.69 GiB。

## 这里的“GPU 内存”是什么 {#s-size-memory-on-a-dgx-spark-know-what-gpu-memory-means-here}

DGX Spark 的 GB10 没有独立 GPU 内存。CPU 和 GPU 共用同一块 LPDDR5x 内存。NVIDIA 标称容量为 128 GB，我们的机器在启动日志中报告总量为 121.69 GiB。操作系统、文件页缓存和其他程序也会使用这块内存。

vLLM 0.31.0 对此做了适配。在集成 GPU 上，它会从操作系统读取空闲内存，因为 GPU 驱动报告的空闲空间往往过少。当整个系统的内存使用率超过 80% 时，它也会释放缓存的 GPU 内存。因此，`--gpu-memory-utilization` 表示整台机器的内存比例，而不是独立显卡的内存比例。

## 不要把比例当成硬性上限 {#s-size-memory-on-a-dgx-spark-do-not-trust-the-fraction-as-a-hard-limit}

该比例表示 vLLM 计划使用的内存份额。在统一内存机器上，vLLM 实际占用量未必受它限制。其他用户报告过两种情况，我们在自己的运行中没有遇到：

- Issue 46307 报告，GB10 设置 0.70 后，在启动 profile 期间使用约 112 GiB，而目标份额约为 83 GiB。机器停止响应。Issue 因长期未更新而关闭，未修复。
- Issue 44740 报告，GB10 开启 MTP speculation 后，CUDA graph 内存估算出现负值。KV cache 因此变得过大，启动时内存不足。该 issue 仍处于开放状态。

我们的运行中，使用量符合 0.75 的份额。这只代表一次未启用 speculation 的运行。

要给 KV cache 设置固定容量，可像[内存不足排查](#s-fix-out-of-memory-at-startup)所述，用 `--kv-cache-memory-bytes` 按字节指定。确认权重、缓存和启动 profile 所需的几 GiB 加起来后，仍为操作系统留有空间。

## 选择内存比例 {#s-size-memory-on-a-dgx-spark-pick-the-fraction}

将权重、所需的 KV cache，以及启动 profile 和 CUDA graph 所需的几 GiB 相加，再除以总内存。还要为操作系统和文件页缓存预留空间，它们也使用这块内存。

我们使用 BF16 的 `Qwen/Qwen3-30B-A3B-Instruct-2507`，内存比例设为 0.75：

| 项目 | 大小 |
|---|---|
| vLLM 的份额，即 121.69 GiB 的 0.75 | 91.3 GiB |
| 权重 | 56.93 GiB |
| 可供 KV cache 使用 | 31.32 GiB |
| 其余空间，用于 profile 和 CUDA graph | 约 3 GiB |

每个 token 占 96 KiB 时，31.32 GiB 可容纳约 342,000 个 token，足够供 500 多个各持有 640 token 的用户使用。我们的 sweep 使用了较小的[固定缓存池](#s-count-the-memory-before-you-pick-a-gpu)。这一比例为操作系统和其他程序留下了约 30 GiB。

我们只测过一个比例。针对内存比例、KV cache 容量和 swap 活动的 sweep 已列入计划，但尚未运行。

```figure
id: fig-2-3
kind: layers
title: DGX Spark 上的一块共享内存池
claim: 内存比例设为 0.75 时，vLLM 会使用 DGX Spark 上 CPU 与 GPU 共用的 121.7 GiB 内存中的 91.3 GiB。
caption: 长条按整机内存比例绘制。蓝色线表示 vLLM 的份额。来源：capture/gpu/out-gb10/server-load-vllm.log。
```

## 预期首次启动较慢 {#s-size-memory-on-a-dgx-spark-expect-a-slow-first-start}

首次启动用了五分多钟。日志显示了耗时的部分：

```listing
title: GB10 上的权重加载记录
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 加载 56.93 GiB 权重用了 330 秒。
---
(EngineCore pid=143) INFO 10-21 10:58:45 [model_runner.py:407] Model loading took 56.93 GiB memory and 330.542793 seconds
```

加载时，vLLM 会逐个将 tensor 从内存映射的 safetensors 文件复制到 GPU 分配的空间。在 GB10 上，从文件映射页复制会比较慢。一项开放的 vLLM issue 测得，每个 tensor 从文件视图复制需要约 1.7 ms；先复制到主机内存则只需约 0.2 ms。

0.31.0 加快了加载中的另一个步骤：按索引查找 expert 名称，在 DGX Spark 上可节省约 25 秒。但每个 tensor 的复制开销仍然存在。

以下两点会有帮助：

- 将权重放在本机 NVMe 磁盘上，不要放在网络挂载目录。
- 启动服务器后尽量保持运行。重启需要重新完整加载权重。

## 检查内存比例 {#s-size-memory-on-a-dgx-spark-check-the-fraction}

启动后查看内存日志和系统内存：

```bash
grep -E "Model loading took|Available KV cache memory|GPU KV cache size" server.log
free -g
```

如果服务器空闲时 `free -g` 显示可用内存所剩无几，将内存比例降低 0.05 后重启。如果 KV cache 日志显示的容量超过目标份额，则改用字节数固定缓存大小。

```takeaways
- 统一内存机器上的内存比例针对整台机器。
- 为操作系统和文件页缓存留出空间，并使用 `free -g` 检查。
- 首次加载权重可能需要几分钟，启动后应尽量保持服务器运行。
```

来源：vLLM 0.31.0 源码（vllm/utils/mem_utils.py、vllm/platforms/cuda.py），vLLM 0.31.0 发布说明（DGX Spark 权重加载），vLLM issue 58726（GB10 上权重加载缓慢），vLLM pull request 58720（加载权重时按索引查找 expert），capture/gpu/out-gb10/server-load-vllm.log、capture/gpu/summary/gb10.json，vLLM issue 44740（GB10 开启 MTP speculation 时 CUDA graph 内存估算为负值），vLLM issue 46307（GB10 启动 profile 超出内存份额），vLLM 0.31.0 文档（--kv-cache-memory-bytes）。
