---
id: a2a-webhook-at-least-once
title: 可能触发两次或完全不触发的 Webhook
card: protocols
kind: tradeoff
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [a2a, push-notifications, webhook, idempotency, ssrf]
minutes: 10
lessons: []
manuals: [a2a-101#s-push-notification-configs, a2a-101#s-security-requirements]
practice: []
cheatsheet: [a2a-and-agent-messaging]
related: [protocols/a2a-stream-drop-resubscribe, protocols/retry-is-not-idempotency]
updated: 2026-11-03
---

一次测试运行的持续时间超过了规划者能够保持打开的任何连接，因此你希望使用 webhook。请对比该场景下 webhook、轮询与流式传输的优劣。随后，鉴于 agent 仅承诺对每次投递至少尝试一次，且配置操作会向任何能够调用它们的人返回存储的 webhook 凭据，请列出接收端的职责。

## Short answer

在调用 `SendMessage` 时通过内嵌参数直接注册配置，并设置 `returnImmediately: true`，确保在配置存在前不会漏掉任何事件，然后关闭连接。投递是至少一次的，因此通知可能到达两次，或者在服务中断后根本不出现：接收端应回复 2xx、检查任务 ID、幂等处理，并在采取行动前通过 `GetTask` 读取任务。将接收端检查的密钥放入 `authentication` 中，因为 `token` 没有标准请求头；同时限制谁可以调用这四项配置操作，因为读取会以明文返回凭据。

## Full answer

### 三种等待机制

| 机制 | 是否保持连接 | 如何获知变更 | 客户端重启的代价 |
|---|---|---|---|
| 使用 `GetTask` 轮询 | 否 | 在下一次轮询时 | 无代价，任务已存储 |
| `SendStreamingMessage` 或 `SubscribeToTask` | 是 | 立即获知 | 错失帧；重新订阅以获取快照 |
| webhook | 否 | 投递成功时立即获知 | 错失投递；读取任务 |

Webhook 适合生命周期长于调用方的工作。它将连接问题转移给接收端，并增加了第二个信任边界。

### 接收的内容

每个通知是一个 HTTP POST，其请求体是 HTTP+JSON 形式的单一 `StreamResponse`，没有 JSON-RPC 信封。在记录的运行中，第一个请求体是 `TASK_STATE_WORKING` 的 `statusUpdate`，请求头包含 `Content-Type: application/a2a+json`、`Authorization: Bearer <secret>` 和 `X-A2A-Notification-Token`。各 SDK 在内容类型、token 请求头以及 5 秒或 30 秒超时上存在差异，且都不重试。因此应接受两种内容类型，读取任一 token 请求头，并处理每个 `StreamResponse` 成员，因为参考 SDK 还会推送第一个 `Task`。

### 接收端的职责

1. 返回 2xx 状态以确认收到。
2. 检查任务 ID 是否匹配你期望的任务。
3. 幂等处理。状态更新基于任务 ID 和时间戳可以安全地应用两次；带有 `append: true` 的 `artifactUpdate` 则不能，且不存在投递 ID。
4. 将每个通知视为信号，并在采取行动前通过 `GetTask` 读取任务。
5. 将 `Authorization` 的值与你在 `authentication` 中配置的凭据比对。

### agent 的职责及其失效之处

agent 必须在请求头中附带配置的凭据，并应针对服务端请求伪造（SSRF）验证 URL，拒绝私有网段（如 `10.0.0.0/8` 与 `192.168.0.0/16`）、回环地址和链路本地地址。参考 SDK 的验证器仅在宿主启用时才执行该操作。配置必须保留至任务完成或客户端将其删除，且删除必须是幂等的。

### 权衡

内联注册消耗一个字段，消除了第一个事件与配置之间的缝隙。在 `authentication` 中的密钥需要为每次运行生成独立值，换取了接收端可执行的检查。以明文读回凭据是这四项配置操作的固有特征，因此应将它们的作用域限制在任务所有者。

## Follow-ups

- **Level 3:** 带有 `append: true` 的 `artifactUpdate` 到达了两次。为什么不能应用两次？ Expected: 这会复制部分内容，且没有投递 ID 可用于去重，因此应改为读取任务。
- **Level 3:** 接收端宕机了一分钟。它错过了什么？ Expected: 可能错过所有内容，因为没有 SDK 会重试；当接收端恢复时读取任务。
- **Level 4:** 为什么 agent 必须拒绝私有网段内的 webhook URL？ Expected: agent 会为任务的每个后续事件调用该 URL，因此外部调用方可能会将 agent 的请求对准内部服务。
- **Level 4:** 谁可以调用 `ListTaskPushNotificationConfigs`，为什么？ Expected: 仅任务的所有者，因为回复会原样返回 `credentials` 和 `token`。

## Wrong answers

- "在任务启动后使用创建操作注册 webhook。" 配置存在之前的事件会丢失。内联注册不留缝隙。
- "基于 token 请求头鉴权。" 规范没有为 `token` 提供传输机制，且各 SDK 使用两种请求头名称。将密钥放入 `authentication` 并检查 `Authorization`。
- "在每个通知到达时直接应用它。" 重复和丢失投递都会发生。以存储的任务为准。

## Taught in

[推送通知配置](../../../manuals/a2a-101/sections/4-6-push-notification-configs.md)手册记录了八次投递与 SDK 表格，[安全要求规范](../../../manuals/a2a-101/sections/6-3-security-requirements.md)手册列出了 webhook 规则。
