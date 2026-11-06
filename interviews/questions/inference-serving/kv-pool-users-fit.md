---
id: kv-pool-users-fit
title: KV 池能装下多少用户
card: inference-serving
kind: estimate
level: 2
roles: [inference-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [kv-cache, gpu-memory, capacity, max-model-len]
minutes: 10
lessons: [phases/07-transformers-deep-dive/12-kv-cache-flash-attention]
manuals: [vllm-101#s-count-the-memory-before-you-pick-a-gpu]
practice: []
cheatsheet: [serving-engines-compared]
related: [inference-serving/goodput-sets-the-cap]
updated: 2026-11-03
---

你在一张 GPU 上部署 `Qwen/Qwen3-8B`，最大模型长度设为 8,192 token。启动时服务器打印出最大并发数 2.94，一位经理问：这张 GPU 是不是同时只能服务三个用户？你的用户每次发约 512 个 prompt token，收到约 128 个 token。你怎么回答？

## Short answer

启动时的这个数字假设每个用户都用满最大模型长度，而真实用户占用的要少得多。先算出一个 token 的 KV 字节数，用 KV 池除以它，再用池除以一个用户实际占用的上下文。在 vLLM 手册的 L4 上，24,096 token 的池能装下 37 个各占 640 token 的用户。

## Full answer

### 一个 token 占多少字节

运行中请求的每个 token 都会把它的 key 和 value 留在 GPU 显存里，直到请求结束：

```text
KV bytes per token = layers x KV heads x head size x 2 x bytes per value
```

因子 2 分别算 key 和 value。`Qwen/Qwen3-8B` 有 36 层，8 个 KV head，head size 为 128。BF16 下每个值占 2 字节，所以一个 token 占 144 KiB。决定这个数的是 KV head，而不是参数量：`Qwen/Qwen3-30B-A3B-Instruct-2507` 的权重更多，每个 token 却只占 96 KiB。

### 从字节到用户

服务器把加载权重、完成启动 profile 后剩下的显存交给 KV cache。日志里池的那一行以 token 为单位给出结果：

```text
GPU KV cache size: 24,096 tokens, Maximum concurrency for 8,192 tokens per request: 2.94x
```

2.94 是用池除以完整的 8,192 token 得到的。一个发 512 个 prompt token、收 128 个输出 token 的用户，在回答结束时占 640 个 token。同一个池能装下 37 个这样的用户。负载压测时，日志显示有 40 个运行中的请求，缓存满了 99.5%，因为刚开始回答的用户占的 token 更少。

### 仍然不够时改什么

1. 把最大模型长度降到用户实际发送的最长上下文。这能防止一个长请求占掉池的一大块。在这里它不会增加用户数，因为池的大小不变。
2. 使用 FP8 KV cache。它把每个 token 的字节数减半。
3. 使用 FP8 权重，给缓存腾出显存。
4. 换显存更大的 GPU，或者把模型切分到多张 GPU 上。

## Follow-ups

- **Level 2:** 一个请求需要的块比空闲块还多时，会怎样？ Expected: 它在队列里等待。一个运行中的请求需要新块而没有空闲块时，会被停下，之后重新计算。
- **Level 2:** 为什么混合专家模型每个 token 的 KV 显存比 dense 模型还少？ Expected: 它的 KV head 更少，而决定每 token 字节数的是 KV head，不是权重。
- **Level 3:** 启动之后，你怎样核对自己的计算？ Expected: 读启动日志里显存那一行和池那一行，与根据模型配置算出的结果对比。
- **Level 3:** FP8 KV cache 的代价是什么？ Expected: 可能损失质量，所以上线前在你自己的评测上测一下。

## Wrong answers

- "用 GPU 显存除以模型大小。" 权重只是其中一部分。能装下多少用户取决于 KV 池和每个用户的上下文。
- "日志里的最大并发数就是用户上限。" 它假设每个用户都用满最大模型长度，真实用户不会这样。
- "参数越多，每个 token 的 KV 显存一定越多。" 每 token 字节数取决于层数、KV head 数和 head size。

## Taught in

[vLLM 101 的显存一节](../../../manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md)根据启动日志计算池的大小，[KV cache 一课](../../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)动手构建了这个缓存。
