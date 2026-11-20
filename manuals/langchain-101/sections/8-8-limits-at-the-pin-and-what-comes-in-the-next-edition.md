# 锁定版本上的局限，以及下一版会补什么

> 这一版是离线测试的栈，用了两台机器和一个免费的 LangSmith 账户，没有 Agent Server 许可证，所以下面这些条目还没有录制过运行。

你读到某一节，发现你关心的某个用例没有运行过。本节把所有这样的用例集中在一处，按各自需要的条件分组，并链回提出它的那一节。

读完本节，你能分辨本手册的哪些论断有记录下来的运行作为依据。你还能为某个未决用例规划自己的测试。

有一个条目在一个完整示例里做过一次试验，它那一行会写明。在下一版之前，本手册不给出其他条目的测量结果。

## 为什么缺这些运行 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-why-these-runs-are-missing}

有三个限制决定了这一版能运行什么。带 Postgres 和 Redis 的完整 Agent Server，没有 LangSmith API 密钥或许可证密钥就起不来，见[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)。

我们的 LangSmith 账户是新注册的免费计划账户。它跑过追踪、`evaluate`、pytest 插件和提示词 hub，下面的列表里是它没覆盖到的内容。我们的本地模型是 Ollama 上的 Qwen3 0.6B 到 30B-A3B 和 gpt-oss 20B。Claude Haiku 5.5 和 Claude Sonnet 5.5 在固定预算下运行了[第 1.2 节](#s-do-you-need-langchain)的任务套件。Claude Haiku 5.5 还运行了[第 9.6 节](#s-evals-that-check-state)的 20 个评估。下面其他托管服务的用例还没有运行。

下面每个列表都写明用例，以及文字在哪一节停下来。大多数图的用例不需要账户，只需要录制工具包里的一个新场景。

## 生产服务 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-the-production-service}

这些需要对[第 9 部分](#p-9)的服务在 Mac 上再多运行一次。

- 用 Qwen3 14B 的明确崩溃试验：请求里带金额和原因，三次杀掉 worker。另一个任务占着内存时，Ollama 九分半钟都没有加载那个模型，所以我们停掉了它们。[第 9.3 节](#s-approvals-and-the-idempotency-key)
- 以普通恢复形式发送的决定，能否经受住 `checkpoint_writes` 里的一次崩溃，以及没有新决定的一次恢复。[第 9.3 节](#s-approvals-and-the-idempotency-key)
- 同时 4 个或 8 个请求时，Ollama 输出下降的原因。[第 9.7 节](#s-workers-the-advisory-lock-and-cost)
- 这个服务在 GitHub Actions 上、用真实模型的 CI 工作流。[第 9.6 节](#s-evals-that-check-state)

## 带 Postgres 和 Redis 的 Agent Server {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-agent-server-with-postgres-and-redis}

这些需要带密钥的 `langgraph up`，或一次部署。

- Postgres 任务队列里的恰好一次，在一次运行进行到一半时杀掉 worker。[第 1.1 节](#s-langchain-langgraph-langsmith-and-deep-agents)
- 从短暂的 Redis 中断和短暂的 Postgres 中断中恢复。[第 1.1 节](#s-langchain-langgraph-langsmith-and-deep-agents)
- 在一个被中断的 worker 上的运行，以及它从哪个检查点恢复。[第 1.1 节](#s-langchain-langgraph-langsmith-and-deep-agents)
- 一次运行期间 Redis 里存了什么，存多久。[第 1.1 节](#s-langchain-langgraph-langsmith-and-deep-agents)
- Agent Server 在库崩溃矩阵各个点上的崩溃表现。[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)
- `langgraph up` 下一次运行的时间下限、每个 worker 的作业数和递归上限。[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)
- 自定义认证的 store 权限，以及经由服务器的跨用户读取。[第 5.4 节](#s-stores-and-long-term-memory)和[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)
- `langgraph deploy`、它的 serverless 和 dedicated 类型，以及一次冷启动。[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)
- 用免费账户的密钥运行 `langgraph up`，以及服务器镜像内部的许可证检查，这需要 Docker 来运行。[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)

## 需要账户的 LangSmith {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-langsmith-with-an-account}

- 按名称交给 `evaluate` 的数据集的版本和划分。[第 7.7 节](#s-evaluation-with-langsmith)
- 两次实验的比较。[第 7.7 节](#s-evaluation-with-langsmith)
- 对生产追踪的在线评估器，以及标注队列。[第 7.7 节](#s-evaluation-with-langsmith)
- 针对错误答案的评判评估器，因为我们运行里的每个答案都是对的。[第 7.7 节](#s-evaluation-with-langsmith)
- 触及账户所报告限制的流量：每次 post 100 个运行、每条追踪 1,000 个运行，以及各个保留期档位。[第 7.6 节](#s-langsmith-tracing)

## 不需要账户的 LangSmith {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-langsmith-without-an-account}

这些不需要账户，只需要一次新的实验运行。

- 用你传入的客户端运行 `evaluate`，看 agent 的运行跟随的是那个客户端还是默认客户端。[第 7.7 节](#s-evaluation-with-langsmith)
- 带 `LANGSMITH_TEST_CACHE` 和 `vcrpy` 的 pytest 插件，在 pytest 7 和 9 下、带 `pytest-xdist`，以及异步测试。[第 7.7 节](#s-evaluation-with-langsmith)

## MCP {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-mcp}

- OAuth、URL 模式的 elicitation，以及一轮里的多个输入请求。[第 7.3 节](#s-mcp-with-langchain-mcp)
- 在 agent 运行内部抛出 `MCPError` 的两个 elicitation 用例，以及基于 stdio 的 elicitation 用例。[第 7.3 节](#s-mcp-with-langchain-mcp)

## 托管提供方与真实模型 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-hosted-providers-and-real-models}

- 一个更难的任务套件，用来区分 Claude Haiku 5.5 和 Claude Sonnet 5.5，因为两者都通过了各自运行的每个任务。[第 1.2 节](#s-do-you-need-langchain)
- 在 Anthropic 或 OpenAI 上做真实延迟加载的 `ProviderToolSearchMiddleware`。[第 4.6 节](#s-the-built-in-middleware)
- 对错误请求产生的 400 使用 `ModelFallbackMiddleware`。[第 4.7 节](#s-retries-backup-models-rate-limits-and-caching)
- `set_llm_cache`、`create_agent` 的节点缓存，以及针对模型的限流器。[第 4.7 节](#s-retries-backup-models-rate-limits-and-caching)

## 中间件 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-middleware}

- 带 `apply_to_output=True` 的流上的 `PIIMiddleware`，以及它 128 个字符的暂扣。[第 4.8 节](#s-guardrails-pii-and-the-decision-middleware-beta)
- 异步钩子、`after_agent` 和 `dynamic_prompt` 的成本，以及内置中间件在真正起作用（例如一次重试或一次摘要）时的成本。[第 8.3 节](#s-cost-the-framework-against-a-plain-sdk-loop)
- 一起发送的多个审批里夹着一个无效回答，文档警告这可能让工具运行两次。[第 6.5 节](#s-human-in-the-loop-batched-and-per-call)

## 持久化 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-persistence}

- `AsyncSqliteSaver` 在崩溃下的表现，以及它的写入成本。[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)
- `AsyncPostgresSaver` 在库矩阵各个杀进程点上的崩溃表现。[第 9.3 节](#s-approvals-and-the-idempotency-key)只在一个点上杀过 worker。
- `checkpoints` 流模式。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)
- 在 pgvector 上带索引的 `PostgresStore` 和 `AsyncPostgresStore`。[第 5.4 节](#s-stores-and-long-term-memory)和[第 9.2 节](#s-postgres-checkpointer-store-and-owner-check)运行它们时没有索引。
- 经由 `PostgresSaver` 的序列化器、`EncryptedSerializer`，以及 issue #8938 里的明文行。[第 5.6 节](#s-serialization-of-state-and-what-does-not-round-trip)

## 还没有录制的图功能 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-graph-features-with-no-capture-yet}

这些只需要录制工具包里的一个新场景。

- 用 `Overwrite` 跳过 reducer。[第 6.1 节](#s-stategraph-state-and-reducers)
- 从子图内部的节点发出的 `Command(graph=Command.PARENT)`。[第 6.2 节](#s-edges-send-and-command)
- `@task` 上的 `retry_policy`、`cache_policy` 和 `timeout`。[第 6.3 节](#s-the-functional-api-entrypoint-and-task)
- 没有 checkpointer 时 `Command(resume=...)` 的 `RuntimeError`。[第 6.4 节](#s-interrupt-and-resume)
- 时间旅行到子图内部的某个点。[第 6.6 节](#s-time-travel-replay-update-state-and-forks)
- 在节点内部调用的子图、没有共享键的子图 schema，以及带 `add_messages` 的子图。[第 6.7 节](#s-subgraphs-and-multi-agent-patterns)
- 用 `checkpointer=True` 和 `checkpointer=False` 编译的子图。[第 6.7 节](#s-subgraphs-and-multi-agent-patterns)
- 对同步节点上的 `timeout` 的拒绝。[第 6.8 节](#s-error-handlers-node-timeouts-and-the-recursion-limit)

## 流式输出与并行工具调用 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-streaming-and-parallel-tool-calls}

- 为每个 v3 投影各设一个任务，作为对 issue langchain#38484 里批处理问题的修法。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)
- 内层 agent token 的时序：实验在原始 v3 事件里看到了，但没有测量。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)
- 经由 `ChatOllama` 的一个 2,000 token 的工具调用参数，以及来自 Ollama 的工具调用流式输出，它把每个调用整个发出。[第 5.1 节](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode)
- Qwen3 8B 的并行工具调用，以及 `messages` 模式下并行调用的时序。[第 4.1 节](#s-create-agent-and-the-graph-it-builds)
- 线程池比默认值更大的一次运行。代码让 `max_concurrency` 设定线程池大小，而我们的运行最多用了 8。[第 4.1 节](#s-create-agent-and-the-graph-it-builds)

## 聊天 UI、文件规则与 store 命名空间 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-chat-ui-file-rules-and-store-namespaces}

- 开着默认遥测的 Agent Chat UI、生产构建，以及托管版本。[第 8.2 节](#s-agent-chat-ui-in-front-of-langgraph-dev)运行的是关闭遥测的开发构建。
- 对着 `langgraph up`、带已部署的图，以及在它的透传路由前放上你自己的认证的 Agent Chat UI。[第 8.2 节](#s-agent-chat-ui-in-front-of-langgraph-dev)
- 每种审批回答，以及在待处理审批上输入消息，不止一次试验。批准、编辑和拒绝各运行了一次，输入消息在每种模式下运行了一次。[第 8.2 节](#s-agent-chat-ui-in-front-of-langgraph-dev)
- 文件规则攻击的发生率。20 个提示词在每个规则列表下各运行一次，所以表里数的是提示词，不是重复试验。[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)
- 带 `interrupt` 模式、有真人回答的文件规则，以及没有 `execute` 路由的沙箱后端。[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)
- `StoreBackend` 的命名空间工厂在其他模型上，以及用不点名 `/memories/` 的提示词。有一次用了更含糊的提示词，没有调用任何工具。[第 5.4 节](#s-stores-and-long-term-memory)

## 没有这些运行时，哪些仍然成立 {#s-limits-at-the-pin-and-what-comes-in-the-next-edition-what-holds-without-these-runs}

上面这些条目是对手册的补充，不会改变任何已记录的结果。第 1 到第 9 部分里每个测得的数字，都来自 Mac 或 x86 服务器客户机上的一次运行。默认值、限制和版本来自代码或文档，正文都注明了出处。每个 listing 都来自锁定版本上的录制工具包。你依赖某个未决条目时，先在自己的栈上运行它，再依靠文档。

```takeaways
- 依赖某个没有任何一节测量过的论断之前，先查这份列表。
- 你的设计依赖某个未决用例时，在自己的栈上运行它。
- 把 Agent Server 关于恰好一次和中断的论断当作未测试，直到你自己测过。
```

来源：本手册的第 1.1、3.1、3.4、3.5、3.6、4.1、4.3、4.4、4.5、4.6、5.1 到 5.8、6.2、6.4、6.5、7.1、7.2、7.3、7.6、7.7、8.1、8.2、8.4 和 9.1 到 9.7 节; capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt; capture/lab/T21-langsmith-account-mac/07-e5-up.txt; capture/lab/README.md.
