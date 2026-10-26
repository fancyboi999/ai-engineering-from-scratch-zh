# 在多张 GPU 间拆分 rollout 和训练

> 在多 GPU 环境中，rollout 和训练可以运行在不同设备上，再通过传输方式在两端传递权重。

在单 GPU 上，trainer 和 engine 轮流工作，权重更新是在 GPU 内部复制。在多 GPU 环境中，你可以让两端共用 GPU 并轮流运行，也可以为两端分配独立 GPU 并在它们之间传输权重。

读完本节后，你可以为多 GPU 训练选择设备布局和权重传输方式。

我们的 GB10 只有一张 GPU，因此无法进行这项测量。本节内容来自 Miles 源码和文档。

## 选择设备布局 {#s-split-rollout-and-training-choose-a-placement}

| 布局 | Flag | GPU 使用方式 | 两端是否互相等待 |
|---|---|---|---|
| Colocated | `--colocate` | trainer GPU 数和 rollout GPU 数中的较大值 | 是，每一步都会等待 |
| 拆分 | 不设置 `--colocate` | trainer GPU 与 rollout GPU 数量之和 | 是，除非启用 async training |

使用以下 flag 设置设备数量：

- `--actor-num-nodes` 和 `--actor-num-gpus-per-node` 用于设置 trainer 使用的 GPU。
- `--rollout-num-gpus` 用于设置拆分布局中 rollout 使用的 GPU。
- `--rollout-num-gpus-per-engine` 用于设置每个 rollout engine 使用多少张 GPU。

先使用 colocated。只有在 rollout 占据步骤的大部分时间，且你有足够的 GPU 时，才考虑拆分布局。拆分布局下，rollout 期间 trainer GPU 会空闲，除非你同时启用[第 4.1 节](#s-run-rollout-and-training-at-once)介绍的 async training。

## 选择权重传输方式 {#s-split-rollout-and-training-choose-how-the-weights-move}

拆分布局中，每次更新后权重都会离开 trainer GPU。通过 `--update-weight-transfer-mode` 选择传输方式：

| 方式 | 行为 | 所需条件 |
|---|---|---|
| `broadcast`，默认值 | 通过 NCCL 逐个发送 tensor | 无额外要求 |
| `broadcast_packed` | 将每个 bucket 打包成一次发送 | Megatron trainer 和拆分布局 |
| `p2p` | 使用 Mooncake 通过 RDMA 传输权重 | Mooncake 和 RDMA 网络 |
| `disk-delta` | 仅将变化的数据写入共享目录，再由各 engine 加载 | `--update-weight-disk-dir` |

启用 `--colocate` 时，Miles 会在 GPU 内部复制权重，因此传输方式设置不生效。

## 选择 trainer {#s-split-rollout-and-training-choose-the-trainer}

本手册使用 FSDP trainer，因为它可以直接加载 Hugging Face 模型目录。Miles 还支持另外两种 trainer，通过 `--train-backend` 选择：

| Trainer | 模型输入 | 模型并行 | LoRA |
|---|---|---|---|
| `megatron`，默认值 | 由 Hugging Face 目录转换一次得到的 Megatron `torch_dist` checkpoint | tensor、pipeline、context 和 expert 并行 | 支持 |
| `fsdp` | Hugging Face 目录 | 不支持。它会将权重和 optimizer 状态分片到数据并行 GPU 上，但每张 GPU 仍会运行完整层 | 不支持 |
| `torchtitan` | Hugging Face 目录，仅适用于 torchtitan 已实现的模型 | tensor、pipeline、context 和 expert 并行 | 不支持 |

本手册中的部分功能只支持 Megatron：使用 `--colocate` 的 fully async training、训练容错、MTP training，以及 `--ci-test` 的第 0 步检查。Miles 文档建议大型模型和多节点任务使用 Megatron。

**torch_dist：**Megatron 的 checkpoint 格式。它不依赖并行布局，因此之后可以更改布局，无需重新转换。

首次使用 Megatron 运行前，先转换模型。模型架构 flag 来自 Miles 对应模型文件，本例为 `qwen3-4B`：

```bash
cd /root/miles
MODEL_ARGS=$(python3 miles/utils/external_utils/model_args_utils.py qwen3-4B)
PYTHONPATH=/root/Megatron-LM python3 tools/convert_hf_to_torch_dist.py $MODEL_ARGS --hf-checkpoint /root/lab/models/Qwen3-4B --save /root/lab/models/Qwen3-4B_torch_dist
```

如[第 1.1 节](#s-run-grpo-on-one-gpu)所述，将实验目录挂载后，在容器内运行这些命令。我们的启动脚本只支持 FSDP。要使用 Megatron，请从 Miles 源码 `scripts` 目录中选择适用于模型的启动脚本。我们没有在 GB10 上运行 Megatron 或 torchtitan trainer，只把 Qwen3-0.6B 转换成了 `torch_dist`，并生成了 checkpoint 目录。

## 在多个节点上启动任务 {#s-split-rollout-and-training-start-a-run-on-more-than-one-node}

Miles 提交任务前，所有节点必须加入同一个 Ray cluster。Miles 启动脚本有两种处理方式：

- 每种节点角色使用一条命令。`worker` 命令会加入 head 节点的 cluster 并等待。`train` 命令会启动 head 节点、等待所有 GPU 就绪，然后提交任务。
- 在 head 节点上运行一条命令，通过 ssh 连接其他主机并将其加入 cluster。

使用自己启动的 Ray cluster 时，设置 `MILES_SCRIPT_EXTERNAL_RAY=1`。启动脚本会跳过自己的 `ray start`，只提交任务。在每个节点上将 `MASTER_ADDR` 设为 head 节点地址，让 Ray 和 trainer 使用正确的网络接口。之后通过 `--actor-num-nodes` 和 `--actor-num-gpus-per-node` 设置 trainer 规模。

[第 6.3 节](#s-survive-failures)列出了部分启动脚本与自建 Ray cluster 搭配时的已知问题。我们没有在多节点上运行 Miles。

## 拆分后要测量什么 {#s-split-rollout-and-training-what-to-measure-after-the-split}

- 对比 `perf/update_weights_time` 和 `perf/step_time`。在多机环境中，权重传输不再是单 GPU 内部复制。
- 通过 `perf/train_wait_time` 和 rollout 计时器检查两端的空闲时间。
- 使用新方法完成首次更新后，按[第 5.2 节](#s-check-the-first-step)的方式检查 trainer 和 engine 之间的差距。

```takeaways
- 从 colocated 开始，只有 rollout 占据步骤大部分时间时才拆分。
- 权重传输占据步骤较大比例之前，继续使用 broadcast。
- 拆分后测量权重更新时间和两端的空闲时间。
- 估算任务规模前先选好 trainer，因为只有 Megatron 支持模型并行和 LoRA。
```

来源：Miles main 08752a12 中的文件 docs/user-guide/training-backend.md、docs/user-guide/launch-script.md、miles/utils/external_utils/command_utils/ray_backend/backend.py、miles/utils/lora/arguments.py、tools/convert_hf_to_torch_dist.py、scripts/models/qwen3-4B.py、miles/ray/placement_group.py、miles/utils/arguments.py、miles/backends/training_utils/weight_update/protocol.py、miles/backends/training_utils/weight_update/protocols/broadcast.py、miles/backends/training_utils/weight_update/protocols/delta.py、miles/backends/training_utils/metrics/perf.py、docs/advanced/disaggregated-rollout.md、docs/advanced/p2p-weight-transfer.md；capture/gpu/out-gb10/live-check-summary.txt (2026-10-23 实测记录)。
