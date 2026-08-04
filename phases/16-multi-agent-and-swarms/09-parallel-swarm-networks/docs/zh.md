# 并行 / Swarm / 网络化架构

> 跟 supervisor 对照：没有中心决策者。agent 读一条共享事件总线、异步领活儿、把结果写回去。LangGraph 明确支持面向去中心化、动态环境的「Swarm 架构」。Matrix（arXiv:2511.21686）把控制流和数据流都表示成经分布式队列传递的序列化消息，以消除 orchestrator 瓶颈。取舍很明确：用确定性和可追踪性换可扩展性。swarm 适合有许多独立子问题的任务；它不适合需要一份单一、连贯计划的任务。

**类型：** Learn + Build
**语言：** Python（标准库，`threading`、`queue`）
**前置要求：** Phase 16 · 05（Supervisor 模式）、Phase 16 · 04（原语模型）
**预计时间：** ~75 分钟

## 问题背景

supervisor 能扩展到几个 worker。几百个呢？supervisor 自己就成了瓶颈：每一个「谁干什么」的决策都漏斗般挤过一个 agent。一个慢的规划步骤就拖住整个系统。

swarm 架构把设计翻了个个儿。不是一个中心 planner 派活儿，而是 worker 从共享队列里领活儿。「协调」被烤进了事件总线的语义里。没有 orchestrator；系统能扩展到队列扩展不动为止。

## 核心概念

### 形状

```
                ┌──── shared queue ────┐
                │                      │
       ┌────────┼────────┐  ◄──────┬───┘
       ▼        ▼        ▼         │
     Worker  Worker  Worker   Worker
      A       B       C        D
       │        │        │         │
       └────────┴────────┴─────────┘
                 │
                 ▼
            results pool
```

没有 orchestrator。每个 worker 不断重复：领一个任务、处理、写结果（可选地再入队后续任务）。

### swarm 何时适合

- **大量独立任务。** 抓取、转换、分类。任务之间不互相依赖。
- **时长不定的工作。** 如果有些任务花 100ms、有些花 10s，swarm 会自动均衡负载——快的 worker 去领下一个活儿。supervisor 则不得不预判时长。
- **吞吐优先于确定性。** 你在意的是总完成时间，而不是严格的顺序。

### swarm 何时失败

- **有序工作流。** 如果第 3 步需要第 2 步的输出，swarm 有第 3 步在第 2 步完成之前就触发的风险。
- **全局规划任务。** 复杂的调研问题受益于一个 planner。一群 researcher 组成的 swarm 产出的是各自独立的事实，不是一份连贯的报告。
- **调试。** 没有中心日志、活儿又是异步的，复现一个 bug 代价高昂。

### Matrix（arXiv:2511.21686）

Matrix 是 2025 年那篇把 swarm 推到自然终点的论文：控制流和数据流都是分布式队列上的序列化消息。没有中心协调者。容错来自消息持久性。可扩展性是消息代理（broker）的问题，不是系统的问题。

贡献：一种编程模型，让多 agent 协调变成「这个 agent 订阅什么消息主题？」而不是「supervisor 接下来挑哪个 agent？」这让系统看起来像一张 pub/sub 事件网格。

### 图框架中的 Swarm

LangGraph 2025 文档明确把「Swarm 架构」描述为多 agent 模式之一：agent 是节点，但边构成一张带环的有向图，任何节点都能从池子里被激活。worker 按条件领可用的活儿，而不是靠 supervisor 分配。

### 故障模式：饿死与热点

如果所有 worker 都去领可用任务里最快的那个，长时间运行的任务直到剩它自己时才会被领走。经典的队列饿死。

缓解：
- 带显式老化的优先级队列（等待时间越长优先级越高）。
- worker 专精：某些 worker 只接「长」任务。
- 背压（back-pressure）：限制有多少快任务进入队列。

### 与基于内容的路由的关联

swarm 天然能和基于内容的路由（第 22 课）搭配。不用一条通用队列，而是每种消息类型一条队列。专精 worker 只订阅自己的类型。这是能扩展到数千 agent 的消息总线架构的基础。

```figure
sw-work-stealing
```

## 动手构建

`code/main.py` 实现了一个 4 worker 线程的 swarm，从一个共享的 `queue.Queue` 里领活儿。任务时长不定（有快有慢）。演示做三种对比：

- **串行基线：** 一个 worker 串行处理所有任务。
- **固定分配：** 每个任务预先分给某个特定 worker（supervisor 风格）。
- **Swarm：** worker 从共享队列里领。

swarm 自动均衡负载；固定分配会在某个 worker 被分到的任务很慢时让快 worker 闲着。

运行：

```
python3 code/main.py
```

输出展示每个 worker 的任务数（swarm 分配得不均匀但最优）和墙钟时间。

## 实际使用

`outputs/skill-swarm-fit.md` 评估一个任务该用 swarm 还是 supervisor。输入：任务独立性、时长方差、顺序要求、可调试性需求。

## 拿去用

检查清单：

- **带老化的优先级队列。** 防止长任务饿死。
- **worker 幂等。** 如果一个 worker 在运行中途崩溃，一个任务可能被领走不止一次。worker 必须幂等。
- **持久化队列。** 生产里用 Kafka、Redis Streams、或数据库支撑的队列。`queue.Queue` 只在内存里。
- **每个任务的可观测性。** 每个任务有一个 trace ID；每个 worker 带着它记录开始/结束。
- **背压。** 如果队列增长得比 worker 排空得快，就放慢生产者。

## 练习

1. 跑 `code/main.py`。在时长不定的负载上，swarm 比串行快多少？比固定分配快多少？
2. 加一个优先级队列变体（用 `queue.PriorityQueue`）。按任务的「重要性」字段分配优先级。观察在持续负载下低优先级任务会不会饿死。
3. 实现一个热点检测器：当任何 worker 处理的任务数达到最慢 worker 的 3 倍时记录下来。这说明任务时长分布有什么特点？
4. 读 Matrix 论文（arXiv:2511.21686）的摘要和第 3 节。指出 Matrix 接受的一个具体取舍（可扩展性收益）和它放弃的一个（可追踪性、确定性）。
5. 把 swarm 演示改成用一个装 (task_type, payload) 元组的 `queue.Queue`，worker 只订阅特定类型。当任务异质时，什么路由规则才合理？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Swarm architecture | 「去中心化的 agent」 | worker 从共享队列领活儿；没有中心 orchestrator。 |
| Event bus | 「agent 订阅主题」 | 按类型或内容把任务路由给 worker 的消息代理。 |
| Starvation | 「任务永远不跑」 | 低优先级任务因为更高优先级的活儿不断到来而永远轮不上。 |
| Hot-spotting | 「一个 worker 被淹了」 | 负载不均，一个 worker 拿到了大多数任务。 |
| Back-pressure | 「放慢生产者」 | 队列满了时向上游发信号、让它停止生产的机制。 |
| Idempotent worker | 「重跑也安全」 | 一个任务被处理两次产出相同结果。必需，因为 worker 可能在中途崩溃。 |
| Durable queue | 「能熬过崩溃」 | 由磁盘或副本存储支撑的队列；worker 崩溃时任务不丢。 |
| Matrix framework | 「彻底消息传递的 swarm」 | 数据流和控制流都是分布式队列上的序列化消息。 |

## 延伸阅读

- [LangGraph workflows and agents — Swarm Architecture](https://docs.langchain.com/oss/python/langgraph/workflows-agents) —— 显式的 swarm 支持
- [Matrix — A Decentralized Framework for Multi-Agent Systems](https://arxiv.org/abs/2511.21686) —— 彻底消息传递的 swarm
- [Anthropic engineering — why supervisor not swarm in Research](https://www.anthropic.com/engineering/multi-agent-research-system) —— 一个具体的生产系统为何明确选了 supervisor 而非 swarm
- [AutoGen v0.4 actor-model docs](https://microsoft.github.io/autogen/stable/) —— 事件驱动的 actor 重写，比 v0.2 的 GroupChat 更接近 swarm
