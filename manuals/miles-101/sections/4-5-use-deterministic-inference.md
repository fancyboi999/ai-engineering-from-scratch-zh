# 了解 deterministic inference 能解决什么

> deterministic inference 可以让 engine 重复相同结果，但不能让 engine 与 trainer 的计算一致。

我们启用 deterministic inference，想缩小 trainer 和 engine 之间的差距。但差距没有变化。改变的是使用相同随机种子的两次运行，在第 0 步得到相同的 rollout。

读完本节后，你可以判断何时值得承担 deterministic inference 的成本。

**我们的结果：**无论是否使用 deterministic inference，差距中位数都在 0.0151 至 0.0153 之间。两次确定性运行的第 0 步 rollout 完全相同。

## 启用 deterministic inference {#s-use-deterministic-inference-turn-it-on}

通过 `MILES_EXTRA_ARGS` 为[第 1.1 节](#s-run-grpo-on-one-gpu)的训练添加 engine flag 和支持该模式的 attention backend：

```bash
-e MILES_EXTRA_ARGS="--sglang-enable-deterministic-inference --sglang-attention-backend triton"
```

启动脚本也会读取 `MILES_SGLANG_ATTENTION`，但仅在 `MILES_TRUE_ON_POLICY=1` 的 true on-policy 模式下生效。普通运行中设置此变量不会产生影响。

在我们的 GB10 上，`triton` 和 `flashinfer` 都能在启用该 flag 后启动。engine 还会切换 sampler，日志会记录这一变化：

```listing
title: engine 在 deterministic 模式下切换 sampler
source: capture/gpu/out-gb10/deterministic-sampler.log
lang: text
note: 分别摘录 Triton 和 FlashInfer 运行的一行日志。
---
[2026-10-21 13:45:36] Sampling backend is set to pytorch for deterministic inference.
[2026-10-21 14:55:18] Sampling backend is set to pytorch for deterministic inference.
```

## 差距保持不变 {#s-use-deterministic-inference-the-gap-stays-the-same}

我们使用随机种子 1，在 Qwen3-0.6B 上运行了四次，每次 12 步：

| 运行配置 | 差距中位数 | 第 0 步的差距 |
|---|---|---|
| Default engine | 0.01526 | 0.015271 |
| Deterministic, Triton | 0.01518 | 0.015404 |
| Deterministic, FlashInfer | 0.01520 | 0.015320 |
| Deterministic, Triton, second run | 0.01515 | 0.015404 |

**实际测量结果：**启用和关闭 deterministic inference 时，差距几乎相同。四个中位数的差值不超过 0.0002。

这说明差距来自 kernel：两端使用不同 kernel 计算。deterministic inference 可以让 engine 对相同输入给出相同结果，不受同批其他请求影响。但它不能让 engine 按照 trainer 的方式计算。

## 首步结果可以重复 {#s-use-deterministic-inference-the-first-step-repeats}

两次 Triton 运行在第 0 步的差距完全相同，精确到小数点后六位：0.015404。从第 1 步起，两者开始分开。

engine 能够重复相同结果，而 trainer 很可能没有。这些运行没有启用 trainer 的 deterministic 模式，因此第一次权重更新后的权重可能不同。我们没有测试启用 trainer 相关 flag 的结果。

因此，需要重复实验时可以使用 deterministic inference，例如在相同样本上测试 reward function。不要指望它能缩小差距。

```figure
id: fig-4-5
kind: chart
title: deterministic inference 能重复结果，但差距不变
claim: 两次 Triton 确定性运行在第 0 步的差距相同，四次运行的差距均接近 0.015。
caption: 使用随机种子 1 的四次 12 步训练中，每一步的 logprob gap。
```

## 使用成本 {#s-use-deterministic-inference-the-cost}

确定性 kernel 的速度更慢。四次运行中只有第 0、1、4 和 10 步都没有 heat guard 暂停。默认 engine 在这四步的 rollout 中位耗时为 56.5 s。[第 5.3 节](#s-repeat-a-run)中的 59.1 s 来自相同的默认运行，但统计了 6 个 clean step。三个确定性运行的耗时为 79.1 至 82.0 s，答案长度相近。

在 heat guard 暂停的 GPU 上，每种设置都只运行了一次，结果显示 rollout 耗时增加了 40% 至 45%。这个结论尚未确认。长时间训练前，应在自己的 GPU 上测量成本。

```takeaways
- 需要重复实验时使用 deterministic inference。
- 不要用 deterministic inference 缩小 trainer 之间的差距。
- 长时间运行前，在自己的 GPU 上测量 rollout 成本。
```

来源：capture/gpu/miles_grpo.py；capture/gpu/summary/miles-gb10-lab.json (runs.e6a-base、runs.e6b-det-triton、runs.e6c-det-flashinfer、runs.e6d-det-triton-repeat、median_unpaused)；capture/gpu/out-gb10/deterministic-sampler.log；capture/gpu/out-gb10/engine-settings.txt；capture/gpu/out-gb10/unpaused-timing.txt。
