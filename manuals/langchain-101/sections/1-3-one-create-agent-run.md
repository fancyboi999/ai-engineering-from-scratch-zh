# 一次 create_agent 运行，从 invoke 到最后一个检查点

> 对 `create_agent` 的 agent 做一次 `invoke`，会运行四个图步骤，做两次模型调用和一次工具调用，带 checkpointer 时保存五个检查点。

你用一个问题调用 `agent.invoke`，拿回四条消息。回复看起来像是和模型的一次交流。在它背后，一张图运行了四个步骤，模型运行了两次，一个工具运行了一次。之后某次运行失败时，错误会点名其中一个步骤，所以你需要知道它们的顺序。

读完本节，你能说出一次 agent 运行的每个步骤，以及每一步之后的状态。你还能说出 checkpointer 在每一步保存什么，以及追踪记录什么。

## 这次运行 {#s-one-create-agent-run-the-run}

[第一次运行](#s-front)里的 agent 有一个工具 `add`，系统提示词是 `You add numbers.`。它的模型是 Ollama 上的 Qwen3 4B。它用 2 和 3 调用了 `add`，然后给出回答。下面是运行结束时的状态：

```listing
title: 一次运行的最终状态
source: capture/out/06-agent-run.txt
lang: json
note: 键列表和每条回复的元数据被截掉了。四条消息全部展示。
---
  {
    "type": "HumanMessage",
    "content": "What is 2 + 3?",
    "id": "<uuid-1>"
  },
  {
    "type": "AIMessage",
    "content": "",
    "id": "lc_run--<uuid-2>-0",
    "tool_calls": [
      {
        "name": "add",
        "args": {
          "a": 2,
          "b": 3
        },
        "id": "<uuid-3>",
        "type": "tool_call"
      }
    ],
…
  {
    "type": "ToolMessage",
    "content": "5",
    "name": "add",
    "id": "<uuid-4>",
    "tool_call_id": "<uuid-3>",
    "status": "success"
  },
  {
    "type": "AIMessage",
    "content": "2 + 3 = 5.",
    "id": "lc_run--<uuid-5>-0",
```

状态里只有一个键 `messages`，系统提示词不在其中。两条模型回复的 id 以 `lc_run--` 开头，因为 LangChain 把每次模型输出所属运行的 id 给了它。人类消息和工具消息在图添加它们时得到一个普通的 UUID。工具调用 id 也是 UUID，因为 `ChatOllama` 为每次调用生成一个。每条回复还带着来自 Ollama 的 `response_metadata` 和 `usage_metadata`，里面是该次调用的 token 数。

## 模型收到了什么 {#s-one-create-agent-run-what-the-model-received}

工具包用一个回调处理器记录每次调用。模型运行了两次，两次调用都先收到系统提示词，并绑定了同一个工具：

```listing
title: 两次模型调用
source: capture/out/06-agent-run.txt
lang: json
note: 截取消息和绑定的工具。模型标签被截掉了。
---
    "call": 1,
    "messages": [
      "system: You add numbers.",
      "human: What is 2 + 3?"
    ],
    "tools": [
      "add"
    ]
…
    "call": 2,
    "messages": [
      "system: You add numbers.",
      "human: What is 2 + 3?",
      "ai: calls add",
      "tool: 5"
    ],
```

所以 agent 在每次调用里都发送整段对话，并把系统提示词加到每个请求的最前面。[第 3.5 节](#s-the-system-prompt)解释为什么提示词不放在状态里。

## 逐步看 {#s-one-create-agent-run-step-by-step}

[图](#fig-1-3)画出这次运行。这个列表里的编号与图中的行相对应。

```figure
id: fig-1-3
kind: sequence
title: 一次 create_agent 运行，逐步展开
claim: model 节点运行两次，tools 节点运行一次，checkpointer 在输入之后和四个步骤之后各保存一次状态。
caption: 从上到下阅读各行。每个青绿色箭头是一个检查点，带着它的步骤编号。每个检查点下方的琥珀色注释是接下来运行的节点。右侧的小标签是每个检查点里的消息，粗体标签是这一步新增的。来源：capture/out/06-agent-run.txt、capture/out/05-agent-graph.txt 和 capture/out/30-state-history-forks.txt。
```

1. `invoke` 把输入送到图上。有 checkpointer 时，LangGraph 保存输入检查点，步骤为 `-1`。
2. `__start__` 节点把人类消息写进 `messages`。步骤 `0` 的检查点说明下一个节点是 `model`。
3. `model` 节点加上系统提示词，绑定工具，并调用模型。模型用一次工具调用作答。步骤 `1` 的检查点说明下一个节点是 `tools`。
4. `tools` 节点运行 `add(a=2, b=3)`，并追加一条 `ToolMessage`，它的 `tool_call_id` 就是那次调用的 id。步骤 `2` 的检查点说明下一个节点是 `model`。
5. `model` 节点带着全部三条消息再次调用模型。模型用文本作答，没有工具调用。
6. `model` 之后的边看到没有工具调用，就走向 `__end__`。步骤 `3` 的检查点没有下一个节点，`invoke` 返回状态。

编译后的图里的边说的是同一件事。从 `model` 出去的两条边是条件边，由工具调用在它们之间做选择：

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

没有工具的图没有 `tools` 节点。它只有 `__start__`、`model` 和 `__end__`，运行一次模型调用。

[图](#fig-1-3c)根据编译后的图返回的 Mermaid 文本，画出这个 agent 的图。[第 4.1 节](#s-create-agent-and-the-graph-it-builds)展示如何画你自己的图。

```figure
id: fig-1-3c
kind: structure
title: 这次运行里 agent 的图
claim: 一条普通边通向 model，三条条件边从 model 和 tools 出发，所以运行在运行时才选定路径。
caption: 从顶部的 __start__ 开始读。实线箭头是普通边，琥珀色虚线箭头是条件边。tools 节点列出它唯一的工具。来源：capture/out/48-draw-agent.txt。
```

## 检查点 {#s-one-create-agent-run-the-checkpoints}

**检查点：** 一个线程在某一步之后保存的状态，带着步骤编号、下一个节点，以及它之前那个检查点的 id。

上面那次运行没有 checkpointer。工具包在另外两个场景里用 `InMemorySaver` 运行同样形状的 agent。其中一个问了 `What is 2 + 3?`，然后在同一个线程上问了第二个问题。两轮之后，线程里有 8 个检查点，最后一个是步骤 6：

```listing
title: 两轮之后的线程
source: capture/out/28-checkpoint-memory.txt
lang: text
note: 截取最后一个检查点的步骤和数量。
---
  "step": 6,
  "source": "loop",
…
8 checkpoints
```

第一轮保存了步骤 `-1` 到 `3`，共五个检查点。第二轮保存了步骤 `4` 到 `6`。它只做了一次模型调用，因为模型没有用工具就作答了。

另一个场景让 `charge` 工具扣 10，并按从新到旧的顺序读回历史。它的步骤与上面的列表逐一对应：

```listing
title: 一轮的历史，从新到旧
source: capture/out/30-state-history-forks.txt
lang: json
note: 截取每个检查点的步骤、来源和下一个节点。id 和消息被截掉了。
---
  "step": 3,
  "source": "loop",
  "next": [],
…
  "step": 2,
  "source": "loop",
  "next": [
    "model"
  ],
…
  "step": 1,
  "source": "loop",
  "next": [
    "tools"
  ],
…
  "step": 0,
  "source": "loop",
  "next": [
    "model"
  ],
…
  "step": -1,
  "source": "input",
  "next": [
    "__start__"
  ],
```

`next` 指向某个节点的检查点，是运行可以停下并恢复的地方。第 5 部分说明每个检查点何时写入，以及两个检查点之间的崩溃会重复什么。

## 同一次运行的流 {#s-one-create-agent-run-the-stream-of-the-same-run}

每张编译后的 `StateGraph` 都有默认流模式 `updates`，agent 也是其中之一 {{code libs/langgraph/langgraph/graph/state.py}}。所以不带模式的 `agent.stream(input)` 为每一步产出一个块，以运行的节点为键：

```listing
title: 不带模式的流所产出的块
source: capture/out/21-stream-updates-values.txt
lang: json
note: 文件的最后一部分。每个块都截成它的键。
---
chunk 0 keys:
[
  "model"
]

chunk 1 keys:
[
  "tools"
]

chunk 2 keys:
[
  "model"
]
```

三次节点运行，三个块。`__start__` 步骤不产出块。第 5 部分展示其他流模式。

## 追踪 {#s-one-create-agent-run-the-trace}

开启追踪后，LangChain 为每一份工作向 LangSmith 发送一条运行记录。工具包把同一个 agent 包进一个本地追踪，并记录客户端本来会发送的内容：

```listing
title: 一次被追踪的 agent 轮次所产生的运行
source: capture/out/42-langsmith.txt
lang: text
note: 截取请求计数和运行树，它们位于文件的第 82 到 99 行。
---
  "PATCH /runs/<run-id>": 7,
  "POST /runs": 7
}

chain agent_turn
  chain LangGraph
    chain model
      llm ChatOllama
    chain tools
      tool add
    chain model
      llm ChatOllama
```

这棵树有八个运行。最外层的 `agent_turn` 是工具包里的 `traceable` 函数，它留在内存里。它下面的七个 LangChain 运行，开始时各收到一次 `POST`，结束时各收到一次 `PATCH`。[图](#fig-1-3b)画出这棵树。图的每个节点是一个 `chain` 运行，模型调用和工具调用是叶子。

```figure
id: fig-1-3b
kind: tree
title: 一次被追踪的 agent 轮次所产生的运行
claim: 一次被追踪的轮次是一棵运行树，每个图节点对应一个 chain 运行，每次模型调用和工具调用各对应一个叶子。
caption: 从顶部的根开始读。每个方框是一个运行，运行类型之上写着它的名字。紫色的根留在内存里，客户端收到它下面的七个运行。梅红色的叶子是模型调用，绿色的叶子是工具调用。来源：capture/out/42-langsmith.txt。
```

## 递归上限 {#s-one-create-agent-run-the-recursion-limit}

每个步骤都计入这次运行的递归上限。`create_agent` 在编译后的图上把这个上限设为 9999，略低于其他图的 LangGraph 默认值 10007：

```listing
title: 编译后 agent 上的配置
source: capture/out/05-agent-graph.txt
lang: json
note: 编译后的图的配置，取自同一个文件。
---
{
  "recursion_limit": 9999,
  "metadata": {
    "ls_integration": "langchain_create_agent"
  },
  "configurable": {}
}
```

一个永不停止地要求工具的模型，会一直运行到上限。工具包让 Qwen3 4B 用 `add` 一直往上数，永不停止。配置里设 `recursion_limit=6` 时，运行在三次模型调用和两次工具调用之后停止，错误是 `GraphRecursionError: Recursion limit of 6 reached without hitting a stop condition.`。

**我们测得**一个循环的 agent，在 x86 服务器客户机上。用 Qwen3 4B 时，它做了 121 次模型调用，脚本在 1200 秒时把它停掉，而它没有任何要停的迹象。`recursion_limit=25` 让它在 13 次模型调用之后停下，3 次运行里 3 次如此。设一个适合你任务的上限，因为循环会为它做的每一次模型调用付费。

```takeaways
- 预期模型在每次调用里都会收到系统提示词和整段对话。
- 读检查点上的 next，就知道恢复时哪个节点会运行。
- 需要保存各步骤时，传入 checkpointer 和 thread_id。
- 不带模式地流式输出，就为每次节点运行得到一个块。
- 为每次运行设置 recursion_limit，因为 9999 步的默认值允许约 5000 次模型调用。这是算术，不是一次运行。
```

来源： capture/out/06-agent-run.txt, capture/out/05-agent-graph.txt, capture/out/48-draw-agent.txt, capture/out/28-checkpoint-memory.txt, capture/out/30-state-history-forks.txt, capture/out/21-stream-updates-values.txt, capture/out/46-recursion-agent.txt, capture/out/42-langsmith.txt; capture/lab/summary/recursion-x86.json, capture/lab/T17-claims-x86/01-claims.jsonl, capture/lab/T17-claims-x86/02-nolimit.jsonl, capture/lab/summary/recursion-mac.json, capture/lab/T17-claims-mac/01-recursion-limit.jsonl; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0, libs/langgraph/langgraph/graph/state.py and libs/langgraph/langgraph/_internal/_config.py at langgraph 1.2.22.
