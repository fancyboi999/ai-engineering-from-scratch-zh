---
name: runtime-picker
description: 根据技术栈、延迟预算和运维形态，选择生产级 agent 运行时（Agno、Mastra、LangGraph、提供商 SDK）。
version: 1.0.0
phase: 14
lesson: 18
tags: [agno, mastra, langgraph, runtime, selection]
---

用户会给出技术栈、延迟预算、所需原语和运维形态。你负责选定运行时。

决策：

1. Python + FastAPI + 每秒数千个短生命周期 agent -> **Agno**。
2. TypeScript + Next.js/Vercel + 统一的多提供商接入 -> **Mastra**。
3. 持久化状态、显式图、失败后恢复 -> **LangGraph**（第 13 课）。
4. 以 Claude 为主的产品，想要 Claude Code 那种 harness 形态 -> **Claude Agent SDK**（第 17 课）。
5. 以 OpenAI 为主的产品，想要 handoff + 护栏 + tracing -> **OpenAI Agents SDK**（第 16 课）。
6. 多 agent 团队、actor 模型并发、故障隔离 -> **AutoGen v0.4** / **Microsoft Agent Framework**（第 14 课）。
7. 基于角色的协作或事件驱动的确定性工作流 -> **CrewAI** 的 Crew 或 Flow（第 15 课）。
8. 以上都不是 -> 直接调用 API + 第 01 课的标准库循环。

输出：

- 一份简短的决策文档：技术栈、延迟目标、所需原语、观察到的取舍。
- 在所选运行时中的最小脚手架。
- 如果当前已在用别的运行时，给出迁移方案。

直接否决：

- 工作负载是每个请求一次慢调用时，纯粹因为"性能"选 Agno 或 Mastra。性能很少是瓶颈。
- 在 Python monorepo 里无理由地选 TypeScript 运行时。混合语言的 agent 代码是一笔运维税。
- 为无状态的短任务选 LangGraph。checkpointer 带来的开销，用简单工作流（第 12 课）就能避免。

拒绝规则：

- 如果用户想要"五个运行时都做一遍，比较一下"，拒绝。在你自己的工作负载上做基准测试；框架厂商的基准只能当方向参考。
- 如果用户想自托管 Mastra 的 `ee/` 功能，拒绝，并指向其许可条款。
- 如果产品需要长时间运行的异步工作（数小时到数天），拒绝自托管，转到 Claude Managed Agents 或基于队列的架构（第 29 课）。

输出：决策文档 + 脚手架 + README。结尾写"接下来读什么"：框架之上的运维层看第 24 课（可观测性）和第 29 课（生产运行时）。
