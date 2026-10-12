# 按绑定列出的操作

> 每种 A2A 操作在 JSON-RPC 和 gRPC 有同一名称，在 HTTP+JSON 有一条路由，有请求与响应消息以及固定错误列表。

proto 在同一 gRPC 服务 `A2AService` 定义十一种操作，JSON-RPC 的 `method` 与 rpc 同名。路由是 proto 的 `google.api.http` 模板。首列链接到介绍各操作的章节。 {{proto A2AService}} {{spec §5.3}}

| JSON-RPC 方法 | gRPC rpc | HTTP+JSON 路由 | 请求输入、响应输出 |
|---|---|---|---|
| [SendMessage](#s-send-message) | `SendMessage` | `POST /message:send` | `SendMessageRequest`, `SendMessageResponse` |
| [SendStreamingMessage](#s-streaming-and-subscribe-to-task) | `SendStreamingMessage` | `POST /message:stream` | `SendMessageRequest`, `StreamResponse` 流 |
| [GetTask](#s-get-task-and-list-tasks) | `GetTask` | `GET /tasks/{id=*}` | `GetTaskRequest`, `Task` |
| [ListTasks](#s-get-task-and-list-tasks) | `ListTasks` | `GET /tasks` | `ListTasksRequest`, `ListTasksResponse` |
| [CancelTask](#s-cancel-task-and-terminal-states) | `CancelTask` | `POST /tasks/{id=*}:cancel` | `CancelTaskRequest`, `Task` |
| [SubscribeToTask](#s-streaming-and-subscribe-to-task) | `SubscribeToTask` | `GET /tasks/{id=*}:subscribe` 在 proto 中为此，§5.3 和 §11.3.2 为 `POST`，因此像参考 SDK 一样接受两种动词（[冲突 D1](#s-ref-sources-the-conflict-register)） {{sdk src/a2a/server/routes/rest_routes.py}} | `SubscribeToTaskRequest`, `StreamResponse` 流 |
| [CreateTaskPushNotificationConfig](#s-push-notification-configs) | `CreateTaskPushNotificationConfig` | `POST /tasks/{task_id=*}/pushNotificationConfigs` | 输入输出均为 `TaskPushNotificationConfig`，无请求包装（[冲突 D5](#s-ref-sources-the-conflict-register)） |
| [GetTaskPushNotificationConfig](#s-push-notification-configs) | `GetTaskPushNotificationConfig` | `GET /tasks/{task_id=*}/pushNotificationConfigs/{id=*}` | `GetTaskPushNotificationConfigRequest`, `TaskPushNotificationConfig` |
| [ListTaskPushNotificationConfigs](#s-push-notification-configs) | `ListTaskPushNotificationConfigs` | `GET /tasks/{task_id=*}/pushNotificationConfigs` | `ListTaskPushNotificationConfigsRequest`, `ListTaskPushNotificationConfigsResponse` |
| [DeleteTaskPushNotificationConfig](#s-push-notification-configs) | `DeleteTaskPushNotificationConfig` | `DELETE /tasks/{task_id=*}/pushNotificationConfigs/{id=*}` | `DeleteTaskPushNotificationConfigRequest`, `google.protobuf.Empty` |
| [GetExtendedAgentCard](#s-extended-cards-and-signatures) | `GetExtendedAgentCard` | `GET /extendedAgentCard` | `GetExtendedAgentCardRequest`, `AgentCard` |

每个 rpc 的 `additional_bindings` 有第二条路由，在相同路径前加 `/{tenant}`，如 `POST /{tenant}/message:send`。§5.3、§11.3、§11.5 正文只列普通路由（[差异 N12](#s-ref-sources-discrepancies-found-after-the-register)）。JSON-RPC 的值放在 `params.tenant`，gRPC 放在请求 `tenant` 字段。任意绑定都必须匹配选中接口已设置的 `tenant`，见 [HTTP+JSON](#s-http-json)。 {{proto A2AService}} {{proto SendMessageRequest}}

`SendMessageResponse` 包含一个 `task` 或一个 `message`。发送要求 `message`，获取、取消、订阅要求任务 `id`。获取、列出、删除配置要求 `taskId`，获取和删除还要求 `id`，创建要求 `url`。JSON-RPC 以一个包装 POST 每次调用，`method` 指定名称，`params` 携带请求消息。 {{spec §9.3}}

各操作可抛出 §3.1 为其列出的错误。末列是卡片上必须为 `true` 的能力。为 `false` 或缺失时，推送配置方法以 `PushNotificationNotSupportedError` 失败，其余以 `UnsupportedOperationError` 失败。 {{spec §3.3.4}}

| 方法 | 其他 A2A 错误 | 能力标志 |
|---|---|---|
| SendMessage | `ContentTypeNotSupportedError`、`TaskNotFoundError`，终态任务为 `UnsupportedOperationError` | 无 |
| SendStreamingMessage | 与 `SendMessage` 相同的三种 | streaming |
| GetTask | `TaskNotFoundError` | 无 |
| ListTasks | 标准协议错误之外无其他错误 | 无 |
| CancelTask | `TaskNotCancelableError`, `TaskNotFoundError` | 无 |
| SubscribeToTask | `TaskNotFoundError`，终态任务为 `UnsupportedOperationError` | streaming |
| 四种推送配置方法 | `TaskNotFoundError`，`GetTaskPushNotificationConfig` 在配置缺失时也返回它 | pushNotifications |
| GetExtendedAgentCard | 标志开启但未配置扩展卡片时为 `ExtendedAgentCardNotConfiguredError` | extendedAgentCard |

任意操作还可因 `VersionNotSupportedError`、`ExtensionSupportRequiredError`、认证或授权错误而失败。[错误](#s-ref-errors)给出各绑定代码，[gRPC 绑定](#s-grpc)展示带完整注解的 rpc。 {{spec §3.6.2}} {{spec §3.3.2}}

Sources: proto `A2AService` with its `google.api.http` routes and `additional_bindings`, and the request and response messages from `SendMessageRequest` to `ListTaskPushNotificationConfigsResponse` (research/sources/a2a.proto); spec §3.1.1 to §3.1.11, §3.3.2, §3.3.4, §3.6.2, §5.3, §9.3, §11.3, §11.3.2, §11.5 (research/sources/specification.md); research/brief-spec.md sections 2.7, 2.8, 3.0, 7.5 and 12.2; research/migration.md section D.6 (N12); sdk src/a2a/server/routes/rest_routes.py at v1.2.2
