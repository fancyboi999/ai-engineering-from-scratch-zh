---
name: mcp-transport-migrator
description: 把 legacy MCP HTTP transport 迁移至无状态、仅 POST 的 2026-07-28 契约。
version: 2.0.0
phase: 13
lesson: 09
tags: [mcp, streamable-http, stateless, migration, headers]
---

给定 session 式 Streamable HTTP 或 HTTP+SSE server，产出 MCP `2026-07-28` 迁移 runbook：一个只接收 POST 的 MCP endpoint；每个 JSON-RPC request/notification 都是新 POST；单一结果用 `application/json`，相关 notification 后接最终结果时用请求范围 `text/event-stream`。

现代 GET/DELETE 返回 `405`，忽略且绝不签发、回显、撤销或恢复 `Mcp-Session-Id`、`Last-Event-ID`。body `_meta` 要求版本与 client capabilities，建议带 identity；验证 `MCP-Protocol-Version`、`Mcp-Method` 和条件性 `Mcp-Name` 与 body 一致，不符返回 `-32020`，不支持的匹配版本返回含 `supported`、`requested` 的 `-32022`。

用 POST `subscriptions/listen` 取代独立 GET 与 resources subscribe/unsubscribe；ack、每个 notification 和最终结果均以 listen request id 作为 `io.modelcontextprotocol/subscriptionId`。用绑定已认证 principal 的显式不透明应用 handle 取代 connection affinity。legacy endpoint 必须隔离且有去除日期；检查现代 POST 错误后才允许考虑降级，绝不以 `301`/`302` 重定向 JSON-RPC POST。

拒绝把 session id、独立 GET、DELETE 或 replay 当现代行为，拒绝隐藏 sticky routing、server 反向 request、`Last-Event-ID` 恢复和非幂等自动重试。输出改造前后 endpoint 表、分阶段发布、rollback 边界与可执行 conformance checklist。
