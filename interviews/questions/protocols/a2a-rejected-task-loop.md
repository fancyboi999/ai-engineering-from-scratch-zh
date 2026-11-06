---
id: a2a-rejected-task-loop
title: 永远停不下的轮询，和不该发生的部署
card: protocols
kind: debug
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, coding]
tags: [a2a, task-state, terminal-state, artifacts, polling]
minutes: 8
lessons: []
manuals: [a2a-101#s-cancel-task-and-terminal-states, a2a-101#s-task-and-task-state]
practice: []
cheatsheet: [a2a]
related: [protocols/a2a-card-before-the-call]
updated: 2026-11-03
---

一个 planner 用 `GetTask` 轮询远程 agent，直到任务结束。状态为 completed、failed 或 canceled 时它就停下。对着一个部署 agent，这个循环永远不返回。对着一个测试运行器，planner 部署了一个测试套件里有失败用例的构建。解释这两个 bug。

## Short answer

循环只认识三种终态，而终态有四种。部署 agent 拒绝了任务，处于 `TASK_STATE_REJECTED` 的任务再也不会变化，所以循环一直空转。测试运行器完成了要求它做的工作，所以即使有测试失败，它的任务也是 `TASK_STATE_COMPLETED`；测试结论是结果，而结果放在产物里传递。

## Full answer

### 九种状态，客户端必须写死的两组

| 类别 | 状态 |
|---|---|
| 活跃 | `TASK_STATE_SUBMITTED`、`TASK_STATE_WORKING` |
| 中断 | `TASK_STATE_INPUT_REQUIRED`、`TASK_STATE_AUTH_REQUIRED` |
| 终态 | `TASK_STATE_COMPLETED`、`TASK_STATE_FAILED`、`TASK_STATE_CANCELED`、`TASK_STATE_REJECTED` |

`TASK_STATE_UNSPECIFIED` 是 proto 的零值。把它和任何不认识的名字都当作错误。proto 把四种状态标为终态、两种标为中断，但没有给出状态迁移表，所以要接受从任何非终态出发的任何迁移。部署 agent 可以直接从 submitted 进入 rejected。

### Bug 一：漏掉的结局

rejected 表示 agent 决定不做这个任务。在录制的运行里，状态消息是“Production deploys are outside this agent's policy. Use the release train.”（生产部署不在该 agent 的策略内，请走发布流程）。同样的请求会得到同样的拒绝，所以 planner 应该停下并照消息去做，而不是重试。

### Bug 二：状态不是结论

completed 表示任务成功完成，而这个任务的工作是运行测试套件。在录制的阻塞运行里，状态消息是“1 failed, 11 passed”，`summary.json` 产物里有 `"passed": 11` 和 `"failed": 1`。planner 在部署前要读这个 data part 里的 `failed` 计数。任务的输出不应该放在消息里。

### 已结束的任务还会怎么回答

| 对终态任务的调用 | 回复 |
|---|---|
| `GetTask` | 最终的任务，只要服务器还保留着 |
| 带上它的 `taskId` 调用 `SendMessage` | `UnsupportedOperationError`，`-32004` |
| `SubscribeToTask` | `UnsupportedOperationError`，`-32004` |
| `CancelTask` | `TaskNotCancelableError`，`-32002` |

要继续，就在同一个 `contextId` 里新建任务，并在 `referenceTaskIds` 里写上已结束的任务。

## Follow-ups

- **Level 2:** 循环还必须处理哪些状态？怎么处理？ Expected: 两种中断状态；对 `TASK_STATE_INPUT_REQUIRED`，在同一个任务上发消息回答；对 `TASK_STATE_AUTH_REQUIRED`，把它转给 A2A 之外的审批人，同时继续订阅或轮询。
- **Level 3:** 你调用 `CancelTask`，收到 `-32002`。下一步做什么？ Expected: 调用 `GetTask`；canceled 表示之前的一次取消生效了，其他终态表示任务先结束了，运行中的状态表示服务器停不下它。
- **Level 3:** agent 进程在任务中途崩溃，你的阻塞发送返回了错误。任务算失败了吗？ Expected: 把结果当作未知；参考 SDK 会把任务存为 failed，但客户端只看到一个错误，所以要把任务读回来。
- **Level 4:** diff 变了，怎么在一次已完成的评审基础上继续？ Expected: 新建一个任务，用同一个 `contextId`，不带 `taskId`，在 `referenceTaskIds` 里写上旧任务；终态任务不再接受消息。

## Wrong answers

- "把状态和小写字符串 `completed` 比较。" 当前版本发送的是 `TASK_STATE_COMPLETED` 这样的枚举名，不认识的名字必须当作错误，而不是继续等。
- "任务 completed 说明测试通过了。" completed 表示 agent 完成了要求它做的工作。结论在产物里。
- "给被拒绝的任务再发一条消息，重新问一次。" 终态任务拒收消息。在同一个上下文里新建任务。

## Taught in

[CancelTask 与终态一节](../../../manuals/a2a-101/sections/4-4-cancel-task-and-terminal-states.md)展示了录制运行中的四种结局，[Task、TaskStatus 和 TaskState 一节](../../../manuals/a2a-101/sections/3-4-task-and-task-state.md)对全部九个取值做了分类。
