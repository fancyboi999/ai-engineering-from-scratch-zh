# SendMessage

> `SendMessage` 携带一条消息和 `SendMessageConfiguration`，agent 返回 `Message` 或 `Task`，任务默认已到终态或中断态。

planner 用同一个方法向 `code-reviewer` 发送两条消息。第一条询问能审查哪些语言，回答立即以消息到达。第二条携带 diff，回答是有 ID、状态、随后还有产物的任务。

读完本节后，你可以构建 `SendMessage` 请求，并根据返回的任意结构采取行动。

## 请求与配置 {#s-send-message-the-request-and-its-configuration}

**SendMessageRequest：** 包含 [Message](#s-message) 定义的 `message`，可选的 `configuration` 和 `metadata`。配置有四个字段： {{proto SendMessageRequest}} {{proto SendMessageConfiguration}}

- `acceptedOutputModes`：客户端接受的媒体类型。
- `taskPushNotificationConfig`：webhook，见[推送通知配置](#s-push-notification-configs)。
- `historyLength`：返回任务携带多少历史。
- `returnImmediately`：是否在任务稳定到终态或中断态之前回答。

除非 `returnImmediately` 为 `true`，否则发送会阻塞：

```rule
label: 默认阻塞
source: spec §3.2.2
---
操作必须等到任务进入终态或中断态后再返回。终态包括 `TASK_STATE_COMPLETED`、`TASK_STATE_FAILED`、`TASK_STATE_CANCELED` 和 `TASK_STATE_REJECTED`；中断态包括 `TASK_STATE_INPUT_REQUIRED` 与 `TASK_STATE_AUTH_REQUIRED`。
```

`03-blocking-task.http` 中，不带 `configuration` 的 `SendMessage` 返回任务 `3d8f7801`，状态为 `TASK_STATE_COMPLETED`，包含全部产物。客户端看不到 `TASK_STATE_SUBMITTED` 或 `TASK_STATE_WORKING`。规范不设时间上限，客户端超时后就无法获知任务 ID。 {{spec §3.2.2}} {{spec §3.4.2}}

规范另一句话要求操作必须立即返回任务信息或响应消息，恰好相反（[冲突 D2](#s-ref-sources)）。proto 的默认值是 `false`，且 proto 具有规范性。套件与参考 SDK 都阻塞。 {{spec §3.1.1}} {{proto SendMessageConfiguration}} {{spec §1.4}} {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}}

SDK 对配置中的 `historyLength` 是否裁剪返回任务存在分歧：

| SDK | 返回任务上的 `configuration.historyLength` |
|---|---|
| a2a-python 1.2.2 | 应用于返回的 `Task` 和流中的 `task` 事件，负值得到 `InvalidParamsError`  {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}} |
| a2a-go | 从不应用，返回完整存储历史  {{sdk-go a2asrv/handler.go at v2.6.0}} |
| a2a-java | 应用于返回的 `Task` 及每个流 `Task` 事件，负值得到 `InvalidParamsError`  {{sdk-java requesthandlers/DefaultRequestHandler.java at v1.4.0.Final}} |
| a2a-js | 应用于返回任务及流 `task` 负载，0 或负值省略历史  {{sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0}} |
| a2a-dotnet | 服务器从不读取，返回完整存储历史  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| a2a-rs | 只应用于阻塞发送返回的 `Task`，流忽略它  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |

## Message 或 Task {#s-send-message-message-or-task}

`SendMessage` 返回 `SendMessageResponse`，负载为 `task` 和 `message` 两个成员的 `oneof`。由 agent 决定，规范没有选择规则：agent `MAY` 创建新 `Task` 异步处理消息，也 `MAY` 为简单交互直接返回 `Message`。 {{proto SendMessageResponse}} {{spec §3.1.1}}

套件中，`test-runner` 和 `deployer` 对每条消息创建任务。`code-reviewer` 在请求没有 `text/x-diff` part 且文本以问号结尾时返回消息（[capture/agents.py](manuals/a2a-101/capture/agents.py)）。任务一旦存在，选择就结束：此后发给任务的消息只会得到 `Task` 对象。 {{docs life-of-a-task}}

消息就是完整答案，没有可轮询、取消或订阅的任务 ID。它带 `contextId`，保存它用于后续交互。任务则是工作的句柄，工作可以持续到调用结束之后。[此图](#fig-message-or-task)并列展示 `code-reviewer` 的两种答案。`SendStreamingMessage` 在首个事件作同样选择，见 [SendStreamingMessage 与 SubscribeToTask](#s-streaming-and-subscribe-to-task)。 {{proto Message}}

```figure
id: fig-message-or-task
kind: decision
title: 同一方法，两种结果结构
claim: 同样调用 `code-reviewer` 的 `SendMessage`，问题返回消息，diff 返回任务，只有任务给客户端可跟踪的对象。
caption: 从上到下读。agent 自身逻辑选择结构，这里是 capture/agents.py 中的 review_quick 规则。左侧是 capture/out/02-message-reply.http 的回复，右侧是 capture/out/06-input-required.http 的任务。ID 缩短至 8 个字符。
```

## 立即返回，再用 GetTask 轮询 {#s-send-message-returning-at-once-and-polling-with-gettask}

**returnImmediately：** `SendMessageConfiguration` 中的布尔值，要求服务器在任务存在时就回答：创建任务后 `MUST` 立即返回，即使仍在处理。此标志不影响直接 `Message` 回复、流式操作或推送通知配置。 {{spec §3.2.2}}

**轮询：** 用 `GetTask` 读取任务，直到状态告诉你停止。`04-polling.http` 中，套件用 `returnImmediately` 发送，再以 `historyLength` 0 对任务 `d0c28826` 轮询两次：

```listing
title: 立即返回的发送，随后两次轮询
source: capture/out/04-polling.http
lang: json
note: 发送及首个 GetTask 请求只保留关键行。第二个 GetTask 请求除 JSON-RPC id 外与第一个相同。每个回复只保留状态，首次轮询还展示一个日志 part。
---
    "configuration": {
      "returnImmediately": true
    }
…
        "state": "TASK_STATE_SUBMITTED",
…
  "method": "GetTask",
  "params": {
    "id": "d0c28826-28b8-4b15-8b53-4e01ae7a5a3c",
    "historyLength": 0
  }
…
      "state": "TASK_STATE_WORKING",
…
            "text": "collected 12 items\n"
…
      "state": "TASK_STATE_COMPLETED",
```

发送返回 `TASK_STATE_SUBMITTED`，而规范示例使用 `TASK_STATE_WORKING` 和 `TASK_STATE_INPUT_REQUIRED`，所以要按实际得到的状态分支。首次轮询发现 `TASK_STATE_WORKING` 和一个日志 part，第二次发现 `TASK_STATE_COMPLETED` 及全部产物。[此图](#fig-blocking-and-return)并列展示阻塞调用、立即返回及两次轮询。 {{spec §3.2.2}}

```figure
id: fig-blocking-and-return
kind: timeline
title: 阻塞调用与立即返回调用
claim: 阻塞发送保持一个请求直到任务完成，`returnImmediately` 则在 `TASK_STATE_SUBMITTED` 时回答，后续由客户端轮询。
caption: 两个任务在请求处对齐，在套件时钟上经过相同状态。实心方块是回复向客户端展示的状态，空心方块是未展示的状态。绿色短线是产物更新，紫色条是打开的请求。来自 capture/out/03-blocking-task.http 和 04-polling.http。
```

## 按结果分派 {#s-send-message-dispatch-on-the-result}

套件 planner 在访问成员之前先检查哪个存在：

```listing
title: planner 对 SendMessage 结果的分派
source: capture/planner.py
lang: python
note: Planner.delegate 循环开头。中断态处理位于删节部分之后。
---
        while True:
            if "error" in reply:
                self.note(f"  error {reply['error']['code']}: {reply['error']['message']}")
                return None
            result = reply["result"]
            if "message" in result:
                self.note("  direct reply, no task to follow")
                return result["message"]
            task = result["task"] if "task" in result else result
            state = task["status"]["state"]
            self.note(f"  task {task['id'][:8]} is {state}")
            if state in TERMINAL:
                return task
```

planner 先检查 `error`，因为 JSON-RPC 错误在 HTTP 200 响应中到达。然后检查 `message` 并停止，最后才按任务状态分支，状态定义见 [Task、TaskStatus 和 TaskState](#s-task-and-task-state)。[客户端](#s-a-client)一节讲解循环的余下部分。

```takeaways
- 每个 `SendMessage` 结果都检查 `message` 和 `task`，不要假设 agent 只返回一种结构。
- 计划轮询、订阅或等待 webhook 时设置 `returnImmediately: true`。
- 对每个回复的状态分支，包括阻塞发送可能早早返回的 `TASK_STATE_SUBMITTED`。
```

Sources: spec §1.4, §3.1.1, §3.2.2, §3.4.2 (research/sources/specification.md); proto SendMessageRequest, SendMessageConfiguration, SendMessageResponse, Message (research/sources/a2a.proto); docs docs/topics/life-of-a-task.md at v1.0.1; sdk src/a2a/server/request_handlers/default_request_handler_v2.py (a2a-python 1.2.2); sdk-go a2asrv/handler.go at v2.6.0; sdk-java server-common/src/main/java/org/a2aproject/sdk/server/requesthandlers/DefaultRequestHandler.java at v1.4.0.Final; sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0; sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2; sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1; capture/out/02-message-reply.http, 03-blocking-task.http, 04-polling.http, 06-input-required.http; capture/agents.py, capture/planner.py
