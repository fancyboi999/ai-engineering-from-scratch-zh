# 用 routing replay 训练 mixture-of-experts 模型

> routing replay 会让 trainer 使用 engine 选中的同一组 expert，使两端对每个 token 所用的权重达成一致。

在 mixture-of-experts 模型中，router 会为每个 token 选择若干 expert。engine 和 trainer 都会运行 router。极小的数值差异就可能让它们为同一个 token 选择不同的 expert，进而使用不同权重计算该 token。

读完本节后，你可以判断何时启用 routing replay，以及启用后应观察哪些指标。

我们没有在 GB10 上用 Miles 运行 mixture-of-experts 模型。本节内容来自 Miles 源码和发行说明。

## 为什么 MoE 模型的差距更大 {#s-train-a-moe-model-why-the-gap-is-worse-on-a-moe-model}

在 dense 模型中，两端的差距来自较小的舍入误差。在 MoE 模型中，同样的舍入误差可能改变 expert 的选择。选错 expert 会带来明显差异：token 会经过另一组权重，概率可能大幅变化。

因此，即使模型的 dense 部分运行一致，MoE 任务中的差距仍可能大于 dense 模型。

## 启用 routing replay {#s-train-a-moe-model-turn-on-routing-replay}

该 flag 只对 MoE 模型生效。按[第 1.1 节](#s-run-grpo-on-one-gpu-add-flags-to-a-run)的方式通过 `MILES_EXTRA_ARGS` 添加。正如[第 2.1 节](#s-pick-a-model-size)所示，Qwen MoE 模型太大，无法在一台 128 GB 机器上进行全量训练。我们的启动脚本只启动一张 GPU，因此请根据自己的 GPU 数量调整启动脚本，并传入相同的 flag：

```bash
-e MILES_EXTRA_ARGS="--use-rollout-routing-replay"
```

**Routing replay：**engine 在 rollout 期间记录每个 token 选择的 expert，trainer 在前向计算时使用同一组 expert。该 flag 只适用于 MoE 模型。

某些模型还需要匹配的 engine 设置。Miles 针对 GLM-5.3-Flash 的说明要求配合 replay 使用 `--sglang-moe-runner-backend triton`。

## Miles 团队报告的结果 {#s-train-a-moe-model-what-the-miles-team-reports}

Miles 团队在 8 台节点上运行 colocated MoE 任务，每台配备 4 张 GB300 GPU，并启用 routing replay。v0.1.1 发行说明列出了各个模型每个 token 的差距。[来源列表](#s-ref-sources)收录了该说明和 routing replay 论文。

| 模型 | 步数 | 使用 replay 时的差距 | Reward |
|---|---|---|---|
| Qwen3.8-Flash-Next | 5 | 0.0083 to 0.0131 | 0.47 to 0.75 |
| GLM-5.3-Flash | 3 | 0.0085 to 0.0098 | 0.50 to 0.72 |

Miles 文档中的 GLM-5.3-Flash 页面还报告了一次更长的运行，使用 16 台节点，每台配备 4 张 GB300 GPU。前 11 步的差距为 0.0068 至 0.0106。

这些结果来自我们没有的硬件，而且运行时间较短。可以把它们作为有效配置可能达到的范围，不要当作自己模型的性能承诺。

## 已知限制 {#s-train-a-moe-model-a-known-limit}

如果 engine 暂停请求，并在权重更新后重新执行 prefill，第二次 prefill 的路由结果可能覆盖之前记录的路由。Miles 有一个开放 issue 正在跟踪此问题。如果使用会撤回请求的暂停模式，应在每次权重更新后检查差距。

```takeaways
- 每次运行 mixture-of-experts 模型时都启用 routing replay。
- 逐步检查差距，并与未启用 replay 的运行比较。
- 确认模型使用 replay 时所需的 engine 设置。
```

来源：Miles main 08752a12 中的 routing replay 参数和 v0.1.1 发行说明；Miles GLM-5.3-Flash 模型文档；Rollout Routing Replay 论文，arXiv 2510.11370；Miles issue 3277。
