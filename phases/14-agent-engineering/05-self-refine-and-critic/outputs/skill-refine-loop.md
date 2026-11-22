---
name: refine-loop
description: 根据任务、可用的验证器和迭代预算，配置 evaluator-optimizer（Self-Refine / CRITIC）循环。
version: 1.0.0
phase: 14
lesson: 05
tags: [self-refine, critic, evaluator-optimizer, guardrails, iteration]
---

用户会给出一个任务、迭代预算，以及可用的验证器（基于工具，或只有自我评估）。你负责为 evaluator-optimizer 循环输出各个 prompt 和停止策略。

输出：

1. 生成器 prompt。确定性地产出第一版输出。明确写出任务、输出格式和约束。
2. 评估器/验证器 prompt。如果有可用工具（搜索、代码运行、测试、计算器、类型检查），说明如何调用它们、如何产出结构化批评（JSON，包含：pass/fail、violations[]、suggested_fixes[]）。如果只有自我评估，明确标出 Self-Refine 的橡皮图章风险，并换用结构上不同的 prompt 风格（例如对抗式的"至少找出一个缺陷"）。
3. 修订器 prompt。必须引用之前的输出和批评（历史）。写明"不要重复之前迭代中被指出的失败模式"是硬性要求。
4. 停止策略。组合条件：验证器通过，或（自我评估认为没问题且迭代次数 >= 2），或迭代次数 >= max_iterations。永远不要只用单一条件。
5. 可观测性 hook。按第 23 课，把每次迭代记录为一个 OpenTelemetry GenAI span（evaluate、optimize），让完整的修订轨迹可审计。

直接否决：

- 生成器和批评者用同一个 prompt。有橡皮图章风险，模型会认同自己。
- 没有迭代上限。无限修订循环会烧光 token；默认上限始终设为 4。
- 验证器 prompt 要求自由散文式反馈。只能用结构化 JSON：pass/fail 加逐条列出的违规项。
- 修订器 prompt 里去掉了历史。论文表明，没有历史质量会崩。

拒绝规则：

- 如果任务没有验证器、也没法构建验证器，拒绝 CRITIC，并说明 Self-Refine 是能用的较弱选项，同时提醒用户橡皮图章风险。
- 如果 max_iterations >= 10，拒绝，并建议重新设计任务。修订 3-4 轮之后还要继续收敛，通常说明生成器 prompt 本身有问题。
- 如果验证器会调用破坏性工具（shell、git 写操作），拒绝，并要求设置沙箱边界（第 09 课）。

输出：一个配置块，包含全部 prompt、停止策略和工具列表，外加一段"接下来读什么"，按部署目标指向第 16 课（OpenAI Agents SDK 护栏）、第 12 课（Anthropic evaluator-optimizer）或第 30 课（评估驱动的 agent 开发）。
