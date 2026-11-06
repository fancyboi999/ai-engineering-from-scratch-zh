---
id: a2a-card-before-the-call
title: A2A 客户端发第一条消息前要读什么
card: protocols
kind: concept
level: 1
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, system-design]
tags: [a2a, agent-card, discovery, capabilities]
minutes: 7
lessons: []
manuals: [a2a-101#s-agentcard-fields, a2a-101#s-discovery-and-supported-interfaces]
practice: []
cheatsheet: [a2a]
related: [protocols/a2a-rejected-task-loop]
updated: 2026-11-03
---

你的 planner agent 要把一次测试运行委派给一个远程 agent，而它只知道对方的主机和端口。说明它第一步获取什么，怎么决定调用哪个端点，以及在请求该 agent 返回流之前要检查什么。

## Short answer

它先用一个普通的 GET 请求 `/.well-known/agent-card.json`，拿到 agent card。它从 `supportedInterfaces` 里选出第一个自己支持其绑定和版本的条目，调用这个条目的 URL。调用 `SendStreamingMessage` 之前，它先读 `capabilities.streaming`，因为该标志缺失或为 false 时，服务器必须用 `UnsupportedOperationError` 拒绝这次调用。

## Full answer

### 一次 GET，一份文档

规范列出了拿到卡片的三种途径：well-known URI、注册中心或目录、直接配置。它只把第一种标准化了。配置里写着主机的 planner，会从 well-known 路径获取每一张卡片。

proto 给 `AgentCard` 定义了 14 个字段，其中八个是 REQUIRED：`name`、`description`、`supportedInterfaces`、`version`、`capabilities`、`defaultInputModes`、`defaultOutputModes` 和 `skills`。其中四个是列表，必填的列表至少要有一个元素。缺了任何一个，就拒绝这张卡片。

### 端点来自接口列表

`supportedInterfaces` 的每个条目都有 REQUIRED 的 `url`、`protocolBinding` 和 `protocolVersion`。这个列表是有序的，客户端选第一个自己支持的条目。支持，指客户端实现了该条目的绑定和版本。客户端还要把该条目的 `tenant` 复制到每个请求里；条目没有这个字段时就省略。

### 标志决定有哪些操作

| `capabilities` 中的标志 | 允许的操作 | 缺失或为 `false` 时的错误 |
|---|---|---|
| `streaming` | `SendStreamingMessage`、`SubscribeToTask` | `UnsupportedOperationError`，`-32004` |
| `pushNotifications` | 四个推送配置操作 | `PushNotificationNotSupportedError`，`-32003` |
| `extendedAgentCard` | `GetExtendedAgentCard` | `UnsupportedOperationError`，`-32004` |

标志缺失等同于 `false`。在录制的错误运行里，向一个没有这个标志的 agent 发送推送配置，即使任务 id 根本不存在，返回的也是 `-32003`。卡片早就给出了答案。

### 像普通文档一样缓存

卡片很少变化。服务器应该发送带 `max-age` 的 `Cache-Control` 和一个 `ETag`。客户端遵守它们，并用 `If-None-Match` 重新验证。

## Follow-ups

- **Level 1:** 哪个字段说明 agent 能做什么工作？ Expected: `skills`，每项都有 `id`、`name`、`description` 和至少一个标签；按技能和媒体模式挑选 agent。
- **Level 2:** 卡片第一项是 gRPC，第二项是 JSON-RPC，而你的客户端只会 JSON-RPC。你调用哪个 URL？ Expected: JSON-RPC 那个，因为规则是选第一个你支持的条目。
- **Level 2:** 媒体类型怎么传达给 agent？ Expected: 卡片的 `defaultInputModes` 和 `defaultOutputModes`，技能自己的 `inputModes` 和 `outputModes`，以及客户端发送的每个 part 上的 `mediaType`。
- **Level 3:** 你持有一个 bearer token，卡片设置了 `extendedAgentCard`。有什么变化？ Expected: 用声明的凭据调用 `GetExtendedAgentCard`，在该会话中用这份更完整的卡片替代缓存的公开卡片，或者用到卡片的 `version` 变化为止。

## Wrong answers

- "读卡片顶层的 `url` 字段。" 当前版本已把端点移进 `supportedInterfaces`，顶层没有 `url`。
- "先试着请求流，失败了再回退。" 标志已经提前回答了这个问题。失败的调用白白浪费一次往返。
- "把技能 id 放进消息里，让服务器运行那个技能。" `SendMessageRequest` 和 `Message` 都没有指定技能的字段。技能列表只是描述这个 agent。

## Taught in

[AgentCard 字段一节](../../../manuals/a2a-101/sections/2-1-agentcard-fields.md)列出了各字段，[发现与 supportedInterfaces 一节](../../../manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md)给出了接口选择规则和标志表。
