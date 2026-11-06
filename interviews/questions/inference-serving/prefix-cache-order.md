---
id: prefix-cache-order
title: 为什么 prompt 开头的一个 ID 会让缓存失效
card: inference-serving
kind: debug
level: 2
roles: [inference-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [debugging, ml-depth]
tags: [prefix-cache, kv-cache, ttft, prompt-layout]
minutes: 8
lessons: [phases/17-infrastructure-and-production/06-sglang-radixattention]
manuals: [sglang-101#s-prefix-friendly-prompts, vllm-101#s-make-repeated-prompts-hit-the-prefix-cache]
practice: []
cheatsheet: [sglang-serving, serving-engines-compared]
related: [scenarios/prefix-cache-inflated-benchmark]
updated: 2026-11-03
---

你服务中的每个请求都以同一段长系统 prompt 开头，前缀缓存也已开启。服务器报告几乎没有命中缓存的 token，首 token 返回很慢。上周一位同事为了追踪请求，在系统 prompt 开头加了请求 ID。发生了什么？你会怎么改？

## Short answer

前缀缓存从 prompt 的第一个 token 开始匹配，遇到第一个不同的 token 就停止。开头的新 ID 会让后面所有 token 都无法命中，服务器不得不为每个请求重新计算整段 prompt。把不变的部分放在前面，ID 放在它们后面。然后用缓存命中 token 计数器证明修复有效。

## Full answer

### 位置为什么重要

每个 token 的注意力值都取决于它前面的所有 token。因此，只有前面的整段前缀相同，缓存才能复用这个 token。SGLang 的 radix 树从第一个 token 开始比较，遇到第一个不同之处就停止。vLLM 以 16 token 的块做同样的事。它只缓存完整块，遇到第一个不同的块就停止。

### 代价

SGLang 手册在一段 2,999 token 的系统 prompt 上测了三种布局：

| 布局 | 中位 TTFT | 命中缓存 token 数的中位数 |
|---|---|---|
| 每次发送同样的 prompt | 45.1 ms | 2998.0 |
| 随机 ID 放在开头 | 1255.3 ms | 5 |
| 同一个 ID 放在末尾 | 88.2 ms | 2985 |

ID 放在开头时，只有随机数字之前的 5 个 token 命中。首 token 时间变为原来的 28 倍。ID 放在末尾时，代价是 43 ms。

### 修复

1. 把不变的部分放在最前面：系统 prompt、工具定义和固定指令。
2. 接着放很少变化的部分，比如某个会话的文档。
3. 把每个请求都会变化的部分放在最后：用户问题、时间和请求 ID。
4. 在请求头或请求字段中发送追踪 ID，不要放在 prompt 文本里。

也要检查聊天模板。有些模板会把日期放进系统 prompt。

### 验证

在 vLLM 上，从 `/metrics` 读取 `vllm:prefix_cache_hits` 和 `vllm:prefix_cache_queries`。命中数除以查询数就是命中率。在 SGLang 上，用 `--enable-cache-report` 启动服务器，读取每个响应中的 `usage.prompt_tokens_details.cached_tokens`。布局合理时，第一次请求之后，几乎所有 prompt token 都应显示为命中缓存。

## Follow-ups

- **Level 2:** 修复后命中率仍然很低。接下来检查什么原因？ Expected: 池是否已满，因为缓存只会保留旧块，直到运行中的请求需要这部分显存。
- **Level 2:** 在对话请求中，把改动放在哪里代价最小？ Expected: 最新的一条消息，因为模板把它放在最后，所以只需重新计算这条消息。
- **Level 3:** 两个租户发送同样的系统 prompt。有什么风险，vLLM 提供什么控制手段？ Expected: 一个租户可能从耗时推测另一个租户发送过什么。为每个租户发送不同的 `cache_salt`，让它们的请求永不共享块。
- **Level 3:** 团队调了缓存层级和驱逐策略，命中率却没变。你先检查什么？ Expected: prompt 文本，看看开头附近是否有每个请求都会变化的值，比如随机哈希或时间戳。

## Wrong answers

- "给缓存更多显存。" 更大的池能保留更多块，但开头几个 token 就不同的 prompt 没有可复用的块。
- "缓存会匹配 prompt 中任意位置的最长共享部分。" 缓存只从第一个 token 开始匹配，因此不同之处后面的共享部分永远无法命中。
- "开启分层缓存。" 第二层能保存更多前缀，但无法匹配每个请求都不同的前缀。

## Taught in

[对前缀友好的 prompt 一节](../../../manuals/sglang-101/sections/3-4-prefix-friendly-prompts.md)测量了三种布局，[vLLM 前缀缓存一节](../../../manuals/vllm-101/sections/3-2-make-repeated-prompts-hit-the-prefix-cache.md)给出了计数器，[RadixAttention 一课](../../../phases/17-infrastructure-and-production/06-sglang-radixattention/)动手构建了 radix 树。
