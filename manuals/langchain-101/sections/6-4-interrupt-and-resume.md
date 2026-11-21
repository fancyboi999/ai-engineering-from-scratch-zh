# 中断（interrupt）与恢复（resume）

> `interrupt` 保存运行并把问题返回给调用方，而 `Command(resume=...)` 带着答案，让暂停的节点从第一行重新运行。

你给图加了一个审核步骤。节点写一行日志，请一个人批准，然后记录结论。这个人回答之后，日志行出现了两次。节点并没有从问题处继续，而是从第一行重新运行了。

读完本节，你能用 `interrupt` 暂停节点，用 `Command(resume=...)` 恢复它，并说出哪些代码会运行两次。你还能说出暂停或恢复的结果不符合预期的四种情形。

## 会提问的节点 {#s-interrupt-and-resume-a-node-that-asks-a-question}

**中断（interrupt）：** 节点内部对 `interrupt(value)` 的一次调用。它停止运行，保存一个检查点，并把 `value` 作为问题交给调用方。

录制工具包的图有两个节点。`write` 设置草稿，`review` 请求批准。`runs` 记录节点到达的每一行：

```listing
title: review 节点
source: capture/s_persist.py
lang: python
---
    def review(state):
        runs.append("review before interrupt")
        answer = interrupt({"question": "Approve this draft?", "draft": state["draft"]})
        runs.append(f"review after interrupt: {answer}")
        return {"verdict": "approved" if answer == "yes" else f"rejected: {answer}"}
```

这个图用 `InMemorySaver` 作为 checkpointer。第一次带 `version="v2"` 的 `invoke` 返回了一个中断，状态显示接下来运行 `review`：

```listing
title: 运行等待时的中断与状态
source: capture/out/32-interrupt-resume.txt
lang: json
note: 状态块被截成只剩 next 键。
---
interrupts:
[
  {
    "value": {
      "question": "Approve this draft?",
      "draft": "Ship v2 on Friday."
    },
    "id": "<hex-1>",
    "response_schema": null
  }
]

state:
{
  "next": [
    "review"
  ],
```

中断的值必须能被 JSON 序列化 {{docs oss/python/langgraph/interrupts}}。用默认的 `invoke` 时，中断以键 `__interrupt__` 出现在结果里 {{docs oss/python/langgraph/interrupts}}。

## 恢复从节点的顶部开始运行 {#s-interrupt-and-resume-the-resume-runs-the-node-from-its-top}

**恢复（resume）：** 在与暂停相同的线程上，输入为 `Command(resume=value)` 的 `invoke` 或 `stream` 调用。`interrupt` 调用返回 `value`。

用 `"yes"` 恢复后，运行以结论 `approved` 结束。节点行的日志显示了运行了什么：

```listing
title: 节点到达的行
source: capture/out/32-interrupt-resume.txt
lang: json
---
node runs:
[
  "write",
  "review before interrupt",
  "review before interrupt",
  "review after interrupt: yes"
]
```

`write` 只运行了一次，因为它在暂停之前就已完成。`review` 运行了两次，`interrupt` 之前的那一行在两次运行里都执行了。interrupts 页面也这么说：运行时从头重新启动节点 {{docs oss/python/langgraph/interrupts}}。[图](#fig-6-4)画出了这两次调用。

```figure
id: fig-6-4
kind: sequence
title: 一次中断和一次恢复
claim: 恢复让 review 从第一行运行，所以 interrupt 之前的那一行运行了两次，而 write 没有再次运行。
caption: 从上到下读各行。青色箭头是检查点，琥珀色的行是暂停，下半部分的行属于恢复。右列是运行过的节点函数体的日志。来源：capture/out/32-interrupt-resume.txt。
```

所以 `interrupt` 之前的代码，必须能安全地运行两次。文档要求中断之前的副作用具备幂等性 {{docs oss/python/langgraph/interrupts}}。把副作用移到 `interrupt` 之后，或者移到 review 节点之前自己的节点里。

## 一个节点里的两个问题 {#s-interrupt-and-resume-two-questions-in-one-node}

一个节点可以多次调用 `interrupt`。录制工具包里的节点先问标题，再问正文。第一次运行返回了标题问题。用 `"Release"` 恢复，节点从顶部运行，第一个 `interrupt` 返回 `"Release"`。随后第二个 `interrupt` 以正文问题停住了运行。用 `"Friday"` 恢复后，运行以草稿 `Release: Friday` 结束。

LangGraph 按每个答案在节点里的位置，把它与一个 `interrupt` 调用对应起来。文档警告不要写出在两次运行之间跳过或重排 `interrupt` 调用的代码，也不要把 `interrupt` 放在 `while True` 循环里 {{docs oss/python/langgraph/interrupts}}。自 `langgraph` 1.2.20 起，任务里的每个 `interrupt` 都有自己的 id（来自 `langgraph` 1.2.20 的发布说明，没有在代码里核实）。录制工具包为这两个问题记录了两个不同的 id。

## 带模式的答案 {#s-interrupt-and-resume-an-answer-with-a-schema}

`interrupt` 接受 `response_schema`。用 Pydantic 模型时，LangGraph 会在节点拿到答案之前先检查它。录制工具包用模式 `Verdict` 来提问，它的字段 `approve` 是布尔值。答案 `{'approve': 'maybe'}` 抛出了错误：

```listing
title: 被模式拒绝的答案
source: capture/out/32-interrupt-resume.txt
lang: text
note: pydantic 的帮助行被截掉了。
---
raised pydantic_core._pydantic_core.ValidationError: 1 validation error for Verdict
approve
  Input should be a valid boolean, unable to interpret input [type=bool_parsing, input_value='maybe', input_type=str]
```

出错之后，运行仍然在等节点 `typed`，答案 `{'approve': True}` 让它结束。所以错误的答案不会改变暂停的状态，调用方可以再问一次。中断还带着 `Verdict` 的 JSON 模式，所以用户界面可以据此构建自己的表单。

## 需要知道的四种情形 {#s-interrupt-and-resume-four-cases-to-know}

**没有 checkpointer 的中断。** `interrupt` 的文档字符串说必须有 checkpointer {{code libs/langgraph/langgraph/types.py}}。录制工具包编译了没有 checkpointer 的两问题图，`invoke` 没有抛出错误。它返回了输入状态和中断：

```listing
title: 没有 checkpointer 的中断
source: capture/out/32-interrupt-resume.txt
lang: json
---
returned:
{
  "value": {
    "draft": "",
    "verdict": "",
    "edits": []
  },
  "interrupts": [
    {
      "value": "Title?",
      "id": "<hex-5>",
      "response_schema": null
    }
  ]
}
```

没有任何东西保存这次暂停，所以它无法恢复。没有 checkpointer 的 `Command(resume=...)` 会抛出 `RuntimeError`，文本是 `Cannot use Command(resume=...) without checkpointer` {{code libs/langgraph/langgraph/pregel/_loop.py}}。录制工具包还没有记录这个错误。它的录制会在下一版出现，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他待办项一起。

**恢复一个没在等待的线程。** 录制工具包在 review 线程已经结束之后，给它发了 `Command(resume='x')`。调用没有抛出错误。它返回了已完成的状态，没有中断，也没有运行任何节点：

```listing
title: 恢复一个已结束的线程
source: capture/out/32-interrupt-resume.txt
lang: json
---
returned:
{
  "value": {
    "draft": "Ship v2 on Friday.",
    "verdict": "approved",
    "edits": []
  },
  "interrupts": []
}
```

答案 `x` 不知去向，调用方也没有得到任何提示。恢复之前，先调用 `get_state`，检查 `next` 里有节点名，并且 `tasks` 里有中断。

**过期的答案。** 对一个已被某次恢复用过的中断再给出答案，同样会被接受并被忽略。LangGraph 可以用严格恢复模式拒绝它，但在锁定版本上，唯一的开关是内部配置键 `__pregel_strict_resume` {{code libs/langgraph/langgraph/_internal/_constants.py}}。它对过期答案的检查，只适用于以中断 id 为键的恢复映射 {{code libs/langgraph/langgraph/pregel/_loop.py:1037-1063}}。这个名字以 `__pregel` 开头，所以把它当作私有的，不要依赖它。

**我们测得**两种模式，环境是 x86 服务器客户机上的 Qwen3 4B，每种情形运行 3 次。每一步在 `SqliteSaver` 上的一个新进程里运行。一个 `per_call` 模式的 agent 发出了两个需要审批的调用。第一次恢复按中断 id 批准了其中一个调用，第二次恢复又发了同样的答案。设置了 `__pregel_strict_resume` 时，第二次恢复在 3 次运行里 3 次抛出 `UnknownInterruptError: Unknown or already-consumed interrupt`。

没有设置它时，第二次恢复在 3 次运行里 3 次既没有抛出错误，也没有运行任何东西。每次运行里，`send_email` 都运行了一次，模型也运行了一次。

**NodeInterrupt。** 旧代码在节点里抛出 `NodeInterrupt`。这个类在锁定版本上已弃用，它的警告指向 `interrupt` {{code libs/langgraph/langgraph/errors.py}}。

```takeaways
- 让 interrupt 之前的代码能安全地运行两次，或者把它移到别的节点。
- 在与暂停相同的 thread_id 上，用 Command(resume=...) 恢复。
- 调用 interrupt 之前，先带 checkpointer 编译。
- 发出恢复之前，先检查 get_state().next 和它的中断。
- 由用户界面发送答案时，给 interrupt 一个 response_schema。
- 让一个节点里 interrupt 调用的顺序在每次运行中保持一致。
```

来源：capture/s_persist.py, capture/out/32-interrupt-resume.txt; capture/lab/summary/approvals-x86.json, capture/lab/T07-approvals-x86/01-cases.jsonl; libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/errors.py, libs/langgraph/langgraph/pregel/_loop.py, and libs/langgraph/langgraph/_internal/_constants.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/interrupts).
