# MCP Resources 与 Prompts——无状态的上下文暴露

> resource 是可按 URI 读取的 context，prompt 是用户选择的消息模板；二者都需要明确授权、确定性列表和可审计的 cache contract。

**类型：** Build
**语言：** Python（标准库，resource + prompt 处理器）
**前置要求：** 阶段 13 · 07（MCP server）
**预计时间：** ~45 分钟

## 学习目标

- 为给定领域，在把一个能力暴露为 tool、resource 还是 prompt 之间做决定。
- 实现 `resources/list`、`resources/read` 与 `subscriptions/listen`。
- 用参数模板实现 `prompts/list` 和 `prompts/get`。
- 为 resource 与 prompt 列表设计稳定排序和 cache policy。

## 当前 primitive 合同

模型选择的操作是 tool；host/user 按 URI 获取的内容是 resource；用户启动的消息工作流是 prompt。每个 server 必须实现 `server/discover`，即使 client 可以直接调用其他 method。`resources/read` 的未知或无效 URI 返回 `-32602`；URI 在解析、授权与 boundary check 后才可读取，resource text 永远是 untrusted input，不能扩张 tool permission。

`resources/list`、`prompts/list` 必须在相同 request input 下具有稳定 membership 与排序。discover、list 与资源读取的 cacheable result 都有 `ttlMs` 和正确的 `cacheScope`；用户数据通常是 private。需要更新时，client POST `subscriptions/listen`，listen id 成为 subscription metadata；subscription 不是 session，notification 也不替代后续 read authorization。旧 `resources/subscribe` 不属于新设计。

## 旧版兼容性背景（仅用于识别，不作为新实现规范）

一个笔记应用的天真 MCP server 把一切都暴露为工具：`notes_read`、`notes_list`、`notes_search`。这把每次数据访问都包进一个模型驱动的工具调用里。后果：

- 对每个可能受益于上下文的查询，模型都得决定是否要调 `notes_read`。
- 只读内容无法被订阅，也无法流到宿主的侧边面板。
- client UI（Claude Desktop 的资源附加面板、Cursor 的 "Include file" 选择器）呈现不了这些数据。

正确的划分：把数据暴露为 resource，把变更或计算性的动作暴露为 tool，把可复用的多步工作流暴露为 prompt。每个基元都有它的 UX 可供性和它的访问模式。

## 核心概念

### tools vs resources vs prompts——决策规则

| 能力 | 基元 |
|------------|-----------|
| 用户想搜索、过滤或变换数据 | tool |
| 用户想让宿主把这份数据当上下文带上 | resource |
| 用户想要一个可重跑的模板化工作流 | prompt |

指引：如果模型在每个相关查询上调用它都会受益，它是 tool。如果用户把它附到一段对话上会受益，它是 resource。如果用户想复用的单位是一整套多步工作流，它是 prompt。

### Resources

`resources/list` 返回 `{resources: [{uri, name, mimeType, description?}]}`。`resources/read` 取 `{uri}`，返回 `{contents: [{uri, mimeType, text | blob}]}`。

URI 可以是任何可寻址的东西：

- `file:///Users/alice/notes/mcp.md`
- `postgres://my-db/query/SELECT ...`
- `notes://note-14`（自定义 scheme）
- `memory://session-2026-04-22/recent`（server 特有）

`contents[]` 同时支持文本和二进制。二进制把 `blob` 用作 base64 编码字符串，外加一个 `mimeType`。

### Resource 订阅

在能力里声明 `{resources: {subscribe: true}}`。client 调 `resources/subscribe {uri}`。server 在 resource 变化时发 `notifications/resources/updated {uri}`。client 重新读。

用例：一个 resource 是磁盘文件的 notes server；一个文件监视器触发更新 notification；当文件在宿主之外被编辑时，Claude Desktop 把它重新拉进上下文。

### Resource 模板（2025-11-25 新增）

`resourceTemplates` 让你暴露一个参数化的 URI 模式：`notes://{id}`，`id` 作为补全目标。client 能在资源选择器里自动补全 id。

### Prompts

`prompts/list` 返回 `{prompts: [{name, description, arguments?}]}`。`prompts/get` 取 `{name, arguments}`，返回 `{description, messages: [{role, content}]}`。

一个 prompt 是一个模板，它填充成一个消息列表，宿主把它喂给自己的模型。比如，一个 `code_review` prompt 取一个 `file_path` 参数，返回一个三消息序列：一条 system 消息、一条带文件正文的 user 消息，以及一条带推理模板的 assistant 起手。

### 宿主与 prompts

Claude Desktop、VS Code 和 Cursor 在聊天 UI 里把 prompts 呈现为 slash-command。用户敲 `/code_review`，从一个表单里挑参数。server 的 prompt 是"用户快捷方式"和"发给模型的完整 prompt"之间的契约。

不是每个 client 都已经支持 prompts——查能力协商。一个声明了 prompt 能力的 server，碰上一个不支持 prompt 的 client，就根本看不到那些 slash 命令。

### "list changed" notification

resources 和 prompts 在集合发生变更时都发 `notifications/list_changed`。一个刚导入 20 条新笔记的 notes server 发 `notifications/resources/list_changed`；client 重新调 `resources/list` 来收纳这些新增项。

### 内容类型约定

文本：`mimeType: "text/plain"`、`text/markdown`、`application/json`。
二进制：`image/png`、`application/pdf`，外加 `blob` 字段。
MCP Apps（第 14 课）：在一个 `ui://` URI 里用 `text/html;profile=mcp-app`。

### 动态 resource

一个 resource URI 不必对应一个静态文件。`notes://recent` 可以在每次读时返回最近五条笔记。`db://query/users/active` 可以执行一个参数化查询。server 可以自由地动态计算内容。

规则：如果 client 能按 URI 缓存，URI 就必须稳定。如果计算是一次性的，URI 就应该含一个时间戳或 nonce，免得 client 缓存陈旧。

### 订阅 vs 轮询

支持订阅的 client 经由 `notifications/resources/updated` 拿到 server 推送。订阅之前的 client，或不支持它的宿主，靠重新读来轮询。两者都规范合规。server 的能力声明告诉 client 它支持哪种。

订阅的代价：server 上的每会话状态（谁订阅了什么）。把订阅集合保持有界；断连的 client 应超时。

### prompts vs system prompts

MCP 里的 prompts 不是 system prompt。宿主的 system prompt（它自己的操作指令）和 MCP prompts（server 提供、由用户触发的模板）并排共存。一个守规矩的 client 永不让 server prompt 覆盖它自己的 system prompt；它把它们分层叠加。

```figure
t3-primitive-sort
```

## 实际使用

`code/main.py` 在第 07 课的 notes server 上扩展出：

- 带 `resources/subscribe` 支持的每笔记 resource（`notes://note-1` 等）。
- 一个渲染成三消息模板的 `review_note` prompt。
- 一个文件监视器模拟，在某条笔记被修改时发 `notifications/resources/updated`。
- 一个 `notes://recent` 动态 resource，总是返回最近五条笔记。

跑一遍 demo 看完整流程。

## 拿去用

本课产出 `outputs/skill-primitive-splitter.md`。给定一个拟议的 MCP server，这个 skill 把每个能力归类为 tool / resource / prompt 并附一个理由。

## 练习

1. 跑 `code/main.py`。观察初始资源列表，然后触发一次笔记编辑，验证 `notifications/resources/updated` 事件触发。

2. 加一个 `resources/list_changed` 发射器：当创建一条新笔记时，发那个 notification，让 client 重新发现。

3. 为一个 GitHub MCP server 设计三个 prompt：`summarize_pr`、`triage_issue`、`release_notes`。每个带参数 schema。prompt 正文应无需进一步编辑就能跑。

4. 拿第 07 课 server 里一个现有工具，归类它该保持为 tool，还是该拆成一个 resource 加 tool 的对子。用一句话证明。

5. 读规范的 `server/resources` 和 `server/prompts` 章节。找出 `resources/read` 里一个很少被填、但规范支持的字段。提示：看 resource 内容上的 `_meta`。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Resource | "暴露的数据" | 宿主能读的、URI 可寻址的内容 |
| Resource URI | "指向数据的指针" | scheme 前缀的标识符（`file://`、`notes://` 等） |
| `resources/subscribe` | "监视变化" | client 选择加入的、针对某个 URI 的 server 推送更新 |
| `notifications/resources/updated` | "resource 变了" | 信号，告诉 client 一个被订阅的 resource 有了新内容 |
| Resource template | "参数化 URI" | 带补全提示、给宿主选择器用的 URI 模式 |
| Prompt | "slash-command 模板" | 带参数槽位的具名多消息模板 |
| Prompt arguments | "模板输入" | 宿主在渲染前收集的定型参数 |
| `prompts/get` | "渲染模板" | server 返回填好的消息列表 |
| Content block | "定型块" | `{type: text | image | resource | ui_resource}` |
| Slash-command UX | "用户快捷方式" | 宿主把 prompts 呈现为以 `/` 开头的命令 |

## 延伸阅读

- [MCP — Concepts: Resources](https://modelcontextprotocol.io/docs/concepts/resources) — resource URI、订阅与模板
- [MCP — Concepts: Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) — prompt 模板与 slash-command 集成
- [MCP — Server resources spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) — 完整 `resources/*` 消息参考
- [MCP — Server prompts spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts) — 完整 `prompts/*` 消息参考
- [MCP — Protocol info site: resources](https://modelcontextprotocol.info/docs/concepts/resources/) — 在官方文档上扩展的社区指南
