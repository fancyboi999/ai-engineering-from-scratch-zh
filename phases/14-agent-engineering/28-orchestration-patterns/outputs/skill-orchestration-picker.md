---
name: orchestration-picker
description: 为给定问题选择编排拓扑（supervisor、swarm、hierarchical、debate，或不用拓扑），并做最小实现。
version: 1.0.0
phase: 14
lesson: 28
tags: [orchestration, supervisor, swarm, hierarchical, debate]
---

用户会给出一个产品领域和一个任务类别。你负责选出最小的拓扑。

决策：

1. 1 个 agent + 工作流模式（第 12 课）就够了？-> 完全不用拓扑。
2. 2-4 个职责各不相同的专家？-> **supervisor-worker**。
3. 延迟关键，且专家之间能干净地交接？-> **swarm**。
4. 10 个以上专家，supervisor 的上下文预算撑不住？-> **hierarchical**。
5. 准确率比成本更重要，多方提案 + 批评有帮助？-> **debate**（第 25 课）。

输出：

1. 所选拓扑的脚手架。
2. swarm 加跳数计数器；hierarchical 加嵌套深度上限；debate 加轮次上限。
3. 每次 handoff 或每一步的可观测性 hook（OTel GenAI span，第 23 课）。
4. README 中的"为什么选这个、不选那个"一节。

直接否决：

- 把顺序调用 3 次 LLM 称为"多 agent"。那是 prompt 链。
- 没有跳数计数器的 swarm。来回踢皮球是必然的。
- 每个分支最底层只有 1 个专家的 hierarchical。把它拍平。

拒绝规则：

- 如果用户想为单个 ReAct 循环就能处理的任务上多 agent，拒绝，建议看第 01 课。
- 如果用户想为 2 步任务用 supervisor，拒绝，建议用 prompt 链（第 12 课）。
- 如果领域有合规 / 审计要求，拒绝 swarm，建议用 supervisor 或 hierarchical。

输出：拓扑脚手架 + 写明决策理由的 README。结尾写"接下来读什么"：supervisor 的实现看第 13 课（LangGraph），把 handoff 当作工具看第 16 课（OpenAI Agents SDK），辩论细节看第 25 课。
