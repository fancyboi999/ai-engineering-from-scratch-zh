# Deep Agents：harness 在什么时候有帮助

> 在 Claude 上，deep agent 与朴素循环得分相同，费用是后者的 1.16 到 1.24 倍；在小型本地模型上它落败了，主要原因是它默认的状态内文件系统。

你读到说 deep agent 会做计划、保存文件、启动子 agent，就用 `deepagents` 0.7.38 构建了一个。在 Claude 上，它通过了你的朴素循环通过的每个任务。在 Qwen3 4B 上，它 20 个文件任务失败了 18 个，其中有些任务里它还告诉你它改了文件。磁盘上的文件从未改变。

读完本节，你能说出 `create_deep_agent` 在 0.7.38 上比 `create_agent` 多加了什么，以及它何时有帮助。你还能为它的文件工具选择后端，并在有和没有提示词缓存的情况下预算它的 token。

## 结论 {#s-deep-agents-0-7-the-position}

- **在前沿模型加提示词缓存的条件下使用 Deep Agents。** 在 Claude 上，它通过了 99 个任务中的 99 个和 30 个任务中的 30 个，与朴素循环相同，费用是后者的 1.16 倍和 1.24 倍。
- **别把默认的 deep agent 用在小型本地模型上。** Qwen3 4B 作为 deep agent 通过了 99 个中的 55 个，用朴素循环通过 70 个。Qwen3 8B 分别是 58 个和 74 个。
- **工作在真实文件上时，传入 `FilesystemBackend`。** 默认后端把文件保存在 agent 的状态里。在任务文件夹上使用 `FilesystemBackend` 后，Qwen3 4B 的文件任务从 20 个中通过 2 个变成了通过 16 个。
- **隐藏内置文件工具，对小模型处理文件有帮助，在别处则会吃亏。** 一个 profile 让 Qwen3 4B 的文件任务从 20 个中通过 2 个变成通过 14 个，而它的总数仍是 99 个中的 55 个。
- **依赖 eval 工具之前先测试它。** Claude Haiku 5.5 带着它通过了 39 个中的 39 个，除非提示词要求，它从不调用它，而三个本地模型从未调用过它。
- **按 3.6 到 4.3 倍的提示词 token 做预算。** 在带缓存的提供方上这几乎不花钱。在本地模型上它花的是时间：Qwen3 4B 上每个任务 22.6 秒，对比 9.1 秒。

## create_deep_agent 构建了什么 {#s-deep-agents-0-7-what-create-deep-agent-builds}

**deep agent：** 由 `deepagents` 包里的 `create_deep_agent` 构建的 agent。它是一个 `create_agent` 图，在你自己的中间件周围套了一组固定的中间件。

`create_deep_agent` 接受与 `create_agent` 相同的核心参数：模型、工具、系统提示词、中间件、checkpointer 和 store。它另外加了 `subagents`、`skills`、`memory`、`permissions`、`backend` 和 `interrupt_on` {{code libs/deepagents/deepagents/graph.py}}。它返回 `create_agent` 的已编译图。

核心组在最前面，顺序是：`FilesystemMiddleware`、带一个通用子 agent 的 `SubAgentMiddleware`、`_ParentNotifierMiddleware`、摘要，以及 `PatchToolCallsMiddleware`。你自己的中间件紧跟在这一组后面。

然后是尾部：模型档案（model profile）、skills、提示词缓存、memory 和人工审核的中间件。`UnsupportedContentMiddleware` 和 `ModelRefusalMiddleware` 排在最后 {{code libs/deepagents/deepagents/graph.py:921-994}}。面向 Anthropic 的提示词缓存中间件在任何情况下都会加入，对其他提供方则什么也不做 {{code libs/deepagents/deepagents/graph.py:968}}。你的中间件如果与内置中间件同名，会原位替换它 {{code libs/deepagents/deepagents/graph.py:223-262}}。其中两个会添加图的节点，录制工具包在 Qwen3 4B 上的运行显示了这一点：

```listing
title: deep agent 的节点
source: capture/out/41-deep-agent.txt
lang: json
---
[
  "__start__",
  "model",
  "tools",
  "_ParentNotifierMiddleware.after_agent",
  "PatchToolCallsMiddleware.before_agent",
  "__end__"
]
```

model 节点和 tools 节点就是[第 1.3 节](#s-one-create-agent-run)里的循环。栈里的其余部分在这两个节点内部运行，作为围绕模型调用和工具调用的钩子。

[图](#fig-7-4e)根据 Mermaid 文本画出了已编译的图。`model` 还有一条条件边指回它自己。当任何中间件带有 `wrap_model_call` 钩子时，`create_agent` 就会添加这条边，而 deep agent 的栈里有好几个这样的中间件 {{code libs/langchain_v1/langchain/agents/factory.py:1772-1776}}。`get_graph(xray=True)` 给出同样的六个节点，因为子 agent 在 `task` 工具内部运行，不是这个图的节点。

```figure
id: fig-7-4e
kind: structure
title: deep agent 的图
claim: deep agent 在通常的循环周围加了两个钩子节点，它的 tools 节点列出 add、execute 和八个内置工具。
caption: 请从顶部的 __start__ 开始读。蓝色方框是钩子节点。model 上的小环是它指回自己的条件边。来源：capture/out/53-draw-deep-agent.txt。
```

## 0.7.38 里 deep agent 的工具 {#s-deep-agents-0-7-the-tools-of-a-deep-agent-at-0-7-38}

录制工具包用 Ollama 上的 Qwen3 4B、`add` 工具和系统提示词 `You keep notes.` 调用了 `create_deep_agent`。主 agent 的每次调用，模型都拿到九个工具：

```listing
title: 第一次模型调用时绑定的工具
source: capture/out/41-deep-agent.txt
lang: json
note: 六次调用中的第一次。第五次调用是子 agent，它的工具与此相同，只是没有 task。
---
    "call": 1,
    "tools": [
      "ls",
      "read_file",
      "write_file",
      "edit_file",
      "delete",
      "glob",
      "grep",
      "task",
      "add"
    ],
    "first message": "system: You keep notes.",
    "message count": 2
```

[图](#fig-7-4b)展示了每个工具和每一块状态的来源。

```figure
id: fig-7-4b
kind: structure
title: create_deep_agent 添加的工具和状态
claim: 在 0.7.38 里，deep agent 得到七个文件工具和一个 task 工具、状态里的一个 files 通道和两个中间件节点，没有待办列表。
caption: 请从顶部的调用往下读，依次是工具、状态和子 agent。绿色方框是工具，青色方框是状态，箭头是一次 task 调用。来源：capture/out/41-deep-agent.txt。
```

**虚拟文件系统：** deep agent 状态里的 `files` 通道。使用默认后端 `StateBackend` 时，文件工具读写这个通道，从不碰磁盘 {{code libs/deepagents/deepagents/graph.py:684}}。

模型调用了 `add`，用 `write_file` 写了 `/notes.md`，用 `ls` 列出它，并通过 `task` 询问了通用子 agent。它只把加法的结果 `5` 写进了文件。文件最终留在线程的状态里，带着它的内容和两个时间：

```listing
title: 最终状态里的文件
source: capture/out/41-deep-agent.txt
lang: json
---
{
  "/notes.md": {
    "content": "5",
    "encoding": "utf-8",
    "created_at": "<time>",
    "modified_at": "<time>"
  }
}
```

checkpointer 会把这个通道和其余状态一起保存，所以线程能挺过重启时，线程的文件也能挺过。[第 6.7 节](#s-subgraphs-and-multi-agent-patterns)跟踪了 `task` 调用和子 agent。

有两个来源与这份工具列表不一致。`create_deep_agent` 的 docstring 把 `execute` 列为默认工具，却没有提到 `delete` {{code libs/deepagents/deepagents/graph.py}}。`execute` 只在能运行命令的后端上出现，而默认后端不能。冲突登记把这一条记为冲突 D8。文档的概览页面说 Deep Agents 添加了规划能力 {{docs oss/python/deepagents/overview}}，这是冲突 D109。以锁定版本上的代码为准：没有待办列表，有一个 `delete` 工具。

## 小模型与前沿模型 {#s-deep-agents-0-7-small-model-frontier-model}

**我们测得** Mac 上 deep agent 与朴素循环在[第 1.2 节](#s-do-you-need-langchain)那 99 个任务的套件上的表现。Qwen3 4B 和 Qwen3 8B 在 Ollama 上以 temperature 0 运行，Claude 模型通过 API 运行。deep agent 得到每个任务的工具、我们的系统提示词和默认后端。[图](#fig-1-2)展示了每个任务。

| 模型 | 任务数 | 朴素循环 | deep agent | 结果相同 |
|---|---|---|---|---|
| Claude Haiku 5.5 | 99 | 99 | 99 | 99 |
| Claude Sonnet 5.5 | 30 | 30 | 30 | 30 |
| gpt-oss 20B | 30 | 28 | 24 | 26 |
| Qwen3 14B | 30 | 26 | 24 | 24 |
| Qwen3 8B | 99 | 74 | 58 | 73 |
| Qwen3 4B | 99 | 70 | 55 | 42 |

在 Claude 上，harness 没有带来这个套件能看出的任何变化。两种 harness 都通过了每个任务，所以小幅影响显示不出来。在本地模型上，deep agent 少通过了 2 到 16 个任务。

损失集中在两类里。在文件任务里，原因是默认后端，下一部分会说明。

在检索任务里，Qwen3 4B 上的 deep agent 有 6 个问题（共 20 个）没有任何工具调用就作了回答。它说自己无法访问数据。在其余 59 个任务上，deep agent 通过的次数比朴素循环更多：在 Qwen3 4B 上是 46 对 39，在 Qwen3 8B 上是 47 对 44。harness 不会让小模型在所有方面都变差。

## 默认后端把文件保存在状态里 {#s-deep-agents-0-7-the-default-backend-keeps-files-in-state}

文件任务给 agent 五个作用于任务文件夹的工具，检查器读取的就是那个文件夹。deep agent 还有自己的七个文件工具。使用默认后端时，这七个工具作用于 `files` 通道，而它一开始是空的。所以选了 `ls` 的模型什么文件也看不到：

```listing
title: 在自己的空文件系统里查找的 deep agent
source: capture/lab/bench/runs/main.jsonl
lang: json
note: Qwen3 4B 的一行记录，只保留工具调用、回复和运行之后的文件夹。任务要求它修改 config.ini 里的端口。
---
{"run_id": "cd6b9ad2", "tag": "main", "ts": "2026-11-14T19:31:56", "task_id": "files03", "family": "files", "harness": "deep_agent", "model": "qwen3:4b-instruct-2507-q4_K_M", …"tool_seq": ["glob", "ls"], "final_text": "I see that there are no files in the current directory at all. This means there is no config.ini file to modify. …"final_state": {"config.ini": "[server]\nhost=0.0.0.0\nport=8080\nworkers=4\n"}}
```

用内置工具写入的模型会改变状态并报告成功。Qwen3 14B 用 `edit_file` 和 `write_file` 删掉了一行，说明了这一点，而磁盘上的文件原封不动：

```listing
title: 编辑了状态而没有编辑磁盘的 deep agent
source: capture/lab/bench/runs/main.jsonl
lang: json
note: Qwen3 14B 的一行记录，只保留工具调用、回复和运行之后的文件夹。
---
{"run_id": "3fc1e4ca", "tag": "main", "ts": "2026-11-15T02:13:58", "task_id": "files16", …"tool_seq": ["edit_file", "ls", "write_file"], "final_text": "The line `DEBUG=true` has been removed from `settings.env`, and the file has been updated.", …"final_state": {"settings.env": "HOST=localhost\nDEBUG=true\nPORT=5000\n"}}
```

**FilesystemBackend：** 把 deep agent 的文件工具映射到磁盘上某个文件夹的后端。使用默认的 `virtual_mode=True` 时，路径在 `root_dir` 之下读取，离开它的路径会被拒绝 {{code libs/deepagents/deepagents/backends/filesystem.py:130-168}}。它限制路径，并不隔离进程。

**我们测得**用 `FilesystemBackend(root_dir=<任务文件夹>, virtual_mode=True)` 第二次运行那 20 个文件任务，在 Mac 上，用同样的三个模型。[图](#fig-7-4c)展示了每次运行以及它用了哪些文件工具。

```figure
id: fig-7-4c
kind: chart
title: 20 个文件任务：朴素循环、deep agent，以及落在磁盘上的 deep agent
claim: 在 Qwen3 4B 上，默认 deep agent 在 20 次运行中有 18 次使用自己的文件工具，失败了 17 次，而 FilesystemBackend 让得分恢复到朴素循环的水平。
caption: 每个方块是一个任务，蓝色或紫色表示通过，玫红色表示失败。绿点标记用 Deep Agents 文件工具写入的运行，灰点标记只用它读取的运行。右侧一列统计使用过文件工具的运行数。来源：capture/lab/bench/summary-mac.json。
```

| 模型 | 朴素循环 | deep agent，默认 | deep agent，`FilesystemBackend` |
|---|---|---|---|
| Claude Haiku 5.5 | 20 个中的 20 个 | 20 个中的 20 个 | 20 个中的 19 个 |
| Qwen3 8B | 20 个中的 17 个 | 20 个中的 5 个 | 20 个中的 9 个 |
| Qwen3 4B | 20 个中的 16 个 | 20 个中的 2 个 | 20 个中的 16 个 |

Claude Haiku 5.5 在 20 次默认运行中有 6 次用了内置文件工具，只用了 `glob`，然后改用任务工具。Qwen3 4B 在 20 次中有 18 次用了，其中 17 次失败。后端落在磁盘上以后，它又在 18 次里用了，其中 15 次用它写了文件，这 15 次里有 12 次通过。Qwen3 8B 的提升较小，从 5 个到 9 个，它的另外 11 次运行留下了错误的文件夹。

所以默认后端会伤害偏好内置工具的模型。给 deep agent 的文件工具应当全都作用于真实的文件夹，并把 `FilesystemBackend` 指向那个文件夹。我们没有测试只用内置工具、配这个后端的 deep agent。

## 隐藏文件工具的 harness profile {#s-deep-agents-0-7-a-harness-profile-that-hides-the-file-tools}

**harness profile：** `deepagents` 的一项设置，它改变 `create_deep_agent` 对某个提供方的处理方式。profile 可以列出 `excluded_tools`，并用 `system_prompt_suffix` 往系统提示词里添加文字。你用 `register_harness_profile` 注册它。

录制工具包为提供方 `ollama` 运行了两个 profile。profile A 排除了前面列表里的八个文件工具：`ls`、`read_file`、`write_file`、`edit_file`、`glob`、`grep`、`delete` 和 `execute`。profile B 做了同样的事，并往提示词里加了一句话。

这句话说了三件事。任务工具是访问数据的唯一途径。内置工作区是空的。agent 不得委派任务。

两个 profile 都保留了 `task`。在一个链式任务上，第一次模型调用列出了 7 个工具：`task`、五个任务工具和 `submit_answer`。

**我们测得** profile B 在 99 个任务上的表现，以及 profile A 在 30 个任务子集上的表现，模型是 Qwen3 4B 和 Qwen3 8B。这台 Mac 是 64 GiB 的 Apple M1 Max。Ollama 0.31.1 以 temperature 0 和 seed 42 运行，每个任务运行一次。运行之前，有三个任务给出的工具调用和提示词 token，与同一个服务器上的第一个测试基准相同。

| 通过的任务 | 4B 朴素 | 4B deep | 4B deep，B | 8B 朴素 | 8B deep | 8B deep，B |
|---|---|---|---|---|---|---|
| chain，20 | 9 | 17 | 6 | 15 | 17 | 12 |
| sql，19 | 15 | 11 | 10 | 10 | 11 | 8 |
| retrieval，20 | 15 | 7 | 11 | 13 | 6 | 10 |
| files，20 | 16 | 2 | 14 | 17 | 5 | 15 |
| multiturn，20 | 15 | 18 | 14 | 19 | 19 | 18 |
| all，99 | 70 | 55 | 55 | 74 | 58 | 63 |

profile B 做到了它被设计要做的事。files 在 Qwen3 4B 上从 20 个里的 2 个升到 14 个，在 Qwen3 8B 上从 5 个升到 15 个。总数在 4B 上没有跟着上升。chain 任务从 17 个降到 6 个，有 30 次运行把工具调用写成了文本，默认 deep agent 是 12 次。在 Qwen3 8B 上，总数从 58 升到 63，仍比朴素循环低 11 个。

提示词也变小了。Qwen3 4B 一共读了 608,010 个提示词 token，默认 deep agent 是 1,591,270 个，朴素循环是 365,915 个。Qwen3 8B 分别是 467,536、1,311,726 和 353,608 个。

在 30 个任务的子集上，profile A 在 Qwen3 4B 上通过了 30 个中的 19 个，在 Qwen3 8B 上通过 16 个，profile B 通过 18 个和 17 个。同样的任务上，朴素循环通过了 23 个和 18 个。30 个任务一格的区间很宽，所以相差 1 或 2 个任务的差距请当作噪声。profile 的运行与其他作业共用这台 Mac，所以我们不给出它们的时间。

## eval 工具与编程式工具调用 {#s-deep-agents-0-7-the-eval-tool-and-programmatic-tool-calling}

**编程式工具调用（programmatic tool calling）：** 模型写一段调用多个工具的小程序，取代每一步一次的工具调用。在 `langchain-quickjs` 0.3.12 里，`CodeInterpreterMiddleware(ptc=tools)` 添加一个 `eval` 工具。这个工具在 QuickJS 沙箱里运行 JavaScript，并把列出的工具放进一个 `tools` 对象里。

**我们测得** 39 个 chain 和 sql 任务上的四组配置，这些任务一个任务要做好几次查找和一些算术。四组是：朴素循环、默认 deep agent、带 `CodeInterpreterMiddleware(ptc=<任务工具>)` 的 deep agent，以及在提示词里再多一句话的同一配置。那句话要求模型对任何有多次查找或有算术的任务，写一个 `eval` 程序。Claude Haiku 5.5 从 Mac 通过 API 运行了全部四组。

Qwen3 8B、Qwen3 14B 和 gpt-oss 20B 在 Ollama 上运行了前三组，每个任务运行一次。Qwen3 14B 和 gpt-oss 20B 的朴素行只覆盖 30 个任务子集里的 12 个 chain 和 sql 任务。Qwen3 8B 带提示词的那一次运行在开始时就失败了，因为服务器对这个模型返回 404，所以它没有数据行。[图](#fig-7-4f)展示了每一组。

```figure
id: fig-7-4f
kind: chart
title: 有无 eval 工具的通过数，四个模型在 39 个任务上
claim: eval 工具没有让四个模型中任何一个的通过数提高，却让提示词 token 增加到 1.8 到 2.6 倍。
caption: 每根柱是通过任务的占比，文字给出具体数量。调用数和提示词 token 是该格的总数，秒数是在同时运行其他工作的 Mac 上的任务中位数。来源：capture/lab/bench2/summary-bench2.json。
```

Claude Haiku 5.5 在四组里都通过了 39 个中的 39 个。用普通提示词时，它在 39 次运行里调用 `eval` 的次数为 0。多出来的工具只增加了 schema 的 token：171 万个提示词 token，默认 deep agent 是 93 万个。

提示词里有那句话时，它在 39 次运行里的 12 次调用了 `eval`，一共 42 次。这 12 次运行都是 chain 任务，全部通过。有三次 `eval` 调用以 `SyntaxError` 失败。[图](#fig-7-4g)比较了这两组。

```figure
id: fig-7-4g
kind: chart
title: Claude Haiku 5.5 使用 eval 工具，提示词要求与不要求它
claim: 提示词要求使用 eval 时，Haiku 在 39 次运行里的 12 次用了它，这一格花费 $0.038，通过数相同的另一格是 $0.028。
caption: 每个方块是一个任务。深色方块是调用了 eval 的运行。成对的柱给出两组的总数，按较大的一组缩放。来源：capture/lab/bench2/summary-bench2.json。
```

这个程序并没有节省调用。在那 12 个 chain 任务上，带提示词的运行发起了 67 次模型调用，用普通提示词的运行是 53 次。在全部 39 个任务上，总数分别是 187 次和 173 次调用。同样这 39 个任务，朴素循环花了 $0.021，默认 deep agent 花了 $0.022。

没有任何本地模型在它们的 117 次运行里调用过 `eval`。Qwen3 8B 和 gpt-oss 20B 在某些运行里改用了内置的 `glob`、`ls` 或 `grep`。通过数是：Qwen3 8B 39 个中的 23 个，Qwen3 14B 29 个，gpt-oss 20B 35 个。这分别比默认 deep agent 少 5、2 和 2 个。每格有 39 个任务，所以这些差距在噪声范围之内。

提示词 token 分别是默认 deep agent 的 2.6、2.2 和 2.3 倍。Qwen3 8B 上的中位任务用了 142.5 秒，默认 deep agent 是 14.5 秒。这个时间来自负载很高的共享 Mac，所以请当作上界。

## token，以及缓存对它们的影响 {#s-deep-agents-0-7-tokens-and-what-a-cache-does-to-them}

deep agent 在每次模型调用时都会发送它自己的工具的 schema。我们之前的运行是在单次调用上测量这一成本的。

**我们测得**三种 harness 在 Mac 上的提示词 token，机器是 Apple M1 Max，10 核，64 GiB。模型是 Ollama 上的 Qwen3 8B，temperature 0，seed 42。每个任务在每种 harness 下运行三次，一共 27 次运行。这三种 harness 是：基于 `ollama` 客户端的朴素循环、`create_agent` 和 `create_deep_agent`。[图](#fig-7-4)展示了每次模型调用。

```figure
id: fig-7-4
kind: chart
title: 每次模型调用的提示词 token，三种 harness
claim: create_agent 每次调用发送的提示词 token 与朴素循环相同，而 Deep Agents 给每次调用多加了 2,075 到 2,251 个 token。
caption: 每个点是 Mac 上 Qwen3 8B 的一次模型调用，每格的三次运行互相重叠。格子上方的数字是一次运行的提示词总数。来源：capture/lab/summary/tokens-mac.json。
```

| 任务 | 模型调用数 | 朴素循环 | `create_agent` | `create_deep_agent` | deep 是朴素的 |
|---|---|---|---|---|---|
| 一个词的回答 | 1 | 28 | 28 | 2,279 | 81.4 倍 |
| 两次算术工具调用 | 2 | 480 | 480 | 4,818 | 10.0 倍 |
| 写一个文件，然后读它 | 3 | 773 | 773 | 7,013 | 9.1 倍 |

在任务集上，七个模型上全部任务的比值是 3.6 到 4.3 倍，[图](#fig-1-2b)已经展示过。deep agent 发起的模型调用次数的中位数相同。在 Claude Haiku 5.5 上，它每次调用多发送约 3,570 个提示词 token，在 Qwen3 8B 上约 2,160 个。

在本地模型上，这些 token 每次调用都要重新读一遍。Qwen3 4B 的中位任务，作为 deep agent 用了 22.6 秒，用朴素循环是 9.1 秒。在 Qwen3 8B 上分别是 11.6 秒和 10.1 秒。

在 Claude 上，缓存以十分之一的价格读取它们。**我们测得** API 为每次调用报告的缓存读取。在每一格的所有调用上，deep agent 的提示词 token 在 Haiku 上有 96% 来自缓存，在 Sonnet 上有 94%。朴素循环只标记了它的系统提示词，两者都是 67%。[图](#fig-7-4d)展示了每个任务的费用。

```figure
id: fig-7-4d
kind: chart
title: 每个任务的费用：朴素循环与 deep agent，有缓存与没有缓存
claim: 按标价，deep agent 在 Claude 上的费用是朴素循环的三倍，有提示词缓存时，在 Haiku 上是 1.16 倍，在 Sonnet 上是 1.24 倍。
caption: 每个点是一个任务，使用对数刻度，黑色刻线是中位数。标价是按基础价格计的 token，计费价使用 API 报告的缓存读取。总数在右边。来源：capture/lab/bench/summary-mac.json。
```

在 Claude Haiku 5.5 上，deep agent 完成 99 个任务花了 $0.052，朴素循环是 $0.045。在 Claude Sonnet 5.5 上，30 个任务花了 $0.327，朴素循环是 $0.263。按标价、没有缓存时，同样的任务会花朴素循环的 3.10 倍和 3.14 倍。

## 0.7 里变了什么 {#s-deep-agents-0-7-what-changed-in-0-7}

更新日志列出了 `deepagents` 0.7.0 的变化 {{docs oss/python/releases/changelog}}：

- **待办改为可选启用。** `create_deep_agent` 不再添加 `TodoListMiddleware`。要找回 `write_todos`、`todos` 通道和规划提示词，请传入 `middleware=[TodoListMiddleware()]`，它从 `langchain.agents.middleware` 导入。
- **基础提示词为空。** 原来编写的基础提示词已移除，`BASE_AGENT_PROMPT` 已弃用，将在 0.9.0 移除 {{code libs/deepagents/deepagents/graph.py}}。已知模型的 harness profile 仍然可以添加一小段。
- **`delete` 工具。** 它删除文件或目录。`write_file` 现在会覆盖已有文件，而不是失败。
- **新的输出文本。** 空的 `ls` 或 `glob` 返回 `No files found`，而不是 `[]`，`read_file` 没有行号栏。解析工具输出的代码必须修改。
- **后端工厂已移除。** 传入后端实例，并给 `StoreBackend` 一个显式的 `namespace`。

`model=None` 仍被接受，仍表示通过 `langchain-anthropic` 使用 Claude Sonnet 4.6，但它自 0.5.3 起已弃用 {{code libs/deepagents/deepagents/graph.py}}。务必传入模型。

没有 harness profile 的模型，例如 Ollama 上的模型，得到的是空的基础提示词。你不传系统提示词时，`deepagents` 0.7.38 仍会发送一条内容为空的 `SystemMessage`。我们在 Qwen3 8B 上的运行显示，第一次调用有两条消息、系统字符数为零：

```listing
title: deep agent 在 Qwen3 8B 上的第一次调用
source: capture/lab/T09-tokens-mac/05-analysis.txt
lang: text
note: 简单任务的摘要行和它的那一次调用。
---
('trivial', 'deep_agent') n 3 ok 3 calls [1, 1, 1] in_total [2279] out_total [2] secs median 46.07
    call: in 2279 out 2 msgs 2 sys_chars 0 tools 8 schema_chars 10527 -> []
```

空消息不占 token。在 Qwen3 上，带它的请求和不带它的请求都数出 17 个提示词 token。

## 0.6 到 0.7 的提示词削减 {#s-deep-agents-0-7-the-0-6-to-0-7-prompt-cut}

更新日志说，默认 agent 一轮的输入 token 降低了 65%，从 5,395 降到 1,895 {{docs oss/python/releases/changelog}}。它还说，仅工具描述就降低了 43%，从 4,005 降到 2,302。两个数字都没有说明用的是哪个分词器。

**我们测得** Mac 上默认 `create_deep_agent()` 对消息 `hi` 的第一次请求。它使用默认的 Claude profile，版本分别是 `deepagents` 0.6.12 和 0.7.38。没有调用任何模型。我们用两个 tiktoken 分词器数了这次请求。我们还把它发给 Ollama 上的 Qwen3 8B 三次，在那里计数。Claude 的分词器无法离线使用，所以我们的计数不可能和更新日志完全吻合。

| 计数 | 0.6.12 | 0.7.38 | 降幅 |
|---|---|---|---|
| 系统提示词和工具 schema，`o200k_base` | 5,899 | 2,500 | 57.6% |
| 系统提示词和工具 schema，`cl100k_base` | 5,903 | 2,488 | 57.9% |
| 整个请求，Qwen3 | 5,814 | 2,543 | 56.3% |
| 仅工具描述，`o200k_base` | 3,099 | 1,126 | 63.7% |
| 工具和参数描述，`o200k_base` | 3,417 | 1,711 | 49.9% |

声明的方向成立，幅度不成立：我们测得的降幅是 56% 到 58%，不是 65%。描述的 43% 与我们的两个描述计数都对不上。削减主要来自三处。系统提示词从 1,813 个 token 降到 275 个。`write_todos` 带着它 824 个 token 的描述离开了默认集合。`task` 的描述从 1,448 个 token 降到 280 个。

## harness 何时有帮助 {#s-deep-agents-0-7-when-the-harness-helps}

| 你的情况 | 用 Deep Agents 吗？ | 背后的数字 |
|---|---|---|
| 带提示词缓存的 Claude，任务用到文件、子 agent 或待办列表 | 是 | 129 个任务中有 129 个结果相同，费用是 1.16 到 1.24 倍 |
| Claude，用你自己的工具回答简短问题 | 没有收益，成本很小 | 结果相同，每次调用多约 3,570 个提示词 token |
| 8B 或更小的本地模型 | 否 | 99 个中 55 个和 58 个，对比 70 个和 74 个，Qwen3 4B 上是 2.5 倍的时间 |
| 14B 到 20B 的本地模型 | 仅在你的任务上测试之后 | 30 个中比朴素循环少 2 个和 4 个 |
| 处理真实文件的工作 | 是，对文件夹使用 `FilesystemBackend` | Qwen3 4B 上 20 个中从 2 个到 16 个 |
| 8B 或更小的本地模型，而你仍想用 deep agent | 用 profile 隐藏文件工具，并测试 | Qwen3 4B 的文件任务 20 个中 14 个，Qwen3 8B 99 个中 63 个，朴素循环是 74 个 |
| 你想让模型通过代码调用工具 | 先在你的任务上测试 | Haiku 有无 eval 都是 39 个中 39 个，三个本地模型没有任何 eval 调用 |
| 没有提示词缓存的提供方 | 为 token 做预算 | 按标价，费用是 3.10 到 3.14 倍 |

```takeaways
- 给 create_deep_agent 传入模型，因为 model=None 表示 Claude，而且已弃用。
- 在带提示词缓存的前沿模型上使用 deep agent，在那里它与朴素循环得分相同。
- 8B 或更小的本地模型，用朴素循环或 create_agent。
- 工作在真实文件上时，传入 root_dir 指向该文件夹的 FilesystemBackend。
- 你的 agent 需要待办列表时，自己添加 TodoListMiddleware。
- 只有在测试过你自己的任务组合之后，才传入排除文件工具的 profile。
- 只有测试表明你的模型会调用 eval 并且通过更多时，才添加 CodeInterpreterMiddleware。
- 按 3.6 到 4.3 倍的提示词 token 做预算，本地模型上还要预算每个任务的时间。
- 迁移到 0.7 时，更新解析 ls、glob 和 read_file 输出的代码。
```

来源：capture/s_integrations.py, capture/out/41-deep-agent.txt, capture/out/53-draw-deep-agent.txt, capture/s_draw.py; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; capture/lab/bench/summary-mac.json, capture/lab/bench/summarize.py, capture/lab/bench/runs/main.jsonl, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/bench2/summary-bench2.json, capture/lab/bench2/kit2/run2.py, capture/lab/bench2/kit2/summarize2.py, capture/lab/bench2/runs/profiles.jsonl, capture/lab/bench2/runs/ptc.jsonl, capture/lab/bench2/runs/verify.jsonl, capture/lab/bench2/runs/cost-ledger.jsonl, capture/lab/bench2/logs/q-ptc.log, capture/lab/bench/kit/harnesses.py, capture/lab/bench/kit/env.py, capture/lab/bench/kit/checks.py, capture/lab/bench/data/tasks.jsonl, capture/lab/bench/data/anthropic-prices.json; capture/lab/summary/tokens-mac.json, capture/lab/T09-tokens-mac/04-agent-runs.jsonl, capture/lab/T09-tokens-mac/04-agent-runs.log, capture/lab/T09-tokens-mac/05-analysis.txt, capture/lab/T09-tokens-mac/01-baseprompt-0.7.38.jsonl, capture/lab/T09-tokens-mac/02-baseprompt-0.6.12.jsonl, capture/lab/T09-tokens-mac/03-qwen3-token-counts.jsonl, capture/lab/T09-tokens-mac/00-venv-da06-freeze.txt; libs/deepagents/deepagents/graph.py, libs/deepagents/deepagents/backends/filesystem.py, libs/deepagents/deepagents/middleware/_prompt_caching.py, and libs/deepagents/deepagents/middleware/filesystem.py at deepagents==0.7.38; docs.langchain.com at docs commit 04d4d4a (oss/python/releases/changelog, oss/python/deepagents/overview).
