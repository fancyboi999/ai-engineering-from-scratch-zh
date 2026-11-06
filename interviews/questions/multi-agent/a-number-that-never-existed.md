---
id: a-number-that-never-existed
title: 一个从未存在过的数字流向了最终报告
card: multi-agent
kind: debug
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [debugging, ml-breadth]
tags: [memory-poisoning, shared-state, provenance, append-only, verifier]
minutes: 10
lessons: [phases/16-multi-agent-and-swarms/13-shared-memory-blackboard]
manuals: []
practice: []
cheatsheet: [multi-agent, agent-failure-modes]
related: [multi-agent/two-workers-return-different-facts]
updated: 2026-11-03
---

三个 agent 在一项调研任务中共用同一份共享记忆。检索 agent 读取了一个网页，并在记忆中记录某项研究获得了 42% 的提升。而原始网页记载的其实是 4.2%。总结 agent 基于该条目展开总结，分析 agent 依据该显著数据建议采纳该方案，最终报告也直接引用了该数字。整个过程中没有任何 agent 崩溃，也没有任何测试报错。这种故障被称为什么，为什么它是结构性的，哪三项改动能够制止它？

## Short answer

这被称为记忆投毒（memory poisoning）。某个 agent 的幻觉进入了共享状态，下游的每一个 agent 都将其作为经验证的事实读取，因此该错误在流转中被不断转化为证据。它是结构性的，因为任何没有溯源和独立校验器的共享记忆最终都会出现这种情况。三项改动是：每次写入附加溯源凭据（provenance）、采用仅追加日志，修正时标明替代关系而不覆盖原条目，以及至少一个重新获取源数据并在独立频道上报告的只读校验器。

## Full answer

### 为什么它比崩溃更严重

在没有共享状态的情况下，检索 agent 的错误留在自己的上下文中，重新获取该页面的下游 agent 可能会发现它。有了共享状态，第一个 agent 的上下文就变成了所有人的上下文。其症状是准确率的缓慢衰退，而不是故障崩溃。等到人类注意到时，推理链已经延伸了数步，而根因是最早写入的条目之一。课程将该类别列在测得的多 agent 故障分类法的第二位。

### 三项缓解措施

| 改动 | 效果 |
|---|---|
| 每次写入附加溯源凭据 | 每条记录包含其编写者、时间、在什么 prompt 下编写以及引用的源，以便下游读者根据来源权衡条目 |
| 仅追加，并标明替代关系 | 修正是一条指向被替代条目的新条目，因此审计追踪得以保留，读者可以看出某个值曾受争议 |
| 只读校验器 | 一个读取池、重新获取引用源、标记不匹配且对池没有写入句柄的 agent |

在课程演示中，校验器发现该条目与获取的文本不匹配，条目被标记，分析 agent 在给出结论前看到了该标记。

### 为什么校验器绝不能写入

如果校验器的输出返回池中，被投毒的池就会污染校验器，且校验器的结论会进一步传播毒害。其发现通过独立频道传递给人类或单独的决策 agent。它仍可能被不良条目误导，但它根据原始源检查每个条目，其错误绝不会成为共享事实。

### 监控什么

记录替代早期条目的写入占比。不断上升的比例表明各个 agent 正在更频繁地相互修正，这是在任何人读到错误报告之前投毒现象暴露的方式。

## Follow-ups

- **Level 2:** 为什么溯源对无法重新获取源的读者有帮助？ Expected: 读者能看出某个论断依赖于一次未引证的检索，从而给予它比带有来源和校验器标记的论断更低的权重。
- **Level 2:** 当分析 agent 看到其依赖的条目带有标记时，它会怎么做？ Expected: 暂缓给出建议或在附带标记的情况下编写建议，最终报告包含撤回声明而不是该数字。
- **Level 3:** 记忆的主题分区会替代上述三项改动中的哪一项？ Expected: 一项都不能，因为分区仅限制哪些 agent 读取条目，某个主题中被投毒的条目仍会污染所有订阅者。
- **Level 3:** 校验器自身幻觉出不匹配，会造成什么破坏？ Expected: 正确条目上的错误标记，可由校验频道上的人类清除，且由于校验器不能写入，池中不会引入新的虚假事实。

## Wrong answers

- "在每个 prompt 中加上核实数字的要求。" 总结者和分析者没有源可供核对，只有共享条目，prompt 无法为它们提供源。
- "让校验器就地修正条目。" 就地修正会破坏审计追踪，并赋予校验器一个写句柄，被投毒的池可以反向利用它。
- "从共享池切换到传递消息。" 消息不过是多复制了几次的共享状态，消息中的错误数字以同样方式污染接收者。

## Taught in

[共享内存课程](../../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/)展示了在有和没有只读校验器情况下的投毒场景。
