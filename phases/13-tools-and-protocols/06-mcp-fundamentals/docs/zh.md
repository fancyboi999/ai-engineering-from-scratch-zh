# MCP 基础：无状态请求与 JSON-RPC

> 现代 MCP 没有握手，也没有协议会话。每个请求都必须携带足以被独立理解、授权、路由和重试的元数据。

**类型：** Learn
**语言：** Python
**前置要求：** 阶段 13，第 01 至 05 课
**预计时间：** 约 55 分钟

## 学习目标

- 区分 MCP 的 server 基元与 client 侧功能。
- 为 MCP `2026-07-28` 构造有效的 JSON-RPC 2.0 请求和响应。
- 在每个请求中附加协议版本、client capabilities 和 client identity。
- 使用 `server/discover`，并在没有握手的情况下处理 `UnsupportedProtocolVersionError`。
- 追踪一个独立请求从校验到完整结果的过程。

## 问题背景

一个 MCP server 可以在同一进程或 HTTP worker 上，连续收到来自不同 client、拥有不同 capabilities 的两条请求。如果 server 记住了上一条请求声明的内容，就可能套用错误的权限，或返回错误的线上格式。

MCP `2026-07-28` 消除了这种歧义。协议核心是无状态的。server 必须根据当前请求来决定如何处理当前请求，不能依赖连接历史。

这改变了心智模型。旧顺序是先建立连接，再握手，最后执行操作；现代顺序更简单：

1. client 发送一条自描述请求。
2. server 校验该请求的版本和 capabilities。
3. server 处理该 method。
4. server 返回带类型的结果或 JSON-RPC error。

下一条请求从头重复同一过程。

## 核心概念

### Server 基元

MCP server 暴露三类主要基元：

1. **Tools** 是由模型控制的操作，通过 `tools/list` 发现，通过 `tools/call` 调用。
2. **Resources** 是以 URI 寻址的数据，通过 `resources/list` 发现，通过 `resources/read` 获取。
3. **Prompts** 是可复用模板，通过 `prompts/list` 发现，通过 `prompts/get` 渲染。

为兼容性而保留的 `2026-07-28` schema 中仍有 roots、sampling 和 logging，但它们已经弃用。新实现应当：为 roots 使用显式的 tool 或 resource 输入；为 sampling 直接使用模型提供商 API；为 logging 使用 stderr 或 OpenTelemetry。通过多轮往返请求，elicitation 仍然可用：server 返回一个输入请求，client 随后重试原始操作。现代 server 永远不会发起一条独立的 JSON-RPC 请求。

### JSON-RPC 外壳

MCP 使用 JSON-RPC 2.0：

- 请求：`{jsonrpc, id, method, params}`
- 响应：`{jsonrpc, id, result}` 或 `{jsonrpc, id, error}`
- 通知：`{jsonrpc, method, params}`，没有 `id`

请求的 `id` 用于关联一条响应，但不会创建协议会话。

### 必填请求元数据

每条现代请求都在 `params` 内携带一个 `_meta` 对象：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/list",
  "params": {
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

协议版本和 client capabilities 是必填项。client identity 是建议项。它是 client 自报的展示和调试信息，不是安全凭据。

server 不得从此前请求、stdio 进程、HTTP 连接，或单独的 transport header 推断这些值。

### 完整结果与 server identity

每个成功的现代结果都包含 `resultType`。普通终态结果使用 `"complete"`。server 还应在结果元数据中标识自己：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "complete",
    "tools": [],
    "ttlMs": 30000,
    "cacheScope": "public",
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "notes-server",
        "version": "1.0.0"
      }
    }
  }
}
```

`tools/list`、`resources/list`、`prompts/list`、`resources/templates/list`、`resources/read` 和 `server/discover` 都是可缓存结果。它们包含 `ttlMs` 和 `cacheScope`。安全的默认值是 `ttlMs: 0` 和 `cacheScope: "private"`。列表项应保持确定性排序，这样等价响应才会生成稳定的 cache key 和稳定的模型上下文。

### 无需握手的发现

每个现代 server 都必须实现 `server/discover`。client 可以在调用其他 method 前使用它，以获取：

- `supportedVersions`
- server `capabilities`
- 可选的使用 `instructions`
- 结果 `_meta` 中的 server identity
- cache hints

发现很有用，但不是前置门槛。client 可以先发送 `tools/list`，因为该请求已经携带自身的协议版本和 capabilities。

如果请求的版本不受支持，server 返回 JSON-RPC code `-32022`，其中包含：

```json
{
  "requested": "2027-01-01",
  "supported": ["2026-07-28"]
}
```

client 选择一个双方都支持的现代版本，再以新的 JSON-RPC 请求 id 重试。

### 一条请求的生命周期

按以下顺序追踪一条现代请求：

1. 解析一个 JSON-RPC 外壳。
2. 确认 `jsonrpc` 为 `"2.0"`、存在 `id`、`method` 为字符串，且 `params` 为对象。
3. 要求 `params._meta` 中包含版本字符串和 capability 对象；元数据缺失或格式错误时返回 `-32602`。
4. 在 HTTP 边界上，比对 header 与 body 中的版本、method 和适用的 name。即使两处版本值之一不受支持，只要不匹配就返回 `-32020`。
5. 确认两者相等后，若匹配的版本仍不受支持，则以 `-32022` 拒绝。
6. 检查必需 capabilities，再按 `method` 路由并校验该 method 专属的参数。
7. 在 handler 运行前，对具体操作完成认证与授权。
8. 返回包含 server identity 的完整结果。
9. 忘掉请求范围内的协议元数据。

这样的顺序能防止两个组件各自解读成不同调用。gateway 不得授权 `Mcp-Name: notes.read`，而 origin 实际执行 `params.name: notes.delete`。它也能让格式错误输入、header 混淆、版本协商、capability 失败、授权失败和 handler 失败分别成为独立证据。

关闭 stdin 或 HTTP 响应会结束 transport 活动。它不会终止协议会话，因为现代 MCP 没有协议会话。

### 显式兼容旧版本

截至 `2025-11-25` 的版本使用 `initialize`、`notifications/initialized`、连接范围的 capabilities，以及更早 Streamable HTTP 上可选的协议会话。当双时代 client 与旧 server 通信时，这些行为仍有意义。

要将两个时代分开。现代请求由必填的逐请求元数据识别；旧连接只能通过文档规定的回退路径选择。不要对 `2026-07-28` server 默认发送 `initialize`。

因此，“无状态”具有与时代相关的含义。在 `2026-07-28` 中，它是协议不变量：每条普通请求都能被独立解释，且不存在 MCP session。在截至 `2025-11-25` 的版本中，初始化和协商后的 capabilities 从属于连接，因此兼容 adapter 可以保留那份旧连接状态。双时代实现不是一台宽容的状态机，而是将无状态的现代核心与隔离的旧版 adapter 并置，并在任一 parser 运行前作出明确的选择。

这两种含义都不禁止持久化应用状态。工作流、task 或 draft 可以通过共享存储中的不透明 handle 存在。client 将该 handle 作为普通输入发送，每个副本都要认证并授权其使用。协议上下文不得泄漏到该存储中，成为被移除的 session 的替代品。

```figure
mcp-tool-call
```

## 实际使用

`code/main.py` 不依赖框架，构建、校验、追踪和分发现代 MCP 消息。运行：

```bash
python3 code/main.py
PYTHONPATH=code python3 -m unittest discover code/tests -v
```

在输出中关注三条不变量：

- 每条请求都重复其 `_meta` 字段。
- 每个成功结果都是 `resultType: "complete"`，并包含 server identity。
- 列表结果采用确定性排序，并有明确的 cache hints。

## 拿去用

本课交付 `outputs/skill-mcp-handshake-tracer.md`。历史文件名保持稳定，但该产物现在是无状态请求追踪器。它独立审计每条消息，并且只有在旧版握手流量确实存在时，才将其标为 legacy。

## 练习

1. 将一条请求的协议版本改为 `2027-01-01`。确认 error code 是 `-32022`，且数据中声明了支持的版本。
2. 从第二条请求中移除 `io.modelcontextprotocol/clientCapabilities`。确认 server 不会复用第一条请求的 capabilities。
3. 反转内存中的 tool registry。确认 `tools/list` 仍返回同样的确定性顺序。
4. 将 `cacheScope` 从 `public` 改为 `private`。解释每种情况下哪些授权上下文可以复用该响应。
5. 添加一个可选的 `clientInfo` 缺失测试。请求应保持有效，因为 client identity 是建议项而非必填项。

## 关键术语

| 术语 | 含义 |
|------|---------|
| 无状态协议 | 每条请求都提供理解它所需的元数据 |
| 请求元数据 | `params._meta` 中的版本、client capabilities 和建议提供的 client identity |
| `server/discover` | 所有现代 server 都必须提供的版本、capabilities、instructions 和 identity method |
| `resultType` | 每个成功的现代结果上的判别字段 |
| 可缓存结果 | 包含必填 `ttlMs` 和 `cacheScope` hints 的结果 |
| 协议时代 | 现代的逐请求元数据，或旧版的连接范围初始化 |
| Transport 生命周期 | 进程、连接或响应流的生命周期，不是协议 session state |
| `-32022` | 包含请求版本和支持版本的不支持协议版本 error |

## 延伸阅读

- [MCP Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [MCP Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP 2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
