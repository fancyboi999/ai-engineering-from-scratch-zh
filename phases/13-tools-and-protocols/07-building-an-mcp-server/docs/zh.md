# 构建一个 MCP Server——Python + TypeScript SDK

> 多数 MCP 教程只演示 stdio 的 hello-world。一个真实的 server 暴露 tools 加 resources 加 prompts，处理能力协商，发射结构化错误，并跨 SDK 表现一致。本课端到端构建一个 notes server：标准库 stdio 传输、JSON-RPC 分发、三个 server 基元，以及一种纯函数风格——等你毕业时，它能直接塞进 Python SDK 的 FastMCP 或 TypeScript SDK。

**类型：** Build
**语言：** Python（标准库，stdio MCP server）
**前置要求：** 阶段 13 · 06（MCP 基础）
**预计时间：** ~75 分钟

## 学习目标

- 实现 `initialize`、`tools/list`、`tools/call`、`resources/list`、`resources/read`、`prompts/list`、`prompts/get` 方法。
- 写一个分发循环，从 stdin 读 JSON-RPC 消息，往 stdout 写响应。
- 按 JSON-RPC 2.0 规范和 MCP 的附加错误码发射结构化错误响应。
- 把一个标准库实现毕业到 FastMCP（Python SDK）或 TypeScript SDK，无需重写工具逻辑。

## 问题背景

在你能用远程传输（阶段 13 · 09）或一个鉴权层（阶段 13 · 16）之前，你需要一个干净的本地 server。本地意味着 stdio：server 被 client 当子进程启动，消息以换行分隔在 stdin/stdout 上流动。

2025-11-25 规范规定 stdio 消息编码为 JSON 对象，带一个明确的 `\n` 分隔符。这里没有 SSE；SSE 是旧的远程模式，正在 2026 年中被移除（Atlassian 的 Rovo MCP server 于 2026 年 6 月 30 日弃用它；Keboola 于 2026 年 4 月 1 日）。对 stdio 来说，每行一个 JSON 对象就是全部的线上格式。

notes server 是个好形状，因为它把三个 server 基元都练到了。Tools 做变更（`notes_create`）。Resources 暴露数据（`notes://{id}`）。Prompts 交付模板（`review_note`）。本课的形状可推广到任意领域。

## 核心概念

### 分发循环

```
loop:
  line = stdin.readline()
  msg = json.loads(line)
  if 有 id:
    处理请求 -> 写响应
  else:
    处理 notification -> 无响应
```

三条规则：

- 别往 stdout 打印任何不是 JSON-RPC 外壳的东西。调试日志走 stderr。
- 每个请求都必须配一条带同一个 `id` 的响应。
- notification 绝不能被响应。

### 实现 `initialize`

```python
def initialize(params):
    return {
        "protocolVersion": "2025-11-25",
        "capabilities": {
            "tools": {"listChanged": True},
            "resources": {"listChanged": True, "subscribe": False},
            "prompts": {"listChanged": False},
        },
        "serverInfo": {"name": "notes", "version": "1.0.0"},
    }
```

只声明你支持的。client 靠这套能力集来给特性设门槛。

### 实现 `tools/list` 和 `tools/call`

`tools/list` 返回 `{tools: [...]}`，每个条目有 `name`、`description`、`inputSchema`。`tools/call` 取 `{name, arguments}`，返回 `{content: [blocks], isError: bool}`。

内容 block 是定型的。最常见的：

```json
{"type": "text", "text": "Found 2 notes"}
{"type": "resource", "resource": {"uri": "notes://14", "text": "..."}}
{"type": "image", "data": "<base64>", "mimeType": "image/png"}
```

工具错误有两种形状。协议级错误（未知方法、错误参数）是 JSON-RPC 错误。工具级错误（调用合法但工具失败了）作为 `{content: [...], isError: true}` 返回。这让模型能在它的上下文里看见失败。

### 实现 resources

Resources 在设计上是只读的。`resources/list` 返回一份清单；`resources/read` 返回内容。URI 可以是 `file://...`、`http://...`，或像 `notes://` 这样的自定义 scheme。

当你把数据作为 resource 而非 tool 暴露时：

- 模型不"调用"它；client 可以在用户请求时把它注入上下文。
- 订阅让 server 在 resource 变化时推送更新（阶段 13 · 10）。
- 阶段 13 · 14 用 `ui://` 把它扩展为交互式 resource。

### 实现 prompts

Prompts 是带具名参数的模板。宿主把它们呈现为 slash-command。一个 `review_note` prompt 可能取一个 `note_id` 参数，产出一个多消息的 prompt 模板，client 把它喂给自己的模型。

### stdio 传输的微妙处

- 换行分隔的 JSON。没有长度前缀的分帧。
- 别缓冲。每次写完后 `sys.stdout.flush()`。
- client 控制生命周期。stdin 关闭（EOF）时，干净地退出。
- 别静默处理 SIGPIPE；记日志并退出。

### Annotation

每个工具可以携带描述安全属性的 `annotations`：

- `readOnlyHint: true`——纯读，可安全重试。
- `destructiveHint: true`——不可逆副作用；client 应确认。
- `idempotentHint: true`——同样的输入产出同样的输出。
- `openWorldHint: true`——与外部系统交互。

client 用这些来决定 UX（确认对话框、状态指示器）和路由（阶段 13 · 17）。

### 毕业路径

`code/main.py` 里的标准库 server 约 180 行。FastMCP（Python）把同样的逻辑塌缩成装饰器风格：

```python
from fastmcp import FastMCP
app = FastMCP("notes")

@app.tool()
def notes_search(query: str, limit: int = 10) -> list[dict]:
    ...
```

TypeScript SDK 有一个等价的形状。准备好时毕业路径是直接替换；概念（能力、分发、内容 block）是一样的。

```figure
t3-dispatch-loop
```

## 实际使用

`code/main.py` 是一个完整的、跑在 stdio 上、纯标准库的 notes MCP server。它处理 `initialize`、三个工具（`notes_list`、`notes_search`、`notes_create`）的 `tools/list` 和 `tools/call`、每条笔记的 `resources/list` 和 `resources/read`，以及一个 `review_note` prompt。你可以靠管入 JSON-RPC 消息来驱动它：

```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | python main.py
```

要看什么：

- 分发器是一个按方法名作键的 `dict[str, Callable]`。
- 每个工具执行器返回一个内容 block 列表，不是一个裸字符串。
- 执行器抛错时设 `isError: true`。

## 拿去用

本课产出 `outputs/skill-mcp-server-scaffolder.md`。给定一个领域（notes、tickets、files、database），这个 skill 用正确的 tools / resources / prompts 划分和 SDK 毕业路径搭起一个 MCP server 骨架。

## 练习

1. 跑 `code/main.py`，用手搓的 JSON-RPC 消息驱动它。练 `notes_create`，再用 `resources/read` 取回那条新笔记。

2. 加一个带 `annotations: {destructiveHint: true}` 的 `notes_delete` 工具。验证 client 会呈现一个确认对话框（这需要一个真实宿主；Claude Desktop 可以）。

3. 实现 `resources/subscribe`，让 server 在任意笔记被修改时推送 `notifications/resources/updated`。加一个 keepalive 任务。

4. 把 server 移植到 FastMCP。Python 文件应缩到 80 行以下。线上行为必须一致；用同一套 JSON-RPC 测试脚手架验证。

5. 读规范的 `server/tools` 章节，找出一个本课 server 没实现的工具定义字段。（提示：有好几个；挑一个加上。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MCP server | "暴露工具的那个东西" | 在 stdio 或 HTTP 上说 MCP JSON-RPC 的进程 |
| stdio transport | "子进程模型" | server 被 client 启动；经 stdin/stdout 通信 |
| Dispatcher | "方法路由器" | JSON-RPC 方法名到处理函数的映射 |
| Content block | "工具结果块" | 工具响应 `content` 数组里的定型元素 |
| `isError` | "工具级失败" | 标示工具失败了；和 JSON-RPC 错误区分开 |
| Annotations | "安全提示" | readOnly / destructive / idempotent / openWorld 标志 |
| FastMCP | "Python SDK" | MCP 协议之上基于装饰器的更高层框架 |
| Resource URI | "可寻址数据" | 标识一个 resource 的 `file://`、`db://` 或自定义 scheme |
| Prompt template | "slash-command 简介" | server 提供的、带参数槽位、给宿主 UI 用的模板 |
| Capability declaration | "特性开关" | `initialize` 里声明的每基元标志 |

## 延伸阅读

- [Model Context Protocol — Python SDK](https://github.com/modelcontextprotocol/python-sdk) — 参考 Python 实现
- [Model Context Protocol — TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — 平行的 TS 实现
- [FastMCP — server framework](https://gofastmcp.com/) — 给 MCP server 的装饰器风格 Python API
- [MCP — Quickstart server guide](https://modelcontextprotocol.io/quickstart/server) — 用任一 SDK 的端到端教程
- [MCP — Server tools spec](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) — tools/* 消息的完整参考
