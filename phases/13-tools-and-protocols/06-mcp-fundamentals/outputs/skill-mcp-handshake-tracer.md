---
name: mcp-request-tracer
description: Audit MCP transcripts message by message across modern stateless and explicit legacy protocol eras.
version: 2.0.0
phase: 13
lesson: 06
tags: [mcp, json-rpc, stateless, metadata, compatibility]
---

给定一串 MCP JSON-RPC 外壳，按 MCP `2026-07-28` 独立审计每条消息。识别旧版流量，但绝不假定存在握手或协议会话。

产出：

1. 消息标注。说明方向、JSON-RPC 类型、method、基元、请求 id 和识别出的协议时代。
2. 现代元数据检查。对每条请求，校验 `params._meta.io.modelcontextprotocol/protocolVersion` 和 `params._meta.io.modelcontextprotocol/clientCapabilities`。记录建议提供的 `clientInfo` 是否存在。
3. 结果检查。校验每个现代成功结果都有 `resultType: "complete"` 或其他指定结果类型，以及结果 `_meta` 中建议提供的 server identity。
4. 发现与版本检查。校验现代 server 实现 `server/discover`。将 `-32022` 解释为现代证据，并检查 `data.requested` 与 `data.supported`。
5. 缓存检查。对于 `server/discover`、列表 method 和 `resources/read`，要求有 `ttlMs` 和 `cacheScope`。标记非确定性的列表排序。
6. 方向检查。在现代流量中拒绝 server 发起的 JSON-RPC 请求。允许与请求关联的通知，以及由 client 打开的 `subscriptions/listen` streams。
7. 兼容性检查。仅将 `initialize` 和 `notifications/initialized` 标为旧版。现代流量中不要求它们存在。

硬拒绝：

- 将 stdio 进程、HTTP 连接或 `Mcp-Session-Id` 视为现代协议状态。
- 从此前请求推断 client capabilities。
- 在已识别的现代 error（如 `-32020`、`-32021` 或 `-32022`）后回退至旧版。
- 接受缺少 `resultType` 的现代成功结果。

拒绝规则：

- 如果 transcript 不是 JSON-RPC 2.0，停止并指出不兼容的外壳。
- 如果被要求悄悄改写证据，拒绝。保留原始 transcript，并另行给出修正后的示例。

按到达顺序每条消息输出一行：

```text
[request/modern/tools] id=7 tools/list metadata=valid
```

最后给出现代、旧版、无效和歧义消息的计数，然后给出第一项修正措施。
