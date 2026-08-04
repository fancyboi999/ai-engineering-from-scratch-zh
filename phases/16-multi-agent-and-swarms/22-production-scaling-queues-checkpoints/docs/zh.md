# 生产环境扩展 —— 队列、检查点、持久性

> 把多 agent 系统扩展到数千个并发运行需要**持久化执行（durable execution）**：工作队列加检查点，并配套正确的租约处理、幂等副作用与确定性重放，使任何 worker 都能在任何崩溃后恢复任意运行。LangGraph 的运行时是参考例子：它在每个 super-step 之后按 `thread_id` 写一个检查点（默认 Postgres）；worker 崩溃会释放租约，另一个 worker 接着恢复。agent 能无限期沉睡，等待人类输入。**MegaAgent**（arXiv:2408.09955）为每个 agent 运行生产者-消费者队列，带三个状态（Idle / Processing / Response）和两层协调（组内聊天 + 组间管理聊天）。**Fiber/async** 在 LLM 流式上优于「每任务一线程」：线程 99% 的时间都在等待 token，fiber 则在 I/O 上协作式让出。反方观点是，在负载证明你需要更多之前，坚持 **FastAPI + Postgres，别的都不要**。本课会构建检查点日志、带状态转移的每 agent 工作队列和 async-vs-thread 演示，并落实「从简开始」规则。

**类型：** Learn + Build
**语言：** Python（标准库，`asyncio`、`sqlite3`）
**前置要求：** Phase 16 · 09（并行 Swarm 网络）、Phase 16 · 13（共享内存）
**预计时间：** ~75 分钟

## 问题背景

一个原型多 agent 系统在一台笔记本上、用内存里的事件循环、跑三个 agent 时工作正常。你挪到生产：

- agent 有时一跑就是几小时（长调研、human-in-the-loop 等待）。
- worker 进程崩溃。重启就丢状态。
- 峰值负载是平均的 10 倍；你需要横向扩展。
- 用户按 agent-run 付费；你需要恰好一次（exactly-once）的计费语义。

内存事件循环这些一样都做不到。你需要底下有一个持久化执行层。2026 年的标准选项是：

1. 带检查点的工作流引擎（Temporal、LangGraph 运行时）。
2. 带状态存储的消息队列（Postgres + SQS/RabbitMQ）。
3. actor 模型框架（MegaAgent 每 agent 的生产者-消费者）。
4. 手搓的 FastAPI + Postgres（Bedi 的主张）。

本课构建每一种的微缩版。

## 核心概念

### 持久化执行，这个模式

一个持久化执行引擎在每个「步骤」（LangGraph 的术语里叫 super-step）之后持久化完整程序状态。崩溃时：

```
worker 在某步骤中途崩溃
  -> 租约超时
  -> 另一个 worker 接管这个 thread_id
  -> 从最后的检查点恢复
  -> 无重复副作用
```

要让这个工作，需要：

- **可序列化的状态。** 所有 agent 状态都得能持久化。带着活数据库连接的函数闭包活不下来。
- **确定性恢复。** 给定相同状态和相同输入，agent 产出相同的动作（或对 LLM 调用交给外部确定性 oracle）。
- **幂等的副作用。** 外部调用（工具调用、支付）必须幂等，或用一个去重键。

LangGraph 在每个 super-step 后写检查点；Temporal 在每个 activity 后写；Restate 用事件溯源日志。三者实现同一个模式。

### 每步一个检查点的运行时

这里以 LangGraph 运行时为例：每个 agent 有一个 `thread_id`，状态是类型化 dict，每个 super-step 往 checkpoints 表写一行。恢复时从最后的检查点回放，而不是从头来。agent 能 `interrupt()` 来等待人类输入；运行时持久化并释放 worker。输入到达时，任何 worker 都能恢复。

这是 2026 年 4 月的参考生产设计。

### MegaAgent 的每 agent 队列

arXiv:2408.09955 描述了一个规模实验：一个集群里数千个并发 agent。架构：

```
agent i:
  state ∈ {Idle, Processing, Response}
  in_queue   <- 发给 agent i 的消息
  out_queue  -> 回复 + 副作用

coordinators:
  组内聊天        （同一组里的 agent）
  组间管理聊天     （高层路由）
```

两层协调让组内对话密集发生，而组间保持稀疏——这是让成本在数千个 agent 上保持线性的模式。

### Async 对每活儿一线程

LLM 调用是 I/O 密集的。一个等下一个 token 的线程 99% 的时间在闲着。线程每个约耗 1MB 内存；1 万个并发调用，光栈就是 10GB。

Fiber（Python `asyncio`、Go goroutine、Rust `tokio`）在 I/O 上协作式让出。同样的 1 万个调用能舒舒服服地装进进程里。在 LLM-agent 规模上，async 不是一个优化——它是架构本身。

例外：CPU 密集的后处理（embedding、tokenizer 小技巧）仍然想要线程或进程。把你的 I/O 层和 CPU 层分开。

### Bedi 的反方观点

《Scaling Agentic Software》（Ashpreet Bedi，2026）主张，大多数团队在测量负载之前就过度工程了。务实的默认：

- FastAPI + Postgres。
- 每个 agent run 是一行；状态用乐观并发原地更新。
- 后台任务用 `pg_notify` 或一个简单的 Celery worker。
- 重试策略写在应用代码里。

对于在可控任务上、约 100 个以下并发 agent-run 的负载，这往往就是你需要的全部。等你测到它撑不住时再升级。

规则：当你撞上一个简单架构解决不了的具体问题时，才采纳持久化执行框架。过早采纳会把时间烧在不回本的仪式上。

### 恰好一次语义

对付费 agent run，你需要「有效恰好一次」（至少一次投递 + 幂等消费者）。工程动作：

- **每 run 一个去重键。** 把它放进每个副作用调用里。
- **outbox 模式。** 副作用先写一张表，再由一个独立进程执行它们。两步都幂等。
- **补偿事务。** 当一个副作用成功、但它的追踪写入失败时，安排一次补偿。

这些是数据库工程模式，不是 LLM 专属。LLM 税仅仅在于 LLM 调用慢；其余都是标准分布式系统。

### 彩虹部署

Anthropic 的多 agent 研究系统用「彩虹部署」：多个版本的 agent 运行时并发跑，这样长时间运行的 agent 不必在每次代码部署时被杀掉。在一小片流量上 canary 新版本；旧版本的 agent 跑完后再退役它。

这对长时间运行的有状态系统是标准做法；2026 年的适配在于 agent 能活几个小时，所以部署周期必须容纳这一点。

### 标准生产检查清单

- 持久化状态（检查点、快照、或 outbox + 可回放日志）。
- 幂等的副作用。
- LLM 调用的 async I/O 层。
- 带去重的至少一次投递。
- 有状态负载的彩虹/canary 部署。
- 可观测性：每 agent 轨迹、super-step 审计、重试计数器。

```figure
sw-checkpoint-replay
```

## 动手构建

`code/main.py` 实现：

- `CheckpointStore` —— SQLite 支撑的检查点日志，以 thread-id 为键。每个 super-step 追加一行。
- `run_with_checkpoint(agent, thread_id)` —— 模拟运行中途崩溃；第二个 worker 从最后的检查点恢复。
- `AgentQueue` —— 每 agent 的 Idle / Processing / Response 状态机，带一个小工作队列。
- `demo_async_vs_threads()` —— 通过 asyncio 和通过线程跑 500 个并发的模拟「LLM 调用」；报告墙钟时间和峰值内存（近似）。

运行：

```
python3 code/main.py
```

预期输出：模拟崩溃后检查点恢复成功；async 版本在 < 1 秒内处理 500 个并发调用；线程版本花几秒，并且每个并发单元用掉的内存高出几个数量级。

## 实际使用

`outputs/skill-scaling-advisor.md` 就持久化执行的选择给建议：FastAPI + Postgres、LangGraph 运行时、Temporal、还是自定义。按负载、状态保留需求、部署频率来校准。

## 拿去用

标准生产加固：

- **从简开始（Bedi 的规则）。** FastAPI + Postgres，直到你测到它撑不住。
- **优化前先把一切埋点。** 每 run 延迟直方图、每步时间、重试计数、失败分类。
- **副作用用 outbox 模式。** 尤其是支付和外部 API 调用。
- **彩虹部署。** 部署期间绝不杀掉飞行中的 agent run。
- **在你撞上具体问题时采纳持久化执行引擎（Temporal / LangGraph / Restate）：** 数小时的 human-in-the-loop 等待、跨区域协调、复杂的重试/补偿策略。
- **I/O 层用 async。** 线程只用于 CPU 密集的后处理。

## 练习

1. 跑 `code/main.py`。确认检查点恢复有效；测量 async 和线程的并发差异。
2. 实现一张 **outbox** 表：每个工具调用先写 outbox，再由一个独立的 goroutine/task 执行。把工具调用跑两遍来验证幂等性。
3. 模拟一次**彩虹部署**：两个并发的运行时版本；把一半新 thread_id 路由到各自；确认旧版本上飞行中的 thread 不被打断。
4. 读 LangGraph 的运行时文档（下方链接）。指出运行时的哪些特性在手搓的 FastAPI + Postgres 版本里最难复制。这是采纳它的理由，还是你可以延后？
5. 读 MegaAgent（arXiv:2408.09955）第 3 节。两层协调（组内 + 组间管理聊天）是显式的。勾画你会如何把它映射到带两个队列族的消息队列上。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Durable execution | 「持久化程序状态」 | 引擎在每个 super-step 后写状态；崩溃恢复是确定性的。 |
| Super-step | 「事务边界」 | 检查点之间的工作单元。LangGraph 术语。 |
| thread_id | 「agent run 标识符」 | 把检查点和恢复逻辑绑在一起的键。 |
| Idempotency | 「重试也安全」 | 重复一个副作用产出与单次尝试相同的结果。 |
| Outbox pattern | 「解耦副作用」 | 把意图写一张表；一个独立执行器执行并标记完成。 |
| At-least-once delivery | 「可能有重复」 | 消息队列语义；去重键让消费者有效恰好一次。 |
| Rainbow deploy | 「版本重叠」 | 长时间运行负载期间多个运行时版本并发。 |
| Async fiber | 「协作式让出」 | 用户态并发；对 I/O 密集负载比线程便宜。 |
| Checkpoint | 「状态快照」 | super-step 边界处序列化的状态；恢复的关键。 |

## 延伸阅读

- [LangChain — The runtime behind production deep agents](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents) —— LangGraph 运行时设计
- [MegaAgent](https://arxiv.org/abs/2408.09955) —— 每 agent 生产者-消费者队列；数千并发 agent 下的两层协调
- [Matrix](https://arxiv.org/abs/2511.21686) —— 以消息队列为协调底层的去中心化框架
- [Temporal docs](https://docs.temporal.io/) —— 持久化执行的参考工作流引擎
- [Anthropic — Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) —— 含彩虹部署的生产教训
