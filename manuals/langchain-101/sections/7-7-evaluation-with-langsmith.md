# 用 LangSmith 做评估

> `langsmith` 0.14.17 的 `evaluate` 根据数据集和你的评估器构建一个实验，而即使设置了 `upload_results=False`，它仍会发送 agent 的每个运行。

你修改了 agent 的系统 prompt，想知道它是否仍能回答你的二十个测试问题。文档把你引向 LangSmith，而它需要账户和密钥。你想先在笔记本上运行同样的检查，然后再作为实验放进你的账户。

读完本节，你能用本地评估器、不需要账户地运行 `evaluate`，并读懂它的行。你还能预测 `evaluate` 的每种模式会在账户里创建什么，以及 pytest 插件需要什么。

## 评估的组成部分 {#s-evaluation-with-langsmith-the-parts-of-an-evaluation}

**示例（example）：** 一个输入加它的参考输出。`langsmith.schemas.Example` 有 `inputs`、`outputs`、一个 id 和所属数据集的 id。

**目标（target）：** 你要测试的函数。`evaluate` 用每个示例的输入调用它，并记录它的返回值。

**评估器（evaluator）：** 给一行打分的函数。它返回带 `key` 和 `score` 的 dict。

**汇总评估器（summary evaluator）：** 一次给一个实验的所有行打分的函数，例如准确率。

**实验（experiment）：** 对一组示例的一次 `evaluate` 调用。文档说每次调用创建一个实验 {{docs langsmith/evaluate-llm-application}}。

函数签名是 `evaluate(target, /, data=None, evaluators=None, summary_evaluators=None, ...)` {{code src/langsmith/evaluation/_runner.py}}。`data` 可以是 LangSmith 里数据集的名字、示例列表或示例生成器。`max_concurrency` 默认为 0，一次运行一行。`num_repetitions` 让每个示例运行多次。`upload_results` 默认为 `True`。对大型作业，文档推荐使用 `aevaluate`，并把 `max_concurrency` 设得更高 {{docs langsmith/evaluate-llm-application}}。

评估器按名字接收参数。它可以使用的名字是 `run`、`example`、`inputs`、`outputs`、`reference_outputs` 和 `attachments` {{code src/langsmith/evaluation/evaluator.py}}。汇总评估器接收所有行的同样这些值的列表。

## 不用账户的 evaluate {#s-evaluation-with-langsmith-evaluate-with-no-account}

设置 `upload_results=False` 时，`evaluate` 不在 LangSmith 里创建实验，也不发送结果。录制工具包用三个示例的列表和它自己的客户端运行它。这个客户端设置了 `auto_batch_tracing=False`，它的 HTTP 会话记录每个请求。目标把两个数相加，当 `a` 为 4 时，它故意算错：

```listing
title: 一个目标和两个本地评估器
source: capture/s_integrations.py
lang: python
---
    def adder(inputs: dict) -> dict:
        return {"sum": inputs["a"] + inputs["b"] + (1 if inputs["a"] == 4 else 0)}

    def exact(outputs: dict, reference_outputs: dict) -> dict:
        return {"key": "exact", "score": outputs["sum"] == reference_outputs["sum"]}

    def accuracy(outputs: list, reference_outputs: list) -> dict:
        hits = sum(o["sum"] == r["sum"] for o, r in zip(outputs, reference_outputs))
        return {"key": "accuracy", "score": hits / len(outputs)}
```

`evaluate` 在你迭代它时返回各行。每一行包含示例、目标的运行和每个评估器的结果。第二行失败了，汇总评估器给三个里的两个打了分：

```listing
title: 失败的那一行、汇总，以及请求
source: capture/out/42-langsmith.txt
lang: json
note: 三行中的第二行，然后是汇总评估器和请求计数。
---
  {
    "inputs": {
      "a": 4,
      "b": 4
    },
    "outputs": {
      "sum": 9
    },
    "reference": {
      "sum": 8
    },
    "scores": {
      "exact": false
    }
  },
…
summary evaluators:
{
  "accuracy": 0.6666666666666666
}

HTTP requests the client received:
{}
```

录制工具包的客户端什么也没有收到。`evaluate` 警告说 `upload_results` 处于 beta 阶段。它还打印了 `Starting evaluation of experiment: %s`，后面跟一个随机名字。代码把格式字符串和名字作为两个参数传给 `print` {{code src/langsmith/evaluation/_runner.py}}。录制工具包把这个随机名字遮掉了。

这个空的计数属于录制工具包的客户端。你不传客户端时，`evaluate` 使用缓存的默认客户端 {{code src/langsmith/evaluation/_runner.py:1084}}。那个客户端自己会发出一个请求，下面的实验记录运行会说明这一点。

## agent 目标会发送它的运行 {#s-evaluation-with-langsmith-an-agent-target-sends-its-runs}

`evaluate` 在 `tracing_context` 里运行目标，当 `upload_results` 为 false 时，`enabled` 设为 `"local"` {{code src/langsmith/evaluation/_runner.py:1945}}。[第 7.6 节](#s-langsmith-tracing)展示了 `"local"` 对 LangChain 代码做了什么：回调管理器把它当作开启，并发送每个运行。所以即使设置了 `upload_results=False`，agent 目标也会发送它的运行。录制工具包的客户端不做批处理，每个运行发送一个 POST 和一个 PATCH：

```listing
title: 使用 upload_results=False 和录制工具包客户端的 create_agent 目标
source: capture/out/42-langsmith.txt
lang: json
note: agent 目标运行一行之后的请求计数。
---
HTTP requests the client received:
{
  "PATCH /runs/<run-id>": 7,
  "POST /runs": 7
}
```

这一行得分是 `false`。Qwen3 4B 回答 `2 + 3 = 5.`，而评估器 `same_answer` 把这段文本与参考答案 `The sum is 5.` 比较。精确匹配会让一个答对了的真实模型失败，所以要给数字打分，或者使用裁判。

[图](#fig-7-7)用录制工具包的客户端把两种目标并排放在一起。

```figure
id: fig-7-7
kind: comparison
title: 两种目标上 upload_results=False 的 evaluate
claim: 设置 upload_results=False 并使用录制工具包的客户端时，普通函数什么也不发送，而 create_agent 目标发送它的七个 LangChain 运行。
caption: 请从顶部的示例往下读每一列，直到客户端收到的内容。玫红色方框是 agent 目标发送的请求。录制工具包的客户端为每个运行发送一个 POST 和一个 PATCH。来源：capture/out/42-langsmith.txt。
```

**我们测得**同样的调用，使用 x86 服务器客户机上的默认客户端和 Qwen3 4B 的 agent，对着本地记录器。我们没有传客户端，也没有设置 `LANGSMITH_TRACING`。每种条件在 5 个新进程里运行，每次一个示例。agent 产生了 7 个 LangChain 运行。同一条件下的每个进程发送了相同的请求：

| 目标 | 环境 | 5 个进程里每一个的请求 |
|---|---|---|
| `create_agent` | `LANGSMITH_ENDPOINT` 指向本地记录器 | 一个 `GET /info`，然后是三个 `POST /runs/multipart`，带着 7 个运行和 5 次更新 |
| `tracing_context(enabled=False)` 里的 `create_agent` | 同上 | 一个 `GET /info` |
| 普通函数 | 同上 | 一个 `GET /info` |
| `create_agent` | 没有 `LANGSMITH_` 或 `LANGCHAIN_` 变量 | 同样的四个请求，发往 `api.smith.langchain.com` |
| `tracing_context(enabled=False)` 里的 `create_agent` | 没有变量 | 一个发往 `api.smith.langchain.com` 的 `GET /info` |

每一行得分都是 `true`。默认客户端没有发送 PATCH 请求，也没有发送 `POST /runs`。更新以 patch 部分的形式放在 multipart post 里发出。没有环境变量时，我们替换了子进程的 HTTP 层，所以没有请求到达默认主机：

```listing
title: 没有环境变量时，一个进程里 agent 目标的请求
source: capture/lab/summary/evaluate-x86.json
lang: json
---
   "requests": [
    [
     "GET https://api.smith.langchain.com/info",
     "POST https://api.smith.langchain.com/runs/multipart",
     "POST https://api.smith.langchain.com/runs/multipart",
     "POST https://api.smith.langchain.com/runs/multipart"
    ],
```

`GET /info` 来自默认客户端的批处理线程，它向端点询问自己的设置 {{code src/langsmith/_internal/_background_thread.py:553}}。普通函数同样会发出它，所以它不取决于目标。

被发送的运行有两个缺陷。在全部 10 个 agent 进程里，`LangGraph` 运行都有一个父 id，而客户端从未发送那个父运行。被发送的运行上的项目名，也与 `evaluate` 打印的名字不同。下一部分展示真实服务器对这两点怎么处理。

## 真实账户上的 evaluate {#s-evaluation-with-langsmith-evaluate-on-a-real-account}

**我们测得**在 Mac 上对托管 API 的三次调用，用的是免费计划的新账户。数据集有 10 道加法题，目标是 Qwen3 4B 的 agent。评估器是 `exact`（一项代码检查）和 `judge`（通过管道接到 `ChatOllama` 和解析器的 prompt）：

| 调用 | 之后账户里有什么 | agent 运行 |
|---|---|---|
| `evaluate`，`upload_results=True` | 一个关联到数据集的实验，10 个 `Target` 根（每个指向它的示例），以及 20 行反馈 | 70 个，在根之下 |
| `evaluate`，`upload_results=False` | 没有实验，只有一个自动命名的新项目 | 70 个，没有根 |
| `aevaluate`，`upload_results=True`，`max_concurrency=2` | 一个关联到数据集的实验，10 个 `AsyncTarget` 根，以及 20 行反馈 | 70 个，在根之下 |

每次调用里两个得分都是 10 个中的 10 个。反馈行有键 `exact` 和 `judge`，来源类型是 `model`。裁判在每一行都说了 `CORRECT`，而每个答案也都是对的。所以这次运行没有说明裁判能发现错误的答案。

两次上传的调用还创建了一个名为 `evaluators` 的项目，没有前缀。每次评估器调用在其中有一个根运行，`exact` 有 20 个，`judge` 有 20 个。名字是 `evaluate` 起的，你无法通过调用来设置。

### upload_results=False 仍然发送什么 {#s-evaluation-with-langsmith-what-upload-results-false-still-sends}

设置 `upload_results=False` 时，客户端没有发送 `POST /sessions`，所以没有创建实验。它仍然读取了数据集，并发送了 31 个 multipart post：

```listing
title: 托管 API 上 upload_results=False 的 evaluate 的请求
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
   "requests": {
    "GET /datasets 200": 2,
    "GET /examples 200": 1,
    "GET /info 200": 2,
    "GET /sessions 200": 5,
    "POST /runs/multipart 202": 31
   },
```

这些 post 带着 70 个 agent 运行。服务器把它们存进一个没有人命名的项目里。这次调用还给同一个实验起了三个名字：

```listing
title: upload_results=False 的一次 evaluate 调用的三个名字
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
  "false_names": {
   "experiment_name_returned": "healthy-coast-30",
   "printed": "Starting evaluation of experiment: %s aiefs-lc101-eval-false-3afa8db2",
   "project_with_the_runs": "abandoned-drink-3"
  },
```

- **打印的名字** 用的是调用里的前缀，跟在字面量 `%s` 之后。
- **返回的名字** 即结果里的 `experiment_name`，它不对应账户里的任何项目。
- **存放运行的项目** 的名字是服务器给它的随机名字。它没有前缀，所以按你的前缀过滤找不到它。

我们把这些名字和那次打印作为 #106 提交到了 `langchain-ai/langsmith-python`。这些运行来自 `"local"` 模式，[第 7.6 节](#s-langsmith-tracing)展示了它，#41870 报告了它。

### 服务器上的孤儿运行 {#s-evaluation-with-langsmith-orphan-runs-on-the-server}

**我们测得** `upload_results=False` 那次调用的运行最后到了哪里。在 10 条追踪里的 10 条中，`LangGraph` 运行都有父 id。这个父运行是 `Target` 运行，客户端从未发送过它：

```listing
title: upload_results=False 的 evaluate 产生的孤儿运行
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
  "false_orphans": {
   "is_root_count": 0,
   "langgraph_runs_with_unsent_parent": 10,
   "project_runs": 70,
```

读取追踪的根抛出了 `LangSmithNotFoundError`。用 `is_root=True` 列出这个项目，返回了 0 个运行。所以项目的根视图什么也不显示，这 70 个运行只作为子运行出现。裁判也把它自己的运行发给了 `evaluators`，同样带着未发送的父运行。那个项目里有 30 个 `RunnableSequence` 运行，对应它的 20 个裁判根。

所以 `upload_results=False` 并不能让 agent 目标不进入你的账户。它把运行存在追踪视图不显示的地方。不允许任何运行离开时，把目标包在 `tracing_context(enabled=False)` 里，下一部分会展示。裁判评估器里的模型调用也要用同样的办法包起来，因为裁判会发送它自己的运行。

## 让 agent 目标留在离线状态 {#s-evaluation-with-langsmith-keep-an-agent-target-offline}

要把 agent 目标的运行留在进程里，就在目标内部关闭追踪。录制工具包把 agent 包在 `tracing_context(enabled=False)` 里。这样录制工具包的客户端就什么也没收到，这一行的得分与之前相同：

```listing
title: 内部关闭了追踪的 agent 目标
source: capture/s_integrations.py
lang: python
---
    def quiet_target(inputs: dict) -> dict:
        with tracing_context(enabled=False):
            return agent_target(inputs)
```

用默认客户端和本地记录器，同样的包装阻止了运行，但 `GET /info` 仍然在 5 个进程里的 5 个中发了出去。没有环境变量时，它发往了 `api.smith.langchain.com`。所以当一个请求都不能离开这台机器时，这样的包装还不够。还要把你自己的客户端传给 `evaluate`。`auto_batch_tracing=False` 的客户端不会启动批处理线程，录制工具包的客户端对普通函数没有收到任何请求。

## pytest 插件 {#s-evaluation-with-langsmith-the-pytest-plugin}

`langsmith` 通过 `pytest11` 入口点注册了一个 pytest 插件，所以两者都安装时，pytest 就会加载它 {{code pyproject.toml}}。插件添加了标记 `langsmith`。用 `@pytest.mark.langsmith` 标记的测试，通过 `langsmith.testing._internal` 里的 `test`（公开的 `langsmith.test` 背后的函数）运行。它把测试的输入、输出和反馈作为实验记录在 LangSmith 里 {{code src/langsmith/pytest_plugin.py}}。在这样的测试里，`langsmith.testing` 的 `log_inputs`、`log_outputs`、`log_reference_outputs` 和 `log_feedback` 往这份记录里添加内容。

除非 `LANGSMITH_TEST_TRACKING` 恰好等于 `false`，否则记录是开启的 {{code src/langsmith/utils.py:143-145}}。设为 `false` 时，被装饰的测试直接调用你的函数，每个 `log_*` 调用只记录一条日志消息然后返回 {{code src/langsmith/testing/_internal.py}}。文档的 pytest 页面给出了同一个开关，用于不带 LangSmith 运行 {{docs langsmith/pytest}}。选项 `--langsmith-output` 需要 `langsmith[pytest]` 附加项里的 `rich`，并且在追踪记录关闭时拒绝运行 {{code src/langsmith/pytest_plugin.py:311-317}}。`LANGSMITH_TEST_CACHE` 的缓存需要 `langsmith[vcr]` 附加项。

测试文件里有五个测试。三个用 `@pytest.mark.langsmith` 标记，一个用 `@langsmith.test`，还有一个未标记的测试调用了 `log_outputs`。一个标记过的测试故意失败，一个测试用 Ollama 上的 Qwen3 4B 运行 `create_agent`。pytest 的头部把 `langsmith-0.14.17` 列为插件，没有任何标志，conftest 文件里也没有相关的行。

### 开启记录还需要 LANGSMITH_TRACING {#s-evaluation-with-langsmith-tracking-on-needs-langsmith-tracing-too}

**我们测得** Mac 上这个插件对托管 API 的表现，在临时环境里使用 `pytest` 8.4.2。密钥已设置，带有套件名和实验名：

- **记录开启，`LANGSMITH_TRACING` 未设置。** 五个测试在 3 次运行里全都失败了。每个 `log_*` 调用都抛出 `ValueError`，要求有标记的测试和追踪。每次运行仍然创建了一个空的实验，第一次运行还创建了数据集。
- **同样的情况加 `--langsmith-output`。** 表格显示 3 行，没有 `@langsmith.test` 的那个测试。每一行都是 `failed`，输入是 `{}`，平均值那一行写着 `0%`。pytest 以退出码 1 结束。
- **记录开启，`LANGSMITH_TRACING=true`。** 三个测试通过，预期的两个失败，2 次运行里的 2 次都是如此。这两个是标记过的失败测试和未标记的 `log_outputs` 调用。

这条消息写出了两个条件。代码在每个 `log_*` 调用内部检查追踪 {{code src/langsmith/testing/_internal.py:1166-1168}}：

```listing
title: 记录开启而追踪未设置时 log_inputs 的错误
source: capture/lab/summary/langsmith-account-mac.json
lang: json
---
  "errors_with_tracing_unset": [
   "ValueError: log_inputs should only be called within a pytest test decorated with @pytest.mark.langsmith, and with tracing enabled (by setting the LANGSMITH_TRACING environment variable to 'true').",
```

追踪开启时，每次运行产生一个有 11 个运行的实验。其中四个是测试根，各自指向一个示例。7 个 agent 运行在 `test_marked_agent` 之下。反馈是 `pass`：三个测试为 1，失败的为 0，另有两次 `exact`。

插件忽略了 `LANGSMITH_PROJECT`，也不存在以那个名字命名的项目。测试的追踪进入了实验。8 个进程之后，账户里有一个数据集 `aiefs-lc101-pytest`，包含 3 个示例，描述为 `Test suite`。它还有 8 个实验，2 个有运行，6 个是空的。我们把需要追踪这一点作为 #107 提交到了 `langchain-ai/langsmith-python`。

### 没有账户时的插件 {#s-evaluation-with-langsmith-the-plugin-with-no-account}

**我们测得**更早之前在 x86 服务器客户机上的这个插件，对着本地记录器，没有环境变量，每种条件 3 个进程：

- **记录开启，没有 `LANGSMITH_` 变量。** 一次普通的 `pytest` 运行向 `api.smith.langchain.com` 发送了 `GET /info` 和 `GET /datasets`。我们拒绝了这个连接。四个被记录的测试以 `LangSmithConnectionError` 失败，未标记的测试从 `log_outputs` 抛出了 `ValueError`。
- **记录关闭。** 设置 `LANGSMITH_TEST_TRACKING=false` 后，四个测试通过，预期失败的那个失败。无论有没有 `LANGSMITH_ENDPOINT`，都没有请求离开。`log_*` 调用以 INFO 级别记录日志，所以只有把 `log_cli` 设在这个级别才能看到它们。
- **记录关闭时的 `--langsmith-output`。** 在任何测试运行之前，pytest 就以 `INTERNALERROR` 和退出码 3 停下了。[错误](#s-ref-errors)一节给出了这条消息。
- **记录关闭，`LANGSMITH_TRACING=true`。** agent 测试的 LangChain 运行仍然发往了端点，每次运行三个 `POST /runs/multipart`，3 次里的 3 次都是如此。关闭记录只会停止测试记录，追踪是另一个独立的开关。

```listing
title: 记录开启、没有环境变量、并有一个应答 200 的防护时，一次 pytest 运行的请求
source: capture/lab/summary/pytest-plugin-x86.json
lang: json
note: 三个进程中的第一个。
---
   "requests": [
    [
     "GET https://api.smith.langchain.com/datasets",
     "GET https://api.smith.langchain.com/info",
     "GET https://api.smith.langchain.com/sessions",
     "GET https://api.smith.langchain.com/datasets",
     "GET https://api.smith.langchain.com/sessions",
     "GET https://api.smith.langchain.com/datasets",
     "GET https://api.smith.langchain.com/sessions",
     "GET https://api.smith.langchain.com/datasets",
     "GET https://api.smith.langchain.com/sessions"
    ],
```

所以同时安装了 `pytest` 和 `langsmith` 时，除非你设置了这个变量，否则每个标记过的测试都会发出请求。请在测试环境里，在 `LANGSMITH_TRACING` 旁边设置它。

## 免费计划上的 prompt hub {#s-evaluation-with-langsmith-the-prompt-hub-on-the-free-plan}

文档通过 `langchain_classic` 讲解 hub，冲突登记把它记为 D113。`langsmith` 的客户端有它自己的方法 `push_prompt` 和 `pull_prompt`。

**我们测得**免费计划上的 hub，从 Mac 发起一次。我们两次推送了一个私有 prompt，标签是 `v1` 和 `v2`：

- **拉取。** 每次拉取都返回了正确的版本。我们按标签、按哈希前 8 个字符、按完整哈希，以及按最新版本来拉取。
- **没有变化的推送。** 它抛出了 `LangSmithConflictError`，来自 409，详情是 `Nothing to commit: prompt has not changed since latest commit`。
- **不存在的标签。** 它抛出了 `LangSmithNotFoundError`，来自 404，详情是 `Commit not found`。
- **客户端的缓存。** 第二次按完整哈希拉取没有发出 HTTP 请求。按标签的每次拉取每次都发出 2 个请求。

所以在生产代码里，要按完整哈希锁定 prompt。标签是一个可以移动的名字，而且客户端每次都要询问服务器。

## 仍未解决 {#s-evaluation-with-langsmith-still-open}

这些运行需要的比本版做的更多，[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)列出了它们：

- 数据集的版本和拆分，按名字交给 `evaluate`。
- 两个实验的比较，当目标是一对实验 id 时，`evaluate` 会运行它。
- 生产追踪上的在线评估器，以及标注队列。

```takeaways
- 不用账户测试时，用 upload_results=False 和示例列表运行 evaluate。
- 写接收 outputs 和 reference_outputs、返回 key 和 score 的评估器。
- 把 agent 目标包在 tracing_context(enabled=False) 里，让它的运行留在你的账户之外。
- evaluate 运行之后，到 evaluators 项目和没有你前缀的项目里查看。
- 开启记录时同时设置 LANGSMITH_TRACING=true，否则标记测试里的每个 log 调用都会抛出异常。
- 标记测试设置 LANGSMITH_TEST_TRACKING=false，并把目标和裁判也包在 tracing_context(enabled=False) 里。
- 版本不能变化时，按完整提交哈希拉取 prompt。
```

来源：capture/s_integrations.py, capture/out/42-langsmith.txt; capture/lab/summary/langsmith-account-mac.json, capture/lab/T21-langsmith-account-mac/06-e2-true.json, capture/lab/T21-langsmith-account-mac/06-e2-false.json, capture/lab/T21-langsmith-account-mac/06-e2-false-stdout.txt, capture/lab/T21-langsmith-account-mac/06-e2-async.json, capture/lab/T21-langsmith-account-mac/06b-e2-false-where.json, capture/lab/T21-langsmith-account-mac/04-e3-pytest-runs.jsonl, capture/lab/T21-langsmith-account-mac/04-e3-inspect.json, the stdout files of T21, capture/lab/T21-langsmith-account-mac/05-e4-hub.json, capture/lab/T21-langsmith-account-mac/05b-e4-hub-fullhash.json, capture/lab/T21-langsmith-account-mac/_scripts/t21_e2_eval.py, capture/lab/T21-langsmith-account-mac/_scripts/t21_e3_pytest.py, capture/lab/T21-langsmith-account-mac/_scripts/t21_e4_hub.py, capture/lab/T21-langsmith-account-mac/_scripts/t21_tests/test_ls_plugin.py; capture/lab/summary/evaluate-x86.json, capture/lab/T18-evaluate-leak-x86/01-evaluate-requests.jsonl, capture/lab/T18-evaluate-leak-x86/02-evaluate-noflush.jsonl, capture/lab/T18-evaluate-leak-x86/t18_real.py, capture/lab/T18-evaluate-leak-mac/04-info-origin.txt; capture/lab/summary/pytest-plugin-x86.json, capture/lab/T19-pytest-plugin-x86/01-pytest-runs.jsonl, capture/lab/T19-pytest-plugin-x86/t19_tests/test_ls_plugin.py, the stdout files of T19; src/langsmith/evaluation/_runner.py, src/langsmith/evaluation/evaluator.py, src/langsmith/_internal/_background_thread.py, src/langsmith/pytest_plugin.py, src/langsmith/testing/_internal.py, src/langsmith/testing/__init__.py, src/langsmith/utils.py, src/langsmith/client.py, and pyproject.toml at langsmith v0.14.17; libs/core/langchain_core/callbacks/manager.py at langchain==1.5.0; docs.langchain.com at docs commit 04d4d4a (langsmith/evaluate-llm-application, langsmith/pytest, langsmith/usage-and-billing, langsmith/evaluation-concepts); issues langchain-ai/langsmith-python#106 and #107, and langchain-ai/langchain#41870.
