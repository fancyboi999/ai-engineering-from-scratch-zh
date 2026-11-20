# 环境变量

> 本页列出这套技术栈或其文档在锁定版本下提到的 23 个环境变量，并给出读取每个变量的文件和行号。

请在进程启动之前设置每个变量。`LANGGRAPH_DEFAULT_RECURSION_LIMIT`、delta 设置和 `LANGGRAPH_STRICT_MSGPACK` 在模块导入时读取。LangSmith SDK 在第一次读取后会缓存每个值 {{code src/langsmith/utils.py:394}}。它读取每个名称时先试前缀 `LANGSMITH_`，再试 `LANGCHAIN_` {{code src/langsmith/utils.py:377-381}}。追踪开关是例外：任一前缀的 `TRACING_V2` 变量都优先于 `LANGSMITH_TRACING`。只有文档支持的行会注明这一点。

## LangGraph {#s-ref-environment-variables-langgraph}

| 变量 | 默认值 | 作用 | 读取位置 | 章节 |
|---|---|---|---|---|
| `LANGGRAPH_DEFAULT_RECURSION_LIMIT` | `10007` | 配置中没有 `recursion_limit` 的运行所用的递归上限 | {{code libs/langgraph/langgraph/_internal/_config.py:42-43}} | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| `LANGGRAPH_DELTA_MAX_SUPERSTEPS_SINCE_SNAPSHOT` | `5000` | `DeltaChannel` 在不做完整快照的情况下最多可经过的步数 | {{code libs/langgraph/langgraph/_internal/_config.py:45-46}} | [5.5](#s-context-engineering-and-summarization) |
| `LANGGRAPH_STRICT_MSGPACK` | `false` | 取 `1`、`true` 或 `yes` 时，会拦截所有不在白名单上的 msgpack 类型 | {{code libs/checkpoint/langgraph/checkpoint/serde/_msgpack.py:12-16}} | [5.6](#s-serialization-of-state-and-what-does-not-round-trip), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| `LANGGRAPH_AES_KEY` | 无 | `EncryptedSerializer` 的密钥，16、24 或 32 字节。既没有它也没有 `key` 参数时，该类会抛出 `ValueError` | {{code libs/checkpoint/langgraph/checkpoint/serde/encrypted.py:54-59}} | [R.4](#s-ref-checkpointer-and-store-api) |

`create_agent` 图的递归上限是 9999，由它自己的配置设定，所以这个变量改不了它。[第 6.8 节](#s-error-handlers-node-timeouts-and-the-recursion-limit)测量了这个变量：设为 25 时，普通循环在 25 步停止。它不影响 agent 的 9999，这一点来自代码，而不是来自某次运行。

## LangChain {#s-ref-environment-variables-langchain}

| 变量 | 默认值 | 作用 | 读取位置 | 章节 |
|---|---|---|---|---|
| `LC_OUTPUT_VERSION` | 无 | 聊天模型默认的 `output_version`，`v0` 或 `v1` | {{code libs/core/langchain_core/language_models/chat_models.py:396-397}} | [3.3](#s-messages-and-content-blocks) |
| `LANGSMITH_GATEWAY` | 无 | 取 `true` 或一个 URL，会让 `ChatOpenAI`、`ChatAnthropic` 等提供方集成经由 LangSmith 模型网关。`init_chat_model` 的 `langsmith` 提供方不需要它也会使用该网关 {{code libs/langchain_v1/langchain/chat_models/base.py:24-37}} | {{code libs/core/langchain_core/utils/_gateway.py:35}} {{code libs/core/langchain_core/utils/_gateway.py:95}} | [3.2](#s-init-chat-model-and-model-profiles) |
| `LANGSMITH_GATEWAY_API_KEY` | 无 | 该网关的密钥。没有它时，代码会读取 `LANGSMITH_API_KEY` | {{code libs/core/langchain_core/utils/_gateway.py:36-37}} {{code libs/core/langchain_core/utils/_gateway.py:165}} | [3.2](#s-init-chat-model-and-model-profiles) |

## LangSmith 追踪与测试 {#s-ref-environment-variables-langsmith-tracing-and-tests}

| 变量 | 默认值 | 作用 | 读取位置 | 章节 |
|---|---|---|---|---|
| `LANGSMITH_TRACING_V2`, `LANGCHAIN_TRACING_V2` | 无 | 值恰好为 `true` 时开启追踪 | {{code src/langsmith/utils.py:138-140}} | [7.6](#s-langsmith-tracing) |
| `LANGSMITH_TRACING`, `LANGCHAIN_TRACING` | 无 | 同一个开关，仅当两个 `TRACING_V2` 变量都没有设置时才读取 | {{code src/langsmith/utils.py:138-140}} | [7.6](#s-langsmith-tracing) |
| `LANGSMITH_API_KEY` | 无 | LangSmith 客户端的密钥 | {{code src/langsmith/utils.py:803-805}} | [7.6](#s-langsmith-tracing) |
| `LANGSMITH_ENDPOINT` | LangSmith 云端 API | 客户端发送运行记录的地址。指向你自己网络里的服务器，运行记录就留在你手里 | {{code src/langsmith/utils.py:789-797}} | [7.6](#s-langsmith-tracing) |
| `LANGSMITH_PROJECT` | `default` | 被追踪运行所属的项目。服务器在第一次运行时创建它。仅当 `LANGSMITH_EXPERIMENT` 未设置时，pytest 插件才把它用作实验前缀 | {{code src/langsmith/utils.py:420-436}} {{code src/langsmith/testing/_internal.py:428-431}} | [7.6](#s-langsmith-tracing), [7.7](#s-evaluation-with-langsmith) |
| `LANGSMITH_TEST_SUITE` | 仓库名加测试所在模块 | pytest 插件创建的数据集的名称 | {{code src/langsmith/testing/_internal.py:437-448}} | [7.7](#s-evaluation-with-langsmith) |
| `LANGSMITH_EXPERIMENT` | 无 | pytest 插件每个实验名称的前缀，后面跟一个冒号和 8 位随机十六进制字符 | {{code src/langsmith/testing/_internal.py:428-432}} | [7.7](#s-evaluation-with-langsmith) |
| `LANGSMITH_TEST_TRACKING` | 无，即保持记录开启 | 取 `false` 时，标记了 LangSmith 的测试照常运行但不留记录。它不会关闭 `LANGSMITH_TRACING`，测试内部的运行仍会被发送。记录开启时，除非 `LANGSMITH_TRACING` 为 `true`，否则每次 `log_*` 调用都会抛出异常 | {{code src/langsmith/utils.py:143-145}} | [7.7](#s-evaluation-with-langsmith) |
| `LANGSMITH_TEST_CACHE` | 无 | 测试插件缓存其 API 调用的文件夹 | {{code src/langsmith/utils.py:513}} | [7.7](#s-evaluation-with-langsmith) |
| `LANGCHAIN_CALLBACKS_BACKGROUND` | 无 | 文档说取 `false` 会让回调等待。我们在 `langchain-core` 1.8.0 和 `langsmith` 0.14.17 中都没有找到读取它的代码。`langgraph-cli` 把它列为 deploy 命令的保留名称，`langgraph-api` 为其 JS worker 把它设为 `true` | 仅见于文档，以及 {{code libs/cli/langgraph_cli/deploy.py:76}} （仓库树中是第 76 行，0.4.43 wheel 中是第 71 行） {{code langgraph_api/js/remote.py:119}} | [7.6](#s-langsmith-tracing) |

有三个开关的优先级高于这些变量：先是 `tracing_context`，然后是活动的运行树，再然后是全局设置 {{code src/langsmith/utils.py:119-140}}。顺序见[第 7.6 节](#s-langsmith-tracing)。

## Agent Server 及其 CLI {#s-ref-environment-variables-agent-server-and-its-cli}

| 变量 | 默认值 | 作用 | 读取位置 | 章节 |
|---|---|---|---|---|
| `N_JOBS_PER_WORKER` | 文档中是 10，`langgraph dev` 下是 1 | 一个队列 worker 同时执行的运行数 | 文档，以及 `langgraph dev` 的默认值 {{code langgraph_api/cli.py:273}} | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `LANGGRAPH_CLOUD_LICENSE_KEY` | 无 | 生产环境中由 `langgraph up` 启动的服务器的许可证 | 录制文件 `T15-agent-server-x86/08-up-start-excerpt.txt` | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `LANGSMITH_API_KEY` | 无 | 启动 `langgraph up` 的另一种方式，用于本地开发 | 录制文件 `T15-agent-server-x86/10-up-license-excerpt.txt` | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `DISABLE_TRUSTSTORE` | 无 | 取 `true` 时，`langgraph-api` 不再把 `truststore` 放进 SSL 层，服务器因此不使用操作系统的信任库来校验证书 | {{code langgraph_api/server.py:11-17}} | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `LANGGRAPH_HOST_API_KEY` | 无 | `langgraph deploy` 的密钥，先于 `LANGSMITH_API_KEY` 和 `LANGCHAIN_API_KEY` 被读取 | {{code libs/cli/langgraph_cli/deploy.py:96-100}} （仓库树中是第 96 到 100 行，0.4.43 wheel 中是第 91 到 95 行） | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |

文档给服务器的递归上限是 10011，`langgraph-api` 0.18.0 也设置了这个值 {{code langgraph_api/utils/config.py:44}}。但我们在 `langgraph dev` 下的运行仍然在 10007 处停止，见[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)。冲突登记把这组数字记为 D105。

## 录制工具包 {#s-ref-environment-variables-the-capture-kit}

`capture/run.py` 在运行任何场景之前先设定固定的环境。

| 变量 | 工具包的做法 |
|---|---|
| 每个 `LANGSMITH_`、`LANGCHAIN_`、`LANGGRAPH_`、`OPENAI_`、`ANTHROPIC_` 和 `LC_` 变量，以及 `OLLAMA_HOST` | 将其移除 |
| `LANGSMITH_TRACING` | 设为 `false` |
| `TZ` | 设为 `UTC` |
| `PYTHONHASHSEED` | 以 `0` 重新运行自身 |
| `LANGCHAIN101_PYTHON` | 将其读作装有锁定版本包的解释器 |

工具包会移除 `LANGGRAPH_` 变量，因为 shell 里设置的递归上限会改变录制结果。

来源：libs/langgraph/langgraph/_internal/_config.py、libs/checkpoint/langgraph/checkpoint/serde/_msgpack.py、libs/checkpoint/langgraph/checkpoint/serde/encrypted.py 和 libs/cli/langgraph_cli/deploy.py（langgraph 1.2.22）；libs/core/langchain_core/language_models/chat_models.py 和 libs/core/langchain_core/utils/_gateway.py（langchain-core 1.8.0）；libs/langchain_v1/langchain/chat_models/base.py（langchain==1.5.0）；src/langsmith/utils.py 和 src/langsmith/testing/_internal.py（langsmith 0.14.17）；langgraph_api/cli.py、langgraph_api/utils/config.py、langgraph_api/server.py 和 langgraph_api/js/remote.py（langgraph-api 0.18.0）； capture/run.py, capture/README.md; capture/lab/summary/pytest-plugin-x86.json, capture/lab/summary/langsmith-account-mac.json; capture/lab/T15-agent-server-x86/08-up-start-excerpt.txt, capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt; docs.langchain.com（文档提交 04d4d4a：langsmith/trace-with-langchain、langsmith/agent-server-scale、langsmith/env-var-cloud）。
