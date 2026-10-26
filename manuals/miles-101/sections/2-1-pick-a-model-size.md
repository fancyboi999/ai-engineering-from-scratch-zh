# 为一张 GPU 选择模型大小

> 能在一张 GPU 上训练的最大模型，是 trainer 和 engine 两份拷贝同时放得下的模型。

读完本节后，你可以在启动前估算训练需要的内存，并选择能装下的最大模型。

**我们的结果：**在一张拥有 128 GB 共享内存的 GB10 上，Qwen3-1.7B 使用 256-token 答案上限运行了 4 个短步骤。Qwen3-4B 即使使用相同的短答案设置也无法装下。我们没有用 1,024-token 配置训练 1.7B 模型。

## 先估算 trainer 所需内存 {#s-pick-a-model-size-count-the-trainer-memory-first}

在 colocated 训练中，trainer 占用的内存最多。使用 Adam 做全量微调时，每个权重都要保存模型参数、梯度和两个 optimizer 状态值。混合精度下，激活值还未计入前，每个参数约需 16 字节。engine 还要额外保存一份权重和 KV cache。

| 模型 | trainer 状态估算 | 我们在 GB10 上的结果 |
|---|---|---|
| Qwen3-0.6B | 约 10 GB | 可以训练 |
| Qwen3-1.7B | 约 27 GB | 256-token 配置下可运行 4 步 |
| Qwen3-4B | 约 64 GB | 256-token 配置下两次都在第一步被 Ray 停止 |
| Qwen3-8B | 约 128 GB | 未尝试，超过机器可用内存 |

这个估算只是下限。激活值、engine 和进程开销还会占用额外内存。下面测得的节点内存显示了这些额外开销有多大。

```figure
id: fig-2-1
kind: chart
title: 1.7B 能运行短步骤，4B 则无法运行
claim: 4B 模型的 trainer 状态估算约占机器内存的一半，而两次 4B 训练都触发了 Ray 内存限制。
caption: 蓝色柱表示按每个参数 16 字节估算的内存。玫红色柱表示 Ray 停止两次 4B 训练时读取的节点内存。
```

## 4B 模型发生了什么 {#s-pick-a-model-size-what-happened-with-4b}

两次 4B 训练都在第一步的训练阶段被 Ray 停止，节点内存分别达到 121.69 GB 中的 115.86 GB 和 119.18 GB。第二次训练将 engine 内存比例从 0.4 降到了 0.2，但仍然触发停止。[第 2.3 节](#s-stop-ray-killing-the-job)展示了停止信息、GB10 上发生该问题的原因，以及应调整的设置。

## 选择模型大小 {#s-pick-a-model-size-choose-the-size}

1. 从能完成任务的最小模型开始。
2. 将参数量乘以 16 字节。在我们的 128 GB GB10 上，可运行范围落在估算值 27 GB 至 64 GB 之间。首次估算时，可以先按 GPU 内存的一半计算。
3. 使用真实答案长度运行 4 步。在主机上用 `free -g` 查看节点内存，或检查 Ray 的停止日志。在 GB10 上，`nvidia-smi` 不会报告内存容量。
4. 短跑仍有余量时，再尝试更大一档的模型。

要训练 4B 或更大的模型，需要更多 GPU（[第 6 部分](#s-split-rollout-and-training)），或采用能减少 optimizer 状态占用的配置。

## 用 LoRA 训练更大的模型 {#s-pick-a-model-size-train-a-larger-model-with-lora}

**LoRA：**low-rank adaptation。trainer 冻结模型权重，只训练若干层旁边的两个小矩阵。只有这些小矩阵需要梯度和 optimizer 状态。

LoRA 通常用于完整 trainer 状态无法装入内存的情况。在我们运行的 Miles 版本中，只有 Megatron trainer 支持 LoRA。本手册使用的 FSDP trainer 会在启动时拒绝 LoRA 配置。若要尝试：

1. 按[第 6.1 节](#s-split-rollout-and-training-choose-the-trainer)的说明切换到 Megatron trainer。
2. 添加 `--lora-rank 16`，或设置其他大于 0 的 rank。默认 rank 为 0，表示关闭 LoRA。
3. 只保留一个 adapter。启用 `--colocate` 时，Miles 只训练一个 adapter；多个 adapter 需要拆分布局。

engine 会使用 trainer 正在更新的同一个 adapter。我们没有在 GB10 上运行 LoRA 或 Megatron trainer，因此无法确认 4B 模型能否通过这种方式装入 128 GB 内存。

```takeaways
- 启动前按每个参数 16 字节估算 trainer 状态。
- 在 128 GB 的 GB10 上，先按最多运行 1.7B 模型来规划，并使用真实答案长度测试。
- 遇到 Ray 内存停止时，按第 2.3 节的说明缩小训练规模。
- 为更大模型租用更多 GPU 前，先尝试在 Megatron trainer 上使用 LoRA。
```

来源：capture/gpu/out-gb10/ray-oom-4b.log；capture/gpu/out-gb10/ray-oom-4b-lowmem.log；capture/gpu/out-gb10/gpu-check.txt；Miles main 08752a12 中的 LoRA 参数和文档；capture/gpu/summary/miles-gb10-lab.json (runs.e4-0.6b、runs.e4-1.7b、excluded.e4-4b、excluded.e4-4b-lowmem)。
