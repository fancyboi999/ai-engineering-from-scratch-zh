---
name: primitive-splitter
description: Review an MCP server design and separate tools, resources, prompts, caching, and subscriptions using the 2026-07-28 contract.
version: 2.0.0
phase: 13
lesson: 10
tags: [mcp, resources, prompts, subscriptions, caching]
---

从消费者视角审查一个提议的 MCP server。

产出：

1. 一个 `server/discover` result，声明 revision `2026-07-28` 以及精确的 resource 和 prompt capabilities。
2. 一张包含 `name`、`chooser`、`primitive` 和 `reason` 的 table。
3. 稳定的 resource URI schemes，以及任何有界的 resource templates。
4. Prompt names、descriptions 和必需或可选 arguments。
5. 每个 list method 的确定性 ordering rule。
6. 每个 cacheable result 的带 `ttlMs` 和 `cacheScope` 的 cache policy。
7. 需要 updates 的 resources 或 list changes 的 `subscriptions/listen` filter。
8. 一个返回 JSON-RPC `-32602` 的 invalid-resource example，以及一个返回带 `supported` 和 `requested` 的 `-32022` 的 unsupported-revision example。

使用这些决策规则：

- 由模型选择的 operation 是 tool。
- 由 host 读取的 URI-addressed content 是 resource。
- 由用户选择的 message workflow 是 prompt。
- update stream 由 client 通过 `subscriptions/listen` 打开。
- listen request ID 成为 `io.modelcontextprotocol/subscriptionId`。
- acknowledgment 必须先于该 subscription 的所有 events。
- notification 永远不会绕过后续 read 的 authorization。
- 即使 client 选择先调用其他 method，`server/discover` 仍是必需的。

在以下情况拒绝设计：

- list 因 connection history 而变化。
- 私有 result 被放入公共 cache。
- resource URI 未经 parsing、authorization 和 boundary checks 就被接受。
- 设计使用 `resources/subscribe`，或将 subscription 当作协议 session。
- prompt 被允许覆盖可信 host instructions。

返回一页契约审查。最后说明最高风险的 primitive、cache 或 subscription mistake，以及最小修正。
