# 订阅流：通知、进度与取消

> 通知永远不会收到回复，因此必须自行说明它属于哪段对话：是打开它的长寿命流，还是仍在等待结果的某个请求。

**类型：** Reference
**语言：** Python
**前置要求：** 第 15 课
**预计时间：** 约 45 分钟

## 学习目标

- 区分通知与请求，并解释接收方为何绝不能回复通知
- 打开 `subscriptions/listen` 流、读取确认消息，并依据 `subscriptionId` 对其承载的通知解复用
- 根据通知所走的通道，而不是凭猜测，区分流通知（列表变化、资源更新）与请求作用域通知（进度、消息）
- 跟踪进度通知的 token 和 total，并解释为何其 progress 值必须持续增加
- 在每种 transport 上取消请求或订阅，并处理取消动作与已经在途消息之间的竞态

## 问题背景

MCP 的大部分交互都是一次请求、一次回复。客户端提问，服务器回答，交互结束。但服务器需要告诉客户端的内容并不都适合这种形态。有些信息持续发生：tool 列表变化、已订阅资源被写入、新增了 prompt。单次回复无法表达“以后继续告诉我”，因为回复会关闭所属请求。另一些信息属于过程状态：一次耗时三十秒的调用可以报告已经完成五分之一，但该报告不是答案，只是计算答案期间的说明。有时请求或订阅已经运行，客户端又改变主意；此时没有 session 可保存取消标志。第 04 课的无状态核心意味着服务器起初就没有为这条连接保留私有空间，因此取消也必须与其他操作一样：作为按 id 寻址、能够独立存在的消息。

MCP 用客户端主动打开的 `subscriptions/listen` 流处理持续事件；用绑定到单个请求的 `notifications/progress`，以及第 15 课介绍的弃用 logging 功能中的 `notifications/message`，处理过程消息。这些都是普通 JSON-RPC 通知：只有 method 和 params，没有 id，永远不会收到回复。它们之间的区别在于由哪个通道承载，以及多个任务同时运行时，接收方如何区分归属。

## 核心概念

回顾第 03 课的 envelope：通知是唯一没有 `id` 的 JSON-RPC 形态。它无法成为某个具体请求的回复，接收方也不得回应。这条规则已经解释了 MCP 为何需要为通知准备两种不同去处。请求的响应通道只在请求打开期间存在，因此进度等只属于单次调用的信息，自然通过该通道传递。单次调用作用域的信息无法表达“tool 列表现在不同了”这类持续变化，因为变化发生时可能没有任何进行中的调用。协议为此需要一条寿命超过任一请求的通道：由独立请求打开并有意保持存活的流。

`subscriptions/listen` 会打开该流。客户端发送普通请求，`params.notifications` 字段是过滤器：`toolsListChanged`、`promptsListChanged` 和 `resourcesListChanged` 是布尔值，`resourceSubscriptions` 是待监视更新的 URI 列表。服务器绝不能发送客户端未请求的通知类型；若完全不支持某种类型，也可以少于客户端请求的范围来授予订阅。

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "subscriptions/listen",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    },
    "notifications": {
      "toolsListChanged": true,
      "resourceSubscriptions": ["file:///project/config.json"]
    }
  }
}
```

服务器在该流上发回的第一条消息，在任何其他消息之前，必须是 `notifications/subscriptions/acknowledged`。它携带服务器实际接受的过滤器子集，并在 `_meta["io.modelcontextprotocol/subscriptionId"]` 中包含打开该流的 `subscriptions/listen` 请求 id，此处为 `7`。这就是完整的解复用方案：后续属于该流的每条消息，包括确认及之后所有通知，都会重复相同的 subscription id。无论客户端是在一条 stdio 通道上打开两个订阅，还是在不同 HTTP 流上打开多个订阅，都只需读取该字段即可区分，因为 transport 连接不是订阅，订阅也不是连接。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {"io.modelcontextprotocol/subscriptionId": 7},
    "notifications": {"toolsListChanged": true, "resourceSubscriptions": ["file:///project/config.json"]}
  }
}
```

确认之后，还有四种通知方法可沿同一条流传递，并始终携带相同标记：`notifications/tools/list_changed`、`notifications/prompts/list_changed`、`notifications/resources/list_changed` 和携带变化 `uri` 的 `notifications/resources/updated`。其他方法都不属于这里。`notifications/progress` 与 `notifications/message` 属于请求作用域：它们对应提出要求的单次调用，不属于订阅，也绝不携带 subscription id。Progress 携带 `progressToken`——由客户端选择，且在客户端当前活动请求中必须唯一——以及每次通知都必须严格递增的 `progress` 数值，即使 total 未知也一样；还可以包含可选的 `total` 和人类可读 `message`。服务器可以按任意节奏发送进度，也可以完全不发，但请求完成后必须停止；双方都应限速，避免淹没通道。第 15 课介绍的弃用 logging 通知 `notifications/message`，只会出现在自身 `_meta` 设置了日志级别的请求上；没有该键时，服务器不得发送。

取消按 transport 区分，而不是按消息形态区分。在 Streamable HTTP 上，关闭某个请求的 SSE 响应流本身就是取消信号；无需发送，也不期待任何通知。在 stdio 上，没有可单独关闭的每请求流，因此客户端发送 `notifications/cancelled`，其中包含要停止的 `requestId` 和可选 `reason`。服务器主动发起 `notifications/cancelled` 只有一种情况：拆除自己将要结束的 `subscriptions/listen` 流。服务器绝不能出于其他目的发送该通知，因此看到来自服务器的此类通知，本身就是刚刚关闭了哪种流的强信号。

订阅也可以优雅结束。正式来说，只要流还活着，`subscriptions/listen` 请求始终是未结束的 JSON-RPC 请求。服务器主动结束订阅时，例如关闭服务期间，应在关闭流前响应原请求，返回 `resultType` 为 complete 的结果，并在 `_meta` 中携带相同 subscription id。客户端由此区分“流已干净结束”和“transport 突然消失”；后者完全没有此类消息。由于取消和消息传递是两个独立并发事件，取消生效前几瞬间生成的通知，可能在接收方停止跟踪该 id 后才到达。双方都应容忍这一点，而不是视为错误：发送方可能已经无可取消，接收方则直接丢弃不再识别的消息，不将其路由到任何地方。

无状态的另一个结果在此直接显现。若 stdio 进程重启，新服务器进程不会记得旧进程打开的订阅；客户端必须用新 id 重新发送 `subscriptions/listen`，重建仍然需要的每条流。没有任何内容恢复，也不会重放重启前的消息，因为服务器没有 session 可保存它们。

```figure
mcpa-16-subscription-stream
```

## 交互实验

图中客户端和服务器并排排列，同一场景自上而下展开。两个 `subscriptions/listen` 请求分别打开订阅；每条流首先用 `_meta` 中自己的 id 确认，后续通知也携带同一标记，因此 tools 与 config 订阅不会和仅 resources 订阅混淆，即使它们共享同一通道。下方，一次独立 `tools/call` 运行自己的请求与回复，中间穿插三次进度更新；这些 progress 通知都没有 subscription id，因为它们属于该调用，而不属于任一流。接近底部时，客户端取消第二项订阅；一条已经在途的更新仍然到达，但会被丢弃而不是交付。先通读图形理解结构，再追踪 `subscription id` 或 `progress token` 中的哪一个字段能帮助代码永不混淆这些通道。

## 实践实验

打开 `code/main.py`。`SubscriptionServer` 把每个打开的 `subscriptions/listen` 请求记录为一个 `Subscription`，其中包含实际授予的通知类型；它只通过 `resource_updated`、`list_changed`、`cancel` 和 `close_gracefully` 生成流消息。一旦订阅已关闭或从未获得对应类型，所有方法都会拒绝发送。`call_long_job` 响应普通 `tools/call`；若请求携带 `progressToken`，它会在最终结果旁返回一小段进度通知，与任何订阅完全分离。`SubscriberClient` 发送 `subscriptions/listen`、记录确认消息，并通过 `receive_stream` 解复用后续所有内容；该方法只接受 subscription id 仍被客户端本地识别的通知。

```bash
python3 code/main.py
```

对照核心概念阅读输出的交互记录。找到两条确认消息，确认每个 subscription id 都等于产生它的 `subscriptions/listen` 请求 id。找到 `run_build` 调用的三条 progress 通知，确认它们都完全不携带 `_meta`。找到靠近末尾的取消动作，以及紧随其后的包裹项：一条发给刚取消订阅的 `resources/updated` 通知。它被标为故意违规，因为客户端必须丢弃，而不是交付。然后尝试为 `promptsListChanged` 打开第三项订阅，对它调用 `list_changed`，观察返回 `None`，因为该服务器从未声明可用于授予该订阅的 prompts capability。

## 交付产物

`outputs/notification-routing-table.md` 是单页参考，把本课每种通知方法映射到所属通道、必填字段和约束规则：哪四种方法只出现在 listen 流上，哪两种属于请求作用域以及原因，还有客户端在每种 transport 上取消内容时应采取什么动作。把它与后续课程的错误码表放在一起；时间紧张、需要解读交互记录中的通知时，这两份参考最实用。

## 验证

在课程目录中运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课结论：确认消息是流上的第一条消息，并以 listen 请求 id 作为 subscription id；确认消息只回显服务器实际授予的通知类型；从未发送未请求或未授予的类型；progress 值严格递增且从不携带 subscription id，真正的流通知则始终携带；取消订阅后，服务器不会再为其生成内容；取消到达时已经在途的消息会被丢弃而不是交付；优雅关闭结果携带 subscription id，重复关闭则不执行任何操作；两个并发订阅可以按 id 正确解复用。仓库 wire 检查器也会依据 2026-07-28 规则验证本课交互记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/16-notifications-and-subscriptions
```

## 综合项目关联

综合项目的长时间运行步骤正需要本课词汇：带进度的调用并不是订阅；后续课程会通过是否存在 `taskId`，把它与 tasks 扩展区分。Listen 流中的通知必须按 subscription id 路由，不能猜测。综合项目场景在中途取消内容时，是否会在线上出现消息，取决于本课的 transport 区分：HTTP 上关闭 SSE 流，stdio 上则发送 `notifications/cancelled` 通知。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Notification | 没有 id、永远不会收到回复的 JSON-RPC 消息 |
| `subscriptions/listen` | 打开长寿命通知流的请求 |
| Subscription id | Listen 请求自身的 id，会在该流承载的每条消息中回显 |
| Stream notification | 只在 listen 流上传递的 `list_changed` 或 `resources/updated` |
| Request scoped notification | 只在所描述请求的响应通道上传递的 `progress` 或 `message` |
| `progressToken` | 客户端选择、在其活动请求中唯一，并把进度更新绑定到单次调用的值 |
| Graceful closure | 在原 listen 请求上返回 `complete` 结果，表示干净结束；不同于 transport 突然中断 |
| `notifications/cancelled` | stdio 取消消息；服务器只能用它拆除自己要结束的 listen 流 |

## 延伸阅读

- [MCP message patterns](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns)，介绍 requests、MRTR 和 subscribe-and-notify
- [Subscriptions](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [Progress](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress)
- [Cancellation](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 8 节
- `phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control`，深入讲解这些消息周围的超时和流量控制
