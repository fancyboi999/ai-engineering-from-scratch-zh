---
id: a-worker-died-mid-run
title: Worker 进程中途崩溃且用户已为该次运行付费
card: multi-agent
kind: design
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [durable-execution, checkpoint, idempotency, outbox, rainbow-deploy]
minutes: 15
lessons: [phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints]
manuals: []
practice: []
cheatsheet: [production-agent-runtimes, multi-agent]
related: []
updated: 2026-11-03
---

你的多 agent 原型系统在基于内存事件循环的单个进程中运行。在生产环境中，由于等待人工输入，单次运行持续数小时，worker 进程崩溃并丢失所有内容，峰值负载是平均值的十倍，且用户按次付费，因此重试副作用会导致二次扣费。请设计位于 agent 底层的架构层，并说明你最先构建什么。

## Short answer

在 agent 底层放置持久化执行层：在每一步之后将完整的运行状态持久化在运行 ID 下，以便当 worker 崩溃时其租约到期，任何其他 worker 都可以从最后一个检查点恢复。这需要可序列化的状态、确定性恢复和幂等副作用。针对计费，每次运行使用去重键并使用发件箱，以便副作用首先作为意图写入并仅执行一次，对模型调用使用异步 I/O，并在旧版本旁边部署新版本以便正在进行的运行绝不被终止。首先构建最简单的版本（带有关系型数据库的 Web 服务），等实测问题确实需要时，再采用工作流引擎。

## Full answer

### 恢复路径

```text
worker crashes mid-step
  -> lease times out
  -> another worker picks up the run id
  -> resumes from the last checkpoint
  -> no duplicate side effect
```

三项要求使该机制生效：

1. **可序列化状态。** agent 所持有的全部内容必须能够被持久化。带有活跃数据库连接的闭包无法在崩溃后幸存。
2. **确定性恢复。** 给定相同的状态和相同的输入，agent 会采取相同的行动，或者对模型调用直接使用已记录的结果。
3. **幂等副作用。** 每次对外调用都携带一个键，或者先写入表中并由独立进程执行。

基于图的运行时在每个步骤之后按线程 ID 写入检查点。工作流引擎在每个活动之后写入。基于事件溯源的运行时维护日志。其模式是相同的。

### 等待中的运行

等待人工输入数小时的运行绝不能占用 worker。运行时将运行状态持久化，释放 worker，并在输入到达时由任何 worker 恢复。这正是使检查点而非进程成为系统单元的原因。

### 实际达到恰好一次的效果

至少一次投递加幂等消费者，是你能得到的唯一一种“恰好一次”。

| 做法 | 效果 |
|---|---|
| 每次运行的去重键 | 包含在每次副作用调用中，以便识别重试 |
| 发件箱（Outbox） | 意图被写入表中，由独立执行器执行并标记完成 |
| 补偿事务 | 当副作用成功而追踪写入失败时，安排反向操作 |

这些都是数据库模式。agent 专属的唯一代价是模型调用很慢。

### 并发

模型调用受 I/O 限制，等待下一个 token 的线程有 99 percent 的时间是空闲的。在 10,000 次并发调用时，每个约 1 MB 的线程仅栈就需要约 10 GB，而协作式纤程可以容纳在一个进程中。在模型层使用异步 I/O，仅将线程或进程用于 CPU 密集型工作（例如嵌入）。

### 部署

长时间运行的有状态 agent 无法热替换。同时运行多个版本的运行时，将一部分新运行发送给新版本，并在旧版本的运行完成时淘汰旧版本。

### 最先构建什么

课程的反思是：绝大多数团队在衡量之前都过度设计。一个 Web 服务和一个关系型数据库，每次运行作为一行，状态采用乐观并发，加上简单的后台 worker 和应用级重试，在可控任务上可承载低于约 100 次并发运行的负载。只有当你遇到简单设计无法解决的具体问题时才采用持久化执行引擎：大规模的长达数小时等待、跨地域协调或复杂的补偿策略。

## Follow-ups

- **Level 3:** 为什么模型调用是确定性恢复的难点？ Expected: 它不是确定性的，因此恢复必须重放该调用记录的结果，而不是重新调用。
- **Level 3:** 租约起什么作用？ Expected: 它将运行标记为被一个 worker 在有限时间内拥有，以便崩溃后将运行释放给另一个 worker，而不会有两个 worker 同时运行它。
- **Level 4:** 你如何测试发件箱？ Expected: 通过执行器将同一副作用运行两次并断言一次外部调用，然后在副作用与标记之间使执行器崩溃，并断言补偿或幂等重做仅保留一个副作用。
- **Level 4:** 工作流引擎的哪项特性最难手写复现，这是否是采用它的理由？ Expected: 一个有理有据的选择（例如针对数小时等待的持久定时器或补偿策略），其规则是只有实测证实简单设计失败后才采用引擎。

## Wrong answers

- "worker 死亡时从头重试整次运行。" 这会重复已经发生过的每个副作用，即题干中的二次扣费。
- "每次运行使用一个线程；这样更简单。" 线程在等待 token 时处于空闲，在一万次并发调用时仅栈就会耗尽内存。
- "第一天就采用工作流引擎以求稳妥。" 简单设计可承载约一百次并发运行，引擎的繁琐流程会消耗时间，只有实测问题才能证明这份投入值得。

## Taught in

[生产环境扩展课程](../../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/)构建了检查点存储、单 agent 队列和异步演示，并确立了从简开始的规则。
