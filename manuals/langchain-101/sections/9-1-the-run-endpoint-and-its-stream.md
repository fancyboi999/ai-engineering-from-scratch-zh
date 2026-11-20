# 运行端点：StreamingResponse 与每次运行一个任务

> 把每次运行作为独立的 asyncio 任务启动，让它把事件写进队列，这样 HTTP 响应只负责读，离开的客户端也取消不了运行。

你把 `agent.astream` 放进一个 FastAPI 路由，并把它的块作为服务器发送事件（SSE）返回。它一直好用，直到某部手机在退款进行到一半时丢了信号。客户端断开时，Starlette 会取消响应的任务组 {{code starlette/responses.py:247-285}}。取消也会传到 `astream`，因为它就运行在那个组里。

读完本节，你能搭出本部分使用的结构：路由启动一次运行，一个任务拥有它，流只负责读。你还能说出客户端会收到哪些事件，以及它们的顺序。

## 一页看完这个服务 {#s-the-run-endpoint-and-its-stream-the-service-on-one-page}

参考服务是一个 FastAPI 应用，带一个 `create_agent` 和一个 Postgres 数据库。它有六条路由。

| 路由 | 作用 |
|---|---|
| `POST /threads` | 创建线程并记录它的所有者 |
| `POST /threads/{id}/runs` | 用一条用户消息启动一次运行，并流式返回它的事件 |
| `POST /threads/{id}/approve` | 回答一个待处理的审批，并流式返回运行的其余部分 |
| `GET /threads/{id}/state` | 返回消息、下一批节点和待处理的中断 |
| `GET /memories` | 列出为调用方保存的笔记 |
| `GET /healthz` | 报告进程在运行 |

这个 agent 有六个工具，一个由[第 9.5 节](#s-timeouts-retries-backup-model-and-shutdown)解释的中间件栈，以及[第 9.2 节](#s-postgres-checkpointer-store-and-owner-check)的 Postgres checkpointer 和 store。模型是一项设置：`ollama:<name>` 或 `anthropic:<name>`。

这个栈有八个中间件，其中三个会增加节点。[图](#fig-9-1b)根据 `build_agent` 的 Mermaid 文本画出了编译后的图。工具包用从不被调用的模型构建它，并用一个 OpenTelemetry 模块的替身。`Tracing` 和 `ToolTimeout` 只有 wrap 钩子，所以这个替身不改变任何节点。

```figure
id: fig-9-1b
kind: structure
title: 服务 agent 的图
claim: 来自三个中间件的四个钩子节点围在 model 周围，ModelCallLimitMiddleware 可以在模型调用之前或之后结束运行。
caption: 从顶部的 __start__ 读起。蓝色方框是钩子节点。其他五个中间件包装模型调用或工具调用，不增加节点。来源：capture/out/54-draw-service-agent.txt。
```

## 由任务拥有运行 {#s-the-run-endpoint-and-its-stream-a-task-owns-the-run}

**运行任务：** 为一次运行迭代 `agent.astream`、并把每个事件放进队列的 `asyncio` 任务。路由启动它并立即返回。响应读取队列。

```listing
title: 路由启动一个任务，响应读取它的队列
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
    async def start(self, user_id, thread_id, payload):
        if not await self.locks.acquire(thread_id):
            raise HTTPException(409, "a run is already active on this thread")
        queue = asyncio.Queue()
        task = asyncio.create_task(self.run(user_id, thread_id, payload, queue))
        self.active[thread_id] = task
        task.add_done_callback(lambda _: self.active.pop(thread_id, None))
        return queue
```

这种拆分带来三件事。客户端断开会结束响应，而运行任务感知不到。服务保存着活动任务的列表，所以关闭时可以等待它们，见[第 9.5 节](#s-timeouts-retries-backup-model-and-shutdown)。线程锁在任务启动之前获取，在任务的 `finally` 里释放。所以同一线程上的第二次运行会立即得到 409。

```listing
title: 运行任务先释放锁，再发送 done
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
    async def run(self, user_id, thread_id, payload, queue):
        status, started = "cancelled", time.perf_counter()
        try:
            status = await self.traced(user_id, thread_id, payload, queue)
        finally:
            seconds = round(time.perf_counter() - started, 4)
            event("run.end", thread_id=thread_id, status=status, seconds=seconds)
            await self.locks.release(thread_id)
            queue.put_nowait(("done", {"status": status, "seconds": seconds}))
            queue.put_nowait(None)
```

`finally` 里的顺序很重要。锁在发送 `done` 之前释放。否则，客户端一读到 `done` 就启动下一次运行，会和释放抢跑，得到 409。

**我们测得**：在 Mac 上用 Qwen3 4B，做了五次试验，看离开的客户端对运行有什么影响。每次试验问一个 FAQ 问题，在第一个 SSE 事件之后关闭连接，那是请求之后 245 到 1910 ms。随后它立即向线程发第二条消息，并读取状态直到运行结束。

- 第二次 post 在 5 次试验中有 5 次得到 409，因为第一次运行仍占着线程。
- 运行在 5 次试验中有 5 次完成，状态为 `done`，用时 3.56 到 4.71 秒。每个线程最后都有人类消息、一次 `search_faq` 调用、它的结果和一个最终答案。

## 流上的事件 {#s-the-run-endpoint-and-its-stream-the-events-on-the-stream}

运行任务让 `astream` 同时使用两种流模式，`messages` 和 `updates`，并设 `version="v2"`。它把每一部分转成 `token`、`tool_call`、`tool_result` 或 `interrupt`。运行任务在末尾添加 `done`，在运行抛出时添加 `error`。

```listing
title: 流的各部分如何变成 SSE 事件
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
def to_events(part):
    if part["type"] == "messages":
        chunk, meta = part["data"]
        if chunk.type == "AIMessageChunk" and chunk.text and meta.get("langgraph_node") == "model":
            yield "token", {"text": chunk.text}
        return
    for node, update in part["data"].items():
        if node == "__interrupt__":
            for item in update:
                yield "interrupt", {"id": item.id, **item.value}
            continue
        if node not in ("model", "tools") or not isinstance(update, dict):
            continue
```

按节点名过滤是有原因的。摘要中间件作为它自己的节点运行。它的更新会删除每条消息，再把摘要和保留的消息写回去 {{code libs/langchain_v1/langchain/agents/middleware/summarization.py:551-557}}。所以它会重复客户端已经见过的 AI 消息。没有这个过滤，客户端会再次收到这些 `tool_call` 事件。token 只来自 `model` 节点，所以摘要的文本永远到不了客户端。

**我们测得**：在 Mac 上用 Qwen3 4B，做了一段三个请求的对话，并记录每个事件到达客户端的时间。模型已经加载好。

| 请求 | 第一个事件 | 事件，按顺序 | `done` |
|---|---|---|---|
| 订单问题 | 682 ms 时的 `tool_call` | `tool_call`，698 ms 时的 `tool_result`，从 1016 ms 起 30 个 token | 1527 ms |
| 退款 8900 美分 | 2090 ms 时的 `tool_call` | `tool_call`，2122 ms 时的 `interrupt` | 2125 ms，状态 `interrupted` |
| 批准 | 32 ms 时的 `tool_result` | `tool_result`，从 765 ms 起 38 个 token | 2158 ms |

每个 `tool_call` 事件，都在它的模型调用结束后 30 ms 内到达客户端。审批请求是一个 `interrupt` 事件，流在它之后 3 ms 以 `done` 和状态 `interrupted` 结束。批准请求跳过了模型：它的第一个事件是退款结果，在请求之后 32 ms。

更早的一次录制里，第一个请求紧跟在排空试验用过 Qwen3 14B 之后发出，用了 15.42 秒。它的第一次模型调用用了 13.4 秒，那时 Qwen3 4B 在重新加载。在共享服务器上，保持模型已加载，否则切换之后的第一位客户要等它。

```figure
id: fig-9-1
kind: timeline
title: 三个请求、每次运行的 span，以及客户端读到的事件
claim: 客户端在每个工具调用的模型调用结束时读到它，审批请求以一个结束了流的 interrupt 事件到达。
caption: 每个面板是一个 HTTP 请求，单位是发出之后的毫秒数。上面一行是运行任务，带模型和工具的 span。下面一行是客户端，每个 SSE 事件放在它到达的时间。来源：capture/lab/prodapp-mac/summary/stream-mac.json。
```

## 运行等待时的心跳 {#s-the-run-endpoint-and-its-stream-a-heartbeat-while-a-run-waits}

一次运行在第一个事件之前可能等很久，例如在模型服务器处排在其他运行后面。在那之前流不发送任何字节，而 HTTP 客户端会把这当成连接已死。服务在 15 秒没有事件时，写一行 SSE 注释。客户端必须忽略以冒号开头的行，所以这行注释不带数据。

```listing
title: 流读取器，每 15 秒静默就发一行注释
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
HEARTBEAT = float(os.environ.get("HEARTBEAT_SECONDS", "15"))


async def sse(queue):
    while True:
        try:
            item = await asyncio.wait_for(queue.get(), HEARTBEAT) if HEARTBEAT > 0 else await queue.get()
        except TimeoutError:
            yield ": waiting\n\n"
            continue
        if item is None:
            return
        name, data = item
        yield f"event: {name}\ndata: {json.dumps(data, default=str)}\n\n"
```

**我们测得**：在 Mac 上用一个 worker 和 Qwen3 4B，把[第 9.7 节](#s-workers-the-advisory-lock-and-cost)的 50 用户负载格再测了一次，一次运行。客户端保持它们 120 秒的读取超时。

| | 请求数 | 客户端读取超时 | 客户端看到结束的运行 | 服务器结束的运行 | 每次运行秒数的中位数和最大值 |
|---|---|---|---|---|---|
| 没有心跳 | 157 | 48 | 107 | 155，其中 19 个在关闭时被 `cancelled` | 164.7 和 193.8 |
| 有心跳 | 200 | 0 | 192 | 192，没有被取消的 | 194.8 和 286.7 |

有了心跳，每个会话都发完了全部四个请求，最慢的一次运行用了 286.7 秒，没有超时。另外 8 个请求是得到 409 的批准，因为模型没有提出退款。运行用时更长，是因为有更多运行到达了模型，而服务器仍然每秒完成 0.231 次运行。

这次运行时 Mac 负载很高，平均负载为 32.78。把秒数当作上限，把计数当作结果。心跳让客户端保持连接，并不会让模型变快。

```figure
id: fig-9-1c
kind: comparison
title: 50 个客户端看到的情况，流上没有心跳与有心跳
claim: 每 15 秒一行注释时，200 个请求有 0 个超时，而没有注释时有 48 个会话因读取超时而丢失。
caption: 每根条是 50 个用户、一个 worker 的负载格的一次运行。各部分是以 done 结束的请求、因审批而 interrupted 的请求、以 409 拒绝的请求，以及因客户端读取超时而丢失的请求。来源：capture/lab/prodapp-mac/summary/fix-mac.json。
```

```takeaways
- 让每次 agent 运行在自己的 asyncio 任务里，并从任务填充的队列里流式输出。
- 保存活动运行任务的登记表，让关闭时能等待它们。
- 在发送 done 事件之前释放线程锁。
- 只从 model 和 tools 节点发送工具事件，这样摘要不会重复它们。
- 线程有待处理的审批或活动的运行时，回答 409。
- 一次运行静默了 15 秒，就发送一行 SSE 注释。
```

来源：capture/lab/prodapp-mac/code/app/server.py, capture/lab/prodapp-mac/code/app/agent.py, capture/out/54-draw-service-agent.txt, capture/s_draw.py, capture/lab/prodapp-mac/code/scripts/capture_stream.py, capture/lab/prodapp-mac/code/scripts/disconnect_real.py, capture/lab/prodapp-mac/summary/stream-mac.json, capture/lab/prodapp-mac/summary/disconnect-mac.json, capture/lab/prodapp-mac/runs/stream/stream-events.jsonl, capture/lab/prodapp-mac/runs/stream/stream.spans.jsonl, capture/lab/prodapp-mac/runs/disconnect/disconnect-trials.json, capture/lab/prodapp-mac/summary/fix-mac.json, capture/lab/prodapp-mac/runs/fix/load/load-summary.json, capture/lab/prodapp-mac/runs/load/load-summary.json; libs/langgraph/langgraph/pregel/main.py at langgraph 1.2.22; starlette/responses.py at starlette 1.10.0.
