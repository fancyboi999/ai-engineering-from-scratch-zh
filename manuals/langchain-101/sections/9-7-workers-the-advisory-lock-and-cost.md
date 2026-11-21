# worker、advisory lock 与一次对话的成本

> 用真实模型时，吞吐的上限在模型服务器上，所以增加 worker 是为了可用性；在 Postgres 里加线程锁；并按实测的 token 数给一次对话定价。

流量翻倍，你启动了第二个 uvicorn worker。同一个线程的两个请求现在可能落到两个进程里。进程内的锁拦不住它们，两次运行会写入同一条检查点链。接下来的问题是：多出来的 worker 给你带来什么，以及每次对话要花多少钱。

读完本节，你能让多个 worker 共用每个线程一把的 Postgres 锁。你还能找出限制吞吐的资源，并根据你实测的 token 数估算 1,000 次对话的价格。

## 跨进程，每个线程只跑一次 {#s-workers-the-advisory-lock-and-cost-one-run-per-thread-across-processes}

**advisory lock（咨询锁）：** 加在由你的代码选定的一个数字上的 Postgres 锁，由会话持有，会话结束时释放。服务用 `hashtextextended` 把线程 id 哈希成这个数字。

```listing
title: 线程锁：在一个专用连接上持有的 Postgres advisory lock
source: capture/lab/prodapp-mac/code/app/locks.py
lang: python
---
KEY = "select {fn}(hashtextextended(%s, 0))"
…
    async def acquire(self, thread_id):
        if thread_id in self.held:
            return False
        self.held.add(thread_id)
        if await self.call("pg_try_advisory_lock", thread_id):
            return True
        self.held.discard(thread_id)
        return False
```

这个类里有三个选择很关键。

- 每个 worker 在连接池之外，用自己的一个连接持有全部锁。如果把锁放在池连接上，20 次运行就会占满 20 个连接，它们写检查点时就要等第 21 个连接。
- advisory lock 在同一个会话内可重入，所以同一个 worker 里的第二个请求会再次拿到锁。`held` 集合会先拒绝它。
- worker 死亡时，Postgres 结束它的会话并释放它的锁，不需要租约或定时器。

**我们测得**在 Mac 上，套件的六次 Qwen 运行（每个模型三次）里都做了竞争测试。它在同一个数据库上启动两个 uvicorn 进程 A 和 B。6 次运行的结果完全相同。

- 同时向同一个线程的 A 和 B 各发一次运行：一个 200，一个 409，只有一条用户消息。
- 向 A 发送同一线程的两次运行：一个 200，一个 409。
- A 持有线程期间向 B 发送一次运行：409。
- A 持有线程时被 SIGKILL 杀掉，然后向 B 发送一次运行：200。进程一死，锁就空闲了。

## 上限在哪里 {#s-workers-the-advisory-lock-and-cost-where-the-ceiling-is}

**我们测得**在 Mac 上用 Qwen3 4B 对服务施压，每个单元格跑一次。每个用户有一个线程，按顺序发送四个请求：订单问题、FAQ 问题、带金额和原因的退款，以及审批。所有用户同时开始。压测生成器运行在同一台 Mac 上，读取超时为 120 秒，每个 worker 的连接池有 20 个连接。请求轮流分发给各个 worker。

作为基线，单个用户独自跑了 5 个会话，每个会话 4 个请求。一次运行的耗时中位数是 3.0 秒，该用户每秒完成 0.269 次运行。这个基线期间，泄漏的测试服务器占用了 66 个 Postgres 连接，所以只能当作粗略的参照。

| worker 数 | 同时用户数 | 请求数 | 客户端超时 | 批准时的 409 | 每秒运行数 | 每次运行的中位耗时（秒） | 第 95 百分位（秒） | Postgres 连接数峰值 |
|---|---|---|---|---|---|---|---|---|
| 1 | 10 | 40 | 0 | 2 | 0.259 | 36.0 | 51.1 | 11 |
| 2 | 10 | 40 | 0 | 2 | 0.242 | 38.3 | 48.6 | 15 |
| 4 | 10 | 40 | 0 | 2 | 0.258 | 35.6 | 46.7 | 26 |
| 1 | 50 | 157 | 48 | 2 | 0.208 | 164.7 | 192.5 | 22 |
| 2 | 50 | 163 | 46 | 4 | 0.216 | 152.5 | 188.7 | 35 |
| 4 | 50 | 159 | 49 | 1 | 0.220 | 145.6 | 181.4 | 48 |

[图](#fig-9-7)把三组测量并排放在一起。

```figure
id: fig-9-7
kind: chart
title: worker 数量与模型服务器的对比（Mac 上的 Qwen3 4B）
claim: 增加 uvicorn worker 没有提高吞吐，因为每次运行都在等同一个 Ollama 服务器。
caption: 左图是按 worker 数统计的每秒完成运行数。中图是每次运行的耗时，圆点是中位数，条延伸到第 95 百分位。右图是单独的 Ollama，同时发出 1 到 8 个请求。数据来自 capture/lab/prodapp-mac/summary/load-mac.json。
```

吞吐没有变化。用 1、2 或 4 个 worker 时，十个用户每秒完成 0.242 到 0.259 次运行，五十个用户是 0.208 到 0.220。单个用户独自是 0.269。多出来的用户只是等得更久。一次运行的耗时中位数，单用户时是 3.0 秒，十个用户时是 36 到 38 秒，五十个用户时是 146 到 165 秒。

等待发生在模型之前。单独探测 Ollama 时，同时发出的八个请求是一个接一个返回的，间隔约一秒。单个请求每秒产出 45 到 50 个输出 token。同时发出 4 个或 8 个请求时，它们加起来每秒只产出 17 到 20 个。这些请求各自报告的 `load_duration` 是 0.45 到 1.34 秒，单独运行时是 0.13 秒。我们没有查明这次下降的原因。

Postgres 远没有到上限。最忙的单元格有 48 个连接（4 个 worker），每次运行写入约 20 KB 的检查点行。

五十个用户先压垮的是客户端。在每个 50 用户的单元格里，50 个会话中有 46 到 49 个以 `ReadTimeout` 结束。运行在等待模型期间，流在 120 秒内没有发送任何字节。

运行并没有随客户端一起停止。在 1 个 worker 的单元格里，服务器共结束了 107 次 `done`、29 次 `interrupted`，以及 19 次在关闭时被 `cancelled` 的运行。客户端看到 102 次 `done` 和 5 次 `interrupted`。每 15 秒发送一行 SSE 注释后，同样的 1 个 worker 单元格没有丢失任何会话：200 个请求中读取超时为 0，吞吐为每秒 0.231 次运行。那次运行及其代码见[第 9.1 节](#s-the-run-endpoint-and-its-stream)。

**我们的立场：** 在同一个模型服务器上，多加 uvicorn worker 买到的只有可用性，别无其他。给服务定容之前，先单独测量模型服务器，要提高吞吐就增加模型容量。409 这一列说的又是模型：每个单元格里都有 1 到 4 个用户没有得到退款提议，所以他们的批准没有可恢复的内容。

## 一次对话的成本 {#s-workers-the-advisory-lock-and-cost-the-cost-of-a-conversation}

给一次对话定价需要三个数：一次对话中的模型调用数、输入 token 数和输出 token 数。每个数都必须取自每次调用的提供方用量，如[第 9.4 节](#s-opentelemetry-spans-with-langsmith-off)所示。那里的 span 漏掉了五分之一的输入 token。

**我们测得**在 Mac 上运行 20 项评估，token 数来自挂在每次模型调用上的回调。Claude Haiku 5.5 跑了一次。Qwen 各行取自每个模型的第一次运行。Qwen3 4B 一行只统计 span 内的调用，因为当时它的用量日志还没有开启。案例 9 不调用模型，所以每行有 19 次对话。

| 模型 | 每次对话的模型调用数（中位数、最大值） | 输入 token（中位数、均值） | 输出 token（中位数、均值） | 每次对话的模型耗时中位数（秒） |
|---|---|---|---|---|
| Claude Haiku 5.5 | 2, 14 | 1,989, 4,004 | 214, 394 | 4.01 |
| Qwen3 14B | 2, 12 | 992, 1,799 | 60, 113 | 12.97 |
| Qwen3 4B（仅 span） | 2, 8 | 1,166, 1,344 | 50, 66 | 1.26 |

计数的差异既来自模型行为，也来自分词器。同一个 FAQ 问题的第一次模型调用，在 Claude Haiku 5.5 上有 912 个输入 token，在 Qwen3 4B 上是 557 个，在 Qwen3 14B 上是 454 个。两个 Qwen 模型共用一个分词器，所以它们之间的差距来自各自的聊天模板。

整个 Haiku 套件共用了 64 次调用、76,076 个输入 token 和 7,493 个输出 token。按标价计算是 $0.011353，这就是实际花出去的钱。1,000 次这样的对话的价格，由每次对话的计数和 2026-11-14 的标价（标准档，不含缓存）推算得出。

| 模型 | 每百万 token 价格（美元，输入与输出） | 每 1,000 次对话（美元） | 最贵的一次对话 |
|---|---|---|---|
| Claude Haiku 5.5 | 0.10, 0.50 | 0.61 | $0.0028 |
| Claude Haiku 4.5 | 1.00, 5.00 | 6.06 | $0.0276 |
| Claude Sonnet 5.5 | 2.00, 10.00 | 12.11 | $0.0552 |
| Claude Sonnet 4.6 | 3.00, 15.00 | 18.17 | $0.0829 |
| Claude Opus 5.5 | 4.00, 20.00 | 24.22 | $0.1105 |

只有第一行是实测的。其余各行是把 Haiku 5.5 的计数套在其他价格上。换一个模型，调用也会不同；而且价格页写明，Sonnet 4.6 及更早的模型使用较旧的分词器，得到的 token 约少 30%。请把这些行当作估算。均值包含了失控循环和六轮线程，它们是最贵的两次对话。实际的对话组合取决于你的流量。

对本地模型来说，价格就是机器本身。Qwen3 14B 每次对话的模型耗时中位数是 12.97 秒，Qwen3 4B 是 1.26 秒。上面的压测显示了这台 Mac 能同时服务多少次这样的对话。

```takeaways
- 用 pg_try_advisory_lock 在每个 worker 的一个专用连接上获取线程锁。
- 增加 worker 是为了可用性；再多加之前，先测量模型服务器。
- 按“每个 worker 一个锁连接加连接池”来确定 Postgres 连接池大小和 max_connections。
- 在流上发送心跳，让排队的客户端不会触发读取超时。
- 按每次调用的提供方用量统计 token，包括摘要器的调用。
- 按实测的计数给对话定价，把换了分词器之后的单次运行价格当作估算。
```

来源：capture/lab/prodapp-mac/code/app/locks.py, capture/lab/prodapp-mac/code/app/server.py, capture/lab/prodapp-mac/code/load/loadtest.py, capture/lab/prodapp-mac/code/scripts/ollama_parallel.py, capture/lab/prodapp-mac/code/scripts/cost_real.py, capture/lab/prodapp-mac/code/cost/prices.json, capture/lab/prodapp-mac/code/tests/test_workers.py, capture/lab/prodapp-mac/summary/load-mac.json, capture/lab/prodapp-mac/summary/cost-mac.json, capture/lab/prodapp-mac/summary/evals-mac.json, capture/lab/prodapp-mac/runs/load/load-summary.json, capture/lab/prodapp-mac/runs/load/ollama-parallel.json, capture/lab/prodapp-mac/summary/fix-mac.json, capture/lab/prodapp-mac/runs/fix/load/load-summary.json；Anthropic 价格页（2026-11-14 获取）。
