# 用 top-p 和 top-k 缩小 log probability 差距

> 使用 top-p 或 top-k 采样时，Miles 会让 trainer 回放采样得到的 token 集合，从而缩小两端的差距。

使用 top-p 或 top-k 时，engine 会从缩小后的词表集合中为每个 token 采样。trainer 则会在完整词表上为同一 token 评分。因此两端给出的概率不同，原因与 kernel 无关。

读完本节后，你可以启用 sampling replay，并检查它是否缩小了差距。

**我们的结果：**使用 top-p 和 top-k replay 后，单个随机种子的差距中位数从 0.0153 降至 0.0135，下降 11.5%。

## 为什么 engine 的数值更高 {#s-lower-the-logprob-gap-why-the-engine-number-is-higher}

top-p 会保留一组最小的 token，使其概率总和达到 top-p 值。随后 engine 会重新缩放这些概率，使总和回到 1。假设裁剪前两端计算的分数相同，那么对于保留的 token，engine 的 log probability 会比完整词表上的分数高出保留概率质量的负对数。如果保留 token 的概率质量为 0.9，差值约为 0.105。top-k 也会以类似方式裁剪集合，kernel 差距还会叠加在此基础上。

该差值不是噪声。每个 token 的差值都不同，但 trainer 与 engine 之间的比值总会受到同方向的影响。另一个 RL 库在 2026 年的一份 issue 报告中描述了 importance-sampling ratio 的这种偏差。sampling replay 会消除它，因为 trainer 也会在相同的保留集合上评分。

2026-10-23，我们在 Miles 之外使用 L4 GPU 检查了这个公式。模型为 BF16 格式的 `Qwen/Qwen3-0.6B`，输入为 16 个、每个 48 token 的 prompt，temperature 为 1，top-p 为 0.9。我们使用 Transformers 对完整词表进行 float32 计算，作为参考值。该 GPU 与其他任务共享，且未锁定频率；这不会改变这些数值。

```listing
title: 返回的 logprob 减去完整词表的参考值
source: capture/gpu/out-l4/logprobs-top-p.txt
lang: text
note: 摘要中的三行数据。将变量设为 1 后，第二条 SGLang 记录的数值相同。
---
engine and mode                                  returned minus reference, median   median absolute
vLLM --logprobs-mode raw_logprobs                0.0000                             0.005
vLLM --logprobs-mode processed_logprobs          +0.0527
SGLang return_logprob, ORIGINAL_LOGPROB=0        0.0000                             0.0066
```

- vLLM 可通过 `--logprobs-mode processed_logprobs` 返回经过 top-p 处理后的数值。它比参考值高出保留概率质量的负对数，残差为 8e-9，与上述公式一致。
- top-p 为 0.9 时，中位偏移约为 0.053，大多数采样 token 的保留概率质量低于 0.99。
- SGLang 0.5.22 返回的是 top-p 处理前的数值。temperature 为 1 时，设置 `SGLANG_RETURN_ORIGINAL_LOGPROB` 不会改变结果。我们的 Miles 镜像使用同一版本的开发构建，但我们没有在该镜像上重复检查。

因此，差距大小取决于 engine 返回哪一种数值。解读差距前，先在实际使用的 engine 版本上进行检查。

## 启用 replay {#s-lower-the-logprob-gap-turn-it-on}

通过 `MILES_EXTRA_ARGS` 为[第 1.1 节](#s-run-grpo-on-one-gpu)的训练添加采样设置：

```bash
-e MILES_EXTRA_ARGS="--rollout-top-p 0.95 --rollout-top-k 64"
```

`--rollout-top-p` 小于 1 或 `--rollout-top-k` 大于 0 时，Miles 会自动启用 sampling replay。此时 engine 会返回每一步可供采样的 token 集合，trainer 也只在这个集合内为 token 评分。

top-p 小于 1 时还必须设置大于 0 的 top-k，因为 Miles 要求 replay 同时配置两者。启用 replay 时，Miles 不允许同时使用 KL loss 或 on-policy distillation；也不允许与 `--recompute-logprobs-via-prefill` 一起使用。

## 检查差距 {#s-lower-the-logprob-gap-check-the-gap}

检查每一步的 `train/train_rollout_logprob_abs_diff`。它表示 trainer 和 engine 的 log probability 绝对差值的均值。

```listing
title: 两次训练的 engine 设置
source: capture/gpu/out-gb10/engine-settings.txt
lang: text
note: 两次运行使用相同的 attention backend 和 sampler，只有 top-p 和 top-k flag 不同。
---
run                    attention_backend  enable_deterministic_inference  sampling_backend  --rollout-top-p  --rollout-top-k
e6a-base               flashinfer         False                           flashinfer        not set          not set
e11-topp-topk          flashinfer         False                           flashinfer        0.95             64
```

| 运行配置，12 步，随机种子 1 | 差距中位数 | 最低至最高步骤 | Reward 中位数 |
|---|---|---|---|
| No top-p or top-k | 0.0153 | 0.0150 to 0.0159 | 0.66 |
| Top-p 0.95, top-k 64 | 0.0135 | 0.0128 to 0.0141 | 0.68 |

**实际测量结果：**启用 replay 后，差距降低了 11.5%。replay 运行的任何一步都没有达到未启用时的最低值。reward 保持在同一范围内。

这是 Qwen3-0.6B 使用一个随机种子运行 12 步的结果。两次运行的步骤范围没有重叠，因此我们只报告变化方向。若要报告自己的模型变化幅度，应再运行一个随机种子。

```figure
id: fig-4-4
kind: chart
title: 回放采样 token 会缩小差距
claim: 启用 top-p 和 top-k replay 后，12 步中每一步的差距都更小。
caption: 使用随机种子 1 的两次 12 步运行中，每一步的 logprob gap。
```

## Replay 无法修复的问题 {#s-lower-the-logprob-gap-what-replay-does-not-fix}

replay 会消除由 sampler 引起的那部分差距。其余差距很可能来自 kernel，因为 engine 和 trainer 以不同顺序执行相同计算。[第 4.5 节](#s-use-deterministic-inference)显示 deterministic inference 无法消除这部分差距。[第 8.3 节](#s-why-true-on-policy-is-a-contract)会说明如何处理。

```takeaways
- 同时设置 top-p 和 top-k，让 Miles 在 trainer 中回放采样集合。
- 使用相同步骤和随机种子比较 train/train_rollout_logprob_abs_diff 的变化。
- replay 可以缩小差距，但不会消除差距。
```

来源：capture/gpu/summary/miles-gb10-lab.json (runs.e6a-base、runs.e11-topp-topk)；capture/gpu/out-gb10/engine-settings.txt；capture/gpu/out-l4/logprobs-top-p.txt；Miles main 08752a12 中的 sampling-support replay 文档和参数；TRL issue 6789。
