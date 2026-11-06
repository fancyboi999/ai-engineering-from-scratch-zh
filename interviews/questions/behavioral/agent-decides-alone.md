---
id: agent-decides-alone
title: 决定 agent 可以独立做出哪些决策
card: behavioral
kind: tradeoff
level: 4
roles: [agentic-ai-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [behavioral, design-review]
tags: [autonomy, authority, decision-modes, delegation]
minutes: 12
lessons: [phases/14-agent-engineering/45-delegate-with-isolation, phases/14-agent-engineering/51-write-specifications-that-preserve-judgment]
manuals: []
practice: []
cheatsheet: [delegation-feedback, agent-planning]
related: [behavioral/locked-bounded-delegated, behavioral/split-that-only-looks-parallel]
updated: 2026-11-03
---

组织希望在某一类任务中，允许代码 agent 在无需人工介入的情况下直接合并变更。你需要制定一份策略，界定 agent 可以独立做出哪些决策。你如何划定这道边界？随着时间推移，这道边界又该如何动态调整？

## Short answer

划分边界的依据是后果与可逆性，而非任务难度。改变公共行为、风险、权限或不可逆成本的决策由人工保留；有界调查、具体实现、验证和审查则可由 agent 承担。在任务契约中，我将其明确表示为锁定、有界与委托三种决策模式；只有在验证证据充分且具备可靠回滚机制的前提下，才逐步扩大委托范围，实行校准自治而非一刀切的开关。

## Full answer

### 校准自治

系统在证据充分且回滚可靠的环节赋予自由度，在后果严重的环节设置人工检查点。这是每个具体决策的固有属性，因此策略是按决策类别制定的，而不是按单项任务或模型划分。

### 人工保留与 agent 承担

| 人工保留 | agent 可承担 |
|---|---|
| 改变公共行为或兼容性 | 局部代码结构、命名、可逆重构 |
| 改变风险或安全态势 | 返回事实清单的有界调查 |
| 授予权限或访问资格 | 在专属路径内提供证明的具体实现 |
| 不可逆成本：数据迁移、删除、资金消耗 | 已完成产物的验证与只读审查 |

### 三种模式使其具备可执行性

任务契约中的每项决策均划分为锁定、有界或委托。锁定决策必须经过人工检查点。有界决策明确限制范围（如依赖白名单或重试次数范围），agent 在限定范围内提出方案。委托决策要求 agent 说明选择依据并证明结果。决策模式根据后果与可逆性确定，并记录依据以便后续团队复审。

### 边界如何演进

自治权随证据的积累而扩大。当某一类委托决策具备坚实的证明层、明确可靠的回滚方案且经历无故障运行周期后，原本有界的决策可以升级为委托。当事故暴露控制缺失时，则反向收紧，直到补齐控制机制。策略本身就是一项具备负责人和复审日期的控制措施。

### 不变的原则

证据必须与声明相匹配。单元测试无法证明公共接口路径，agent 的总结也不能替代查阅真实的证明输出。集成者看的是证据，不是故事叙述。

## Follow-ups

- **Level 3:** 如果 agent 给出了合理的理由，建议引入白名单之外的依赖，该如何处理？ Expected: 有界决策必须升级至人工裁决；论据是决策的输入信息，而非自动获得的授权。
- **Level 4:** 如何安全地扩大某一类决策的自治范围？ Expected: 出示该类别的证明层、回滚方案及无事故运行周期的证据，然后调整决策模式并记录验证证据与复审人。
- **Level 4:** 哪些证据会促使你再次收紧自治权？ Expected: 底层控制未能捕获的事故，这表明证明层的实际强度低于策略假设。

## Wrong answers

- "让 agent 决定简单的任务，困难的任务由人工保留。" 任务难度并非划分的维度；微小的删除操作可能不可逆，而复杂的重构却可能可逆。
- "自治权是团队级别的统一切换开关。" 每一类决策都有其独特的后果与可逆性，采用单一开关无论偏向哪一侧都是错误的。
- "测试套件通过就足以合并任何变更。" 测试套件仅证明局部契约；公共行为、权限变更与不可逆成本必须依赖独立的证明机制和人工检查点。

## Taught in

[委托课程](../../../phases/14-agent-engineering/45-delegate-with-isolation/)定义了校准自治，[规范制定课程](../../../phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/)给出了三种决策模式。
