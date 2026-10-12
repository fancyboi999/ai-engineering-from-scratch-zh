# 来源

> 本手册依据一个锁定发布版、一个参考 SDK、五个其他 SDK、一个测试套件和一个采集套件，列出来源之间的每处冲突。

[如何阅读本手册](#s-front)给出来源排序并介绍套件。本页锁定版本、列出冲突，并记录项目在标签之后的变更。

## 锁定版本 {#s-ref-sources-the-pin}

| 项目 | 值 |
|---|---|
| 发布版 | A2A 1.0.1，标签 `v1.0.1`，来自 [github.com/a2aproject/A2A](https://github.com/a2aproject/A2A)，提交 `3303592588e388e62e0f69f701af531d2f4e3991`，2026-05-28 打标签 |
| 协议版本 | 每条请求与卡片使用 `1.0`。事实核验日为 2026-10-06。 |
| main 分支 | 2026-10-05 的提交 `679ab3a`，用于查阅标签后的变更，只引述标签版没有的规则 |
| 参考 SDK | `a2a-sdk` 1.2.2，标签 `v1.2.2`，来自 [github.com/a2aproject/a2a-python](https://github.com/a2aproject/a2a-python)，提交 `2f9e44af243df5c7c7a3da361c8d095324bcd5e3`，Apache License 2.0 |
| 采集套件 | `manuals/a2a-101/capture/`，仅标准库，见[套件 README](manuals/a2a-101/capture/README.md) |

变更日志写发布日为 2026-05-26，规范页横幅仍称 1.0.0 是最新发布版（[冲突 D16](#s-ref-sources-the-conflict-register)）。手册用 `sdk` 和 `src/a2a/` 下路径引用参考 SDK，从不逐字引述它。

## 随附源文件 {#s-ref-sources-vendored-files}

`research/sources/` 的文件从标签复制，遵循 [LICENSE](manuals/a2a-101/research/sources/LICENSE) 中 Apache License 2.0。审计对照源文件检查每段至少 24 个字符的原文引述。

| 文件 | 上游 | 引用方式 |
|---|---|---|
| a2a.proto | `specification/a2a.proto`, 811 行，具有规范性 | `proto` 加消息或枚举名 |
| specification.md | `docs/specification.md`, 3610 行 | `spec` 加节号 |
| specification-main.md | `docs/specification.md`，main 提交 `679ab3a`，3618 行，未发布 | `spec-main` 加节号，只用于标签后新增规则 |
| docs.md | 十四个项目页面，共 3019 行，非规范性。本版增加 `multi-tenancy`、`custom-protocol-bindings`、`extension-and-binding-governance`。 | `docs` 加页面名 |

规范 §1.4 将 proto 路径写成 `spec/a2a.proto`，有误（[冲突 D15](#s-ref-sources-the-conflict-register)）。两份简报按行索引这些文件：`research/brief-spec.md` 有 40 项发现及下方登记表，`research/brief-docs.md` 标出过时页面。

## SDK 与测试套件 {#s-ref-sources-the-sdks-and-the-test-kit}

正文比较六个官方 SDK 和官方测试套件，每个均按一个标签读取。参考 SDK 引为 `sdk`，其他为 `sdk-go`、`sdk-java`、`sdk-js`、`sdk-dotnet`、`sdk-rust`，带文件路径和标签。手册转述它们，不逐字引述。

| 仓库 | 引用方式 | 标签 | 提交 | 日期 |
|---|---|---|---|---|
| [a2a-python](https://github.com/a2aproject/a2a-python) | `sdk` | `v1.2.2` | `2f9e44a` | 2026-10-05 |
| [a2a-go](https://github.com/a2aproject/a2a-go) | `sdk-go` | `v2.6.0` | `ebf17c5` | 2026-09-25 |
| [a2a-java](https://github.com/a2aproject/a2a-java) | `sdk-java` | `v1.4.0.Final` | `6408194` | 2026-09-28 |
| [a2a-js](https://github.com/a2aproject/a2a-js) | `sdk-js` | `v1.3.0` | `29417a5` | 2026-09-29 |
| [a2a-dotnet](https://github.com/a2aproject/a2a-dotnet) | `sdk-dotnet` | `v1.0.0-preview2` | `87fd448` | 2026-04-09 |
| [a2a-rs](https://github.com/a2aproject/a2a-rs) | `sdk-rust` | `a2a-server-lf-v0.5.1` | `32c31f6` | 2026-09-30 |
| [a2a-tck](https://github.com/a2aproject/a2a-tck) | `a2a-tck` 加文件路径 | `1.0.0.alpha2` | `29063fe` | 2026-05-27 |

## 冲突登记 {#s-ref-sources-the-conflict-register}

此表整理 `research/brief-spec.md` 的 §12.2，D36 至 D40 在编写手册时发现。末列说明 A2A 仓库在标签之后如何处理，核验日期为 2026-10-06。在 main 修复表示已合并但未发布，部分修复表示 main 仍有残留问题。

| ID | 来源的说法 | 手册采用 | 讨论章节 | 上游状态 |
|---|---|---|---|---|
| D1 | **订阅动词。** proto 为 `GET`，§5.3、§11.3.2 为 `POST`。 | proto，接受两者。 | [前言](#s-front), [4.5](#s-streaming-and-subscribe-to-task), [5.2](#s-http-json), [R.1](#s-ref-operations-by-binding) | 仍开放 [PR #2068](https://github.com/a2aproject/A2A/pull/2068) |
| D2 | **阻塞。** §3.1.1 立即返回，§3.2.2 和 proto 等待。 | §3.2.2 和 proto | [前言](#s-front), [4.1](#s-send-message), [7.1](#s-a-client) | 仍开放 [issue #2135](https://github.com/a2aproject/A2A/issues/2135) |
| D3 | **中断态的流。** §3.1.2、§3.1.6 在终态关闭，§11.7 和流式指南也在中断态关闭，§7.6.1 保持授权流打开。 | 终态关闭，中断态两者都可能 | [前言](#s-front), [1.2](#s-one-task-request-by-request), [4.2](#s-input-required-and-auth-required), [4.5](#s-streaming-and-subscribe-to-task), [R.3](#s-ref-task-states) | 仍开放 [PR #2270](https://github.com/a2aproject/A2A/pull/2270) |
| D4 | **推送配置名称。** 正文为 `PushNotificationConfig`，proto 为 `TaskPushNotificationConfig`。 | proto 名称 | [4.6](#s-push-notification-configs), [R.2](#s-ref-objects-and-fields) | main 部分修复 ([PR #1981](https://github.com/a2aproject/A2A/pull/1981)) |
| D5 | **创建请求。** 正文和附录 A 为 `CreateTaskPushNotificationConfigRequest`，proto 为 `TaskPushNotificationConfig`。 | proto | [4.6](#s-push-notification-configs), [R.1](#s-ref-operations-by-binding) | main 部分修复 ([PR #1981](https://github.com/a2aproject/A2A/pull/1981)) |
| D6 | **卡片安全字段。** §3.1.11、§13.3、§8.5 示例为 `security`，proto 为 `securityRequirements`。 | proto | [前言](#s-front), [2.1](#s-agentcard-fields), [2.3](#s-extended-cards-and-signatures), [6.1](#s-security-schemes-and-in-task-authorization), [R.2](#s-ref-objects-and-fields) | main 部分修复 ([PR #2046](https://github.com/a2aproject/A2A/pull/2046)) |
| D7 | **扩展卡片标志编号。** 附录 A.2.2 为字段 5，proto 为字段 4。 | proto | [2.3](#s-extended-cards-and-signatures) | 无进展 |
| D8 | **协议版本。** 附录 A.2.1 为卡片 `protocolVersions`，proto 为每个接口的 `protocolVersion`。 | 每接口一个 | [2.1](#s-agentcard-fields) | main 已修复，未发布 ([PR #2165](https://github.com/a2aproject/A2A/pull/2165)) |
| D9 | **流事件名。** 迁移指南为 `taskStatusUpdate`、`taskArtifactUpdate`，proto 为 `statusUpdate`、`artifactUpdate`。 | proto | [4.5](#s-streaming-and-subscribe-to-task), [7.4](#s-from-0-3-to-1-0) | main 已修复，未发布 ([PR #2056](https://github.com/a2aproject/A2A/pull/2056)) |
| D10 | **proto 没有的字段。** 迁移指南列 `Task.createdAt`、`Task.lastModified`、`configId`、`TaskArtifactUpdateEvent.index`。 | 不发送它们 | [R.2](#s-ref-objects-and-fields), [7.4](#s-from-0-3-to-1-0) | main 部分修复 ([PR #2056](https://github.com/a2aproject/A2A/pull/2056)) |
| D11 | **弃用 OAuth 流程。** 迁移指南称 implicit、password 已删除，proto 保留但弃用。 | 仍存在，不使用 | [6.1](#s-security-schemes-and-in-task-authorization) | 无进展 |
| D12 | **分页名称。** 迁移指南为 `cursor`、`limit`、`nextCursor`，proto 为 `pageToken`、`pageSize`、`nextPageToken`。 | proto | [4.3](#s-get-task-and-list-tasks) | main 已修复，未发布 ([PR #2165](https://github.com/a2aproject/A2A/pull/2165)) |
| D13 | **错误体。** §6.4、§6.5 示例为 `application/problem+json`，迁移指南为 `application/json`，§11.6 为 `google.rpc.Status`。 | §11.6 | [5.5](#s-errors) | 仍开放 [PR #1641](https://github.com/a2aproject/A2A/pull/1641) 和 [PR #1689](https://github.com/a2aproject/A2A/pull/1689) |
| D14 | **JSON-RPC 方法模板。** §9.3 为 `category/action`，§9.1、§9.4 为 PascalCase。 | PascalCase | [5.1](#s-json-rpc) | 无进展 |
| D15 | **proto 路径。** §1.4 为 `spec/a2a.proto`，§5.7、§10.1 和仓库为 `specification/a2a.proto`。 | 仓库 | [1.1](#s-what-a2a-standardizes), [随附源文件](#s-ref-sources-vendored-files) | 无进展 |
| D16 | **发布版与日期。** 横幅称 1.0.0 最新，变更日志为 2026-05-26，标签消息为 2026-04-23，标签提交为 2026-05-28。 | 1.0.1，2026-05-28 打标签 | [锁定版本](#s-ref-sources-the-pin) | 仍开放 [PR #2072](https://github.com/a2aproject/A2A/pull/2072) |
| D17 | **头注册。** §14.2.1、§14.2.2 引用 §3.2.5，服务参数却在 §3.2.6。 | §3.2.6 | [5.4](#s-version-and-extension-headers) | 仍开放 [issue #2305](https://github.com/a2aproject/A2A/issues/2305) |
| D18 | **TLS 版本。** 规范为 1.3 或更高，企业指南为 1.2 或更高。 | 规范 | [6.1](#s-security-schemes-and-in-task-authorization) | 无进展 |
| D19 | **必需数组为空。** §5.7 要求至少一个元素，§8.4.1 示例的 `skills` 为空，空 `tasks` 却合法。 | 无结果时空 `tasks`，真实卡片至少一个技能 | [2.1](#s-agentcard-fields), [R.2](#s-ref-objects-and-fields) | 仍开放 [issue #2122](https://github.com/a2aproject/A2A/issues/2122) |
| D20 | **typ 头。** §8.4.2 将 `typ` 列在 `MUST` 字段中，措辞却为 `SHOULD`。 | 发送 `alg`、`kid`，`typ` 设为 `JOSE` | [2.3](#s-extended-cards-and-signatures) | 无进展 |
| D21 | **签名步骤。** §8.4.2、§8.4.3 删除默认值，§8.4.1 保留 REQUIRED 和已设置 optional 字段。 | §8.4.1 | [2.3](#s-extended-cards-and-signatures) | 仍开放 [issue #2249](https://github.com/a2aproject/A2A/issues/2249) |
| D22 | **JSON 命名示例。** §5.5 为 `push_notification_config`，proto 为 `task_push_notification_config`。 | proto | [R.2](#s-ref-objects-and-fields) | 无进展 |
| D23 | **违反 REQUIRED 的示例。** 部分省略 `messageId`、`artifactId` 或事件 `contextId`。 | 不原样复制示例 | [3.1](#s-message), [6.2](#s-extensions) | main 部分修复 ([PR #2083](https://github.com/a2aproject/A2A/pull/2083)) |
| D24 | **无效 JSON。** §4.6.1、§6.7、§9.4.1 示例。 | 不原样复制示例 | [3.2](#s-part), [6.2](#s-extensions) | 仍开放 [PR #1657](https://github.com/a2aproject/A2A/pull/1657) |
| D25 | **第 2 层图。** §1.3 展示 Get Agent Card，§3.1 只定义 Get Extended Agent Card。 | 图是非正式描述 | [1.1](#s-what-a2a-standardizes) | 无进展 |
| D26 | **强制操作。** §3.1 要求全部，§3.3.4 允许标志拒绝流式、推送和扩展卡片。 | 能力标志 | [2.2](#s-discovery-and-supported-interfaces) | 无进展 |
| D27 | **指南中的传输。** 核心概念称所有操作用 JSON-RPC 2.0，规范有三种绑定。 | 规范 | [5.1](#s-json-rpc) | 无进展 |
| D28 | **上下文 ID 创建者。** 核心概念称服务器，规范允许客户端提议。 | 规范 | [3.5](#s-context-id) | 仍开放 [issue #1317](https://github.com/a2aproject/A2A/issues/1317) |
| D29 | **扩展新增状态。** 扩展指南列出添加状态的扩展，又禁止新枚举值。 | 两者都非规范性，不新增状态 | [3.4](#s-task-and-task-state), [6.2](#s-extensions) | 无进展 |
| D30 | **扩展激活。** §4.6.1 为 JSON-RPC 参数，§9.2 为 HTTP 头。 | 头 | [5.4](#s-version-and-extension-headers) | 无进展 |
| D31 | **版本作为参数。** §3.6.1 允许请求参数，§9.2、§11.2 要求头。 | 头 | [5.4](#s-version-and-extension-headers) | 仍开放 [issue #2184](https://github.com/a2aproject/A2A/issues/2184) |
| D32 | **旧端点名。** what-is-a2a 图为 `POST /sendMessage`、`/.well-known/agent-card`。 | `message:send`、`agent-card.json` | [2.2](#s-discovery-and-supported-interfaces) | main 已修复，未发布 ([PR #2261](https://github.com/a2aproject/A2A/pull/2261)) |
| D33 | **指南中的流类型。** 流式指南为 `SendStreamingMessageResponse`，规范为 `StreamResponse`。 | 规范 | [4.5](#s-streaming-and-subscribe-to-task) | 无进展 |
| D34 | **gRPC 接口 URL。** proto 要求绝对 HTTPS URL，gRPC 连接主机和端口。 | 标签版无规则 | [2.1](#s-agentcard-fields), [5.3](#s-grpc) | main 已修复，未发布 ([PR #1997](https://github.com/a2aproject/A2A/pull/1997)) |
| D35 | **角色拼写。** §2.2 为 user、agent，proto 和 §5.5 为 `ROLE_USER`、`ROLE_AGENT`。 | 枚举名称 | [3.1](#s-message) | 无进展 |
| D36 | **另一客户端任务。** §3.3.2 将它定为授权错误，又禁止暴露存在性。 | `TaskNotFoundError` | [6.1](#s-security-schemes-and-in-task-authorization) | 无进展 |
| D37 | **0.3 状态名。** §3.4.3 为 `input-required`，proto 为 `TASK_STATE_INPUT_REQUIRED`。 | proto 名称 | [3.4](#s-task-and-task-state) | 仍开放 [PR #2155](https://github.com/a2aproject/A2A/pull/2155) |
| D38 | **取消转换。** 迁移指南称 1.0 已澄清，规范无转换表。 | 转换是实现行为 | [3.4](#s-task-and-task-state) | 仍开放 [issue #1992](https://github.com/a2aproject/A2A/issues/1992) |
| D39 | **示例版本。** §9.2、§11.2、§14.2.1 发送 `A2A-Version: 0.3`。 | 发送 `1.0` | [5.4](#s-version-and-extension-headers) | 无进展 |
| D40 | **旧扩展卡片标志。** 附录 A.2.2 为 `supportsExtendedAgentCard`，迁移指南和 SDK 为 `supportsAuthenticatedExtendedCard`。 | `capabilities` 的 `extendedAgentCard` | [2.3](#s-extended-cards-and-signatures), [7.4](#s-from-0-3-to-1-0) | 无进展 |

## 登记之后发现的差异 {#s-ref-sources-discrepancies-found-after-the-register}

本版研究又找到二十处文档、附录或示例与 proto 或规范不一致的地方，都不改变手册的取舍。末列说明截至 2026-10-06 main 是否仍保留原文。

| ID | 来源的说法 | 手册采用 | 讨论章节 | main 状态 |
|---|---|---|---|---|
| N1 | **指南中的流事件 kind。** 迁移指南的 0.3 `kind` 值为 `taskStatusUpdate`、`taskArtifactUpdate`，附录 A.2.1 和 0.3 schema 为 `status-update`、`artifact-update`。 | 附录 A.2.1 | 仅 R.6 | 已修复 |
| N2 | **扩展路径。** 迁移指南为 `agentCard.extensions`，proto 为 `capabilities.extensions`。 | proto | [6.2](#s-extensions), [R.2](#s-ref-objects-and-fields) | 未改变 |
| N3 | **租户范围。** 迁移指南只说 gRPC 请求的租户范围，proto 每条请求都有 `tenant`，每个 rpc 都有 `/{tenant}` 路由。 | proto | [5.2](#s-http-json) | 未改变 |
| N4 | **0.3 的 ListTasks。** 迁移指南称 0.3 不提供，0.3 正文列 `tasks/list`，0.3 proto 和 schema 不列。 | 指南，理解为不在 0.3 schema 中 | 仅 R.6 | 无需改变 |
| N5 | **升级标题。** 附录 A.2.1 在 1.0 变更标题下写 `pre-0.3.x`。 | 理解为 pre-1.0 | 仅 R.6 | 未改变 |
| N6 | **删除时间线。** 附录 A 将 1.0 重命名的名称定在 0.5.0 或以后删除，并称时间线仅为示例。 | §1.4：下一个主版本 | 仅 R.6 | 未改变 |
| N7 | **删除的卡片字段名。** 附录 A.2.2 为字段 13 的 `supports_extended_agent_card`，0.3 proto 为字段 13 的 `supports_authenticated_extended_card`。 | 0.3 proto | 仅 R.6 | 未改变 |
| N8 | **§10.2 示例版本。** gRPC 示例发送 `a2a-version` 为 `0.3`，D39 未列出。 | 发送 `1.0` | [5.3](#s-grpc) | 未改变 |
| N9 | **配置 ID 名。** 迁移指南为 `config_id`，proto 为 `id`。 | proto | [R.2](#s-ref-objects-and-fields) | 已修复 |
| N10 | **扩展列表被称为新字段。** 迁移指南称 1.0 新增 `Message.extensions`、`Artifact.extensions`，两者在 0.3 proto 已存在。 | 不是新增 | 仅 R.6 | 未改变 |
| N11 | **双向 TLS 被称为新增。** 迁移指南称 1.0 新增双向 TLS，0.3 proto 已有 `mtls_security_scheme`。 | 不是新增 | 仅 R.6 | 未改变 |
| N12 | **租户路由。** §5.3、§11.3、§11.5 未列 `/{tenant}`，proto 每个 rpc 都添加。 | proto | [5.2](#s-http-json), [R.1](#s-ref-operations-by-binding) | 未改变 |
| N13 | **tenant 字段编号。** `ListTaskPushNotificationConfigsRequest.tenant` 为字段 4，其余请求为字段 1。 | 无冲突，只在 gRPC 可见 | 仅 R.6 | 未改变 |
| N14 | **所有 part 都有 filename。** 迁移指南称每个 part 有 `filename`，proto 注释称用于文件。 | proto 允许任何 part 使用，但应只用于文件 | [3.2](#s-part) | 未改变 |
| N15 | **附录 A 创建请求。** 表格把 `CreateTaskPushNotificationConfigRequest` 列为当前类型，实际是 0.3 类型。 | proto，同 D5 | [4.6](#s-push-notification-configs) | 未改变 |
| N16 | **操作别名。** 迁移指南称过渡期有别名，proto 和方法集合没有，SDK 兼容层有。 | 规范，明确指出 SDK 层 | 仅 R.6 | 未改变 |
| N17 | **反转的默认值。** 迁移指南称 `returnImmediately` 为新字段，0.3 `blocking` 默认 false 不等待，1.0 `returnImmediately` 默认 false 却等待。 | §3.2.2 和 proto | [4.1](#s-send-message) | 未改变 |
| N18 | **扩展指南卡片示例。** 顶层 `url`，是 0.3 结构。 | `supportedInterfaces` | 仅 R.6 | 已修复 |
| N19 | **被称为 gRPC 专用的包装。** §10.5.1 称 `TaskPushNotificationConfig` 为 gRPC 资源类型，proto 每种绑定都用。 | proto | 仅 R.6 | 未改变 |
| N20 | **租户指南安全字段。** multi-tenancy 页面为 `securitySchemes` 和 `security`，proto 为 `securityRequirements`。 | proto，同 D6 | 仅 R.6 | 未改变 |

## v1.0.1 之后 {#s-ref-sources-after-v1-0-1}

手册检查 A2A 仓库 2026-10-05 的 `main` 提交 `679ab3a`，标签后共有 73 个提交。其中一个改变 proto：[PR #1997](https://github.com/a2aproject/A2A/pull/1997)允许 gRPC 接口 `url` 为 `hostname:port`，解决 D34。它是仍开放的待发布 1.0.2 [PR #2072](https://github.com/a2aproject/A2A/pull/2072) 中唯一条目。

[PR #2081](https://github.com/a2aproject/A2A/pull/2081)添加 §7.6.4“任务内授权范围”，手册用 `spec-main` 引述。`dev-1.1` 分支在 2026-09-22 的提交 `db39eb5` 保存 1.1 工作：`generation` 字段和任务时间线。D1、D3 的已批准修复针对此分支，仍开放。截至 2026-10-06，没有比 `v1.0.1` 更新的标签。

Sources: manual.json pin, sources and quoteSources; research/sources/README.md and LICENSE; spec §1.4, §3.6, §5.7, §10.1 (research/sources/specification.md); research/sources/specification-main.md §7.6.4 (main at 679ab3a); research/brief-spec.md sections 1.1, 12.2 and 14; research/brief-docs.md; research/conflicts-upstream.md, research/migration.md section D.6, research/sdk-splits.md section 1, research/conformance-tools.md (research of 2026-10-06); a2aproject/A2A main at 679ab3a, branch dev-1.1 at db39eb5, and the PRs and issues in the Upstream column, checked 2026-10-06; the a2a-python checkout at tag v1.2.2 (pyproject.toml, LICENSE); the SDK and a2a-tck repositories at the tags in the SDK table; manuals/a2a-101/capture/README.md, capture/run.py
