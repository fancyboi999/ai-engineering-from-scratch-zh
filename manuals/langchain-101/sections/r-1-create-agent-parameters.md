# create_agent 的参数

> `langchain` 1.5.0 中的 `create_agent` 接收一个模型、工具和 13 个关键字参数，返回一个递归上限为 9999 的已编译 LangGraph 图。

表格列出每个参数、它在锁定版本下的类型和默认值，以及代码对它做了什么。每一行的引用都标出 `langchain==1.5.0` 中 `libs/langchain_v1/langchain/agents/factory.py` 的行号。[第 4.1 节](#s-create-agent-and-the-graph-it-builds)解释这张图，最后一列链接到运行每个参数的章节。

读完本节，你能查到 `create_agent` 每个参数的类型、默认值和作用，也能说出它返回的图具有哪些属性。

## 函数签名 {#s-ref-create-agent-parameters-the-signature}

用 `from langchain.agents import create_agent` 导入。函数从第 895 行开始，前面有三个带类型的重载，位于第 827、849 和 873 行 {{code libs/langchain_v1/langchain/agents/factory.py:827-914}}。前两个参数是位置参数，其余都是仅限关键字参数。

| 参数 | 类型 | 默认值 | 代码的行为 | 章节 |
|---|---|---|---|---|
| `model` | `str` 或 `BaseChatModel` | 必填 | 字符串在构建 agent 时经过一次 `init_chat_model` {{code libs/langchain_v1/langchain/agents/factory.py:1050-1051}}. | [3.2](#s-init-chat-model-and-model-profiles) |
| `tools` | 由 `BaseTool`、可调用对象和字典组成的序列 | `None` | 字典表示提供方工具。它绑定到模型上，从不在 `tools` 节点中运行 {{code libs/langchain_v1/langchain/agents/factory.py:1135-1139}}. | [3.4](#s-tools-toolruntime-and-tool-errors) |
| `system_prompt` | `str` 或 `SystemMessage` | `None` | 字符串会变成 `SystemMessage` {{code libs/langchain_v1/langchain/agents/factory.py:1054-1059}}。它排在每次模型请求的最前面，不存入状态 {{code libs/langchain_v1/langchain/agents/factory.py:1506-1507}}. | [3.5](#s-the-system-prompt) |
| `middleware` | `AgentMiddleware` 的序列 | `()` | 两个实例使用同一个 `name` 会抛出 `AssertionError` {{code libs/langchain_v1/langchain/agents/factory.py:1163-1165}}。它们的工具会并入你的工具 {{code libs/langchain_v1/langchain/agents/factory.py:1092}}. | [4.5](#s-middleware-hooks-and-their-order) |
| `response_format` | `ToolStrategy`、`ProviderStrategy`、`AutoStrategy`、一个类型或一个字典 | `None` | 普通的 schema 会变成 `AutoStrategy`，它在每次模型调用时选择策略 {{code libs/langchain_v1/langchain/agents/factory.py:1412-1422}}. | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| `state_schema` | `AgentState` 的子类 | `None` | 中间件的 schema 先合并，这个 schema 最后合并，所以它的字段优先 {{code libs/langchain_v1/langchain/agents/factory.py:1229-1235}}. | [4.1](#s-create-agent-and-the-graph-it-builds) |
| `context_schema` | 一个类型 | `None` | 为一次运行的 `context` 参数提供类型。没有它时，传入 `context` 字典在我们的运行里会触发 pydantic 警告。 | [5.4](#s-stores-and-long-term-memory) |
| `checkpointer` | 一个 `Checkpointer` | `None` | 传给 `compile`。没有它时，运行在两次调用之间不保留状态 {{code libs/langchain_v1/langchain/agents/factory.py:1909-1916}}. | [5.2](#s-checkpointers-and-threads) |
| `store` | 一个 `BaseStore` | `None` | 传给 `compile`，并作为 `runtime.store` 交给工具。 | [5.4](#s-stores-and-long-term-memory) |
| `interrupt_before` | 节点名列表 | `None` | 在指定节点之前设置静态断点，传给 `compile`。 | [6.4](#s-interrupt-and-resume) |
| `interrupt_after` | 节点名列表 | `None` | 在指定节点之后设置静态断点，传给 `compile`。 | [6.4](#s-interrupt-and-resume) |
| `debug` | `bool` | `False` | 传给 `compile`。 | [4.1](#s-create-agent-and-the-graph-it-builds) |
| `name` | `str` | `None` | 设置图名称、每条模型回复的 `name`，以及运行元数据中的 `lc_agent_name` {{code libs/langchain_v1/langchain/agents/factory.py:1510-1511}} {{code libs/langchain_v1/langchain/agents/factory.py:1904-1905}}. | [6.7](#s-subgraphs-and-multi-agent-patterns) |
| `cache` | LangGraph 的 `BaseCache` | `None` | 节点缓存，传给 `compile`。它不是 `set_llm_cache` 的模型缓存。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `transformers` | 流 transformer 工厂的序列 | `None` | 加在 `ToolCallTransformer`、`SubagentTransformer` 和各中间件的 transformer 之后 {{code libs/langchain_v1/langchain/agents/factory.py:1917-1924}}. | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |

docstring 写明 `response_format` 接收 `ToolStrategy`、`ProviderStrategy` 或 Pydantic 类。签名里还接受 `AutoStrategy`、dataclass、`TypedDict` 和 JSON schema 字典，录制文件 `07-structured-output.txt` 把每一种都运行了一遍 {{code libs/langchain_v1/langchain/agents/factory.py:901}}.

## 它返回的图 {#s-ref-create-agent-parameters-the-graph-it-returns}

返回类型是 `CompiledStateGraph`。代码先编译图，再给它应用一份运行配置 {{code libs/langchain_v1/langchain/agents/factory.py:1902-1925}}.

| 属性 | 锁定版本下的值 | 来源 |
|---|---|---|
| 模型节点 | `model` | `graph.add_node("model", ...)` {{code libs/langchain_v1/langchain/agents/factory.py:1614}} |
| 工具节点 | `tools`，一个 `ToolNode`，仅在有客户端工具或 `wrap_tool_call` 中间件时存在 | {{code libs/langchain_v1/langchain/agents/factory.py:1142-1151}} |
| 中间件节点 | `<name>.before_agent`, `<name>.before_model`, `<name>.after_model`, `<name>.after_agent` | 录制文件 `09-middleware-order.txt` |
| `recursion_limit`（递归上限） | 9999 | {{code libs/langchain_v1/langchain/agents/factory.py:1902}} |
| 运行元数据 | `{"ls_integration": "langchain_create_agent"}` | {{code libs/langchain_v1/langchain/agents/factory.py:1903}} |
| 默认 `stream_mode` | `updates` | `StateGraph.compile` {{code libs/langgraph/langgraph/graph/state.py:1357}} |
| 并行工具调用 | 每个待处理的调用对应一个 `Send("tools", [tool_call])`，在同一步中发出 | {{code libs/langchain_v1/langchain/agents/factory.py:2031-2032}} |
| 循环退出 | 没有工具调用，或出现新的 `structured_response` | {{code libs/langchain_v1/langchain/agents/factory.py:2015-2036}} |

`tools` 节点使用 `ToolNode` 的默认错误处理器。参数有误时它返回一条消息，其他所有异常都会抛出 {{code libs/prebuilt/langgraph/prebuilt/tool_node.py:391-399}}. [第 3.4 节](#s-tools-toolruntime-and-tool-errors)演示了这两种情况。

## 状态 {#s-ref-create-agent-parameters-the-state}

`AgentState` 是一个有三个键的 `TypedDict` {{code libs/langchain_v1/langchain/agents/middleware/types.py:351-372}}.

| 键 | 类型 | 说明 |
|---|---|---|
| `messages` | 带 `add_messages` reducer 的消息列表 | 必填 |
| `jump_to` | `"tools"`、`"model"` 或 `"end"` | 私有且临时。节点钩子通过设置它来改变运行的路由 {{code libs/langchain_v1/langchain/agents/middleware/types.py:70}} |
| `structured_response` | 你的 schema | 不在输入 schema 中 |

`InputAgentState` 只含 `messages`。`OutputAgentState` 含 `messages` 和 `structured_response`。

## 一次运行的参数 {#s-ref-create-agent-parameters-arguments-of-a-run}

运行方法属于 `langgraph` 1.2.22 的已编译图。`invoke` 和 `stream` 接收相同的关键字，`stream` 还多接收 `subgraphs` {{code libs/langgraph/langgraph/pregel/main.py:2767-2783}} {{code libs/langgraph/langgraph/pregel/main.py:3948-3962}}.

| 参数 | 默认值 | 说明 | 章节 |
|---|---|---|---|
| `input` | 必填 | 带 `messages` 的字典；传 `None` 表示从检查点继续；或传 `Command` 来恢复。 | [6.4](#s-interrupt-and-resume) |
| `config` | `None` | 含 `recursion_limit`、`max_concurrency`、`callbacks` 和 `configurable`，其中 `thread_id` 放在 `configurable` 里。 | [5.2](#s-checkpointers-and-threads) |
| `context` | `None` | 这次运行的静态数据，通过 `runtime.context` 读取。 | [5.4](#s-stores-and-long-term-memory) |
| `stream_mode` | `invoke` 为 `values`，`stream` 用图的默认值 | [流参考](#s-ref-stream-modes-and-event-types)列出了每种模式。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `durability` | `async` | `sync`、`async` 或 `exit` {{code libs/langgraph/langgraph/pregel/main.py:2715}}. | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| `interrupt_before`、`interrupt_after` | `None` | 只对这次运行生效的断点。 | [6.4](#s-interrupt-and-resume) |
| `subgraphs` | `False` | 仅 `stream` 有。设置后每个块都带有其子图的命名空间。 | [6.7](#s-subgraphs-and-multi-agent-patterns) |
| `version` | `v1` | `v2` 产出 `StreamPart` 字典，同时 `invoke` 返回 `GraphOutput`。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |

来源：libs/langchain_v1/langchain/agents/factory.py、libs/langchain_v1/langchain/agents/middleware/types.py 和 libs/langchain_v1/langchain/agents/structured_output.py（langchain==1.5.0）；libs/langgraph/langgraph/pregel/main.py、libs/langgraph/langgraph/graph/state.py 和 libs/prebuilt/langgraph/prebuilt/tool_node.py（langgraph 1.2.22）； capture/out/05-agent-graph.txt, capture/out/06-agent-run.txt, capture/out/07-structured-output.txt, capture/out/09-middleware-order.txt.
