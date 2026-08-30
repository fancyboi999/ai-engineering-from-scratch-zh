---
name: mcp-transport-migrator
description: Migrate legacy MCP HTTP transports to the stateless, POST-only 2026-07-28 contract.
version: 2.0.0
phase: 13
lesson: 09
tags: [mcp, streamable-http, stateless, migration, headers]
---

给定一个基于 session 的 Streamable HTTP 或 HTTP+SSE server，为 MCP `2026-07-28` 产出迁移 runbook。

产出：

1. Endpoint map。定义一个接受 POST 的现代 MCP endpoint。每条 JSON-RPC request 或 notification 都接收一个新的 POST。
2. Response map。为单条 response 使用 `application/json`，或为相关 notifications 后接最终 response 的请求范围 `text/event-stream`。
3. 已移除行为。对现代 GET 和 DELETE 返回 `405`。忽略 `Mcp-Session-Id` 与 `Last-Event-ID`；绝不签发、回显、撤销或恢复它们。
4. 请求元数据。要求每个 body `_meta` 中都有协议版本和 client capabilities，并建议提供 client identity。
5. Header 校验。要求 `MCP-Protocol-Version`、`Mcp-Method` 和条件性的 `Mcp-Name`。解码 Base64 sentinel，并将 headers 与 body 比较。不匹配返回 `-32020`。匹配但不支持的版本返回 `-32022`，并使用精确 data keys `supported` 与 `requested`。
6. Subscription 迁移。以 POST `subscriptions/listen` 替换独立 GET、`resources/subscribe` 和 `resources/unsubscribe`。为 acknowledgement、每条 notification 和最终 result 标记 `io.modelcontextprotocol/subscriptionId`，其值等于 listen request id。
7. State 迁移。以绑定到 authenticated principal 的显式、不透明 application handles 替换 connection affinity。
8. Compatibility window。将旧 endpoints 保持分离且清晰标记。在任何旧版 fallback 前，必须检查现代 POST errors。迁移期间不要以 `301` 或 `302` 重定向 POST，因为 method 和 body 的保留不安全。
9. 验证。测试 Origin 拒绝、POST media negotiation、body metadata、镜像 headers、JSON response、无 body 的已接受 notification `202`、带范围的 SSE subscription metadata、GET 和 DELETE `405`、被忽略的已移除 headers，以及以新 id 重试 broken stream。

硬拒绝：

- 将 session ids、独立 GET、DELETE 或 replay 表述为现代行为。
- 通过 process 或 connection memory 共享逐请求 capabilities。
- 发送 server-initiated JSON-RPC requests。
- 使用 `Last-Event-ID` 恢复现代 SSE stream。
- 在已识别的现代 error 后回退到旧版。
- 迁移期间使用 redirect 移动 JSON-RPC POST。

拒绝规则：

- 没有 authentication、authorization 和精确 Origin policy 时，拒绝公开暴露。
- 拒绝将隐藏 sticky routing 作为显式 workflow state 的替代品。
- 没有 application idempotency control 时，拒绝自动重试非幂等操作。

输出迁移前后 endpoint table、分阶段 rollout、rollback boundary 和可执行 conformance checklist。最后给出移除旧版 routes 的确切日期。
