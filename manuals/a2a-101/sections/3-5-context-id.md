# contextId

> `contextId` 将多个任务归为一个对话，`taskId` 将多条消息归为一项工作，只有服务器创建任务 ID。

`code-reviewer` 在审查中途停下，询问 planner 使用哪个基准分支。回答必须送到同一个审查任务。之后 diff 改变，planner 希望第二次审查能记得第一次。两个 ID 承载这些关系：任务 ID 对应工作，上下文 ID 对应对话。

读完本节后，你可以继续任务，在同一上下文开始后续任务，并知道各 ID 由谁创建。

## 两个 ID，两种范围 {#s-context-id-two-ids-two-scopes}

**上下文：** 可选标识符，逻辑上归组相关任务与消息。相同 `contextId` 的任务和消息 `SHOULD` 视为同一对话会话的一部分。 {{spec §2.2}} {{spec §3.4.1}}

**任务 ID：** 一项有状态工作的 ID。服务器在响应 Message 创建新任务时生成，[Message](#s-message) 介绍回传它的规则。 {{spec §3.4.2}}

服务器通常也创建上下文：处理不含 `contextId` 的 Message 时 `MAY` 生成新的 `contextId`，响应必须携带它。套件首条消息均不带 ID，每个回答，包括 `02-message-reply.http` 中的直接回复，都带回新上下文。 {{spec §3.4.1}}

客户端 `SHOULD` 将服务器生成的 `contextId` 当作不透明标识符。ID 背后，agent 可以在多次交互间保存内部状态、对话历史或 LLM 上下文。 {{spec §3.4.1}}

只有理解服务器会如何处理时才提出自己的上下文 ID。服务器不能接受时 `MUST` 拒绝并报错，`MUST NOT` 为响应生成新 `contextId`。概念指南称其为服务器生成的标识符，未给客户端提议留余地（[冲突 D28](#s-ref-sources)）。以规范为准，两种回答都有可能。 {{spec §3.4.1}} {{docs key-concepts}}

## 继续任务 {#s-context-id-continuing-a-task}

任务等待你时，在同一任务上回答，发送两个 ID，见 [Message](#s-message)。[中断态](#s-input-required-and-auth-required)跟踪审查任务的回答。

只有非终态任务接受更多消息。向已结束任务发送消息得到 `UnsupportedOperationError`，见 [CancelTask 与终态](#s-cancel-task-and-terminal-states)。 {{spec §3.3.3}}

## 后续工作是新任务 {#s-context-id-a-follow-up-is-a-new-task}

审查完成后，第二轮不能重新打开它。细化工作必须在相同 `contextId` 中启动新任务。规范提供两个字段：客户端 `MAY` 用不带 `taskId` 的 `contextId` 在现有对话中启动新任务，`SHOULD` 用 Message 的 `referenceTaskIds` 明确引用相关任务。 {{docs life-of-a-task}} {{spec §3.4.3}}

采集记录未包含这种后续任务。套件服务器会接受：给定 `contextId` 而不带 `taskId`，其 `send` 在该上下文创建新任务（[capture/a2a_ref.py](manuals/a2a-101/capture/a2a_ref.py)）。[此图](#fig-context-and-tasks)将采集到的审查与客户端接下来会发送的后续任务并列。

```figure
id: fig-context-and-tasks
kind: tree
title: 一个上下文，两个任务
claim: 审查任务保存对话的两次交换，它已到终态，因此后续审查以新任务加入同一上下文。
caption: 从上向下读：上下文、任务、各任务按顺序排列的历史。虚线任务和消息是客户端接下来会发送的内容，采集在它之前结束。ID 缩短至 8 个字符。来自 capture/out/06-input-required.http 和 capture/out/13-history.http。
```

上下文不限于同时一个任务：agent 可以为每条后续消息创建独立的并行任务。 {{docs life-of-a-task}}

## agent 保存什么 {#s-context-id-what-the-agent-keeps}

审查任务在 `history` 保存四条消息，[GetTask 与 ListTasks](#s-get-task-and-list-tasks)介绍读取方法。不要把历史视为完整记录，因为哪些 Message 持久化到 Task History 由 agent 决定。特别是任务创建前交换的消息可能不存入任务历史。 {{spec §3.7}}

上下文也不会永远存在。agent `MAY` 实施过期或清理策略，`SHOULD` 记录这些策略。依赖旧上下文 ID 之前先查 agent 文档。 {{spec §3.4.1}}

```takeaways
- 首条消息不发送 ID，保存服务器返回的 `taskId` 和 `contextId`。
- 继续非终态任务时，每条消息都带上两个 ID。
- 终态之后，用相同 `contextId`、不带 `taskId` 的消息发起后续工作，在 `referenceTaskIds` 中引用旧任务。
- 将上下文 ID 视为 agent 可使其过期的不透明标识符。
```

Sources: spec §2.2, §3.3.3, §3.4.1, §3.4.2, §3.4.3, §3.7 (research/sources/specification.md); proto Task (research/sources/a2a.proto); docs docs/topics/key-concepts.md and docs/topics/life-of-a-task.md at v1.0.1; capture/out/02-message-reply.http, 06-input-required.http, 10-cancel.http, 13-history.http; capture/a2a_ref.py
