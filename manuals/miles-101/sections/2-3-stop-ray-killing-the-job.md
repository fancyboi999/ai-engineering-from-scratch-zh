# 避免统一内存上的 Ray 停止训练

> GB10 上的 GPU 分配和主机共用内存，因此 Ray 因内存停止训练，表示整台机器确实接近内存上限。

我们的 Qwen3-4B 训练完成第一次 rollout 后，在该步骤的训练阶段停止，距离启动约 15 分钟。日志中没有 CUDA out-of-memory 错误。由于节点内存几乎耗尽，Ray 停止了 trainer。

读完本节后，你可以识别 Ray 的内存停止，并降低训练所需的内存。

**我们的结果：**Ray 两次停止了 4B trainer，节点内存分别达到 121.69 GB 中的 115.86 GB 和 119.18 GB。这两次都是真实的内存压力。

## 查看停止信息 {#s-stop-ray-killing-the-job-read-the-kill-message}

修改设置前，先在日志中搜索 `OutOfMemoryError`。Ray 的内存停止信息会指出节点，而不是 GPU：

```listing
title: Ray 停止 Qwen3-4B 训练的 trainer
source: capture/gpu/out-gb10/ray-oom-4b.log
lang: text
note: 第一行给出节点内存使用比例。表格列出占用最大的进程。最后一行列出控制停止行为的两个设置。
---
(TrainerController pid=2656) ray.exceptions.OutOfMemoryError: 1 worker(s) were killed due to the node running low on memory. Memory on the node (IP: 172.17.0.3, ID: 08904870a17c5413c623abfc21db2e7fcfdc39d5be90e997b2391f37) was 115.86GB / 121.69GB (0.952127)
(TrainerController pid=2656) Top 10 memory users: PID	MEM(GB)	COMMAND
(TrainerController pid=2656) 2657	36.77	ray::FSDPTrainRayActor.train
(TrainerController pid=2656) 3402	2.73	sglang::scheduler
(TrainerController pid=2656) 2650	1.33	ray::RolloutExecutor
To adjust the kill threshold, set the environment variable `RAY_memory_usage_threshold` when starting Ray. To disable worker killing, set the environment variable `RAY_memory_monitor_refresh_ms` to zero.
```

节点使用了 121.69 GB 中的 115.86 GB，即 95.2%。trainer 进程本身占用 36.77 GB。其余已用内存没有显示在进程列表中。

## 为什么 GB10 上会发生这种情况 {#s-stop-ray-killing-the-job-why-this-happens-on-a-gb10}

GB10 上的 CPU 和 GPU 共用一个内存池。Ray 读取的是整个节点的内存，因此 GPU 分配也会计入 Ray 监控的使用量，包括模型权重、optimizer 状态和 KV cache。这可以解释进程列表中没有显示的那部分内存。我们没有测量各部分具体占用。

Ray 读取的内存占用是真实的。达到 100% 时，整台机器都没有剩余内存。因此使用率达到 95% 时 Ray 停止训练，说明任务无法装入内存，并非误报。

```figure
id: fig-2-3
kind: layers
title: Ray 读取 GB10 整台机器的内存
claim: GB10 上的 Ray 会读取整个节点的内存，因此停止训练时表示机器已接近内存上限。
caption: Ray 停止第一次 4B 训练时读取的内存占用，以单个长条表示。
```

## 降低训练所需的内存 {#s-stop-ray-killing-the-job-lower-the-memory-the-run-needs}

应调整训练本身，不要修改内存监控器：

1. 使用更小的模型。在我们的 GB10 上，只有更小的模型能避免内存停止。
2. 减少每步的工作量，例如减少 prompt 数、每个 prompt 的答案数，或缩短答案。我们没有在 4B 模型上测试这些做法。
3. 降低 engine 内存占用。`--sglang-mem-fraction-static` 用于设置 rollout engine 使用的 GPU 内存比例。在我们的 4B 测试中，将该值从 0.4 降到 0.2 仍未能避免停止。

日志中还列出了 `RAY_memory_usage_threshold`。在统一内存设备上不要调高这个值。阈值越高，节点就越接近内存耗尽。如果节点真的耗尽内存，操作系统可能会停止机器上的任意进程，而且不会留下 Ray 消息供你查看。

我们使用 `--sglang-mem-fraction-static 0.2` 和默认 Ray 阈值再次运行相同的 Qwen3-4B 任务。Ray 再次停止了训练，节点内存达到 119.18 GB。trainer 进程占用 36.75 GB，与第一次几乎相同，因此减少 engine 的内存比例并没有腾出足够空间。[第 2.1 节](#s-pick-a-model-size)介绍如何选择合适的模型大小。

```takeaways
- 修改设置前，先查看 Ray 的 OutOfMemoryError 日志。
- 在统一内存设备上，应把 Ray 的内存停止视为真实的内存不足。
- 使用更小的模型或减少每步工作量，并保留默认 Ray 阈值。
```

来源：capture/gpu/out-gb10/ray-oom-4b.log；capture/gpu/out-gb10/ray-oom-4b-timing.txt；capture/gpu/out-gb10/ray-oom-4b-lowmem.log；capture/gpu/summary/miles-gb10-lab.json (excluded.e4-4b)；e4-4b 训练日志中的 Ray 内存监控消息。
