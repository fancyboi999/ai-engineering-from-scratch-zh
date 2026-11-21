# 安装与包地图

> 这套技术栈由许多独立版本的包组成，一次小版本发布就可能改变行为，所以要在 Python 3.11 或更高版本上，按锁文件安装 `langchain` 1.5.0。

你从一份旧答案里复制了 `from langchain.chains import LLMChain`，Python 抛出 `ModuleNotFoundError`。你装了 `langchain-community` 想要一个加载器，随后读到这个包已经停止维护。你在 Python 3.10 和 3.12 上执行同一条 `pip install`，得到了两个不同版本的 `langchain`。

读完本节，你能说出每个 import 来自哪个包，并按锁定版本安装整套技术栈。你还能说明为什么它需要一个锁文件。

## 包地图 {#s-install-and-the-package-map-the-package-map}

**发行包（distribution）：** `pip` 所称的包，例如 `langchain-core`。它的 import 名把 `-` 换成 `_`，例如 `langchain_core`。

在锁定版本上，这套技术栈分布在下面这些发行包里：

| 发行包 | 版本 | import 名 | 包含什么 |
|---|---|---|---|
| `langchain` | 1.5.0 | `langchain` | `create_agent`、中间件、`init_chat_model`、`langchain.mcp`，以及消息和工具的短导入路径 |
| `langchain-core` | 1.8.0 | `langchain_core` | 消息与内容块、`BaseChatModel`、工具、回调、文档、检索器、嵌入，以及假模型 |
| `langgraph` | 1.2.22 | `langgraph` | `StateGraph`、Pregel 循环、`Command`、`Send`、`interrupt`、函数式 API 和流式输出 |
| `langgraph-prebuilt` | 1.1.2 | `langgraph.prebuilt` | `ToolNode`、`ToolRuntime`、`InjectedState`，以及已弃用的 `create_react_agent` |
| `langgraph-checkpoint` | 4.3.2 | `langgraph.checkpoint`、`langgraph.store` | saver 接口、`InMemorySaver`、序列化器和 `InMemoryStore` |
| `langgraph-checkpoint-sqlite` | 3.1.3 | `langgraph.checkpoint.sqlite` | `SqliteSaver` 和 `SqliteStore` |
| `langgraph-checkpoint-postgres` | 3.2.1 | `langgraph.checkpoint.postgres` | `PostgresSaver` 和 `PostgresStore` |
| `langsmith` | 0.14.17 | `langsmith` | 追踪客户端、`traceable` 和 `evaluate` |
| `deepagents` | 0.7.38 | `deepagents` | `create_deep_agent`、它的后端及中间件 |
| `langchain-text-splitters` | 1.1.3 | `langchain_text_splitters` | 文本切分器 |
| `langchain-classic` | 1.0.8 | `langchain_classic` | 0.3 的命名空间：链、旧版 agent、prompt hub 模块和旧的记忆类 |

每个模型提供方都有自己的包，例如 `langchain-openai` 1.8.0、`langchain-anthropic` 1.7.10 和 `langchain-ollama` 1.1.0。它们和 `langchain` 在同一个仓库里，但各自从自己的标签发布。在 `langchain` 1.5.0 标签处，仓库树里的 OpenAI 包仍是 1.7.4 {{code libs/partners/openai/pyproject.toml}}。`langchain-classic` 1.0.8 和 `langchain-community` 0.4.2 的版本取自 PyPI，不在版本录制里。

`langgraph`、`langgraph-prebuilt`、`langgraph-checkpoint` 和 `langgraph-checkpoint-postgres` 在锁定版本处来自同一个提交，却有四个不同的版本号。[图](#fig-3-1)显示了每个包的依赖要求。

```figure
id: fig-3-1
kind: tree
title: 锁定版本上每个包的依赖要求
claim: 安装 deepagents 会拉入 langchain、两个模型提供方包和 langsmith，安装 langchain 会拉入 langgraph，而 langgraph 需要 langchain-core。
caption: 每个箭头读作“需要”，附上该包声明的版本范围。灰色框在 LangChain 之外，虚线框是可选的附加依赖。来自每个版本在 PyPI 上的 requires_dist 列表，以及 capture/out/00-versions.txt。
```

## 什么搬了家 {#s-install-and-the-package-map-what-moved}

旧的 import 在 1.0 时从 `langchain` 中移出，另有三个仓库在 2026 年被归档。

- **链和旧版 agent。** `LLMChain`、`AgentExecutor`、索引 API 和 hub 模块在 `langchain-classic` 的 `langchain_classic` 下 {{code libs/langchain/langchain_classic}}。
- **社区集成。** `langchain-community` 0.4.2 是最后一个版本，它的仓库已归档。它的 README 写明这个包已停止维护 {{issue langchain-community README}}。它仍能安装，也仍然依赖 `langchain-classic`。
- **MCP 适配器。** `langchain-mcp-adapters` 已归档。更新日志说，`langchain` 1.4.0 新增了 `langchain.mcp` 来取代它 {{docs oss/python/releases/changelog}}。在锁定版本上，附加依赖 `langchain[mcp]` 会安装它。不要在同一个环境里同时装两者，因为旧适配器要求 `mcp` 低于 2。
- **LangSmith SDK 仓库。** `langsmith-sdk` 已归档，Python 客户端现在放在 `langsmith-python`。包名 `langsmith` 没有变。

`langgraph.prebuilt` 里的 `create_react_agent` 仍然能导入，并警告它已迁到 `create_agent`。[第 1.3 节](#s-one-create-agent-run)展示取代它的 agent。

## Python 3.11 {#s-install-and-the-package-map-python-3-11}

**Python 下限（Python floor）：** 一个包在 `requires-python` 里声明的最旧 Python 版本。

关于下限，文档和包本身说法不一。安装页给出 `pip install -U langchain`，注释说需要 Python 3.10 或更高 {{docs oss/python/langchain/install}}。`langchain` 1.5 的更新日志条目说它需要 Python 3.11 或更高 {{docs oss/python/releases/changelog}}。包与更新日志一致：`langchain` 1.5.0 和 `langchain-core` 1.8.0 声明 Python 3.11 或更高 {{code libs/langchain_v1/pyproject.toml}}。`langgraph` 1.2.22 仍然声明 3.10。

本手册以包的元数据为准，它的优先级高于这两个页面。在 Python 3.10 上，`pip install langchain` 会解析出 `langchain` 1.4.x，却不会有任何提示告诉你装到的是更旧的版本线。请使用 Python 3.11 或更高。录制工具包使用 3.13。

这一变化还违反了发布策略页的一条规则。该页说，Python 下限只在大版本里变化 {{docs oss/python/release-policy}}。`langchain` 1.5.0 是小版本。本手册的冲突登记把这处分歧列为冲突 D101。

## 锁文件 {#s-install-and-the-package-map-a-lockfile}

一个包的一次小版本发布，就能改变你的代码所看到的行为。`langchain-core` 1.7.0 改变了流里工具调用事件的形状。它的更新日志条目说，想保留旧形状就把版本锁在 1.7 以下 {{docs oss/python/releases/changelog}}。按 PyPI 上的发布日期，`langgraph` 在九天内发布了 1.2.20、1.2.21 和 1.2.22。

所以，把技术栈里的每个包都锁定到一个确切版本。录制工具包在 `capture/requirements.txt` 里锁定了其中 25 个，并把实际安装的版本写了出来：

```listing
title: 录制工具包安装的版本
source: capture/out/00-versions.txt
lang: text
note: Python 版本之后的前十四行。传递依赖的锁定项已截去。
---
python 3.13

langchain==1.5.0
langchain-core==1.8.0
langgraph==1.2.22
langgraph-checkpoint==4.3.2
langgraph-prebuilt==1.1.2
langgraph-checkpoint-sqlite==3.1.3
deepagents==0.7.38
langsmith==0.14.17
fastmcp==4.2.0
mcp==2.3.0
langchain-text-splitters==1.1.3
langchain-openai==1.8.0
langchain-anthropic==1.7.10
langchain-ollama==1.1.0
…
```

`deepagents` 0.7.38 需要 `langchain-anthropic` 和 `langchain-google-genai`。它已弃用的默认模型是 Claude {{code libs/deepagents/deepagents/graph.py}}。只在要用它时才安装。

如果只用一个 OpenAI 模型，锁定版本上的安装命令是：

```bash
python3.13 -m venv .venv
.venv/bin/pip install "langchain==1.5.0" "langchain-core==1.8.0" "langgraph==1.2.22" "langchain-openai==1.8.0"
.venv/bin/pip freeze > requirements.lock
```

之后在其他所有地方都按 `requirements.lock` 安装，让每台机器解析出同样的版本。

## 安装体积与导入时间 {#s-install-and-the-package-map-install-size-and-import-time}

**我们测得**两次全新安装的体积，在 Mac 上进行，使用同一份锁文件作为约束，且在任何 import 写出字节码之前。单装 `openai` 安装了 14 个包，共 26,356 KiB。`langchain` 加 `langchain-openai` 安装了 44 个包，共 54,312 KiB。

**我们测得**导入时间，在 Mac 上进行，每种 import 在新进程里各跑 10 次。[图](#fig-3-1b)显示每一次运行。字节码已写好时，`import openai` 的中位数是 0.329 秒，`create_agent` 加 `ChatOpenAI` 的 import 是 0.831 秒。没有字节码时，分别是 1.064 秒和 2.64 秒。这台 Mac 是共用的笔记本电脑，所以请把这些数字当作上限。

```figure
id: fig-3-1b
kind: chart
title: 四种 import 的导入时间，每种 10 次
claim: create_agent 加 ChatOpenAI 的 import，热启动约 0.8 秒，没有字节码时约 2.6 秒，约为单独 import openai 的两倍半。
caption: 每个点是在 Mac 上新建 Python 进程的一次运行。每条短线是十次运行的中位数。左组的字节码在磁盘上，右组没有。来自 capture/lab/summary/import-times-mac.json。
```

2.6 秒的导入时间，对无服务器函数，或每次调用都要启动的命令行工具来说是个问题。请在启动时一次性导入整套技术栈，并把字节码保留在镜像里。

```takeaways
- 使用 Python 3.11 或更高版本，因为 langchain 1.5.0 在 3.10 上装不上。
- 在锁文件里，把技术栈的每个包都锁定到确切版本。
- 只在迁移期间，才从 langchain_classic 导入链和 hub。
- 安装 langchain[mcp]，并把 langchain-mcp-adapters 从同一环境中移除。
- 启动时间要紧时，把字节码保留在镜像里。
```

来源：capture/out/00-versions.txt, capture/requirements.txt; capture/lab/summary/install-size-mac.json, capture/lab/summary/import-times-mac.json, capture/lab/T01-overhead-mac/07-install-size.txt, capture/lab/T01-overhead-mac/06-import-times.jsonl; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/install, oss/python/releases/changelog, oss/python/release-policy); libs/langchain_v1/pyproject.toml, libs/partners/openai/pyproject.toml, and libs/langchain/langchain_classic at langchain==1.5.0; libs/deepagents/deepagents/graph.py at deepagents==0.7.38; the PyPI JSON of each package and the archived READMEs of langchain-community, langchain-mcp-adapters, and langsmith-sdk, read 2026-11-14.
