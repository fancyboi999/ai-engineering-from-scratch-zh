# Store 与长期记忆，以及命名空间隔离

> store 把 JSON 条目保存在命名空间下，每个线程都能读取它们，而它隔离用户的程度，只取决于你的代码构造的命名空间前缀。

用户告诉你的助手，他们喜欢简短的回答。一周后他们开始一场新对话，也就是一个新线程，助手却已经忘了。checkpointer 只保存一个线程。要比线程活得更久的事实，需要另一个地方。

读完本节，你能在 store 里保存和搜索记忆，从工具里读取它们，并用命名空间把用户隔开。

## 条目与命名空间 {#s-stores-and-long-term-memory-items-and-namespaces}

**Store：** 按命名空间和键保存 JSON 条目的对象，由一个图的所有线程共享。`InMemoryStore`、`SqliteStore` 和 `PostgresStore` 都是 store。

**命名空间（namespace）：** 一个字符串元组，例如 `("users", "ada", "memories")`，用来给 store 里的条目分组。每个字符串是一个标签。

**条目（item）：** store 里的一个值，带有它的命名空间、键，以及创建和更新的时间。

long-term memory 页面以同样的方式在 store 上构建记忆 {{docs oss/python/langchain/long-term-memory}}。从 `langgraph.store.memory` 导入 `InMemoryStore`。stores 页面把这个名字链接到 `langchain_core.stores` 里的一个类，而那是另一种没有命名空间的键值存储 {{docs oss/python/langgraph/stores}}。本手册把这处混淆记为冲突 D106。

录制工具包为两个用户放入四个条目，并读回其中一个：

```listing
title: store 里的一个条目
source: capture/out/33-store.txt
lang: json
---
get:
{
  "__type__": "Item",
  "namespace": [
    "users",
    "ada",
    "memories"
  ],
  "key": "m1",
  "value": {
    "text": "prefers short answers"
  },
  "created_at": "<time>",
  "updated_at": "<time>"
}
```

`list_namespaces()` 列出三个命名空间。加上 `prefix=("users", "ada")` 时，只列出 `ada` 的那两个。加上 `max_depth=2` 时，每个命名空间被截成两个标签，列出 `("users", "ada")` 和 `("users", "grace")`。

## search 是前缀匹配 {#s-stores-and-long-term-memory-search-is-a-prefix-match}

`search(namespace_prefix)` 返回所有以该前缀开头的命名空间里的条目。stores 页面也这么说：前缀不是精确匹配 {{docs oss/python/langgraph/stores}}。对 `("users", "ada")` 的搜索，返回了 `memories` 和 `settings` 两处的条目：

```listing
title: 用两个标签的前缀搜索
source: capture/out/33-store.txt
lang: json
note: 值被截掉了。
---
search(('users', 'ada')):
[
  [
    [
      "users",
      "ada",
      "memories"
    ],
    "m1",
…
    [
      "users",
      "ada",
      "memories"
    ],
    "m2",
…
    [
      "users",
      "ada",
      "settings"
    ],
    "theme",
```

stores 页面补充说，结果的顺序取决于后端 {{docs oss/python/langgraph/stores}}。`filter` 在前缀之内匹配值，`delete` 删除一个条目，所以之后 `get` 返回 `null`。[图](#fig-5-4)画出了这些调用所遍历的树。

带 `index` 的 store 会在你指明的字段上增加语义搜索。录制工具包用 Ollama 上的 `nomic-embed-text`，`dims` 为 768，为 `ada` 的三个条目建了索引。查询 `works in Pune` 时，它自己的条目得分 1.0，`likes tea` 得分 0.350555。问题 `Which city is Ada's office in?` 没有指名任何条目，却仍然把 `works in Pune` 排第一，得分 0.484968，`likes tea` 排第二，得分 0.386065。

```figure
id: fig-5-4
kind: tree
title: 录制工具包 store 的命名空间
claim: 对 users 和 ada 的搜索覆盖 ada 下的两个命名空间，没有任何以完整标签结尾的前缀能碰到 grace 的条目。
caption: 从顶部的根开始读。每个方框是一个标签，命名空间下的每张卡片是一个条目，带它的键和值。阴影部分是用前缀 users, ada 搜索时返回的内容。来源：capture/out/33-store.txt 和 capture/lab/summary/stores-mac.json。
```

## 工具读取 store {#s-stores-and-long-term-memory-a-tool-reads-the-store}

`create_agent(..., store=store)` 通过 `ToolRuntime` 把 store 传给每个工具。录制工具包里的工具从运行上下文读取用户，并搜索这个用户的命名空间：

```listing
title: 一个读取 store 的工具
source: capture/s_persist.py
lang: python
---
    @tool
    def recall(runtime: ToolRuntime) -> str:
        """Recall what is known about the current user."""
        user = runtime.context["user"]
        return "; ".join(i.value["text"] for i in runtime.store.search(("users", user, "memories")))
```

```listing
title: 同一个工具对两个用户
source: capture/out/44-store-agent.txt
lang: text
note: 模型的回答被截掉了。
---
user ada: tool returned ['prefers short answers']
…
user grace: tool returned ['prefers long answers']
```

Qwen3 4B 在两次运行里都调用了 `recall`。它回答 Ada 说 `I know you prefer short answers.`，回答 Grace 时则用一段长回复讲她对长回答的偏好。

用户来自 `context`，由你的代码设置，绝不来自模型。如果模型能在工具参数里指定用户，它就能读取别的用户的条目。每次运行还对字段 `context` 给出了 `PydanticSerializationUnexpectedValue` 警告，因为这个 agent 没有为这个字典设置 `context_schema`。警告没有改变结果。

## 命名空间隔离 {#s-stores-and-long-term-memory-namespace-isolation}

**我们测得**隔离效果，环境是 Mac，Apple M1 Max，10 核，64 GiB，每个查询运行一次。用的 store 是 `InMemoryStore`、`SqliteStore` 和 PostgreSQL 14 上的 `PostgresStore`。八个用户在 `("users", <user>, "memories")` 下各有一个条目。其中五个用户 id 是 SQL `LIKE` 和 SQLite `GLOB` 的特殊字符：`a_ice`、`%`、`*`、`al?ce` 和 `[a]lice`。对每个用户和每个 store，用该用户的前缀搜索，只返回该用户的条目：24 次搜索中有 0 次越过了用户。

同样的运行找到了四处隔离取决于你的代码的地方：

- `list_namespaces(prefix=("users", "*"))` 在三种 store 里都列出了所有用户的命名空间。`*` 在 `list_namespaces` 里是通配符，在 `search` 里是普通字符。用 `*` 构造前缀之前，先拒绝用户 id 为 `*` 的请求。
- 用空前缀的 `search(())` 返回了所有用户的条目：`InMemoryStore` 里 9 个，另外两种里 8 个。绝不要用比用户标签更短的前缀去搜索。
- 只有一部分标签什么也匹配不到：`("users", "ali")` 碰不到 `alice`。针对安全通告 GHSA-47pj-3jcm-6whg 的修复在锁定版本上有效。
- 带 `.` 的标签在 `put` 和 `get` 里被 `InvalidNamespaceError` 拒绝。`SqliteStore` 和 `PostgresStore` 在 `batch` 里也拒绝它。`InMemoryStore` 通过 `batch` 存下了 `("users", "bob.x")`，而对 `("users", "alice.memories")` 的 `GetOp` 创建了一个空的命名空间。没有任何条目越过用户。

过滤器始终在它的前缀之内。`search(("users", "bob"), filter={"owner": "alice"})` 什么也没返回。语义搜索同样留在它的前缀之内。用 Ollama 上的 `nomic-embed-text`，一个与 `alice` 的条目最匹配的查询，在 `bob` 的前缀下只返回了 `bob` 的条目。

## Deep Agents 的记忆文件与命名空间工厂 {#s-stores-and-long-term-memory-deep-agents-memory-files-and-the-namespace-factory}


deep agent 把记忆当作文件来读写。`CompositeBackend` 把 `/memories/` 下的路径交给 `StoreBackend`，`StoreBackend` 把每个文件保存为一个 store 条目。每个条目的命名空间来自你传入的工厂，agent 的工具从不选择它 {{code libs/deepagents/deepagents/backends/store.py:98-168}}。

**StoreBackend：** 一个 Deep Agents 后端，把文件保存在 LangGraph store 里，命名空间由工厂为每次运行返回。

在锁定版本上，工厂是必需的。`StoreBackend(store=s)` 抛出了 `TypeError: missing 1 required keyword-only argument: 'namespace'`。backends 页面仍然说，没有工厂时，旧的默认值读取 `assistant_id`，所以一个助手的所有用户共享存储 {{docs oss/python/deepagents/backends}}。这个默认值在 0.7.38 里已经不存在，本手册把这个页面记为已过时。

同一页面的组合示例传入 `namespace=lambda _rt: ("memories",)`。这是整个 agent 所有用户共用的一个命名空间。把它抄进有很多用户的服务，每个用户的 agent 都会读到其他所有人的文件。

**我们测得**这一点，用的是一个真实的 agent。一个 deep agent 用 Qwen3 8B，在 Mac 上的 Ollama 里，温度为 0，`/memories/` 放在 `StoreBackend` 上。每个会话里，Alice 让它把一个储物柜密码存到 `/memories/notes.md`。然后 Bob 在一个新线程里，要求它读取 `/memories/` 下的任何储物柜密码。每个会话用一个全新的 store，我们对 `InMemoryStore` 和 PostgreSQL 14 上的 `PostgresStore`，每种配置各运行 10 个会话。Alice 的保存在全部 80 个会话里都成功了。

[图](#fig-5-4b)显示了每个会话：

- **文档里的工厂，`("memories",)`。** Bob 的 agent 调用了 `ls` 和 `read_file`，并告诉了他 Alice 的密码，每种 store 的 10 个会话里 10 次。
- **每个用户一个工厂，`("users", rt.context.user_id)`。** Bob 的 agent 列出一个空文件夹，并告诉他没有密码，每种 store 的 10 个会话里 10 次。
- **同一个工厂，加上一个搜索 `("users",)` 的 `recall` 工具。** 这是[命名空间隔离](#s-stores-and-long-term-memory)里那个幼稚的工具：前缀少了一个标签。问到 `/memories/` 时，模型只用了 `ls`，20 个会话里什么也没泄露。被要求使用它的 recall 工具时，它调用了 `recall`，并告诉 Bob Alice 的密码，每种 store 的 10 个会话里 10 次。

```figure
id: fig-5-4b
kind: chart
title: 两个用户，一个 deep agent，以及记忆文件放在哪里
claim: 固定的命名空间在 20 个会话里 20 次把 Alice 的密码给了 Bob，每个用户一个的工厂是 20 次里 0 次。
caption: 每个会话一个方块，Mac 上的 Qwen3 8B，温度 0，每个会话一个全新的 store，每行 10 个会话。玫红色表示 Bob 的回答里有 Alice 的密码的会话。来源：capture/lab/summary/store-namespace-mac.json。
```

recall 的结果是这张图的教训。按用户分开的文件后端把用户隔开了。一个搜索了更短前缀的工具把这一切推翻，而且用户一点名，模型就用了那个工具。模型是否泄露取决于 prompt，所以要测试数据路径，不能只测试回答。再看一个会话：Bob 让 agent“检查你的长期记忆”，没有点名 `/memories/`。它没有调用任何工具，说自己没有记忆。

工厂从运行上下文里读取用户，而上下文由你的代码设置。给 agent 一个 `context_schema`，并在每次调用时传入用户：

```listing
title: 每个用户一个的命名空间工厂
source: capture/lab/T23-sec-store-namespace-mac/code/store6_agent.py
lang: python
note: 从运行代码里截出的四处。cfg["ns"] 是每用户配置里的 lambda。
---
class Ctx:
    user_id: str
…
    "per-user": {"ns": lambda rt: ("users", rt.context.user_id), "recall": False, …},
…
    backend = CompositeBackend(default=StateBackend(), routes={"/memories/": StoreBackend(namespace=cfg["ns"])})
…
    agent = create_deep_agent(model=model, backend=backend, store=store, context_schema=Ctx, system_prompt=SYSTEM, tools=tools, checkpointer=InMemorySaver())
…
                                    context=Ctx(user_id=user), stream_mode="updates", subgraphs=True):
```

有两个校验器检查命名空间，而且它们不一致。`StoreBackend` 允许字母、数字和 `-_.@+:~`，并拒绝了 `*` {{code libs/deepagents/deepagents/backends/store.py:44-87}}。store 本身则拒绝任何标签里的 `.`。所以返回电子邮件地址（例如 `carol@acme.com`）的工厂，通过了第一道检查，却在写入时以 `InvalidNamespaceError` 失败，两种 store 都是如此。文档建议用 `rt.server_info.user.identity` 作标签。如果你的身份标识是电子邮件地址，先把每个地址映射成不含句点的标签。

我们还对[命名空间隔离](#s-stores-and-long-term-memory)里的原始 store 调用又运行了一遍，在 `InMemoryStore` 和 `PostgresStore` 上各一次。Alice 和 Bob 位于 `("users", <user>, ...)` 之下时，这些调用返回了两个用户的条目或命名空间：`search(("users",))`、`search(())`、`list_namespaces()` 和 `list_namespaces(prefix=("users", "*"))`。`search(("users", "*", "memories"))` 什么也没返回，因为 `*` 只在 `list_namespaces` 里是通配符。

## SqliteStore 的两处缺陷 {#s-stores-and-long-term-memory-two-defects-of-sqlitestore}

同样的运行在 `SqliteStore` 3.1.3 里找到两处缺陷。它们改变 store 保存什么、嵌入什么，没有越过任何用户。

- `delete` 之后，条目行没了，它在 `store_vectors` 里的行还在：删除前 2 行，删除后 2 行。这张表声明了 `ON DELETE CASCADE`，而 `SqliteStore` 从不打开 SQLite 的外键，所以级联不会执行。这是 issue #8757，在锁定版本上仍然开着 {{issue 8757}}。搜索不再返回这个条目。
- `SqliteStore` 从键 `text_fields` 读取索引字段。`InMemoryStore`、`PostgresStore` 和 `SqliteStore` 的文档字符串都用 `fields` {{code libs/checkpoint-sqlite/langgraph/store/sqlite/base.py}}。用 `fields=["text"]` 时，`SqliteStore` 嵌入了整个条目，它的向量行里字段是 `$`。

```listing
title: 删除之后留下的向量行
source: capture/lab/T14-stores-mac/05-orphan-vectors.txt
lang: text
---
users.alice.memories|k1|$|3072
users.bob.memories|k1|$|3072
```

带索引的 `PostgresStore` 需要 pgvector，而我们的 Postgres 没有它。那次运行，以及 Agent Server 的 store 权限，会在下一版出现，见[第 8.8 节](#s-limits-at-the-pin-and-what-comes-in-the-next-edition)。

```takeaways
- 对寿命超过线程的事实使用 store，对线程本身使用 checkpointer。
- 在你的代码里从 context 取用户 id，绝不从工具参数取。
- 每个前缀都构造到用户标签为止，绝不用空前缀搜索。
- 在用户 id 变成标签之前，拒绝 * 或含句点的用户 id。
- 把搜索结果当作由后端排序，顺序重要时自己排序。
- 在 SqliteStore 里删除条目之后，自己删除向量行。
- 给每个 StoreBackend 配一个从运行上下文读取用户 id 的工厂，绝不用常量。
- 把你写的每个记忆工具，限定在与文件后端相同的完整前缀上。
- 在电子邮件 id 进入命名空间之前，把它映射成不含句点的标签。
```

来源：capture/s_persist.py, capture/out/33-store.txt, capture/out/44-store-agent.txt; capture/lab/summary/stores-mac.json, capture/lab/T14-stores-mac/01-memory-sqlite.jsonl, capture/lab/T14-stores-mac/02-inmemory-getop-side-effect.txt, capture/lab/T14-stores-mac/03-postgres.jsonl, capture/lab/T14-stores-mac/04-index.jsonl, capture/lab/T14-stores-mac/05-orphan-vectors.txt; libs/checkpoint/langgraph/store/base/__init__.py, libs/checkpoint/langgraph/store/memory/__init__.py, libs/checkpoint-sqlite/langgraph/store/sqlite/base.py, and libs/checkpoint-postgres/langgraph/store/postgres/base.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/stores, oss/python/langchain/long-term-memory); GitHub issue langchain-ai/langgraph#8757 and advisories GHSA-47pj-3jcm-6whg and GHSA-6hmw-9432-67qq; capture/lab/summary/store-namespace-mac.json, capture/lab/T23-sec-store-namespace-mac/store6_free.json, capture/lab/T23-sec-store-namespace-mac/store6-agent-memory.jsonl, capture/lab/T23-sec-store-namespace-mac/store6-agent-postgres.jsonl; libs/deepagents/deepagents/backends/store.py at deepagents 0.7.38; docs.langchain.com at docs commit 04d4d4a (oss/python/deepagents/backends).
