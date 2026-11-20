# 检查点大小、DeltaChannel 与超步的成本

> 框架只占一个真实 agent 耗时的不到百分之零点五，而它的检查点在 100 次工具调用里长到了 10 MB，所以把精力花在字节上。

你的 agent 一页一页地读一份长文档，在一个线程上做了 100 次工具调用。整段对话的消息约 110 KB。而 SQLite 文件里为这一个线程存了 10.1 MB。没有人写过 10 MB 的任何东西。是 saver 在每个超步里把对话又写了一遍。

读完本节，你能根据步数和 saver 预测一个线程的大小。你还能在普通消息通道和 `DeltaChannel` 之间做选择，并说出循环本身相比模型要花多少。

## 每个检查点都存着整个列表 {#s-checkpoint-growth-and-the-cost-of-a-superstep-every-checkpoint-holds-the-whole-list}

`SqliteSaver.put` 把整个检查点连同每个通道的值，序列化到一行里 {{code libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py:433-449}}。它收到 `new_versions`，即发生变化的通道列表，但没有使用它。

`InMemorySaver.put` 确实用了它。它为每个变化的通道存一个 blob，以通道和它的版本为键 {{code libs/checkpoint/langgraph/checkpoint/memory/__init__.py:455-457}}。这样没有变化的通道就省下了。在 agent 里，`messages` 在每个超步都变化，所以每个新 blob 又是整个列表。

一个有 n 个超步、每步一条消息的线程，存储的是 1、2、3，一直到 n 条消息。这个和随 n 的平方增长。

**我们测得**每种 saver 一次 `create_agent` 运行，在 x86 服务器客户机上用 Qwen3 4B，上下文 16,384 个 token。工具 `read_page` 返回一页，其中写着下一页的游标，所以模型每轮必须调用一次。每次运行做了 100 次工具往返、101 次模型调用和 203 个超步，并以 `DONE` 结束。每次运行里，模型占了几乎全部时间。我们不使用这些耗时，因为每种 saver 只在负载较高的客户机上运行了一次：

```listing
title: 100 次真实工具往返中的检查点大小
source: capture/lab/internals/09-growth/trace.txt
lang: text
note: SqliteSaver 和 InMemorySaver 两个块，截取到大小行。
---
   checkpoint rows=203 total bytes=10132489; row bytes at #1, #50, #100, #150, #200: [689, 25072, 49512, 74045, 98637]; largest 99390; mean 49914
   writes rows=403 bytes=111623 (messages channel 98824); checkpoints + writes = 10244112 bytes; checkpoints / writes = 90.8
…
   InMemorySaver: 203 checkpoints (118969 bytes without channel values); blobs 606 entries, 10002635 bytes, of which messages 9989570 bytes in 202 versions; messages blob at version #1, #50, #100: [861, 24630, 49074], last 98779; writes 111624 bytes
```

行的大小从 689 字节增长到 98,637 字节。203 行共存了 10,132,489 字节，而每条消息只存一次的 `writes` 表存了 111,623 字节。所以检查点存的字节数是写入的 90.8 倍。`InMemorySaver` 的 blob 存了 10,002,635 字节，其中 `messages` 通道占 9,989,570。

## DeltaChannel 存储的是写入 {#s-checkpoint-growth-and-the-cost-of-a-superstep-deltachannel-stores-the-writes}

**DeltaChannel：** 一种 beta 通道类型，只保存每个超步的写入，并在一定次数的更新之后保存一份完整快照。[第 5.5 节](#s-context-engineering-and-summarization)在 5,000 步上测量它。

`DeltaChannel` 的检查点在两次快照之间不保存值 {{code libs/langgraph/langgraph/channels/delta.py:193-202}}。每隔 `snapshot_frequency` 次更新就有一份快照，默认 100 次 {{code libs/langgraph/langgraph/channels/delta.py:74}}，或者在 5,000 个超步之后 {{code libs/langgraph/langgraph/_internal/_config.py:45-47}}。读取时，从最后一份快照和它之后的写入重建列表 {{code libs/langgraph/langgraph/pregel/_checkpoint.py:458-499}}。

`create_agent` 把 `messages` 放在一个 `BinaryOperatorAggregate` 里。它的 `state_schema` 参数接受 `AgentState` 的子类，第三次运行用了一个替换这个通道的子类：

```listing
title: 带 DeltaChannel 消息列表的 create_agent
source: capture/lab/internals/09-growth/run.py
lang: python
---
class DState(AgentState):
    messages: Annotated[list, DeltaChannel(_messages_delta_reducer)]
…
    kw = {"state_schema": DState} if label == "sqlite-delta" else {}
```

```listing
title: 用 DeltaChannel 做同样的 100 次往返
source: capture/lab/internals/09-growth/trace.txt
lang: text
note: sqlite-delta 块，截取到大小行和读取行。
---
   checkpoint rows=203 total bytes=286606; row bytes at #1, #50, #100, #150, #200: [470, 747, 49515, 750, 98638]; largest 98638; mean 1412
   writes rows=403 bytes=111777 (messages channel 98978); checkpoints + writes = 398383 bytes; checkpoints / writes = 2.6
   get_state at the end, 30 reads after 3 warmups: median 2.76 ms (p10 2.75, p90 2.8); 202 messages
```

这次运行做了同样的工作：100 次往返、101 次模型调用，最后的答案也相同。线程存了 398,383 字节，对比 10,244,112 字节，约为二十六分之一。行的大小保持在 750 字节左右，只有第 100 行和第 200 行的两份快照例外。我们在每次运行结束时把线程读了 30 次，不使用那些耗时。[图](#fig-2-6)画出两次运行的每一行。

```figure
id: fig-2-6
kind: chart
title: 每个检查点行的字节数，普通消息对比 DeltaChannel
claim: 普通的行保存整个列表，增长到 99 KB，而 DeltaChannel 的行保持在 750 字节左右，只在每 100 次更新时有一份快照。
caption: 每个点是一次含 100 次真实工具往返的 create_agent 运行里 checkpoints 表的一行，按顺序排列，每次运行 203 行。青色是普通通道，靛蓝色是 DeltaChannel，两个圆环是它的快照行。来源：capture/lab/internals/09-growth/growth.json。
```

reducer `_messages_delta_reducer` 的名字是私有的，这个通道也是 beta。第 5.5 节列出了修改已有线程的通道时的规则。

## 一个超步花多少 {#s-checkpoint-growth-and-the-cost-of-a-superstep-what-one-superstep-costs}

**我们测得**一次运行里每个部分的耗时，在 x86 服务器客户机上用 Qwen3 4B。每次运行是一次含 10 次工具往返、22 个超步的 `create_agent` 运行，每个单元格 30 次运行，之前有 2 次预热。框架耗时是墙钟时间减去 Ollama 调用内部和工具函数内部的时间：

| saver 与模式 | 占墙钟时间的比例 |
|---|---|
| 无，`async` | 0.144 % |
| `InMemorySaver`，`async` | 0.197 % |
| `InMemorySaver`，`sync` | 0.213 % |
| `InMemorySaver`，`exit` | 0.153 % |
| `SqliteSaver`，`async` | 0.245 % |
| `SqliteSaver`，`sync` | 0.449 % |
| `SqliteSaver`，`exit` | 0.190 % |

客户机负载较高，所以请看比例和各行的顺序，不要看毫秒数。

模型占了每次运行的 99.5% 以上。循环函数本身，即规划、应用和检查点保存，只占框架耗时的一小部分。[图](#fig-2-6b)把各部分叠起来。

```figure
id: fig-2-6b
kind: chart
title: 每个超步的框架耗时，按 saver 和持久性模式
claim: LangGraph 和 LangChain 占墙钟时间的 0.14% 到 0.45%，其中 sync 的 SqliteSaver 花得最多。
caption: 每根柱是一种 saver 加一种模式，单位为每个超步的毫秒数，取 30 次运行的中位数，每次运行 22 个超步。靛蓝色是循环函数，灰色是框架耗时的其余部分：节点包装器以及循环上的 saver 等待。右列是占墙钟时间的比例。客户机负载较高，所以请看比例和柱子的顺序，不要看毫秒数。来源：capture/lab/internals/08-costs/breakdown.json。
```

所以，循环不是 agent 花时间的地方。增长的成本是检查点的字节，而在有很多线程的数据库上，这些字节意味着存储、I/O 和备份。

## 该怎么做 {#s-checkpoint-growth-and-the-cost-of-a-superstep-what-to-do}

把线程的字节数估算为一条消息的字节数，乘以超步数的平方，再除以二。上面那次运行这样算得 9.98 MB，实测是 10.13 MB。当这个数超过你的数据库应当为每个线程容纳的量时，就像第 5.5 节那样裁剪或摘要消息。或者给 `create_agent` 传一个带 `DeltaChannel` 消息列表的 `state_schema`，并接受它是 beta 通道。

不要先去调优循环。选 `durability` 要为了正确性，如[第 2.3 节](#s-the-checkpoint-write-path-and-durability)所论证的。我们的运行里成本最高的配置，即 SQLite 上的 `sync`，占墙钟时间的 0.449%。

```takeaways
- 预期检查点字节数在 SqliteSaver 和 InMemorySaver 上随线程长度的平方增长。
- 盯住 checkpoints 表的行大小，并为它设置告警。
- 对长线程，给 create_agent 传一个带 DeltaChannel 消息列表的 state_schema，或者裁剪它们。
- 选 durability 要为了正确性，因为框架占墙钟时间不到百分之零点五。
```

来源：capture/lab/internals/09-growth/trace.txt, capture/lab/internals/09-growth/growth.json, capture/lab/internals/09-growth/run.py, capture/lab/internals/08-costs/trace.txt, capture/lab/internals/08-costs/breakdown.json, capture/lab/internals/08-costs/runs.json, capture/lab/internals/08-costs/run.py, capture/lab/internals/common/real.py, capture/lab/internals/common/pager.py; libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py at langgraph-checkpoint-sqlite 3.1.3; libs/checkpoint/langgraph/checkpoint/memory/__init__.py at langgraph-checkpoint 4.3.2; libs/langgraph/langgraph/channels/delta.py, libs/langgraph/langgraph/_internal/_config.py, and libs/langgraph/langgraph/pregel/_checkpoint.py at langgraph 1.2.22; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0.
