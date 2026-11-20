# 本地 SQLite 数据库上的 SQL agent

> 只要读连接拒绝写入、每次写入都需要审批，SQL agent 就无法独自改动数据；但它仍然能把读到的每一行都展示出来。

有人想要一个能回答销售数据库问题的 agent。第一个原型把连接字符串和一个能执行任意 SQL 的工具交给模型。演示里它运行良好。随后用户输入“删除已取消的订单”，模型写出了一条 `DELETE`。

读完本节，你能构建一个通过只读连接读取数据、只在审批之后才写入的 SQL agent。你还能在它的一次运行中，分清哪些是模型的失败，哪些是框架的失败。

## 演示构建了什么 {#s-a-sql-agent-over-a-local-sqlite-database-what-the-demo-builds}

演示回答一家小面包店订单簿的问题。脚本每次运行都构建 SQLite 文件，有四张表：`customers`、`products`、`orders` 和 `order_items`。行数据来自带种子的随机生成器，所以每次运行都从同样的数据开始。没有下载任何东西。

agent 有三个工具。`describe_database` 一次调用返回每张表，以及它的行数、列和外键。`run_select` 运行一条读查询。`request_change` 运行一条写入，且只在有人批准之后才运行。

演示用到了这些章节：

- [工具、ToolRuntime 与工具错误](#s-tools-toolruntime-and-tool-errors)：每个工具从 `runtime.context` 读取数据库路径。失败的查询以文本形式返回，这样模型可以修正它的 SQL。
- [系统提示词](#s-the-system-prompt)：agent 的工作顺序。
- [人在回路，批量与逐个调用](#s-human-in-the-loop-batched-and-per-call)：`request_change` 在 `per_call` 模式下暂停。
- [安全](#s-security-deserialization-store-isolation-approvals-and-mcp-subprocesses)：模型从不持有能写入的连接。
- [递归上限](#s-error-handlers-node-timeouts-and-the-recursion-limit)：每个问题都以 `recursion_limit` 25 运行。

## 作为上下文的数据库路径 {#s-a-sql-agent-over-a-local-sqlite-database-the-database-path-as-context}

模型从来看不到文件的路径。文档把运行时上下文作为放置数据库连接这类依赖的地方 {{docs oss/python/langchain/runtime}}。演示声明了一个只有一个字段 `db` 的 dataclass `Shop`，并把它作为 `context_schema` 传入。每个工具接受一个 `runtime: ToolRuntime[Shop]` 参数，由 `ToolNode` 填入，并且不出现在模型得到的 schema 里 {{docs oss/python/langchain/tools}}。

```listing
title: agent，带上下文，并在写入工具上设置审查
source: capture/demos/sql-agent/sql_agent.py
lang: python
---
    agent = create_agent(
        model(),
        tools=[describe_database, run_select, request_change],
        system_prompt=INSTRUCTIONS,
        context_schema=Shop,
        middleware=[
            HumanInTheLoopMiddleware(
                interrupt_on={"request_change": {"allowed_decisions": ["approve", "reject"], "description": "A change to the bakery database waits for review"}},
                interrupt_mode="per_call",
            )
        ],
        checkpointer=InMemorySaver(),
    )
```

每次调用 `invoke`，无论是第一次请求还是每次恢复，都传入同一个 `Shop` 值：

```listing
title: 一个问题，连同它的上下文
source: capture/demos/sql-agent/sql_agent.py
lang: python
---
        result = agent.invoke({"messages": [{"role": "user", "content": question}]}, config, context=shop, version="v2")
```

## 读路径 {#s-a-sql-agent-over-a-local-sqlite-database-the-read-path}

`run_select` 先用 `guard` 检查 SQL，再在 `reader` 提供的连接上运行它。这个连接用三种方式拒绝写入。URI 以 `mode=ro` 打开文件，`query_only` pragma 拒绝写入。Python `sqlite3` 模块的授权器拒绝除读取之外的所有操作。

```listing
title: 只读连接与 guard
source: capture/demos/sql-agent/sql_agent.py
lang: python
---
def reader(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.execute("PRAGMA query_only = ON")
    conn.set_authorizer(lambda action, *_: sqlite3.SQLITE_OK if action in READ_ACTIONS else sqlite3.SQLITE_DENY)
    return conn


def guard(sql: str) -> str:
    text = sql.strip().rstrip(";").strip()
    bare = QUOTED.sub("''", text)
    if ";" in bare:
        raise ValueError("refused: one statement per call")
    if "--" in bare or "/*" in bare:
        raise ValueError("refused: remove the SQL comments")
    if not re.match(r"(?i)(select|with)\b", bare):
        raise ValueError("refused: start with SELECT or WITH")
    word = WRITE_WORD.search(bare)
    if word:
        raise ValueError(f"refused: {word.group(0).upper()} changes data, so call request_change")
    if not TAIL_LIMIT.search(text):
        text = f"{text} LIMIT {MAX_ROWS + 1}"
    return text
```

`guard` 在查找写入关键字之前，先把每个字符串字面量抹空，所以文本值 `'delete'` 不算写入。`REPLACE` 算作写入，除非它后面跟着左括号，就像 `replace()` 函数那样。结尾没有 `LIMIT n`、`LIMIT n, m` 或 `LIMIT n OFFSET m` 的查询，会被加上 `LIMIT 26`。

光有 guard 不是防线，因为模型可以写出正则表达式没有预料到的 SQL。只读连接才是防线。guard 的作用，是在 SQLite 拒绝语句之前，给模型一条清楚的消息。`run_select` 最多展示 25 行，截断更多行时会在结果里说明。

agent 运行之前，脚本把 13 条固定查询送过 `guard`，两条送过 `reader`。每次运行的日志都会打印每一条的结果：

```listing
title: guard 的各个用例，Qwen3 8B 运行
source: capture/lab/sql-agent/run-8b.log
lang: text
note: 五个被接受的用例和一个被拒绝的用例已截去。脚本把长用例在 90 个字符处截断。
---
== guard
  sent      SELECT name FROM products  =>  SELECT name FROM products LIMIT 26
…
  sent      SELECT 'drop table orders; delete' AS note  =>  SELECT 'drop table orders; delete' AS note LIMIT 26
…
  refused   WITH n AS (SELECT 1) REPLACE INTO products (id, name, category, price_cents) SELECT 1, ' …  =>  refused: REPLACE changes data, so call request_change
  refused   WITH old AS (SELECT id FROM orders) DELETE FROM orders WHERE id IN old  =>  refused: DELETE changes data, so call request_change
  refused   SELECT 1; DROP TABLE orders  =>  refused: one statement per call
…
  refused   DELETE FROM orders  =>  refused: start with SELECT or WITH
  refused   UPDATE products SET price_cents = 0  =>  refused: start with SELECT or WITH
  reader    DELETE FROM orders  =>  DatabaseError: not authorized
  reader    SELECT COUNT(*) FROM orders  =>  [(60,)]
```

两个 `WITH` 用例开头看起来像读取，实际却会改变数据，所以拒绝它们的是关键字检查这一步。`reader` 那几行跳过了 guard。拒绝 `DELETE` 的是 SQLite 本身。

只读连接能阻止写入，却不能阻止 agent 读到敏感的行再展示给用户。使用真实数据之前，请把连接限制在用户有权看到的表和列上。

## 写路径 {#s-a-sql-agent-over-a-local-sqlite-database-the-write-path}

`request_change` 是一个普通的工具，它打开能写入的连接。让它变得安全的是中间件。在 `per_call` 模式下，对这个工具的每次调用，都在工具函数体运行之前抛出它自己的中断 {{code libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py}}。中断的值带着工具调用的 id、名称和参数。

演示用一个用代码写的审查者回答每个中断，而不是模型。它批准向 `products` 的 `INSERT`，拒绝其他所有改动。在真实系统里，是由人在恢复之前阅读语句和理由。中断需要 checkpointer，所以 agent 带了 `InMemorySaver`。

Qwen3 8B 在一次批准之后添加了产品：

```listing
title: 被批准的插入，Qwen3 8B
source: capture/lab/sql-agent/run-8b.log
lang: text
note: describe_database 的结果已截去。
---
== add-product: Add a new product: Rye Loaf, category bread, price 4.50.
  tool call  describe_database({})
…
  tool call  request_change({"statement": "INSERT INTO products (name, category, price_cents) VALUES ('Rye Loaf', 'bread', 450);", "reason": "Adding a new product to  …)
  paused     approved: new products are allowed
  tool says  change applied, 1 row(s)
  final      The product "Rye Loaf" has been successfully added to the bakery's menu with the category "bread" and a price of $4.50.
  3 model calls, 1524 prompt tokens, 111 output tokens, 6.6 s
```

Qwen3 4B 查出已取消的订单，并提议对四个 id 执行 `DELETE`。审查者拒绝了它。中间件把理由作为这次调用的结果送回给模型，没有任何行被改动：

```listing
title: 被拒绝的删除，Qwen3 4B
source: capture/lab/sql-agent/run-4b.log
lang: text
note: describe_database 的结果已截去。
---
== drop-cancelled: Delete all of the cancelled orders.
  tool call  describe_database({})
…
  tool call  run_select({"sql": "SELECT o.id FROM orders o WHERE o.status = 'cancelled'"})
  tool says  {"columns": ["id"], "rows": [[13], [15], [21], [32]]}
  tool call  request_change({"statement": "DELETE FROM orders WHERE id IN (13, 15, 21, 32)", "reason": "Remove all cancelled orders from the database."})
  paused     refused: only new products are allowed
  tool says  User rejected the tool call for `request_change` with reason: Refused by the reviewer. This agent can only add products.
  final      The request to delete cancelled orders was rejected because the agent can only add products, not delete or modify existing data. No changes were made to the database.
```

## 录制的运行 {#s-a-sql-agent-over-a-local-sqlite-database-the-recorded-run}

演示提了五个问题。它们问有哪些表及各自的行数、已付款订单总额最大的客户，以及 2026 年 3 月的订单。然后要求添加一个产品，以及删除已取消的订单。脚本先用自己的 SQL 算出正确答案。它在 Ollama 上用 Qwen3 4B 运行一次，用 Qwen3 8B 运行一次，温度为 0，种子为 42，关闭推理。

**我们测得**每个模型的一次运行，在 Mac 上进行，Apple M1 Max，10 核，64 GiB，Ollama 0.31.1。每个模型都得到同样的五个问题，所以每个模型的 n 是 5。读取类问题，答案说出了正确的值就算对。写入类问题，之后数据库里是正确的行才算对。

| 问题 | Qwen3 4B | Qwen3 8B |
|---|---|---|
| 各张表及其行数 | 正确，2 次模型调用，4.0 秒 | 正确，2 次模型调用，4.9 秒 |
| 排名第一的客户 | 正确，Garden Bistro，100550 cents，3 次调用，2.5 秒 | 正确，相同，3 次调用，7.8 秒 |
| 2026 年 3 月的订单 | 正确，18，3 次调用，1.7 秒 | 正确，18，3 次调用，4.0 秒 |
| 添加一个产品 | 已批准，添加 1 行，4 次调用，10.4 秒 | 已批准，添加 1 行，3 次调用，6.6 秒 |
| 删除已取消的订单 | 已提议，被拒绝，保留 4 行，4 次调用，3.3 秒 | 已提议，被拒绝，保留 4 行，4 次调用，8.9 秒 |

两个模型五个问题全部答对，而且每个模型在每个问题上都先调用了 `describe_database`。Qwen3 4B 在五个问题上用了 9,862 个提示词 token，Qwen3 8B 用了 8,739 个。单个问题上最多的模型调用是 4 次，所以没有哪个问题接近递归上限。

## 这次运行说明了什么 {#s-a-sql-agent-over-a-local-sqlite-database-what-the-run-shows}

把表格分两层来读。框架这一层在每一行都守住了。没有任何一次写入未经批准就运行，读连接拒绝了写入，最后已取消的订单仍然都在。

其余是模型的结果，其中两处只在文字上出错。Qwen3 4B 存入了 450 cents 的价格，却告诉用户价格是 4.50 cents。Qwen3 8B 在被拒绝的 `DELETE` 之前，请求了所有订单。工具最多返回 25 行，它得到了 25 行，并附带结果已被截断的说明。然后它在结束这一轮时，承诺发送一份它从未发送的列表。每一次，LangChain 都做了代码要求它做的事。

```takeaways
- 用只读连接打开读路径，把关键字检查只当作错误消息。
- 把数据库路径作为上下文传入，这样模型永远看不到它。
- 把每一次写入都放在自己的工具后面，并用 per_call 审查暂停这个工具。
- 给模型一个描述每张表及其行数的工具。
- 截断行时在工具结果里说明，这样模型不会把一份不完整的列表当成全部来数。
- 写入之后检查实际存入的行，因为回复可能陈述一个错误的值。
```

来源：capture/demos/sql-agent/sql_agent.py, capture/demos/sql-agent/run.sh, capture/demos/sql-agent/README.md; capture/lab/sql-agent/run-4b.log, capture/lab/sql-agent/run-8b.log, capture/lab/sql-agent/run-4b.jsonl, capture/lab/sql-agent/run-8b.jsonl, capture/lab/summary/demos-mac.json; libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py and libs/langchain_v1/langchain/agents/factory.py at langchain==1.5.0; libs/prebuilt/langgraph/prebuilt/tool_node.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langchain/runtime, oss/python/langchain/tools, oss/python/langchain/human-in-the-loop).
