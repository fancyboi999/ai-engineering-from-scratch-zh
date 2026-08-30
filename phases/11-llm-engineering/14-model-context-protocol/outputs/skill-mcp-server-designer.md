---
name: mcp-server-designer
description: 设计无状态的 MCP 2026-07-28 server，包含明确的发现、状态、传输与安全契约。
version: 2.0.0
phase: 11
lesson: 14
tags: [llm-engineering, mcp, stateless, tool-use]
---

给定一个领域（内部 API、数据库、文件源）以及将挂载该 server 的 host，输出：

1. 原语映射。哪些能力成为 `tools`（动作），哪些成为 `resources`（只读数据），哪些成为 `prompts`（由用户调用的模板）。每个原语一行。
2. 发现契约。起草 `server/discover`，包含实现支持的精确版本、能力、server 身份、说明、`ttlMs` 和 `cacheScope`。
3. 请求契约。要求每个请求的 `params._meta` 都带有字符串协议版本和对象形式的 client 能力。建议提供 client 身份。必需元数据缺失或类型错误时返回 Invalid Params（`-32602`）。仅当所提供的版本字符串未被 server 实现时，返回带有 `data.supported` 和 `data.requested` 的 `UnsupportedProtocolVersionError`（`-32022`）。
4. 结果契约。为每个适用结果加入 `resultType`、server 身份元数据、确定性的列表顺序和缓存策略。
5. MRTR 方案。仅从 `tools/call`、`resources/read` 或 `prompts/get` 使用 `input_required`。至少包含 `inputRequests` 或不透明的 `requestState` 之一；用新的 JSON-RPC ID 重试原方法，在请求时传入相应的 input response，并在存在时原样传入 state 值。
6. 状态方案。为每个多调用工作流定义一个由 server 签发的不透明 handle，并将它作为普通 tool 参数传递。不要把状态藏在连接或协议 session 后面。
7. 传输与授权方案。选择 stdio 或 2026-07-28 Streamable HTTP POST endpoint。对 HTTP，定义 Origin 验证和按请求授权。POST 请求必须带有 `MCP-Protocol-Version`，JSON-RPC 请求必须带有 `Mcp-Method`，仅 `tools/call`、`resources/read` 和 `prompts/get` 需要 `Mcp-Name`。已接受的 notification POST 返回没有 body 的 HTTP 202。
8. Schema 草稿。为每个 tool 参数编写 JSON Schema；描述需适合模型选择 tool，并为不可信输入设定明确边界。
9. 破坏性动作清单。用 `destructiveHint: true` 标记每个会修改状态的 tool，并要求人工审批。
10. 验证方案。覆盖不会产生 JSON-RPC 响应的 notification、格式错误的 envelope 和请求 ID、元数据拒绝、发现、确定性的列表、版本不匹配、缓存字段、header 与 body 不匹配、授权、审批，以及一个 prompt injection 案例。

拒绝将 `initialize`、`notifications/initialized`、`Mcp-Session-Id`、独立 HTTP GET、HTTP DELETE 或 `Last-Event-ID` 用作现代路径的设计。只允许在清晰隔离的、适配 2025-11-25 及之前协议版本的 adapter 中使用这些机制。不要在新实现中加入已废弃的 Roots、Sampling 或 Logging；兼容支持必须加以标注，Roots 或 Sampling 输入必须使用 MRTR。拒绝交付任何没有授权、验证和审批路径却会写入磁盘或调用外部 API 的 server。
