---
id: when-one-agent-is-enough
title: 一个 agent 就能处理的任务，用了五个 agent
card: multi-agent
kind: tradeoff
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, system-design]
tags: [single-agent, complexity-cost, lossy-boundary, coordination, latency]
minutes: 8
lessons: [phases/16-multi-agent-and-swarms/01-why-multi-agent]
manuals: []
practice: []
cheatsheet: [multi-agent]
related: [multi-agent/the-single-agent-ceiling]
updated: 2026-11-03
---

某团队提议引入一个包含规划者、检索者、撰写者、审查者和排版格式化者的五 agent 流水线，用于替换当前单个 agent 凭十来次工具调用就能处理的摘要功能。其论据是专职人员产出更好的输出。你会如何决定，该流水线会带来哪些未展示在 PPT 中的成本？

## Short answer

保留单个 agent，除非任务未通过以下三项检验之一：它需要的上下文超过一个窗口所能容纳的范围、在不同阶段需要不同的 prompt，或者有可以同时运行的工作。任务能放进一个窗口，只需十来次工具调用，这三项检验一项都没通过。该流水线在四个边界处各增加一次有损压缩，还增加了可能出 bug 的协调逻辑、至少五次串行模型调用的延迟，以及五倍的 token 成本。

## Full answer

### 三项测试

| 测试 | 核心问题 | 该任务 |
|---|---|---|
| 上下文 | 工作数据是否超过一个窗口（约 100k token）？ | 否，十来次工具调用可以容纳 |
| 专业分工 | 各阶段是否需要不同的系统 prompt？ | 摘要器和格式化器可以共享一份 prompt |
| 并行性 | 工作的各个部分能否同时运行？ | 各阶段是串行的 |

课程的经验法则是：20 次工具调用以下且在 100k token 以内的任务保留在单个 agent 上。

### 隐藏成本

- **有损边界。** Agent 之间传递的每条消息都会将发送方的完整上下文压缩成一条消息。四个边界就是审查者所需细节丢失的四个地方。
- **协调 bug。** 谁在何时、以何种顺序、使用何种输入运行是新代码，它会以新方式失败。
- **延迟。** 五个 agent 是至少五次串行模型调用，如果审查者将工作打回给撰写者，调用次数会更多。
- **成本。** 每个 agent 消耗自己的 token，因此账单倍增。
- **调试。** 一次对话变成了五次对话，错误答案必须在它们之间的消息中追踪。

### 什么时候 PPT 是对的

如果该功能扩展为总结无法装入单个窗口的文档，按文档拆分并合并。如果审查者需要针对撰写者提出反驳的 prompt，那就是真正的第二角色。如果可以同时读取三个源，就做扇出。这些分别对应三项测试之一，拆分应匹配它所通过的测试，而不是一次性添加所有角色。

### 如何解决该争论

在同一任务集上运行两者，并测量质量、延迟和 token。课程的对比显示多 agent 版本使用了更多总 token，而每个阶段的上下文保持干净。如果质量收益无法弥补延迟和成本，单个 agent 胜出。

## Follow-ups

- **Level 2:** 审查者把草稿打回给撰写者。这会对延迟产生什么影响？ Expected: 每轮增加两次串行模型调用，因此循环必须对轮数设置上限。
- **Level 2:** 如果必须拆分，你会优先接受哪一个拆分？ Expected: 带有对抗性 prompt 的审查者，因为它是唯一需要不同系统 prompt 的角色，且仅在评估显示有收益时才拆分。
- **Level 3:** 为什么将 agent 之间的边界描述为有损压缩？ Expected: 接收 agent 仅看到消息，看不到发送者的工具结果和推理，因此未写入消息的任何细节都已丢失。
- **Level 3:** 如果必须在严格的延迟目标下生成摘要，该选择如何改变？ Expected: 串行阶段是延迟的死敌，因此保持单一，或者只对能并行运行的部分做扇出。

## Wrong answers

- "专家总是击败通才。" 任务未通过三种检验之一时，专家才有优势，而这项任务一项都没通过。
- "更多 agent 意味着更多检查，因此质量会上升。" 每个边界都会丢失信息，且从未见过源的审查者无法检查它们。
- "在我们的规模下 token 成本并不重要。" 五个 agent 在每次请求时使账单和延迟倍增，这是产品决策，而不是细节。

## Taught in

[为什么使用多 agent 课程](../../../phases/16-multi-agent-and-swarms/01-why-multi-agent/)给出了三项测试、复杂度成本和经验法则。
