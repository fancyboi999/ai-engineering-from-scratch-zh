---
id: two-workers-return-different-facts
title: 两个 worker 返回不同事实，报告只展示了一个
card: multi-agent
kind: debug
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [synthesis-conflict, supervisor, provenance, worker-timeout, scope]
minutes: 12
lessons: [phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern]
manuals: []
practice: []
cheatsheet: [multi-agent, research-agent-pipeline]
related: [multi-agent/why-a-fresh-context-wins]
updated: 2026-11-03
---

在一套由 lead 与多个 worker 构成的研究系统中，两个 worker 在回答重叠的子问题时给出了相互矛盾的数字。最终报告包含了其中一个数字，而没有提及另一个。用户在源中发现了第二个数字，并询问为什么报告隐瞒了它。系统在何处出现故障，你会做出哪些改变？

## Short answer

lead 未作说明就选了一方，借此解决合成冲突，课程将这称为该模式中最严重的失败，因为用户永远无法得知存在分歧。两个上游原因促成了这一点：拆解让两个 worker 调查了相同的事实，且没有 worker 拥有阻止其漂移进入对方领域的作用域。修复方法是让 lead 能够检测 worker 输出之间的矛盾，并要么使用更聚焦的问题重新提问，要么将分歧写入答案中，再加上每个合成断言上的溯源。

## Full answer

### 该模式下的三种故障模式

| 故障 | 此处发生了什么 |
|---|---|
| Lead 对计划产生幻觉 | 子问题重叠，因此两个 worker 研究了相同的事实 |
| Worker 过度探索 | 没有作用域边界的 worker 漂移越过其问题进入另一个 worker 的领域 |
| 合成冲突 | 到达了两个矛盾的事实，且 lead 未加说明地选择了一个 |

第三个是用户看到的。前两个促成了它的发生。

### 无需模型即可检测冲突

课程探讨了如何在没有模型调用的情况下检测矛盾。规范化断言：提取每个数字及其单位和所描述的实体，以子问题为键做比对。一个键下的两个不同数值构成冲突。对于非数值断言，仅在两个 worker 阐述不同断言时才标记键。仅引用不同源并不构成冲突。让 lead 处理被标记的键。

### lead 面对冲突该怎么做

1. **重新提问。** 针对分歧派生出一个聚焦于更窄问题的 worker，这会增加一轮。
2. **呈现出来。** 将两个数值及其来源写入答案，并说明它们存在分歧。
3. **绝不悄悄选一个。** 选定数值却不作说明，就是题干中的故障。

### 防止重叠

先广后深拆解，并在 prompt 中给每个 worker 明确的作用域：子问题、超出范围的内容以及优先考虑的源。添加中位数运行时两倍左右的 worker 超时和每个 worker 的 token 上限，以便迷失的 worker 被终止，lead 使用更窄的问题重新派生或在没有该结果的情况下继续。

### 合成上的溯源

最终答案中的每个断言都标明来自哪个 worker 和哪个来源。这使得隐藏第二个数字变得不可能，因为带有两个来源的断言会显示两个数值，并使事后复盘成为阅读跟踪记录而非主观猜测。

## Follow-ups

- **Level 3:** 为什么不作说明就选一个，比选错但附有说明更糟？ Expected: 标明的分歧让读者可以核对源，而悄悄选定一个会将未解决的事实呈现为已定论。
- **Level 3:** 重新提问增加了一轮且延迟指标很紧。你该怎么做？ Expected: 在答案中呈现分歧而不是重新提问，并记录该键以供后续运行使用。
- **Level 4:** 你如何测试冲突检测器？ Expected: 向其输入在一个键上带有植入矛盾且在其他键上数值匹配的 worker 输出，并断言恰好该键被标记。
- **Level 4:** 两个 worker 意见一致且都是错的。什么能捕获它？ Expected: lead 中没有任何机制能捕获，因为一致不等于正确，因此具有自身源访问权限的独立校验器必须检查该断言。

## Wrong answers

- "在 lead 的 prompt 中添加一条规则要求谨慎对待数字。" Lead 不知道存在冲突，且 prompt 不会比较 worker 输出。
- "信任置信度更高的 worker。" 置信度不等于正确性，且用户仍无法得知曾发生过分歧。
- "每个子问题运行三个 worker 并取多数。" 多数可能共同犯错，这使成本增加两倍，且导致冲突的重叠仍留在计划中。

## Taught in

[Supervisor 模式课程](../../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/)指明了合成冲突以及 worker 超时和 token 上限。
