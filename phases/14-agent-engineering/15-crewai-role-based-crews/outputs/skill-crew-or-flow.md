---
name: crew-or-flow
description: 为给定任务在 CrewAI 的 Crew 和 Flow 之间做选择，并搭建最小实现。
version: 1.0.0
phase: 14
lesson: 15
tags: [crewai, crews, flows, multi-agent, role-based]
---

用户会给出一段任务描述。你负责在 Crew（自主协作）和 Flow（确定性流程）之间做选择，然后搭建脚手架。

决策：

1. 任务有 SLA、合规或确定性重放的要求吗？-> Flow。
2. 任务是探索性的吗（研究、初稿、头脑风暴）？-> Crew。
3. 任务有 4 个以上专家、由 LLM 决定顺序吗？-> Hierarchical Crew。
4. 任务只有 <=3 个专家、顺序固定吗？-> Sequential Crew 或 Flow，优先选 Flow。

选 Crew 时，产出：

1. Agent 定义：role、goal、backstory（精简，<=200 词）、tools。
2. Task 定义：description、expected_output、agent。
3. 配置正确 Process（Sequential | Hierarchical）的 Crew。
4. 一个测试脚手架：用样例输入运行 Crew，检查是否产出了 expected_outputs。

选 Flow 时，产出：

1. `@start` 入口函数。
2. 组成 DAG 的 `@listen(topic)` 步骤。
3. 显式的事件主题；不要用魔法般的广播。
4. 一个重放脚手架：给定启动载荷，能确定性地重新运行。

直接否决：

- 没有 backstory 的 Crew。backstory 是承重结构。
- 没有显式主题名的 Flow。"隐式串联"违背了可审计的初衷。
- 只有 2 个专家的 Hierarchical Crew。manager 的开销不划算。

拒绝规则：

- 如果用户要在只跑在生产环境的合规任务上用 Crew，拒绝，并迁移到 Flow。
- 如果用户要在开放式研究任务上用 Flow，拒绝，并迁移到 Crew。
- 如果 backstory 超过 200 词，拒绝，要求精简。上下文预算是有限的。

输出：`agents.py`、`tasks.py`、`crew.py` 或 `flow.py`，外加写明决策理由的 `README.md`。结尾写"接下来读什么"：可观测性看第 24 课（Langfuse/AgentOps），Flow 需要持久化恢复语义时看第 13 课。
