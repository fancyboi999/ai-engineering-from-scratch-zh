# Task、TaskStatus 和 TaskState

> `Task` 包含一个 `TaskStatus`，其 `state` 是九个 `TaskState` 值之一，规范给出这些值，却没有状态转换表。

planner 同时持有三个任务：`test-runner` 上的测试、`code-reviewer` 上的审查、`deployer` 上的部署。每个都是带 `status` 的 `Task`，planner 根据 `status.state` 决定等待、行动还是停止。

读完本节后，你可以阅读 `Task` 的所有字段，对所有 `TaskState` 值分类，并说明规范定义了哪些转换。

## Task {#s-task-and-task-state-task}

**Task：** A2A 管理的基本工作单元，以唯一 ID 标识。proto 为 `Task` 定义六个字段，`id` 和 `status` 为 REQUIRED。服务器创建 `id`，客户端不能提供。 {{spec §2.2}} {{proto Task}} {{spec §3.4.2}}

可选字段是 `contextId`、`artifacts`、`history`、`metadata`。[contextId](#s-context-id)、[Artifact 与分块](#s-artifact-and-chunks)、[GetTask 与 ListTasks](#s-get-task-and-list-tasks)依次介绍前三项。[此图](#fig-task-object-model)展开阻塞运行中的任务 `3d8f7801`。 {{proto Task}}

```figure
id: fig-task-object-model
kind: structure
title: 一个任务的对象模型
claim: 任务带有自身 ID、上下文、一个当前状态、产物及历史，其中每条消息和每个产物都由 part 构成。
caption: 从上往下读任务表，顺序与阻塞运行的填写顺序一致。右框展开最后两行，下方小块显示四种 part。值来自 capture/out/03-blocking-task.http，ID 缩短至 8 个字符。raw 和 url 示例来自 06-input-required.http 和 11-errors.http。
```

## TaskStatus {#s-task-and-task-state-taskstatus}

**TaskStatus：** 任务的当前状态，`state` 为 REQUIRED，`message` 和 `timestamp` 可选。message 是与状态关联的消息，timestamp 是记录该状态时的 ISO 8601 时间戳。 {{proto TaskStatus}}

任务每次只有一个状态，先前的状态消息可移入 `history`，如 `06-input-required.http` 所示。

## TaskState {#s-task-and-task-state-taskstate}

枚举 `TaskState` 有九个值，编号 0 至 8。在 JSON 中，状态以名称传输。 {{proto TaskState}} {{spec §5.5}}

**终态：** 永久结束任务的状态。proto 用 "This is a terminal state" 标记四个值。 {{proto TaskState}}

**中断态：** 任务等待 agent 外部输入的状态。proto 用 "This is an interrupted state" 标记两个值。 {{proto TaskState}}

**活跃态：** 本手册对 `TASK_STATE_SUBMITTED` 和 `TASK_STATE_WORKING` 的称呼，proto 未将二者归入上述两组。

| 值 | 编号 | 分类 | 套件中的场景 |
|---|---|---|---|
| `TASK_STATE_UNSPECIFIED` | 0 | 无 | 从不发送 |
| `TASK_STATE_SUBMITTED` | 1 | 活跃态 | 所有新任务，`04-polling.http` |
| `TASK_STATE_WORKING` | 2 | 活跃态 | 测试正在运行，`05-streaming.http` |
| `TASK_STATE_COMPLETED` | 3 | 终态 | 测试结束，`03-blocking-task.http` |
| `TASK_STATE_FAILED` | 4 | 终态 | 提交 `deadbee`，`09-failed.http` |
| `TASK_STATE_CANCELED` | 5 | 终态 | `CancelTask` 之后，`10-cancel.http` |
| `TASK_STATE_INPUT_REQUIRED` | 6 | 中断态 | 询问基准分支，`06-input-required.http` |
| `TASK_STATE_REJECTED` | 7 | 终态 | 生产部署，`08-rejected.http` |
| `TASK_STATE_AUTH_REQUIRED` | 8 | 中断态 | 等待操作员，`07-auth-required.http` |

`TASK_STATE_UNSPECIFIED` 是 proto3 零值，表示未知或无法确定的任务状态。套件从不发送它，将它和任何未知名称都视为错误。 {{proto TaskState}}

客户端需要这两组具名集合，因为阻塞 `SendMessage` 在终态或中断态返回，见 [SendMessage](#s-send-message)。 {{spec §3.2.2}}

## 规范允许的转换 {#s-task-and-task-state-the-transitions-the-specification-allows}

规范称任务沿定义好的生命周期推进，但正文和 proto 都没有转换表。有关转换的规定可归为四条： {{spec §2.2}}

- 输入：agent 可在处理中转到 `input-required` 来请求额外输入。这是 `TASK_STATE_INPUT_REQUIRED` 的 0.3 名称（[冲突 D37](#s-ref-sources)）。 {{spec §3.4.3}}
- 授权：agent 请求授权时 `MUST` 转到 `TASK_STATE_AUTH_REQUIRED`，可在没有客户端消息时恢复。 {{spec §7.6.1}}
- 拒绝：agent 可在初始任务创建期间或之后拒绝。 {{proto TaskState}}
- 不可再变：终态任务拒绝消息、取消和订阅。 {{spec §3.1.1}} {{spec §3.1.5}} {{spec §3.1.6}}

迁移指南称 1.0 澄清了取消场景的任务状态转换，但规范没有列出任何转换（[冲突 D38](#s-ref-sources)）。扩展指南列出添加状态或转换的扩展，又说扩展应使用现有枚举值（[冲突 D29](#s-ref-sources)）。只预期这九个值。 {{docs whats-new-v1}} {{docs extensions}}

协议没有转换表，agent 的转换就是代码发出的转换。[此图](#fig-task-states)汇总套件 agent 的全部转换。

```figure
id: fig-task-states
kind: state
title: 九种任务状态与套件的转换
claim: 套件采集显示九种任务状态转换，没有一条离开双边框标记的终态。
caption: 框是去掉 TASK_STATE_ 前缀的 TaskState 值。虚线箭头是套件 agent 的转换，按采集顺序排列，并标出展示该转换的采集文件。它们是一个实现的行为，不是协议规则。阻塞采集只返回最终状态，之前的转换来自返回的历史及 capture/agents.py。
```

deployer 在没有客户端消息时离开 `TASK_STATE_AUTH_REQUIRED`，这是规范允许的，并直接从 `TASK_STATE_SUBMITTED` 拒绝。参考 SDK 也不强制转换表，因此接受从任何非终态离开的转换。 {{spec §7.6.1}} {{sdk src/a2a/server/agent_execution/active_task.py}}

终态任务对其 `taskId` 上的消息和 `SubscribeToTask` 返回 `UnsupportedOperationError`，对 `CancelTask` 返回 `TaskNotCancelableError`。[CancelTask 与终态](#s-cancel-task-and-terminal-states)介绍四种结局，[状态表](#s-ref-task-states)列出各状态下客户端的下一步。 {{spec §3.1.1}} {{spec §3.1.5}} {{spec §3.1.6}}

```takeaways
- 固定两组集合：终态为 `COMPLETED`、`FAILED`、`CANCELED`、`REJECTED`，中断态为 `INPUT_REQUIRED`、`AUTH_REQUIRED`，均带 `TASK_STATE_` 前缀。
- 按名称比较状态，将 `TASK_STATE_UNSPECIFIED` 或未知名称视为错误。
- 接受从非终态离开的任何转换，包括创建后直接拒绝。
- 发送消息、取消或订阅前检查状态，因为三者在终态上都会失败。
```

Sources: spec §2.2, §3.1.1, §3.1.5, §3.1.6, §3.2.2, §3.4.2, §3.4.3, §5.5, §7.6.1 (research/sources/specification.md); proto Task, TaskStatus, TaskState (research/sources/a2a.proto); docs docs/topics/extensions.md and docs/whats-new-v1.md at v1.0.1; sdk src/a2a/server/agent_execution/active_task.py at a2a-python 1.2.2; capture/out/03-blocking-task.http, 04-polling.http, 05-streaming.http, 06-input-required.http, 07-auth-required.http, 08-rejected.http, 09-failed.http, 10-cancel.http, 11-errors.http; capture/agents.py
