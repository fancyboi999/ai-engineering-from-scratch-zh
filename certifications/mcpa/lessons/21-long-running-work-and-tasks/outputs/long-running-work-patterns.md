# 长时间运行工作模式

这是一份与 MCP 2026-07-28 对齐、面向“Interactions and Execution”领域的单页决策参考。工具可能无法在一次请求内完成时，可将它放在服务器工具描述旁查阅。

## 按以下顺序判断

1. **普通调用。** 工作开销低、结果确定，并能在普通 request timeout 内完成。直接返回 `resultType: "complete"`。大多数工具到此即可。
2. **Multi Round-Trip Request（MRTR）。** 服务器需要客户端提供一个简短答案——elicitation、sampling 调用或 roots 列表——才能完成当前请求。返回 `resultType: "input_required"`，让客户端用新 id、`inputResponses` 和回显的 `requestState` 重试原请求。整个交互仍会在少量往返内结束。
3. **Task。** 工作本身可能超过 request timeout，可能在执行中而非开始前需要输入，适合跨客户端重启存活，或应支持协作式取消。要求客户端在当前请求声明 `io.modelcontextprotocol/tasks`，服务器也在 `server/discover` 中宣告它。
4. **服务器生成的 handle。** 状态并非等待单项操作结束，而是购物车、打开的 session、事务等跨调用应用状态，由模型作为普通参数向前传递（第 04 课的 SEP-2567 模式）。task 的 `taskId` 是这一通用模式的实例，专门用于轮询单个延期工作单元。

## 能力协商检查清单

- 客户端在每个可能需要该能力的请求上，通过 `io.modelcontextprotocol/clientCapabilities.extensions["io.modelcontextprotocol/tasks"]` 声明支持，而不是为整个 session 只声明一次；没有 session 可以记住它。
- 服务器在 `server/discover` 的 `capabilities.extensions` 中声明同一 extension。
- 服务器不得向未声明 extension 的请求返回 `CreateTaskResult`。若仍能在当前请求中完成工作，就返回普通结果；只有不使用 task 就无法处理时，才返回 `-32021`（Missing Required Client Capability），并携带 `data.requiredCapabilities`。客户端若未在当前请求声明 extension，其 `tasks/get`、`tasks/update`、`tasks/cancel` 也返回 `-32021`。
- 服务器将 task 绑定到创建时的认证主体；每次 get、update 或 cancel 都重新做授权检查，高熵 `taskId` 不能作为 bearer 授权凭据。
- 服务器逐请求决定是否创建 task。声明 extension 的客户端必须能为同一工具处理普通结果或 `resultType: "task"`。
- 当前版本只有 `tools/call` 支持 task augmentation。

## CreateTaskResult 字段

| 字段 | 含义 |
|---|---|
| `resultType` | 在该结果上始终为 `"task"` |
| `taskId` | 服务器生成、不可猜测、durable 的标识符 |
| `status` | 创建时通常为 `"working"` |
| `createdAt`、`lastUpdatedAt` | ISO 8601 时间戳 |
| `ttlMs` | 从创建时起计算的过期时长，或以 `null` 表示未声明限制 |
| `pollIntervalMs` | 下次 poll 前建议等待的最短时间 |
| `statusMessage` | 可选的面向人或模型的上下文 |

返回前持久化：服务器交出 `taskId` 前，使用它的 `tasks/get` 必须已经能成功解析。

## 轮询与状态规则

- 客户端既可轮询，也可通过声明 Tasks 扩展能力的 `subscriptions/listen` 请求订阅 `notifications.taskIds`；`notifications/tasks` 提供完整状态快照。
- 在 Streamable HTTP 上，`tasks/get`、`tasks/update`、`tasks/cancel` 的 `Mcp-Name` 标头必须等于 `params.taskId`。
- `tasks/get` 自身始终完成，因此它自己的 `resultType` 为 `"complete"`。内嵌 `status` 字段才携带 `working`、`input_required`、`completed`、`failed` 或 `cancelled`。
- 不存在 `tasks/result`。`completed` snapshot 在 `result` 下内联原始结果；`failed` snapshot 在 `error` 下内联 JSON-RPC 错误。
- 不存在 `tasks/list`。无状态性删除了可安全约束列表 scope 的 session；若 task 历史是产品需求，应改为暴露经过授权和过滤的领域工具。
- 带 `isError: true` 的工具结果仍是 `completed` task；`failed` 只保留给执行期间的 JSON-RPC 协议错误。

## 执行中输入与 MRTR 的区别

| | Task 创建前 | Task 执行期间 |
|---|---|---|
| 机制 | 原请求上的核心 MRTR | Task `input_required` 加 `tasks/update` |
| 客户端动作 | 使用新 id、`inputResponses` 和回显 `requestState` 重试原方法 | 发送携带 `inputResponses` 的 `tasks/update`；不要重试 `tools/call` |
| 查看位置 | `tools/call` 响应本身 | `tasks/get` 响应中的 `inputRequests` map |

`inputRequests` key 在 task 生命周期内唯一。服务器忽略未知、已回答或已被取代 key 的 `inputResponses`。客户端在重复 poll 时先对 key 去重，再向用户展示。

## 取消

- `tasks/cancel` 是协作式的：它发出意图，返回空的 `resultType: "complete"` acknowledgement。它不保证工作已停止，task 仍可能进入其他终态。
- 绝不能对 task 使用 `notifications/cancelled`。该 notification 取消进行中的单次请求；请求返回 `resultType: "task"` 后已经结束，只有 `tasks/cancel` 能触达 durable job。

## 相比 2025-11-25 实验功能的变化

| 2025-11-25（已移除） | 2026-07-28 extension |
|---|---|
| 客户端通过 `_meta` task key 生成 `taskId` | 服务器生成 `taskId`，在 `CreateTaskResult` 中返回 |
| `notifications/tasks/created` 宣布已就绪 | 创建 task 的 result 已携带 handle |
| 阻塞式 `tasks/result` 调用 | 内联到同一次 `tasks/get` 响应中 |
| 分页式 `tasks/list` | 已移除；没有 session 就无法安全地跨调用方限定 scope |
| 初始 `submitted` status | task 从 `working` 开始（若立即执行，也可从更后面的 status 开始） |
| 在连接初始化时协商 `tasks` 能力 | 逐请求声明 `io.modelcontextprotocol/tasks`，不存在连接初始化 |

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 4、14 节。
