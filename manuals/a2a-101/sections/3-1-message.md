# Message

> `Message` 是对话中的一轮，`role` 和三个 ID 说明传输方向以及继续哪个任务。

planner 向 `code-reviewer` 发送 diff 请求审查。reviewer 询问比较用的基准分支，planner 回答 `main`，reviewer 随后完成任务并给出两项发现。

读完本节后，你可以构建有效消息，并设置 ID 来继续任务。

## messageId、role 和 parts {#s-message-messageid-role-and-parts}

**Message：** 客户端与服务器之间的一次通信单元。它有八个字段，只有 `messageId`、`role`、`parts` 为 REQUIRED。`parts` 列表必须至少包含一个元素，[Part](#s-part) 解释其内容。 {{proto Message}} {{spec §5.7}}

[此图](#fig-message-fields)并排列出此次审查的三条消息，说明各字段由谁设置。

```figure
id: fig-message-fields
kind: structure
title: 消息各字段由谁设置
claim: 消息携带发送者生成的 ID，`contextId` 与 `taskId` 则来自服务器，客户端回传二者以继续任务。
caption: 各列是 capture/out/06-input-required.http 中的三条消息，按发送顺序排列。右列说明各字段由谁设置。ID 缩短至 8 个字符。
```

发送者创建 `messageId`。套件拒绝缺少该字段的消息，见[错误](#s-errors)。§11.2 和 §6.3 的规范示例省略了 `messageId`，因此不要原样复制示例（[冲突 D23](#s-ref-sources)）。 {{proto Message}} {{spec §11.2}} {{spec §6.3}}

**角色：** 消息传输的方向。`ROLE_USER` 表示从客户端到服务器，`ROLE_AGENT` 表示从服务器到客户端。planner 虽然是 agent，发给 `code-reviewer` 的消息仍带 `ROLE_USER`，因为它在这里是客户端。 {{proto Role}}

§2.2 术语表仍把角色写为原始字面量 "user" 和 "agent"（[冲突 D35](#s-ref-sources)）。规范未指定客户端发送 `ROLE_AGENT` 时的错误，套件返回 `-32602`，见[套件 README](manuals/a2a-101/capture/README.md)。 {{spec §2.2}} {{spec §5.5}}

## contextId 和 taskId {#s-message-contextid-and-taskid}

不带两个 ID 的客户端消息开始新的交互。服务器消息随后带上其生成的 `contextId`，若创建任务则也带 `taskId`。`02-message-reply.http` 中的直接回复只有 `contextId`，没有 `taskId`，因为 reviewer 回答时未创建任务： {{proto Message}}

```listing
title: 带上下文但没有任务的服务器消息
source: capture/out/02-message-reply.http
lang: json
note: 文件唯一一次交换的完整 result。
---
  "result": {
    "message": {
      "messageId": "3b4b1206-4b6f-467f-b735-2d7e4f7f4bcd",
      "contextId": "dc423c62-d5f4-48e5-82c0-4963b9bc4334",
      "role": "ROLE_AGENT",
      "parts": [
        {
          "text": "I review unified diffs in Python, TypeScript and Go. Send the diff as a text/x-diff part and name the base branch."
        }
      ]
    }
  }
```

继续任务时，客户端从任务复制两个 ID 到下一条消息，如 planner 的回答：

```listing
title: planner 的回答，从任务复制两个 ID
source: capture/out/06-input-required.http
lang: json
note: 第 2 次交换的完整 message。
---
    "message": {
      "messageId": "096d3737-42f9-4039-8320-a4737c2b3abe",
      "contextId": "49c5a238-4158-455d-8d63-b2cb39c0ecac",
      "taskId": "e5c95b09-6d4b-4b3b-8693-91e81472d12f",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "main"
        }
      ]
    }
```

两个 ID 遵循三条规则：

- **客户端的 `taskId` 必须指定存活的任务。** 消息中的 `taskId` 必须引用现有任务。未知 ID 得到 `TaskNotFoundError`，[CancelTask 与终态](#s-cancel-task-and-terminal-states)介绍已结束的任务。 {{spec §3.4.2}}
- **两个 ID 必须一致。** agent 必须拒绝 `contextId` 与 `taskId` 不匹配的消息。规范未指定错误，套件与参考 SDK 都返回 `-32602`。 {{spec §3.4.3}} {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}}
- **上下文跟随任务。** 只提供 `taskId` 时，agent 必须从任务推断 `contextId`。套件这样做，下表列出各 SDK 的行为。 {{spec §3.4.3}}

只有 `contextId`、没有 `taskId` 的消息在该对话中开始新任务，见 [contextId](#s-context-id)。

## SDK 如何处理 ID {#s-message-what-the-sdks-do-with-the-ids}

发送消息操作可以幂等，agent 可以用 messageId 检测重复消息。因此超时后重试可复用同一 `messageId`。没有 SDK 会拒绝重复 ID，不带 `taskId` 时它们都会为其创建另一个任务。 {{spec §3.3.1}}

| SDK | 只带 `taskId` 的消息 | 同一任务两次收到相同 `messageId` |
|---|---|---|
| Python 1.2.2 | 不读取任务，在消息上写入新的 `contextId` | 接受。历史跳过第二份副本，agent 再次运行  {{sdk src/a2a/server/agent_execution/context.py}}  {{sdk src/a2a/server/agent_execution/active_task.py}} |
| Go v2.6.0 | agent 上下文得到任务的 `contextId`，存储的消息保持发送时的样子 | 接受。历史跳过第二份副本，agent 再次运行  {{sdk-go a2asrv/agentexec.go at v2.6.0}} |
| Java v1.4.0.Final | agent 上下文及其事件得到任务的 `contextId`，存储的消息保持原样 | 接受。消息再次追加到历史，agent 再次运行  {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/requesthandlers/DefaultRequestHandler.java at v1.4.0.Final}}  {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/tasks/TaskManager.java at v1.4.0.Final}} |
| JS v1.3.0 | agent 上下文及其消息副本得到任务的 `contextId`，存储的消息保持原样 | 接受。消息再次追加到历史，agent 再次运行  {{sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0}} |
| .NET v1.0.0-preview2 | agent 上下文得到任务的 `contextId`，存储的消息保持原样 | 接受。消息再次追加到历史，处理器再次运行  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| Rust a2a-server-lf-v0.5.1 | 执行器上下文得到任务的 `contextId`，存储的消息保持原样 | 接受。消息再次追加到历史，执行器再次运行  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |

五个 SDK 为 agent 推断上下文，按发送时原样保存消息，参考 SDK 则生成新的上下文。发送两个 ID 就不会遇到这个差异。

## 可选字段与状态消息 {#s-message-optional-fields-and-the-status-message}

套件采集的消息没有设置以下三项：

- **`referenceTaskIds`** 列出消息引用以补充上下文的任务 ID。 {{proto Message}}
- **`extensions`** 列出消息包含或向其贡献内容的扩展 URI，见[扩展](#s-extensions)。 {{proto Message}}
- **`metadata`** 是自由形式 JSON 对象。 {{proto Message}}

**状态消息：** `TaskStatus` 可包含的一条 `message`，即任务内 agent 的话语。reviewer 的问题是状态消息，发现本身则放在 `review.json` 产物中，见 [A2A 标准化了什么](#s-what-a2a-standardizes)。 {{proto TaskStatus}}

```takeaways
- 每次发送消息生成新的 `messageId`，只在重试同一消息时复用。
- 不论参与方是什么，客户端发送 `ROLE_USER`，服务器发送 `ROLE_AGENT`。
- 每次后续消息从任务复制 `taskId` 和 `contextId`，因为参考 SDK 不推断上下文。
```

Sources: proto Message, Role, TaskStatus (research/sources/a2a.proto); spec §2.2, §3.3.1, §3.4.2, §3.4.3, §5.5, §5.7, §6.3, §11.2 (research/sources/specification.md); sdk src/a2a/server/agent_execution/active_task.py, src/a2a/server/agent_execution/context.py, src/a2a/server/request_handlers/default_request_handler_v2.py; sdk-go a2asrv/agentexec.go at v2.6.0; sdk-java server-common/src/main/java/org/a2aproject/sdk/server/requesthandlers/DefaultRequestHandler.java, server-common/src/main/java/org/a2aproject/sdk/server/tasks/TaskManager.java at v1.4.0.Final; sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0; sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2; sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1; capture/README.md; capture/out/02-message-reply.http, 06-input-required.http
