# 你需要 LangChain 吗？四种 harness，同一套任务集

> 三种 harness 在 60 个本地任务上给出完全相同的运行结果，Claude 跑过的每个任务都通过了，只有小型本地模型上的 deep agent 丢了任务。

你有一个约 40 行、围绕模型提供方 SDK 的工具循环，而且它能用。一位同事想把它迁到 `create_agent`，另一位想用 Deep Agents。两人都说 agent 会因此变好。没有人拿得出数字，因为没有人把同一批任务跑过每一种选择。

我们跑了。读完本节，你能说出 harness 在一次 agent 运行里改变什么、不改变什么。你还能依据实测的通过率、耗时、token 和美元数，在原生循环、`create_agent`、手写 `StateGraph` 和 Deep Agents 之间做选择。

## 立场 {#s-do-you-need-langchain-the-position}

- **决定质量的是模型，不是 harness。** 原生循环、`create_agent` 和手写 `StateGraph`，在两个模型上，对它们共同运行的每个任务给出相同的结果。
- **前沿模型不在乎由哪个 harness 来运行它。** Claude Haiku 5.5 用原生循环通过了 99 个任务中的 99 个，作为 deep agent 也是 99 个中的 99 个。
- **小型本地模型在乎，而 Deep Agents 恰恰是伤害它的那个 harness。** Qwen3 4B 用原生循环通过 99 个中的 70 个，作为 deep agent 通过 55 个。
- **相比模型，框架耗时只是噪声。** 在所有模型和 harness 上，它的中位数是每个任务 5 到 91 毫秒。第一张图只画 Qwen3 4B 和 Haiku，中位数在 6 到 67 毫秒。在每个单元格里，它都占任务耗时的不到 1.7%。
- **选 harness 要看它在模型周围做什么。** 理由是持久化、流式输出、审批和规划工具。质量不在其中。

## 任务集：99 个任务，以及读取状态的检查器 {#s-do-you-need-langchain-the-suite-99-tasks-and-checkers-that-read-state}

**任务集：** 基准工具包里的 99 个任务，分五个家族，每个 20 个，其中一个家族是 19 个。每个任务给 agent 一组工具和一个或多个用户轮次。然后检查器读取工具改变了什么。

| 家族 | 任务数 | agent 拿到的工具 | 检查器读取什么 |
|---|---|---|---|
| chain | 20 | 商品查询、汇率、承运商运费、单位换算、计算器、`submit_answer` | 用正确商品做的查询，以及提交的数字 |
| sql | 19 | 列出表、描述表、只读 `SELECT`、计算器、`submit_answer` | 用过的查询工具、没有变化的数据库哈希，以及答案 |
| retrieval | 20 | 在 26 份本地文档上做关键词搜索、读取一份文档、`submit_answer` | 打开过的支撑文档，以及答案 |
| files | 20 | 在任务文件夹里列出、读取、写入、重命名和删除 | 运行结束后文件夹里的每个文件，逐字节比较 |
| multiturn | 20 | 带 set、get、delete 和 list 的笔记 store、计算器、汇率 | 最后一轮之后 store 里的每个键和值，以及被问到时的答案 |

任务由固定数据生成：一份 12 件商品的目录、一个有 240 个订单的 SQLite 商店，以及一组虚构的文档。有脚本检查：正确的工具调用序列能通过每个任务，而不调用任何工具的 agent 在每个任务上都失败。

我们把一个任务 `sql19` 从本手册的每张表里去掉了。它问哪个类别的产品最多，而有两个类别各有 5 个。检查器只接受其中一个，所以正确的答案也可能失败。

只读最终文本的检查器，会让做错了事的运行通过。在任务 `multi13` 里，用户分三轮给出三个数，并要求把它们的和乘以 3 的结果存进笔记。Qwen3 8B 说它保存了结果：

```listing
title: 一次声称保存了结果的运行，以及之后的 store
source: capture/lab/bench/runs/main.jsonl
lang: json
note: Qwen3 8B 用原生循环的一行记录，截取结果、工具调用、最终文本和 store。期望值是 150。
---
{"run_id": "724bfc7f", "tag": "main", "ts": "2026-11-14T22:54:10", "task_id": "multi13", "family": "multiturn", "harness": "plain", "model": "qwen3:8b", …"passed": false, …"checks": {"kv_state": false}, "category": "wrong_final_state", …"tool_seq": ["kv_set"], "final_text": "The result has been saved under the key 'result' in your notes.", …"final_state": {"result": "129"}}
```

17、25 和 8 的和是 50，结果是 150。模型保存的是 129。它的回复对动作的描述是真的，对数值的描述是错的，只有 store 才能暴露这一点。

**通过：** 任务的检查在运行结束时成立。如果 `submit_answer` 收到了正确的值，就算问题被回答了。如果最终文本里包含这个值，并且没有把任何工具调用写成文本，也算回答了。

**严格通过：** 答案同时通过 `submit_answer` 给出的通过。Qwen3 4B 用原生循环通过了 99 个任务中的 70 个，严格通过 20 个。它经常在回复里写出正确的数字，却从不调用那个工具。Claude Haiku 5.5 每次都调用。

## 四种 harness，同一个提示词 {#s-do-you-need-langchain-four-harnesses-one-prompt}

每种 harness 拿到同样的系统提示词、同样的工具，以及每个用户轮次最多 10 次模型调用的上限。

- **原生循环：** 我们自己写在 `bind_tools` 上的循环。它调用模型，运行每个工具调用，追加一条 `ToolMessage`，并在模型不再要求工具时停止。它在工具包里是 27 行。
- **`create_agent`：** `langchain` 1.5.0 的 agent，带 `InMemorySaver`。
- **手写 `StateGraph`：** 一个模型节点、一个 `ToolNode`，以及来自 `langgraph` 1.2.22 的 `tools_condition`，带 `InMemorySaver`。它就是 `create_agent` 构建的那张图，只是手写。
- **Deep agent：** `deepagents` 0.7.38 的 `create_deep_agent`，用它的默认后端和我们的工具。它增加文件工具、一个 `task` 工具和它的中间件栈，[第 7.4 节](#s-deep-agents-0-7)会展示。

本地模型在 Ollama 上以 temperature 0 和 seed 42 运行。Claude 对这些模型不接受 temperature，所以工具包没有发送，每个任务只运行一次。在 Claude 上，原生循环把它的系统提示词标记为提示词缓存。deep agent 自己增加了一个缓存中间件。

## 结果 {#s-do-you-need-langchain-results}

**我们测得**每一行，在 Mac 上。本地模型在那里用 Ollama 运行，Claude 则从同一台 Mac 经 Anthropic API 运行。Qwen3 4B、Qwen3 8B 和 Claude Haiku 5.5 运行了全部 99 个任务。其他模型运行一个 30 个任务的分层子集，每个家族 6 个。每个单元格是每个任务一次运行，区间是 95% 的 Wilson 区间。

```figure
id: fig-1-2
kind: chart
title: 每个模型和 harness 在每个任务上的结果
claim: 原生循环、create_agent 和 StateGraph 各行逐任务一致，Claude 在两种 harness 下全部通过，而 deep agent 只在本地模型上丢了任务。
caption: 每一列是一个任务，按家族分组，每一行是一个模型加一种 harness。实心方块是通过，颜色取自 harness 所在的层，玫瑰色方块是失败。只有 30 个任务的行运行的是子集，所以它们其余的列是空白。来源：capture/lab/bench/summary-mac.json。
```

| 模型 | 任务数 | 原生循环 | `create_agent` | `StateGraph` | Deep agent |
|---|---|---|---|---|---|
| Claude Haiku 5.5 | 99 | 99，0.96 到 1.00 | 未运行 | 未运行 | 99，0.96 到 1.00 |
| Qwen3 8B | 99 | 74，0.65 到 0.82 | 未运行 | 未运行 | 58，0.49 到 0.68 |
| Qwen3 4B | 99 | 70，0.61 到 0.79 | 未运行 | 未运行 | 55，0.46 到 0.65 |
| Claude Sonnet 5.5 | 30 | 30，0.89 到 1.00 | 未运行 | 未运行 | 30，0.89 到 1.00 |
| gpt-oss 20B | 30 | 28，0.79 到 0.98 | 未运行 | 未运行 | 24，0.63 到 0.91 |
| Qwen3 14B | 30 | 26，0.70 到 0.95 | 未运行 | 未运行 | 24，0.63 到 0.91 |
| Qwen3 4B | 30 | 23，0.59 到 0.88 | 23 | 23 | 13，0.27 到 0.61 |
| Qwen3 8B | 30 | 18，0.42 到 0.75 | 18 | 18 | 16，0.36 到 0.70 |
| Qwen3 30B-A3B，开启思考 | 30 | 15，0.33 到 0.67 | 未运行 | 未运行 | 15，0.33 到 0.67 |

### 三种 harness，同一组请求 {#s-do-you-need-langchain-three-harnesses-one-set-of-requests}

在 Qwen3 4B 和 Qwen3 8B 上，原生循环、`create_agent` 和 `StateGraph` 在各自的 30 个任务中，每一个的结果都相同。它们的最终文本、工具调用和 token 数也相同。工具包为其中 42 组任务对保留了每次调用的提示词 token，全部 198 次调用都一致。

用贪心解码时，输出相同意味着模型看到的是同一个请求。所以 `create_agent` 和 LangGraph 没有增加隐藏的提示词、额外的工具或重新排序。[第 8.3 节](#s-cost-the-framework-against-a-plain-sdk-loop)用代理也找到了相同的提示词 token。

### Deep Agents：在 Claude 上持平，在小模型上更差 {#s-do-you-need-langchain-deep-agents-equal-on-claude-worse-on-small-models}

在 Claude Haiku 5.5 上，原生循环和 deep agent 在 99 个任务中的 99 个上一致。在 Claude Sonnet 5.5 上，它们在 30 个中的 30 个上一致。任务集在这里无法区分它们，因为两者都全部通过。

在 Qwen3 4B 上，它们在 99 个任务中的 42 个上一致。只有原生循环通过的有 36 个，只有 deep agent 通过的有 21 个。在 Qwen3 8B 上，它们在 73 个上一致，两个数分别是 21 和 5。全部的损失都在两个家族里：

| 家族 | Qwen3 4B 原生 | Qwen3 4B deep | Qwen3 8B 原生 | Qwen3 8B deep |
|---|---|---|---|---|
| files | 20 个中的 16 个 | 20 个中的 2 个 | 20 个中的 17 个 | 20 个中的 5 个 |
| retrieval | 20 个中的 15 个 | 20 个中的 7 个 | 20 个中的 13 个 | 20 个中的 6 个 |
| 其余 59 个任务 | 39 | 46 | 44 | 47 |

文件上的损失来自 Deep Agents 的默认后端，它的文件工具写进 agent 状态，而不是磁盘。[第 7.4 节](#s-deep-agents-0-7)展示其中每次运行。在 retrieval 上，4B 的 deep agent 有 6 个问题不调用任何工具就回答，并说它无法访问这些数据。原生循环一次都没有这样做。在其余 59 个任务上，deep agent 通过得更多：Qwen3 4B 上是 46 对 39，Qwen3 8B 上是 47 对 44。

### 另外三种设置，以及 Claude Agent SDK {#s-do-you-need-langchain-three-more-settings-and-the-claude-agent-sdk}

第一轮基准之后，我们又运行了更多变体。[第 7.4 节](#s-deep-agents-0-7)给出细节。一个 harness 配置档案隐藏了内置的文件工具。它让 Qwen3 4B 上的 deep agent 停在 99 个中的 55 个。它让 Qwen3 8B 上的 deep agent 从 58 升到 63。原生循环通过了 70 和 74。

`langchain-quickjs` 的 eval 工具在四个模型上都没有带来提升。[第 4.6 节](#s-the-built-in-middleware)测量了一个评分器中间件。

**我们测得**Claude Agent SDK 0.2.182（自带 Claude Code CLI 2.1.325）与 deep agent 在 30 个任务的子集上的对比。两者都在 Mac 上运行 Claude Haiku 5.5，用同样的五个任务工具，每个任务一次运行。SDK 通过一个进程内的 MCP 服务器拿到这些工具。[图](#fig-1-2c)展示这两者。

```figure
id: fig-1-2c
kind: chart
title: Claude Agent SDK 与 Deep Agents 在同样 30 个任务上的对比
claim: 两种 harness 在 Haiku 上都通过了 30 个任务中的 30 个，而 SDK 每个任务读取 9.3k 输入 token，deep agent 则是 23.7k。
caption: 顶部各行给出这 30 个任务的通过数、模型调用数的中位数、输入 token 的中位数和美元数。下方每个点是一个任务。数值取自各 harness 自己的报告。来源：capture/lab/summary/multiagent-mac.json。
```

两种 harness 在 30 个任务中的 30 个上给出相同的结果，所以任务集无法在质量上给它们排名。这 30 个任务，作为 deep agent 花费 $0.0168，用 SDK 花费 $0.0139，用的是它们各自报告的成本。

### 模型决定分数 {#s-do-you-need-langchain-the-model-sets-the-score}

在 30 个任务的子集上用原生循环，五个本地模型通过了 15 到 28 个任务，两个 Claude 模型都通过了 30 个。在同一个模型上，三种原生 harness 让分数变动了 0 个任务。先把精力花在模型上，再考虑 harness。

模型大小本身排不出本地模型的顺序。Qwen3 4B Instruct 在子集上通过 23 个，Qwen3 8B 通过 18 个，但在全部 99 个任务上，它们分别通过 70 和 74。它们的区间有重叠。Qwen3 30B-A3B 开着思考运行，它在原生循环的 15 次失败里，有 10 次把工具调用写成了文本。

## 耗时与 token {#s-do-you-need-langchain-time-and-tokens}

**框架耗时：** 一个任务的墙钟时间，减去模型调用和工具函数内部的时间。它包含循环、图、checkpointer 和中间件。

**我们测得**每个任务的框架耗时，在 Mac 上。[图](#fig-1-2b)展示每个任务。

```figure
id: fig-1-2b
kind: chart
title: 模型之外的耗时，以及 deep agent 的提示词 token
claim: 框架每个任务的中位数为 6 到 67 毫秒，而模型耗时以秒计，deep agent 发送的 token 是 3.6 到 4.3 倍。
caption: 左图每个点是一个任务，纵轴为对数刻度，黑线是中位数。右图每个点是一个任务：deep agent 的提示词 token 除以原生循环的。黑线是总和之比。来源：capture/lab/bench/summary-mac.json。
```

在 30 个任务的子集上用 Qwen3 4B，原生循环的中位数是 6.2 毫秒，`create_agent` 是 22.5 毫秒。`StateGraph` 是 18.5 毫秒，deep agent 是 55.2 毫秒。原生循环下每个任务的模型耗时是 9.7 秒。用 Claude Haiku 5.5 跑 99 个任务，原生的中位数是 8.4 毫秒，deep 的是 66.5 毫秒，模型耗时则是 5.0 秒。

按占墙钟时间的比例算，框架在每个本地单元格里都不到 0.5%。在 Claude 上，原生循环占 0.24%，deep agent 占 1.43%，因为托管模型回答得更快。在 Claude Sonnet 5.5 上，deep agent 的中位数是 90.8 毫秒。在 498 次模型调用上，Haiku 上的 deep agent 每次调用比原生循环多花约 14 毫秒。

deep agent 在每个模型上发送的 token 都更多。在两种 harness 都运行过的任务上，它发送的提示词 token 是原生循环的 3.6 到 4.3 倍。原因是每次调用都带着它自己那些工具的 schema。在 Qwen3 4B 和 8B、gpt-oss 和 Claude 上，它的调用次数中位数与原生循环一致：本地是 4，Claude 上是 5。在 Qwen3 14B 上，原生循环是 5，deep agent 是 4。在 30B 模型上，原生循环是 3.5，deep agent 是 4。

在本地模型上，这些 token 要花时间。在 Qwen3 4B 上，任务耗时的中位数，deep agent 是 22.6 秒，原生循环是 9.1 秒。

## 成本 {#s-do-you-need-langchain-cost}

**我们测得**每次 Claude 调用的美元数，依据 API 返回的用量，按 2026-11-14 的标价。Claude Haiku 5.5 每百万输入 token $0.10，每百万输出 token $0.50。Claude Sonnet 5.5 是 $2 和 $10。

| 模型与 harness | 任务数 | 实付 | 每个任务 | 按标价不用缓存 |
|---|---|---|---|---|
| Claude Haiku 5.5，原生循环 | 99 | $0.045 | $0.00045 | $0.085 |
| Claude Haiku 5.5，deep agent | 99 | $0.052 | $0.00053 | $0.264 |
| Claude Sonnet 5.5，原生循环 | 30 | $0.263 | $0.0088 | $0.507 |
| Claude Sonnet 5.5，deep agent | 30 | $0.327 | $0.0109 | $1.591 |

提示词缓存抹平了 token 差距的大部分。在 Haiku 上，deep agent 花费是原生循环的 1.16 倍，在 Sonnet 上是 1.24 倍。按标价不用缓存的话，分别是 3.10 倍和 3.14 倍。[第 7.4 节](#s-deep-agents-0-7)展示每个任务。

整个基准用 2,589 次 API 调用，花费 $0.93。[第 9.6 节](#s-evals-that-check-state)的评估增加了 64 次 Claude 调用，花费 $0.011。第二轮基准增加了 370 次调用，花费 $0.069，[第 6.7 节](#s-subgraphs-and-multi-agent-patterns)的多 agent 运行增加了 1,518 次调用，花费 $0.150。

### 文档里的表怎么说模型 {#s-do-you-need-langchain-what-the-docs-table-says-about-models}

Deep Agents 的模型页展示了 13 个模型在一套评估集上的分数 {{docs oss/python/deepagents/models}}。我们在 2026-11-15 读了这个页面，并保留了它的数字。我们没有运行这些模型。下表展示七列中的三列。

| 模型 | 总分 | 工具使用 | 文件操作 | 该行的 CI 运行数 |
|---|---|---|---|---|
| `google_genai:gemini-3.6-flash` | 0.82 | 0.90 | 1.00 | 2 |
| `openai:gpt-5.4` | 0.18 | 0.18 | 1.00 | 3 |
| `openai:gpt-5.5` | 0.80 | 0.84 | 0.92 | 2 |
| `anthropic:claude-opus-4-6` | 0.26 | 0.26 | 0.92 | 3 |
| `anthropic:claude-opus-4-7` | 0.80 | 0.82 | 1.00 | 1 |
| `baseten:moonshotai/Kimi-K2.6` | 0.79 | 0.84 | 0.92 | 1 |
| `baseten:zai-org/GLM-5` | 0.77 | 0.89 | 1.00 | 2 |
| `fireworks:accounts/fireworks/models/glm-5p1` | 0.81 | 0.87 | 1.00 | 1 |
| `fireworks:accounts/fireworks/models/minimax-m2p7` | 0.79 | 0.85 | 1.00 | 1 |
| `ollama:minimax-m2.7:cloud` | 0.73 | 0.82 | 0.92 | 2 |
| `openrouter:deepseek/deepseek-v4-flash` | 0.81 | 0.90 | 1.00 | 1 |
| `openrouter:minimax/minimax-m2.7` | 0.80 | 0.89 | 0.92 | 1 |
| `openrouter:z-ai/glm-5.1` | 0.89 | 0.89 | 0.92 | 5 |

没有任何一行是 20B 参数或更小的本地模型。所以这个页面没法告诉你更小的模型表现如何。有七行混合了来自两到五次不同 CI 运行的单元格。

有七行没有记忆分数。有两行很奇怪：`openai:gpt-5.4` 和 `anthropic:claude-opus-4-6`。它们的总分 0.18 和 0.26，等于它们的工具使用分数。它们的文件操作、检索和摘要单元格是 0.92 到 1.00。

冲突登记把这一点记为冲突 D137。把这个页面当作大型托管模型在一套评估集上的排名来读，其他问题就用你自己的任务去跑。

## 该用哪一个 {#s-do-you-need-langchain-which-one-to-use}

| 你的情况 | 选择 | 背后的数字 |
|---|---|---|
| 一次模型调用，没有工具，没有状态 | 模型提供方 SDK | 没有任何 harness 能再增加什么 |
| 单进程里的工具循环，不暂停，不恢复，重启后没有历史 | 原生循环 | 在 60 个任务中的 60 个上，结果、token 和文本与 `create_agent` 相同，每个任务 6 毫秒 |
| 你需要 checkpointer、流模式、审批或中间件 | `create_agent` | 请求与原生循环相同，每个任务多 12 到 16 毫秒，占任务耗时的 0.20% 到 0.25% |
| 你需要分支、并行节点或子图 | 手写 `StateGraph` | 在循环形态上与 `create_agent` 的请求相同，每个任务 18.5 毫秒 |
| 带提示词缓存的前沿模型，并且你想要文件工具和子 agent | Deep Agents | Haiku 上 99 个中的 99 个，Sonnet 上 30 个中的 30 个，花费是 1.16 到 1.24 倍 |
| Ollama 上的本地模型 | 原生循环或 `create_agent`，绝不用默认的 deep agent | Qwen3 4B 和 8B 在 99 个里分别少 15 和 16 个，14B 和 20B 在 30 个里少 2 到 4 个 |
| 前沿模型，并且你想要不带框架的 Claude 工具循环 | Claude Agent SDK | Haiku 上 30 个中的 30 个，输入 token 中位数 9.3k，deep agent 是 23.7k |
| 你想要更好的分数 | 更好的模型 | 不同模型之间是 30 个里的 15 到 30 个，三种原生 harness 之间是 0 |

第 2 部分展示 `create_agent` 用这些毫秒换来了什么：超步循环、检查点和流。[第 9 部分](#p-9)把 `create_agent` 放进一个带审批、Postgres checkpointer 和 span 的服务里，在三个真实模型上运行。

## 这套任务集不能告诉你什么 {#s-do-you-need-langchain-what-this-suite-cannot-tell-you}

Claude 的几行已经到了天花板。两个 Claude 模型都全部通过的任务集，无法给它们排名，也无法在它们身上显示几个百分点的 harness 效应。更难的任务集可以。为了控制 API 花费，我们没有运行。

每个 Claude 任务都用 API 的默认采样运行了一次。每个本地任务也只运行了一次，[方法说明](#s-ref-the-bench-method)展示了为什么在本地上一次贪心运行就够了。这套任务集测的是 1 到 12 次模型调用的短任务，中位数为 4 次。它对几百轮的线程什么也没说，那是[第 5.5 节](#s-context-engineering-and-summarization)的内容。它对负载下的服务也什么都没说，那由[第 9.7 节](#s-workers-the-advisory-lock-and-cost)测量。

```takeaways
- 选 harness 看持久化、流式输出、审批或文件，绝不为了答案质量。
- 按工具留下的状态检查 agent，绝不按它的最终文本。
- 换 harness 之前，先在两个模型上跑你自己的任务。
- 别让小型本地模型用默认的 deep agent。
- 评判 Deep Agents 的 token 成本之前，先打开提示词缓存。
```

来源：capture/lab/bench/summary-mac.json, capture/lab/bench/summarize.py, capture/lab/bench2/docs-eval-table.json, capture/lab/bench2/summary-bench2.json, capture/lab/summary/multiagent-mac.json, capture/lab/multiagent/runs/n9-sdk-haiku.jsonl, capture/lab/multiagent/runs/n9-deep-haiku.jsonl, capture/lab/bench/runs/main.jsonl, capture/lab/bench/runs/models.jsonl, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/bench/data/tasks.jsonl, capture/lab/bench/data/subset30.txt, capture/lab/bench/data/anthropic-prices.json, capture/lab/bench/kit/harnesses.py, capture/lab/bench/kit/checks.py, capture/lab/bench/kit/env.py, capture/lab/bench/kit/gen_tasks.py, capture/lab/bench/kit/oracle.py, capture/lab/bench/kit/run.py, capture/lab/bench/kit/models.py; libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; libs/langgraph/langgraph/prebuilt at langgraph 1.2.22; libs/deepagents/deepagents/graph.py at deepagents==0.7.38; the Anthropic pricing page, read 2026-11-14; docs.langchain.com at docs commit 04d4d4a (oss/python/deepagents/models).
