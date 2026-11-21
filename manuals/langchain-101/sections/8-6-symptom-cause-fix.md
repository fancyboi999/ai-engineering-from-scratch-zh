# 症状、原因、修法

> 你一旦知道是哪一层抛出的，本手册里的每条错误消息都会指明它的原因；还有少数故障什么都不抛，要按症状来查。

一次运行在凌晨 2 点失败，报出一条你没见过的消息。消息里是五个包之一的类名，堆栈穿过你没写过的 LangGraph 代码。你需要原因、修法，以及解释它的那一节。

读完本节，你能查找技术栈任何部分的错误消息。你能找到它的原因、修法和所在章节。

## 怎么读这些表 {#s-symptom-cause-fix-how-to-read-the-tables}

下面每条消息，都抄自录制文件或实验记录，是技术栈在锁定版本上打印的原样。标着“不在录制里”的行来自代码。过长的消息在第一句或第一个分句后截断。在表里搜类名，或搜消息的开头几个词。尖括号里的文本，例如 `<seconds>`，是录制工具包做的掩码。

最后一张表列出不抛错误的故障。它们的症状是结果不对、退出很慢，或者一个不该运行的工具运行了。

## 模型与工具 {#s-symptom-cause-fix-models-and-tools}

| 消息 | 原因 | 修法 | 章节 |
|---|---|---|---|
| `ValueError: Unable to infer model provider for model='qwen3:4b'. Please specify 'model_provider' directly.` | 模型字符串没有 `init_chat_model` 能推断出的提供方前缀 | 写成 `ollama:qwen3:4b`，或传 `model_provider` | [3.2](#s-init-chat-model-and-model-profiles) |
| `pydantic_core._pydantic_core.ValidationError: 1 validation error for lookup_order` | 带 `ToolRuntime` 参数的工具在 agent 之外被调用 | 通过 agent 调用它，或者测试工具底层的函数 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| `Error: subtract is not a valid tool, try one of [add].` | 模型请求了 agent 没有的工具 | 无需处理。agent 把这段文字作为 `ToolMessage` 发回给模型 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| `ValueError: ToolErrorMiddleware requires`，后面是代码标记里的名称 `on_error` 和 `aon_error` | `ToolErrorMiddleware` 构建时没有处理函数 | 传 `on_error`，异步工具传 `aon_error` | [3.4](#s-tools-toolruntime-and-tool-errors) |

## Agent 与中间件 {#s-symptom-cause-fix-agents-and-middleware}

| 消息 | 原因 | 修法 | 章节 |
|---|---|---|---|
| `AssertionError: Please remove duplicate middleware instances.` | 列表里有同一个中间件类的两个实例 | 只留一个，或给某个类起自己的 `name` | [4.5](#s-middleware-hooks-and-their-order) |
| `StructuredOutputValidationError: Failed to parse structured output for tool 'Answer': Failed to parse data to Answer: 1 validation error for Answer` | `ToolStrategy` 带 `handle_errors=False`，且回复没通过 schema | 保持 `handle_errors` 开启，或在你的代码里处理这个错误 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| `StructuredOutputValidationError: Failed to parse structured output for tool 'Answer': Native structured output expected valid JSON for Answer, but parsing failed` | `ProviderStrategy` 配上纯文本的回复。它不会重试。在带工具的 Ollama 上，第一次调用就这样失败 | 在带工具的 Ollama 上，不设 `response_format`，运行结束后单独调用一次 `with_structured_output`。在 Claude 上，`ProviderStrategy` 在 39 个任务中 39 次返回了值 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy)、[4.3](#s-structured-output-which-strategy-on-which-provider) |
| `Error: Model incorrectly returned multiple structured responses (Answer, Refusal) when only one is expected.` | 一次模型回复里有两个结构化调用，被发回给模型 | 无需处理。下一次调用通常只回答一次 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| `ValueError: Unsupported schema type: <class 'typing._UnionGenericAlias'>.` | `ProviderStrategy` 配了 `Union` schema，在构建 agent 时抛出 | 对联合类型用 `ToolStrategy` | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| `ModelCallLimitExceededError: Model call limits exceeded: run limit (1/1)` | 带 `exit_behavior="error"` 的 `ModelCallLimitMiddleware` | 提高上限，或用 `exit_behavior="end"` 结束运行 | [4.6](#s-the-built-in-middleware) |
| `ToolCallLimitExceededError: Tool call limit reached: run limit exceeded (2/1 calls).` | 带 `exit_behavior="error"` 的 `ToolCallLimitMiddleware` | 提高上限，或用 `continue` 或 `end` | [4.6](#s-the-built-in-middleware) |
| `ValueError: ProviderToolSearchMiddleware requires a provider with server-side tool search, but got 'ollama'; supported providers: anthropic, openai` | 模型来自没有服务端工具搜索的提供方 | 用 Anthropic 或 OpenAI 的模型，或移除这个中间件 | [4.6](#s-the-built-in-middleware) |
| `ConnectionError: third is down`，不在录制里 | `ModelFallbackMiddleware`，链上每个模型都失败了。运行抛出最后一个错误 | 加一个别家提供方的模型，并在日志里读前面的错误 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `ModelRefusalError: Model refused to produce the requested output: I can't help with that.`，不在录制里 | 拒绝块，且 `ModelRefusalMiddleware` 设为抛出 | 修改请求，或让中间件切换到备用模型 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `PIIDetectionError: Detected 1 instance(s) of email in text content` | 策略为 `block` 的 `PIIMiddleware` | 运行必须继续时，用 `redact`、`mask` 或 `hash` | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |

## 流式输出与记忆 {#s-symptom-cause-fix-streaming-and-memory}

| 消息 | 原因 | 修法 | 章节 |
|---|---|---|---|
| `TypeError: stream_events(version='v3') / astream_events(version='v3') do not accept stream_mode;` | 给 v3 传了 `stream_mode`，而 v3 自己构建流模式 | 去掉 `stream_mode`，读 v3 流的各个投影 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `NotImplementedError: stream_events(version='v2') is not supported.` | 同步的 `stream_events` 配了 version v2 | v1 和 v2 用 `astream_events`，或者用 v3 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `ValueError: No generations found in stream.`，不在录制里 | 在 `create_agent` 下对流式输出用了现成的假聊天模型 | 用真实模型测试，或用实现了 `bind_tools` 并流式输出工具调用的假模型 {{code libs/core/langchain_core/language_models/fake_chat_models.py}} | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| `ValueError: Checkpointer requires one or more of the following 'configurable' keys: thread_id, checkpoint_ns, checkpoint_id` | 对带 checkpointer 的图运行，却没有 `thread_id` | 传 `{"configurable": {"thread_id": ...}}` | [5.2](#s-checkpointers-and-threads) |
| `AttributeError: 'SyncPregelLoop' object has no attribute '_put_checkpoint_fut'` | 在没有 checkpointer 的图上用 `durability="sync"`，issue #9267 | 加一个 checkpointer，或让 `durability` 保持默认 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| `InvalidNamespaceError: Invalid namespace label 'bob.x' found in ('users', 'bob.x'). Namespace labels cannot contain periods ('.').` | store 标签里有句点 | 在 id 变成标签之前，拒绝或替换其中的句点 | [5.4](#s-stores-and-long-term-memory) |
| `TypeError: Type is not msgpack serializable: Plain` | 状态里有一个普通类的实例 | 用 dataclass、Pydantic 模型或字典 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip) |
| `Deserializing unregistered type __main__.Color from checkpoint. This will be blocked in a future version.` | 检查点里有你自己的枚举或类，`allowed_msgpack_modules` 里没有它的条目 | 在 `allowed_msgpack_modules` 里列出模块和类 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip) |

## 图、中断与限制 {#s-symptom-cause-fix-graphs-interrupts-and-limits}

| 消息 | 原因 | 修法 | 章节 |
|---|---|---|---|
| `InvalidUpdateError: At key 'value': Can receive only one value per step. Use an Annotated key to handle multiple values.` | 两个节点在同一步写了同一个键，而该键没有 reducer。有 checkpointer 时两次写入都被保存，所以 `get_state`、`invoke(None)` 和线程上每个新一轮都会抛出同一个错误，issue #9712 | 用 `Annotated` 给该键加一个 reducer 并部署，再用 `invoke(None)` 恢复。线程从已保存的写入完成，没有节点会重新运行。`update_state` 也能让线程重新可读，但旧图在下一次运行时会再次抛出 | [6.1](#s-stategraph-state-and-reducers)、[2.2](#s-channels-and-colliding-writes) |
| `UnknownInterruptError: Unknown or already-consumed interrupt: <id>` | 用内部键 `__pregel_strict_resume` 设置的严格恢复，并对一个中断给了第二次回答 | 用 `get_state` 读取待处理的中断，并回答它们 | [6.4](#s-interrupt-and-resume) |
| `RuntimeError: When there are multiple pending interrupts, you must specify the interrupt id when resuming.` | 两个中断在等待时，用了普通的恢复值 | 用从每个中断 id 到其回答的映射来恢复 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| `ValueError: Number of human decisions (1) does not match number of hanging tool calls (2).` | 批量审核，决定数少于工具调用数 | 按顺序为每个调用发一个决定 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| `KeyError: 'checkpoint_ns'` | `update_state` 的 config 里只有 `thread_id` 和 `checkpoint_id` | 传入历史里某个 `StateSnapshot` 的完整 config | [6.6](#s-time-travel-replay-update-state-and-forks) |
| `NodeTimeoutError: Node 'slow' exceeded its run timeout of 0.050s (elapsed: <seconds>).` | 一个异步节点运行超过了它的 `timeout` | 提高超时，或用 `error_handler` 处理这个错误 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| `GraphRecursionError: Recursion limit of 10007 reached without hitting a stop condition.` | 没有出口的循环，或需要的步数超过上限的运行 | 修好退出条件，或传 `recursion_limit` | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |

## 集成与服务器 {#s-symptom-cause-fix-integrations-and-the-server}

| 消息 | 原因 | 修法 | 章节 |
|---|---|---|---|
| `ValueError: MCP target 'server.py' is not a valid URL.` | 字符串目标不是 `http` 或 `https` URL | 对 stdio 服务器传 `Path('server.py')` | [7.3](#s-mcp-with-langchain-mcp) |
| `MCPError: Connection closed` | stdio 服务器在调用中途退出。运行抛出了错误 | 只有工具是幂等的才重试运行；不是的话，先查外部结果。下一次调用会重新启动服务器 | [7.3](#s-mcp-with-langchain-mcp) |
| `RemoteProtocolError: Server disconnected without sending a response.` | HTTP 服务器在调用中途退出 | 重启服务器，再仅在工具幂等时重试运行。不是的话，先查外部结果 | [7.3](#s-mcp-with-langchain-mcp) |
| `MCPError: Request 'tools/call' timed out` | `fastmcp.Client` 的超时比工具的耗时短 | 提高客户端的超时。适配器自己没有超时 | [7.3](#s-mcp-with-langchain-mcp) |
| `Thread is already running a task. Wait for it to finish or choose a different multitask strategy.` | Agent Server，策略 `reject`，且在忙碌线程上发起了第二次运行。状态是 HTTP 409 | 稍后重试，或用 `enqueue` 创建运行 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `ValueError: License verification failed. Please ensure proper configuration:` | `langgraph up` 既没有 `LANGSMITH_API_KEY`，也没有 `LANGGRAPH_CLOUD_LICENSE_KEY` | 设置二者之一，或使用 `langgraph dev` | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |

## 没有错误的故障 {#s-symptom-cause-fix-failures-with-no-error}

| 症状 | 原因 | 修法 | 章节 |
|---|---|---|---|
| 审阅者没批准的工具，在一次编辑或一次跳转之后运行了 | 批量审核：编辑能切换工具，中间件跳转能跳过审核 | 设置 `interrupt_mode="per_call"` | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| 崩溃和恢复之后，一个副作用运行了两次 | 崩溃发生在工具运行之后、写入或检查点保存之前。`durability="sync"` 不覆盖刚刚返回的任务 | 按它的含义给副作用定键，例如线程加订单 id，并先查你自己的记录。`tool_call_id` 和 `checkpoint_ns` 只在 `sync` 和 `async` 下可用作键 | [5.3](#s-durability-modes-and-a-crash-between-two-steps)、[2.3](#s-the-checkpoint-write-path-and-durability) |
| 一个请求没有崩溃却被扣了两次费，或带键恢复之后又多扣了两次 | 模型在一次回复里两次请求了同一个工具调用 | 扣费前先查你记录里的订单，因为用 `tool_call_id` 做键会放过第二次调用 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 一条警告说，没有 checkpointer 时 `durability` 不起作用 | 在没有 checkpointer 的图上设了持久性模式 | 加一个 checkpointer，或去掉这个参数 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 针对字段 `context` 的警告 `PydanticSerializationUnexpectedValue` | 在没有 `context_schema` 的 agent 上传了 `context` 字典 | 给 agent 一个 `context_schema` | [5.4](#s-stores-and-long-term-memory) |
| 一个元组集合或一个时区，从检查点回来时变了 | 序列化器不会重建的类型 | 存列表、字典，以及带时区名称的 UTC 时间 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip) |
| `list_namespaces` 返回了每个用户的命名空间 | 用用户 id `*` 构建了前缀 | 拒绝用户 id 里的 `*` | [5.4](#s-stores-and-long-term-memory) |
| deep agent 从不用 `write_todos` 做规划 | Deep Agents 0.7 去掉了 `TodoListMiddleware` | 在 `middleware` 里传 `TodoListMiddleware()` | [7.4](#s-deep-agents-0-7) |
| 开着追踪的脚本在退出时等待，或根本不退出 | LangSmith 端点宕机或失败，退出在等追踪 | 调用 `wait_for_all_tracers()`，并给任务设超时 | [7.6](#s-langsmith-tracing) |
| 在 `tracing_context(enabled="local")` 里，agent 的运行到达了 LangSmith | LangChain 代码把 `"local"` 当作开启 | 在 LangChain 代码外围用 `tracing_context(enabled=False)` | [7.6](#s-langsmith-tracing) |
| worker 崩溃后同一个审批又变成待处理，而退款行已存在 | 恢复映射留在运行 config 里，所以 `tools` 任务内部的崩溃会丢掉这个决定 | 按检查点保存的内容给工具定键，让第二次批准成为一次重放 | [9.3](#s-approvals-and-the-idempotency-key) |
| 查询超时之后，模型告诉客户订单不存在 | 模型没有遵循工具的错误文本 | 在评估里测试对每种故障的回复，并选一个能通过的模型 | [9.5](#s-timeouts-retries-backup-model-and-shutdown) |
| 繁忙服务的客户端收到 `ReadTimeout`，它们的运行却继续了 | 运行在等模型服务器时，流没有发送任何字节 | 流断开之后读取线程状态，并增加模型容量 | [9.7](#s-workers-the-advisory-lock-and-cost) |
| agent 读取了 `.env` 或删除了点文件，尽管有一条拒绝规则覆盖 `/**` | Deep Agents 把规则模式交给不带 `DOTGLOB` 的 `wcmatch`，所以 `*` 和 `**` 会跳过以点开头的名称 | 先拒绝 `/**/.*` 和 `/**/.*/**`，并且除了 `/workspace/**` 也允许 `/workspace` | [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| 一个 deep agent 的用户被告知了另一个用户的文件 | `StoreBackend` 里用了常量命名空间工厂，例如 `("memories",)` | 用运行上下文里的用户 id 构建命名空间 | [5.4](#s-stores-and-long-term-memory) |
| 模型说它发了邮件，实际没有邮件离开 | 在待处理审批上输入了消息，Agent Chat UI 用一个占位工具结果把它关掉了 | 让工具自身保证安全，并在审批待处理时禁用输入框 | [8.2](#s-agent-chat-ui-in-front-of-langgraph-dev) |
| 一个 2 秒、不带模型的图的 20 个后台运行用了 41.0 秒 | 每个 worker 一个作业，是 `langgraph dev` 的默认值 | 用 `--n-jobs-per-worker 10` 启动，同一测试里用了 5.1 秒 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |

```takeaways
- 在这些表里搜类名，或消息的开头几个词。
- 修改 agent 之前，先看是哪个包抛出了错误。
- 结果不对而什么都没抛时，查那些无声的故障。
- 运行某一节的录制工具包场景，就能在你的机器上看到同一条消息。
```

来源：capture/out/01-init-chat-model.txt, capture/out/03-tools.txt, capture/out/04-tool-errors.txt, capture/out/08-structured-errors.txt, capture/out/09-middleware-order.txt, capture/out/11-mw-call-limits.txt, capture/out/13-mw-fallback-refusal.txt, capture/out/14-mw-pii.txt, capture/out/18-mw-selection-emulation.txt, capture/out/25-stream-events-v3.txt, libs/core/langchain_core/language_models/fake_chat_models.py at langchain==1.5.0, capture/out/28-checkpoint-memory.txt, capture/out/31-durability.txt, capture/out/33-store.txt, capture/out/34-stategraph-reducers-send-command.txt, capture/lab/internals/02-channels/trace.txt, capture/lab/internals/02-channels/repair.txt, capture/lab/T02-crash-resume-x86/10-summary.txt, capture/lab/failure-drill-x86/drill-run1.log, capture/out/37-error-handler-timeout.txt, capture/out/38-recursion-limit.txt, capture/out/40-mcp.txt; capture/lab/summary/structured-output-mac.json, capture/lab/T06-structured-output-mac/03-ollama-seq-n10.jsonl, capture/lab/T14-stores-mac/01-memory-sqlite.jsonl, capture/lab/T13-serde-mac/03-round-trip.jsonl, capture/lab/T13-serde-mac/04-round-trip-log.txt, capture/lab/summary/approvals-x86.json, capture/lab/T17-claims-mac/02-replay-and-fork.jsonl, capture/lab/summary/mcp-mac.json, capture/lab/T15-agent-server-x86/04-double-texting.jsonl, capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt, capture/lab/summary/tracing-mac-real.json, capture/lab/summary/agent-server-x86.json; the sections linked in each row; capture/lab/chat-ui-mac/summary/extracts.json, capture/lab/summary/permissions-mac.json, capture/lab/summary/store-namespace-mac.json.
