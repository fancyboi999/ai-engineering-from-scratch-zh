# StateGraph、状态与 reducer

> `StateGraph` 的节点返回部分更新，每个状态键用自己的 reducer 合并这个更新；键没有 reducer 时，则替换旧值。

你写了一个图，其中三个节点在同一步里运行，每个节点往列表里加一个笑话。图的一个版本最终得到三个笑话，另一个版本在这一步结束前就抛出错误。决定结果的，是这些节点所写的键的 reducer。

读完本节，你能声明状态模式，并为每个键选择 reducer。你还能预测同一步里对一个键的两次写入会怎样。

## 状态模式 {#s-stategraph-state-and-reducers-the-state-schema}

**状态（state）：** 一次图运行的共享数据，声明为一个模式，模式的键就是节点读写的值。

**Reducer：** 以旧值和一个更新为输入、返回某个状态键新值的函数。

`create_agent` 在第 1 部分里替你构建了它的图。`StateGraph` 是同一种对象，你要手工构建它。录制工具包把状态声明为一个 `TypedDict`。两个键在 `Annotated` 里带 reducer，三个键没有：

```listing
title: 带两个 reducer 的状态模式
source: capture/s_graph.py
lang: python
---
class Fanout(TypedDict):
    topic: str
    subjects: list[str]
    jokes: Annotated[list[str], operator.add]
    log: Annotated[list[str], operator.add]
    best: str
```

没有 reducer 的键保留最后写入它的值。graph API 页面也说明了这个默认行为，并补充说节点只返回它改动的键 {{docs oss/python/langgraph/graph-api}}。LangGraph 把这样的键存在 `LastValue` 通道里，把带 reducer 的键存在 `BinaryOperatorAggregate` 通道里 {{docs oss/python/langgraph/pregel}}。模式也可以是 dataclass 或 Pydantic 模型，但 `create_agent` 需要 `TypedDict` {{docs oss/python/langgraph/graph-api}}。

## 节点返回部分更新 {#s-stategraph-state-and-reducers-a-node-returns-a-partial-update}

节点是状态的函数。它返回的字典里只有它改动的键。录制工具包图的第一个节点，写五个键里的两个：

```listing
title: plan 节点
source: capture/s_graph.py
lang: python
---
    def plan(state):
        return {"subjects": ["cats", "dogs", "owls"], "log": ["plan"]}
```

LangGraph 用每个键自己的 reducer 来应用更新里的这个键。`subjects` 没有 reducer，所以这个列表替换了输入里的空列表。`log` 有 `operator.add`，所以 `["plan"]` 接在旧列表的末尾。它之后的每个节点，都以同样的方式往 `log` 里加一项。

运行结束时，`log` 里有六项，每次节点运行一项：

```listing
title: 运行的最终状态
source: capture/out/34-stategraph-reducers-send-command.txt
lang: json
note: 最终状态。topic 和 subjects 键被截掉了。
---
  "jokes": [
    "a joke about cats",
    "a joke about dogs",
    "a joke about owls"
  ],
  "log": [
    "plan",
    "write_joke(cats)",
    "write_joke(dogs)",
    "write_joke(owls)",
    "pick -> publish",
    "publish"
  ],
  "best": "a joke about cats"
```

## 一步里对同一个键的两次写入 {#s-stategraph-state-and-reducers-two-writes-to-one-key-in-one-step}

三次 `write_joke` 运行发生在同一步里，每次在 `jokes` 下返回一个笑话。reducer 把三个更新合并起来，所以状态里有三个笑话。[第 6.2 节](#s-edges-send-and-command)说明了图如何为一个节点启动三次运行。

没有 reducer 的键，每一步只接受一次写入。录制工具包构建了一个图，它的两个节点都在 `__start__` 之后启动，并且都写 `value`：

```listing
title: 两个节点写同一个没有 reducer 的键
source: capture/s_graph.py
lang: python
---
    class Plain(TypedDict):
        value: str

    g = StateGraph(Plain)
    g.add_node("a", lambda s: {"value": "a"})
    g.add_node("b", lambda s: {"value": "b"})
    g.add_edge(START, "a")
    g.add_edge(START, "b")
```

运行在这一步结束时抛出错误，错误里指明了这个键：

```listing
title: 对同一个键写入两次的错误
source: capture/out/34-stategraph-reducers-send-command.txt
lang: text
---
raised langgraph.errors.InvalidUpdateError: At key 'value': Can receive only one value per step. Use an Annotated key to handle multiple values.
For troubleshooting, visit: https://docs.langchain.com/oss/python/langgraph/errors/INVALID_CONCURRENT_GRAPH_UPDATE
```

[图](#fig-6-1)把这两种键并排放在一起。

```figure
id: fig-6-1
kind: comparison
title: 一步里对同一个键的两次写入
claim: 对带 operator.add 的键写入三次，会合并成一个列表，对没有 reducer 的键写入两次，会在这一步结束时抛出 InvalidUpdateError。
caption: 每一列从顶部的写入读到底部的状态。左列是笑话图里的 jokes，右列是两节点图里的 value。来源：capture/out/34-stategraph-reducers-send-command.txt。
```

合并后的列表保持三个主题的顺序：cats、dogs、owls。录制工具包的检查在每次运行里都会再次记录这个顺序。

## 错误在已保存线程里留下什么 {#s-stategraph-state-and-reducers-what-the-error-leaves-in-a-saved-thread}

在带 checkpointer 的图上，这个错误做的不止让一次运行失败。更新抛出错误之前，两个节点的函数体都已运行，两次写入都已作为待写入项保存。此后每次读取这个线程，都会再次应用这些写入，并再次抛出错误。

运行时部分用 checkpointer `InMemorySaver` 运行了这个两节点的图。每个节点向 Qwen3 4B 要一个数字，并把它作为 `x` 返回，环境是 x86 服务器客户机：

```listing
title: 冲突之后的线程
source: capture/lab/internals/02-channels/trace.txt
lang: text
note: 帧列表和逐个检查点的转储被截掉了。
---
raised InvalidUpdateError: At key 'x': Can receive only one value per step. Use an Annotated key to handle multiple values.
…
node bodies that ran before the raise: ['a', 'b']
…
get_state after the raise ALSO raises InvalidUpdateError via ['main.py:1496', 'main.py:1331', '_algo.py:319', 'last_value.py:64']
…
raw saver.get_tuple works: checkpoint step=0 pending_writes=[('26351ed0', 'x', 1), ('8f6a50fe', 'x', 2)]
…
invoke(None) resume raises again: InvalidUpdateError; node bodies re-run on resume: [] (empty means the saved writes were reapplied, not re-executed)
```

所以 `get_state` 会抛出错误，读取线程的管理页面也会失败。`invoke(None)` 不运行任何节点就抛出错误。在同一线程上开始新的一轮，同样会抛出错误。只有 `get_state_history` 和原始的 saver 仍然能读取这个线程。我们把这个问题报告为 langgraph issue #9712 {{issue langgraph#9712}}。[第 2.2 节](#s-channels-and-colliding-writes)沿着更新阶段追踪了这次抛出。

## 恢复线程 {#s-stategraph-state-and-reducers-recovering-the-thread}

**我们测得**四种出路，环境是 x86 服务器客户机上的 Qwen3 4B，在同一个图上各运行一次：

```listing
title: 摆脱 LastValue 冲突的四种办法里的前两种
source: capture/lab/internals/02-channels/repair.txt
lang: text
note: update_state 结果里的检查点 id 被截掉了，第 3 和第 4 种办法也被截掉了。
---
## 1. same graph, after the raise
get_state: raises InvalidUpdateError: At key 'x': Can receive only one value per step. Use an Annotated key to handle multiple v
update_state(cfg, {'x': 9}): ok -> {'configurable': {'thread_id': 't1', 'checkpoint_ns': '', …
invoke(None): raises InvalidUpdateError: At key 'x': Can receive only one value per step. Use an Annotated key to handle multiple v
node bodies run by invoke(None): ['a', 'b']; model calls so far 4
invoke({'x': 5}) as a new turn: raises InvalidUpdateError: At key 'x': Can receive only one value per step. Use an Annotated key to handle multiple v

## 2. same saver, graph recompiled with x: Annotated[int, operator.add]
get_state: ok -> {'x': 3}
invoke(None): ok -> {'x': 3}
node bodies run by invoke(None): []; model calls so far 8
```

- reducer 能根据保存的写入修好线程。同一个 saver，在 `x: Annotated[int, operator.add]` 的图下，立刻读出了线程并完成了这次运行。没有节点再次运行，所以没有为模型调用多付一次。值是 3，即输入 0 加 1 加 2。
- `update_state` 也能恢复线程。它用你传入的值写一个新检查点，issue #9712 的复现在它之后能再次读取线程。但图仍然是错的。下一次 `invoke(None)` 再次运行了两个节点和两次模型调用，并再次抛出错误。
- 从输入检查点分叉，在同一个图下，运行了两个节点并抛出错误。
- `delete_thread` 清除线程，你会失去它的历史。

所以先部署 reducer。每个损坏的线程随后都能根据保存的写入完成。必须手工设置值时才用 `update_state`，并且只在有 reducer 的图上用。按这个键的含义选择 reducer，因为它决定了修复后线程的值。

## add_messages 与 MessagesState {#s-stategraph-state-and-reducers-add-messages-and-messagesstate}

**add_messages：** 消息列表的 reducer。它追加带新 id 的消息，替换 id 相同的消息，并删除 `RemoveMessage` 指名的消息。

录制工具包对两条消息 `m1` 和 `m2` 调用了 `add_messages`。一个给 `m2` 新文本、并带新消息 `m3` 的更新，替换了一条，追加了另一条。一个带 `RemoveMessage(id="m1")` 的更新，只剩下 `m2`：

```listing
title: add_messages 按 id 替换和删除
source: capture/out/34-stategraph-reducers-send-command.txt
lang: json
note: 第一个结果被截成只剩三个 id 和文本。
---
replace m2, append m3:
…
    "content": "first",
    "id": "m1"
…
    "content": "second, edited",
    "id": "m2"
…
    "content": "third",
    "id": "m3"
…
remove m1:
[
  {
    "type": "HumanMessage",
    "content": "second",
    "id": "m2"
  }
]
```

所以 agent 的 `messages` 键可以就地修改。agents 页面称它只追加 {{docs oss/python/langchain/agents}}，而 short-term memory 页面用 `RemoveMessage` 删除消息 {{docs oss/python/langchain/short-term-memory}}。以 `add_messages` 的代码为准，本手册把这处分歧记为冲突 D104。

`MessagesState` 是一个只有 `messages` 键、并带 `add_messages` reducer 的模式。节点可以返回形如 `{"role": "assistant", "content": "..."}` 的字典，reducer 把它变成带新 UUID 的 `AIMessage`。这样，状态里的每条消息都有 id，之后的更新就能替换或删除它。

## 清空带 reducer 的键 {#s-stategraph-state-and-reducers-clearing-a-key-that-has-a-reducer}

节点为 `log` 返回空列表并不能清空它，因为 `operator.add` 会把空列表接到旧列表后面。state 页面说，把值包进 `Overwrite` 就能跳过 reducer {{docs oss/python/langgraph/graph-api-state}}。录制工具包还没有运行 `Overwrite`。它的录制会在下一版出现，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他待办项一起。

```takeaways
- 只返回节点改动的键，让每个 reducer 来合并它们。
- 当两个节点可能在一步里写同一个键时，给这个键加 reducer。
- 把 InvalidUpdateError 读作对没有 reducer 的键写入了两次。
- 已保存线程出现 InvalidUpdateError 后，先部署 reducer，再用 invoke(None) 恢复。
- 之后的更新要替换或删除消息时，给每条消息一个 id。
- 用 Overwrite 清空带合并 reducer 的键。
```

来源：capture/s_graph.py, capture/out/34-stategraph-reducers-send-command.txt; capture/lab/internals/02-channels/trace.txt, capture/lab/internals/02-channels/run.py, capture/lab/internals/02-channels/repair.txt, capture/lab/internals/02-channels/repair.py; libs/langgraph/langgraph/graph/state.py, libs/langgraph/langgraph/graph/message.py, libs/langgraph/langgraph/channels/last_value.py, libs/langgraph/langgraph/pregel/_algo.py, and libs/langgraph/langgraph/pregel/main.py at langgraph 1.2.22; GitHub issue langchain-ai/langgraph#9712; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/graph-api, oss/python/langgraph/graph-api-state, oss/python/langgraph/pregel, oss/python/langchain/agents, oss/python/langchain/short-term-memory).
