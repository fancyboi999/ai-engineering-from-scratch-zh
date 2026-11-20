# 测试基准方法

> 测试基准用带状态检查器的 99 个任务，在五个本地模型和两个 Claude 模型上各运行一次，附 Wilson 区间和一份应跳过的行的清单。

## 工具包 {#s-ref-the-bench-method-the-kit}

测试基准工具包是[基准目录](manuals/langchain-101/capture/lab/bench)里的一组 Python 文件。它只驱动真实模型。任何一行都不是由假模型、桩服务器或脚本化回复回答的。

| 文件 | 作用 |
|---|---|
| `kit/gen_tasks.py` | 用固定数据生成 100 个任务：12 件商品的目录、含 48 位客户和 240 个订单的 SQLite 商店，以及 26 份虚构的文档 |
| `kit/oracle.py` | 为每个任务运行正确的工具调用并检查每个任务都能通过，再检查一个不做任何工具调用的 agent 会让每个任务都失败 |
| `kit/env.py` | 每个任务族的工具，每个都被包装起来，以记录参数、结果和耗时 |
| `kit/harnesses.py` | 四种 harness：朴素循环、`create_agent`、手工搭建的 `StateGraph` 和 `create_deep_agent`，另有第五种用于 `FilesystemBackend` |
| `kit/checks.py` | 检查器，以及失败类别 |
| `kit/models.py` | 模型设置、调用计量和成本账本 |
| `kit/run.py`, `kit/structured.py`, `kit/toolscale.py` | 三个运行器：任务集、结构化输出和工具数量 |
| `summarize.py` | 读取原始行并写出 `summary-mac.json`，测试基准各节的每个数字和图表都来自它 |

**检查器（checker）：** 依据工具改变了什么来判定通过与否的函数。它读取运行过的查询及其参数、数据库哈希、任务文件夹里的文件，以及笔记 store。只有对有标准答案的问题，并且模型没有调用 `submit_answer` 时，它才会读取最终文本。

**失败类别（failure category）：** 按这个顺序，第一个匹配的失败原因。抛出的错误是 `loop_step_limit`、`parse_error` 或 `harness_error`。写成文本的工具调用是 `malformed_output`。调用了未知的工具，或没有调用必需的查询，是 `wrong_tool`。

必需的查询失败了是 `wrong_args`。拒绝回答是 `gave_up`。其余都是 `wrong_final_state`。

## 任务与采样 {#s-ref-the-bench-method-tasks-and-sampling}

套件有 100 个任务，分五个任务族，每族 20 个。每张表都去掉了 `sql19`，所以套件是 99 个。那个任务要求找出产品最多的产品类别，而有两个类别各有 5 个产品，标准答案只写了其中一个。

**分层子集（stratified subset）：** 每个任务族里编号为 01、04、07、10、13 和 16 的 30 个任务。没有跑完整套件的模型运行的就是这个子集。`sql19` 不在其中。

| 运行器 | 模型 | 每个单元格的任务数 |
|---|---|---|
| 任务集，朴素循环和 deep agent | Qwen3 4B, Qwen3 8B, Claude Haiku 5.5 | 99 |
| 任务集，朴素循环和 deep agent | Claude Sonnet 5.5, gpt-oss 20B, Qwen3 14B, Qwen3 30B-A3B | 30 |
| 任务集，`create_agent` 和 `StateGraph` | Qwen3 4B, Qwen3 8B | 30 |
| 任务集，`FilesystemBackend` | Qwen3 4B, Qwen3 8B, Claude Haiku 5.5 | 20 个文件任务 |
| 结构化输出 | Qwen3 4B, Qwen3 8B, Claude Haiku 5.5 | 39 个，Qwen3 4B 上的 `ProviderStrategy` 为 10 个 |
| 工具数量 | Qwen3 4B 和 Claude Haiku 5.5 各 4 种规模，Qwen3 8B 2 种规模 | 10 个链式任务 |

## 设置 {#s-ref-the-bench-method-settings}

本地模型在 Mac 上用 Ollama 0.31.1 运行，temperature 为 0，seed 为 42，上下文为 16,384 个 token。输出上限是 1,024 个 token，gpt-oss 20B 和 Qwen3 30B-A3B 是 4,096。思考功能关闭，只有 gpt-oss 20B 设为 `low`，Qwen3 30B-A3B 开启。Qwen3 4B 是 `Q4_K_M` 量化的 `4b-instruct-2507` 版本。

Claude 通过 Mac 访问 Anthropic API 运行，使用 `langchain-anthropic` 1.7.10。API 对这些模型不接受 temperature，所以工具包没有发送，Claude 使用默认采样。输出上限是 1,024 个 token。每种 harness 对每个用户轮次的模型调用上限是 10 次，使用工具选择器时是 20 次。

所用的包是 `langchain` 1.5.0、`langchain-core` 1.8.0、`langgraph` 1.2.22、`deepagents` 0.7.38 和 `langchain-ollama` 1.1.0。

## 在 Ollama 上，一次贪心运行就够了 {#s-ref-the-bench-method-one-greedy-run-is-enough-on-ollama}

**我们测得**在 Mac 上，用两种 harness 各把 Qwen3 4B 在 30 个任务的子集上运行三次。三次运行在每个任务上都给出相同的结果、相同的 token 和相同的工具调用。temperature 为 0 且 seed 固定时，Ollama 会重复自己，所以再做一次贪心运行没有增加任何信息。

**我们测得**在同样的 30 个任务上，用 temperature 0.7 和 seed 1、2、3 运行朴素循环。它分别通过了 24、23 和 23 个，有 5 个任务的结果在不同 seed 之间发生了变化。[图](#fig-r-11)展示了每次运行。

```figure
id: fig-r-11
kind: chart
title: 三次贪心运行彼此重复，三次采样运行则不然
claim: temperature 为 0 时，Qwen3 4B 的三次运行在全部 30 个任务上结果相同；temperature 为 0.7 时，有五个任务的结果在 seed 之间发生变化。
caption: 每列是子集中的一个任务，每行是一次运行。实心方块表示通过，玫红色方块表示失败。琥珀色标记是结果在 seed 之间发生变化的任务。数据来自 capture/lab/bench/summary-mac.json。
```

所以贪心结果只是这个模型的一个样本。任务是固定的，每个只运行一次，因此单元格的区间是对这个套件上某个比率的 Wilson 区间。它不度量重复运行之间的离散程度，只适用于这个套件。换一个 seed 或 temperature 会改变个别任务，而不会改变比率：贪心是 23 个，采样是 23 到 24 个。

## 区间 {#s-ref-the-bench-method-intervals}

测试基准各节里的每个比率都带有 95% 的 Wilson 区间。区间的宽度取决于任务数：

| 任务数 | 通过一半 | 通过 80% | 全部通过 |
|---|---|---|---|
| 10 | 0.24 to 0.76 | 0.49 to 0.94 | 0.72 to 1.00 |
| 30 | 0.33 to 0.67 | 0.63 to 0.90 | 0.89 to 1.00 |
| 39 | 0.34 to 0.64 | 0.64 to 0.89 | 0.91 to 1.00 |
| 99 | 0.40 to 0.59 | 0.71 to 0.87 | 0.96 to 1.00 |

同样任务上的两个单元格是配对的，所以测试基准还会统计两者结果一致的任务数。这个计数比并排的两个区间更精确。

## 耗时 {#s-ref-the-bench-method-time}

工具包给每次模型调用计时，范围从开始回调到结束回调；给每个工具计时，范围在它的包装器内部。框架耗时等于墙钟时间减去这两项。它也包含工具包自己的调用计量，这在每种 harness 里都是一样的。

这台 Mac 同时在做其他工作。请把每个耗时都当作上限，并且只在同一张表之内比较耗时。

## 成本 {#s-ref-the-bench-method-cost}

工具包为每次 Claude 调用写一行账本记录，内容是 API 返回的用量和 2026-11-14 的标价。账本达到上限时，它会在调用之前停止。整个测试基准用了 2,589 次调用和 $0.93。下面较晚的运行单独计算。

账本在每次调用上记录的缓存写入 token 都是 0，并把这些 token 按基础输入价格计价。如果 API 对缓存写入按 1.25 倍计费，我们的美元数就偏低。对朴素循环单元格，偏低的上限是 12.7%。对 deep agent 单元格约为 6%：Haiku 是 4.6%，Sonnet 是 6.4%，两者合计是 6.1%。这样一来 deep agent 的比值只会更低，不会更高。

## 第二个测试基准与多 agent 运行 {#s-ref-the-bench-method-the-second-bench-and-the-multi-agent-runs}

较晚的两组运行沿用第一个测试基准的工具包和任务数据，只改变了 harness。

| 目录 | 运行内容 | 文件 |
|---|---|---|
| `bench2/` | harness profile A 和 B、带与不带提示词（要求使用它）的 `eval` 工具，以及配 Qwen3 14B 打分器的 `RubricMiddleware` | `kit2/run2.py` 负责运行，`kit2/summarize2.py` 写出 `summary-bench2.json`，`kit2/docs_table.py` 把文档里的表读入 `docs-eval-table.json` |
| `multiagent/` | 在 Haiku 和 Qwen3 14B 上运行五种模式，并在 Haiku 上对比 Claude Agent SDK 与 deep agent | `kit/run_patterns.py` 和 `kit/run_sdk.py` 负责运行，`kit/summarize_patterns.py` 写出 `capture/lab/summary/multiagent-mac.json` |

`bench2/` 的本地行是在我们专门为它们启动的第二个 Ollama 0.31.1 服务器上运行的，它有自己的模型缓存。它第一次启动时用了量化的键值缓存和 flash attention。有八个对照行来自那次启动，Qwen3 4B 四个，Qwen3 8B 四个。我们用第一个测试基准的默认设置重启了服务器，并把这八行放在 `bench2/runs/excluded/` 里。重启之后，三个对照任务给出了与第一个测试基准相同的工具调用和提示词 token。

本地模型的 profile 行和评估行都来自重启之后。汇总从第一个测试基准里读取朴素循环和默认 deep agent 的行。Qwen3 14B 和 gpt-oss 20B 的 deep agent 单元格把 12 次旧运行和 27 次新运行（设置相同）合在一起。

[图](#fig-r-11b)展示了第二个测试基准的每个单元格及其区间。

```figure
id: fig-r-11b
kind: chart
title: 第二个测试基准每个单元格的通过率及其区间
claim: 99 个任务的单元格给出 18 到 19 个百分点的区间，30 个任务的单元格给出最多 34 个百分点的区间。
caption: 每行是一个单元格。圆点是通过率，须线是 95% 的 Wilson 区间。玫红色的数字标出任务数少于 30 的单元格。数据来自 capture/lab/bench2/summary-bench2.json。
```

`bench2/` 里的 Haiku 运行了 370 次调用，花了 $0.0695，记录在 `bench2/runs/cost-ledger.jsonl` 里。Haiku 的多 agent 运行是 1,518 行账本记录，花了 $0.150，记录在 `multiagent/runs/cost-ledger.jsonl` 里。

我们还在 Qwen3 4B 上启动了 `deepagents` 的评估。
它在 14 个测试后被我们停止，9 个通过、5 个失败，也没有写出报告，所以手册没有使用其中任何内容。

Qwen3 8B 的 nudged 运行在开始时就失败了。gpt-oss 20B 的多 agent 运行从未启动过任何任务。两组运行里的 Qwen3 14B 单元格都与其他作业共用这台 Mac。它们的耗时只是上限，每个单元格里每个任务只有一次运行。

## 不要使用的行 {#s-ref-the-bench-method-rows-not-to-use}

| 行 | 原因 |
|---|---|
| 每个运行器里的 `sql19` | 标准答案只是并列的两个类别之一 |
| `runs/excluded/anthropic-smoke-attempt1-400.jsonl` | 第一次 Claude 冒烟运行，它发送了 temperature，得到 400 错误 |
| `runs/excluded/main-30b-a3b-think-off-leaks.jsonl` | 关闭思考的 Qwen3 30B-A3B，它把推理写进了回复，并触到输出上限 |
| `runs/excluded/main-files-before-sandbox-fix.jsonl` | 工具包修复任务文件夹路径解析方式之前的文件任务 |
| `bench2/runs/excluded/kvq8-profiles.jsonl`, `bench2/runs/excluded/kvq8-rubric.jsonl` | 来自第二个服务器第一次启动的对照行，它们没能复现第一个测试基准 |
| `bench2/runs/smoke.jsonl`, `bench2/runs/verify.jsonl` | 汇总不读取的冒烟与检查运行 |
| `runs/excluded/structured-dev.jsonl`, `runs/excluded/toolscale-dev.jsonl` | 用于测试运行器的运行所产生的行 |
| Claude 的结构化输出行 | 有效，但运行器没有加提示词缓存，所以它们的美元数是标价 |
| 把严格通过当作质量指标 | 它统计 `submit_answer` 的使用，而小模型经常把答案直接写在文本里 |

主文件保留其他所有行。`summarize.py` 在读取行时去掉 `sql19`，`summarize.py --check` 会重新生成汇总并与现有的比较。

来源：capture/lab/bench/summary-mac.json, capture/lab/bench2/summary-bench2.json, capture/lab/bench2/kit2, capture/lab/bench2/runs, capture/lab/bench2/logs, capture/lab/summary/multiagent-mac.json, capture/lab/multiagent, capture/lab/bench/summarize.py, capture/lab/bench/summary-with-sql19.md, capture/lab/bench/runs/main.jsonl, capture/lab/bench/runs/sampling.jsonl, capture/lab/bench/runs/structured.jsonl, capture/lab/bench/runs/toolscale.jsonl, capture/lab/bench/runs/models.jsonl, capture/lab/bench/runs/cost-ledger.jsonl, capture/lab/bench/runs/excluded, capture/lab/bench/data/tasks.jsonl, capture/lab/bench/data/subset30.txt, capture/lab/bench/data/anthropic-prices.json, capture/lab/bench/data/shop.db, capture/lab/bench/kit.
