# 来源与冲突

> 本手册把各标签处的代码排在文档之上，每个 listing 和实测数字都用自己录制的运行，并记录了来源之间的 32 处冲突。

排序与[如何阅读本手册](#s-front)中的相同。两个来源不一致时，排名高的获胜，对应章节会写明这一点。我们在 2026-11-14 读完了每个来源，并核对了每个事实。机器和方法见[本手册是怎么做的](#s-ref-how-this-manual-was-made)。

## 来源的排序 {#s-ref-sources-and-conflicts-the-ranked-sources}

| 等级 | 来源 | 手册从中取用什么 |
|---|---|---|
| 1 | 每个包在其发布标签处的源代码 | 每个类、参数、默认值和错误文本，以及参考表格 |
| 2 | 从仓库的一次提交构建出来的 LangChain 文档 | 文档记载的行为，用我们自己的话重述，并对照代码和我们的运行核对 |
| 3 | 每个包的更新日志和发布说明 | 某项变更何时出现，以及它在哪个包版本中 |
| 4 | 录制工具包，场景需要模型时使用 Ollama 上的 Qwen3 4B | 每个 listing |
| 5 | 两台机器上的实验记录、针对托管 LangSmith API 的账户运行、任务集测试基准，以及第 9 部分的生产服务。其中的 Claude 行是通过 Anthropic API 运行的 | 以“我们测得”开头的段落里的每个数字 |

GitHub 的 issue、pull request 和安全公告，是锁定版本下某种行为的证据。正文按编号引用每一条，并且从不把 issue 当作我们自己的结果。该项目的产品页面没有开放许可。[第 1.1 节](#s-langchain-langgraph-langsmith-and-deep-agents)用我们自己的话陈述它们的说法，并把每一条与一次运行放在一起对照。

## 第 1 级：代码 {#s-ref-sources-and-conflicts-rank-1-the-code}

| 包 | 版本 | 提交 | 使用位置 |
|---|---|---|---|
| `langchain` | 1.5.0，2026-11-11 发布 | `c2f4036e` | 每个部分 |
| `langchain-core` | 1.8.0 | `a4b4a7b9`，与 `c2f4036e` 的 core 目录树相同 | 每个部分 |
| `langgraph`, with `langgraph-checkpoint` 4.3.2 and `langgraph-prebuilt` 1.1.2 | 1.2.22 | `08a20169` | 第 2 部分，第 4 到 6 部分，第 8 部分 |
| `langgraph-checkpoint-sqlite` | 3.1.3 | 按发布记录是 `5bd231cb`。我们读的是 `08a20169` 处的代码，其中包含 3.1.3 | 第 2 部分，第 5 部分 |
| `langgraph-checkpoint-postgres` | 3.2.1，来自实验环境 | `08a20169` 处的 `langgraph` 仓库 | 第 5 部分，第 9 部分 |
| `deepagents` | 0.7.38 | `c858b364` | [7.4](#s-deep-agents-0-7), [7.5](#s-a-deep-agent-with-a-subagent-and-files) |
| `langsmith` | 0.14.17 | `15dd2a78` | [7.6](#s-langsmith-tracing), [7.7](#s-evaluation-with-langsmith) |
| `langgraph-api`, `langgraph-cli` | 0.18.0, 0.4.43 | 已发布的包 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| `langchain-openai`, `langchain-anthropic`, `langchain-ollama` | 1.8.0, 1.7.10, 1.1.0 | 各自的标签 | 第 3 部分， [1.2](#s-do-you-need-langchain), [4.3](#s-structured-output-which-strategy-on-which-provider) |
| `fastmcp`, `mcp` | 4.2.0, 2.3.0 | 已发布的包 | [7.3](#s-mcp-with-langchain-mcp) |
| `fastapi`, `starlette`, `uvicorn`, `psycopg`, `opentelemetry-sdk` | 0.162.7, 1.10.0, 0.54.0, 3.3.9, 1.45.2 | 已发布的包，取自服务的锁文件 | 第 9 部分 |
| `agent-chat-ui` | 没有发布版本也没有标签，锁定到 `main` | `0d21f7ff`，2026-11-03 提交，搭配 `@langchain/langgraph-sdk` 1.12.8 | [8.2](#s-agent-chat-ui-in-front-of-langgraph-dev) |
| `wcmatch` | 12.0.1，来自实验环境 | 已发布的包 | [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| `langchain-mcp-adapters` | 0.3.2，已归档 | 它的最后一个标签 | [7.3](#s-mcp-with-langchain-mcp), [8.5](#s-migration-from-0-x-and-stale-advice) |

## 第 2 级：文档 {#s-ref-sources-and-conflicts-rank-2-the-documentation}

文档站点提供的是它的主分支，没有任何文档标签与包的发布版本对应。我们在 2026-11-13 的文档提交 `04d4d4a` 处读完了每个页面。各章节按路径引用每个页面，下面这几组页面是它们用得最多的：

| 页面 | 使用位置 |
|---|---|
| LangChain 的 agents、models、messages、tools 和安装页面 | 第 1、3、4 部分 |
| 结构化输出、内置中间件、自定义中间件、护栏和人在回路 | 第 4、6 部分 |
| LangChain 和 LangGraph 的流式输出与事件流 | 第 2、5 部分 |
| checkpointer、持久化、store、短期与长期记忆，以及容错 | 第 2、5、6 部分 |
| graph API、`Send` 与 `Command`、functional API、中断、时间旅行、子图和 Pregel | 第 2、6 部分 |
| MCP 页面、Deep Agents 概览和检索页面 | 第 7 部分 |
| LangSmith 的追踪、可观测性快速入门、评估、pytest，以及用量与计费 | 第 7 部分 |
| Agent Server、它的扩展指南、CLI、双重发送、环境变量和独立服务器 | 第 1、8 部分 |
| 发布政策、更新日志、v1 发布说明和迁移指南 | 第 3、8 部分 |

## 第 3 级：发布 {#s-ref-sources-and-conflicts-rank-3-releases}

更新日志页面和每个包的 GitHub 发布记录给出每项变更所在的版本。[第 8.5 节](#s-migration-from-0-x-and-stale-advice)用它们来确定自 0.x 以来每项变更的时间。

图中的 LangChain、LangGraph 和 Python 标志归其所有者所有，我们只用它们来标识这些项目。

## 第 4 级和第 5 级：工具包与实验 {#s-ref-sources-and-conflicts-ranks-4-and-5-the-kit-and-the-lab}

录制工具包写出 56 个文件：19 个不需要模型，36 个是录制的，1 个是附带文件。实验目录里有 51 个实验文件夹、48 个汇总文件，以及带自己汇总的测试基准。第 9 部分的生产服务把它的代码、原始运行和十个汇总放在一个文件夹里。测试基准和服务都按 Anthropic 价格页的标价给每次 Claude 调用定价，价格页读取于 2026-11-14。每个实验及其机器和数量见[本手册是怎么做的](#s-ref-how-this-manual-was-made)。

## issue 与安全公告 {#s-ref-sources-and-conflicts-issues-and-advisories}

| issue | 报告的内容 | 使用位置 |
|---|---|---|
| langgraph #9267 | `durability="sync"` 在没有 checkpointer 时会抛出 `AttributeError` | [5.3](#s-durability-modes-and-a-crash-between-two-steps), [8.6](#s-symptom-cause-fix) |
| langgraph #8039 | `sync` 没有固定 `put_writes` 与 `put` 的顺序 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| langgraph #9185, #9240 | 抛出过异常的节点在恢复时会再次运行，以及要求在文档中说明持久性并不等于恰好一次 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| langgraph #8757 | `SqliteStore` 在删除后仍保留向量行 | [5.4](#s-stores-and-long-term-memory), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| langgraph #7714 | 一项对检查点 token 成本的测量，已关闭，因为检查点不会发给模型 | [5.5](#s-context-engineering-and-summarization) |
| langchain #38352 | 摘要之后出现孤立的工具消息，我们的运行没有复现 | [5.5](#s-context-engineering-and-summarization) |
| langgraph #8388, #8184, #8826, #8938 | 序列化器无法重建的值，以及加密下的明文行 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip) |
| langchain #38484, #38533 | v3 的消费者一次性拿到最终答案，以及一个已关闭的 pull request，它改的是 `create_agent` 而不是投影代码 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode), [2.5](#s-where-each-stream-mode-comes-from) |
| langgraph #9712 | 在 `InvalidUpdateError` 之后，已保存的线程在每次读取时都会抛出异常，直到部署了 reducer，我们已报告 | [6.1](#s-stategraph-state-and-reducers), [2.2](#s-channels-and-colliding-writes), [8.6](#s-symptom-cause-fix) |
| langchain #40492 | 中间件的跳转可能跳过批量审核 | [4.5](#s-middleware-hooks-and-their-order), [6.5](#s-human-in-the-loop-batched-and-per-call), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| langchain #33787, langgraph #9106 | 一次编辑却执行了旧的调用，以及恢复时运行了已经完成的分支，两者都没有复现 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| langchain #40531, langgraph #7988 | 没有 id 的工具调用，以及两个同名的工具 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| langchain #40688 | 工具重试会再次运行不幂等的工具 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| langgraph #8517 | `ToolNode` 在 `ainvoke` 下忽略 `max_concurrency` | [4.1](#s-create-agent-and-the-graph-it-builds) |
| langchain #40471 | MCP 错误结果丢失了它的 `structuredContent` | [7.3](#s-mcp-with-langchain-mcp) |
| langchain #41870 | `tracing_context(enabled="local")` 会发送 LangChain 代码的运行记录，我们已报告 | [7.6](#s-langsmith-tracing), [7.7](#s-evaluation-with-langsmith) |
| langsmith-python #106 | `evaluate(upload_results=False)` 会打印 `%s`，并给同一次调用起三个名字，我们已报告 | [7.7](#s-evaluation-with-langsmith) |
| langsmith-python #107 | 开启跟踪时，除非 `LANGSMITH_TRACING=true`，pytest 插件的每次 `log_*` 调用都会抛出异常，我们已报告 | [7.7](#s-evaluation-with-langsmith) |

[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)给出安全公告表，含每条公告的影响范围和我们在锁定版本下的结果。

## 冲突登记 {#s-ref-sources-and-conflicts-the-conflict-register}

每一行是两个来源之间的一处分歧。“手册采用”一列是本手册建议你怎么做，最后一列说明截至 2026-11-14 该项目做了什么。

| 编号 | 各来源的说法 | 手册采用 | 章节 | 上游 |
|---|---|---|---|---|
| D2 | `GenericFakeChatModel` 的 docstring 说它不支持流式输出，而单元测试页面说它支持。代码会流式输出文本，但丢弃工具调用。 | 代码：用真实模型测试流式输出，或使用能流式输出工具调用的假模型 | [8.6](#s-symptom-cause-fix) | 未找到 issue |
| D3 | `ToolRuntime` docstring 中的示例调用 `stream_writer.write`。该类型是一个普通的可调用对象。 | 代码：调用 `runtime.stream_writer(value)` | [3.4](#s-tools-toolruntime-and-tool-errors) | 未检查 |
| D4 | `StreamMode` 和流式输出页面列出七种模式。循环还接受 `tools`。 | 代码和录制文件：`tools` 是一种模式 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode), [R.3](#s-ref-stream-modes-and-event-types) | 未检查 |
| D6 | `durability="sync"` 是文档中记载的模式。在没有 checkpointer 时它会抛出 `AttributeError`。 | 运行结果：只在有 checkpointer 时使用 `sync` | [5.3](#s-durability-modes-and-a-crash-between-two-steps) | issue #9267 在锁定版本处未解决。修复 PR #9268 已关闭，未合并 |
| D8 | `create_deep_agent` 的 docstring 写的是 `execute` 而不是 `delete`。默认后端绑定了 `delete`，没有 `execute`。 | 录制文件：`delete` 是默认工具 | [7.4](#s-deep-agents-0-7) | 未检查 |
| D101 | 安装页面和发布政策写的是 Python 3.10，而该政策只在大版本中调整下限。`langchain` 1.5.0 需要 3.11。 | 包元数据：Python 3.11 或更高版本 | [3.1](#s-install-and-the-package-map), [8.5](#s-migration-from-0-x-and-stale-advice) | 在文档 `04d4d4a` 处未解决 |
| D102 | 一个批量模式的示例把调用编辑成了新的工具名。逐调用模式的文本和 1.4.6 的更新日志说，编辑会保留原工具。 | 实验记录：批量模式允许这种切换，逐调用模式拒绝 | [6.5](#s-human-in-the-loop-batched-and-per-call) | 未解决 |
| D104 | agents 页面说 `messages` 只追加。记忆页面用 `RemoveMessage` 删除消息。 | `add_messages` 的代码：追加、按 id 替换和删除 | [6.1](#s-stategraph-state-and-reducers) | 未解决 |
| D105 | graph API 页面给出 10,007，旧版本是 10,000。服务器文档给出 10011。旧的建议是 25。 | 代码和运行结果：图是 10007，`create_agent` 是 9999，`langgraph dev` 下是 10007 | [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit), [8.1](#s-agent-server-langgraph-dev-up-and-deploy), [R.5](#s-ref-environment-variables) | 未解决 |
| D106 | store 页面把 `InMemoryStore` 链接到 `langchain_core.stores` 中的一个类，而它的代码导入的是 `langgraph.store.memory`。 | 代码：从 `langgraph.store.memory` 导入 | [5.4](#s-stores-and-long-term-memory), [R.4](#s-ref-checkpointer-and-store-api) | 未解决 |
| D107 | 两个 v1 发布页面都把 `create_react_agent` 链接到 `langchain-classic` 中同名的函数。 | 代码：有两个函数同名 | [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D108 | 一个 LangSmith FAQ 表格把 checkpointer 称为社区代码，把流式输出称为基础功能。 | 当前的页面和代码 | [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D109 | Deep Agents 概览把规划列为默认功能。0.7.0 的更新日志把它改成了需主动启用。 | 更新日志和录制文件：添加 `TodoListMiddleware` | [7.4](#s-deep-agents-0-7), [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D111 | 产品页面说追踪从不影响你的应用。追踪文档说 `LANGCHAIN_CALLBACKS_BACKGROUND=false` 会让回调等待。锁定版本下没有代码读取这个变量。 | 实验记录和代码：在 Qwen3 4B 上对托管 API 每次 agent 运行约增加 6 毫秒，该变量在锁定版本下没有效果 | [7.6](#s-langsmith-tracing) | 在文档 `04d4d4a` 处未解决 |
| D113 | prompt hub页面通过 `langchain_classic` 讲解prompt hub。 | 同一页面推荐的 LangSmith 客户端方法 | [7.7](#s-evaluation-with-langsmith), [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D114 | 一个追踪页面以 LCEL 链开头。 | 追踪 `create_agent` 的 agent | [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D116 | 本地服务器页面打印的是旧名称 LangGraph Studio。 | 当前名称：LangSmith Studio 和 Agent Server | [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D117 | v1 发布页面有一份固定的、支持内容块的提供方列表，且没有 `langchain.mcp`。 | 更新日志和当前页面 | [8.5](#s-migration-from-0-x-and-stale-advice) | 未解决 |
| D118 | checkpointer 页面说，运行之前必须先创建线程。这条规则属于 Agent Server。 | 代码：第一个检查点就会创建线程 | [5.2](#s-checkpointers-and-threads) | 未解决 |
| D119 | checkpointer 页面没有写出默认的持久性。Agent Server 页面写的是 `async`。 | 代码：`async` | [5.3](#s-durability-modes-and-a-crash-between-two-steps) | 未解决 |
| D121 | 结构化输出页面说，模型不支持结构化输出时 agent 会使用工具调用，对 `ProviderStrategy` 也一样。 | 代码：显式指定的策略保持不变 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) | 未解决 |
| D123 | `langgraph dev` 的帮助文本给出每个 worker 10 个任务。代码使用 1。文档给出 Python 为 1，JS 为 10。 | 代码和运行结果：1 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) | 未解决 |
| D124 | 流式输出页面说 `tasks` 模式需要 checkpointer。录制工具包在没有 checkpointer 时也从 `tasks` 和 `debug` 得到了块。 | 录制文件 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) | 未检查 |
| D130 | 内置中间件页面列出 22 个类。`langchain` 有 19 个，另外三个来自 `deepagents`。 | 代码：`langchain` 中有 19 个 | [4.6](#s-the-built-in-middleware) | 未解决 |
| D131 | backends 页面说 `virtual_mode` 默认为 `False`。代码把它设为 `True`。 | 代码和运行结果：没有传 `virtual_mode` 构建的后端，与 `virtual_mode=True` 得到相同的 28 个结果 | [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) | 未检查 |
| D132 | permissions 页面说，放在最前面的 `/workspace/**` 允许规则会匹配 `.env`，所以后面的拒绝规则永远不会触发。 | 运行结果：`/workspace/**` 不匹配以点开头的名称，所以两种顺序都拒绝了 `/workspace/.env`，也都放行了 `/.env` | [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) | 未检查 |
| D133 | permissions 示例“Deny all access”“Read-only”和“Isolate to a workspace directory”使用 `/**`。 | 运行结果：`/**` 会跳过以点开头的名称，所以 `.env`、`.git` 和 `.bashrc` 仍然可读或可写，而且隔离列表还会拒绝对 `/workspace` 执行 `ls` | [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) | 未检查 |
| D134 | backends 页面提到一个读取 `assistant_id` 的旧默认值，并说从 v0.5.0 起命名空间是必需的。 | 代码和运行结果：在 0.7.38 中命名空间是必需的，`StoreBackend(store=s)` 抛出了 `TypeError` | [5.4](#s-stores-and-long-term-memory) | 未检查 |
| D135 | 组合后端示例传入 `namespace=lambda _rt: ("memories",)`。 | 运行结果：这个工厂对每个用户都是同一个命名空间，所以要用用户 id 来构造 | [5.4](#s-stores-and-long-term-memory), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) | 未检查 |
| D136 | backends 页面允许命名空间标签里有句点，并建议把用户身份作为标签。store 会以 `InvalidNamespaceError` 拒绝句点。 | 运行结果：把电子邮件地址当作标签会在写入时失败，所以要把它映射成不含句点的标签 | [5.4](#s-stores-and-long-term-memory) | 未检查 |
| D137 | Deep Agents 的模型页面给 `openai:gpt-5.4` 的总分是 0.18，给 `anthropic:claude-opus-4-6` 的是 0.26。 | 页面本身：每个总分都等于它那一行的工具使用分，而文件操作、检索和摘要的单元格是 0.92 到 1.00，并且每一行混合了来自 3 次 CI 运行的单元格 | [1.2](#s-do-you-need-langchain) | 无上游条目 |
| D209 | 用户报告，在 Bedrock 和 Ollama 上显式使用 `ProviderStrategy` 会报错，而不会切换到工具调用。文档说它会切换。 | 代码和实验记录：不会切换 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) | issue langchain #35119 |
| D211 | 一个网页说 LangGraph 的流式输出会让首个 token 增加 100 到 300 毫秒，没有给出方法。 | 实验记录：在 Qwen3 4B 上中位数低于 3.5 毫秒 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) | 无上游条目 |

编号并不连续。研究中给每一类来源保留了一段编号：D1 到 D17 是代码，D101 到 D137 是文档，D201 到 D211 是帖子和 issue。本登记包含各章节引用过的每一个编号。

来源：front.md；manual.json（pin、sources）；sections/ 下每个文件的“来源”行和引用； capture/README.md, capture/lab/README.md.
