# 如何阅读本手册

> 本手册讲解锁定在某一版本上的 LangChain Python 技术栈，其中每份代码清单都来自一次真实运行的录制，你可以自己核对。

## 本手册写给谁 {#s-front-who-this-manual-is-for}

你会写 Python，调用过聊天模型 API。你见过 LangChain 代码，也许是 0.x 年代那种带 chain、`AgentExecutor` 和 `langchain_community` 导入的写法。如今在 Python 3.11 上执行 `pip install langchain`，装到的是 1.5.0 版，那些代码大多已经导入不了。

本手册面向需要判断 1.x 技术栈是否适合自己，然后在它上面构建东西的工程师。手册从这个判断讲起，用本地模型和 Claude 模型在一套任务集上做测量。之后每个部分都以一个有我们的运行支撑的立场开篇，多数部分以一个应用该立场的小程序收尾。

LangChain 这个名字下有四个项目：LangChain、LangGraph、LangSmith 和 Deep Agents。它们的包各有各的版本号。所以本手册提到包时都带上版本，例如 `langchain` 1.5.0 和 `langchain-core` 1.8.0。[第 1.1 节](#s-langchain-langgraph-langsmith-and-deep-agents)说明每个项目做什么。

## 读完本手册你能做什么 {#s-front-what-you-can-do-after-this-manual}

- 在 Python 3.11 或更高版本上依据锁文件安装整套技术栈，并说出每条 import 来自哪个包。
- 用 `create_agent` 构建 agent，并预测一次运行中的每次模型调用、工具调用和检查点。
- 选择结构化输出策略和一组中间件，并预测它们的钩子按什么顺序运行。
- 按需要的模式流式输出一次运行，并用 checkpointer 让对话跨轮次、跨重启延续。
- 暂停运行等待人工审批，恢复它，并说清恢复时哪些代码会再次运行。
- 数清每一层重试的尝试次数，并在崩溃重放时让副作用保持安全。
- 接入 MCP 工具、检索器、Deep Agents 和 LangSmith 追踪，并从报错信息找到故障原因。
- 用 FastAPI 加 Postgres 提供 agent 服务，带审批、span 和评估，并依据模型服务器估算容量。

## 本手册是怎么做出来的 {#s-front-how-this-manual-was-made}

我们把技术栈锁定在 2026-11-11 发布的 `langchain` 1.5.0，并在 2026-11-14 把每个事实重新核对了一遍。我们读了每个包在其标签处的源码。我们读了文档仓库某一个提交处的文档，并把两者所述的内容都实际运行了一遍。

| 包 | 版本 | 提交 |
|---|---|---|
| `langchain` | 1.5.0 | `c2f4036e` |
| `langchain-core` | 1.8.0 | `a4b4a7b9`，与 `c2f4036e` 的 `libs/core` 目录树相同 |
| `langgraph` | 1.2.22 | `08a20169` |
| `langgraph-checkpoint`、`langgraph-prebuilt` | 4.3.2、1.1.2 | `08a20169` |
| `langgraph-checkpoint-sqlite` | 3.1.3 | `5bd231cb` |
| `deepagents` | 0.7.38 | `c858b364` |
| `langsmith` | 0.14.17 | `15dd2a78` |
| `langchain-openai`、`langchain-anthropic`、`langchain-ollama` | 1.8.0、1.7.10、1.1.0 | 各自的标签 |

各来源有优先级。两个来源不一致时，以较高的为准，并在对应小节里写明。

| 优先级 | 来源 | 手册从中取什么 | 引用方式 |
|---|---|---|---|
| 1 | 上述标签处的源码 | 每个类、参数、默认值和错误文本 | `code` |
| 2 | docs.langchain.com 的文档，由其仓库提交 `04d4d4a` 构建，MIT 许可证 | 文档描述的行为，用我们自己的话写出 | `docs` |
| 3 | 每个包的变更日志和发布说明 | 某项变更何时出现、出现在哪个包 | 变更日志页用 `docs`，某次发布用 `code` |
| 4 | `capture/` 里的录制工具包 | 每份代码清单 | 文件名 |
| 5 | `capture/lab/` 里的实验记录 | 每个实测数字 | 文件名 |

GitHub 的 issue 和拉取请求，是锁定版本上某个行为的证据，正文按编号逐一点名。www.langchain.com 的产品页没有开放许可证。第 1.1 节用我们自己的话转述其中的宣称，并把每一条与我们的结果并排放置。

文档站点提供的是主分支，没有哪个文档标签对应某次包发布。一个页面描述的行为可能比锁定版本更新，也可能更旧。页面与代码不一致时，以代码为准，小节会把两者都列出来。

## 录制工具包与实验记录 {#s-front-the-capture-kit-and-the-lab}

**录制工具包：** `capture/` 里的程序。它在一个 Python 进程中驱动整套技术栈，并把看到的内容写入 `capture/out/`。它覆盖 LangChain、LangGraph、Deep Agents、`langchain.mcp` 和 LangSmith SDK。

工具包不使用假聊天模型。场景需要模型时，它通过 `ChatOllama` 调用 Qwen3 4B Instruct，即 `qwen3:4b-instruct-2507-q4_K_M`。设置是 temperature 0、seed 42、`num_ctx` 16384、`num_predict` 512。这些录制于 2026-11-14，在 x86 服务器客户机的 CPU 上进行。每个文件都写明它的模型、设置、机器和日期。

另一些录制不调用模型，例如版本、消息、图结构和 store。它们离线运行，不需要密钥，每次运行得到的字节都相同。工具包会遮蔽每次运行都会变的值，例如消息 id 和每次回复里的耗时。真实模型用它自己的话回答。所以代码清单展示的是模型在我们这次运行里做了什么，即使 prompt 要求得更多。

**实验记录：** 在我们某台机器上，对真实模型或真实数据库做的一次运行，以原始文件保存在 `capture/lab/`。`capture/run.py` 为每组数据计算一份摘要，写入 `capture/lab/summary/`，每张图表读取其中一份摘要。

我们在两台机器上录制。Mac 是 Apple M1 Max，10 核、64 GiB，装有 Ollama 和 PostgreSQL 14。x86 服务器客户机有 32 vCPU 和 48 GiB，装有 PostgreSQL 16、Redis 7 和 CPU 上的 Ollama 0.31.1。两台机器不同，所以本手册从不把其中一台的数字与另一台的数字并排比较。

Mac 是一台共用的笔记本，每次计时运行期间上面都有其他工作在跑。读 Mac 上的每个时间时，把它当作该机器的上界。实验用的本地模型有 Qwen3 0.6B、1.7B、4B、8B、14B 和 30B-A3B，以及 gpt-oss 20B，都在 Ollama 上运行，嵌入用 `nomic-embed-text`。录制工具包在 x86 服务器客户机上使用 Qwen3 4B Instruct。[第 8.7 节](#s-a-failure-drill)的故障演练和[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)的崩溃矩阵也是如此。实验运行 T05、T07、T08、T11、T17、T18 和 T19 同样如此。

**测试基准：** [第 1.2 节](#s-do-you-need-langchain)的 99 个任务，每个都按工具留下的状态来检查。Claude Haiku 5.5（`claude-haiku-5-5`）和 Claude Sonnet 5.5（`claude-sonnet-5-5`）从 Mac 经 Anthropic API 运行。预算设有上限，每次调用都记在成本账本里。[测试基准方法](#s-ref-the-bench-method)给出任务、设置，以及不应使用的行。

Claude Haiku 5.5 还运行了[第 9.6 节](#s-evals-that-check-state)里生产服务的 20 项评估，每次调用同样记在这类账本里。它还对[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)的文件规则发起了 60 次攻击，花费 $0.021。该节的规则矩阵没有用模型，是由脚本化的调用方驱动权限层，小节里也写明了这一点。本手册里其余的模型耗时，都是本地模型的耗时。

## 约定 {#s-front-conventions}

- 像 `{{docs oss/python/langchain/models}}` 这样的引用留在小节源文件里，不渲染任何内容。阅读视图不显示文件路径。
- 每个来源都用我们自己的话陈述。引号里只放字面字符串，例如输出和错误文本。
- 键为 `docs` 的引用，指向 docs.langchain.com 上的页面路径，读取于文档提交 `04d4d4a`。
- 一份代码清单截取自一个录制文件。单独一行的 `…` 标出我们截掉的行，标题下方的说明写明截掉了什么。
- 代码清单里的 `<uuid-1>`、`<hex-1>` 和 `<time>` 是遮蔽标记。同一个文件里，相同的标记代表相同的值。
- 以 **我们测得** 开头的段落会写明机器和运行次数。它的数字来自一个摘要文件。
- 一次运行是一次 `invoke` 或 `stream` 调用。一个步骤是 LangGraph 循环的一个超步。一轮是一条人类消息，加上直到回复为止的所有内容。

## 第一次运行，离线 {#s-front-a-first-run-offline}

录制工具包需要 Python 3.13，因为这些录制是用它做的。技术栈本身需要 Python 3.11 或更高版本。在手册目录里创建虚拟环境并运行检查：

```bash
python3.13 -m venv capture/.venv
capture/.venv/bin/pip install -r capture/requirements.txt
python3 capture/run.py --check
```

这条检查把 19 个不需要模型的场景重新跑进一个临时文件夹，并把每个文件与 `capture/out/` 比较。它检查 36 个录制文件是否都写明了所用模型。它还检查手册依赖的结构，例如消息类型和工具名。然后它从原始录制重建实验摘要，也做比较。它不调用模型，所以对需要模型的录制场景，只打印一行 `skipped:`。当你的机器上运行着 Ollama 时，`python3 capture/run.py --check --live` 会把它们重新录制。

下面是[第 1.3 节](#s-one-create-agent-run)背后的场景。它用一个工具和一条系统 prompt 构建 agent，并问一个问题：

```listing
title: 第一次运行的 agent
source: capture/s_start.py
lang: python
note: 工具包里的场景函数。llm()、add 工具和 ASK 来自 capture/common.py。
---
def agent_run(cap):
    m = llm()
    agent = create_agent(m, tools=[add], system_prompt="You add numbers.")
    out = agent.invoke(ASK)
```

`llm()` 按上述设置在 Qwen3 4B 上构建 `ChatOllama`。模型用 2 和 3 调用了 `add`，然后说出了和。这次运行以四条消息结束：

```listing
title: 第一次运行结束时的消息
source: capture/out/06-agent-run.txt
lang: json
note: 每条消息只保留类型和内容。id 和工具调用被截掉了。
---
    "type": "HumanMessage",
    "content": "What is 2 + 3?",
…
    "type": "AIMessage",
    "content": "",
…
    "type": "ToolMessage",
    "content": "5",
…
    "type": "AIMessage",
    "content": "2 + 3 = 5.",
```

要用别的模型，就传入 `"openai:gpt-4.1"` 这样的模型字符串来代替 `m`，并安装对应的提供方包。[第 3.2 节](#s-init-chat-model-and-model-profiles)展示这个字符串如何解析。

## 各部分的编排 {#s-front-how-the-parts-are-ordered}

第 1 部分是决策。它把每个项目的宣称与我们的结果并排放置，在任务集上比较各种 harness，并跟随一次 agent 运行直到最后一个检查点。第 2 部分深入运行时：超步、通道、检查点写入路径、中断、流和检查点增长，都来自真实运行的追踪。第 3 部分安装技术栈，并讲解模型、消息、工具和 prompt。

第 4 部分是 `create_agent` 构建的 agent：它的图、各提供方上的结构化输出、多工具和中间件。第 5 部分是状态、记忆与持久性：流、checkpointer、崩溃、store、长线程和序列化。第 6 部分是 LangGraph 控制流：状态与 reducer、`Send` 与 `Command`、函数式 API、中断、审批、时间旅行、子图和错误处理器。

第 7 部分接入检索、MCP、Deep Agents 和 LangSmith。第 8 部分讲运维与调试：Agent Server、Agent Chat UI、成本、安全、从 0.x 迁移、症状、故障演练，以及锁定版本上的限制。第 9 部分端到端构建一个生产服务，用到 FastAPI、Postgres、审批、OpenTelemetry span、故障、评估和多个 worker。它在 Qwen3 4B、Qwen3 14B 和 Claude Haiku 5.5 上运行这个服务。下表列出每一部分：

```parts
```

每一节都以一个简短的行动清单结束。今天就需要答案时先读它，想知道原因再读其余部分。

有四课更深入地讲解本手册所应用的思想。[LangGraph 状态机一课](phases/11-llm-engineering/16-langgraph-state-machines)和[有状态图一课](phases/14-agent-engineering/13-langgraph-stateful-graphs)从第一性原理构建图。[agent 框架取舍一课](phases/11-llm-engineering/17-agent-framework-tradeoffs)比较各种框架。[持久执行一课](phases/15-autonomous-systems/12-durable-execution)讲解检查点和重放。本手册只专注于 LangChain。

## 图中的颜色 {#s-front-colour-in-figures}

每种色相在所有图中保持同一个含义：

```palette
```

[图](#fig-0-1)用我们录制中的几次交互来讲解各种箭头样式。实线箭头是调用，同色的虚线箭头是它的回复。其余六种样式各标记一类事件，箭头颜色与上表一致。

```figure
id: fig-0-1
kind: sequence
title: 如何阅读本手册里的时序图
claim: 每种箭头样式标记一类交互，每个标签都是录制工具包里真实的名称、消息或计数。
caption: 每个带编号的行，从箭头尾读到箭头头。每个标签下方的注释写明它的样式。来源：capture/out/06-agent-run.txt、capture/out/03-tools.txt、capture/out/04-tool-errors.txt、capture/out/30-state-history-forks.txt 和 capture/out/42-langsmith.txt。
```

来源：manual.json；capture/README.md, capture/run.py, capture/s_start.py, capture/common.py, capture/out/06-agent-run.txt, capture/out/03-tools.txt, capture/out/04-tool-errors.txt, capture/out/30-state-history-forks.txt, capture/out/42-langsmith.txt; capture/lab/, capture/lab/bench/summary-mac.json, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/prodapp-mac/runs/cost-ledger.jsonl; docs.langchain.com at docs commit 04d4d4a.
