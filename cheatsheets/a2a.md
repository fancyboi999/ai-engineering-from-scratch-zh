---
id: a2a
title: A2A 协议
code: AP
subtitle: A2A 1.0.1 的名片、消息、任务、状态、三种绑定、错误与 0.3 兼容层。事实均来自手册。
hue: 200
sources: manuals/a2a-101
source_hash: d260dfe925ea7fe5
---

## 协议架构
type: architecture
from: manuals/a2a-101/sections/1-1-what-a2a-standardizes.md, manuals/a2a-101/sections/2-1-agentcard-fields.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/5-2-http-json.md, manuals/a2a-101/sections/7-2-a-server.md

```arch
node | planner | 1,1 | 规划器 | 客户端，读取名片 | client
node | card | 1,2 | AgentCard | /.well-known/agent-card.json | client
node | jsonrpc | 2,1 | JSON-RPC | /a2a/jsonrpc | process
node | handler | 3,1 | 处理器 | 校验后交给执行器 | process
node | rest | 3,2 | HTTP+JSON | /a2a/rest | process
node | store | 4,1 | 任务存储 | 各任务的记录 | store
edge | planner | card | GET
edge | planner | jsonrpc | POST
edge | jsonrpc | handler | 方法
edge | rest | handler | 路由
edge | handler | store | 任务
```

## 发送与读取任务
type: task-table
from: manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/capture/out/01-agent-cards.http

| 任务 | 代码 |
|---|---|
| 读取 agent 名片 | `GET /.well-known/agent-card.json HTTP/1.1` |
| 发送一条消息 | 向 `/a2a/jsonrpc` POST `"method": "SendMessage"` |
| 发送协议版本 | `A2A-Version: 1.0` |
| 发送后立即返回 | 在 `configuration` 中设置 `"returnImmediately": true` |
| 打开流 | `"method": "SendStreamingMessage"` |

## HTTP+JSON 命令
type: command-table
from: manuals/a2a-101/sections/5-2-http-json.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/capture/out/16-rest-binding.http

| 命令 | 作用 |
|---|---|
| `POST /a2a/rest/message:send` | 发送消息，响应可以是任务或消息。 |
| `POST /a2a/rest/tasks/<task id>:cancel` | 请求服务端停止尚未终结的任务。 |
| `GET /.well-known/agent-card.json` | 从约定路径读取 agent 名片。 |
| `POST /a2a/rest/tasks/<task id>:cancel` | 任务已经终结时返回任务错误。 |

## 设置与默认值
type: defaults
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-3-get-task-and-list-tasks.md, manuals/a2a-101/sections/2-1-agentcard-fields.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `returnImmediately` | false | 发送调用等待任务进入终结或中断状态 |
| `historyLength` | 未设置 | 由服务端决定返回多少历史记录。`0` 表示不返回历史。 |
| `pageSize` | 50 | `ListTasks` 最大允许 100 |
| `includeArtifacts` | false | 列表结果不包含产物 |
| `A2A-Version` | 1.0 | 每次请求必填，不含补丁版本号 |

## 绑定对比
type: comparison
from: manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/5-2-http-json.md, manuals/a2a-101/sections/5-3-grpc.md, manuals/a2a-101/sections/5-5-errors.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md

| 维度 | JSON-RPC | HTTP+JSON | gRPC |
|---|---|---|---|
| 操作标识 | `method` 字段，例如 `SendMessage` | 路由，例如 `POST /message:send` | `A2AService` 中的 rpc `SendMessage` |
| 发送位置 | 单一 URL，示例中为 `/a2a/jsonrpc` | 每个操作一个路由 | 通过 HTTP/2 与 TLS 访问 `lf.a2a.v1.A2AService` |
| 流帧 | 含完整 JSON-RPC 响应的 `data:` 行 | 只含 `StreamResponse` 的 `data:` 行 | 服务端流式 rpc，消息为 `StreamResponse` |
| `TaskNotFoundError` | HTTP 200，错误码 `-32001` | HTTP 404 | `NOT_FOUND` |
| 版本头 | `A2A-Version` 请求头 | `A2A-Version` 请求头 | `a2a-version` 元数据键 |

## 任务状态
type: concepts
from: manuals/a2a-101/sections/3-4-task-and-task-state.md, manuals/a2a-101/sections/4-2-input-required-and-auth-required.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md

- **活动**：`TASK_STATE_SUBMITTED` 与 `TASK_STATE_WORKING`。agent 仍在处理。
- **中断**：`TASK_STATE_INPUT_REQUIRED` 与 `TASK_STATE_AUTH_REQUIRED`。任务等待你补充输入或授权。
- **终结**：`TASK_STATE_COMPLETED`、`TASK_STATE_FAILED`、`TASK_STATE_CANCELED`、`TASK_STATE_REJECTED`。任务不再改变。
- **TASK_STATE_UNSPECIFIED**：示例不会发送该状态。将其视为错误。

## 逐步完成一个任务
type: flow
from: manuals/a2a-101/sections/1-1-what-a2a-standardizes.md, manuals/a2a-101/sections/3-1-message.md, manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-2-input-required-and-auth-required.md, manuals/a2a-101/sections/4-3-get-task-and-list-tasks.md

1. **客户端**：发送阻塞式 `SendMessage`，使用新的 `messageId`，不带 `taskId`。
2. **服务端**：创建任务，生成 `taskId` 与 `contextId`。
3. **Agent**：停在 `TASK_STATE_INPUT_REQUIRED`，调用返回任务及其问题。
4. **客户端**：用第二次 `SendMessage` 回答，沿用相同的 `taskId` 与 `contextId`。
5. **服务端**：返回同一任务及其产物，状态为 `TASK_STATE_COMPLETED`。
6. **客户端**：用 `taskId` 调用 `GetTask`，再次读取已存储的任务。

## JSON-RPC 请求
type: annotated-code
lang: bash
from: manuals/a2a-101/sections/5-1-json-rpc.md, manuals/a2a-101/sections/3-1-message.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/capture/out/02-message-reply.http

```bash
curl -s http://localhost:41242/a2a/jsonrpc \  # 所有操作使用同一 URL
  -H 'Content-Type: application/json' \  # JSON 请求体
  -H 'A2A-Version: 1.0' \  # 每次请求必填
  -d '{
    "jsonrpc": "2.0",  # 信封版本，始终为 2.0
    "id": 1,  # 响应重复使用该 id
    "method": "SendMessage",  # PascalCase 操作名
    "params": {"message": {
      "messageId": "d95bafc8-f2a4-427b-9cf4-bb99f4bea973",  # 由客户端生成
      "role": "ROLE_USER",  # 客户端始终发送 ROLE_USER
      "parts": [{"text": "What languages can you review?"}]  # 至少包含一个 part
    }}
  }'
```

## 故障排查
type: troubleshooting
from: manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/5-5-errors.md, manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md, manuals/a2a-101/sections/7-4-from-0-3-to-1-0.md, manuals/a2a-101/sections/3-5-context-id.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 每次调用均返回 `-32009` | 缺少 `A2A-Version` 请求头 | 发送 `A2A-Version: 1.0` |
| 使用 `message/send` 时返回 `-32601` | 使用了 0.3 版本的方法名 | 改用 `SendMessage` |
| 已完成任务返回 `-32004` | 任务已终结 | 在同一上下文中新建任务，并传入 `referenceTaskIds` |
| 推送配置调用返回 `-32003` | 名片中没有 `pushNotifications` 能力标志 | 调用前先读取名片 |
| 返回 `-32602`，详情为 `BadRequest` | 缺少 `message.messageId` | 为每条消息生成 `messageId` |
| `-32001` 或 HTTP 404 | ID 不存在、已清理或对调用者不可见 | 核对 ID 后停止重试 |

## 问答
type: qa
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/3-1-message.md, manuals/a2a-101/sections/3-3-artifact-and-chunks.md, manuals/a2a-101/sections/6-1-security-schemes-and-in-task-authorization.md

- **发送调用为什么等待？** `returnImmediately` 默认为 false。调用会等待任务进入终结或中断状态。
- **结果在哪里？** 在 `artifacts` 中。任务的输出不应放在消息里。
- **为什么对其他调用者的任务返回 `TaskNotFoundError`？** 规范禁止泄露该资源是否存在。

## 提示
type: tips
from: manuals/a2a-101/sections/3-1-message.md, manuals/a2a-101/sections/3-2-part.md, manuals/a2a-101/sections/4-3-get-task-and-list-tasks.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md

- 每条新消息生成新的 `messageId`，仅重试时复用。
- 客户端发送 `ROLE_USER`，服务端发送 `ROLE_AGENT`。
- 只检查状态时，将 `historyLength` 设为 0。
- 调用可选功能前，先读取名片并检查能力标志。
