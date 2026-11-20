# LangSmith 追踪

> 在托管的 LangSmith API 上，追踪给一次真实的 agent 运行增加了约 6 毫秒，而 `enabled="local"` 仍然把每个 LangChain 运行发送到了那里。

你打开追踪，想看看 agent 为什么调用了错误的工具。后来 LangSmith 的端点宕机了，你的夜间脚本在退出时等待，如果端点挂起，它就永远退不出去。你改用 `tracing_context(enabled="local")`，想把数据留在自己的机器上，而客户端仍然把 agent 的运行发到了你的账户。

读完本节，你能打开和关闭追踪，并读懂服务器保存的运行树。你还能预测追踪给一次运行带来的成本、追踪何时变得可读，以及怎样让追踪留在你的机器上。

## 追踪如何开启 {#s-langsmith-tracing-how-tracing-turns-on}

**追踪（trace）：** 一次顶层调用对应的一棵运行树。每个运行有名称、运行类型、输入、输出、错误和它的子运行。

**运行树（run tree）：** 一个运行在内存中的对象，即 `langsmith` 里的 `RunTree`。客户端把每棵运行树发送给 LangSmith API。

文档用两个变量为 LangChain 开启追踪：`LANGSMITH_TRACING=true` 和 `LANGSMITH_API_KEY` {{docs langsmith/observability-quickstart}}。美国以外的账户还要设置 `LANGSMITH_ENDPOINT`。SDK 在每次调用时用 `tracing_is_enabled()` 决定，顺序如下 {{code src/langsmith/utils.py}}。它对每个变量在每个进程里只读一次并缓存，所以要在第一次调用之前设好变量：

1. 当前 `tracing_context` 的值，只要它不是 `None`。
2. 有父运行树处于活动状态时为 true。
3. 用 `langsmith.configure` 设置的全局值。
4. 变量 `LANGSMITH_TRACING_V2` 或 `LANGCHAIN_TRACING_V2`，两者都没设置时，看 `LANGSMITH_TRACING` 或 `LANGCHAIN_TRACING`。只有字符串 `true` 才会开启追踪。

`langsmith` 是 `langchain-core` 的依赖，所以每个 agent 都有这个 SDK。没有设置任何变量时，`traceable` 函数就是普通调用，不存在运行树：

```listing
title: 追踪关闭时的 traceable
source: capture/out/42-langsmith.txt
lang: json
---
{
  "tracing_is_enabled()": false,
  "result": {
    "answer": "value-for-alpha"
  }
}

get_current_run_tree() inside the call: None
```

在 `tracing_context(enabled="local")` 里，同一个函数会构建一棵运行树。录制工具包把这棵树交给一个 `on_end` 回调并记录下来。子运行 `lookup` 与它的父运行共享同一个 trace id，它的 `dotted_order` 以父运行的顺序开头：

```listing
title: 本地追踪的子运行
source: capture/out/42-langsmith.txt
lang: json
note: 子运行，只保留它的标识字段。
---
      "name": "lookup",
      "run_type": "tool",
      "id": "<uuid-2>",
      "trace_id": "<uuid-1>",
      "parent_run_id": "<uuid-1>",
      "dotted_order": "<dotted-time><uuid-1>.<dotted-time><uuid-2>",
```

## 服务器保存的树 {#s-langsmith-tracing-the-tree-that-the-server-stores}

LangChain 的运行会生成更深的树：每个图节点对应一个 chain 运行，每次模型调用和工具调用对应一个叶子。[第 1.3 节](#s-one-create-agent-run)为一轮 agent 画出了那棵树。

**我们测量了** 托管 API 上的这棵树，用的是免费计划的新账户，从 Mac 发起。agent 是 Ollama 上 Qwen3 4B 的 `create_agent`，带一个工具 `add`。我们用客户端读回了一条保存的追踪。它有 7 个运行，名称与本地记录器收到的相同：

| 运行 | 类型 | 父运行 | 标签 | token |
|---|---|---|---|---|
| `LangGraph` | chain | 无 | 无 | 574 |
| `model` | chain | `LangGraph` | `graph:step:1` | 278 |
| `ChatOllama` | llm | `model` | `seq:step:1` | 278 |
| `tools` | chain | `LangGraph` | `graph:step:2` | 0 |
| `add` | tool | `tools` | `seq:step:1` | 0 |
| `model` | chain | `LangGraph` | `graph:step:3` | 296 |
| `ChatOllama` | llm | `model` | `seq:step:1` | 296 |

根运行保存的是 token 的总和：545 个输入、29 个输出。`first_token_time` 设在根运行、每个 `model` 运行和每个 `llm` 运行上。每个运行的 `total_cost` 都是 null，因为服务器没有 Ollama 模型的价格。

`llm` 运行的元数据包含 `ls_provider`、`ls_model_name`、`ls_temperature`，以及它所在节点的 `langgraph_*` 键。客户端还会把 `LANGSMITH_PROJECT` 和 `LANGSMITH_TRACING` 复制进每个运行的元数据。`extra.runtime` 包含 SDK 和库的版本，以及机器的平台字符串。

同一棵树会显示在 LangSmith 网页应用的追踪视图里。[图](#fig-7-6d)重绘了下面计时的、对托管 API 的 30 次追踪运行中的一次。agent 请求了 `add(a=305, b=18)`，并在 6.13 秒内回答 323。两次模型调用分别用了 3.33 秒和 2.79 秒，工具调用不到 0.01 秒。

```figure
id: fig-7-6d
kind: tree
title: LangSmith 追踪视图里的一次被追踪的 agent 运行
claim: Qwen3 4B 的一次 create_agent 运行是一个带 6 个子运行的 LangGraph 根，它的两次模型调用在 6.13 秒里占了 3.33 秒和 2.79 秒。
caption: 左边请从顶部读运行树，右边是根运行的消息。根据托管免费计划上追踪视图的截图重绘。这次运行是 capture/lab/T21-langsmith-account-mac/02-e1-timing.jsonl 的第 58 行。
```

## "local" 这个值会发送 LangChain 运行 {#s-langsmith-tracing-the-value-local-sends-langchain-runs}

`tracing_context` 的 `enabled` 接受 `True`、`False`、`None` 和字符串 `"local"` {{code src/langsmith/run_helpers.py}}。`langsmith.configure` 的 docstring 描述了这四个值 {{code src/langsmith/run_trees.py}}。`True` 追踪并发送，`False` 关闭追踪，`None` 读取环境，`"local"` 追踪但把数据留在本地。`langsmith` 的 `traceable` 代码兑现了这个承诺。只有值为 `True` 时它才发送运行 {{code src/langsmith/run_helpers.py}}。

LangChain 的代码没有兑现。`langchain-core` 的回调管理器调用 `tracing_is_enabled()`，把任何真值都当作开启 {{code libs/core/langchain_core/callbacks/manager.py}}。字符串 `"local"` 是真值，所以管理器添加了一个 `LangChainTracer`，而这个追踪器会发送每个运行 {{code libs/core/langchain_core/tracers/context.py}}。[图](#fig-7-6c)跟踪了这两条路径。

```figure
id: fig-7-6c
kind: sequence
title: tracing_context(enabled="local") 保留什么、发送什么
claim: 本地上下文里的 traceable 函数保留它的运行树，同一上下文里的 agent 发送了 14 个请求，而 enabled=False 加 collect_runs 一个也不发送。
caption: 请从上往下读各行。第 1、2 行是 traceable 函数，第 3 到 5 行是同一上下文里的 agent，第 6、7 行是关闭追踪的 agent。来源：capture/out/42-langsmith.txt。
```

录制工具包把一轮 agent 包在本地追踪里，使用的客户端的 HTTP 会话只记录每个请求，什么也不发送：

```listing
title: tracing_context(enabled="local") 里的一轮 agent
source: capture/out/42-langsmith.txt
lang: json
note: 先是 traceable 运行的请求，然后是这一轮 agent 的请求。
---
HTTP requests the client received for the traceable runs:
{}
…
HTTP requests the client received, by method and path:
{
  "PATCH /runs/<run-id>": 7,
  "POST /runs": 7
}
```

**我们测量了** 同样的用例，对托管 API，在 Mac 上，使用 `langsmith` 0.14.17 和 `langchain-core` 1.8.0。进程里有密钥和项目名，`LANGSMITH_TRACING` 未设置。`"local"` 里的三次 agent 运行也各调用了一个 `traceable` 函数。全部 21 个 LangChain 运行都到达了服务器，分 7 次 multipart 发送。服务器为它们创建了项目 `aiefs-lc101-local`。`traceable` 函数什么也没有发送：

```listing
title: 服务器为 enabled="local" 里的三次 agent 运行保存了什么
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
  "agent_runs": 3,
  "env": [
   "LANGSMITH_API_KEY",
   "LANGSMITH_PROJECT"
  ],
  "multipart_posts": 7,
  "project": "aiefs-lc101-local",
  "project_created": true,
  "stored_runs": {
   "chain LangGraph": 3,
   "chain model": 6,
   "chain tools": 3,
   "llm ChatOllama": 6,
   "tool add": 3
  },
  "traceable_name": "t21_local_traceable",
  "traceable_stored": 0
```

所以对 agent 来说，`"local"` 什么也没有留在本地，即使在真实账户上也是如此。我们在 `langchain-ai/langchain` 提交了一份报告，编号 #41870。

**我们测量了** 更早之前对 Mac 上本地记录器的同一用例，没有端点、没有密钥，`LANGSMITH_TRACING=false`。agent 的运行试图连接默认主机。我们替换了 HTTP 层，所以没有任何东西离开这台机器：

```listing
title: 没有环境变量时，本地 agent 运行的请求
source: capture/lab/summary/tracing-mac-real.json
lang: json
---
   "case": "local:agent:patched-requests",
   "env": [
    "LANGSMITH_TRACING"
   ],
   "local_trees": 0,
   "request_count": 4,
   "requests": [
    "GET https://api.smith.langchain.com/info",
    "POST https://api.smith.langchain.com/runs/multipart",
    "POST https://api.smith.langchain.com/runs/multipart",
    "POST https://api.smith.langchain.com/runs/multipart"
   ],
   "tracing_is_enabled": "local"
```

所以一个根本没有密钥的进程仍会尝试发送。把 agent 包在 `traceable` 里也没有帮助，因为它下面的 LangChain 运行仍然发了出去。

## 什么能让追踪留在你的机器上 {#s-langsmith-tracing-what-keeps-a-trace-on-your-machine}

在锁定版本上，只要追踪开着，没有任何环境变量和任何 `enabled` 的值能让 LangChain 运行留在本地。请改用下面的办法之一：

- **对 LangChain 代码关闭追踪。** 把调用包在 `tracing_context(enabled=False)` 里。在上面的顺序里，上下文的值排在最前面，所以它优先于外层的 `"local"` 上下文和所有变量。不设置 `LANGSMITH_TRACING` 是不够的，因为 `LANGSMITH_TRACING_V2`、`LANGCHAIN_TRACING_V2` 或外层上下文仍可能开启追踪。
- **在内存里收集运行。** `langchain_core.tracers.context` 里的 `collect_runs()` 添加一个收集器，保留每个已结束的运行，无论追踪开着还是关着。
- **运行你自己的端点。** 把 `LANGSMITH_ENDPOINT` 设为你自己机器或网络里的 LangSmith 服务器。这样运行会离开进程，但仍留在你手里。
- **只对 `traceable` 代码使用 `"local"`。** 它保留的是那些不调用任何 LangChain 代码的函数的运行树。

录制工具包在外层 `"local"` 上下文里关闭追踪来运行 agent，并收集这些运行：

```listing
title: 带 collect_runs 的 tracing_context(enabled=False)
source: capture/out/42-langsmith.txt
lang: json
---
collect_runs().traced_runs:
[
  "llm ChatOllama",
  "tool add",
  "llm ChatOllama",
  "chain LangGraph"
]

HTTP requests the client received:
{}
```

`traced_runs` 按完成顺序保存每棵回调树的顶层运行。`LangGraph` 运行把节点运行作为它的子运行。客户端什么也没有收到。

## 追踪给一次运行带来的成本 {#s-langsmith-tracing-what-tracing-costs-a-run}

LangSmith 产品页面说，SDK 在后台发送追踪，应用性能从不受影响 {{site langchain.com/langsmith/observability}}。

**我们测量了** 对托管 API 的 agent，在 Mac 上，开启追踪 30 次、关闭追踪 30 次，在一个进程里交错运行。每次运行都回答正确。我们取的是模型之外的时间：墙钟时间减去 Ollama 为它的两次回复报告的时间。我们去掉了第一次被追踪的运行，它在模型之外花了 121 毫秒。

- **追踪关闭。** 中位数的一次运行在模型之外花了 10.9 毫秒。
- **追踪开启。** 中位数的一次运行在模型之外花了 16.9 毫秒。
- **差值。** 两个中位数相差 5.9 毫秒。对 10,000 次重采样做自助法（bootstrap），得到 95% 区间是 3.5 到 8.6 毫秒。

墙钟时间的中位数是关闭时 11.66 秒，开启时 11.78 秒。这批运行期间有另一个 agent 在用同一个 Ollama 模型，所以模型时间浮动了好几秒。不要从墙钟时间读出任何结论。

**我们测量了** 追踪的成本，最先是对 Mac 上立即应答的本地记录器。一个进程运行了 122 次，每隔一次切换开关追踪。我们去掉了前两次，每种条件剩下 60 次运行。[图](#fig-7-6)展示了每次运行。

```figure
id: fig-7-6
kind: chart
title: 追踪关闭与开启时，一次 agent 运行在模型之外的时间
claim: 追踪把模型之外时间的中位数从 17.7 毫秒提高到 26.3 毫秒，成对比较是 7.4 毫秒，七个被追踪的运行里每个约 1.1 毫秒。
caption: 每个点是 Mac 上的一次 agent 运行，每种条件 60 次，在一个进程里交错运行，黑线是中位数。端点是一个立即应答的本地记录器。来源：capture/lab/summary/tracing-mac-real.json。
```

对记录器而言，成对的两次运行里追踪增加了 7.4 毫秒。这与对托管 API 的 5.9 毫秒很接近。放在一次模型调用旁边，6 毫秒很小。但它不是零，而且生命周期很短的进程，第一次调用要付出更多。

用记录器时，七个被追踪进程里有六个，它们的第一次运行在模型之外花了 83 到 243 毫秒。在第一次被追踪的运行里，客户端启动并向端点询问它的设置。

第三种被追踪的条件设置了 `LANGCHAIN_CALLBACKS_BACKGROUND=false`，在三个进程里对记录器各运行 21 次。文档说 `false` 会让回调等待 {{docs langsmith/trace-with-langchain}}，但 `langchain-core` 1.8.0 和 `langsmith` 0.14.17 里没有任何代码读取它。只有两个包提到它。`langgraph-cli` 在它的 deploy 命令里把它列为保留项 {{code libs/cli/langgraph_cli/deploy.py:76}}，在 0.4.43 的 wheel 里是第 71 行。`langgraph-api` 0.18.0 为它的 JS worker 把它设为 `true` {{code langgraph_api/js/remote.py:119}}。没有 Python 代码读取它。

所以这个条件运行的代码与追踪开启时相同。它们在各自的进程里运行，负载在 4.6 到 27.5 之间，所以我们不从它们的时间里读出任何影响。冲突登记把文档与代码的分歧记为 D111。

## 追踪何时变得可读 {#s-langsmith-tracing-when-a-trace-becomes-readable}

`invoke` 在服务器拿到追踪之前就返回了。客户端从后台线程发送运行，服务器稍后才保存。

**我们测量了** 对托管 API 的 30 次被追踪运行的延迟。每次 `invoke` 返回后，脚本每隔 0.25 秒对根运行调用一次 `read_run`，再加上每次读取本身的时间。所以分辨率由轮询和读取决定，下面的数字是估计值：

| 事件 | 中位数 | p90 | 最大值 |
|---|---|---|---|
| 根运行可读 | 1.46 秒 | 2.06 秒 | 3.57 秒 |
| 根运行有了结束时间和输出 | 5.63 秒 | 7.78 秒 | 10.49 秒 |

没有任何一次轮询超时。在运行之后马上读取自己的追踪的测试必须等待。轮询结束时间，并至少允许 10 秒。

## 客户端发送什么 {#s-langsmith-tracing-what-the-client-sends}

**我们测量了** 对托管 API 的 30 次被追踪运行的每个请求。客户端只发送了 `POST /runs/multipart`，每次被追踪的运行 3 个 post，每个都得到状态 202。它没有发送 `PATCH`，也没有发送 `POST /runs`。其他请求只有两个 `GET /info`，进程里每个客户端一个：

```listing
title: 30 次被追踪运行发往托管 API 的请求
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
  "requests": {
   "GET /info 200": 2,
   "POST /runs/multipart 202": 90
  },
  "responses_with_rate_limit_headers": 0,
```

每个 post 都带有 `Content-Encoding` 以及头 `X-Pre-Compressed-Size` 和 `X-Post-Compressed-Size`。当服务器的 `/info` 启用时，客户端用 zstd 压缩 {{code src/langsmith/_internal/_background_thread.py:572}} {{code src/langsmith/client.py:3599}}。托管的 `/info` 把 `zstd_compression_enabled` 设为 true。没有响应带限流头。

文档的用量页面说，SDK 会把同一个会话的最多 100 个运行批量合并成一次 API 调用 {{docs langsmith/usage-and-billing}}。用本地记录器和真实模型时，每个 post 装 1 到 4 个运行，大多是 3 或 4 个。客户端在模型运行期间，手里有什么就发什么。对一个每个请求要 2 秒的记录器，一个 post 最多装了 18 个运行。

录制工具包用 `auto_batch_tracing=False` 关闭了批处理，所以每个运行显示一个 `POST /runs` 和一个 `PATCH`。默认的客户端不发送这种形态的请求。

## 端点故障时 {#s-langsmith-tracing-when-the-endpoint-fails}

同一个产品页面说，在 LangSmith 出现故障期间，你的 agent 照常运行 {{site langchain.com/langsmith/observability}}。追踪文档警告说，进程可能在所有追踪发送完之前结束 {{docs langsmith/trace-with-langchain}}。

**我们测量了** Mac 上本地记录器的每种状态下，一个进程运行 50 次 Qwen3 4B 的 agent，共 350 个被追踪的运行。记录器可以按需失败，托管 API 做不到。[图](#fig-7-6b)展示了从最后一次运行到进程退出的时间。

```figure
id: fig-7-6b
kind: chart
title: 从最后一次运行到进程退出的秒数，按端点分
claim: 每次 agent 运行在每种情形下都得到了回答，故障的端点让退出延迟了 9.9 到 17.1 秒，而挂起的端点让进程一直活着。
caption: 每个点是 Mac 上一个进程，运行 50 次 Qwen3 4B 的 agent。点上方的分数是到达端点的被追踪运行数。挂起的端点画成箭头，因为我们在 300 秒时杀掉了那个进程。来源：capture/lab/summary/tracing-mac-real.json。
```

- **运行本身。** 在每种情形下，50 次 agent 运行全都返回了正确答案，也没有抛出错误。这个说法对运行本身成立。
- **宕机的端点。** 退出等了 9.9 秒，350 个运行一个也没有到达。
- **返回 500 的端点。** 客户端发送了 132 个 post（包含重试），退出等了 17.1 秒。全部 350 个运行都到达了端点，端点拒绝了每一个。
- **接受请求却从不回答的端点。** 进程自己没有退出。我们在 300 秒时杀掉了它，距离它的最后一次运行 208 秒。到那时，350 个运行里有 50 个到达了端点，同样的 50 个运行分了 6 个 post。
- **慢的端点。** 每个请求 2 秒时，退出等了 3.7 秒，350 个运行全部到达。

在锁定版本上，退出会等待追踪，所以文档里的警告不适用于正常工作的端点。成本转移到了退出时，脚本、测试运行或无服务器处理函数要付这笔账。请在你选定的位置调用 `langchain_core.tracers.langchain` 里的 `wait_for_all_tracers()`。在它之后，退出用了 0.4 秒。刷新本身对正常工作的记录器用了 68 毫秒，对慢的记录器用了 4.0 秒。

## 账户报告的限制 {#s-langsmith-tracing-the-limits-that-the-account-reports}

客户端从 `GET /info` 读取它的批处理设置，服务器也在那里报告它的限制。**我们测量了** 托管 API 对免费计划新账户返回了什么，只用了 GET 请求：

```listing
title: 托管 API 的 GET /info 里的批处理设置和限制
source: capture/lab/summary/langsmith-account-mac.json
lang: json
note: 先是批处理设置，然后是实例标志。
---
  "batch_ingest_config": {
   "scale_down_nempty_trigger": 4,
   "scale_up_nthreads_limit": 16,
   "scale_up_qsize_trigger": 1000,
   "size_limit": 100,
   "size_limit_bytes": 20971520,
   "use_multipart_endpoint": true
  },
…
   "max_longlived_ttl_days": 180,
   "per_project_retention_enabled": false,
   "trace_tier_duration_days": {
    "longlived": 400,
    "shortlived": 14
   },
   "trace_tree_max_runs": 1000,
```

- **一个批次。** 一个 post 最多装 100 个运行和 20 MiB，客户端使用 multipart 端点。
- **一条追踪。** 一条追踪最多装 1,000 个运行。长时间循环的 deep agent 可能达到这个上限。
- **保留期。** 新追踪的默认层级是 `shortlived`，由系统设置。`/info` 给出它是 14 天，`longlived` 是 400 天。标志 `max_longlived_ttl_days` 是 180，允许的值从 30 到 400。我们没有查明哪一个适用。按项目设置保留期是关闭的。
- **限流。** 没有响应带限流头。`/usage-limits` 返回空列表，组织的限流字段是 null。
- **计划。** 组织允许一个工作区和一个身份。

`GET /sessions` 的应答带有 `deprecation` 头和 2027 年 7 月 1 日的 `sunset` 日期，并指明 `/api/v2/sessions` 为后继。SDK 警告说 `list_runs` 在 2027 年 1 月 31 日之后弃用，代码对 `read_run` 也做了同样的标记 {{code src/langsmith/client.py:4063}}。读取或列出运行的代码要在那之前换成新的调用。我们发送的数据不足以触及其中任何一个限制。

```takeaways
- 追踪必须留在本机时，把 LangChain 代码包在 tracing_context(enabled=False) 里。
- 不用 LangSmith 端点，而要把 agent 的运行保存在内存里时，用 collect_runs。
- 脚本或处理函数退出之前，调用 wait_for_all_tracers()。
- 测试读取追踪之前，先轮询根运行的结束时间。
- 预期每个新进程的第一次被追踪运行会在模型之外花约 120 毫秒。
- 给运行被追踪脚本的作业设置超时，因为挂起的端点会阻塞退出。
```

来源：capture/s_integrations.py, capture/out/42-langsmith.txt; capture/lab/summary/langsmith-account-mac.json, capture/lab/T21-langsmith-account-mac/02-e1-timing.jsonl, capture/lab/T21-langsmith-account-mac/02-e1-timing-requests.jsonl, capture/lab/T21-langsmith-account-mac/03-e1-tree.jsonl, capture/lab/T21-langsmith-account-mac/03b-e1-local.json, capture/lab/T21-langsmith-account-mac/01-account-probe.json, capture/lab/T21-langsmith-account-mac/_scripts/t21_e1_trace.py, capture/lab/T21-langsmith-account-mac/_scripts/t21_probe.py; capture/lab/summary/tracing-mac-real.json, capture/lab/TRC-tracing-mac-real/04-interleave-summary.jsonl, capture/lab/TRC-tracing-mac-real/03-latency-summary.jsonl, capture/lab/TRC-tracing-mac-real/01-failure-summary.jsonl, capture/lab/TRC-tracing-mac-real/02-tracing-context-local.jsonl, capture/lab/TRC-tracing-mac-real/trc_child_real.py, capture/lab/TRC-tracing-mac-real/trc_driver.py; src/langsmith/utils.py, src/langsmith/run_helpers.py, src/langsmith/run_trees.py, src/langsmith/client.py, and src/langsmith/_internal/_background_thread.py at langsmith v0.14.17; libs/core/langchain_core/callbacks/manager.py, libs/core/langchain_core/tracers/context.py, and libs/core/langchain_core/tracers/langchain.py at langchain==1.5.0; libs/cli/langgraph_cli/deploy.py at langgraph 1.2.22; langgraph_api/js/remote.py at langgraph-api 0.18.0; docs.langchain.com at docs commit 04d4d4a (langsmith/observability-quickstart, langsmith/trace-with-langchain, langsmith/usage-and-billing); the product page www.langchain.com/langsmith/observability, read 2026-11-14; issue langchain-ai/langchain#41870.
