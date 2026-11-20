# 流式输出：v1、v2、stream_events v3 与 tools 模式

> 同一次 agent 运行，可以按 v1 流出形状随选项变化的块，按 v2 流出形状固定的 StreamPart 字典，也可以按 v3 流出事件，而 v3 还是 beta。

你用 `stream_mode="messages"` 把 agent 流式输出到聊天窗口，token 一个个到达。接着你加上 `"updates"` 来显示工具进度，循环就坏了，因为现在每个块都是元组。运行本身没有变，变的是流 API 产出数据的形状。

读完本节，你能选择流 API 和流模式，并预测一次运行的每个块。你还能读懂 `tools` 模式的工具事件，而流模式的类型定义里没有列出这个模式。

## v1 中的流模式 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-stream-modes-in-v1}

**流模式（stream mode）：** 你作为 `stream_mode` 传入的名字，决定 `stream` 在图的每一步产出什么。

**块（chunk）：** `stream` 产出的一项。它的形状取决于流模式、模式的数量和流的版本。

录制工具包用每种模式流式运行[第 1.3 节](#s-one-create-agent-run)的 agent。在 `updates` 模式下，每个块是一个节点，加上它写入的状态键：

```listing
title: updates 模式的第一个块
source: capture/out/21-stream-updates-values.txt
lang: json
note: 工具调用被截成只剩名字和 id。
---
chunk 0:
{
  "model": {
    "messages": [
      {
        "type": "AIMessage",
        "content": "",
        "id": "lc_run--<uuid-1>-0",
        "tool_calls": [
          {
            "name": "add",
…
            "id": "<uuid-2>",
```

在 `values` 模式下，每个块是完整的状态。第一个块只有输入，所以同一次运行在 `values` 模式下产出四个块，在 `updates` 模式下产出三个块。

在 `messages` 模式下，每个块是一对数据：一个消息块和它的元数据。元数据指明节点和步数。`ChatOllama` 把工具调用整个放在一个块里发出，随后是一个标为 `last` 的空块。tools 节点的 `ToolMessage` 也作为一个块到达：

```listing
title: messages 模式的前三个块
source: capture/out/22-stream-messages.txt
lang: json
note: 工具调用、回复的元数据和触发器被截掉了。
---
chunk 0:
{
  "message": {
    "type": "AIMessageChunk",
    "content": "",
    "id": "lc_run--<uuid-1>",
…
  "metadata": {
    "langgraph_node": "model",
    "langgraph_step": 1,
…
chunk 1:
{
  "message": {
    "type": "AIMessageChunk",
    "content": "",
    "id": "lc_run--<uuid-1>",
    "chunk_position": "last"
  },
…
chunk 2:
{
  "message": {
    "type": "ToolMessage",
    "content": "5",
…
  "metadata": {
    "langgraph_node": "tools",
    "langgraph_step": 2,
```

最终答案 `2 + 3 = 5.` 随后分成八个文本块到达，例如 `2`、` +` 和 ` `。后面跟着两个空块，第二个标为 `last`。这些切分由 Ollama 决定，换一个模型或版本，文本会按别的方式切开。

[图](#fig-5-1)把每种模式的块放到这一次运行的三次节点运行上。

```figure
id: fig-5-1
kind: timeline
title: 一次 agent 运行在每种流模式下的块
claim: 同一次运行，updates 模式产出 3 个块，values 模式 4 个，messages 模式 13 个，stream_events v3 产出 23 个事件。
caption: 每一行是同一次 agent 运行的一条流。每个标记是一个块，放在产生它的节点运行上。颜色表示块携带的内容：靛蓝是完整状态，梅红是模型输出，绿色是工具输出，琥珀色是开始（空心）或结束的任务。tools 一行是会发出两个 delta 的 slow_sum agent。来源：capture/out/21-stream-updates-values.txt、capture/out/22-stream-messages.txt、capture/out/23-stream-tasks-custom-debug.txt、capture/out/25-stream-events-v3.txt 和 capture/out/26-stream-tools-mode.txt。
```

| 模式 | 一个块是 | add 运行的块数 |
|---|---|---|
| `updates` | `{node: what it wrote}` | 3 |
| `values` | 一步之后的完整状态 | 4 |
| `messages` | 一个消息块和它的元数据 | 13 |
| `tasks` | 一次节点运行的开始或结果 | 6 |
| `debug` | 一个任务或任务结果，带步数和时间 | 6 |
| `custom` | 节点或工具用它的流写入器写出的值 | 0，因为 `add` 什么也不写 |
| `tools` | 一个工具事件：开始、输出 delta 或结束 | 4，来自 `slow_sum` agent |

LangGraph 的流式输出页面说，`tasks` 模式需要 checkpointer {{docs oss/python/langgraph/streaming}}。录制工具包在没有 checkpointer 的情况下运行了 `tasks` 和 `debug`，各得到六个块。没有 checkpointer 时，录制工具包打印出的四个 `debug` 块是 `task` 和 `task_result` 块，后两个它没有打印。本手册把这处分歧记为冲突 D124。`checkpoints` 模式不在录制工具包里，它会在下一版出现，见[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)。

## 同时使用多种模式 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-several-modes-at-once}

传入一个模式列表，每个 v1 块就变成由模式和数据组成的元组。为单一模式写的代码，在加入第二个模式后会坏掉：

```listing
title: v1 中的两种模式
source: capture/out/22-stream-messages.txt
lang: json
note: 录制工具包打印了每个元组的模式、文本和节点。第 3 到 14 个块被截掉。
---
chunk 0:
{
  "mode": "messages",
  "chunk": "",
  "node": "model"
}

chunk 1:
{
  "mode": "messages",
  "chunk": "",
  "node": "model"
}

chunk 2:
{
  "mode": "updates",
  "nodes": [
    "model"
  ]
}
…
chunk 15:
{
  "mode": "updates",
  "nodes": [
    "model"
  ]
}
```

一次模型调用的 `messages` 块，先于同一节点的 `updates` 块到达。节点必须先结束，LangGraph 才知道它写了什么。

## v2 中的 StreamPart {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-streampart-in-v2}

**StreamPart：** `stream(..., version="v2")` 产出的字典，有三个键：`type`、`ns` 和 `data`。`type` 是模式名，`ns` 是子图名。

LangGraph 1.1 加入了 `version="v2"` {{docs oss/python/langgraph/streaming}}。此后无论一种模式还是多种模式，每个块都有同样的三个键：

```listing
title: v2 中的一个 StreamPart
source: capture/out/24-stream-v2.txt
lang: json
note: 状态更新被截掉。键列表是录制工具包加的。
---
part 2:
{
  "type": "updates",
  "ns": [],
  "data": {
    "model": {
…
  "keys": [
    "data",
    "ns",
    "type"
  ]
}
```

`invoke(..., version="v2")` 返回一个 `GraphOutput`，带 `value` 和 `interrupts`。旧的字典访问方式仍然可用，但会给出警告：

```listing
title: 对 GraphOutput 做字典访问
source: capture/out/24-stream-v2.txt
lang: text
---
result['messages'] has 4 messages

warning LangGraphDeprecatedSinceV11: Accessing GraphOutput via `result[key]` is deprecated. Use `result.value` to access the output value directly, or `result.interrupts` for interrupts. Deprecated in LangGraph V1.1 to be removed in V3.0.
```

新代码用 v2。按 `part["type"]` 分支的循环，在你加一种模式或一个子图时仍然能用。[图](#fig-5-1b)把三种形状并排放在一起。

```figure
id: fig-5-1b
kind: comparison
title: 同一个工具结果在 v1、v2 和 v3 中的样子
claim: v1 的形状随模式数量变化，v2 总是产出 type、ns 和 data，v3 再加上一个 method 和一个序号。
caption: 每一列是一种流 API。先看顶部的外层形状，再看它携带的工具结果。来源：capture/out/22-stream-messages.txt、capture/out/24-stream-v2.txt 和 capture/out/25-stream-events-v3.events.json。
```

## stream_events v3 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-stream-events-v3}

**GraphRunStream：** `stream_events(..., version="v3")` 返回的对象。你可以遍历它取原始事件，也可以读它的类型化视图，例如 `messages`、`values` 和 `output`。

LangChain 的流式输出页面建议新应用使用事件流 {{docs oss/python/langchain/streaming}}。在锁定版本上它是 beta，调用时会给出警告：

```listing
title: stream_events v3 及其成员
source: capture/out/25-stream-events-v3.txt
lang: text
note: 成员列表被截成五项。
---
warning LangChainBetaWarning: The v3 streaming protocol on Pregel is experimental.

public members of GraphRunStream:
[
  "abort",
…
  "messages",
  "output",
…
  "tool_calls",
  "values"
]

23 events
```

每个事件有一个 `method`、一个带命名空间和时间的 `params` 对象，以及一个序号 `seq`。这次运行的工具调用是两个 `tools` 方法的事件：

```listing
title: 一个 v3 事件
source: capture/out/25-stream-events-v3.events.json
lang: json
---
  {
    "type": "event",
    "method": "tools",
    "params": {
      "namespace": [],
      "timestamp": "<epoch-ms>",
      "data": {
        "event": "tool-started",
        "tool_call_id": "<uuid-2>",
        "tool_name": "add",
        "input": {
          "a": 2,
          "b": 3
        }
      }
    },
    "seq": 8
  },
```

一次模型调用是一组 `messages` 事件：`message-start`、`content-block-start`、若干 delta、`content-block-finish` 和 `message-finish`。第一次调用只有一个 `tool-call-delta` 类型的 `content-block-delta`，它带着整个调用。第二次调用有八个 `text-delta` 类型的 delta，每段文本一个。每一步之后跟一个 `values` 事件。这次运行共 23 个事件，而 `messages` 模式只有 13 个块。

有三处与 v1、v2 不同，移植代码时会出问题：

- `stream_events(version="v3")` 会拒绝 `stream_mode`，抛出 `TypeError`，因为 v3 自己构建模式集合。
- 同步的 `stream_events(version="v2")` 会抛出 `NotImplementedError`。要拿 v1 和 v2 的事件，请用 `astream_events`。
- `run.output` 里的 AI 消息，内容是标准块的列表，`response_metadata` 里的 `output_version` 为 `v1`。在 v1 和 v2 里，同样的消息内容是字符串。

```listing
title: run.output 的最后一条消息
source: capture/out/25-stream-events-v3.txt
lang: json
---
  {
    "type": "AIMessage",
    "content": [
      {
        "type": "text",
        "text": "2 + 3 = 5.",
        "index": 0
      }
    ],
    "id": "lc_run--<uuid-5>",
    "response_metadata": {
…
      "model_provider": "ollama",
      "output_version": "v1"
    },
```

用 `message.text` 读这类消息的文本，两种形式都适用，见[第 3.3 节](#s-messages-and-content-blocks)。

## tools 模式 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-the-tools-mode}

**工具事件（tool event）：** `tools` 流模式的一个块。它是 `tool-started`、`tool-output-delta` 或 `tool-finished` 之一，并带有 `tool_call_id`。

类型 `StreamMode` 列出七种模式，`stream` 的文档字符串列出同样的七种 {{code libs/langgraph/langgraph/types.py}}。循环代码还接受 `tools` {{code libs/langgraph/langgraph/pregel/main.py}}。LangGraph 的流式输出页面也没有列出它 {{docs oss/python/langgraph/streaming}}。本手册把这个缺口记为冲突 D4。工具用 `runtime.emit_output_delta` 发出 delta：

```listing
title: 一个汇报进度的工具
source: capture/s_stream.py
lang: python
---
@tool
def slow_sum(a: int, b: int, runtime: ToolRuntime) -> int:
    """Add two integers and report progress."""
    runtime.emit_output_delta({"partial": a})
    runtime.emit_output_delta({"partial": a + b})
    return a + b
```

```listing
title: tools 模式
source: capture/out/26-stream-tools-mode.txt
lang: json
note: finished 事件被截成只剩开头几行。
---
chunk 0:
{
  "event": "tool-started",
  "tool_call_id": "<uuid-1>",
  "tool_name": "slow_sum",
  "input": {
    "a": 2,
    "b": 3
  }
}

chunk 1:
{
  "event": "tool-output-delta",
  "tool_call_id": "<uuid-1>",
  "delta": {
    "partial": 2
  }
}
…
chunk 3:
{
  "event": "tool-finished",
  "tool_call_id": "<uuid-1>",
```

不带 `tools` 模式的流里，`emit_output_delta` 什么也不做。录制工具包用 `updates` 模式流式运行同一个 agent，只得到三个节点块。在 v2 里，工具事件是 `type` 为 `tools` 的 StreamPart。

## 各流 API 的送达延迟 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-delivery-delay-of-each-stream-api}

**送达延迟（delivery delay）：** 在同一个时钟下，从模型服务器发出 token，到你的循环看到它之间的时间。

**我们测得**九种流式运行同一个 agent 的送达延迟，环境是 Mac，Apple M1 Max，10 核，64 GiB。Ollama 上的 Qwen3 4B 把每条回复流经 127.0.0.1 上的一个代理，代理在转发每一行时打上时间戳。每种 API 对 80 个 token 的文本回复运行 24 次，token 间隔约 32 毫秒。它还对“一次工具调用加一句话回答”的场景运行 24 次。机器上同时有其他任务，负载均值在 1.4 到 6.2 之间。

九种 API 里有八种按服务器使用的间隔，一个个送出 token。文本回复的首 token 延迟中位数是 1.28 到 3.46 毫秒，最差的 p95 是 7.63 毫秒。请求在调用后 3.8 到 10.5 毫秒到达代理。网上有一种说法，称 LangGraph 的流式输出会给首个 token 增加 100 到 300 毫秒。这里不成立，本手册把它记为冲突 D211。

这些层消耗 CPU 时间，但没有增加你能察觉的延迟。下面的 CPU 时间只是参考值，不是绝对成本，因为机器上同时有其他任务。80 个 token 的一次运行，在纯 `openai` 循环里用了 63.4 毫秒 CPU，在 `ChatOpenAI.stream` 里用了 80.3 毫秒。通过 agent 运行用了 102.3 到 140.4 毫秒。带一次工具调用和一句短回答的运行，在纯循环里用了 20.1 毫秒，通过 agent 用了 41.0 到 49.0 毫秒。

工具调用让最终文本晚到的时间，只有工具往返那么久。Ollama 把每个工具调用放在一个块里发出，这个块在发出后 1.9 到 9.4 毫秒到达循环。第二次请求里，首个 token 在发出后 1.74 到 3.69 毫秒到达循环。[图](#fig-5-1c)里玫红色的一行是例外。

```figure
id: fig-5-1c
kind: chart
title: 按流 API 划分的每次运行的首 token 送达延迟
claim: 九种流 API 里有八种在发出后约 2 毫秒送达首 token，而先读 reasoning 的循环要等 2,663 毫秒。
caption: 每一行是一种流 API，每个点是一次 80 个 token 的 Qwen3 4B 运行，每种 API 24 次，坐标为对数刻度。刻线是中位数，也印在右侧。来源：capture/lab/summary/streaming-mac-real.json。
```

## 一条 v3 消息的投影 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-projections-of-one-v3-message}

**投影（projection）：** 一条 v3 消息的类型化视图，例如 `message.text`、`message.reasoning` 或 `message.tool_calls`，它产出自己的 delta。

issue langchain#38484 报告说，v3 的消费方会一次性拿到最终答案 {{issue langchain#38484}}。我们的运行复现了这一点。触发它的是循环读取各投影的顺序，原因在投影代码里。[图](#fig-5-1c)里玫红色的一行先读 `message.reasoning`，再读 `message.text`，与该 issue 一致：

```listing
title: 先读 reasoning 再读 text 的循环
source: capture/lab/T04-streaming-mac-real/t04_run.py
lang: python
---
    async def consume_messages(ms, label):
        async for message in ms:
            async for d in message.reasoning:
                pass
            async for d in message.text:
                rec.on_text(d, label)
```

Qwen3 4B Instruct 不发 reasoning，但 reasoning 循环仍然要等到消息结束才会结束。随后 80 个文本 token 一次到齐，中位数晚了 2,663 毫秒。

## 为什么第二个投影要等 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-why-the-second-projection-waits}

v3 流不运行后台线程，由读取方来拉取。当 `message.text` 这样的投影，列表里没有新的 delta 时，它的迭代器会运行图，直到下一个事件到来 {{code libs/core/langchain_core/language_models/chat_model_stream.py:247-269}} {{code libs/langgraph/langgraph/stream/run_stream.py:136-160}}。每个被拉取的事件会送给它所属消息的每个投影。一个文本 delta 会进入 `message.text` 的列表，即使此时没人读这个列表。

投影迭代器只在它的投影被标记为完成时才停止。一条消息的三个投影，在同一个地方、也就是整条消息结束时，一并被标记为完成 {{code libs/core/langchain_core/language_models/chat_model_stream.py:1092-1094}}。reasoning 块的结束只会关闭这个块，不会让 `message.reasoning` 完成 {{code libs/core/langchain_core/language_models/chat_model_stream.py:962-976}}。

所以在最后一个文本 token 到达之前，reasoning 循环无法结束。它等待的同时，把每个文本 delta 拉进 `message.text` 的列表。消息结束时，文本循环发现它们已经全在那里。[第 2.5 节](#s-where-each-stream-mode-comes-from)沿着代码追踪了这条路径。

**我们测得**原因，环境是 x86 服务器客户机，Qwen3 8B，开启 reasoning，通过 `create_agent` 运行。三个同步 v3 循环交替各运行 5 次。每条回复有 211 个 reasoning delta，随后是 60 个文本 delta。5 次运行全部如此：先读 reasoning 的循环，在 0.1 毫秒内拿到全部 60 个文本 delta。而模型发完整条回复用了 8.64 到 8.89 秒。

这是一台负载下的机器，所以只把它当作数量级来读。下面 Mac 的几行给出的延迟是 4.0 到 8.5 秒。

只遍历 `message.text` 的循环，每个 delta 的延迟中位数是 0.7 毫秒，最大 4.9 毫秒。遍历每条消息原始事件的循环，中位数 0.7 毫秒，最大 0.9 毫秒。

**我们测得**同样的突发现象，环境是 Mac，Qwen3 8B，开启 reasoning，五个异步 v3 循环，各运行 5 次。每条回复有 763 个 reasoning delta 和 62 个文本 delta。按文档顺序读取的循环，以及 issue 里的 `asyncio.gather` 循环，都在 0.2 毫秒内拿到全部 62 个文本 delta。10 次运行全部如此，这次突发出现在首个文本 delta 发出后 4.0 到 8.5 秒。只读 `message.text` 的循环和读原始事件的循环，看到每个文本 delta 最多比发出时晚 15.3 毫秒。[图](#fig-5-1d)把 Qwen3 4B 的一次运行，按其中两个循环放到时间轴上。

```figure
id: fig-5-1d
kind: timeline
title: 两个异步 v3 循环里每个 token 的发出和看到时刻
claim: 先读 reasoning 的 v3 循环在 4,052 毫秒时一次性看到全部 80 个 token，只读文本的循环则按发出时间逐个看到。
caption: 上面一对是只遍历 message.text 的循环，下面一对先读 message.reasoning。橄榄色刻线是 Ollama 上 Qwen3 4B 的发出时刻，其他刻线是循环看到 token 的时刻。来源：capture/lab/summary/streaming-mac-real.json。
```

顺序对其他投影也有影响。在工具阶段，文档里的循环先读 `message.text`，再读 `message.tool_calls`。Ollama 把调用放在一个块里发出，所以对 Qwen3 4B，文档循环在发出后中位数 7.9 毫秒看到调用。它的异步形式用了 9.4 毫秒，纯循环用了 1.9 毫秒。

**我们测得**不同顺序的影响，用的是真实的 reasoning 模型，环境是 Mac：`ChatOllama` 加 Qwen3 4B 和 `reasoning=True`，每种顺序 3 次运行。先读 reasoning 时，484 个 reasoning delta 实时流出。随后全部 103 个文本 delta 在同一时刻到达，比最后一个 reasoning delta 晚 3,424 到 4,036 毫秒。先读 text 时，文本实时流出，reasoning 在最后一次性到达。Qwen3 8B 在 5 次运行里表现相同。先读 text 时，它的 763 个 reasoning delta 在 2 毫秒内于末尾到齐，晚了 57 到 112 秒。

LangChain 流式输出页面的 reasoning 示例，都是先读 `message.reasoning`，再读 `message.text` {{docs oss/python/langchain/streaming}} {{docs oss/python/langchain/event-streaming}}。对 reasoning 模型来说，这些示例要等整条消息结束才显示答案。LangGraph 页面说，需要按到达顺序拿到每个 delta 时，应读原始事件 {{docs oss/python/langgraph/event-streaming}}。实验记录里的原始事件循环就是这么做的，它在[图](#fig-5-1c)里实时流出了每个 token：

```listing
title: 遍历原始 v3 事件的循环
source: capture/lab/T04-streaming-mac-real/t04_run.py
lang: python
---
def run_v3_raw(ctx, model, scenario, tag, rec):
    run = ctx["agent"].stream_events(inp(scenario, tag), version="v3")
    for ev in run:
        if ev.get("method") != "messages":
            continue
        data = ev["params"]["data"]
        e = data[0] if isinstance(data, (list, tuple)) else data
        if e.get("event") != "content-block-delta":
            continue
        d = e.get("delta", {})
        if d.get("type") == "tool-call-delta":
            rec.on_tool(1, "raw")
        elif d.get("type") == "text-delta":
            rec.on_text(d.get("text", ""), "raw")
```

它的第一个工具调用 delta 在发出后 4.4 毫秒到达，文本在发出后 2.4 毫秒到达。

## 该写的消费方 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-the-consumer-to-write}

二选一。只显示答案时，只读 `message.text`。既显示 reasoning 又显示答案时，遍历每条消息的原始事件，按 delta 类型分支。这样每个 delta 都按模型发出的顺序到达你的界面。上面 x86 的运行用的就是这个循环：

```listing
title: 一个随到随显示 reasoning 和文本的消费方
source: capture/lab/internals/05-streaming/run.py
lang: python
note: 另外两个循环的分支被截掉了。
---
    stream = agent.stream_events({"messages": [{"role": "user", "content": PROMPT_38484}]}, version="v3")
    for message in stream.messages:
…
            for ev in message:
                if ev.get("event") == "content-block-delta":
                    delta = ev.get("delta", {})
                    kind = "reasoning" if delta.get("type") == "reasoning-delta" else "text"
                    got.append((now(), kind, delta.get("reasoning") or delta.get("text")))
```

不要在同一条消息上一个接一个地读两个投影。后读的那个投影总要等到消息结束。这条规则对 `message.tool_calls` 同样成立，上面的工具阶段已经说明。为每个投影开一个任务也许可行，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)把它列为没有运行的项目。

这个 issue 有一个已关闭的拉取请求 #38533，它让 `create_agent` 把运行配置传给 `model_.invoke` {{code libs/langchain_v1/langchain/agents/factory.py:1509}}。这个改动没有碰投影代码。在同一个 agent 里，只读文本的循环和原始事件循环本来就能实时拿到每个 delta。所以不要等 `create_agent` 的修复。

## 真实模型如何流出工具调用 {#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode-how-a-real-model-streams-a-tool-call}

`ChatOllama` 把每个工具调用连同它的 id 整个放在一个块里发出。它的 `tool_call_chunks` 条目里，完整参数是一个字符串，`index` 是 `null`。一个标为 `chunk_position="last"` 的空块结束这条回复：

```listing
title: 携带工具调用的那个块
source: capture/out/27-stream-tool-call-chunks.txt
lang: json
note: 用量和元数据被截掉了。
---
13 chunks, 1 with tool_call_chunks
…
      "tool_call_chunks": [
        {
          "name": "add",
          "args": "{\"a\": 2, \"b\": 3}",
          "id": "<uuid-2>",
          "index": null,
          "type": "tool_call_chunk"
        }
      ],
```

录制工具包还让模型在调用前先写 `Let me add.`。结果先到四个文本块，然后是带调用的块，最后是空的 `last` 块。所以调用从不放在标为 `last` 的块上，v3 为它只给出一个 `tool-call-delta`。如果某个模型或测试替身把参数拆开，并以带标记的块收尾，在 v3 下会丢掉最后一段，见[第 3.4 节](#s-tools-toolruntime-and-tool-errors)。

```takeaways
- 使用 version="v2" 并按 part["type"] 分支，这样新增模式不会改变形状。
- 预期 messages 模式除了模型 token，还会产出 ToolMessage。
- 只在需要检查点时才传 checkpointer，因为 tasks 和 debug 没有它也能工作。
- 在 stream_mode 里加上 "tools"，就能拿到 emit_output_delta 发出的工具进度。
- 把 stream_events v3 当作 beta，并用 message.text 读内容，两种形式都适用。
- 用真实模型测试流式输出，因为测试替身决定了工具调用如何分块。
- 需要 token 实时到达时，读原始 v3 事件，或者每条消息只读一个投影。
- 在同一个循环里不要先读 message.reasoning 再读 message.text，因为每个投影都随消息结束才结束。
- 在同一台机器上，九种流 API 里有八种的送达延迟约为 2 毫秒。
```

来源：capture/s_stream.py, capture/out/21-stream-updates-values.txt, capture/out/22-stream-messages.txt, capture/out/23-stream-tasks-custom-debug.txt, capture/out/24-stream-v2.txt, capture/out/25-stream-events-v3.txt, capture/out/25-stream-events-v3.events.json, capture/out/26-stream-tools-mode.txt, capture/out/27-stream-tool-call-chunks.txt; libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/pregel/main.py, and libs/langgraph/langgraph/pregel/_tools.py at langgraph 1.2.22; libs/partners/ollama/langchain_ollama/chat_models.py at langchain-ollama 1.1.0; capture/lab/summary/streaming-mac-real.json, capture/lab/T04-streaming-mac-real/real_text-per-run.jsonl, capture/lab/T04-streaming-mac-real/real_tool-per-run.jsonl, capture/lab/T04-streaming-mac-real/03-iso38484-qwen3-8b.jsonl, capture/lab/T04-streaming-mac-real/real_text-runs-excerpt.jsonl, capture/lab/T04-streaming-mac-real/real_text-server-excerpt.jsonl, capture/lab/T04-streaming-mac-real/t04_run.py, capture/lab/T04-streaming-mac-real/t04_stream_server.py, capture/lab/T04-streaming-mac-real/t04_iso_real.py; capture/lab/summary/streaming-mac.json, capture/lab/T04-streaming-mac/reasoning-ollama-runs.jsonl; capture/lab/internals/05-streaming/run.py, capture/lab/internals/05-streaming/trace.txt, capture/lab/internals/05-streaming/v3_38484.json; libs/core/langchain_core/messages/ai.py, libs/core/langchain_core/language_models/_compat_bridge.py, and libs/core/langchain_core/language_models/chat_model_stream.py at langchain-core 1.8.0; libs/langgraph/langgraph/stream/run_stream.py at langgraph 1.2.22; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; issue langchain#38484 and pull request #38533; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/streaming, oss/python/langchain/streaming, oss/python/langchain/event-streaming, oss/python/langgraph/event-streaming).
