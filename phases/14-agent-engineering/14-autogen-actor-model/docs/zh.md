# Agent 的 Actor 模型——异步消息与类型化运行时

> 把 agent 当作 actor：异步交换消息、用事件驱动处理器响应、隔离故障，并自然获得并发。AutoGen v0.4（Microsoft Research，2025 年 1 月）围绕这个模型重新设计了 agent 编排；该框架现在进入维护模式，Microsoft Agent Framework（2025 年 10 月公开预览）成为它的生产继任者。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 12（工作流模式）
**预计时间：** ~75 分钟

## 学习目标

- 描述 actor 模型：agent 即 actor，消息是唯一的 IPC，每个 actor 各自故障隔离。
- 说出 AutoGen v0.4 的三个 API 层 —— Core、AgentChat、Extensions —— 各自干什么。
- 解释为什么把消息投递与处理解耦能带来故障隔离和天然并发。
- 用 Python 实现一个标准库 actor 运行时，并把一个双 agent 代码审查流程移植上去。

## 问题背景

大多数 agent 框架是同步的：一个 agent 生产，一个 agent 消费，都在一个调用栈里。失败会让栈崩溃。并发是硬加上去的。要分布式就得重写。

AutoGen v0.4 的回答：actor 模型。每个 agent 是一个带私有收件箱的 actor。消息是唯一的交互方式。运行时把投递与处理解耦。失败隔离在一个 actor 内。并发是原生的。分布式只是换个传输。

## 核心概念

### Actor

一个 actor 有：

- 一份私有状态（从外部绝不直接触碰）。
- 一个收件箱（消息队列）。
- 一个处理器：`receive(message) -> effects`，其中 effects 可以是「回复」「发给其他 actor」「派生新 actor」「更新状态」「停掉自己」。

两个 actor 不能共享内存。它们只能发消息。

### 三个 API 层

AutoGen v0.4 把接口分成三层：

1. **Core。** 底层 actor 框架。`AgentRuntime`、`Agent`、`Message`、`Topic`。异步消息交换，事件驱动。
2. **AgentChat。** 任务驱动的高层 API（v0.2 的 ConversableAgent 的替代）。`AssistantAgent`、`UserProxyAgent`、`RoundRobinGroupChat`、`SelectorGroupChat`。
3. **Extensions。** 各种集成 —— OpenAI、Anthropic、Azure、工具、记忆。

### 为什么解耦重要

在 v0.2 模型里，调用 `agent_a.chat(agent_b)` 会同步阻塞 agent_a 直到 agent_b 返回。在 v0.4 里，`send(agent_b, msg)` 把消息放进 agent_b 的收件箱就返回。运行时稍后投递。三个后果：

- **故障隔离。** Agent B 崩溃不会让 Agent A 崩溃 —— 运行时在 B 的处理器里捕获失败并决定怎么办（记录、重试、死信）。
- **天然并发。** 同时有许多消息在途；actor 并发处理各自的收件箱。
- **分布式就绪。** 不管 actor 在进程内还是在另一台主机上，收件箱 + 传输都是同一个抽象。

### 拓扑

- **RoundRobinGroupChat。** agent 按固定轮换依次发言。
- **SelectorGroupChat。** 一个 selector agent 基于对话上下文挑下一个发言者。
- **Magentic-One。** 用于网页浏览、代码执行、文件处理的参考多 agent 团队。建在 AgentChat 之上。

### 可观测性

内置 OpenTelemetry 支持。每条消息发出一个 span；工具调用按 2026 年 OTel GenAI 语义约定（第 23 课）携带 `gen_ai.*` 属性。

### 状态：维护模式

2026 年初：AutoGen v0.7.x 对研究和原型来说是稳定的。微软已把活跃开发转向生产继任者 Microsoft Agent Framework（2025 年 10 月 1 日公开预览；1.0 GA 当时目标定在 2026 年 Q1 末）。AutoGen 模式能干净地向前移植，actor 模型才是那个持久的想法。

```figure
actor-mailbox
```

## 动手构建

`code/main.py` 实现一个标准库 actor 运行时：

- `Message` —— 带 `sender`、`recipient`、`topic`、`body` 的带类型载荷。
- `Actor` —— 抽象类，带 `receive(message, runtime)`。
- `Runtime` —— 带共享队列、投递、故障隔离的事件循环。
- 一个双 actor 演示：`ReviewerAgent` 审查代码，`ChecklistAgent` 跑一份清单；它们交换消息直到达成共识。

运行它：

```
python3 code/main.py
```

轨迹展示消息投递、一个 actor 里模拟的失败（不会让另一个崩溃），以及对一个共享裁决的收敛。

## 实际使用

- **AutoGen v0.4/v0.7**（维护中）—— 对研究、原型、多 agent 模式来说稳定。
- **Microsoft Agent Framework** —— 生产继任者（2025 年 10 月公开预览）；同样的 actor 模型想法，换了套刷新的 API。
- **LangGraph swarm 拓扑**（第 13 课）—— 通过共享工具交接的类似模式。
- **自定义 actor 运行时** —— 当你需要特定传输（NATS、RabbitMQ、gRPC）时。

## 拿去用

`outputs/skill-actor-runtime.md` 为给定的多 agent 任务生成一个极简 actor 运行时外加一个团队模板（RoundRobin 或 Selector）。

## 练习

1. 加一个死信队列：当处理器抛异常时，把失败的消息泊住供人工检视。在你的玩具里 DLQ 多久被命中一次？
2. 实现 `SelectorGroupChat`：一个 selector actor 基于对话状态挑谁处理下一条消息。
3. 加分布式传输：把进程内队列换成一个 JSON-over-HTTP 服务器，让 actor 能在不同进程里跑。
4. 给每条消息接一个 OTel span（或一个 no-op 顶替）。按第 23 课发出 `gen_ai.agent.name`、`gen_ai.operation.name`。
5. 读 AutoGen v0.4 的架构帖子。把你的玩具移植到真实的 `autogen_core` API。你跳过了哪些在生产里重要的东西？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Actor | 「agent」 | 私有状态 + 收件箱 + 处理器；无共享内存 |
| Message | 「事件」 | 带类型载荷；actor 交互的唯一方式 |
| Inbox | 「邮箱」 | 每个 actor 的待处理消息队列 |
| Runtime | 「agent 宿主」 | 路由消息并隔离故障的事件循环 |
| Topic | 「频道」 | actor 之间具名的发布-订阅路由 |
| Fault isolation | 「任其崩溃」 | 一个 actor 失败不会让其他崩溃 |
| RoundRobinGroupChat | 「固定轮换团队」 | agent 按序轮流发言 |
| SelectorGroupChat | 「上下文路由团队」 | selector 挑下一个发言者 |
| Magentic-One | 「参考团队」 | 用于网页 + 代码 + 文件的多 agent 小队 |

## 延伸阅读

- [AutoGen v0.4, Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) —— 重新设计的帖子
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 图形态的替代品
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) —— AutoGen 默认发出的 span
