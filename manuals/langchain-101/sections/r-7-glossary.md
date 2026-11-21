# 术语表

> 下列每个术语在本手册中只有一个含义；如果有术语在两个章节里有两种用法，会把两种都列出来，并各自说明语境。

这些含义来自锁定版本的代码、文档提交 `04d4d4a` 处的文档，以及各章节里的定义。代码字体的术语是你要输入、或在输出中读到的字面名称。

| 术语 | 本手册中的含义 | 说明章节 |
|---|---|---|
| advisory lock（咨询锁） | 加在由你的代码选定的一个数字上的 Postgres 锁，由会话持有，会话结束时释放。 | [9.7](#s-workers-the-advisory-lock-and-cost) |
| `add_messages` | 消息列表的 reducer。它追加带新 id 的消息，替换 id 相同的消息，并删除 `RemoveMessage` 所指定的消息。 | [6.1](#s-stategraph-state-and-reducers) |
| Agent Server | 在由 assistant、线程和运行组成的 HTTP API 之后运行已编译图的 LangSmith 服务器。它的包名是 `langgraph-api`。 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `AgentState` | 每个 agent 的状态类型，含 `messages`、`jump_to` 和 `structured_response` 三个键。 | [4.1](#s-create-agent-and-the-graph-it-builds) |
| `AutoModeMiddleware` | 向决策模型询问对某个列出的工具的调用是否有风险的中间件，概率达到 0.5 或更高时拦截该调用。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| 批量模式（batched mode） | `interrupt_mode` 的默认值。一次中断包含一条模型消息中所有暂停的调用，一次恢复按顺序回答全部调用。 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| 内置中间件（built-in middleware） | `langchain` 从 `langchain.agents.middleware` 导出的中间件类。锁定版本下共有 19 个。 | [4.6](#s-the-built-in-middleware) |
| 录制工具包（capture kit） | `capture/` 里的程序。它在一个 Python 进程内离线驱动这套技术栈，并把所见内容写入 `capture/out/`。 | [如何阅读本手册](#s-front) |
| 通道版本（channel version） | 循环为检查点中每个通道保存的一个数字。在一个超步中发生变化的通道会得到新的版本。 | [2.1](#s-the-superstep-loop-plan-execute-update) |
| 检查器（checker） | 测试基准里判定通过与否的函数，依据是工具改变了什么，例如运行过的查询、数据库、文件和笔记 store。 | [测试基准方法](#s-ref-the-bench-method) |
| 检查点（checkpoint） | 一个线程在一步之后保存的状态，包含步号、下一批节点，以及它前一个检查点的 id。 | [1.3](#s-one-create-agent-run) |
| 检查点元组（checkpoint tuple） | checkpointer 对一个检查点返回的内容：它的 `config`、`metadata`、检查点本身、父检查点的配置，以及待写入项。 | [5.2](#s-checkpointers-and-threads) |
| checkpointer | 在每一步之后保存图状态，并在下一次运行开始时加载最新检查点的对象。 | [5.2](#s-checkpointers-and-threads) |
| 块（消息的） | 模型流式输出的消息的一部分，例如 `AIMessageChunk`。多个块可以用 `+` 合并成一条消息。 | [3.3](#s-messages-and-content-blocks) |
| 块（流的） | `stream` 产出的一个条目。它的形状取决于流模式、模式的数量和流的版本。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `Command` | 节点返回的一个值，在一步之内更新状态并指定下一个节点，字段有 `update`、`goto`、`graph` 和 `resume`。 | [6.2](#s-edges-send-and-command) |
| 条件边（conditional edge） | 带路由函数的边。路由函数读取源节点之后的状态，返回下一个节点、一组节点或 `END`。 | [6.2](#s-edges-send-and-command) |
| 内容块（content block） | 消息中一个带类型的部分，是带 `type` 的字典，`type` 例如 `text`、`reasoning`、`image`、`file` 或 `tool_call`。 | [3.3](#s-messages-and-content-blocks) |
| 上下文工程（context engineering） | 选择模型每次调用时接收什么：哪些消息、哪些工具、哪些指令。 | [5.5](#s-context-engineering-and-summarization) |
| 上下文窗口（context window） | 模型一次调用最多接受的 token 数，输入和输出合计。 | [5.5](#s-context-engineering-and-summarization) |
| `create_agent` | `langchain.agents` 中的函数，把模型、工具、prompt 和中间件变成一个 `CompiledStateGraph`。 | [4.1](#s-create-agent-and-the-graph-it-builds) |
| 决定（decision） | 对一次暂停的工具调用的回答，`type` 为 `approve`、`edit`、`reject` 或 `respond`。 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| 决策模型（decision model） | 来自 `langchain_core.decisions` 的 `BaseDecisionModel`，在 `langchain-core` 1.8.0 中新增，用来回答带类型的问题。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| deep agent | 由 `deepagents` 的 `create_deep_agent` 创建的 agent。它是一个 `create_agent` 图，在你自己的中间件外围套了一组固定的中间件。 | [7.4](#s-deep-agents-0-7) |
| Deep Agents | 包名为 `deepagents` 的 harness 项目，为 agent 增加文件工具、子 agent 和摘要。 | [1.1](#s-langchain-langgraph-langsmith-and-deep-agents) |
| `default_retry_on` | 两个重试中间件的默认 `retry_on`。它对每个 `Exception` 都重试，唯独 `is_retryable` 为 false 的 `ModelError` 除外。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| 送达延迟（delivery delay） | 在同一个时钟上，从模型服务器发出一个 token 到你的循环看到它之间的时间。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `DeltaChannel` | `langgraph.channels.delta` 中的 beta 通道类型，每一步只保存新的写入。它在 `snapshot_frequency` 次更新（默认 100）之后，或 5,000 步之后保存一次完整快照。 | [5.5](#s-context-engineering-and-summarization) |
| 干扰工具（distractor tool） | 任务不需要的工具，名称和描述看起来合理。测试基准里有 95 个。 | [4.4](#s-many-tools-and-the-tool-selector) |
| 发行包（distribution） | `pip` 所称的包，例如 `langchain-core`。它的导入名把 `-` 换成 `_`。 | [3.1](#s-install-and-the-package-map) |
| 双重发送（double texting） | 一个线程上的第一次运行还在进行时，又在这个线程上开始第二次运行。 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| 持久性模式（durability mode） | `invoke` 和 `stream` 的 `durability` 参数：`sync`、`async` 或 `exit`。它决定一次运行的检查点何时写入。 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 嵌入模型（embedding model） | 带有 `embed_query` 和 `embed_documents` 的对象，把文本变成数字向量。 | [7.1](#s-embeddings-splitters-vector-stores-and-retrievers) |
| 入口（entrypoint） | 用 `@entrypoint` 装饰的函数，LangGraph 把它作为只有一个节点的图来运行。 | [6.3](#s-the-functional-api-entrypoint-and-task) |
| `entrypoint.final` | 入口的一种返回值，把调用方得到的内容和线程保存的内容区分开。 | [6.3](#s-the-functional-api-entrypoint-and-task) |
| 错误处理器（error handler） | 节点最后一次尝试失败之后运行的函数。它接收状态和 `NodeError`，返回一个更新或 `Command`。 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| 评估（eval） | 对运行中的服务发起的一段脚本化对话，随后对工具调用、数据行和线程状态做断言。 | [9.6](#s-evals-that-check-state) |
| 评估器（evaluator） | 给实验的一行打分的函数，返回带 `key` 和 `score` 的字典。 | [7.7](#s-evaluation-with-langsmith) |
| 示例（example） | 一个输入及其参考输出，类型为 `langsmith.schemas.Example`。 | [7.7](#s-evaluation-with-langsmith) |
| 实验（experiment） | 对一组示例调用一次 `evaluate`。 | [7.7](#s-evaluation-with-langsmith) |
| 提取调用（extraction call） | agent 运行之后对 `with_structured_output` 的一次调用，它读取问题和最终回复，返回符合 schema 的对象。 | [4.3](#s-structured-output-which-strategy-on-which-provider) |
| 失败类别（failure category） | 测试基准中某个失败任务第一个匹配的原因，例如 `wrong_tool`、`wrong_args` 或 `wrong_final_state`。 | [测试基准方法](#s-ref-the-bench-method) |
| 故障演练（failure drill） | 在一台可以随时丢弃的机器上有意引发每种已知故障，并打印你会看到的内容的脚本。 | [8.7](#s-a-failure-drill) |
| `FilesystemBackend` | 把 deep agent 的文件工具映射到磁盘文件夹（而不是 agent 状态）的后端。 | [7.4](#s-deep-agents-0-7) |
| 分叉（fork） | 父检查点是某个过去检查点的新检查点。从它开始的运行会在旧分支旁边形成一条新分支。 | [6.6](#s-time-travel-replay-update-state-and-forks) |
| 框架耗时（framework time） | 一个任务的墙钟时间，减去模型调用和工具函数内部的时间。 | [1.2](#s-do-you-need-langchain), [2.6](#s-checkpoint-growth-and-the-cost-of-a-superstep) |
| `GraphRunStream` | `stream_events(..., version="v3")` 返回的对象，带有原始事件和 `messages` 这类带类型的视图。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| 护栏（guardrail） | agent 内部的检查，用来修改、拦截或停止请求、回复或工具调用。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| `handle_errors` | `ToolStrategy` 的参数，设定解析错误之后的重试。默认值 `True` 表示每个解析错误都重试。 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| `HumanInTheLoopMiddleware` | 当模型请求 `interrupt_on` 映射中的工具时暂停 agent，并等待决定的中间件。 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| 幂等键（idempotency key） | 标识一次副作用的值，让这次副作用能检查自己是否已发生过，并在已发生时跳过自己。 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 幂等工具（idempotent tool） | 用相同参数调用两次，得到相同结果、产生相同副作用的工具。 | [9.5](#s-timeouts-retries-backup-model-and-shutdown) |
| 中断（interrupt） | 节点内部对 `interrupt(value)` 的一次调用。它停止运行、保存检查点，并把 `value` 交给调用方。 | [6.4](#s-interrupt-and-resume) |
| 条目（item） | store 中的一个值，带有命名空间、键，以及创建和更新的时间。 | [5.4](#s-stores-and-long-term-memory) |
| 每个 worker 的作业数（jobs per worker） | Agent Server 的一个队列 worker 同时执行的运行数。 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `jump_to` | 节点钩子返回的键，用来把运行转到 `model`、`tools` 或 `end`。 | [4.5](#s-middleware-hooks-and-their-order) |
| 实验记录（lab recording） | 在我们的某台机器上，对真实模型或真实数据库进行的一次运行，以原始文件保存在 `capture/lab/` 中。 | [本手册是怎么做的](#s-ref-how-this-manual-was-made) |
| LangChain | agent 框架，位于 `langchain` 和 `langchain-core` 两个包中。 | [1.1](#s-langchain-langgraph-langsmith-and-deep-agents) |
| LangGraph | 把 agent 作为节点图来运行的运行时，位于 `langgraph` 包中。 | [1.1](#s-langchain-langgraph-langsmith-and-deep-agents) |
| LangSmith | 用于追踪、评估、prompt 和部署的托管平台，以及它的客户端包 `langsmith`。 | [1.1](#s-langchain-langgraph-langsmith-and-deep-agents) |
| `max_concurrency` | 运行配置中的键，限制一步里同时运行的任务数。 | [4.1](#s-create-agent-and-the-graph-it-builds) |
| MCP 适配器（MCP adapter） | `langchain.mcp` 中的 `MCPAdapter` 类。它通过 FastMCP 连接 MCP 服务器，并把服务器的工具作为 LangChain 工具返回。 | [7.3](#s-mcp-with-langchain-mcp) |
| MCP 工具错误（MCP tool error） | `isError` 设为 true 的工具结果。工具抛出异常时，FastMCP 服务器会发出这样的结果。 | [7.3](#s-mcp-with-langchain-mcp) |
| 消息（message） | 对话中的一个条目，带有类型、`content` 和可选的 `id`。 | [3.3](#s-messages-and-content-blocks) |
| 中间件（middleware） | `AgentMiddleware` 子类的对象，`create_agent` 在 agent 循环的固定位置运行它。 | [4.5](#s-middleware-hooks-and-their-order) |
| 模型档案（model profile） | `model.profile` 上的字典，记录一个模型的限制和特性。 | [3.2](#s-init-chat-model-and-model-profiles) |
| 模型字符串（model string） | 模型的文本形式，例如 `openai:gpt-4.1`，`init_chat_model` 和 `create_agent` 都接受它。 | [3.2](#s-init-chat-model-and-model-profiles) |
| `ModelFallbackMiddleware` | 在模型调用抛出异常时，调用列表中下一个模型的中间件。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| 命名空间（store 的） | 由字符串组成的元组，例如 `("users", "ada", "memories")`，用来给 store 的条目分组。每个字符串是一个标签。 | [5.4](#s-stores-and-long-term-memory) |
| 命名空间（子图的） | 子图在其父图内运行的路径，例如 `inner:<task id>`。流的块、检查点和状态都带有它。 | [6.7](#s-subgraphs-and-multi-agent-patterns) |
| 节点钩子（node hook） | `create_agent` 会把它变成图节点的中间件钩子。它接收状态和运行时。 | [4.5](#s-middleware-hooks-and-their-order) |
| 节点超时（node timeout） | `add_node` 的 `timeout`，单位为秒，对异步节点的每次尝试生效。 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| 待写入项（pending write） | 一个任务在一步中写入的值，保存在该步起始的检查点之下。它可能在自己那一步的检查点之后才到达 saver。恢复时会应用它，而不会重新运行那个任务。 | [5.2](#s-checkpointers-and-threads), [2.3](#s-the-checkpoint-write-path-and-durability) |
| 逐调用模式（per-call mode） | `interrupt_mode="per_call"`。每个暂停的调用有自己的中断，一次恢复可以按中断 id 回答其中任何一个。 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| `PIIMiddleware` | 在消息中找出一种个人数据，并对每个匹配项应用一种策略的中间件。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| 普通边（plain edge） | 源节点每次完成后，LangGraph 都会沿着走的边。 | [6.2](#s-edges-send-and-command) |
| 投影（projection） | 一条 v3 消息的带类型视图，例如 `message.text`，它会产出自己的增量。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| Python 下限（Python floor） | 一个包在 `requires-python` 中声明的最老的 Python 版本。 | [3.1](#s-install-and-the-package-map) |
| 递归上限（recursion limit） | 超过该步数后，运行会抛出 `GraphRecursionError`。无论一步中运行多少个节点，每一步只计一次。 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| reducer | 接收旧值和一个更新，返回某个状态键的新值的函数。 | [6.1](#s-stategraph-state-and-reducers) |
| `RemainingSteps` | 状态中的一个托管值，保存距离上限还剩多少步。 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| 重放（replay） | `invoke(None, config)`，其中 `config` 指向一个过去的检查点。它的 `next` 里的节点会重新运行。 | [6.6](#s-time-travel-replay-update-state-and-forks) |
| 恢复（resume） | 在暂停所在的线程上，用 `Command(resume=value)` 调用 `invoke` 或 `stream`。此时 `interrupt` 调用会返回 `value`。 | [6.4](#s-interrupt-and-resume) |
| 恢复列表（resume list） | 一个任务到目前为止收到的回答列表，作为对通道 `__resume__` 的写入保存。 | [2.4](#s-interrupt-and-resume-in-the-code) |
| 检索器（retriever） | 带有 `invoke(query)` 的对象，返回 `Document` 对象的列表，基类是 `BaseRetriever`。 | [7.1](#s-embeddings-splitters-vector-stores-and-retrievers) |
| 恢复映射（resume map） | 值为以中断 id 为键的字典的 `Command(resume=...)`。在锁定版本下，它只会进入运行配置。 | [9.3](#s-approvals-and-the-idempotency-key) |
| 重试层（retry layer） | 在失败后再次调用模型或工具的一段代码，例如提供方包的客户端或 `ModelRetryMiddleware`。 | [3.2](#s-init-chat-model-and-model-profiles), [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `RetryPolicy` | 重新运行失败节点的设置：`max_attempts`、两次尝试之间的等待，以及 `retry_on`。 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| 往返（round trip） | 写入检查点又读回来的值。它以相同的类型和相等的值读回时，就算往返成功。 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip) |
| 运行（run） | 对 `invoke` 或 `stream` 的一次调用。 | [如何阅读本手册](#s-front) |
| 运行任务（run task） | 遍历一次运行的 `agent.astream`，并把每个事件放入响应所读取的队列的 `asyncio` 任务。 | [9.1](#s-the-run-endpoint-and-its-stream) |
| 运行树（run tree） | 一次被追踪运行在内存中的对象，即 `langsmith` 里的 `RunTree`。 | [7.6](#s-langsmith-tracing) |
| `Send` | 指定一个节点及其一次运行的输入的值。路由函数返回的一组 `Send` 会为每一个启动一个任务。 | [6.2](#s-edges-send-and-command) |
| 序列化器（serializer） | 把状态值转换为字节供 checkpointer 保存、并转换回来的对象。默认是 `JsonPlusSerializer`。 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip) |
| 副作用（side effect） | 节点或工具在图状态之外造成的变化，例如扣款或发邮件。检查点无法撤销它。 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 状态（state） | 一次图运行共享的数据，以 schema 的形式声明，节点读写它的键。 | [6.1](#s-stategraph-state-and-reducers) |
| 状态历史（state history） | 一个线程的检查点列表，最新的在前，来自 `get_state_history(config)`。 | [6.6](#s-time-travel-replay-update-state-and-forks) |
| 步（step） | LangGraph 循环的一个超步，其中每个就绪的节点各运行一次。 | [如何阅读本手册](#s-front) |
| span | OpenTelemetry 中一次有计时的操作，带有名称、属性、状态和父 span。 | [9.4](#s-opentelemetry-spans-with-langsmith-off) |
| 超步（superstep） | LangGraph 循环的一轮。它规划就绪的任务，运行它们，然后一次性应用它们的全部写入。 | [2.1](#s-the-superstep-loop-plan-execute-update) |
| store | 按命名空间和键保存 JSON 条目、由一个图的所有线程共享的对象。 | [5.4](#s-stores-and-long-term-memory) |
| 分层子集（stratified subset） | 测试基准中每个任务族里编号为 01、04、07、10、13 和 16 的 30 个任务，没有跑完整套件的模型运行的就是它。 | [测试基准方法](#s-ref-the-bench-method) |
| 流模式（stream mode） | 你作为 `stream_mode` 传入的名称，决定 `stream` 在每一步产出什么。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `StreamPart` | `stream(..., version="v2")` 产出的字典，带有 `type`、`ns` 和 `data` 键。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| 严格通过（strict pass） | 答案同时经由 `submit_answer` 工具给出的测试基准通过。 | [1.2](#s-do-you-need-langchain) |
| 结构化输出策略（structured output strategy） | `create_agent` 让模型产出符合你 schema 的对象并放入 `structured_response` 的方式。 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| 子 agent（subagent） | 被另一个 agent 当作工具调用的 agent。调用方只能看到它的最后一条消息。 | [6.7](#s-subgraphs-and-multi-agent-patterns) |
| 子图（subgraph） | 用作另一个图的节点的已编译图。两个 schema 共有的键在它们之间传递。 | [6.7](#s-subgraphs-and-multi-agent-patterns) |
| 汇总评估器（summary evaluator） | 一次给实验的所有行打分的函数，例如计算准确率。 | [7.7](#s-evaluation-with-langsmith) |
| 摘要消息（summary message） | `SummarizationMiddleware` 用来代替旧消息写入的用户消息。 | [5.5](#s-context-engineering-and-summarization) |
| 系统 prompt（system prompt） | 排在 agent 每次模型请求最前面的指令。 | [3.5](#s-the-system-prompt) |
| 目标（评估的） | `evaluate` 用每个示例的输入去调用的函数。 | [7.7](#s-evaluation-with-langsmith) |
| 目标（MCP 适配器的） | `MCPAdapter` 的第一个参数：`http` 或 `https` URL、`Path`、传输、服务器或配置。 | [7.3](#s-mcp-with-langchain-mcp) |
| 任务（task） | 用 `@task` 装饰的函数。调用返回一个 future，LangGraph 在它完成时保存其结果。 | [6.3](#s-the-functional-api-entrypoint-and-task) |
| 任务集（task suite） | 测试基准工具包里的 99 个任务，分五个任务族，每个都按它的工具改变了什么来检查。 | [1.2](#s-do-you-need-langchain) |
| 切分器（text splitter） | 把文档切成最多 `chunk_size` 个字符的块，并重复 `chunk_overlap` 个字符的对象。 | [7.1](#s-embeddings-splitters-vector-stores-and-retrievers) |
| 线程（thread） | 保存在同一个 `thread_id` 之下的一系列检查点。一个线程就是一段对话。 | [5.2](#s-checkpointers-and-threads) |
| 工具（tool） | 用 `@tool` 包装的函数，带有名称、描述和参数的 JSON schema。 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| 工具调用（tool call） | `AIMessage.tool_calls` 中的一个条目，带有 `name`、解析后的 `args` 和 `id`。 | [3.3](#s-messages-and-content-blocks) |
| 工具调用 id（tool call id） | 模型给每个工具调用的 id，该调用的 `ToolMessage` 在 `tool_call_id` 中把它带回来。 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| 工具错误（tool error） | agent 运行工具调用时发生的失败。失败的种类决定运行是抛出异常还是继续。 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| 工具事件（tool event） | `tools` 流模式的一个块：`tool-started`、`tool-output-delta`、`tool-finished` 或 `tool-error`。 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `ToolRuntime` | 一种参数类型，给工具提供状态、上下文、store、流写入器以及当前工具调用的 id。 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| 追踪（trace） | 一次顶层调用的运行树，每个运行带有名称、运行类型、输入、输出、错误和它的子运行。 | [7.6](#s-langsmith-tracing) |
| `trim_messages` | `langchain_core.messages` 中的函数，按 token 预算保留列表中最前面或最后面的消息。 | [5.5](#s-context-engineering-and-summarization) |
| 轮（turn） | 一条用户消息，加上直到回复为止的所有内容。 | [如何阅读本手册](#s-front) |
| 向量存储检索器（vector store retriever） | `as_retriever()` 返回的检索器。它用你给定的 `search_kwargs` 对向量存储执行一次搜索。 | [7.1](#s-embeddings-splitters-vector-stores-and-retrievers) |
| 虚拟文件系统（virtual filesystem） | deep agent 状态中的 `files` 通道。使用默认后端时，文件工具从不接触磁盘。 | [7.4](#s-deep-agents-0-7) |
| 包装钩子（wrap hook） | 接收请求和 `handler`，并通过调用 handler 来运行模型或工具的中间件钩子。 | [4.5](#s-middleware-hooks-and-their-order) |

来源：front.md 以及 sections/ 下每个文件中的定义；libs/langchain_v1/langchain/agents/factory.py 和 libs/langchain_v1/langchain/agents/middleware/types.py（langchain==1.5.0）；libs/langgraph/langgraph/types.py（langgraph 1.2.22）。
