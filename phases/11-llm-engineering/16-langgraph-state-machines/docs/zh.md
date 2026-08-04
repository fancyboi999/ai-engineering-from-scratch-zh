# Agent 状态机——图、节点与检查点

> 手写的 ReAct 循环是一个 `while True`。把同一个循环写成显式的图，你就能给它打 checkpoint、中断它、给它分支、在它里面时间旅行。agent 没变。变的是包在它外面的那套框架。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 11 · 09（Function Calling）、阶段 11 · 14（Model Context Protocol）
**预计时间：** ~75 分钟

## 问题背景

你交付一个 function-calling agent。它跑了三轮，然后出了岔子：模型试了一个返回 500 的工具、用户在任务中途改了主意，或者 agent 没等人签字就决定给一笔订单退款。`while True:` 循环没有钩子。你没法暂停它，没法回退它，也没法分叉去看"要是模型当时挑了另一个工具会怎样"。你把它发到 demo 之外的那一刻，agent 就成了一个要么成功要么失败的黑箱。

一旦你看清了，下一步就显而易见。agent 本来就是一个状态机——system prompt 加消息历史加待执行的 tool call 加下一个动作。把这个状态机显式化：为"模型思考""一个工具运行""一个人批准"设节点，为它们之间的条件转移设边。一旦图显式了，框架就白白得到四样东西：checkpoint（在步骤之间保存状态）、中断（为人暂停）、流式（流式吐 token 和中间事件）和时间旅行（回退到先前的状态、试一个不同的分支）。

LangGraph 是这层抽象的参考实现。它不是 LangChain 那种意义上的 agent 框架（"给你一个 AgentExecutor，自求多福"）。它是一个图运行时，有一等的状态、一等的持久化和一等的中断。agent 循环是你画出来的，不是你手写的。

## 核心概念

![LangGraph StateGraph：节点、边和 checkpointer](../assets/langgraph-stategraph.svg)

一个 `StateGraph` 有三样东西。

1. **State（状态）。** 一个流过整张图的有类型字典（TypedDict 或 Pydantic 模型）。每个节点收到完整状态、返回一个部分更新，LangGraph 用每个字段的 *reducer* 来合并它——对应该累积的列表用 `operator.add`，默认是覆盖。
2. **Nodes（节点）。** Python 函数 `state -> partial_state`。每个都是一个离散步骤："调用模型""运行工具""做摘要"。
3. **Edges（边）。** 节点之间的转移。静态边只去一个地方。条件边接受一个路由函数 `state -> next_node_name`，让图能根据模型输出分支。

你编译这张图。编译绑定拓扑、附上一个 checkpointer（可选，但对生产至关重要）、返回一个 runnable。你用一个初始状态和一个 `thread_id` 来调用它。执行的每一步都持久化一个以 `(thread_id, checkpoint_id)` 为键的 checkpoint。

### 四种超能力

**Checkpoint。** 每次节点转移都把新状态写进一个存储（测试用内存，生产用 Postgres/Redis/SQLite）。用同一个 `thread_id` 再次调用这张图就能恢复。图从它暂停的地方接着跑。

**中断。** 给一个节点标上 `interrupt_before=["human_review"]`，执行就在那个节点运行之前停下。状态持久化。你的 API 回复用户"等待批准"。之后对同一个 `thread_id` 带 `Command(resume=...)` 的请求恢复执行。

**流式。** `graph.stream(state, mode="updates")` 在状态增量发生时把它们 yield 出来。`mode="messages"` 流式吐模型节点里的 LLM token。`mode="values"` yield 完整快照。你挑要在 UI 里呈现什么。

**时间旅行。** `graph.get_state_history(thread_id)` 返回完整的 checkpoint 日志。把任意一个先前的 `checkpoint_id` 传给 `graph.invoke`，你就从那个点分叉。对调试（"要是模型当时挑了工具 B 会怎样？"）和回放生产 trace 的回归测试都很棒。

### Reducer 才是关键

每个状态字段都有一个 reducer。大多数默认值没问题——新值覆盖旧值。但消息列表需要 `operator.add`，这样新消息是追加而非替换。并行边通过 reducer 合并它们的更新。如果两个节点都更新 `messages`、而你忘了 `Annotated[list, add_messages]`，第二个会悄悄胜出，你就丢了半轮对话。reducer 是这个库里唯一微妙的东西；把它弄对，其余的都能组合好。

### 四个节点构成的 ReAct 图

一个生产级 ReAct agent 是四个节点和两条边：

1. `agent`——用当前消息历史调用 LLM。返回 assistant 消息（可能含 tool_calls）。
2. `tools`——执行最后那条 assistant 消息里的任何 tool_calls，把工具结果作为 tool 消息追加进去。
3. 一条从 `agent` 出发的条件边，如果最后一条消息有 tool_calls 就路由到 `tools`，否则到 `END`。
4. 一条从 `tools` 回到 `agent` 的静态边。

就这样。你用大约 40 行代码就得到了完整的 ReAct 循环（Thought → Action → Observation → Thought → …），带 checkpoint、中断和流式。

### StateGraph vs Send（扇出）

`Send(node_name, state)` 让一个节点派发并行子图。例子：agent 决定一次查询三个检索器。每个 `Send` 都生成目标节点的一次并行执行；它们的输出通过状态 reducer 合并。这就是 LangGraph 不靠线程原语来表达 orchestrator-workers 模式的方式。

### 子图

一个编译好的图能成为另一张图里的一个节点。外层图看到的是单个节点；内层图有它自己的状态和自己的 checkpoint。这就是团队如何构建 supervisor-worker agent：supervisor 图把用户意图路由给一个按领域划分的 worker 子图。

```figure
l5-state-graph-ledger
```

## 动手构建

### 第 1 步：状态与节点

```python
from typing import Annotated, TypedDict
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]

def agent_node(state: State) -> dict:
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: State) -> str:
    last = state["messages"][-1]
    return "tools" if getattr(last, "tool_calls", None) else END

tool_node = ToolNode(tools=[search_web, read_file])

graph = StateGraph(State)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)
graph.set_entry_point("agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")

app = graph.compile(checkpointer=MemorySaver())
```

`add_messages` 是让消息列表累积而非覆盖的那个 reducer。忘了它是最常见的 LangGraph bug。

### 第 2 步：带一个 thread 运行

```python
config = {"configurable": {"thread_id": "user-42"}}
for event in app.stream(
    {"messages": [HumanMessage("find the Anthropic headquarters address")]},
    config,
    stream_mode="updates",
):
    print(event)
```

每个更新都是一个字典 `{node_name: state_delta}`。你的前端可以把它们流式传到 UI，让用户看到"agent 在思考……调用 search_web……拿到结果……作答。"

### 第 3 步：加一个人在环中断

给一个节点打标记，让执行在它运行之前暂停。

```python
app = graph.compile(
    checkpointer=MemorySaver(),
    interrupt_before=["tools"],  # 在每次 tool call 之前暂停
)

state = app.invoke({"messages": [HumanMessage("delete the production database")]}, config)
# state["__interrupt__"] 被设上了。检视被提议的 tool call。
# 如果批准：
from langgraph.types import Command
app.invoke(Command(resume=True), config)
# 如果拒绝：写一条拒绝消息再恢复
app.update_state(config, {"messages": [AIMessage("Blocked by human reviewer.")]})
```

状态、checkpoint 和 thread 在中断期间全都持久化。除了执行过程中，没有东西留在内存里。

### 第 4 步：用时间旅行做调试

```python
history = list(app.get_state_history(config))
for snapshot in history:
    print(snapshot.values["messages"][-1].content[:80], snapshot.config)

# 从一个先前的 checkpoint 分叉
target = history[3].config  # 回退三步
for event in app.stream(None, target, stream_mode="values"):
    pass  # 从那个点往后回放
```

把 `None` 作为输入传入会从给定的 checkpoint 回放；传入一个值会在恢复之前把它作为更新追加到那个 checkpoint 的状态上。这就是你如何在不重跑整段对话的情况下复现一次糟糕的 agent 运行。

### 第 5 步：为生产换掉 checkpointer

```python
from langgraph.checkpoint.postgres import PostgresSaver

with PostgresSaver.from_conn_string("postgresql://...") as checkpointer:
    checkpointer.setup()
    app = graph.compile(checkpointer=checkpointer)
```

SQLite、Redis 和 Postgres 都已自带。`MemorySaver` 是给测试用的。任何要跨重启持久化的东西都想要一个真正的存储。

## 这项 skill

> 你把 agent 当图来构建，而不是当 `while True` 循环。

在你伸手去拿 LangGraph 之前，做一个 60 秒的设计：

1. **给节点命名。** 每一个离散决策或有副作用的动作都是一个节点。"agent 思考""工具运行""reviewer 批准""响应流式"。如果你列不出来，这个任务还不是 agent 形状的。
2. **声明状态。** 一个最小的 TypedDict，每个列表字段都有 reducer。别把一切都塞进 `messages`；把任务专属的字段（一个工作中的 `plan`、一个 `budget` 计数器、一个 `retrieved_docs` 列表）提升到顶层。
3. **画出边。** 除非下一步取决于模型输出，否则用静态边。每条条件边都需要一个带命名分支的路由函数。
4. **提前选好 checkpointer。** 测试用 `MemorySaver`，其他一切用 Postgres/Redis/SQLite。没有它就别上线——没有 checkpointer 就没有恢复、没有中断、没有时间旅行。
5. **在工具运行之前、而非之后决定中断。** 审批放在进入有副作用节点的那条边上，这样你能在造成伤害之前取消；校验放在从模型出来的那条边上，这样你能廉价地拒绝糟糕的调用。
6. **默认流式。** UI 用 `mode="updates"`，模型节点里的 token 级流式用 `mode="messages"`，评估期间的完整快照用 `mode="values"`。

拒绝交付任何没有 checkpointer 的 LangGraph agent。拒绝交付任何在副作用*之后*才中断的。拒绝交付任何 `messages` 字段没把 `add_messages` 作为 reducer 的。

## 练习

1. **简单。** 用一个计算器工具和一个网页搜索工具实现上面那个四节点 ReAct 图。核验对一段两轮对话，`list(app.get_state_history(config))` 至少返回四个 checkpoint。
2. **中等。** 加一个在 `agent` 之前运行的 `planner` 节点，把一个结构化的 `plan: list[str]` 写进状态。让 `agent` 把计划步骤标记为完成。如果 `plan` 在一次 checkpoint 恢复后丢失（reducer 错了），就让测试失败。
3. **困难。** 构建一个 supervisor 图，用 `Send` 在三个子图（`researcher`、`writer`、`reviewer`）之间路由。每个子图有它自己的状态和 checkpointer。在外层图上加一个 `interrupt_before=["writer"]`，让人能批准研究简报。确认从一个先前 checkpoint 的时间旅行只重跑那个分叉出去的分支。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| StateGraph | "LangGraph 那张图" | 编译之前你往上加节点和边的那个构建器对象。 |
| Reducer | "字段怎么合并" | 当一个节点为某字段返回更新时应用的函数 `(old, new) -> merged`；默认是覆盖，`add_messages` 是追加。 |
| Thread | "一个对话 ID" | 一个 `thread_id` 字符串，圈定一个会话的所有 checkpoint。 |
| Checkpoint | "一个暂停的状态" | 节点转移后完整图状态的一份持久化快照，以 `(thread_id, checkpoint_id)` 为键。 |
| 中断 | "为人暂停" | `interrupt_before` / `interrupt_after` 在节点边界停止执行；用 `Command(resume=...)` 恢复。 |
| 时间旅行 | "从先前一步分叉" | `graph.invoke(None, config_with_old_checkpoint_id)` 从那个 checkpoint 往后回放。 |
| Send | "并行子图派发" | 一个节点可以返回的构造子，用来生成目标节点的 N 个并行执行。 |
| 子图 | "把编译好的图当节点" | 一个编译好的 StateGraph 被当作另一张图里的节点；保留它自己的状态作用域。 |

## 延伸阅读

- [LangGraph documentation](https://langchain-ai.github.io/langgraph/)——StateGraph、reducer、checkpointer 和中断的权威参考。
- [LangGraph concepts: state, reducers, checkpointers](https://langchain-ai.github.io/langgraph/concepts/low_level/)——本课所用的心智模型，直接来自源头。
- [LangGraph Persistence and Checkpoints](https://langchain-ai.github.io/langgraph/concepts/persistence/)——关于 Postgres/SQLite/Redis 存储、checkpoint 命名空间和 thread ID 的细节。
- [LangGraph Human-in-the-loop](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)——`interrupt_before`、`interrupt_after`、`Command(resume=...)` 和编辑状态模式。
- [Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (ICLR 2023)](https://arxiv.org/abs/2210.03629)——每个 LangGraph agent 都实现的模式；为推理轨迹的理由而读它。
- [Anthropic — Building effective agents (Dec 2024)](https://www.anthropic.com/research/building-effective-agents)——该偏好哪种图形态（chain、router、orchestrator-workers、evaluator-optimizer）以及何时偏好。
- 阶段 11 · 09（Function Calling）——每个 LangGraph agent 节点复用的 tool-call 原语。
- 阶段 11 · 14（Model Context Protocol）——通过 MCP 适配器插进 LangGraph `ToolNode` 的外部工具发现。
- 阶段 11 · 17（Agent 框架取舍）——什么时候选 LangGraph 而非 CrewAI、AutoGen 或 Agno。
