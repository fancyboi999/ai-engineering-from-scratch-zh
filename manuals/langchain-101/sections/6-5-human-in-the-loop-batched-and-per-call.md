# 人在回路：HumanInTheLoopMiddleware 的批量模式与逐调用模式

> `HumanInTheLoopMiddleware` 会暂停工具调用等待审核，而 `per_call` 模式更安全：批量模式下，编辑可以把调用换成另一个工具，会跳转的中间件也能跳过审核。

你的 agent 能发邮件、删文件，每个调用执行之前都必须有人审批。你只需添加一个中间件，并给它一份工具名列表。审核人把某个调用改成指向另一个工具，在一种模式下那个工具会真的运行，在另一种模式下同样的编辑会报错。

读完本节，你能暂停指定的工具调用等待审核，并用四种决定之一回应每次暂停。你还能选出让审核始终生效的配置。

## 哪些调用会暂停 {#s-human-in-the-loop-batched-and-per-call-which-calls-pause}

**HumanInTheLoopMiddleware：** 当模型请求的工具出现在 `interrupt_on` 映射里时，让 agent 暂停的中间件。它会为每个这样的调用等待一个决定。

`interrupt_on` 映射接受工具名加 `True`（允许全部四种决定），或者带 `allowed_decisions` 的配置。录制工具包给 `add` 开放了全部决定，给 `lookup_order` 只开放两种：

```listing
title: 两个工具受审核的 agent，批量模式
source: capture/s_middleware.py
lang: python
---
    agent = create_agent(m, tools=[add, lookup_order], middleware=[HumanInTheLoopMiddleware(interrupt_on={"add": True, "lookup_order": {"allowed_decisions": ["approve", "reject"]}})], checkpointer=checkpointer)
```

不在映射里的工具直接运行，不会暂停。这个中间件通过 `interrupt` 暂停，所以 agent 需要 checkpointer，[第 6.4 节](#s-interrupt-and-resume)已经展示过。human-in-the-loop 文档页在生产环境推荐 `AsyncPostgresSaver` {{docs oss/python/langchain/human-in-the-loop}}。

## 四种决定 {#s-human-in-the-loop-batched-and-per-call-the-four-decisions}

**决定（decision）：** 对一个已暂停工具调用的回答。它的 `type` 是 `approve`、`edit`、`reject` 或 `respond`。

| 决定 | 审核人发送 | 工具是否运行 | 模型收到的 ToolMessage |
|---|---|---|---|
| `approve` | `{"type": "approve"}` | 是，使用模型给出的参数 | 工具结果，状态为 `success` |
| `edit` | 带 `name` 和 `args` 的 `edited_action` | 是，使用编辑后的参数 | 先是一条通知，然后是工具结果 |
| `reject` | 可选的 `message` | 否 | 拒绝理由，状态为 `error` |
| `respond` | 一条 `message` | 否 | 这条消息，状态为 `success` |

`respond` 适用于真正的答案要由人来给的工具。模型会把它的消息当作一次成功的结果来读。文档说，不要用 `respond` 拒绝有副作用的工具 {{docs oss/python/langchain/human-in-the-loop}}。录制工具包说明了原因：模型分不清这条回答和真正的工具结果。要拒绝，就用 `reject`。

## 批量模式 {#s-human-in-the-loop-batched-and-per-call-batched-mode}

**批量模式：** 默认的 `interrupt_mode`。一次中断装下同一条模型消息里所有暂停的调用，一次恢复按顺序回答它们全部。

录制工具包让 Qwen3 4B 在一条回复里同时调用 `add` 和 `lookup_order`，它做到了。运行因此只暂停了一次。中断的值列出了各个调用，以及每个调用允许的决定：

```listing
title: 两个调用共用一次中断
source: capture/out/15-mw-hitl-batched.txt
lang: json
note: 已截掉描述和 lookup_order 的参数。
---
interrupts:
[
  {
    "value": {
      "action_requests": [
        {
          "name": "add",
          "args": {
            "a": 2,
            "b": 3
          },
…
        {
          "name": "lookup_order",
…
      "review_configs": [
        {
          "action_name": "add",
          "allowed_decisions": [
            "approve",
            "edit",
            "reject",
            "respond"
          ]
        },
        {
          "action_name": "lookup_order",
          "allowed_decisions": [
            "approve",
            "reject"
          ]
        }
      ]
```

运行等待期间，`next` 是 `HumanInTheLoopMiddleware.after_model`。恢复时发送一个决定列表，每个调用一个，顺序与 `action_requests` 相同。录制工具包把 `add` 编辑成 20 和 30，并拒绝了 `lookup_order`：

```listing
title: 批量模式下两个调用的恢复
source: capture/s_middleware.py
lang: python
note: 录制工具包根据中断构造这个列表，所以模型发出的每个调用都有一个决定。
---
    decisions = []
    for request in gated(result):
        if request["name"] == "add":
            decisions.append({"type": "edit", "edited_action": {"name": "add", "args": {"a": 20, "b": 30}}})
        else:
            decisions.append({"type": "reject", "message": "Do not look up orders."})
    result = agent.invoke(Command(resume={"decisions": decisions}), cfg, version="v2")
```

模型收到了两条 `ToolMessage`。被拒绝的调用排在前面。被编辑的调用用新参数运行，它的结果以一条通知开头，告诉模型实际运行了什么：

```listing
title: 恢复之后的两条 ToolMessage
source: capture/out/15-mw-hitl-batched.txt
lang: json
note: 已截掉名称和 id。
---
    "type": "ToolMessage",
    "content": "User rejected the tool call for `lookup_order` with reason: Do not look up orders.",
…
    "tool_call_id": "<uuid-3>",
    "status": "error"
…
    "type": "ToolMessage",
    "content": "Note: a human reviewer replaced this tool call before it ran. The call recorded in your message is the one you produced, not the one that executed. This was intentional and authorized. Do not re-issue your original call. Executed instead: add with arguments {\"a\": 20, \"b\": 30}.\n\nTool response:\n50",
…
    "tool_call_id": "<uuid-2>",
    "status": "success"
```

随后模型回答 `The result of the addition is 50.`。状态里的 `AIMessage` 仍然保留着原始调用，参数是 2 和 3。给两个调用只发一个决定的列表，会抛出 `ValueError: Number of human decisions (1) does not match number of hanging tool calls (2).`，什么都不会运行。

## 逐调用模式 {#s-human-in-the-loop-batched-and-per-call-per-call-mode}

**逐调用模式：** `interrupt_mode="per_call"`。每个暂停的调用有自己的中断和一个 `response_schema`，一次恢复可以按中断 id 回答其中任意一个。

```listing
title: 逐调用模式下的 agent
source: capture/s_middleware.py
lang: python
---
    agent = create_agent(m, tools=[add], middleware=[HumanInTheLoopMiddleware(interrupt_on={"add": True}, interrupt_mode="per_call")], checkpointer=InMemorySaver())
```

模型在一条回复里请求了两次 `add`，参数分别是 2 和 3、4 和 5。运行暂停后有两个中断，`next` 是 `["tools", "tools"]`。每个中断对应一个调用：

```listing
title: 第一个调用的中断
source: capture/out/16-mw-hitl-per-call.txt
lang: json
note: 已截掉描述。
---
interrupt for add(2, 3):
{
  "id": "<hex-1>",
  "value": {
    "type": "tool_approval",
    "tool_call_id": "<uuid-1>",
    "name": "add",
    "args": {
      "a": 2,
      "b": 3
    },
```

每个中断的 `response_schema` 都允许四种决定。在它的 `EditedAction` 里，工具名是常量，所以编辑不能指向另一个工具：

```listing
title: 响应模式里的 edited action
source: capture/out/16-mw-hitl-per-call.txt
lang: json
note: 取自第一个中断的模式中的一个定义。
---
    "EditedAction": {
      "properties": {
        "name": {
          "const": "add",
          "title": "Name",
          "type": "string"
        },
```

录制工具包用一个从中断 id 到决定的映射来恢复：批准第一个调用，拒绝第二个。第一个 `add` 返回了 `5`，第二个收到了状态为 `error` 的拒绝理由。模型没有报告那个 5，而是回答 `I see that the tool call was rejected.`，并提出再试一次。被模式拒绝的回答会抛出异常，运行继续等待。录制工具包在一个工具上只允许 `approve`，然后发送了 `reject`：

```listing
title: 超出允许范围的决定
source: capture/out/16-mw-hitl-per-call.txt
lang: text
note: 已截掉 pydantic 的帮助行。
---
raised pydantic_core._pydantic_core.ValidationError: 1 validation error for ApproveDecision
type
  Input should be 'approve' [type=literal_error, input_value='reject', input_type=str]
```

报错之后，`next` 仍然是 `["tools"]`。逐调用模式需要 `langchain` 1.4.6 或更高版本。文档建议新 agent 使用它，并计划在下一个主版本把它设为默认 {{docs oss/python/langchain/human-in-the-loop}}。[图](#fig-6-5)把两种模式并排放在一起。

```figure
id: fig-6-5
kind: comparison
title: 批量模式与逐调用模式
claim: 批量模式用一个列表回答同一条消息的所有调用，逐调用模式则按中断 id 对照模式逐个回答每个调用。
caption: 请跨两列逐行阅读。各行依次是暂停、恢复、把编辑改成另一个工具，以及跳转到 tools 的中间件。玫瑰色单元格是审核没有生效的地方。来源：capture/out/15-mw-hitl-batched.txt、capture/out/16-mw-hitl-per-call.txt 和 capture/lab/summary/approvals-x86.json。
```

## 实验记录的发现 {#s-human-in-the-loop-batched-and-per-call-what-the-lab-found}

**我们测量了** x86 服务器客户机上的这个中间件：25 个模型用例，每个跑 3 次。模型是 Ollama 上的 Qwen3 4B（temperature 0，seed 42）。图用例 G1 和 G2 没有模型，来自 Mac。工具是 `send_email` 和 `delete_file`，都在审核之下。

每次启动和每次恢复都在新进程里对 `SqliteSaver` 运行，所以每次恢复都是一次重启。每个用例的 3 次运行得到了相同的工具运行结果。[图](#fig-6-5b)展示了每一次运行。

```figure
id: fig-6-5b
kind: chart
title: 每个审批用例的工具运行
claim: 每个用例在 3 次运行里都得到相同的工具运行结果，而且只有批量用例运行了没有任何审批允许的工具。
caption: 每一列是 22 个中间件用例之一。图和严格恢复用例 G1 到 G3、S1、S2 没有画出。每个点是 x86 服务器客户机上的一次运行。落在线上的点表示工具运行与决定一致，玫瑰色点表示运行了没有任何审批允许的工具。来源：capture/lab/summary/approvals-x86.json。
```

图里的灰线是每个用例中审核人允许运行的工具次数。图的代码把这些次数写成了常量。它们来自下表中的决定，以及 `capture/lab/T07-approvals-x86/` 里的用例脚本。用例有简短的代号：`B` 是批量，`P` 是逐调用，`J` 表示加了一个会跳转到 `tools` 的中间件，`G` 是普通图。

| 用例 | 审核人做了什么 | 结果，3 次运行都一样 |
|---|---|---|
| B2、P2 | 编辑 `send_email` 的参数 | 只有编辑后的调用运行 |
| B3 | 把 `send_email` 编辑成对 `delete_file` 的调用 | `delete_file` 运行了 |
| P3 | 在逐调用模式下做同样的编辑 | `ValidationError`，没有任何运行 |
| B4、P4 | 拒绝 | 没有任何运行，状态为 `error` |
| B5、P5 | respond | 没有任何运行，状态为 `success` |
| P7 | 逐个回答两个调用 | 每个调用只运行一次 |
| P8 | 给两个等待中的调用一个普通值 | `RuntimeError`，没有任何运行 |
| J1、J3 | 批量，会跳转的中间件在列表里排在审核中间件之后 | `send_email` 一开始就运行了，早于任何决定 |
| J2 | 批量，会跳转的中间件排在最前，拒绝 | `send_email` 运行了，状态里有两条 ToolMessage 对应同一个调用 |
| J4、J5 | 逐调用，两种顺序，拒绝 | 没有任何运行 |
| G1、G2 | 图和子图里的两个并行中断，逐个回答 | 每个分支的副作用只运行一次 |

在 10 个含两个动作的请求中，Qwen3 4B 和 Qwen3 8B 各有 9 次发出了两个或更多调用。所以批量审核多个调用是常见情形。

B3 这一行解决了冲突 D102。文档里有一个批量示例把调用编辑成新工具名，而逐调用部分的文字保持名称不变。1.4.6 的更新日志说，编辑不能切换工具 {{docs oss/python/releases/changelog}}。在锁定版本上，批量模式仍然允许切换，逐调用模式则拒绝。

J 这几行在批量模式下复现了 issue langchain#40492 {{issue langchain#40492}}。会跳转的中间件在 `after_model` 里返回 `jump_to="tools"`。`after_model` 钩子按中间件列表的相反顺序运行。所以在 J1 和 J3 里，它的钩子先于审核钩子运行，并跳过了审核。

在 J2 里，审核运行了，调用被拒绝，但跳转仍然运行了工具。J2 里同一个调用对应两条 ToolMessage，违反了[第 3.4 节](#s-tools-toolruntime-and-tool-errors)的规则：每个工具调用只有一个回答。逐调用模式把暂停放在工具调用本身，跳转没有跳过它。

另外两个较早的 issue 没有复现。issue langchain#33787 说，编辑之后仍可能运行原始调用 {{issue langchain#33787}}。在 B2 和 P2 里，只有编辑后的调用运行。issue langgraph#9106 说，恢复会让已完成的并行分支再次运行 {{issue langgraph#9106}}。在 G1 和 G2 里，已完成的分支没有再次运行。仍在等待的分支每次恢复时会把节点运行到 `interrupt` 为止，这是第 6.4 节的规则。

## 安全配置 {#s-human-in-the-loop-batched-and-per-call-the-safe-configuration}

在实验记录的运行里，这些设置让每次审核都保持有效：

1. 设置 `interrupt_mode="per_call"`，让编辑停留在原工具上，让跳转到 `tools` 的操作不能跳过审核。
2. 使用能挺过重启的 checkpointer，例如 `SqliteSaver` 或 `PostgresSaver`。
3. 为每个工具只允许你需要的决定。有副作用的工具去掉 `respond` 和 `edit`，用 `reject` 拒绝。
4. 按 id 回答每个中断，并在恢复之前用 `get_state` 检查 `next`。
5. 带审核的 agent 里不要放会跳转到 `tools` 的中间件，除非你在自己的模式下测试过。
6. 按文档所说，把 `HumanInTheLoopMiddleware` 列在工具重试和错误中间件之前 {{docs oss/python/langchain/human-in-the-loop}}。

Agent Chat UI 只回答批量审批，而且输入一条消息会把待处理的审批当作成功关闭。见[聊天界面一节](#s-agent-chat-ui-in-front-of-langgraph-dev)。

文档还警告了一种情况：一起发送的多个回答里有一个无效。有效回答对应的工具可能已经运行，而它们的中断看起来仍在等待，第二次回答会让它们运行两次 {{docs oss/python/langchain/human-in-the-loop}}。所以一次只回答一个中断，并让副作用具备幂等性。组合恢复失败之后，先检查工具做了什么，再重新发送回答。实验记录没有运行这种情况，也没有运行任何使用 `PostgresSaver` 的用例。两者都留到下一版，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他未决项放在一起。

```takeaways
- 每个带审核的新 agent 都设置 interrupt_mode="per_call"。
- 用 reject 拒绝调用，不要用 respond。
- 审核人不能修改调用时，从 allowed_decisions 里去掉 edit。
- 先检查 get_state().next，再按 id 回答每个逐调用中断。
- 带审核的 agent 里不要放会跳转到 tools 的中间件。
- 使用能挺过重启的 checkpointer，因为审核人可能数小时后才回答。
```

来源：capture/s_middleware.py, capture/out/15-mw-hitl-batched.txt, capture/out/16-mw-hitl-per-call.txt; capture/lab/summary/approvals-x86.json, capture/lab/T07-approvals-x86/00-survey.jsonl, capture/lab/T07-approvals-x86/01-cases.jsonl, capture/lab/T07-approvals-x86/02-g3-rerun.jsonl, capture/lab/T07-approvals-x86/t07_child_real.py; capture/lab/summary/approvals-mac.json, capture/lab/T07-approvals-mac/01-cases.jsonl; libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py at langchain==1.5.0; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/human-in-the-loop, oss/python/releases/changelog); issues langchain-ai/langchain#40492, #33787, and langchain-ai/langgraph#9106, read 2026-11-14.
