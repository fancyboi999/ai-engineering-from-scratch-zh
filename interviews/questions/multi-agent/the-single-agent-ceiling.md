---
id: the-single-agent-ceiling
title: 单个 agent 在哪里遇到瓶颈，为什么
card: multi-agent
kind: concept
level: 1
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [single-agent-ceiling, context-saturation, role-confusion, parallelism]
minutes: 6
lessons: [phases/16-multi-agent-and-swarms/01-why-multi-agent]
manuals: []
practice: []
cheatsheet: [multi-agent]
related: []
updated: 2026-11-03
---

你的单 agent 方案在精简的小任务上表现良好。但面对一个跨越三种语言、包含 200 个文件，且测试依赖基础设施并需先调研外部 API 的代码库时，它停止推进了。团队提议更换为上下文窗口更大的模型。它遭遇的瓶颈是什么，更大的窗口能否消除它？

## Short answer

该任务超出了单个循环、单个窗口以及单份系统 prompt 所能承载的范围，而更大的窗口只能推迟三项限制中的一项。随着工具结果的累积，上下文达到饱和，早期轮次的细节到第 30 轮时已经丢失；要求模型同时调研、编写代码、审查和测试的单份 prompt 会产生一个各项都做不好的 agent。单个循环只能依次读取文件 A、B 和 C，没有并行性。解决这三项问题的方案是将工作拆解开来，使每个 agent 拥有一个职责、一个窗口和一份 prompt。

## Full answer

### 三处失效

1. **上下文饱和。** 工具结果不断累积。到第 30 轮时，agent 已消耗了约 150k token 的文件内容、命令输出及其自身推理，第 5 轮的细节已经丢失。读取 50 个大文件便可超过 200k 窗口。
2. **角色混乱。** 声明你既是研究员、程序员、审查员又是测试员的系统 prompt，会产生一个半吊子调研、半吊子编码且从未完成审查的 agent。
3. **顺序瓶颈。** Agent 在三次串行模型调用和三次串行工具执行中读取三个文件。没有任何事情是同时运行的。

### 更大的窗口改变了什么

它延缓了第一项限制，对另外两项则毫无作用。Agent 仍会忘记 40 次工具调用前读取的内容，因为问题在于跨漫长历史的注意力，而不是硬性限制。Prompt 仍要求一个模型担任四种角色。循环仍是串行的。

### 拆解

赋予每个 agent 一个职责、一个窗口和一份针对该工作调优的 prompt。研究员阅读文档并仅输出实现所需的事实。程序员接收这些事实并编写代码。审查员接收代码并寻找 bug。研究员的阅读过程绝不进入审查员的窗口，因为每个 agent 仅接收发给它的消息。

### 何时保持单 Agent

课程的经验法则：少于 20 次工具调用且适合 100k token 的任务保持使用单 agent。拆解会消耗更多总 token，增加带有自身 bug 的协调逻辑，并将调试从阅读单一对话变成在多个对话之间追踪消息。

## Follow-ups

- **Level 1:** 并行性解决了三项限制中的哪一项？ Expected: 仅解决顺序瓶颈，因为同时读取三个文件既不会缩小任何一个窗口，也不会明确任何一份 prompt。
- **Level 2:** 为什么专用 prompt 会改善每个阶段？ Expected: 涵盖单一角色的 prompt 可以具体明确输入、输出和需要忽略的内容，而涵盖四个角色的 prompt 只能是泛泛的。
- **Level 2:** 拆解总是会增加什么成本？ Expected: 更多总 token，因为每个 agent 是单独的模型调用，加上延迟和协调逻辑。
- **Level 3:** 在多 agent 拆分中，信息在何处丢失？ Expected: 在每个 agent 边界处，一个 agent 的完整上下文被压缩成发给下一个 agent 的消息。

## Wrong answers

- "更大的上下文窗口可以解决该问题。" 该窗口推迟了一项限制，而未触及角色混乱和串行循环。
- "更长、更详细的系统 prompt 可以覆盖这些角色。" 涵盖四个角色的单一 prompt 是角色混乱的原因，而不是解药。
- "一律拆解，因为专家更好。" 在约 20 次工具调用和 100k token 以下，拆解增加了成本和 bug，却毫无收益。

## Taught in

[为什么使用多 agent 课程](../../../phases/16-multi-agent-and-swarms/01-why-multi-agent/)指明了这三项限制以及保持单 agent 的经验法则。
