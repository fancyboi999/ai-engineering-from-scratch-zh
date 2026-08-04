# 多 agent 原语模型

> 原语就四个，不多不少：agent、handoff、共享状态、orchestrator。它们构成一个四维设计空间，2026 年的主要多 agent 框架（AutoGen、LangGraph、CrewAI、OpenAI Agents SDK、Microsoft Agent Framework）都是其中的点。本课从零构建这四个原语，把一个玩具系统跑一遍，再把主流框架映射到同一组坐标轴上，让你一段话就能读懂任何新发布。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** Phase 14（Agent 工程）、Phase 16 · 01（为什么要用多 agent）
**预计时间：** ~60 分钟

## 问题背景

每隔半年就冒出一个新的多 agent 框架。2023 年的 AutoGen。2024 年的 CrewAI。2024 年的 LangGraph 和 OpenAI Swarm。2025 年 4 月的 Google ADK。2026 年 2 月的 Microsoft Agent Framework RC。每篇新闻稿都自称是「那个对的抽象」。

如果你打算一个一个挨着学，你会学到崩溃。API 长得各不相同，文档对「agent 是什么」各执一词。一个框架管它的共享内存叫「黑板」，另一个叫「消息池」，第三个叫「StateGraph」。你开始怀疑这个领域只是在原地空转。

并没有。在营销话术底下，那四个原语是稳定的。学一次，一段话读懂每个新框架。

## 核心概念

### 四个原语

1. **Agent** —— 一条 system prompt 加一份工具列表。无状态；每次运行都从它的 system prompt 和当前消息历史开始。
2. **Handoff** —— 把控制权从一个 agent 结构化地转交给另一个 agent。机制上，就是一次返回新 agent 的工具调用，或一条带条件的图边。
3. **共享状态** —— 任何一个以上 agent 能读（有时能写）的数据结构。消息池、黑板、键值存储、向量记忆。
4. **Orchestrator** —— 决定接下来谁发言的那个角色。可选：显式的图（确定性）、LLM 发言者选择器（柔性）、上一个发言者的 handoff 调用（OpenAI Swarm）、或队列之上的调度器（swarm 架构）。

这就是整个设计空间。每个框架为每条轴选定默认值；剩下的都是表层语法。

### 2026 年每个框架如何映射到它

| 框架 | Agent | Handoff | 共享状态 | Orchestrator |
|-----------|-------|---------|--------------|--------------|
| OpenAI Swarm / Agents SDK | `Agent(instructions, tools)` | 工具返回 Agent | 调用方自己管 | LLM 的下一次 handoff 调用 |
| AutoGen v0.4 / AG2 | `ConversableAgent` | GroupChat 上的发言者选择器 | 消息池 | 选择器函数（LLM 或轮询） |
| CrewAI | `Agent(role, goal, backstory)` | `Process.Sequential / Hierarchical` | Task 输出链式传递 | manager LLM 或静态顺序 |
| LangGraph | 节点函数 | 图边 + 条件 | `StateGraph` reducer | 图本身，确定性 |
| Microsoft Agent Framework | agent + orchestration 模式 | 因模式而异 | thread / context | 因模式而异 |
| Google ADK | agent + A2A card | A2A 任务 | A2A 产物 | host 决定 |

表层差异看着巨大。底下：同样的四个旋钮。

### 为什么这很重要

一旦你看穿原语，框架对比就变成一份简短的检查清单：

- orchestrator 是信任 LLM 来路由（Swarm），还是把路由钉死在代码里（LangGraph）？
- 共享状态是全历史（GroupChat）还是投影后的（StateGraph reducer）？
- agent 能修改彼此的 prompt（CrewAI manager），还是只能 handoff（Swarm）？

这三个问题回答了「哪个框架适合某个给定问题」的 80%。你不再四处淘「最好的多 agent 框架」，而是开始针对你真正在意的那条轴去设计。

### 「无状态」洞见

除了共享状态，每个原语都是无状态的。Agent 是 (prompt, tools) 的函数。Handoff 是一次函数调用。Orchestrator 是一个调度器。**系统里唯一有状态的东西就是共享状态。** 所有有意思的 bug 都住在那里：记忆投毒（第 15 课）、消息排序、版本控制、写竞争。

把共享状态藏起来的框架（Swarm）把问题推给了调用方。把它集中起来的框架（LangGraph checkpoint、AutoGen 池）让它可被检视，但把协调成本转嫁到了共享状态的实现上。

### 单个原语的解剖

#### Agent

```
Agent = (system_prompt, tools, model, optional_name)
```

没有记忆。没有状态。两个 system prompt 和工具相同的 agent 是可互换的。一切看起来像「每个 agent 各自状态」的东西，其实都在共享状态或 handoff 协议里。

#### Handoff

```
Handoff = (from_agent, to_agent, reason, payload)
```

主流有三种实现：

- **函数返回** —— 工具返回下一个 agent。这是 OpenAI Swarm 的模式。agent 把路由带在自己的工具 schema 里。
- **图边** —— LangGraph。边是声明式的。LLM 产出一个值，一个条件据此选出下一个节点。
- **发言者选择** —— AutoGen GroupChat。一个选择器函数（有时本身就是一次 LLM 调用）读取池子，挑出接下来谁发言。

#### 共享状态

```
SharedState = { messages: [], artifacts: {}, context: {} }
```

最低限度，是一份消息列表。通常还更多：结构化产物（CrewAI Task 输出）、类型化上下文（LangGraph reducer）、外部记忆（MCP、向量数据库）。

两种拓扑：**全池**（每个 agent 看到每条消息）和**投影**（agent 看到一份按角色裁剪的视图）。全池简单但扩展性差。投影池能扩展，但需要前期的 schema 设计。

#### Orchestrator

```
Orchestrator = ({state, last_speaker}) -> next_agent
```

四种口味：

- **静态** —— 图在构建时就固定了（LangGraph 确定性、CrewAI Sequential）。
- **LLM 选择** —— 一个 LLM 读池子、挑下一个发言者（AutoGen、CrewAI Hierarchical）。
- **handoff 驱动** —— 当前 agent 通过调一个 handoff 工具来决定（Swarm）。
- **队列驱动** —— worker 从共享队列里领活儿；没有显式的「下一个发言者」（swarm 架构、Matrix）。

### 框架之间变的是什么

原语一旦固定，剩下的设计决策是：

- **记忆策略** —— 临时态 vs 持久化检查点（LangGraph checkpointer）。
- **安全边界** —— 谁能批准一次 handoff（human-in-the-loop）。
- **成本核算** —— 每个 agent 的 token 预算。
- **可观测性** —— 追踪 handoff、持久化状态以便回放。

全部都能在原语之上实现。它们都不是新的原语。

```figure
a5-primitive-radar
```

## 动手构建

`code/main.py` 用约 150 行标准库 Python 实现了这四个原语。没有真实 LLM——每个 agent 都是一段脚本化策略，好让焦点停留在协调结构上。

这个文件导出：

- `Agent` —— 一个 dataclass，含名字、system prompt、工具、策略函数。
- `Handoff` —— 一个返回新 agent 的函数。
- `SharedState` —— 一个线程安全的消息池。
- `Orchestrator` —— 三种变体：`StaticOrchestrator`、`HandoffOrchestrator`、`LLMSelectorOrchestrator`（模拟）。

这个演示让同一条三 agent 流水线（research → write → review）跑过全部三种 orchestrator 类型，并在最后打印消息池。你能看到：输出之间唯一的区别在于*谁来挑下一个*；各次运行的 agent 和共享状态都是一样的。

运行：

```
python3 code/main.py
```

预期输出：三次 orchestrator 运行，每种模式一次。每次都打印最终的消息池。如果 researcher 提前判定自己干完了，handoff 驱动的那次会触达更少的 agent——这就是 LLM 路由取舍的微缩版。

## 实际使用

`outputs/skill-primitive-mapper.md` 是一个 skill，它读取任意多 agent 代码库或框架文档，返回四原语映射。在一个新框架发布时跑一下它，在深入读文档之前先得到一段话的理解。

## 拿去用

在采用一个新框架之前，先为它写出原语映射。如果你写不出来，要么文档不完整，要么这个框架在发明第五个原语（罕见——检查一下是不是某种你没见过的共享状态口味）。

把这份映射钉在你的架构文档里。新成员加入时，在 API 文档之前先把映射发给他。框架版本变更时，对比的是映射，不是 changelog。

## 练习

1. 用不同的 agent 策略把 `code/main.py` 跑三遍。观察 orchestrator 的选择如何改变哪些 agent 会运行。
2. 实现第四种 orchestrator 类型：一个队列驱动的，agent 轮询共享状态来领活儿。会发生什么死锁，你又如何检测它？
3. 拿 LangGraph 快速上手（https://docs.langchain.com/oss/python/langgraph/workflows-agents），把它改写成这四个原语。LangGraph 的哪些抽象是 1:1 映射的，哪些只是便利封装？
4. 读 OpenAI Swarm cookbook（https://developers.openai.com/cookbook/examples/orchestrating_agents）。指出这四个原语里 Swarm 把哪个做得最顺手，又把哪个推给了调用方。
5. 在这张表里找一个完全藏起共享状态的框架。说清当 agent 需要跨 handoff 协调、却不重读历史时，会崩什么。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么意思 |
|------|----------------|------------------------|
| Agent | 「一个带工具的 LLM」 | 一个 `(system_prompt, tools, model)` 三元组。无状态。 |
| Handoff | 「控制权转交」 | 一次结构化调用，指明下一个 agent 和可选的载荷。三种实现：函数返回、图边、发言者选择。 |
| Shared state | 「记忆」/「上下文」 | 多 agent 系统里唯一有状态的部分。消息池或黑板。 |
| Orchestrator | 「协调者」 | 决定接下来谁运行的角色。静态图、LLM 选择器、handoff 驱动、或队列驱动。 |
| Primitive | 「抽象」 | 每个框架都会去参数化的四条轴之一。不是某个框架的特性。 |
| Message pool | 「共享聊天历史」 | 全历史的共享状态。容易推理，扩展性差。 |
| Projected state | 「裁剪后的视图」 | 进入共享状态的角色专属视图。能扩展，需要 schema 设计。 |
| Speaker selection | 「接下来谁发言」 | 一种 orchestrator 模式，一个函数（常是 LLM）从一组里挑下一个 agent。 |

## 延伸阅读

- [OpenAI cookbook: Orchestrating Agents — Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) —— 对 handoff 驱动 orchestration 最清晰的阐述
- [AutoGen stable docs](https://microsoft.github.io/autogen/stable/) —— GroupChat + 发言者选择是 LLM 选择式 orchestration 的参考
- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) —— 图边 orchestration 与基于 reducer 的共享状态
- [CrewAI introduction](https://docs.crewai.com/en/introduction) —— role-goal-backstory 式 agent，Sequential / Hierarchical 流程
- [AG2 (community AutoGen continuation)](https://github.com/ag2ai/ag2) —— 微软把 v0.4 转入维护后，仍在更新的 AutoGen v0.2 一脉
