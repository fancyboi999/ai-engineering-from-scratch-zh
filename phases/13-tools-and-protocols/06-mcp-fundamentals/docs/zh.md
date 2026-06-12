# MCP 基础——基元、生命周期、JSON-RPC 底座

> MCP 之前的每一次集成都是一次性的。Model Context Protocol 由 Anthropic 在 2024 年 11 月首次发布，如今由 Linux Foundation 的 Agentic AI Foundation 托管，它把发现和调用标准化，让任何 client 都能跟任何 server 对话。2025-11-25 规范点名了六个基元（三个 server、三个 client）、一套三阶段生命周期，和一种 JSON-RPC 2.0 线上格式。学会这些，本阶段 MCP 章节余下的内容就成了顺手翻翻的读物。

**类型：** Learn
**语言：** Python（标准库，JSON-RPC 解析器）
**前置要求：** 阶段 13 · 01 到 05（工具接口与 function calling）
**预计时间：** ~45 分钟

## 学习目标

- 点名全部六个 MCP 基元（server 端的 tools、resources、prompts；client 端的 roots、sampling、elicitation），各给一个用例。
- 走一遍三阶段生命周期（initialize、operation、shutdown），说清每个阶段谁发哪条消息。
- 解析并发射 JSON-RPC 2.0 的 request、response、notification 外壳。
- 解释 `initialize` 时的能力协商是什么，以及没有它会崩掉什么。

## 问题背景

MCP 之前，每个用工具的 agent 都有自己的协议。Cursor 有一套 MCP 形状但不兼容的工具系统。Claude Desktop 出厂带着另一套。VS Code 的 Copilot 扩展又是第三套。一个做了"Postgres 查询"工具的团队，把同一个工具写了三遍，每遍对接一个不同宿主的 API。复用它得靠拷代码。

结果是一次性集成的寒武纪大爆发，以及生态速度的天花板。

MCP 靠标准化线上格式修掉这个。单个 MCP server 在每个 MCP client 里都能用：Claude Desktop、ChatGPT、Cursor、VS Code、Gemini、Goose、Zed、Windsurf——到 2026 年 4 月有 300+ 个 client。每月 1.1 亿次 SDK 下载。1 万+ 个公开 server。Linux Foundation 在 2025 年 12 月以新成立的 Agentic AI Foundation 接管了托管。

本阶段用的规范修订版是 **2025-11-25**。它加上了异步 Tasks（SEP-1686）、URL 模式 elicitation（SEP-1036）、带工具的 sampling（SEP-1577）、增量 scope 同意（SEP-835），以及 OAuth 2.1 resource-indicator 语义。阶段 13 · 09 到 16 讲这些扩展。本课停在底座。

## 核心概念

### 三个 server 基元

1. **Tools。** 可调用的动作。和阶段 13 · 01 一样的四步循环。
2. **Resources。** 暴露的数据。只读、可按 URI 寻址的内容：`file:///path`、`db://query/...`、自定义 scheme。
3. **Prompts。** 可复用的模板。宿主 UI 里的 slash-command；server 提供模板，client 填参数。

### 三个 client 基元

4. **Roots。** server 被允许触及的 URI 集合。client 声明它们；server 尊重它们。
5. **Sampling。** server 请求 client 的模型执行一次补全。让 server 托管的 agent 循环无需 server 端 API key 就能跑。
6. **Elicitation。** server 在中途向 client 的用户要结构化输入。表单或 URL（SEP-1036）。

MCP 里每个能力都恰好属于这六个之一。阶段 13 · 10 到 14 逐个深入。

### 线上格式：JSON-RPC 2.0

每条消息都是一个带这些字段的 JSON 对象：

- Request：`{jsonrpc: "2.0", id, method, params}`。
- Response：`{jsonrpc: "2.0", id, result | error}`。
- Notification：`{jsonrpc: "2.0", method, params}`——没有 `id`，不期待响应。

底座规范有约 15 个方法，按基元分组。重要的那些：

- `initialize` / `initialized`（握手）
- `tools/list`、`tools/call`
- `resources/list`、`resources/read`、`resources/subscribe`
- `prompts/list`、`prompts/get`
- `sampling/createMessage`（server 到 client）
- `notifications/tools/list_changed`、`notifications/resources/updated`、`notifications/progress`

### 三阶段生命周期

**阶段 1：initialize。**

client 发 `initialize`，带上它的 `capabilities` 和 `clientInfo`。server 用自己的 `capabilities`、`serverInfo`，以及它所说的规范版本来响应。client 消化完响应后发 `notifications/initialized`。从此往后，任一方都能按协商好的能力发请求。

**阶段 2：operation。**

双向。client 调 `tools/list` 来发现，再调 `tools/call` 来调用。如果 server 声明了那个能力，它可以发 `sampling/createMessage`。server 的工具集发生变更时，它可以发 `notifications/tools/list_changed`。用户改动 root scope 时，client 可以发 `notifications/roots/list_changed`。

**阶段 3：shutdown。**

任一方关闭传输。MCP 里没有结构化的 shutdown 方法；由传输（stdio 或 Streamable HTTP，阶段 13 · 09）携带连接结束信号。

### 能力协商

`initialize` 握手里的 `capabilities` 是那份契约。一个 server 的例子：

```json
{
  "tools": {"listChanged": true},
  "resources": {"subscribe": true, "listChanged": true},
  "prompts": {"listChanged": true}
}
```

server 声明它能发 `tools/list_changed` notification，并支持 `resources/subscribe`。client 靠声明自己的来同意：

```json
{
  "roots": {"listChanged": true},
  "sampling": {},
  "elicitation": {}
}
```

如果 client 不声明 `sampling`，server 就不得调用 `sampling/createMessage`。对称地：如果 server 不声明 `resources.subscribe`，client 就不得试图订阅。

这正是防止生态漂移的东西。一个不支持 sampling 的 client 仍是合法的 MCP client；一个不调 `sampling` 的 server 仍是合法的 MCP server。它们只是不一起用那个特性。

### 结构化内容与错误形状

`tools/call` 返回一个由定型 block 组成的 `content` 数组：`text`、`image`、`resource`。阶段 13 · 14 给这份清单加上 MCP Apps（`ui://` 交互式 UI）。

错误用 JSON-RPC 错误码。规范定义的新增项：`-32002` "Resource not found"、`-32603` "Internal error"，外加作为 `error.data` 的 MCP 特定错误数据。

### client 能力 vs 工具调用细节

一个常见混淆：`capabilities.tools` 是说 client 是否支持 tool-list-changed notification。client 会不会调用某些特定工具，是一个由它的模型驱动的运行时选择，不是一个能力标志。能力标志是规范层面的契约。模型的选择与之正交。

### 为什么用 JSON-RPC 而不是 REST？

JSON-RPC 2.0（2010）是一个轻量的双向协议。REST 是 client 发起的。MCP 需要 server 发起的消息（sampling、notification），所以带对称 request/response 形状的 JSON-RPC 是自然的契合。JSON-RPC 还能干净地组合在 stdio 和 WebSocket/Streamable HTTP 之上，不必重新发明 HTTP 的请求形状。

```figure
mcp-tool-call
```

## 实际使用

`code/main.py` 交付一个极简 JSON-RPC 2.0 解析器和发射器，然后手动走一遍 `initialize` → `tools/list` → `tools/call` → `shutdown` 序列，打印每条消息。没有真实传输；只有消息形状。和延伸阅读里链接的规范对照，逐个核实每个外壳。

要看什么：

- `initialize` 双向声明能力；响应里有 `serverInfo` 和 `protocolVersion: "2025-11-25"`。
- `tools/list` 返回一个 `tools` 数组；每个条目有 `name`、`description`、`inputSchema`。
- `tools/call` 用 `params.name` 和 `params.arguments`。
- 响应的 `content` 是一个 `{type, text}` block 数组。

## 拿去用

本课产出 `outputs/skill-mcp-handshake-tracer.md`。给定一份 pcap 风格的 MCP client-server 交互记录，这个 skill 给每条消息标注它属于哪个基元、哪个生命周期阶段，以及它依赖哪个能力。

## 练习

1. 跑 `code/main.py`。找出能力协商发生的那一行，描述如果 server 不声明 `tools.listChanged` 会有什么变化。

2. 扩展解析器以处理 `notifications/progress`。消息形状：`{method: "notifications/progress", params: {progressToken, progress, total}}`。在一个长跑的 `tools/call` 进行时发它，确认 client 处理器会显示一个进度条。

3. 从头到尾读 MCP 2025-11-25 规范——整份文档约 80 页。找出大多数 server 都不需要的那个能力标志。提示：它跟 resource 订阅有关。

4. 在纸上勾画一个假想的"cron job"特性会属于哪个基元。（提示：server 想让 client 在某个排定的时间调用它。今天六个基元里没一个契合。）MCP 的 2026 路线图有一份草案 SEP 在做这个。

5. 解析 GitHub 上某个开源 MCP server 的一份会话日志。数 request vs response vs notification 消息。算一算流量里生命周期 vs operation 的占比各是多少。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MCP | "Model Context Protocol" | 用于模型到工具发现与调用的开放协议 |
| Server primitive | "server 暴露什么" | tools（动作）、resources（数据）、prompts（模板） |
| Client primitive | "client 让 server 用什么" | roots（scope）、sampling（LLM 回调）、elicitation（用户输入） |
| JSON-RPC 2.0 | "线上格式" | 对称的 request/response/notification 外壳 |
| `initialize` handshake | "能力协商" | 第一对消息；server 和 client 声明各自支持的特性 |
| `tools/list` | "发现" | client 向 server 要它当前的工具集 |
| `tools/call` | "调用" | client 要求 server 带参数执行一个工具 |
| `notifications/*_changed` | "变更事件" | server 告诉 client 它的基元清单变了 |
| Content block | "定型结果" | 工具结果里的 `{type: "text" | "image" | "resource" | "ui_resource"}` |
| SEP | "Spec Evolution Proposal" | 具名的草案提案（如异步 Tasks 的 SEP-1686） |

## 延伸阅读

- [Model Context Protocol — Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — 权威规范文档
- [Model Context Protocol — Architecture concepts](https://modelcontextprotocol.io/docs/concepts/architecture) — 六基元心智模型
- [Anthropic — Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) — 2024 年 11 月发布博文
- [MCP blog — First MCP anniversary](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) — 一周年回顾与 2025-11-25 规范变更
- [WorkOS — MCP 2025-11-25 spec update](https://workos.com/blog/mcp-2025-11-25-spec-update) — SEP-1686、1036、1577、835、1724 的摘要
