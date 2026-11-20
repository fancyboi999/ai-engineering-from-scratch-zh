# LangChain、LangGraph、LangSmith 与 Deep Agents

> LangChain 构建 agent，LangGraph 把它作为带检查点的图来运行，LangSmith 负责记录，Deep Agents 再加上一层 harness，它们各在自己带版本号的包里。

你想搜索怎么用 LangChain 构建 agent，结果找到四个产品名、三条安装命令，以及跨越四年的代码。一个答案导入 `AgentExecutor`，另一个导入 `create_react_agent`，第三个导入 `create_deep_agent`。这三个名字在锁定版本上都还在。只有 `create_react_agent` 已被弃用，而 `AgentExecutor` 留在 `langchain-classic` 里 {{code libs/langchain/langchain_classic/agents/agent.py}}。

读完本节，你能说出这四个项目各做什么、各在哪个包里。你还能把每项核心宣称与我们的运行结果并排对照，并找到证明它的小节。

## 四个项目，四套版本号 {#s-langchain-langgraph-langsmith-and-deep-agents-four-projects-four-version-numbers}

文档用四行话描述这套技术栈，每个项目一行 {{docs oss/python/langgraph/overview}}：

- Deep Agents 是一个 harness，在 LangGraph 之上增加规划、子 agent、文件工具和上下文管理。
- LangChain 是框架，提供模型、工具和 agent 循环的接口与集成。
- LangGraph 是运行时，提供持久执行、流式输出、人工审核和持久化。
- LangSmith 是面向追踪、评估、提示词和部署的平台，适用于任何框架。

**LangChain：** agent 框架，位于 `langchain` 和 `langchain-core` 两个包里。`langchain` 里有 `create_agent`、中间件和 `init_chat_model`。`langchain-core` 里有消息、工具、基础聊天模型和假模型。

**LangGraph：** 把 agent 作为节点图来运行的运行时，位于 `langgraph` 包里。它包含 `StateGraph`、运行它的循环、检查点、中断和流式输出。

**LangSmith：** 面向追踪、评估、提示词和部署的托管平台，以及它的客户端包 `langsmith`。Agent Server，即在 HTTP API 之后运行图的服务器，属于 LangSmith。

**Deep Agents：** 构建在 `create_agent` 之上的 harness，位于 `deepagents` 包里。它给 agent 增加文件工具、子 agent 和摘要。

这四组包不共用版本号。在锁定版本上，`langchain` 是 1.5.0，`langchain-core` 是 1.8.0，`langgraph` 是 1.2.22，`deepagents` 是 0.7.38，`langsmith` 是 0.14.17。只说“LangChain 1.5”而不写包名，就有歧义，因为按 PyPI 上的发布历史，`langchain-core` 在更早之前也发过自己的 1.5.0。[图](#fig-1-1)展示每一层在哪个包里。

```figure
id: fig-1-1
kind: layers
title: 锁定版本上的四个项目及其包
claim: create_agent 产出的 agent 就是一张 LangGraph 图，所以每个 LangChain agent 都依赖 LangGraph，而 LangSmith 位于这套技术栈的旁边。
caption: 每个色带是一个项目，标出它在锁定版本上的包和版本。自上而下阅读：每一层导入它下面的那一层。LangSmith 在侧边，因为 langchain-core 会导入它的客户端，而追踪在你打开之前保持关闭。带编号的箭头沿着各层跟踪一次调用。来源：capture/out/00-versions.txt、capture/out/05-agent-graph.txt 和 capture/out/42-langsmith.txt。
```

在编译好的 agent 里能看到这些层次。`create_agent` 返回 `langgraph.graph.state` 里的一个 `CompiledStateGraph`，带 `model` 和 `tools` 两个节点：

```listing
title: agent 的类型与节点
source: capture/out/05-agent-graph.txt
lang: text
note: 截取节点列表和类型行。边、Mermaid 文本和配置都被截掉了。
---
[
  "__start__",
  "model",
  "tools",
  "__end__"
]
…
type langgraph.graph.state.CompiledStateGraph
```

`langsmith` 是 `langchain-core` 的依赖，所以每个 agent 都会装上它 {{code libs/core/pyproject.toml}}。在某个环境变量打开追踪之前，agent 什么都不会发送 {{code langsmith/utils.py}}。`langsmith` 里有两部分不需要那个变量也会发送：`evaluate` 和 pytest 插件，[第 7.7 节](#s-evaluation-with-langsmith)会展示。录制工具包设置了 `LANGSMITH_TRACING=false`，LangSmith 的运行树只在内存里构建。

## 这套技术栈统一了什么 {#s-langchain-langgraph-langsmith-and-deep-agents-what-the-stack-standardizes}

LangChain 给了你五样名称和形态固定的东西。

- **一种消息格式。** `SystemMessage`、`HumanMessage`、`AIMessage` 和 `ToolMessage`，跨模型提供方使用标准内容块。[第 3.3 节](#s-messages-and-content-blocks)展示它们。
- **一种工具接口。** 带类型提示的函数变成带 JSON schema 的工具。[第 3.4 节](#s-tools-toolruntime-and-tool-errors)展示模型看到的 schema。
- **一种 agent 循环。** `create_agent` 构建一张图：调用模型，运行模型要求的工具，在模型不再要求工具时停止。[第 1.3 节](#s-one-create-agent-run)跟踪一次运行。
- **一种检查点接口。** checkpointer 在每一步之后保存图的状态，可存在内存、SQLite 或 Postgres 里。
- **一套流模式。** `updates`、`values`、`messages`、`custom` 和另外四种，命名了流在每一步产出什么。

## 它留给你的工作 {#s-langchain-langgraph-langsmith-and-deep-agents-what-it-leaves-to-you}

### 模型及其包 {#s-langchain-langgraph-langsmith-and-deep-agents-the-model-and-its-package}

LangChain 自己不调用任何模型。你要安装一个模型提供方的包，例如 `langchain-openai` 或 `langchain-ollama`，然后传入一个模型或一个模型字符串。每个提供方的包都有自己的版本和自己的重试默认值。[第 3.2 节](#s-init-chat-model-and-model-profiles)数了其中一个包的重试次数。

### 持久化 {#s-langchain-langgraph-langsmith-and-deep-agents-persistence}

除非你传入 checkpointer，否则 agent 不保存对话。v1 的发布说明称，对话会通过内置检查点自动跨会话保留 {{docs oss/python/releases/langchain-v1}}。agents 页面则说，线程只有在有 checkpointer 时才保留历史，在本地运行时要由你自己传入 {{docs oss/python/langchain/agents}}。代码与 agents 页面一致：`create_agent` 的 `checkpointer` 参数默认为 `None` {{code langchain/agents/factory.py}}。在 Agent Server 上，由服务器提供 checkpointer。

### 运行两次的副作用 {#s-langchain-langgraph-langsmith-and-deep-agents-side-effects-that-run-twice}

checkpointer 让一次运行可以恢复，但不会让一次工具调用只发生一次。崩溃之前已经运行过的工具，在恢复时可能再运行一次，必须由工具自己让这件事变得安全。

**我们测得**这一点，在 Mac 上用一个三节点的图，其中间节点往文件里追加一行。我们在五个时间点设置终止，覆盖三种持久性模式和两种 saver，每个单元格五次。150 次试验里有 10 次，终止点根本没有到来。150 次里有 80 次，这一行被写了两遍。节点里带幂等键时，150 次里被写两遍的是 0 次。

**我们测得**同样的五个点，在 x86 服务器客户机上，对一个用 Qwen3 4B 的 `create_agent` agent，其工具往 PostgreSQL 插入一条扣款记录。没有键时，560 次被杀的试验里有 331 次对订单重复扣款。用线程和订单 id 作键时，140 次里是 0 次。[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)展示每个单元格，[第 2.3 节](#s-the-checkpoint-write-path-and-durability)展示代码路径。

### 重试 {#s-langchain-langgraph-langsmith-and-deep-agents-retries}

有两层会重试失败的模型调用：模型提供方包里的客户端，和 `ModelRetryMiddleware`。它们会相乘。[第 3.2 节](#s-init-chat-model-and-model-profiles)展示了两层都用默认值时，一次模型调用经过 Ollama 前面的中继，共有 9 次尝试。没有中间件时，`ChatOllama` 只尝试 1 次。

### 服务器 {#s-langchain-langgraph-langsmith-and-deep-agents-the-server}

Agent Server 在 HTTP API 之后运行图，带任务队列，属于 LangSmith。`langgraph dev` 在你的机器上把它跑在内存里，不需要密钥。`langgraph up` 下带 Postgres 和 Redis 的完整技术栈，在我们这里没有 LangSmith API 密钥或许可证密钥就拒绝启动：

```listing
title: langgraph up 下的 API 容器，没有密钥
source: capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt
lang: text
note: 错误的前两行。
---
ValueError: License verification failed. Please ensure proper configuration:
- For local development, set a valid LANGSMITH_API_KEY for an account with LangGraph Cloud access in the environment defined in your langgraph.json file.
```

## 项目怎么说，我们测得什么 {#s-langchain-langgraph-langsmith-and-deep-agents-what-the-project-says-and-what-we-measured}

项目在文档和产品页上做出一些简短的陈述，其中多数不带条件。下表把每条陈述与我们的结果并排放置。

**我们测得**这张表里的每个结果，在 Mac 或 x86 服务器客户机上，或用录制工具包记录。每一行都写明它的机器和次数。两台机器不同，所以不要拿一行的数字去比另一行的数字。

| 项目的说法 | 我们的结果 | 小节 |
|---|---|---|
| LangChain v1 是面向 agent 的专注基础，可用于生产 {{docs oss/python/releases/langchain-v1}} | 我们测试的是行为，不是这句话。它自己发布策略里有一条没有成立：次要版本 `langchain` 1.5.0 把 Python 下限提高到了 3.11。 | [3.1](#s-install-and-the-package-map) |
| 聊天模型遇到网络错误、429 和 5xx 时，失败的调用最多重试 6 次 {{docs oss/python/langchain/models}} | 在锁定版本上，`langchain-openai` 1.8.0 的 `ChatOpenAI` 不是这样：经过 Ollama 前面的中继是 3 次尝试，然后报错。`ChatOllama`：1 次。x86 服务器客户机上，连接被断开、端口被拒绝和超时各 3 次运行。 | [3.2](#s-init-chat-model-and-model-profiles) |
| `ModelRetryMiddleware` 用默认值总共尝试 3 次 {{docs oss/python/langchain/middleware/built-in}} | 得到确认：关掉客户端重试时是 3 次尝试。保留客户端默认值时，两层共尝试了 9 次。x86 服务器客户机，各 3 次运行。 | [3.2](#s-init-chat-model-and-model-profiles) |
| 从 `langgraph` 1.1.4 起，默认递归上限是 10,007 步 {{docs oss/python/langgraph/graph-api}} | 对 `StateGraph` 得到确认：工具包在 10007 停下。`create_agent` 设置了它自己的上限 9999。一个 Qwen3 4B agent 做了 121 次模型调用都没有停，直到脚本在 1200 秒时把它停掉，x86 服务器客户机上一次运行。 | [1.3](#s-one-create-agent-run) |
| Agent Server 的默认递归上限是 `10011` {{docs langsmith/env-var-cloud}} | 没有看到。在 `langgraph dev` 下，一个循环的图在 10007 步停下，x86 服务器客户机上一次运行。 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| 对话会自动跨会话保留 {{docs oss/python/releases/langchain-v1}} | 只有在你传入 checkpointer 时才会。`create_agent` 的默认是没有 checkpointer，agents 页面也这么说。 | [1.3](#s-one-create-agent-run) |
| 用 `durability="sync"` 时，LangGraph 在运行继续之前写入每个检查点 {{docs oss/python/langgraph/checkpointers}} | 只在步骤边界成立。没有键时，在工具步骤之后终止，40 次 agent 试验里有 0 次重复扣款。在工具已返回、但它的写入还没保存之前终止，40 次里有 24 次重复。Qwen3 4B，x86 服务器客户机。 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 用 `durability="async"` 时，崩溃有小概率丢失检查点 {{docs oss/python/langgraph/checkpointers}} | 得到确认。没有键时，在工具步骤之后终止，40 次 agent 试验里有 38 次重复扣款。Qwen3 4B，x86 服务器客户机。 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| 恢复时，调用过 `interrupt()` 的节点从它的第一行开始重新运行 {{docs oss/python/langgraph/interrupts}} | 在工具包里得到确认：`interrupt()` 之前的代码运行了两次。 | [6.4](#s-interrupt-and-resume) |
| 重放会重新运行节点，而不是从缓存读取 {{docs oss/python/langgraph/use-time-travel}} | 在工具包里得到确认：从工具之前的检查点重放，把工具又运行了一次。 | [6.6](#s-time-travel-replay-update-state-and-forks) |
| 结构化输出来自主循环，不需要额外的模型调用 {{docs oss/python/releases/langchain-v1}} | 在 Claude 上成立，在 agent 带工具时的 Ollama 上不成立。在 Qwen3 4B 加查询工具上，`ToolStrategy` 在 39 个任务里有 39 个没有返回对象，`ProviderStrategy` 在 10 次里有 10 次抛出异常。多加一次提取调用，在两家提供方上都管用。Mac 和 Anthropic API。 | [4.3](#s-structured-output-which-strategy-on-which-provider) |
| 队列 worker 同时最多运行 `N_JOBS_PER_WORKER` 个运行，默认是 10 {{docs langsmith/agent-server-scale}} | 在 `langgraph dev` 下不是，它的默认是 1。20 个各 2 秒的后台运行，一次跑 1 个用了 41.0 秒，设置为 10 时用了 5.1 秒。用 CPU 上的 Qwen3 4B，10 个后台 agent 运行，1 个作业时用了 47.1 秒，10 个作业时用了 44.4 秒，因为模型一次只服务一个调用。x86 服务器客户机，各一次运行。 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| Agent Server 的 Postgres 任务队列让每个任务恰好运行一次 {{docs langsmith/deploy-standalone-server}} | 留到下一版。完整服务器需要许可证密钥。我们只对库本身做的运行没有显示出恰好一次的副作用：150 次试验里有 80 次写了两遍，其中 10 次根本没有被杀。 | [8.8](#s-limits-at-the-pin-and-what-comes-in-the-next-edition) |
| 两种部署类型下，Agent Server 都能从短暂的 Redis 或 Postgres 故障中恢复 {{docs langsmith/cloud-platform-features}} | 留到下一版，原因相同。 | [8.8](#s-limits-at-the-pin-and-what-comes-in-the-next-edition) |
| 在被中断的 worker 上的运行，会从它的最后一个检查点恢复 {{docs langsmith/agent-server}} | 留到下一版，原因相同。 | [8.8](#s-limits-at-the-pin-and-what-comes-in-the-next-edition) |
| Redis 不保存用户数据或运行数据 {{docs langsmith/agent-server}} | 留到下一版，原因相同。 | [8.8](#s-limits-at-the-pin-and-what-comes-in-the-next-edition) |
| LangChain 产品页称，LangChain 运行在带内置持久化和检查点的持久运行时之上 {{site langchain.com/langchain}} | 只有在你传入 checkpointer 时才是内置的，见上。 | [1.3](#s-one-create-agent-run) |

五条陈述与我们的运行完全一致。四条只在页面没有写明的条件下成立：你传入的 checkpointer、崩溃的时间点或模型提供方。四条在锁定版本上与我们的结果不符，分别是重试次数、服务器递归上限、作业数默认值和发布策略里的 Python 规则。另有四条需要完整的 Agent Server，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)把它们和下一版计划的运行一起列出。

其中三个结果会改变你构建的方式。数一数你自己的模型提供方包的重试次数。让每个副作用都能安全地重复执行。在你自己的提供方上，绑定工具后测试结构化输出。

## 什么时候它是错误的工具 {#s-langchain-langgraph-langsmith-and-deep-agents-when-this-is-the-wrong-tool}

LangChain 适合在循环里调用工具、并且需要暂停、流式输出或恢复的 agent。它会在每次模型调用上花一点 Python 时间，也占用磁盘空间。

**我们测得**这两项，在 Mac 上。在一次真实的 Qwen3 4B 运行里，三次模型调用，`create_agent` 在 1.8 秒的运行上增加了 15.6 毫秒。折合每次调用约 5 毫秒，来自 40 次打乱顺序的运行。全新安装 `langchain` 加 `langchain-openai` 有 44 个包，共 54,312 KiB，而单独 `openai` 有 14 个包，共 26,356 KiB。[第 3.1 节](#s-install-and-the-package-map)有安装和导入耗时。

如果你的程序只做一次不带工具、不带状态的模型调用，单用模型提供方的 SDK 就能用更少的代码完成同样的事。

```takeaways
- 写下的每个版本都要带上包名，因为这四个项目各自给包编号。
- 需要对话撑过一轮时，传入 checkpointer。
- 让每个带副作用的工具都能安全地运行两次。
- 设置超时之前，先数清你模型的重试层数。
- 依赖表里的任何宣称之前，先在你自己的提供方上核对一遍。
```

来源：docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/overview, oss/python/releases/langchain-v1, oss/python/langchain/agents, oss/python/langchain/models, oss/python/langchain/middleware/built-in, oss/python/langgraph/graph-api, oss/python/langgraph/checkpointers, oss/python/langgraph/interrupts, oss/python/langgraph/use-time-travel, langsmith/env-var-cloud, langsmith/agent-server-scale, langsmith/deploy-standalone-server, langsmith/cloud-platform-features, langsmith/agent-server); capture/out/00-versions.txt, capture/out/05-agent-graph.txt, capture/out/07-structured-output.txt, capture/out/30-state-history-forks.txt, capture/out/32-interrupt-resume.txt, capture/out/38-recursion-limit.txt, capture/out/42-langsmith.txt; capture/lab/summary/crash-resume-mac.json, capture/lab/summary/retries-x86.json, capture/lab/summary/recursion-mac.json, capture/lab/summary/recursion-x86.json, capture/lab/summary/overhead-mac-real.json, capture/lab/summary/agent-server-x86.json, capture/lab/summary/agent-server-x86-real.json, capture/lab/summary/install-size-mac.json, capture/lab/T15-agent-server-x86/10-up-license-excerpt.txt, capture/lab/summary/crash-resume-x86.json, capture/lab/T02-crash-resume-x86/10-summary.txt, capture/lab/bench/summary-mac.json, capture/lab/bench/runs/structured.jsonl; libs/langchain_v1/langchain/agents/factory.py, libs/core/pyproject.toml, libs/langchain/langchain_classic/agents/agent.py at langchain==1.5.0; libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py at langgraph 1.2.22; src/langsmith/utils.py at langsmith v0.14.17; the product page www.langchain.com/langchain, read 2026-11-14.
