# 错误码决策表

这份单页参考用于在 MCP 2026-07-28 请求失败时选择正确的通道、错误码、数据结构和 HTTP 状态。完整讲解请配合 `docs/zh.md` 阅读。来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 5 节。

## 第 1 步：选择通道

| 失败涉及 | 通道 | 结构 |
|---|---|---|
| 请求本身：未知方法、未知工具、畸形 envelope、服务器故障 | 协议错误 | `{"jsonrpc": "2.0", "id": ..., "error": {"code": ..., "message": ..., "data": ...}}` |
| 工具运行后遇到的问题：错误输入、API 调用失败、业务规则、过期 handle | 工具执行错误 | 普通 `complete` 结果：`{"content": [...], "isError": true}` |

拿不准时，优先选择工具执行错误。只有未知工具、畸形请求和服务器故障属于协议错误通道；模型无法像处理 `isError` 内容那样处理协议错误。

## 第 2 步：选择错误码（仅协议错误）

| 错误码 | 名称 | 触发条件 | HTTP 状态 |
|---|---|---|---|
| -32700 | Parse error | 请求体不是有效 JSON；无法读取 `id`，因此为 `null` | 规范未指定，通常为 400 |
| -32600 | Invalid Request | JSON 有效，但不是格式正确的 JSON-RPC 2.0 对象 | 规范未指定 |
| -32601 | Method not found | 服务器未实现该方法 | 404 |
| -32602 | Invalid params | 未知工具、缺少必需 `_meta`、资源不存在、prompt 名称或参数无效、cursor 无效、日志级别无效 | 400 |
| -32603 | Internal error | 服务器自身失败 | 规范未指定 |
| -32020 | HeaderMismatch | HTTP header 与请求体不一致，或缺少必需 header | 400 |
| -32021 | MissingRequiredClientCapability | 服务器需要当前请求的 `clientCapabilities` 未声明的能力；携带 `data.requiredCapabilities` | 400 |
| -32022 | UnsupportedProtocolVersion | 请求的协议版本不受支持；携带 `data.supported` 和 `data.requested` | 400 |

## 第 3 步：绝不发出这些错误码

| 错误码 | 禁用原因 |
|---|---|
| -32000 至 -32019 | 2026-07-28 分配策略出台前的旧版子区间。新实现不得在这里分配或使用错误码。 |
| -32002 | 在 2025-11-25 及更早版本中表示资源不存在。SEP-2164 已用 -32602 取代它。 |
| -32042 | 只存在于 2025-11-25 的“需要 URL elicitation”错误码。它没有替代错误码，应改用 elicitation 流程。 |
| -32020 至 -32099 中的其他错误码 | 留给 MCP 规范。只定义了 -32020、-32021、-32022；该区间内未定义的错误码一律禁用。 |

合规实现应在这些错误码到达 socket 前就拒绝构造，而不是事后拦截。把拒绝逻辑放进组装错误响应的函数中（参见 `code/main.py` 的 `safe_error`），使禁用编号无法离开进程。

## 第 4 步：正确放置应用自定义错误码

如果已定义 MCP 错误码和 `isError` 都不合适，新错误码应完全位于 `-32768` 至 `-32000` 之外（例如，使用自有客户端和服务器约定的小正整数）。优先使用 `isError`；SEP-1303 正是为了阻止实现继续为模型本可读取和修正的问题发明错误码。

## 不携带 JSON-RPC 错误码的传输事件

| 事件 | HTTP 状态 | 是否携带 JSON-RPC 错误？ |
|---|---|---|
| 接受 notification POST | 202 Accepted | 否，完全没有响应体 |
| 向 MCP endpoint 发送 GET 或 DELETE | 405 Method Not Allowed | 否 |
| bearer token 缺失或无效 | 401 Unauthorized | 否，这是 OAuth 层响应 |
| scope 不足 | 403 Forbidden | 否，这是 OAuth 层响应 |

## “始终回显请求 id”的唯一例外

只有在 id 根本无法读取时，错误响应才不带原 id，例如原始请求体解析失败。除此之外，任何 result 或 error 响应都携带与请求相同的 id。
