---
id: why-a-fresh-context-wins
title: 为什么在研究任务上 lead 与 workers 胜过单 agent
card: multi-agent
kind: concept
level: 1
roles: [agentic-ai-engineer, applied-ai-engineer]
rounds: [screen, ml-breadth]
tags: [supervisor, fresh-context, token-usage, parallelism, synthesis]
minutes: 6
lessons: [phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern]
manuals: []
practice: []
cheatsheet: [multi-agent, research-agent-pipeline]
related: [multi-agent/the-single-agent-ceiling]
updated: 2026-11-03
---

一套由一个 lead agent 和多个 worker agent 组成的研究系统，在一次内部评估中以较大优势击败了单个 agent。请解释其机制，并说明哪一个单一变量解释了大部分收益。

## Short answer

Lead 规划并拆解问题，每个 worker 获得针对一个狭窄子问题的纯净窗口，且 lead 在从不阅读原始源数据的情况下合成 worker 的摘要。三项机制带来了收益：每个 worker 的纯净上下文、每个角色的狭窄 prompt，以及同时运行的 worker。解释大部分收益的变量是总 token 使用量，课程的来源指出它在某项浏览基准上解释了 80% 的方差。不背负 lead 规划 token 的 worker 拥有阅读的空间。

## Full answer

### 形态

Lead 接收问题，将其拆解为子问题，并将一个子问题发送给每个 worker。每个 worker 从其自身的系统 prompt 和子问题启动，而不是从 lead 的历史启动。worker 返回摘要。Lead 从不查看原始素材，只查看摘要，并从中编写答案。

### 三项机制

1. **纯净上下文。** 处理一个子问题的 worker 不背负 lead 花费在规划上的数万 token。它拥有面向其问题的完整窗口。课程的数据显示每个 worker 拥有 200k 窗口，而 lead 已经使用了 40k。
2. **基于 Prompt 的专业分工。** Lead 的 prompt 指明拆解和合成。每个 worker 的 prompt 指明寻找某件事中发生的变化。狭窄的 prompt 产生狭窄、可用的输出。
3. **并行性。** Worker 并发运行，因此真实耗时大致为耗时最长的 worker 加上规划和合成，而不是所有 worker 耗时的总和。

### 收益与其代价

课程报告在内部评估中相比单 agent 获得了 90.2% 的相对增益，且成本约为单 agent 的 15 倍 token。同一来源指出，某项浏览基准上约 80% 的方差单由 token 使用量解释。该模式胜出是因为它在有帮助的地方花费了更多 token，而不是因为 lead 聪明。

### 随之而来的操作经验

根据问题调整算力：简单查询需要一个 agent 和少数工具调用，复杂查询可能需要十个以上的 worker，且 lead 必须做此估算。先广后深拆解，然后在回答有充分理由的地方深入。长时间运行的有状态 agent 需要平滑部署以便旧版本自然排空，而不是热替换。

## Follow-ups

- **Level 1:** 为什么 lead 不读原始源数据？ Expected: 好让它的窗口留出空间做规划和合成，并使每个源由拥有它的 worker 读取一次。
- **Level 2:** 该模式何时会输给流水线？ Expected: 当第二步需要第一步的输出时，因为此时没有并行工作，额外的 agent 只会增加 token。
- **Level 2:** 当两个 worker 出现分歧时，lead 怎么做？ Expected: 重新提问或在答案中注明分歧，绝不在沉默中偏向一方。
- **Level 3:** worker 漂移超出其子问题，什么能阻止它？ Expected: 其 prompt 中的显式作用域、大约为中位数 worker 运行时两倍的超时，以及 token 上限，之后 lead 可以使用更窄的问题重新派生或在没有该结果的情况下继续。

## Wrong answers

- "Lead 是更大的模型，所以更聪明。" 收益跟踪 token 使用量，且 worker 承担阅读工作；单靠更大的 lead 不会改变关于上下文的任何问题。
- "多 agent 更便宜，因为 worker 很小。" 它花费大约 15 倍的 token，只有当任务价值覆盖该成本时才值得。
- "也给 lead 原始源数据，以便其可以检查 worker。" 这会用 worker 已经读取的内容填满 lead 的窗口，并消除纯净上下文的优势。

## Taught in

[Supervisor 模式课程](../../../phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern/)构建了 lead 和并行 worker，并报告了测得的收益。
