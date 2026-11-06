---
id: two-cache-layers
title: 两种缓存层级，以及为什么其中一种未能降低账单
card: cost-capacity
kind: concept
level: 1
roles: [applied-ai-engineer, forward-deployed-ai-engineer, inference-engineer]
rounds: [screen, ml-breadth]
tags: [prompt-caching, semantic-cache, cost, hit-rate]
minutes: 5
lessons: [phases/17-infrastructure-and-production/14-prompt-semantic-caching, phases/11-llm-engineering/11-caching-cost]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/cache-break-even, cost-capacity/parallel-calls-miss-the-cache]
updated: 2026-11-03
---

队友说服务里已经做过缓存了，因为模型提供商的 prompt 缓存已经开启。但账单几乎没有任何下降。模型服务中存在哪两类缓存？各自跳过了什么计算？为什么面对用户反复提问的同一问题，其中一种缓存却完全无能为力？

## Short answer

服务中存在两层截然不同的缓存。提供商侧的前缀缓存（prefix cache）复用了先前请求已计算过的 prompt 前缀的注意力状态，从而使重复的前置 token 更便宜，但底层模型仍然必须运行。应用层语义缓存（semantic cache）将请求向量化，并在之前回答过相似问题时直接返回存储的历史答案，从而彻底跳过了模型调用。前缀缓存无法直接服务反复提出的相同问题，因为 prompt 中用户输入的部分依然存在逐 token 的差异，且模型依然需要完整生成后续回答。

## Full answer

### 提供商前缀缓存

提供商保存可缓存前缀的 key 与 value。携带相同前缀的后续请求仅需支付读取单价，无需全量执行 prefill。匹配仅支持前缀匹配：遇到第一个不同的 token 就会立即终止，因此 prompt 的稳定不变部分必须放在最前，动态的用户消息必须置于最后。该缓存降低了输入成本和首 token 响应时间（TTFT），但生成输出 token 的费用与原先完全相同。

### 语义缓存

在调用发起之前，应用程序将请求转化为向量嵌入，并在相似度阈值（通常为 0.95 或更高）之上检索历史存储的请求。一旦命中，直接返回存储好的历史答案，根本不调用任何大模型。命中率高度依赖实际业务场景：课程引用的社区数据表明，开放式聊天命中率仅在 10% 到 15% 左右，而结构化客服支持则可达 40% 到 70%。更简单的精确匹配（exact cache）对模型、messages 和温度做哈希，并且只服务确定性调用。

### 为什么账单几乎没有下降

前缀缓存仅针对重复前缀中的输入 token 提供折扣。如果前缀很短、如果前缀中有内容随每次请求动态变动、或者输出 token 占了账单的大头，它能够节省的空间就极其有限。用户反复提问属于另一种维度的复用，唯有语义缓存才能解决。

### 两层缓存的叠加架构

提供商缓存解决的是“token 严格一致”的复用；语义缓存解决的是“语义完全一致”的复用。前期缓存课程将两者结合，指出在典型业务应用中双层叠加可实现 50% 到 95% 的综合成本削减。

## Follow-ups

- **Level 1:** 哪种缓存能够在完全不运行模型的前提下返回答案？ Expected: 语义缓存；前缀缓存依然需要针对未缓存的 token 运行模型并完整执行输出生成。
- **Level 2:** 所有用户在相同的系统 prompt 下提出各不相同的问题，哪种缓存起作用？ Expected: 前缀缓存；因为共享的系统前缀完全相同，而用户问题各异。
- **Level 2:** 决定是否值得引入语义缓存的核心因素是什么？ Expected: 自身业务流量上的真实命中率（开放聊天约 10% 到结构化客服约 70% 不等），以及单次错误命中给业务带来的潜在损失。
- **Level 3:** 为什么精确匹配缓存拒绝服务温度大于零的调用？ Expected: 存储的历史答案只是某次随机采样结果；向要求采样多样性的调用方直接回放历史答案，会篡改调用方所要求的随机行为。

## Wrong answers

- "前缀缓存能够对相同的问题返回相同的答案。" 它复用的是前缀的注意力状态；模型依然需要重新计算并生成每一个回答 token。
- "语义缓存就是带有模糊匹配的前缀缓存。" 语义缓存驻留在你的应用层，依赖向量嵌入并彻底跳过模型；前缀缓存位于提供商侧，依赖精确的 token 匹配。
- "做一层缓存就足够了。" 它们覆盖不同类型的复用：一种要求 token 相同，另一种要求语义相同，课程建议两者结合使用。

## Taught in

[缓存经济学课程](../../../phases/17-infrastructure-and-production/14-prompt-semantic-caching/)区分了两个缓存层级，[缓存与成本课程](../../../phases/11-llm-engineering/11-caching-cost/)构建了精确匹配缓存与语义缓存。
