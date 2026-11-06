---
id: who-picks-the-next-speaker
title: 轮询、模型选择器还是由当前 agent 决定下一发言者
card: multi-agent
kind: tradeoff
level: 2
roles: [agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [design-review, ml-breadth]
tags: [speaker-selection, group-chat, handoff, orchestrator, termination]
minutes: 10
lessons: [phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection, phases/16-multi-agent-and-swarms/11-handoffs-and-routines]
manuals: []
practice: []
cheatsheet: [multi-agent, agent-frameworks-compared]
related: [multi-agent/two-agents-hand-off-forever, multi-agent/four-primitives-for-any-framework]
updated: 2026-11-03
---

四个 agent（程序员、审查员、测试员和研究员）共享一个对话空间。你必须决定在每轮中如何选择下一个发言者。备选方案包括：固定轮询、由读取近期消息的模型选择，以及让当前 agent 指定其继任者。请对比它们，并说明你会随每种方案交付什么。

## Short answer

固定轮询具有确定性且成本低廉，但在讨论法律问题时它仍会将发言机会交给程序员。模型选择器具有上下文感知能力，但每轮增加了一次额外的模型调用，面对相同输入时选择不同，且往往偏向某一个 agent。当前 agent 自行交接将路由保留在 prompt 中而无需外部管理者，当两份 prompt 不一致时它就是陷入循环的模式。大多数生产聊天使用带有后备规则、轮数上限、终止信号并记录每次选择的选择器。

## Full answer

### 三种选择器

| 选择器 | 优势 | 劣势 |
|---|---|---|
| 轮询 | 确定性，无额外调用，随 agent 数量线性扩展 | 忽略上下文，因此错误的 agent 会获得发言机会 |
| 模型选择 | 读取池并选择最佳的下一个发言者 | 每轮增加一次调用，在不同运行间不一致，且可能偏向活跃的发言者 |
| 当前 agent 交接 | 无管理者，路由位于每个 prompt 中 | 两份 prompt 可能形成闭环，且注入的消息可以强行发起交接 |

### 谁在决定，以及在哪里决定

第二种与第三种之间的区别在于决策位于何处。在群聊中，选择器位于 agent 外部并读取共享池。在交接模式中，活跃的 agent 调用返回下一个 agent 的工具做决定。外部的管理者可以看到两个 agent 之间的交替并打破它。循环内部的 agent 则做不到。

### 群聊中会出现什么问题

- **非确定性。** 相同的池在不同运行中会产生不同的下一个发言者，这损害了审计和重放。
- **顺从级联。** Agent 倾向于跟随发言最自信的人，因此 prompt 必须指明何时提出异议。
- **上下文增长。** 每个 agent 阅读每条消息，约 10 轮后池就很大了，因此应为每个 agent 提供作用域受限的视图。
- **一个 agent 占主导。** 选择器不断挑选特长与最近消息匹配的 agent，因此应跟踪每个 agent 的轮次并对不平衡报警。

### 随附交付内容

1. 轮数上限，典型任务通常为 10 到 20 轮。
2. 终止信号：来自 agent 的哨兵 token，或每轮检查目标的校验器。
3. 发言者平衡指标，当一个 agent 占用过多轮次时发出告警。
4. 自定义选择器，将模型的选择与规则（例如“测试员在程序员之后发言”）相结合。
5. 记录选择器的输入及其选择的日志，因为没有它就无法调试错误的选择。

### 每种方案何时适用

固定轮询适合顺序已知的阶段式流水线。模型选择器适合流向不是图的探索性对话。交接适合分诊，前端 agent 将用户路由给一位专家，且对话简短。

## Follow-ups

- **Level 2:** 为什么模型选择器不仅需要记录其输出，还需要记录其输入？ Expected: 选择取决于选择器看到了什么，没有输入，审查者无法判断是选择错了还是池错了。
- **Level 2:** 相比哨兵 token，基于校验器的终止增加了什么？ Expected: 聊天在检查通过时停止，而不是在 agent 声称完成时停止，这消除了自信 agent 的过早终止。
- **Level 3:** 这三种方案中哪一种会使 prompt 注入更严重，为什么？ Expected: 交接模式，因为决定性的工具调用是由刚阅读了注入文本的 agent 做出的，而外部选择器可以应用 agent 无法控制的规则。
- **Level 3:** 自定义选择器如何在不丢失上下文感知的情况下修复活跃发言者问题？ Expected: 让模型提出建议，然后应用限制每个 agent 连续轮次并强行让校验器或安静 agent 介入的规则。

## Wrong answers

- "使用模型选择器，因为它能理解对话。" 它还会每轮增加一次调用，选择不一致，且除非规则和平衡指标对其加以约束，否则会偏向一个 agent。
- "轮询是公平的，所以它是安全的。" 公平的轮次并不是有用的轮次，程序员在法律问题上发言会浪费一轮并向池中添加噪音。
- "让 agent 之间自行决定。" 那是交接模式，它是形成循环的模式，且注入的消息可以引导它。

## Taught in

[群聊课程](../../../phases/16-multi-agent-and-swarms/10-group-chat-speaker-selection/)构建了三种选择器和终止规则，[交接与规程课程](../../../phases/16-multi-agent-and-swarms/11-handoffs-and-routines/)对比了管理者的决策与 agent 的决策。
