# AsyncPostgresSaver、AsyncPostgresStore 与所有者检查

> checkpointer 和 store 都不认识用户，所以要在你的路由里检查线程所有权，并从运行上下文里取用户 id，绝不从模型那里取。

第二位客户注册了。他们的客户端发来一个在日志里读到的线程 id，请求该线程的状态。`AsyncPostgresSaver` 把它返回了，因为检查点行里只有线程 id，没有任何指向某个人的字段。`AsyncPostgresStore` 也一样，它按你选定的命名空间给条目设键。

读完本节，你能把 checkpointer、store 和你自己的表放在同一个连接池上。你能加上 saver 没有的所有者检查，并让每个工具只碰正确用户的行。

## 三类行共用一个池 {#s-postgres-checkpointer-store-and-owner-check-one-pool-for-three-kinds-of-rows}

**checkpointer：** 在每一步之后写入每个线程状态的 saver，这里是 `AsyncPostgresSaver`。**store：** 保存比线程活得更久的数据的键值 saver，这里是 `AsyncPostgresStore`。服务打开一个 `psycopg` 连接池，交给两者，它自己的表也用同一个池。

```listing
title: checkpointer、store 和应用表共用的一个池
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
        kwargs = {"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row}
        locks = await ThreadLocks.connect(settings.database_url)
        async with AsyncConnectionPool(settings.database_url, max_size=settings.pool_max, kwargs=kwargs) as pool:
            checkpointer, store = AsyncPostgresSaver(pool), AsyncPostgresStore(pool)
            async with locks.exclusive("schema-setup"):
                await checkpointer.setup()
                await store.setup()
                await db.setup(pool, set(settings.tokens.values()))
```

`kwargs` 里的三项设置，是每个 saver 的 `from_conn_string` 所用的设置 {{code libs/checkpoint-postgres/langgraph/checkpoint/postgres/aio.py:87}}。你自己传入的池也必须设置它们：`autocommit`、`prepare_threshold=0` 和 `dict_row`。

`prepare_threshold=0` 有代价。**我们测得**：在 Mac 上，用 `prepare_threshold=0` 的连接，`select 1; select 2` 失败了，报 `cannot insert multiple commands into a prepared statement`。不带这项设置，它能运行。所以应用一次只执行一条语句来创建它的表。

初始化在一把 Postgres advisory lock（咨询锁）下运行。否则，同时启动的两个 worker 会同时运行同样的 `CREATE TABLE` 和索引语句。锁的连接在池之外，原因见[第 9.7 节](#s-workers-the-advisory-lock-and-cost)。

## 所有者检查 {#s-postgres-checkpointer-store-and-owner-check-the-owner-check}

服务有自己的 `threads` 表，每个线程一行，记着创建它的用户。每条指明线程的路由，都依赖这个函数。

```listing
title: 每条线程路由上的所有者检查
source: capture/lab/prodapp-mac/code/app/server.py
lang: python
---
    async def owned(thread_id: str, user_id: str = Depends(user), s: Service = Depends(svc)) -> str:
        async with s.pool.connection() as conn:
            cur = await conn.execute("select user_id from threads where thread_id = %s", (thread_id,))
            row = await cur.fetchone()
        if row is None or row["user_id"] != user_id:
            raise HTTPException(404, "thread not found")
        return thread_id
```

属于别人的线程返回 404，与不存在的线程一样。返回 403 会告诉调用方这个 id 是真的。

这个检查回答的是谁拥有线程，不回答谁能批准退款，所以创建线程的客户能批准它的退款。真正的服务需要单独的审批人身份。示例配置里的令牌 `tok-alice` 和 `tok-bob` 是演示值，部署之前要设置你自己的 `AUTH_TOKENS`。

## 用户来自上下文 {#s-postgres-checkpointer-store-and-owner-check-the-user-comes-from-the-context}

工具也需要用户。模型选择订单 id，而它可以选择任何字符串。所以没有工具把用户 id 当作参数。服务把用户放进运行上下文，每个工具从 `runtime.context` 读取它。

```listing
title: 两个把每个查询都限定在上下文里那位用户的工具
source: capture/lab/prodapp-mac/code/app/tools.py
lang: python
---
async def read_order(order_id: str, runtime: ToolRuntime[Ctx]) -> str:
    """Look up one of the customer's orders by id, for example ORD-alice-1."""
    async with runtime.context.pool.connection() as conn:
        cur = await conn.execute(
            "select id, item, status, total_cents, refunded_cents from orders where id = %s and user_id = %s",
            (order_id, runtime.context.user_id),
        )
…
async def save_note(text: str, runtime: ToolRuntime[Ctx]) -> str:
    """Save a fact or preference about the customer for future conversations."""
    await runtime.store.aput(("memories", runtime.context.user_id), str(uuid.uuid4()), {"text": text})
```

**我们测得**：在 Mac 上，真实模型拿到另一位客户的订单 id 时会怎么做。用户 `e05` 问 `Where is my order ORD-alice-1?`。Qwen3 4B 和 Qwen3 14B 各自用 `ORD-alice-1` 调用了 `read_order`，各 3 次运行都是如此。Claude Haiku 5.5 在它的一次运行里也这样做了。查询没有返回行，工具返回了一个错误，商品名从未到达线程状态。模型确实去查了，是 `user_id` 过滤拦住了它。

## 隔离，实测 {#s-postgres-checkpointer-store-and-owner-check-isolation-measured}

测试套件里的隔离测试，通过模型保存一条笔记，而 Qwen3 4B 从未调用 `save_note`。所以这个测试在 4B 上什么也没证明。我们把隔离检查又跑了一遍，这次把笔记直接写进 store，使它不依赖工具调用。

**我们测得**：在 Mac 上用 Qwen3 4B 跑了一次。脚本把 `door code is 4471` 写入命名空间 `("memories", "alice")`。然后 alice 创建了一个线程，bob 用他自己的令牌去访问它。

| bob 的请求 | 结果 |
|---|---|
| `GET /threads/{alice's thread}/state` | 404 |
| `POST /threads/{alice's thread}/runs` | 404 |
| `POST /threads/{alice's thread}/approve` | 404 |
| `GET /memories` | `[]` |
| 在他自己的线程里问 `What do you remember about me?` | 模型调用了 `recall_notes`，它返回 `[]` |

alice 问同一个问题，调用了 `recall_notes`，它返回 `["door code is 4471"]`。字符串 `4471` 在 bob 的线程状态里哪里都没有。模型从未见过别的用户的命名空间，因为工具用上下文来构建命名空间。

## 一段对话写入什么 {#s-postgres-checkpointer-store-and-owner-check-what-one-conversation-writes}

**我们测得**：[第 9.7 节](#s-workers-the-advisory-lock-and-cost)负载测试的行，用 Qwen3 4B。每个用户有一个线程，四次运行：一个订单问题、一个 FAQ 问题、一个退款请求和批准。有 10 个用户时，每次运行向三张检查点表写入 27.2 行，约 20.3 到 20.4 KB 的行数据。三个 10 用户的格子都是这样。第四个格子重跑过并被替换。有 50 个用户时是 29.5 到 30.1 行、21.6 到 22.1 KB，因为有些运行在客户端超时时提前结束了。

这些行里没有一行写着用户。对线程的请求只能经过所有者检查到达它的行，工具只能经过上下文到达用户的行。

```figure
id: fig-9-2
kind: structure
title: 一段对话的行，以及谁能读它们
claim: 检查点行只带线程 id，所以路由里的所有者检查和工具上下文里的用户，是仅有的隔离。
caption: 每个方框是一张 Postgres 表或一个 store 命名空间，带它的键，以及负载测试里每次运行写入的行数。墨色箭头是读取。琥珀色条是所有者检查。来源：capture/lab/prodapp-mac/summary/load-mac.json 和 capture/lab/prodapp-mac/summary/service-mac.json。
```

```takeaways
- 给 checkpointer、store 和你的表同一个池，设 autocommit、dict_row 和 prepare_threshold 0。
- 多个 worker 同时启动时，在 advisory lock 下运行 saver 的 setup。
- 保存一张带所有者的 threads 表，对别的用户拥有的线程返回 404。
- 在工具里从 runtime.context 读用户 id，绝不把它当作工具参数。
- 在每个存放个人数据的 store 命名空间里放入用户 id。
```

来源：capture/lab/prodapp-mac/code/app/server.py, capture/lab/prodapp-mac/code/app/tools.py, capture/lab/prodapp-mac/code/app/db.py, capture/lab/prodapp-mac/code/app/locks.py, capture/lab/prodapp-mac/summary/service-mac.json, capture/lab/prodapp-mac/summary/load-mac.json, capture/lab/prodapp-mac/summary/evals-mac.json, capture/lab/prodapp-mac/runs/service/service-properties.json, capture/lab/prodapp-mac/runs/psycopg-multistatement.txt, capture/lab/prodapp-mac/runs/summary/suite-mac.json; libs/checkpoint-postgres/langgraph/checkpoint/postgres/aio.py and libs/checkpoint-postgres/langgraph/store/postgres/aio.py at langgraph-checkpoint-postgres 3.2.1.
