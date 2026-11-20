# checkpointer 与 store 的 API

> checkpointer 以 `thread_id` 为键，逐步保存一个线程的状态；store 按命名空间跨线程保存 JSON 条目；在锁定版本下，两者各有三种后端。

这些类位于 `langgraph-checkpoint` 4.3.2、`langgraph-checkpoint-sqlite` 3.1.3 和 `langgraph-checkpoint-postgres` 3.2.1，均来自 1.2.22 版的 `langgraph` 仓库。下文的路径都从该仓库的 `libs/` 开始。[第 5.2 节](#s-checkpointers-and-threads)运行了各个 checkpointer，[第 5.4 节](#s-stores-and-long-term-memory)运行了各个 store。

## checkpointer {#s-ref-checkpointer-and-store-api-the-checkpointers}

| 类 | 导入路径 | 行号 | 说明 |
|---|---|---|---|
| `InMemorySaver` | `langgraph.checkpoint.memory` | `checkpoint/.../memory/__init__.py:34` | 仅在一个进程内有效。`MemorySaver` 是同一个类的旧名，在第 634 行 |
| `SqliteSaver` | `langgraph.checkpoint.sqlite` | `checkpoint-sqlite/.../sqlite/__init__.py:49` | `from_conn_string` 在第 104 行，`setup` 在第 134 行 |
| `AsyncSqliteSaver` | `langgraph.checkpoint.sqlite.aio` | `checkpoint-sqlite/.../sqlite/aio.py:49` | `setup` 在第 317 行 |
| `PostgresSaver` | `langgraph.checkpoint.postgres` | `checkpoint-postgres/.../postgres/__init__.py:45` | `from_conn_string` 在第 69 行，`setup` 在第 90 行 |
| `AsyncPostgresSaver` | `langgraph.checkpoint.postgres.aio` | `checkpoint-postgres/.../postgres/aio.py:45` | `setup` 在第 95 行 |

{{code checkpoint/langgraph/checkpoint/memory/__init__.py:34}} {{code checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py:49-134}} {{code checkpoint-postgres/langgraph/checkpoint/postgres/__init__.py:45-90}}

每个类都是 `BaseCheckpointSaver` 的子类 {{code checkpoint/langgraph/checkpoint/base/__init__.py:199}}。每个方法都有一个异步孪生方法，名字前面加一个 `a`。

| 方法 | 作用 | 行号 |
|---|---|---|
| `get_tuple(config)` | 返回配置所指定的 `CheckpointTuple`，或该线程最新的一个 | 262 |
| `list(config, ...)` | 返回一个线程的检查点，最新的在前 | 277 |
| `put(config, checkpoint, metadata, new_versions)` | 保存一个检查点 | 301 |
| `put_writes(config, writes, task_id)` | 保存一个任务的待写入内容 | 324 |
| `delete_thread(thread_id)` | 删除一个线程的所有检查点和写入 | 344 |
| `get_next_version(current, channel)` | 返回一个通道的下一个版本 | 721 |

## 磁盘上的表 {#s-ref-checkpointer-and-store-api-tables-on-disk}

`setup()` 负责创建这些表。在新数据库上第一次运行之前，调用它一次。

| Saver | 表 |
|---|---|
| `SqliteSaver` | `checkpoints`, `writes` {{code checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py:147-157}} |
| `PostgresSaver` | `checkpoint_migrations`, `checkpoints`, `checkpoint_blobs`, `checkpoint_writes` {{code checkpoint-postgres/langgraph/checkpoint/postgres/base.py:47-69}} |

## 记录类型 {#s-ref-checkpointer-and-store-api-records}

| 类型 | 字段 | 行号 |
|---|---|---|
| `CheckpointTuple` | `config`, `checkpoint`, `metadata`, `parent_config`, `pending_writes` | `base/__init__.py:140` |
| `Checkpoint` | `v`, `id`, `ts`, `channel_values`, `channel_versions`, `versions_seen`, `updated_channels` | `base/__init__.py:93` |
| `CheckpointMetadata` | `source`, `step`, `parents` | `base/__init__.py:39` |
| `StateSnapshot` | `values`, `next`, `config`, `metadata`, `created_at`, `parent_config`, `tasks`, `interrupts` | `langgraph/langgraph/types.py:721` |

{{code checkpoint/langgraph/checkpoint/base/__init__.py:39-150}} {{code langgraph/langgraph/types.py:721-746}}

`source` 取值为 `input`、`loop`、`update` 或 `fork`。输入检查点的 `step` 是 `-1`，循环中的第一个检查点是 `0`。录制文件 `30-state-history-forks.txt` 展示了 `input`、`loop` 和 `update`，[第 6.6 节](#s-time-travel-replay-update-state-and-forks)的实验记录重放展示了 `fork`。

## 线程的配置键 {#s-ref-checkpointer-and-store-api-config-keys-of-a-thread}

| `configurable` 中的键 | 含义 |
|---|---|
| `thread_id` | 线程。出现新值时，在第一个检查点处开启一个新线程 |
| `checkpoint_id` | 线程中的一个检查点，用于重放或分叉 |
| `checkpoint_ns` | 子图的命名空间。空字符串表示顶层图 |

带 checkpointer 的图，在运行配置完全没有 `configurable` 条目时会抛出 `ValueError` {{code langgraph/langgraph/pregel/main.py:2701-2705}}. `configurable` 里有其他键时能通过这项检查，但会在之后失败，例如 `KeyError: 'checkpoint_ns'`。错误文本见[错误参考](#s-ref-errors)。

## 已编译图的状态方法 {#s-ref-checkpointer-and-store-api-state-methods-of-a-compiled-graph}

| 方法 | 作用 | 在 `pregel/main.py` 中的行号 |
|---|---|---|
| `get_state(config)` | 返回最新检查点或指定检查点的 `StateSnapshot` | 1479 |
| `get_state_history(config)` | 产出一个线程的快照，最新的在前 | 1529 |
| `update_state(config, values, as_node=None)` | 写入一个新检查点，就像某个节点返回了 `values` 一样 | 2636 |
| `bulk_update_state(config, supersteps)` | 按顺序写入多个更新 | 1634 |

{{code langgraph/langgraph/pregel/main.py:1479-2636}}

## 持久性 {#s-ref-checkpointer-and-store-api-durability}

`Durability` 取值为 `sync`、`async` 或 `exit` {{code langgraph/langgraph/types.py:99}}. 默认是 `async` {{code langgraph/langgraph/pregel/main.py:2715}}. 旧参数 `checkpoint_during` 仍然可用，但会发出警告：`True` 对应 `async`，`False` 对应 `exit` {{code langgraph/langgraph/pregel/main.py:2837-2847}}. [第 5.3 节](#s-durability-modes-and-a-crash-between-two-steps)说明每种模式在崩溃前保存了什么。

## 子图的 checkpointer {#s-ref-checkpointer-and-store-api-checkpointers-of-a-subgraph}

`compile` 的 `checkpointer` 参数接受 `None`、`True`、`False` 或一个 saver {{code langgraph/langgraph/types.py:110}}. `None` 继承父图的 saver，`True` 让子图的状态跨调用保留，`False` 关闭检查点。[第 6.7 节](#s-subgraphs-and-multi-agent-patterns)描述了这三种取值。

## store {#s-ref-checkpointer-and-store-api-the-stores}

| 类 | 导入路径 | 行号 | 说明 |
|---|---|---|---|
| `InMemoryStore` | `langgraph.store.memory` | `checkpoint/.../store/memory/__init__.py:136` | `index=None` 在第 183 行 |
| `SqliteStore` | `langgraph.store.sqlite` | `checkpoint-sqlite/.../store/sqlite/base.py:789` | `from_conn_string` 在第 1014 行，`setup` 在第 1064 行 |
| `PostgresStore` | `langgraph.store.postgres` | `checkpoint-postgres/.../store/postgres/base.py:668` | `from_conn_string` 在第 784 行，`setup` 在第 1121 行。建索引需要 pgvector |

{{code checkpoint/langgraph/store/memory/__init__.py:136-183}} {{code checkpoint-sqlite/langgraph/store/sqlite/base.py:789-1064}} {{code checkpoint-postgres/langgraph/store/postgres/base.py:668-1121}}

`langchain_core.stores` 里的 `InMemoryStore` 是另一个类，是不带命名空间的键值存储。冲突登记把指向它的文档链接记为 D106。

每个 store 都是 `BaseStore` 的子类 {{code checkpoint/langgraph/store/base/__init__.py:708}}。每个方法都有一个异步孪生方法，名字前面加一个 `a`。

| 方法 | 参数与默认值 | 行号 |
|---|---|---|
| `get` | `namespace`, `key`, `refresh_ttl=None` | 756 |
| `search` | `namespace_prefix`，然后是 `query=None`, `filter=None`, `limit=10`, `offset=0`, `refresh_ttl=None` | 784 |
| `put` | `namespace`, `key`, `value`, `index=None`, `ttl` | 866 |
| `delete` | `namespace`, `key` | 952 |
| `list_namespaces` | `prefix=None`, `suffix=None`, `max_depth=None`, `limit=100`, `offset=0` | 966 |
| `batch` | 一个操作列表 | 733 |

{{code checkpoint/langgraph/store/base/__init__.py:733-980}}

`Item` 含 `value`、`key`、`namespace`、`created_at` 和 `updated_at`。`SearchItem` 多一个 `score` {{code checkpoint/langgraph/store/base/__init__.py:51-151}}. `IndexConfig` 设置嵌入、嵌入的维度和要嵌入的字段，`TTLConfig` 设置过期时间 {{code checkpoint/langgraph/store/base/__init__.py:545-578}}.

命名空间的标签不能为空，也不能包含句点或 NUL 字节。每种情况都会抛出 `InvalidNamespaceError` {{code checkpoint/langgraph/store/base/__init__.py:1317-1341}}.

| Store | 表 |
|---|---|
| `SqliteStore` | `store`, `store_vectors`, `store_migrations`, `vector_migrations` {{code checkpoint-sqlite/langgraph/store/sqlite/base.py:44-1106}} |
| `PostgresStore` | `store`、`store_vectors` 及其迁移表 {{code checkpoint-postgres/langgraph/store/postgres/base.py:66-1132}} |

## 序列化器 {#s-ref-checkpointer-and-store-api-the-serializer}

两种 saver 默认都使用 `JsonPlusSerializer` {{code checkpoint/langgraph/checkpoint/serde/jsonplus.py:104}}. `EncryptedSerializer` 用 AES 包装它，并从 `LANGGRAPH_AES_KEY` 读取密钥 {{code checkpoint/langgraph/checkpoint/serde/encrypted.py:54-59}}. [第 5.6 节](#s-serialization-of-state-and-what-does-not-round-trip)说明哪些值取回后会发生变化。

来源：libs/checkpoint/langgraph/checkpoint/base/__init__.py, libs/checkpoint/langgraph/checkpoint/memory/__init__.py, libs/checkpoint/langgraph/store/base/__init__.py, libs/checkpoint/langgraph/store/memory/__init__.py, libs/checkpoint/langgraph/checkpoint/serde/jsonplus.py, libs/checkpoint/langgraph/checkpoint/serde/encrypted.py, libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py, libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/aio.py, libs/checkpoint-sqlite/langgraph/store/sqlite/base.py, libs/checkpoint-postgres/langgraph/checkpoint/postgres/__init__.py, libs/checkpoint-postgres/langgraph/checkpoint/postgres/aio.py, libs/checkpoint-postgres/langgraph/checkpoint/postgres/base.py, libs/checkpoint-postgres/langgraph/store/postgres/base.py, libs/langgraph/langgraph/types.py，以及 libs/langgraph/langgraph/pregel/main.py（langgraph 1.2.22）； capture/out/28-checkpoint-memory.txt, capture/out/29-checkpoint-sqlite.txt, capture/out/30-state-history-forks.txt, capture/out/33-store.txt.
