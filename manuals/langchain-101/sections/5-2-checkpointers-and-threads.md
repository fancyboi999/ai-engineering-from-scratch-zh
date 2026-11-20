# Checkpointer 与线程：短期记忆

> checkpointer 在每一步之后保存线程的状态，所以同一个 `thread_id` 的下一轮会从最后一个检查点开始，重启之后也一样。

你在 `create_agent` 上搭了一个聊天应用，用户问“我问了你什么？”。agent 毫无头绪，因为每次 `invoke` 都从空状态开始。原因不在模型。除非有东西保存状态，否则 agent 在两次运行之间什么都留不下。

读完本节，你能给 agent 加上短期记忆、读取一个检查点，并为很多线程估算 Postgres saver 的规模。

## 跨两轮的一个线程 {#s-checkpointers-and-threads-a-thread-across-two-turns}

**Checkpointer：** 在每一步之后保存图状态，并在下一次运行开始时加载最新检查点的对象。`InMemorySaver`、`SqliteSaver` 和 `PostgresSaver` 都是 checkpointer。

**线程（thread）：** 保存在同一个 `thread_id` 下的一系列检查点。线程就是对话，线程上的每次 `invoke` 是一轮。

录制工具包在线程 `memory-thread` 上运行两轮：

```listing
title: 一个线程上的两轮
source: capture/s_persist.py
lang: python
---
def two_turns(cap, checkpointer, name):
    m = llm(name)
    agent = create_agent(m, tools=[add], checkpointer=checkpointer)
    cfg = thread(name)
    agent.invoke(ask("What is 2 + 3?"), cfg)
    out = agent.invoke(ask("What did I ask you?"), cfg)
```

第二轮只传了一条新消息。模型拿到的，是它前面的整个第一轮：

```listing
title: 模型在第 2 轮收到的内容
source: capture/out/28-checkpoint-memory.txt
lang: json
---
what the model received on turn 2:
[
  "human: What is 2 + 3?",
  "ai: calls add",
  "tool: 5",
  "ai: 2 + 3 = 5.",
  "human: What did I ask you?"
]
```

Qwen3 4B 回答了 `You asked what 2 + 3 is, and I calculated that it equals 5.`。

所以短期记忆就是检查点里的消息列表。`add_messages` reducer 把新的 human 消息追加进去，每次模型调用都会拿到全部消息。长线程的成本在[第 5.5 节](#s-context-engineering-and-summarization)。

在 checkpointer 上运行需要 `thread_id`。没有它，agent 在运行之前就会抛出错误：

```listing
title: 没有 thread_id 的 checkpointer
source: capture/out/28-checkpoint-memory.txt
lang: text
---
raised builtins.ValueError: Checkpointer requires one or more of the following 'configurable' keys: thread_id, checkpoint_ns, checkpoint_id
```

新的 `thread_id` 从空开始。在录制工具包里，同一个 saver 上的第二个 agent 使用线程 `other-thread`，只看到自己的问题。问它 `What did I ask you?`，模型说这是它们的第一次交流。`delete_thread("memory-thread")` 删掉了第一个线程的全部 8 个检查点。

你不需要先创建线程，第一个检查点会创建它。checkpointers 页面说线程必须在运行前创建，这条规则属于 Agent Server API {{docs oss/python/langgraph/checkpointers}}。本手册把这处分歧记为冲突 D118。

## 检查点里有什么 {#s-checkpointers-and-threads-what-a-checkpoint-holds}

**检查点元组（checkpoint tuple）：** checkpointer 为一个检查点返回的内容：它的 `config`、`metadata`、`checkpoint` 本身、父检查点的 config，以及待写入项。

```listing
title: 线程的最新检查点
source: capture/out/28-checkpoint-memory.txt
lang: json
note: 通道版本被截掉。
---
{
  "config": {
    "configurable": {
      "thread_id": "memory-thread",
      "checkpoint_ns": "",
      "checkpoint_id": "<uuid-1>"
    }
  },
  "metadata": {
    "source": "loop",
    "step": 6,
    "parents": {},
    "ls_integration": "langchain_create_agent"
  },
  "checkpoint keys": [
    "channel_values",
    "channel_versions",
    "id",
    "ts",
    "updated_channels",
    "v",
    "versions_seen"
  ],
  "channel_values keys": [
    "__pregel_tasks",
    "messages"
  ],
…
  "v": 4
}
```

`channel_values` 保存状态，这里是 `messages` 列表。`channel_versions` 和 `versions_seen` 告诉循环哪些节点有了新输入，所以恢复时会运行正确的下一个节点。`checkpoint_ns` 对顶层图是空的，在子图里则是父节点的名字。

## 跨重启的 SqliteSaver {#s-checkpointers-and-threads-sqlitesaver-across-a-restart}

`InMemorySaver` 把检查点放在进程里。persistence 页面说，进程重启时它们就没了 {{docs oss/python/langgraph/persistence}}。只在测试里用它。文件或数据库才能让线程在重启后仍然存在。录制工具包在 `SqliteSaver` 上运行两轮，关闭连接，再用一个新 agent 重新打开这个文件：

```listing
title: 重新打开文件并继续线程
source: capture/s_persist.py
lang: python
---
    with SqliteSaver.from_conn_string(path) as saver:
        agent = create_agent(llm("after-restart"), tools=[add], checkpointer=saver)
        out = agent.invoke(ask("Remind me what my first question was."), thread("sqlite-thread"))
```

第三轮拿到了前面全部六条消息，模型回答了 `Your first question was, "What is 2 + 3?"`。文件里有两张表，`checkpoints` 和 `writes`：

```listing
title: 三轮之后的两张表
source: capture/out/29-checkpoint-sqlite.txt
lang: text
---
checkpoints: 11 rows, columns ['thread_id', 'checkpoint_ns', 'checkpoint_id', 'parent_checkpoint_id', 'type', 'checkpoint', 'metadata']

writes: 13 rows, columns ['thread_id', 'checkpoint_ns', 'checkpoint_id', 'task_id', 'task_path', 'idx', 'channel', 'type', 'value']
```

**待写入项（pending write）：** 任务在一步中写出的值，保存在 `writes` 表里，归在这一步开始时所基于的检查点之下。恢复时，LangGraph 应用最后一个检查点的待写入项，不再重新运行这些任务。

任务一结束，循环就在后台保存它的每个待写入项，并且不等这次调用返回 {{code libs/langgraph/langgraph/pregel/_loop.py:523-551}}。所以待写入项可能在它所属那一步的检查点之后才到达 saver。[第 2.3 节](#s-the-checkpoint-write-path-and-durability)的一条追踪显示，在 `SqliteSaver` 和 `durability="sync"` 下，一次模型写入在该检查点之后才保存。这个顺序无害，因为检查点已经包含了这个值。真正要紧的窗口出现在一步的更早阶段，[第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)测量了它。

每一轮都以 `source` 为 `input` 的检查点开始，步数在各轮之间继续累加。[图](#fig-5-2)画出了这 11 行。

```figure
id: fig-5-2
kind: timeline
title: SQLite 文件里一个线程的三轮
claim: 每一轮先增加一个输入检查点，再每步增加一个循环检查点，步号在各轮和重启之间持续累加。
caption: 沿步轴从左向右读。每个标记是 checkpoints 表的一行。琥珀色标记是输入检查点，青色标记是循环检查点。来源：capture/out/29-checkpoint-sqlite.txt。
```

每一行的 `type` 都是 `msgpack`。那是检查点的序列化器，[第 5.6 节](#s-serialization-of-state-and-what-does-not-round-trip)会说明它保留了什么。

## 一个 Postgres saver 上的很多线程 {#s-checkpointers-and-threads-many-threads-on-one-postgres-saver}

服务器在一个 checkpointer 上同时运行很多线程。问题是它需要多少个连接。

**我们测得**这一点，环境是 x86 服务器客户机，32 vCPU、48 GiB，用 PostgreSQL 16.15 上的 `AsyncPostgresSaver`，以及 CPU 上 Ollama 里的 Qwen3 4B。一个 asyncio 进程同时运行 1、4、16 和 64 个线程，每个单元格运行两次，分别用一个连接和一个 20 个连接的池。每个线程运行两次 agent，每次两个模型调用和一个工具调用。全部 680 次运行都答对了，0 个错误。节奏由模型决定：从 4 个线程起，每个单元格都是每秒 0.42 到 0.44 次模型调用。所以 64 个线程各两次运行，用一个连接和用池都花了 587 到 589 秒。

saver 的中位数一直很快。每个单元格里，`aput` 用了 2.8 到 4.5 毫秒，`aput_writes` 用了 3.7 到 5.8 毫秒。在 64 个线程时，`aput` 的 p99 在一个连接下是 318 和 450 毫秒，在池下是 254 和 273 毫秒。这些时间由客户端测得，所以包含事件循环的等待。把它们当作客户端 p99 值，不要把两种配置之间的差距解读成池的效果。池最多打开了 21 个连接，一次采样中最多 3 个处于活跃状态。

```figure
id: fig-5-2b
kind: chart
title: 一个 AsyncPostgresSaver 上，按线程数划分的每秒运行数和检查点写入 p99
claim: 一个连接和 20 个连接的池，在 64 个线程、Qwen3 4B 下都是每秒 0.22 次运行，aput 的 p99 也区分不出两者。
caption: 每个点是一次运行，每个位置两次运行。每条线连接一种连接配置的均值。左图是每秒运行数，右图是 aput 的 p99，单位毫秒，对数刻度。x 轴是同时运行的线程数，对数刻度。来源：capture/lab/summary/concurrency-x86-real.json。
```

模型跑在 CPU 上时，吞吐量远在 saver 之前就被模型限制了。池的大小按同时运行的线程数来定。我们的 p99 数据没有显示池能降低检查点写入的尾部延迟。在仍在运行的线程上再发第二次运行，是另一个问题，叫双重发消息（double texting），[第 8.1 节](#s-agent-server-langgraph-dev-up-and-deploy)在 Agent Server 上讲它。

```takeaways
- 传入 checkpointer，并在对话的每一轮使用同一个 thread_id。
- InMemorySaver 只用于测试，因为重启会丢掉它的线程。
- 用新的 thread_id 开始新线程，用 delete_thread 删除线程。
- 读 channel_values 获取状态，读 metadata 里的 step 和 source 获取线程中的位置。
- AsyncPostgresSaver 使用连接池，并预期限制吞吐量的是模型，而不是 saver。
```

来源：capture/s_persist.py, capture/common.py, capture/out/28-checkpoint-memory.txt, capture/out/29-checkpoint-sqlite.txt; capture/lab/summary/concurrency-x86-real.json, capture/lab/T16-concurrency-x86-real/01-levels.jsonl, capture/lab/T16-concurrency-x86-real/t16r_conc.py, capture/lab/internals/03-checkpoint/trace.txt; libs/langgraph/langgraph/pregel/_loop.py at langgraph 1.2.22; libs/checkpoint/langgraph/checkpoint/base/__init__.py, libs/checkpoint/langgraph/checkpoint/memory/__init__.py, and libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py at langgraph 1.2.22; docs.langchain.com at docs commit 04d4d4a (oss/python/langgraph/persistence, oss/python/langgraph/checkpointers, oss/python/langchain/short-term-memory).
