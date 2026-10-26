# 用 FP8 执行 rollout，用 BF16 训练

> FP8 rollout 可以降低生成成本，但会加大 trainer 和 engine 的差异，因此需要进行校正。

rollout 通常是每一步中最耗时的阶段。engine 使用 FP8 时，每个权重读取的字节数会减半。trainer 仍使用 BF16 权重，因此两端会有意使用不同精度计算。

读完本节后，你可以选择低精度模式，并了解应搭配哪种校正方法。

我们没有在 GB10 上运行 FP8 rollout。本节内容来自 Miles 低精度文档和参数说明。

## 选择模式 {#s-roll-out-in-fp8-pick-a-mode}

Miles 文档列出了四种混合精度方式：

| 模式 | Rollout | 训练 | 适用情况 |
|---|---|---|---|
| 1 | FP8 | BF16 | 希望降低 rollout 成本，并尽量少改训练配置 |
| 2 | FP8，block-wise | FP8，block-wise | rollout 和训练都需要加速 |
| 3 | MXFP8 | MXFP8 | 在数据中心 Blackwell GPU 上训练 |
| 4 | NVFP4 | NVFP4 | 在数据中心 Blackwell GPU 上训练 MoE 模型的 routed expert |

从模式 1 开始。它只更改 engine 加载的 checkpoint。

模式 1 最容易上手，但并非适用于所有情况。我们没有测试以下限制，它们来自公开报告：

- 2026 年的一项研究发现，rollout 少于约 4K token 时，FP8 rollout 和 BF16 训练的结果与 BF16 相近。达到 8K token 时，结果开始偏离；达到 16K token 时，训练崩溃。对于基础模型难以完成的任务，失败会更早出现。
- Miles 团队及合作方发布的文章显示，MoE 模型从 30B 增长至 1T 参数时，这种差异也会增加。他们建议使用两端均为 FP8 的模式 2。
- 另一个 RL 库提醒，小模型每次权重更新都需要量化权重，其成本可能高于 FP8 节省的时间。

[来源列表](#s-ref-sources)收录了这项研究、该文章和对应库的文档。

## 设置模式 1 {#s-roll-out-in-fp8-set-up-mode-1}

给 engine 提供 FP8 checkpoint，给 trainer 提供 BF16 权重：

- `--hf-checkpoint` 指向 FP8 checkpoint，由 engine 加载。
- trainer 加载 BF16 权重。使用 Megatron trainer 时，以 `--ref-load` 指向该权重。

模式 1 需要 Megatron trainer。FSDP trainer 也会从 `--hf-checkpoint` 加载自己的权重，因此如果使用 FSDP，两端都会加载 FP8 checkpoint。我们的 GB10 训练使用 FSDP，这也是我们没有运行模式 1 的原因之一。

**Block-wise FP8：**每个 128×128 权重块单独存储一个 scale 的格式。文档列出的支持设备包括 Hopper GPU、Blackwell B200 及更新型号，以及 AMD MI350X 和 MI355X。

使用 `--check-weight-update-equal --check-weight-update-allow-quant-error` 检查第一次权重更新。第二个 flag 允许检查忽略 FP8 带来的舍入误差。

## 搭配校正方法 {#s-roll-out-in-fp8-pair-it-with-a-correction}

FP8 舍入会扩大 trainer 和 engine 之间的差距。这部分差距无法通过 kernel 设置消除。文档建议 MoE 模型在模式 1 下搭配 routing replay，也可以使用带上限的 importance-sampling 校正：

- **带上限的 importance sampling：**`--use-tis --tis-clip 2.0` 根据 trainer 概率与 engine 概率的比值为每个 token 加权，并限制比值上限。
- **Routing replay：**MoE 模型应添加 `--use-rollout-routing-replay`，避免 FP8 舍入同时改变 expert 选择。[第 3.4 节](#s-train-a-moe-model)对此有详细说明。

[第 8.2 节](#s-the-correction-methods)比较了这些校正方法。

## 测量内容 {#s-roll-out-in-fp8-what-to-measure}

比较启用和关闭 FP8 rollout 时第 0 步及后续几步的差距。还要测量 rollout 耗时，因为我们没有小模型使用 FP8 的性能数据。

模式 3 和模式 4 的文档支持列表包括 B200、B300、GB200 和 GB300。GB10 不在此列表中，也不支持 block-wise FP8，因此我们无法按文档要求测试这些模式。

```takeaways
- 从 FP8 rollout 和 BF16 训练开始；长 rollout、困难任务和大型 MoE 模型可能出现问题。
- 启用量化容差，检查第一次权重更新。
- MoE 模型应启用 routing replay；差距扩大时，使用带上限的 importance-sampling 校正。
```

来源：Miles main 08752a12 中的 FSDP actor (trainer 权重从 hf_checkpoint 参数加载)、低精度文档、权重更新检查参数和 importance-sampling 参数；Jet-RL，arXiv 2601.14243；Unified FP8，LMSYS blog，2025-11-25；SkyRL quantized rollouts 文档。
