---
id: kv-bytes-per-token
title: 根据配置计算每个 token 的 KV 字节数
card: gpu-memory-quantization
kind: estimate
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [screen, ml-depth]
tags: [kv-cache, bytes-per-token, grouped-query-attention, mla, capacity]
minutes: 8
lessons: []
manuals: [vllm-101#s-count-the-memory-before-you-pick-a-gpu, sglang-101#s-kv-bytes-per-token-and-the-kv-pool, sglang-101#s-quantization]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

给出两个模型配置。模型 A：36 层，8 个 KV 头，头维度 128。模型 B：48 层，4 个 KV 头，头维度 128，参数量几乎是前者的 4 倍。估算两者在 BF16 下每个 token 的 KV cache 字节数，指出在相同大小的 KV 显存池中哪一个能容纳更多用户，并解释为什么参数量容易让人产生误判。

## Short answer

每个 token 的 KV 字节数等于 2 乘以层数乘以 KV 头数乘以头维度乘以每个数值的字节数，其中乘 2 是分别统计键和值。模型 A（即 Qwen/Qwen3-8B）每 token 占用 2 x 36 x 8 x 128 x 2 字节，即 144 KiB；模型 B（即 Qwen/Qwen3-30B-A3B）占用 2 x 48 x 4 x 128 x 2 字节，即 98,304 字节或 96 KiB。参数量更大的模型每 token 保留的字节数反而更少，在同等大小的显存池中能容纳更多用户，因为决定缓存开销的是 KV 头数和层数，而不是总参数量。但在单张显卡上，更大的模型需要空间来容纳近 4 倍的权重，因此其显存池更小，总共可容纳的用户数反而可能更少。

## Full answer

### 公式推导与日志核验

```text
KV bytes per token = 2 x layers x KV heads x head size x bytes per value
```

从模型配置中读取前三个数值：`num_hidden_layers`、`num_key_value_heads` 和 `head_dim`。在 BF16 格式下一个数值占 2 字节；在 FP8 缓存下一个数值占 1 字节。SGLang 会在启动时打印该计算结果。对于 Qwen3-0.6B，日志显示 `bytes_per_slot=114688`，显存池日志行给出了所有计算项：28 层，8 个 KV 头，头维度 128 以及 bfloat16。其乘积为 2 x 28 x 8 x 128 x 2，等于 114,688 字节或 112 KiB。公式与日志输出完全吻合，分毫不差。

### 公开模型配置的算术对比

| 模型 | 注意力架构 | BF16 下每 token 字节数 | 单 GPU 显存占用 |
|---|---|---|---|
| Qwen3-0.6B | GQA, 28 层, 8 个 KV 头 | 112 KiB | 单 GPU 上 112 KiB |
| Qwen3-8B | GQA, 36 层, 8 个 KV 头 | 144 KiB | 单 GPU 上 144 KiB |
| Qwen3-30B-A3B | GQA, 48 层, 4 个 KV 头 | 96 KiB | 单 GPU 上 96 KiB |
| Llama-3.1-8B | GQA, 32 层, 8 个 KV 头 | 128 KiB | 单 GPU 上 128 KiB |
| Llama-3.1-70B | GQA, 80 层, 8 个 KV 头 | 320 KiB | 8 路张量并行下单 GPU 上 40 KiB |
| DeepSeek-V3 | MLA, 61 层, 潜在维度 512 加 64 | 68.6 KiB | 每张 GPU 上均为 68.6 KiB |

有两个结果常出人意料。0.6B 模型每个 token 的开销几乎和一个 8B 模型一样高。而在 Llama-3.1-8B 上，一段 100,000 token 的对话会产生 12.2 GiB 的 KV cache，几乎与模型权重本身的大小相当。

### 为什么参数量会带来误导

在分组查询注意力（GQA）中，多个 query 头共享一个 key 头和 value 头，因此现代模型的 KV 头数量远少于注意力头数量，且 KV 头数量是一项独立的架构设计决策，并不与总参数量成比例。作为混合专家（MoE）模型的 30B 权重几乎是稠密 8B 模型的 4 倍，但每个 token 占用的字节数却仅为后者的三分之二。

多头潜在注意力（MLA）为每个 token 存储一个压缩后的潜在向量，而不是每个头分别存储独立的 key 和 value。它在单 token 尺度上很小，但每个张量并行 rank 都必须存储完整的潜在向量，因此通过张量并行增加 GPU 数量并不能增加可用 token 数量。

### 将字节数转换为显存池容量

推理引擎在扣除权重和启动分析后的剩余空间全部分配给缓存。在装有 30B 模型的 GB10 上，以每 token 96 KiB 计算，31.32 GiB 的 KV 显存可容纳约 342,000 token。在装有 Qwen3-8B 的 L4 上，以 144 KiB 计算，24,096 token 的显存池容量为 3.31 GiB。将显存池容量除以单个用户持有的上下文长度（prompt 加上输出），即可得到可容纳的并发用户数。FP8 缓存可使字节数减半：对于 30B 模型，每个 token 仅需 49,152 字节而非 98,304 字节，结合 FP8 权重后，GB10 显存池从 227,243 激增至 1,083,008 token。

### 在何处查看这些数值

vLLM 会打印 `Available KV cache memory` 与 `GPU KV cache size`，并给出全长下的最大并发度。SGLang 会打印 `bytes_per_slot` 或带有 token 数量的 `KV Cache is allocated` 行，而 `max_total_num_tokens` 则是整个计算的最终结果。在做规划之前，务必核对理论计算值与日志输出一致。

## Follow-ups

- **Level 2:** Qwen3-0.6B 拥有 28 层、8 个 KV 头，头维度为 128。单个 token 占用多少字节，日志里记录了什么？ Expected: 2 x 28 x 8 x 128 x 2 字节，等于 114,688 字节或 112 KiB；启动日志打印了 bytes_per_slot=114688，公式与日志分毫不差。
- **Level 3:** 一个拥有 80 层和 8 个 KV 头的稠密 70B 模型通过张量并行切分在 8 张 GPU 上。每张 GPU 上每个 token 占用多少显存？ Expected: 总计 320 KiB，每张 GPU 上 40 KiB，因为张量并行将 KV 头切分到了各个 rank 上。
- **Level 4:** 为什么同样的切分无法帮到潜在注意力模型？ Expected: 该注意力机制为每个 token 存储一个压缩后的潜在向量（61 层模型约为 68.6 KiB），无法按头切分；每个 rank 都必须存储完整的潜在向量，因此 8 张 GPU 存储了 8 份副本，不能增加可用 token 数量。

## Wrong answers

- "更大的模型每个 token 总是需要更多 KV cache。" 层数和 KV 头数决定了开销；30B 专家模型每个 token 仅占用 96 KiB，而 8B 稠密模型占用 144 KiB。
- "小模型只需要很小的缓存。" Qwen3-0.6B 每个 token 占用 112 KiB，几乎和一个 8B 模型一样多，因为它有 28 层和 8 个 KV 头。
- "张量并行总是能提升 KV 容量。" 它切分了分组查询模型的 KV 头，但潜在注意力模型在每个 rank 上都保存完整的潜在向量，因此增加 rank 并不能增加 token 容量。
- "计算出权重大小然后用显存减去它就是缓存大小。" 引擎还会保留启动分析和计算图显存；应直接读取启动日志中的可用 KV 显存与显存池大小，再除以单 token 字节数。

## Taught in

[选择 GPU 前先计算内存](../../../manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md)与[KV 池与每个 token 的字节数](../../../manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md)推导了公式并对照日志核对无误，[--quantization 与 --kv-cache-dtype](../../../manuals/sglang-101/sections/4-3-quantization.md)展示了利用 FP8 使其减半的过程。
