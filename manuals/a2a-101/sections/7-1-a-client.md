# 客户端

> 可工作的客户端是一个循环：读取卡片，为每个技能选择 agent，并为任务可能到达的每种状态设置分支。

planner 的工作是交付 `payments-api` 的变更。它必须测试提交 `a41d7c3`、审查 diff，并将构建 `2026.10.06-1` 部署到 staging。起始信息只有三个端口号、deployer token 和基准分支名。`capture/planner.py` 用 86 行完成全部工作，`19-planner.log` 记录每次决策。

读完本节后，你可以编写按技能委派并处理所有任务状态的客户端。

## 发现：先读全部卡片 {#s-a-client-discover-read-every-card-first}

发送任何内容前，planner 读取各端口卡片，选择 `protocolBinding` 为 `JSONRPC`、`protocolVersion` 为 `1.0` 的接口，将每个技能 ID 归到提供它的 agent 下，还记录 `streaming` 标志和 `securityRequirements`。

规范规则按位置选择首个支持的传输。此处两者一致，因为三张卡片都将 JSON-RPC 放在第一位。[发现与支持接口](#s-discovery-and-supported-interfaces)给出完整规则。 {{spec §8.3.2}}

## 委派：发送一次，按回复分支 {#s-a-client-delegate-send-once-then-switch-on-the-reply}

每次委派是不带 `returnImmediately` 的 `SendMessage`，阻塞到终态或中断态，见 [SendMessage](#s-send-message)。bearer token 只发给卡片要求它的 agent，见[安全方案](#s-security-schemes-and-in-task-authorization)。随后循环按回复分支。

```listing
title: delegate，按每个回复分支的循环
source: capture/planner.py
lang: python
note: delegate 方法的完整循环。上方选择 agent 和发送消息的行已省略。
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
            question = task["status"]["message"]["parts"][0]["text"]
            if state == "TASK_STATE_INPUT_REQUIRED":
                answer = self.answer(question)
                self.note(f"  it asks: {question} The planner answers from its own context: {answer}")
                _, reply = self.client.rpc(f"SendMessage: answer {agent['name']}", agent["port"], "SendMessage", {"message": self.client.message(answer, task_id=task["id"], context_id=task["contextId"])}, headers=headers)
                continue
            if state == "TASK_STATE_AUTH_REQUIRED":
                self.note(f"  it needs approval: {question} The planner cannot approve, so it asks the operator and subscribes.")
                return self.follow(agent, task, headers)
```

回复有三种结构，依序检查：错误、直接 `message`、`task`。`TERMINAL` 元组包含四种终态，包括客户端最常忘记的 `TASK_STATE_REJECTED`。 {{proto SendMessageResponse}}

在 `TASK_STATE_INPUT_REQUIRED`，planner 用相同 `taskId`、`contextId` 在同一任务回答，见[中断态](#s-input-required-and-auth-required)。在 `TASK_STATE_AUTH_REQUIRED`，planner 无内容可发送，将任务交给 `follow`。

## 跟踪：先订阅，再通知操作员 {#s-a-client-follow-subscribe-then-call-the-operator}

订阅首帧是任务快照，见[流式传输](#s-streaming-and-subscribe-to-task)。planner 先订阅，仅在快照到达后通知操作员。

```listing
title: follow，直到流结束
source: capture/planner.py
lang: python
note: 完整方法。操作员调用代替人在 A2A 之外批准。
---
    def follow(self, agent, task, headers):
        def on_frame(index, event):
            if index == 1:
                self.operator(task)

        _, events = self.client.rpc(f"SubscribeToTask on {agent['name']}", agent["port"], "SubscribeToTask", {"id": task["id"]}, headers=headers, on_frame=on_frame)
        final = events[-1]["result"]["statusUpdate"]["status"]["state"]
        self.note(f"  the stream ends at {final}")
        return {"id": task["id"], "status": {"state": final}}
```

操作员调用是 A2A 之外的 `POST /approve/<task id>`。行动前流已打开，批准后的更新不会在 planner 不知情时溜走。快照后还有三帧，最后一帧是 `TASK_STATE_COMPLETED`。 {{spec §7.6.2}}

## 逐次决策看运行 {#s-a-client-the-run-decision-by-decision}

两次委派之间，`ship` 决定是否继续。测试任务未完成、有测试失败、或任一发现严重程度为 high 时都停止。[此图](#fig-planner-run)用三条泳道画出 `19-planner.log` 的运行，下方显示决策。

```figure
id: fig-planner-run
kind: flow
title: planner 的运行与逐次决策
claim: planner 读取三张卡片，依次委派三项技能，回答问题、上报批准请求，并在每个下一步前根据 data part 决策。
caption: 先从左到右读三条泳道，再读决策行。每条泳道是一次委派，委派顺序从上到下，显示回复携带的状态。任务 ID 缩短至 8 个字符。来自 capture/out/19-planner.log 和 19-planner.http。
```

每次决策都读取 data part，不读自由文本：`summary.json` 的 `passed`、`failed`，以及 `review.json` 每项发现的 `severity`。提交 `9f3c2e1` 有一项测试失败，planner 会在审查之前停止。

## 生产 planner 要添加什么 {#s-a-client-what-a-production-planner-adds}

面对无法控制的 agent，planner 需要的不止套件循环。

- **安全重试。** 用相同 `messageId` 重发失败消息。保留首次回复，因为参考 SDK 中不带 `taskId` 的重发会创建第二个任务。 {{spec §3.3.1}} {{sdk src/a2a/server/agent_execution/active_task.py}}
- **超时。** 套件 `capture/wire.py` 给每次请求 15 秒，规范不设超时。长任务设置 `returnImmediately` 并跟踪任务。
- **卡片检查。** 用标准 HTTP 缓存保存卡片，并按[扩展与签名卡片](#s-extended-cards-and-signatures)验证 deployer 的 `signatures`。 {{spec §8.6}}
- **能力检查。** planner 记录 `streaming` 却从不读取。面对无流式能力的 agent，`SubscribeToTask` 得到 `UnsupportedOperationError`。 {{spec §3.3.4}}
- **每种状态都有分支。** 循环没有 `TASK_STATE_SUBMITTED` 或 `TASK_STATE_WORKING` 分支。服务器若立即回答阻塞发送（[冲突 D2](#s-ref-sources)），循环会重复处理同一回复。
- **每个结果都检查。** `ship` 读取审查产物却不检查审查任务是否完成，流断开时 `follow` 需要调用 `GetTask`。
- **真实操作员渠道。** 通过已认证渠道向人发送批准请求，并记录批准者。

```rule
label: 调用前读取卡片
source: spec §3.3.4
---
"Clients SHOULD validate capability support by examining the Agent Card before attempting operations that require optional capabilities."
```

```takeaways
- 首次委派前，从卡片建立技能到 agent 的映射。
- 回复循环为每种结果结构和任务状态设置分支。
- 操作员批准前，先订阅 `TASK_STATE_AUTH_REQUIRED` 的任务。
```

Sources: spec §3.3.1, §3.3.4, §7.6.2, §8.3.2, §8.6 (research/sources/specification.md); proto SendMessageResponse (research/sources/a2a.proto); sdk src/a2a/server/agent_execution/active_task.py at a2a-python 1.2.2; capture/planner.py, capture/wire.py, capture/run.py, capture/agents.py; capture/out/19-planner.http, 19-planner.log
