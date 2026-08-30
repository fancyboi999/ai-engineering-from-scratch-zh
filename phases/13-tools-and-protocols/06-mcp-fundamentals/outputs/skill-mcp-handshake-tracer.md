---
name: mcp-request-tracer
description: 按消息审计现代无状态 MCP 与显式 legacy 协议时代的 MCP transcript。
version: 2.0.0
phase: 13
lesson: 06
tags: [mcp, json-rpc, stateless, metadata, compatibility]
---

给定一串 MCP JSON-RPC envelope，逐条按 MCP `2026-07-28` 独立审计。识别 legacy 流量，但绝不假定存在握手或协议 session。

输出每条消息的方向、JSON-RPC 类型、method、基元、request id 和年代；检查每个 request 的 `params._meta.io.modelcontextprotocol/protocolVersion` 与 `clientCapabilities`，并记录建议提供的 `clientInfo`。现代成功结果必须含指定的 `resultType` 与建议的 server identity。检查 `server/discover`、`-32022` 的 `requested`/`supported`，以及 discover、列表和 `resources/read` 的 `ttlMs`、`cacheScope` 与稳定排序。

拒绝把 stdio 进程、HTTP connection 或 `Mcp-Session-Id` 当现代协议状态；不得从前一个 request 推断能力；已识别现代错误 `-32020`、`-32021`、`-32022` 后不得降级；没有 `resultType` 的现代成功无效。`initialize` 和 `notifications/initialized` 仅标记为 legacy。

若 transcript 不是 JSON-RPC 2.0，立即说明 envelope 不兼容；若要求悄悄改写证据，拒绝并保留原 transcript，另给修正样例。按到达顺序逐行输出，例如：

```text
[request/modern/tools] id=7 tools/list metadata=valid
```

最后给出现代、legacy、无效和歧义消息计数，以及第一项修正措施。
