# create_agent 与它构建的图

> `create_agent` 编译出一个 LangGraph 图：有一个 `model` 节点；有工具时有一个 `tools` 节点；每个中间件钩子各有一个节点；递归上限是 9999。

你把一个模型、两个工具和一个 prompt 传给 `create_agent`，得到一个带 `invoke` 和 `stream` 的对象。它看起来像个聊天辅助函数。其实它是一个编译好的 LangGraph 图，agent 的每个错误、每个流块和每个检查点，都会指名它的某个节点。

读完本节，你能说出 `create_agent` 的每个参数增加了哪个节点，以及它们之间的循环何时停止。你还能读出编译后图上的默认值，并说清 agent 这一层的开销。

## create_agent 接受什么 {#s-create-agent-and-the-graph-it-builds-what-create-agent-takes}

**create_agent：** `langchain.agents` 里的函数，把模型、工具、prompt 和中间件变成一个 `CompiledStateGraph`。

锁定版本上的签名有两个位置参数和十三个关键字参数 {{code libs/langchain_v1/langchain/agents/factory.py}}。下表列出每个参数对图改变了什么：

| 参数 | 默认值 | 改变了什么 |
|---|---|---|
| `model` | 必填 | 字符串会经过 `init_chat_model`。模型从 `model` 节点被调用。 |
| `tools` | `None` | 函数和 `BaseTool` 对象在 `tools` 节点里运行。`dict` 是提供方工具，它绑定到模型上，图从不运行它。 |
| `system_prompt` | `None` | 字符串变成 `SystemMessage`。每次模型调用时它放在消息前面，并且不进入状态。 |
| `middleware` | `()` | 每个中间件的每个钩子变成一个节点或一个包装器。中间件还可以添加工具和状态键。 |
| `response_format` | `None` | 一个 schema 会添加结构化输出工具或提供方格式。[第 4.2 节](#s-structured-output-autostrategy-providerstrategy-toolstrategy)解释这两种。 |
| `state_schema`、`context_schema` | `None` | 状态类型，以及每次运行的 `context` 类型。 |
| `checkpointer`、`store` | `None` | 每个线程的已保存状态，以及长期记忆。第 5 部分讲这两者。 |
| `interrupt_before`、`interrupt_after` | `None` | 在指定节点之前或之后的静态暂停。 |
| `name`、`debug`、`cache`、`transformers` | `None`、`False`、`None`、`None` | 图的名称、调试输出、节点缓存和流转换器。 |

[第 3.2 节](#s-init-chat-model-and-model-profiles)展示模型字符串如何解析。[第 3.5 节](#s-the-system-prompt)说明 prompt 为什么不进入状态。

## 节点 {#s-create-agent-and-the-graph-it-builds-the-nodes}

工具包用一个工具、不带中间件，构建了[第 1.3 节](#s-one-create-agent-run)的 agent。编译后的图有四个节点：

```listing
title: 带一个工具的 agent 的节点
source: capture/out/05-agent-graph.txt
lang: json
---
[
  "__start__",
  "model",
  "tools",
  "__end__"
]
```

只有当 agent 有工具可运行，或者有带 `wrap_tool_call` 钩子的中间件时，才有 `tools` 节点 {{code libs/langchain_v1/langchain/agents/factory.py}}。没有工具时，同样的调用构建出三个节点：

```listing
title: 没有工具的 agent 的节点
source: capture/out/05-agent-graph.txt
lang: json
---
[
  "__start__",
  "model",
  "__end__"
]
```

中间件会增加节点。每个 `before_agent`、`before_model`、`after_model` 和 `after_agent` 钩子都变成一个节点，以中间件和钩子命名。工具包加入三个中间件，名为 `A`、`B` 和 `C`，每个都带全部钩子：

```listing
title: 带三个中间件的节点
source: capture/out/09-middleware-order.txt
lang: json
note: B 和 C 的节点已截去。它们遵循同样的模式。
---
[
  "__start__",
  "model",
  "tools",
  "A.before_agent",
  "A.before_model",
  "A.after_model",
  "A.after_agent",
…
  "__end__"
]
```

`wrap_model_call` 和 `wrap_tool_call` 钩子不增加节点。它们在 `model` 节点和 `tools` 节点内部运行。[第 4.5 节](#s-middleware-hooks-and-their-order)给出六个钩子的顺序。[图](#fig-4-1)把每个参数对应到它构建的那部分图。

```figure
id: fig-4-1
kind: structure
title: create_agent 的每个参数构建了什么
claim: 工具构建 tools 节点，中间件构建钩子节点和包装器，prompt 和响应格式改变每一次模型调用，而没有自己的节点。
caption: 从上往下读这三张图。每一张都向 create_agent 多加一个参数。实线边只有一个下一节点，琥珀色虚线边在运行时选择下一节点。来自 capture/out/05-agent-graph.txt 和 capture/out/09-middleware-order.txt。
```

## 状态 {#s-create-agent-and-the-graph-it-builds-the-state}

**AgentState：** 每个 agent 的状态类型，有 `messages`、`jump_to` 和 `structured_response` 三个键。

`messages` 使用 `add_messages` reducer，所以每个节点按 id 追加或替换消息。`jump_to` 是私有的，只持续一步。中间件设置它，可以让运行跳到 `model`、`tools` 或结束。`structured_response` 在输出里，从不在输入里 {{code libs/langchain_v1/langchain/agents/middleware/types.py}}。中间件可以加自己的键，发生冲突时以你传入的 `state_schema` 为准。

## 循环与它何时停止 {#s-create-agent-and-the-graph-it-builds-the-loop-and-when-it-stops}

`model` 之后的边是条件边：

```listing
title: agent 图的边
source: capture/out/05-agent-graph.txt
lang: json
---
[
  "__start__ -> model",
  "model -> __end__ (conditional)",
  "model -> tools (conditional)",
  "tools -> model (conditional)"
]
```

每次模型调用之后，边函数按下面的顺序读取状态 {{code libs/langchain_v1/langchain/agents/factory.py:1991-2042}}：

1. 中间件设置的 `jump_to` 值优先。
2. 状态里没有 AI 消息，运行结束。
3. AI 消息没有工具调用，运行结束。
4. 还没有结果的工具调用去往 `tools`，每个调用各作为一个 `Send`，所以并行调用作为并行任务运行。
5. 出现新的 `structured_response`，运行结束。
6. 否则运行回到 `model`。

结构化输出的工具调用不会发给 `tools`，而是由 `model` 节点处理，如[第 4.2 节](#s-structured-output-autostrategy-providerstrategy-toolstrategy)所示。没有工具、使用 `ToolStrategy` 或 `AutoStrategy` 的 agent，用一条 `model` 到 `model` 的边代替 `tools` 节点。这条边先检查 `jump_to`，再检查新的 `structured_response`，否则就循环 {{code libs/langchain_v1/langchain/agents/factory.py:2045-2068}}。没有工具且使用 `ProviderStrategy` 时，`model` 节点直接走向结束 {{code libs/langchain_v1/langchain/agents/factory.py:1790-1803}}。

## 画出你的图 {#s-create-agent-and-the-graph-it-builds-draw-your-graph}

你构建了一个 agent，想在运行前看看它的图。编译后的图可以描述自己，不需要模型调用，也不需要运行。

**get_graph()：** 编译后的图的方法，返回 `langchain_core` 里的 `Graph` 对象，包含它的节点和边 {{code libs/langgraph/langgraph/pregel/main.py}}。

```listing
title: get_graph() 返回的节点
source: capture/out/48-draw-agent.txt
lang: json
note: 只保留 tools 节点。其他节点没有元数据。
---
graph.nodes:
{
…
  "tools": {
    "name": "tools",
    "data": "ToolNode",
    "metadata": {
      "__tools": [
        "add"
      ]
    }
  },
…
}
```

每个节点保存着运行它的对象，例如 `tools` 的 `ToolNode`。每条边有一个 `conditional` 标志。`tools` 节点把它的工具名保存为元数据。

**draw_mermaid()：** `Graph` 的方法，把图作为 Mermaid 流程图文本返回。它不需要额外的包，也不需要网络 {{code libs/core/langchain_core/runnables/graph_mermaid.py}}。

```listing
title: 带一个工具的 agent 的 draw_mermaid()
source: capture/out/48-draw-agent.txt
lang: text
---
graph TD;
	__start__([<p>__start__</p>]):::first
	model(model)
	tools(tools<hr/><small><em>__tools = add</em></small>)
	__end__([<p>__end__</p>]):::last
	__start__ --> model;
	model -.-> __end__;
	model -.-> tools;
	tools -.-> model;
	classDef default fill:#f2f0ff,line-height:1.2
	classDef first fill-opacity:0
	classDef last fill:#bfb6fc
```

节点行给出一个 id 和一个标签。`:::first` 标记 `__start__`，`:::last` 标记 `__end__`。带 `-->` 的边行是普通边，带 `-.->` 的是条件边。[图](#fig-4-1b)把每一行对应到绘制出的图上。本手册里的每张图，都是根据这样的文本绘制的，文本取自编译后的图。

```figure
id: fig-4-1b
kind: structure
title: 从 draw_mermaid 的各行到一幅图
claim: draw_mermaid 的每条节点行变成一个节点，每条边行变成一个箭头，--> 是实线，-.-> 是虚线。
caption: 把左边带编号的节点行对应到右边带编号的节点。每条边行显示它变成的箭头样式。来自 capture/out/48-draw-agent.txt。
```

**xray：** `get_graph` 的参数，会展开每个子图节点，把子图里的节点画在一个框内。`True` 展开每一层，整数则展开那么多层 {{code libs/langgraph/langgraph/pregel/main.py}}。

一个带一个子图的父图能显示两者的差别。`get_graph()` 把子图给成一个节点 `inner`。`get_graph(xray=True)` 则给出子图的两个节点来代替它：

```listing
title: xray=True 时父图的节点
source: capture/out/52-draw-subgraph.txt
lang: json
---
[
  "__start__",
  "prepare",
  "finish",
  "__end__",
  "inner:shout",
  "inner:ask_ok"
]
```

[第 6.7 节](#s-subgraphs-and-multi-agent-patterns)用两种方式画出这个父图。`create_agent` 产生的 agent 没有子图节点，所以 `xray` 不会改变它的图。

**draw_ascii()：** `Graph` 的方法，把图画成文本。它需要 `grandalf` 包，而 `langchain-core` 不会安装它 {{code libs/core/langchain_core/runnables/graph_ascii.py:205}}。工具包的锁定版本里没有它，所以这个调用会抛出异常：

```listing
title: 锁定版本上的 draw_ascii()
source: capture/out/48-draw-agent.txt
lang: text
---
draw_ascii():

raised builtins.ImportError: Install grandalf to draw graphs: `pip install grandalf`.
```

想在终端里看到图，就在你自己的环境里安装 `grandalf`。

**draw_mermaid_png()：** `Graph` 的方法，把 Mermaid 文本变成 PNG 图片。它默认的绘制方法是 API 方法：

```listing
title: 锁定版本上 draw_mermaid_png() 的默认值
source: capture/out/48-draw-agent.txt
lang: json
---
keyword defaults:
{
  "draw_method": "api",
  "base_url": null,
  "max_retries": 1,
  "output_file_path": null
}
```

API 方法把整段 Mermaid 文本编码成 base64，放进发往公共渲染服务的 GET 请求的 URL 里 {{code libs/core/langchain_core/runnables/graph_mermaid.py:463-501}}。因此，你的节点名、工具名和节点元数据会通过这个 URL 离开你的机器。名称属于私有信息的图，不要调用这个默认方法。

`base_url` 把同样的请求发给你自己运行的 Mermaid 服务器 {{code libs/core/langchain_core/runnables/graph_mermaid.py:463}}。`PYPPETEER` 方法借助 `pyppeteer` 包，在本地的无头浏览器里渲染。这个页面仍然从公共内容分发网络加载 Mermaid 脚本，所以也需要网络 {{code libs/core/langchain_core/runnables/graph_mermaid.py:389-393}}。工具包两种方法都没有调用。它只录制 Mermaid 文本，本手册的图就是离线地画这些文本。

## 并行工具调用与 max_concurrency {#s-create-agent-and-the-graph-it-builds-parallel-tool-calls-and-max-concurrency}

**max_concurrency：** 运行配置里的键，限制同一步里同时运行的任务数。

**我们测得**并行工具调用，在 32 vCPU 的 x86 服务器客户机上进行。让 Qwen3 4B 做 1 到 16 个并行调用，它发出了 2、2、4、8、16 个。ToolNode 的各格用它的真实回复，各跑 5 次。`create_agent` 在每次运行里都调用模型，要求 8 个调用，各跑 3 次。工具在 PostgreSQL 上运行 200 ms 的 `pg_sleep`。

| `ToolNode` 与调用方式 | 16 个调用，上限 1 | 16 个调用，上限 8 | 16 个调用，无上限 |
|---|---|---|---|
| `invoke`，同步工具 | 3,331.0 ms，同时 1 个 | 460.0 ms，同时 8 个 | 264.2 ms，同时 16 个 |
| `ainvoke`，异步工具 | 233.7 ms，同时 16 个 | 233.1 ms，同时 16 个 | 233.7 ms，同时 16 个 |
| `ainvoke`，同步工具 | 267.1 ms，同时 16 个 | 266.5 ms，同时 16 个 | 269.2 ms，同时 16 个 |

| `create_agent` 与调用方式 | 8 个调用，上限 1 | 8 个调用，上限 4 | 8 个调用，无上限 |
|---|---|---|---|
| `invoke`，同步工具 | 1,674.0 ms，同时 1 个 | 437.2 ms，同时 4 个 | 229.2 ms，同时 8 个 |
| `ainvoke`，异步工具 | 1,668.7 ms，同时 1 个 | 421.9 ms，同时 4 个 | 210.5 ms，同时 8 个 |
| `ainvoke`，同步工具 | 1,669.7 ms，同时 1 个 | 431.0 ms，同时 4 个 | 231.2 ms，同时 8 个 |

每个 `ToolNode` 格给出的是总耗时的中位数，以及同一时刻运行的最大调用数。每个 `create_agent` 格给出的是从第一个工具开始到最后一个工具结束的中位耗时。带上模型，一次完整运行用时 12 到 14 秒。每次成功的运行，每个调用只执行一次，并为它写下一条 `ToolMessage`。

`create_agent` 在每种模式下都应用了上限，因为每个调用都是它自己的 `Send` 任务。没有上限时，同步工具在线程池里运行。Python 默认线程池的大小是 min(32, cpu+4)。在 10 核的 Mac 上是 14，在客户机上是 32，16 个同步调用在客户机上同时运行，耗时 264 ms。

`max_concurrency` 键也决定这个线程池的大小，所以高于默认值的取值会让线程池变大 {{code libs/core/langchain_core/runnables/config.py:659-675}}。`ainvoke` 下的异步工具没有默认上限。只有异步函数体的工具，在 `invoke` 下抛出了 `NotImplementedError`：125 个 ToolNode 行中有 125 个，9 次 agent 运行中有 9 次。

纯 `ToolNode` 在 `ainvoke` 下无视这个上限，异步工具和同步工具都是。langgraph#8517 报告了异步的情形 {{issue langgraph#8517}}。我们的运行复现了它，并显示异步路径上的同步工具也受影响。在 `invoke` 下，`ToolNode` 应用了上限。工具要调用有限流的服务时，请在运行上设置 `max_concurrency`；需要 `ainvoke` 下的上限时，请使用 `create_agent`。

## 编译后图上的默认值 {#s-create-agent-and-the-graph-it-builds-the-defaults-on-the-compiled-graph}

`create_agent` 在返回图之前，先在图上设置了一份配置：

```listing
title: 每个 agent 的配置和流模式
source: capture/out/05-agent-graph.txt
lang: text
note: 只保留配置、流模式和类型。
---
agent.config:
{
  "recursion_limit": 9999,
  "metadata": {
    "ls_integration": "langchain_create_agent"
  },
  "configurable": {}
}

agent.stream_mode = 'updates'
type langgraph.graph.state.CompiledStateGraph
```

9999 步的上限适用于每个没有传入自己 `recursion_limit` 的运行。默认的流模式是 `updates`，所以不指定模式的流，会为每个运行过的节点产出一个块。[第 1.3 节](#s-one-create-agent-run)让一个 agent 运行到这个上限，并展示了这些块。设置 `name` 还会向元数据加上 `lc_agent_name`。

## agent 这一层的开销 {#s-create-agent-and-the-graph-it-builds-what-the-agent-layer-costs}

**我们测得**一个任务，在 Mac 上进行：两个工具和三次模型调用，对着 Ollama 上的 Qwen3 4B，每种变体打乱顺序各跑 40 次。朴素 `openai` 循环和 `create_agent` 发送同样的工具 schema，每次运行都得到同样的答案。代理给每次模型调用计时，模型之外的时间就是这次运行的其余部分。

| 变体 | 模型之外的时间，中位数 | 同一轮里比朴素循环多出的 |
|---|---|---|
| 朴素 `openai` 循环 | 25.1 ms | 基线 |
| `ChatOpenAI.bind_tools` 循环 | 29.3 ms | 6.6 ms |
| `create_agent` | 37.6 ms | 15.6 ms |
| 带 `InMemorySaver` 的 `create_agent` | 37.6 ms | 12.2 ms |
| 手工搭建的 `StateGraph` | 36.7 ms | 11.5 ms |

agent 这一层为每次模型调用增加了约 5 ms。用 `create_agent` 时，一次 1.8 秒的运行里有 2.3% 的时间在模型之外。[第 8.3 节](#s-cost-the-framework-against-a-plain-sdk-loop)给出完整的成本分析，包括 token、请求字节数和导入时间。

```takeaways
- 只有 agent 有工具，或有 wrap_tool_call 中间件时，才会有 tools 节点。
- 读 A.before_model 这样的节点名，找出运行过的中间件钩子。
- 每次运行都传入 recursion_limit，因为 agent 的默认值是 9999 步。
- 不指定模式地流式输出，得到 updates，这是每个 agent 的默认值。
- 为每次模型调用预算约 5 ms 的 agent 开销，它远低于模型耗时。
- 要限制 create_agent 的并行工具调用，在运行上设置 max_concurrency；对 ainvoke 下的纯 ToolNode，这个设置不起作用。
- agent 在 invoke 下运行时，给每个工具提供同步函数体。
- 用 draw_mermaid 画图，因为 draw_mermaid_png 会把图的文本发送给公共服务。
```

来源：capture/out/05-agent-graph.txt, capture/out/09-middleware-order.txt, capture/out/48-draw-agent.txt, capture/out/52-draw-subgraph.txt, capture/s_draw.py; capture/lab/summary/parallel-tools-x86.json, capture/lab/T08-parallel-tools-x86/01-counts.jsonl, capture/lab/T08-parallel-tools-x86/04-toolnode.jsonl, capture/lab/T08-parallel-tools-x86/05-agent.jsonl, capture/lab/T08-parallel-tools-x86/t08_real.py; issue langgraph#8517; capture/lab/summary/overhead-mac-real.json, capture/lab/T01-overhead-mac-real/01-runs.jsonl, capture/lab/T01-overhead-mac-real/t01_real.py; libs/langchain_v1/langchain/agents/factory.py and libs/langchain_v1/langchain/agents/middleware/types.py, libs/core/langchain_core/runnables/config.py at langchain==1.5.0; libs/langgraph/langgraph/graph/state.py and libs/langgraph/langgraph/pregel/main.py at langgraph 1.2.22; libs/core/langchain_core/runnables/graph.py, libs/core/langchain_core/runnables/graph_mermaid.py, and libs/core/langchain_core/runnables/graph_ascii.py at langchain-core 1.8.0.
