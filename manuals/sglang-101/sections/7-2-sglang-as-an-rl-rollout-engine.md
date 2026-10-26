# SGLang 作为 RL rollout 引擎

> 强化学习让服务器成为训练循环的一部分，因此它的内存、权重和对数概率都成为训练器必须处理的问题。

你用 GRPO 训练模型。每一步，推理服务器生成数千个回答，奖励函数打分，训练器更新权重。随后服务器必须用新权重回答下一批 prompt，而且使用训练器刚用过的同一批 GPU。为聊天构建的服务引擎，以前无须归还内存或在运行中替换权重，也无须与另一程序的数值逐位一致。

读完本节，你能描述 SGLang 作为 rollout 引擎的一步 RL 流程，并指出每阶段调用的 SGLang 端点。你也能选择权重传输方式，说明 true on-policy 覆盖什么、不覆盖什么。示例使用 Miles v0.1.2（提交 `a22fd824`），这是 RadixArk 与 SGLang 一同维护的 RL 框架。

## 用陈旧数值训练的代价 {#s-sglang-as-an-rl-rollout-engine-the-receipt-for-training-on-stale-numbers}

Miles 是 THUDM 的 RL 框架 slime 的 fork，保留了 slime 的历史。RadixArk 将其定位为面向大规模模型后训练的企业级强化学习框架。文档没有定义企业级；在代码中，它对应三件事：rollout 与训练之间的正确性检查、引擎故障恢复、可观测性。

这些能力存在，是因为 RL 改变了推理服务器的角色。服务器输出就是训练数据。其报告的对数概率是 PPO 和 GRPO 比率中的旧策略。因此，SGLang 内核与训练器内核的任何数值差异，都可能成为梯度偏差。Miles 显示了用并非由服务器实际产生的数值进行训练所付出的代价。

## 借用服务器的循环 {#s-sglang-as-an-rl-rollout-engine-the-loop-that-borrows-the-server}

训练驱动代码有意保持简短。v0.1.2 的 `train.py` 有 175 行。训练器和 SGLang 共享 GPU 时，一步中的代码如下：

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

把它看作租借。SGLang 生成并评分 rollout，再释放 CUDA graphs、KV 缓存和权重。训练器加载、训练并卸载自身。SGLang 恢复权重内存，接收新权重，再恢复 KV 缓存和 CUDA graphs。[图 7.2b](#fig-7-2b)展示各阶段 GPU 上有哪些内存。

```figure
id: fig-7-2b
kind: timeline
title: 一步共置 RL 中的 GPU 内存
claim: 该模式下 SGLang 与训练器不会同时占用 GPU，且 SGLang 在新权重到达后才恢复 KV 缓存。
caption: 从左向右读，每列对应 train.py 的一个阶段。实心格表示内存在 GPU 上。依据 Miles v0.1.2 的 train.py 和 inference_controller.py。
```

## 标准 SGLang 提供了什么 {#s-sglang-as-an-rl-rollout-engine-what-stock-sglang-gives-the-trainer}

这种租借通过标准 v0.5.22 已有的 HTTP 端点完成 {{code}}。SGLang 的 RL 指南给出设计规则：SGLang 是由训练器调用的库，不是拥有循环的框架 {{docs}}。Miles 通过 HTTP 驱动各个普通 `sglang serve` 进程。

**释放内存：** `POST /release_memory_occupation` 按标签释放 GPU 内存，`POST /resume_memory_occupation` 恢复内存。服务器需要开启默认关闭的 `--enable-memory-saver`。标签为 `kv_cache`、`weights` 和 `cuda_graph`。文档只列前两个，代码接受三个，以代码为准。memory saver 释放物理内存，保留虚拟地址，因此已捕获 CUDA graphs 仍有效，无须重新捕获。调用会断言服务器空闲，因此应先暂停生成。

**暂停和恢复：** `POST /pause_generation` 接收一个模式。SGLang 默认 `abort`，结束所有运行中请求。Miles 默认 `retract`，将运行中请求退回等待队列，在更新后重新 prefill。第三种 `in_place` 保留旧权重产生的 KV 缓存。

**权重更新会话：** 先 `begin_weight_update`，再调用一次或多次 `update_weights_from_*`，最后 `end_weight_update`。会话存在是因为量化层加载后需要一次重新打包。每次 refit 只做一次，比每个 bucket 做一次更便宜。会话结束后，`update_weight_version` 写入新版本。跨 refit 存活的请求会在 `meta_info` 报告 `weight_versions` 区间，从而知道哪些 token 来自哪些权重。[图 7.2](#fig-7-2)展示默认传输方式的一次更新。

```figure
id: fig-7-2
kind: sequence
title: Miles 与 SGLang 间的一次权重更新
claim: 权重更新是一个会话：暂停、开始、发送全部 bucket、结束时重新打包一次、设置版本，再恢复。
caption: 从上往下读。默认 NCCL broadcast 传输中，第 3 和第 4 行为每个 bucket 重复一次。依据 Miles v0.1.2 的 weight_update/session.py、protocols/broadcast.py，以及 v0.5.22 的 http_server.py 端点。
```

## 四种权重移动方式 {#s-sglang-as-an-rl-rollout-engine-four-ways-to-move-the-weights}

Miles 通过 `--update-weight-transfer-mode` 选择传输 {{code}}：

| 模式 | 字节如何移动 | 适用场景 |
|---|---|---|
| `broadcast`（默认） | 每个流水线阶段一个 NCCL 组，训练器 rank 0 将各 bucket 广播到每张引擎 GPU | 训练器与引擎使用不同 GPU |
| `broadcast_packed` | 同一通信组，每个 bucket 一个扁平字节张量 | Megatron，非共置 |
| `p2p` | Mooncake 通过 RDMA 写入各引擎 rank 发布的 GPU 地址 | 多节点 MoE |
| `disk-delta` | checkpoint 中变化的字节写入共享存储，各引擎修补本地副本 | 没有 RDMA 或 NCCL 通路 |

使用 `--colocate` 时，Miles 忽略该参数，始终通过 `/update_weights_from_tensor` 发送 CUDA IPC 句柄。共置运行却设置 `p2p` 的团队，会在不知情时测到另一条路径。

**Miles 团队报告**，在 H100 集群上使用 1 GB bucket 的 P2P 时间如下 {{team 2026-10}}。8 节点的 Qwen3-235B-A22B 从 NCCL broadcast 的 10,754 ms 降至 3,162 ms，减少 71%。32 节点的 Kimi-K2 从 53,279 ms 降至 7,227 ms，减少 86%。单节点上 P2P 反而更慢：GLM-4.7-9B-Flash 多耗时 68.6%，4 层 GLM-5 测试多耗时 72.2%。原因在设计：broadcast 将完整模型发往每个引擎 rank，而专家并行的各 rank 只需要其中一部分。

**RadixArk 报告**，一步中约 2% 的 BF16 参数会改变 {{team 2026-08}}。GLM-4.7-Flash 的 disk-delta 每次更新载荷从 62.4 GB 降至 0.69 至 0.83 GB，生成暂停 3 至 5 s。这些是 2026-08-18 Miles v0.1 文章中的数字，我们没有复现。

**我们的建议：** 从单节点共置、CUDA IPC 路径开始。只有 rollout 时间主导每步耗时，才拆到不同 GPU。仅对多节点 MoE 选择 `p2p`，供应方表格在该场景显示收益；其他场景保持 `broadcast`。

## True on-policy 的边界 {#s-sglang-as-an-rl-rollout-engine-true-on-policy-and-where-it-stops}

这里，服务引擎和训练器必须对同一个数值达成一致。给 SGLang 与 Megatron 或 FSDP 相同权重和 token，内核仍可能因归约顺序不同，返回不同的对数概率。于是 PPO 比率混合了策略变化与内核差异。Miles 通过 `train/train_rollout_logprob_abs_diff` 报告差距，true on-policy 模式下应严格为 0。

先注意两个 SGLang 事实。除非请求为贪心采样，或设置 `SGLANG_RETURN_ORIGINAL_LOGPROB`，否则 SGLang 返回温度缩放后的对数概率，见[第 4.6 节](#s-deterministic-inference-and-logprobs)。有时 rollout 采样温度不为 1，而训练器以温度 1 计算对数概率，便会出现与内核无关的不匹配。

其次，v0.5.22 的 `--rl-on-policy-target` 只接受 `fsdp`，并强制确定性推理 {{code}}。该模式用 batch 不变版本替换矩阵乘法、softmax 和 norm 内核，强制使用 PyTorch 采样器。除非注意力后端为 `fa3`、`fa4`、`triton` 或 `ascend`，否则还会关闭 radix cache。

Miles 在此基础上提供启动计划，设置两端匹配的参数。覆盖范围很窄。v0.1.2 唯一模型配置是 Qwen3 稠密系列：Qwen3-0.6B、Qwen3-4B、Qwen3-4B-Base 和 Qwen3-4B-Instruct-2507。Miles 仓库三个未关闭 issue 展示了逐位一致仍会失败的位置：

- **Issue #1485：** TP2 下 Qwen3-4B 的 `down_proj` 输出不同。SGLang 将 38 个部分结果分为两组、每组 19 个相加，Miles 则采用两两相加的树。BF16 加法不满足结合律 {{issue radixark/miles#1485}}。
- **Issue #3714：** 确定性服务将 NCCL 通道上限固定为 8，训练器使用 24。权重传输因此报错 `Message truncated : received 6144 bytes instead of 2048` {{issue radixark/miles#3714}}。
- **Issue #3277：** retract 后，新权重下重新 prefill 会覆盖已记录的 MoE 路由。响应因此携带新路由与旧对数概率 {{issue radixark/miles#3277}}。

**我们的建议：** 将 true on-policy 视为 Qwen3 稠密模型的诊断工具，而非适用于每次运行的开关。无论如何，每次都记录对数概率差距。较大差距意味着转换或内核问题，RL 算法无法替你修复。

## GB10 上的 Miles 实测 {#s-sglang-as-an-rl-rollout-engine-what-we-measured-with-miles-on-a-gb10}

我们在一张 NVIDIA GB10 上使用 `radixark/miles:latest` 镜像运行 GRPO。镜像包含 Miles 提交 `08752a12` 与 SGLang `0.5.22.dev46+g7b6993a`。模型为 `Qwen/Qwen3-0.6B`，数据为 GSM8K，FSDP 与 SGLang 共置在一张 GPU。12 步中，每步对 32 个 prompt 各采样 8 次，最多输出 1,024 token，温度 1。SGLang 内存比例为 0.4。

```listing
title: Miles 记录的一步 GRPO
source: capture/gpu/out-miles/plain-excerpt.log
lang: text
note: 第一步的 rollout 和训练指标、一次权重更新及一条警告，长行有截断。
---
metrics.py:94 - perf 0: {'rollout/raw_reward_unfiltered': 0.62890625, 'rollout/num_training_samples': 256, 'rollout/episode_raw_reward': 0.62890625, 'rollout/episode_response_length/mean': 739.92578125, 'rollout/episode_response_length/median': 759.5, 'rollout
{'train/loss': -4.656612873077393e-10, 'train/pg_loss': -4.656612873077393e-10, 'train/entropy_loss': 0.0, 'train/pg_clipfrac': 0.0, 'train/ppo_kl': 0.0, 'train/ess_ratio': 1.0, 'train/train_rollout_logprob_abs_diff': 0.015336457639932632, 'train/train_rollout_kl': 0.0006840902497060597, 'train/grad_norm': 0.5216571092605591, 'train/lr-pg_0': 1e-06, 'train/step': 0}
timer.py:42 - Timer update_weights end (elapsed: 0.7s)
[2026-10-17 15:55:01] post-warmup freeze_gc failed
```

**我们测得**各阶段耗时：SGLang rollout 中位数为 57.2 s，约每秒 3,113 token。训练器随后用 25.2 s 重新计算对数概率，用 80.3 s 训练。通过 CUDA IPC 更新 SGLang 权重用时 0.65 s。释放 SGLang 内存中位数为 0.8 s，最长 4.0 s，恢复内存为 0.9 s。

```figure
id: fig-7-2c
kind: chart
title: GB10 上一步 GRPO 的各阶段
claim: 单 GB10 上，训练器各阶段合计耗时为 SGLang rollout 的 1.8 倍，权重更新不足一秒。
caption: 12 步中各阶段耗时的中位秒数。蓝色为 SGLang 生成，紫色为训练器，琥珀色为两者之间的权重更新和内存释放。来源：capture/gpu/summary/miles-gb10.json。
```

在这个规模下，rollout 不是瓶颈。单 GPU 上的 0.6B 模型，即使服务引擎更快，也最多节省约三分之一、即 35% 的每步耗时。本节大部分篇幅讨论的权重更新和内存释放，共耗时 2.4 s。各阶段中位数相加，一步约 165 s。

全部 12 步的对数概率差距保持在 0.0143 至 0.0163。true on-policy 就是为了把它降至 0，普通模式不会消除它。原始奖励在 0.586 至 0.758 之间波动。12 步不足以证明学到了东西，因此应将其解读为耗时和差距测量，而非训练曲线。

### 四十八步 {#s-sglang-as-an-rl-rollout-engine-forty-eight-steps}

随后我们用相同设置运行 48 步：内存比例 0.4、温度 1，先使用默认 seed。在这些步骤中，策略开始学习，rollout 也随之加快。

```listing
title: 48 步中的最后一步 GRPO
source: capture/gpu/out-miles/plain-48-excerpt.log
lang: text
note: 第 47 步的 rollout 和训练指标、调度器退出及作业状态，长行有截断。
---
metrics.py:94 - perf 47: {'rollout/raw_reward_unfiltered': 0.79296875, 'rollout/num_training_samples': 256, 'rollout/episode_raw_reward': 0.79296875, 'rollout/episode_response_length/mean': 421.73046875, 'rollout/episode_response_length/median': 369.5, 'rollou
{'train/loss': -3.4924596548080444e-09, 'train/pg_loss': -3.4924596548080444e-09, 'train/entropy_loss': 0.0, 'train/pg_clipfrac': 0.0, 'train/ppo_kl': 0.0, 'train/ess_ratio': 1.0, 'train/train_rollout_logprob_abs_diff': 0.014126655645668507, 'train/train_rollo
Subprocess scheduler_0 (pid=3263) crashed with exit code -15. Triggering SIGQUIT for cleanup...
Job 'raysubmit_MKE9XLVeZ87U7iQV' succeeded
```

**我们测得**前 8 步原始奖励均值为 0.636，后 8 步为 0.758。回答变短，平均长度从 724 降至 447 token，在 1,024 token 上限被截断的样本比例从 0.33 降至 0.08。SGLang 需要生成的 token 更少，所以 rollout 每步从 60.2 s 降至 32.7 s。速率从每秒 3,084 提升至 3,501 token。

```figure
id: fig-7-2d
kind: chart
title: GB10 上的四十八步 GRPO
claim: 48 步内，原始奖励均值从 0.636 升至 0.758，截断样本比例从 0.33 降至 0.08。
caption: 默认 seed 每步的原始奖励及在 1,024 token 被截断的样本比例。虚线为 seed 2、3 的原始奖励。均值取前 8 步与后 8 步。来源：capture/gpu/summary/miles-gb10.json。
```

相邻两步奖励变化最大达 0.207，从第 30 步的 0.801 到第 31 步的 0.594。应看 8 步均值趋势，不要只看一步。

对数概率差距没有消失。前 8 步为 0.0153，后 8 步为 0.0146，全部 48 步保持在 0.0138 至 0.0162。该 0.6B 运行中，48 步训练未能消除差距。Miles 将其归因于 SGLang 与 FSDP 内核不同，true on-policy 模式负责处理它。

最后几行日志也需要解释。SGLang 调度器打印 `crashed with exit code -15`，Ray 作业随后报告成功。-15 表示调度器收到 SIGTERM，这里发生在作业正常完成后。应根据作业状态告警，不能只凭该行。

相信运行前，还需知道两项日志事实。12 步运行约 30% 样本达到 1,024 token 上限，48 步期间约 20%。因此奖励包含未完成就被截断的回答。SGLang 启动时还打印一次 `post-warmup freeze_gc failed`，之后训练正常运行，该警告在这里没有造成可见代价。

### 再测两个 seed {#s-sglang-as-an-rl-rollout-engine-two-more-seeds}

我们又以 `MILES_SEED=2` 和 `MILES_SEED=3` 各运行相同的 48 步。该变量同时设置训练 seed 和 rollout seed。2026-10-18，GB10 在该负载下关机三次，启动列表显示当天三次短暂启动。因此这些运行增加了保护脚本：GPU 达到 84 C，或前 30 分钟达到 80 C，就暂停容器。约 45 至 60 秒后，温度降至 72 C 或更低，再恢复容器。

seed 2、3 共经历 9.3 小时，容器约 58% 时间处于暂停。暂停会停止进程；作者据此将奖励、长度、截断比例和对数概率差距视为有效，但没有以同一 seed 做暂停与不暂停的对照验证。其对这些数值没有影响仍属于预期，不能视为已证实结论。rollout 时间受到暂停影响，因此不报告 seed 2、3 的时间。

```listing
title: seed 2 的最后一步
source: capture/gpu/out-miles/plain-48-s2-excerpt.log
lang: text
note: MILES_SEED=2 的第 47 步 rollout 和训练指标，以及作业状态，长行有截断。
---
metrics.py:94 - perf 47: {'rollout/raw_reward_unfiltered': 0.6484375, 'rollout/num_training_samples': 256, 'rollout/episode_raw_reward': 0.6484375, 'rollout/episode_response_length/mean': 514.0390625, 'rollout/episode_response_length/median
{'train/loss': -5.122274160385132e-09, 'train/pg_loss': -5.122274160385132e-09, 'train/entropy_loss': 0.0, 'train/pg_clipfrac': 0.0, 'train/ppo_kl': 0.0, 'train/ess_ratio': 1.0, 'train/train_rollout_logprob_abs_diff': 0.014963770285248756,
Job 'raysubmit_y4umCbEa8Qp5Bbad' succeeded
```

| 前 8 步均值 / 后 8 步均值 | 默认 seed | Seed 2 | Seed 3 |
|---|---|---|---|
| 原始奖励 | 0.636 / 0.758 | 0.653 / 0.736 | 0.614 / 0.766 |
| 回答长度，token | 724 / 447 | 712 / 480 | 734 / 456 |
| 1,024 token 截断比例 | 0.33 / 0.08 | 0.30 / 0.12 | 0.34 / 0.09 |
| 对数概率差距 | 0.0153 / 0.0146 | 0.0153 / 0.0150 | 0.0156 / 0.0146 |

**我们测得**三个 seed 都呈现相同趋势：奖励上升、回答缩短、截断减少。全部 144 步的对数概率差距保持在 0.0136 至 0.0164。三个 seed 相邻步骤奖励的最大变化分别为 0.207、0.160 和 0.203。

### True on-policy 未能在 GB10 上启动 {#s-sglang-as-an-rl-rollout-engine-true-on-policy-did-not-start-on-a-gb10}

随后，我们采用 Miles Triton 示例的参数，设置 `--true-on-policy-mode`。SGLang 启动了，但启动器开始后 61 秒，训练器停止。

```listing
title: FSDP 训练器拒绝 Triton 注意力
source: capture/gpu/out-miles/true-on-policy-error.log
lang: text
note: 启动器首行、训练器错误及初始化失败，长行有截断。
---
[2026-10-17 16:28:41.340 launcher] common.py:290 - EXEC: mkdir -p /root/lab/mode
ValueError: Specified `attn_implementation="triton"` is not supported. The only possible arguments are `attn_implementation="eager"`, `"paged|eager"`, `"attn_implementation=flash_attention_2"`, `"attn_implementation=paged|flash_attention_2"`, `"attn_implementa
[2026-10-17 16:29:42.606 trainer_controller_actor] cell.py:251 - ft op=execute phase=fail cell=trainer-engine-actor-00000 fn=init elapsed_s=0.7
```

参数值来自不适用的示例。FSDP actor 中，只有设置 `torch.version.hip`，即 AMD GPU 环境，才启用 SGLang Triton 注意力桥接 {{code}}。NVIDIA GPU 上，该值直接传给 transformers，而它没有名为 `triton` 的注意力实现。

Miles 唯一的 true on-policy 契约，将 SGLang `fa3` 后端与 FSDP 的 `flash_attention_3` 配对 {{code}}。我们用契约参数重新运行，查看会停在哪里。

```listing
title: GB10 上的契约参数
source: capture/gpu/out-miles/true-on-policy-fa3-error.log
lang: text
note: SGLang 启动、失败，以及随后 rollout 错误的首尾两条，省略进程前缀。
---
[2026-10-17 21:03:03] Enable deterministic inference because of legacy rl_on_policy_target.
AssertionError: FlashAttention v3 Backend requires SM>=80 and SM<=90. Please use `--attention-backend flashinfer`.
[2026-10-17 21:03:24] Received sigquit from a child process. It usually means the child failed.
[2026-10-17 21:03:30.637 rollout_executor] http_utils.py:241 - Error: Server error '503 Service Unavailable' for url 'http://172.17.0.3:20035/generate'
[2026-10-17 22:06:46.137 rollout_executor] http_utils.py:241 - Error: Server error '503 Service Unavailable' for url 'http://172.17.0.3:20035/generate'
```

SGLang 启动 21 秒后停止。其 FA3 后端只接受 SM 8.0 至 SM 9.0 GPU，GB10 是 SM 12.1。所用 Miles 镜像提交为 08752a12，唯一 true on-policy 契约需要 FA3，因此无法在 GB10 上启动。

接下来的情况更值得记住。rollout 引擎已退出，Miles 作业却未停止。rollout 循环持续向路由器发送请求，得到 `503 Service Unavailable`。63 分钟的日志包含约 200,000 条此类错误，直到我们停止容器。作业从未报告失败。我们没有记录这一小时的 GPU 状态。

**对 GB10 结果的建议：** 规划 true on-policy 运行前，检查 GPU 和镜像是否具备契约两端的内核。还应观察 SGLang 服务器日志，不能只看训练器，因为死掉的 rollout 引擎可能看起来像运行缓慢。在所测 Miles 提交 08752a12 中，该契约要求两端都用 FlashAttention 3，这是面向 Hopper GPU 的路径。

## Miles 使用自己的 SGLang {#s-sglang-as-an-rl-rollout-engine-miles-runs-on-its-own-sglang}

Miles 不使用本手册其他章节描述的 SGLang 发布版。其 Docker 镜像基于 `lmsysorg/sglang:v0.5.21`，检出 `sglang-miles` 分支。v0.1.2 发布锁固定 SGLang 提交 `b84bec5761a6`。Miles 文档明确说明：在 Miles 旁边安装标准 `sglang` 或上游 Megatron-LM 无法工作 {{docs}}。

Miles 调用的至少四项功能在 v0.5.22 中不存在：disk-delta 使用的 `/pull_weights` 端点、`register_lora_adapter`、`get_parallelism_info`，以及 `--true-on-policy-contract` 参数。

这个分支概括了本节。RL 对服务引擎提出普通服务用户从未提出的要求：归还内存、在会话中更新权重、报告每个 token 由哪个权重产生，以及与另一程序逐位一致。有些要求已经进入标准 SGLang，其余仍在分支上，等待成熟。

**真实事故：** Miles 仓库 issue #860 报告，滑动窗口注意力模型的 `/release_memory_occupation` 静默地不做任何事 {{issue radixark/miles#860}}。滑动窗口 KV 池在构造函数中关闭 memory saver，因此共置运行在 Megatron 启动时耗尽内存。一名用户看到 DeepSeek-V4-Flash 的 30.19 GB KV 池仍常驻。该 issue 在 2026-10-16 仍未关闭。新模型采用共置前，应检查每个内存标签是否真正释放内存。

```takeaways
- 固定 Miles 镜像和发布锁，不能混入标准 SGLang。
- 释放内存前暂停生成，因为释放操作断言服务器空闲。
- 从单节点共置开始，并注意 `--colocate` 会覆盖传输模式。
- 仅对多节点 MoE 选择 `p2p`，先测更新耗时。
- 每次记录 rollout 与训练对数概率差距，我们的 48 步运行未能消除它。
- 从多步均值解读奖励，因为单步可变化 0.2。
- GPU 过热时暂停长 RL 作业；我们预期只影响时间，但没有直接验证。
- rollout 温度不为 1、训练器以温度 1 计算对数概率时，设置 `SGLANG_RETURN_ORIGINAL_LOGPROB`。
- v0.1.2 将 true on-policy 视为 Qwen3 稠密模型诊断工具。
- 检查 GPU 和镜像是否具备 true on-policy 契约两端的内核。
- 对 rollout 服务器自身错误告警，因为训练器可能一直等待已死引擎。
```

来源：Miles v0.1.2 (a22fd824)：train.py、release-lock.json、docker/Dockerfile、docs/developer/versions.md、miles/ray/rollout/inference_controller.py、miles/backends/training_utils/weight_update/protocol.py、session.py、protocols/broadcast.py、protocols/cuda_ipc.py、protocols/p2p.py、protocols/delta.py、miles/true_on_policy/model_profiles.py、docs/advanced/p2p-weight-transfer.md；SGLang v0.5.22：python/sglang/srt/entrypoints/http_server.py、python/sglang/srt/managers/io_struct.py (PauseGenerationReqInput)、python/sglang/srt/managers/scheduler_components/weight_updater.py、python/sglang/srt/constants.py、python/sglang/srt/arg_groups/fields/exec_.py、python/sglang/srt/arg_groups/choices.py、python/sglang/srt/arg_groups/attention_hook.py、python/sglang/srt/layers/logprob_processor.py、docs/docs/advanced_features/sglang_for_rl.mdx；Miles issue #860、#1485、#3277、#3714；RadixArk 和 LMSYS 文章：lmsys.org/blog/2025-11-19-miles、lmsys.org/blog/2026-08-18-miles-v0-1。Miles 08752a12：miles/backends/fsdp_utils/actor.py、miles/true_on_policy/schema.py、examples/infra_features/true_on_policy/run_simple.py 和 run_simple_amd_triton.py。capture/gpu/miles_grpo.py、capture/gpu/miles_summary.py、capture/gpu/out-miles/plain-excerpt.log、capture/gpu/out-miles/plain-48-excerpt.log、capture/gpu/out-miles/plain-48-s2-excerpt.log、capture/gpu/out-miles/plain-48-s3-excerpt.log、capture/gpu/out-miles/plain-48-thermostat.log、capture/gpu/out-miles/true-on-policy-error.log、capture/gpu/summary/miles-gb10.json、capture/gpu/out-miles/true-on-policy-fa3-error.log、capture/gpu/incidents/gb10-boot-list.txt。
