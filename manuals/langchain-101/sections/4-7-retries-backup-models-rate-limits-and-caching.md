# 重试、备用模型、限流与缓存

> 重试层会相乘；`ToolRetryMiddleware` 会在超时之后重复执行工具，而那次请求其实已经到达了服务；备用模型接手任何异常。

你的 agent 调用一个支付工具，回复在一秒后超时，重试中间件又调用了一次。第一次请求其实已经到达。客户现在被扣了两次款，而运行却报告成功。

读完本节，你能数清每个重试层的尝试次数，并说出各自重试哪些失败。你能搭建不会重复副作用的重试。你还能加上备用模型，并说明限流器和缓存在锁定版本上做什么。

## 模型有两层，工具有一层 {#s-retries-backup-models-rate-limits-and-caching-two-layers-for-the-model-one-for-tools}

**重试层（retry layer）：** 失败后再次调用模型或工具的一段代码。

一次模型调用有两个重试层。提供方包里的客户端先重试，`ModelRetryMiddleware` 在它外面再重试。[第 3.2 节](#s-init-chat-model-and-model-profiles)用 `ChatOpenAI` 数过它们。客户端做了 3 次尝试，中间件做了 3 次，两者合起来是 9 次。[图](#fig-3-2b)显示每一次运行。`ChatOllama` 只尝试 1 次，因为它的客户端不重试。

图节点上的 `RetryPolicy` 同样会相乘：围绕客户端默认值是 9 次，围绕一个内部带中间件的 agent 是 27 次。模型页提到的 6 次重试，在锁定版本的 `ChatOpenAI` 上并不成立。

工具调用只有一层，即 `ToolRetryMiddleware`。没有中间件时，抛出异常的工具会结束运行，如[第 3.4 节](#s-tools-toolruntime-and-tool-errors)所示。两个重试中间件接受相同的选项，默认值如下 {{code libs/langchain_v1/langchain/agents/middleware/tool_retry.py}}：

| 选项 | 默认值 | 含义 |
|---|---|---|
| `max_retries` | `2` | 第一次尝试之后的重试次数，所以一共 3 次尝试 |
| `retry_on` | `default_retry_on` | 哪些异常会被重试 |
| `on_failure` | `"continue"` | 最后一次尝试之后，返回一条消息，而不是抛出异常 |
| `initial_delay`、`backoff_factor`、`max_delay` | `1.0`、`2.0`、`60.0` | 每次重试之前等待的秒数，每次翻倍 |
| `jitter` | `True` | 给每次延迟加一点随机变化 |
| `tools` | `None` | 仅 `ToolRetryMiddleware`：要重试的工具，或全部工具 |

工具包运行一个先失败两次再成功的工具。设 `max_retries=2` 时，工具以同样的参数运行了三次：

```listing
title: 一次工具调用的三次尝试
source: capture/out/12-mw-retries.txt
lang: json
note: 工具记录下来的尝试，在文件的第一部分。
---
tool attempts:
[
  "http://svc.local/a",
  "http://svc.local/a",
  "http://svc.local/a"
]
```

设 `max_retries=1`，并在 `on_failure="continue"` 下重试用尽时，模型得到一条错误的 `ToolMessage`，运行继续：

```listing
title: 重试用尽之后的 ToolMessage
source: capture/out/12-mw-retries.txt
lang: json
---
    "content": "Tool 'flaky_fetch' failed after 2 attempts with ConnectionError: attempt 2 refused. Please try again.",
    "name": "flaky_fetch",
```

使用 `on_failure="error"` 时，运行抛出了 `ConnectionError: attempt 2 refused`。

`ModelRetryMiddleware` 重试模型调用。工具包把 `ChatOllama` 指向一个中继，它关闭前两次连接，把第三次转给 Ollama。设 `max_retries=2` 时，模型得到三次调用，第三次回答了 `2 + 3 = 5.`。

设 `max_retries=1` 并用 `continue` 时，中间件返回一条带错误文本的 `AIMessage`，而不是抛出异常。工具包把模型指向一个没人监听的端口。所以失败的模型调用看起来像一个答案：`Model call failed after 2 attempts with ConnectError: [Errno 111] Connection refused`。

## 每一层重试什么 {#s-retries-backup-models-rate-limits-and-caching-what-each-layer-retries}

**default_retry_on：** 两个中间件默认的 `retry_on`。它重试每一个 `Exception`，只有 `is_retryable` 为假的 LangChain `ModelError` 除外 {{code libs/langchain_v1/langchain/agents/middleware/_retry.py}}。

抛出 `ModelError` 的提供方包，对无法通过的错误不会得到重试。所以 Ollama 真实的 404，经 `ChatOpenAI` 只得到 1 次尝试。`ChatOllama` 抛出 `ollama` 客户端的 `ResponseError`，它不是 `ModelError`。配上 `ModelRetryMiddleware`，它的 404 得到了 3 次尝试。工具错误是普通异常，例如 `httpx` 错误，所以默认值会全部重试。中间件无法知道一次失败的工具请求有没有到达服务。

**我们测得**使用默认值的 `ToolRetryMiddleware()`，在 x86 服务器客户机上进行，每格 3 次运行。Ollama 上的 Qwen3 4B 选择工具调用。工具写入 PostgreSQL。对于超时，它先向账本表插入一行，再在 1 秒的 `statement_timeout` 下运行 `pg_sleep(3)`。每格的 3 次运行得到相同的计数：

| 工具的故障 | 没有中间件 | `ToolRetryMiddleware()` | 带中间件时的账本行数 |
|---|---|---|---|
| 拒绝连接一次 | 抛出异常，执行 1 次 | 执行 2 次，然后成功 | 1 |
| 每次调用都拒绝连接 | 抛出异常，执行 1 次 | 执行 3 次，然后一条错误的 `ToolMessage` | 0 |
| 每次调用都缺表 | 抛出异常，执行 1 次 | 执行 3 次，然后一条错误的 `ToolMessage` | 0 |
| 超时一次 | 抛出异常，执行 1 次 | 执行 2 次，然后成功 | 2 |
| 每次调用都超时 | 抛出异常，执行 1 次 | 执行 3 次，然后一条错误的 `ToolMessage` | 3 |

超时之后的每次尝试，都在超时之前写好了它的账本行。所以回复丢失的工具，把它的动作又做了一遍，最多 3 次。langchain#40688 针对非幂等的工具报告了这一点 {{issue langchain#40688}}。在锁定版本上它仍然是开放状态，我们的运行用真实的数据库复现了它。默认值还重试了缺表，而没有任何重试能修好它。

错误的 `ToolMessage` 之后，模型在 9 次运行中有 9 次没有再次调用工具。它的最后一条消息是 `done`，或者以 `Try again` 开头的文本，所以读起来像是成功。[图](#fig-4-7)画出了超时的情形。

```figure
id: fig-4-7
kind: sequence
title: 一次超时三次的工具调用
claim: 3 次尝试里，每一次都在超时之前写好了它的账本行，所以回复丢失的动作在模型看到错误之前运行了 3 次。
caption: 从上往下读各行。每个橄榄色虚线箭头是一次写入了行的 INSERT，每个玫红色虚线箭头是 1 秒后的 QueryCanceled。3 次运行里，账本每次都有 3 行。来自 capture/lab/summary/retries-x86.json。
```

两个中间件都开时，每一层各自保持自己的计数。模型连接断开一次加工具连接被拒绝一次，得到 3 次模型请求和 2 次工具执行，运行成功。每次调用都断开模型连接，得到 9 次模型请求，并且从未走到工具。

## 一种安全的配置 {#s-retries-backup-models-rate-limits-and-caching-a-safe-configuration}

每类调用只选一个重试层，并且只重试可以安全重复的操作：

1. 对于模型，保留客户端重试并省去 `ModelRetryMiddleware`，或者在模型上设 `max_retries=0` 再加上中间件。
2. 对于工具，只在 `ToolRetryMiddleware` 的 `tools` 选项里列出幂等的工具。
3. 传入一个 `retry_on`，只列出你确知可以安全重试的错误，例如连接被拒绝或 503。
4. 给每个副作用一个服务会检查的幂等键。[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)展示了崩溃之后的同样需要。
5. 按尝试次数设定你的超时预算。三次各 1 秒的尝试，加上 1 秒和 2 秒的延迟，一次工具调用要用 6 秒。

实验记录是这样为中间件的运行关掉客户端层的：

```listing
title: 模型只用一个重试层
source: capture/lab/T05-retries-x86/t05_real.py
lang: python
note: 实验脚本里模型函数和构建函数的片段。它们之间的行在标记处截去。
---
    kw = {"timeout": to}
    if config in ("openai_mw_only",):
        kw["max_retries"] = 0
    return chat_openai(model=name, port=port, **kw)
…
def build(config, model, tl):
    mw = []
    if config in ("openai_mw_only", "openai_stacked", "ollama_mw", "openai_both_mw"):
        mw.append(ModelRetryMiddleware())
```

`retry_on` 元组把重试限制在这些异常类型上。在工具包里，被拒绝的连接抛出 `httpx.ConnectError`，它不是 `TimeoutError`。它没有得到重试，立即抛出了异常：

```listing
title: 一个 retry_on 过滤器
source: capture/s_middleware.py
lang: python
---
        tools=[], middleware=[ModelRetryMiddleware(max_retries=2, retry_on=(TimeoutError,), on_failure="error", **fast)])
```

## 备用模型 {#s-retries-backup-models-rate-limits-and-caching-backup-models}

**ModelFallbackMiddleware：** 模型调用抛出异常时，调用列表里下一个模型的中间件。

工具包给它一个指向无人监听端口的主 `ChatOllama`，以及一个 Ollama 上的备用模型。主模型得到一次调用，抛出 `httpx.ConnectError`，备用模型作答：

```listing
title: 主模型抛出异常之后的答案
source: capture/out/13-mw-fallback-refusal.txt
lang: json
note: 这次运行的消息。
---
    "type": "AIMessage",
    "content": "2 + 3 = 5.",
```

中间件按顺序尝试每个模型，并且接手任何 `Exception` {{code libs/langchain_v1/langchain/agents/middleware/model_fallback.py}}。每个模型都抛出异常时，运行抛出最后一个错误。工具包把三个模型都指向失效端口，运行抛出了 `httpx.ConnectError: [Errno 111] Connection refused`。代码不检查错误的种类，所以错误请求引起的 400 也会转到下一个模型。那次运行会在下一版里补上，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它。

拒绝不是异常。`ModelRefusalMiddleware` 只在回复里有标准的 `refusal` 内容块时才抛出 `ModelRefusalError`，它不读文本 {{code libs/langchain_v1/langchain/agents/middleware/model_refusal.py}}。把 `ModelFallbackMiddleware` 列在前面，`ModelRefusalMiddleware` 列在第二位，拒绝块就会转给备用模型。

工具包问 Qwen3 4B 怎样撬开邻居家的门锁。模型用普通文本拒绝了，内容是 `I'm sorry, but I can't assist with that.`。Ollama 不发送拒绝块，所以这段文本在三次运行中都是正常的答案。没有中间件、只有 `ModelRefusalMiddleware`、两个中间件都开，结果都一样。备用模型没有得到调用。所以文本里的拒绝，需要你自己检查。

## 限流与缓存 {#s-retries-backup-models-rate-limits-and-caching-rate-limits-and-caching}

聊天模型接受一个 `rate_limiter`。`InMemoryRateLimiter` 是令牌桶，默认 `requests_per_second=1` 和 `max_bucket_size=1`，作用于单个进程 {{code libs/core/langchain_core/rate_limiters.py}}。模型页警告说，它统计的是请求数，而不是请求的大小 {{docs oss/python/langchain/models}}。两个进程各有自己的桶。

有两种缓存。`set_llm_cache` 在 LangChain 里缓存模型回复。`create_agent` 的 `cache` 参数是 LangGraph 的节点缓存。我们没有对着模型运行其中任何一种，也没有运行限流器。这些运行会在下一版里补上，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它们。

```takeaways
- 模型调用只用一个重试层；加入 ModelRetryMiddleware 时，在模型上设 max_retries=0。
- 给 ToolRetryMiddleware 传入 tools=，只放幂等的工具。
- 传入范围窄的 retry_on，因为默认值会重试每一个工具异常，包括缺表。
- 对每个重试可能重复的副作用，都发送一个幂等键。
- ModelRetryMiddleware 使用 continue 时，检查最后一条 AIMessage 里有没有失败文本。
- 把 ModelFallbackMiddleware 列在 ModelRefusalMiddleware 之前，让拒绝块转给备用模型；文本里的拒绝要自己检查。
```

来源：capture/out/12-mw-retries.txt, capture/out/13-mw-fallback-refusal.txt, capture/s_middleware.py, capture/common.py, libs/langchain_v1/langchain/agents/middleware/model_refusal.py at langchain==1.5.0; capture/lab/summary/retries-x86.json, capture/lab/T05-retries-x86/01-model-faults.jsonl, capture/lab/T05-retries-x86/02-tool-faults.jsonl, capture/lab/T05-retries-x86/03-both-faults.jsonl, capture/lab/T05-retries-x86/t05_real.py, capture/lab/T05-retries-x86/lr_common.py; issue langchain#40688; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/models, oss/python/langchain/middleware/built-in); libs/langchain_v1/langchain/agents/middleware/tool_retry.py, model_retry.py, _retry.py, and model_fallback.py at langchain==1.5.0; libs/core/langchain_core/rate_limiters.py at langchain-core 1.8.0.
