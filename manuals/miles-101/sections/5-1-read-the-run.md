# 根据指标判断训练状态

> 查看日志中的八项指标，几分钟内就能判断训练是否正常。

大家通常先看 reward，但它发现异常最慢。其他七项指标能更早显示训练出了问题。

读完本节后，你可以通过日志指标判断训练是否正常，并确定哪些变化需要处理。

## 八项指标 {#s-read-the-run-the-eight-signals}

下表给出三个基线随机种子的 48 步训练范围。训练使用 Qwen3-0.6B 和 GSM8K，每批有 32 个 prompt，每个 prompt 生成 8 个答案，长度上限为 1,024 token。

| 指标 | 日志名称 | 我们的运行范围 | 正常表现 |
|---|---|---|---|
| reward | `rollout/raw_reward` | 每步 0.53 至 0.87 | 整体上升，单步间会有波动 |
| 答案长度 | `rollout/response_lengths` | 396 至 787 token | 模型逐渐学会生成更短的答案 |
| 截断比例 | `rollout/truncated` | 0.02 至 0.43 | 随答案长度一同下降 |
| 差距 | `train/train_rollout_logprob_abs_diff` | 0.0136 至 0.0164 | 保持稳定 |
| 与 engine 的 KL | `train/train_rollout_kl` | 0.00063 至 0.00076 | 保持稳定 |
| gradient norm | `train/grad_norm` | 0.35 至 4.95 | 通常保持在同一范围，偶尔突增 |
| clip fraction | `train/pg_clipfrac` | 0 | 每次 rollout 更新一次时始终为 0 |
| rollout 耗时 | `perf/rollout_time` | 随答案长度和温度变化 | 答案变短时也会下降 |

**Clip fraction：**更新达到 clip 上限的 token 占比。我们的训练每次 rollout 只执行一次 optimizer 更新，因此 trainer 的 policy 与为样本评分的 policy 相同，没有发生截断。

我们的训练每一步都将 `train/entropy_loss` 记录为 0，因此此配置无法显示模型的 entropy。

## 看趋势，不要只看单步 {#s-read-the-run-read-trends-not-steps}

我们的训练中，相邻步骤的 reward 最多变化 0.21。单步信息有限，应查看至少五步的均值。

三个随机种子的趋势一致：reward 上升，答案变短。[第 5.3 节](#s-repeat-a-run)列出了各个种子的具体数据。

## 将指标发送到 dashboard {#s-read-the-run-send-the-signals-to-a-dashboard}

短跑十步时查看日志就够了。长时间运行时，dashboard 更容易查看。Miles 可以把相同的 `train/`、`rollout/` 和 `perf/` 指标写入 Weights & Biases 或 TensorBoard。本手册中的所有数字都来自日志。我们在 GB10 上用两步训练测试了这两种 tracker。

若没有 Weights & Biases 账号或网络连接，可以将运行数据写入本地目录：

```bash
-e MILES_EXTRA_ARGS="--use-wandb --wandb-mode offline --wandb-project miles-lab --wandb-group plain --wandb-dir /root/lab/runs/plain/wandb"
```

保留 `--wandb-group`。缺少该参数时，训练会在启动时因 `TypeError: unsupported operand type(s) for +: 'NoneType' and 'str'` 而停止。日志应显示 `W&B offline mode enabled. Data will be saved locally.`，并在 `~/miles-lab/runs/plain/wandb/wandb/` 下生成一个 `offline-run-` 目录。

在线运行时，不要设置 `--wandb-mode offline`。不要将 key 放在命令行中，因为命令会保存在 shell history 和进程列表中。将 `WANDB_API_KEY=<your key>` 写入只有你能读取的文件，例如权限为 600 的 `~/miles-lab/wandb.env`，再将 `--env-file ~/miles-lab/wandb.env` 添加到 `docker run` 命令。不要把 key 放入 `MILES_EXTRA_ARGS`，因为启动脚本会将完整命令写入日志。

要使用 TensorBoard，请为 Miles 指定目录并启用 writer：

```bash
-e TENSORBOARD_DIR=/root/lab/runs/plain/tb -e MILES_EXTRA_ARGS="--use-tensorboard"
```

日志应显示 `Saving tensorboard log to /root/lab/runs/plain/tb.` 随后在主机上运行 `tensorboard --logdir ~/miles-lab/runs/plain/tb` 打开该目录。

## 根据变化采取行动 {#s-read-the-run-act-on-these-changes}

| 变化 | 可能原因 | 首要检查项 |
|---|---|---|
| 差距突然扩大并持续偏高 | engine 和 trainer 使用的权重不再一致 | 检查权重更新日志和[第 5.2 节](#s-check-the-first-step) |
| gradient norm 随训练步骤持续增大 | 当前 batch 的学习率过高 | 降低学习率并重试 |
| reward 下降而答案变长 | 模型学会了生成更长的文本，却没有变得更好 | 检查 reward function 和答案截断比例 |
| 每次 rollout 只更新一次时，clip fraction 仍高于 0 | 样本并非来自当前权重 | 检查更新间隔和 async 设置 |
| 答案长度稳定，但 rollout 耗时增长 | engine 或 GPU 变慢 | 检查温度日志和 engine 日志 |

建立自己的指标范围。本节数字只适用于我们的模型、数据和机器。请用自己的配置运行两到三个随机种子，并使用它们的范围。

```takeaways
- 看 reward 前先查看 gap、KL 和 gradient norm。
- 计算至少五步的均值，不要只看单步结果。
- 根据自己的随机种子建立正常范围。
- 将长时间运行的数据发送到 Weights & Biases 或 TensorBoard，同时保留日志。
```

来源：capture/gpu/summary/miles-gb10-lab.json (runs.plain-48、runs.plain-48-s2、runs.plain-48-s3)；Miles main 08752a12 中的文件 miles/backends/training_utils/loss/hub/losses.py、miles/backends/training_utils/metrics/log_utils.py、miles/ray/rollout/metrics.py、miles/utils/arguments.py、miles/utils/tracking_utils/tracking.py、miles/utils/tracking_utils/wandb_utils.py、miles/utils/tracking_utils/tensorboard_utils.py、docs/user-guide/monitoring.md；capture/gpu/out-gb10/tracker-eval-checks.txt (2026-10-23 实测记录)。
