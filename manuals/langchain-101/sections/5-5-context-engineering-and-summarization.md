# 上下文工程与摘要

> 线程每一轮都在增长，所以每次模型调用越来越长，每个检查点越来越大，直到你裁剪或摘要这些消息，并把它们存成增量。

你的助手在第一个小时里感觉很快。在同一个线程上跑过几十轮之后，每个回答都变慢了，服务商的账单在涨，数据库涨得比账单还快。没有任何东西失败。agent 每次调用都把整个线程发给模型，checkpointer 每一步都保存整个线程。

读完本节，你能选择模型接收什么、设置摘要触发条件，并预测一个长线程如何增长。

## 模型接收什么 {#s-context-engineering-and-summarization-what-the-model-receives}

**上下文工程（context engineering）：** 选择模型在每次调用中接收什么：哪些消息、哪些工具、哪些指令。

**上下文窗口（context window）：** 模型在一次调用中接受的最大 token 数，输入和输出合计。

[第 5.2 节](#s-checkpointers-and-threads)显示了每次调用都会拿到线程里的每条消息。short-term memory 页面列出三种缩短列表的办法：裁剪、删除消息和摘要 {{docs oss/python/langchain/short-term-memory}}。每一种都必须遵守[第 3.4 节](#s-tools-toolruntime-and-tool-errors)的规则：每个工具调用有一条 `ToolMessage` 回应，没有任何 `ToolMessage` 单独存在。

## trim_messages {#s-context-engineering-and-summarization-trim-messages}

**trim_messages：** `langchain_core.messages` 里的函数，在 token 预算内保留列表的开头或末尾的消息。它改变你传给模型的列表，状态保持原样。

录制工具包把[第 3.3 节](#s-messages-and-content-blocks)的五条消息裁剪到三的预算。token 计数器是 `len`，所以每条消息算一个 token：

```listing
title: trim_messages 保留最后三条消息
source: capture/out/02-messages.txt
lang: json
note: 用量数字被截掉了。
---
max_tokens=3, token_counter=len:
[
  {
    "type": "SystemMessage",
    "content": "You are terse."
  },
  {
    "type": "ToolMessage",
    "content": "5",
    "name": "add",
    "tool_call_id": "call_1",
    "status": "success"
  },
  {
    "type": "AIMessage",
    "content": "The sum is 5.",
…
]
```

结果保留了 `call_1` 的 `ToolMessage`，却丢掉了发出这个调用的 AI 消息。大多数服务商会拒绝这样的请求。用 `start_on="human"` 时，裁剪会丢弃消息，直到遇到一条 human 消息。最后两条消息里没有 human 消息，所以只剩下系统消息。按完整的轮次来裁剪，并检查系统消息之后的第一条消息。

## SummarizationMiddleware {#s-context-engineering-and-summarization-summarizationmiddleware}

**摘要消息（summary message）：** `SummarizationMiddleware` 取代旧消息写出的 human 消息。它以 `Here is a summary of the conversation to date:` 开头，并带有 `lc_source` 为 `summarization`。

触发条件满足时，`SummarizationMiddleware` 调用第二个模型来摘要旧消息，并保留最新的几条。录制工具包设置 `trigger=("messages", 6)` 和 `keep=("messages", 2)`，并发送七条消息：

```listing
title: 摘要之后的状态
source: capture/out/10-mw-summarization.txt
lang: json
note: 摘要在第一节之后被截断。最后两条消息的 id 被截掉。
---
  {
    "type": "HumanMessage",
    "content": "Here is a summary of the conversation to date:\n\n## SESSION INTENT  \nCalculate the sum of two numbers provided by the user.…",
    "id": "<uuid-1>",
    "additional_kwargs": {
      "lc_source": "summarization"
    }
  },
  {
    "type": "AIMessage",
    "content": "The sum is 9.",
…
  {
    "type": "HumanMessage",
    "content": "Now 1 + 1?",
```

之后 agent 模型拿到三条消息：摘要、最后一个回答和新问题。它用 1 和 1 调用了 `add`，并回答了 `The sum is 2.`。

摘要是模型输出，所以可能出错。摘要器只看到五条旧消息。它写道 4 + 5 没有得到回答，并为它列出了一个从未运行过的 `add` 调用。回答 `The sum is 9.` 在保留的两条消息里，不在它的视野之内。中间件替换了状态里的消息，所以之后的轮次都从摘要开始。

没有 `trigger` 时，中间件永远不摘要。built-in middleware 页面也这么说 {{docs oss/python/langchain/middleware/built-in}}。在录制工具包里，模型拿到了全部七条消息。要设置触发条件。`keep` 的默认值是 `("messages", 20)`。第 4 部分讲 `ContextEditingMiddleware`，它不做摘要，而是就地清除旧的工具结果。

## 真实模型上的长线程 {#s-context-engineering-and-summarization-a-long-thread-on-a-real-model}

**我们测得**长线程的表现，环境是 x86 服务器客户机，32 vCPU 和 48 GiB，用 `create_agent`、PostgreSQL 16.15 上的 `PostgresSaver` 和默认持久性。模型是 CPU 上 Ollama 里的 Qwen3 4B，温度 0，种子 42，上下文 8192 个 token。摘要用的模型是同一个。

每个变体是同一个线程上 200 轮的一次运行。第 1 到 5 轮给出五个事实，其余的轮次循环：一个普通回答、一次 add 调用、两次并行的 add 调用。每 25 轮，关于这些事实的五个回忆问题在线程的一个分叉上运行，所以它们从不进入线程。脚本给每个变体约 70 分钟。

| 变体 | 摘要次数 | 每轮 p50，无摘要调用 / 有摘要调用 | 最大提示词 | add 轮次正确 | 5 个事实的回忆 | 线程大小 |
|---|---|---|---|---|---|---|
| 无摘要 | 0 | 7.4 秒，从第 88 轮起 308 到 621 秒 | 8,191 个 token，即整个上下文 | 59 次中 59 次 | 到第 75 轮是 5 个中 5 个，第 94 轮之后 4 个中 0 个，第五个得到 HTTP 400 | 第 90 轮时 20.52 MB |
| `("messages", 60)`，保留 7 | 13 | 5.5 秒 / 55.2 秒 | 2,146 个 token | 130 次中 126 次 | 全部 8 次探测，5 个中 5 个 | 第 200 轮时 12.42 MB |
| `("tokens", 6000)`，保留 1,500 个 token | 4 | 7.5 秒 / 108.4 秒 | 5,985 个 token | 130 次中 130 次 | 到第 50 轮是 5 个中 5 个，从第 75 轮起 5 个中 0 个 | 第 200 轮时 38.00 MB |
| `("messages", 20)`，保留 1 | 39 | 5.4 秒 / 57.3 秒 | 1,219 个 token | 130 次中 103 次：129 次的和是对的，26 次跳过了工具 | 到第 75 轮是 5 个中 5 个，之后 5 个中 4 个，缺口令 | 第 200 轮时 6.40 MB |

[图](#fig-5-5)显示每 25 轮一块的中位数。没有摘要时，中位轮次的时间从第 1 到 25 轮的 4.7 秒，增长到第 51 到 75 轮的 11.2 秒。在第 88 轮，提示词达到了 8,192 个 token 的上下文。从那以后，每次模型调用在这块 CPU 上约需 300 秒，几乎全部用来读提示词。各轮耗时 308 到 621 秒，运行在第 94 轮之后因时间上限而停止。

Ollama 没有报错就截掉了提示词最旧的部分。回答仍然是对的。但是最后一个检查点上的四个回忆问题，全都说模型不知道。第五个以 HTTP 400 失败，`request (8192 tokens) exceeds the available context size (8192 tokens)`。

有触发条件时，中位轮次稳定在 5.4 到 7.5 秒之间。带摘要调用的中位轮次需要 55 到 108 秒，因为摘要是对旧消息多做的一次模型调用。摘要调用本身的中位数是 44 到 85 秒。LangChain、LangGraph 和 Postgres 在每轮里的中位数占 18.9 到 24.7 毫秒。

摘要会丢失事实。6,000 个 token 的触发条件在第 65 轮第一次摘要。从第 75 轮起，模型对五个事实一个也不知道，6 次探测全部如此。20 条消息的触发条件，从第 100 轮起丢了口令。60 条消息的触发条件在全部 8 次探测里保住了五个。信任一个触发条件之前，先检查你的摘要保留了什么。

在所有情况下，工具消息都保持成对。1,143 次模型请求里，有 0 次出现没有对应工具调用的 `ToolMessage`（x86 服务器客户机上的 Qwen3 4B）。issue #38352 报告了摘要之后出现这种孤立消息，在我们的运行里没有发生。

```figure
id: fig-5-5
kind: chart
title: Qwen3 4B 上 200 轮的轮次耗时，有摘要与无摘要
claim: 没有摘要时，第 88 轮上下文填满之后，一轮需要 5 到 10 分钟，有触发条件时，各块的中位数保持在 4.4 到 9.2 秒。
caption: 每个点是一次运行里 25 轮的中位轮次耗时，每个变体一次运行。每个空心圆环是无摘要运行里，提示词填满上下文之后的一轮。阴影带覆盖同样 25 轮的第 10 到第 90 百分位。y 轴为对数刻度。来源：capture/lab/summary/long-threads-x86-real.json。
```

有摘要时，线程仍然在增长。每个旧检查点都留在 Postgres 里，所以存储呈直线增长。60 条消息的触发条件下，它从第 100 轮的 5.98 MB 增长到第 200 轮的 12.42 MB。6,000 个 token 的触发条件下，它从 17.58 MB 增长到 38.00 MB。摘要限制的是模型拿到什么，不限制 checkpointer 保留什么。

## 检查点增长与 DeltaChannel {#s-context-engineering-and-summarization-checkpoint-growth-and-deltachannel}

普通的消息通道在每个检查点里保存整个列表。一个 n 步的线程于是大约保存 n 的平方除以二条消息。

**DeltaChannel：** `langgraph.channels.delta` 里的通道类型，只保存每一步的新写入，外加一份完整快照。快照出现在通道更新了 `snapshot_frequency` 次之后（默认 100 次），或者 5,000 步之后，以先到者为准 {{code libs/langgraph/langgraph/channels/delta.py:50-64}}。它在锁定版本上是 beta。

实验记录里的图用三种方式声明它的消息通道：

```listing
title: 一个普通通道和两种 DeltaChannel 设置
source: capture/lab/T03-checkpoint-cost-x86/t03_ckpt.py
lang: python
---
    if mode == "plain":
        ann = add_messages
    elif mode == "delta100":
        ann = DeltaChannel(_messages_delta_reducer, snapshot_frequency=100)
    else:
        ann = DeltaChannel(_messages_delta_reducer, snapshot_frequency=1000)

    class S(TypedDict):
        messages: Annotated[list, ann]
        n: int
```

`_messages_delta_reducer` 是 `langgraph.graph.message` 里 `add_messages` 的增量形式。它的名字以 `_` 开头，所以在锁定版本上是私有的。

**我们测得**检查点的成本，环境是 x86 服务器客户机，用 `durability="sync"`，每步一条 400 个字符的消息，每次运行一个线程。我们对 `InMemorySaver`、`SqliteSaver` 和 `PostgresSaver`，在 10、100 和 1,000 步各运行 3 次，在 5,000 步运行 1 次。在 Postgres 上，普通线程在 10 步时占 0.05 MB，100 步时占 3.08 MB，1,000 步时占 292.58 MB，5,000 步时占 7,289.37 MB。

用 `DeltaChannel` 并每 100 步一次快照时，5,000 步的线程占 81.2 MB。每 1,000 步一次快照时，占 15.7 MB。从 1,000 步起，普通线程在三种 saver 上大小相同，相差在 0.05% 以内。[图](#fig-5-5b)画出了每次运行。

```figure
id: fig-5-5b
kind: chart
title: 一个线程按步数划分的存储量，普通通道与 DeltaChannel
claim: 普通消息通道在 5,000 步后存储 7,289 MB，DeltaChannel 在每 100 步一次快照时存储 81 MB，每 1,000 步一次快照时存储 16 MB。
caption: 两个坐标轴都是对数刻度。每个点是 PostgresSaver 上的一次运行，10 到 1,000 步各三次，5,000 步一次。来源：capture/lab/summary/checkpoint-cost-x86.json。
```

写入时间也随普通线程增长。在 Postgres 上，最后 10 步的 `put` 中位数，从 10 步时的 2.88 毫秒增长到 5,000 步时的 148.65 毫秒。用任何一种 `DeltaChannel` 设置，它都保持在 1.02 到 1.18 毫秒之间。

读取则相反。在 Postgres 上 1,000 步时，普通线程的 `get_state` 用了 29.28 到 31.8 毫秒。用 `DeltaChannel` 时用了 43.24 到 65.61 毫秒，是每次运行中三次读取里最快的一次。增量通道会根据上一份快照之后的写入重建列表。[第 2.6 节](#s-checkpoint-growth-and-the-cost-of-a-superstep)在 `SqliteSaver` 上的一个真实 agent 里发现了同样的方向，规模更小。100 次往返之后，用 `DeltaChannel` 一次读取用 2.76 毫秒，普通的是 2.59 毫秒。

pregel 页面列出了 `DeltaChannel` 的两条规则 {{docs oss/python/langgraph/pregel}}。不要把一个已持久化的通道在增量和普通之间切换，因为两者对检查点的编码方式不同。不要把用过 `DeltaChannel` 的线程移回早于 1.2 的 LangGraph，因为它读不了增量格式。issue #7714 测量了检查点的 token 成本，一位维护者关闭了它，因为检查点不会发给模型 {{issue 7714}}。我们的数字与此一致：检查点的成本是存储和时间，上下文的成本是 token。

```takeaways
- 给 SummarizationMiddleware 设置 trigger，因为默认值永远不摘要。
- 按完整的轮次裁剪，并检查列表不是以 ToolMessage 开头。
- 没有任何东西限制上下文时，预期每轮耗时会随线程增长。
- 把触发条件定在模型上下文之下，因为填满的上下文会被悄悄截断，随后被拒绝。
- 用回忆问题测试摘要保留了什么，因为摘要可能丢掉事实。
- 长消息通道用 DeltaChannel，并在线程的整个生命周期里保持它的类型。
- 自己清理旧检查点，因为摘要不会缩小 checkpointer。用 DeltaChannel 时，保留快照和它之后的写入，或者先保存一份完整快照。
```

来源：capture/s_start.py, capture/s_middleware.py, capture/out/02-messages.txt, capture/out/10-mw-summarization.txt; capture/lab/summary/long-threads-x86-real.json, capture/lab/summary/checkpoint-cost-x86.json, capture/lab/summary/checkpoint-reads-x86.json, capture/lab/T10-long-threads-x86-real/01-turns-none.jsonl, capture/lab/T10-long-threads-x86-real/01-turns-msgs60_keep7.jsonl, capture/lab/T10-long-threads-x86-real/01-turns-tok6000_keep1500.jsonl, capture/lab/T10-long-threads-x86-real/01-turns-msgs20_keep1.jsonl, capture/lab/T10-long-threads-x86-real/02-none-probe-after-deadline.log, capture/lab/T10-long-threads-x86-real/t10r_long.py, capture/lab/T03-checkpoint-cost-x86/01-steps.jsonl, capture/lab/T03-checkpoint-cost-x86/02-steps-5000.jsonl, capture/lab/T03-checkpoint-cost-x86/t03_ckpt.py; libs/langchain_v1/langchain/agents/middleware/summarization.py and libs/core/langchain_core/messages/utils.py at langchain==1.5.0; libs/langgraph/langgraph/channels/delta.py and libs/langgraph/langgraph/graph/message.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/short-term-memory, oss/python/langchain/middleware/built-in, oss/python/langgraph/pregel); GitHub issues langchain-ai/langchain#38352 and langchain-ai/langgraph#7714.
