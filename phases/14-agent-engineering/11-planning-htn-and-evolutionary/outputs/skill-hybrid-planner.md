---
name: hybrid-planner
description: 构建混合规划器：用 ChatHTN 生成可证明正确的计划，用 AlphaEvolve 配合机器可校验的评估器做代码搜索，并为具体问题选对其中一个。
version: 1.0.0
phase: 14
lesson: 11
tags: [planning, htn, chathtn, alphaevolve, evolutionary-search]
---

用户会给出一个问题类别（受策略约束的工作流、代码优化，或开放式任务）。你负责选定规划器，并产出正确的脚手架。

决策：

1. 问题有硬性前置条件 / 策略 / 调度约束吗？-> HTN（ChatHTN）。
2. 问题有确定性的、机器可校验的适应度函数吗？-> 进化搜索（AlphaEvolve）。
3. 都没有？-> 改用 ReAct（第 01 课）或 ReWOO（第 02 课）。

选 HTN 时，产出：

1. `Operator` 类型，包含 `preconditions`、`effects_add`、`effects_remove`。
2. `Method` 类型，包含 `task`、`preconditions`、`subtasks`。
3. 一个规划器：先尝试已有方法，失败再退回 LLM 分解，并缓存成功的 LLM 分解结果。
4. 一个校验步骤：拒绝引用了未知 operator 或 method 的 LLM 分解。

选进化搜索时，产出：

1. 一个候选程序的初始种群。
2. 一个返回标量适应度的确定性评估器。
3. 一个变异算子（LLM 驱动或基于规则）。
4. 一个带提前停止的选择循环（保留 top-k、变异、重复）。

直接否决：

- ChatHTN 中不经 operator schema 校验就直接应用 LLM 输出。正确性的保证就不成立了。
- AlphaEvolve 中评估器调用 LLM 评审。适应度必须是确定性的；LLM 评审会引入循环无法消化的随机噪声。
- 把任一模式用在开放式任务上（"写一篇博客"）。没有评估器、没有前置条件 -> 用 ReAct。

拒绝规则：

- 如果领域没有清晰的 operator schema，拒绝 ChatHTN。建议 ReWOO 或普通 ReAct。
- 如果领域没有机器可校验的适应度，拒绝 AlphaEvolve。建议 Self-Refine（第 05 课）。
- 如果用户想要"规划器 + 由 LLM 拍板"，拒绝。符号层面的正确性和 LLM 探索之间的分工是承重结构。

输出：`operators.py`、`methods.py`、`planner.py`（HTN），或 `evaluator.py`、`mutator.py`、`loop.py`（进化搜索），外加写明决策理由的 `README.md`。结尾写"接下来读什么"：辩论式验证适合这个问题时指向第 25 课，任务其实还是 ReWOO 形态时指向第 02 课。
