# 读懂前十个训练步骤

> 看懂五个数字，就能用十步判断 GRPO 训练是否正常，而不必只盯着 reward。

训练初期 reward 会上下波动，单看某一步很容易过度解读。日志中的五个数字能提供更多信息。在当前配置下，每个数字都有正常范围，也各自对应不同的故障表现。

读完本节后，你可以从训练日志中提取五个数字，并与我们的范围比较，判断训练是否正常。

**我们的结果：**三个随机种子的前十步中，每步 reward 为 0.53 至 0.74，log probability gap 为 0.0141 至 0.0164。

## 从日志中提取数字 {#s-read-your-first-ten-steps-pull-the-numbers-out-of-the-log}

每一步会写两行数字：`rollout N` 记录样本情况，`step N` 记录训练更新。用 `cd ~/miles-lab/runs` 进入[第 1.1 节](#s-run-grpo-on-one-gpu)所述的日志目录，再用 `grep` 查看各步的某个数字：

```listing
title: 前十步中的两个数字
source: capture/gpu/out-gb10/read-steps.txt
lang: text
note: 来自我们一次 12 步训练的 reward 和 log probability gap。每行对应一个训练步骤。
---
$ grep -o "'rollout/raw_reward': [0-9.]*" plain.log | head -10
'rollout/raw_reward': 0.62890625
'rollout/raw_reward': 0.59375
'rollout/raw_reward': 0.7578125
…
$ grep -o "'train/train_rollout_logprob_abs_diff': [0-9.]*" plain.log | head -10
'train/train_rollout_logprob_abs_diff': 0.015336457639932632
'train/train_rollout_logprob_abs_diff': 0.01610221341252327
'train/train_rollout_logprob_abs_diff': 0.014312651939690113
…
```

替换匹配表达式中的指标名称，就能读取其他数字。

## 对照正常范围 {#s-read-your-first-ten-steps-compare-with-the-healthy-ranges}

**KL：**Kullback-Leibler divergence，用于衡量两个概率分布之间的距离。两个分布相同时，KL 为 0。

我们用三个随机种子运行了相同的 48 步任务。下表列出三次运行前十步的数值：

| 指标 | 日志名称 | 第 0 至第 9 步的正常范围 | 含义 |
|---|---|---|---|
| reward | `rollout/raw_reward` | 0.53 至 0.74，每个种子的均值为 0.62 至 0.65 | 答案正确的比例 |
| 答案长度 | `rollout/response_lengths` | 626 至 787 token | 模型生成文本的长度 |
| 截断比例 | `rollout/truncated` | 0.19 至 0.43 | 达到 1,024-token 上限的答案比例 |
| log probability gap | `train/train_rollout_logprob_abs_diff` | 0.0141 至 0.0164 | trainer 和 engine 对相同 token 的计算差异 |
| trainer 与 engine 的 KL | `train/train_rollout_kl` | 0.00063 至 0.00075 | 用两个概率分布间的距离衡量上述差异 |

**Log probability gap：**engine 与 trainer 对每个采样 token 计算的 log probability 之间的绝对差值均值。由于两端运行的 kernel 不同，该值不会为零。

前十步中，相邻步骤的 reward 最多相差 0.14。观察全部 48 步时，最大变化为 0.21。应查看至少五步的均值，不要只看单步结果。

## 查看完整训练趋势 {#s-read-your-first-ten-steps-read-the-trend-over-the-full-run}

三个随机种子在 48 步中的趋势一致：reward 上升，答案变短，达到长度上限的答案减少，log probability gap 保持稳定。[第 5.3 节](#s-repeat-a-run)列出了各个种子的具体数值。

```figure
id: fig-1-3
kind: chart
title: 三个随机种子各运行 48 步时的 reward
claim: 单步 reward 会波动，但三个种子的 reward 都在 48 步内逐步上升。
caption: 同一训练配置的三个随机种子每步的平均 reward。
```

```figure
id: fig-1-3b
kind: chart
title: 模型学习后，答案逐渐变短
claim: 平均答案长度从约 720 token 降至约 460 token，因此触及 1,024-token 上限的答案减少。
caption: 相同三个随机种子每步的平均答案长度。
```

## 识别训练异常 {#s-read-your-first-ten-steps-know-the-signs-of-a-broken-run}

| 观察到的现象 | 含义 | 处理方法 |
|---|---|---|
| 十分钟后仍没有 step 日志 | engine 或 trainer 未能启动 | 查看[第 7.1 节](#s-troubleshoot-by-symptom) |
| `503 Service Unavailable` 连续数分钟没有停止 | rollout engine 已退出。健康 engine 也可能短暂出现一分钟以内的错误峰值 | 查看[第 1.2 节](#s-add-a-watchdog) |
| log probability gap 随训练步骤持续扩大 | trainer 和 engine 持有的权重不同 | 查看[第 5.2 节](#s-check-the-first-step) |
| reward 保持平稳，且很多组的分数相同 | 大多数组没有提供学习信号 | 查看[第 3.1 节](#s-train-math-on-gsm8k) |

最后一种情况还需要看一个数字。rollout 端每一步都会写入一行 `perf N`，其中统计了组内所有答案 reward 相同的组数。我们的第一步中，`rollout/zero_std/count_1` 为 7，`rollout/zero_std/count_0` 为 3。这表示 32 组中有 10 组的答案全对或全错，GRPO 无法从这些组中学习。

```takeaways
- 用至少五步的均值查看 reward。
- 每次训练都同时检查 reward、log probability gap 和 KL。
- 统计所有答案 reward 相同的组，因为这些组不提供学习信号。
- 用自己的随机种子范围比较每次新训练。
```

来源：capture/gpu/out-gb10/read-steps.txt；capture/gpu/out-gb10/plain-first-step.log；capture/gpu/summary/miles-gb10-lab.json (runs.plain-48、runs.plain-48-s2、runs.plain-48-s3)；Miles main 08752a12 中的 rollout 指标。
