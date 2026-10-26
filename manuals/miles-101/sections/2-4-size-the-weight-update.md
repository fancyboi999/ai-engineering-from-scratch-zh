# 评估权重更新的耗时

> 在一张 GPU 上，权重更新耗时很短且相对固定，因此不应优先调优它。

每个训练阶段结束后，trainer 会把新权重复制到 rollout engine。在一张 GPU 上，这次复制仍在 GPU 内完成。我们测试的模型耗时都不到一秒。

读完本节后，你可以测量权重更新耗时，并判断它是否影响自己的训练。

**我们的结果：**Qwen3-0.6B 的权重更新耗时 0.64 s，Qwen3-1.7B 耗时 0.91 s，均不到一个训练步骤的百分之一。

## 查看权重更新时间 {#s-size-the-weight-update-read-the-update-time}

每一步都会将权重更新时间（秒）写入 `perf/update_weights_time`。对照 `perf/step_time` 查看。我们让两种模型各运行 4 个短步骤，答案长度上限为 256 token：

| 模型 | 4 步内的权重更新耗时 | 第 2、3 步的 trainer offload | 第 2、3 步的 trainer onload |
|---|---|---|---|
| Qwen3-0.6B | 0.63 to 0.66 s | 1.08 to 1.20 s | 0.77 to 0.86 s |
| Qwen3-1.7B | 0.89 to 0.95 s | 2.63 to 3.20 s | 1.42 to 1.45 s |

第 0 和第 1 步是预热步骤。在这两次 4 步训练中，它们的 trainer offload 最长分别耗时 4.1 s 和 11.8 s。表格不包含这两步。

**Trainer offload：**训练后 trainer 把权重和 optimizer 状态移到主机内存所需的时间，记录在 `perf/sleep_time`。**Trainer onload：**下一次计算 log probability 前把这些状态移回来的时间，记录在 `perf/wake_up_time`。

较大的模型约为前者的 2.8 倍，而权重更新时间约为 1.4 倍。trainer offload 和 onload 的增长幅度更大。可能的原因是权重更新只传输权重，offload 还要移动梯度和 optimizer 状态。

由于答案长度上限较短，几乎每个回答都被截断，因此这些运行中的 reward 接近 0。这些测试用于测量复制耗时，不代表训练效果。

```figure
id: fig-2-4
kind: chart
title: 更大的模型使 offload 比权重更新增长得更多
claim: 模型从 0.6B 增至 1.7B 时，权重更新耗时增长 1.4 倍，而 trainer offload 增长 2.6 倍。
caption: 各模型在两步预热后的第 2、3 步平均耗时，单位为秒。
```

## 与训练步骤总耗时比较 {#s-size-the-weight-update-compare-it-with-the-step}

在 Qwen3-0.6B 的 48 步训练中，完整步骤的中位耗时为 152.6 s，权重更新耗时为 0.64 s，不到步骤总耗时的 0.5%。1.7B 模型的占比也相近。

因此先调优 rollout 和训练阶段。只有权重更新超过步骤总耗时的几个百分点时，再考虑调整它。

## 有明确依据后再更改 bucket 大小 {#s-size-the-weight-update-change-the-bucket-size-only-with-a-reason}

trainer 会分批传输权重。`--update-weight-buffer-size` 设置每个 bucket 的字节数。我们的训练使用 536870912，即 512 MiB。

bucket 越大，传输次数越少，但更新时的内存峰值越高。在单 GPU 上，权重更新不到一秒，因此我们保留 512 MiB 的设置。

```takeaways
- 对每种模型大小，同时查看 perf/update_weights_time 和 perf/step_time。
- 先调优 rollout 和训练阶段，再考虑权重更新。
- 也要观察 trainer offload 和 onload，因为它们的耗时增长得更快。
```

来源：capture/gpu/summary/miles-gb10-lab.json (runs.e4-0.6b、runs.e4-1.7b、runs.plain-48)；capture/gpu/miles_grpo.py。
