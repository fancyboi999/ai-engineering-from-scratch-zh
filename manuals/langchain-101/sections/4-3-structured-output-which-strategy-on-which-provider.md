# 结构化输出：哪个提供方用哪种策略

> 在 Qwen3 4B 上，ToolStrategy 在 39 个任务中有 39 个没有给出对象，ProviderStrategy 在 10 次中有 10 次抛出异常，而一次提取调用在每个模型上都达到了最高得分。

你的 agent 查一个价格，换算后，必须把一个数字交给你的代码。你按文档所示，把一个 Pydantic 类作为 `response_format` 传入。在 Claude 上，数字到手。在通过 Ollama 的本地模型上，同一个 agent 完成了每一次查询，却返回 `structured_response=None`，或者在调用任何工具之前就抛出异常。

读完本节，你能根据实测比率为每个提供方挑选结构化输出的方法。你还能从代码上解释 Ollama 的两种失败，并加上那一次在两个提供方上都管用的额外调用。

## 结论 {#s-structured-output-which-strategy-on-which-provider-the-position}

- **在 Ollama 上，不要给带工具的 agent 设置 `response_format`。** 让 agent 运行到最终回复，然后对这条回复再做一次 `with_structured_output` 调用。
- **在 Claude 上，使用 `ProviderStrategy` 或 `ToolStrategy`。** 它们在 39 个任务中分别有 39 个和 38 个返回了正确的值。
- **永远不要用模式去解析自由文本。** Claude Haiku 5.5 在 39 个任务中有 37 个，回复里有正确的值。回复的最后一个数字只有 15 个是对的。

[第 4.2 节](#s-structured-output-autostrategy-providerstrategy-toolstrategy)解释每种策略的工作方式，以及 `AutoStrategy` 如何选择。本节在真实任务和真实查询上测量它们。

## 实验 {#s-structured-output-which-strategy-on-which-provider-the-experiment}

测试基准把[任务集](#s-do-you-need-langchain)里的 20 个链任务和 19 个 SQL 任务通过 `create_agent` 跑了一遍。每个任务在作答之前需要两到六次查询。schema 只有一个字段：

```listing
title: 每次结构化输出运行的 schema
source: capture/lab/bench/kit/structured.py
lang: python
---
class FinalAnswer(BaseModel):
    answer: str = Field(description="Only the final answer value: a number or a name, with no units and no explanation.")
```

agent 有该族的查询工具，没有 `submit_answer`。系统提示词要求它以最终答案的值结束。四种方法在同样的任务上运行：

- **自由文本：** 没有 `response_format`。工具包取最终回复的最后一个数字，名称则取整条回复。
- **`ToolStrategy`：** `response_format=ToolStrategy(FinalAnswer)`。
- **`ProviderStrategy`：** `response_format=ProviderStrategy(FinalAnswer)`。
- **提取调用：** 没有 `response_format`。运行之后，用同一个模型再调用一次，通过 `with_structured_output(FinalAnswer)`，读取问题和最终回复。

查询以正确的参数运行、结构化的值又与真值相符时，这次运行算作正确。

**我们测得**每一行，在 Mac 上进行：Ollama 上温度为 0 的 Qwen3 4B 和 Qwen3 8B，以及通过 API 调用的 Claude Haiku 5.5。每个格子是每个任务一次运行，共 39 个任务，只有 Qwen3 4B 上的 `ProviderStrategy` 例外，它跑了 10 个。Qwen3 8B 没有运行 `ProviderStrategy`。[图](#fig-4-3)显示每一个任务。

```figure
id: fig-4-3
kind: chart
title: 结构化输出，按方法和模型列出每个任务的答案
claim: 在 Qwen3 4B 上两种策略都没有返回对象，提取调用保住了回复里有的每个值，在 Claude 上除自由文本外都管用。
caption: 每一列是一个任务，每一行是一个模型和方法。蓝色是正确的值，浅玫红是错误的值，空方块是没有结构化答案，实心玫红是抛出了错误。来自 capture/lab/bench/summary-mac.json。
```

| 模型 | 自由文本 | `ToolStrategy` | `ProviderStrategy` | 提取调用 |
|---|---|---|---|---|
| Qwen3 4B | 39 个中 25 个，0.48 至 0.77 | 39 个中 0 个，0.00 至 0.09 | 10 个中 0 个，0.00 至 0.28 | 39 个中 30 个，0.62 至 0.87 |
| Qwen3 8B | 39 个中 18 个，0.32 至 0.61 | 39 个中 14 个，0.23 至 0.52 | 未运行 | 39 个中 26 个，0.51 至 0.79 |
| Claude Haiku 5.5 | 39 个中 15 个，0.25 至 0.54 | 39 个中 38 个，0.87 至 1.00 | 39 个中 39 个，0.91 至 1.00 | 39 个中 39 个，0.91 至 1.00 |

区间是 95% 的 Wilson 区间。

## ToolStrategy 为什么在 Ollama 上什么也不返回 {#s-structured-output-which-strategy-on-which-provider-why-toolstrategy-returns-nothing-on-ollama}

`ToolStrategy` 绑定一个以 schema 命名的工具，并请求 `tool_choice="any"`，所以模型必须调用某个工具。`ChatOllama.bind_tools` 接受这个参数，却把它丢掉，因为 Ollama 没有这样的选项 {{code libs/partners/ollama/langchain_ollama/chat_models.py:1410-1431}}。没有任何东西强制调用 `FinalAnswer`。

于是模型按它没有 schema 时的做法行事。它调用查询工具，然后用文本作答。没有工具调用的文本回复会结束 agent 循环，`structured_response` 仍然是 `None`。没有任何错误提示你。

Qwen3 4B 在 39 个任务中的 39 个里，做了每一次必需的查询，却一次也没有调用 `FinalAnswer`。Qwen3 8B 在 39 个中有 14 个调用了它，这 14 个值全是对的。在 Ollama 上，`AutoStrategy` 解析为 `ToolStrategy`，如[第 4.2 节](#s-structured-output-autostrategy-providerstrategy-toolstrategy)所示。所以直接写 `response_format=FinalAnswer` 得到同样的结果。在锁定版本上的 `claude-haiku-5-5` 上，`AutoStrategy` 同样解析为 `ToolStrategy`，4.2 节已作解释。

## ProviderStrategy 为什么在 Ollama 上抛出异常 {#s-structured-output-which-strategy-on-which-provider-why-providerstrategy-raises-on-ollama}

`ProviderStrategy` 把 schema 作为 Ollama 请求的 `format`，与工具一起发送。只有回复里没有工具调用时，agent 才把回复当作 JSON 解析 {{code libs/langchain_v1/langchain/agents/factory.py:1260-1275}}。在 Qwen3 4B 的全部 10 次运行里，第一条回复既没有工具调用，也没有文本：

```listing
title: Qwen3 4B 上一次 ProviderStrategy 运行的第一次也是唯一一次模型调用
source: capture/lab/bench/runs/structured.jsonl
lang: json
note: 一行记录，只保留方法、调用次数、token、时间和错误。
---
{"run_id": "bd6e197e", "ts": "2026-11-14T20:21:06", "task_id": "chain01", "family": "chain", "model": "qwen3:4b-instruct-2507-q4_K_M", "variant": "provider", "answer_present": false, …"lookups_ok": false, "model_calls": 1, "tool_calls": 0, "in_tokens": 682, "out_tokens": 1024, "wall_s": 38.814, …"final_text": "", "error": "StructuredOutputValidationError: Failed to parse structured output for tool 'FinalAnswer': Native structured output expected valid JSON for FinalAnswer, but parsing failed: Expecting value: line 1 column 1 (char 0).."}
```

这 10 条回复，每一条都用光了工具包允许的 1,024 个输出 token，耗时 18 到 43 秒，却留下空内容。agent 解析空文本，在第一次调用就抛出异常，此时还没有任何查询运行。schema 作为 `format` 时，模型在我们的运行里从未写出工具调用，所以任务根本无法开始。

4.2 节用一个 `add` 工具遇到过同样的错误。这里每个需要查询的任务都出现了它。

## 提取调用 {#s-structured-output-which-strategy-on-which-provider-the-extraction-call}

**提取调用（extraction call）：** agent 运行之后的一次 `with_structured_output` 调用，它读取问题和最终回复，返回符合 schema 的对象。

```listing
title: 测试基准的提取调用
source: capture/lab/bench/kit/structured.py
lang: python
note: 这次调用和它的两条消息。周围的错误处理已截去。
---
                            ex = model.with_structured_output(FinalAnswer).invoke(
                                [{"role": "system", "content": "Extract the final answer value from the assistant reply. Return only the value."},
                                 {"role": "user", "content": f"Question: {t['turns'][0]}\n\nAssistant reply: {ft}"}], config={"callbacks": [meter]})
```

agent 循环不带 schema 运行，所以模型照它本来的方式调用工具。第二次调用没有工具，所以 `ChatOllama` 可以使用请求的 `format`，不会产生冲突。

在 Qwen3 4B 上，提取调用在 39 个任务中对了 30 个。恰好在这 30 个里，最终回复的某处出现了正确的值。在 Qwen3 8B 上，两个计数是 26 和 26。所以在两个模型上，提取都没有丢掉 agent 已经找到的任何答案。其余的失败，是 agent 循环里的查询错误或算术错误，没有任何输出方法能修复它们。

在 Claude Haiku 5.5 上，提取调用 39 个全对，和 `ProviderStrategy` 一样。

## 自由文本在 Claude 上同样失败 {#s-structured-output-which-strategy-on-which-provider-free-text-fails-on-claude-too}

Claude Haiku 5.5 在 39 个任务中有 37 个，最终回复里写出了正确的值。回复的最后一个数字只有 15 个是对的。它先说出答案，再做解释：

```listing
title: 一条正确的回复，但它的最后一个数字不是答案
source: capture/lab/bench/runs/structured.jsonl
lang: json
note: 自由文本方法的一行记录，只保留工具包读到的值、真值和回复。
---
{"run_id": "d2c25350", "ts": "2026-11-15T11:40:49", …"value": "1.086957", "truth": 138.587, "correct": false, "correct_any_number_in_text": true, …"final_text": "The total for 3 trail lanterns is **$138.59 USD**. The unit price is \u20ac42.50, converted at 1 EUR = 1.086957 USD.", "error": null}
```

最后一个数字是汇率。在 Qwen3 4B 上，同样的模式在 39 个中对了 25 个，而有 30 条回复里含有正确的值。在我们运行过的每个模型上，模式都会丢掉答案。

## 成本与时间 {#s-structured-output-which-strategy-on-which-provider-cost-and-time}

**我们测得**四种方法的成本，在 Claude Haiku 5.5 上对 39 个任务按标价计算。工具包的结构化输出运行器没有加提示词缓存，所以这些数字没有缓存折扣。

| Claude Haiku 5.5 上的方法 | 正确数 | 模型调用，中位数 | 39 个任务的成本 | 每个任务的时间，中位数 |
|---|---|---|---|---|
| 自由文本 | 15 | 4 | $0.0267 | 4.5 秒 |
| `ToolStrategy` | 38 | 4 | $0.0287 | 4.4 秒 |
| `ProviderStrategy` | 39 | 4 | $0.0284 | 5.0 秒 |
| 提取调用 | 39 | 5 | $0.0307 | 4.3 秒 |

提取调用比 `ProviderStrategy` 贵 8%，换来多一次带短提示词的模型调用。在 Qwen3 4B 上，它每个任务的中位耗时是 9.3 秒，自由文本是 9.8 秒，因为简短的提取调用很快。

## 哪个提供方用哪种方法 {#s-structured-output-which-strategy-on-which-provider-which-method-on-which-provider}

| 提供方 | agent 有工具 | 使用 | 背后的数字 |
|---|---|---|---|
| 通过 `ChatOllama` 的 Ollama | 是 | 提取调用 | Qwen3 4B 上 39 个中 30 个，对比 39 个中 0 个和 10 个中 0 个 |
| 通过 `ChatOllama` 的 Ollama | 否 | `ToolStrategy` 或 `ProviderStrategy`，并限制调用次数 | [第 4.2 节](#s-structured-output-autostrategy-providerstrategy-toolstrategy)给出每个 schema 的失败率 |
| 通过 `ChatAnthropic` 的 Anthropic | 是 | `ProviderStrategy` 或 `ToolStrategy` | Claude Haiku 5.5 上 39 个中 39 个和 38 个 |
| 任何提供方 | 任意 | 永远不要对自由文本用模式 | Claude Haiku 5.5 上 39 个中 15 个 |

请测试你在生产中运行的那个提供方。这些结果适用于 `langchain` 1.5.0、`langchain-ollama` 1.1.0 和 `langchain-anthropic` 1.7.10。

```takeaways
- 在 ChatOllama 上，不要给带工具的 agent 设置 response_format，改为运行之后加一次提取调用。
- 每次运行之后都检查 structured_response 是否为 None，因为 Ollama 上的 ToolStrategy 失败时不报错。
- 在 Claude 上使用 ProviderStrategy 或 ToolStrategy，它们在 39 个任务中至少 38 个返回了正确的值。
- 用 schema 调用来解析答案，永远不要对回复用模式。
```

来源：capture/lab/bench/summary-mac.json, capture/lab/bench/summarize.py, capture/lab/bench/runs/structured.jsonl, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/bench/kit/structured.py, capture/lab/bench/kit/harnesses.py, capture/lab/bench/data/tasks.jsonl; libs/partners/ollama/langchain_ollama/chat_models.py at langchain-ollama 1.1.0; libs/langchain_v1/langchain/agents/factory.py and libs/langchain_v1/langchain/agents/structured_output.py at langchain==1.5.0; libs/partners/anthropic/langchain_anthropic/chat_models.py at langchain-anthropic 1.7.10.
