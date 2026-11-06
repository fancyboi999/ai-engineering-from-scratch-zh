---
id: cancel-signal-per-transport
title: 看似相同的三类取消机制
card: protocols
kind: concept
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [ml-depth, coding]
tags: [mcp, cancellation, stdio, streamable-http, tasks]
minutes: 8
lessons: [phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control]
manuals: []
practice: []
cheatsheet: [mcp-client-transports, mcp-tasks-elicitation-apps]
related: [protocols/retry-is-not-idempotency]
updated: 2026-11-03
---

某客户端库暴露了一个统一的 `cancel(request)` 方法，并在 stdio 与 Streamable HTTP 下保持相同的行为：针对请求 ID 写入或通过 POST 发送 `notifications/cancelled` 通知。在 HTTP 下，服务端仍在继续执行工作，有时在取消后仍发送响应。第二个方法 `cancelTask` 返回成功，UI 显示“已停止”，而 worker 仍在继续运行。这两个方法有什么问题？

## Short answer

取消机制取决于传输协议，而持久化任务又是第三回事。在 stdio 上，客户端发送带有请求 ID 的 `notifications/cancelled` 且不接收响应。在 Streamable HTTP 上，取消信号是关闭该请求的响应流，而通过 POST 发送取消通知是错误的信号。`tasks/cancel` 确认了对持久化任务的意图，该任务可能保持 `working` 直到 worker 检查点发现该标志，因此 UI 必须轮询直到出现终态。

## Full answer

### 三种机制

| 机制 | 目标 | 信号 | 成功代表什么 |
|---|---|---|---|
| stdio 上的请求取消 | 单个进行中的 RPC | `notifications/cancelled` | 客户端放弃了请求；服务端若可行应停止 |
| HTTP 上的请求取消 | 单个进行中的响应流 | 关闭该流 | 同上 |
| `tasks/cancel` | 单个持久化 Task | 普通 MCP 请求 | 服务端确认了该意图 |

两种传输协议下的意图相同：客户端不再需要该结果。协议传输的信号之所以不同，是因为 stdio 依靠单一通道共享所有内容，而每个 HTTP 请求拥有自己的响应流或 SSE 流。

### 取消是一场竞态

两种顺序均有效。如果取消先到达，服务端将请求标记为已取消，并在 worker 完成时不再发送响应。如果 worker 先提交，服务端发送响应并忽略滞后的通知，而客户端忽略已放弃请求的滞后响应。任何一方都无法证明对方先看到了哪个事件。畸形、未知以及已完成的取消均被忽略，因为将这些竞态转为错误会引发更多竞态。

### 服务端可以发送什么

服务端不使用 `notifications/cancelled` 来取消任意客户端调用。在 stdio 上，服务端发送取消仅保留用于终止 `subscriptions/listen` 请求。进度通知必须递增，并在完成或取消后停止。

### 为什么任务的生命周期长于连接

创建 Task 的初衷就是使其生命周期长于单次请求和单次连接。不要在 HTTP 连接关闭时清除任务状态，也不要将 `tasks/cancel` 的结果视为 worker 已停止的证据。对 Task 保持轮询直到终态。

### 两种超时，而不是一种

取消通常来自超时。使用进度可以重置的空闲超时，以及从请求开始起算且任何机制都不能重置的最大超时。流上的保活注释不是进度。

## Follow-ups

- **Level 2:** 服务端收到了针对已完成请求的取消。它是否返回错误？ Expected: 否，它忽略该通知；通知在任何情况下都不接收响应。
- **Level 3:** Worker 恰在取消到达服务端之前提交了变更。双方各自怎么做？ Expected: 服务端已发送响应并忽略滞后通知；客户端忽略滞后响应，由幂等契约决定重试是否安全。
- **Level 3:** 服务端自身何时可以发送 `notifications/cancelled`？ Expected: 仅在 stdio 上，用于终止 `subscriptions/listen` 请求；绝不用于普通客户端调用。
- **Level 4:** `subscriptions/listen` 流在任务中途断开。其背后的 Task 会改变状态吗？ Expected: 否；客户端使用新 ID 打开新的 listen 请求并重新获取 Task，持久化状态不受断流影响。

## Wrong answers

- "为了对称，在 HTTP 上也 POST `notifications/cancelled`。" 每个 HTTP 请求拥有其响应流，关闭它才是匹配请求生命周期的信号。
- "成功的 `tasks/cancel` 意味着 worker 已停止。" 它确认了请求。任务在检查点前可以保持 `working`，且工作可能先完成。
- "针对未知请求 ID 的取消返回错误。" 未知、畸形和已完成的取消按设计应被忽略。

## Taught in

[可靠性课程](../../../phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control/)阐述了这三种机制以及竞态的两种顺序。
