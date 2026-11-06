---
id: a2a-version-header-missing
title: 忘记版本的客户端引发的两处错误
card: protocols
kind: debug
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-developer-relations-engineer]
rounds: [debugging, coding]
tags: [a2a, versioning, json-rpc, migration, headers]
minutes: 8
lessons: []
manuals: [a2a-101#s-version-and-extension-headers, a2a-101#s-from-0-3-to-1-0]
practice: []
cheatsheet: [a2a, a2a-and-agent-messaging]
related: [protocols/a2a-card-before-the-call, protocols/a2a-rejected-task-loop]
updated: 2026-11-03
---

一个基于早期 A2A 版本编写的客户端调用当前 agent。其发起的首次 `SendMessage` 仅携带了 `Host` 与 `Content-Type` 头，结果收到了带有 JSON-RPC 错误码 `-32009` 的 HTTP 200。其发起的第二次调用发送了 `A2A-Version: 1.0`，将方法命名为 `message/send`，收到错误码 `-32601`。请解释这两次回复，并指出客户端需要的两项改动。

## Short answer

两次回复都是当前服务端读取旧客户端的结果。空的 `A2A-Version` 必须按版本 0.3 处理，而仅提供 1.0 的接口会回复 `VersionNotSupportedError`；记录的运行报告请求为 `0.3 (no header)`，而 `supported: 1.0`。`message/send` 是旧方法名，而 1.0 使用类似 `SendMessage` 的 PascalCase rpc 名称，因此第二次调用是方法未找到。客户端必须在每个请求上发送 `A2A-Version: 1.0` 并切换到 1.0 的名称。

## Full answer

### 版本头

`A2A-Version` 与 `A2A-Extensions` 是服务参数。它们在 JSON-RPC 和 HTTP+JSON 绑定中作为 HTTP 请求头传输，在 gRPC 中作为小写元数据键传输。版本为 `Major.Minor`，请求、响应和卡片不应携带补丁号。服务端承担两项职责：按照该版本的语义处理请求，并在接口不支持时返回 `VersionNotSupportedError`。该错误在 JSON-RPC 中为 `-32009`，在 HTTP+JSON 中为 `400`，在 gRPC 中为 `FAILED_PRECONDITION`。

切勿依赖服务端拒绝缺失的头。在记录的 SDK 对比中，一个服务端完全不读取该头，另一个则将缺失的头接受为 1.0。规范本身的三个示例仍在发送旧值，因此应从卡片的 `protocolVersion` 复制该值，而不是从示例中复制。

### 其他变更内容

| 领域 | 旧版 | 1.0 |
|---|---|---|
| 方法名 | `message/send`、`tasks/get`、`tasks/resubscribe` | `SendMessage`、`GetTask`、`SubscribeToTask` |
| 任务状态与角色 | `"working"`、`"user"` | `TASK_STATE_WORKING`、`ROLE_USER` |
| 分块 | 带 `kind` 的 `TextPart`、`FilePart`、`DataPart` | 单一 `Part`，由其 `text`、`raw`、`url` 或 `data` 成员指定类型 |
| 流的结束 | 最终状态更新上的 `final: true` | 底层绑定关闭流 |
| 卡片端点 | `url`、`preferredTransport`、`additionalInterfaces` | 带有 `url`、`protocolBinding`、`protocolVersion` 的 `supportedInterfaces[]` |
| 错误 | 问题详情（problem details） | 带有 `ErrorInfo` 详情的 `Status` 对象，加上 `-32008` 与 `-32009` |

### 迁移指南遗漏的变更

旧版的 `blocking` 标志默认为 false，因此发送会立即返回。其替代字段 `returnImmediately` 默认值也为 false，现在意味着发送会等待终态或中断状态。迁移后的客户端若在发送后轮询，必须设置 `returnImmediately: true`，否则它会在整个任务期间保持一个请求打开。

### 在重叠期为旧客户端提供服务

每个 SDK 都有一个 0.3 层。参考 SDK 在其路由构建器上接受一个标志，并在卡片上配置第二个带有 `protocolVersion` `0.3` 的 `AgentInterface`，在版本检查前按方法名路由。其他 SDK 则通过头或第二个 URL 路由。当迁移指南命名了 proto 所缺少的字段时，以 proto 为准。

## Follow-ups

- **Level 2:** 为什么发送 `1.0` 而不是发布版本号 `1.0.1`？ Expected: 版本为 `Major.Minor`；请求、响应或卡片中不携带补丁号。
- **Level 3:** 修复后，客户端的发送在每次任务期间都会挂起，为什么？ Expected: 旧版 `blocking` 默认为 false，新版 `returnImmediately` 默认为 false 意为等待；将其设置为 true 并轮询或订阅。
- **Level 3:** 是否每个服务端都会拒绝完全不带版本的请求？ Expected: 不会；一个 SDK 从不读取该头，另一个则接受其缺失，因此客户端必须在每次调用时发送它。
- **Level 4:** 必须在一个季度内同时为新旧客户端提供服务，服务端需要改动什么？ Expected: 开启 SDK 的 0.3 层，在卡片上添加 `protocolVersion` 为 `0.3` 的第二个接口，并按该 SDK 的方式通过头、方法名或 URL 路由。

## Wrong answers

- "HTTP 200 意味着调用成功。" JSON-RPC 错误包含在 200 响应中；在 `result` 之前读取 `error` 成员。
- "改为将版本作为查询参数发送。" 两个 JSON 绑定都需要请求头，参考 SDK 仅读取请求头。
- "方法名不区分大小写。" 方法名是严格区分大小写的 PascalCase rpc 名称，1.0 服务端不识别旧的斜杠形式。

## Taught in

[版本与扩展请求头](../../../manuals/a2a-101/sections/5-4-version-and-extension-headers.md)手册展示了抓取记录中的 `-32009` 错误及各 SDK 行为，[从 0.3 迁移到 1.0](../../../manuals/a2a-101/sections/7-4-from-0-3-to-1-0.md)手册映射了所有重命名字段。
