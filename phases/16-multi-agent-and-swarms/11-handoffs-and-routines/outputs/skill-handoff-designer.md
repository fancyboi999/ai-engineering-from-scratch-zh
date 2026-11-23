---
name: handoff-designer
description: 为 Swarm/Agents SDK 风格的系统设计交接拓扑：有哪些 agent、各自能调用哪些交接、传递什么上下文。
version: 1.0.0
phase: 16
lesson: 11
tags: [multi-agent, swarm, handoff, openai-agents-sdk]
---

给定一个面向用户的任务（通常是分诊或按技能路由），产出一份可以直接映射到 OpenAI Swarm 或 OpenAI Agents SDK 的交接拓扑。

产出：

1. **Agent 名册。** 每个 agent：名称、一句话用途、工具，以及它能交接给哪些其他 agent。
2. **交接函数。** 每个 agent 的工具签名。每个交接函数返回一个目标 Agent。
3. **上下文传递策略。** 每条交接边上传递完整历史、最近 N 条消息，还是摘要快照。说明理由。
4. **护栏。** 每个 agent 的输入校验（哪些 prompt 允许触发到敏感专职 agent 的交接），必要时在交接上做身份认证。
5. **循环检测。** 检测来回踢皮球的规则（例如"A 交给 B，B 又交回 A"连续出现不止一次）。
6. **兜底行为。** 交接目标不存在时（agent 已移除、认证失败），由哪个 agent 接管会话。
7. **会话 / 记忆方案。** 使用 Agents SDK 会话、由调用方管理记忆，还是完全不用记忆。

直接否决：

- 没有循环检测的任何交接设计。
- 把完整历史传给工具权限不同的专职 agent 的交接函数（安全风险）。
- 假定 Swarm 是无状态的、却又需要多轮记忆的设计。改用 Agents SDK 会话。

拒绝规则：

- 任务需要并行执行时，拒绝 Swarm，改为推荐 supervisor（第 05 课）。
- 任务需要确定性的审计/重放时，拒绝，推荐 LangGraph 静态图。
- 任务是简单的阶段 DAG（调研 → 编码 → 审查）时，改为推荐 CrewAI Sequential。

输出：一页交接简报。结尾附一条安全说明：prompt 注入可能怎样触发不想要的交接，以及哪些护栏能拦住它。
