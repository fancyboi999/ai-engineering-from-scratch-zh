# LangChain 101 录制工具包

LangChain 101 里的每份代码清单，都截取自 `out/` 里的一个文件。这套工具包在一个 Python 进程中驱动 LangChain、LangGraph、Deep Agents、`langchain.mcp` 和 LangSmith SDK。场景需要模型时，用的是真实模型：聊天用 `qwen3:4b-instruct-2507-q4_K_M` 上的 `ChatOllama`，嵌入用 `nomic-embed-text` 上的 `OllamaEmbeddings`。没有任何场景使用假的或脚本化的聊天模型，也没有假嵌入。

场景分两类。

- **无模型录制**不调用任何模型：版本、消息、工具 schema、图结构、持久性、普通图上的中断、reducer、函数式 API、子图、错误处理器和递归上限。它们是确定性的，`--check` 会重新运行并逐字节比较。
- **有模型录制**会调用模型：聊天模型、嵌入模型，或两者。每个文件的标题下都有一行 `Recorded on ...`，写明日期、机器、Ollama 版本、作答的模型，以及聊天模型作答时的 `ChatOllama` 设置。由嵌入模型作答的文件写着 `OllamaEmbeddings settings: none beyond the model name.`。模型在新的一次运行里可能给出不同的回答，所以 `--check` 不会重新运行它们。它改为检查每个已存文件里必须成立的结构，并打印一行 `skipped:`。

```bash
python3 capture/run.py                # writes every file in capture/out/; needs Ollama
python3 capture/run.py --model-free   # writes only the model-free files; needs no network
python3 capture/run.py --check        # model-free: byte for byte; recorded: structure only, then one skipped: line
python3 capture/run.py --check --live # also records the model scenarios again into a temporary folder and checks their structure
```

在手册目录里运行它们。`--check` 会打印 `ok: N model-free files match`、`ok: M recorded files have their model line and expected structure`，以及 `skipped: running the M recorded scenarios again needs Ollama with qwen3:4b-instruct-2507-q4_K_M and nomic-embed-text; run.py --check --live does it`。出现偏差时，它先打印差异或缺失的结构，再打印 `drift: ...`，并以状态码 1 退出。

有模型录制文件的结构检查，要求有 `Recorded on ...` 行，没有 `SCENARIO FAILED`，没有 `network attempts blocked`，并且 `expect.py` 为该场景列出的每个字符串都在。这些字符串是手册所依赖的事实：消息类型、工具名、错误类，以及模型造成的计数。它们不是模型的措辞。

## 安装

工具包需要 Python 3.13，以及 `requirements.txt` 里的确切版本。

```bash
python3.13 -m venv capture/.venv
capture/.venv/bin/pip install -r capture/requirements.txt
```

运行 `run.py` 的解释器没有这些锁定版本的包时，`run.py` 会用 `capture/.venv/bin/python`，或 `LANGCHAIN101_PYTHON` 指定的解释器，重新运行自己。两者都找不到时，`--check` 会打印 `skipped:` 和原因并以 0 退出，而普通运行以 1 退出。`capture/.venv/` 被 git 忽略。

你也可以一次只运行一个场景：`python3 capture/run.py mw-hitl stream-v2` 只写出名字以这些词开头的文件，`out/` 的其余部分保持原样。普通运行从不删除 `out/` 里的文件。

## 模型

有模型录制需要 Ollama，并已拉取 `qwen3:4b-instruct-2507-q4_K_M` 和 `nomic-embed-text`。`LC101_OLLAMA_URL` 设置服务器，默认是 `http://127.0.0.1:11434`。`LC101_MACHINE` 设置写入 `Recorded on ...` 行的机器名。

`common.llm()` 构建工具包里的每个聊天模型：

| 设置 | 值 | 原因 |
|---|---|---|
| `model` | `qwen3:4b-instruct-2507-q4_K_M` | 一个会调用工具、没有思考输出的小型 instruct 模型 |
| `temperature` | `0` | 在同一台机器上，同一个提示词大多数时候得到同样的回复 |
| `seed` | `42` | 在 temperature 0 仍留有选择余地的地方固定采样器 |
| `num_ctx` | `16384` | Deep Agents 的系统提示词和它的工具需要比默认值更多 |
| `num_predict` | `512` | 给每次回复设上限，让自我重复的模型能停下来 |

`20-mw-decisions.txt` 还构建了 `qwen3:8b`，作为 `ModelRouterMiddleware` 的 `deep` 路线。它是路由器可以选的一个选项，在这次录制里路由器选了 `fast`，所以 `qwen3:8b` 没有被调用。没有场景需要推理输出，所以没有别的场景构建 `qwen3:8b`。

模型是真实的，所以工具包的提示词会要求场景要展示的行为，例如一次回复里调用两个工具，或者用文字给出一个值。模型并不总是照提示词做，文件记录的是它实际做了什么。手册的每一节描述的是录制下来的运行，而不是请求。

失败也是真实的：

- 失败的工具是一个会抛出异常的 Python 函数，例如 `flaky_disk` 和 `flaky_fetch`。
- 失败的模型是指向 `http://127.0.0.1:9` 的 `ChatOllama`，那里没有任何监听，所以连接被拒绝。
- 先失败后成功的模型，是指向 `common.py` 里 `FlakyEndpoint` 的 `ChatOllama`。它是 `127.0.0.1` 上的一个 TCP 中继，会关闭它接受的前几个连接，把其余的转发给 Ollama。
- `ModelRouterMiddleware` 和 `AutoModeMiddleware` 用的决策模型，是 `common.py` 里的 `OllamaDecisionModel`。LangChain 只自带 OpenAI 和 Google 的决策模型。工具包里的这个模型把每个问题和状态以 JSON 模式发给 `ChatOllama`，再把 JSON 回复变成带类型的答案。

每个调用聊天模型的场景，都通过一个回调处理器 `common.Recorder` 记录模型收到了什么。它列出每次调用的消息（截成 80 个字符），以及绑定到该调用上的工具。

`common.embeddings()` 构建工具包的嵌入模型：来自 `langchain-ollama` 的 `OllamaEmbeddings(model="nomic-embed-text")`，在同一个 Ollama 服务器上，不设其他选项。x86 服务器客户机上的标签是 `nomic-embed-text:latest`，id 为 `0a109f422b47`，与 Mac 上相同。一个向量有 768 个数。`33-store.txt` 把它用作 `InMemoryStore` 的索引，`39-retrieval.txt` 把它用作 `InMemoryVectorStore` 的嵌入，`47-retrieval-agent.txt` 把它放在 Qwen3 4B 调用的检索器背后。这三个文件是有模型录制文件，因为嵌入模型也是模型：得分和命中的顺序都来自它。

## 锁定版本

| 包 | 版本 |
|---|---|
| langchain | 1.5.0 |
| langchain-core | 1.8.0 |
| langgraph | 1.2.22 |
| langgraph-checkpoint | 4.3.2 |
| langgraph-prebuilt | 1.1.2 |
| langgraph-checkpoint-sqlite | 3.1.3 |
| deepagents | 0.7.38 |
| langsmith | 0.14.17 |
| fastmcp | 4.2.0（由 `langchain[mcp]` 解析得到，它要求 `fastmcp>=4.0.11`） |
| mcp | 2.3.0 |
| langchain-text-splitters | 1.1.3 |
| langchain-ollama | 1.1.0（`ChatOllama`，每个有模型录制所用的模型） |
| langchain-openai、langchain-anthropic | 1.8.0、1.7.10（仅用于在 `01` 里离线构建模型） |
| pydantic | 2.14.3 |
| numpy | 2.5.4（`InMemoryVectorStore` 需要它，后者用 NumPy 计算余弦相似度） |

`requirements.txt` 还固定了那些代码会出现在输出里的传递依赖包：`langchain-protocol`（v3 事件的形状）、`langgraph-sdk`、`fastmcp-slim`、`mcp-types`、`openai`、`anthropic`、`ollama`、`aiosqlite` 和 `uuid-utils`。`00-versions.txt` 记录实际安装的内容。

## 输出如何保持稳定

- 场景在一个进程里按固定顺序逐个运行。`run.py` 会带着 `PYTHONHASHSEED=0` 和 `TZ=UTC` 重新运行自己。
- `run.py` 删除每个 `LANGSMITH_*`、`LANGCHAIN_*`、`LANGGRAPH_*`、`OPENAI_*`、`ANTHROPIC_*` 和 `LC_*` 变量，然后设置 `LANGSMITH_TRACING=false`。开着追踪会把运行记录发送出去，而 LangGraph 会读取 `LANGGRAPH_DEFAULT_RECURSION_LIMIT`。
- `run.py` 替换了 `socket.getaddrinfo`，所以除 `localhost` 和 `127.0.0.1` 之外的每个主机都解析失败。Ollama 在 `127.0.0.1` 上。试图访问其他主机的录制会以 `network attempts blocked: <host>` 结束。没有任何文件含有这一行，出现就会使检查失败。
- 重试中间件以 `initial_delay=0.0` 和 `jitter=False` 运行。`RetryPolicy` 以 `initial_interval=0.0` 和 `jitter=False` 运行。
- `16` 在写出中断之前，按每次调用的第一个参数对它们排序。
- 每个文件在写出时就被遮蔽。遮蔽规则见下表。

### 遮蔽规则

每条规则替换一个每次运行都会变的值。带编号的标记按它在一个文件里首次出现的顺序递增，所以同一个 id 在文件内保持同一个标记。`25-stream-events-v3.txt` 和它的 `.events.json` 共用一个计数。

| 模式 | 替换为 | 它是什么 |
|---|---|---|
| UUID（`8-4-4-4-12` 个十六进制字符） | `<uuid-N>` | 消息 id（模型返回的 `lc_run--<uuid-N>-0`，`add_messages` 给出的裸 UUID）、`ChatOllama` 的工具调用 id、MCP 内容块 id（`lc_<uuid-N>`）、检查点 id、运行 id、追踪 id，以及检查点命名空间里的任务 id，例如 `model:<uuid-N>` |
| 32 个十六进制字符且至少含一个字母 | `<hex-N>` | 中断 id |
| `<32 digits>.0.<digits>` | `<32 digits>.<random>` | 检查点里的通道版本。`InMemorySaver` 会给每个版本加一个随机浮点数 |
| ISO 8601 时间 | `<time>` | Ollama 回复的 `created_at`、store 条目的 `created_at` 和 `updated_at`、Deep Agents 文件时间。所有时间用同一个标记，因为两个时间戳可能落在同一微秒，也可能不在 |
| 键名以 `_duration` 结尾的整数 | `<ns>` | Ollama 放进 `response_metadata` 的计时，单位为纳秒 |
| `YYYYMMDDTHHMMSS...Z` | `<dotted-time>` | LangSmith `dotted_order` 的时间部分 |
| 键名为 `timestamp`、`created_at`、`updated_at`、`start_time`、`end_time`、`ts` 或 `time` 下大于 1e9 的数 | `<epoch-ms>` | v3 流事件的时间 |
| 临时目录 | `<tmp>`，工具包创建的文件夹为 `<tmp>/m101` | SQLite 文件、shell 与文件搜索的工作区 |
| `.../site-packages/` | `<site-packages>/` | 栈帧里的路径 |
| `0x` 加 6 个或更多十六进制数字 | `0x<addr>` | `repr` 里的对象地址 |
| `elapsed: 0.052s` | `elapsed: <seconds>` | `NodeTimeoutError` 消息里测得的时间 |
| `/home/<name>` 或 `/Users/<name>` | `<home>` | 录制所用机器的主目录 |
| 除 `11434` 和 `9` 以外的 `127.0.0.1:<port>` | `127.0.0.1:<port>` | `FlakyEndpoint` 的随机端口 |

工具包不记录 `ResourceWarning`。`ShellToolMiddleware` 在运行结束后会留下两条没关的管道，而警告在垃圾回收器运行时才出现，那不是一个固定的时间点。

## 进程与服务器

| 对象 | 位置 | 它展示什么 |
|---|---|---|
| 录制进程 | 进程内 | 下面的所有内容 |
| Ollama | `127.0.0.1:11434`，在做录制的机器上 | 每次模型调用 |
| `FlakyEndpoint` | 进程内，`127.0.0.1` 随机端口上的 TCP 中继 | `12` 里一次失败两次后成功的模型调用 |
| FastMCP 服务器 `calc` | 进程内，作为 `FastMCP` 对象传给 `MCPAdapter`，没有端口 | MCP 工具、一个工具错误、一个资源 |
| SQLite | 临时文件夹里的一个文件 | 跨重启的 `SqliteSaver` |
| `/bin/sh` | 由 `ShellToolMiddleware` 在临时文件夹里启动的子进程 | shell 工具 |
| LangSmith 客户端 | 进程内，带一个返回 200 并记录每个请求的 HTTP 会话 | `tracing_context(enabled="local")` 发送的内容 |

工具包只绑定一个端口，即 `FlakyEndpoint` 的端口，而且只在 `12` 运行期间绑定。

## 输出文件

| 文件 | 展示什么 |
|---|---|
| `00-versions.txt` | Python 次版本号，以及每个锁定版本的包的已安装版本 |
| `01-init-chat-model.txt` | 用于 OpenAI、Anthropic 和 Ollama 的 `init_chat_model`、模型档案（model profile）、提供方推断、未知名称的错误、可配置模型、工具包 `ChatOllama` 的设置 |
| `02-messages.txt` | 消息类型、dict 与 tuple 的强制转换、`content_blocks`、多模态块、被解析成标准块的 Anthropic 风格推理、块相加、工具调用块合并、`trim_messages` |
| `03-tools.txt` | `@tool` 的 schema、对模型隐藏的 `ToolRuntime` 参数、在 agent 之外调用的 `ToolRuntime` 工具 |
| `04-tool-errors.txt` | 抛出异常的工具（运行随之抛出）、模型自己修正的错误参数请求、模型拒绝的超出 schema 的值、`ToolErrorMiddleware`、指名一个不存在的工具的提示词，以及两次部署之间被移除的工具（一条错误 `ToolMessage`） |
| `05-agent-graph.txt` | `create_agent` 的节点、边、Mermaid、`recursion_limit` 9999、默认流模式 `updates` |
| `06-agent-run.txt` | 一次完整运行，以及模型在每次调用中收到的内容，含系统提示词 |
| `07-structured-output.txt` | `AutoStrategy` 按档案选择 `ToolStrategy` 或 `ProviderStrategy`、作为 Ollama JSON schema 格式的 `ProviderStrategy`、带 TypedDict 和 dataclass 的 `ToolStrategy`（Ollama 以 400 拒绝了第三个请求）、原始 JSON schema、联合类型、绑定了 `add` 工具的 `ToolStrategy` 和 `ProviderStrategy` |
| `08-structured-errors.txt` | 要求无效值的提示词（模型发回的是有效值）、一条消息里的两次结构化调用及其重试、自定义重试消息、`handle_errors=False`、用于单词、小数和纯文本提示词的 `ProviderStrategy`、结构化调用之前的普通工具 |
| `09-middleware-order.txt` | 三个带全部钩子的中间件：图节点、边，以及一次工具往返的钩子顺序 |
| `10-mw-summarization.txt` | 带消息触发条件和不带触发条件的 `SummarizationMiddleware` |
| `11-mw-call-limits.txt` | `ModelCallLimitMiddleware` 的运行与线程上限，以及 `ToolCallLimitMiddleware` 的 `continue`、`end` 和 `error` |
| `12-mw-retries.txt` | `ToolRetryMiddleware` 和 `ModelRetryMiddleware`：失败后成功（模型经由 `FlakyEndpoint`）、重试用尽、`on_failure="error"`、`retry_on` 过滤器 |
| `13-mw-fallback-refusal.txt` | 主模型在一个死端口上的 `ModelFallbackMiddleware`、每个模型都失败的链、文本形式的拒绝（带与不带 `ModelRefusalMiddleware`），以及它之前带备用模型的情形 |
| `14-mw-pii.txt` | 用 `redact`、`mask`、`hash`、`block`、作用于输出，以及带自定义正则检测器的 `PIIMiddleware` |
| `15-mw-hitl-batched.txt` | 批量模式下的 `HumanInTheLoopMiddleware`：中断、编辑与拒绝、错误数量的决定、回应 |
| `16-mw-hitl-per-call.txt` | 逐调用模式：每次调用一个带其 `response_schema` 的中断、按中断 id 的恢复映射、被 schema 拒绝的答案 |
| `17-mw-todo-context-editing.txt` | `TodoListMiddleware` 与 `state["todos"]`、带 `ClearToolUsesEdit` 的 `ContextEditingMiddleware` |
| `18-mw-selection-emulation.txt` | `LLMToolSelectorMiddleware`、`LLMToolEmulator`、`ProviderToolSearchMiddleware`（在 `ChatOllama` 上报错，没有延迟项时直接透传）、`dynamic_prompt` |
| `19-mw-shell-files.txt` | 没有 ripgrep 的 `FilesystemFileSearchMiddleware`，以及两次运行里带 `HostExecutionPolicy` 的 `ShellToolMiddleware`；模型把每条 shell 命令和每个 `include` 都当作对象发来，所以这些调用没通过校验 |
| `20-mw-decisions.txt` | 带 `OllamaDecisionModel` 的 `ModelRouterMiddleware`（beta）和 `AutoModeMiddleware`，以及决策模型对每次调用的回答 |
| `21-stream-updates-values.txt` | `stream_mode` 的 `updates`、`values` 和默认值 |
| `22-stream-messages.txt` | 带元数据的 `stream_mode="messages"` 逐 token 块，以及 `["updates", "messages"]` 元组 |
| `23-stream-tasks-custom-debug.txt` | `tasks`、`custom` 和 `debug`（各取前四个块） |
| `24-stream-v2.txt` | `version="v2"` 的 `StreamPart` 字典、`invoke(version="v2")` 与 `GraphOutput`、`result[key]` 的弃用 |
| `25-stream-events-v3.txt` | `stream_events(version="v3")`：beta 警告、`GraphRunStream` 成员、事件序列、被拒绝的 `stream_mode`、同步 `stream_events` v2 未实现 |
| `25-stream-events-v3.events.json` | 该次运行的每个 v3 事件帧 |
| `26-stream-tools-mode.txt` | `tools` 流模式、`emit_output_delta`，以及 v2 里与 `updates` 一起的 `tools` |
| `27-stream-tool-call-chunks.txt` | `ChatOllama` 在 `messages` 模式下如何流式输出一次工具调用，单独输出，以及跟在文本之后 |
| `28-checkpoint-memory.txt` | 跨两轮的 `InMemorySaver`、`get_state`、原始检查点元组、线程隔离、`delete_thread`、缺少 `thread_id` 的错误 |
| `29-checkpoint-sqlite.txt` | 跨两轮并重新打开文件的 `SqliteSaver`、表和行 |
| `30-state-history-forks.txt` | `get_state_history`、从检查点重放（工具会再运行一次）、`update_state` 分叉、`update_state(as_node="tools")` |
| `31-durability.txt` | 带 checkpointer 的 `sync`、`async`、`exit` 及各自保存的检查点；没有 checkpointer 的每种模式，以及 issue #9267 的 `sync` 崩溃；已弃用的 `checkpoint_during` |
| `32-interrupt-resume.txt` | `interrupt()` 与 `Command(resume=...)`、节点从头再运行、一个节点里的两个中断、`response_schema`、没有 checkpointer 的中断、对已完成线程的恢复 |
| `33-store.txt` | `InMemoryStore` 的 put、get、`list_namespaces`、前缀搜索、过滤、删除，以及带 `nomic-embed-text` 的索引和两次查询 |
| `34-stategraph-reducers-send-command.txt` | `operator.add` reducer、`Send` 扇出、`Command(goto=...)`、没有 reducer 的并发写入、`add_messages`、`MessagesState` |
| `35-functional-api.txt` | 在任务里带中断的 `@entrypoint` 和 `@task`、恢复、带 `previous` 的 `entrypoint.final` |
| `36-subgraphs.txt` | 作为节点的已编译子图、`xray` Mermaid、`subgraphs=True` 命名空间、子图内部的中断 |
| `37-error-handler-timeout.txt` | `RetryPolicy` 之后的节点 `error_handler`、`set_node_defaults(error_handler=...)`、节点 `timeout`、被处理器捕获的超时 |
| `38-recursion-limit.txt` | `recursion_limit=5`、默认上限（10007）、`RemainingSteps` |
| `39-retrieval.txt` | `RecursiveCharacterTextSplitter`、带 `nomic-embed-text` 的 `OllamaEmbeddings`、`InMemoryVectorStore` 对三个查询的搜索、过滤、删除、MMR |
| `40-mcp.txt` | `langchain.mcp` 的 beta 警告、进程内 FastMCP 服务器上的 `MCPAdapter.list_tools()`、工具结果与产物、一个 MCP 工具错误、经 `adapter.client` 读取的资源、裸字符串目标的错误 |
| `41-deep-agent.txt` | `create_deep_agent` 的节点、一次用到 `add`、`write_file`、`ls` 和一个 `task` 子 agent 的运行、状态里的 `files`、每次调用绑定的工具、两份系统提示词 |
| `42-langsmith.txt` | 追踪关闭时的 `traceable`、经 `on_end` 的 `tracing_context(enabled="local")` 运行树、一个错误运行、本地追踪包住一次 `create_agent` 运行时发送的请求、`enabled=False` 的 `collect_runs`，以及对一个函数、一个 agent 和一个关闭追踪的 agent 做的 `evaluate(upload_results=False)` |
| `43-tool-runtime-agent.txt` | agent 内部一个 `ToolRuntime` 工具的 `context` 和自定义流 |
| `44-store-agent.txt` | 一个通过 `ToolRuntime` 读取 store 的工具，面向两个用户 |
| `45-subgraph-agent.txt` | 作为子图节点的 agent，以及它的命名空间 |
| `46-recursion-agent.txt` | 被告知永远调用某个工具的模型，带 `recursion_limit=6` |
| `47-retrieval-agent.txt` | 包装成工具的、基于 `nomic-embed-text` 的检索器，由模型调用 |
| `48-draw-agent.txt` | `create_agent` 图的 `get_graph()`（含节点数据与元数据）、`draw_mermaid()`、`draw_ascii()`（ImportError：锁定版本下没有 `grandalf`），以及未被调用的 `draw_mermaid_png()` 的默认值 |
| `49-draw-middleware.txt` | 带 `middleware=[A, B, C]` 的 agent 的节点、边、Mermaid 和 `draw_ascii()` |
| `50-draw-fanout.txt` | `Send` 与 `Command` 的笑话图的同样内容 |
| `51-draw-functional.txt` | 一个 `@entrypoint` 的同样内容 |
| `52-draw-subgraph.txt` | `36` 的父图的同样内容，含 `get_graph()` 和 `get_graph(xray=True)` |
| `53-draw-deep-agent.txt` | `create_deep_agent` 的同样内容，以及它带 `xray=True` 的节点 |
| `54-draw-service-agent.txt` | `lab/prodapp-mac/code` 里生产服务的 `build_agent` 的同样内容，其 OpenTelemetry 模块用了一个替身 |

文件 `00` 到 `03`、`05`、`31`、`32`、`34` 到 `38`，以及 `48` 到 `54` 是无模型录制，其余是有模型录制。`33` 和 `39` 只调用嵌入模型。`43` 到 `47` 装的是某个场景的模型部分，该场景的另一部分仍是无模型的，所以它们排在主列表之后。`48` 到 `54` 构建手册里的每张图并写出它的 Mermaid 文本，所以排在最后。它们会构建模型但不调用，也从不调用会访问网络的 `draw_mermaid_png()`。

## 实验记录

`capture/lab/` 存放用真实模型或真实数据库的运行得到的原始录制，运行在 Mac 和一台 x86 服务器客户机上。`labsum.py` 为每组数据计算一份摘要，写入 `capture/lab/summary/`，手册里的图表和实测数字都读取这些摘要。普通的 `run.py` 会写出它们，`run.py --check` 会重新计算并比较，然后打印一行 `skipped:`，因为重新录制这些运行需要 Ollama 和 Postgres。`capture/lab/README.md` 列出每个文件夹。文件夹 `chat-ui-mac/`、`T22-sec-fs-permissions-mac/` 和 `T23-sec-store-namespace-mac/` 存放 Agent Chat UI，以及 Deep Agents 文件规则与 store 命名空间的运行。

## 工具包不录制什么

- Ollama 之外的提供方：OpenAI 或 Anthropic 的请求字节和流式块。实验记录涵盖了其中一部分。
- 带真实延迟的 `ProviderToolSearchMiddleware`。它需要 Anthropic 或 OpenAI 模型，所以在 `ChatOllama` 上它会抛出 `ValueError`。
- 抛出异常的 `ModelRefusalMiddleware`。它作用于 `refusal` 内容块，而 Ollama 从不发送这种块。Qwen3 4B 以纯文本拒绝，会被直接放行。
- 来自真实模型的校验错误。让 Qwen3 4B 给整数字段填小数、给数字填单词，或填超出范围的值，它发回的是有效参数，或者用文字拒绝。工具包里的错误参数来自 `19` 里的 shell 工具。
- LangSmith 追踪到服务器、数据集、会上传的实验，以及prompt hub。工具包把追踪发给一个带录制 HTTP 会话的客户端，用 `upload_results=False` 运行 `evaluate`，并记录客户端本来会发送的内容。
- 基于 stdio 和 HTTP 传输的 `langchain.mcp`、征询输入和 OAuth。工具包只用进程内传输。
- `PostgresSaver` 和 `PostgresStore`。它们需要一个运行中的 Postgres。
- Agent Server（`langgraph dev`、`up`、`deploy`）。
- 任何形式的计时。工具包遮蔽每次回复的计时，`out/` 里没有任何东西是测量值。

## 工具包与参考行为的差异

- 模型是 CPU 上的 4B 模型。更大的模型或托管模型会做出别的选择：它可能调用 Qwen3 4B 跳过的工具，也可能跳过它调用过的工具。
- 同一场景的两次录制可能不同，即使 temperature 为 0 且带 seed。在 `20` 的一次录制里，决策模型还拦截了 `add`。`out/` 里的文件是其中一次运行，而结构检查对每次运行都成立。
- `ChatOllama.bind_tools` 会丢掉 `tool_choice`，所以 `ToolStrategy` 的 `tool_choice="any"` 在 Ollama 上不起作用。
- `42` 里的 LangSmith 客户端用的是录制 HTTP 会话。真实客户端会向 `api.smith.langchain.com` 发送同样的请求。
- shell 工具以 `PATH=/usr/bin:/bin` 和 `LC_ALL=C` 运行。
- `ChatOllama` 把每次工具调用连同它的 id 完整放在一个块里，然后发送一个带 `chunk_position="last"` 的空块。所以 `25` 里的 v3 运行，对这次调用只有一个 `tool-call-delta`。v3 桥接会丢掉搭在标为 last 的块上的那一段工具调用（实验 T08，第 3.4 节）。没有任何录制丢过：`25` 的工具以 `{"a": 2, "b": 3}` 运行了。
