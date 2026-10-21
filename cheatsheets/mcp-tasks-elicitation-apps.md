---
id: mcp-tasks-elicitation-apps
title: MCP 任务、信息征询与应用
code: MT
subtitle: 在 MCP 2026-07-28 中使用显式作用域、MRTR 信息征询、持久任务、应用 UI 资源与安全取消。
hue: 280
sources: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation, phases/13-tools-and-protocols/13-mcp-async-tasks, phases/13-tools-and-protocols/14-mcp-apps, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control
source_hash: daa57ae243ddfe61
---

## MRTR 信息征询往返
type: flow
from: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/zh.md, phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code/main.py

1. **客户端**：发送 id 为 1 的 `tools/call`，在 `_meta` 能力中带上 `elicitation: {"form": {}}`。
2. **服务端**：返回 `resultType: "input_required"`，附带 `inputRequests.delete_choice`。
3. **服务端**：对包含主体、方法、`argumentsDigest`、`candidateIds`、nonce 和过期时间的 `requestState` 签名。
4. **宿主**：渲染表单。用户选择 accept、decline 或 cancel。
5. **客户端**：以新 id 2 重试 `tools/call`，携带 `inputResponses` 和相同的 `requestState`。
6. **服务端**：验证状态，重新授权工作区，并再次检查路径包含关系。
7. **服务端**：只认领一次 nonce，执行删除，返回 `resultType: "complete"`。

## 无状态核心上的任务生命周期
type: architecture
from: phases/13-tools-and-protocols/13-mcp-async-tasks/docs/zh.md, phases/13-tools-and-protocols/13-mcp-async-tasks/code/main.py

```arch
node | client | 1,1 | 客户端 | 声明任务扩展 | client
node | call | 2,1 | tools/call | resultType 为 task | process
node | store | 3,1 | 持久存储 | 返回前先持久化 | store
node | worker | 4,1 | 执行者 | advance_worker | process
node | working | 1,2 | working | statusMessage |
node | input | 2,2 | input_required | inputRequests |
node | done | 3,2 | completed | 嵌套结果 |
node | stop | 4,2 | cancelled 或 failed | failed 时带错误 |
edge | client | call | _meta
edge | call | store | taskId
edge | store | worker | 租约
edge | working | input | 执行者
edge | input | working | tasks/update
edge | working | done | 执行者
edge | working | stop | tasks/cancel
```

## 任务方法与信号
type: command-table
from: phases/13-tools-and-protocols/13-mcp-async-tasks/docs/zh.md, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/zh.md

| 命令 | 作用 |
|---|---|
| `tasks/get` | 完整快照。外层 `resultType` 始终为 complete |
| `tasks/update` | 发送 `inputResponses`，返回空确认 |
| `tasks/cancel` | 记录取消意图。确认不代表最终状态 |
| `subscriptions/listen` | POST 请求，响应为任务快照 SSE 流 |
| `notifications/tasks` | 带监听请求 id 的完整快照 |
| `notifications/cancelled` | 仅用于 stdio 请求取消，绝不用于 Task |
| 关闭响应流 | 在 Streamable HTTP 上取消请求 |
| `tasks/status`, `tasks/result`, `tasks/list` | 已移除，返回方法不存在 |

## 驱动持久任务
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/13-mcp-async-tasks/code/main.py

```python
service = TaskService(directory)                # 文件支撑的 TaskStore
created = service.dispatch(make_request(1, "tools/call",
    {"name": "generate_report", "arguments": {"size": "large"}}))
task_id = created["result"]["taskId"]           # resultType 为 task，状态为 working
service = TaskService(directory)                # 新实例重新加载任务
service.advance_worker(task_id)                 # working 转为 input_required
service.dispatch(make_request(3, "tasks/get", {"taskId": task_id}))
service.dispatch(make_request(4, "tasks/update", {"taskId": task_id,
    "inputResponses": {"approve_outline": {"action": "accept",
                                           "content": {"approved": True}}}}))
service.advance_worker(task_id)                 # 阶段 2 转为 completed
body, headers = make_http_request(5, "tasks/get", {"taskId": task_id})
headers["Mcp-Name"]                             # 等于 params.taskId
```

## 幂等、缓冲与重连
type: annotated-code
lang: python
from: phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/code/main.py

```python
ledger = MutationLedger(Path(directory) / "mutations.sqlite3")
ledger.charge("acct-7", 1200, rpc_id=41, idempotency_key="checkout-7")
ledger.charge("acct-7", 1200, rpc_id=42, idempotency_key="checkout-7")
ledger.executions                               # 只执行一次，凭据相同
classify_retry(side_effect=True, idempotency_key=None)  # 不安全
buffer = BoundedSseBuffer(3)                    # 容量至少为二
buffer.push_final(response)                     # 最终响应绝不丢弃
reconnect_plan(previous_subscription_id, affected_resources,
               unsafe_mutation_was_in_flight=True)  # sendLastEventId 为 False
retry_delay_ms("<client>", attempt)             # 上限为 8000 ms
```

## 信息征询的回答
type: comparison
from: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/zh.md, phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code/main.py

| 比较项 | accept | decline | cancel |
|---|---|---|---|
| 含义 | 用户已提交 | 用户拒绝 | 用户关闭表单 |
| 服务端动作 | 校验内容并继续 | 返回拒绝的完成结果 | 安全停止 |
| Nonce | 删除时消耗 | 消耗，但不删除 | 不消耗 |
| 稍后重试 | 不可 | 不可 | 可以，直到过期 |
| 结果 | `deleted: True` | `deleted: False` | `deleted: False` |

## 数值与默认值
type: defaults
from: phases/13-tools-and-protocols/13-mcp-async-tasks/code/main.py, phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code/main.py, phases/13-tools-and-protocols/14-mcp-apps/code/main.py, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 协议版本 | 2026-07-28 | 每次请求都放在 `_meta` 中 |
| 任务 `ttl_ms` | 900_000 | 从创建时开始计算 |
| 任务 `poll_interval_ms` | 1_000 | 建议的最短轮询间隔 |
| `server/discover` `ttlMs` | 300_000 | `cacheScope` 为 public |
| `tools/list` `ttlMs` | 60_000 | 按工具名称排序 |
| `requestState` 过期时间 | 300 | 表单发出后的秒数 |
| `ReplayStore` `max_entries` | 1_000 | 存储满时返回 -32023 |
| 退避上限 | 8_000 | 从 250 ms 开始，每次尝试乘 2 |

## 错误与故障
type: troubleshooting
from: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/zh.md, phases/13-tools-and-protocols/13-mcp-async-tasks/docs/zh.md, phases/13-tools-and-protocols/14-mcp-apps/docs/zh.md, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `-32602` | 协议版本缺失或不是字符串 | 在 `_meta` 中发送版本 |
| `-32022` | 不支持该版本字符串 | 读取 `supported` 和 `requested` 数据 |
| `-32021` | 缺少 form、tasks 或 ui 能力 | 在本次请求中声明 |
| `-32020` | 请求头与正文不一致 | 对齐 `Mcp-Method` 和 `Mcp-Name` |
| 任务标识返回未找到 | 存储尚无法读取就发送了句柄 | 返回前先持久化 |
| 变更执行两次 | 用新的 JSON-RPC id 去重 | 添加持久幂等键 |
| 挂起工作永不结束 | 进度重置所有截止时间 | 保留绝对最大超时 |
| UI 显示已停止，执行者仍运行 | 把取消确认当成终态 | 轮询 Task 直到终态 |

## 应用规则
type: concepts
from: phases/13-tools-and-protocols/14-mcp-apps/docs/zh.md, phases/13-tools-and-protocols/14-mcp-apps/code/main.py

- **扩展**：`io.modelcontextprotocol/ui`，双方每次请求都要声明。
- **绑定**：调用前，在 `tools/list` 的工具上设置 `_meta.ui.resourceUri`。
- **资源**：`ui://notes/timeline.html`，MIME 为 `text/html;profile=mcp-app`。
- **CSP**：`connectDomains`、`resourceDomains`、`frameDomains`、`baseUriDomains` 默认为空。
- **桥接**：视图先发送 `ui/initialize`，宿主回答后再发送 `ui/notifications/initialized`。
- **回退**：没有 ui 能力时，返回不带 `_meta.ui` 的工具和文本结果。
- **缓存键**：`ui://` URI、服务端身份与版本、内容摘要；私有资源还包含主体。

## 作用域规则
type: tips
from: phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/docs/zh.md

- Roots 已弃用。将作用域放入 `workspaceUri` 参数或资源 URI。
- 执行三层控制：授权、路径包含关系和操作系统沙箱。
- 先规范化 URI，再比较路径组成部分，不比较字符串前缀。
- 表单模式绝不收集密码、API 密钥、token 或支付数据。
- URL 模式的 `accept` 表示用户同意打开 URL，不证明操作完成。
- 空的 `"elicitation": {}` 表示支持表单；仅支持 URL 不算。

## 问答
type: qa
from: phases/13-tools-and-protocols/13-mcp-async-tasks/docs/zh.md, phases/13-tools-and-protocols/14-mcp-apps/docs/zh.md, phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/docs/zh.md

- **谁决定调用成为 Task？** 服务端。客户端只声明扩展。
- **最终任务结果在哪里？** 在下一次 `tasks/get` 快照的 `result` 下。
- **输入发生在任务创建前还是创建后？** 创建前用 MRTR 重试，创建后用 `tasks/update`。
- **`ui/initialize` 会启动 MCP 会话吗？** 不会。它只是 iframe 桥接握手。
- **工具结果为 `isError: true`，Task 就失败了吗？** 不是。Task 状态为 `completed`。
- **断流后用 `Last-Event-ID` 恢复吗？** 不。新建监听请求并重新获取。
