# CancelTask 与终态

> 四种终态结束任务，agent 选择三种，CancelTask 请求第四种，后续调用不能让任务离开终态。

planner 请 `test-runner` 在提交 `9f3c2e1` 上运行单元测试。一项测试失败，任务却返回 `TASK_STATE_COMPLETED`。只读状态的 planner 会部署坏代码，读产物的 planner 会停止发布。

读完本节后，你可以区分四种结局，调用 `CancelTask`，预测已结束任务的回答。

## 终态 {#s-cancel-task-and-terminal-states-terminal-states}

**终态：** 结束任务的四种状态之一：`TASK_STATE_COMPLETED`、`TASK_STATE_FAILED`、`TASK_STATE_CANCELED`、`TASK_STATE_REJECTED`。proto 均标为 "This is a terminal state"。 {{proto TaskState}}

终态任务不再变化：一旦到 completed、canceled、rejected 或 failed 就不能重启。[此图](#fig-task-endings)并列四种结局。 {{docs life-of-a-task}}

```figure
id: fig-task-endings
kind: comparison
title: 任务结束的四种方式
claim: agent 选择其中三种结局，客户端选择一种，任务结束后服务器拒绝后续消息和取消请求。
caption: 每张卡是套件中的一个任务：谁选择结局、最终状态消息、留下的产物。底行显示取消任务之后的回答。ID 缩短至 8 个字符。来自 capture/out/03-blocking-task.http、09-failed.http、10-cancel.http 和 08-rejected.http。
```

## agent 的三种结局 {#s-cancel-task-and-terminal-states-the-agent-s-three-endings}

任务 `3d8f7801` 在 `9f3c2e1` 运行测试。十二项中一项失败，任务仍以 `TASK_STATE_COMPLETED` 结束：

```listing
title: 报告测试失败的已完成任务
source: capture/out/03-blocking-task.http
lang: json
note: 只保留状态、状态消息和 summary.json 的 data part 开头。
---
    "task": {
      "id": "3d8f7801-f421-4e4e-aa2d-8b6da17d9281",
      …
        "state": "TASK_STATE_COMPLETED",
        …
              "text": "1 failed, 11 passed"
      …
          "artifactId": "summary",
          "name": "summary.json",
          "parts": [
            {
              "data": {
                "passed": 11,
                "failed": 1,
```

Completed 表示任务成功结束，这项工作是运行测试。代码是否正确是结果，结果放入产物。套件 planner 在部署前读取 `summary.json` 的 `failed` 计数。 {{proto TaskState}} {{spec §3.7}}

提交 `deadbee` 不存在，任务 `8ae21dcb` 以 `TASK_STATE_FAILED` 结束，表示任务因错误结束。同一请求会同样失败，因此修正输入并开始新任务。agent 崩溃时，参考 SDK 将任务存为失败，但阻塞发送得到错误。将该错误视为结果未知。 {{proto TaskState}} {{sdk src/a2a/server/agent_execution/active_task.py}}

planner 请求 `deployer` 部署到生产。任务 `23cf3710` 直接进入 `TASK_STATE_REJECTED`，表示 agent 决定不执行。只在 completed、failed、canceled 停止的循环会永远轮询拒绝任务。同一请求会得到同样拒绝，遵循状态消息："Production deploys are outside this agent's policy. Use the release train."（生产部署不在该 agent 策略内，请使用发布流程。） {{proto TaskState}}

## CancelTask {#s-cancel-task-and-terminal-states-canceltask}

**CancelTask：** 给定 `id`，请求服务器停止任务的操作。任务 `f22ed7af` 正运行全套测试时 planner 调用它，回复为 `TASK_STATE_CANCELED` 的任务，包含已写入的两个日志分块。 {{proto CancelTaskRequest}}

取消只是请求：服务器会尝试，但不保证成功。规范未规定哪些未完成状态必须取消，参考 SDK 取消任何非终态任务。 {{spec §3.1.5}} {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}}

套件和参考 SDK 对第二次 `CancelTask` 返回 `TaskNotCancelableError`、`-32002`，§3.1.5 对已完成、失败或取消任务也这样规定。§3.3.1 却称 Cancel Task 是幂等的，多次请求效果相同，对已清除任务的重复请求 `MAY` 返回 TaskNotFoundError。 {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}} {{spec §3.1.5}} {{spec §3.3.1}}

因此取消报错后调用 `GetTask`。canceled 表示先前取消生效，其他终态表示任务先结束，仍运行则表示服务器无法停止。 {{spec §3.1.5}}

## 对已结束任务的调用 {#s-cancel-task-and-terminal-states-calls-on-a-finished-task}

已结束任务仍回答。`GetTask` 返回最终任务。带其 `taskId` 的 `SendMessage` 得到 `UnsupportedOperationError`、`-32004`，`SubscribeToTask` 得到同样错误。`CancelTask` 得到 `TaskNotCancelableError`。`UnsupportedOperationError` 也覆盖不相关的失败，因此读取详细信息，见[错误](#s-errors)。 {{spec §3.1.3}} {{spec §3.1.1}} {{spec §3.1.6}} {{spec §3.1.5}}

官方 SDK 返回相同错误，其他绑定有两处差异：

| SDK | JSON-RPC | HTTP+JSON | gRPC |
|---|---|---|---|
| a2a-python 1.2.2 | `-32004` | `400` | `FAILED_PRECONDITION`  {{sdk src/a2a/server/agent_execution/active_task.py}}  {{sdk src/a2a/utils/errors.py}} |
| a2a-go | `-32004` | `400` | `FAILED_PRECONDITION`  {{sdk-go a2asrv/agentexec.go at v2.6.0}} |
| a2a-java | `-32004` | `400` | `UNIMPLEMENTED`  {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/requesthandlers/DefaultRequestHandler.java at v1.4.0.Final}} |
| a2a-js | `-32004` | `400` | `FAILED_PRECONDITION`  {{sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0}} |
| a2a-dotnet | `-32004` | `400`，problem-details 响应体 | 此发布版不支持  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| a2a-rs | `-32004` | `400` | `FAILED_PRECONDITION`  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |

a2a-java 的 gRPC 返回 `UNIMPLEMENTED`，而 §5.4 将错误映射为 `FAILED_PRECONDITION`。a2a-go 的实验集群模式则返回 `InvalidParamsError`、`-32602`。 {{spec §5.4}} {{sdk-go internal/taskexec/distributed_manager.go at v2.6.0}}

继续工作时，在同一上下文启动新任务，用 `referenceTaskIds` 指定已结束任务，见 [contextId](#s-context-id)。 {{spec §3.4.3}}

```takeaways
- 所有等待或轮询循环在四种终态都停止，包括 `TASK_STATE_REJECTED`。
- 从产物读取结果，因为已完成测试运行可能包含失败的测试。
- 取消报错后调用 `GetTask`，按返回状态行动。
- 在同一上下文中用 `referenceTaskIds` 启动新任务，不要向已结束任务发消息。
```

Sources: spec §3.1.1, §3.1.3, §3.1.5, §3.1.6, §3.3.1, §3.4.3, §3.7, §5.4 (research/sources/specification.md); proto TaskState, CancelTaskRequest (research/sources/a2a.proto); docs life-of-a-task (research/sources/docs.md); sdk src/a2a/server/agent_execution/active_task.py, src/a2a/server/request_handlers/default_request_handler_v2.py, src/a2a/utils/errors.py (a2a-python 1.2.2); sdk-go a2asrv/agentexec.go, internal/taskexec/distributed_manager.go (a2a-go v2.6.0); sdk-java server-common/src/main/java/org/a2aproject/sdk/server/requesthandlers/DefaultRequestHandler.java (a2a-java v1.4.0.Final); sdk-js src/server/request_handler/default_request_handler.ts (a2a-js v1.3.0); sdk-dotnet src/A2A/Server/A2AServer.cs (a2a-dotnet v1.0.0-preview2); sdk-rust a2a-server/src/handler.rs (a2a-rs a2a-server-lf-v0.5.1); capture/out/03-blocking-task.http, 08-rejected.http, 09-failed.http, 10-cancel.http, 14-resubscribe.http; capture/planner.py
