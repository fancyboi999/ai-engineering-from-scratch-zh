---
id: paged-blocks-and-the-hash-chain
title: 为什么 KV cache 是一个 16 token 块组成的池
card: inference-serving
kind: concept
level: 2
roles: [inference-engineer]
rounds: [ml-depth, system-design]
tags: [kv-cache, paged-attention, block-table, prefix-cache, preemption]
minutes: 8
lessons: [phases/17-infrastructure-and-production/04-vllm-serving-internals]
manuals: [vllm-101#s-how-the-block-pool-manages-kv-memory, vllm-101#s-why-one-token-budget-replaces-a-prefill-phase]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---

解释 vLLM 怎样把 KV cache 放在 GPU 显存里。为什么不给每个请求一块自己的缓冲区？它怎样认出见过的 prompt？显存用完时会发生什么？

## Short answer

KV cache 是一个由 16 token 块组成的池，请求随着变长一块一块地取用，由一张小小的块表做映射。每个请求一块缓冲区会在两处浪费显存：请求永远用不到的长度，以及大小不同的请求之间的空隙。每个写满的块都会得到一个哈希，并与前一个块的哈希串成链，所以一个哈希就代表整段前缀，新请求沿着自己的链往下找，遇到第一个未命中就停。没有空闲块时，调度器抢占最新的请求，之后再重新计算它。

## Full answer

### 用块，而不是缓冲区

启动时，vLLM 把缓存切成 16 token 的块，全部放在一个池里。一个请求的块不需要彼此相邻。块表把请求的 token 位置映射到块编号。原论文把这叫作 PagedAttention，名字来自操作系统对内存分页的方式。

课里给出了它省掉的浪费有多大。传统分配器为每个请求预留完整长度，会因为碎片损失 60% 到 80% 的显存。用块之后，浪费保持在 4% 以下。对 8192 token 的 70B 模型，BF16 下预留一条序列约需 1.25 GB，一个只用 1500 token 的请求会浪费其中约 82%。

### 哈希链

一个块写满时，vLLM 把它的 token 和前一个块的哈希一起做哈希。有了这条链，一个哈希代表的是整段前缀，而不只是 16 个 token。哈希还覆盖其他会改变 key 和 value 的输入：LoRA adapter、prompt 里的图片，以及每个请求可选的 salt。新请求在自己的 prompt 上算出同样的链，并在一张表里逐个查找哈希。第一个未命中之前的每个块都是命中，不需要计算。只缓存写满的块，所以 prompt 末尾不足 16 个 token 的部分总要重新计算。

从 0.11 版起，哈希默认用 SHA-256。还有一个更快的哈希，文档警告说，碰撞可能返回错误的块，或在租户之间泄露数据。

### 驱逐

不再被任何请求使用的块会进入空闲列表，并保留它的哈希。之后有相同前缀的请求仍然可以用它。vLLM 需要新块时，从空闲列表头部取，也就是最久没被用过的块。只有这时旧内容才会消失。所以缓存就是池：没有单独的缓存显存，繁忙的服务器留下的旧前缀比空闲的服务器少。

### 显存用完时

运行中的请求每 16 个 token 需要一个新块。如果没有空闲块，调度器就抢占一个请求。在默认的先到先服务策略下，它选最新的运行中请求，释放它的所有块，把它放回等待队列的最前面。这个请求再次运行时，vLLM 从头重新计算它的 token。旧版本还能把块复制到 CPU 内存再拷回来；现在的引擎只重新计算，因为文档认为这样更便宜。代价表现为被抢占请求的耗时变长，并体现在 `vllm:num_preemptions` 计数器里。

### 混合模型

带滑动窗口层或状态空间层的模型，并不是每一层都为每个 token 保留一个条目。每种层各有一个组，有自己的页大小和自己的命中规则。这些组共用一个池。

## Follow-ups

- **Level 2:** 每个请求都以同样的 25 个 token 开头。其中多少来自缓存？ Expected: 16 个，即一个完整的块；最后 9 个 token 每次请求都要计算，因为只缓存写满的块。
- **Level 3:** 两个租户发送同样的系统 prompt。一个租户能知道另一个租户的什么？哪个字段能阻止？ Expected: 它们共享块，所以一个租户可以从耗时推测出另一个租户发过什么；每个租户一个 cache_salt，它会进入哈希，两者就永远不会共享块。
- **Level 4:** 在默认策略下，没有空闲块时 vLLM 抢占哪个请求？代价是什么？ Expected: 最新的运行中请求；它的所有块被释放，它回到等待队列的最前面，它的 token 要从头重新计算，抢占计数器会记下这一次。

## Wrong answers

- "vLLM 会把被抢占的请求换出到 CPU 内存。" 旧版本可以；现在的引擎只重新计算，因为文档认为重算更便宜，代价体现在这个请求的耗时和抢占计数器里。
- "前缀缓存有自己的显存预算。" 缓存就是池；被释放的块在空闲列表上保留哈希，直到需要新块为止，所以繁忙的服务器留下的旧前缀比空闲的服务器少。
- "块哈希只覆盖它自己的 16 个 token。" 它和前一个块的哈希串成链，所以一个哈希代表整段前缀，它还覆盖 adapter、图片和 salt。

## Taught in

[块池怎样管理 KV 显存](../../../manuals/vllm-101/sections/8-3-how-the-block-pool-manages-kv-memory.md)解释了这个池，[token 预算一节](../../../manuals/vllm-101/sections/8-2-why-one-token-budget-replaces-a-prefill-phase.md)讲了抢占，[服务引擎内部机制一课](../../../phases/17-infrastructure-and-production/04-vllm-serving-internals/docs/en.md)给出了碎片的数字。
