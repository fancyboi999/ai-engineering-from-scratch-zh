# MCP Tasks 扩展：无状态核心上的持久工作

> MCP 无状态并不代表每个操作都必须在一次请求内完成。官方 Tasks 扩展为长时间工作提供显式、持久的句柄。server 可从 `tools/call` 返回该句柄，任何实例都能回答 `tasks/get`，client 通过 `tasks/update` 提供输入，无需复活协议会话。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 09（传输）、阶段 13 · 11（无状态 MRTR）、阶段 13 · 12（信息征询）
**预计时间：** ~90 分钟

## 学习目标

- 区分无状态协议传输和持久的应用 task 状态。
- 在逐请求 capability 和 `server/discover` 中协商 `io.modelcontextprotocol/tasks` 扩展。
- 仅在持久化创建后，才返回由 server 决定、带 `resultType: "task"` 的 `CreateTaskResult`。
- 用 `tasks/get` 轮询、用 `tasks/update` 提交 task 输入，并用 `tasks/cancel` 请求协作式取消。
- 移除旧有的 `tasks/status`、`tasks/result` 和 `tasks/list` 假设。
- 通过 POST 响应的 SSE 流上 `subscriptions/listen` 订阅可选 task notification。
- 正确建模 task 过期、重启恢复、输入键去重和执行错误。

## 为什么 Tasks 是扩展

Tasks 最初在 2025-11-25 作为实验性核心功能出现。2026 年 7 月的重新设计将其迁入官方 `io.modelcontextprotocol/tasks` 扩展，因此 client 和 server 可选择加入额外生命周期，而不必为所有人扩张核心协议。

尽管 Tasks 当前的官方归属是该扩展，扩展规范仍处于草案层。固定 SDK 支持的扩展版本，运行 conformance 场景，并将 wire adapter 与 worker、存储领域隔离开。

当操作具有下列任一属性时，使用 task：

- 它可能超过普通请求超时。
- 已有 worker queue 或外部 job system 负责执行。
- client 需要在自身重启后恢复。
- 执行中会暂停，等待用户或模型输入。
- 取消和持久结果获取是产品需求。

不要为廉价、确定性的查询创建 task。句柄、持久化、轮询、过期和取消都会带来真实复杂度。

## 无状态核心，有状态应用

MCP 2026-07-28 移除了 `initialize`、`notifications/initialized`、协议会话和 `Mcp-Session-Id`，但这并不禁止有状态产品。

task id 是显式的应用状态：

- server 在返回它之前持久化。
- client 可保存它，并在重启后再次轮询。
- 该 id 可路由到任何由同一持久 store 支持的副本。
- 每个 task 方法都会检查授权。
- 过期和删除由 task 字段决定，而不是传输生命周期。

这与附着于连接的隐藏状态在运行层面完全不同。

将四种生命周期分开：

| 状态 | 生命周期 | 应归属的位置 |
|---|---|---|
| 协议元数据 | 一次请求 | `params._meta`，每次调用重新验证 |
| 传输工作 | 一次 stdio 请求或 HTTP 响应 | 带有有界 deadline 的 in-flight coordinator |
| MRTR continuation | 一个重试序列 | 经过完整性保护的 `requestState`，必要时配合重放控制 |
| 持久 task | 跨请求、副本、重启和重连 | 以已授权 `taskId` 为键的共享应用 store |

将 task 记录放进进程内存，不会让 MCP 变成有状态，只会让应用不可靠。协议仍是无状态的，但后续被路由到另一副本的 `tasks/get` 无法恢复记录。返回句柄前先持久化，再让每个 task 方法在 tenant 与 principal 检查下解析同一条共享记录。

## Capability 协商

client 在每个符合条件的请求上宣告支持：

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {
      "extensions": {
        "io.modelcontextprotocol/tasks": {}
      }
    },
    "io.modelcontextprotocol/clientInfo": {
      "name": "lesson-client",
      "version": "1.0.0"
    }
  }
}
```

server 从 `server/discover` 返回精确的 `supportedVersions`、capabilities、`ttlMs` 和 `cacheScope`，并在 capabilities 中返回同一扩展。因为它声明 tools，也必须实现强制 `tools/list`。该结果返回确定性的 `generate_report` descriptor、有效 object `inputSchema`、`resultType: "complete"`、server identity metadata 和公开 cache hints。

未宣告扩展的 client 调用 task 方法时，返回 `-32021`（Missing Required Client Capability），并将 `data.requiredCapabilities` 设为 `{"extensions":{"io.modelcontextprotocol/tasks":{}}}`。不支持的协议字符串返回 `-32022`，带精确的 `supported`、`requested` 数据；版本缺失或不是 string 时返回 `-32602`。

没有 JSON-RPC `id` 的 envelope 是 notification。接收者可以处理它，但不发 JSON-RPC result 或 error。Streamable HTTP adapter 对已接受 notification 返回无 body 的 `202 Accepted`。

目前仅 `tools/call` 支持 task 增强执行。设计内部 abstraction 时应让未来请求类型不必重写存储。

## 由 server 决定创建 task

旧 client flag `params._meta.task.required` 已移除。client 宣告扩展支持，随后由 server 决定某个 `tools/call` 是否成为 task。

请求：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_report",
    "arguments": {"size": "large"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "task",
    "taskId": "tsk_786512e29e0d",
    "status": "working",
    "statusMessage": "Preparing report outline.",
    "createdAt": "2026-08-21T10:30:00Z",
    "lastUpdatedAt": "2026-08-21T10:30:00Z",
    "ttlMs": 900000,
    "pollIntervalMs": 1000
  }
}
```

server 只有在该 id 的 `tasks/get` 可解析时才能返回句柄。对最终一致性 store，应等到读可见后再响应；否则 client 会收到看似有效的 id，随即得到“not found”。

task 响应是非请求式的，因为 client 没有要求 task 模式；但它并未未经协商：当前请求仍必须宣告扩展。

## Task 的结构

每个 task 都带有：

- `taskId`：稳定、由 server 生成的标识符；
- `status`：`working`、`input_required`、`completed`、`cancelled` 或 `failed`；
- `createdAt` 和 `lastUpdatedAt`：ISO 8601 时间戳；
- `ttlMs`：自创建起的过期时长，或表示没有已宣告上限的 `null`；
- 可选 `pollIntervalMs`：server 当前建议的最小轮询频率；
- 可选 `statusMessage`：面向用户或模型的上下文。

状态特有字段只在相关时出现：

- `input_required` 包含 `inputRequests`。
- `completed` 包含原始请求的 `result` 形状。
- `failed` 包含 JSON-RPC `error` 对象。

client 应遵守 `pollIntervalMs`。server 可以对更激进轮询 rate-limit，也可在 task 生命周期中修改该间隔。

## 用 `tasks/get` 轮询

client 请求当前快照：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/get
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tasks/get",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

`tasks/get` 自身已完成，因此其 result 总带有 `resultType: "complete"`。嵌套 task 仍可能为 `status: "working"` 或 `status: "input_required"`。

这一区别可避免常见 parser bug：

```text
result.resultType = complete    means the tasks/get RPC finished
result.status = working        means the represented job is still running
```

没有 `tasks/result` 调用。task 完成后，下一次 `tasks/get` 响应会在 `result` 下内联原始 `CallToolResult`：

```json
{
  "resultType": "complete",
  "taskId": "tsk_786512e29e0d",
  "status": "completed",
  "createdAt": "2026-08-21T10:30:00Z",
  "lastUpdatedAt": "2026-08-21T10:34:12Z",
  "ttlMs": 900000,
  "result": {
    "resultType": "complete",
    "content": [
      {"type": "text", "text": "Generated large report with approved outline."}
    ],
    "structuredContent": {"size": "large", "approved": true},
    "isError": false,
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "tasks-demo",
        "version": "1.0.0"
      }
    }
  },
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "tasks-demo",
      "version": "1.0.0"
    }
  }
}
```

外层 `resultType` 表示 `tasks/get` RPC 已完成；嵌套 `result.resultType` 表示原始工具调用已完成。该嵌套 discriminator 是必需的。嵌套 `CallToolResult` 也 SHOULD 带自己的 `io.modelcontextprotocol/serverInfo`；本课包含它，而非存储无类型 payload。

没有 `tasks/list`。无会话 server 不能安全推断哪些 task 属于按连接划分的 list。需要 history 的应用应暴露带显式 filters 和 ownership rules 的已授权 domain tool。

## Task 执行期间的输入

task 输入和核心 MRTR 看起来相似，但使用不同 continuation。

### 创建 task 前需要输入

从原始 `tools/call` 返回核心 `resultType: "input_required"`。client 完成它并重试原始调用。仅在这些同步 MRTR 往返完成后才创建 task。

### 创建 task 后需要输入

将 task 设为 `input_required`。`tasks/get` 暴露待处理 `inputRequests`，client 经由 `tasks/update` 发送响应，不重试原始 `tools/call`。

快照：

```json
{
  "resultType": "complete",
  "taskId": "tsk_786512e29e0d",
  "status": "input_required",
  "createdAt": "2026-08-21T10:30:00Z",
  "lastUpdatedAt": "2026-08-21T10:31:00Z",
  "ttlMs": 900000,
  "inputRequests": {
    "approve_outline": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Approve the generated report outline?",
        "requestedSchema": {
          "type": "object",
          "properties": {"approved": {"type": "boolean"}},
          "required": ["approved"]
        }
      }
    }
  }
}
```

更新：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/update
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tasks/update",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "inputResponses": {
      "approve_outline": {
        "action": "accept",
        "content": {"approved": true}
      }
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

成功响应是空 acknowledgement 加 `resultType: "complete"`。状态变更可能最终一致，所以 client 继续轮询或监听。

每个 `inputRequests` 键必须在整个 task 生命周期中唯一。重复 `tasks/get` 快照可展示同一个待处理键；client 对 UI 去重，server 忽略未知、已替换或已完成键的响应。部分更新会让 task 保持 `input_required`，直到所有必填键回答完毕。

## 取消是协作式的

`tasks/cancel` 传递意图，并返回空的 complete acknowledgement。该 acknowledgement 不保证 worker 已停止：工作可能先完成、忽略取消，或稍后才转换状态。

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/cancel
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tasks/cancel",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

对三个 task 方法，`Mcp-Name` 都镜像 `params.taskId`，而非重复 JSON-RPC 方法名。`code/main.py` 在 `make_http_request` 集中实现此规则。

本课 worker 立即响应取消，故重复调用是幂等的。生产 client 仍必须将取消视为协作式，不能从 acknowledgement 推断最终 task status。

不要用 `notifications/cancelled` 取消 task。该 notification 属于请求取消，而非持久 Tasks。

这一区别在 routing boundary 很重要。请求取消针对一项 in-flight JSON-RPC operation 或它的 request-scoped HTTP response。若 `tools/call` 已返回 `resultType: "task"`，该请求已完成，关闭传输无法命名或停止持久 job。`tasks/cancel` 是一项新的已授权 RPC：它携带 `params.taskId`，在 `Mcp-Name` 中镜像 id，解析 task 的 owning backend，记录协作式取消意图并返回 acknowledgement，却不声称 worker 已停止。[第 29 课：MCP 可靠性、取消与流量控制](../../29-mcp-reliability-cancellation-and-flow-control/docs/zh.md) 为两条路径构建 race、timeout、idempotency、backpressure 和 retry 规则。

因此 gateway 必须在不同表中保存 request coordinator 与 task route。响应结束时 request table 可以消失；task route 必须留存到终态和 retention expiry。

## 可选通知

轮询是基线。希望 push updates 的 client 以 task id 发送 `subscriptions/listen`。对 Streamable HTTP，这是 POST，其响应为 request-scoped SSE stream；没有独立 GET event stream，也没有需要保活的协议会话。

server 用 `notifications/subscriptions/acknowledged` 确认接受的 id，随后可经 `notifications/tasks` 发送完整快照。acknowledgement 和每条 task notification 都在 `_meta` 中携带 `io.modelcontextprotocol/subscriptionId`，其值等于 `subscriptions/listen` 请求 id。其他方面，每条 task notification 等价于同一时刻 `tasks/get` 会返回的内容。

client 仍须宣告 Tasks 扩展。它们应重连，并从持久 task id 恢复，而不依赖 event replay 或 `Last-Event-ID`。

## 失败语义

正确使用两层 error。

### 协议错误

无效方法参数或未知 task id 返回 JSON-RPC error，通常为 `-32602`。缺少扩展支持返回 `-32021`，并带 required capability object。

### Task 执行结果

- 带 `isError: true` 的正常 tool result 仍是 `completed` task，因为工具调用产出了已定义结果。
- 延迟执行时的 JSON-RPC error 会使 task 成为 `failed`，并在 `error` 下存该 JSON-RPC error。
- 用户拒绝可以产生 `cancelled`、已完成的拒绝 result，或其他 domain-specific safe outcome。记录你的选择。

## 持久性、过期与所有权

至少持久化 task id、status、timestamps、ttl、poll interval、原始 operation ownership、result 或 error、待处理 input requests 和所有已发出的 input keys。

存储键必须包含或能够解析权威 tenant 与 principal。知道 task id 不得授予访问权。每次 `tasks/get`、`tasks/update`、`tasks/cancel` 和 subscription 都检查 ownership。

`ttlMs` 从创建时计量，且可能变化。task 停止产生可观察更新时，client 可将它作为兜底。server 可以先失败，之后才删除过期 task。不要将它描述为“完成后保留结果这么多毫秒”的承诺。

使用 atomic writes 或 transactions。本课写入临时文件并原子重命名。多副本 service 应使用共享持久 store，以及 worker lease 或等效 concurrency control。

```figure
tp-task-lifecycle
```

## 动手构建

`code/main.py` 实现一个确定性的 task service：

- `server/discover` 返回 `supportedVersions`、cache hints 和 Tasks 扩展。
- `tools/list` 返回确定、可缓存的 `generate_report` descriptor 和有效 input schema。
- `tools/call` 先创建并持久化 task，再返回 `resultType: "task"`。
- 新 service instance 重载同一 task，展示 restart recovery。
- `tasks/get` 返回完整 task snapshots。
- worker 从 `working` 转为 `input_required`。
- `tasks/update` 接收 form response，返回空 complete acknowledgement。
- worker 存储带有自身 `resultType` 与 server identity 的嵌套 `CallToolResult`，再转为 `completed`。
- 本实现中 `tasks/cancel` 是幂等的。
- HTTP builder 为 `tasks/get`、`tasks/update` 和 `tasks/cancel` 将 `Mcp-Name` 设为 `params.taskId`。
- notification helpers 使用 `notifications/subscriptions/acknowledged` 和 `notifications/tasks`，二者均携带 listen request id。
- 无 id notification 不产生 JSON-RPC response。

worker 显式推进，而非在 background thread 中 sleep。这样每次状态转换都确定，也使协议示例与 queue mechanics 分离。

## 实际使用

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/13-mcp-async-tasks/code
python3 main.py
python3 -m unittest discover tests -v
```

预期结果序列：

```text
id=0 resultType=complete status=ack
id=1 resultType=task status=working
id=2 resultType=complete status=working
id=3 resultType=complete status=input_required
id=4 resultType=complete status=ack
id=5 resultType=complete status=completed
```

还应验证 `tasks/status`、`tasks/result` 和 `tasks/list` 在现代 service 中返回 method-not-found。
验证 `tools/list` 是确定性的，并且每个当前 HTTP task 方法都通过 `Mcp-Name` 镜像 task id。

## 拿去用

`outputs/skill-task-store-designer.md` 现在生成感知扩展的设计：capability 协商、先持久化后返回的创建、当前方法、输入更新流、所有权、过期、取消、订阅，以及从已移除实验性方法迁移。

## 练习

1. 添加第二个待处理输入键。发送部分 `tasks/update`，证明 task 保持 `input_required`，直至两个键都回答。
2. 为 store 添加 tenant ownership，拒绝由错误 authenticated principal 提交的有效 task id。
3. 添加有 expiry 的 worker lease。演示两个 service instance 无法并发完成同一 task。
4. 为 `subscriptions/listen` 实现 POST-response SSE adapter。不要添加 GET、`Last-Event-ID` 或 session header。
5. 添加 expiry cleanup。区分 expired task 与 malformed task id，但不泄露跨 tenant 存在性。

## 关键术语

| 术语 | 当前扩展中的含义 |
|------|----------------------------------|
| Tasks extension | 用于持久异步工作的可选 `io.modelcontextprotocol/tasks` capability |
| `CreateTaskResult` | 对符合条件请求，由 server 决定的 `resultType: "task"` 响应 |
| `tasks/get` | 轮询完整当前 task snapshot，包含终态 result 或待处理输入 |
| `tasks/update` | 向 task 待处理 `inputRequests` 提交响应 |
| `tasks/cancel` | 确认协作式取消意图 |
| `input_required` | 表示尚有 client 输入待处理的 task status |
| `pollIntervalMs` | server 建议的再次轮询前最小延迟 |
| `ttlMs` | 自 task 创建起测量的过期时长 |
| Durable-before-return | task id 的句柄发送前必须可解析的规则 |
| `notifications/tasks` | 在已订阅 SSE response 上交付的可选完整 task snapshot |

## 旧版兼容

2025-11-25 的实验性表面使用 client-requested task augmentation、`tasks/status`、`tasks/result` 和可选 `tasks/list`。只在固定版本 legacy adapter 中保留这些名称。当前 client 使用 extension capability，接受 server-directed handles，用 `tasks/get` 轮询，用 `tasks/update` 提供输入，并从 task snapshot 读取最终 result。

## 延伸阅读

- [官方 MCP Tasks 扩展](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
- [MCP 2026-07-28 Multi Round-Trip Requests](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
