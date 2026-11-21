# 结构化输出：AutoStrategy、ProviderStrategy、ToolStrategy

> `ToolStrategy` 请求一次工具调用，并且不限次数地重试；`ProviderStrategy` 请提供方返回 JSON，从不重试；`AutoStrategy` 在每次模型调用之前选其中一个。

你要从一封邮件里取出一个订单对象，于是把一个 Pydantic 类作为 `response_format` 传入。在一个模型上，运行返回了这个对象。在一个更小的模型上，它一直循环到递归上限。在第三个提供方上，它在第一次请求之前就抛出异常。实际运行的策略，决定你会得到这三种结果中的哪一种。

读完本节，你能预测 agent 用的是哪种策略、它向模型发送什么、以及它怎样失败。你还能根据我们在四种模型规模上测得的失败率来选择策略。

## 三种策略 {#s-structured-output-autostrategy-providerstrategy-toolstrategy-three-strategies}

**结构化输出策略（structured output strategy）：** `create_agent` 从模型拿到符合你的 schema 的对象的方式。结果放在输出状态的 `structured_response` 里。

- **ToolStrategy：** 为每个 schema 绑定一个工具，强制 `tool_choice="any"`，并解析工具调用的参数。遇到解析错误时，它把错误发回给模型，再问一次。
- **ProviderStrategy：** 把 schema 作为 `response_format` 传给提供方，并解析回复的 JSON 文本。它只尝试一次。
- **AutoStrategy：** 持有一个 schema，在每次模型调用之前解析成另外两种之一。

普通的 schema，例如 Pydantic 类，会变成 `AutoStrategy` {{code libs/langchain_v1/langchain/agents/factory.py}}。这些策略在 `langchain.agents.structured_output` 里。

## AutoStrategy 如何选择 {#s-structured-output-autostrategy-providerstrategy-toolstrategy-how-autostrategy-chooses}

当模型档案说 `structured_output` 为真时，`AutoStrategy` 选 `ProviderStrategy`。例外是：agent 有工具时，3 系列之前的 Gemini 模型。其他所有情况下，它拿模型名去对照一份固定的名单，例如 `gpt-4o`、`gpt-4.1` 和一些 Claude 模型。没有名称匹配时，它选 `ToolStrategy` {{code libs/langchain_v1/langchain/agents/factory.py:581-626}}。[图](#fig-4-2)画出了这个选择。

```figure
id: fig-4-2
kind: decision
title: 哪种策略在运行，以及它怎样失败
claim: 显式指定的策略从不被更改；AutoStrategy 在每次调用前根据档案或名称选择，所以没有任何失败会让运行从一种换到另一种。
caption: 自上而下阅读。琥珀色框是 create_agent 在请求之前做出的选择。玫红色框是各策略最终的失败。来自 capture/out/07-structured-output.txt、capture/out/08-structured-errors.txt、capture/lab/summary/structured-output-mac.json 和 capture/lab/T06-structured-output-mac-real/01-provider-paths.jsonl。
```

工具包在两个没有自带工具的 `ChatOllama` 模型上，运行同一个 schema。第一个没有档案，agent 绑定了一个以 schema 命名的工具：

```listing
title: 没有档案的模型上的普通 schema
source: capture/out/07-structured-output.txt
lang: json
note: 第一次模型调用，只保留它的消息和绑定的工具。
---
    "messages": [
      "human: What is 2 + 3?"
    ],
    "tools": [
      "Answer"
    ]
```

agent 还请求了 `tool_choice="any"`。`ChatOllama.bind_tools` 会丢掉这个参数，因为 Ollama 没有这样的选项 {{code libs/partners/ollama/langchain_ollama/chat_models.py}}。所以在 Ollama 上，没有任何东西强制调用 schema 工具。这里模型还是调用了 `Answer`，`value` 为 5。

第二个模型的档案是 `{"structured_output": True}`。agent 不绑定 schema 工具，而是传入 `response_format`，`ChatOllama` 把它作为 JSON schema 格式发给 Ollama：

```listing
title: 档案写明 structured_output 的模型上的普通 schema
source: capture/out/07-structured-output.txt
lang: json
note: 第一次模型调用，只保留它的消息和格式。
---
    "messages": [
      "human: What is 2 + 3?"
    ],
    "format": "json schema"
```

回复是文本 `{"value": 5}`，agent 用默认值补上了 `unit`。

`ChatOllama` 没有档案，Ollama 的模型名也不在名单里。所以在 Ollama 上，普通 schema 和 `AutoStrategy` 总是按 `ToolStrategy` 运行。在锁定版本上的 `claude-haiku-5-5` 上，`AutoStrategy` 同样解析为 `ToolStrategy`。它的档案里 `structured_output` 为假，模型名也不在会选 `ProviderStrategy` 的名单里。

## ToolStrategy {#s-structured-output-autostrategy-providerstrategy-toolstrategy-toolstrategy}

`ToolStrategy` 接受 Pydantic 类、dataclass、`TypedDict`、JSON schema `dict`，或类的联合类型。它把联合类型拆成每个成员一个工具，所以模型通过选工具来选类型：

```listing
title: 带联合类型的 ToolStrategy 为每个 schema 绑定一个工具
source: capture/out/07-structured-output.txt
lang: json
note: 联合类型这次运行绑定的工具。
---
    "tools": [
      "Answer",
      "Refusal"
    ]
```

`TypedDict` 返回一个 `dict`，dataclass 返回它的一个实例。JSON schema `dict` 原样返回参数，不做验证 {{code libs/langchain_v1/langchain/agents/structured_output.py}}。工具包要求把值写成英文单词，想以此把字符串发给整数字段。Qwen3 4B 还是发了数字：

```listing
title: JSON schema 这次运行
source: capture/out/07-structured-output.txt
lang: text
note: JSON schema 这次运行的 structured_response。
---
structured_response:
{
  "value": 5
}
```

参数验证失败时，`ToolStrategy` 把错误写进一条 `ToolMessage`，再次调用模型。这条消息以 `Please fix your mistakes.` 结尾。它是模板 `STRUCTURED_OUTPUT_ERROR_TEMPLATE` {{code libs/langchain_v1/langchain/agents/factory.py:128}}。我们的模型从未发出无效的值。让它把 3.5 放进整数字段 `value`，它发送了 `value` 为 3、`unit` 为 `"5"`，这是有效的。

一条 AI 消息里有两个结构化工具调用，会触发同类重试。工具包在一次回复里请求 `Answer` 和 `Refusal`，模型两个都发了：

```listing
title: 两次结构化调用之后的重试消息
source: capture/out/08-structured-errors.txt
lang: json
note: 两条 ToolMessage 中的第一条。第二条文本相同。
---
    "content": "Error: Model incorrectly returned multiple structured responses (Answer, Refusal) when only one is expected.\n Please fix your mistakes.",
    "name": "Answer",
…
    "status": "success"
```

随后模型发出一次 `Answer` 调用，运行以 `value` 为 5 结束。每条重试消息的 `status` 都是 `success`，尽管它带着错误。统计错误 `ToolMessage` 对象的代码，不会把这些重试算进去。

**handle_errors：** `ToolStrategy` 中设置重试的参数。默认值 `True` 对每个解析错误都重试。字符串会替换重试文本。异常类型或元组只对这些错误重试。可调用对象接收错误并返回重试文本。`False` 在第一次出现错误调用时抛出 `StructuredOutputValidationError`。

重试逻辑在 `_handle_structured_output_error` {{code libs/langchain_v1/langchain/agents/factory.py:649-671}}。两处抛出在 {{code libs/langchain_v1/langchain/agents/factory.py:1271}} 和 {{code libs/langchain_v1/langchain/agents/factory.py:1333}}。带类型和默认值 `True` 的这个参数在 {{code libs/langchain_v1/langchain/agents/structured_output.py:212-253}}。它的 docstring 说，dict schema 不做验证，所以 `handle_errors` 对它们不起作用。

## ProviderStrategy {#s-structured-output-autostrategy-providerstrategy-toolstrategy-providerstrategy}

`ProviderStrategy` 把 schema 发给提供方，并把回复的文本当作 JSON 读取。文本不是 JSON，或验证失败时，运行在第一次调用就抛出异常。

在 Ollama 上，schema 成为请求的格式，回复必须符合它。工具包要求给一个单词、给 3.5、给一个普通的英文句子。每次模型都返回了有效的 JSON，例如 `{ "value": 5 }`。失败来自工具。绑定了 `add` 之后，回复没有文本，agent 把空内容当作 JSON 去解析：

```listing
title: 绑定了 add 工具的 ProviderStrategy
source: capture/out/07-structured-output.txt
lang: text
---
raised langchain.agents.structured_output.StructuredOutputValidationError: Failed to parse structured output for tool 'Answer': Native structured output expected valid JSON for Answer, but parsing failed: Expecting value: line 1 column 1 (char 0)..
```

联合类型走不到这一步。`ProviderStrategy(Union[Refund, Exchange])` 在构建策略时就抛出了 `ValueError: Unsupported schema type`，早于 `create_agent` 运行，我们做的每次运行都是这样 {{code libs/langchain_v1/langchain/agents/structured_output.py:180-194}}。

## 运行时不换策略 {#s-structured-output-autostrategy-providerstrategy-toolstrategy-no-change-of-strategy-at-run-time}

结构化输出页说，模型不支持结构化输出时，agent 用工具调用代替提供方输出。对普通 schema 和 `ProviderStrategy`，它都这么说 {{docs oss/python/langchain/structured-output}}。代码保持显式策略不变，并且只根据档案和名称解析 `AutoStrategy` {{code libs/langchain_v1/langchain/agents/factory.py}}。本手册以代码为准，把这处分歧记为冲突 D121 和 D209。

我们在 Ollama 上对五个模型运行了它，用 `ChatOpenAI` 和 `ChatOllama`，每种情形 3 次。没有任何聊天模型拒绝这个格式。`ProviderStrategy` 在 `/v1` 上发送 `response_format` 的 `json_schema`，在 `/api/chat` 上发送 `format`，24 次运行中有 24 次得到有效的 `Contact`。`AutoStrategy` 对每个 Ollama 模型都选了 `ToolStrategy`，因为没有档案把它们标记为支持结构化输出。唯一一次真正的拒绝来自嵌入模型 `nomic-embed-text`：

```listing
title: 显式的 ProviderStrategy 遇到不能聊天的模型
source: capture/lab/T06-structured-output-mac-real/01-provider-paths.jsonl
lang: json
note: 只保留客户端、策略、模型、结果、错误和那一次请求。
---
{"kind": "run", "client": "ChatOpenAI", "strategy": "ProviderStrategy", "model": "nomic-embed-text:latest", …"outcome": "raised", "error_type": "OpenAIInvalidRequestError", "error": "Error code: 400 - \"nomic-embed-text:latest\" does not support chat", …"requests": [{"path": "/v1/chat/completions", "status": 400, "req_keys": ["messages", "model", "response_format", "seed", "stream", "temperature", "tools"], "response_format_type": "json_schema", …}], "n_requests": 1, …}
```

一次请求，一个错误，没有带工具的第二次请求。代码不会因错误而切换策略，所以文档那一页的说法，只在代码已经认识的模型上成立。

两条路径的耗时也不同。在 Mac 上用 Qwen3 4B，`ProviderStrategy` 每次运行用 18 到 27 秒，工具调用只要 2.3 到 3.9 秒。模型在格式约束下写了 239 个 token，工具调用只写了 35 个。用 `gpt-oss:20b` 和 `qwen3:8b` 时，格式约束用了 35 到 46 秒，尽管模型写的 token 比工具调用还少。`qwen3:0.6b` 在两条路径上都是 2.3 到 3.9 秒。

## 两种以空手而归结束的运行 {#s-structured-output-autostrategy-providerstrategy-toolstrategy-two-runs-that-end-with-nothing}

`handle_errors=True` 没有重试次数。`tools=[]` 时，agent 图里有一条 `model` 到 `model` 的边，一直循环到出现结构化响应。只有递归上限能阻止它，而 agent 的默认值是 9999 步。在实验记录里，Ollama 上的 Qwen3 0.6B 从未调用过这个工具。它每次都用文本或空消息作答，agent 把每个答案连同之前的答案一起发回。在 `recursion_limit=12` 下它做了 12 次模型调用，在 25 下做了 25 次，然后抛出 `GraphRecursionError`，10 次运行全是这样。

Qwen3 4B Instruct 在提供方那里更早结束循环。用 `TypedDict` 和 dataclass 时，模型两次都用文本回答了 `2 + 3 = 5.`。agent 发出第三次请求，末尾有两条 AI 消息，Ollama 用 400 拒绝了它。

在 Mac 上，这在 40 次运行中出现了 40 次，`ChatOllama` 和 `/v1` 上的 `ChatOpenAI` 都是，`recursion_limit` 为 12 和 25 时都是。`ChatOpenAI` 发送了 `tool_choice: "required"`，模型仍然用文本作答。同一台服务器上的 Qwen3 0.6B 没有收到 400，所以这项检查取决于模型。在 x86 服务器客户机上运行的工具包，显示了第三次请求：

```listing
title: TypedDict 运行的第三次请求
source: capture/out/07-structured-output.txt
lang: text
note: 先是错误，然后是第三次模型调用的消息。
---
raised ollama._types.ResponseError: {"error":{"code":400,"message":"Cannot have 2 or more assistant messages at the end of the list.","type":"invalid_request_error"}} (status code: 400)
…
    "call": 3,
    "messages": [
      "human: What is 2 + 3?",
      "ai: 2 + 3 = 5.",
      "ai: 2 + 3 = 5."
    ],
```

只要你自己至少有一个工具，一次纯文本回答就会结束运行。绑定了 `add` 时，模型调用了 `add`，然后用文本回答。两次模型调用之后，`structured_response` 是 `None`，没有异常。每次运行之后都要检查 `structured_response` 是否为 `None`。

## 四种模型规模上的失败率 {#s-structured-output-autostrategy-providerstrategy-toolstrategy-failure-rates-on-four-model-sizes}

**我们测得**每种策略的表现，在 Mac 上用 Ollama 上的四个 Qwen3 模型，关闭思考，温度为 0。agent 没有工具，每次运行最多 10 次模型调用。四个 schema：扁平的、嵌套的、联合类型的，以及两个枚举的。每个模型和 schema 在 0.6B 模型上有 20 个输入，其他模型上有 10 个，一共 600 次运行。这些运行没有工具。绑定了查询工具后，两种策略在 Ollama 上都失败了，[第 4.3 节](#s-structured-output-which-strategy-on-which-provider)测量这种情形。

在 Ollama 上，`AutoStrategy` 和 `ToolStrategy` 是同一种配置，它们的运行结果相同。运行抛出异常或没有返回 `structured_response`，就算失败：

| 模型 | `ToolStrategy` 失败 | `ProviderStrategy` 失败 | 不含联合类型的 `ProviderStrategy` |
|---|---|---|---|
| `qwen3:0.6b` | 80 次中 36 次，45% | 80 次中 20 次，25% | 60 次中 0 次 |
| `qwen3:1.7b` | 40 次中 6 次，15% | 40 次中 10 次，25% | 30 次中 0 次 |
| `qwen3:4b-instruct` | 40 次中 11 次，27.5% | 40 次中 13 次，32.5% | 30 次中 3 次 |
| `qwen3:8b` | 40 次中 10 次，25% | 40 次中 10 次，25% | 30 次中 0 次 |

0.6B、1.7B 和 8B 模型上，`ProviderStrategy` 的每一次失败，都是构建时的联合类型。去掉联合类型后，`ToolStrategy` 的失败是 60 次中 36 次、30 次中 6 次、30 次中 11 次、30 次中 10 次。[图](#fig-4-2b)显示每一次运行。

```figure
id: fig-4-2b
kind: chart
title: 每次结构化输出运行的结果
claim: ProviderStrategy 只在联合类型和 3 次枚举运行上失败；ToolStrategy 除 2 次之外的失败，都发生在嵌套和枚举 schema 上。
caption: 每个点是 Mac 上的一次运行。每一行是一个 schema 和策略，每一列是一个模型。蓝色是第一次调用即有效，琥珀色是重试后有效，玫红色是抛出了异常。来自 capture/lab/summary/structured-output-mac.json。
```

在 8B 模型上，嵌套 schema 让 `ToolStrategy` 的 10 次运行中有 10 次触到了 10 次调用的上限。在 0.6B 模型上，20 次中有 19 次触到。模型把 schema 本身发了回来，而不是数据，每次重试都重复这一点。在 4B 模型上，三次嵌套运行以 Ollama 关于工具调用 JSON 被截断的错误告终。三次枚举运行以 Ollama 的 400 告终，因为重试让两条 AI 消息连在了一起。

结构化输出页称，`ProviderStrategy` 在可用时是最可靠的方法 {{docs oss/python/langchain/structured-output}}。在嵌套 schema 上，它在三个模型上给出的有效对象比 `ToolStrategy` 多，在 1.7B 模型上持平。在枚举 schema 上，它在 0.6B 和 1.7B 模型上给出得更多，在 4B 和 8B 模型上持平。它不能接受联合类型，也从不重试。

## 有效不等于正确 {#s-structured-output-autostrategy-providerstrategy-toolstrategy-valid-is-not-correct}

有效的对象符合 schema，但仍可能装着错误的值。在枚举 schema 里，模型要为一张支持工单选出优先级和类别。看看 `ProviderStrategy` 里有 `structured_response` 的那些运行，从最小的模型到最大的。数值和我们的标注一致的有 20 次中 4 次、10 次中 3 次、7 次中 4 次、10 次中 4 次。我们的标注是判断，所以请把它读作与一位读者的一致程度。

```takeaways
- 自己为每个提供方选择策略，因为 AutoStrategy 只读档案和模型名。
- 联合类型用 ToolStrategy，因为 ProviderStrategy 在构建策略时就拒绝它。
- 使用 ToolStrategy 的运行要设置 recursion_limit，因为 handle_errors=True 的重试没有次数限制。
- 每次带工具的运行之后，检查 structured_response 是否为 None。
- 预期 ProviderStrategy 在第一次错误的回复时抛出异常；在 Ollama 上带工具时，则在第一次调用时。
- 用标注来测试结构化输出的值，因为有效的对象也可能是错的。
```

来源：capture/out/07-structured-output.txt, capture/out/08-structured-errors.txt, capture/s_agents.py; libs/partners/ollama/langchain_ollama/chat_models.py at langchain-ollama 1.1.0; capture/lab/summary/structured-output-mac.json, capture/lab/T06-structured-output-mac/01-ollama-runs.jsonl, capture/lab/T06-structured-output-mac/03-ollama-seq-n10.jsonl, capture/lab/T06-structured-output-mac/t06_run.py, capture/lab/T06-structured-output-mac/t06_schemas.py; capture/lab/last-two-mac/01-toolstrategy-text.jsonl, capture/lab/last-two-mac/04-small-model-probe.jsonl, capture/lab/last-two-mac/lt1_toolstrategy_text.py, capture/lab/last-two-mac/lt1b_small_model_probe.py, capture/lab/last-two-mac/lt_common.py; capture/lab/summary/structured-output-mac-real.json, capture/lab/T06-structured-output-mac-real/01-provider-paths.jsonl, capture/lab/T06-structured-output-mac-real/t06_provider_real.py; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/structured-output); libs/langchain_v1/langchain/agents/factory.py and libs/langchain_v1/langchain/agents/structured_output.py at langchain==1.5.0.
