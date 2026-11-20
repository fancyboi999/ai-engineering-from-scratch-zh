# ToolRetryMiddleware、ModelFallbackMiddleware 与关闭流程

> 给每个工具设置时间限制，只重试可以安全重复调用的工具，并预期由模型决定客户会听到什么故障说明。

帮助中心搜索偶尔出现一次连接错误。订单查询卡住不动。工单系统返回错误，你无法判断它有没有写入一行记录。主模型提供方宕机。每种情况需要不同的应对，而你在 `create_agent` 的中间件栈里选择应对方式。

读完本节，你能排好中间件的顺序，让每次工具尝试都有自己的时间限制。你还能选出要重试的工具、加上备用模型，并在关闭 worker 时不丢失任何一次运行。

## 中间件栈：由外向内 {#s-timeouts-retries-backup-model-and-shutdown-the-stack-from-the-outside-in}

```listing
title: 服务的中间件栈
source: capture/lab/prodapp-mac/code/app/agent.py
lang: python
---
        middleware=[
            SummarizationMiddleware(model, trigger=("messages", settings.summarize_after), keep=("messages", 6)),
            ModelCallLimitMiddleware(run_limit=settings.model_calls_per_run, exit_behavior="end"),
            ModelFallbackMiddleware(backup),
            HumanInTheLoopMiddleware(
                {"refund_order": {"allowed_decisions": ["approve", "reject"], "description": refund_description}},
                interrupt_mode="per_call",
            ),
            ToolErrorMiddleware(tool_error_message),
            ToolRetryMiddleware(tools=IDEMPOTENT, max_retries=2, initial_delay=0.1, on_failure="error"),
            Tracing(),
            ToolTimeout(settings.tool_timeout, {"refund_order": settings.refund_timeout}),
            *extra,
        ],
```

列表中的第一个中间件包住其余所有中间件。对一次工具调用来说，由外向内的顺序是审批、错误文本、重试、span、超时，最后是工具本身。这个顺序带来三个结果。

- 每次尝试都有自己的时间限制，因为超时在重试之内。
- 每次尝试都有自己的 span，因为 span 也在重试之内。
- 最后一次尝试之后，模型只看到一条错误消息，因为 `ToolErrorMiddleware` 在重试之外。

`ToolTimeout` 是我们自己写的，只有四行 `asyncio.wait_for`。在 LangChain 1.5.0 中，只有 shell 和文件搜索中间件设置了时间限制，普通的工具调用没有。`refund_order` 的限制是 15 秒，其他工具是 5 秒。测试里设为 0.5 秒。

超时只是取消对工具的等待，并不撤销它已经产生的效果。退款工具可能在限制触发之前就已提交了记录。涉及资金的工具超时之后，先读取订单，再告诉客户有没有发生任何事。

**幂等工具（idempotent tool）：** 用相同参数调用两次，得到相同结果、产生相同副作用的工具。重试列表里只有 `read_order`、`search_faq` 和 `recall_notes`。`create_ticket` 和 `save_note` 每次调用都会用新 id 写一行记录，所以在回复丢失后重试会写入两行。`refund_order` 有自己的键，见[第 9.3 节](#s-approvals-and-the-idempotency-key)。

错误文本告诉模型如何处理这次失败。

```listing
title: 工具失败后模型读到的文本
source: capture/lab/prodapp-mac/code/app/middleware.py
lang: python
---
def tool_error_message(exc, request):
    event("tool.error", tool=request.tool_call["name"], error=type(exc).__name__)
    if isinstance(exc, TimeoutError):
        return f"{request.tool_call['name']} timed out. Tell the customer and do not guess."
    return f"{request.tool_call['name']} failed with {type(exc).__name__}. Tell the customer and do not guess."
```

## 三个模型上的五种故障 {#s-timeouts-retries-backup-model-and-shutdown-five-faults-on-three-models}

评估套件用一个测试中间件注入每种故障，它位于超时之内，也就是工具原本所在的位置。**我们测得**在 Mac 上，套件第一次运行时每个模型各遇到每种故障一次。服务在每个模型上的行为相同。模型的差别在于它们是否调用了工具，以及对客户说了什么。

| 故障 | 服务的行为（取自 span） | Qwen3 4B | Qwen3 14B | Claude Haiku 5.5 |
|---|---|---|---|---|
| `search_faq` 失败一次 | 2 次尝试，第一次是错误 span | 没有调用 `search_faq` | 2 次尝试，然后给出正确答案 | 2 次尝试，然后给出正确答案 |
| `read_order` 卡住 | 3 次尝试，每次都在约 0.50 秒被切断 | 3 次尝试，然后告诉客户找不到订单 | 3 次尝试，然后说现在无法查询订单 | 3 次尝试，然后说订单系统超时 |
| `create_ticket` 失败 | 1 次尝试，不重试，工单表 0 行 | 说无法创建工单 | 说无法创建工单 | 说无法创建工单 |
| 主模型宕机 | 每次主模型调用都是错误 span，随后由备用模型作答 | 备用 Qwen3 8B，2 次调用 | 备用 Qwen3 4B，2 次调用 | 备用 Qwen3 4B，2 次调用 |
| 模型一直请求 `search_faq` | 在 8 次模型调用和 8 次工具调用后停止 | 运行耗时 29.61 秒 | 运行耗时 151.34 秒 | 运行耗时 20.89 秒 |

[图](#fig-9-5)把同样的运行排成一张决策表。

```figure
id: fig-9-5
kind: decision
title: 五种故障、中间件的处理，以及各模型的回复
claim: 中间件在每个模型上对每种故障的处理方式相同，只有给客户的回复不同。
caption: 每行从左向右读：故障、取自 span 的尝试次数，以及各模型的回复。玫瑰色的回复误导了客户或跳过了工具。数据来自 capture/lab/prodapp-mac/summary/faults-mac.json。
```

最值得记住的是 Qwen3 4B 上订单查询卡住的那一行。工具消息写的是 `read_order timed out. Tell the customer and do not guess.`，模型却对客户说 `I couldn't find your order. Please check the order ID and try again`。这个回复是错的，还让客户去修改本来正确的订单号。任何中间件都拦不住它。请在评估里检查超时后的回复，并选一个通过该检查的模型。

## 备用模型 {#s-timeouts-retries-backup-model-and-shutdown-the-backup-model}

`ModelFallbackMiddleware` 在调用抛出异常时尝试下一个模型。**我们测得**在 Mac 上模拟主模型宕机：每次主模型调用都抛出 `ConnectionError` 并留下一个错误 span，随后由备用模型完成调用。这一轮的每次模型调用都先试主模型，所以主模型被尝试并失败了两次。没有任何东西记住主模型已经宕机。要在一段时间内跳过出故障的提供方，需要自己加一个熔断器。

备用模型也可以放在另一个提供方上。在 Claude Haiku 5.5 的运行中，备用模型是 Mac 上的 Qwen3 4B。

同一次 Haiku 运行里出现了一个我们没有注入的故障。备用模型加载期间，一次 `read_order` 尝试耗时 0.70 秒，触到了测试的 0.5 秒限制。重试在 0.06 秒内返回，客户拿到了订单状态。可见，对幂等工具的重试也能兜住机器偶尔的变慢。

## 不会结束的循环 {#s-timeouts-retries-backup-model-and-shutdown-a-loop-that-does-not-end}

`ModelCallLimitMiddleware` 设为 `run_limit=8` 和 `exit_behavior="end"`，在每个模型上都于第 8 次模型调用后终止了失控的运行。运行以状态 `done` 和一条最终的 AI 消息结束，所以客户端看到的是正常结束。这个限制统计的是一次运行中的模型调用数，请按评估里最长的正常任务来设定。

## 关闭流程 {#s-timeouts-retries-backup-model-and-shutdown-shutdown}

Uvicorn 收到 SIGTERM 后会等待打开的连接，最长等到 `--timeout-graceful-shutdown`。随后 FastAPI 的 lifespan 退出，服务对每个运行任务最多等待 `DRAIN_SECONDS`，其余的取消。被取消的运行会保留 `durability="sync"` 已经写入的检查点。

**我们测得**在 Mac 上用 Qwen3 14B 测了两种情况，每种五次试验。每次试验先问一个 FAQ 问题，在运行期间向 worker 发送 SIGTERM，再由新的 worker 读取线程。

| 情况 | 设置 | 客户端 | 重启后的线程 |
|---|---|---|---|
| 跑完 | 0.3 秒时发送 SIGTERM，uvicorn 20 秒，drain 20 秒 | 5 次中有 4 次在 8.28 到 9.16 秒收到 `done` | 5 次全部已作答 |
| 取消 | 0.3 秒时发送 SIGTERM，uvicorn 1 秒，drain 0.05 秒 | 5 次全部以错误关闭了流 | 5 次全部是 `next` 为 `["model"]`，且只有用户消息 |

在第一次“跑完”试验中，第一次模型调用耗时 14.96 秒，因为 Qwen3 14B 是在 4B 的试验之后才加载的。到 20 秒时，uvicorn 记录了 `Cancel 1 running task(s), timeout graceful shutdown exceeded` 并关闭了流。运行任务继续执行，并在 drain 期间的 21.58 秒完成。线程里有了答案，而客户端始终没有收到 `done`。套件在 10 秒限制下也出现过两次同样的情况。

这些试验期间 Mac 处于高负载，平均负载在 15.6 到 28.7 之间，所以请把秒数当作上限来读。结论取决于次数。

每次取消之后，新的 worker 用 `/approve` 且不带决定来恢复线程。5 次试验里运行都在 7.27 到 9.10 秒内完成，并依据 FAQ 作答。

所以当 uvicorn 的计时短于 drain 的计时时，运行会比它的流活得更久。请把 uvicorn 的优雅关闭超时设得比最长的运行更长，并告诉客户端：流中断后要去读线程状态。

```takeaways
- 把超时放在重试之内，让每次尝试都有自己的限制和自己的 span。
- 只重试调用两次也安全的工具，并给会写入的工具加幂等键。
- 在错误文本里告诉模型该说什么，并测试它实际说了什么。
- 加上备用模型；如果宕机的主模型拖慢了你，再加一个熔断器。
- 按最长的正常任务来设定模型调用上限。
- 收到 SIGTERM 时给运行留出完成的时间，并从检查点恢复被取消的运行。
```

来源：capture/lab/prodapp-mac/code/app/agent.py, capture/lab/prodapp-mac/code/app/middleware.py, capture/lab/prodapp-mac/code/app/tools.py, capture/lab/prodapp-mac/code/app/server.py, capture/lab/prodapp-mac/code/tests/conftest.py, capture/lab/prodapp-mac/code/tests/test_evals.py, capture/lab/prodapp-mac/code/scripts/drain_real.py, capture/lab/prodapp-mac/summary/faults-mac.json, capture/lab/prodapp-mac/summary/drain-mac.json, capture/lab/prodapp-mac/runs/drain/drain-trials.json, capture/lab/prodapp-mac/runs/drain/finish-01.server.log, capture/lab/prodapp-mac/runs/drain/finish-01.log.jsonl, capture/lab/prodapp-mac/runs/suite/qwen3-4b/rep-1/cases/14-hung_tool_times_out.json；libs/langchain_v1/langchain/agents/middleware/tool_retry.py、model_fallback.py、model_call_limit.py 和 tool_error.py（langchain==1.5.0）。
