---
name: task-store-designer
description: 使用当前 Tasks 扩展、无状态请求、显式所有权、轮询、输入更新与取消，设计持久的 MCP 工作。
version: 2.0.0
phase: 13
lesson: 13
tags: [mcp, tasks, extension, durable-state, stateless]
---

针对 `io.modelcontextprotocol/tasks` 扩展设计长时间运行的 MCP 工作。

产出：

1. 适用性决策。解释该操作为何需要 task，而不是同步 `tools/call`。
2. Capability 合约。在 `server/discover` 中展示精确 `supportedVersions`、capabilities、`ttlMs` 和 `cacheScope`，并在逐请求 client capabilities 中展示 Tasks 扩展。若宣告 tools，包含强制、确定性的 `tools/list` descriptors，带有效 object `inputSchema`、server identity metadata 和 cache hints。扩展缺失时用带 `requiredCapabilities` object 的 `-32021`；协议版本不支持时用带精确 `supported`、`requested` 数据的 `-32022`。
3. 创建 transaction。持久化 task，直到 `tasks/get` 能解析它，再返回由 server 决定的 `resultType: "task"`。
4. 状态结构。包含 `taskId`、`status`、`statusMessage`、ISO timestamps、`ttlMs`、`pollIntervalMs`、权威 owner、原始 operation reference、result 或 error、待处理 input requests，以及所有已发出的 input keys。完成 task 的嵌套 `CallToolResult` 必须有 `resultType: "complete"`，并 SHOULD 包含自身 `io.modelcontextprotocol/serverInfo` metadata。
5. 当前方法。定义 `tasks/get`、`tasks/update` 和 `tasks/cancel`。对 Streamable HTTP，每个请求将 `Mcp-Name` 设为 `params.taskId`。不要引入 `tasks/status`、`tasks/result` 或 `tasks/list`。
6. 输入 continuation。分开创建前 MRTR 与创建后 `tasks/get` 加 `tasks/update`。要求输入键在生命周期内唯一，并处理部分响应。
7. 持久性方案。选择 atomic filesystem storage、transactional database 或 shared queue and store，包含 worker leasing 和重启行为。
8. 所有权策略。按 tenant 和 principal 授权每个 task 方法和 subscription。绝不将知道 task id 当作权限。
9. 取消合约。说明 acknowledgement 是协作式的，未必导向 `cancelled`。
10. Notification 选项。通过 POST response SSE stream 的 `subscriptions/listen` 和 `notifications/tasks` 实现，轮询仍是基线。在 acknowledgement 和每个 task notification 中放 `io.modelcontextprotocol/subscriptionId`，其值等于 listen request id。无 id notification 不接收 JSON-RPC response；已接受 HTTP notification 返回无 body 的 `202`。
11. 过期策略。将 `ttlMs` 解释为从创建开始，定义清理行为，避免泄露其他 tenant task 是否存在。
12. 迁移映射。用当前扩展流程替换 client-requested task flags 与已移除实验性方法。

硬性拒绝：

- 在持久读可见性之前返回 task handle。
- 向未宣告扩展的请求返回 `resultType: "task"`。
- 将 `params._meta.task.required`、`tasks/status`、`tasks/result` 或 `tasks/list` 当作当前 API。
- 用 `initialize`、`Mcp-Session-Id`、sticky routing 或隐藏 transport-session state 充当 task store。
- 将 `tasks/cancel` acknowledgement 当作 worker 已停止的证据。
- 在一次 task 生命周期中复用 `inputRequests` 键。
- 将 task 返回给并非其权威 owner 的调用者。
- 通过独立 GET、session SSE 或 `Last-Event-ID` replay 实现 notification 交付。

拒绝规则：

- 对快速确定性查询，除非调用者给出具体持久性要求，否则拒绝 task。
- 当工作须跨进程重启存活时，拒绝仅内存 production store。
- 拒绝无界 result payload；将大型 artifact 外置并返回已授权 resource handle。
- 拒绝没有显式 tenant ownership、filtering、pagination 和 retention policy 的 history endpoint。

输出一页设计，包含生命周期表、wire methods、persistence transaction、ownership rules、input flow、polling cadence、cancellation semantics、subscription option、expiry cleanup、failure model 和 legacy migration map。
