---
id: budget-exhausted-looks-like-an-answer
title: "阅读循环：调用方在轮数耗尽时获得什么"
card: agents
kind: code-reading
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, debugging]
tags: [agent-loop, turn-budget, code-reading, return-type]
minutes: 8
lessons: [phases/14-agent-engineering/01-the-agent-loop, phases/19-capstone-projects/20-agent-harness-loop-contract]
manuals: []
practice: []
cheatsheet: [agent-harness]
related: [agents/the-agent-loops-forever]
updated: 2026-11-03
---

阅读这个简易 agent 循环中的 run 方法。调用方将返回的字符串作为答案展示给用户。这个契约有什么问题，你会如何修改？

```python
def run(self, user_message: str) -> str:
    self.history.append(Turn(kind="user", content=user_message))
    for step in range(self.max_turns):
        reply = self.llm.respond(self.history)
        if reply["kind"] == "finish":
            self.history.append(Turn(kind="final", content=reply["content"]))
            return reply["content"]
        thought = reply.get("thought", "")
        self.history.append(Turn(kind="thought", content=thought))
        call = ToolCall(name=reply["action"], args=reply.get("args", {}))
        observation = self.tools.dispatch(call)
        self.history.append(Turn(kind="action", content=call.name, tool_call=call, observation=observation))
    self.history.append(Turn(kind="final", content="budget exhausted"))
    return "budget exhausted"
```

## Short answer

该方法在两种情况下都返回普通字符串，调用方无法区分真实答案与达到上限的运行。`budget exhausted` 文本会被直接展示给用户，就像模型自己说的回答一样。修复方法是返回带原因的类型化结果，或者像 harness 契约那样让出控制权，由调用方决定是追加预算还是终止。

## Full answer

### 代码做了什么

循环最多运行 `max_turns` 次迭代。每次迭代请求模型给出一个回复。`finish` 类型的回复会结束运行并返回其内容。任何其他回复都被视为操作：循环记录思考，分发工具调用，并追加观察结果。当循环耗尽迭代次数时，它会追加一个内容为 `budget exhausted` 的最终轮，并返回该文本。

### 三个问题

1. **两种结果混用同一种返回类型。** 正常完成的运行和达到上限截断的运行都返回 `str`。调用方没有任何字段可供判断。任何将结果直接展示给用户的代码都会把达到上限的消息当作答案显示出来。
2. **达到上限成了死胡同。** 部分状态保留在 `self.history` 中，但没有任何机制告诉调用方可以继续运行。Harness 契约将预算耗尽视为让出控制权：它发出 `budget.warn`，触发 `on_budget_exceeded`，并返回带有明确原因的拉取请求。调用方检查状态后调用 `resume`。
3. **既没有 action 也没有 finish 的回复会导致崩溃。** 代码对每个非 finish 回复都会读取 `reply["action"]`。如果模型直接用自然语言回答而没有工具调用，就会抛出 `KeyError`。课程将没有工具调用的轮次列为正常的停止条件。

### 修改方案

返回一个包含最终文本、状态原因（如 `finished`、`budget` 或 `no_tool_call`）以及轮数计数的小型结果对象。在对象上保留历史记录，以便调用方可以恢复运行或交接。将没有 action 的回复视为正常停止而非异常。将预算视为针对本次调用的限制，并交由调用方在达到限制后决定后续动作。

## Follow-ups

- **Level 2:** 在这段代码中，观察结果的格式化器在哪里？ Expected: 位于 `tools.dispatch` 内部，它针对未知工具、非法参数或异常返回错误字符串，因此模型始终能拿到字符串。
- **Level 2:** 工具抛出了异常，模型在下一轮会看到什么？ Expected: 以 `error:` 开头并带有异常类型和文本的观察结果，这使得模型能够自我纠正调用。
- **Level 3:** Harness 在因预算暂停后如何知道恢复到什么状态？ Expected: 它在暂停前记录先前的状态，在恢复时重置计数器，并根据该记录重新进入执行或反思状态。
- **Level 3:** Harness 的什么特性使得保存的追踪记录无需模型即可重放？ Expected: 状态机是确定性的，因此相同的事件日志会重新进入相同的状态。

## Wrong answers

- "在达到上限时返回空字符串，让调用方去处理。" 空字符串仍然是字符串，调用方依然没有原因代码可供测试。
- "在达到上限时抛出异常。" 部分历史记录是有价值的，而异常会迫使调用方从零重新开始，无法继续恢复执行。
- "将最大轮数设得足够高，以确保永远不会达到上限。" 上限是为了不收敛的运行而存在的，过高的上限只会让这类运行拖得更长。

## Taught in

[Agent 循环：观察、思考、行动](../../../phases/14-agent-engineering/01-the-agent-loop/)课程提供了该循环，[harness 循环契约](../../../phases/19-capstone-projects/20-agent-harness-loop-contract/)课程用调用方可恢复的拉取点替代了纯字符串。
