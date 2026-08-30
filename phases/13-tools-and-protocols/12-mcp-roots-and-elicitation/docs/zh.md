# 显式 Scope 与无状态 Elicitation

> workspace scope 必须是可见、可授权的输入；需要用户选择或确认时，以无状态 MRTR 交付 elicitation，而不是依赖 Roots 或 connection state。

**类型：** Build
**语言：** Python（标准库，roots + elicitation demo）
**前置要求：** 阶段 13 · 07（MCP server）
**预计时间：** ~45 分钟

## 学习目标

- 用显式 workspace URI、授权、containment 和 sandbox 约束文件操作。
- 以 `input_required`/`elicitation/create` 请求确认或结构化输入。
- 验证 form capability、签名 retry state，并在 mutation 前重新校验。

## 当前 scope 与 elicitation 合同

Roots 只曾是信息性的 workspace 指引，不能作为授权、containment 或 sandbox，并且在 `2026-07-28` 已弃用。把 workspace/directory/resource URI 放在可见 tool argument 或 server config 中；按 authenticated principal 授权，做 URI normalization、path-component containment、symbolic-link policy 与 OS sandbox。

form-mode elicitation 要当前 request 声明 `elicitation: {}` 或 `elicitation.form`。若无 form support（包括 URL-only），返回 `-32021` 和 `data.requiredCapabilities.elicitation.form`。server 返回 `resultType: "input_required"`，在稳定 `inputRequests` key 中嵌入 `elicitation/create`；client 以新 id、原 method/args、`inputResponses` 和原样 `requestState` 重试。表单只能收受限、非敏感的扁平 input，绝不收 password、API key、token 或 payment credential；URL mode 要显示 HTTPS 目标与 out-of-band completion rule。

requestState 必须绑定 principal、参数摘要、候选、phase、过期和一次性 nonce，并以共享 TTL-pruned replay store 原子消费 nonce。分别处理 accept、decline、cancel；decline 不得被转成同意或重复提示。任何 mutation 前重检授权、实时目标状态与 containment。

## 旧版兼容性背景（仅用于识别，不作为新实现规范）

一个 notes MCP server 在生产里撞上的两个具体失败。

**破掉的路径假设。** server 是照着 `~/notes` 写的。一个在另一台机器、笔记在 `~/Documents/Notes` 的用户，会拿到一个悄无声息失败（找不到文件）的工具调用，或更糟，写错了地方。

**用户本会知道的缺失参数。** 用户说"删掉那条旧的 TPS 报告笔记"。模型调 `notes_delete(title: "TPS report")`，但 2023、2024、2025 年有三条匹配的笔记。工具猜不出来。用"有歧义"失败很烦人；在三条上都跑就是灾难。

Roots 修第一个：client 在 `initialize` 时声明 server 可触及的 URI 集合。Elicitation 修第二个：server 暂停工具调用，发 `elicitation/create` 让用户挑一个。

## 核心概念

### Roots

client 在 `initialize` 时声明一个 root 列表：

```json
{
  "capabilities": {"roots": {"listChanged": true}}
}
```

server 随后可以调 `roots/list`：

```json
{"roots": [{"uri": "file:///Users/alice/Documents/Notes", "name": "Notes"}]}
```

server 必须把 roots 当作边界：任何 root 集合外的文件读写都被拒绝。这不是 client 强制的（server 仍是用户信任过的代码），但规范合规的 server 会尊重它。

当用户加或删一个 root 时，client 发 `notifications/roots/list_changed`。server 重新调 `roots/list` 并更新它的边界。

### 为什么 roots 是 client 基元

Roots 由 client 声明，因为它们代表用户的同意模型。用户告诉 Claude Desktop "给这个 notes server 访问这两个目录"。server 不能拓宽那个范围。

### Elicitation：表单模式默认

`elicitation/create` 取一个表单 schema 加一个自然语言 prompt：

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Delete 'TPS report'? Multiple notes match; pick one.",
    "requestedSchema": {
      "type": "object",
      "properties": {
        "note_id": {
          "type": "string",
          "enum": ["note-3", "note-7", "note-14"]
        },
        "confirm": {"type": "boolean"}
      },
      "required": ["note_id", "confirm"]
    }
  }
}
```

client 渲染一个表单，收集用户的回答，返回：

```json
{
  "action": "accept",
  "content": {"note_id": "note-14", "confirm": true}
}
```

三种可能的 action：`accept`（用户填了）、`decline`（用户关掉了）、`cancel`（用户中止了整个工具调用）。

表单 schema 是扁平的——v1 不支持嵌套对象。SDK 通常拒绝任何比单层更复杂的东西。

### Elicitation：URL 模式（SEP-1036，实验性）

2025-11-25 新增。server 不发 schema，而是发一个 URL：

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Sign in to GitHub",
    "url": "https://github.com/login/oauth/authorize?client_id=..."
  }
}
```

client 在浏览器里打开 URL，等待完成，用户回来时返回。对 OAuth 流程、支付授权和文档签署这类表单不够用的场景有用。

漂移风险提示：SEP-1036 的响应形状仍在沉淀；有些 SDK 返回回调 URL，另一些返回完成 token。在生产里用 URL 模式前先读你 SDK 的发布说明。

### 何时 elicitation 是对的工具

- 破坏性动作前的用户确认（destructive hint + elicitation）。
- 消歧（从 N 个匹配里挑一个）。
- 首次运行设置（API key、目录、偏好）。
- OAuth 风格的流程（URL 模式）。

### 何时 elicitation 是错的

- 填一个工具本可以用散文要到的必填参数。用一次普通的重新 prompt，而非 elicitation 对话框。
- 高频调用。Elicitation 打断对话；别在循环里触发它。
- 任何 server 能事后校验的东西。校验、返回一个错误，让模型用文本问用户。

### 人在回路的桥梁

Elicitation 加 sampling 一起，让 MCP 的"人在回路"模型成为可能。一个 server 的 agent 循环可以为用户输入（elicitation）或模型推理（sampling）而暂停。阶段 13 · 11 讲了 sampling；本课讲 elicitation。把它们放一起做完整的循环中途控制。

```figure
t3-roots-boundary
```

## 实际使用

`code/main.py` 在 notes server 上扩展出：

- `roots/list` 响应，server 在 root-list-changed notification 后重新查询它。
- 一个 `notes_delete` 工具，在多条笔记匹配时用 `elicitation/create` 消歧。
- 一个 `notes_setup` 工具，用 URL 模式 elicitation 打开一个首次运行配置页（模拟的）。
- 一个边界检查，拒绝对声明 roots 之外的 URI 的操作。

demo 跑三个场景：happy path（一条匹配）、消歧（三条匹配，elicitation 触发）、root 外写入（被拒）。

## 拿去用

本课产出 `outputs/skill-elicitation-form-designer.md`。给定一个可能需要用户确认或消歧的工具，这个 skill 设计 elicitation 表单 schema 和消息模板。

## 练习

1. 跑 `code/main.py`。触发消歧路径；确认模拟的用户回答被路由回工具。

2. 加一个每次都要求 elicitation 确认的新工具 `notes_archive`（destructive hint）。看 UX：这跟模型用文本重新发问比怎么样？

3. 为一个首次运行 OAuth 流程实现 URL 模式 elicitation。注意漂移风险，加一个 SDK 版本守卫。

4. 扩展 `roots/list` 处理：notification 到达时，server 应原子地重新读取，并重扫现在可能超出范围的打开文件句柄。

5. 读 GitHub 上 SEP-1036 issue 的讨论串。找出一个影响 server 该如何处理 URL 模式回调的开放问题。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Root | "同意边界" | client 允许 server 触及的 URI |
| `roots/list` | "server 索要范围" | client 返回当前 root 集合 |
| `notifications/roots/list_changed` | "用户改了范围" | client 发信号 root 集合变了 |
| Elicitation | "调用中途问用户" | server 发起的结构化用户输入请求 |
| `elicitation/create` | "那个方法" | elicitation 请求的 JSON-RPC 方法 |
| Form mode | "schema 驱动的表单" | 在 client UI 里渲染成表单的扁平 JSON Schema |
| URL mode | "浏览器重定向" | SEP-1036 实验性；打开一个 URL 并等待 |
| `accept` / `decline` / `cancel` | "用户响应结果" | server 处理的三个分支 |
| Disambiguation | "挑一个" | 工具有 N 个候选时常见的 elicitation 用例 |
| Flat form | "只有顶层 property" | elicitation schema 不能嵌套 |

## 延伸阅读

- [MCP — Client roots spec](https://modelcontextprotocol.io/specification/draft/client/roots) — 权威 roots 参考
- [MCP — Client elicitation spec](https://modelcontextprotocol.io/specification/draft/client/elicitation) — 权威 elicitation 参考
- [Cisco — What's new in MCP elicitation, structured content, OAuth enhancements](https://blogs.cisco.com/developer/whats-new-in-mcp-elicitation-structured-content-and-oauth-enhancements) — 2025-11-25 新增项逐步讲解
- [MCP — GitHub SEP-1036](https://github.com/modelcontextprotocol/modelcontextprotocol) — URL 模式 elicitation 提案（实验性，有漂移风险）
- [The New Stack — How elicitation brings human-in-the-loop to AI tools](https://thenewstack.io/how-elicitation-in-mcp-brings-human-in-the-loop-to-ai-tools/) — UX 逐步讲解
