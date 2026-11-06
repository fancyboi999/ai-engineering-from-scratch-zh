---
id: keep-every-error-trace
title: trace 比模型还贵时的保留策略
card: production-mlops
kind: design
level: 2
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [system-design, design-review]
tags: [tracing, sampling, retention, observability-cost]
minutes: 10
lessons: [phases/17-infrastructure-and-production/13-llm-observability, phases/19-capstone-projects/11-llm-observability-dashboard]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/renamed-token-attribute, production-mlops/drift-score-on-prompts]
updated: 2026-11-03
---

你的服务每天调用模型超过一百万次。现在保留每条 trace 的成本已经超过了模型调用本身。设计一套保留策略，留下事故期间需要的 trace，丢掉其余的。

## Short answer

按规则采样，而不是按固定比例。保留每条出错的 trace 和每条高成本的 trace，成功的只留一小部分，聚合值始终保留。在 collector 上用尾部采样器、在 trace 完成后做决定，让规则能看到状态和成本。综合项目保留所有出错的 trace 和 10% 的成功 trace。

## Full answer

### 为什么固定比例会失败

固定 5% 也只会保留 5% 的错误。事故中你需要的正是你丢掉的那条 trace，而聚合的错误数只能告诉你它存在过。

### 规则

| 类别 | 保留 |
|---|---|
| 出错的 trace | 全部 |
| 高成本 trace，长输出或昂贵模型 | 全部 |
| 成功的 trace | 5% 到 10% |
| 聚合值 | 始终保留，来自每个请求 |

可观测性课程把规则写成：100% 的错误、100% 的高成本、5% 的成功。聚合值不需要 trace：即使丢弃 trace，计数器和直方图也会统计每个请求。

### 在尾部做决定

头部采样在 trace 开始时做决定，那时还没有人知道它会不会失败。collector 上的尾部采样在 trace 完成后做决定，所以能读到状态、成本和评估分数。代价是 collector 的缓冲内存，因为完整的 trace 要一直等到做出决定。

### 分层，并了解偏差

综合项目的练习保留所有毒性分数高于 0.5 的 trace，再对其余的做 10% 的分层抽样，并要求你测量采样带来的偏差。任何基于采样 trace 的分析，都会高估那些被全量保留的类别。按采样率的倒数加权，或者只在分层抽样的部分上运行逐条 trace 的评估。

### 分层存储

span 放进列式存储供查询，原始事件放进对象存储应对长尾需求。归档很便宜，长期分析在那里运行。

## Follow-ups

- **Level 2:** 为什么头部采样会丢掉错误？ Expected: 它在 span 结束前就做决定，看不到状态。
- **Level 2:** 丢弃的 trace 还留下什么？ Expected: 指标。无论 trace 是否保留，计数器和直方图都会统计每个请求。
- **Level 3:** 你的评估任务在采样后的 trace 上运行。它们继承了什么偏差？ Expected: 保留全部错误的样本会高估失败，所以按采样率的倒数加权，或者只评估分层抽样的部分。
- **Level 3:** 突发流量时 collector 内存耗尽。为什么？改什么？ Expected: 尾部采样要缓冲完整的 trace 直到它完成。限制缓冲区大小，缩短决定前的等待，压力大时用头部规则丢弃。

## Wrong answers

- "所有流量都采样 5%。" 事故中需要的错误大多没了，聚合值只能告诉你它们发生过。
- "全部保留一周，然后删除。" 在这个流量下，一周的完整 trace 正是你想去掉的成本。
- "有 trace 就够了，去掉指标。" 一小时的分位数需要每个请求，只有直方图能提供。

## Taught in

[可观测技术栈课程](../../../phases/17-infrastructure-and-production/13-llm-observability/)给出采样规则，[可观测看板综合项目](../../../phases/19-capstone-projects/11-llm-observability-dashboard/)配置尾部采样器并测量其偏差。
