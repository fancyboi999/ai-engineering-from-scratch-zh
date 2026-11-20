# 子图与多 agent 模式

> 子图与父图共享键，并在自己的命名空间里运行，它的整个输出会经过父图的 reducer，旧条目可能因此被加两次。

你构建了一个检查草稿的图，并把它作为节点加进更大的图里。运行没有问题，但父图里的步骤日志却把第一个条目记了两次。子图里没有任何节点写过两次。是父图的 reducer 把子图的整个输出加进了自己的列表。

读完本节，你能把图或 agent 作为节点加入，并读懂它的块所在的命名空间。你还能在它内部暂停，并为多个 agent 选择一种模式。

## 把图当作节点 {#s-subgraphs-and-multi-agent-patterns-a-graph-as-a-node}

**子图（subgraph）：** 作为另一个图的节点使用的已编译图。当两个状态模式共享键时，子图读写的就是父图的键。

录制工具包的内层图把文本转成大写，然后询问结果是否可以。外层图加上 `!`，运行内层图，然后结束。两者都使用模式 `Inner`，其中 `steps` 键的 reducer 是 `operator.add`：

```listing
title: 内层图与外层图
source: capture/s_graph.py
lang: python
note: 已截掉内层图的模式和节点函数。
---
    inner = StateGraph(Inner)
    inner.add_node("shout", shout)
    inner.add_node("ask_ok", ask_ok)
    inner.add_edge(START, "shout")
    inner.add_edge("shout", "ask_ok")
    inner_app = inner.compile()

    outer = StateGraph(Inner)
    outer.add_node("prepare", lambda s: {"text": s["text"] + "!", "steps": ["outer.prepare"]})
    outer.add_node("inner", inner_app)
    outer.add_node("finish", lambda s: {"steps": ["outer.finish"]})
    outer.add_edge(START, "prepare")
    outer.add_edge("prepare", "inner")
    outer.add_edge("inner", "finish")
    app = outer.compile(checkpointer=InMemorySaver())
```

内层图没有自己的 checkpointer。只有外层图使用 `InMemorySaver`。`get_graph(xray=True)` 会把内层节点画在名为 `inner` 的方框里，节点 id 形如 `inner:shout`。

[图](#fig-6-7b)用两次调用各自的 Mermaid 文本，把父图画了两遍。

```figure
id: fig-6-7b
kind: comparison
title: 同一个父图，开启与不开启 xray
claim: get_graph() 把子图显示为一个名为 inner 的节点，get_graph(xray=True) 则把它展开成方框里的 shout 和 ask_ok。
caption: 请从顶部开始读每一列。右边的虚线框是子图。父图的边连到它的第一个节点，并从它的最后一个节点引出。来源：capture/out/52-draw-subgraph.txt。
```

## 命名空间 {#s-subgraphs-and-multi-agent-patterns-namespaces}

**命名空间（namespace）：** 子图在父图内运行的路径，例如 `inner:<task id>`。流的块、检查点和状态都带着它。

`stream(..., subgraphs=True)` 产生由命名空间和块组成的二元组。根图的命名空间为空。`ask_ok` 的中断出现了两次，一次来自子图，一次来自根图：

```listing
title: 带命名空间的块
source: capture/out/36-subgraphs.txt
lang: json
note: 第一次运行的四个块，只保留命名空间和第一个键。
---
  "namespace": [],
  "chunk": {
    "prepare": {
…
  "namespace": [
    "inner:<uuid-1>"
  ],
  "chunk": {
    "shout": {
…
  "namespace": [
    "inner:<uuid-1>"
  ],
  "chunk": {
    "__interrupt__": [
…
  "namespace": [],
  "chunk": {
    "__interrupt__": [
```

运行等待期间，`get_state(config, subgraphs=True)` 会显示两个层级。父图在节点 `inner` 上等待，子图在 `ask_ok` 上等待。任务的状态里装着子图内部的值。在父图的线程上用 `"yes"` 恢复，就能到达 `ask_ok`，并让两个图都结束。

## 输出会经过父图的 reducer {#s-subgraphs-and-multi-agent-patterns-the-output-passes-through-the-parent-reducer}

下面是恢复之后的最终状态：

```listing
title: 外层图的最终状态
source: capture/out/36-subgraphs.txt
lang: json
---
{
  "text": "HELLO!",
  "steps": [
    "outer.prepare",
    "outer.prepare",
    "inner.shout",
    "inner.ask_ok=yes",
    "outer.finish"
  ]
}
```

`outer.prepare` 出现了两次，而没有任何节点写过两次。子图启动时 `steps` 是 `["outer.prepare"]`，随后它又添加了两个条目，并把三个条目一起作为输出返回。父图把这份输出当作一次更新应用，`operator.add` 把它接到已经含有 `outer.prepare` 的列表后面。[图](#fig-6-7)跟踪了这个列表在整次运行中的变化。

```figure
id: fig-6-7
kind: flow
title: steps 列表穿过子图
claim: 子图返回了收到的整个 steps 列表，父图里的 operator.add 又把它接了一遍，所以 outer.prepare 出现两次。
caption: 请从左往右读。每个方框显示一个节点之后的 steps，虚线框是子图的命名空间。玫红色条目是父图的 reducer 添加的副本。来源：capture/out/36-subgraphs.txt。
```

任何只做追加的 reducer 都会添加这个副本。`add_messages` 会替换 id 相同的消息，[第 6.1 节](#s-stategraph-state-and-reducers)已经展示过，所以它的副本会替换原件。

有两种改法可以避免副本。一是在节点内部调用子图，只返回它新增的条目；二是给子图一个不含共享键的模式。子图页面把第一种描述为模式不共享键时的做法 {{docs oss/python/langgraph/use-subgraphs}}。录制工具包还没有运行这两种改法，也没有运行带 `add_messages` 的子图。它们的录制留到下一版，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他未决项放在一起。

## 子图的持久化 {#s-subgraphs-and-multi-agent-patterns-persistence-of-a-subgraph}

子图的 `compile` 接受 `checkpointer=None`、`True` 或 `False`。默认的 `None` 让子图的每次调用都有自己全新的状态，并使用父图的 checkpointer 处理中断。`True` 在线程上跨调用保留子图的状态，`False` 则关闭检查点 {{docs oss/python/langgraph/use-subgraphs}}。录制工具包用的是 `None`，子图内部的中断通过父图暂停并恢复。录制工具包还没有运行 `True` 或 `False`。它们留到下一版，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他未决项放在一起。

## 把 agent 当作节点 {#s-subgraphs-and-multi-agent-patterns-an-agent-as-a-node}

`create_agent` 生成的图是已编译图，所以它也可以做节点。录制工具包把一个名为 `adder` 的 agent 加进了使用 `MessagesState` 的图。带 `subgraphs=True` 的流显示：agent 的三次节点运行都在它自己的命名空间里，随后根图里有一个属于 `adder` 的块：

```listing
title: 父图里的 agent
source: capture/out/45-subgraph-agent.txt
lang: json
note: 四个块中的第一个和最后一个。
---
{
  "namespace": [
    "adder:<uuid-1>"
  ],
  "nodes": [
    "model"
  ]
}
…
{
  "namespace": [],
  "nodes": [
    "adder"
  ]
}
```

[第 6.5 节](#s-human-in-the-loop-batched-and-per-call)的审批实验还把一个逐调用模式的 Qwen3 4B agent 当作子图运行了 3 次。两个需要审批的调用被逐个回答，每个工具只运行一次。

## 多个 agent 的模式 {#s-subgraphs-and-multi-agent-patterns-patterns-for-several-agents}

文档的 multi-agent 页面列出了五种模式：subagents、`handoffs`、skills、路由器（router）和自定义工作流 {{docs oss/python/langchain/multi-agent/index}}。它还说，配备合适工具和提示词的单个 agent，往往和多个 agent 做得一样好。subagents 页面说，`langgraph-supervisor` 包已不再维护 {{docs oss/python/langchain/multi-agent/subagents}}。

**子 agent（subagent）：** 被另一个 agent 当作工具调用的 agent。调用方只能看到子 agent 的最后一条消息。

Deep Agents 给每个 agent 一个启动子 agent 的 `task` 工具。在录制工具包的运行里，主 agent 用它自己写的描述调用了 `task`，子 agent 用一句话作答：

```listing
title: task 调用及其回答
source: capture/out/41-deep-agent.txt
lang: json
note: 主 agent 的第四次模型调用，以及回答它的 ToolMessage。
---
        "name": "task",
        "args": {
          "description": "Verify that 2 + 3 equals 5 by performing a mathematical calculation and confirming the result.",
          "subagent_type": "general-purpose"
        },
        "id": "<uuid-11>",
        "type": "tool_call"
…
    "type": "ToolMessage",
    "content": "2 + 3 equals 5. This is a basic arithmetic fact and can be verified through direct calculation: 2 plus 3 is indeed 5.",
    "name": "task",
```

子 agent 的模型调用是六次调用中的第五次。它收到两条消息，即它自己的系统提示词和那条描述，而且它的工具里没有 `task`。主 agent 只看到一条带有子 agent 回答的 `ToolMessage`。所以子 agent 把它的工作过程挡在调用方的上下文之外。第 7 部分会讲 Deep Agents。

## 同一套任务上的五种模式 {#s-subgraphs-and-multi-agent-patterns-five-patterns-on-one-task-suite}

**我们测得**五种模式，任务取自[第 1.2 节](#s-do-you-need-langchain)那 30 个任务的子集，使用 `langchain` 1.5.0 和 `deepagents` 0.7.38。五个领域 agent 分担任务集的工具：`shop`、`orders_db`、`docs`、`files` 和 `notes`。这些模式是：

- **single：** 一个 agent 拥有全部工具，提示词里带着五份领域指南。
- **subagents：** 一个 Deep Agents 协调者，通过 `task` 调用每个领域 agent。
- **`handoffs`：** 领域 agent 作为图的节点，配有返回 `Command(goto=..., graph=Command.PARENT)` 的 `transfer_to_<agent>` 工具。
- **skills：** 一个 agent 带有 `load_skill` 工具，把领域指南加进自己的提示词。
- **router：** 一个分类器把并行请求发给各个领域 agent，再交给一个综合者 agent。

Claude Haiku 5.5 从 Mac 通过 API 运行。Qwen3 14B 在同一台 Mac 上的 Ollama 0.31.1 上运行，temperature 为 0，seed 为 42。每个单元格对 30 个任务各运行一次。

这台 Mac 是共享的。我们记录的六次采样里，负载均值在 2.7 到 9.1 之间。Ollama 服务器还在忙别的任务。我们在 gpt-oss 20B 的第一个任务之前就停掉了它的运行，所以它没有数据行。

| 模式 | Haiku 通过数 | Haiku 调用数 | Haiku 提示词 token | Haiku 费用 | 14B 通过数 | 14B 调用数 | 14B 提示词 token |
|---|---|---|---|---|---|---|---|
| single | 30 | 160 | 521,013 | $0.0130 | 22 | 140 | 251,620 |
| subagents | 30 | 271 | 1,247,292 | $0.0380 | 17 | 164 | 425,288 |
| `handoffs` | 30 | 187 | 373,993 | $0.0134 | 19 | 151 | 163,200 |
| skills | 30 | 194 | 314,352 | $0.0129 | 15 | 159 | 151,631 |
| router | 25 | 226 | 317,648 | $0.0237 | 18 | 187 | 105,174 |

在 Haiku 上，四种模式 30 个任务全部通过，router 通过 25 个。router 丢了 3 个链式任务，sql 和检索各丢 1 个，类别都是 `wrong_final_state`。成本的差异比得分的差异更大。subagents 模式用掉的提示词 token 是单个 agent 的 2.4 倍，费用是 2.9 倍。`handoffs` 和 skills 模式的费用与单个 agent 相当。[图](#fig-6-7c)展示了每种模式里的一个链式任务。

```figure
id: fig-6-7c
kind: timeline
title: Haiku 上五种模式各自完成一个链式任务
claim: 在同一个链式任务上，五种模式用了 5 到 7 次模型调用，其中 subagents 模式让两个 agent 一前一后地运行。
caption: 每个方框是一次模型调用，按顺序编号，位于发起它的 agent 所在的泳道。三角形标记工具调用。来源：capture/lab/summary/multiagent-mac.json。
```

有三个用户轮次的任务，更能看出一种模式的成本。在 `multi07` 上，每种模式都通过了。单个 agent 发起 9 次模型调用，读了 30.2k 个提示词 token。subagents 模式发起 16 次调用，读了 72.6k，router 发起 18 次调用。[图](#fig-6-7d)画出了这五次运行，并标出每个用户轮次的开始。

```figure
id: fig-6-7d
kind: timeline
title: Haiku 上五种模式各自完成一个三轮任务
claim: 在三轮任务上，单个 agent 发起了 9 次模型调用，其他模式发起了 12 到 18 次。
caption: 每个方框是一次模型调用，按顺序编号，位于发起它的 agent 所在的泳道。虚线标记用户轮次的开始。来源：capture/lab/summary/multiagent-mac.json。
```

在 Qwen3 14B 上情况不同。单个 agent 通过了 30 个中的 22 个，没有任何模式做得更好。subagents 通过 17 个，skills 通过 15 个。两者在 6 个文件任务和 6 个多轮任务上都是 0 通过。subagents 失败了 13 个任务，skills 失败了 15 个，大多是 `wrong_final_state`。五个单元格的区间互相重叠，所以只有那些零是明确的。

每个 14B 单元格是每个任务运行一次，运行在负载很高的共享 Mac 上，所以再跑一次可能让个别任务的结果改变。

14B 每个任务的墙钟时间从 91 秒到 315 秒不等，它更多反映的是负载，而不是模式。

```takeaways
- 预期共享了追加型键的子图会把它的输入条目加两次。
- 当父图的键带有追加型 reducer 时，子图只返回新增的条目。
- 用 stream(subgraphs=True) 读每个块的命名空间。
- 在父图的线程上恢复子图内部的中断。
- 先从一个 agent 开始，当任务需要自己的上下文时再加子 agent。
- 在你的模型上测量模式，因为在 Qwen3 14B 上 subagents 和 skills 的 6 个多轮任务全部没有通过。
```

来源：capture/s_graph.py, capture/out/36-subgraphs.txt, capture/out/52-draw-subgraph.txt, capture/out/45-subgraph-agent.txt, capture/out/41-deep-agent.txt; capture/lab/summary/approvals-x86.json, capture/lab/summary/multiagent-mac.json, capture/lab/multiagent/runs/patterns-haiku.jsonl, capture/lab/multiagent/runs/patterns-qwen3-14b.jsonl, capture/lab/multiagent/kit/patterns.py, capture/lab/multiagent/logs/uptime.log; libs/langgraph/langgraph/pregel/main.py and libs/langgraph/langgraph/types.py at langgraph 1.2.22; libs/deepagents/deepagents/graph.py at deepagents==0.7.38; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/use-subgraphs, oss/python/langchain/multi-agent/index, oss/python/langchain/multi-agent/subagents).
