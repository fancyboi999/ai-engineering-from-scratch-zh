# CI 中的评估：工具调用、数据行与状态

> 对工具调用、数据库行和线程状态做断言，并在每个要部署的模型上运行套件，因为三个真实模型在同一套件里失败的案例各不相同。

你的 20 个对话测试在脚本化模型上全部通过。把服务指向真实模型后，其中有 7 个失败。有些失败是模型的问题，有些是测试的问题：测试已经迎合了脚本化模型的习惯。

读完本节，你能写出检查状态而不是措辞的评估。你还能分清模型失败和测试失败，并决定哪些案例会阻止部署。

## 一项评估检查什么 {#s-evals-that-check-state-what-one-eval-checks}

**评估（eval）：** 对运行中的服务发起一段脚本化对话，然后对服务的所作所为做断言。被测服务是带 Postgres 的真实 FastAPI 应用。每次运行只有模型不同。

```listing
title: 一项评估：退款被提出、被挂起、只写入一次
source: capture/lab/prodapp-mac/code/tests/test_evals.py
lang: python
---
@case
async def refund_approved_once(c, t, x):
    order = f"ORD-{c.user}-1"
    events = await c.say(t, f"Please refund {order}")
    [pending] = interrupts(events)
    assert (pending["name"], pending["args"]["order_id"], pending["args"]["amount_cents"]) == ("refund_order", order, 12900)
    assert await refunds(x.sql, order) == []
    await c.approve(t)
    assert await refunds(x.sql, order) == [{"amount_cents": 12900}]
    assert finished(await c.state(t))
```

每个断言读取的都是模型无法换种说法的东西。第一个读取流发出的中断，包括工具名及其参数。第二个和第三个读取审批前后的 `refunds` 表。最后一个读取线程状态：没有下一个节点，没有待处理的中断，最后一条 AI 消息不含工具调用。

其他案例遵循同一条规则。FAQ 案例检查 `search_faq` 是否运行过，以及结果里是否包含正确的条目 id。故障案例读取这次运行的 OpenTelemetry span，见[第 9.4 节](#s-opentelemetry-spans-with-langsmith-off)。有两项检查读取文本，且都是不得出现的字面字符串：另一位客户的商品名，以及另一位用户的门禁码。

## 一个套件，三个模型 {#s-evals-that-check-state-one-suite-three-models}

**我们测得**在 Mac 上运行服务的 27 个测试：通过 Ollama 用 Qwen3 4B 跑 3 次，用 Qwen3 14B 跑 3 次，都使用 temperature 0 和 seed 42。Claude Haiku 5.5 把 20 项评估跑了一次。另外 7 个测试要启动服务器并发出大量请求，而我们的 Anthropic 调用预算只够跑评估。4B 运行的备用模型是 Qwen3 8B，其余运行的是 Qwen3 4B。

| 模型 | 运行次数 | 每次运行的测试数 | 每次运行通过的数量 |
|---|---|---|---|
| Qwen3 4B | 3 | 27 | 16, 16, 16 |
| Qwen3 14B | 3 | 27 | 22, 21, 21 |
| Claude Haiku 5.5 | 1 | 20 | 20 |

[图](#fig-9-6)把每次运行的每个测试放进同一张网格。

```figure
id: fig-9-6
kind: chart
title: 同样的 27 个测试在三个真实模型上的结果
claim: Qwen3 4B 和 Qwen3 14B 在同一套件里失败的案例不同，而 Claude Haiku 5.5 通过了全部 20 项评估。
caption: 每行是一个测试，每列是套件的一次运行。梅红色格子表示通过。玫瑰色格子表示失败，其中的字母对应图例里的原因。点状格子表示没有运行。数据来自 capture/lab/prodapp-mac/summary/evals-mac.json。
```

## 每个案例为什么失败 {#s-evals-that-check-state-why-each-case-failed}

我们读了每个失败案例的流事件、线程状态和数据库行。每个失败都只有一个原因，这些原因分成两类。

| 原因 | 类别 | Qwen3 4B | Qwen3 14B | Claude Haiku 5.5 |
|---|---|---|---|---|
| 反问金额和原因，没有提出退款 | 模型 | 3 个案例 | 无 | 无 |
| 没有读取订单就编造了 `amount_cents` 10000 | 模型 | 无 | 3 个案例 | 无 |
| 提出 `amount_cents` 0，审批人批准了它 | 模型 | 1 个案例 | 1 个案例 | 无 |
| 开了工单而不是退款 | 模型 | 1 个案例 | 无 | 无 |
| 没有调用 `save_note` | 模型 | 2 个案例 | 无 | 无 |
| 没有调用 `search_faq` 就作答 | 模型 | 1 个案例 | 无 | 无 |
| 在没有提出退款之后仍发送了批准 | 测试 | 2 个案例 | 无 | 未运行 |
| 时间限制以脚本化模型为前提 | 测试 | 1 个案例 | 1 个案例 | 无 |
| uvicorn 在 10 秒时关闭了流，而运行在 drain 期间才完成 | 测试 | 无 | 3 次运行中有 2 次出现，1 个案例 | 未运行 |

同一个模型的失败原因在多次运行之间没有变化。Qwen3 4B 在 3 次运行中每次都失败了同样的 11 个测试。Qwen3 14B 在 3 次运行中每次都失败了同样的 4 项评估和崩溃测试。

模型失败正是这个套件要找出来的结果。Qwen3 4B 在客户给出金额和原因之前不肯调用 `refund_order`。Qwen3 14B 立刻调用了它，金额却是自己编的。订单金额为 8900 分时，`refund_order` 拒绝了 10000 分，所以没有资金移动。如果订单是 12900 分，同样的猜测就会退错金额。

在 5 个退款案例中，Claude Haiku 5.5 每次都先读取订单，再提出退款。其中 3 次在同一轮里读取，2 次是在线程较早的一轮读取。每次它提出的都是订单总额。

零金额退款是最该记住的案例。两个 Qwen 模型对 `Refund ORD-e19-3` 都提出了 `amount_cents` 0。测试像一个粗心的人那样批准了它，工具写入了一行 0 分的退款。记录和两项修复见[第 9.3 节](#s-approvals-and-the-idempotency-key)。加上修复后，6 次重跑中 0 分行全部消失，但退款评估的通过率并没有比以前更高。

状态检查有一个盲区，Claude Haiku 5.5 找到了它。批准的退款写入之后，它对客户说 `It's pending human approval, so it isn't final yet.`。数据行存在，测试通过了，但回复是错的。请人工抽读一部分回复，或者为你在意的说法增加检查。

## 迎合脚本化模型的测试 {#s-evals-that-check-state-tests-that-knew-the-scripted-model}

有三个失败出在测试里。崩溃测试和 LangSmith 测试先请求退款，然后不加检查就发送了批准。当模型没有提出退款时，`/approve` 返回 409 和一个 JSON 响应体，而辅助函数把这个响应体当作 SSE 解析。测试以 `ValueError` 失败，这个错误与服务本身无关。

第三个测试在运行开始 3.5 秒后发送 SIGTERM，并预期运行仍在进行。脚本化模型每次调用都会睡眠 3 秒，而 Qwen3 4B 只用 1.45 秒就跑完了整个运行。`hung_tool_times_out` 案例在 Qwen3 14B 上有同样的缺陷：它把整段对话限制在 5 秒内，而运行耗时 11.04 秒，工具超时本身其实是正常工作的。

这些测试还会泄漏资源。每个测试都启动 uvicorn worker，却只在成功路径上停止它们。六次 Qwen 运行之后，失败测试留下的 12 个 worker 仍在运行。加上负载测试的 worker，`lc_prod` 有 77 个连接，停掉那 12 个后还剩 17 个。请在 `finally` 块或 fixture 里停止测试服务器。

所以把套件分成两部分：

- **服务测试**检查服务做出的承诺：锁、所有者检查、崩溃恢复、关闭流程，以及 LangSmith 保持关闭。用不给模型留选择余地的请求来驱动它们，例如明确给出金额和原因。要求每次运行都通过。[第 9.3 节](#s-approvals-and-the-idempotency-key)和[第 9.5 节](#s-timeouts-retries-backup-model-and-shutdown)就是这样运行它们的。
- **模型评估**检查模型面对普通请求时的表现。把每项评估在每个要部署的模型上都运行一遍，并按案例跟踪通过率。

## 在本地模型上重复运行 {#s-evals-that-check-state-repeats-on-a-local-model}

固定 seed 的贪婪解码会重复自己。Qwen3 4B 的三次运行通过了同样的 16 个测试。第一次和第二次运行之间，20 份评估记录中有 18 份逐字相同。不同的两份是最长的对话，即失控循环和六轮线程，而它们的工具调用是一致的。所以对贪婪的本地模型重复三次，测的是服务而不是模型。想看到分布，就改变 seed 或 temperature。

## CI 作业 {#s-evals-that-check-state-the-ci-job}

应用代码里的 `deploy/ci.yml` 是一个工作流，每次 push 时借助 Postgres 服务容器运行套件。它没有安装在本仓库的 `.github/workflows` 下。按现在的写法它使用脚本化模型，我们没有在 GitHub Actions 上运行过它。要在真实模型上运行，请设置 `MODEL`，并给作业提供密钥或一个 Ollama 服务。把两部分分开：服务测试每次 push 都跑，模型评估按计划运行，并为每个案例设定通过率阈值。

```takeaways
- 对工具调用、工具参数、数据库行和线程状态做断言，不要对精确的回复文本做断言。
- 检查那些重要的回复说法，例如退款状态。
- 在测试批准之前，先检查模型确实提出了这个操作。
- 用能固定工具调用的请求来驱动服务测试，并要求每次运行都通过。
- 在每个已部署的模型上运行模型评估，并按案例跟踪通过率。
- 重复运行贪婪的本地模型时要改变 seed，否则重复毫无意义。
```

来源：capture/lab/prodapp-mac/summary/evals-mac.json, capture/lab/prodapp-mac/runs/summary/suite-mac.json, capture/lab/prodapp-mac/runs/suite/qwen3-4b/rep-1/pytest.txt, capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/pytest.txt, capture/lab/prodapp-mac/runs/suite/haiku/rep-1/pytest.txt, capture/lab/prodapp-mac/runs/suite/qwen3-14b/rep-1/cases/19-new_message_while_waiting_for_approval.json, capture/lab/prodapp-mac/code/tests/test_evals.py, capture/lab/prodapp-mac/code/tests/conftest.py, capture/lab/prodapp-mac/code/tests/procs.py, capture/lab/prodapp-mac/code/tests/test_durability.py, capture/lab/prodapp-mac/code/deploy/ci.yml, capture/lab/prodapp-mac/code/scripts/causes.json, capture/lab/prodapp-mac/summary/fix-mac.json.
