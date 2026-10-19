---
id: a2a
title: A2A 协议
subtitle: 发现 agent、发送工作、跟踪任务并处理错误。基于 A2A 1.0.1。
hue: 140
sources: manuals/a2a-101
code: AP
---

## 通过 JSON-RPC 执行任务
type: task-table
from: manuals/a2a-101/capture/out/01-agent-cards.http, manuals/a2a-101/capture/out/03-blocking-task.http, manuals/a2a-101/capture/out/04-polling.http, manuals/a2a-101/capture/out/05-streaming.http, manuals/a2a-101/capture/out/06-input-required.http, manuals/a2a-101/capture/out/10-cancel.http, manuals/a2a-101/capture/out/14-resubscribe.http, manuals/a2a-101/capture/out/15-push.http

| 任务 | 代码 |
|---|---|
| 发现 agent | `GET /.well-known/agent-card.json` |
| 发送并等待 | `"method": "SendMessage"` |
| 发送后立即返回 | `"configuration": {"returnImmediately": true}` |
| 轮询任务 | `"method": "GetTask", "params": {"id": "<task id>", "historyLength": 0}` |
| 流式跟踪任务 | `"method": "SendStreamingMessage"`，携带 `Accept: text/event-stream` |
| 重新订阅任务流 | `"method": "SubscribeToTask", "params": {"id": "<task id>"}` |
| 回答问题 | `"message": {"contextId": "<ctx>", "taskId": "<task id>", ...}` |
| 注册 webhook | `"taskPushNotificationConfig": {"url": "<url>", "token": "<token>"}` |

## 一次 SendMessage 请求
type: annotated-code
lang: http
from: manuals/a2a-101/capture/out/04-polling.http, manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/1-2-one-task-request-by-request.md, manuals/a2a-101/sections/4-1-send-message.md

```http
POST /a2a/jsonrpc HTTP/1.1  # 卡片中的 JSONRPC 地址
Host: localhost:41241
Content-Type: application/json
A2A-Version: 1.0  # 每次请求都必须携带
{"jsonrpc": "2.0", "id": 1, "method": "SendMessage",
 "params": {
  "message": {"messageId": "<uuid>",  # 由客户端生成
   "role": "ROLE_USER",
   "parts": [{"text": "<request>"}]},
  "configuration": {"returnImmediately": true}}}  # 省略则阻塞等待
```

## HTTP+JSON 路由
type: command-table
from: manuals/a2a-101/sections/r-1-operations-by-binding.md, manuals/a2a-101/capture/out/16-rest-binding.http

| 命令 | 作用 |
|---|---|
| `POST /message:send` | SendMessage |
| `POST /message:stream` | SendStreamingMessage，返回 `StreamResponse` 流 |
| `GET /tasks/{id=*}` | GetTask。`historyLength` 放在查询参数中 |
| `GET /tasks` | ListTasks |
| `POST /tasks/{id=*}:cancel` | CancelTask |
| `POST /tasks/{id=*}:subscribe` | SubscribeToTask。也接受 `GET` |
| `POST /tasks/{task_id=*}/pushNotificationConfigs` | CreateTaskPushNotificationConfig |
| `GET /extendedAgentCard` | GetExtendedAgentCard |

## 捕获工具与一致性测试
type: annotated-code
lang: bash
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/sections/7-3-conformance-testing.md

```bash
python3 run.py  # 三个 agent 和一个客户端，写入 out/
python3 run.py --check  # 重新捕获并比较
git clone --filter=blob:none https://github.com/a2aproject/a2a-tck.git
cd a2a-tck
git checkout 1.0.0.alpha2  # 手册运行时使用的 TCK 标签
uv venv && source .venv/bin/activate
uv pip install -e .
./run_tck.py --sut-host http://localhost:9999  # 读取卡片并测试每种绑定
```

## 捕获工具中的 agent
type: architecture
from: manuals/a2a-101/capture/README.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/4-6-push-notification-configs.md, manuals/a2a-101/sections/7-1-a-client.md

```arch
node | planner | 1,2 | planner.py | 客户端 agent
node | card | 2,1 | Agent 卡片 | /.well-known/agent-card.json
node | runner | 2,2 | test-runner | :41241 流式与推送
node | reviewer | 3,1 | code-reviewer | :41242 需要输入
node | deployer | 3,2 | deployer | :41243 bearer，需要认证
node | hook | 1,3 | Webhook | :41250 /a2a-events
node | operator | 3,3 | 操作员 | 在 A2A 之外批准
edge | planner | card | GET
edge | planner | runner | JSON-RPC
edge | planner | reviewer | JSON-RPC
edge | planner | deployer | Bearer
edge | runner | hook | 推送
edge | operator | deployer | 批准
```

## 一个流式任务
type: flow
from: manuals/a2a-101/sections/1-2-one-task-request-by-request.md

1. **客户端**：读取卡片，检查 `capabilities.streaming` 是否为 true。
2. **客户端**：发送 `SendStreamingMessage`，使用新 `messageId`，不带 `taskId`。
3. **服务端**：第一帧为带有新标识的 Task，状态为 `TASK_STATE_SUBMITTED`。
4. **Agent**：通过 `statusUpdate` 将任务转为 `TASK_STATE_WORKING`。
5. **Agent**：用 `artifactUpdate` 帧构建 `test-log`，先 `append`，最后 `lastChunk`。
6. **Agent**：最后一条 `statusUpdate` 设置 `TASK_STATE_COMPLETED`。
7. **服务端**：关闭流。客户端通过 `GetTask` 确认。

## 任务状态
type: concepts
from: manuals/a2a-101/sections/r-3-task-states.md

- **TASK_STATE_SUBMITTED**：活跃。等待、轮询或订阅。
- **TASK_STATE_WORKING**：活跃。处理方式与已提交任务相同。
- **TASK_STATE_INPUT_REQUIRED**：中断。使用相同的 `taskId` 和 `contextId` 回答。
- **TASK_STATE_AUTH_REQUIRED**：中断。批准发生在 A2A 之外。订阅或轮询。
- **TASK_STATE_COMPLETED**：终态。读取产物。
- **TASK_STATE_FAILED**：终态。修正输入后创建新任务。
- **TASK_STATE_CANCELED**：终态。在相同上下文中创建新任务。
- **TASK_STATE_REJECTED**：终态。停止并按状态消息处理。

## 错误码
type: command-table
from: manuals/a2a-101/sections/r-4-errors.md

| 命令 | 作用 |
|---|---|
| `-32001` TaskNotFoundError | HTTP 404, gRPC NOT_FOUND |
| `-32002` TaskNotCancelableError | HTTP 400, FAILED_PRECONDITION |
| `-32003` PushNotificationNotSupportedError | HTTP 400, FAILED_PRECONDITION |
| `-32004` UnsupportedOperationError | HTTP 400, FAILED_PRECONDITION |
| `-32005` ContentTypeNotSupportedError | HTTP 400, INVALID_ARGUMENT |
| `-32009` VersionNotSupportedError | HTTP 400, FAILED_PRECONDITION |
| `-32601` MethodNotFoundError | 仅限 JSON-RPC |
| `-32602` InvalidParamsError | HTTP 400, INVALID_ARGUMENT |

## 默认值
type: defaults
from: manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/4-3-get-task-and-list-tasks.md, manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/r-4-errors.md, manuals/a2a-101/sections/4-6-push-notification-configs.md, manuals/a2a-101/sections/7-1-a-client.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `returnImmediately` | `false` | 发送后等待终态或中断状态 |
| `historyLength` | 未设置 | 服务端返回默认数量 |
| `includeArtifacts` | `false` | ListTasks 不返回产物 |
| ListTasks 中的 `pageSize` | 50 | 最大值为 100 |
| 缺少 `A2A-Version` | `0.3` | 1.0 服务端会拒绝 |
| JSON-RPC 错误状态 | `200 OK` | 工具和 SDK 的行为，规范未规定 |
| 推送 token 请求头 | `X-A2A-Notification-Token` | 工具和 SDK 的选择 |
| 工具请求超时 | 15 秒 | 规范未规定 |

## 故障排查
type: troubleshooting
from: manuals/a2a-101/capture/out/11-errors.http, manuals/a2a-101/capture/out/10-cancel.http, manuals/a2a-101/capture/out/18-extended-card.http, manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/7-4-from-0-3-to-1-0.md, manuals/a2a-101/sections/r-3-task-states.md, manuals/a2a-101/sections/7-3-conformance-testing.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `-32009` 协议版本不支持 | 缺少 `A2A-Version` 请求头，按 0.3 解析 | 发送 `A2A-Version: 1.0` |
| `-32601` 方法不存在 | 使用 `message/send` 等 0.3 名称 | 改用 `SendMessage` |
| `-32602` 参数无效 | 消息缺少 `messageId` | 为每条消息生成 `messageId` |
| `-32005` 内容类型不支持 | 包含 `image/png` 内容块 | 使用卡片声明接受的模式 |
| 消息或订阅返回 `-32004` | 任务已处于终态 | 创建新任务 |
| `-32002` 任务不可取消 | 任务已经结束 | 用 `GetTask` 读取 |
| GetExtendedAgentCard 返回 HTTP 401 | 缺少 bearer token | 发送 `Authorization: Bearer <token>` |
| TCK JSON-RPC 记录因 404 失败 | TCK 在 `url` 末尾加了斜杠 | 严格按 `url` 发送 POST |

## 术语表
type: glossary
from: manuals/a2a-101/sections/r-5-glossary.md

- **Agent 卡片**：描述 agent 的 JSON，通常位于 `/.well-known/agent-card.json`。
- **Task**：服务端为消息创建的工作单元，带有 `id`。
- **Context**：通过一个 `contextId` 归组任务和消息的对话。
- **Message**：一轮交互，包含 `messageId`、`role` 和内容块。
- **Part**：最小内容单元，可为 `text`、`raw`、`url` 或 `data`。
- **Artifact**：由内容块组成的任务产物，长产物分块到达。
- **推送通知**：向客户端 webhook 以 HTTP POST 发送 `StreamResponse`。
- **服务参数**：每次请求的键，例如通过请求头发送的 `A2A-Version`。

## 问答
type: qa
from: manuals/a2a-101/sections/r-1-operations-by-binding.md, manuals/a2a-101/sections/7-4-from-0-3-to-1-0.md, manuals/a2a-101/sections/1-2-one-task-request-by-request.md, manuals/a2a-101/sections/r-4-errors.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md

- **发送后返回什么？** 一个 `task` 或一个 `message`。单独的消息表示直接回复。
- **`lastChunk` 会结束任务吗？** 不会。它只结束一个产物。
- **JSON-RPC 出错为何仍为 200 OK？** 规范未规定状态码，工具和 SDK 使用 `200 OK`。
- **客户端使用哪个接口？** `supportedInterfaces` 中第一个客户端支持的接口。
- **0.3 的 `blocking` 如何变化？** 它被 `returnImmediately` 替代，现在发送默认会等待。

## 提示
type: tips
from: manuals/a2a-101/sections/5-4-version-and-extension-headers.md, manuals/a2a-101/sections/4-1-send-message.md, manuals/a2a-101/sections/1-2-one-task-request-by-request.md, manuals/a2a-101/sections/2-2-discovery-and-supported-interfaces.md, manuals/a2a-101/sections/r-4-errors.md, manuals/a2a-101/sections/4-6-push-notification-configs.md

- 每次请求都发送 `A2A-Version: 1.0`，不带补丁版本号。
- 轮询、订阅或等待 webhook 时设置 `returnImmediately: true`。
- 从第一帧获取任务标识和上下文标识。
- 能力标志缺失或为 `false` 时，跳过相应操作。
- 调用方无权访问任务时返回 `TaskNotFoundError`。
- 幂等处理推送通知，通知可能重复到达。
