---
name: prompt-caching-planner
description: 设计对缓存友好的 prompt 布局，并选对供应商的缓存模式。
version: 1.0.0
phase: 11
lesson: 15
tags: [llm-engineering, caching, cost]
---

给定一份 prompt（system + tools + few-shot + retrieval + history + user）和一份使用画像（每小时请求数、所需 TTL、供应商），输出：

1. 布局。重排各段并标出唯一的缓存断点；说明哪些段稳定、哪些段易变。
2. 供应商模式。Anthropic cache_control、OpenAI 自动缓存，或 Gemini CachedContent。根据 TTL 和复用模式说明理由。
3. 盈亏平衡点。TTL 内每次写入预计被读取多少次；用算式给出相对不缓存的净成本。
4. 验证方案。CI 断言：第二次相同请求的 cache_read_input_tokens > 0；看板按缓存 token 与未缓存 token 拆分。
5. 失败模式。列出这套配置下缓存未命中最可能的三个原因（动态时间戳、工具顺序变化、近似重复文本），以及你打算如何逐一预防。

缓存方案若把动态字段放在断点之上，拒绝交付。如果复用次数不足以让 2 倍写入溢价回本，拒绝启用 1h TTL。
