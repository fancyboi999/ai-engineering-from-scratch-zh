---
id: an-8b-model-on-a-24-gb-card
title: 为什么 8B 模型在 24 GB 显卡上启动失败
card: gpu-memory-quantization
kind: estimate
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [screen, debugging]
tags: [max-model-len, kv-pool, startup, l4, fp8]
minutes: 8
lessons: []
manuals: [vllm-101#s-serve-long-contexts-and-hybrid-models, vllm-101#s-count-the-memory-before-you-pick-a-gpu, sglang-101#s-quantization]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

你的队友在 L4 显卡上以 BF16 格式启动 Qwen/Qwen3-8B 且未带任何参数，启动失败并报错提示关于 KV cache 和 --max-model-len。同样的命令在更大的显卡上可以正常运行。用具体数据解释这次失败，并说明应如何配置。

## Short answer

模型配置给出了 40,960 token 的上下文长度，若未指定，vLLM 会以此作为最大长度。在每个 token 占用 144 KiB 的情况下，一条该长度的请求就需要 5.6 GiB 的 KV cache，而在 24 GB 显卡上，16.4 GB 的权重占完后剩余空间可能不足该数值，导致启动检查在打印显存池信息前就报错退出。将 `--max-model-len` 设置为用户发送的最长 prompt 加回答的总长度；显存池大小保持不变，该上限仅阻止单条请求占满全部显存池。

## Full answer

### 算术推导

BF16 格式下的 Qwen3-8B 权重占用 16.4 GB。SGLang 在同一张显卡上实测的加载占用为 15.28 GB，剩余 6.59 GB，并在显存比例设为 0.85 时，从中规划出 24,094 token 的显存池，其中键占 1.65 GB，值占 1.65 GB。这种大小的池大约可容纳 3.31 GiB。在默认长度 40,960 token 下，单条请求需要 40,960 乘以 144 KiB，即 5.6 GiB，超过了整个显存池的容量。vLLM 会检查显存池是否至少能容纳一条达到最大长度的请求，因此启动中止。

### 明确设置长度

将 `--max-model-len` 设置为用户实际发送的最长 prompt 加回答的总长度。显存池的大小保持不变。更短的限制仅阻止单条请求占满整个显存池，并使启动检查通过。此时显存池信息行会打印该长度下的最大并发数：在 L4 显卡上的输出为 `GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x`。实际请求通常远短于该上限，因此能容纳更多请求：比如大约 37 位用户，每人 512 个 prompt token 和 128 个输出 token。

### 升级后检查长度

部分模型通过缩放方法扩展上下文。在 0.30.0 版本中，vLLM 更改了读取该方法的方式，部分模型从配置派生出的长度因此变短；发布说明中给出了一个模型从 131,072 token 变为 32,768 token 的例子。升级之后，应在启动日志中检查派生长度，若发生变动则自行显式配置。

### 腾出空间的其他途径

该模型的 FP8 权重在 L4 上加载占用 8.81 GB，剩余 13.06 GB。若 cache 也采用 FP8，显存池可容纳 142,369 token，而原先仅为 24,094。显存比例设置过低则会产生相反的效果：在 0.74 时 BF16 显存池为 6,559 token，4 个共享且各占 2,048 token 的 prompt 无法同时放下。

### 检查配置

显存池信息行仅在启动成功时打印。如果启动因 cache 和最大长度相关的报错而中止，可调低 `--max-model-len` 直至该行正常打印，读取其并发数，并与计划全长服务的用户规模对比。

## Follow-ups

- **Level 2:** 调低最大模型长度会带来更多并发用户吗？ Expected: 不会；显存池大小保持不变，该限制仅阻止单条请求占满全部显存池并允许启动检查通过；要容纳更多用户需要更大的显存池，可通过 FP8 cache、FP8 权重或更大的显卡实现。
- **Level 3:** 同样的模型上个月可以启动，升级后使用相同参数却启动失败。你会检查什么？ Expected: 启动日志中派生出的上下文长度；某次发布更改了缩放方法的读取方式，导致某模型的长度从 131,072 降至 32,768，反向的变化则可能导致检查失败，因此应自行显式设置长度。
- **Level 4:** 在同一张卡上改用 FP8 权重且 cache 也为 FP8 时，估算显存池大小。 Expected: 权重降至 8.81 GB，留出 13.06 GB，且每个 token 占用的字节数减半，因此在手册实测中显存池从 24,094 token 增长至 142,369 token。

## Wrong answers

- "这张卡对 8B 模型来说太小了。" 显存容纳权重后还剩约 6.59 GB；检查失败是因为单条默认 40,960 token 的请求需要 5.6 GiB cache，只需将长度设置为用户实际发送的大小即可。
- "调高显存比例让它启动。" 5.6 GiB 与剩余空间的差距不是在这个显卡上微调比例步长能弥补的；长度才是调节杠杆，且比例设得过高会导致没有激活显存。
- "降低最大长度以容纳更多用户。" 它只解决能否启动的问题，不能增加用户数；显存池大小不会随此限制改变。
- "KV 显存池是根据权重大小规划的。" 显存池是根据权重和启动分析后剩余的空间规划的，应关注可用的 KV 显存日志行，而不是参数量。

## Taught in

[服务长上下文和混合模型](../../../manuals/vllm-101/sections/2-6-serve-long-contexts-and-hybrid-models.md)讲解了长度检查，[选择 GPU 前先计算内存](../../../manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md)讲解了显存池规划，[--quantization 与 --kv-cache-dtype](../../../manuals/sglang-101/sections/4-3-quantization.md)展示了同一张显卡的启动日志输出行。
