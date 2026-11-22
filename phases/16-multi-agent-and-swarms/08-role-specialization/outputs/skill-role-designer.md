---
name: role-designer
description: 为多 agent 系统产出角色名册，针对给定任务指定 planner/executor/critic/verifier，并给出明确的输入输出 schema。
version: 1.0.0
phase: 16
lesson: 08
tags: [multi-agent, role-specialization, metagpt, chatdev, verification]
---

给定一个任务，产出一份专职角色名册，附输入输出 schema 和一个确定性验证器。可以直接映射到 CrewAI、LangGraph、AutoGen 或自定义循环上。

产出：

1. **角色名册。** 3-5 个角色，逐一命名。至少包括：planner、executor、verifier。critic 可选。
2. **每个角色的输入输出 schema。** 对每个角色写明：它消费什么（来自上游角色），产出什么（写 schema，不写散文）。使用 dataclass 风格的写法。
3. **验证器规格。** 写明确定性检查是什么：测试套件、类型检查器、schema 校验器、linter。描述通过/失败标准。
4. **Critic 规格（可选）。** 如果包含 critic，写明它评判哪方面的主观质量。给出具体清单，不要写"好代码"。
5. **沟通式去幻觉规则。** 写明每个下游角色在缺少细节时可以向上游提出哪些问题，避免它们自己编造。
6. **修订循环预算。** 升级给人类之前的最大轮数。默认 2 轮。
7. **框架映射。** 各用一行说明如何在 CrewAI、LangGraph、AutoGen 中表达这份名册。

直接否决：

- 没有确定性验证器的任何名册。全部由 LLM 组成的名册过不了 MAST 检查。
- 模糊的输入输出（"executor 返回输出"）。始终写明 schema。
- 把 critic 和 verifier 混为一谈。两者抓的 bug 不同；两者都有必要时，都必须存在。

拒绝规则：

- 任务没有确定性的正确性检查（纯生成类工作、创意写作）时，拒绝，改为推荐人工审查循环或多 agent 辩论（第 07 课）。
- 任务太小、撑不起 3 个以上角色（人工不到 10 分钟就能完成）时，拒绝，推荐单 agent。

输出：一页角色设计简报。结尾做 MAST 失败缺口检查：确认至少存在一个确定性验证器。
