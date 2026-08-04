# Agent 框架取舍——图、角色与 Actor 编排

> 每个框架卖的都是同一个 demo（研究 agent 生成一份报告），藏的都是同一个 bug（状态 schema 和编排层打架）。挑那个抽象与你问题形状相匹配的框架；其余一切都是你要写两遍的胶水。

**类型：** Learn
**语言：** Python
**前置要求：** 阶段 11 · 09（Function Calling）、阶段 11 · 16（LangGraph）
**预计时间：** ~45 分钟

## 问题背景

你有一个需要不止一次 LLM 调用的任务。也许是一个研究工作流（规划、搜索、摘要、引用）。也许是一条代码评审流水线（解析 diff、批评、打补丁、校验）。也许是一个多轮助手，订机票、写邮件、报销。你挑了一个框架。

三天后，你发现框架的抽象在漏。CrewAI 给你角色，但当"researcher"需要把一份结构化计划交给"writer"时它跟你较劲。AutoGen 给你 agent 之间的对话，但没有一等的状态，所以你的 checkpoint 是一份对话日志的 pickle。LangGraph 给你一张状态图，但逼你在还不知道 agent 会做什么之前就给每个转移命名。Agno 给你一个单 agent 抽象，当你想扇出到三个并发 worker 时它直接尖叫。

解法不是"挑最好的框架"。而是把框架的核心抽象与你问题的形状匹配上。本课画出那张地图。

## 核心概念

![Agent 框架矩阵：核心抽象 vs 问题形状](../assets/framework-matrix.svg)

四个框架主导着 2026 年的格局。它们的核心抽象并不相同。

| 框架 | 核心抽象 | 最适合 | 最不适合 |
|-----------|------------------|----------|-----------|
| **LangGraph** | `StateGraph`——有类型的状态、节点、条件边、checkpointer。 | 带显式状态和人在环中断的工作流；需要时间旅行调试的生产 agent。 | 拓扑未知、松散的、角色驱动的头脑风暴。 |
| **CrewAI** | `Crew`——角色（目标、背景故事）、任务、流程（顺序或层级）。 | 带一个简短线性/层级计划的角色扮演或人设驱动工作流。 | 任何超出 crew 轮次历史的有状态需求；复杂分支。 |
| **AutoGen** | `ConversableAgent` 配对——两个或更多 agent 轮流说话直到一个退出条件。 | 多 agent *对话*（师生、提议者-批评者、actor-reviewer），其中思考从聊天中涌现。 | 有已知 DAG 的确定性工作流；任何需要跨重启持久状态的东西。 |
| **Agno** | `Agent`——单个 LLM + 工具 + 记忆，可组合成团队。 | 快速搭建的单 agent 和轻量团队；强多模态和内置存储驱动。 | 带自定义 reducer 的深层、显式分支的图。 |

### "抽象"到底是什么意思

一个框架的核心抽象，就是你给架构做汇报时画在白板上的那个东西。

- **LangGraph** → 你画一张图。节点是步骤，边是转移，每一点上的状态对象都有类型。心智模型是状态机。
- **CrewAI** → 你画一张组织架构图。每个角色有一份岗位描述，一个 manager 路由任务。心智模型是一支小型专家团队。
- **AutoGen** → 你画一个 Slack 私聊。两个 agent 互相发消息；需要主持人时第三个加入。心智模型是聊天。
- **Agno** → 你画一个挂着工具的单个方框。把几个方框并排放就是一个团队。心智模型是"自带电池的 agent"。

### 状态这道题

状态是大多数框架选择在生产里崩掉的地方。

- **LangGraph。** 有类型的状态（`TypedDict` 或 Pydantic 模型）、每字段 reducer、一等的 checkpointer（SQLite/Postgres/Redis）。恢复、中断和时间旅行都是免费的。*（见阶段 11 · 16。）*
- **CrewAI。** 状态通过 `context` 字段以字符串在任务之间流动，或通过 `output_pydantic` 结构化流动。开箱没有按 crew 的持久存储；如果 crew 必须熬过重启，你得自己拼一个上去。
- **AutoGen。** 状态是聊天历史和任何用户定义的 `context`。对话记录会持久化；任意工作流状态不会，除非你写适配器。
- **Agno。** 内置存储驱动（SQLite、Postgres、Mongo、Redis、DynamoDB）通过 `storage=` 挂到一个 `Agent` 上——对话会话和用户记忆自动持久化。不是完整的图 checkpointer；是一个会话存储。

### 分支这道题

每个非平凡的 agent 都会分支。谁来决定分支，这很重要。

- **LangGraph**——你决定，通过条件边。路由是一个带命名分支的 Python 函数。分支在编译好的图里是一等的；checkpointer 记录走了哪个分支。
- **CrewAI**——层级模式下 manager 决定；顺序模式下你在构建时决定。路由隐含在任务列表里；manager 的 prompt 之外没有一等的"if"。
- **AutoGen**——agent 通过聊天决定。分支从谁接下来说话中涌现。`GroupChatManager` 选下一个说话者；你可以手写一个 `speaker_selection_method`，但默认是 LLM 驱动的。
- **Agno**——agent 通过接下来调哪个工具来决定。团队有 coordinator/router/collaborator 模式；超出那个的分支是开发者的责任。

### 可观测性这道题

- **LangGraph**——通过 LangSmith 或任意 OTel 导出器接 OpenTelemetry。每次节点转移都是一个 trace span；checkpoint 兼作可回放的 trace。LangSmith 是第一方选项；Langfuse/Phoenix 也有适配器。
- **CrewAI**——自 2025 年末起一等支持 OpenTelemetry；与 Langfuse、Phoenix、Opik、AgentOps 集成。
- **AutoGen**——通过 `autogen-core` 集成 OpenTelemetry；AgentOps 和 Opik 有连接器。tracing 粒度是按 agent 消息，不是按节点。
- **Agno**——内置 `monitoring=True` 开关外加 OpenTelemetry 导出器；与 Langfuse 紧密集成做会话 trace。

### 成本与延迟

四个框架都增加每次调用的开销（框架逻辑、校验、序列化）。开销递增的大致顺序：Agno ≈ LangGraph < CrewAI ≈ AutoGen。差异主要由框架额外做多少 LLM 路由决定。CrewAI 的层级 manager 花 token 决定谁下一个走；AutoGen 的 `GroupChatManager` 同样如此。LangGraph 只在你写 `llm.invoke` 的地方花 token。Agno 的单 agent 路径很薄。

当每次运行的成本重要时，偏好显式路由（LangGraph 的边、AutoGen 的 `speaker_selection_method`）而非 LLM 选择的路由。

### 互操作性

- **LangGraph** ↔ **LangChain** 工具、检索器、LLM。一等的 MCP 适配器（工具作为 MCP server 导入）。
- **CrewAI** ↔ 工具继承自 `BaseTool`；LangChain 工具、LlamaIndex 工具和 MCP 工具都能适配进来。crew 到 crew 的委派通过 `allow_delegation=True`。
- **AutoGen** → `FunctionTool` 包裹任意 Python 可调用对象；有 MCP 适配器。在 agent 到 agent 模式上与 AG2 生态紧耦合。
- **Agno** → `@tool` 装饰器或 BaseTool 子类；有 MCP 适配器；工具能跨 agent 和团队共享。

## 这项 skill

> 你能用一句话解释，为什么某个框架对某个 agent 问题是对的。

构建前清单：

1. **画出形状。** 这是一张图吗（有类型的状态、命名的转移）？一场角色扮演吗（专家们交接工作）？一场聊天吗（agent 们聊到完成）？一个带工具的单 agent 吗？
2. **决定谁来分支。** 开发者决定的分支 → LangGraph。manager-agent 决定的 → CrewAI 层级。聊天涌现的 → AutoGen。tool-call 决定的 → Agno。
3. **核查状态预算。** 你需要从 checkpoint 恢复吗？时间旅行吗？运行中途的人工中断吗？如果需要，LangGraph 是默认；Agno 的会话覆盖对话范围的状态。
4. **核查成本预算。** LLM 选择的路由每轮花额外的 token。如果 agent 每天跑成千上万次，偏好显式路由。
5. **给框架开销做预算。** 每个框架都是又一个依赖。如果任务是两次 LLM 调用加一个工具，就写 30 行朴素 Python；没有哪个框架比没有框架更便宜。

在你能画出那张图、那张组织架构图、那场聊天或那个 agent 方框之前，拒绝伸手去拿框架。拒绝挑一个会逼你为你真正需要的东西去和它的状态模型较劲的框架。

## 决策矩阵

| 问题形状 | 首选框架 | 为什么 |
|---------------|---------------------|-----|
| 带类型状态、人工审批、长时间运行的工作流 DAG | LangGraph | 一等的状态、checkpointer、中断、时间旅行。 |
| 带明确角色的研究/写作流水线 | CrewAI（顺序）或 LangGraph 子图 | 每任务一角色在 CrewAI 里表达起来很省事；分支变复杂时用 LangGraph 扩展。 |
| 提议者-批评者或师生对话 | AutoGen | 两 agent 聊天是它的原生形态。 |
| 带工具、会话、记忆的单 agent | Agno | 最薄的配置，内置存储和记忆。 |
| 带 reducer 的成千上万个并行扇出 | LangGraph + `Send` | 唯一一个有一等并行派发原语的。 |
| 快速原型，不绑定框架 | 朴素 Python + provider SDK | 没有框架就是最快的框架。 |

```figure
l5-framework-fit
```

## 练习

1. **简单。** 拿同一个任务——"研究 Anthropic 的总部、写一份 200 词简报、引用来源"——在 LangGraph（四个节点：plan、search、write、cite）和 CrewAI（三个角色：researcher、writer、editor）里各实现一遍。报告每次运行的 token 成本和代码行数。
2. **中等。** 把同一个任务在 AutoGen（researcher ↔ writer 聊天，editor 通过 `GroupChat` 加入）和 Agno（一个带 `search_tools` 和 `write_tools` 的单 agent，外加一个会话存储）里构建出来。把这四种实现按以下三点排名：（a）每次运行成本，（b）崩溃后恢复的能力，（c）在写入步骤之前注入人工审批的能力。
3. **困难。** 构建一个决策树脚本 `pick_framework.py`，接收一段简短的问题描述（JSON：`{has_typed_state, has_roles, has_dialogue, has_parallel_fanout, needs_resume}`），返回一个带一句话理由的推荐。在你自己设计的六个用例上验证它。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 编排 | "agent 们怎么协调" | 决定下一个跑哪个节点/角色/agent 的那一层。 |
| 持久状态 | "重启后恢复" | 熬过进程死亡的状态，挂在一个 checkpoint 或会话存储上。 |
| LLM 选择的路由 | "让模型决定" | 一个规划者 LLM 每轮挑下一步；灵活但每次决策都付 token。 |
| 显式路由 | "开发者决定" | 一个 Python 函数或静态边挑下一步；便宜且可审计。 |
| Crew | "一个 CrewAI 团队" | 角色 + 任务 + 流程（顺序或层级）绑成一个单一 runnable。 |
| GroupChat | "AutoGen 的多 agent 聊天" | N 个 agent 之间一场带说话者选择器的受管对话。 |
| Team（Agno） | "多 agent 的 Agno" | 在一组 agent 上的 route / coordinate / collaborate 模式。 |
| StateGraph | "LangGraph 的图" | 有类型状态、节点、条件边、checkpointer 的抽象。 |

## 延伸阅读

- [LangGraph documentation](https://langchain-ai.github.io/langgraph/)——StateGraph、checkpointer、中断、时间旅行。
- [CrewAI documentation](https://docs.crewai.com/)——Crews、Flows、Agents、Tasks、Processes。
- [AutoGen documentation](https://microsoft.github.io/autogen/)——ConversableAgent、GroupChat、团队、工具。
- [Agno documentation](https://docs.agno.com/)——Agent、Team、Workflow、存储、记忆。
- [Anthropic — Building effective agents (Dec 2024)](https://www.anthropic.com/research/building-effective-agents)——与框架无关的模式库（prompt chaining、routing、parallelization、orchestrator-workers、evaluator-optimizer）。
- [Yao et al., "ReAct: Synergizing Reasoning and Acting" (ICLR 2023)](https://arxiv.org/abs/2210.03629)——每个框架都给它穿上不同外衣的那个 loop。
- [Wu et al., "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation" (2023)](https://arxiv.org/abs/2308.08155)——AutoGen 的设计论文。
- [Park et al., "Generative Agents: Interactive Simulacra of Human Behavior" (UIST 2023)](https://arxiv.org/abs/2304.03442)——CrewAI 风格人设栈所基于的角色扮演基础。
- 阶段 11 · 16（LangGraph）——本课用来做基准对比的那个框架。
- 阶段 11 · 19（Reflexion）——一个干净映射到 LangGraph、却别扭地映射到 CrewAI 的模式。
- 阶段 11 · 22（生产可观测性）——如何给你挑的任意框架埋点。
