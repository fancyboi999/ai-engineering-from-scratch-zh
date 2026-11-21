# 大量工具与工具选择器

> Claude Haiku 5.5 在 100 个工具时 10 个任务全部通过；LLMToolSelectorMiddleware 让它的调用次数和成本翻倍；而选择器把 Qwen3 4B 在每种规模下都压到了 10 个任务只过 1 个。

你的 agent 已经长到 60 个工具，每个内部 API 一个。有人读到工具列表太长会让模型困惑，就加了 `LLMToolSelectorMiddleware`，只把相关的几个发给模型。这个想法听起来稳妥：列表更短，token 更少，错误调用更少。我们测了一下，它在两个提供方上都不稳妥。

读完本节，你能预测随着工具增加，通过率、token、耗时和费用如何变化。你还能从代码上解释选择器为何在 `langchain` 1.5.0 上失败，并决定怎样处理一份很长的工具列表。

## 结论 {#s-many-tools-and-the-tool-selector-the-position}

- **把全部工具绑定给前沿模型。** Claude Haiku 5.5 在 5、20、50 和 100 个工具时都是 10 个任务全过，40 次运行中只出现一次干扰调用。
- **开启 prompt 缓存，因为工具列表就是成本。** 100 个工具时，中位的运行发送了 44,645 个 prompt token，缓存把账单压到了标价的 36%。
- **在 `langchain` 1.5.0 上不要使用 `LLMToolSelectorMiddleware`。** 它的选择请求在消息里没有任何工具描述。在 Claude 上，它让调用次数、耗时和费用翻倍，却一无所获。在 Qwen3 4B 上，它让每种规模下的通过数都降到 10 个中的 1 个。
- **在小型本地模型上，保持列表简短。** Qwen3 8B 在 5 到 50 个工具之间，从 10 个中 5 个降到 0 个。Qwen3 4B 在 100 个工具时仍保持 10 个中 5 个，但中位的一次运行耗时 53 秒。

## 实验 {#s-many-tools-and-the-tool-selector-the-experiment}

**干扰工具（distractor tool）：** 任务用不到的工具，名称和描述都像模像样，例如 `get_item_price_history`、`search_catalog` 或 `get_delivery_estimate`。测试基准有 95 个这样的工具。其中一个是已弃用的货币换算器，它的描述说不要使用它。

测试基准通过 `create_agent` 跑了 10 个链任务，即 `chain01` 到 `chain19` 中的奇数编号。每个任务需要 `get_item_info` 和另外两到四次查询。agent 拿到 5 个查询工具、`submit_answer`，以及足够的干扰工具，使工具总数达到 5、20、50 或 100 个，不含 `submit_answer`。每个任务和每种规模，工具的顺序用固定种子打乱。

每种规模运行三种设置：

- **无选择器：** 每次调用都绑定所有工具。
- **选择器：** `LLMToolSelectorMiddleware`，用 agent 的模型，`max_tools=6`，`always_include=["submit_answer"]`，使用它的默认 prompt。
- **带列表的选择器：** 同上，另用我们自己的 `system_prompt`，其中加上每个工具的名称和描述。只有 Qwen3 模型运行了它。

**我们测得**每次运行，在 Mac 上进行。Qwen3 4B 在四种规模上运行，Qwen3 8B 在 5 和 50 个工具上运行，都在 Ollama 上、温度为 0。Claude Haiku 5.5 通过 API 在四种规模上运行。每个格子是 10 个任务各一次。

这里的通过是检查器的宽松通过。严格通过还要求有 `submit_answer`，在 Qwen3 的各格里是 10 个中的 0 到 2 个。[图](#fig-4-4)显示每一次运行。

```figure
id: fig-4-4
kind: chart
title: 四种工具数量下的十个链任务，有选择器和没有选择器
claim: 没有选择器时 Claude 的 40 次运行全部通过，使用默认选择器时，Qwen3 在任何一格里最多通过 10 个中的 2 个。
caption: 每个方块是一个任务的一次运行。蓝色和梅紫色是通过。实心玫红是干扰调用或没有查询商品，浅玫红是其他失败，黑色是抛出异常的运行。每组后面的数字是 10 个里通过的个数。来自 capture/lab/bench/summary-mac.json。
```

| 模型与设置 | 5 个工具 | 20 个工具 | 50 个工具 | 100 个工具 |
|---|---|---|---|---|
| Claude Haiku 5.5，无选择器 | 10 | 10 | 10 | 10 |
| Claude Haiku 5.5，选择器 | 10 | 10 | 10 | 9 |
| Qwen3 4B，无选择器 | 5 | 6 | 5 | 5 |
| Qwen3 4B，选择器 | 1 | 1 | 1 | 1 |
| Qwen3 4B，带列表的选择器 | 3 | 2 | 4 | 2 |
| Qwen3 8B，无选择器 | 5 | 未运行 | 0 | 未运行 |
| Qwen3 8B，选择器 | 2 | 未运行 | 2 | 未运行 |
| Qwen3 8B，带列表的选择器 | 3 | 未运行 | 3 | 未运行 |

每格只有 10 次运行，95% 的 Wilson 区间很宽。10 个中 5 个的区间是 0.24 至 0.76，10 个中 1 个的是 0.02 至 0.40。所以请把几种规模放在一起看。在四种规模上，Qwen3 4B 没有选择器时通过了 40 个中的 21 个，有选择器时通过了 40 个中的 4 个。区间分别是 0.37 至 0.67 和 0.04 至 0.23。

有一格反了过来。Qwen3 8B 在 50 个工具时，没有选择器通过 10 个中的 0 个，有选择器通过 2 个。没有选择器时，模型在这 10 次运行里做了 31 次干扰调用。

即使在 5 个工具时，选择器也有害，那里它本来没有东西可去掉。带选择器的 Qwen3 8B，在 10 次运行中有 7 次从未调用 `get_item_info`。没有选择器时，它每次运行都调用了，所以很可能是选择器把它丢掉了。

## 选择器发送什么 {#s-many-tools-and-the-tool-selector-what-the-selector-sends}

`LLMToolSelectorMiddleware` 在 `wrap_model_call` 里运行，位于 agent 的每次模型调用之前。它构建一个两条消息的请求：它的系统 prompt，附一句关于 `max_tools` 的说明，以及最后一条用户消息 {{code libs/langchain_v1/langchain/agents/middleware/tool_selection.py:402-405}}。它请求结构化输出，这个 schema 把每个工具名列为字面值，工具描述作为字段描述 {{code libs/langchain_v1/langchain/agents/middleware/tool_selection.py:63-94}}。

所以消息里没有工具列表。模块里有一个函数，把每个名称连同描述渲染出来，但在 1.5.0 里没有任何地方调用它 {{code libs/langchain_v1/langchain/agents/middleware/tool_selection.py:109-118}}。只有提供方把 schema 的字段描述展示给模型，描述才会到达模型。

两个提供方的做法不同。`ChatAnthropic` 默认把 schema 变成工具 {{code libs/partners/anthropic/langchain_anthropic/chat_models.py:2880-2890}}，所以 Claude 把描述当作工具定义的一部分来读。`ChatOllama` 把 schema 作为请求的 `format` 发送 {{code libs/partners/ollama/langchain_ollama/chat_models.py}}。在 Qwen3 上，选择看起来像是只凭名称做出的挑选：

- 在 20 个工具时，Qwen3 4B 在 10 次运行中有 8 次从未调用 `get_item_info`。它改为调用 `search_catalog` 和 `get_item_price_history` 这样的工具。
- 我们在系统 prompt 里放上列表后，它在 20 个工具的 10 次运行里没有做干扰调用，却仍然只通过了 2 次。五个答案是错的，三次运行把工具调用写成了文本。

选择器还只能看到最后一条用户消息。它永远看不到工具结果，所以不能添加 agent 在第一次查询之后才需要的工具。

## 一次让运行终止的选择 {#s-many-tools-and-the-tool-selector-a-selection-that-ends-the-run}

选择结果指名了一个不存在的工具时，中间件抛出 `ValueError` {{code libs/langchain_v1/langchain/agents/middleware/tool_selection.py:311-328}}。`on_parsing_failure` 参数在这里不适用。它处理的是回复不是名称列表的情况，而未知的名称仍然是一个有效的列表 {{code libs/langchain_v1/langchain/agents/middleware/tool_selection.py:346-372}}。

Claude Haiku 5.5 在 100 个工具时，已经提交了正确答案，下一次选择却点了一个 agent 没有的工具：

```listing
title: 一次已找到答案、随后在选择器里抛出异常的运行
source: capture/lab/bench/runs/toolscale.jsonl
lang: json
note: 一行记录，只保留检查项、错误、答案和工具调用。
---
{"run_id": "e08495cc", "tag": "toolscale", "ts": "2026-11-15T12:04:50", "task_id": "chain17", …"n_tools": 101, "passed": false, …"checks": {"get_item_info(trail lantern)": true, "get_item_info(camp stove)": true, "answer_submitted": true, "answer_correct": true}, "category": "harness_error", "detail": "ValueError: Model selected invalid tools: ['get_item_weight']", "answer": "camp stove", …"tool_seq": ["get_item_info", "get_item_info", "get_exchange_rate", "submit_answer"], …}
```

这个异常结束了运行，所以调用方拿到的是错误，而不是一个完成的任务。Qwen3 4B 以同样的方式抛出过两次，分别在 50 和 100 个工具时，工具名是空字符串。

## token、耗时与费用 {#s-many-tools-and-the-tool-selector-tokens-time-and-dollars}

**我们测得**每次运行的 prompt token，包含选择器调用。[图](#fig-4-4b)显示每一次运行。

```figure
id: fig-4-4b
kind: chart
title: 每次运行的 prompt token 与工具数量的关系
claim: 在 Claude 上，prompt token 从 5 个工具到 100 个增长了六倍；选择器削减了它们，同时让调用次数翻倍，加上缓存之后连费用也翻倍。
caption: 每个点是一次运行，纵轴是对数刻度，每条线连接各组的中位数。蓝色是无选择器，梅紫色是选择器。表格给出 10 次 Claude 运行的计费金额，以及 Qwen3 4B 运行的中位秒数。来自 capture/lab/bench/summary-mac.json。
```

在 Claude Haiku 5.5 上、没有选择器时，中位的运行在 5 个工具时发送 7,380 个 prompt token，在 100 个工具时发送 44,645 个。每个工具 schema 都给每次调用增加负担。选择器把 100 个工具时的中位数削减到 33,277，却在 5 个工具时把它抬高了。带选择器的每次运行有 9 或 10 次模型调用，对比 4.5 至 5 次。

选择器让一次运行的耗时翻倍：中位数 10.2 至 12.6 秒，对比 5.0 至 5.9 秒。它也让账单翻倍。100 个工具时，10 次运行在没有选择器时花费 $0.016，有选择器时花费 $0.033。

缓存解释了这笔账单。没有选择器时，100 个工具的 10 次运行按标价的 36% 计费。有选择器时，按 87% 计费。我们的解读是：选择会改变每次请求的工具列表，而工具位于缓存所匹配前缀的最前面。按标价、不用缓存的话，选择器在 100 个工具时本可节省 15%，在 5 和 20 个工具时则花得更多。

在 Qwen3 4B 上，选择器确实节省了时间。没有它时，100 个工具的一次运行中位耗时 53 秒，5 个工具时是 8 秒。那次运行里，Ollama 读了 29,000 个 prompt token。有选择器时，一次运行耗时 6 到 18 秒。但它也在 10 次里失败了 9 次。

## 面对很长的工具列表怎么办 {#s-many-tools-and-the-tool-selector-what-to-do-with-a-long-tool-list}

| 情形 | 这样做 | 背后的数字 |
|---|---|---|
| Claude Haiku 5.5，最多 100 个工具 | 全部绑定，并开启 prompt 缓存 | 40 次运行全过，100 个工具时 10 次运行花费 $0.016 |
| 小型本地模型 | 让列表贴近任务所需的工具 | Qwen3 8B 在 5 个工具时 10 个中 5 个，50 个时 10 个中 0 个 |
| 你仍想用 `LLMToolSelectorMiddleware` | 传入一个列出每个名称和描述的 `system_prompt`，并在运行外围处理 `ValueError` | 有列表时 10 个中 2 至 4 个，没有时 10 个中 1 个 |
| 运行之前你就知道任务类型 | 在自己的代码里选择工具，只绑定这些 | 我们没有测量这一项，它也不增加模型调用 |

```takeaways
- 把每个工具都绑定给前沿模型，并为工具 schema 开启 prompt 缓存。
- 在 langchain 1.5.0 上，不要在生产里使用 LLMToolSelectorMiddleware。
- 无论如何都要用选择器时，在选择器 prompt 里加一份工具描述列表。
- 在带选择器的运行外围处理 ValueError，因为未知的工具名会结束运行。
- 在本地模型上加工具之前，先测每次运行的耗时，因为读 prompt 的时间占主导。
```

来源：capture/lab/bench/summary-mac.json, capture/lab/bench/summarize.py, capture/lab/bench/runs/toolscale.jsonl, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/bench/kit/toolscale.py, capture/lab/bench/kit/run.py, capture/lab/bench/kit/harnesses.py; libs/langchain_v1/langchain/agents/middleware/tool_selection.py at langchain==1.5.0; libs/partners/ollama/langchain_ollama/chat_models.py at langchain-ollama 1.1.0; libs/partners/anthropic/langchain_anthropic/chat_models.py at langchain-anthropic 1.7.10.
