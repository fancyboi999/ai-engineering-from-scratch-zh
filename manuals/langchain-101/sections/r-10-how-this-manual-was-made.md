# 本手册是怎么做的

> 本页记录锁定版本、两台机器、实验方法、每个实验及其机器和数量，以及实验目录里有什么。

## 锁定版本 {#s-ref-how-this-manual-was-made-the-pin}

本手册锁定 `langchain` 1.5.0，它于 2026-11-11 发布，提交为 `c2f4036e`。同一个锁定版本还包括 `langchain-core` 1.8.0、`langgraph` 1.2.22、`deepagents` 0.7.38 和 `langsmith` 0.14.17。每个包的提交见[来源与冲突](#s-ref-sources-and-conflicts)。我们在 2026-11-14 读完了代码和文档，并核对了每个事实。

这套技术栈的各个包迭代很快，版本号也不统一。本手册里的每个陈述都只针对锁定版本。较旧的代码和页面有哪些不同，见[第 8.5 节](#s-migration-from-0-x-and-stale-advice)。

## 四类证据 {#s-ref-how-this-manual-was-made-four-kinds-of-evidence}

每个事实都带有四种标签之一，[来源与冲突](#s-ref-sources-and-conflicts)给这四种标签排了序。

**代码：** 在标签处的源代码里读到的类、默认值或错误文本。如果我们同时运行过它，段落里会说明。

**录制（capture）：** 来自录制工具包的 listing，工具包驱动的是真实的技术栈。录制需要模型时，模型是 x86 服务器客户机上 Ollama 里的 Qwen3 4B Instruct。文件里写明模型、它的设置、机器和日期。

**我们测得：** 来自我们某次实验运行的数字。段落里写明机器和运行次数。

**文档：** 来自提交 `04d4d4a` 处文档的说法。我们用它来说明这一版没有运行过的路径，正文会写明这一点。

## 两台机器 {#s-ref-how-this-manual-was-made-the-two-machines}

| 手册中的名称 | 机器 | 软件 |
|---|---|---|
| Mac | 一台 10 核、64 GiB 的 Apple M1 Max 笔记本，同时还在运行其他工作 | macOS 26.2, Python 3.13.12, Ollama 0.31.1, PostgreSQL 14.21 |
| x86 服务器客户机 | 共享服务器（AMD EPYC 7452）上的一台 KVM 客户机，32 vCPU、48 GiB。它的磁盘放在服务器的内存里 | Ubuntu 24.04、Python 3.13.18、PostgreSQL 16.15、Redis 7.0.15、Docker 29.1.3、Ollama 0.31.1（CPU 运行） |

两台机器不同，所以没有任何一节把一台机器的数字与另一台的数字并排比较。Mac 上的每个耗时都只是该机器的上限，因为每次计时运行期间它上面都在做其他工作。客户机的磁盘在内存里，所以它的写入耗时只是真实磁盘的下限。

## 实验方法 {#s-ref-how-this-manual-was-made-the-lab-method}

- **实验里的真实模型。** 本地模型是 Ollama 上的 Qwen3 0.6B、1.7B、4B、8B、14B 和 30B-A3B，以及 gpt-oss 20B，嵌入用 `nomic-embed-text`。x86 服务器客户机上的 Qwen3 4B 运行了故障演练、运行时追踪和 T02 的 agent 矩阵，还运行了 T05、T07、T08、T11、T17、T18 和 T19，以及 T10、T15 和 T16 的重跑。实验里其余的模型运行都在 Mac 上。录制工具包与实验分开，它在 x86 服务器客户机上录制。
- **客户机上的上下文。** T10、T15 和 T16 的重跑把上下文设为 8192 个 token。客户机上的其他运行都没有设置，所以 Ollama 用了它的默认上下文。T02 期间，`ollama ps` 显示的是 4096。这些运行的提示词都很短。
- **有预算限制的托管模型。** Claude Haiku 5.5（`claude-haiku-5-5`）和 Claude Sonnet 5.5（`claude-sonnet-5-5`）在测试基准里通过 Mac 访问 Anthropic API 运行。一份共享账本记录每次调用及其成本，并在达到固定上限时停止运行。测试基准用 2,589 次调用花了 $0.93。Haiku 运行了完整套件，Sonnet 运行了 30 个任务的子集。设置见[测试基准方法](#s-ref-the-bench-method)。Haiku 还把[第 9.6 节](#s-evals-that-check-state)的 20 项评估运行了一次，用 64 次调用花了 $0.011353，有单独的账本。它还运行了 T22 的 60 次文件规则攻击，用 134 次调用花了 $0.02136，账本行在 `T22-sec-fs-permissions-mac/` 里。
- **只测技术栈本身的替身。** 客户机上的 T03、T10、T15 和 T16 使用了延迟固定或无延迟的模型替身。这些耗时只包含技术栈和数据库的成本。T10、T15 和 T16 随后又用 Qwen3 4B 重跑，第 5.2、5.5 和 8.1 节只展示这些重跑的行。T03 保留它的替身，因为它测的是不带模型的检查点写入。
- **本地的记录器、代理和中继。** 一个位于 `127.0.0.1` 的记录器代替了 LangSmith 端点。在流式运行中，Ollama 前面的代理给转发的每一行打上时间戳，这样实验可以在同一个时钟上给每个 token 计时。在重试运行中，Ollama 前面的中继会丢弃或扣住每个连接。
- **每一步一个新进程。** 崩溃、审批和助手的运行把每一步都放在新的 Python 进程里启动，所以每次恢复都是一次重启。
- **不计入预热运行。** 文件会标出预热的行，汇总里把它们去掉了。原始文件仍保留它们。
- **一个 LangSmith 账户，没有许可证。** T21 在 Mac 上使用一个免费计划的新 LangSmith 账户，访问托管 API。保留的文件把其中的 id 换成了标签。我们没有使用 Agent Server 许可证。因此没覆盖哪些内容，见[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)。
- **样本很小。** 许多案例只运行了一次或三次。每个段落都给出它的次数，单次运行的结果只是一个例子，不是一个比率。

## 实验 {#s-ref-how-this-manual-was-made-the-experiments}

| 目录 | 机器 | 问题 | 样本量 | 主要结果 | 章节 |
|---|---|---|---|---|---|
| T01 | Mac | `create_agent` 比普通的 `openai` 循环多花多少成本？ | 对 Qwen3 4B 上的 8 个程序各做 40 次打乱顺序的运行，每种导入方式 10 次 | 模型之外耗时的中位数是 37.6 毫秒，对照组是 25.1 毫秒，每个请求的 token 相同 | [3.1](#s-install-and-the-package-map), [4.1](#s-create-agent-and-the-graph-it-builds), [8.3](#s-cost-the-framework-against-a-plain-sdk-loop) |
| T02 | Mac | 崩溃并恢复之后，副作用会运行两次吗？ | 在五个终止点上共 450 次试验，其中 30 次从未被杀 | 图试验中 150 次里有 80 次运行了两次，使用幂等键时 150 次里为 0 次。它的 agent 行使用了脚本化模型，T02 x86 替换了这些行 | [5.3](#s-durability-modes-and-a-crash-between-two-steps) |
| T02 x86 | x86 服务器客户机 | 崩溃之后，agent 里带真实模型时，扣款会运行两次吗？ | 在 Qwen3 4B 上共 1,290 次试验：无键和使用 `tool_call_id` 键的每个单元格 20 次，使用订单键的每个单元格 5 次 | 560 次被杀的无键试验中有 331 次运行了两次，使用 `tool_call_id` 时为 560 次中的 120 次且全部在 `exit` 模式，使用订单键时为 140 次中的 0 次 | [5.3](#s-durability-modes-and-a-crash-between-two-steps), [2.3](#s-the-checkpoint-write-path-and-durability) |
| T03 | x86 服务器客户机 | 线程变长时，检查点的成本是多少？ | 10 到 1,000 步的运行 3 次，5,000 步的运行 1 次 | 1,000 步时，一个普通的 Postgres 线程占 292.58 MB | [5.5](#s-context-engineering-and-summarization) |
| T04 | Mac | 每种流 API 交付一个 token 有多快？ | 在 Qwen3 4B 上，每种 API 对文本回复和工具调用各运行 24 次；在带推理的 Qwen3 8B 上，每种循环运行 5 次 | 九种 API 中有八种的文本回复首 token 延迟中位数为 1.28 到 3.46 毫秒 | [5.1](#s-streaming-v1-v2-stream-events-v3-and-the-tools-mode) |
| T05 | x86 服务器客户机 | 各个重试层一共会尝试多少次？ | 每个单元格运行 3 次，Qwen3 4B | 在 `ChatOpenAI` 上两层都开启时是 9 次，只用 `ChatOllama` 时是 1 次，超时的工具写入了 3 行账本记录 | [3.2](#s-init-chat-model-and-model-profiles), [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| T06 | Mac | 每种结构化输出策略的失败频率是多少？ | 在四个 Qwen3 模型上共 600 次运行，在五个 Ollama 模型上共 75 次策略运行 | `ToolStrategy` 在每个模型上的失败率为 15% 到 45%，Ollama 上没有任何聊天模型拒绝 `ProviderStrategy` | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy) |
| T07 | x86 服务器客户机 | 每个审核决定之后会运行哪个工具？ | 用 Qwen3 4B 跑 25 个模型案例，每个 3 次。G1 和 G2 不用模型，在 Mac 上运行 | 批量模式可以切换工具并跳过审核，逐调用模式两者都拒绝 | [6.4](#s-interrupt-and-resume), [6.5](#s-human-in-the-loop-batched-and-per-call) |
| T08 | x86 服务器客户机 | 并行的工具调用会同时运行吗？ | 100 个 `ToolNode` 单元格各运行 5 次，12 个 agent 单元格各运行 3 次，Qwen3 4B | 16 个各 200 毫秒的同步调用在不设上限时耗时 264 毫秒，`ToolNode` 在 `ainvoke` 下忽略了 `max_concurrency` | [3.4](#s-tools-toolruntime-and-tool-errors), [4.1](#s-create-agent-and-the-graph-it-builds) |
| T09 | Mac | 每种 harness 发送多少提示词 token？ | 在 Qwen3 8B 上运行 27 次，9 种请求变体各计数 3 次 | 按同一个分词器计算，默认 deep agent 的提示词和工具 schema 在 0.7.38 中比 0.6.12 小 57.6% | [7.4](#s-deep-agents-0-7) |
| T10 | x86 服务器客户机 | 在真实模型上，长线程有摘要和没有摘要时分别会怎样？ | 每种变体运行 1 次，共四种变体，200 轮，Qwen3 4B | 没有摘要时，每轮耗时的中位数从 4.7 秒增长到 11.2 秒，直到第 88 轮上下文被填满，之后每轮要 5 到 10 分钟，并丢失了早先的事实。一次摘要调用的耗时中位数为 44 到 85 秒，三种触发方式中有两种丢失了事实 | [5.5](#s-context-engineering-and-summarization) |
| T11 | x86 服务器客户机 | 每个中间件钩子的成本是多少？ | 每个单元格计时运行 20 次，Qwen3 4B | 占一次运行的 0.2% 到 0.5%，一次节点钩子调用的成本约为一次包装钩子调用的 4 倍 | [8.3](#s-cost-the-framework-against-a-plain-sdk-loop) |
| T12 | Mac | 每种 MCP 故障会对运行造成什么影响？ | 每个案例运行 1 次，每种传输计时调用 50 次 | 工具错误变成了一条错误的 `ToolMessage`，服务器崩溃则结束了运行 | [7.3](#s-mcp-with-langchain-mcp) |
| T13 | Mac | 序列化器会重建什么，加载器又接受什么？ | 29 个值，以及 36 个加载器案例（26 个使用默认设置、10 个使用严格模式），各运行 1 次 | 20 个值往返成功，5 个案例构造出了实验用的类 | [5.6](#s-serialization-of-state-and-what-does-not-round-trip), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| T14 | Mac | 命名空间能否让 store 的各个用户互不相干？ | 三种 store 上共 8 个用户，每个查询运行 1 次 | 24 次搜索全部只停留在同一个用户之内 | [5.4](#s-stores-and-long-term-memory), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| T15 | x86 服务器客户机 | `langgraph dev` 和 `langgraph up` 做了什么？ | 用不含模型的图每种设置运行 1 次，另有 104 次负载运行、40 次基线运行和 4 次递归运行，使用 Qwen3 4B | 默认每个 worker 1 个任务，每次运行增加 0.6 到 1 秒，1 个或 10 个任务时都是每秒 0.22 次运行 | [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| T16 | x86 服务器客户机 | 在真实模型下，一个 `AsyncPostgresSaver` 能服务多少线程？ | 每个单元格运行 2 次，1 到 64 个线程，Qwen3 4B | 从 4 个线程起，每个单元格都是每秒 0.42 到 0.44 次模型调用，`aput` 的 p50 低于 5 毫秒，一个连接和一个 20 连接的池给出相同的吞吐 | [5.2](#s-checkpointers-and-threads) |
| T17 | Mac 和 x86 服务器客户机 | 递归上限和重放是否如文档所述？ | 在 Mac 上每个图案例运行 1 次，在客户机上用 Qwen3 4B 每个 agent 案例运行 3 次 | 图在 10007 步时停止，agent 在上限为 25 时发出了 13 次模型调用 | [1.3](#s-one-create-agent-run), [6.6](#s-time-travel-replay-update-state-and-forks), [6.8](#s-error-handlers-node-timeouts-and-the-recursion-limit) |
| TRC | Mac | 追踪的成本是多少，端点出故障时会怎样？ | 在 Qwen3 4B 上每种条件交错运行 60 次，每种端点状态运行 50 次 | 开启追踪时模型之外耗时为 26.3 毫秒，关闭时为 17.7 毫秒；出故障的端点会让退出被拖住 10 到 17 秒 | [7.6](#s-langsmith-tracing) |
| T18 | x86 服务器客户机 | `evaluate(upload_results=False)` 在默认客户端下会发送什么？ | 每种条件 5 个进程，共五种条件，Qwen3 4B agent | 每个进程都发出一次 `GET /info`，agent 目标的 7 次运行通过三次 multipart POST 发出 | [7.7](#s-evaluation-with-langsmith) |
| T19 | x86 服务器客户机 | `langsmith` 的 pytest 插件会发送什么？ | 每种条件 3 个进程，共九种条件，Qwen3 4B agent 测试 | 开启跟踪且没有环境变量时，每次运行都联系了默认主机。跟踪和追踪都关闭时，什么都没有发出。跟踪关闭、追踪开启时，每个进程都发送了 `GET /info` 和三次 `POST /runs/multipart` | [7.7](#s-evaluation-with-langsmith) |
| T20 | Mac | 通过 `langchain.mcp`，征询输入、带结构化内容的错误和进度会怎样？ | 每个案例运行 3 次，共 27 个案例，不用模型：agent 案例使用脚本化的假聊天模型 | 回答一次问题使工具运行了 3 次，错误结果丢失了它的结构化内容。这些是服务器和适配器的行为 | [7.3](#s-mcp-with-langchain-mcp) |
| T21 | Mac，针对托管的 LangSmith API | 在真实账户上，追踪、`evaluate`、pytest 插件、prompt hub和 `langgraph dev` 会做什么？ | Qwen3 4B agent 的 30 次带追踪和 30 次不带追踪的运行、3 次本地运行、每种 `evaluate` 模式 10 个示例、8 个 pytest 进程、5 次服务器运行 | 追踪使中位数增加了 5.9 毫秒，`upload_results=False` 保存了 70 次没有根的 agent 运行 | [7.6](#s-langsmith-tracing), [7.7](#s-evaluation-with-langsmith), [8.1](#s-agent-server-langgraph-dev-up-and-deploy) |
| T22 | Mac，以及从 Mac 访问的 Anthropic API | Deep Agents 的规则列表能拦住哪些文件调用？ | 8 个规则列表和 28 次调用，每个单元格用脚本化调用方、不用模型运行 1 次；另有 20 个对抗性提示词在 3 个规则列表下，每个单元格运行 1 次，分别用 Qwen3 8B 和 Claude Haiku 5.5 | 有 22 次调用运行了，而文档里的规则列表本意是要拦住它们，全部发生在以点开头的文件上。使用识别点文件的列表后，40 次运行中没有任何一次改动磁盘或泄露密钥 | [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| T23 | Mac | 固定不变的 `StoreBackend` 命名空间，会把一个用户的记忆文件交给另一个用户吗？ | 2 个 store 上各 4 种配置，每种 10 个会话，Qwen3 8B；每个 store 上还有 1 次原始 store 探测 | 文档里的工厂在 20 个会话中有 20 次把 Alice 的代码交给了 Bob，而每个用户一个工厂时，20 次中为 0 次 | [5.4](#s-stores-and-long-term-memory), [8.4](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses) |
| B2 | Mac，以及从 Mac 访问的 Anthropic API | harness profile、评估工具或评分标准评分器，会改变 deep agent 的得分吗？ | Qwen3 4B 和 8B 上对 99 个和 30 个任务做 profile 测试，四个模型上对 39 个任务测评估工具，对 25 个任务测评分器，每个任务运行 1 次 | profile B 让 Qwen3 4B 的文件任务从 20 个中的 2 个提高到 14 个，总分仍是 99 个中的 55 个；没有模型从评估工具中获益；打分器对 12 次失败的运行给出了“满意” | [7.4](#s-deep-agents-0-7), [4.6](#s-the-built-in-middleware) |
| MA | Mac，以及从 Mac 访问的 Anthropic API | 五种多 agent 模式中，哪一种能通过套件，成本如何？ | 30 个任务，每个任务运行 1 次，使用 Haiku 和 Qwen3 14B，并在 Haiku 上用 Claude Agent SDK 对比 deep agent | Haiku 在四种模式下通过了 30 个中的 30 个，子 agent 的成本是单个 agent 的 2.9 倍；Qwen3 14B 通过了 30 个中的 15 到 22 个 | [6.7](#s-subgraphs-and-multi-agent-patterns), [1.2](#s-do-you-need-langchain) |
| `sql-agent` | Mac | SQL agent 能否回答问题，并且只在审批后才写入？ | 15 个护栏案例和 5 个问题，Qwen3 4B 和 Qwen3 8B 各运行 1 次 | 两个模型都答对了 5 个问题中的 5 个，每次被拒绝的 delete 都没有改动任何一行 | [4.9](#s-a-sql-agent-over-a-local-sqlite-database) |
| `retrieval-agent` | Mac | 检索 agent 会引用它的来源吗？ | 5 个问题，每个模型运行 1 次 | [第 7.2 节](#s-a-retrieval-agent-over-a-local-corpus)给出每个回答 | [7.2](#s-a-retrieval-agent-over-a-local-corpus) |
| `assistant` | Mac | 助手在一封已批准的邮件之后崩溃，还能恢复吗？ | 7 个步骤运行 2 次，每种持久性模式一次 | 审核人批准了两次，键让发件箱只留下一封邮件 | [5.7](#s-an-assistant-with-memory-and-approvals-that-survives-a-restart) |
| `deep-agent` | Mac | 带一个子 agent 的 deep agent 会发送什么？ | 在 Qwen3 8B 上运行 1 次 | 7 次模型调用共 24,300 个提示词 token | [7.5](#s-a-deep-agent-with-a-subagent-and-files) |
| `failure-drill` | x86 服务器客户机 | 每种有文档记载的故障是什么样子？ | 用 Qwen3 4B 把七个案例运行 3 次 | 每次运行耗时 101 到 103 秒 | [8.7](#s-a-failure-drill) |
| `chat-ui-mac` | Mac | Agent Chat UI 会向 Agent Server 发送什么，输入一条消息对待处理的审批有什么影响？ | 在一个无头浏览器会话中用 Qwen3 4B 运行 15 次：批准、编辑和拒绝各一次，每种模式下在审批期间输入一条消息各一次，另有 3 个普通问题用来测首个 token | 输入的消息在 2 次试验中都把审批以成功关闭，模型却说它已经发送了邮件。逐调用审批没有显示任何决定控件 | [8.2](#s-agent-chat-ui-in-front-of-langgraph-dev) |
| `internals` | x86 服务器客户机 | 运行时在每个超步、保存、恢复和流式输出中做了什么？ | 在 Qwen3 4B 上做追踪，每个单元格 50 次崩溃试验分两轮运行，每个单元格 30 次成本运行，100 次增长往返，在 Qwen3 8B 上每种循环运行 5 次 | 刚返回的任务在 `sync` 的 100 次试验中有 97 次、在 `async` 的 100 次试验中有 95 次又运行了一遍，框架耗时不到一次运行的 0.5% | [2.1](#s-the-superstep-loop-plan-execute-update) to [2.6](#s-checkpoint-growth-and-the-cost-of-a-superstep) |
| `bench` | Mac 和 Anthropic API | harness 会改变 agent 答对什么吗？ | 在 Qwen3 4B、Qwen3 8B 和 Claude Haiku 5.5 上运行 99 个任务，另外四个模型运行 30 个，每个任务运行 1 次 | 朴素循环、`create_agent` 和 `StateGraph` 在 60 个本地任务上给出了完全相同的运行结果，Claude 作为朴素循环和作为 deep agent 都通过了每一个任务 | [1.2](#s-do-you-need-langchain), [4.3](#s-structured-output-which-strategy-on-which-provider), [4.4](#s-many-tools-and-the-tool-selector), [7.4](#s-deep-agents-0-7) |
| `prodapp-mac` | Mac，以及从 Mac 访问的 Anthropic API | 在真实模型、崩溃、故障和负载下，基于 `create_agent` 和 Postgres 的 FastAPI 服务会怎样？ | 27 个测试，在 Qwen3 4B 上运行 3 次、在 Qwen3 14B 上运行 3 次，另在 Claude Haiku 5.5 上把 20 项评估运行一次。另有每种恢复形式 10 次崩溃试验，每种断开和 drain 案例 5 次试验，每个单元格一次负载运行。修复后的运行：两个 Qwen 模型各用 3 次运行测 6 项退款评估，各用 3 次运行测崩溃测试，在 Qwen3 4B 上做 3 次崩溃试验，以及一次 50 用户的负载单元格 | 20 次终止之后审批全部重新处于待处理状态，键让退款只留下一条，1、2 和 4 个 worker 给出相同的吞吐。修复之后，0 分的行在 6 次运行中全部消失，心跳让 200 个请求中没有一个超时 | [9.1](#s-the-run-endpoint-and-its-stream) to [9.7](#s-workers-the-advisory-lock-and-cost) |
| `last-two-mac` | Mac | 没有工具时，`ToolStrategy` 会怎样，`create_agent` 增加了哪些字节？ | Qwen3 4B 上 40 次运行，Qwen3 0.6B 上 10 次，每个程序 5 次请求录制 | 在 Qwen3 4B 上 40 次运行全部从 Ollama 得到 400，每个请求增加 7 到 17 个字节，每一个都有账本记录 | [4.2](#s-structured-output-autostrategy-providerstrategy-toolstrategy), [8.3](#s-cost-the-framework-against-a-plain-sdk-loop) |

这些名称沿用研究计划里的编号，没有跳号。T01 到 T17 是计划中的测试，TRC 是追踪测试。T18 到 T20 是为第 7.3 和 7.7 节后来补做的运行，T21 是为第 7.6、7.7 和 8.1 节做的账户运行。T22 和 T23 是为第 5.4 和 8.4 节做的 Deep Agents 文件规则与 store 命名空间的运行。`chat-ui-mac` 是为第 8.2 节做的 Agent Chat UI 运行。

五个演示目录是第 4.9、5.7、7.2、7.5 和 8.7 节的完整示例。`internals`、`bench`、T02 x86 和 `last-two-mac` 是第二轮的运行，它们让每个结果里都有了真实模型。`prodapp-mac` 是第 9 部分的生产服务。

## 实验目录里有什么 {#s-ref-how-this-manual-was-made-what-is-in-the-lab-folder}

[实验目录](manuals/langchain-101/capture/lab)为上表的每一行各放一个文件夹，另有文件夹 `summary`。13 行还保留了较早的 Mac 文件夹：T01、T02、T04、T05、T06、T07、T08、T11、T17、T18、T19、TRC 和故障演练。实验目录的 README 标出了哪些行被 x86 的运行替换。T10、T15 和 T16 保留了它们较早的替身文件夹，旁边是以 `-real` 结尾的第二轮文件夹。

- **原始录制文件。** 每个实验文件夹原样保留其运行的文件，格式是 JSON 行、日志和文本。过长的日志只保留摘录，摘录里的每一行都是原样的。
- **脚本。** 许多文件夹保留了生成它们的实验脚本，实验目录的 README 列出了这些脚本。演示文件夹把 `run.sh` 的输出放在 `capture/demos/` 里。
- **汇总。** `capture/run.py` 为每个数据集计算一份汇总，放进 `summary/`。每幅图读取 48 个汇总文件中的一两个，或读取测试基准的汇总，每个实测数字都来自其中之一。生产服务在自己的文件夹里另有十份汇总，`capture/labsum.py` 根据它的原始运行重新生成它们。
- **变更清单。** 实验目录的 README 列出了我们截断、省略或改动过的每个文件，并给出原因。

没有任何文件含有密钥、令牌或个人姓名。仅有的主机名是 `127.0.0.1`，以及录制的请求和错误文本里出现的公开主机，例如 `api.smith.langchain.com`。测试输入里的地址和名字都是编造的。

## 录制工具包 {#s-ref-how-this-manual-was-made-the-capture-kit}

[录制工具包](manuals/langchain-101/capture)在一个 Python 进程里驱动这套技术栈，不需要任何密钥。它把 56 个文件写入 `capture/out/`，手册中的每个 listing 都截取自其中一个文件。

- **19 个不含模型的文件。** 它们不调用任何模型，涵盖版本、消息、工具 schema、图结构，以及手册绘制的每个图的 Mermaid 文本，还涵盖持久性、中断、reducer、functional API、子图、错误处理器和递归上限。每次运行产生的字节都相同。
- **36 个录制文件和 1 个附带文件。** 其中 34 个调用 `qwen3:4b-instruct-2507-q4_K_M` 上的 `ChatOllama`，使用 temperature 0、seed 42、`num_ctx` 16384 和 `num_predict` 512。store、检索和检索 agent 的文件调用 `nomic-embed-text` 上的 `OllamaEmbeddings`，其中两个不调用聊天模型。我们于 2026-11-14 在 x86 服务器客户机上用 CPU 录制了它们。每个标题下的第一行写明模型、设置、机器和日期。

没有任何场景使用假的聊天模型。故障来自抛出异常的工具、没有进程监听的端口，或会丢弃连接的中继。决策中间件通过工具包里的一个小适配器向 Qwen3 4B 提问。没有任何场景使用假的嵌入。store 和检索场景用客户机 Ollama 服务器上的 `nomic-embed-text` 做嵌入。

```bash
cd manuals/langchain-101
python3 capture/run.py --model-free
python3 capture/run.py --check
python3 capture/run.py --check --live
```

第一条命令离线写出不含模型的文件和实验汇总。直接运行 `python3 capture/run.py` 会写出所有文件，并且需要 Ollama。

检查会重新运行不含模型的场景，并逐字节比较每个文件。对于每个录制文件，它检查模型行和手册所依赖的字符串，即消息类型、工具名和错误文本。然后它重新计算汇总并比较。它会为录制场景打印一行 `skipped`，为实验运行再打印一行。加上 `--live` 时，它会把模型场景重新录制到一个临时文件夹，并检查同样的结构。

## 在你的机器上重新录制 {#s-ref-how-this-manual-was-made-record-it-again-on-your-machine}

1. 用 Python 3.13，根据 `capture/requirements.txt` 创建工具包的虚拟环境。
2. 安装 Ollama，拉取 Qwen3 模型，并为用到 PostgreSQL 的实验启动它。
3. 在保留了脚本的文件夹里运行某个实验的脚本。每个脚本把文件写入它自己的文件夹。
4. 在手册目录下运行 `python3 capture/run.py`，重新计算汇总。

你的耗时会与我们的不同，模型的措辞也可能不同。但消息类型、错误文本、检查点和事件顺序不应该不同。如果在锁定版本下其中任何一项不同，就说明本手册的某个结论依赖于我们的机器。

来源：manual.json（pin、sources）； capture/README.md, capture/run.py, capture/requirements.txt, capture/lab/README.md, capture/lab/x86-guest-machine.txt; capture/lab/summary/crash-resume-x86.json, capture/lab/T02-crash-resume-x86/10-summary.txt, capture/lab/internals/03-checkpoint/crash.txt, capture/lab/internals/08-costs/breakdown.json, capture/lab/bench/summary-mac.json, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/last-two-mac/09-summary.txt, capture/lab/prodapp-mac/summary/, capture/lab/prodapp-mac/runs/cost-ledger.jsonl; capture/lab/summary/overhead-mac.json, capture/lab/summary/overhead-mac-real.json, capture/lab/summary/crash-resume-mac.json, capture/lab/summary/checkpoint-cost-x86.json, capture/lab/summary/streaming-mac.json, capture/lab/summary/streaming-mac-real.json, capture/lab/summary/retries-mac.json, capture/lab/summary/structured-output-mac.json, capture/lab/summary/structured-output-mac-real.json, capture/lab/summary/approvals-mac.json, capture/lab/summary/parallel-tools-mac.json, capture/lab/summary/tokens-mac.json, capture/lab/summary/long-threads-x86.json, capture/lab/summary/long-threads-x86-real.json, capture/lab/summary/concurrency-x86-real.json, capture/lab/summary/agent-server-x86-real.json, capture/lab/T02-crash-resume-x86/lr_common.py, capture/lab/summary/middleware-mac.json, capture/lab/summary/mcp-mac.json, capture/lab/summary/serde-mac.json, capture/lab/summary/stores-mac.json, capture/lab/summary/agent-server-x86.json, capture/lab/summary/concurrency-x86.json, capture/lab/summary/recursion-mac.json, capture/lab/summary/tracing-mac-real.json, capture/lab/summary/langsmith-account-mac.json, capture/lab/summary/evaluate-mac.json, capture/lab/summary/pytest-plugin-mac.json, capture/lab/summary/mcp-edges-mac.json, capture/lab/summary/demos-mac.json, capture/lab/summary/retries-x86.json, capture/lab/summary/approvals-x86.json, capture/lab/summary/parallel-tools-x86.json, capture/lab/summary/middleware-x86.json, capture/lab/summary/recursion-x86.json, capture/lab/summary/replay-fork-x86.json, capture/lab/summary/evaluate-x86.json, capture/lab/summary/pytest-plugin-x86.json, capture/lab/summary/failure-drill-x86.json；每一行所链接章节里实测数据的段落。
