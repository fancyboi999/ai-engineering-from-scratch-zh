# MCP Apps——经由 `ui://` 的交互式 UI 资源

> 纯文本工具输出给 agent 能展示的东西封了顶。MCP Apps（SEP-1724，2026 年 1 月 26 日正式）让一个工具返回沙箱化的交互式 HTML，内联渲染在 Claude Desktop、ChatGPT、Cursor、Goose 和 VS Code 里。仪表盘、表单、地图、3D 场景，全经由一个扩展。本课走一遍 `ui://` 资源 scheme、`text/html;profile=mcp-app` MIME、iframe 沙箱的 postMessage 协议，以及让 server 渲染 HTML 所附带的安全表面。

**类型：** Build
**语言：** Python（标准库，UI 资源发射器）、HTML（示例 app）
**前置要求：** 阶段 13 · 07（MCP server）、阶段 13 · 10（resources）
**预计时间：** ~75 分钟

## 学习目标

- 从一个工具调用返回一个 `ui://` 资源，并设正确的 MIME 和元数据。
- 用 `_meta.ui.resourceUri`、`_meta.ui.csp` 和 `_meta.ui.permissions` 声明一个工具关联的 UI。
- 为 UI 到宿主的通信实现 iframe 沙箱的 postMessage JSON-RPC。
- 应用 CSP 和 permissions-policy 默认值，抵御 UI 发起的攻击。

## 问题背景

一个 2025 年代的 `visualize_timeline` 工具能返回"这是按时间顺序组织的 14 条笔记：……"。那是一段话。用户真正想要的是那个交互式时间线。在 MCP Apps 之前，选项是：client 特定的 widget API（Claude artifacts、OpenAI Custom GPT HTML），或者根本没 UI。

MCP Apps（SEP-1724，2026 年 1 月 26 日发布）把契约标准化了。一个工具结果含一个 `resource`，其 URI 是 `ui://...`，其 MIME 是 `text/html;profile=mcp-app`。宿主把它渲染在一个沙箱化的 iframe 里，配一个受限的 CSP，除非显式授予否则无网络访问。iframe 里的 UI 经由一个微型 postMessage JSON-RPC 方言向宿主发消息。

每个兼容的 client（Claude Desktop、ChatGPT、Goose、VS Code）都以同样的方式渲染同一个 `ui://` 资源。一个 server、一个 HTML 包、通用的 UI。

## 核心概念

### `ui://` 资源 scheme

一个工具返回：

```json
{
  "content": [
    {"type": "text", "text": "Here is your notes timeline:"},
    {"type": "ui_resource", "uri": "ui://notes/timeline"}
  ],
  "_meta": {
    "ui": {
      "resourceUri": "ui://notes/timeline",
      "csp": {
        "defaultSrc": "'self'",
        "scriptSrc": "'self' 'unsafe-inline'",
        "connectSrc": "'self'"
      },
      "permissions": []
    }
  }
}
```

宿主随后对 `ui://notes/timeline` URI 调 `resources/read`，拿回：

```json
{
  "contents": [{
    "uri": "ui://notes/timeline",
    "mimeType": "text/html;profile=mcp-app",
    "text": "<!doctype html>..."
  }]
}
```

### iframe 沙箱

宿主把 HTML 渲染在一个沙箱化的 `<iframe>` 里，配：

- `sandbox="allow-scripts allow-same-origin"`（或按 server 声明更严）
- server 声明的 CSP 经由响应头应用。
- 没有 cookie，没有来自宿主源的 localStorage。
- 网络访问限于 CSP 里的 `connectSrc`。

### postMessage 协议

iframe 经由 `window.postMessage` 与宿主通信。一个微型 JSON-RPC 2.0 方言：

始终把 `targetOrigin` 钉到对端的确切源，并在接收侧处理任何载荷前，按白名单校验 `event.origin`。这个通道两侧都绝不要用 `"*"`——body 里携带的是工具调用和资源读取。

```js
// iframe 到宿主  (钉到宿主源)
window.parent.postMessage({
  jsonrpc: "2.0",
  id: 1,
  method: "host.callTool",
  params: { name: "notes_update", arguments: { id: "note-14", title: "..." } }
}, "https://host.example.com");

// 宿主到 iframe  (钉到 iframe 源)
iframe.contentWindow.postMessage({
  jsonrpc: "2.0",
  id: 1,
  result: { content: [...] }
}, "https://iframe.example.com");

// 两侧的接收方
window.addEventListener("message", (event) => {
  if (event.origin !== "https://expected-peer.example.com") return;
  // 可以安全处理 event.data
});
```

UI 可调用的宿主侧方法：

- `host.callTool(name, arguments)`——调用一个 server 工具。
- `host.readResource(uri)`——读一个 MCP resource。
- `host.getPrompt(name, arguments)`——取一个 prompt 模板。
- `host.close()`——关闭这个 UI。

每个调用仍走 MCP 协议，并继承 server 的权限。

### 权限

`_meta.ui.permissions` 列表请求额外能力：

- `camera`——访问用户的摄像头（用于扫描文档的 UI）。
- `microphone`——语音输入。
- `geolocation`——位置。
- `network:*`——比单靠 `connectSrc` 更宽的网络访问。

每个权限都是用户在 UI 渲染前看到的一个提示。

### 安全风险

iframe 里的 HTML 仍是 HTML。新的攻击表面：

- **经由 UI 的 prompt 注入。** 一个恶意 server UI 能展示看起来像 system 消息的文本来骗用户。宿主渲染应当显眼地把 server UI 和宿主 UI 区分开。
- **经由 `connectSrc` 的外泄。** 如果 CSP 允许 `connect-src: *`，UI 能把数据发往任何地方。默认应该严格。
- **点击劫持。** UI 覆盖在宿主 chrome 上。宿主必须防住 z-index 操纵并强制不透明度规则。
- **抢焦点。** UI 拿走键盘焦点并捕获下一条消息。宿主必须拦截。

阶段 13 · 15 作为 MCP 安全的一部分深入讲这些；本课只是引入它们。

### `ui/initialize` 握手

iframe 加载后，它经由 postMessage 发 `ui/initialize`：

```json
{"jsonrpc": "2.0", "id": 0, "method": "ui/initialize",
 "params": {"theme": "dark", "locale": "en-US", "sessionId": "..."}}
```

宿主用能力和一个会话 token 响应。UI 在随后每个宿主调用上用那个会话 token。

### AppRenderer / AppFrame SDK 基元

ext-apps SDK 暴露两个便利基元：

- `AppRenderer`（server 侧）——包一个 React / Vue / Solid 组件，发出一个带正确 MIME 和元数据的 `ui://` 资源。
- `AppFrame`（client 侧）——接收资源，挂载 iframe，并居中调停 postMessage。

你可以用这些，也可以手搓 HTML 和 JSON-RPC。

### 生态状态

MCP Apps 于 2026 年 1 月 26 日发布。截至 2026 年 4 月的 client 支持：

- **Claude Desktop。** 自 2026 年 1 月起完全支持。
- **ChatGPT。** 经由 Apps SDK 完全支持（同一底层 MCP Apps 协议）。
- **Cursor。** Beta；经设置启用。
- **VS Code。** 仅 Insider 构建。
- **Goose。** 完全支持。
- **Zed、Windsurf。** 已列入路线图。

生产里的 server：仪表盘、地图可视化、数据表、图表构建器、沙箱 IDE 预览。

```figure
t3-ui-sandbox
```

## 实际使用

`code/main.py` 在 notes server 上扩展出一个 `visualize_timeline` 工具，返回一个 `ui://notes/timeline` 资源，外加一个对该 URI 的 `resources/read` 处理器，它返回一个小而完整、带 SVG 时间线的 HTML 包。HTML 用标准库模板化——没有构建系统。postMessage 在 JS 注释里勾画，因为标准库驱动不了浏览器。

要看什么：

- 工具响应上的 `_meta.ui` 携带 resourceUri、CSP、permissions。
- HTML 无网络访问就渲染；所有数据都内联了。
- JS 经由 `window.parent.postMessage` 调 `host.callTool`（有文档但在这个标准库 demo 里是惰性的）。

## 拿去用

本课产出 `outputs/skill-mcp-apps-spec.md`。给定一个会受益于交互式 UI 的工具，这个 skill 产出完整的 MCP Apps 契约：`ui://` URI、CSP、permissions、postMessage 入口点，以及一份安全清单。

## 练习

1. 跑 `code/main.py`，检视发出的 HTML。直接在浏览器里打开这个 HTML；验证 SVG 渲染。然后勾画 UI 用来调 `host.callTool("notes_update", ...)` 的 postMessage 契约。

2. 收紧 CSP：移除 `'unsafe-inline'`，用一个基于 nonce 的脚本策略。HTML 生成代码里有什么变化？

3. 加第二个 UI 资源 `ui://notes/editor`，带一个就地编辑笔记的表单。用户提交时，iframe 调 `host.callTool("notes_update", ...)`。

4. 审计这个 UI 的攻击表面。恶意 server 可能在哪儿注入内容？iframe 沙箱防住什么，不防什么？

5. 读 SEP-1724 规范，找出 MCP Apps SDK 里一个这个玩具实现没用上的能力。（提示：组件级状态同步。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MCP Apps | "交互式 UI 资源" | 2026-01-26 发布的 SEP-1724 扩展 |
| `ui://` | "App URI scheme" | UI 包的资源 scheme |
| `text/html;profile=mcp-app` | "那个 MIME" | MCP App HTML 的 content-type |
| Iframe sandbox | "渲染容器" | 浏览器对 UI 的沙箱化，配 CSP 和权限 |
| postMessage JSON-RPC | "UI 到宿主的线" | 用于宿主调用的微型 JSON-RPC-over-postMessage 方言 |
| `_meta.ui` | "工具-UI 绑定" | 把一个工具结果链接到一个 UI 资源的元数据 |
| CSP | "Content-Security-Policy" | 声明脚本、网络、样式的允许来源 |
| AppRenderer | "server SDK 基元" | 把一个框架组件转成一个 `ui://` 资源 |
| AppFrame | "client SDK 基元" | 居中调停 postMessage 的 iframe 挂载助手 |
| `ui/initialize` | "握手" | UI 到宿主的第一条 postMessage |

## 延伸阅读

- [MCP ext-apps — GitHub](https://github.com/modelcontextprotocol/ext-apps) — 参考实现与 SDK
- [MCP Apps specification 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — 正式规范文档
- [MCP — Apps extension overview](https://modelcontextprotocol.io/extensions/apps/overview) — 高层文档
- [MCP blog — MCP Apps launch](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) — 2026 年 1 月发布博文
- [MCP Apps API reference](https://apps.extensions.modelcontextprotocol.io/api/) — JSDoc 风格 SDK 参考
