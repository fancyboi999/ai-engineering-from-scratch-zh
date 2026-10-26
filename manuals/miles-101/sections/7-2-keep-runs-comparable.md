# 保持运行记录可比较

> 无法与其他运行比较的结果没有参考价值，因此启动前应记录每次运行的配置。

项目开始两周后，你可能会想知道上周二的运行为什么比今天学得更快。只有两次运行都记录了相同信息，才能回答这个问题。

读完本节后，你可以记录每次运行的信息以供之后比较，也可以回放训练步骤进行调试。

## 记录每次运行的信息 {#s-keep-runs-comparable-record-these-facts-for-every-run}

| 信息 | 记录方式 |
|---|---|
| 镜像 digest | 按[第 1.1 节](#s-run-grpo-on-one-gpu-pull-the-image-and-record-what-you-pulled)使用 `docker image inspect` 获取 |
| Miles commit 和 SGLang 版本 | 从镜像内部读取 |
| 完整命令 | 保留启动脚本输出的命令和脚本本身 |
| 随机种子 | `--seed` 和 `--rollout-seed` |
| trainer 日志和 engine 日志 | 每次运行单独保存日志，不与其他运行混在一起 |
| GPU 温度和暂停情况 | 按[第 1.2 节](#s-add-a-watchdog-guard-the-gpu-heat)保存 heat guard 日志 |
| 退出码 | 每次运行记录一行状态信息 |

将 engine 日志和 trainer 日志放在一起保存。我们遇到的四次故障中，一次始于 engine，三次始于 trainer，因此两份日志都需要保留。

## 每次运行只改一项设置 {#s-keep-runs-comparable-change-one-thing-per-run}

两次运行只有一项设置不同时，才能直接比较。我们第一次测试 offload 时，同时更改了 offload 设置和 engine 内存比例，结果显示 rollout 快了 12%。同一天只更改 offload 设置的两次运行显示快了 1% 至 3%。[第 2.2 节](#s-choose-what-to-offload)介绍了两组结果。

对齐相同步骤后再比较耗时。rollout 耗时会随答案长度变化，模型学习后答案会变短。正如[第 5.3 节](#s-repeat-a-run)所示，只因步骤不同，中位数就可能出现差异。

## 保存回放训练步骤所需的数据 {#s-keep-runs-comparable-save-what-you-need-to-replay-a-step}

Miles 可以保存运行数据，让你单独回放其中一部分：

- `--save-debug-event-data` 保存每一步的事件。我们保留了每次运行的这些数据。
- `--save-debug-rollout-data` 保存 rollout 样本。使用 `--load-debug-rollout-data` 和 `--debug-train-only` 可在不启动 engine 的情况下，用相同样本再次训练。
- `--debug-rollout-only` 只运行 engine 部分。

回放是测试 loss 或 reward 改动最快的方式。每次回放都会使用相同样本，因此结果差异来自你的改动，而不是 sampler。

```takeaways
- 每次运行都记录镜像 digest、commit、命令、随机种子以及两份日志。
- 每次运行只更改一项设置，并保留同一会话中的基线。
- 测试训练改动时保存 rollout 数据，并使用 --debug-train-only 回放。
```

来源：capture/gpu/out-gb10/image-identity.txt；capture/gpu/miles_grpo.py；capture/gpu/heat-guard.sh；Miles main 08752a12 中的 debug 参数。
