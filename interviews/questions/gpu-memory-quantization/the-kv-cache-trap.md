---
id: the-kv-cache-trap
title: 模型现在只有 35 GB，所以装得下
card: gpu-memory-quantization
kind: concept
level: 1
roles: [inference-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [kv-cache, gpu-memory, quantization, capacity]
minutes: 5
lessons: [phases/17-infrastructure-and-production/09-production-quantization]
manuals: [vllm-101#s-count-the-memory-before-you-pick-a-gpu, sglang-101#s-kv-bytes-per-token-and-the-kv-pool]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

队友说：我们把 70B 模型量化到了 4 位，现在它只有 35 GB，在一张 80 GB 显卡上完全装得下，而且绰绰有余。这句话遗漏了什么？

## Short answer

KV cache。权重量化仅缩小了权重，而运行中请求所需的缓存是单独的显存预算，通常保持在 BF16 或 FP8 格式，且随处理中的每个 token 增长；在 128 并发及 2k 上下文下，课程粗略估算 70B 模型对应的 cache 接近 20 GB，再加上约 5 GB 的激活显存，80 GB 显卡上的总占用约为 60 GB。这 20 GB 只是课程给出的粗略参考值，因此必须对照模型配置核实：Llama-3.1-70B 在 BF16 下每个 token 占用 320 KiB，128 条打满 2k token 的请求需要的显存大约是课程估算值的 4 倍，根本无法在单张 80 GB 卡上与模型权重共存。必须将权重、峰值并发与上下文下的 cache、以及激活显存合并统筹预算，并在启动后检查启动日志中打印的显存池大小。

## Full answer

### 显存预算包含三个部分

课程针对带有 4 位量化权重的 70B 模型的测算：

| 组成部分 | 大小 |
|---|---|
| 模型权重（FP16 下 140 GB 量化为 4 位） | 约 35 GB |
| 128 并发、2k 上下文下的 KV cache | 约 20 GB |
| 激活值（Activations） | 约 5 GB |
| 总计 | 约 60 GB |

“模型现在只有 35 GB”这句话遗忘了缓存与激活值。必须将显卡显存作为一个整体来做预算，并根据你的模型配置来计算缓存：Llama-3.1-70B 在 BF16 下每个 token 占用 320 KiB，因此在打满 2k 上下文时，单是缓存本身就是表中 20 GB 的约 4 倍。

### 缓存显存的去向

运行中请求的每个 token 都会在 GPU 显存中保存其 key 和 value，直到请求结束。每个 token 的字节数由模型配置中的四个数字决定：层数乘以 KV 头数乘以头维度乘以 2（分别对应 key 和 value），再乘以每个数值的字节数。Qwen3-8B 在 BF16 下每个 token 占用 144 KiB，而 Qwen3-30B-A3B 占用 96 KiB，因为决定该数值的是 KV 头数而不是参数总量。引擎在扣除权重和启动分析后，将剩余显存划给缓存；所能容纳的用户数即为显存池除以单个用户持有的上下文长度（prompt 加上输出）。在 GB10 上，30B 模型的权重占用了 56.93 GiB，留给缓存 31.32 GiB，在每 token 96 KiB 下大约能容纳 342,000 token。

### KV cache 量化是一项独立的决策

FP8 缓存使每个 token 的字节数减半，从而在相同上下文长度下容纳两倍的用户。它是独立于权重格式的一项决策，带有自身的缩放因子，并直接影响注意力计算的数值，因此需要单独评估准确率。仅量化权重并不能缩减缓存大小。

### 如何容纳更多请求（按代价由低到高排序）

1. 将最大模型长度下调至实际请求的最大值。这不会增加显存池大小，但可以防止单个极端请求占满全部池。
2. 使用 FP8 KV cache。
3. 使用 FP8 或 4 位量化权重，从而释放更多显存给缓存。
4. 使用更大显存的 GPU，或将模型切分到多张卡上。

### 查看启动日志

每次启动后读取两行日志：权重加载信息行与可用 KV cache 显存信息行。显存池日志行随后会给出 token 数量及全长下的最大并发度（该并发度假定每个用户都达到最大长度；实际请求往往更短，因此可容纳更多用户）。

## Follow-ups

- **Level 1:** 在用于推理服务的 GPU 上，哪三部分会占用显存？ Expected: 权重、处理中 token 的 KV cache、以及激活值与启动运行显存；引擎在扣除其他两者后的剩余空间全部分配给缓存。
- **Level 2:** KV cache 随什么指标增长？ Expected: 运行中并发请求的数量，以及每个请求所持有的上下文长度（prompt 加上输出），因此它随并发度和上下文长度增长，而不随模型权重增长。
- **Level 3:** 将权重做 4 位量化与将 cache 做 FP8 量化是两项不同的决策，为什么？ Expected: 权重属于固定开销，其量化改变的是矩阵乘法；cache 随每个 token 分配，其量化直接改变注意力计算的数值，因此需要独立的准确率验证和专属的缩放因子。
- **Level 4:** 在启动日志的什么位置确认显存预算是否合理？ Expected: 权重加载日志行、可用 KV cache 显存日志行、以及带有最大并发度的显存池大小日志行；用显存池除以每用户的实际 prompt 加输出长度，而不是除以最大模型长度。

## Wrong answers

- "模型只有 35 GB，剩下的显存全都可以给用户。" KV cache 和激活显存会先占去份额；在 128 并发及 2k 上下文下，课程粗算 cache 接近 20 GB，总显存占用接近 60 GB。
- "量化权重同时也缩小了缓存。" 缓存依然保持其自身的数据类型；只有量化缓存时它才会减半，而那是另一项独立的决策，带有自己的准确率影响。
- "因为模型小，所以缓存也很小。" 单 token 字节数取决于层数和 KV 头数；30B 专家模型每 token 占用 96 KiB，而 8B 稠密模型每 token 占用 144 KiB。

## Taught in

[生产量化课程](../../../phases/17-infrastructure-and-production/09-production-quantization/docs/en.md)指出了这一陷阱，[选择 GPU 前先计算内存](../../../manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md)给出了缓存的计算方法。
