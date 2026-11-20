# 从 0.x 迁移，以及过时的建议

> 多数 0.x 代码搬到了 `langchain-classic` 或改了名字，而旧建议还留在教程、notebook 和个别文档页里，所以要对照锁定版本逐个检查导入。

你打开一个 2024 年的项目。它从 `langchain.agents` 导入 `AgentExecutor`，从 `langchain_community` 导入一个加载器，从 `langchain_mcp_adapters` 导入 `MultiServerMCPClient`。在 `langchain` 1.5.0 上，第一个导入失败，第二个来自一个已经日落的包，第三个与 `langchain[mcp]` 冲突。

读完本节，你能把 0.x 代码迁到 1.x 的名称，并分辨过时的页面或 notebook 与当前的页面或 notebook。

## 支持窗口 {#s-migration-from-0-x-and-stale-advice-the-support-window}

按发布策略，LangChain 0.3 的维护期到 2026 年 12 月 {{docs oss/python/release-policy}}。这条线仍有发布：按 PyPI 上的发布日期，`langchain` 0.3.30 和 `langchain-core` 0.3.86 发布于 2026-05-07。`langchain` 0.3.30 带有对 `loads` 和 `dumps` 的加固。`langchain-core` 0.3.86 修复了一个路径穿越问题 CVE-2026-34070。所以 0.3 代码今天还能运行，而它的安全修复在 2026 年之后就停了。

同一份策略说，1.x 内部的次版本升级不会破坏任何东西。有两个次版本改变了升级者必须做的事。`langchain` 1.5.0 把 Python 下限提到了 3.11，见[第 3.1 节](#s-install-and-the-package-map)。按 `langchain-core` 1.7.0 的发布说明，`langchain-core` 1.7.0 把流式工具调用参数从快照改成了切片。用锁文件固定版本，升级每个次版本前先读它的更新日志。

| 包的版本线 | 最低 Python |
|---|---|
| 0.3 | 3.9 |
| `langchain` 1.0 到 1.4，`langchain-core` 1.0 到 1.7，依据 PyPI 元数据 {{site pypi.org/project/langchain}} | 3.10 |
| `langchain` 1.5.0、`langchain-core` 1.8.0、`langchain-openai` 1.8.0 和 `deepagents` 0.7.38 | 3.11 |
| `langchain-anthropic` 1.7.10 和 `langchain-ollama` 1.1.0 | 3.10 |
| `langgraph` 1.2.22、它的 checkpointer 和 `langsmith` 0.14.17 | 3.10 |

## 搬家的导入 {#s-migration-from-0-x-and-stale-advice-imports-that-moved}

| 0.x 导入 | 在锁定版本上 | 章节 |
|---|---|---|
| `from langchain.chains import LLMChain` | `langchain_classic.chains`，自 0.1.17 起弃用，将在 2.0.0 移除 {{code libs/langchain/langchain_classic/chains/llm.py}} | [3.1](#s-install-and-the-package-map) |
| `from langchain.agents import AgentExecutor, initialize_agent` | `langchain_classic.agents`，且 `initialize_agent` 已弃用。新 agent 用 `langchain.agents.create_agent` | [4.1](#s-create-agent-and-the-graph-it-builds) |
| `from langchain import hub` | `langchain_classic.hub`，它的 push 和 pull 已弃用，改用 LangSmith SDK {{code libs/langchain/langchain_classic/hub.py}} | [3.5](#s-the-system-prompt) |
| `langchain.retrievers.MultiQueryRetriever`、`RetrievalQA` | `langchain-classic`。`BaseRetriever` 仍在 `langchain_core.retrievers` | [7.1](#s-embeddings-splitters-vector-stores-and-retrievers) |
| `langchain_community.*` | 在 0.4.2 日落，仓库已归档。有对应提供方包的，就用提供方包 | [3.1](#s-install-and-the-package-map) |
| `from langchain_mcp_adapters.client import MultiServerMCPClient` | `langchain.mcp.MCPAdapter`，处于 beta，随 `langchain[mcp]` 安装 | [7.3](#s-mcp-with-langchain-mcp) |
| `from langgraph.prebuilt import create_react_agent` | `langchain.agents.create_agent`。旧函数仍可导入，并会发出警告 | [4.1](#s-create-agent-and-the-graph-it-builds) |
| `from langgraph.checkpoint.memory import MemorySaver` | `InMemorySaver`。`MemorySaver` 作为别名保留 {{code libs/checkpoint/langgraph/checkpoint/memory/__init__.py}} | [5.2](#s-checkpointers-and-threads) |
| `from langgraph.errors import NodeInterrupt` | `langgraph.types.interrupt`，并用 `Command(resume=...)` 恢复 | [6.4](#s-interrupt-and-resume) |
| `from langgraph.constants import Send` | `from langgraph.types import Send` | [6.2](#s-edges-send-and-command) |

LangSmith SDK 的仓库也搬了家，搬到 `langchain-ai/langsmith-python`。包名 `langsmith` 没有变。

## 从 create_react_agent 到 create_agent {#s-migration-from-0-x-and-stale-advice-create-react-agent-to-create-agent}

v1 发布的迁移指南列出了每个变化的参数 {{docs oss/python/migrate/langchain-v1}}。我们把每一行对照锁定版本的代码查了一遍。

| `create_react_agent` | `create_agent` |
|---|---|
| `prompt=` | `system_prompt=`，字符串或 `SystemMessage` |
| 可调用对象形式的 `prompt` | `@dynamic_prompt` 中间件 |
| `pre_model_hook`、`post_model_hook` | `before_model` 和 `after_model` 中间件 |
| Pydantic 或 dataclass 状态 | 通过 `state_schema` 传入、继承 `AgentState` 的 `TypedDict` |
| 由可调用对象选择的模型 | 带 `request.override(model=...)` 的 `wrap_model_call` 中间件 |
| 已调用过 `bind_tools` 的模型 | 不在签名里，签名接收字符串或聊天模型，也没有检查。传入普通模型和工具 |
| `ToolNode(handle_tool_errors=...)` | `ToolErrorMiddleware(on_error)`，或 `wrap_tool_call` 中间件 |
| 在额外的最终节点里使用 `response_format` | 在主循环里做结构化输出，用 `ToolStrategy`、`ProviderStrategy` 或 `AutoStrategy` |
| 流里的节点名 `agent` | `model` |
| `config["configurable"]` 里的静态数据 | `invoke` 上的 `context=`，由 `context_schema` 定型 |
| LangGraph 的递归上限 | 9999 步，由 `create_agent` 设置 {{code libs/langchain_v1/langchain/agents/factory.py}} |

[第 4.1 节](#s-create-agent-and-the-graph-it-builds)展示了 `create_agent` 构建的图，[第 4.5 节](#s-middleware-hooks-and-their-order)展示了取代旧钩子的那些钩子。

## 改了名的 LangGraph 名称 {#s-migration-from-0-x-and-stale-advice-langgraph-names-that-changed}

有两处弃用在工具包里表现为警告。第一处来自用旧参数 `checkpoint_during` 运行的图：

```listing
title: 锁定版本上的 checkpoint_during
source: capture/out/31-durability.txt
lang: text
---
warning LangGraphDeprecatedSinceV10: `checkpoint_during` is deprecated and will be removed. Please use `durability` instead. Deprecated in LangGraph V1.0 to be removed in V2.0.
```

第二处来自把 `invoke(version="v2")` 的输出当字典来读：

```listing
title: 对 GraphOutput 的字典式读取
source: capture/out/24-stream-v2.txt
lang: text
---
warning LangGraphDeprecatedSinceV11: Accessing GraphOutput via `result[key]` is deprecated. Use `result.value` to access the output value directly, or `result.interrupts` for interrupts. Deprecated in LangGraph V1.1 to be removed in V3.0.
```

另外还有三处变化没有警告，旧代码会读错：

- **递归上限。** 旧建议说是 25。在锁定版本上，`StateGraph` 在 10007 步停止，`create_agent` 在 9999 步。[第 6.8 节](#s-error-handlers-node-timeouts-and-the-recursion-limit)给出了两者。
- **`Interrupt`。** 字段 `ns`、`when` 和 `resumable` 没有了，`interrupt_id` 在 0.6.0 让位给了 `id` {{code libs/langgraph/langgraph/types.py}}。
- **Deep Agents 0.7.0。** `create_deep_agent` 不再添加 `TodoListMiddleware`，所以 `write_todos` 不是默认工具。[第 7.4 节](#s-deep-agents-0-7)展示了默认工具集。

## 文档里的过时页面 {#s-migration-from-0-x-and-stale-advice-stale-pages-in-the-docs}

文档站点提供的是它的主分支，所以多数页面描述的是锁定版本或更新的状态。我们在保存的每个文档页面里搜索了旧名称，例如 `AgentExecutor`、`initialize_agent`、`create_react_agent`、`MultiServerMCPClient` 和 `LangGraph Platform`。前两个和旧的平台名称都没有命中。其余的只出现在迁移页和发布页，那是它们该在的地方。

在文档提交 `04d4d4a` 上，下面这些页面仍然在讲较旧的状态。每一项在本手册的冲突登记里都有条目。

| 页面 | 过时之处 | 冲突 |
|---|---|---|
| `oss/python/langchain/install` 和 `oss/python/release-policy` | 把 Python 3.10 当作下限 | D101 |
| `oss/python/releases/langchain-v1` | 带内容块的提供方列表，以及没有 `langchain.mcp` 的命名空间表 | D117 |
| 两个 v1 发布页 | `create_react_agent` 的链接指向 `langchain-classic` 里的同名函数 | D107 |
| `langsmith/faq` | 一张把 checkpointer 称为社区代码、把流式输出称为基础功能的表 | D108 |
| `langsmith/manage-prompts-programmatically` | 通过 `langchain_classic` 使用 hub，以及把提示词用管道接进模型 | D113 |
| `langsmith/trace-with-langchain` | 把 LCEL 链当作第一个示例 | D114 |
| `oss/python/deepagents/overview` | 第一段里把规划写成默认功能 | D109 |
| `oss/python/langgraph/local-server` | 旧名称 LangGraph Studio | D116 |

## 旧 notebook 与教程 {#s-migration-from-0-x-and-stale-advice-old-notebooks-and-tutorials}

notebook 或教程运行在作者锁定的版本上。`langchain>=0.3.9` 这样的下限，会让 pip 安装 1.5.0，于是代码运行在作者从未测试过的版本线上。先读锁文件，再在显示警告的情况下运行代码。上面的搬家导入表给出了每个旧名称的修法。

其中两个旧名称在锁定版本上仍可导入，并会发出警告。`NodeInterrupt` 警告它已弃用，并指向 `interrupt` {{code libs/langgraph/langgraph/errors.py}}。从 `langgraph.constants` 导入 `Send` 会发出警告，并指向 `langgraph.types` {{code libs/langgraph/langgraph/constants.py}}。

`compile` 上的静态 `interrupt_before` 并不过时，因为 `compile` 仍然接受它 {{code libs/langgraph/langgraph/graph/state.py}}。先教 `interrupt()`，把 `interrupt_before` 留给调试。

```takeaways
- 迁移 0.x 代码之前，先在锁文件里固定每个包。
- 只在用 create_agent 替换它们的过程中，才从 langchain_classic 导入旧链。
- 把 prompt 改名为 system_prompt，并把钩子搬进中间件。
- 显示警告运行，并修掉每个 LangGraphDeprecatedSinceV10 和 V11 警告。
- 复制 notebook 的代码之前，先查它锁定的版本。
- 升级每个次版本前，先读它的更新日志。
```

来源：capture/out/31-durability.txt, capture/out/24-stream-v2.txt; libs/langchain/langchain_classic/chains/llm.py, libs/langchain/langchain_classic/hub.py, libs/langchain/langchain_classic/agents/initialize.py, and libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/errors.py, libs/langgraph/langgraph/constants.py, libs/langgraph/langgraph/graph/state.py, libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py, and libs/checkpoint/langgraph/checkpoint/memory/__init__.py at langgraph 1.2.22; the GitHub releases langchain==0.3.30, langchain-core==0.3.86, langchain-core==1.7.0, langchain==1.5.0, and deepagents==0.7.0; docs.langchain.com at docs commit 04d4d4a (oss/python/migrate/langchain-v1, oss/python/migrate/langgraph-v1, oss/python/release-policy, oss/python/releases/changelog, and the pages in the stale table).
