# 中间件的钩子与类

> `AgentMiddleware` 有六个钩子，每个都有同步和异步两种形式；`langchain` 1.5.0 在它们之上构建了 19 个中间件类。

每个中间件都是 `langchain.agents.middleware` 中 `AgentMiddleware` 的子类。该模块导出 50 个名称 {{code libs/langchain_v1/langchain/agents/middleware/__init__.py}}。除非写明属于其他包，本页的路径都相对于 `langchain==1.5.0` 的 `libs/langchain_v1/langchain/agents/middleware/`。[第 4.5 节](#s-middleware-hooks-and-their-order)给出钩子的执行顺序，[第 4.6 节](#s-the-built-in-middleware)说明每个类该在什么时候使用。

## 六个钩子 {#s-ref-middleware-hooks-and-classes-the-six-hooks}

`AgentMiddleware` 从 `types.py` 的第 387 行开始 {{code libs/langchain_v1/langchain/agents/middleware/types.py:387}}。

| 钩子 | 异步形式 | 种类 | 参数 | 返回值 | 行号 |
|---|---|---|---|---|---|
| `before_agent` | `abefore_agent` | 节点 | `state`、`runtime` | 状态更新或 `None` | 433, 444 |
| `before_model` | `abefore_model` | node | `state`, `runtime` | a state update or `None` | 457, 468 |
| `wrap_model_call` | `awrap_model_call` | 包装 | `request`、`handler` | `ModelResponse`、`AIMessage` 或 `ExtendedModelResponse` | 505, 600 |
| `after_model` | `aafter_model` | node | `state`, `runtime` | a state update or `None` | 481, 492 |
| `wrap_tool_call` | `awrap_tool_call` | 包装 | `request`、`handler` | `ToolMessage` 或 `Command` | 676, 758 |
| `after_agent` | `aafter_agent` | node | `state`, `runtime` | a state update or `None` | 652, 663 |

只实现了包装钩子同步形式的中间件，在 `ainvoke` 下会抛出 `NotImplementedError`。错误消息列出三种修复方式，反过来的情况同样会抛出 {{code libs/langchain_v1/langchain/agents/middleware/types.py:588-598}} {{code libs/langchain_v1/langchain/agents/middleware/types.py:640-650}}。

## 顺序与名称 {#s-ref-middleware-hooks-and-classes-order-and-names}

| 规则 | 代码位置 |
|---|---|
| 节点钩子会变成图节点 `<name>.<hook>`，例如 `HumanInTheLoopMiddleware.after_model`。 | {{code libs/langchain_v1/langchain/agents/factory.py:1639-1716}} |
| 默认的 `name` 是类名。两个中间件使用同一个名称会抛出 `AssertionError`。 | {{code libs/langchain_v1/langchain/agents/middleware/types.py:425-431}} {{code libs/langchain_v1/langchain/agents/factory.py:1163-1165}} |
| `before_agent` 和 `before_model` 按列表顺序运行。 | {{code libs/langchain_v1/langchain/agents/factory.py:1816-1857}} |
| `after_model` 按列表的逆序运行，因为 `model` 节点先连到最后一个。 | {{code libs/langchain_v1/langchain/agents/factory.py:1858-1873}} |
| `after_agent` 同样按列表的逆序运行，在运行结束时执行一次。 | {{code libs/langchain_v1/langchain/agents/factory.py:1875-1898}} |
| 列表中的第一个中间件是每个包装钩子的最外层。 | {{code libs/langchain_v1/langchain/agents/middleware/types.py:515-517}} |
| 节点钩子只能把 `jump_to` 返回到它用 `hook_config(can_jump_to=...)` 声明过的目标。 | {{code libs/langchain_v1/langchain/agents/middleware/types.py:881}} |

录制文件 `09-middleware-order.txt` 记录了三个中间件在一次工具往返中的执行顺序。

## 装饰器 {#s-ref-middleware-hooks-and-classes-decorators}

每个装饰器把一个函数变成带有一个钩子的中间件类 {{code libs/langchain_v1/langchain/agents/middleware/types.py:881-2039}}。

| 装饰器 | 钩子 | 行号 |
|---|---|---|
| `before_agent` | `before_agent` | 1320 |
| `before_model` | `before_model` | 954 |
| `after_model` | `after_model` | 1143 |
| `after_agent` | `after_agent` | 1532 |
| `wrap_model_call` | `wrap_model_call` | 1866 |
| `wrap_tool_call` | `wrap_tool_call` | 2039 |
| `dynamic_prompt` | `wrap_model_call`，并设置系统消息 | 1706 |
| `hook_config` | 无。它在钩子方法上声明 `can_jump_to` | 881 |

节点钩子的装饰器接收关键字 `state_schema`、`tools`、`can_jump_to` 和 `name`。两个包装装饰器不接收 `can_jump_to`。

## 请求与响应类型 {#s-ref-middleware-hooks-and-classes-request-and-response-types}

| 类型 | 字段 | 行号 |
|---|---|---|
| `ModelRequest` | `model`、`messages`（不含系统消息）、`system_message`、`tool_choice`、`tools`、`response_format`、`state`、`runtime`、`model_settings`。用 `override(**kw)` 修改它 | `types.py:90` |
| `ModelResponse` | `result`（消息列表）和 `structured_response` | `types.py:275` |
| `ExtendedModelResponse` | `model_response` 和可选的 `command` | `types.py:293` |
| `ToolCallRequest` | `tool_call`、`tool`、`state`、`runtime`。用 `override(**kw)` 修改它 | `langgraph.prebuilt` `tool_node.py:141` |

{{code libs/langchain_v1/langchain/agents/middleware/types.py:90-317}} {{code libs/prebuilt/langgraph/prebuilt/tool_node.py:141-175}}

## 19 个类 {#s-ref-middleware-hooks-and-classes-the-19-classes}

每一行给出钩子、会改变行为的构造参数默认值，以及类和它的 `__init__` 所在的文件与行号。没有默认值的参数是必填的。

| 类 | 钩子 | 构造参数默认值 | 文件与行号 |
|---|---|---|---|
| `SummarizationMiddleware` | `before_model` | `model` 必填，`trigger=None`, `keep=("messages", 20)`, `trim_tokens_to_summarize=4000` | `summarization.py:263`, `:282` |
| `ContextEditingMiddleware` | `wrap_model_call` | `edits=None`, `token_count_method="approximate"` | `context_editing.py:187`, `:201` |
| `HumanInTheLoopMiddleware` | `after_model`, `wrap_tool_call` | `interrupt_on` 必填，`description_prefix="Tool execution requires approval"`, `interrupt_mode="batched"` | `human_in_the_loop.py:398`, `:491` |
| `ModelCallLimitMiddleware` | `before_model`, `after_model` | `thread_limit=None`, `run_limit=None`, `exit_behavior="end"` | `model_call_limit.py:94`, `:126` |
| `ToolCallLimitMiddleware` | `after_model` | `tool_name=None`, `thread_limit=None`, `run_limit=None`, `exit_behavior="continue"` | `tool_call_limit.py:141`, `:202` |
| `ToolRetryMiddleware` | `wrap_tool_call` | `max_retries=2`, `tools=None`, `on_failure="continue"`, `backoff_factor=2.0`, `initial_delay=1.0`, `max_delay=60.0`, `jitter=True` | `tool_retry.py:32`, `:133` |
| `ModelRetryMiddleware` | `wrap_model_call` | `max_retries=2`, `on_failure="continue"`, `backoff_factor=2.0`, `initial_delay=1.0`, `max_delay=60.0`, `jitter=True` | `model_retry.py:33`, `:116` |
| `ModelFallbackMiddleware` | `wrap_model_call` | `first_model`，后接任意数量的其他模型 | `model_fallback.py:342`, `:368` |
| `ModelRefusalMiddleware` | `wrap_model_call` | 无参数 | `model_refusal.py:39` |
| `ToolErrorMiddleware` | `wrap_tool_call` | `on_error=None`, `aon_error=None`, `tools=None`. 两个处理器都没有时会抛出 `ValueError` | `tool_error.py:37`, `:84` |
| `PIIMiddleware` | `before_model`, `after_model` | `pii_type` 必填，`strategy="redact"`, `apply_to_input=True`, `apply_to_output=False`, `apply_to_tool_results=False` | `pii.py:513`, `:577` |
| `ModelRouterMiddleware` | `before_agent`, `wrap_model_call` | `choices`、`instructions` 和 `classifier` 必填。Beta，带 `@beta` 标记，据发布说明在 1.5.0 中新增 | `model_router.py:72`, `:121` |
| `AutoModeMiddleware` | `wrap_tool_call` | `tools` 和 `classifier` 必填，`criteria=None`。仅在 docstring 中标注为 Beta，没有 `@beta` 标记也没有警告，据发布说明在 1.5.0 中新增 | `auto_mode.py:64`, `:117` |
| `TodoListMiddleware` | `wrap_model_call`, `after_model` | 默认的系统提示词和工具描述 | `todo.py:174`, `:203` |
| `LLMToolSelectorMiddleware` | `wrap_model_call` | `model=None`, `max_tools=None`, `always_include=None`, `max_retries=1` | `tool_selection.py:121`, `:150` |
| `LLMToolEmulator` | `wrap_tool_call` | `tools=None`, `model=None` | `tool_emulator.py:27`, `:71` |
| `ProviderToolSearchMiddleware` | `wrap_model_call` | `searchable_tools=None` | `provider_tool_search.py:57`, `:93` |
| `ShellToolMiddleware` | `before_agent`, `after_agent` | `workspace_root=None`, `execution_policy=None`（会变成 `HostExecutionPolicy()`）, `tool_name="shell"` | `shell_tool.py:518`, `:537` |
| `FilesystemFileSearchMiddleware` | 无。它只添加工具 | `root_path` 必填，`use_ripgrep=True`, `max_file_size_mb=10` | `file_search.py:108`, `:133` |

{{code libs/langchain_v1/langchain/agents/middleware/model_retry.py:116-125}} {{code libs/langchain_v1/langchain/agents/middleware/tool_call_limit.py:202-208}} {{code libs/langchain_v1/langchain/agents/middleware/model_call_limit.py:126-131}} {{code libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:491-498}} {{code libs/langchain_v1/langchain/agents/middleware/summarization.py:282-292}} {{code libs/langchain_v1/langchain/agents/middleware/pii.py:577-586}} {{code libs/langchain_v1/langchain/agents/middleware/file_search.py:133-138}} {{code libs/langchain_v1/langchain/agents/middleware/auto_mode.py:117-124}} {{code libs/langchain_v1/langchain/agents/middleware/model_router.py:121-127}}

`max_retries` 为 2 表示一共尝试 3 次。两个重试类的 `retry_on` 默认都是 `default_retry_on`，见[第 4.7 节](#s-retries-backup-models-rate-limits-and-caching)。在默认的 `trigger=None` 下，`SummarizationMiddleware` 永远不会做摘要 {{code libs/langchain_v1/langchain/agents/middleware/summarization.py:698-701}}。

## 人工审核的类型 {#s-ref-middleware-hooks-and-classes-types-of-human-review}

| 名称 | 取值或字段 | 在 `human_in_the_loop.py` 中的行号 |
|---|---|---|
| `DecisionType` | `approve`, `edit`, `reject`, `respond` | 87 |
| `InterruptMode` | `batched`, `per_call` | 170 |
| `HITLRequest` | `action_requests`, `review_configs` | 107 |
| `HITLResponse` | `decisions` | 289 |
| `InterruptOnConfig` | `allowed_decisions`, `description`, `args_schema`, `when` | 306 |

`interrupt_on` 中的 `True` 允许全部四种决定 {{code libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:586}}。 [第 6.5 节](#s-human-in-the-loop-batched-and-per-call)运行了两种模式。

来源：libs/langchain_v1/langchain/agents/middleware/__init__.py, types.py, summarization.py, context_editing.py, human_in_the_loop.py, model_call_limit.py, tool_call_limit.py, tool_retry.py, model_retry.py, model_fallback.py, model_refusal.py, tool_error.py, pii.py, model_router.py, auto_mode.py, todo.py, tool_selection.py, tool_emulator.py, provider_tool_search.py, shell_tool.py, file_search.py，以及 libs/langchain_v1/langchain/agents/factory.py（langchain==1.5.0）；libs/prebuilt/langgraph/prebuilt/tool_node.py（langgraph 1.2.22）； capture/out/09-middleware-order.txt.
