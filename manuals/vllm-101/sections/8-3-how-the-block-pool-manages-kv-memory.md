# Block pool 如何管理 KV 内存

> 本节解释基于 hash 的 block、淘汰策略，以及混合模型的 KV group。

vLLM 最初源自一个想法：把 KV cache 存进固定大小的 block，就像操作系统把内存分成 page。读完本节，你可以解释 vLLM 如何为重复前缀找回已有 block，也能说明哪个 block 会最先被淘汰。

## 使用 block，而不是为每个请求分配一整块缓冲区 {#s-how-the-block-pool-manages-kv-memory-blocks-not-one-buffer-for-each-request}

启动时，vLLM 会将 KV cache 切分为每块 16 个 token，并放进同一个 block pool。请求随 token 增长逐个获取 block。一个请求的 block 在内存中不必相邻，vLLM 用一张小表把 token 位置映射到 block 编号。

这避免了每个请求单独分配缓冲区带来的两种浪费：不会为请求未达到的最大长度预留空闲内存；不同长度请求之间也不会形成内存空洞。原始论文把这个方法叫作 PagedAttention。

## 再次查找前缀 {#s-how-the-block-pool-manages-kv-memory-finding-a-prefix-again}

一个 block 写满时，vLLM 会将其中的 token 与前一个 block 的 hash 一起计算，得到当前 block 的 hash。这条 hash 链代表整个前缀，而不只是 16 个 token。Hash 还包含会改变 key 和 value 的其他输入：LoRA adapter、prompt 中的图像，以及可选的每请求 salt。

新请求也会按 prompt 计算同样的 hash 链。Engine 在映射表里逐个查找 hash，遇到第一个 miss 就停止。此前找到的每个 block 都是 hit，其 token 不必重新计算。系统只缓存完整 block，因此不足 16 个 token 的 prompt 尾部总要重新计算。

从 0.11 版起，默认 hash 算法是 SHA-256。也可以选择更快的 hash，但文档提醒：碰撞可能导致复用错误的 cache entry，或让不同 tenant 之间发生数据泄漏。

```figure
id: fig-8-3
kind: structure
title: Block pool
claim: KV cache 是由 16-token block 组成的单一池，请求可按需获取任意 block，并用每请求的 block table 建立映射。
caption: 相同颜色的 block 属于同一请求。虚线 block 表示空闲。来源：vLLM v0.31.0 源码。
```

## 淘汰策略 {#s-how-the-block-pool-manages-kv-memory-eviction}

没有任何请求正在使用的 block 会进入空闲链表，但它的 hash 会保留。之后有相同前缀的请求仍可重用它。需要新 block 时，vLLM 会取空闲链表头部的 block，也就是空闲时间最长的那个。到这时，旧内容才被移除。

所以 pool 本身就是 cache。没有单独的缓存内存；服务器越忙，能留下的旧前缀就越少。

## 混合模型使用多个 group {#s-how-the-block-pool-manages-kv-memory-hybrid-models-get-groups}

带有 sliding-window layer 或 state-space layer 的模型，并非每层都为每个 token 保存一条记录。Engine 会为每种 layer 单独建立一个 group。每个 group 有自己的 page 大小和 cache hit 规则。例如，sliding-window layer 只需要最近窗口中的 block。这些 group 共用一个 pool。[长上下文章节](#s-serve-long-contexts-and-hybrid-models)介绍了这些机制如何影响配置。

```takeaways
- KV cache 是一个由 16-token block 组成的池，请求随长度增长逐步获取 block。
- Hash 链逐个查找并复用相同前缀的 block。
- 新 block 需要空间时，空闲时间最长的 block 会先离开池。
```

Sources: the vLLM source at v0.31.0 (vllm/v1/core/kv_cache_manager.py, vllm/v1/core/block_pool.py, vllm/v1/core/kv_cache_utils.py, vllm/config/cache.py), vLLM documentation at v0.31.0 (docs/design/prefix_caching.md, docs/design/hybrid_kv_cache_manager.md), the PagedAttention paper (SOSP 2023).
