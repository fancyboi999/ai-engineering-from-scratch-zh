---
id: stateless-request-metadata
title: 为什么每个 MCP 请求都重复其元数据
card: protocols
kind: concept
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [ml-breadth, system-design]
tags: [mcp, stateless, json-rpc, discovery, protocol-version]
minutes: 8
lessons: [phases/13-tools-and-protocols/06-mcp-fundamentals, phases/13-tools-and-protocols/07-building-an-mcp-server]
manuals: []
practice: []
cheatsheet: [mcp, mcp-server-build]
related: [protocols/two-error-layers, protocols/post-only-streamable-http]
updated: 2026-11-03
---

某同事从 2025 年修订版移植了一个 MCP 服务端。该移植版本保留了 `initialize` 握手，并将客户端声明的能力存储在连接对象上供后续请求使用。所有旧测试均通过。在当前修订版下有什么会被破坏，元数据如今必须保存在哪里？

## Short answer

当前修订版没有握手，也没有协议会话。记住先前消息能力的服务器可能会对下一个请求应用错误的权限或错误的协议格式，而该请求可能来自同一进程上的另一个客户端或落到另一个 worker 上。每个请求都在 `params._meta` 中携带 `io.modelcontextprotocol/protocolVersion` 和 `io.modelcontextprotocol/clientCapabilities`，服务端在每个请求上对其验证，并在答复后丢弃。

## Full answer

### 请求是解释的单元

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {"name": "course-client", "version": "1.0.0"}
    }
  }
}
```

版本和能力是必需的。`clientInfo` 是推荐项，属于自报信息，绝不是凭据。服务端绝不能仅从先前的请求、stdio 进程、HTTP 连接或传输头来推断其中任何一项。

### 服务端返回什么

每个成功的结果都包含 `resultType: "complete"`，并应在其 `_meta` 中携带 `io.modelcontextprotocol/serverInfo`。列表结果、`resources/read` 和 `server/discover` 还携带 `ttlMs` 和 `cacheScope`，并带有确定性排序，以便相同的结果给出稳定的缓存键。

### 发现是一个方法，不是门禁

每个服务端都必须实现 `server/discover`。它返回 `supportedVersions`、能力、可选指令和服务端身份。客户端可以先调用它，但也可以直接发送 `tools/list`，因为该请求已经携带了其元数据。

### 取代协商的错误码

| 情况 | 错误码 |
|---|---|
| 元数据缺失或畸形 | `-32602` |
| HTTP 边界处请求头与请求体不一致 | `-32020` |
| 版本匹配但不受支持 | `-32022`，带有 `requested` 和 `supported` |

客户端从 `supported` 中选择相互支持的版本，并使用新请求 ID 重试。

### 区分新旧两代协议

截至 `2025-11-25` 的修订版使用 `initialize`、`notifications/initialized` 和连接作用域的能力。支持新旧两代协议的服务端可以将该路径保留为隔离的旧版适配器，仅在收到 `initialize` 时才选择它。它绝不通过握手路径路由当前请求，也绝不在旧版结果上添加 `resultType`。

### 应用状态仍然被允许

工作流或草稿可以存放在共享存储中不透明句柄之后。客户端将句柄作为普通参数发送，每个副本都认证和鉴权其使用。协议上下文绝不能泄露到该存储中以替代被移除的会话。

## Follow-ups

- **Level 2:** `clientInfo` 是必需的吗，能否对其鉴权？ Expected: 它是推荐项，不是必需项；它是展示和调试数据，绝不是凭据。
- **Level 2:** 客户端在不调用 `server/discover` 的情况下发送 `tools/list`，服务端会拒绝吗？ Expected: 否；请求携带了其版本和能力，因此发现不是门禁。
- **Level 3:** 关闭 stdin 或结束 HTTP 响应会终止什么？ Expected: 仅终止传输活动；没有可终止的协议会话，且下一个请求仍必须描述自身。
- **Level 4:** 多步工作流现在将状态保存在何处？ Expected: 保存在共享持久化存储中服务端生成的不透明句柄之后，作为普通结果返回，绑定至已认证的主体，设定过期时间并在每次使用时鉴权。

## Wrong answers

- "无状态意味着服务端完全不能保留任何状态。" 允许显式句柄背后的持久化应用状态。仅移除了隐藏的协议上下文。
- "首先发送 `initialize` 以确保对每个服务端都安全。" 当前服务端默认绝不能接收 `initialize`。旧版是对固定对端的有文档记录的回退。
- "连接标识了客户端，因此每个连接做一次能力检查就足够了。" 两个客户端可以按顺序共享一个进程或 HTTP worker，且远程请求可以落到任何副本上。

## Taught in

[基础课程](../../../phases/13-tools-and-protocols/06-mcp-fundamentals/)跟踪了从验证到完整结果的单个请求，[服务端课程](../../../phases/13-tools-and-protocols/07-building-an-mcp-server/)构建了分发循环。
