# 成本：框架对比朴素 SDK 循环

> `create_agent` 相对朴素循环，每次模型调用多约 5 毫秒，不多花 token；而 Deep Agents、很长的朴素线程和一个出故障的追踪端点，代价要大得多。

你的团队有一个基于 `openai` 客户端的朴素循环，运行得很好。迁移之前，有人问 LangChain 要花多少成本。答案有几部分：每次调用的时间、token、请求字节数、导入时间、磁盘、检查点和追踪。

读完本节，你能说清技术栈的每一层给一次运行增加了什么，并选择把成本花在哪里。

## 成本表 {#s-cost-the-framework-against-a-plain-sdk-loop-the-cost-sheet}

**我们测得**这张表里的每一行，都在一台机器上，行里写明机器和次数。Mac 是 Apple M1 Max，10 核、64 GiB，还要和其他工作共用。x86 服务器客户机有 32 vCPU 和 48 GiB。机器不同，所以只在同一行内比较数字，不要跨行比较。

| 成本 | 朴素循环 | LangChain | 机器和次数 | 章节 |
|---|---|---|---|---|
| 三次 Qwen3 4B 调用的一次运行里，模型之外的时间 | 25.1 ms（占该次运行 1.3%） | `create_agent` 为 37.6 ms（2.3%），同一轮里多 15.6 ms | Mac，每种 40 次运行 | 本节 |
| 该次运行三次调用的提示词 token，Qwen3 4B | 261、300、340 | 相同 | Mac，每种 40 次运行 | 本节 |
| 这三次调用的请求字节数，Qwen3 4B | 679、936、1,199 | 696、948、1,206 | Mac，每种 40 次运行 | 本节 |
| 一句话回答的提示词 token，Qwen3 8B | 28 | `create_agent` 为 28，`create_deep_agent` 为 2,279 | Mac，每种 3 次运行 | [7.4](#s-deep-agents-0-7) |
| 导入时间，已写入字节码 | `openai` 为 0.329 秒 | `create_agent` 加 `ChatOpenAI` 为 0.831 秒 | Mac，每种 10 次运行 | [3.1](#s-install-and-the-package-map) |
| 安装 | 14 个包，26,356 KiB | 44 个包，54,312 KiB | Mac，各安装一次 | [3.1](#s-install-and-the-package-map) |
| `PostgresSaver` 一次检查点写入，5,000 步中最后 10 次的中位数 | 无 | 普通情况 148.65 ms，用 `DeltaChannel` 为 1.13 ms | x86 服务器客户机，一次运行 | [5.5](#s-context-engineering-and-summarization) |
| 开启追踪时，一次 Qwen3 4B agent 运行里模型之外的时间，对着本地记录器 | 无 | 26.3 ms，关闭追踪时为 17.7 ms，占该次运行 0.5% | Mac，各 60 次交错运行 | [7.6](#s-langsmith-tracing) |
| 一个中间件钩子每次运行的耗时 | 无 | 节点钩子 183 到 190 µs，wrap 钩子 45 到 50 µs，占真实 Qwen3 4B 运行的 0.2% 到 0.5% | x86 服务器客户机，负载 14 到 25，每格 20 次运行 | 本节 |

本节其余部分给出前三行和最后一行背后的记录，其他章节都没有完整展示它们。[第 9.7 节](#s-workers-the-advisory-lock-and-cost)用测得的 token 给一整段客服对话定价：在 Claude Haiku 5.5 上，1,000 段对话花 0.61 美元。

## 每次运行的时间 {#s-cost-the-framework-against-a-plain-sdk-loop-time-per-run}

这次记录的任务是一个需要两个工具的问题：先 `add`，再 `multiply`，共三次模型调用。八个程序对 Ollama 上的 Qwen3 4B 运行它，五个走 `/v1` 路径，三个走原生路径。代理给每次模型调用计时。每次运行都给出了正确答案，每个程序用相同的参数调用相同的工具。

**模型之外的时间：** 一次运行的墙钟时间，减去代理处测得的模型调用时间。它也包含 HTTP 客户端和代理这一跳，所以朴素循环也有一部分。

- **朴素 `openai` 循环**：`openai` 客户端、一个消息列表，以及一个遍历工具调用的循环。
- **`ChatOpenAI.bind_tools` 循环**：同样的循环，把客户端换成 `langchain-openai` 的模型。
- **`create_agent`**：带 `ChatOpenAI` 和两个工具的 agent。
- **带 `InMemorySaver` 的 `create_agent`**：同一个 agent，加上 checkpointer 和一个线程。
- **手工搭建的 `StateGraph`**：一个模型节点、一个 `ToolNode` 和 `tools_condition`，与 `create_agent` 相同的图，用手写实现。
- **原生程序**：一个朴素的 `ollama` 循环、带 `ChatOllama` 的 `create_agent`，以及带 `ChatOllama` 的手工 `StateGraph`，都走 `/api/chat`。

```figure
id: fig-8-3
kind: chart
title: 三次 Qwen3 4B 调用的一次运行里，模型之外的时间
claim: 在 1.8 秒的真实运行中，create_agent 在模型之外花了 37.6 ms，朴素 openai 循环为 25.1 ms，手工搭建的 StateGraph 为 36.7 ms。
caption: 每个点是 Mac 上的一次运行，每个程序 40 次，轮次打乱，黑线是中位数。来源：capture/lab/summary/overhead-mac-real.json。
```

**我们测得**：在 Mac 上，每个程序跑 40 次运行，经过 2 轮预热后打乱成 40 轮。[图 8.3](#fig-8-3) 展示了每次运行。每次在 `add(2, 3)` 和 `multiply(5, 4)` 之后都得到 20。模型之外时间的中位数：朴素循环 25.1 ms，`bind_tools` 循环 29.3 ms，`create_agent` 37.6 ms，带 `InMemorySaver` 为 37.6 ms，手工搭建的 `StateGraph` 为 36.7 ms。与同一轮里的朴素循环相比，它们分别多 6.6、15.6、12.2 和 11.5 ms。

在原生路径上，朴素 `ollama` 循环在模型之外花了 11.7 ms。带 `ChatOllama` 的 `create_agent` 花了 29.0 ms，多 13.0 ms；`StateGraph` 花了 22.2 ms，多 7.8 ms。

按每次模型调用算，agent 层增加约 4 到 5 ms，其中 CPU 时间 3 ms。在 `/v1` 路径上，模型之外的时间占一次 1.7 到 2.0 秒运行的 1.3% 到 2.3%。机器上有其他负载时，每次运行的模型时间在 1.2 秒到 3.7 秒之间浮动。所以要比较模型之外的时间，不要比较墙钟时间。

## token 与请求字节数 {#s-cost-the-framework-against-a-plain-sdk-loop-tokens-and-request-bytes}

框架可能增加 token：自带的系统提示词、额外的工具字段，或一个 schema。`create_agent` 一个都不加。**我们测得**：用一个记录每个请求的代理，读取 Ollama 为每次调用返回的用量，在 Mac 上每个程序 40 次运行。同一个程序的每次运行都有相同的三次调用：

| 调用 | 朴素循环：字节数、提示词 token、补全 token | `create_agent`：字节数、提示词 token、补全 token |
|---|---|---|
| 1 | 679, 261, 25 | 696, 261, 25 |
| 2 | 936, 300, 25 | 948, 300, 25 |
| 3 | 1,199, 340, 3 | 1,206, 340, 3 |

两个程序逐次调用的 token 相同。`create_agent` 的请求每次长 7 到 17 字节。

**我们录制了**两个程序在代理处的原始请求体，各 5 次运行，并逐次调用做了比较。差异的每一个字节都在下面这份账目里：

```listing
title: create_agent 给每个请求多加的字节
source: capture/lab/last-two-mac/03-request-body-diff.txt
lang: text
note: 截取到每个请求的账目。其余字节是同样的键和值，只是顺序不同。
---
### request 1: a_plain_openai (679 B) vs c_create_agent (696 B), round 1, raw bodies as sent
…
  +15 B  "stream":false added
  +2 B  "temperature":0 -> "temperature":0.0
  ledger sum +17 B; measured +17 B
### request 2: a_plain_openai (936 B) vs c_create_agent (948 B), round 1, raw bodies as sent
…
  +15 B  "stream":false added
  +2 B  "temperature":0 -> "temperature":0.0
  +2 B  assistant turn 1: "content":"" -> "content":null
  +3 B  assistant turn 1: arguments {"a":2,"b":3} -> {"a": 2, "b": 3}
  -10 B  assistant turn 1: "index":0 dropped
  ledger sum +12 B; measured +12 B
### request 3: a_plain_openai (1199 B) vs c_create_agent (1206 B), round 1, raw bodies as sent
…
  +2 B  assistant turn 2: "content":"" -> "content":null
  +3 B  assistant turn 2: arguments {"a":5,"b":4} -> {"a": 5, "b": 4}
  -10 B  assistant turn 2: "index":0 dropped
  ledger sum +7 B; measured +7 B
```

`ChatOpenAI` 加上 `"stream": false`，并把 temperature 写成浮点数，每次调用多 17 字节。对历史里每个更早的工具调用，它发送 `"content": null`，而朴素循环回显的是 Ollama 给的空字符串。它还把参数重新写成带空格的形式，并去掉了朴素循环从 `model_dump()` 抄来的 `"index": 0`。每一轮因此少 5 字节。工具 schema 作为 JSON 相等，作为字节却不相等：`create_agent` 把 `"type": "object"` 写在 `"required"` 之后，并在每条消息里把 `"content"` 写在 `"role"` 之前。

请求头有两个字段不同。LangChain 程序发送 `x-stainless-raw-response: true`，因为 `ChatOpenAI` 通过 `with_raw_response` 调用客户端 {{code libs/partners/openai/langchain_openai/chat_models/base.py}}。在录制的请求里，它们也没有朴素循环发送的 `x-stainless-read-timeout`。

Deep Agents 的 harness 是例外。在 Qwen3 8B 上，`create_deep_agent` 每次调用比朴素循环多发 2,075 到 2,251 个提示词 token。一句话回答的 token 是朴素循环的 81.4 倍，两次工具调用是 10.0 倍，文件任务是 9.1 倍。[第 7.4 节](#s-deep-agents-0-7)和[图 7.4](#fig-7-4)展示了每次调用。只有用到规划、文件或子 agent 时，才值得付这些 token。

[第 1.2 节](#s-do-you-need-langchain)的任务套件在更大规模上给出同样的图景。deep agent 发送的提示词 token 是朴素循环的 3.6 到 4.3 倍。在 Claude Haiku 5.5 上，每次调用多约 3,570 个。提示词缓存会改变账单。在 Claude 上，deep agent 的花费是朴素循环的 1.16 到 1.24 倍；不用缓存、按标价算则是 3.10 到 3.14 倍。

## 导入与磁盘 {#s-cost-the-framework-against-a-plain-sdk-loop-imports-and-disk}

进程启动的成本，对 CLI 工具、测试运行和无服务器处理函数都很重要。[第 3.1 节](#s-install-and-the-package-map)用[图 3.1b](#fig-3-1b)给出了导入时间。在字节码已写入时，`create_agent` 和 `ChatOpenAI` 的导入中位数用了 0.831 秒，`import openai` 用了 0.329 秒。第一次启动、没有字节码时，两者分别是 2.64 秒和 1.064 秒。安装体积约为两倍：54,312 KiB 对 26,356 KiB。

## 检查点 {#s-cost-the-framework-against-a-plain-sdk-loop-checkpoints}

checkpointer 在每一步写入整个状态，除非某个通道只保存变化。[第 5.5 节](#s-context-engineering-and-summarization)用[图 5.5b](#fig-5-5b)给出了记录。在 `PostgresSaver` 上，用普通消息列表时，10 步处最后 10 次写入的中位数是 2.88 ms。到 5,000 步时是 148.65 ms。

一个 5,000 步的线程占 7,289 MB。用 `DeltaChannel` 时，写入保持在约 1.1 ms，每 100 步一个快照，线程占 81 MB。对长线程做摘要，并测量你自己线程的步数。

## 追踪 {#s-cost-the-framework-against-a-plain-sdk-loop-tracing}

追踪给每次运行增加一笔成本，退出时又增加一笔。[第 7.6 节](#s-langsmith-tracing)用[图 7.6](#fig-7-6)给出了两者。对着一个立即应答的本地记录器，追踪给一次 1.6 秒的 Qwen3 4B agent 运行增加了 7.4 ms。七个进程中有六个，首次被追踪的运行在模型之外花了 83 到 243 ms。一个出故障的端点让退出拖了 10 到 17 秒，一个挂起的端点让进程一直不退出。

[第 9.4 节](#s-opentelemetry-spans-with-langsmith-off)用自己的 OpenTelemetry span 追踪一个服务。`LANGSMITH_TRACING` 为 false 或未设置时，记录器没有收到任何请求。

## 中间件钩子 {#s-cost-the-framework-against-a-plain-sdk-loop-middleware-hooks}

每个中间件钩子，要么是图里多一个节点，要么是一次调用外多一层包装，见[第 4.5 节](#s-middleware-hooks-and-their-order)。节点钩子，例如 `before_model`，每次运行都给循环增加一步。wrap 钩子，例如 `wrap_model_call`，增加一次函数调用，不增加节点。

**我们测得**：在 x86 服务器客户机上，用 Ollama 里的 Qwen3 4B 测这笔成本。框架时间是墙钟时间减去模型调用内部的时间。一次含两次模型调用和一次工具调用的运行用了 2.61 秒，其中 5.88 ms 是框架。每格有 1、10 或 20 个中间件，每格 20 次计时运行，轮次打乱。每次运行都给出了正确答案，这些中间件什么也不做。每次钩子调用的成本，是中位数随中间件数量变化的斜率，除以一次运行里该钩子的调用次数。

| 钩子 | 一次运行里的调用次数 | 每次调用的成本 | 20 个中间件时的框架时间 | 20 个时的图节点数 |
|---|---|---|---|---|
| `before_model` | 2 | 183 µs | 13.2 ms | 24 |
| `after_model` | 2 | 190 µs | 13.5 ms | 24 |
| `before_agent` | 1 | 187 µs | 9.6 ms | 24 |
| `wrap_model_call` | 2 | 45 µs | 7.7 ms | 4 |
| `wrap_tool_call` | 1 | 50 µs | 6.9 ms | 4 |

框架在运行中的占比：没有中间件时是 0.2%，20 个节点钩子时是 0.5%。平均负载是 14 到 25，因为 Ollama 用满了每个核心。所以看占比和节点钩子与 wrap 钩子的比值，不要看微秒数。

**我们测得**：在 x86 服务器客户机上，用同样的方法、Qwen3 4B 测了九种内置中间件配置，每格 20 次运行。七种各含一个中间件，一种含五个 `PIIMiddleware` 实例，一种含五个中间件的栈。它们都没有动作：没有重试，没有触及限制，没有摘要，没有中断。

| 中间件及其配置 | 给一次运行增加的时间 | 图节点数 |
|---|---|---|
| `ToolRetryMiddleware()` | 0.14 ms | 4 |
| `ModelRetryMiddleware()` | 0.15 ms | 4 |
| 触发条件永不满足的 `SummarizationMiddleware` | 0.36 ms | 5 |
| `ToolCallLimitMiddleware(run_limit=1000)` | 0.75 ms | 5 |
| 对已运行的工具没有中断的 `HumanInTheLoopMiddleware` | 0.86 ms | 5 |
| `ModelCallLimitMiddleware(run_limit=1000)` | 1.30 ms | 6 |
| `PIIMiddleware("email", strategy="redact")` | 1.36 ms | 6 |
| 五个 `PIIMiddleware` 实例，每种类型一个 | 4.77 ms | 14 |
| 摘要、PII、模型调用限制、工具重试和审核组成的栈 | 3.39 ms | 10 |

成本跟着节点数走。重试包装调用，增加不到 0.2 ms；每个带节点的中间件增加 0.4 到 1.4 ms。五个 PII 实例给一次 2.64 秒的 Qwen3 4B 运行增加了 4.8 ms，占 0.4%。所以按中间件的作用来选，并且别把节点钩子放进一个要做成千上万次快速调用的循环。

```takeaways
- 为 create_agent 在模型之外预留每次模型调用约 5 ms，不到本地模型运行的 3%。
- 预期 create_agent 的提示词 token 与你的朴素循环相同。
- 为了 Deep Agents 的工具才选它，并打开提示词缓存，因为每次调用多带几千个 token。
- 线程长到几千步时，用 DeltaChannel 或摘要。
- 在每个短命进程里，例如 CLI 工具或处理函数，都要把导入时间算进去。
- 被追踪的进程退出前，调用 wait_for_all_tracers()。
- 中间件要在快速循环的每次调用上运行时，优先用 wrap 钩子，不用节点钩子。
```

来源：capture/lab/summary/overhead-mac-real.json, capture/lab/T01-overhead-mac-real/01-runs.jsonl, capture/lab/T01-overhead-mac-real/t01_real.py, capture/lab/T01-overhead-mac-real/mr_common.py, capture/lab/last-two-mac/02-request-bodies.jsonl, capture/lab/last-two-mac/03-request-body-diff.txt, capture/lab/last-two-mac/lt2_body_diff.py, capture/lab/last-two-mac/lt2_diff.py, capture/lab/last-two-mac/lt_common.py; capture/lab/bench/summary-mac.json, capture/lab/bench/runs/main.jsonl, capture/lab/bench/runs/cost-ledger.jsonl; capture/lab/summary/import-times-mac.json, capture/lab/summary/install-size-mac.json, capture/lab/summary/tokens-mac.json, capture/lab/summary/checkpoint-cost-x86.json, capture/lab/summary/tracing-mac-real.json; capture/lab/summary/middleware-x86.json, capture/lab/T11-middleware-cost-x86/01-cost.jsonl, capture/lab/T11-middleware-cost-x86/t11_real.py; capture/lab/summary/middleware-mac.json; libs/partners/openai/langchain_openai/chat_models/base.py at langchain-openai 1.8.0.
