# 消息形状参考

这是一份 MCP 2026-07-28 线上流量的一页式参考，涵盖四种 JSON-RPC 形状、resultType 与 `_meta` 键规则。

## 四种形状

| 形状 | 有 `id`？ | 有 `method`？ | 携带内容 | 会收到回复？ |
|---|---|---|---|---|
| 请求 | 有，非 null，且在未完成 id 中唯一 | 有 | `params`（可选） | 有，恰好一个 |
| 通知 | 没有，绝不能有 | 有 | `params`（可选） | 没有，绝不回复 |
| 结果响应 | 有，回显请求 id | 没有 | 包含 `resultType` 的 `result` | 它本身就是回复 |
| 错误响应 | 有，除非请求 id 无法读取 | 没有 | 包含 `code` 与 `message` 的 `error` | 它本身就是回复 |

## `resultType` 值

| 值 | 含义 |
|---|---|
| `complete` | 结果包含最终内容 |
| `input_required` | `InputRequiredResult`；客户端必须提供更多输入后重试（MRTR） |
| 缺失（服务端使用较早协议版本） | 客户端必须视为 `complete` |
| 无法识别 | 客户端必须把结果视为无效 |
| 扩展值（例如 `task`） | 只有公布了对应能力时才有效 |

## `_meta` 键语法

- 可选前缀：点分 label 后接斜杠。每个 label 以字母开头，以字母或数字结尾；中间允许连字符。
- 名称：非空时，以字母或数字开头和结尾；中间允许连字符、下划线和点。
- 只有前缀的第二个 label 为 `modelcontextprotocol` 或 `mcp` 时，前缀才保留给 MCP。检查位置，而不是只检查有没有出现该词。
  - 保留：`io.modelcontextprotocol/`、`dev.mcp/`、`org.modelcontextprotocol.api/`、`com.mcp.tools/`
  - 不保留：`com.example.mcp/`（第二个 label 是 `example`）；`mcp.example/`（没有匹配的第二个 label，`mcp` 只在第一位）

## 保留的 `_meta` 键

| 键 | 携带位置 | 说明 |
|---|---|---|
| `progressToken` | 请求 | 无前缀；让请求选择接收进度通知 |
| `io.modelcontextprotocol/protocolVersion` | 请求，必需 | 本请求使用的协议版本 |
| `io.modelcontextprotocol/clientCapabilities` | 请求，必需 | 与本请求相关的客户端能力，可以是 `{}` |
| `io.modelcontextprotocol/clientInfo` | 请求，建议 | 客户端名称和版本，由发送方自行报告 |
| `io.modelcontextprotocol/logLevel` | 请求，可选 | 已弃用 logging 的选择加入字段；在 2026-07-28 中仍有效 |
| `io.modelcontextprotocol/serverInfo` | 结果，建议 | 服务端名称和版本，由发送方自行报告 |
| `io.modelcontextprotocol/subscriptionId` | `subscriptions/listen` stream 上的通知 | 把通知与其订阅关联起来 |
| `traceparent`、`tracestate`、`baggage` | 任意位置 | OpenTelemetry trace context；前缀规则的唯一例外（SEP-414） |

## 拒绝规则

请求的 `_meta` 若缺少 `protocolVersion` 或 `clientCapabilities`，则格式错误：返回 JSON-RPC error `-32602`；HTTP 上同时返回 `400 Bad Request`。

## 考试要点

- `clientInfo` 与 `serverInfo` 均由发送方自行报告。绝不能将其用于安全或路由决策。
- 保留前缀判断检查第二个 label，不是第一个，也不是“字符串任意位置是否出现 mcp”。
- 禁止 batching：每个 Streamable HTTP POST body 只包含一个请求或通知，stdio 每行只包含一条消息。
- 较早服务端缺少 `resultType` 意味着 `complete`；任何服务端返回无法识别的 `resultType` 都表示结果无效。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 2、3 节。
