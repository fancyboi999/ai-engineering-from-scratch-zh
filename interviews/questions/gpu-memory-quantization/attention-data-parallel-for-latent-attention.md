---
id: attention-data-parallel-for-latent-attention
title: 同一个 KV cache 的八份副本
card: gpu-memory-quantization
kind: concept
level: 4
roles: [inference-engineer]
rounds: [ml-depth, system-design]
tags: [attention-data-parallel, mla, tensor-parallel, kv-cache, moe]
minutes: 10
lessons: []
manuals: [sglang-101#s-tp-size-dp-size-and-attn-dp-size, sglang-101#s-kv-bytes-per-token-and-the-kv-pool]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

队友在 8 张 GPU 上使用 `--tp-size 8` 服务一个采用潜在注意力（MLA）的模型，并询问为什么在 640 GB 显存上服务器能容纳的 KV token 却如此之少。解释张量并行切分如何处理该缓存，注意力组模式改变了什么，以及它在没有独立参数的情况下隐式更改了什么。

## Short answer

潜在注意力在每个 token 和每一层仅存储一个压缩后的潜在向量（latent），在 61 层的模型中约占 68.6 KiB，而张量并行无法将单个注意力头切分到多张 GPU 上，因此 8 个 rank 中的每一个都必须为每个 token 存储完整的缓存：产生了 8 份副本，而可用 token 容量并没有增加。注意力数据并行（attention data parallelism）在张量组内部让注意力层以数据并行方式运行，每个组拥有独立的调度器、请求和 KV cache，而专家层依然切分在所有 GPU 上，因此 KV 容量随组数线性增长；针对这类模型，推荐拓扑为 `--attn-dp-size 8` 配合 `--tp-size 8`。它还会将分块 prefill 大小除以组数，并将调度保守系数乘以 0.3，使在单张 GPU 上调优过的分块变小，请求准入变得更加激进。

## Full answer

### 单个通信域，多种切分方式

模型通信域（world）是指容纳一份完整模型副本的 GPU 集合，SGLang 仅由两个数字构建它：world size 必须等于 `--tp-size` 乘以 `--pp-size`。注意力数据并行、专家并行和上下文并行并不会额外增加 GPU。它们只是针对不同的层，将张量组内的 GPU 重新分组。这些参数的默认值全都是 1。

### 数据并行的两种含义

使用 `--dp-size` 的数据并行表示模型的多个完整副本，每个副本有自己的请求和 KV cache，位于控制器之后，默认轮询分发请求。使用 `--attn-dp-size` 的注意力数据并行表示在同一个张量组内部，注意力层以数据并行方式运行，而前馈层或专家层依然切分在所有 GPU 上；`--attn-dp-size 4` 配合 `--tp-size 8` 会产生 4 个注意力组，每组 2 张 GPU。

在 v0.5.22 之前，单个参数承担了这两种含义：`--dp-size` 用于计算副本数，除非设置了 `--enable-dp-attention`，此时它表示注意力组数。2026-09-30 合并的提交用一句话说明了原因：该参数有两种截然不同的含义，每个读者都必须同时查看两个参数才能确定是哪种。在锁定的版本中，`--dp-size 8 --enable-dp-attention` 会被重写为 `--attn-dp-size 8 --dp-size 1` 并输出弃用警告，`--dp-size 2 --attn-dp-size 4` 会报错因为不支持副本与注意力组混用，代码注释指出旧参数将在 2026-12-31 之后移除。网上的许多部署配置仍在使用旧写法。

### 为什么注意力层需要独立模式

潜在注意力为每个 token 和每一层存储一个压缩后的潜在向量，实际上相当于只有 1 个 KV 头。张量并行无法将单个头切分到多张 GPU 上，因此在 `--tp-size 8` 下，每张 GPU 都必须为每个 token 保存完整的潜在缓存，8 张 GPU 保存了 8 份完全相同的副本。使用注意力数据并行后，每个组只维护自己的请求，KV 容量便随组数增长。引入该模式的团队报告这类模型的 decode 吞吐量最多提升至 1.9 倍（此为其声称数据）。对于采用分组查询注意力（GQA）的稠密模型，此逻辑不成立：它具有多个 KV 头，张量并行在切分其缓存时无需复制，只要张量大小不超过 KV 头数量即可。一旦超过该数量，每个 KV 头也会被复制到多个 rank。

### 两个伴随副作用

开启注意力数据并行会改变另外两项配置。分块 prefill 大小会被除以组数，例如在单张 GPU 上调优的 8192 分块在 8 个组下会变为 1024，日志会打印新旧数值；长 prompt 进而需要消耗更多调度步数。调度保守系数会乘以 0.3，使调度器在准入新请求时为后续 token 预留更少的空间。

### 现场实测数据

一个在比赛中调优潜在注意力模型的学生团队，使用纯 16 路张量并行在单节点离线测得约 5.9k tok/s，而改用张量 4、数据 4、流水线 2 配合注意力数据并行的布局后达到 17,417 tok/s；请将其视为单一参考点，因为其报告中对显存比例的解释有误。该模型家族的一个生产部署在两个节点上运行 decode，配置为 16 个注意力组与 16 路专家并行。可监控 `sglang:dp_attention_token_imbalance_ratio`（最繁忙组的 token 数与平均值之比），1.0 表示完全均衡。

### 架构结论

使用张量并行仅为了装下模型本身，不要过度使用。通过副本扩展容量，无论是单服务器内部还是网关之后，保持显存池均衡。对于潜在注意力专家模型，将注意力组数设置为等于张量大小；对于稠密分组查询模型，保持为 1。

## Follow-ups

- **Level 3:** 为什么同一台服务器运行稠密分组查询模型时不需要注意力组？ Expected: 该模型具有多个 KV 头，只要 KV 头数量不少于 rank 数量，张量并行就可以在各 rank 间切分缓存而无需复制；只有当注意力机制仅保留不可分割的单个潜在向量时，才会出现副本问题。
- **Level 4:** 去年的一份配置同时传入了旧的副本参数和注意力参数。在锁定的版本中会发生什么，应该如何改写？ Expected: 服务会将其重写为带有 --dp-size 1 的 --attn-dp-size 并打印弃用警告，旧参数将于 2026 年底移除；应直接写 --attn-dp-size，且要知道副本与注意力组混用会报错。
- **Level 4:** 一个团队将首 token 的分块大小调优为 8192，随后开启了 8 个注意力组。为什么长 prompt 变慢了？ Expected: 分块大小被除以了组数，因此每个组现在的 prefill 分块为 1024，长 prompt 需要更多调度步数；日志会打印新旧数值，准入比例也乘了 0.3。

## Wrong answers

- "8 张 GPU 会提供 8 倍的 KV 容量。" 在张量并行和潜在注意力下，每个 rank 都存储完整缓存，因此 8 张 GPU 存了 8 份副本，容量等同于单张卡；注意力数据并行才是随组数扩大容量的方法。
- "--dp-size 8 表示 8 个注意力组。" 在锁定的版本中 --dp-size 统计模型副本数；注意力组应使用 --attn-dp-size，带有额外参数的旧写法在被移除前会被带警告重写。
- "注意力数据并行只影响注意力层。" 它还会将分块 prefill 大小除以组数，并将调度保守系数乘以 0.3，因此首 token 延迟和请求准入都会发生改变。
- "在每个模型上都开启它以获得更多容量。" 对于稠密分组查询模型，张量并行已经能无副本切分缓存；手册建议仅对潜在注意力专家模型将注意力组数设为等于张量大小。

## Taught in

[--tp-size、--dp-size 与 --attn-dp-size](../../../manuals/sglang-101/sections/6-1-tp-size-dp-size-and-attn-dp-size.md)讲解了两种数据并行，[KV 池与每个 token 的字节数](../../../manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md)推导了潜在向量的大小。
