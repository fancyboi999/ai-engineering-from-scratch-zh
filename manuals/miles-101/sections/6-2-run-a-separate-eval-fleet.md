# 运行评估时不暂停训练

> 使用训练 engine 执行评估会暂停 rollout；单独的评估 fleet 可以避免暂停，但需要额外 GPU。

你希望每隔几步就获得一次评估分数，例如模型在留出数学题上的准确率。评估需要生成答案，生成需要 engine。问题是使用哪些 engine。

读完本节后，你可以选择评估运行位置，并完成配置。

单独的评估 fleet 需要自己的 GPU，因此我们无法在单 GPU GB10 上测量。本节内容来自 Miles 源码和文档。

## 评估的三种运行位置 {#s-run-a-separate-eval-fleet-three-places-to-run-evaluation}

| 位置 | 选择方式 | 成本 |
|---|---|---|
| 训练 engine | 默认方式 | eval 运行时暂停 rollout |
| 独立 fleet | `--eval-num-gpus N` | 从任务中分配 N 张 GPU 给 eval，训练不会为其暂停 |
| 自建服务 | `--eval-function-path` 指向 checkpoint eval function | 仅需导出 checkpoint |

不能同时使用 fleet 和自己服务中的 checkpoint eval function。[第 6.3 节](#s-survive-failures)介绍的 rollout fault tolerance 也不支持 fleet。

## 使用训练 engine 评估 {#s-run-a-separate-eval-fleet-evaluate-on-the-training-engines}

设置评估间隔和评估数据：

```bash
-e MILES_EXTRA_ARGS="--eval-interval 10 --eval-prompt-data gsm8k_test /root/lab/datasets/gsm8k/test.parquet"
```

[第 1.1 节](#s-run-grpo-on-one-gpu)中的启动脚本会把 GSM8K test split 下载到实验目录。

评估运行期间 rollout 会暂停，并等待已经启动的请求完成。engine 已经持有当前权重，因此无需额外传输权重。单 GPU 和小型评估数据集适合使用这种模式。

这条命令在我们的 GB10 上没有成功。我们在两步训练中用 `--eval-interval 1` 运行了两次。两次评估都发送了 1,319 道测试题，随后 router 返回 `503 Service Unavailable`，任务在第 0 步前停止。我们没有找到原因。将评估加入长时间训练前，应先用两步运行测试。

## 使用独立 fleet 评估 {#s-run-a-separate-eval-fleet-evaluate-on-a-dedicated-fleet}

```bash
--eval-num-gpus 1 --eval-interval 10 --eval-hf-dir /dev/shm/miles_eval_hf --eval-prompt-data aime /root/lab/datasets/aime/aime.jsonl
```

先将自己的评估文件放进实验目录。启动脚本不会下载 AIME 数据。fleet 需要独立的 GPU，因此我们的单 GPU 启动脚本无法启动它。

fleet 在自己的 router 后运行独立 engine。每次评估时，trainer 会将 checkpoint 快照写入 `--eval-hf-dir`，传给 fleet 后继续训练。fleet 加载该快照，不参与训练权重更新。

即使评估晚几步才结束，结果仍会记在它所属的训练步骤上。`eval/lag_steps` 会报告它延迟了几步。

fleet engine 会复制 rollout engine 的所有 `--sglang-*` 设置。fleet 的 GPU 不与训练共享，因此要更改设置时，使用对应的 `--eval-sglang-*` flag，例如 `--eval-sglang-mem-fraction-static 0.9`。

## 根据暂停成本选择 {#s-run-a-separate-eval-fleet-choose-by-the-cost-of-the-pause}

先使用训练 engine。当评估暂停占据步骤耗时的大部分，且你有闲置的整张 GPU 时，再切换到 fleet。使用 `/dev/shm` 作为暂存目录，可以避免把快照写入磁盘。

```takeaways
- 先在训练 engine 上用两步运行测试评估，因为它在我们的 GB10 上失败了。
- 有额外 GPU 时使用独立 fleet，并监测 eval/lag_steps。
- 使用 --eval-sglang-* flags 更改 fleet engine 设置。
```

来源：capture/gpu/miles_grpo.py；Miles main 08752a12 中的文件 docs/user-guide/fully-async.md、miles/utils/arguments.py、miles/backends/sglang_utils/arguments.py、miles/backends/sglang_utils/sglang_config.py、miles/ray/rollout/eval_fleet.py、miles/ray/rollout/eval_dispatch.py、miles/ray/rollout/rollout_executor.py、miles/rollout/checkpoint_eval.py；capture/gpu/out-gb10/tracker-eval-checks.txt (2026-10-23 实测记录)。
