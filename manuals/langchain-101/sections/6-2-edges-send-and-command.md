# 边、Send 与 Command

> 普通边总会执行，条件边根据状态选择，`Send` 为每一项启动一个任务，`Command` 在一次返回里同时更新和路由。

你有一个主题列表，长度到运行时才知道，你想为每个主题调用一次模型。之后，有一个节点必须在两种结尾里选一个，并记录原因。你需要在一个图里使用三种路由。

读完本节，你能用普通边和条件边连接节点。你还能用 `Send` 启动数量可变的任务，并用 `Command` 从节点路由。

## 图 {#s-edges-send-and-command-the-graph}

[第 6.1 节](#s-stategraph-state-and-reducers)里录制工具包的图有五个节点。下面是连接它们的代码：

```listing
title: 笑话图的节点和边
source: capture/s_graph.py
lang: python
---
    graph = StateGraph(Fanout)
    graph.add_node("plan", plan)
    graph.add_node("write_joke", write_joke)
    graph.add_node("pick", pick)
    graph.add_node("publish", publish)
    graph.add_node("retry", retry)
    graph.add_edge(START, "plan")
    graph.add_conditional_edges("plan", fan_out, ["write_joke"])
    graph.add_edge("write_joke", "pick")
    graph.add_edge("publish", END)
    graph.add_edge("retry", END)
    app = graph.compile()
```

`compile` 检查图，并返回你要运行的对象。graph API 页面说，图必须先编译，才能调用或流式运行 {{docs oss/python/langgraph/graph-api}}。编译后的图的 Mermaid 文本显示了每一条边。实线箭头 `-->` 是普通边，虚线箭头 `-.->` 是条件边：

```listing
title: 编译后的图的边
source: capture/out/34-stategraph-reducers-send-command.txt
lang: text
note: Mermaid 文本里的边的行。节点行和样式被截掉了。
---
	__start__ --> plan;
	pick -.-> publish;
	pick -.-> retry;
	plan -.-> write_joke;
	write_joke --> pick;
	publish --> __end__;
	retry --> __end__;
```

没有任何 `add_edge` 调用从 `pick` 出发，但图里有两条从它出发的边。它们来自 `pick` 的返回类型，下一部分会说明。

[图](#fig-6-2b)从上到下画出了完整的 Mermaid 文本。

```figure
id: fig-6-2b
kind: structure
title: LangGraph 画出的笑话图
claim: Mermaid 文本里有三条条件边，从 plan 和 pick 出发，没有任何 add_edge 调用创建它们。
caption: 从顶部的 __start__ 开始读。实线箭头是 add_edge 调用。琥珀色的虚线箭头来自 Send 和 Command 的返回类型。来源：capture/out/50-draw-fanout.txt。
```

[图](#fig-6-2)画出了这个图，以及穿过它的一次运行。

```figure
id: fig-6-2
kind: flow
title: 笑话图与一次运行
claim: Send 在一步里启动三个 write_joke 任务，pick 返回的 Command 更新 best 并转到 publish，所以 retry 从未运行。
caption: 从左边的 __start__ 读到右边的 __end__。实线箭头是普通边，琥珀色虚线箭头是运行时选择的路由。灰色的 retry 节点没有运行。下面的表显示每一步往状态里写了什么。来源：capture/out/34-stategraph-reducers-send-command.txt。
```

## 普通边与条件边 {#s-edges-send-and-command-plain-and-conditional-edges}

**普通边（plain edge）：** 从一个节点到另一个节点的边，第一个节点每次结束时，LangGraph 都会沿着它走。

**条件边（conditional edge）：** 带路由函数的边。源节点运行之后，函数读取状态，并返回下一个节点、节点列表或 `END`。

`add_conditional_edges` 的第三个参数列出函数可能返回的节点。LangGraph 用这个列表来画图。[第 1.3 节](#s-one-create-agent-run)显示过 agent 的条件边：在 `model` 之后，由最后一条消息里的工具调用在 `tools` 和 `__end__` 之间选择。

## Send：每一项一个任务 {#s-edges-send-and-command-send-one-task-for-each-item}

**Send：** 一个值，指明一个节点和这个节点一次运行的输入。返回一组它们的路由函数，会在同一步里为每一项启动一个任务。

`fan_out` 是 `plan` 之后的路由函数。它读取 `subjects`，为每个主题返回一个 `Send`。每个 `write_joke` 任务拿到自己的小字典作为输入，看不到完整的状态：

```listing
title: 路由函数和它启动的节点
source: capture/s_graph.py
lang: python
---
    def fan_out(state):
        return [Send("write_joke", {"subject": s}) for s in state["subjects"]]

    def write_joke(arg):
        return {"jokes": [f"a joke about {arg['subject']}"], "log": [f"write_joke({arg['subject']})"]}
```

`updates` 流为每个任务产出一个块。三个 `write_joke` 块位于 `plan` 的块和 `pick` 的块之间：

```listing
title: 三个 write_joke 块
source: capture/out/34-stategraph-reducers-send-command.txt
lang: json
note: updates 流六个块里的三个，只截取了 jokes 键。
---
  "write_joke": {
    "jokes": [
      "a joke about cats"
    ],
…
  "write_joke": {
    "jokes": [
      "a joke about dogs"
    ],
…
  "write_joke": {
    "jokes": [
      "a joke about owls"
    ],
```

三个任务在同一步里写 `jokes`，所以这个键需要第 6.1 节的 reducer。`Send` 和 `Command` 的文档页面把这种模式称为 map-reduce {{docs oss/python/langgraph/graph-api-send-command}}。

从 `langgraph.types` 导入 `Send`。从 `langgraph.constants` 导入在锁定版本上仍然可用，同时会警告这个路径已弃用 {{code libs/langgraph/langgraph/constants.py}}。

## Command：一次返回里更新并路由 {#s-edges-send-and-command-command-update-and-route-in-one-return}

**Command：** 节点返回的一个值，在一步里更新状态并指明下一个节点。它的字段是 `update`、`goto`、`graph` 和 `resume`。

`pick` 选择按排序最靠前的笑话。它返回一个 `Command`，设置 `best`，往 `log` 里加一行，并转到 `publish` 或 `retry`：

```listing
title: 返回 Command 的节点
source: capture/s_graph.py
lang: python
---
    def pick(state) -> Command[Literal["publish", "retry"]]:
        best = sorted(state["jokes"])[0]
        target = "publish" if "cats" in best else "retry"
        return Command(update={"best": best, "log": [f"pick -> {target}"]}, goto=target)
```

返回类型里的 `Literal` 指明两个可能的目标。LangGraph 读取它，画出从 `pick` 出发的两条虚线边，文档说这个标注对此是必需的 {{docs oss/python/langgraph/graph-api-send-command}}。运行转到了 `publish`，`retry` 没有运行。流的最后两个块显示了这一点：

```listing
title: 这次运行的最后两个块
source: capture/out/34-stategraph-reducers-send-command.txt
lang: json
---
{
  "pick": {
    "best": "a joke about cats",
    "log": [
      "pick -> publish"
    ]
  }
}

{
  "publish": {
    "log": [
      "publish"
    ]
  }
}
```

路由只取决于状态时，用条件边。像 `pick` 那样，计算更新的节点同时也知道路由时，用 `Command`。

`Command` 还有两种用法。带 `resume` 时，它是回答中断的输入，[第 6.4 节](#s-interrupt-and-resume)会展示。带 `graph=Command.PARENT` 时，子图里的节点会路由到父图的节点 {{docs oss/python/langgraph/graph-api-send-command}}。录制工具包还没有运行 `Command.PARENT`。它的录制会在下一版出现，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他待办项一起。

```takeaways
- 在条件边的第三个参数里，列出它可能的目标。
- 返回一组 Send 值，让一个节点为每一项各运行一次。
- 给并行任务写入的每个键都配一个 reducer。
- 对返回 Command 的节点，用 Command[Literal[...]] 标注每个目标。
- 从 langgraph.types 导入 Send 和 Command。
```

来源：capture/s_graph.py, capture/out/34-stategraph-reducers-send-command.txt, capture/out/50-draw-fanout.txt; libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/constants.py, and libs/langgraph/langgraph/graph/state.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/graph-api, oss/python/langgraph/graph-api-send-command).
