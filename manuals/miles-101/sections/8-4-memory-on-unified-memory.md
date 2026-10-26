# 统一内存上的内存管理和权重更新

> GB10 的 CPU 和 GPU 共用内存池，因此 offload 只是在同一内存池内移动数据，权重更新也不会离开芯片。

单 GPU 无法同时为 trainer 和 rollout engine 保留它们所需的全部内存。Miles 让两端轮流运行。本节解释每轮如何释放内存、权重更新如何工作，以及 GB10 为什么会改变这两种操作。

读完本节后，你可以解释在共享内存机器上 offload 和权重更新如何工作。

## 两端轮流运行 {#s-memory-on-unified-memory-two-sides-take-turns}

启用 `--colocate` 后，trainer 和 engine 共用一张 GPU。每一步的顺序如下：

1. engine 为当前训练步骤生成答案。
2. engine 释放内存。
3. trainer 加载自己的状态、计算 log probability 并执行训练。
4. trainer 释放状态。
5. engine 再次加载并接收新权重。

`--colocate` 也会为两端启用 offload。`--offload-rollout-level` 用于设置 engine 释放哪些内存。默认值包含两个内存标记：`kv_cache`，即 attention key 和 value 的缓存；以及 `weight`，即模型权重。

```figure
id: fig-8-4
kind: timeline
title: engine 和 trainer 轮流使用同一内存
claim: 任一时刻只有一端占用 GPU 内存，计时统计显示每步交接约耗时 2 s。
caption: 启用 heat guard 前一次 48 步运行的阶段中位耗时，按比例绘制。
```

## 普通机器和 GB10 上的 offload {#s-memory-on-unified-memory-offload-on-a-normal-machine-and-on-a-gb10}

在 GPU 和 CPU 内存分离的机器上，offload 需要通过总线将数据从 GPU 内存复制到 CPU 内存。复制过程会带来成本。

GB10 上没有独立的第二个内存池，GPU 和 CPU 共用 128 GB 内存。因此 offload 会释放 GPU 分配，但数据仍留在同一内存池中。Qwen3-0.6B 运行 48 步时，trainer 将状态移到主机内存的中位耗时为 0.76 s，移回来的中位耗时为 0.87 s。相较于超过两分钟的训练步骤，这个耗时很短。

训练前释放 engine 没有计时器。权重更新后恢复 engine 的耗时记录在 `perf/finalize_and_resume_engines_time`。

我们的判断是：GB10 上 trainer offload 和 onload 的耗时有一部分可能来自设置工作，而非数据复制。我们没有测量两者的占比。

## 权重更新不会离开 GPU {#s-memory-on-unified-memory-the-weight-update-stays-inside-the-gpu}

训练结束后，engine 需要获取新权重。启用 `--colocate` 时，trainer 会把 GPU tensor 的句柄交给 engine，由 engine 直接复制数据。权重不会经过网络传输。

trainer 会按 bucket 发送权重。`--update-weight-buffer-size` 用于设置 bucket 大小，我们的训练使用 512 MiB。Qwen3-0.6B 权重更新耗时为 0.64 s，Qwen3-1.7B 为 0.91 s，均不到一个训练步骤的百分之一。数据表见[第 2.4 节](#s-size-the-weight-update)。

## 共享内存会改变 Ray 读取的数值 {#s-memory-on-unified-memory-one-pool-changes-what-ray-sees}

共享内存也会影响其他工具读取的数值。Ray 会读取整台节点的内存。GB10 上的统计值包括模型权重、optimizer 状态和 KV cache。因此，Ray 可能在任何单个 GPU 分配失败之前就停止 trainer。GB10 上的 Ray 停止是真实的警告，说明整台节点的内存都接近耗尽。[第 2.3 节](#s-stop-ray-killing-the-job)展示了停止情况，以及如何降低训练的内存需求。

## 尚未确认的事项 {#s-memory-on-unified-memory-what-we-do-not-know-yet}

GB10 上，在两个阶段之间保持 engine 加载状态只节省了很少的 rollout 时间。我们使用一个随机种子在同一天运行了两次。在两次运行都干净的步骤中，每次约一分钟的 rollout 节省了 0.6 至 1.8 s。运行详情见[第 2.2 节](#s-choose-what-to-offload)。

```takeaways
- 使用 --colocate 时，engine 和 trainer 轮流工作；offload 决定每一端释放什么资源。
- GB10 上的 offload 释放的是同一内存池中的 GPU 分配，权重更新也在 GPU 内部复制。
- 将 GPU 分配计入节点内存，并把 Ray 内存停止视为真实的资源不足。
```

来源：Miles main 08752a12 中的 placement、offload 和权重更新代码；capture/gpu/miles_grpo.py；capture/gpu/summary/miles-gb10-lab.json (runs.e4-0.6b、runs.e4-1.7b、runs.plain-48)；capture/gpu/out-gb10/ray-oom-4b.log。
