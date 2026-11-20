# 内置中间件

> `langchain` 1.5.0 有 19 个中间件类，每个都建立在六个钩子中的一两个之上；文档还另列了三个来自 Deep Agents 的中间件。

你需要限制模型调用次数、给不稳定的工具加重试，还要在发邮件之前加一道审查步骤。每一项都是 `langchain.agents.middleware` 里的一个类，其中有些类的默认值做的事，比它们的名字所暗示的要少。

读完本节，你能为一个需求选出内置中间件，说出它用哪个钩子，并指出要紧的那个默认值。你还能找到本手册里测试它的那一节。

## 锁定版本上的 19 个类 {#s-the-built-in-middleware-the-19-classes-at-the-pin}

**内置中间件（built-in middleware）：** `langchain` 包从 `langchain.agents.middleware` 导出的中间件类。

这个包从该模块导出 50 个名称。其中 19 个是中间件类 {{code libs/langchain_v1/langchain/agents/middleware/__init__.py}}。下表列出每一个，以及它的钩子和你必须知道的默认值：

| 类 | 钩子 | 它做什么，以及要紧的默认值 | 小节 |
|---|---|---|---|
| `SummarizationMiddleware` | `before_model` | 用第二个模型生成的摘要替换旧消息。默认 `trigger=None` 时它永远不会运行。 | [5.5](#s-context-engineering-and-summarization) |
| `ContextEditingMiddleware` | `wrap_model_call` | 用 `ClearToolUsesEdit` 从请求里清除旧的工具结果。状态仍保留它们。 | 本节 |
| `HumanInTheLoopMiddleware` | `after_model`、`wrap_tool_call` | 对指定的工具暂停，等人做决定。默认模式是 `batched`。 | [6.5](#s-human-in-the-loop-batched-and-per-call) |
| `ModelCallLimitMiddleware` | `before_model`、`after_model` | 按每次运行或每个线程的模型调用次数停止。默认 `exit_behavior` 是 `end`。 | 本节 |
| `ToolCallLimitMiddleware` | `after_model` | 限制工具调用，可针对一个工具或全部工具。默认 `exit_behavior` 是 `continue`。 | 本节 |
| `ToolRetryMiddleware` | `wrap_tool_call` | 再次运行失败的工具，默认共 3 次尝试，任何异常都重试。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `ModelRetryMiddleware` | `wrap_model_call` | 出错后再次调用模型，默认共 3 次尝试。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `ModelFallbackMiddleware` | `wrap_model_call` | 模型抛出异常时，调用列表里的下一个模型。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `ModelRefusalMiddleware` | `wrap_model_call` | 回复是拒绝块时抛出 `ModelRefusalError`。 | [4.7](#s-retries-backup-models-rate-limits-and-caching) |
| `ToolErrorMiddleware` | `wrap_tool_call` | 把工具内部的异常变成一条错误的 `ToolMessage`。它需要 `on_error`。 | [3.4](#s-tools-toolruntime-and-tool-errors) |
| `PIIMiddleware` | `before_model`、`after_model` | 找出一种个人数据，并加以脱敏、遮盖、哈希或拦截。默认只处理输入。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| `ModelRouterMiddleware` | `before_agent`、`wrap_model_call` | 让一个决策模型决定这次运行用哪个模型。Beta，按发布说明是 1.5.0 新增。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| `AutoModeMiddleware` | `wrap_tool_call` | 让一个决策模型判断工具调用是否有风险，并拦截它。Beta，按发布说明是 1.5.0 新增。 | [4.8](#s-guardrails-pii-and-the-decision-middleware-beta) |
| `TodoListMiddleware` | `wrap_model_call`、`after_model` | 添加 `write_todos` 工具和一段提示词，并把列表存在 `state["todos"]` 里。 | 本节 |
| `LLMToolSelectorMiddleware` | `wrap_model_call` | 在每次模型调用之前，问一个模型要绑定哪些工具，默认问的是 agent 模型本身。 | 本节、[4.4](#s-many-tools-and-the-tool-selector) |
| `LLMToolEmulator` | `wrap_tool_call` | 让模型编造工具的结果，用于测试。工具从不运行。 | 本节 |
| `ProviderToolSearchMiddleware` | `wrap_model_call` | 把工具推迟给 Anthropic 或 OpenAI 的服务端工具搜索。 | 本节 |
| `ShellToolMiddleware` | `before_agent`、`after_agent` | 添加一个 `shell` 工具，每次运行一个 shell 会话。默认在宿主机上运行。 | 本节 |
| `FilesystemFileSearchMiddleware` | 无，只有工具 | 在一个根目录下添加 `glob_search` 和 `grep_search`。 | 本节 |

[图](#fig-4-6)按所用的钩子给这些类分组。钩子告诉你一个类在哪里起作用：作用于请求、作用于结果，还是作用于步骤之间的状态。

```figure
id: fig-4-6
kind: tree
title: 按钩子分类的 19 个内置中间件类
claim: 十个内置类只包装模型调用或工具调用，八个添加自己的图节点，一个只添加工具。
caption: 从根往下读。每个分支是一种钩子，每片叶子是一个类。在节点钩子之下，每个类下面那一行写出它的全部钩子。来自 langchain==1.5.0 的 libs/langchain_v1/langchain/agents/middleware 和 capture/out/09-middleware-order.txt。
```

## 文档列出 22 个 {#s-the-built-in-middleware-the-documentation-lists-22}

预置中间件页列出 22 个与提供方无关的中间件 {{docs oss/python/langchain/middleware/built-in}}。其中 19 个是上面的类。另外三个是 `FilesystemMiddleware`、`SubAgentMiddleware` 和 `RubricMiddleware`，要从 `deepagents` 导入。该页展示了导入方式，但表格里没有标明每个中间件需要哪个包。本手册只计入 `langchain` 里有的 19 个，并把这个差异记为冲突 D130。第 7.4 节讲 Deep Agents 的中间件，下面一节测量 `RubricMiddleware`。

## 调用次数限制 {#s-the-built-in-middleware-call-limits}

`ModelCallLimitMiddleware` 用 `run_limit` 统计每次运行的模型调用，用 `thread_limit` 统计每个线程的调用。使用默认的 `exit_behavior="end"` 时，运行以一条 AI 消息结束，取代下一次模型调用：

```listing
title: 一次模型调用之后的 ModelCallLimitMiddleware(run_limit=1)
source: capture/out/11-mw-call-limits.txt
lang: json
note: 这次运行的最后一条消息。它之前的工具调用和工具结果已截去。
---
    "type": "AIMessage",
    "content": "Model call limits exceeded: run limit (1/1)",
```

使用 `exit_behavior="error"` 时，运行抛出 `ModelCallLimitExceededError`，文本相同。线程计数保存在检查点里，所以 `thread_limit` 需要 checkpointer。在 `thread_limit=2` 的线程的第三轮里，答案是 `Model call limits exceeded: thread limit (2/2)`。

`ToolCallLimitMiddleware` 统计工具调用。使用默认的 `exit_behavior="continue"` 时，超出上限的调用得到一条错误的 `ToolMessage`，其他调用照常运行：

```listing
title: 一条消息里有两个调用时的 ToolCallLimitMiddleware(tool_name='add', run_limit=1)
source: capture/out/11-mw-call-limits.txt
lang: json
note: 两条 ToolMessage。id 已截去。
---
    "type": "ToolMessage",
    "content": "Tool call limit exceeded. Do not call 'add' again.",
    "name": "add",
…
    "tool_call_id": "<uuid-10>",
    "status": "error"
  },
  {
    "type": "ToolMessage",
    "content": "2",
    "name": "add",
…
    "tool_call_id": "<uuid-9>",
    "status": "success"
```

模型在一条回复里请求了 `add(1, 1)`，即 `<uuid-9>`，和 `add(2, 2)`，即 `<uuid-10>`。第二个调用被拦截，错误消息在状态里排在前面。模型仍然回答 2 + 2 是 4，这来自它自己的算术。

使用 `exit_behavior="end"` 时，运行在这一批之后停止，消息是 `Tool call limit reached: run limit exceeded (2/1 calls).`。使用 `error` 时，它抛出 `ToolCallLimitExceededError`。`continue` 之后，模型仍然可以再次请求，也可以不用工具作答，所以成本要紧时，也要加上模型调用上限。

## 规划与上下文 {#s-the-built-in-middleware-planning-and-context}

`TodoListMiddleware` 添加 `write_todos` 工具，以及一段关于它的系统提示词。每次调用都会替换 `state["todos"]` 里的列表。工具包让 Qwen3 4B 制定计划、做加法，再把计划标为完成。它调用了 `write_todos`、`add`，然后再次调用 `write_todos`，它自己的计划有两项。运行之后，状态里留着最终的列表：

```listing
title: 运行之后的 state["todos"]
source: capture/out/17-mw-todo-context-editing.txt
lang: text
note: 输出状态的 todos 键。
---
todos:
[
  {
    "content": "Understand the task: calculate 2 + 3",
    "status": "completed"
  },
  {
    "content": "Perform the addition: 2 + 3",
    "status": "completed"
  }
]
```

带 `ClearToolUsesEdit` 的 `ContextEditingMiddleware` 把请求里旧的工具结果替换成 `[cleared]`。工具包用 `trigger=10` 和 `keep=1` 发送了三个工具结果。模型收到最新的结果和两个占位符：

```listing
title: ClearToolUsesEdit(trigger=10, keep=1) 之后模型收到的内容
source: capture/out/17-mw-todo-context-editing.txt
lang: json
---
[
  "Add three pairs: 1 + 1, 2 + 2, and 3 + 3.",
  "",
  "[cleared]",
  "",
  "[cleared]",
  "",
  "result 6 result 6 result 6 result 6 result 6 "
]
```

模型仍然答出了 2、4 和 6，因为问题里点明了这几对数。这个编辑是 `wrap_model_call` 钩子，所以它只改变请求。状态保留每一个工具结果，检查点照旧增长。[第 5.5 节](#s-context-engineering-and-summarization)把它与摘要作了比较。

## 工具选择、模拟与工具搜索 {#s-the-built-in-middleware-tool-selection-emulation-and-tool-search}

`LLMToolSelectorMiddleware` 问一个模型要绑定哪些工具。没有 `model` 参数时，它问的是 agent 模型本身 {{code libs/langchain_v1/langchain/agents/middleware/tool_selection.py:278}}。[第 4.4 节](#s-many-tools-and-the-tool-selector)测量它对准确率和成本的影响。设 `max_tools=1` 时，agent 模型在三个工具里只看到一个。每次 agent 模型调用，选择器都运行一次，所以两次模型调用的运行，一共做了四次模型调用：

```listing
title: 带 LLMToolSelectorMiddleware(max_tools=1) 的 agent 模型
source: capture/out/18-mw-selection-emulation.txt
lang: json
note: 第一次 agent 模型调用。agent 有 add、get_weather 和 send_email。
---
    "model": "agent",
    "call": 1,
    "messages": [
      "human: Weather in Pune?"
    ],
    "tools": [
      "get_weather"
    ]
```

`LLMToolEmulator` 把列出的每个工具调用发给一个模型，并把它的文本作为结果返回。工具的函数体从未运行。模拟器模型写出结果，`ToolMessage` 里是 `Email sent successfully to ops@example.com. 📩`。请传入 `model`，因为默认值是一个指名的 Anthropic 模型，而且默认值会警告它已弃用 {{code libs/langchain_v1/langchain/agents/middleware/tool_emulator.py}}。

`ProviderToolSearchMiddleware` 需要一个带服务端工具搜索的提供方。在 `ChatOllama` 上，它抛出 `ValueError`，文本是 `but got 'ollama'; supported providers: anthropic, openai`。没有可推迟的工具时，它让请求原样通过。我们没有对任何提供方运行它，这项测试会在下一版里补上。[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它。

## shell 与文件搜索 {#s-the-built-in-middleware-shell-and-file-search}

`ShellToolMiddleware` 添加一个 `shell` 工具。它在 `before_agent` 里启动一个 shell，在 `after_agent` 里停止它。工具包让 Qwen3 4B 在它的工作区里运行一条命令，共两次运行。模型从未成功运行过命令。它把命令作为对象而不是字符串发送，一共 13 次，每次调用都没通过验证：

```listing
title: 失败的 shell 工具调用
source: capture/out/19-mw-shell-files.txt
lang: json
note: 请求 ls 的那次运行的第一条 ToolMessage 的 content。
---
    "content": "Error invoking tool 'shell' with kwargs {'command': {'command': 'ls'}} with error:\n command: Input should be a valid string\n Please fix the error and try again.",
```

随后模型说，这个工具自己有问题。所以在依赖某个中间件工具之前，先用你要用的模型测试它。

没有 `execution_policy` 时，中间件使用 `HostExecutionPolicy`，它在你的机器上以你的权限运行命令 {{code libs/langchain_v1/langchain/agents/middleware/shell_tool.py}}。`DockerExecutionPolicy` 和 `CodexSandboxExecutionPolicy` 是隔离的选择。[第 8.4 节](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)讲这项风险。

`FilesystemFileSearchMiddleware` 在 `root_path` 下添加 `glob_search` 和 `grep_search`。结果里的路径从这个根开始。设 `use_ripgrep=False` 时，它在 Python 里搜索。在工具包里，用 `**/*.py` 的 `glob_search` 返回了 `/src/app.py`。全部 8 次 `grep_search` 调用都失败了，因为模型把 `include` 作为对象发送，例如 `{'pattern': '*.py'}`。在 10 次模型调用之后，它放弃了，并把责任推给工具。

## RubricMiddleware，来自 Deep Agents 的评分器 {#s-the-built-in-middleware-rubricmiddleware-a-grader-from-deep-agents}

**RubricMiddleware：** `deepagents` 的一个中间件，按评分标准给 agent 的答案打分。调用方把评分标准作为状态键 `rubric` 传入。没有评分标准时，中间件什么也不做 {{code libs/deepagents/deepagents/middleware/rubric.py}}。agent 将要结束时，评分模型读取对话记录，对每条标准给出一个裁决。`needs_revision` 裁决会让 agent 回去再来一轮。经过 `max_iterations` 轮之后，运行以 `max_iterations_reached` 结束。

**我们测得**它的表现，针对第一个测试基准里，Qwen3 8B 的朴素循环失败的那 25 个任务。worker 是 `create_agent` 里的 Qwen3 8B，带这个中间件，`max_iterations=3`。评分器是第二个 Ollama 0.31.1 上的 Qwen3 14B，在 Mac 上。

评分标准有四条。每个事实都来自某个工具结果。答案以正确的值提交了一次。每个要求的修改都做了。请求的每个部分都完成了。

每个任务运行一次。25 个任务的一格样本很小，而且这些任务正是因为朴素循环失败才被选中的。[图](#fig-4-6b)显示每一次运行。

```figure
id: fig-4-6b
kind: chart
title: RubricMiddleware 在 Qwen3 8B 朴素循环失败的 25 个任务上的表现
claim: Qwen3 14B 评分器对 14 次运行说了满意，其中 12 次运行仍未通过状态检查。
caption: 每一行是一个任务。方块按顺序给出评分器的裁决，下一列是状态检查。调用数统计 worker 的模型调用。来自 capture/lab/bench2/summary-bench2.json。
```

三个任务通过了：`r06`、`sql03` 和 `sql09`。十二次运行在第一次评审就得到 `satisfied`，其中 11 次没通过检查。十一次运行在轮数上限处结束，`r06` 是其中之一。

评分标准把 worker 的调用从 108 次增加到 173 次，把 worker 的提示词 token 从 75,987 增加到 174,192。评分器增加了 56 次调用和 113,851 个提示词 token。三轮任务 `multi13` 在每一轮里都有评分轮次，一共 9 次评分调用和 22 次 worker 调用。25 次运行总共用了 16,841 秒，纯运行是 446 秒，其中 11,379 秒是评分器的时间。这台 Mac 是共用的，所以这些时间是上限。

所以评分器的好坏取决于它的模型。14B 的评分器对状态检查没有通过的运行说了满意。依赖评分器的裁决之前，先拿你的状态检查器去核对它。

```takeaways
- 给 SummarizationMiddleware 设置 trigger，因为默认值永远不会摘要。
- 循环必须停下来时，把 ToolCallLimitMiddleware 和 ModelCallLimitMiddleware 配合使用。
- 使用 thread_limit 时，给 ModelCallLimitMiddleware 配一个 checkpointer。
- 在沙箱之外，给 ShellToolMiddleware 传入 HostExecutionPolicy 以外的 execution_policy。
- 从 deepagents 导入 FilesystemMiddleware、SubAgentMiddleware 和 RubricMiddleware，不要从 langchain 导入。
- 用状态检查器核对 RubricMiddleware 的评分器，因为 14B 的评分器接受了 12 次失败的运行。
```

来源：capture/out/09-middleware-order.txt, capture/out/11-mw-call-limits.txt, capture/out/17-mw-todo-context-editing.txt, capture/out/18-mw-selection-emulation.txt, capture/out/19-mw-shell-files.txt, capture/s_middleware.py; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/middleware/built-in); libs/langchain_v1/langchain/agents/middleware at langchain==1.5.0; capture/lab/bench2/summary-bench2.json, capture/lab/bench2/runs/rubric.jsonl, capture/lab/bench2/logs/q-rubric.log, capture/lab/bench2/kit2/run2.py; libs/deepagents/deepagents/middleware/rubric.py at deepagents==0.7.38.
