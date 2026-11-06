---
id: sleep-time-consolidation
title: 把记忆整合移出关键路径
card: prompting-structured-output
kind: tradeoff
level: 3
roles: [agentic-ai-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [agent-memory, memory-blocks, sleep-time, latency]
minutes: 10
lessons: [phases/14-agent-engineering/08-memory-blocks-sleep-time-compute, phases/14-agent-engineering/07-memory-virtual-context-memgpt]
manuals: []
practice: []
cheatsheet: [context-engineering]
related: [prompting-structured-output/take-home-two-tier-memory, prompting-structured-output/fusion-weights-per-product]
updated: 2026-11-03
---

某个助手的尾延迟越来越高，因为每一轮在回复之前都要先修剪、摘要和调和它的记忆。有个提案把这些工作交给第二个 agent，在用户空闲时运行。这样拆分换来什么，代价是什么，又带来什么新的失败？

## Short answer

拆分把记忆工作移出了关键路径，回复永远不用等整合；后台 agent 可以用更慢、更强的模型，因为没人在等它。代价是多一个 agent、一个共享的块存储，以及围绕它们的协调。新的失败是静默漂移：后台 agent 改写了一个块，主 agent 却毫无察觉；所以要给块做版本，在 trace 里展示 diff，并且当后台写入者改动 persona 块或安全块时，把它当作不可信的写入者。

## Full answer

### 主 agent 保留什么

三层。核心记忆始终在 prompt 里，由带类型的块组成，每个块有 id、标签、值、字符上限，以及一段告诉模型何时编辑它的描述：human 块、persona 块，以及用户自定义的块，比如任务块或安全块。召回记忆是对话历史。归档记忆是外部存储。主 agent 负责响应每一轮，并通过 `block_append`、`block_replace`、`block_read` 和 `block_summarize` 做原始写入。

### 后台 agent 做什么

它在用户空闲时读对话记录和上下文，把学到的上下文写进共享块，做去重和摘要，并让被推翻的事实失效。由此带来三个特性：回复不承担延迟成本；用得起更强的模型；整合在没人等待时有了天然的时间窗口。

### 三种失败及其防护

| 失败 | 防护 |
|---|---|
| 块膨胀：追加写到字符上限 | 在会超出上限的那次写入之前运行摘要器 |
| 静默漂移：块变了，主 agent 毫无察觉 | 给块做版本，每次写入都记录旧值和 diff，为每个块提供历史 |
| 整合被投毒：攻击者能接触到的内容进入核心记忆 | 把后台 agent 当作不可信的写入者；改动 persona 块或安全块要经过另一个 agent 复核才能提交 |

### 重活留在睡眠阶段

对文本重叠超过 90% 的记录做去重，属于后台阶段，绝不放在关键路径上；课程练习对此说得很明确。

## Follow-ups

- **Level 3:** 为什么后台 agent 可以用更贵的模型？ Expected: 它不受延迟约束，所以用得起更慢、更强的模型。
- **Level 3:** 某个块一直在涨，逼近上限。运行什么，什么时候运行？ Expected: 块摘要器，在会让块超过上限的那次写入之前运行；触发阈值是在摘要调用次数和溢出之间权衡。
- **Level 4:** 怎样让后台的改写可见？ Expected: 每个块都做版本，每次写入记录旧值和 diff，并提供每个块的历史，让运维人员能看出 agent 为什么忘了某件事。
- **Level 4:** 后台 agent 会读到攻击者能接触的内容。控制手段是什么？ Expected: 把它当作不可信的写入者；改动 persona 块或安全块，要经过另一个 agent 复核才能提交。

## Wrong answers

- "每轮结束时跑一下整合就行，很快。" 它在关键路径上，而用户抱怨的正是尾延迟；拆分的意义就在于回复永远不用等。
- "后台 agent 用最便宜的模型省钱。" 这恰恰是唯一用得起更强模型的地方，而且它的改写会影响之后的每一轮。
- "关键路径上也做去重，反正是同一份代码。" 课程只在睡眠阶段去重，从不在用户等待时做。

## Taught in

[记忆块](../../../phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/)一课给出了三层记忆、块模式、后台 agent 及其失败模式，[虚拟上下文](../../../phases/14-agent-engineering/07-memory-virtual-context-memgpt/)一课确立了它所扩展的双层模式。
