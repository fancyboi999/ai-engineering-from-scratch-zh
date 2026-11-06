---
id: legacy-probe-fail-closed
title: 当旧服务端确实属于旧版时
card: protocols
kind: design
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [mcp, client, stdio, legacy, discovery, fail-closed]
minutes: 12
lessons: [phases/13-tools-and-protocols/08-building-an-mcp-client]
manuals: []
practice: []
cheatsheet: [mcp-client-transports]
related: [protocols/stateless-request-metadata, protocols/post-only-streamable-http]
updated: 2026-11-03
---

你的 agent 宿主通过 stdio 启动了数个 MCP 服务端。一个是当前的。一个是仅能理解 `initialize` 的旧归档服务端。还有一个是当前版本但启动缓慢的服务端。一位队友提议采用一个简单规则：发送 `server/discover`，在遇到任何错误或超时时发送 `initialize`。请设计启动流程，使得慢启动的服务端绝不被降级，且归档服务端依然能够工作。

## Short answer

将歧义信号视为歧义。超时、连接关闭、空响应或未识别的错误无法确定协议代际，因此客户端失败闭合（fail-closed），除非该对端显式配置了 `allow_legacy=True`。类似 `-32022` 这样已识别的现代错误证明服务端是当前版本，并禁止 `initialize`。对于白名单上的归档对端，在传输强制的截止时间内发送一次 `initialize`，且仅在获得结构合法的正向结果后才选择旧版协议代际。

## Full answer

### 探测的三种结果类别

| `server/discover` 的结果 | 含义 | 下一步 |
|---|---|---|
| 一个 `DiscoverResult` | 当前服务端 | 选取最高共同支持的版本，并继续使用逐请求元数据 |
| 已识别的现代错误 | 当前服务端 | 纠正请求或重试服务端声明支持的版本；绝不发送 `initialize` |
| 歧义信号 | 未知 | 失败闭合，除非此固定对端允许一次有界的旧版探测 |

已识别的现代错误包括 `-32020` HeaderMismatch、`-32021` MissingRequiredClientCapability 和 `-32022` UnsupportedProtocolVersion。即使对端在旧版白名单上，它们仍属于现代错误，因为支持现代错误词汇的服务端会被 `initialize` 降级。

`-32601` 不是正向的旧版证据。它仅使显式列入白名单的对端有资格接受一次探测，超时、连接关闭或空响应也是如此。

### 白名单是意图，不是证据

```python
client.add_server("archive", archive_transport, allow_legacy=True)
```

将选择绑定到配置的命令或端点。通配符将允许任意服务端自行选择较弱的语义。没有该标志的对端在出现歧义结果后失败，且绝不会收到 `initialize`。

### 正向的旧版证据

单次 `initialize` 在 `legacy_probe_timeout_ms` 下运行，真实的适配器必须强制执行该超时。客户端随后要求满足以下所有条件：

- 带有匹配请求 ID 的 JSON-RPC `2.0` 响应；
- 恰好一个 `result` 且没有 `error`；
- `protocolVersion` 处于客户端配置的旧版修订集中；
- 值为对象的 `capabilities`；
- 带有非空字符串 `name` 和 `version` 的 `serverInfo` 对象。

任何其他情况都会使对端保持 `unknown` 且不可用。只有在所有检查通过后，客户端才发送 `notifications/initialized`，并在该传输生命周期中使用旧版请求形态。

### 选定时代之后

按传输对端缓存时代，不要在每次调用前都探测。当传输重启或端点更改时，丢弃缓存并重新协商。然后调用 `tools/list`，在合并前对结果排序，并应用声明的冲突策略：为后续重复项按 `<server>/<tool>` 形式添加服务端前缀，或者在错误中包含两个对端名称并拒绝重复项。绝不静默覆盖。

### 慢启动的服务端为何不会降级

它的第一次探测超时，这是一个歧义信号。它不在白名单中，因此客户端将其标记为不可用，而不是发送 `initialize`。稍后重试 `server/discover` 成功，该对端作为当前服务端以正确的时代加入。

## Follow-ups

- **Level 3:** 白名单中的归档对端对服务发现返回 `-32022`。属于哪个时代？ Expected: 当前；已识别的现代错误禁止旧版探测，因此从 `data.supported` 中选取并使用新请求 ID 重试。
- **Level 3:** `initialize` 探测超时。对端处于什么状态？ Expected: `unknown` 且不可用；不选择时代，且绝不发送 `notifications/initialized`。
- **Level 4:** 旧版服务端在初始化前接受 `tools/list`。为什么在 stdio 上优先发现更安全？ Expected: 歧义的成功会掩盖时代；`server/discover` 在任何操作之前创建了清晰的时代边界。
- **Level 4:** 归档进程崩溃并重启。你是否复用缓存的旧版时代？ Expected: 否；丢弃对端时代缓存，重新发现、重新列出、重新打开订阅，并仅使用新 ID 重试安全操作。

## Wrong answers

- "发现返回的任何错误都意味着服务端是旧版。" 畸形请求、过载的服务端、死进程和旧服务端都可能产生相同的超时或关闭。
- "首先发送 `initialize`；当前服务端会拒绝它。" 向当前服务端发送 `initialize` 是一种降级，绝不能作为默认路径。
- "方法未找到错误证明服务端是旧版。" 它仅使列入白名单的对端有资格接受一次有界探测；正向证据是有效的 `initialize` 结果。

## Taught in

[客户端课程](../../../phases/13-tools-and-protocols/08-building-an-mcp-client/)定义了探测结果、白名单和正向证据检查清单。
