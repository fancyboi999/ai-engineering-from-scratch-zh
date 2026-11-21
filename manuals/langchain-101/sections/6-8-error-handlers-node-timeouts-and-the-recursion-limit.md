# 错误处理器、节点超时与递归上限

> 节点失败的一次尝试先交给它的 `RetryPolicy`，再交给它的 `error_handler`，超时算作一次失败，递归上限则让永不结束的运行停下来。

一个节点调用的服务失败了，你希望图先重试，再转去生成报告。另一个节点在等一个永远不回应的服务。第三个循环始终碰不到它的停止条件。LangGraph 为这三种情况各有一个设置，它们按固定顺序起作用。

读完本节，你能给节点配置重试策略、错误处理器和超时。你还能预测它的尝试次数，并设置合适的递归上限。

## 先 RetryPolicy，再错误处理器 {#s-error-handlers-node-timeouts-and-the-recursion-limit-retrypolicy-then-the-error-handler}

**RetryPolicy：** 让失败的节点重新运行的设置，包括 `max_attempts`、两次尝试之间的等待时间，以及决定重试哪些异常的 `retry_on`。

**错误处理器（error handler）：** 在节点最后一次尝试失败之后运行的函数。它接收状态和一个 `NodeError`，返回一个更新或一个 `Command`。

录制工具包里的节点 `flaky` 每次尝试都抛出 `ValueError`。它的策略是 3 次尝试、重试 `ValueError`，并带有一个转去 `report` 的处理器：

```listing
title: 带重试策略和错误处理器的节点
source: capture/s_graph.py
lang: python
---
    def handler(state, error: NodeError):
        return Command(update={"status": f"recovered from {error.node}: {error.error}"}, goto="report")

    g = StateGraph(S)
    g.add_node("flaky", flaky, retry_policy=RetryPolicy(max_attempts=3, initial_interval=0.0, jitter=False, retry_on=ValueError), error_handler=handler)
```

`compile` 会为处理器添加一个名为 `__error_handler__flaky` 的节点。运行尝试了三次，随后处理器运行，图结束：

```listing
title: 三次尝试，然后是处理器
source: capture/out/37-error-handler-timeout.txt
lang: json
---
{
  "status": "recovered from flaky: upstream failed on try 3",
  "attempts": 3
}

tries:
[
  1,
  2,
  3
]
```

`max_attempts` 把第一次尝试也算在内。容错页面写明了顺序：先由重试策略决定，只有没有剩余尝试时处理器才运行 {{docs oss/python/langgraph/fault-tolerance}}。`StateGraph` 上的 `set_node_defaults(error_handler=...)` 会给每个节点配同一个处理器。在录制工具包里，一个抛出 `KeyError` 的节点转到了它，运行以 `default handler: KeyError in boom` 结束。

## 默认的 retry_on 不会重试 ValueError {#s-error-handlers-node-timeouts-and-the-recursion-limit-the-default-retry-on-does-not-retry-valueerror}

不带参数的 `RetryPolicy()` 尝试 3 次，第二次之前等待 0.5 秒，每次等待翻倍，上限 128 秒，并加入抖动 {{code libs/langgraph/langgraph/types.py}}。它的 `retry_on` 是 `default_retry_on`。这个函数会重试 `ConnectionError`，以及来自 `httpx` 和 `requests` 的 500 到 599 的 HTTP 状态错误。没有响应的 `requests.HTTPError` 也会重试。它不会重试 `ValueError`、`TypeError`、`ArithmeticError`、`ImportError`、`LookupError`、`NameError`、`SyntaxError`、`RuntimeError`、`ReferenceError`、`StopIteration`、`StopAsyncIteration`，也不会重试其他 `OSError`。其余所有异常都会重试 {{code libs/langgraph/langgraph/_internal/_retry.py}}。

录制工具包给 `flaky` 配了 2 次尝试的策略，`retry_on` 用默认值。节点只运行了一次，随后运行抛出了异常：

```listing
title: 默认 retry_on 下的 ValueError
source: capture/out/37-error-handler-timeout.txt
lang: text
---
raised builtins.ValueError: upstream failed on try 1

tries:
[
  1
]
```

所以你为不稳定服务添加的策略，对解析错误不起作用，这往往正是你想要的。`KeyError` 是 `LookupError`，所以它同样不会重试。想让哪些异常重试，就在 `retry_on` 里写出它们的类型。

重试会把整个节点再运行一遍。容错页面说，失败那次尝试的写入会被丢弃，而节点内部的副作用不会被丢弃 {{docs oss/python/langgraph/fault-tolerance}}。给每个副作用附上一个幂等键。第 1.1 节展示了这样的键在崩溃实验里起了什么作用。

## 节点超时 {#s-error-handlers-node-timeouts-and-the-recursion-limit-node-timeouts}

**节点超时：** `add_node` 的 `timeout`，单位是秒，作用于异步节点的每一次尝试。一次尝试运行得更久，就会以 `NodeTimeoutError` 失败。

录制工具包里的节点 `slow` 睡眠 2 秒，超时设为 0.05 秒。`ainvoke` 抛出了：

```listing
title: 超出超时时间的异步节点
source: capture/out/37-error-handler-timeout.txt
lang: text
---
raised langgraph.errors.NodeTimeoutError: Node 'slow' exceeded its run timeout of 0.050s (elapsed: <seconds>).
```

超时算作一次失败的尝试，所以重试策略，然后是错误处理器，都会看到它。配上处理器之后，同一个节点在 `status` 里得到的状态是 `NodeTimeoutError: Node 'slow' exceeded its run timeout of 0.050s (elapsed: <seconds>).`，运行随之继续。[图](#fig-6-8)画出了一次失败的路径。

```figure
id: fig-6-8
kind: decision
title: 节点失败尝试的路径
claim: 每次失败的尝试，包括超时，都先交给 retry_on，只有最后一次尝试之后错误处理器才运行，否则运行会抛出异常。
caption: 请从顶部那次失败的尝试开始读。每个灰色方框是一项检查，它的箭头旁是录制工具包的结果。玫红色方框是离开 invoke 的错误。来源：capture/out/37-error-handler-timeout.txt。
```

超时只适用于异步节点。代码会拒绝给同步节点设置超时，因为同步的 Python 函数无法从外部停止 {{code libs/langgraph/langgraph/_internal/_timeout.py}}。录制工具包还没有记录这个拒绝。它的录制留到下一版，与[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)里的其他未决项放在一起。

## 递归上限 {#s-error-handlers-node-timeouts-and-the-recursion-limit-the-recursion-limit}

**递归上限（recursion limit）：** 运行在这么多步之后会抛出 `GraphRecursionError`。Pregel 循环的每一步只算一次，不管这一步里运行了多少个节点。

在 config 里设置 `recursion_limit=5` 的循环，在五步之后抛出了异常：

```listing
title: 超出递归上限的循环
source: capture/out/38-recursion-limit.txt
lang: text
---
raised langgraph.errors.GraphRecursionError: Recursion limit of 5 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.
For troubleshooting, visit: https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT
```

默认上限在不同位置有三个数字，很容易混淆：

| 位置 | 默认值 | 由什么设置 |
|---|---|---|
| 已编译的 `StateGraph` | 10007 | `langgraph` 里的 `DEFAULT_RECURSION_LIMIT`，或环境变量 `LANGGRAPH_DEFAULT_RECURSION_LIMIT` |
| `create_agent` 生成的图 | 9999 | `create_agent` 绑定到它的图上的 config |
| `langchain-core` runnable 的 config | 25 | `langchain_core` 里的 `DEFAULT_RECURSION_LIMIT` |

图 API 页面给出的值从 `langgraph` 1.1.4 起是 10,007，在 1.0.6 到 1.1.3 之间是 10,000 {{docs oss/python/langgraph/graph-api}}。较早的建议把 25 当作图的默认值。在锁定版本上，25 是 `langchain_core` runnable config 的默认值，图并不使用它 {{code libs/core/langchain_core/runnables/config.py}}。要把 `recursion_limit` 传在 config 的顶层，而不是 `configurable` 之下 {{docs oss/python/langgraph/graph-api}}。本手册把这些不同的数字登记为冲突 D105，[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)展示了 Agent Server 的上限。

**我们测得** Mac 上朴素循环的每个默认值，每个用例运行一次，不用模型。朴素循环在 10007 步停下。把环境变量设成 25，或者用 `recursion_limit=25`，它在 25 步停下。

agent 在 x86 服务器客户机上用 Qwen3 4B 运行，被要求一直调用某个工具，直到工具回答“finished”，而工具从不这样回答。在 `recursion_limit=25` 下，agent 发起了 13 次模型调用（Qwen3 4B，x86 服务器客户机，3 次中的 3 次）。在 `recursion_limit` 为 101 时发起了 51 次。没有上限时，实验脚本在 1200 秒、121 次模型调用之后把它停掉。[图](#fig-6-8b)展示了每次运行。

```figure
id: fig-6-8b
kind: chart
title: GraphRecursionError 之前的步数
claim: 普通图在 10007 步停下，而 agent 的每一步是一次模型调用或一次工具调用，所以 25 步允许 13 次模型调用。
caption: 每个用例一个点，用对数刻度。图的运行来自 Mac，agent 的运行来自 x86 服务器客户机上的 Qwen3 4B。标签写出用例和它的模型调用次数。来源：capture/lab/summary/recursion-mac.json 和 capture/lab/summary/recursion-x86.json。
```

所以 agent 的每一轮是两步，一步在 `model`，一步在 `tools`。同一轮模型输出里的并行工具调用，作为同一个 `tools` 步骤里的任务运行 {{code libs/langchain_v1/langchain/agents/factory.py}}。需要 `n` 轮连续工具调用外加一次回答的 agent，至少需要 `2n + 1` 步。

## RemainingSteps {#s-error-handlers-node-timeouts-and-the-recursion-limit-remainingsteps}

**RemainingSteps：** 一个托管值，你把它声明为状态的一个键。LangGraph 用上限之前剩余的步数填充它，节点或边都可以读取它。

录制工具包里的循环在 `remaining_steps` 小于等于 2 时路由到 `END`。在 `recursion_limit=5` 下，运行自行停止，`n` 为 3，没有抛出任何异常。用它可以让长时间运行带着部分答案结束，而不是抛出异常。

```takeaways
- 在 retry_on 里写出异常类型，因为默认值会跳过 ValueError 和 RuntimeError。
- 添加一个 error_handler，把流程路由到报告失败的节点。
- 给慢的异步节点设置超时，并让重试策略把它当作一次失败。
- 每次运行都在 config 的顶层设置 recursion_limit。
- 对 n 轮连续的工具调用，至少允许 2n 加 1 步。
- 在循环里读取 RemainingSteps，在上限抛出异常之前停下。
```

来源：capture/s_graph.py, capture/out/37-error-handler-timeout.txt, capture/out/38-recursion-limit.txt; capture/lab/summary/recursion-mac.json, capture/lab/T17-claims-mac/01-recursion-limit.jsonl, capture/lab/summary/recursion-x86.json, capture/lab/T17-claims-x86/01-claims.jsonl, capture/lab/T17-claims-x86/02-nolimit.jsonl; libs/langgraph/langgraph/types.py, libs/langgraph/langgraph/_internal/_retry.py, libs/langgraph/langgraph/_internal/_timeout.py, libs/langgraph/langgraph/_internal/_config.py, and libs/langgraph/langgraph/graph/state.py at langgraph 1.2.22; libs/core/langchain_core/runnables/config.py and libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/fault-tolerance, oss/python/langgraph/graph-api).
