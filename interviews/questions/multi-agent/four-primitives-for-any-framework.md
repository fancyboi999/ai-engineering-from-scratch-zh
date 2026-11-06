---
id: four-primitives-for-any-framework
title: 一段话看懂任何多 Agent 框架
card: multi-agent
kind: concept
level: 1
roles: [agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-breadth]
tags: [primitives, handoff, shared-state, orchestrator, frameworks]
minutes: 6
lessons: [phases/16-multi-agent-and-swarms/04-primitive-model]
manuals: []
practice: []
cheatsheet: [multi-agent, agent-frameworks-compared]
related: [multi-agent/the-single-agent-ceiling]
updated: 2026-11-03
---

每隔几个月就会发布一个新的多 agent 框架，每个框架都有自己的一套词汇。请给出你快速理解新框架的方法，并指出每个此类系统中难缠 bug 所在的部分。

## Short answer

将该框架映射到四个原语上：agent、交接（handoff）、共享状态和编排器（orchestrator）。每个框架都在每个轴向上选择了一个默认值，其余的都是表层语法。Agent 是系统 prompt 加上工具且无状态，交接是结构化的控制权转移，编排器决定下一个由谁运行，而共享状态是全系统唯一有状态的部分。那正是难缠 bug 所在之处：内存投毒、消息顺序、版本控制和写入竞态。

## Full answer

### 四个轴向

| 原语 | 定义 | 常见实现 |
|---|---|---|
| Agent | 系统 prompt、工具列表和模型，自身没有记忆 | 与具有相同 prompt 和工具的任何 agent 可互换 |
| 交接（Handoff） | 从一个 agent 到另一个 agent 的结构化控制权转移 | 返回下一个 agent 的工具、带有条件的图边，或发言者选择函数 |
| 共享状态（Shared state） | 多个 agent 读取且有时写入的任何数据 | 完整消息池、基于主题的黑板、带有 reducer 的类型化状态、外部存储 |
| 编排器（Orchestrator） | 决定下一个由谁发言的主体 | 静态图、选择发言者的模型、当前 agent 的交接调用，或基于队列的调度器 |

### 三个问题回答大部分内容

1. 编排器是信任模型做路由，还是由代码固定路由？
2. 共享状态是完整的历史记录，还是针对各角色的投影视图？
3. agent 可以更改彼此的 prompt，还是只能交接？

课程认为这三个问题回答了约 80 percent 的“哪种框架适合某个问题”。你不再到处寻找最佳框架，而是开始围绕你关心的轴向去设计。

### 无状态的洞察

Agent 是其 prompt 和工具的函数。交接是函数调用。编排器是调度器。只有共享状态将内容从一个步骤带到下一个步骤，因此每个有趣的 bug 都是共享状态 bug。隐藏状态的框架将问题推给调用方。集中管理状态的框架使状态可检查，并将协调成本转移到状态实现中。

### 什么不是原语

持久检查点、交接的人工审批、针对每个 agent 的 token 预算和跟踪都是建立在四者之上的。它们是设计决策，而不是新的轴向。如果某个框架声称拥有第五个原语，请检查它是否是你未见过的某种共享状态形态。

## Follow-ups

- **Level 1:** 两个 agent 拥有相同的 prompt 和相同的工具。它们有何区别？ Expected: 没有区别，因为看起来像每个 agent 私有状态的所有内容都在共享状态或交接中。
- **Level 2:** 列出实现交接的三种方式。 Expected: 返回下一个 agent 的工具、由条件选择的图边，以及从池中选择下一个发言者的选择函数。
- **Level 2:** 完整池或投影状态，哪种扩展性更强且代价是什么？ Expected: 投影状态扩展性更强，且需要预先设计 schema，以便定义每个角色的视图。
- **Level 3:** 在采用框架之前，你首先编写什么？ Expected: 其四原语映射，如果你无法编写它，说明文档不完整或该框架在虚构原语。

## Wrong answers

- "每个框架都有自己的架构，所以一次学一个。" 这些架构是同一个四轴空间中的点，学习一次轴向就能读懂每次发布。
- "agent 保留记忆。" 根据定义，agent 是无状态的，记忆保存在共享状态或交接负载中。
- "编排器是智能的部分，所以选择拥有最好编排器的框架。" 编排器是具有四种形态的调度器，选择取决于你有多信任模型来做路由。

## Taught in

[原语模型课程](../../../phases/16-multi-agent-and-swarms/04-primitive-model/)构建了这四个原语，并将当前的框架映射到它们之上。
