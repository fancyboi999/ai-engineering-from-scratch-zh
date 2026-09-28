# 工具 Schema 参考

面向 MCPA「Architecture and Components」领域的一页式参考资料：工具定义中的字段、约束 inputSchema 与 outputSchema 的 JSON Schema 规则，以及符合 2026-07-28 规范的服务端必须分开的两种错误通道。

## 工具定义字段

- **name**：在单个服务端内唯一；具体规则见下文。
- **title**：可选的人类可读显示名称。
- **description**：模型用于判断相关性的自然语言文本。
- **icons**：可选，仅限 https 或 data URI，并与服务端同源。
- **inputSchema**：必需的 JSON Schema 对象，绝不能为 null。
- **outputSchema**：可选 JSON Schema 对象，用于约束 structuredContent。
- **annotations**：可选提示（readOnlyHint、destructiveHint、idempotentHint、openWorldHint）；除非服务端本身可信，否则这些提示也不可信。

## JSON Schema 方言

- 没有 `$schema` 字段：默认采用 JSON Schema 2020-12。
- Schema 可以使用 `$schema` 显式声明其他方言。
- SEP-2106 之后，inputSchema 保留 `type: object`，但可以使用其他任意 2020-12 关键字（`oneOf`、`anyOf`、`allOf`、`if`/`then`/`else`、`$defs`）；outputSchema 可使用任意有效 JSON Schema，不要求 `type: object`。
- 无参数工具：推荐使用 `{"type": "object", "additionalProperties": false}`，它只接受空对象。

## $ref 规则

- 绝不要自动解引用解析为网络 URI 的 `$ref`（只有 `#/$defs/Foo` 这类同文档指针适合自动跟随）。
- 如果实现提供主动开启的获取模式，默认必须禁用，并受 allowlist、超时和大小限制约束。
- Schema 因外部 `$ref` 无法解析而验证失败时，应拒绝该 schema，而不是宽松处理。
- 应限制组合关键字（`anyOf`、`oneOf`、`allOf`、`if`/`then`/`else`）和 `$defs` 的深度、子 schema 数量或时间预算，以抵御拒绝服务攻击。

## outputSchema 与 structuredContent

- `structuredContent` 接受任意 JSON 值：对象、数组、字符串、数字、布尔值或 null。
- 存在 outputSchema 时，服务端必须返回符合它的 structuredContent，客户端也应验证。
- 为兼容旧客户端，返回 structuredContent 的工具还应将相同值序列化到 `text` 内容块。

## 工具命名规则

- 长度 1 到 128 个字符，区分大小写。
- 允许字符：`A-Z`、`a-z`、`0-9`、下划线、连字符、点。
- 不允许空格、逗号或其他特殊字符。
- 在单个服务端内唯一；聚合器使用服务端标识符为名称添加前缀，因为不保证 `serverInfo.name` 唯一。

## 两种错误通道

| 情况 | 通道 | 示例 |
|---|---|---|
| 指定的工具不存在于当前服务端 | JSON-RPC 错误 | `-32602` Invalid params |
| 请求本身不符合 CallToolRequest schema | JSON-RPC 错误 | `-32602` Invalid params |
| 参数不符合工具自身 inputSchema | 工具执行错误 | `isError: true` 的结果 |
| Handler 内的业务规则拒绝调用 | 工具执行错误 | `isError: true` 的结果 |

Schema 无效的参数绝不是 `-32602`。该错误码只用于服务端根本无法尝试执行的请求，例如指定从未公布的工具名。模型可以通过调整参数重试来修复的问题，都应放入 `isError: true` 的普通结果，因为只有这一通道能可靠进入模型上下文（SEP-1303）。

## 本领域考试事实

- Architecture and Components 属于 MCPA 考试蓝图的一部分。
- 考试与 MCP 2026-07-28 规范对齐。
- 来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 5、10 节。
