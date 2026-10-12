# 任务状态

> 九个值描述任务，当前值是活跃态、中断态还是终态，决定客户端下一步能做什么。

proto 标记四种终态、两种中断态。proto 和正文都没有转换表，顺序由 agent 决定。阻塞 `SendMessage` 在终态或中断态返回。[Task、TaskStatus 和 TaskState](#s-task-and-task-state)分类并汇总套件转换。[中断态](#s-input-required-and-auth-required)与 [CancelTask 与终态](#s-cancel-task-and-terminal-states)解释客户端下一步。 {{proto TaskState}} {{spec §3.2.2}}

| 状态 | 分类 | 设置者 | 客户端下一步 |
|---|---|---|---|
| TASK_STATE_UNSPECIFIED | 无 | 无人：零值 | 将它和任何未知名称视为错误。 |
| TASK_STATE_SUBMITTED | 活跃态 | 服务器，创建时 | 等待、轮询或订阅。 |
| TASK_STATE_WORKING | 活跃态 | agent，工作时 | 同 submitted 任务。 |
| TASK_STATE_INPUT_REQUIRED | 中断态 | agent，提出问题时 | 用带相同 `taskId`、`contextId` 的新消息回答。 |
| TASK_STATE_AUTH_REQUIRED | 中断态 | agent，请求授权时 | 在 A2A 之外交给批准者，订阅、注册 webhook 或轮询。 |
| TASK_STATE_COMPLETED | 终态 | agent，工作完成时 | 从产物读取结果，用带 `referenceTaskIds` 的新任务发起后续工作。 |
| TASK_STATE_FAILED | 终态 | agent，无法执行工作时 | 读取状态消息，修正输入，启动新任务。 |
| TASK_STATE_CANCELED | 终态 | agent，`CancelTask` 之后 | 在同一上下文启动新任务。 |
| TASK_STATE_REJECTED | 终态 | agent，拒绝任务时 | 停止循环，遵循状态消息。 |

任务结束前，`CancelTask` 请求服务器停止它，不保证成功。终态任务不再改变，向其 `taskId` 发消息或调用 `SubscribeToTask` 得到 `UnsupportedOperationError`，`CancelTask` 得到 `TaskNotCancelableError`。服务器保留任务期间，`GetTask` 仍返回它。 {{spec §3.1.5}} {{spec §3.1.1}} {{spec §3.1.6}} {{spec §3.1.3}}

流 `MUST` 在任务到达终态时关闭。中断态规则冲突（[冲突 D3](#s-ref-sources-the-conflict-register)）。套件在 `TASK_STATE_INPUT_REQUIRED` 关闭，在 `TASK_STATE_AUTH_REQUIRED` 保持打开，见套件 README。因此每次关闭后调用 `GetTask`，按状态行动。 {{spec §3.1.2}}

Sources: proto TaskState (research/sources/a2a.proto); spec §3.1.1, §3.1.2, §3.1.3, §3.1.5, §3.1.6, §3.2.2, §3.3.2, §3.4.3, §7.6.1, §7.6.2 (research/sources/specification.md); docs life-of-a-task (research/sources/docs.md); research/brief-spec.md sections 4.1 to 4.5, 5.4 and 12.2; manuals/a2a-101/capture/README.md; capture/out/03-blocking-task.http, 04-polling.http, 05-streaming.http, 06-input-required.http, 07-auth-required.http, 08-rejected.http, 09-failed.http, 10-cancel.http
