# MCP Apps 审查清单

host 渲染支持 UI 的工具所指向内容前使用的一页参考资料，与 MCP 2026-07-28 和 MCP Apps specification（2026-01-26）保持一致。

## 信任 `ui://` 资源之前

- 本次请求已完成扩展协商：客户端在 `io.modelcontextprotocol/clientCapabilities.extensions` 中声明 `io.modelcontextprotocol/ui`，服务器也在 `server/discover` 的 `capabilities.extensions` 中列出同一标识符。
- 工具定义带有 `_meta.ui.resourceUri`；该字段和工具定义的其余部分一样，不会根据调用方发生变化。
- 工具的 `_meta.ui.visibility`（省略时默认为 `["model", "app"]`）决定谁能访问它：移除 `"model"` 后，agent 自己的工具列表绝不能显示它；移除 `"app"` 后，host 必须拒绝应用自己针对它发起的 `tools/call`。对仅限应用调用工具的跨服务器请求始终阻止。
- 资源通过普通 `resources/read` 取得，而不是特殊方法；基础线路没有其他取得 `ui://` 资源的方式。
- 结果的 `mimeType` 精确等于 `text/html;profile=mcp-app`。普通 `text/html` 无论是否带 `charset` 参数，都不是可渲染应用，标记再规范也不行。这是硬性 MUST，而不是策略选择。
- 结果的 `_meta.ui.csp` 是对象，不是列表：`connectDomains`、`resourceDomains`、`frameDomains` 和 `baseUriDomains` 均为可选的 origin 数组。host 必须严格根据这些域名构造 Content Security Policy，不得放行资源未声明的域名；host 可以按自身策略进一步收紧实际放行范围。完全省略 `csp` 时，host 必须回退到限制严格的默认策略（不允许出站连接，只允许同源脚本和样式）；省略 `frameDomains` 时，`frame-src` 为 `'none'`；省略 `baseUriDomains` 时，`base-uri` 为 `'self'`。
- 结果的 `_meta.ui.permissions` 是由空对象标志组成的对象：`camera`、`microphone`、`geolocation`、`clipboardWrite`。host 可以通过 iframe 的 `allow` 属性授予其中任意权限，但从无义务批准，缺少授权也不是拒绝资源的理由。构建良好的应用不应假定请求的权限已经获批。
- 结果带有 `ttlMs` 与 `cacheScope`，private 范围的读取结果绝不能跨授权上下文复用。

## 渲染与桥接

- 应用在 host 控制的沙箱 iframe 中渲染。它不能读取 host 页面的 cookie、local storage 或 DOM，也不能导航父页面。
- 如果 host 是网页，它绝不能直接与 view 通信：必须用一个与 host 自身不同源的 sandbox proxy 包裹 view，由该 proxy 在两个方向转发桥接消息。
- 所有应用到 host 的通信都通过基于 `postMessage` 的 JSON-RPC 方言，独立于客户端—服务器连接：部分方法名复用（`tools/call`），大部分使用新的 `ui/` 前缀（`ui/initialize`）。
- 该桥接握手不是核心协议中已删除的 `initialize` 请求。它只建立单个 iframe 到其 host frame 的通道，不协商协议版本，也不创建 session。
- 应用发起的工具调用必须通过两道独立门禁才能到达服务器：目标工具的 `visibility` 必须包含 `"app"`，并且 host 必须获得用户同意。任一道门禁都可阻止调用。转发后的调用是带新 id 和完整 `_meta` 的普通 `tools/call`。

## 回退

- 无论扩展是否曾被声明，支持 UI 的工具仍在每次 `tools/call` 中返回有用的 `content` 文本答案。
- 不支持扩展的 host 完全不会读取 `ui://` 资源，而是像处理其他工具一样使用工具文本内容。
- 此处同样适用扩展的一般规则：不支持的一方回退到核心行为，而不是让请求直接失败。

## 决策表

| 检查项 | 通过 | 失败 |
|-------|--------|-------|
| 本次请求已协商扩展 | 继续取得资源 | 使用工具文本内容；绝不取得资源 |
| 工具 `visibility` 包含调用方（`model` 或 `app`） | 继续（agent 可看到，或应用可调用） | agent 工具列表省略它，或拒绝应用调用 |
| `mimeType` 为 `text/html;profile=mcp-app` | 继续构造 CSP | 视为普通资源而非应用；回退到文本 |
| 每个已声明 CSP 域名都在 host 策略内 | 使用基于声明域名构建的 CSP 渲染 | 按 host 策略回退到文本，而不是视为协议失败 |
| 请求的 `permissions` | 授予 host 策略允许的子集；无论如何都渲染 | 绝不是拒绝资源的理由 |
| 应用发起的工具调用同时具备 visibility 与用户同意 | 作为普通 `tools/call` 转发 | 不转发；服务器不会收到任何请求 |

## 考试要点

- 扩展标识符为 `io.modelcontextprotocol/ui`，像其他扩展一样逐请求协商，绝不是每条连接只协商一次。
- `_meta.ui.csp` 是域名列表键组成的对象，不是扁平数组；`_meta.ui.permissions` 是空对象标志组成的对象，不是字符串列表。
- mime type 错误是硬性 MUST 失败；CSP 域名超出策略范围，是 host 在行使进一步收紧权限，不是规范强制拒绝；未授予权限绝不会阻止渲染。
- `visibility` 默认为 `["model", "app"]`；移除任一名称会限制不同调用方，跨服务器的仅限应用调用始终阻止。
- `ui/initialize` 属于应用到 host 的桥接，不是已删除的核心 `initialize` 请求；web host 只能通过不同源的中间 sandbox proxy 访问 view。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 14 节，以及 MCP Apps specification（2026-01-26）。
