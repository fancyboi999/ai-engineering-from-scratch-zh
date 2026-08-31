# 无状态协议上的 MCP Apps

> 交互式结果仍是一场 MCP 工具和资源交换。2026-07-28 核心让这场交换自包含，而 Apps 扩展增加了沙箱化浏览器界面。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 07（MCP server）、阶段 13 · 10（resources）
**预计时间：** ~75 分钟

## 学习目标

- 通过 `server/discover` 和每个请求的扩展能力声明 MCP Apps。
- 在调用工具之前，先在工具上声明一个 `ui://` 资源。
- 在 2026-07-28 无状态传输线上返回完整的工具和资源结果。
- 区分 Apps 的 `ui/initialize` 桥接消息与已移除的 MCP 核心握手。
- 应用源验证、沙箱、CSP 和最小权限原则。

## 问题背景

文本结果可以描述一条时间线，却不能把一条可供用户筛选、检查或操作的时间线交给他们。

MCP Apps 通过可选扩展解决展示问题。工具定义指向一个 `ui://` 资源。宿主可在工具运行前获取并审查该资源，在沙箱化 iframe 中渲染它，并通过 JSON-RPC 桥接调停所有 App 操作。

核心协议在 2026-07-28 发生变化。不要把 App 包进旧的连接生命周期：

- 不再有核心 `initialize` 请求或 `notifications/initialized` 通知。
- 不再有 `Mcp-Session-Id` 请求头。
- 每个请求都在 `params._meta` 中携带协议版本和 client 能力。
- server 实现 `server/discover`，供 client 检查版本、核心能力和扩展。
- 每个成功结果都有 `resultType` 区分字段。
- Streamable HTTP 每个请求只用一次 POST。现代 GET 和 DELETE 入口返回 405。

Apps 桥接仍有一个名为 `ui/initialize` 的方法。它属于 iframe 的 postMessage 方言，不会重新创建一个核心 MCP 会话。

## 核心概念

### 两种协议，一个功能

让各层职责明确：

1. MCP 核心承载 `server/discover`、`tools/list`、`tools/call`、`resources/list` 和 `resources/read`。
2. MCP Apps 扩展声明 UI，并定义 iframe 到宿主的桥接。
3. 浏览器沙箱规则限制 UI 能访问的范围。

扩展标识符是 `io.modelcontextprotocol/ui`。双方都要选择加入。client 在每个请求的能力对象中发送扩展支持：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/ui": {}
        }
      },
      "io.modelcontextprotocol/clientInfo": {
        "name": "timeline-host",
        "version": "1.0.0"
      }
    }
  }
}
```

建议提供 `clientInfo` 用于诊断。它由 client 自行报告，并非授权身份。

### 渲染前先发现

server 的发现结果会声明该扩展：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {},
    "resources": {},
    "extensions": {
      "io.modelcontextprotocol/ui": {}
    }
  },
  "ttlMs": 300000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "timeline-app-server",
      "version": "2.0.0"
    }
  }
}
```

server 必须支持发现。client 无需在每次操作前都调用发现，因为每个操作都携带自身能力。

### 在工具定义上声明 UI

现代 Apps 契约在 `tools/list` 中将 UI 绑定到工具：

```json
{
  "name": "notes_timeline",
  "description": "Render a timeline of notes.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  },
  "_meta": {
    "ui": {
      "resourceUri": "ui://notes/timeline.html"
    }
  }
}
```

这是刻意设计为调用前元数据。宿主可以在结果请求显示它之前预加载、缓存并审查 HTML 的安全性。兼容性代码可接受较旧的扁平元数据键，但新 server 应输出嵌套的 `_meta.ui.resourceUri` 形式。

当前核心中的 `tools/list` 可缓存。请包含确定性排序、`ttlMs` 和 `cacheScope`。当可见工具会随用户或 token 变化时，使用 `private`。

### 先返回数据，再让宿主绑定视图

工具调用返回普通内容加结构化数据：

```json
{
  "resultType": "complete",
  "content": [
    {"type": "text", "text": "Timeline ready."}
  ],
  "structuredContent": {
    "notes": [
      {"id": "note-1", "title": "Discover", "created": "2026-07-28"}
    ]
  },
  "isError": false
}
```

宿主已知道哪个视图属于该工具。不要为了重复 URI 而另造一个内容块。

### 将 App 作为资源提供

server 在发现中声明 `resources`，因而还实现了必需的 `resources/list` 操作。其确定性列表条目包括规范 URI、稳定名称、说明和 MIME 类型。该列表结果与确定性工具列表一样，包含 `resultType`、server 身份元数据、`ttlMs` 和 `cacheScope`。

宿主发送 `resources/read`。在 Streamable HTTP 上，请求为：

```text
POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: resources/read
Mcp-Name: ui://notes/timeline.html
```

请求头的值和 JSON-RPC body 必须一致。不一致即为协议错误 `-32020`。

结果包含 HTML 资源和缓存提示：

```json
{
  "resultType": "complete",
  "contents": [
    {
      "uri": "ui://notes/timeline.html",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!doctype html>...",
      "_meta": {
        "ui": {
          "csp": {
            "connectDomains": [],
            "resourceDomains": [],
            "frameDomains": [],
            "baseUriDomains": []
          },
          "permissions": {}
        }
      }
    }
  ],
  "ttlMs": 60000,
  "cacheScope": "public"
}
```

### 将 UI 资源作为可执行内容缓存

App 资源不能与普通文本等同。它的缓存条目可以执行桥接代码、渲染工具数据，并请求由宿主调停的操作。应以规范 `ui://` URI、被接纳的 server 身份和版本、资源内容摘要，以及当 `cacheScope` 为 private 时的授权上下文作为键。即使 URI 相同，也绝不要跨主体复用私有 App 资源，因为 HTML 或其策略元数据可能不同。

当 `ttlMs` 到期、工具的 `_meta.ui.resourceUri` 绑定改变、server 版本或接纳的描述符 pin 改变，或已确认的资源变更订阅提到该 URI 时，使该条目失效。重新挂载前重新获取资源并重新应用 CSP 和权限审查。不能只因新资源版本尚未加载，就让过期 iframe 保留更宽的权限。

### 在功能策略之前拒绝传输歧义

验证顺序经过刻意安排。先验证 JSON-RPC 形状，并要求字符串协议元数据和对象类型的 client 能力映射。然后比较路由请求头和 body。只有之后才决定已匹配的协议版本是否受支持。这个顺序防止代理与 server 对不同请求作出解释。

| 条件 | HTTP | JSON-RPC 错误 |
|------|------|----------------|
| 请求头和 body 的版本、方法或名称不一致 | 400 | `-32020` |
| 请求头和 body 一致但版本不受支持 | 400 | `-32022`，其 `data` 必须恰为 `{"supported":["2026-07-28"],"requested":"<actual>"}` |
| `resources/read` 缺少 Apps 扩展能力 | 400 | `-32021`，其 `data.requiredCapabilities.extensions.io.modelcontextprotocol/ui` |
| 方法未知 | 404 | `-32601` |

JSON-RPC 通知没有 `id`，因此 server 绝不会为它发出 JSON-RPC 响应。被接受的 HTTP 通知返回 202 和空 body。错误可改变 HTTP 状态，但仍不能为通知创建 JSON-RPC 错误 body。

### 沙箱是边界，不是信任结论

宿主控制 iframe。App 无法直接读取宿主 cookie、本地存储或页面 DOM。所有特权工作都必须穿过桥接。

使用以下默认值：

- 先将所有 CSP 域名列表留空，只添加 App 所需的源。`connectDomains` 用于 fetch、XHR 和 WebSocket；`resourceDomains` 用于脚本、样式、图片和字体。
- 可行时打包代码和数据。
- 除非可见功能确有需要，否则不请求摄像头、麦克风或位置权限。
- 将 `postMessage` 固定到确切的对端源，并拒绝来自所有其他源的事件。
- 将工具参数、工具结果、资源文本和桥接消息视为不可信输入。
- 将用户同意保留在宿主中。iframe 不能批准它自己的后果性操作。

不要把教程中的固定 `sandbox` 属性复制到每个宿主中。宿主必须根据 App 的源模型和自身隔离设计选择标志。

允许的域仍是一条外泄路径。`connectDomains: ["https://api.example.com"]` 意味着在 App 内执行的任何脚本都可以将允许的数据发送到那里。精确的源匹配可避免目标混淆，却不能决定载荷是否恰当。默认保持连接访问为空，避免将 bearer token 放进 iframe；可行时让宿主代理狭窄操作，限制响应和请求大小，并审计哪次用户操作触发了每个出站请求。将 `resourceDomains` 与 `connectDomains` 分开处理；加载字体或脚本的许可不应授予任意数据上传。

### Apps 桥接有自己的生命周期

Apps 桥接是经由 `postMessage` 的 JSON-RPC 方言。它可以交换 `ui/initialize` 和 `ui/*` 通知，并可代理形似核心的方法，如 `tools/call`。

View 发送 `ui/initialize`，其中带有 `appInfo` 和一个 `appCapabilities` 对象。宿主返回它的能力和宿主上下文。只有在该响应之后，View 才发送 `ui/notifications/initialized`。宿主必须等待这条 Apps 通知后才能向 View 发送消息。

这个局部握手在一个 iframe 和一个宿主 frame 间创建桥接。它不会协商 MCP 协议版本、创建 server 状态或铸造传输会话。注意精确前缀：核心 `notifications/initialized` 已移除，而 Apps 的 `ui/notifications/initialized` 仍然存在。由桥接工具调用生成的核心请求是一个新的自包含请求，带有新的 JSON-RPC id 和完整请求元数据。

### 宿主上下文、操作和撤销

桥接初始化后，宿主仍是权威。View 只能通过宿主已声明的能力请求工具操作、导航、剪贴板使用或其他特权效果。宿主验证带类型的请求、当前用户、目标和参数，应用批准策略，并可拒绝请求。按钮点击和有效桥接消息只表达意图；两者都不授予权限。

将主题、尺寸和无障碍能力视为会变化的宿主上下文，而非一次性渲染输入：

- 应用宿主提供的颜色和排版 token，再响应主题或对比度偏好的变化。
- 让 View 报告期望尺寸，但让宿主限制并应用 iframe 尺寸，以免内容逃出布局或制造欺骗性覆盖层。
- 在 iframe 内保留键盘顺序、可见焦点、无障碍名称、屏幕阅读器状态、足够的对比度、缩放和减少动态效果行为。
- 调整尺寸和重新渲染后，重新测试宿主控件与 View 控件之间的焦点转移。

App 打开期间能力可能被撤销：用户切换账户、策略改变、server 被隔离，或宿主收紧同意范围。应在操作时检查能力和授权，而非只在 `ui/initialize` 时检查。撤销时，拒绝待处理的特权调用，停止不再符合策略的网络活动，清除敏感的已渲染状态；当 UI 资源本身不再被接纳时，重新挂载或回退到文本。View 必须将拒绝视作正常结果，不能不断重试直到宿主让步。

### 回退是契约的一部分

支持 Apps 的 server 仍可服务未声明 UI 扩展的宿主：

- 在 `tools/list` 中返回同一工具，但不带 `_meta.ui`。
- 为 `tools/call` 保留有用的文本结果。
- 对该 UI 的 `resources/read` 以缺少能力错误拒绝。
- 决定工具是否完成时，绝不假设 iframe 存在。

```figure
t3-ui-sandbox
```

## 动手构建

`code/main.py` 构建了一个不依赖 SDK 的小型进程内协议模型。它验证当前请求信封和 Streamable HTTP 路由值，通过 `server/discover` 声明 Apps，列出工具和资源，执行工具，并提供一个自包含 HTML 资源。

该模型接收已解析的 body 和路由请求头。它不是完整 HTTP adapter，也不解析 `Content-Type` 或 `Accept`。请使用第 09 课中的完整 Streamable HTTP adapter；它要求 `Content-Type: application/json` 和同时包含 `application/json` 与 `text/event-stream` 的 `Accept` 值。

运行它：

```bash
cd phases/13-tools-and-protocols/14-mcp-apps
python3 code/main.py
python3 -m unittest discover code/tests -v
```

检查输出中的五项：

1. 每次调用都相互独立。
2. 每个请求都带有 `_meta` 能力。
3. `resources/list` 在读取任何资源前返回稳定描述符。
4. 每个结果都有 `resultType` 和 server 身份元数据。
5. 不出现核心会话标识符。

## 实际使用

从 `server/discover` 开始。确认 `io.modelcontextprotocol/ui` 出现在 server 扩展映射中。然后调用两次 `tools/list`：一次带 Apps 能力，一次不带。第一个响应声明资源。第二个仍是可用的纯文本工具。

读取 `ui://notes/timeline.html`。在 HTML 中搜索 `hostOrigin` 和 `event.origin` guard。这两行是桥接未使用通配符目标的最低限度可见证据。

## 拿去用

本课交付 `outputs/skill-mcp-apps-spec.md`。在编写框架代码前，用它审查 App 契约。它要求作者说明当前核心信封、扩展协商、回退、UI 资源、缓存策略、CSP、权限、桥接方法和同意边界。

## 练习

1. 将 client 能力改为空扩展映射。确认 `tools/list` 保留工具但移除 UI 绑定。
2. 发送 `Mcp-Name: ui://notes/other.html`，但 body 读取时间线。确认错误为 `-32020`。
3. 将资源改为 `cacheScope: private`。描述能证明此设置合理的用户特定条件。
4. 将脚本移至 `https://static.example.com/app.js`。将该源添加到 `resourceDomains`，并解释新增的供应链风险。
5. 添加一个 `notes_open` 工具，让按钮点击经由宿主路由。将用户批准保留在宿主中。

## 关键术语

| 术语 | 含义 |
|------|---------|
| MCP Apps | 用于由 MCP 宿主渲染交互式 HTML 的可选扩展 |
| `io.modelcontextprotocol/ui` | 由双方声明的扩展标识符 |
| `ui://` | App UI 模板的资源 scheme |
| `text/html;profile=mcp-app` | MCP App HTML 的 MIME 类型 |
| `server/discover` | 当前用于协议和能力发现的 RPC |
| `resources/list` | server 声明资源时必需的资源列表方法 |
| `resultType` | 现代成功结果所需的区分字段 |
| `ui/initialize` | 第一条 Apps 桥接请求，与已移除的核心初始化分离 |
| `ui/notifications/initialized` | 宿主响应后发送的 Apps View 就绪通知 |
| CSP | 限制脚本、样式、图片和网络源的浏览器策略 |
| 文本回退 | 未支持 Apps 的宿主仍保留的工具行为 |

## 延伸阅读

- [MCP 2026-07-28 base protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP Apps build guide](https://modelcontextprotocol.io/extensions/apps/build)
- [Official extension support matrix](https://modelcontextprotocol.io/extensions/client-matrix)
