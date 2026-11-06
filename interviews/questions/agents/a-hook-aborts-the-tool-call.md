---
id: a-hook-aborts-the-tool-call
title: 阅读 harness：hook 在计划执行途中中止工具调用
card: agents
kind: code-reading
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, debugging]
tags: [harness, hooks, state-machine, event-stream, pull-point]
minutes: 12
lessons: [phases/19-capstone-projects/20-agent-harness-loop-contract]
manuals: []
practice: []
cheatsheet: [agent-harness, agent-state-graphs]
related: [agents/budget-exhausted-looks-like-an-answer]
updated: 2026-11-03
---

阅读 harness 循环的这部分代码。由于工具名称在黑名单上，`before_tool_call` 上的订阅者在三步规划的第二步抛出了 `HookAbort`。追踪循环接下来的执行流程：它会发出哪些事件、触发哪些 hook、进入什么状态，以及调用方会收到什么？

```python
step = self._plan[self._cursor]
self.hooks.fire("before_step", {"step": step})
self._emit("step.start", {"step_id": step.id, "desc": step.description})
if step.requires_tool:
    try:
        self.hooks.fire("before_tool_call", {"step": step})
    except HookAbort as exc:
        step.error = f"hook_abort:{exc}"
        self._emit("tool.error", {"step": step.id, "error": step.error})
        self.hooks.fire("on_error", {"step": step, "error": step.error})
        self._transition(State.REFLECTING)
        return self._step()
    self.budget.tool_calls += 1
    self._emit("tool.call", {"step": step.id, "tool": step.tool_name, "args": step.tool_args})
    self._transition(State.AWAITING_TOOL)
    self._emit("step.end", {"step_id": step.id, "outcome": "awaiting_tool"})
    self.hooks.fire("after_step", {"step": step, "outcome": "awaiting_tool"})
    return PullRequest(reason="tool_call", state=self.state, payload={...})
```

## Short answer

中止是在循环内部处理的，而不是向调用方抛出异常。循环在当前步骤上记录错误，发出 `tool.error`，触发 `on_error`，转移到反思状态并再次调用自身。反思会推进游标并计入一轮，因此被拒绝的步骤会被跳过而非重试，循环继续进入第三步。调用方不会收到中止异常，而会收到第三步工具调用的下一个拉取请求或完成结果；如果预算先耗尽，则会收到原因是预算超限的暂停，并可在事件流中查看被拒绝的步骤。

## Full answer

### 逐步执行过程

1. 针对第二步触发 `before_step` 并发出 `step.start`。
2. 触发 `before_tool_call`，订阅者抛出 `HookAbort`。
3. 循环将 `hook_abort:<reason>` 写入 `step.error`。
4. 发出带有步骤 ID 和错误文本的 `tool.error`。
5. 携带该步骤与错误信息触发 `on_error`。
6. 状态转移至 `REFLECTING`，状态转移表允许从执行状态转移至反思状态。
7. 再次调用 `_step()`。在反思分支中，游标推进至第三步，轮数计数加一。
8. 第三步需要工具，因此循环触发其对应的 hooks，递增工具调用计数，发出 `tool.call`，转移至 `AWAITING_TOOL`，发出 `step.end`，触发 `after_step`，最后返回原因为 `tool_call` 的拉取请求。

### 没有发生的事情

- 第二步没有产生 `tool.call` 事件，工具调用计数器也没有递增，因为中止发生在两者之前。
- 第二步没有产生 `step.end` 事件，也没有触发 `after_step` hook。中止分支导致该步骤缺少闭合事件。这是读者应当指出的缺口：将 `step.start` 与 `step.end` 成对匹配的订阅者会看到一个未完结的步骤。
- 没有重试。契约规定跳过该步骤并反思。重试策略应位于规划器中，规划器可以从反思状态返回一份新规划。

### 为什么采用这种形式

Hook 是命令式的，可以执行修改、中止或跳过操作。事件是观察式的，只负责记录。中止属于 hook 的决策，而对中止的记录属于事件，因此订阅事件流的追踪器无需检查循环内部即可获知拒绝行为。状态机是确定性的，因此重放同一份事件日志会重新进入相同的状态，而无需调用模型。

### 调用方如何获知拒绝信息

调用方收到的拉取请求针对的是第三步。要查看拒绝详情，调用方可以在事件流中读取带有 `hook_abort` 前缀的 `tool.error`，或者注册一个 `on_error` 订阅者。生产级 harness 还会将被拒绝的步骤写入交接包的失败尝试列表中。

## Follow-ups

- **Level 3:** 如果中止发生在规划的最后一步，调用方会收到什么？ Expected: 收到原因为 `goal_met` 的会话结果，因为反思将游标推进到了末尾之后，即使最后一步从未实际运行，因此调用方必须读取事件才能看到被拒绝的步骤。
- **Level 3:** 为什么循环在反思状态而不是在执行状态统计轮数？ Expected: 一轮代表一个已完成的步骤，而反思状态是循环决定继续推进、重新规划还是结束的地方。
- **Level 4:** `_transition` 保护了哪项不变式，缺少它会破坏什么？ Expected: 只有预先列出的状态配对是合法的，因此如果出现直接从等待工具跳转到执行状态的 bug，会抛出异常而不是破坏重放一致性。
- **Level 4:** 你会如何让中止分支发出匹配的 `step.end`？ Expected: 在状态转移前发出 outcome 设为 `aborted` 的 `step.end`，这样每个 start 都有对应的 end，追踪器就能成对匹配它们。

## Wrong answers

- "HookAbort 会作为异常冒泡给调用方。" 循环会捕获该异常、记录它并继续执行，因此调用方看到的是下一个拉取请求或执行结果。
- "被拒绝的步骤会换用不同的工具重试。" 契约规定直接跳过至反思状态并推进游标，重试需要规划器返回新的规划。
- "因为尝试了工具调用，工具调用计数器会增加。" 计数器仅在 hook 检查通过后才会递增，因此被拒绝的调用不会消耗预算。

## Taught in

[harness 循环契约](../../../phases/19-capstone-projects/20-agent-harness-loop-contract/)课程定义了各状态、hook 主题、事件流以及这条中止路径。
