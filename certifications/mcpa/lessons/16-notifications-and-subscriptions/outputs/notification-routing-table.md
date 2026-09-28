# 通知路由表

这是一份 MCPA“交互与执行”领域的单页参考，与 MCP 2026-07-28 对齐。

## 两种通道，绝不混用

| 通道 | 打开方式 | 每条消息携带的标记 | 通知方法 |
|---|---|---|---|
| Listen 流 | `subscriptions/listen`（一个请求） | `_meta["io.modelcontextprotocol/subscriptionId"]`，等于 listen 请求 id | `notifications/subscriptions/acknowledged`、`notifications/tools/list_changed`、`notifications/prompts/list_changed`、`notifications/resources/list_changed`、`notifications/resources/updated` |
| 请求自己的响应 | 任意普通请求 | 请求间没有共享标记；`progress` 携带 `progressToken`，`message` 要求当前请求自身设置 `logLevel` | `notifications/progress`、`notifications/message` |

## 打开与关闭订阅

1. 客户端发送带 `notifications` 过滤器的 `subscriptions/listen`：`toolsListChanged`、`promptsListChanged`、`resourcesListChanged`（布尔值），以及 `resourceSubscriptions`（URI 列表）。
2. 服务器在该流上的第一条回复是 `notifications/subscriptions/acknowledged`，其中回显授予的子集和 subscription id；该 id 等于 listen 请求自身的 id。在此之前不得发送其他内容。
3. 流上的每条后续消息都重复相同 subscription id，客户端据此对共享一条通道的多个打开订阅解复用。
4. 订阅可由客户端取消（HTTP 上关闭 SSE 流，stdio 上发送 `notifications/cancelled`）、由服务器主动优雅关闭（在原 listen 请求上返回 `complete` 结果，并在 `_meta` 中携带 subscription id），也可能因 transport 突然中断而结束；突然中断不会携带任何消息。
5. stdio 崩溃或重启后重新连接时，不会保留任何记忆：客户端要用新 id 重新发送 `subscriptions/listen`，重建仍然需要的每条流。

## 进度

- 客户端通过 `_meta.progressToken` 选择接收进度（字符串或整数，在其活动请求中唯一）。
- 每条通知的 `progress` 必须严格递增，即使 `total` 未知；`total` 和 `message` 可选。
- 请求完成后停止通知；双方都应限速，不要淹没通道。
- Progress 从不携带 subscription id，也绝不出现在 listen 流中。

## 按 transport 取消

| Transport | 客户端如何取消 | 服务器发送什么 |
|---|---|---|
| Streamable HTTP | 关闭请求的 SSE 响应流 | 什么也不发送；关闭的流本身就是取消信号 |
| stdio | 发送带 `requestId` 和可选 `reason` 的 `notifications/cancelled` | 普通请求不发送任何内容；服务器仅在拆除自己要结束的 listen 流时发送 `notifications/cancelled` |

## 竞态是正常情况，不是错误

取消生效前生成的消息，可能在接收方停止跟踪后才到达。双方都不把它当作故障：发送方可能发现已无内容可取消，接收方则丢弃不再识别的消息，而不是将其路由到任何地方。

## 考试要点

- Progress 和弃用 logging 的 `message` 通知从不携带 subscription id；订阅通知始终携带。
- 服务器主动发送 `notifications/cancelled` 只有一个用途：拆除自己正在结束的订阅流。绝不能用于其他目的。
- `resources/subscribe` 和 `resources/unsubscribe` 在 2026-07-28 中不存在；通过 `subscriptions/listen` 的 `resourceSubscriptions` 监视资源。
- 关闭 stdio 进程本身不算取消；在 stdio 上，取消始终是显式发送、指明请求的 `notifications/cancelled` 消息。
- 优雅关闭结果与 transport 突然中断是不同信号；只有前者告诉客户端订阅已经干净结束。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 8 节。
