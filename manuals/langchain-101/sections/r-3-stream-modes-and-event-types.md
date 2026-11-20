# 流模式与事件类型

> LangGraph 的一次运行有八种流模式、两个块版本，还有一个处于 beta 的事件协议；在 `langgraph` 1.2.22 中，它们各有固定的形状。

本页的每一行都来自 `langgraph` 1.2.22 的代码，或来自同一次 agent 运行的录制文件。那次运行有两次模型调用和一次工具调用。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)说明每种模式该在什么时候使用。

## stream 的模式 {#s-ref-stream-modes-and-event-types-the-modes-of-stream}

类型 `StreamMode` 列出七种模式 {{code libs/langgraph/langgraph/types.py:132-134}}。循环还接受 `tools`，类型里没有列出它 {{code libs/langgraph/langgraph/pregel/main.py:2949-2950}}。这处缺口在[来源页](#s-ref-sources-and-conflicts)的冲突登记里记为 D4。

| 模式 | v1 中的一个块 | 我们的运行中的块数 | 录制文件 |
|---|---|---|---|
| `values` | 每一步之后的完整状态 | 4 | `21-stream-updates-values.txt` |
| `updates` | 由节点名映射到该节点所返回更新的字典 | 3 | `21-stream-updates-values.txt` |
| `messages` | 由消息块和元数据字典组成的元组 | 13 | `22-stream-messages.txt` |
| `custom` | 节点或工具传给 `stream_writer` 的值 | 0，因为没有工具写入 | `23-stream-tasks-custom-debug.txt` |
| `tasks` | 带 `id`、`name`、`input` 和 `triggers` 的任务开始，或带 `error` 和 `result` 的任务结果 | 6 | `23-stream-tasks-custom-debug.txt` |
| `debug` | 含 `step`、`timestamp`、`type`（取值 `checkpoint`、`task` 或 `task_result`）和 `payload` 的字典 | 6，没有 checkpointer | `23-stream-tasks-custom-debug.txt` |
| `checkpoints` | 形如 `get_state` 的检查点 | 不在录制工具包中 | 无 |
| `tools` | 工具事件，见下表 | 4，在 `slow_sum` agent 上 | `26-stream-tools-mode.txt` |

没有指定模式时，`create_agent` 图流出 `updates` {{code libs/langgraph/langgraph/graph/state.py:1357}}. 普通的 `Pregel` 对象流出 `values` {{code libs/langgraph/langgraph/pregel/main.py:715}}. 在另一个图内部，没有指定模式的图同样流出 `values` {{code libs/langgraph/langgraph/pregel/main.py:2850-2857}}.

`messages` 块的元数据除其他键外，还含有 `langgraph_node`、`langgraph_step`、`langgraph_triggers`、`ls_provider` 和 `ls_model_type`。读取 `langgraph_node` 可以区分 agent 自己的模型和工具内部的模型。

## v1 中块的形状 {#s-ref-stream-modes-and-event-types-the-shape-of-a-chunk-in-v1}

| 调用方式 | `stream` 产出的内容 |
|---|---|
| 一种模式 | 块本身 |
| 模式列表 | 元组 `(mode, chunk)` |
| 一种模式加 `subgraphs=True` | 元组 `(namespace, chunk)` |
| 模式列表加 `subgraphs=True` | 元组 `(namespace, mode, chunk)` |

## v2 中的 StreamPart {#s-ref-stream-modes-and-event-types-streampart-in-v2}

使用 `version="v2"` 时，不论请求哪些模式，每个块都是带有 `type`、`ns` 和 `data` 键的 `TypedDict`。`v2` 取值是 `langgraph` 1.1.0 引入的。

| 类型 | `type` 取值 | 在 `types.py` 中的行号 |
|---|---|---|
| `ValuesStreamPart` | `values` | 274 |
| `UpdatesStreamPart` | `updates` | 286 |
| `MessagesStreamPart` | `messages` | 298 |
| `CustomStreamPart` | `custom` | 311 |
| `CheckpointStreamPart` | `checkpoints` | 322 |
| `TasksStreamPart` | `tasks` | 330 |
| `DebugStreamPart` | `debug` | 345 |

{{code libs/langgraph/langgraph/types.py:274-379}}

`invoke(..., version="v2")` 返回带 `value` 和 `interrupts` 的 `GraphOutput` {{code libs/langgraph/langgraph/types.py:381-421}}. 把它当字典访问仍然可用，但会发出 `LangGraphDeprecatedSinceV11` 警告，见录制文件 `24-stream-v2.txt`。

## 工具事件 {#s-ref-stream-modes-and-event-types-tool-events}

`tools` 模式为每个工具事件产出一个字典，`event` 键给出事件种类：

| `event` | 其他键 | 我们的运行中的数量 |
|---|---|---|
| `tool-started` | `tool_call_id`, `tool_name`, `input` | 1 |
| `tool-output-delta` | `tool_call_id`, `delta` | 2，来自 `runtime.emit_output_delta` |
| `tool-finished` | `tool_call_id`, `output`（即 `ToolMessage`） | 1 |
| `tool-error` | 由协议定义 | 0 |

{{code libs/prebuilt/langgraph/prebuilt/tool_node.py:1766}} {{code langchain_protocol/protocol.py:518-534}}

## stream_events v3 {#s-ref-stream-modes-and-event-types-stream-events-v3}

`stream_events` 默认是 `version="v2"`，必须显式指定 `v3` {{code libs/langgraph/langgraph/pregel/main.py:3751-3758}}. v3 版本处于 beta，并会发出警告 `LangChainBetaWarning: The v3 streaming protocol on Pregel is experimental.` {{code libs/langgraph/langgraph/pregel/main.py:3617}}. 它返回 `GraphRunStream`，在录制文件 `25-stream-events-v3.txt` 中它的公开成员是 `abort`, `extensions`, `interleave`, `interrupted`, `interrupts`, `lifecycle`, `messages`, `output`, `subagents`, `subgraphs`, `tool_calls`, and `values`.

| 规则 | 位置 |
|---|---|
| 在 v3 下，`stream_mode` 和 `subgraphs` 会抛出 `TypeError`。 | {{code libs/langgraph/langgraph/pregel/main.py:395-400}} |
| 同步的 `stream_events` 配 v1 或 v2 会抛出 `NotImplementedError`。这些版本请用 `astream_events`。 | {{code libs/core/langchain_core/runnables/base.py:1818}} |
| 录制工具包用 `langchain-protocol` 0.0.21 锁定事件的形状。 | `capture/requirements.txt` |

每个原始事件是一个帧：`type` 为 `event`，带有 `method`、含 `namespace`、`timestamp` 和 `data` 的 `params`，以及一个 `seq` 序号。我们的运行产生了 23 个帧：4 个 `values`、17 个 `messages` 和 2 个 `tools`。

| `method` | `data` 的内容 | 在 `protocol.py` 中的行号 |
|---|---|---|
| `lifecycle` | 图或子 agent 的状态：`started`、`running`、`completed`、`failed` 或 `interrupted` | 269, 462 |
| `messages` | 消息事件及其元数据 | 273 |
| `tools` | 工具事件 | 277 |
| `input.requested`, `input.answered` | 中断及其回答 | 281, 285 |
| `values`, `updates`, `checkpoints`, `custom`, `tasks` | 同名 v1 模式的数据 | 289 到 305 |

{{code langchain_protocol/protocol.py:269-306}}

一个 `messages` 帧针对一条模型消息携带下面其中一种事件：

| 事件 | 键 | 我们的运行中的数量 |
|---|---|---|
| `message-start` | `role`, `id` | 2 |
| `content-block-start` | `index`, `content` | 2 |
| `content-block-delta` | `index`, `delta`，例如 `{"type": "text-delta", "text": "The"}` | 9，其中 8 个是 `text-delta`，1 个是 `tool-call-delta` |
| `content-block-finish` | `index`, `content`（完整的块） | 2 |
| `message-finish` | 我们的运行中没有键 | 2 |
| `error` | 由协议定义 | 0 |

{{code langchain_protocol/protocol.py:470-495}}

如果提供方以流的方式发送工具调用的参数，就会发出 `tool-call-delta` 增量 {{code langchain_protocol/protocol.py:177}}. `ChatOllama` 则在最后一个块之前，把每个调用完整地放在一个块里发出。所以录制工具包的 v3 运行里只有一个 `tool-call-delta`，它携带了整个调用。

来源：libs/langgraph/langgraph/types.py、libs/langgraph/langgraph/pregel/main.py 和 libs/langgraph/langgraph/graph/state.py（langgraph 1.2.22）；libs/prebuilt/langgraph/prebuilt/tool_node.py（langgraph-prebuilt 1.1.2）；libs/core/langchain_core/runnables/base.py（langchain-core 1.8.0）；langchain_protocol/protocol.py（langchain-protocol 0.0.21）； capture/requirements.txt, capture/README.md, capture/out/21-stream-updates-values.txt, capture/out/22-stream-messages.txt, capture/out/23-stream-tasks-custom-debug.txt, capture/out/24-stream-v2.txt, capture/out/25-stream-events-v3.txt, capture/out/25-stream-events-v3.events.json, capture/out/26-stream-tools-mode.txt.
