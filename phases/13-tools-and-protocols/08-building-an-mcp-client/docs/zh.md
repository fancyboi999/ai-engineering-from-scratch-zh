# 构建一个 MCP Client——发现、调用、会话管理

> 多数 MCP 内容交付的是 server 教程，对 client 一笔带过。难啃的编排都住在 client 代码里：进程启动、能力协商、跨多个 server 合并工具列表、sampling 回调、重连，以及命名空间冲突的解决。本课构建一个多 server client，把三个不同的 MCP server 提升进一个扁平的工具命名空间，供模型使用。

**类型：** Build
**语言：** Python（标准库，多 server MCP client）
**前置要求：** 阶段 13 · 07（构建一个 MCP server）
**预计时间：** ~75 分钟

## 学习目标

- 把一个 MCP server 当子进程启动，完成 `initialize`，并发一条 `notifications/initialized`。
- 维护每 server 的会话状态（能力、工具列表、上次见到的 notification id）。
- 把跨多个 server 的工具列表合并进一个命名空间，并处理冲突。
- 把一个工具调用路由到拥有它的 server，并重组响应。

## 问题背景

一个真实的 agent 宿主（Claude Desktop、Cursor、Goose、Gemini CLI）一次加载多个 MCP server。一个用户可能同时跑着一个文件系统 server、一个 Postgres server 和一个 GitHub server。client 的活儿：

1. 启动每个 server。
2. 各自独立地握手。
3. 对每个调 `tools/list`，把结果摊平。
4. 当模型吐出 `notes_search` 时，在合并后的命名空间里查它，路由到正确的 server。
5. 不阻塞地处理来自任意 server 的 notification（`tools/list_changed`）。
6. 传输失败时重连。

把这一切手搓出来，正是"玩具"和"堪用"的分界线。官方 SDK 把这些包了起来，但心智模型必须是你自己的。

## 核心概念

### 子进程启动

`subprocess.Popen`，配 `stdin=PIPE, stdout=PIPE, stderr=PIPE`。设 `bufsize=1` 并用文本模式做逐行读。每个 server 是一个进程；client 每个 server 持一个 `Popen` 句柄。

### 每 server 的会话状态

每个 server 一个 `Session` 对象，持有：

- `process`——Popen 句柄。
- `capabilities`——server 在 `initialize` 时声明的内容。
- `tools`——上次的 `tools/list` 结果。
- `pending`——请求 id 到一个等响应的 promise/future 的映射。

请求天生是异步的；发给 server A 的 `tools/call`，在 server B 调到一半时不能阻塞。要么用线程配队列，要么用 asyncio。

### 合并命名空间

当 client 看到聚合的工具列表时，名字可能冲突。两个 server 可能都暴露 `search`。client 有三个选项：

1. **按 server 名加前缀。** `notes/search`、`files/search`。清晰但难看。
2. **静默先到先得。** 后来的 server 的 `search` 覆盖前面的。有风险；藏掉了冲突。
3. **冲突拒绝。** 拒绝加载第二个 server；通知用户。对安全敏感的宿主最稳。

Claude Desktop 用按 server 加前缀。Cursor 用冲突拒绝并给清晰错误。VS Code MCP 也采纳按 server 加前缀。

### 路由

合并后，一张分发表把 `tool_name -> session` 映射起来。模型按名字吐一个调用；client 找到那个 session，往那个 server 的 stdin 写一条 `tools/call` 消息，然后等响应。

### Sampling 回调

如果 server 在 `initialize` 时声明了 `sampling` 能力，它可以发 `sampling/createMessage`，要 client 跑它的 LLM。client 必须：

1. 阻塞对那个 server 的后续请求，直到 sample 解析完，或如果它的实现支持并发就做流水线。
2. 调它的 LLM provider。
3. 把响应发回 server。

第 11 课端到端讲 sampling。本课为完整起见打个桩。

### Notification 处理

`notifications/tools/list_changed` 意味着重新调 `tools/list`。`notifications/resources/updated` 意味着如果那个 resource 在用，就重新读它。notification 不能产生响应——别试图 ack 它们。

一个常见 client bug：在一条 notification 待在流里时，把读循环阻塞在 `tools/call` 上。用一个后台读取线程，把每条消息推上一个队列；主线程出队并分发。

### 重连

传输会失败：server 崩了、OS 杀了进程、stdio 管道断了。client 检测到 stdout 上的 EOF，把那个会话当死的。选项：

- 静默重启 server 并重新握手。对纯只读 server 没问题。
- 把失败呈现给用户。对有用户可见会话的有状态 server 没问题。

阶段 13 · 09 讲 Streamable HTTP 的重连语义；stdio 更简单。

### Keepalive 与会话 id

Streamable HTTP 用一个 `Mcp-Session-Id` 头。stdio 没有会话 id——进程身份本身就是会话。keepalive ping 是可选的；stdio 管道不会因不活跃而断。

```figure
tp-client-merge
```

## 实际使用

`code/main.py` 把三个模拟 MCP server 当子进程启动，逐个握手，合并它们的工具列表，并把工具调用路由到正确的那个。这些"server"实际是跑玩具应答器的其他 Python 进程（没有真实 LLM）。跑一跑看：

- 三次初始化，各有自己的能力集。
- 三份 `tools/list` 结果合并进一个 7 工具的命名空间。
- 一个基于工具名的路由决策。
- 一个靠命名空间前缀防住的冲突。

要看什么：

- `Session` dataclass 干净地持有每 server 状态。
- 后台读取线程在 stdout 上出队每一行，而不阻塞主线程。
- 分发表是一个简单的 `dict[str, Session]`。
- 冲突处理是显式的：当两个 server 声明同一个名字时，后者被加前缀重命名。

## 拿去用

本课产出 `outputs/skill-mcp-client-harness.md`。给定一份声明式的 MCP server 清单（name、command、args），这个 skill 产出一个脚手架，启动它们、合并工具列表，并交付一个带冲突解决的路由函数。

## 练习

1. 跑 `code/main.py`，看 server 启动日志。用 SIGTERM 杀掉一个模拟 server 进程，观察 client 如何检测到 EOF 并把那个会话标记为死的。

2. 实现命名空间前缀。当两个 server 都暴露 `search` 时，把第二个重命名为 `<server>/search`。更新分发表，验证工具调用正确路由。

3. 给 server 重启加一个连接池风格的退避：连续失败上做指数退避，封顶 30 秒，三次失败后向用户发一个 notification。

4. 勾画一个支持 100 个并发 MCP server 的 client。什么数据结构取代简单的分发 dict？（提示：前缀命名空间用 trie，外加一个每 server 工具数的度量。）

5. 把 client 移植到官方 MCP Python SDK。SDK 封装了 `stdio_client` 和 `ClientSession`。代码应从约 200 行缩到约 40 行，同时保住多 server 路由。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MCP client | "agent 宿主" | 启动 server 并编排工具调用的进程 |
| Session | "每 server 状态" | 能力、工具列表，以及待处理请求的记账 |
| Merged namespace | "一份工具列表" | 跨所有活跃 server 的扁平工具名集合 |
| Namespace collision | "两个 server 同名工具" | client 必须给重名项加前缀、拒绝或先到先得 |
| Routing | "这个调用归谁？" | 从工具名分发到拥有它的 server |
| Background reader | "不阻塞的 stdout" | 把 server stdout 抽进队列的线程或任务 |
| Sampling callback | "LLM 即服务" | client 对来自 server 的 `sampling/createMessage` 的处理器 |
| `notifications/*_changed` | "基元变了" | 信号，client 必须重新发现或重新读 |
| Reconnection policy | "server 死了时" | 传输失败时的重启语义 |
| Stdio session | "进程 = 会话" | 没有会话 id；子进程生命周期就是会话 |

## 延伸阅读

- [Model Context Protocol — Client spec](https://modelcontextprotocol.io/specification/2025-11-25/client) — 权威的 client 行为
- [MCP — Quickstart client guide](https://modelcontextprotocol.io/quickstart/client) — 用 Python SDK 的 hello-world client 教程
- [MCP Python SDK — client module](https://github.com/modelcontextprotocol/python-sdk) — 参考的 `ClientSession` 和 `stdio_client`
- [MCP TypeScript SDK — Client](https://github.com/modelcontextprotocol/typescript-sdk) — TS 平行版
- [VS Code — MCP in extensions](https://code.visualstudio.com/api/extension-guides/ai/mcp) — VS Code 如何在单个编辑器宿主里多路复用多个 MCP server
