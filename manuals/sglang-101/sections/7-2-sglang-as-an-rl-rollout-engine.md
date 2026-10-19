# 用 SGLang 作为强化学习 rollout 引擎

> 强化学习中，服务器成为训练循环的一部分，其内存、权重与对数概率都成为训练器的问题。

你用 GRPO 训练模型。每一步，推理服务器生成数千条答案，奖励函数评分，训练器更新权重。下一批 prompt 到来时，服务器必须使用新权重，还要与训练器共享刚用过的 GPU。面向聊天的推理引擎，从未需要主动归还内存、运行中更换权重，也从未需要与另一个程序的数值精确到最后一位。

读完本节，你能描述 SGLang 作为 rollout 引擎的一次 RL 步骤，说出各阶段调用的端点，选择权重传输方式，说明“true on-policy”覆盖和未覆盖的范围。示例为 Miles v0.1.2（commit `a22fd824`），RadixArk 在 SGLang 之外维护的 RL 框架。

## 用不匹配数值训练的代价清单

Miles 是 THUDM 强化学习框架 slime 的 fork，保留了 slime 历史。RadixArk 将其描述为“面向大规模模型后训练的企业级强化学习”。文档从未定义“企业级”，代码中则体现在三点：rollout 与训练之间的正确性检查、引擎故障恢复、可观测性。

这些能力之所以存在，是因为 RL 改变了推理服务器的角色。服务器输出就是训练数据，它报告的对数概率就是 PPO、GRPO 比率中的“旧策略”。因此 SGLang 内核与训练器内核的任何数值差异，都会成为梯度偏差。Miles 就像一张账单，记录使用并非由服务器实际产出的那套数值训练时，需要支付的代价。

## 借用服务器的循环

训练 driver 有意保持简短。v0.1.2 的 `train.py` 共 175 行，训练器与 SGLang 共享 GPU 时，一步包含以下代码：

```python
for rollout_id in range(args.start_rollout_id, args.num_rollout):
    await inference_controller.prepare_rollout(rollout_id)
    rollout_data_pack = await rollout_executor.get(rollout_id)

    if args.offload_rollout:
        ...
            offload_tags = [GPU_MEMORY_TYPE_CUDA_GRAPH]
            if "kv_cache" in args.offload_rollout_level:
                offload_tags.append(GPU_MEMORY_TYPE_KV_CACHE)
            if "weight" in args.offload_rollout_level:
                offload_tags.append(GPU_MEMORY_TYPE_WEIGHTS)
            await inference_controller.offload(tags=offload_tags)
    ...
        await actor_model.train(rollout_id, rollout_data_pack)
    ...
            await offload_train()
            if args.offload_rollout:
                await inference_controller.onload_weights()
        await update_weights(args, actor_model, rollout_executor, inference_controller, rollout_id=rollout_id)
        if args.offload_rollout:
            await inference_controller.onload_kv()
```

把它理解成租借。SGLang 生成 rollout 并评分，释放 CUDA graphs、KV 缓存和权重。训练器加载、训练，再卸载自己。SGLang 恢复权重内存、接收新权重，最后恢复 KV 缓存和 CUDA graphs。[图 7.2b](#fig-7-2b) 展示每阶段哪些内存位于 GPU。

```figure
id: fig-7-2b
kind: timeline
title: 一次同置 RL 步骤中的 GPU 内存
claim: 该模式下 SGLang 与训练器不会同时占用 GPU，新权重到达后 SGLang 才恢复 KV 缓存。
caption: 从左向右读，每列为 train.py 的一个阶段。填充单元格表示内存在 GPU 上。依据 Miles v0.1.2 的 train.py 与 inference_controller.py。
```

## 原版 SGLang 为训练器提供什么

租借通过原版 v0.5.22 已有的 HTTP 端点工作 {{code}}。SGLang 的 RL 指南将设计原则概括为“做库，不做框架” {{docs}}。Miles 通过 HTTP，将每个引擎作为普通 `sglang serve` 进程驱动。

**内存释放：** `POST /release_memory_occupation` 按标签释放 GPU 内存，`POST /resume_memory_occupation` 恢复。服务器需要默认关闭的 `--enable-memory-saver`。标签包括 `kv_cache`、`weights`、`cuda_graph`。文档只列前两个，代码接受三个，以代码为准。Memory saver 释放物理内存但保留虚拟地址，因此已捕获的 CUDA graphs 无须重新捕获仍有效。调用会断言服务器空闲，所以应先暂停生成。

**暂停与恢复：** `POST /pause_generation` 接受一个 mode。SGLang 默认 `abort`，终止全部运行请求。Miles 默认使用 `retract`，把请求放回等待队列，更新后重新 prefill。第三种 `in_place` 则保留旧权重产生的 KV 缓存。

**权重更新会话：** 先 `begin_weight_update`，然后一次或多次 `update_weights_from_*`，最后 `end_weight_update`。量化层加载后需要一次性重新打包，因此更新被组织成会话。每次 refit 只打包一次，比每个 bucket 都打包便宜。会话结束后，`update_weight_version` 写入新版本。跨越 refit 的请求会在 `meta_info` 中报告 `weight_versions` 区间，让你知道哪些 token 来自哪套权重。[图 7.2](#fig-7-2) 展示默认传输方式的一次更新。

```figure
id: fig-7-2
kind: sequence
title: Miles 与 SGLang 之间的一次权重更新
claim: 权重更新是会话：暂停、开始、发送所有 bucket、结束并重打包一次、设置版本、恢复。
caption: 从上往下读。默认 NCCL 广播传输时，第 3、4 行按 bucket 重复。依据 Miles v0.1.2 的 weight_update/session.py、protocols/broadcast.py，以及 SGLang v0.5.22 的 http_server.py 端点。
```

## 四种权重传输方式

Miles 通过 `--update-weight-transfer-mode` 选择传输 {{code}}：

| 模式 | 字节如何移动 | 适用场景 |
|---|---|---|
| `broadcast`（默认） | 每个流水线阶段一个 NCCL 组，训练器 rank 0 向所有引擎 GPU 广播各 bucket | 训练器与引擎使用独立 GPU |
| `broadcast_packed` | 同一通信组，每个 bucket 使用一个扁平字节张量 | Megatron，非同置部署 |
| `p2p` | Mooncake 通过 RDMA 写入各引擎 rank 公布的 GPU 地址 | 多节点 MoE |
| `disk-delta` | checkpoint 变化字节写入共享存储，各引擎修补本地副本 | 无 RDMA、NCCL 路径 |

设置 `--colocate` 后，Miles 忽略该参数，始终通过 `/update_weights_from_tensor` 发送 CUDA IPC handle。同置运行却设置 `p2p` 的团队，测的实际不是以为的路径，且可能毫无察觉。

**Miles 团队报告**了 H100 集群、1 GB bucket 的 P2P 计时 {{team 2026-10}}。8 节点 Qwen3-235B-A22B 从 NCCL 广播的 10,754 降至 3,162 ms，减少 71%；32 节点 Kimi-K2 从 53,279 降至 7,227 ms，减少 86%。单节点 P2P 却更慢：GLM-4.7-9B-Flash 多花 68.6%，四层 GLM-5 测试多花 72.2%。原因来自设计：广播向每个引擎 rank 发送完整模型，而专家并行下每个 rank 只需要其中一部分。

**RadixArk 报告**，每步约 2% 的 BF16 参数发生变化 {{team 2026-08}}。GLM-4.7-Flash 的 disk-delta 载荷从每次更新 62.4 GB 降至 0.69 至 0.83 GB，生成暂停 3 至 5 s。这些数字来自 2026-08-18 的 Miles v0.1 文章，我们没有复现。

**我们的建议：** 从单节点同置部署的 CUDA IPC 路径开始。只有 rollout 耗时主导步骤时，才改为独立 GPU。只在厂商表格展示收益的多节点 MoE 使用 `p2p`，其他场景保留 `broadcast`。

## True on-policy 的范围与边界

这里推理引擎和训练器必须对一个数字达成一致。给 SGLang 与 Megatron 或 FSDP 相同权重和 token，内核仍可能因归约顺序不同，返回不同对数概率。此时 PPO 比率混合了“策略改变”和“内核不同”两件事。Miles 用 `train/train_rollout_logprob_abs_diff` 报告差距，true on-policy 模式应精确为 0。

先记住 SGLang 的两点。其返回的对数概率经过温度缩放，除非请求是贪心，或设置了 `SGLANG_RETURN_ORIGINAL_LOGPROB`，见[第 4.6 节](#s-deterministic-inference-and-logprobs)。训练器按温度 1 比较时，会出现与内核无关的不匹配。其次，v0.5.22 的 `--rl-on-policy-target` 只接受 `fsdp`，并强制确定性推理 {{code}}。它将矩阵乘法、softmax、归一化替换为 batch 不变版本，强制 PyTorch 采样器；除非注意力后端为 `fa3`、`fa4`、`triton`、`ascend`，否则关闭基数缓存。

Miles 在此基础上，通过启动计划为两端设置匹配参数。覆盖范围很窄。v0.1.2 唯一模型 profile 是 Qwen3 稠密：Qwen3-0.6B、Qwen3-4B、Qwen3-4B-Base、Qwen3-4B-Instruct-2507。Miles 仓库三个开放 issue 展示位级一致仍在哪些地方失效：

- **Issue #1485：** TP2 下 Qwen3-4B `down_proj` 输出不同。SGLang 把 38 个部分结果分成两组，每组 19 个求和；Miles 使用两两求和树。BF16 加法不满足结合律 {{issue radixark/miles#1485}}。
- **Issue #3714：** 确定性服务将 NCCL 通道上限固定为 8，训练器却使用 24，权重传输因此失败：`Message truncated : received 6144 bytes instead of 2048` {{issue radixark/miles#3714}}。
- **Issue #3277：** 回撤后，新权重下重新 prefill 覆盖了已记录 MoE 路由，响应于是携带新路由与旧对数概率 {{issue radixark/miles#3277}}。

**我们的建议：** 将 true on-policy 当作 Qwen3 稠密模型的诊断工具，不是所有运行都能开的开关。但每次运行都应记录对数概率差距。大差距表示转换或内核问题，RL 算法无法修好它。

## 我们在 GB10 上用 Miles 测到了什么

我们在单张 NVIDIA GB10 上，使用 `radixark/miles:latest` 镜像运行 GRPO。镜像内 Miles commit 为 `08752a12`，SGLang 为 `0.5.22.dev46+g7b6993a`。模型为 `Qwen/Qwen3-0.6B`，任务 GSM8K，FSDP 与 SGLang 同置于唯一 GPU。12 步中，每步抽取 32 个 prompt，各采样 8 次，响应上限 1,024 token，温度 1。SGLang 内存比例为 0.4。

```listing
title: Miles 日志记录的一次 GRPO 步骤
source: capture/gpu/out-miles/plain-excerpt.log
lang: text
note: 首步 rollout 与训练指标、一次权重更新和一条警告。长行截断。
---
metrics.py:94 - perf 0: {'rollout/raw_reward_unfiltered': 0.62890625, 'rollout/num_training_samples': 256, 'rollout/episode_raw_reward': 0.62890625, 'rollout/episode_response_length/mean': 739.92578125, 'rollout/episode_response_length/median': 759.5, 'rollout
{'train/loss': -4.656612873077393e-10, 'train/pg_loss': -4.656612873077393e-10, 'train/entropy_loss': 0.0, 'train/pg_clipfrac': 0.0, 'train/ppo_kl': 0.0, 'train/ess_ratio': 1.0, 'train/train_rollout_logprob_abs_diff': 0.015336457639932632, 'train/train_rollout_kl': 0.0006840902497060597, 'train/grad_norm': 0.5216571092605591, 'train/lr-pg_0': 1e-06, 'train/step': 0}
timer.py:42 - Timer update_weights end (elapsed: 0.7s)
[2026-10-17 15:55:01] post-warmup freeze_gc failed
```

**我们按阶段测量步骤耗时。** SGLang rollout 中位数 57.2 s，约每秒 3,113 token。训练器随后用 25.2 s 重算对数概率，训练 80.3 s。通过 CUDA IPC 向 SGLang 更新权重只花 0.65 s。释放与恢复 SGLang 内存，中位数 1.7 s，最差 4.0 s。

```figure
id: fig-7-2c
kind: chart
title: GB10 上一个 GRPO 步骤的阶段耗时
claim: 单张 GB10 上，训练器阶段耗时为 SGLang rollout 的 1.8 倍，权重更新不到一秒。
caption: 12 步中各阶段秒数中位数。绿色为 SGLang 生成，紫色为训练器，琥珀色为两者之间的权重更新和内存释放。来源：capture/gpu/summary/miles-gb10.json。
```

这个规模下，rollout 不是瓶颈。单 GPU、0.6B 模型，更快的推理引擎最多节省约三分之一步骤时间。本节大量讨论的权重更新与内存释放，在 165 s 一步中仅占 2.4 s。

12 步的对数概率差距始终为 0.0143 至 0.0163。True on-policy 就是为了将它降至 0，普通模式不会改变它。原始奖励在 0.586 至 0.758 间波动。十二步不足以证明学习，应把这次运行看作计时和差距测量，而非训练曲线。

### 四十八步

随后我们以相同设置运行 48 步：内存比例 0.4、温度 1、一个默认 seed。随着步骤推进，策略开始学习，rollout 也变快了。

```listing
title: 48 步中的最后一次 GRPO 步骤
source: capture/gpu/out-miles/plain-48-excerpt.log
lang: text
note: 第 47 步的 rollout 与训练指标、调度器退出、任务状态。长行截断。
---
metrics.py:94 - perf 47: {'rollout/raw_reward_unfiltered': 0.79296875, 'rollout/num_training_samples': 256, 'rollout/episode_raw_reward': 0.79296875, 'rollout/episode_response_length/mean': 421.73046875, 'rollout/episode_response_length/median': 369.5, 'rollou
{'train/loss': -3.4924596548080444e-09, 'train/pg_loss': -3.4924596548080444e-09, 'train/entropy_loss': 0.0, 'train/pg_clipfrac': 0.0, 'train/ppo_kl': 0.0, 'train/ess_ratio': 1.0, 'train/train_rollout_logprob_abs_diff': 0.014126655645668507, 'train/train_rollo
Subprocess scheduler_0 (pid=3263) crashed with exit code -15. Triggering SIGQUIT for cleanup...
Job 'raysubmit_MKE9XLVeZ87U7iQV' succeeded
```

**我们测得**前 8 步平均原始奖励为 0.636，后 8 步为 0.758。回答变短了：平均长度从 724 降至 447 token，被 1,024 token 上限截断的样本比例从 0.33 降至 0.08。SGLang 需要生成的 token 更少，rollout 从每步 60.2 降至 32.7 s，速率从每秒 3,084 增至 3,501 token。

```figure
id: fig-7-2d
kind: chart
title: GB10 上四十八步 GRPO
claim: 48 步间，原始奖励均值从 0.636 升至 0.758，被截断样本占比从 0.33 降至 0.08。
caption: 一个 seed 下，各步原始奖励与被 1,024 token 上限截断的样本占比。均值取前 8 步和后 8 步。来源：capture/gpu/summary/miles-gb10.json。
```

这里只有一个 seed。相邻步骤奖励差可达 0.207，例如第 30 步 0.801，第 31 步 0.594。应看 8 步均值的趋势，不看单步。

对数概率差距没有消失。前 8 步为 0.0153，后 8 步为 0.0146，全部 48 步保持在 0.0138 至 0.0162。训练不会缩小这种差距，它来自 SGLang 与 FSDP 内核。Miles 中处理它的是 true on-policy 模式。

最后几行日志也需说明。SGLang 调度器打印 `crashed with exit code -15`，Ray job 随后却报告成功。-15 表示调度器收到 SIGTERM，这里发生在已完成任务结束时。应根据 job 状态告警，不要只看这一行。

相信运行结果前，还有两条日志值得认识。约 30% 样本触及 1,024 token 上限，因此奖励包含未写完就被截断的回答。启动时 SGLang 还打印一次 `post-warmup freeze_gc failed`，但后续训练正常，这里该警告没有造成可见损失。

### GB10 上 true on-policy 未能启动

随后我们按 Miles Triton 示例的参数设置 `--true-on-policy-mode`。SGLang 启动了，训练器却在 launcher 开始 61 秒后停止。

```listing
title: FSDP 训练器拒绝 Triton 注意力
source: capture/gpu/out-miles/true-on-policy-error.log
lang: text
note: 首条 launcher 日志、训练器错误与失败初始化。长行截断。
---
[2026-10-17 16:28:41.340 launcher] common.py:290 - EXEC: mkdir -p /root/lab/mode
ValueError: Specified `attn_implementation="triton"` is not supported. The only possible arguments are `attn_implementation="eager"`, `"paged|eager"`, `"attn_implementation=flash_attention_2"`, `"attn_implementation=paged|flash_attention_2"`, `"attn_implementa
[2026-10-17 16:29:42.606 trainer_controller_actor] cell.py:251 - ft op=execute phase=fail cell=trainer-engine-actor-00000 fn=init elapsed_s=0.7
```

参数值来自错误示例。FSDP actor 只有 `torch.version.hip` 有值，即 AMD GPU 时，才开启 SGLang Triton 注意力桥接 {{code}}。NVIDIA GPU 上该值直接传给 transformers，而它没有名为 `triton` 的注意力。

Miles 唯一的 true on-policy 契约，要求 SGLang `fa3` 与 FSDP `flash_attention_3` 配对 {{code}}。这个镜像能导入 FlashAttention 3 包，但 `sgl_kernel` 报告 `Can not import FA3 in sgl_kernel`。我们按契约参数重跑，观察停止位置。

```listing
title: GB10 上的契约参数
source: capture/gpu/out-miles/true-on-policy-fa3-error.log
lang: text
note: SGLang 启动、失败，以及随后 rollout 错误中的首条与末条。省略进程前缀。
---
[2026-10-17 21:03:03] Enable deterministic inference because of legacy rl_on_policy_target.
AssertionError: FlashAttention v3 Backend requires SM>=80 and SM<=90. Please use `--attention-backend flashinfer`.
[2026-10-17 21:03:24] Received sigquit from a child process. It usually means the child failed.
[2026-10-17 21:03:30.637 rollout_executor] http_utils.py:241 - Error: Server error '503 Service Unavailable' for url 'http://172.17.0.3:20035/generate'
[2026-10-17 22:06:46.137 rollout_executor] http_utils.py:241 - Error: Server error '503 Service Unavailable' for url 'http://172.17.0.3:20035/generate'
```

SGLang 启动 21 秒后停止。其 FA3 后端只接受 SM 8.0 至 SM 9.0 GPU，GB10 却是 SM 12.1。因此 v0.1.2 的 true on-policy 在 GB10 上无论传什么参数都无法启动。

后面发生的事更值得记住。Rollout 引擎已退出，Miles job 却未停止。Rollout 循环持续向路由器请求，路由器回复 `503 Service Unavailable`。63 分钟内日志留下 199,685 条此类错误，直到我们停止容器。任务从未报告失败，GPU 全程空闲。

**针对 GB10 结果，我们的建议：** 计划 true on-policy 运行前，确认 GPU 和镜像具备契约两端的内核。随后观察 SGLang 服务器日志，不要只看训练器，因为已死的 rollout 引擎可能看起来只是慢。v0.1.2 的契约意味着两端使用 FlashAttention 3，这是一条面向 Hopper GPU 的路径。

## Miles 使用自己的 SGLang

Miles 不使用本手册其他章节描述的 SGLang 发布版。Docker 镜像基于 `lmsysorg/sglang:v0.5.21`，检出 `sglang-miles` 分支。v0.1.2 release lock 固定 SGLang commit `b84bec5761a6`。Miles 文档明确说：“在 Miles 旁安装原版 `sglang` 或上游 Megatron-LM 无法工作。” {{docs}}

Miles 调用的至少四项能力在 v0.5.22 不存在：disk-delta 的 `/pull_weights` 端点、`register_lora_adapter`、`get_parallelism_info`、`--true-on-policy-contract` 参数。

这个分支本身就概括了本节：RL 向推理引擎提出了普通服务用户从未提出的要求。引擎必须归还内存、在会话中换权重，报告各 token 来自哪套权重，与另一个程序位级一致。其中部分要求已进入原版 SGLang，其余仍在分支中等待成熟。

**真实事故：** Miles issue #860 报告，滑动窗口注意力模型的 `/release_memory_occupation`“静默无效” {{issue radixark/miles#860}}。滑动窗口 KV 池在构造函数中关闭 memory saver，因此 Megatron 启动时，同置运行会内存耗尽。一位用户看到 DeepSeek-V4-Flash 的 30.19 GB KV 池始终驻留。2026-10-16 时 issue 仍开放。相信同置部署前，先确认新模型的每个内存标签都真的释放了内存。

```takeaways
- 固定 Miles 镜像及其 release lock，不要混入原版 SGLang。
- 释放内存前暂停生成，因为释放调用要求服务器空闲。
- 从单节点同置部署开始，注意 `--colocate` 会覆盖传输模式。
- 仅在多节点 MoE 中选择 `p2p`，并先测权重更新时间。
- 每次运行记录 rollout 与训练的对数概率差距，不要期待训练自行消除它。
- 根据多步均值读奖励，单步变化可达 0.2。
- 训练器按温度 1 比较时，设置 `SGLANG_RETURN_ORIGINAL_LOGPROB`。
- v0.1.2 将 true on-policy 视为 Qwen3 稠密模型诊断工具。
- 检查 GPU 与镜像是否具备 true on-policy 契约两端内核。
- 针对 rollout 服务器自身错误告警，因为训练器可能持续等待已经退出的引擎。
```

来源：Miles at v0.1.2 (a22fd824): train.py, release-lock.json, docker/Dockerfile, docs/developer/versions.md, miles/ray/rollout/inference_controller.py, miles/backends/training_utils/weight_update/protocol.py, session.py, protocols/broadcast.py, protocols/cuda_ipc.py, protocols/p2p.py, protocols/delta.py, miles/true_on_policy/model_profiles.py, docs/advanced/p2p-weight-transfer.md; SGLang at v0.5.22: python/sglang/srt/entrypoints/http_server.py, python/sglang/srt/managers/io_struct.py (PauseGenerationReqInput), python/sglang/srt/managers/scheduler_components/weight_updater.py, python/sglang/srt/constants.py, python/sglang/srt/arg_groups/fields/exec_.py, python/sglang/srt/arg_groups/choices.py, python/sglang/srt/arg_groups/attention_hook.py, python/sglang/srt/layers/logprob_processor.py, docs/docs/advanced_features/sglang_for_rl.mdx; Miles issues #860, #1485, #3277, #3714; RadixArk and LMSYS posts: lmsys.org/blog/2025-11-19-miles and lmsys.org/blog/2026-08-18-miles-v0-1. Miles at 08752a12: miles/backends/fsdp_utils/actor.py, miles/true_on_policy/schema.py, examples/infra_features/true_on_policy/run_simple.py and run_simple_amd_triton.py. capture/gpu/miles_grpo.py, capture/gpu/miles_summary.py, capture/gpu/out-miles/plain-excerpt.log, capture/gpu/out-miles/plain-48-excerpt.log, capture/gpu/out-miles/true-on-policy-error.log, capture/gpu/summary/miles-gb10.json. capture/gpu/out-miles/true-on-policy-fa3-error.log.
