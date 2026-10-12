# 对象与字段

> proto 定义请求、响应、流帧中的所有对象，每个字段有一个 lowerCamelCase JSON 名、一个类型和存在规则。

粗体行是 proto 消息，即数据对象的规范来源，下方各行是其字段。字段使用 lowerCamelCase JSON 名，但 §5.5 示例转换 `push_notification_config`，proto 实际名称为 `task_push_notification_config`（[冲突 D22](#s-ref-sources-the-conflict-register)）。 {{spec §1.4}} {{spec §5.5}}

必需列中的“是”标记 `REQUIRED` 字段，有效消息中必须存在并赋值。必需数组含至少一个元素，但空 `tasks` 列表合法（[冲突 D19](#s-ref-sources-the-conflict-register)）。类型以 `optional` 开头时使用 proto 关键字，记录字段是否设置。 {{spec §5.7}}

表格省略部分可选字段。`Task`、`Message`、`Part`、`Artifact`、两种流事件都有 `metadata` 对象，`Message`、`Artifact` 还带 URI 列表 `extensions`。part 可指定 `filename`，产物可有 `description`，技能可有 `examples`，卡片可有 `documentationUrl` 和 `iconUrl`。从 `SendMessageRequest` 到 `GetExtendedAgentCardRequest` 的每种请求都有可选 `tenant` 字符串，必须匹配选中接口已设置的 `tenant`。[按绑定列出的操作](#s-ref-operations-by-binding)列出请求和响应消息。 {{proto SendMessageRequest}}

## 任务与消息对象 {#s-ref-objects-and-fields-task-and-message-objects}

[Message](#s-message)、[Part](#s-part)、[Artifact 与分块](#s-artifact-and-chunks)、[Task、TaskStatus 和 TaskState](#s-task-and-task-state)、[SendMessage](#s-send-message)、[推送通知配置](#s-push-notification-configs)定义这些对象。

| 字段 | 类型 | 必需 | 含义 |
|---|---|---| --- |
| **Task** | | | 服务器创建的工作单元 |
| id | string | 是 | 服务器生成 |
| contextId | string | | 上下文。两种流事件均要求此字段。 |
| status | TaskStatus | 是 | 状态、状态消息、时间 |
| artifacts | repeated Artifact | | 输出。`ListTasks` 需要 `includeArtifacts` 才包含它们。 |
| history | repeated Message | | 保存的消息，以 `historyLength` 限制 |
| **TaskStatus** | | | 任务状态 |
| state | TaskState | 是 | [任务状态](#s-ref-task-states)中的值 |
| message | Message | | agent 的说明，如问题 |
| timestamp | google.protobuf.Timestamp | | 记录时间，ISO 8601 格式、UTC |
| **Message** | | | 一轮对话 |
| messageId | string | 是 | 发送者生成，agent 可据此去重 |
| contextId | string | | 上下文。每条服务器消息都包含它。 |
| taskId | string | | 任务。客户端值指定与 `contextId` 匹配的现有任务。 |
| role | Role | 是 | 客户端为 `ROLE_USER`，服务器为 `ROLE_AGENT` |
| parts | repeated Part | 是 | 内容，至少一个 part |
| referenceTaskIds | repeated string | | 消息引用的其他任务 |
| **Part** | | | 恰好包含 `text`、`raw`、`url`、`data` 之一 |
| text | string | | 文本内容 |
| raw | bytes | | 文件内容，JSON 中为 base64 |
| url | string | | 指向文件内容的 URL |
| data | google.protobuf.Value | | 任意 JSON 值 |
| mediaType | string | | 所有 part 类型可用的媒体类型 |
| **Artifact** | | | 任务的一份输出 |
| artifactId | string | 是 | 任务内唯一，分块据此匹配 |
| name | string | | 可读名称，如 `test-log.txt` |
| parts | repeated Part | 是 | 内容，至少一个 part |
| **TaskStatusUpdateEvent** | | | 任务状态的变化 |
| taskId, contextId | string | 是 | 任务及其上下文 |
| status | TaskStatus | 是 | 新状态 |
| **TaskArtifactUpdateEvent** | | | 新产物或它的一个分块 |
| taskId, contextId | string | 是 | 任务及其上下文 |
| artifact | Artifact | 是 | 产物或分块 |
| append | bool | | true 时追加到相同 `artifactId` 的产物 |
| lastChunk | bool | | true 时表示最后分块 |
| **StreamResponse** | | | 帧或推送体，四种之一 {{spec §3.2.3}} {{spec §4.3.3}} |
| task | Task | | 当前任务，任务流和订阅以此开头 |
| message | Message | | 仅消息的流含一个 message，随后关闭 |
| statusUpdate | TaskStatusUpdateEvent | | 任务状态变化 |
| artifactUpdate | TaskArtifactUpdateEvent | | 新产物或分块 |
| **SendMessageConfiguration** | | | 发送的 `configuration` |
| acceptedOutputModes | repeated string | | 客户端接受的媒体类型 |
| taskPushNotificationConfig | TaskPushNotificationConfig | | 要注册的 webhook，不带 `taskId` |
| historyLength | optional int32 | | 未设置表示不限制，`0` 表示无历史 |
| returnImmediately | bool | | true 时任务存在就返回，默认等待 |
| **TaskPushNotificationConfig** | | | 某个任务的 webhook |
| tenant | string | | 接口设置 `tenant` 时必须匹配 |
| id | string | | 创建时分配的配置 ID |
| taskId | string | | 所属任务 |
| url | string | 是 | webhook URL |
| token | string | | 任务或会话的 token，未定义传输方式 |
| authentication | AuthenticationInfo | | agent 如何认证：必需 `scheme`，如 `Bearer`，及可选 `credentials` |

## agent 卡片对象 {#s-ref-objects-and-fields-agent-card-objects}

[AgentCard 字段](#s-agentcard-fields)、[扩展卡片与签名](#s-extended-cards-and-signatures)、[安全方案](#s-security-schemes-and-in-task-authorization)、[扩展](#s-extensions)定义这些对象。

| 字段 | 类型 | 必需 | 含义 |
|---|---|---| --- |
| **AgentCard** | | | agent 提供什么、在哪里、有何要求 |
| name | string | 是 | 可读名称，如 `test-runner` |
| description | string | 是 | agent 做什么 |
| supportedInterfaces | repeated AgentInterface | 是 | 访问地址，首项优先 |
| provider | AgentProvider | | provider：必需的 `url`、`organization` |
| version | string | 是 | agent 自身版本，如 `2.3.0` |
| capabilities | AgentCapabilities | 是 | 支持的可选功能 |
| securitySchemes | map<string, SecurityScheme> | | 按名称列出的认证方案 |
| securityRequirements | repeated SecurityRequirement | | 方案名到 scope 的映射，如 `{"schemes": {"bearer": {"list": []}}}` |
| defaultInputModes | repeated string | 是 | 所有技能接受的媒体类型 |
| defaultOutputModes | repeated string | 是 | 所有技能产生的媒体类型 |
| skills | repeated AgentSkill | 是 | agent 擅长的工作 |
| signatures | repeated AgentCardSignature | | 覆盖规范化卡片的 JWS 签名 |
| **AgentInterface** | | | 访问 agent 的一种方式 |
| url | string | 是 | 生产环境为绝对 HTTPS URL |
| protocolBinding | string | 是 | `JSONRPC`、`GRPC`、`HTTP+JSON` 或自定义绑定 URI |
| tenant | string | | 路由值，已设置时复制到发给此接口的每个请求 |
| protocolVersion | string | 是 | A2A 版本，如 `1.0` |
| **AgentCapabilities** | | | 可选功能，缺少标志表示 `false` |
| streaming | optional bool | | 允许 `SendStreamingMessage` 和 `SubscribeToTask` |
| pushNotifications | optional bool | | 允许四种推送配置操作 |
| extensions | repeated AgentExtension | | 支持的协议扩展 |
| extendedAgentCard | optional bool | | 允许 `GetExtendedAgentCard` |
| **AgentExtension** | | | agent 支持的一个扩展，位于 `capabilities.extensions` |
| uri | string | | 标识扩展的 URI |
| description | string | | 此 agent 如何使用扩展 |
| required | bool | | true 时客户端必须理解并遵循扩展 |
| params | google.protobuf.Struct | | 扩展配置，JSON 对象 |
| **AgentSkill** | | | agent 擅长的一件事 |
| id | string | 是 | 技能 ID，如 `run-tests` |
| name | string | 是 | 可读名称 |
| description | string | 是 | 技能做什么 |
| tags | repeated string | 是 | 关键词，至少一个 |
| inputModes | repeated string | | 覆盖卡片默认值的输入媒体类型 |
| outputModes | repeated string | | 覆盖卡片默认值的输出媒体类型 |
| securityRequirements | repeated SecurityRequirement | | 此技能的要求 |

## proto 未定义的名称 {#s-ref-objects-and-fields-names-the-proto-does-not-define}

旧资料和过时文档页面仍使用以下名称，v1.0.1 proto 均不存在（[冲突 D10](#s-ref-sources-the-conflict-register)）。

| 名称 | 替代写法 |
|---| --- |
| `kind`（part 或流事件） | 成员名，如 `text` 或 `statusUpdate` |
| `TextPart`, `FilePart`, `DataPart` | 一个 `Part`，包含 `text`、`raw` 或 `url`、或 `data` |
| `final`（`TaskStatusUpdateEvent`） | 流关闭 |
| `taskStatusUpdate`, `taskArtifactUpdate` | `statusUpdate`、`artifactUpdate` |
| `Task.createdAt`, `Task.lastModified` | `status.timestamp` |
| `TaskArtifactUpdateEvent.index` | 分块匹配用的 `artifactId` |
| `PushNotificationConfig`, `CreateTaskPushNotificationConfigRequest` | `TaskPushNotificationConfig`，创建操作用它作请求（[冲突 D4](#s-ref-sources-the-conflict-register)） |
| `configId`（推送配置） | `id` |
| 卡片 `url`, `protocolVersion`, `preferredTransport`, `additionalInterfaces` | `supportedInterfaces`，各条目含 `url`、`protocolVersion` |
| 卡片 `supportsAuthenticatedExtendedCard` | `capabilities.extendedAgentCard` |
| 卡片 `security` | `securityRequirements`（[冲突 D6](#s-ref-sources-the-conflict-register)） |
| 卡片 `extensions`（顶层） | `capabilities.extensions`（[差异 N2](#s-ref-sources-discrepancies-found-after-the-register)） |
| `cursor`, `limit`, `nextCursor` | `pageToken`、`pageSize`、`nextPageToken` |

Sources: proto messages from Task to AgentSkill, with AgentExtension, AuthenticationInfo, AgentProvider, SecurityRequirement, and the request messages from SendMessageRequest to GetExtendedAgentCardRequest (research/sources/a2a.proto); spec §1.4, §3.1.4, §3.1.7, §3.2.2, §3.2.3, §3.3.4, §3.4.2, §4.3.3, §5.5, §5.6.1, §5.7, §A.2.1 (research/sources/specification.md); docs whats-new-v1 (research/sources/docs.md); research/brief-spec.md sections 2.0 to 2.8, 8.3 and 12.2; research/brief-docs.md; research/migration.md section D.6 (N2); capture/out/01-agent-cards.http
