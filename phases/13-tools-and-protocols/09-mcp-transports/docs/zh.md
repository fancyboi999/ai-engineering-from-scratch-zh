# MCP Transports：stdio 与无状态 Streamable HTTP

> Transport 负责承载 MCP 消息，不会补充缺失的协议状态。在 `2026-07-28` 中，本地 stdio 和远程 Streamable HTTP 都承载自描述请求。

**类型：** Learn
**语言：** Python
**前置要求：** 阶段 13，第 07 和 08 课
**预计时间：** 约 65 分钟

## 学习目标

- 为本地 child processes 选择 stdio，为网络 services 选择 Streamable HTTP。
- 实现现代单 endpoint、仅 POST 的 Streamable HTTP 契约。
- 将 MCP 版本、method 和 name headers 与 JSON-RPC body 对照并校验。
- 正确提供请求范围的 SSE 和长生命周期 `subscriptions/listen` streams。
- 迁移基于 session 的旧版 HTTP+SSE 部署，且不将旧版行为伪装成现代行为。

## 问题背景

早期 Streamable HTTP 修订版将协议协商与 connection、session 行为结合。server 可以签发 `Mcp-Session-Id`、暴露独立 GET stream、接受用于终止 session 的 DELETE，并以 `Last-Event-ID` 恢复 SSE。

MCP `2026-07-28` 从现代线上格式中移除了这些机制。每条请求都可以落在任意健康 worker 上，因为它的协议版本和 client capabilities 都在请求 body 中传递。HTTP headers 镜像选定字段，用于路由和 policy；但 server 会在执行前将 headers 与 body 对照校验。

结果更易扩展，也更易推理；这也意味着，将 2025 transport 当作当前规范来教授的 server，教错了 failure 与 security model。

## 核心概念

### stdio

stdio binding 用于由 client 启动的 subprocess：

- Client 向 stdin 每行写入一条 UTF-8 JSON-RPC 消息。
- Server 向 stdout 每行写入一条 UTF-8 JSON-RPC 消息。
- Server 将 diagnostics 写入 stderr。
- Server 在 stdin EOF 时立即退出。
- 每条现代请求都在 `params._meta` 中携带版本和 client capabilities。

process 可以持续服务多次 calls，但它不是现代协议 session。若它意外退出，in-flight requests 会丢失。重启 process、重新发现、重新列出、重新打开 subscriptions，并以新的请求 ids 重试安全操作。

### 2026-07-28 的 Streamable HTTP

现代 server 暴露一个 MCP endpoint，例如接受 POST 的 `/mcp`。

每条 JSON-RPC request 或 notification 都是一个新的 HTTP POST。body 包含一条 JSON-RPC 消息。clients 不会向 server 发送 JSON-RPC responses。

对于 request，server 返回以下二者之一：

- `Content-Type: application/json`，其中有一条 JSON-RPC response；或
- `Content-Type: text/event-stream`，其中有与该请求相关的 notifications，随后是最终 JSON-RPC response。

对于已接受的 notification，server 返回无 body 的 `202 Accepted`。

clients 会声明两种 response types：

```http
Accept: application/json, text/event-stream
```

### 仅 POST 就是仅 POST

现代 Streamable HTTP 没有独立的 GET stream，也没有 DELETE session endpoint。

- `GET /mcp` 返回 `405 Method Not Allowed`。
- `DELETE /mcp` 返回 `405 Method Not Allowed`。
- `Mcp-Session-Id` 被忽略，且绝不签发或回显。
- `Last-Event-ID` 被忽略，因为现代 streams 不可恢复。

如果请求范围 stream 在最终 response 前断开，client 就已丢失该 in-flight request。若重试安全，它可以用新的 JSON-RPC id 发起新请求；不得尝试恢复 stream。

### Origin 校验

servers 校验入站 connections 的 `Origin`，以防范 DNS rebinding。如果 header 存在且未被明确允许，返回 `403 Forbidden`。非浏览器 client 可以省略 `Origin`，官方 transport rules 允许这种做法。

本地 servers 应绑定至 `127.0.0.1`，而非所有 interfaces。网络 services 仍须在每条请求上完成 authentication 和 authorization。Origin 校验不是 authentication。

在 canonical configuration 之后使用精确 origin matching。诸如 `origin.startswith("https://trusted.example")` 的前缀检查不安全，因为它可能接受 attacker-controlled suffixes。

### 必需的 HTTP 元数据 headers

每条现代 POST request 都包含：

```http
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes_search
```

Header rules：

- `MCP-Protocol-Version` 是必填项，且必须等于 `params._meta.io.modelcontextprotocol/protocolVersion`。
- `Mcp-Method` 是必填项，且必须等于 JSON-RPC `method`。
- `Mcp-Name` 对 `tools/call`、`resources/read` 和 `prompts/get` 是必填项。
- `Mcp-Name` 等于 `params.name`；对于 `resources/read`，等于 `params.uri`。
- 即使 header names 不区分大小写，header values 仍区分大小写。

不安全或非 ASCII 的 `Mcp-Name` values 使用精确的 UTF-8 Base64 sentinel：

```text
=?base64?{Base64EncodedValue}?=
```

server 会在与 body 对比之前解码该 value。

缺少、格式错误或不匹配的镜像 headers 返回带 JSON-RPC code `-32020` 的 HTTP `400`。如果 header 和 body 对同一不受支持版本达成一致，返回带 `-32022` 的 HTTP `400`，并提供精确 error data，例如 `{"supported":["2026-07-28"],"requested":"2027-01-01"}`。

未知现代 method 返回带 JSON-RPC `-32601` 的 HTTP `404`。JSON-RPC body 很重要，因为双时代 client 依靠它来区分现代 error 与旧版 endpoint miss。

### 请求范围的 SSE

server 可以为一条 long-running request 选择 SSE：

```text
POST tools/call id=41
  <- notifications/progress related to id=41
  <- notifications/progress related to id=41
  <- JSON-RPC response id=41
stream closes
```

server 不得在此 stream 上发送独立 JSON-RPC requests。sampling、elicitation 和 roots interactions 使用多轮往返请求 results。关闭 response stream 会取消该 request。

不要添加用于 replay 的 SSE event ids。`Last-Event-ID` 恢复不是现代修订版的一部分。

### 长生命周期变更使用 subscriptions/listen

变更 notifications 使用 client 打开的 request，而非独立 GET：

```json
{
  "jsonrpc": "2.0",
  "id": "listen-1",
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true,
      "resourceSubscriptions": ["notes://note-1"]
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    }
  }
}
```

POST response 是一条 long-lived SSE stream。其第一条协议消息是 `notifications/subscriptions/acknowledged`。acknowledgement、每条 change notification 和最终 result 都在 `_meta` 中携带 `io.modelcontextprotocol/subscriptionId`，其值等于 listen request id。server 可以发出 SSE comments 作为 keepalives。当 stream 掉线时，client 以新的请求 id 重新发出 `subscriptions/listen`，并重新获取受影响 data。

`resources/subscribe` 和 `resources/unsubscribe` 属于旧版 era。不要在现代 connection 上使用它们。

### 显式应用状态

移除协议 sessions 并不禁止有状态 workflows。server 可以签发一个不透明 state handle，并将它作为普通 tool result 返回。client 在后续 calls 中将该 handle 作为显式 argument 传回。

将 handles 绑定到 authenticated principal，使其不可猜测、设置过期时间，并对每次使用授权。这样状态处于 application layer，而不是隐藏在 transport affinity 中。

隐藏 replica state 引发的 failure 是机械性的：

1. Request A 到达 replica 1，并在该 process memory 中创建 draft。
2. response 没有返回 draft handle，因为实现假定 connection 可以识别 draft。
3. Request B 是一个新的 POST，并到达 replica 2。
4. Replica 2 有有效协议元数据，却无法命名或加载 draft，于是 workflow 失败或读取错误的 local object。
5. Sticky routing 似乎能修复症状，直到 restart、rollout、reschedule 或 failover 将下一条请求移走。

正确的边界有两部分：协议 context 保留在每条请求中；持久 application state 以 server 签发并返回给 client 的 handle 保存在 shared store 中。下一条 call 提供该 handle，任一 replica 都能加载同一 record，而 authorization 将该 record 绑定到 authenticated principal 和 tenant。replica memory 可以缓存 record，但不能成为正确性唯一依赖的副本。

按生命周期选择 state mechanism。request-local variables 可服务一次 call。短暂的 MRTR continuation 可使用具完整性保护的 `requestState`。draft 或 durable task 需要显式 handle、shared persistence、expiry、concurrency control 和 idempotency。这些对象没有一个是 MCP 协议 session。

### HTTP 双时代兼容性

同时支持现代和旧版 servers 的 client 先尝试现代 POST。若收到 HTTP `400`、`404` 或 `405`，它检查 body：

- 已识别的现代 JSON-RPC error 证明 server 是现代的。修正请求或重试广告的版本。不要降级。
- 空 body 或未识别 response 可能表示旧版 HTTP+SSE server。仅在此时尝试旧 GET endpoint，并期待其旧版 `endpoint` event。

server 可以在迁移期间通过将现代元数据路由到仅 POST 的现代实现，同时保留独立的旧 endpoints 来支持两个 eras。绝不要将旧版 GET、DELETE、session id 或 replay 行为描述为 `2026-07-28` 的一部分。

```figure
tp-transport-handshake
```

## 实际使用

`code/main.py` 使用 Python 标准库实现有限的现代 Streamable HTTP server。它校验 Origin 和镜像 headers，忽略已移除的 session headers，为普通 calls 返回 JSON，并演示有限的 `subscriptions/listen` SSE stream。

```bash
cd code
python3 main.py --probe
python3 -m unittest discover tests -v
```

probe 检查：

- 无效 Origin 会被拒绝；
- 不带 session id 的发现成功；
- `Mcp-Session-Id` 和 `Last-Event-ID` 被忽略；
- header mismatch 返回 `-32020`；
- 不受支持版本返回带精确 `supported` 与 `requested` data 的 `-32022`；
- 已接受的无 id notification 返回无 body 的 HTTP `202`；
- GET 和 DELETE 返回 `405`；
- `subscriptions/listen` 是 POST response stream，其 acknowledgement、notifications 和最终 result 都携带 subscription id。

## 拿去用

本课交付 `outputs/skill-mcp-transport-migrator.md`。它移除现代协议 sessions，加入 header-body 校验，以 `subscriptions/listen` 替换独立 GET，并让所有旧版 bridge 明确分离。

## 练习

1. 从 POST 中移除 `Mcp-Method`。确认 HTTP `400` 和 error `-32020`。
2. 发送 header 与 body 同为 `2027-01-01` 的版本。确认 HTTP `400`、error `-32022`，以及精确 data `{"supported":["2026-07-28"],"requested":"2027-01-01"}`。
3. 为非 ASCII resource URI 发送 Base64 sentinel `Mcp-Name`。确认解码值会与 `params.uri` 比较。
4. 在最终 response 前中断有限 listen stream。以新的 JSON-RPC id 重新发出它，并重新获取 tools。
5. 为 ping tool 添加显式 workflow handle。将它绑定到 authorization subject，且不使用 connection affinity。

## 关键术语

| 术语 | 含义 |
|------|---------|
| stdio | 通过由 client 启动的 subprocess 按换行分隔的 JSON-RPC |
| Streamable HTTP | 每条现代消息都是一个新 POST 的单 endpoint |
| 请求范围 SSE | 含相关 notifications 和最终 response 的 POST response stream |
| `subscriptions/listen` | 用于选择加入的 change notifications 的长生命周期 POST request |
| Header mismatch | 当镜像 headers 与 body 不一致时的 HTTP `400` 和 JSON-RPC `-32020` |
| Origin 校验 | 用于入站 connections 的 DNS-rebinding 防御，不是 authentication |
| 显式状态 handle | 作为普通 argument 传递的 application token，而非隐藏 session state |
| 旧版 bridge | 仅为兼容性保留的、分离的早期 era 行为 |

## 延伸阅读

- [MCP Transport Overview](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [MCP stdio Transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP Subscriptions](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
