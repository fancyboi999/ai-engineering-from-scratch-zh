# LangChain 101

LangChain Python 技术栈手册。从“到底要不要用它”这个决定讲起，一直讲到一个能流式输出、能暂停等待审批、能撑过崩溃、还留下追踪记录的 agent，最后以一个在生产中运行该 agent 的服务收尾。它覆盖 langchain 1.5.0、langchain-core 1.8.0、langgraph 1.2.22 和 deepagents 0.7.38，每项决策都给出录制的答案。官方文档说明每个类和参数做什么，本手册则记录我们运行它、弄坏它、测量它时发生了什么。中文网页版位于 [aieng-zh.cn/manual-langchain-101.html](https://aieng-zh.cn/manual-langchain-101.html)，上游英文课程各版本 release 附带英文 PDF `aiefs-manual-langchain-101.pdf`。

## 手册内容

- 正文共 60 节、9 个部分，外加 11 节参考。每个部分以一个由我们的运行支撑的立场开篇。第 1 部分是决策：各项宣称与我们的运行并排对照，在带状态检查器的 99 个任务集上做 harness 对决，再跟踪一次 agent 运行。第 2 部分借助真实运行的追踪深入运行时。第 3 部分讲安装、模型、消息和工具。第 4 部分讲 `create_agent`、各提供方的结构化输出、多工具、中间件、重试和护栏。第 5 部分讲流式输出、checkpointer、持久性、store 和长线程。第 6 部分讲 LangGraph 控制流。第 7 部分讲检索、MCP、Deep Agents 和 LangSmith。第 8 部分讲 Agent Server、Agent Chat UI、成本、安全（含 Deep Agents 的文件规则和 store 命名空间）、升级、错误和故障演练。第 9 部分构建一个带 Postgres、审批、span、故障、评估和多个 worker 的 FastAPI 服务，并在 Qwen3 4B、Qwen3 14B 和 Claude Haiku 5.5 上运行它。五个完整示例 agent 放在各自适用的部分里。
- 每个实测数字都注明测试机器与运行次数。当前版本尚未测量的页面会如实标明，第 8.8 节列出下一版要补做的运行。
- 94 幅图表与 1 幅封面插图，均由图表套件绘制。统计图表读取汇总文件。
- 287 段代码清单（listing）。每一段都截自离线录制或固定标签处的源码，审计脚本逐行核对。
- 第 1.1 节把项目官网的每项核心宣称与我们测得的结果并列对照。
- 参考部分收录 `create_agent` 的参数、中间件钩子与类、流模式、checkpointer 与 store 的 API、环境变量、错误字符串、术语表、列出 33 处来源互相矛盾之处的冲突登记，以及测试基准的方法。

## 目录结构

| 路径 | 内容 |
|---|---|
| `manual.json` | 清单：锁定版本、各部分、配色、来源、封面插图 |
| `front.md`、`sections/` | 正文，每节一个文件 |
| `figures/src/` | 图表源文件，构建为 `figures/*.svg` |
| `capture/run.py`、`capture/s_*.py` | 录制工具包：不使用密钥，不使用假聊天模型；场景需要模型时调用本地 Ollama 上的 Qwen3 4B；并写出 `capture/out/` 里的文件，代码清单即取自这些文件 |
| `capture/lab/` | 51 个实验文件夹：`T01-overhead-mac` 到 `T20-mcp-edges-mac`、`TRC-tracing-mac` 和 `T21-langsmith-account-mac`；以 `-x86`、`-x86-real` 和 `-mac-real` 结尾的文件夹是用真实模型的重跑；`internals/` 是运行时追踪，`bench/` 是测试基准，`bench2/` 是第二个测试基准，`multiagent/`、`last-two-mac/` 是多 agent 运行，`prodapp-mac/` 是第 9 部分的生产服务，另有五个示例的录制运行。每个文件夹都带有脚本和原始输出，`capture/lab/README.md` 列出了不应使用的行 |
| `capture/lab/summary/` | 48 份汇总文件，表格和图表读取它们，由 `capture/labsum.py` 重建。测试基准用 `capture/lab/bench/summarize.py` 写出自己的汇总 `capture/lab/bench/summary-mac.json`。`capture/labsum.py` 还会重建 `capture/lab/prodapp-mac/summary/` 里的十份汇总，以及 `capture/lab/prodapp-mac/runs/summary/` 里的两份运行汇总 |
| `capture/demos/` | 五个示例，各带一份 README 和一个 `run.sh`：SQL agent、检索 agent、带记忆的助手、deep agent 和故障演练 |

## 锁定版本

| 项目 | 取值 |
|---|---|
| langchain | 1.5.0，提交 `c2f4036e4c6ca45a8da8a42d8e07a25d2ea48b8f` |
| langchain-core | 1.8.0 |
| langgraph | 1.2.22，配套 langgraph-checkpoint 4.3.2、langgraph-prebuilt 1.1.2 和 langgraph-checkpoint-postgres 3.2.1 |
| langgraph-checkpoint-sqlite | 3.1.3 |
| deepagents | 0.7.38 |
| langsmith | 0.14.17 |
| 模型提供方 | langchain-openai 1.8.0、langchain-anthropic 1.7.10、langchain-ollama 1.1.0 |
| Python | 3.11 或更高版本 |
| 核验日期 | 2026-11-14 |

`capture/requirements.txt` 记录确切版本，第 R.8 节给出每个仓库的提交。

## 录制环境

| 手册中的名称 | 机器 |
|---|---|
| Mac | 一台 Apple M1 Max 笔记本，10 核、64 GiB；运行 Ollama 提供本地模型；是测试基准和第 9 部分里 Anthropic API 的客户端；是 T21 里托管 LangSmith API 的客户端；并运行第 9 部分的服务，配 PostgreSQL 14 |
| x86 服务器客户机 | 一台 32 vCPU、48 GiB 的 KVM 客户机，运行 PostgreSQL 16 和 Agent Server |

本地模型有 Qwen3 0.6B、1.7B、4B、8B、14B 和 30B-A3B，以及 gpt-oss 20B，嵌入用 `nomic-embed-text`，全部在 Ollama 上运行。Claude Haiku 5.5 与 Claude Sonnet 5.5 在测试基准里通过 Anthropic API 运行，共花费 $0.93。Claude Haiku 5.5 还运行了第 9 部分的 20 项评估（64 次调用，$0.011），并对第 8.4 节的文件规则发起了 60 次攻击（134 次调用，$0.021）。有一次运行使用了免费方案的全新 LangSmith 账户，从 Mac 发起，保留文件里的 id 已被替换。`capture/lab/README.md` 把每个实验对应到它的机器。不要拿一台机器上的数字去和另一台机器上的数字比较。

## 阅读建议

先读前言“如何阅读本手册”。它会依据 `capture/requirements.txt` 安装技术栈，并运行一次录制工具包。第 1 部分要完整读一遍。之后，直接去读能回答你问题的那一页。出了故障，从第 8.6 节和 R.6 的错误表开始。

## 复验录制数据

实验记录需要在 Mac 和 x86 服务器客户机上运行 Ollama 和 Postgres，所以无法在 CI 中运行。每个实验的脚本都在 `capture/lab/` 下它自己的文件夹里，第 R.10 节列出实验、机器、运行次数和方法。`capture/demos/` 里的五个示例各有 README 和 `run.sh`。

录制文件和汇总可以离线重建：

```bash
cd manuals/langchain-101
python3 capture/run.py --check
```

检查会重新运行录制工具包，并比较 `capture/out/` 里的每个文件。它从实验记录重建每份汇总，并与已提交的文件比较。因为它不会启动 Ollama 或 Postgres，所以对实验运行只打印一行 `skipped:`。

## 构建与审计

在仓库根目录：

```bash
node manuals/_shared/figkit.js build manuals/langchain-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual langchain-101
```

审计必须输出 `TOTAL 0`。契约见 [manuals/AUTHORING.md](../AUTHORING.md)。
