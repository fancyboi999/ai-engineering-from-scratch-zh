# Model Context Protocol（MCP）

> MCP 为 AI host 提供一套发现和调用工具、resource 与 prompt 的统一协议。2026-07-28 修订版让该协议变为无状态：能力和版本上下文随每个请求传递，而非绑定在连接握手中。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 11 · 09（Function Calling）、阶段 11 · 03（Structured Outputs）
**预计时间：** ~75 分钟

## 学习目标

- 区分 MCP host、client、server、传输层和 server 原语。
- 构建带有 MCP 2026-07-28 所需元数据的 JSON-RPC 请求。
- 使用 `server/discover` 检查版本、身份和能力。
- 从 tool、resource 和 prompt 返回有类型且支持缓存的结果。
- 说明现代无状态 MCP 如何与握手时代的 server 互操作。
- 为 server 选择安全的状态、传输和审批边界。

## 问题背景

你的应用需要查询数据库、操作日历和读取文件。若没有共享协议，每个 AI host 都得为这些相同能力定制发现、调用、错误处理、传输和授权的胶水代码。

MCP 缩小了这张集成矩阵。server 发布一个标准的 JSON-RPC 界面。合规 client 无需 server 专用适配器，就能发现该界面、展示给模型或用户、调用它，并解释结果。

这里有一个容易忽略的重要边界。MCP 标准化的是通信；它不决定模型该调用哪个 tool，不会让不可信内容变安全，也不会把无状态请求变成持久的应用状态。这些决策仍由你的 host 和 server 负责。

## 核心概念

![MCP host、无状态请求和 server 原语](../assets/mcp-architecture.svg)

### 三种 server 原语

1. **Tools** 是可调用的动作。每个 tool 都有名称、描述、JSON Schema 输入和处理器。
2. **Resources** 是 client 可以读取的、以 URI 寻址的命名内容。
3. **Prompts** 是 host 可以向用户公开的可复用模板。

host 是 AI 应用。host 内的一个 MCP client 与一个 server 通信。传输层在两者之间传递 JSON-RPC 消息。

### 无状态请求取代握手

MCP 2026-07-28 移除了 `initialize` 和 `notifications/initialized`，也移除了协议层的 session。每个请求都在 `params._meta` 中带上解释该请求所需的上下文：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

协议版本和 client 能力是必填项，建议提供 client 身份。缺少 `_meta`、缺少必填字段，或必填字段类型错误，都属于格式错误并返回 Invalid Params（`-32602`）。格式正确但 server 不支持的版本字符串则返回 `UnsupportedProtocolVersionError`（`-32022`）。server 可以处理有效请求，无须恢复先前协商记录。

无状态不代表应用永远不能维持状态。它表示状态不能藏在 MCP 连接或 `Mcp-Session-Id` 后面。如果工作流需要连续性，server 应签发一个不透明 handle，client 在之后的调用中把它作为普通 tool 参数传入。每个请求仍必须检查授权。

### 发现与版本选择

每个现代 server 都实现 `server/discover`。结果会公布支持的版本、能力和 server 身份：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "ttlMs": 3600000,
    "cacheScope": "public",
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "demo-server",
        "version": "1.0.0"
      }
    }
  }
}
```

client 也可以直接调用其他方法并处理版本错误，但发现步骤会把能力展示和版本选择变成显式行为。若版本不受支持，会返回代码为 `-32022` 的 `UnsupportedProtocolVersionError`。其 data 包含 `supported`（server 修订版数组）和被拒绝修订版 `requested`。

在 stdio 上，兼容两个时代的 client 会先探测 `server/discover`。发现结果或可识别的现代错误（例如 `UnsupportedProtocolVersionError`）表明它是现代 server。任何不属于已识别现代错误的错误或超时，都允许回退到 2025-11-25 的 `initialize` 流程。旧行为只是兼容代码，并非现代默认行为。

### 结果是明确的

每个核心 2026-07-28 结果都有 `resultType`：

- `complete` 表示操作已完成。
- `input_required` 表示 server 需要通过 Multi Round-Trip Requests 模式再往返一次。核心 server 只能从 `tools/call`、`resources/read` 或 `prompts/get` 返回它。

client 必须把缺少 `resultType` 的旧结果视为 complete。

server 应在每个结果的 `_meta` 中包含 `io.modelcontextprotocol/serverInfo`。这一身份由 server 自报，用于展示、日志和调试，不能用于安全决策。

list 和 read 结果还带有 `ttlMs` 与 `cacheScope`。确定性的 `tools/list` 顺序加上新鲜度提示，让 client 能安全缓存发现结果，也能改善 prompt cache 的稳定性。`cacheScope: public` 允许共享缓存；`private` 则把复用范围限制在调用上下文内。

### Wire format 与传输层

MCP 通过 stdio 或 Streamable HTTP 使用 JSON-RPC 2.0。

- 请求包含 `jsonrpc`、`id`、`method` 和 `params`。
- 响应包含匹配的 `id`，以及 `result` 或 `error` 二者之一。
- notification 没有 `id`，也不期待响应。

现代 Streamable HTTP 暴露一个接收 POST 的 endpoint。每条 JSON-RPC 消息各使用一个 POST。请求 POST 收到一个 JSON 对象，或者接收一条在最终响应后结束的、请求范围内的 Server-Sent Events 流。已接受的 notification POST 收到 HTTP 202，且没有响应 body；这个核心修订版没有定义通过 Streamable HTTP 从 client 到 server 的 notification。

2026-07-28 没有独立的 MCP GET 流、DELETE session endpoint、`Mcp-Session-Id` 或 `Last-Event-ID` 重放。长期变更 notification 使用 `subscriptions/listen` POST，其响应保持为一个 SSE 流。

### 不依赖 server 发起请求的 client 输入

较早修订版允许 server 通过流发送 `sampling/createMessage`、`roots/list` 或 `elicitation/create` 等请求。当前协议改用 Multi Round-Trip Requests。符合条件的 tool call、resource read 或 prompt get 会返回 `resultType: input_required`，并带有至少一个 `inputRequests` 或 `requestState`。client 收集所需输入后，用新的 JSON-RPC ID 重试原方法，传入相应的 `inputResponses`，并在提供过 `requestState` 时原样回显它。如果没有 `inputRequests`，重试时省略 `inputResponses`。

Roots、Sampling 和 Logging 仍然可用，但已废弃，因此新实现不应采用它们。现有 Roots 或 Sampling 请求会放在 MRTR 的 `inputRequests` 中传递，绝不会作为独立的 server-to-client JSON-RPC 请求。优先使用明确的文件或目录参数、resource URI、server 配置和直接的模型 provider 集成。stdio 诊断写入 stderr，生产遥测使用 OpenTelemetry。

```figure
mcp-nxm-collapse
```

## 动手构建

### 第 1 步：注册 server 界面

尽管请求契约变了，注册仍很简单：

```python
server = MCPServer("demo-server")

@server.tool(
    "add",
    "Add two integers.",
    {
        "type": "object",
        "properties": {
            "a": {"type": "integer"},
            "b": {"type": "integer"}
        },
        "required": ["a", "b"]
    }
)
def add(a: int, b: int) -> dict:
    return {"sum": a + b}
```

`code/main.py` 中交付的实现还注册了一个 resource 和一个 prompt。它刻意只使用标准库，让你看清每个 envelope，而不是把协议交给 SDK。

### 第 2 步：为每个请求附上元数据

```python
def request(method, params=None):
    body_params = dict(params or {})
    body_params["_meta"] = {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": {
            "name": "demo-client",
            "version": "1.0.0"
        }
    }
    return {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": body_params
    }
```

不要只在连接对象里缓存这份元数据。server 会在每个请求上验证它。

### 第 3 步：可选地先发现再列举

调用 `server/discover`，选择一个支持的版本，然后调用 `tools/list`。如果你已经知道版本，并且能处理 `-32022`，直接调用 `tools/list` 也有效。

这个 demo 按名称顺序返回 tool 列表，并附上 `ttlMs`、`cacheScope`、`resultType` 和 server 身份。tool call 返回一个 complete、不可缓存的结果，因为其输出可能依赖当前状态。

### 第 4 步：将同一请求映射为 HTTP

远程 `tools/call` POST 带有与 JSON-RPC body 对应的 header：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: add
```

`MCP-Protocol-Version` header 必须与 `_meta` 中的版本一致。每个 JSON-RPC 请求都必须带有 `Mcp-Method`，且它必须与 `method` 一致。只有 `tools/call`、`resources/read` 和 `prompts/get` 需要 `Mcp-Name`；它必须分别与 tool 名称、resource URI 或 prompt 名称一致。缺少必需 header 或不匹配时，返回带有 `HeaderMismatch` 代码 `-32020` 的 HTTP 400。

### 第 5 步：在协议状态之外落实安全

- 在每个 HTTP 请求上验证授权和受众。
- 将本地 server 绑定到 localhost，并在 Streamable HTTP 上验证 `Origin`。
- 用 `destructiveHint: true` 标记会修改状态的 tool，并要求 host 审批。
- 明确传递目录和文件范围，而非依赖已废弃的 Roots。
- 将 resource 和 tool 输出视为不可信数据。
- stdio 下让 stdout 专用于 JSON-RPC；诊断信息写到 stderr。

## 实际使用

从本课目录运行：

```bash
python3 code/main.py
cd code
python3 -m unittest discover tests -v
```

第一行应报告以协议 `2026-07-28` 发现 `demo-server`。接着检查 `MCPClient.request`：它会为每次调用重建 `_meta`。从某个请求中删去元数据，观察 server 拒绝它。

## 拿去用

`outputs/skill-mcp-server-designer.md` 会把一个领域转化成无状态 MCP 设计。它的验收门槛要求包含发现结果、按请求传递元数据的策略、确定且支持缓存的列表、显式状态 handle、传输 header、授权和审批规则。

## 继续深入 MCP

本课给出协议模型。阶段 13 将四个生产边界拆成单独的构建与验证课程：

1. [MCP Tool Contracts and Content](../../../13-tools-and-protocols/28-mcp-tool-contracts-and-content/docs/zh.md) 讲解封闭输入 schema、结构化内容、路由元数据、不透明分页、完成授权，以及协议错误和 tool 领域错误的区别。
2. [MCP Reliability, Cancellation, and Flow Control](../../../13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/zh.md) 讲解请求取消、持久任务取消、截止时间、幂等性、背压、代理缓冲和重连行为。
3. [MCP Registry Supply Chain, Admission, Drift, and Rollback](../../../13-tools-and-protocols/30-mcp-registry-supply-chain-and-drift/docs/zh.md) 讲解命名空间证明、产物溯源、不可变 pin、实时漂移、Registry 状态、准入证据和回滚。
4. [MCP Conformance Engineering](../../../13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/docs/zh.md) 讲解 golden 和负向 wire transcript、严格版本时代、SDK 差分、代理证据、脱敏、健康门槛和发布回滚。

当 server 将跨越团队或信任边界时，请按顺序学习它们。它们共同把目标从“这个方法能用”推进到“这个契约在部署过程中仍然安全、可诊断”。

## 练习

1. 添加一个 `subtract` tool，并确认 `tools/list` 仍按字母顺序排列。
2. 移除协议版本键并验证 Invalid Params（`-32602`）。随后发送格式正确但不受支持的版本 `2025-11-25`，验证 `-32022`，确认 `requested` 回显该修订版，并从 `supported` 中选择版本。
3. 为创建操作添加一个由 server 签发的 `draftId`，再要求更新操作把它作为参数。说明它为什么是应用状态，而不是协议 session。
4. 让需要用户确认的 tool 返回 `input_required`。用新的 ID、一个 `inputResponses` 条目和完全相同的 `requestState` 重试原调用，而不要杜撰一个 server-to-client JSON-RPC 请求。
5. 勾勒一个兼容两个时代的 stdio client。把结果或可识别的现代错误视为现代 server，只有遇到未识别错误或超时时才允许回退到 `initialize`。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| MCP | “LLM 的工具协议” | 用于 server 发现、tools、resources、prompts 和扩展的 JSON-RPC 协议 |
| Host | “AI 应用” | 拥有模型和 UI，并挂载一个或多个 MCP client |
| Client | “连接器” | 代表 host 与一个 server 交谈 MCP 的组件 |
| 无状态 MCP | “没有 session” | 每个请求携带版本和能力；没有按连接键控的协议状态 |
| `server/discover` | “能力探针” | 公布版本、能力和身份的必需 server 方法 |
| `resultType` | “结果状态” | 将结果标记为 `complete` 或 `input_required` |
| 状态 handle | “工作流 id” | 作为普通参数传递的、由 server 签发的应用标识符 |
| Streamable HTTP | “远程传输” | 一个 POST endpoint，响应为 JSON 或请求范围内的 SSE |
| MRTR | “询问并重试” | 在结果中嵌入输入请求，随后重试原操作 |

## 延伸阅读

- [MCP 2026-07-28 key changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP server discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP deprecated features](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
