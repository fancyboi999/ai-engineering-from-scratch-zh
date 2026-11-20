# init_chat_model 与模型档案

> `init_chat_model` 把 `provider:model` 字符串变成模型提供方包里的聊天模型，而决定失败的调用重试多少次的是这个提供方包，不是 LangChain。

你把 `"qwen3:4b"` 传给 `create_agent`，在第一次请求之前就得到一个 `ValueError`。或者你把客户端超时设为 15 秒，一个总会超时的调用却在 46.3 秒后才返回。两者都取决于模型字符串怎样解析，以及由哪一层来重试。

读完本节，你能写出可解析的模型字符串，并读懂一个模型的档案。你还能数清一次失败的模型调用共有几次尝试。

## 模型字符串 {#s-init-chat-model-and-model-profiles-model-strings}

**模型字符串（model string）：** 模型的文本形式，例如 `openai:gpt-4.1`。`init_chat_model` 和 `create_agent` 接受它，用来代替模型对象。

文档给出的形式是提供方、冒号、模型，例如 `openai:o1` {{docs oss/python/langchain/models}}。只有冒号前面的部分是 30 个已知提供方之一时，`init_chat_model` 才在第一个冒号处拆分字符串 {{code libs/langchain_v1/langchain/chat_models/base.py}}。然后它从提供方包里导入对应的类：

```listing
title: 三个模型字符串，以及各自构造出的类
source: capture/out/01-init-chat-model.txt
lang: text
note: 只保留三行结果。它们之间的档案已截去。
---
openai:gpt-4.1 -> langchain_openai.chat_models.base.ChatOpenAI
…
anthropic:claude-sonnet-4-6 -> langchain_anthropic.chat_models.ChatAnthropic
…
ollama:qwen3:4b -> langchain_ollama.chat_models.ChatOllama
```

没有已知前缀时，`init_chat_model` 根据名称的开头猜测提供方。`gpt-` 和 `o3` 表示 OpenAI，`claude` 表示 Anthropic。名称不符合任何规则时，它立即抛出异常：

```listing
title: 没有已知提供方的名称
source: capture/out/01-init-chat-model.txt
lang: text
note: 提供方列表和帮助行已截去。
---
init_chat_model('qwen3:4b'):

raised builtins.ValueError: Unable to infer model provider for model='qwen3:4b'. Please specify 'model_provider' directly.
```

所以 `ollama:qwen3:4b` 可用，`qwen3:4b` 不可用。Ollama 标签里的冒号属于模型名，因为只有第一个冒号会拆分。[图](#fig-3-2)画出了这三条路径。

```figure
id: fig-3-2
kind: decision
title: init_chat_model 如何解析模型字符串
claim: 已知前缀决定提供方；其次是已知的名称开头；其他任何字符串都会在发出请求之前抛出 ValueError。
caption: 自上而下阅读。每一行是代码按顺序执行的一项测试，旁边是录制里走这条路径的字符串。来自 capture/out/01-init-chat-model.txt。
```

不给模型而给 `configurable_fields` 时，`init_chat_model` 返回一个 `_ConfigurableModel`。它的模型在运行时按配置选定，配置键用你给出的前缀，例如 `llm_model`。

## 模型档案 {#s-init-chat-model-and-model-profiles-model-profiles}

**模型档案（model profile）：** `model.profile` 上的一个 dict，记录某个模型的限制和特性，例如上下文长度，以及它是否支持结构化输出。

提供方包从自己内部的数据文件读取档案。下面是 `gpt-4.1` 档案的一部分：

```listing
title: openai:gpt-4.1 档案的一部分
source: capture/out/01-init-chat-model.txt
lang: json
note: 只保留长度限制和四个特性。
---
  "max_input_tokens": 1047576,
  "max_output_tokens": 32768,
…
  "tool_calling": true,
  "structured_output": true,
…
  "tool_call_streaming": true,
…
  "mid_conversation_tools": false
```

`ollama:qwen3:4b` 的档案是 `null`，录制工具包里 `ChatOllama` 模型的档案也是。读取档案的代码必须接受 `None`。`create_agent` 从档案里读 `structured_output` 来选择结构化输出策略，第 4 部分会讲。

## 重试 {#s-init-chat-model-and-model-profiles-retries}

**重试层（retry layer）：** 失败后再次调用模型的一段代码。提供方包里的客户端是一层，`ModelRetryMiddleware` 是另一层。

模型页说，聊天模型遇到网络错误、429 和 5xx 时，默认最多重试 6 次 {{docs oss/python/langchain/models}}。重试中间件页说，它的默认值一共尝试 3 次 {{docs oss/python/langchain/middleware/built-in}}。我们在锁定版本上把两者都数了一遍。

**我们测得**尝试次数，在 x86 服务器客户机上进行，每种组合跑 3 次。`langchain-openai` 1.8.0 的 `ChatOpenAI` 通过 Ollama 的 `/v1` 路径调用 Qwen3 4B。Ollama 前面的中继会丢弃每个连接，或把连接拖到超过超时。

对于被拒绝的连接，端口上没有任何程序在监听。`ChatOllama` 以同样的方式调用 Ollama 的原生路径。3 次运行的次数相同。[图](#fig-3-2b)显示每一次运行。

| 中继处的故障 | 客户端默认 | 仅中间件 | 两层都开 |
|---|---|---|---|
| 每次调用都丢弃连接 | 3 次尝试，然后 `OpenAIConnectionError` | 3 次尝试，然后一条 `AIMessage` | 9 次尝试 |
| 每次调用都拒绝连接 | 3 次尝试，然后 `OpenAIConnectionError` | 3 次尝试，然后一条 `AIMessage` | 9 次尝试 |
| 每次调用都超时 | 3 次尝试，然后 `OpenAITimeoutError` | 3 次尝试，然后一条 `AIMessage` | 9 次尝试 |
| Ollama 对未知模型返回的真实 404 | 1 次尝试，然后 `OpenAIModelNotFoundError` | 1 次尝试 | 1 次尝试 |
| `ChatOllama`，上面任何一种故障 | 1 次尝试，然后抛出 `ollama` 客户端的错误 | 3 次尝试，然后一条 `AIMessage`，404 也一样 | 没有客户端层 |

`ChatOpenAI` 的客户端默认值是 3 次尝试，也就是 2 次重试。`ChatOpenAI` 把 `max_retries` 留给 `openai` 客户端，后者的默认值是 2 {{code libs/partners/openai/langchain_openai/chat_models/base.py}}。`init_chat_model("openai:...")` 得到的也是同样的 3 次。文档里的 6 次对这个包不成立。`ChatOllama` 只尝试 1 次，因为 `ollama` 客户端不重试。

两层都开时，两层的次数相乘。3 次中间件尝试里，每次都做了 3 次客户端尝试。客户端超时是 15 秒，中继把每个请求扣住 20 秒。因此这 9 次尝试的中位数耗时 142 秒，只用客户端的 3 次尝试则是 46.3 秒。

只用中间件时，运行没有抛出异常。它以一条 `AIMessage` 结束，内容是 `Model call failed after 3 attempts with OpenAIConnectionError`，因为 `on_failure` 的默认值是 `continue`。中继用 429 或 500 代替模型的响应时，次数相同。

```figure
id: fig-3-2b
kind: chart
title: 一次失败的模型调用在中继处的模型尝试次数
claim: 在每种持续故障的每次运行里，客户端默认和中间件各尝试 3 次，两层一起尝试 9 次。
caption: 每个点是一次运行，每一列是一种配置。三组分别是丢弃连接、拒绝端口，以及每次调用都超时。真实的 404 在 ChatOpenAI 下只尝试 1 次，图中未画出。来自 capture/lab/summary/retries-x86.json。
```

一次性的丢弃、拒绝或超时，在每种配置下都恢复了，只有没有中间件的 `ChatOllama` 例外，它抛出了错误。在客户端默认配置和两层都开的配置里，是客户端在重试。只用中间件时，是中间件在重试，因为那时客户端重试已关闭。恢复成功的运行有 3 次模型尝试，其中包含工具步骤之后的那次模型调用。

只选一层。用 `ModelRetryMiddleware` 时，把模型上的 `max_retries` 设为 0，或者干脆不用这个中间件。然后按那一层实际做的尝试次数，设置你自己的超时。

```takeaways
- 模型字符串写成 provider:model，例如 ollama:qwen3:4b。
- 读取 model.profile 的字段之前，先检查它是不是 None。
- 数一数你自己提供方包的重试次数，因为文档里的 6 次对 ChatOpenAI 不成立。
- 加入 ModelRetryMiddleware 时，用 max_retries=0 关掉客户端重试。
- ChatOpenAI 的 404 会立即失败；ChatOllama 要加一个 retry_on 过滤器。
```

来源：capture/out/01-init-chat-model.txt; capture/lab/summary/retries-x86.json, capture/lab/T05-retries-x86/01-model-faults.jsonl, capture/lab/T05-retries-x86/t05_real.py, capture/lab/T05-retries-x86/lr_common.py; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/models, oss/python/langchain/middleware/built-in); libs/langchain_v1/langchain/chat_models/base.py at langchain==1.5.0; libs/partners/openai/langchain_openai/chat_models/base.py at langchain-openai==1.8.0.
