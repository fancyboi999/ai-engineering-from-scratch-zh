---
id: budget-burn-pauses-chaos
title: 别让生产环境的混沌实验变成事故
card: production-mlops
kind: design
level: 4
roles: [ai-evaluation-reliability-engineer, inference-engineer]
rounds: [system-design, design-review]
tags: [chaos-engineering, error-budget, blast-radius, alerting]
minutes: 18
lessons: [phases/17-infrastructure-and-production/24-chaos-engineering-llm]
manuals: []
practice: []
cheatsheet: [sre-for-ai]
related: [production-mlops/chaos-before-you-start, production-mlops/retries-that-amplify]
updated: 2026-11-03
---

你在生产环境做混沌实验：让一个模型服务商对部分机群返回限流错误，以便观察 fallback。实验进行中，告警开始触发。设计一个安全面，防止这次实验演变成事故，并说明值班人员如何区分实验造成的故障和自然发生的故障。

## Short answer

安全面有三道防护：每日错误预算燃尽超过预期速率的两倍时暂停实验的燃尽率告警；让爆炸半径内非实验告警静默的抑制窗口；给实验造成的每个错误在 trace id 上打的标记。值班人员看标记即可。窗口内没有标记的错误是自然故障，按正常流程响应。

## Full answer

### 几个面

课程把系统分成几个面：控制面调度实验；目标面包括服务、Pod 和数据存储；安全面包括 kill switch、抑制窗口、爆炸半径限制和错误预算闸门；可观测面把每个错误与一个 trace id 关联起来。实验发现会反馈到 SLO、runbook 和代码中。

### 三道防护

1. **燃尽率暂停。** 实验可以消耗错误预算，受控故障本来就会这样。每日燃尽超过预期速率的 2x 时，闸门触发，自动暂停实验。
2. **抑制窗口。** 实验本就要触发的告警，在爆炸半径内、实验持续期间静默。半径以外的告警一律不静默。
3. **trace id 关联。** 实验引发的每个错误都带标记，值班人员不用沟通就能把它和自然故障分开。

kill switch 是第四道控制，由人工操作。它立即停止实验，归值班人员掌握，而不是归调度器。

### 窗口期内值班人员怎样看告警

- 爆炸半径内带标记的错误，说明实验在按设计运行。记日志，不呼叫值班。
- 窗口内没有标记的错误是自然故障，按正常流程响应。
- 爆炸半径外的错误是自然故障，因为实验没有碰到那里。
- 暂停后燃尽仍在继续，原因要么是自然故障，要么是实验弄坏了无法自行恢复的东西。启动事故响应，回滚最近一次变更。

### 这次实验该教会你什么

课程指出，大多数团队会发现自己的 fallback 从来没有完整测试过。记录从第一个限流错误到第一次 fallback 成功的时间，与 SLA 对比。再记录在 fallback 生效之前，网关的重试是否放大了负载。

### 确定爆炸半径

选一个足够小的机群比例，让其他服务商的 fallback 容量能兜住它，并把这个比例写进实验定义。比例越大，测得越多；但 fallback 比你以为的慢时，就有真实宕机的风险。

## Follow-ups

- **Level 3:** 为什么闸门设在预期燃尽的两倍，而不是一有燃尽就触发？ Expected: 实验本来就要花掉一些预算。闸门拦的是花得远超计划的情况。
- **Level 4:** 暂停之后燃尽还在上升。这说明什么？ Expected: 原因是自然故障，或者实验弄坏了不会自行恢复的东西。启动事故响应，回滚最近一次变更。
- **Level 4:** 服务商宕机实验的爆炸半径怎么选？ Expected: 选一个小到 fallback 容量能兜住的比例，写进实验定义，并和值班人员一起评审。

## Wrong answers

- "实验期间静默所有告警。" 同一窗口内的自然事故会被漏掉。只静默爆炸半径，并让带标记的错误保持可见。
- "在 staging 环境跑，就不需要安全面。" staging 看不到真实流量下的 fallback。正是安全面让生产环境实验变得可以接受。
- "燃尽率告警就是 kill switch。" 告警只暂停实验。kill switch 立即停止实验，应当是一个独立的人工控制。

## Taught in

[混沌工程课程](../../../phases/17-infrastructure-and-production/24-chaos-engineering-llm/)定义了四个面、燃尽率暂停、抑制窗口和 trace id 关联。
