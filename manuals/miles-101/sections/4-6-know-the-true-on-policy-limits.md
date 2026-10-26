# 检查 GPU 是否支持 true on-policy 模式

> true on-policy 模式可以让 trainer 和 engine 的计算逐位一致，但仅适用于契约覆盖的模型和 GPU。

true on-policy 模式承诺 trainer 和 engine 之间的差距严格为 0。在我们的 GB10 上，该模式无法启动，但训练日志没有明确报告这一点。

读完本节后，你可以在规划 true on-policy 训练前检查 GPU 和模型是否受支持。

## 启动前检查支持范围 {#s-know-the-true-on-policy-limits-check-the-contract-before-you-start}

我们检查的 Miles 版本只有一项 true on-policy 契约，覆盖 dense Qwen3 模型：Qwen3-0.6B 和三种 Qwen3-4B 变体。两端都必须运行 FlashAttention 3：engine 将其作为 attention backend，trainer 则将其作为 attention implementation。

FlashAttention 3 面向 Hopper GPU 构建。engine 检查只接受 compute capability 8.0 至 9.0，并拒绝更新的 GPU。规划运行前需要确认两点：

1. GPU 属于 Hopper 系列，例如 H100 或 H200。
2. 模型在契约支持列表中。

任何一项不满足，true on-policy 模式都无法启动。

## 在其他 GPU 上会发生什么 {#s-know-the-true-on-policy-limits-what-happens-on-another-gpu}

我们的 GB10 是 Blackwell GPU，compute capability 为 12.1。engine 在启动期间退出：

```listing
title: FlashAttention 3 不支持 GB10
source: capture/gpu/out-gb10/engine-died-503.log
lang: text
note: true on-policy 运行中 engine 输出的首批日志。
---
[2026-10-17 21:03:03] Enable deterministic inference because of legacy rl_on_policy_target.
AssertionError: FlashAttention v3 Backend requires SM>=80 and SM<=90. Please use `--attention-backend flashinfer`.
```

trainer 继续运行，并持续向已退出的 engine 发送请求，长达一小时。[第 1.2 节](#s-add-a-watchdog)展示了相关日志，以及用于停止训练的 watchdog。

错误信息建议使用 FlashInfer。但 true on-policy 模式不能照此更改，因为契约要求两端都使用 FlashAttention 3。使用 FlashInfer 可以正常训练，但无法保证逐位一致。

## 可替代的做法 {#s-know-the-true-on-policy-limits-what-to-use-instead}

超出契约范围时，应观察差距，并在适当情况下缩小它：

- [第 4.4 节](#s-lower-the-logprob-gap)可以缩小 top-p 和 top-k 采样造成的差距。
- [第 4.5 节](#s-use-deterministic-inference)可以让 engine 重复相同结果，便于复现实验。
- [第 5.2 节](#s-check-the-first-step)介绍如何检查第 0 步的差距是否处于正常范围。

在我们的 GB10 上，所有已完成的 Qwen3-0.6B 运行都没有使用 top-p 或 top-k，且每一步的差距都在 0.0136 至 0.0164 之间。此配置可用这个范围进行比较。

```takeaways
- 规划 true on-policy 模式前，先确认 GPU 型号和模型支持范围。
- 启动 watchdog，因为 engine 启动失败时训练不会自行停止。
- 超出契约范围时，观察差距并缩小由 sampler 引起的部分。
```

来源：capture/gpu/out-gb10/engine-died-503.log；capture/gpu/summary/miles-gb10-lab.json (各次运行的 logprob_abs_diff)；Miles main 08752a12 中的 true on-policy 契约和模型配置。
