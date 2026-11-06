---
id: header-body-mismatch-order
title: 鉴权了读取却执行了删除的网关校验顺序漏洞
card: protocols
kind: debug
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [mcp, streamable-http, headers, gateway, validation-order]
minutes: 10
lessons: [phases/13-tools-and-protocols/06-mcp-fundamentals, phases/13-tools-and-protocols/09-mcp-transports, phases/13-tools-and-protocols/15-mcp-security-tool-poisoning]
manuals: []
practice: []
cheatsheet: [mcp-gateways-operations, mcp-security-auth]
related: [protocols/post-only-streamable-http, protocols/descriptor-pin-rug-pull]
updated: 2026-11-03
---

某 MCP 服务端的前置网关读取 `Mcp-Name` 头并比对调用方角色，以此对每次 `tools/call` 鉴权。而其背后的源服务端直接从 JSON 请求体中的 `params.name` 提取工具名称执行。攻击者发送了 `Mcp-Name: notes.read`，而请求体中的 `params.name` 却是 `notes.delete`。该网关还在查看其他任何内容之前，优先拒绝不支持的 `MCP-Protocol-Version`。请梳理所发生的情况，并给出你应交付的校验顺序。

## Short answer

网关批准了读取而源端执行了删除，因为两个组件根据两个不同的字段做出决定。应交付单一固定的顺序：验证 JSON-RPC 和元数据类型，将每个镜像头与请求体比对，只有在证明相等之后才检查匹配的版本是否受支持。存在分歧时返回带有 `-32020` 的 HTTP `400`，即使两个版本值之一不受支持也是如此，因此请求在选择后端、检查角色或消耗限流 token 之前便已终止。

## Full answer

### 镜像头

| 请求头 | 必须等于 |
|---|---|
| `MCP-Protocol-Version` | `params._meta.io.modelcontextprotocol/protocolVersion` |
| `Mcp-Method` | JSON-RPC 的 `method` |
| `Mcp-Name` | `params.name`，或针对 `resources/read` 的 `params.uri` |

请求头名称不区分大小写。请求头值区分大小写。非 ASCII 或不安全的名称作为 `=?base64?{value}?=` 哨兵传输，服务端在比对前将其解码。

### 顺序与错误码

1. 解析信封。确认 `jsonrpc` 为 `"2.0"`，请求上存在 `id`（通知则没有），`method` 为字符串且 `params` 为对象。
2. 要求 `params._meta` 中的版本字符串和能力对象。缺失或畸形的元数据返回 `-32602`。
3. 将每个镜像头与请求体比对。不匹配返回带有 `-32020` 的 HTTP `400`，即使其中一个值不受支持也是如此。
4. 在确定相等后，用带有 `-32022` 的 HTTP `400` 拒绝匹配但不受支持的版本，数据恰好为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。
5. 检查所需能力，按 `method` 路由，验证特定于方法的参数。
6. 在其处理函数运行之前，对具体操作认证和鉴权。
7. 返回带有服务端身份的完整结果，然后丢弃请求级元数据。

未知方法返回带有 `-32601` 的 HTTP `404`。通知没有 `id` 且不接收 JSON-RPC 响应体；被接受的通知收到带有空响应体的 `202`。

### 为什么顺序很重要

每个步骤都会留下不同的证据：畸形输入、请求头混淆、版本协商、能力失败、鉴权和处理函数失败保持分离。在请求头相等之前检查版本支持会将两类混在一起，并让精心构造的请求头参与决策。在策略之前验证路由消除了一个组件鉴权请求体而另一个组件按请求头路由的缝隙。

### 校验后网关做什么

授权依然来自已认证的主体和资源策略，而不是来自请求头，也不是来自 `clientCapabilities`。顺序为：认证传输凭据，验证版本、请求头和结构形态，检查能力兼容性，然后对照确切的动词、资源和规范化参数对主体鉴权，然后才执行或请求用户输入。

## Follow-ups

- **Level 3:** 请求头与请求体均声明版本为 `2027-01-01`，该如何响应？ Expected: 返回 HTTP `400` 配合错误码 `-32022`，并在 data 附带 `{"supported":["2026-07-28"],"requested":"2027-01-01"}`。
- **Level 3:** `Mcp-Name` 携带了包含非 ASCII 字符的资源 URI，服务端如何比对？ Expected: 客户端发送确切的 base64 UTF-8 哨兵，服务端在与 `params.uri` 比对前先将其解码。
- **Level 4:** 为什么不匹配检查必须在消耗限流 token 之前执行？ Expected: 被拒绝的请求应该不产生任何开销并留下自己的证据；否则攻击者会针对错误对象消耗配额或触发策略。
- **Level 4:** 攻击者的请求还携带了有效的 bearer token，这会改变结果吗？ Expected: 不会；在线路验证上先失败，且认证只告诉你谁发送了畸形请求，并不意味着它可以运行。

## Wrong answers

- "信任请求头，因为网关按请求头路由。" 请求体才是执行的内容。两者在用于决策之前必须证明相等。
- "首先检查版本支持，以便不良客户端快速失败。" 不匹配必须返回 `-32020`，即使版本不受支持；只有在相等之后才检查支持情况。
- "请求头数值像请求头名称一样不区分大小写。" 值区分大小写，大小写不同的名称是不同的名称。

## Taught in

[基础课程](../../../phases/13-tools-and-protocols/06-mcp-fundamentals/)给出了生命周期顺序，[传输课程](../../../phases/13-tools-and-protocols/09-mcp-transports/)定义了镜像头，[安全课程](../../../phases/13-tools-and-protocols/15-mcp-security-tool-poisoning/)将路由置于策略之前。
