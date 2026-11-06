---
id: full-pool-or-blackboard
title: 每个 Agent 通读所有消息还是订阅主题
card: multi-agent
kind: tradeoff
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [design-review, system-design]
tags: [message-pool, blackboard, subscription, projection, write-contention]
minutes: 10
lessons: [phases/16-multi-agent-and-swarms/13-shared-memory-blackboard]
manuals: []
practice: []
cheatsheet: [multi-agent]
related: [multi-agent/a-number-that-never-existed, multi-agent/four-primitives-for-any-framework]
updated: 2026-11-03
---

一个由四个 agent 组成的团队共享一份消息日志，且每个 agent 都会阅读全部内容。团队即将增加到数十个 agent，且每个 agent 携带的上下文已经很大。请对比保留单一日志与转向由 agent 订阅的主题的优劣，并说明你将如何处理多个 agent 同时写入的情况。

## Short answer

完整池简单、透明且易于检查，但在大约 10 个 agent 时停止扩展，因为每个 agent 的窗口都会被其他 agent 的工作填满。带有订阅的黑板仅向每个 agent 路由相关消息，因此扩展性更强，且需要付出预先设计 schema 的代价以使主题具有意义。许多系统将两者混合使用：规划层使用小型池，其下使用黑板。对于写入，大多数系统通过单个写入者串行化，因为模型调用足够慢，竞争很少发生。

## Full answer

### 两种拓扑

| 拓扑 | 谁读什么 | 何时胜出 | 代价 |
|---|---|---|---|
| 完整消息池 | 每个 agent 阅读每条消息 | 少量 agent、混合角色、短周期 | 上下文随着每轮增长，投毒会扩散给每个人 |
| 带有订阅的黑板 | Agent 声明主题并仅接收这些主题 | 许多 agent、类似角色、长期运行 | 在主题具有任何意义之前必须存在 schema |

当推理谁说了什么由于每个人都看到了所有内容而开销低廉时，池会胜出。当路由节省 token 并使无关工作远离每个窗口时，黑板会胜出。

### 投影更进一步

黑板为主题的每个订阅者提供相同的视图。每个 agent 的投影为每个角色提供从全局状态计算出的视图，这正是图运行时中状态 reducer 所做的事情。它的扩展性最强且需要 schema，没有 schema 时，每个 agent 会在自己的 prompt 中重建自己的投影。

### 写入

来自多个 agent 的并发写入是并发问题，而不是模型问题。三种模式有效：

1. **单个写入者。** 所有写入都通过一个协调器串行化。简单，但存在瓶颈。
2. **带有版本的乐观并发。** 每个条目携带一个版本，写入在不匹配时失败并重试。
3. **主题分区。** 每个 agent 拥有主题，因此没有跨主题竞争，且分区边界必须经过设计。

大多数框架默认为单个写入者，因为模型调用足够慢，该瓶颈不会造成损害。

### 不变的部分

两种拓扑都是共享状态（系统唯一有状态的部分），且两者都需要每个条目上的溯源、仅追加日志和只读校验器。主题分区限制了谁读取被投毒的条目。它不会阻止投毒。

### 该模式有着悠久历史

黑板早于模型 agent 四十年出现。专家知识源监控共享黑板，贡献局部解法并相互触发。当前的系统是相同的模式，以模型 agent 作为知识源，以结构化条目作为局部解法，旧文献早已记录了写入竞争和一致性。

## Follow-ups

- **Level 2:** 三个 agent 的规划层与三十个 agent 的 worker 层。哪种拓扑放在哪里？ Expected: 三个规划者使用完整池，他们需要看到彼此；worker 使用黑板，他们只需要自己的主题。
- **Level 2:** 主题分区使哪些投毒场景变得更困难？ Expected: 投毒条目仅到达其主题的订阅者，因此切断了跨主题扩散，而该主题的订阅者以同样方式被投毒。
- **Level 3:** 你什么时候会从单个写入者转向乐观版本控制？ Expected: 当写入足够频繁使得协调器的队列增加了可见延迟时，在每次写入都跟随缓慢模型调用的情况下这很少见。
- **Level 3:** 在没有 schema 的情况下添加黑板会出现什么问题？ Expected: 主题命名随意，agent 订阅错误的主题或订阅所有内容，你用更多代码重建了完整池。

## Wrong answers

- "保留池并给 agent 更大的窗口。" 池随着每个 agent 的每轮发言而增长，更大的窗口延缓了限制而没有消除它。
- "在 agent 之间直接传递消息而不是共享状态。" 直接消息是带有额外复制的共享状态，它们失去了可检查的日志。
- "按主题分区，投毒问题就解决了。" 分区限制了扩散，没有溯源且没有校验器的条目仍会投毒其主题的每个订阅者。

## Taught in

[共享内存课程](../../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/)构建了两种拓扑和写入竞争模式。
