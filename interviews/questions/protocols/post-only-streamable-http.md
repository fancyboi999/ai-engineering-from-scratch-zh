---
id: post-only-streamable-http
title: 当前传输协议中的粘性会话、GET 流与断流恢复
card: protocols
kind: concept
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, ml-breadth]
tags: [mcp, streamable-http, transport, sse, subscriptions]
minutes: 9
lessons: [phases/13-tools-and-protocols/09-mcp-transports]
manuals: []
practice: []
cheatsheet: [mcp-client-transports]
related: [protocols/stateless-request-metadata, protocols/draft-lost-across-replicas]
updated: 2026-11-03
---

某平台团队在带有两个副本的负载均衡器后面通过 Streamable HTTP 部署了一个 MCP 服务端。他们配置了以 `Mcp-Session-Id` 为键的粘性路由，保留了一个独立的 `GET /mcp` 流用于变更通知，并计划通过 `Last-Event-ID` 恢复中断的流。这其中哪些属于当前修订版，什么取代了其余部分？

## Short answer

这三者都不属于当前修订版。该端点仅接受 POST：`GET /mcp` 和 `DELETE /mcp` 返回 `405`，`Mcp-Session-Id` 被忽略且从不生成，而 `Last-Event-ID` 被忽略因为流不支持恢复。变更通知到达客户端打开的 `subscriptions/listen` POST 上，其响应保持为 SSE，中断的流被新的 listen 请求和受影响数据的重新获取所取代。

## Full answer

### 现代线协议一览表

| 消息 | HTTP 形态 |
|---|---|
| 任何 JSON-RPC 请求 | 请求体中包含一条消息的新 POST |
| 响应 | 带有单个响应的 `application/json`，或带有相关通知及最终响应的 `text/event-stream` |
| 被接受的通知 | 不带响应体的 `202 Accepted` |
| 端点上的 `GET` 或 `DELETE` | `405 Method Not Allowed` |

客户端通过 `Accept: application/json, text/event-stream` 声明这两种响应类型。

### 为什么不需要粘性

每个请求都在 `params._meta` 中携带其协议版本和客户端能力，因此任何健康的 worker 都可以验证它。三个请求头镜像了请求体以用于路由和策略：`MCP-Protocol-Version`、`Mcp-Method`，以及针对 `tools/call`、`resources/read` 和 `prompts/get` 的 `Mcp-Name`。服务端在执行前将每个请求头与请求体比对。缺失或不匹配的请求头返回带有 JSON-RPC `-32020` 的 HTTP `400`。

### 通知来自何处

客户端发送带有 `notifications` 过滤器的 `subscriptions/listen` 作为普通请求，例如 `toolsListChanged: true` 和 `resourceSubscriptions` 列表。流上的第一条消息是 `notifications/subscriptions/acknowledged`。每个事件和最终结果都携带 `io.modelcontextprotocol/subscriptionId`，等于 listen 请求 ID。当流断开时，客户端使用新 ID 重新发出请求，并重新获取工具、资源或 prompt。`resources/subscribe` 属于旧版时代。

### 请求作用域的流中断意味着什么

进行中的请求已丢失。当重试安全时，客户端可以使用新的 JSON-RPC ID 发出新请求。它绝不能尝试流恢复，且服务端绝不能为重放添加 SSE ID。

### 边界处的另外两条规则

- 使用精确匹配验证 `Origin`，并在其存在且不被允许时返回 `403`。本地服务端绑定到 `127.0.0.1`。这防范 DNS 重绑定，而不是身份认证。
- 如果需要旧版 HTTP+SSE 桥接，请将其保留在单独的端点上，绝不要将其 GET 流、会话 ID 或重放描述为当前修订版的一部分。

## Follow-ups

- **Level 2:** 客户端在此传输协议下如何取消进行中的请求？ Expected: 它关闭该请求的响应流；不存在取消 POST。
- **Level 3:** 为什么对受信任来源做 `startswith` 测试是不安全的？ Expected: 它接受主机名上由攻击者控制的后缀；应精确匹配规范来源。
- **Level 3:** 支持新旧两代协议的客户端从未知服务端收到 `405`。它是否会回退到旧版 GET 端点？ Expected: 仅在读取响应体后；已识别的现代 JSON-RPC 错误证明服务端是现代的，只有空或未识别的响应体才构成尝试旧版的理由。
- **Level 4:** 工作流需要跨两个副本上的两次调用保持状态。它存放在何处？ Expected: 保存在共享存储中服务端生成的不透明句柄之后，作为普通结果返回，绑定至主体，设定过期时间并在每次使用时鉴权。

## Wrong answers

- "粘性路由是无害的，所以保留它作为安全网。" 它掩盖了正确性 bug，直到发布、重新调度或故障转移将下一次请求移动到另一个副本。
- "添加 SSE 事件 ID 以便客户端可以恢复。" 现代流不可恢复。丢失的请求在操作允许时使用新 ID 重试。
- "来源验证认证了调用方。" 它仅阻止 DNS 重绑定。网络服务仍会对每个请求认证和鉴权。

## Taught in

[传输课程](../../../phases/13-tools-and-protocols/09-mcp-transports/)定义了仅 POST 端点、镜像头以及 `subscriptions/listen` 流。
