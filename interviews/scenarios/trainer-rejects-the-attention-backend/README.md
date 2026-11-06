---
id: trainer-rejects-the-attention-backend
title: 训练器拒绝注意力实现名称
card: scenarios
kind: incident
level: 1
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, debugging]
tags: [rl, attention-backend, trainer, true-on-policy, miles]
minutes: 15
lessons: []
manuals: [miles-101#s-troubleshoot-by-symptom, miles-101#s-know-the-true-on-policy-limits, sglang-101#s-sglang-as-an-rl-rollout-engine]
practice: []
cheatsheet: []
related: [scenarios/dead-engine-and-watchdog]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/sglang-101/capture/gpu/out-miles/true-on-policy-error.log
  - manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md
  - manuals/miles-101/sections/4-6-know-the-true-on-policy-limits.md
  - manuals/sglang-101/sections/7-2-sglang-as-an-rl-rollout-engine.md
---


## Situation

一名工程师想缩小 rollout 引擎与训练器之间的 log probability 差距。引擎运行的是其 Triton 注意力后端，于是她把训练器的注意力实现也设为 `triton`，这个名字是她从一个示例里复制来的。她的想法是：两边使用相同的 kernel 名称，能在更多数值上达成一致。

在启动器的第一行输出大约一分钟后，运行结束了。训练器打印了一个 `ValueError`，容错层的一行日志说明训练器的 init 失败。她询问镜像是否损坏，是否需要拉取另一个 tag。

## Evidence

- [启动器输出、训练器错误以及失败的 init](evidence/the-error.txt)
- [该错误的排障条目](evidence/manual-entry.txt)
- [参数值的来源，以及两边都接受的一对组合](evidence/why-the-value-was-wrong.txt)
- [真正的 on-policy 契约：模型、kernel 和两项检查](evidence/the-contract.txt)

## Questions

1. 哪个进程抛出了错误？错误打印了哪个列表？
2. 这种失败与启动时终止的 rollout 引擎有什么不同？
3. 为什么引擎接受的名称传给训练器就不是有效名称？
4. 在这台机器上，是否存在一组设置能让两边运行同一个 kernel？
5. 你需要修改什么？下一份日志中的哪一行能证明运行是健康的？

## Walkthrough

1. **读报错。** 训练器抛出 `ValueError: Specified attn_implementation="triton" is not supported`，并打印了它接受的名称：`eager`、`flash_attention_2`、`flash_attention_3`、`flash_attention_4`、`sdpa`、`flex_attention` 及其分页形式。来自训练器控制器的下一行在 0.7 s 后记录 `fn=init` 的 `phase=fail`。训练器从未启动，作业明确报告并停止了。启动器那一行与失败行相隔一分钟。相比之下，终止的 rollout 引擎会让作业带着 HTTP 503 错误运行一个小时。
2. **匹配手册条目。** 排障页有这个症状：已安装的 transformers 库不接受的训练器注意力名称，例如 `triton`。检查结果是列出受支持实现的 `ValueError`，修复方法是从该列表中选择一个。手册的运行保持训练器设置为默认值。
3. **看名称从何而来。** 引擎和训练器维护着两个不同的列表。在 FSDP actor 中，只有当构建环境报告为 AMD GPU 时，才会启用通往引擎 Triton 注意力的桥接。在 NVIDIA GPU 上，该值直接传递给 transformers 库，而该库没有名为 `triton` 的注意力实现。工程师复制的示例是用于另一种 GPU 的。
4. **读契约。** Miles 中只有一种配对能让两边运行同一个 kernel：针对契约中规定的稠密 Qwen3 模型，引擎使用 `fa3` 后端，训练器使用 `flash_attention_3`；而该 kernel 只接受计算能力为 8.0 到 9.0 的 GPU。GB10 在该范围之外，所以在这台机器上，没有设置能让两边运行同一个 kernel。契约之外手册的建议是观察差距并降低其采样器部分。

## Resolution

移除训练器侧的注意力参数，或者将其设为错误列表中列出的名称。让引擎保持在其原生后端。这两个列表是不同的，而且让两边比特级精确一致的唯一配对需要 Hopper GPU，而这台机器不是。健康的运行会在几分钟内显示一行 `rollout 0`，并且第 0 步的差距落在该机器健康运行的范围内（对于没有 top-p 或 top-k 的该模型，范围为 0.0136 到 0.0164）。

## Wrong turns

- "镜像坏了，拉取另一个 tag。" 错误是训练器库对照自己的名称列表做的值检查。手册的运行使用这个镜像和默认名称成功跑完了。
- "给引擎传入和训练器相同的名称，让名称对齐。" 引擎接受 `triton`，训练器不接受。对齐名称并不能带来对齐的 kernel，训练器依然会拒绝启动。
- "使用契约配对，在两边都用 FlashAttention 3。" 引擎的 FA3 后端在启动时因计算能力范围而拒绝 GB10，随后作业会在一个终止的引擎上空转一小时。

## Generalize

两个读取同一个词的组件，读取的并不是同一件事。每个组件都会根据自己的列表检查设置，而打印出该列表的错误是你所能得到的最快修复提示。读该列表，从中选择，不要指望一个共享的名称能换来共享的数值表现。服务器和训练器之间的比特级一致性是包含模型列表和硬件范围的契约，而不是一个参数。

## Taught in

Miles 手册在[症状表](../../../manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md)中列出了这个错误，在[真正的 on-policy 限制页](../../../manuals/miles-101/sections/4-6-know-the-true-on-policy-limits.md)中给出了两边必须满足的契约，SGLang 手册在其 [RL rollout 引擎页](../../../manuals/sglang-101/sections/7-2-sglang-as-an-rl-rollout-engine.md)中展示了同一次运行以及该参数值的来源。
