# 中断态：INPUT_REQUIRED 和 AUTH_REQUIRED

> 任务可以停止等待你，两种等待在不同地方回答：输入发给任务本身，授权通过协议之外的渠道。

planner 向 `code-reviewer` 发送 `payments-api` diff 请求审查。reviewer 不知道 diff 的基准分支，无法开始。后来 planner 请 `deployer` 将构建 `2026.10.06-1` 部署到 staging，任务停下来等待操作员批准。

两个任务都没有失败。读完本节后，你可以识别中断任务，在正确位置回答，并检测它何时恢复。

## 两种等待状态 {#s-input-required-and-auth-required-two-states-that-wait}

**中断态：** agent 停止工作，需要某样东西才能继续的状态。proto 恰好将 `TASK_STATE_INPUT_REQUIRED` 和 `TASK_STATE_AUTH_REQUIRED` 两种状态标为 "This is an interrupted state."。 {{proto TaskState}}

中断任务保留 ID、历史和产物，状态消息说明 agent 需要什么。阻塞 `SendMessage` 一到任一中断态就返回。`TASK_STATE_INPUT_REQUIRED` 需要在同一任务上发送新消息回答。`TASK_STATE_AUTH_REQUIRED` 需要通过 A2A 之外的渠道提供凭据或批准，任务可无需客户端消息就恢复。 {{spec §3.2.2}}

## 在同一任务上回答 {#s-input-required-and-auth-required-answering-on-the-same-task}

reviewer 为 planner 的 diff 创建任务 `e5c95b09` 后停止，阻塞调用返回带问题的任务：

```listing
title: 首个回复：提出问题的任务
source: capture/out/06-input-required.http
lang: json
note: 任务外包装、状态消息内的 ID 和历史已省略。历史只包含 planner 的首条消息。
---
    "task": {
      "id": "e5c95b09-6d4b-4b3b-8693-91e81472d12f",
      "contextId": "49c5a238-4158-455d-8d63-b2cb39c0ecac",
      "status": {
        "state": "TASK_STATE_INPUT_REQUIRED",
        "message": {
          …
          "role": "ROLE_AGENT",
          "parts": [
            {
              "text": "Which base branch should I compare this diff against?"
            }
          ]
        },
        "timestamp": "2026-10-06T09:00:00.500Z"
      },
      …
```

回答是指定任务的普通 `SendMessage`：客户端用相同 taskId 和 contextId 发送新消息以继续交互。planner 带两个 ID 回答 `main`。第二个回复返回相同任务，状态为 `TASK_STATE_COMPLETED`，含 `review.json` 产物。[此图](#fig-input-required)跟踪整个交换。 {{spec §3.4.3}}

```figure
id: fig-input-required
kind: sequence
title: 审查的问题与回答
claim: 问题作为暂停任务的状态消息到达，回答是携带同一任务 ID 和上下文 ID 的新消息。
caption: 从上到下读。步骤 1 至 3 是首个 `SendMessage` 及回复，步骤 4 至 9 在同一任务上回答。ID 缩短至 8 个字符。来自 capture/out/06-input-required.http。
```

## 在 A2A 之外到达的授权 {#s-input-required-and-auth-required-authorization-that-arrives-outside-a2a}

agent 在任务中途需要权限时，比如执行破坏性操作前需要人批准，`MUST` 将 TaskState 转为 TASK_STATE_AUTH_REQUIRED。凭据走另一条路： {{spec §7.6}} {{spec §7.6.1}}

```rule
label: 凭据传输的位置
source: spec §7.6.1
---
除非双方已通过带外协商或扩展约定带内凭据传输，否则 agent 必须用带外方式接收凭据。
```

deployer 的第三个流帧指定操作员批准的位置：

```listing
title: 第 3 帧：部署请求批准
source: capture/out/07-auth-required.events.json
lang: json
note: JSON-RPC 包装及状态消息内的 ID 已省略。
---
          "statusUpdate": {
            "taskId": "ecf2dcb6-79c8-48f8-8868-24a0541781f4",
            "contextId": "9e8e6bcf-b117-48b9-992a-67971cddcb1b",
            "status": {
              "state": "TASK_STATE_AUTH_REQUIRED",
              "message": {
                …
                "role": "ROLE_AGENT",
                "parts": [
                  {
                    "text": "An operator must approve this deploy at http://localhost:41243/approve/ecf2dcb6-79c8-48f8-8868-24a0541781f4"
                  }
                ]
              },
              "timestamp": "2026-10-06T09:00:00.750Z"
            }
          }
```

批准从不进入协议。在套件中操作员向 deployer 发送 `POST /approve/<task id>`，见[套件 README](manuals/a2a-101/capture/README.md)。没有后续客户端消息：agent 收到凭据后 `MAY` 立即继续处理任务，无需客户端再发消息。 {{spec §7.6.1}}

客户端自身也是 agent 时，可把自己的任务移到 `TASK_STATE_AUTH_REQUIRED`，将请求向上游传递。[安全方案与任务内授权](#s-security-schemes-and-in-task-authorization)介绍这种链条如何影响凭据。 {{spec §7.6.2}}

```figure
id: fig-auth-required
kind: sequence
title: 等待操作员的部署
claim: 部署在 `TASK_STATE_AUTH_REQUIRED` 等待，流保持打开，操作员通过 A2A 外部批准后，同一条流传递结果。
caption: 从上到下读。步骤 2 至 4 和 7 至 9 是同一流的六帧。步骤 5、6 是 A2A 之外的普通 HTTP。ID 缩短至 8 个字符。来自 capture/out/07-auth-required.http。
```

## 流何时关闭 {#s-input-required-and-auth-required-when-the-stream-closes}

此采集中流在等待期间保持打开。只有终态关闭是 `MUST`，但 HTTP+JSON 绑定规定到终态或中断态就关闭。等待 A2A 外部凭据的 agent `SHOULD` 在设为 `TASK_STATE_AUTH_REQUIRED` 后保持活跃响应流。规范未解决矛盾（[冲突 D3](#s-ref-sources)）。上游 `dev-1.1` 分支的 [PR #2270](https://github.com/a2aproject/A2A/pull/2270)于 2026-09-29 获批、尚未发布，将两种中断态均定为非终态，进入它们不要求关闭流式响应。`main` 上 §11.7 和流式指南仍写终态或中断态。 {{spec §3.1.2}} {{spec §11.7}} {{spec §7.6.1}}

套件在 `TASK_STATE_INPUT_REQUIRED` 关闭，在 `TASK_STATE_AUTH_REQUIRED` 保持打开，见套件 README。SDK 也有类似分歧：

| SDK | 服务器何时关闭 `SendStreamingMessage` 流 |
|---|---|
| a2a-python 1.2.2 | agent 的 `execute()` 返回时，由 agent 代码决定  {{sdk src/a2a/server/agent_execution/active_task.py}} |
| a2a-go | `Message`、终态或 `TASK_STATE_INPUT_REQUIRED` 之后关闭，在 `TASK_STATE_AUTH_REQUIRED` 保持打开  {{sdk-go internal/taskupdate/final.go at v2.6.0}} |
| a2a-java | 终态、`Message` 或错误之后关闭，两种中断态都在 `execute()` 返回后保持打开  {{sdk-java events/EventConsumer.java at v1.4.0.Final}} |
| a2a-js | 终态、`TASK_STATE_INPUT_REQUIRED` 或 `Message` 之后关闭，`TASK_STATE_AUTH_REQUIRED` 保持打开  {{sdk-js src/server/events/execution_event_queue.ts at v1.3.0}} |
| a2a-dotnet | 处理器返回，或调用终态/中断态的 `TaskUpdater` 方法时  {{sdk-dotnet src/A2A/Server/TaskUpdater.cs at v1.0.0-preview2}} |
| a2a-rs | 终态事件之后或执行器流结束时，没有中断态规则  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |

流关闭只结束你的观察，不结束任务。调用 `GetTask`，任务非终态时按状态行动并调用 `SubscribeToTask`，见 [SendStreamingMessage 与 SubscribeToTask](#s-streaming-and-subscribe-to-task)。

## 别人行动时继续观察 {#s-input-required-and-auth-required-keep-watching-while-someone-else-acts}

没有打开的流，客户端有漏掉 Task 更新的风险，因此用 `SubscribeToTask` 订阅、注册 webhook，或用 `GetTask` 轮询。 {{spec §7.6.2}}

套件 planner 使用订阅。阻塞 `SendMessage` 返回处于 `TASK_STATE_AUTH_REQUIRED` 的任务 `a31361b3`，它立即调用 `SubscribeToTask`，对应 `19-planner.http` 的第 7、8 次交换。首帧到达后才通知操作员，因为规范未定义重放先前事件。

```takeaways
- 用带任务 `taskId` 和 `contextId` 的新消息回答 `TASK_STATE_INPUT_REQUIRED`。
- 将 `TASK_STATE_AUTH_REQUIRED` 请求通过 A2A 外部渠道交给批准者。
- 在任何人处理批准请求前订阅、注册 webhook 或开始轮询。
- 流每次关闭都调用 `GetTask`，因为服务器对关闭时机不一致。
```

Sources: spec §3.1.2, §3.2.2, §3.4.3, §7.6, §7.6.1, §7.6.2, §11.7 (research/sources/specification.md); proto TaskState (research/sources/a2a.proto); sdk src/a2a/server/agent_execution/active_task.py (a2a-python 1.2.2); sdk-go internal/taskupdate/final.go at v2.6.0; sdk-java server-common/src/main/java/org/a2aproject/sdk/server/events/EventConsumer.java at v1.4.0.Final; sdk-js src/server/events/execution_event_queue.ts at v1.3.0; sdk-dotnet src/A2A/Server/TaskUpdater.cs at v1.0.0-preview2; sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1; a2aproject/A2A PR #2270 (unreleased, branch dev-1.1); capture/out/06-input-required.http, 07-auth-required.http, 07-auth-required.events.json, 19-planner.http; capture/planner.py; capture/README.md
