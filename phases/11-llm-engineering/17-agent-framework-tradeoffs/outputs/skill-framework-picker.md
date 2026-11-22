---
name: framework-picker
description: 让抽象匹配问题形态，为 agent 任务在 LangGraph、CrewAI、AutoGen、Agno 和纯 Python 之间做选择。
version: 1.0.0
phase: 11
lesson: 17
tags: [langgraph, crewai, autogen, agno, agent-framework, orchestration, decision-matrix]
---

给定任务描述（问题形态、每次运行的 LLM 调用总数、分支模式、持久化与恢复需求、human-in-the-loop 检查点、并行扇出、会话记忆、预期每日运行量），输出：

1. 形态匹配。用一句话说出合适的抽象：图（类型化状态、命名转移）、组织架构（专职角色、由经理路由的交接）、聊天（agent 一直对话直到完成）、带工具的单 agent。如果一个都选不出来，说明这个任务还不是 agent 形态；停下来先拆解。
2. 分支决定权。谁来选下一步：开发者（显式边）、经理 LLM（CrewAI hierarchical）、对话中自发涌现（AutoGen GroupChat）、通过工具调用自行路由（Agno）。如果由 LLM 选路由，给出每一轮的 token 成本。
3. 状态预算。确认是否需要重启后恢复、time-travel 或人工中断。如果需要，LangGraph 凭借以状态为先的抽象胜出；Agno 只覆盖会话级记忆。
4. 框架选择。从 langgraph、crewai、autogen、agno、plain_python 中输出一个。附上一句理由，把形态和状态方面的回答对应到该框架的核心抽象上。
5. 逃生口。如果每日运行量超过 10_000，或任务只有不超过两次 LLM 调用且没有状态，改为推荐纯 Python 加供应商 SDK。任务小的时候，不用框架就是最快的框架。

对于 DAG 已知的确定性工作流，拒绝推荐 AutoGen；GroupChatManager 会花 token 去挑发言者，而这些本来可以由开发者静态连好。CrewAI 确实通过 `output_pydantic` / `output_json` 支持结构化任务输出（见 [docs.crewai.com/en/concepts/tasks](https://docs.crewai.com/en/concepts/tasks)），但它的 `context` 通道仍然是经由下一个任务的 prompt 字符串传递的。如果工作流依赖原始 `context` 在任务之间传递结构化状态，又没有接上上述任一输出 schema，就对 CrewAI 提出反对。对只有两次调用的摘要器使用 LangGraph 要提出反对；StateGraph 的开销纯属额外负担。任务扇出到超过 4 个并行子 worker 且需要 reducer 语义时，对 Agno 提出反对；Agno 提供一个 `Parallel` 块，其输出会合并成一个以步骤名为键的 dict（见 [docs-v1.agno.com/workflows_2/overview](https://docs-v1.agno.com/workflows_2/overview) 和 [docs.agno.com/workflows/access-previous-steps](https://docs.agno.com/workflows/access-previous-steps)），但它没有提供可与 LangGraph 相比的 Send 式扇出-归约 API。

示例输入："Long-running research workflow: plan, fan out to three retrievers, synthesize, human approves brief, write report, cite sources. Must resume after crash. Production-bound to 50 runs per day."

示例输出：
- 形态：图。类型化的计划、三个并行检索器，synthesize 和 write 之间是命名转移。
- 分支：由开发者通过条件边决定。没有每轮介入的经理 LLM。
- 状态：需要恢复和人工中断。必须用 LangGraph。
- 框架：langgraph。State、Send 扇出、interrupt_before 和 PostgresSaver 都是一等公民。
- 逃生口：不适用。每天 50 次运行远低于纯 Python 的阈值，而且工作流状态太重，不适合脱离框架。
