# sub_agents、transfer_task 与 background_agents

> `transfer_task` 在全新子会话运行子 agent 并返回答案；`handoff` 把整个会话交给另一 agent；后台 agent 启动需要批准。

你希望协调者让写作者写一句话，再让审阅者回答用户。一个 agent 文件能同时表达两者：有返回的委派，和不返回的移交。

读完本节，你能在 `sub_agents`、`handoffs` 与 `background_agents` 之间选择，并在事件流中辨认它们。

## 团队文件 {#s-sub-agents-transfer-task-and-background-agents-the-team-file}

```listing
title: 协调者、写作者与审阅者
source: capture/fixtures/agents/team.yaml
lang: yaml
note: writer、reviewer 指令及 models 块已截去。
---
version: "16"

agents:
  root:
    model: local
    description: Coordinates a writer and a reviewer.
    instruction: |
      You coordinate two colleagues and never write text yourself.
      For every request: first call transfer_task to ask the writer for
      the text, then call handoff to pass the conversation to the reviewer.
    max_iterations: 6
    sub_agents: [writer]
    handoffs: [reviewer]
    toolsets:
      - type: background_agents

  writer:
    model: local
    description: Writes one sentence on a given topic.
…
    max_iterations: 3

  reviewer:
    model: local
    description: Reviews the sentence it receives.
…
```

三个 agent 都用 `local`，即 `dmr/ai/qwen3:4b`。`transfer_task` 和 `handoff` 都不在 `toolsets` 下，因为由两个列表注入（[冲突 C56](#s-ref-sources-and-the-conflicts-register)）。

## transfer_task：子会话中的子 agent {#s-sub-agents-transfer-task-and-background-agents-transfer-task-a-child-in-a-sub-session}

**委派：** 带 `agent`、`task` 和 `expected_output` 的 `transfer_task` 调用，由 `sub_agents` 添加到父 agent。{{docs-agent Transfer Task Tool}}，调用阻塞至子 agent 返回结果，结果成为工具响应。

```listing
title: 一次委派与一次会话移交的事件
source: capture/out/19-transcript.txt
lang: text
note: sub_session_completed 在 task 后截断，会话移交的长工具响应仅保留首句。
---
user: Ask the writer for one sentence about microVMs.
root -> tool_call transfer_task {"agent": "writer", "task": "Generate one sentence about microVMs", "expected_output": "A single sentence describing microVMs"}
agent_switching: {"agent_name": "writer", "switching": true, "from_agent": "root", "to_agent": "writer"}
writer: MicroVMs are lightweight virtual machines that provide strong isolation and security for applications with minimal resource overhead.
stream_stopped (stop, normal)
sub_session_completed: {"agent_name": "root", "parent_session_id": "<uuid>", "sub_session": {"id": "<uuid>", "origin": "run", "title": "Transferred task", "messages": [{"message": {"agent_name": "", "message": {"role": "system", "content": "You are a member of a team of agents. Your goal is to complete the following task:\n\n<task>\nGenerate one sentence about microVMs\n</task>…
agent_switching: {"agent_name": "root", "switching": false, "from_agent": "writer", "to_agent": "root"}
root <- tool_call_response Transfer Task: MicroVMs are lightweight virtual machines that provide strong isolation and security for applications with minimal resource overhead.
root -> tool_call handoff {"agent": "reviewer"}
root <- tool_call_response Handoff Conversation: The agent root handed off the conversation to you. …
reviewer: APPROVED: MicroVMs are lightweight virtual machines that provide strong isolation and security for applications with minimal resource overhead.
stream_stopped (stop, normal)
user: Now hand the conversation to the reviewer.
reviewer: APPROVED: MicroVMs are lightweight virtual machines that provide strong isolation and security for applications with minimal resource overhead.
stream_stopped (stop, normal)
```

writer 从未看到用户消息。子会话先有包含 `<task>` 和 `<expected_output>` 的系统消息，再有隐式用户消息“Please proceed.”。子会话用 writer 自己的 `max_iterations: 3`，`"tools_approved": false`。随后 `agent_switching` 把控制交回 `root`，句子作为工具响应返回。

{{docs-agent Multi-Agent Systems}}，与其他工具不同，它总是自动批准。录制符合此规则：`--exec` 下未发确认。委派给链中已有 agent 会失败，嵌套深度最多10 {{docs-agent Transfer Task Tool}}。`sub_agents` 项也可为 registry 引用；未固定 digest 时每次运行重新解析 tag {{schema AgentConfig}}。

## 会话移交 {#s-sub-agents-transfer-task-and-background-agents-the-session-move}

**会话移交：** `handoffs` 添加的 `handoff` 调用，只带 `agent` 参数。指定 agent {{docs-agent Multi-Agent Systems}}，成为活跃 agent 并看到完整历史。录制中句子返回后，`root` 在下一模型轮次调用它。工具响应告知 `reviewer` 可用工具和 agent，再由 `reviewer` 回答用户。

第二条消息直接到达 `reviewer`，移交后 transcript 没有 `root` 行。`force_handoff` 在每个最终响应做同样移交，无需工具调用 {{schema AgentConfig}}。

## background_agents {#s-sub-agents-transfer-task-and-background-agents-background-agents}

**后台 agent：** `run_background_agent` 启动的子 agent 任务，立即返回 task id。用 `list_background_agents`、`view_background_agent` 和 `stop_background_agent` 跟踪；目标必须在调用者的 `sub_agents` 中 {{docs-agent Background Agents Tool}}。

```listing
title: 从未启动的后台 agent
source: capture/out/19-background.txt
lang: text
note: 第4至13行已截去，即另外五次相同参数的确认与拒绝。
---
user: Run the writer as a background agent on the topic microVMs, wait for it, and repeat its sentence.
tool_call_confirmation: {"agent_name": "root", "tool_call": {"id": "<call-id>", "type": "function", "function": {"name": "run_background_agent", "arguments": "{\"agent\": \"writer\", \"task\": \"Write one sentence on the topic microVMs\", \"expected_output\": \"A single sentence about microVMs\"}"}}, "metadata": {"safety_label": "unknown"}}
root <- tool_call_response Run Background Agent: The user rejected the tool call.
…
stderr: Error: Agent terminated: detected 5 consecutive identical calls to run_background_agent. This indicates a degenerate loop where the model is not making progress.
```

`--exec` 且无 `--safety` 时，调用本身请求批准，无终端便被拒绝。模型重复调用，直到运行时以退出码1停止。限制为 `max_consecutive_tool_calls`；0 “uses the default of 5” {{schema AgentConfig}}，使用默认5。运行中的任务内，{{docs-agent Background Agents Tool}}，本需询问用户的调用自动拒绝。因此无界面协调者需为 `run_background_agent` 及子 agent 工具添加 `allow`。录制未测试此配置。

套件每条消息只请求一次工具调用。一轮两次并行调用无法从 cassette 重放，见 [session.db、sessions diff 与 eval](#s-session-db-sessions-diff-and-eval)。

```figure
id: fig-5-4
kind: sequence
title: 有返回的委派，再到持续生效的移交
claim: `transfer_task` 只给 `writer` 任务，并将句子返回 `root`；会话移交让 `reviewer` 回答所有后续消息。
caption: 从上向下，每拍一步。墨色实线是调用，墨色虚线是回复，琥珀虚线是改变会话归属的 handoff。琥珀框是 writer 子会话。来源为 capture/out/19-transcript.txt 与 19-transfer-task.json。
```

```takeaways
- 父 agent 需要结果时用 `sub_agents`；任务写清楚，让子 agent 无需历史。
- 后续 agent 应接管剩余对话时用 `handoffs`。
- 依赖后台运行前，为无界面协调者添加 `run_background_agent` 的 `allow`。
- 外部子 agent 引用固定 digest，避免每次重新解析 tag。
```

Sources: docs-agent Multi-Agent Systems, Transfer Task Tool, Background Agents Tool (research/sources/docs-docker-agent.md, pages concepts/multi-agent, tools/transfer-task, tools/background-agents); schema AgentConfig (research/sources/agent-schema.json); conflict C56 (research/conflicts-register.md); capture/README.md; capture/fixtures/agents/team.yaml; capture/out/19-team.txt, 19-transcript.txt, 19-transfer-task.json, 19-handoff.json, 19-background.txt, 19-background.ndjson
