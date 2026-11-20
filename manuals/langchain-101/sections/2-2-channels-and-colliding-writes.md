# 通道与冲突写入

> 部署之前，给每个会在同一超步里被两个节点写入的键加一个 reducer：冲突会让该线程之后的每次读取都失败，只有 reducer 能修复它。

你给一张能正常工作的图加了第二个分支。两个分支都向模型要一个值，并设置 `x`。第一次运行就以 `InvalidUpdateError` 失败。你在管理页面里打开这个线程去看，这次读取以同样的错误失败，重试这次运行也失败，开一个新的轮次还是失败。

读完本节，你能说出每种通道类型在一个超步里收到零次、一次或两次写入时会怎么做。你还能修复被冲突弄坏的线程，并说出消息 id 何时可能在一次恢复前后发生变化。

## 七种通道，三种情形 {#s-channels-and-colliding-writes-seven-channels-three-cases}

**通道：** 保存图状态里一个键，或循环里一个内部值的对象。`apply_writes` 每个超步对它调用一次 `update`，传入针对它的全部写入。

录制直接驱动每个通道类，传入与 `apply_writes` 会传的相同的写入列表。这一部分不调用模型，因为它只测试通道类。下表是 `langgraph` 1.2.22 上的结果：

| 通道 | 用途 | 没有写入 | 一次写入 | 一个超步里两次写入 |
|---|---|---|---|---|
| `LastValue` | 没有 reducer 的状态键 | 保持原值 | 替换它 | 抛出 `InvalidUpdateError` |
| `BinaryOperatorAggregate` | 带 reducer 的键，例如 `add_messages` | 保持原值 | 折叠进去 | 按任务路径顺序折叠两者 |
| `Topic(accumulate=False)` | `__pregel_tasks`，`Send` 的队列 | 清空队列 | 保存它 | 两者都保存 |
| `EphemeralValue(guard=True)` | `__start__`，输入 | 清空它，新版本 | 保存它 | 抛出异常 |
| `EphemeralValue(guard=False)` | `branch:to:<node>`、`jump_to` | 清空它，新版本 | 保存它 | 保留最后一个 |
| `NamedBarrierValue` | `join:a+b:c`，一条等待多个节点的边 | 保持已见到的名字 | 加入该名字 | 两个都加入 |
| `DeltaChannel`（beta） | 保存写入而不是值的消息列表 | 保持原值 | 一次 reducer 调用 | 两者合并为一次 reducer 调用 |

这些行来自通道代码：`LastValue` 在收到多于一个值时抛出异常 {{code libs/langgraph/langgraph/channels/last_value.py:56-64}}。`BinaryOperatorAggregate` 逐个折叠每个值，并拒绝两个 `Overwrite` 值 {{code libs/langgraph/langgraph/channels/binop.py:127-148}}。两个临时通道在空更新时清空 {{code libs/langgraph/langgraph/channels/ephemeral_value.py:55-68}}。不带 `accumulate` 的 `Topic` 在每次更新时先清空自己 {{code libs/langgraph/langgraph/channels/topic.py:77-85}}。屏障把它认识的每个名字都加进去 {{code libs/langgraph/langgraph/channels/named_barrier_value.py:56-67}}。`DeltaChannel` 把整个写入列表一次性传给它的 reducer {{code libs/langgraph/langgraph/channels/delta.py:159-183}}。

```listing
title: 一个通道，三次更新
source: capture/lab/internals/02-channels/trace.txt
lang: text
---
## LastValue
  update([1]) -> returns True; available=True get=1 checkpoint()=1
  update([]) -> returns False; available=True get=1 checkpoint()=1
  update([2, 3]) -> RAISES InvalidUpdateError: At key 'x': Can receive only one value per step. Use an Annotated key to handle multiple values.; available=True get=1 checkpoint()=1
```

## 会弄坏线程的冲突 {#s-channels-and-colliding-writes-the-conflict-that-breaks-a-thread}

这个错误本身记录在[第 6.1 节](#s-stategraph-state-and-reducers)。而它之后线程会怎样，却没有记录。

录制在 `InMemorySaver` 上运行 `START -> a` 和 `START -> b`，在 x86 服务器客户机上用 Qwen3 4B。`a` 向模型要数字 1 并把它作为 `x` 返回，`b` 对 2 做同样的事。`x` 没有 reducer。异常来自更新阶段，此时两个节点体和两次模型调用都已经运行完 {{code libs/langgraph/langgraph/pregel/_loop.py:732}} {{code libs/langgraph/langgraph/pregel/_algo.py:319}}：

```listing
title: 抛出的异常，以及它之前已保存的写入
source: capture/lab/internals/02-channels/trace.txt
lang: text
note: 帧列表和逐检查点转储被截掉了。
---
raised InvalidUpdateError: At key 'x': Can receive only one value per step. Use an Annotated key to handle multiple values.
…
node bodies that ran before the raise: ['a', 'b']
loop.put_writes calls before the raise (writes already persisted as pending): [('__start__', [('x', 0), ('branch:to:a', None), ('branch:to:b', None)]), ('b', [('x', 2)]), ('a', [('x', 1)])]
get_state after the raise ALSO raises InvalidUpdateError via ['main.py:1496', 'main.py:1331', '_algo.py:319', 'last_value.py:64']
get_state_history: 2 snapshots
raw saver.get_tuple works: checkpoint step=0 pending_writes=[('26351ed0', 'x', 1), ('8f6a50fe', 'x', 2)]
…
invoke(None) resume raises again: InvalidUpdateError; node bodies re-run on resume: [] (empty means the saved writes were reapplied, not re-executed)
```

两次写入都作为步骤 0 检查点的待写入项保存了下来。`get_state` 应用待写入项来构建它返回的状态 {{code libs/langgraph/langgraph/pregel/main.py:1326-1333}}。所以它用同样的两个值调用同一个 `LastValue.update`，抛出同样的错误。`invoke(None)` 重新应用同样的写入，并在不运行任何节点或模型的情况下抛出异常。只有原始 saver 能读取这个线程。

## 修复一个损坏的线程 {#s-channels-and-colliding-writes-repairing-a-broken-thread}

**我们测得**四条出路，在 x86 服务器客户机上用 Qwen3 4B，每条一次运行，用同一张图和 `InMemorySaver`。这个文件一共做了 14 次模型调用：

```listing
title: 修复带 LastValue 冲突的线程的四种办法
source: capture/lab/internals/02-channels/repair.txt
lang: text
note: update_state 结果里的检查点 id 被截掉了，第 3 和第 4 部分也被截掉了。
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

`update_state` 写入了一个新检查点，接下来的 `invoke(None)` 把两个节点和两次模型调用又都运行了一遍，然后再次抛出异常。新开一轮也抛出，因为图仍然是错的。从输入检查点分叉出去，也运行了两个节点并抛出。只有修好 schema 才有用。同一个 saver 配上 `x: Annotated[int, operator.add]`，立刻读出了线程并完成了这次运行。没有任何节点再次运行，所以没有模型调用被付两次钱。

[图](#fig-2-2)画出这次损坏的运行和修复。

```figure
id: fig-2-2
kind: sequence
title: 一次 LastValue 冲突、它之后失败的读取，以及修复
claim: 两次写入在更新抛出异常之前就已保存，所以每次读取都会重放这次冲突，直到带 reducer 的 schema 重新应用同样那些已保存的写入。
caption: 从上到下阅读。青色箭头是保存到 InMemorySaver 的待写入项，玫红色箭头是抛出的异常，下方的块是同一个线程在修好的图下的情形。来源：capture/lab/internals/02-channels/trace.txt 和 capture/lab/internals/02-channels/repair.txt。
```

所以冲突不需要修复数据。部署 reducer，每个损坏的线程都会用它已保存的写入完成。你选的 reducer 决定了值：这里 `operator.add` 得到 3，即输入 0 加 1 加 2。按键的含义选 reducer，并预期它按任务路径顺序看到写入。

## add_messages 的 id 竞争 {#s-channels-and-colliding-writes-the-add-messages-id-race}

**add_messages：** 消息列表的 reducer。它替换具有相同 id 的消息，删除 `RemoveMessage` 点名的消息，并追加其余的。

没有 id 的消息，会在 `add_messages` 内部得到一个新的 `uuid4`。reducer 把它直接设在消息对象本身上 {{code libs/langgraph/langgraph/graph/message.py:199-205}}。这发生在更新阶段。到那时，循环已经把同一个对象交给了 checkpointer 的后台 `put_writes`。所以，已保存的待写入项只有在序列化发生在 reducer 之后时才带有这个 id。

聊天模型的回复已经带着 id，LangChain 根据运行来设置它，所以竞争碰不到它。测试节点返回模型的回复，以及一条根据回复文本构建、没有 id 的第二条消息：

```listing
title: 竞争测试的节点
source: capture/lab/internals/02-channels/race.py
lang: python
---
    def node(s):
        r = MODEL.invoke("Say OK.")
…
        return {"messages": [r, AIMessage(content="copied: " + r.text)]}
```

**我们测得**这一点，在 x86 服务器客户机上用 Qwen3 4B，两次各 200 个运行，在 `InMemorySaver` 上用 `durability="async"`。节点返回时，全部 400 条模型回复都带着 id。构建出来的消息在 200 次运行中的 200 次都带着 id 保存了下来，两次都是如此。一个没有模型的对照，节点立刻返回构建的消息，两次都是 200 次中的 200 次。同样的对照，在节点里加 0.6 秒的睡眠，有 200 次写入中的 4 次保存时没有 id：

```listing
title: 丢了 id 的对照运行
source: capture/lab/internals/02-channels/race_control_sleep06.txt
lang: text
---
  {"with id": 196, "without id": 4}
```

所以这个竞争很少见，而且只有你自己的代码构建的消息才会暴露。当已保存的写入没有 id 时，恢复会重新应用它，`add_messages` 就给这条消息第二个不同的 id。已经流式收到第一个 id、之后按 id 编辑或删除这条消息的客户端，就会找不到它。只有 `DeltaChannel` 里的消息，循环才会给出稳定的 id {{code libs/langgraph/langgraph/pregel/_messages.py:516-547}}。给你构建的每条消息设上 `id=str(uuid4())`，这样 reducer 就不必去设了。

```takeaways
- 给每个会在同一超步里被两个节点写入的键加一个 reducer。
- 发生 LastValue 冲突之后，部署 reducer 并用 invoke(None) 恢复，因为已保存的写入会被重新应用。
- update_state 只用来让线程变得可读，因为只有 reducer 才能阻止下一次运行再次抛出异常。
- 给你的代码构建的每条消息设置 id，因为模型回复自带一个，而构建出来的消息没有。
```

来源：capture/lab/internals/02-channels/trace.txt, capture/lab/internals/02-channels/run.py, capture/lab/internals/02-channels/repair.txt, capture/lab/internals/02-channels/repair.py, capture/lab/internals/02-channels/race.py, capture/lab/internals/02-channels/race_run1.txt, capture/lab/internals/02-channels/race_run2.txt, capture/lab/internals/02-channels/race_control.py, capture/lab/internals/02-channels/race_control_nodelay_run1.txt, capture/lab/internals/02-channels/race_control_nodelay_run2.txt, capture/lab/internals/02-channels/race_control_sleep06.txt, capture/lab/internals/common/instrument.py, capture/lab/internals/common/real.py; libs/langgraph/langgraph/channels/last_value.py, libs/langgraph/langgraph/channels/binop.py, libs/langgraph/langgraph/channels/ephemeral_value.py, libs/langgraph/langgraph/channels/topic.py, libs/langgraph/langgraph/channels/named_barrier_value.py, libs/langgraph/langgraph/channels/delta.py, libs/langgraph/langgraph/graph/message.py, libs/langgraph/langgraph/pregel/_messages.py, libs/langgraph/langgraph/pregel/_loop.py, libs/langgraph/langgraph/pregel/_algo.py, and libs/langgraph/langgraph/pregel/main.py at langgraph 1.2.22.
