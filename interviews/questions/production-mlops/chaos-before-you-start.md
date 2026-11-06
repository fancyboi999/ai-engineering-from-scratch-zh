---
id: chaos-before-you-start
title: 第一次混沌实验前必须具备什么
card: production-mlops
kind: concept
level: 1
roles: [ai-evaluation-reliability-engineer, inference-engineer]
rounds: [screen, system-design]
tags: [chaos-engineering, slo, runbooks, on-call]
minutes: 6
lessons: [phases/17-infrastructure-and-production/24-chaos-engineering-llm]
manuals: []
practice: []
cheatsheet: [sre-for-ai]
related: [production-mlops/budget-burn-pauses-chaos, production-mlops/rollback-without-redeploy]
updated: 2026-11-03
---

一个新团队想在下周对模型服务做第一次混沌实验。同意之前你要检查什么？缺了其中一项会出什么问题？

## Short answer

必须具备五样东西：带目标的服务等级指标（SLI 与 SLO）、包含 trace、指标和日志的可观测性、自动回滚、结构化的 runbook，以及一位负责响应的值班人员。每一样都让你能衡量实验、停止实验或修复损害。缺了任何一样，实验就不是测试，而是你排了期的事故。

## Full answer

### 五个前提

1. **SLI 与 SLO。** 没有目标，你就说不清实验有没有造成损害。
2. **可观测性。** 看板上要有 trace、指标和日志。影响发生时你必须看得见。
3. **自动回滚。** 即渐进式发布课程里基于策略开关的回滚。需要重新部署的回滚，对实验来说太慢。
4. **runbook。** 分成固定的几节：症状、假设、验证、处置。值班人员要在压力下读它。
5. **值班人员。** 实验发现问题时，有人负责响应。

### 最先做的实验

先在稳定流量下杀掉一个 decode 副本的 Pod，观察流量重路由和恢复过程。如果看起来安全，再升级到网络混沌。第一个模型专属实验是让一个服务商在几分钟内返回限流错误，看 fallback 能否接上。大多数团队在这里才发现，自己的 fallback 从来没有完整测试过。

### 节奏

每周在 staging 或一小部分生产流量上做小实验。每月针对一个场景做一次 game day，并写故障复盘。每季度做一次跨团队审计，附依赖图。

## Follow-ups

- **Level 1:** 第一个做哪个实验？为什么？ Expected: 在稳定流量下杀掉一个 decode 副本，因为它以很小的爆炸半径检验重路由和恢复。
- **Level 2:** 举一个通用网络混沌工具无法为模型服务复现的故障。 Expected: 突发负载下的 KV cache 驱逐风暴，或者一个让分词器卡住的 prompt。
- **Level 2:** 实验期间，为什么回滚比看板更重要？ Expected: 看板展示损害，回滚停止损害。没有回滚，损害会一直持续，直到有人手工修好。
- **Level 3:** 团队只想在 staging 做。什么时候该在生产环境做？ Expected: staging 复现不了流量形态、缓存状态或服务商行为时；而且必须先有安全防护。

## Wrong answers

- "跳过前提，边做边学。" 没有 SLO、回滚和值班人员，实验就是你故意造成的宕机。
- "有看板就算有可观测性。" 混沌实验需要 trace、指标和日志，并能按 trace id 关联，这样才能区分实验故障和自然故障。
- "先做最大的实验，才能找出最大的风险。" 先杀一个副本，再逐步扩大爆炸半径。

## Taught in

[混沌工程课程](../../../phases/17-infrastructure-and-production/24-chaos-engineering-llm/)列出了五个前提、四个面和最先做的实验。
