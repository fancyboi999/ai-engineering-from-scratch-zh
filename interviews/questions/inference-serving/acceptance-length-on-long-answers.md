---
id: acceptance-length-on-long-answers
title: 各 draft 位置的接受率与每次验证提交的 token 数
card: inference-serving
kind: estimate
level: 3
roles: [inference-engineer]
rounds: [ml-depth, debugging]
tags: [speculative-decoding, eagle3, acceptance-length, long-outputs]
minutes: 8
lessons: []
manuals: [vllm-101#s-speed-up-decode-with-eagle3, sglang-101#s-speculative-decoding]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

一台 vLLM 服务器运行 Qwen/Qwen3-8B，搭配深度为 3 的 EAGLE3 draft。在 8 个用户、回答长度接近 2,000 token 的一轮运行中，计数器显示：位置一的 draft 被接受的概率是 0.77，位置二是 0.54，位置三是 0.38。估算一次验证平均提交多少个 token，并说明在长回答上依赖这个收益之前，你会先检查什么。

## Short answer

每次验证提交被接受的 draft，再加上目标模型给出的一个额外 token，所以平均接受长度等于一加上各位置接受率之和。代入 0.77、0.54 和 0.38，约为每次 2.69 个 token，这正是 vLLM 在那次运行中报告的 GSM8K 数值。在长回答上相信它之前，我会单独看最长那批回答的接受率，使用真实输出长度，不开 ignore-eos，因为另一项研究发现，回答长度接近 20,000 token 时，接受长度从约 3.7 降到了约 1.5。

## Full answer

### 算术

各位置的接受率已经包含了链条的先后顺序：只有位置一被接受，位置二才可能被接受，0.54 是位置二被接受的次数占全部验证次数的比例。被接受的 draft 数的期望就是各位置接受率之和，而目标模型总会再加一个自己的 token，所以：

```text
mean acceptance length = 1 + 0.77 + 0.54 + 0.38 = 2.69
```

同一次运行在 ShareGPT 上的接受率是 0.67、0.42 和 0.26，结果是 2.35。两者都与 vLLM 从计数器报告的平均接受长度一致。

### 手册在长回答上测到的结果

Qwen/Qwen3-8B，BF16，8 个用户，回答最长 2,048 token，不开 ignore-eos，回答长度中位数在 1,800 到 2,000 token：

| 引擎 | 数据集 | 平均接受长度 | draft 位置 1 / 2 / 3 的接受率 |
|---|---|---|---|
| SGLang EAGLE3 | GSM8K | 2.68 | |
| SGLang EAGLE3 | ShareGPT | 2.32 | |
| vLLM EAGLE3 | GSM8K | 2.69 | 0.77 / 0.54 / 0.38 |
| vLLM EAGLE3 | ShareGPT | 2.35 | 0.67 / 0.42 / 0.26 |

在同一会话里的 128 token 短回答上，SGLang 在 GSM8K 上是 2.69 到 2.78，在 ShareGPT 上是 2.33 到 2.43。它的长回答结果与这些区间相差不超过 0.01。

### 按回答内的位置

第二个测试用 8 个 prompt，开启思考模式，贪心解码，1 个用户，最长 4,096 token，分段读取接受长度：

| 输出区间 | SGLang | vLLM |
|---|---|---|
| 0 至 256 | 2.05 至 2.64（8） | 2.14 至 2.51（8） |
| 256 至 512 | 1.95 至 2.64（8） | 2.09 至 2.55（8） |
| 512 至 1,024 | 2.11 至 2.77（8） | 2.12 至 2.79（8） |
| 1,024 至 2,048 | 2.09 至 2.47（5） | 1.72 至 2.66（5） |
| 2,048 至 4,096 | 2.33 和 2.48（2） | 2.35 和 2.60（2） |

在 4,096 token 以内，接受长度没有持续下降。8 个 prompt 中只有 2 个超过了 2,048 token，所以最后一段只靠两条回答，而 4,096 这个上限来自那张 GPU 的显存。因此，这个测试没有覆盖到那项研究观察到下降的长度范围。

### 接受长度确实下降的情况

有一次事故的原因不同。一份 draft 配置只有 2,048 个位置，没有 rope scaling，在 1k 输入 token 时接受 3.2 个 token，3k 时 1.6 个，10k 时 1.2 个。10k 时，服务器每秒产出 63.9 个 token，不开推测解码时是 102.7。draft 读不了超出位置上限的内容。在 draft 配置里加上 rope scaling 和 131,072 个位置后，问题解决。跳过上下文检查的覆盖变量只是去掉了检查，并不能让 draft 读懂长 prompt。

### 要看哪些指标

- vLLM：`/metrics` 里的 `spec_decode_num_draft_tokens` 和 `spec_decode_num_accepted_tokens`，以及日志中的 `SpecDecoding metrics` 行。
- SGLang：每行 decode 日志里的 `accept len` 和 `accept rate`，`/metrics` 里的 `sglang:spec_accept_length`，以及每个 `/generate` 响应 `meta_info` 中的 `spec_accept_length`，它给出每条回答的值。
- 对比开启和关闭 draft 时的 P99 ITL 与 P99 TTFT，并把 draft 的 `max_position_embeddings` 与你最长的 prompt 对比。

## Follow-ups

- **Level 3:** 为什么总会有那个额外 token？ Expected: 目标模型会在最后一个被接受的 draft 之后再算一个位置的分布，所以即使每个 draft 都被拒绝，这次验证仍会写出一个自己的 token，和普通解码一样。
- **Level 3:** ShareGPT 上三个位置的接受率是 0.67、0.42 和 0.26。接受长度是多少，为什么低于 GSM8K？ Expected: 2.35；开放式聊天比数学步骤和代码更难让 draft 猜中，所以与目标模型一致的 draft 更少。
- **Level 4:** 一个只有 2,048 个位置的 draft，在 1k 输入 token 时接受长度为 3.2，10k 时为 1.2。原因是什么，怎么修？ Expected: draft 读不了超出位置上限的内容，所以 prompt 越长，它猜得越差；在 draft 配置里加上 rope scaling 和更多位置就修好了，覆盖变量只是去掉检查。

## Wrong answers

- "平均接受长度是三个接受率的平均值。" 它是被接受 draft 数的期望，即各接受率之和，再加上额外 token；0.77 加 0.54 加 0.38 再加一是 2.69，不是一个小于一的值。
- "接受长度 2.69 就是 2.69 倍的速度。" 每次验证还要付出 draft 步骤和校验的开销；在 L4 上，dense 模型每个 token 快了 1.6 到 2.3 倍，而从 32 个用户起总输出速率不再增加，因为 draft 占用了池空间。
- "长回答会保持短回答的接受长度。" 在手册自己到 4,096 token 的测试中确实如此，但另一项研究发现接近 20,000 token 时它从约 3.7 降到约 1.5，位置太少的 draft 也会随 prompt 变长从 3.2 降到 1.2；要看你自己的长回答。

## Taught in

[用 EAGLE3 加速 decode](../../../manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md)和 [SGLang 推测解码一节](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md)给出了按位置和按回答长度划分的接受长度表。
