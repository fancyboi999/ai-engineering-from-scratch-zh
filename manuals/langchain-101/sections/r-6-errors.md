# 错误

> 本手册中的每个错误和警告，都对应一个类、一个抛出它的包，以及锁定版本下的一行代码；下面的文本都抄自录制文件。

本页按类查找。按症状查找请看[症状、原因、修复](#s-symptom-cause-fix)，那里给出每条消息的修复方式。每条消息都抄自录制文件或实验记录。标注“不在录制文件中”的类，抄自源代码。尖括号里的文本（如 `<seconds>`）是录制工具包做的掩码。过长的消息只保留第一句，被截断的行就结束在录制文件继续的位置。

## langchain {#s-ref-errors-langchain}

| 类 | 消息 | 抛出位置 |
|---|---|---|
| `AssertionError` | `Please remove duplicate middleware instances.` | {{code libs/langchain_v1/langchain/agents/factory.py:1164}} |
| `ValueError` | `Unable to infer model provider for model='qwen3:4b'. Please specify 'model_provider' directly.` | {{code libs/langchain_v1/langchain/chat_models/base.py:641}} |
| `StructuredOutputValidationError`，不在录制文件中 | `Failed to parse structured output for tool 'Answer': Failed to parse data to Answer: 1 validation error for Answer` | {{code libs/langchain_v1/langchain/agents/structured_output.py:62-104}} |
| `StructuredOutputValidationError` | `Failed to parse structured output for tool 'Answer': Native structured output expected valid JSON for Answer, but parsing failed` | {{code libs/langchain_v1/langchain/agents/structured_output.py:426}} |
| `MultipleStructuredOutputsError`，以文本形式发给模型 | `Error: Model incorrectly returned multiple structured responses (Answer, Refusal) when only one is expected.` | {{code libs/langchain_v1/langchain/agents/structured_output.py:43-57}} |
| `ValueError` | `Unsupported schema type: <class 'typing._UnionGenericAlias'>.` | {{code libs/langchain_v1/langchain/agents/structured_output.py:191}} |
| `ModelCallLimitExceededError` | `Model call limits exceeded: run limit (1/1)` | {{code libs/langchain_v1/langchain/agents/middleware/model_call_limit.py:60-63}} |
| `ToolCallLimitExceededError` | `Tool call limit reached: run limit exceeded (2/1 calls).` | {{code libs/langchain_v1/langchain/agents/middleware/tool_call_limit.py:97-105}} |
| `ValueError` | `ToolErrorMiddleware requires `，后接两个处理器的名称 | {{code libs/langchain_v1/langchain/agents/middleware/tool_error.py:112}} |
| `ValueError` | `ProviderToolSearchMiddleware requires a provider with server-side tool search, but got 'ollama'; supported providers: anthropic, openai` | {{code libs/langchain_v1/langchain/agents/middleware/provider_tool_search.py:146-151}} |
| `PIIDetectionError` | `Detected 1 instance(s) of email in text content` | {{code libs/langchain_v1/langchain/agents/middleware/_redaction.py:29-42}} |
| `ValueError` | `Number of human decisions (1) does not match number of hanging tool calls (2).` | {{code libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:822}} |
| `ValueError` | `MCP target 'server.py' is not a valid URL.` | {{code libs/langchain_v1/langchain/mcp/adapter.py:108}} |
| `NotImplementedError`，以错误 `ToolMessage` 的形式发给模型，前缀为 `Error calling tool 'ask_legacy': ` | `This MCP server asked for input over the legacy server-initiated elicitation path, which interrupt-based elicitation cannot answer.` | {{code libs/langchain_v1/langchain/mcp/elicitation.py:236-242}} |

`ToolStrategy` 的重试文本是模板 `Error: {error}\n Please fix your mistakes.` {{code libs/langchain_v1/langchain/agents/factory.py:128}}. agent 把它作为 `ToolMessage` 发给模型，运行继续。

## langchain-core {#s-ref-errors-langchain-core}

| Class | Message | Raised at |
|---|---|---|
| `ModelRefusalError`, not in a capture | `Model refused to produce the requested output: I can't help with that.` | {{code libs/core/langchain_core/exceptions.py:137-154}} |
| `ValueError`, not in a capture | `No generations found in stream.` | {{code libs/core/langchain_core/language_models/chat_models.py:276}} |
| `NotImplementedError` | `stream_events(version='v2') is not supported.` | {{code libs/core/langchain_core/runnables/base.py:1818}} |
| `NotImplementedError`，文本为空 | 在原版假聊天模型上由 `bind_tools` 抛出 | {{code libs/core/langchain_core/language_models/chat_models.py:2409-2426}} |

`ModelRefusalError` 是 `ModelError` 的子类 {{code libs/core/langchain_core/exceptions.py:73}}。`ModelRefusalMiddleware` 根据拒绝块抛出它 {{code libs/langchain_v1/langchain/agents/middleware/model_refusal.py:27-30}}.

## langgraph {#s-ref-errors-langgraph}

| Class | Message | Raised at |
|---|---|---|
| `GraphRecursionError` | `Recursion limit of 10007 reached without hitting a stop condition. You can increase the limit by setting the `，后接 `recursion_limit` 和 `config key.` | {{code libs/langgraph/langgraph/pregel/main.py:3119-3126}} |
| `InvalidUpdateError` | `At key 'value': Can receive only one value per step. Use an Annotated key to handle multiple values.` | {{code libs/langgraph/langgraph/channels/last_value.py:61}} |
| `ValueError` | `Checkpointer requires one or more of the following 'configurable' keys: thread_id, checkpoint_ns, checkpoint_id` | {{code libs/langgraph/langgraph/pregel/main.py:2701-2705}} |
| `AttributeError` | `'SyncPregelLoop' object has no attribute '_put_checkpoint_fut'` | {{code libs/langgraph/langgraph/pregel/main.py:3105}} |
| `NodeTimeoutError` | `Node 'slow' exceeded its run timeout of 0.050s (elapsed: <seconds>).` | {{code libs/langgraph/langgraph/errors.py:232-275}} |
| `TypeError` | `stream_events(version='v3') / astream_events(version='v3') do not accept stream_mode;` | {{code libs/langgraph/langgraph/pregel/main.py:395-400}} |
| `UnknownInterruptError` | `Unknown or already-consumed interrupt: <id>` | {{code libs/langgraph/langgraph/pregel/_loop.py:1059}} |
| `RuntimeError` | `When there are multiple pending interrupts, you must specify the interrupt id when resuming.` | {{code libs/langgraph/langgraph/pregel/_loop.py:1068}} |
| `RuntimeError`, not in a capture | `Cannot use Command(resume=...) without checkpointer` | {{code libs/langgraph/langgraph/pregel/_loop.py:1034}} |
| `KeyError` | `'checkpoint_ns'` | 实验记录 `T17-claims-mac` |
| `KeyError` | `'__pregel_scratchpad'`，由图外的 `interrupt()` 引起，例如请求输入的 MCP 工具 | {{code libs/langgraph/langgraph/types.py:1030}} |
| `TypeError` | `Tool lookup returned unexpected type: <class 'str'>`，针对名为 `lookup` 的工具 | {{code libs/prebuilt/langgraph/prebuilt/tool_node.py:1486}} |

`langgraph.errors` 的其他错误类有 `GraphBubbleUp`、`GraphInterrupt`、`NodeInterrupt`、`ParentCommand`、`EmptyInputError`、`TaskNotFound`、`NodeCancelledError` 和 `GraphDrained` {{code libs/langgraph/langgraph/errors.py:52-210}}. `GraphBubbleUp` 是 `GraphInterrupt`、`ParentCommand` 和 `GraphDrained` 的基类。它们传递控制流，由循环处理。只有在图外直接调用节点时，你才会看到它们。

## checkpoint 与 store 包 {#s-ref-errors-the-checkpoint-and-store-packages}

| Class | Message | Raised at |
|---|---|---|
| `InvalidNamespaceError` | `Invalid namespace label 'bob.x' found in ('users', 'bob.x'). Namespace labels cannot contain periods ('.').` | {{code libs/checkpoint/langgraph/store/base/__init__.py:1333-1334}} |
| `TypeError` | `Type is not msgpack serializable: Plain` | `ormsgpack` 编码器，见实验记录 `T13-serde-mac` |
| `ValueError` | `LANGGRAPH_AES_KEY environment variable is not set.` | {{code libs/checkpoint/langgraph/checkpoint/serde/encrypted.py:54-56}} |

## 其他包（来自实验记录） {#s-ref-errors-other-packages-from-the-lab}

| 类 | 消息 | 抛出者 | 实验目录 |
|---|---|---|---|
| `MCPError` | `Connection closed` | `mcp`，在 stdio 服务器于调用期间退出时 | `T12-mcp-mac` |
| `MCPError` | `Request 'tools/call' timed out` | `mcp`，在 `fastmcp.Client` 超时时 | `T12-mcp-mac` |
| `RemoteProtocolError` | `Server disconnected without sending a response.` | `httpx`，在 HTTP 服务器于调用期间退出时 | `T12-mcp-mac` |
| `MCPError` | `Elicitation not supported` | `mcp`，针对协议 `2026-07-28` 上没有 elicitation 处理器的客户端 | `T20-mcp-edges-mac` |
| `MCPError` | `Tool 'ask_name' returned an InputRequiredResult to request client input, but the multi-round-trip result type (SEP-2322) only exists at MCP 2026-07-28; this connection negotiated '2025-11-25'.` | FastMCP 服务器，在旧版连接上 | `T20-mcp-edges-mac` |
| `LangSmithConnectionError` | `Connection error caused failure to GET /datasets in LangSmith API. Please confirm your internet connection.` | `langsmith`，来自开启了跟踪且无网络连接的 pytest 插件 | `T19-pytest-plugin-x86` |
| `ValueError` | `log_outputs should only be called within a pytest test decorated with @pytest.mark.langsmith, and with tracing enabled (by setting the LANGSMITH_TRACING environment variable to 'true').` | `langsmith`，针对开启跟踪时未加标记的测试 | `T19-pytest-plugin-x86` |
| `ValueError`，表现为退出码为 3 的 pytest `INTERNALERROR` | `--langsmith-output not supported when env varLANGSMITH_TEST_TRACKING='false'. Please remove the'--langsmith-output' option or enable test tracking.` 代码里本身就缺了这两个空格 | `langsmith`，位于 {{code src/langsmith/pytest_plugin.py:311-317}} | `T19-pytest-plugin-x86` |
| `ValueError` | `log_inputs should only be called within a pytest test decorated with @pytest.mark.langsmith, and with tracing enabled (by setting the LANGSMITH_TRACING environment variable to 'true').` | `langsmith`，针对开启跟踪、`LANGSMITH_TRACING` 未设置的已标记测试，位于 {{code src/langsmith/testing/_internal.py:1166-1168}} | `T21-langsmith-account-mac` |
| `LangSmithConflictError`，来自 HTTP 409 | `Nothing to commit: prompt has not changed since latest commit` | 托管 API，针对提示未变化的 `push_prompt` | `T21-langsmith-account-mac` |
| `LangSmithNotFoundError`，来自 HTTP 404 | `Commit not found` | 托管 API，针对标签不存在的 `pull_prompt` | `T21-langsmith-account-mac` |
| `LangSmithNotFoundError` | `Project healthy-coast-30 not found` | `langsmith`，读取 `evaluate(upload_results=False)` 返回的 `experiment_name` 时 | `T21-langsmith-account-mac` |
| CLI 错误，退出码 2 | `Error: Docker not installed or not running` | `langgraph-cli` 0.4.43，针对没有 Docker 守护进程时的 `langgraph up`，发生在任何密钥检查之前 | `T21-langsmith-account-mac` |
| HTTP 409 | `Thread is already running a task. Wait for it to finish or choose a different multitask strategy.` | `langgraph-api` 0.18.0，策略为 `reject` | `T15-agent-server-x86` |
| `ValueError` | `License verification failed. Please ensure proper configuration:` | `langgraph-api` 0.18.0，在 `langgraph up` 下 | `T15-agent-server-x86` |

## 警告 {#s-ref-errors-warnings}

| 类别 | 消息 | 抛出位置 |
|---|---|---|
| `LangChainBetaWarning` | 模块名 `langchain.mcp`，后接 `is in beta. It is actively being worked on, so the API may change.` | {{code libs/langchain_v1/langchain/mcp/__init__.py:25-29}} |
| `LangChainBetaWarning` | `The middleware `，后接 `ModelRouterMiddleware` 和 `is in beta.` | {{code libs/core/langchain_core/_api/beta_decorator.py:252}} |
| `LangChainBetaWarning` | `The v3 streaming protocol on Pregel is experimental.` | {{code libs/langgraph/langgraph/pregel/main.py:3617}} |
| `LangGraphDeprecatedSinceV10` | 名称 `checkpoint_during`，后接 `is deprecated and will be removed. Please use`、名称 `durability` 和 `instead.` | {{code libs/langgraph/langgraph/pregel/main.py:2837-2840}} |
| `LangGraphDeprecatedSinceV10` | `NodeInterrupt is deprecated. Please use `，后接 `langgraph.types.interrupt` 和 `instead.` | {{code libs/langgraph/langgraph/errors.py:113-121}} |
| `LangGraphDeprecatedSinceV10` | `Importing Send from langgraph.constants is deprecated.` | {{code libs/langgraph/langgraph/constants.py:37}} |
| `LangGraphDeprecatedSinceV11` | `Accessing GraphOutput via`，后接 `result[key]` 和 `is deprecated.` | 录制文件 `24-stream-v2.txt` |
| `UserWarning`，来自 `warnings.warn` | 名称 `durability`，后接 `has no effect when no checkpointer is present.` | {{code libs/langgraph/langgraph/pregel/main.py:2929-2932}} |
| 写入日志的警告 | `Deserializing unregistered type __main__.Color from checkpoint. This will be blocked in a future version.` | {{code libs/checkpoint/langgraph/checkpoint/serde/jsonplus.py:600}} |
| `LangSmithBetaWarning` | `'upload_results' parameter is in beta.` | {{code src/langsmith/evaluation/_runner.py:402}} |
| `LangSmithDeprecationWarning` | `list_runs() is deprecated and will be removed after Jan 31, 2027.`，后接新调用的名称 | {{code src/langsmith/client.py:4219}} |
| `UserWarning` | `Pydantic serializer warnings:`，后接针对 `context` 字段的 `PydanticSerializationUnexpectedValue` | `pydantic`，针对没有 `context_schema` 的 agent 收到 `context` 字典时 |

来源：capture/out/01-init-chat-model.txt, capture/out/04-tool-errors.txt, capture/out/08-structured-errors.txt, capture/out/09-middleware-order.txt, capture/out/11-mw-call-limits.txt, capture/out/13-mw-fallback-refusal.txt, capture/out/14-mw-pii.txt, capture/out/15-mw-hitl-batched.txt, capture/out/18-mw-selection-emulation.txt, capture/out/20-mw-decisions.txt, capture/out/24-stream-v2.txt, capture/out/25-stream-events-v3.txt, libs/core/langchain_core/language_models/fake_chat_models.py（langchain==1.5.0）, capture/out/28-checkpoint-memory.txt, capture/out/31-durability.txt, capture/out/33-store.txt, capture/out/34-stategraph-reducers-send-command.txt, capture/out/37-error-handler-timeout.txt, capture/out/38-recursion-limit.txt, capture/out/40-mcp.txt, capture/out/42-langsmith.txt; capture/lab/T06-structured-output-mac/03-ollama-seq-n10.jsonl, capture/lab/T07-approvals-x86/01-cases.jsonl, capture/lab/T08-parallel-tools-mac/02-idless-and-dupnames.jsonl, capture/lab/T12-mcp-mac/01-langchain-mcp.jsonl, capture/lab/T13-serde-mac/03-round-trip.jsonl, capture/lab/T13-serde-mac/04-round-trip-log.txt, capture/lab/T14-stores-mac/01-memory-sqlite.jsonl, capture/lab/T15-agent-server-x86/04-double-texting.jsonl, capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt, capture/lab/T17-claims-mac/02-replay-and-fork.jsonl, capture/lab/T19-pytest-plugin-x86/02-off-noenv-output-rep1-stdout.txt, capture/lab/T19-pytest-plugin-x86/02-on-noenv-refuse-rep1-stdout.txt, capture/lab/T20-mcp-edges-mac/01-mcp-edges.jsonl, capture/lab/T21-langsmith-account-mac/04-e3-on-rep1-stdout.txt, capture/lab/T21-langsmith-account-mac/04-e3-inspect-stdout.txt, capture/lab/T21-langsmith-account-mac/05-e4-hub.json, capture/lab/T21-langsmith-account-mac/06-e2-false.json, capture/lab/T21-langsmith-account-mac/07-e5-up.txt；每一行所指的代码文件（langchain==1.5.0、langchain-core 1.8.0、langgraph 1.2.22 和 langsmith 0.14.17）。
