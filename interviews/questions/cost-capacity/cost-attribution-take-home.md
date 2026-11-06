---
id: cost-attribution-take-home
title: 构建一个成本归因与管控模拟器
card: cost-capacity
kind: take-home
level: 4
roles: [applied-ai-engineer, ai-data-engineer, forward-deployed-ai-engineer]
rounds: [take-home, system-design]
tags: [finops, attribution, kill-switch, multi-tenant]
minutes: 60
lessons: [phases/17-infrastructure-and-production/27-finops-llms, phases/11-llm-engineering/11-caching-cost]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/cost-per-outcome, cost-capacity/budget-circuit-breaker]
updated: 2026-11-03
---

带回家的作业。你拿到一个多租户助手一天的请求日志。每条记录都按课程里的归因 trace 格式：trace id、时间戳、租户、用户、任务 ID 及其路由、模型、课程 trace 中四个层各自的 token 数、输入是否命中缓存、任务是否解决。你还拿到每个租户过去几周的每日花费，作为 kill switch 的基线。请构建一个模拟器：按租户、任务和用户归因花费，把 token 拆到各层，按租户算出每个已解决任务的成本，并执行速率限制、每日花费上限和 kill switch。注入一个滥用租户，展示每项控制在什么时候触发。

## Short answer

用价格表给每次调用定价，按租户、按任务（连同它的路由）和按用户汇总成本，并把 token 拆成 prompt、tool、memory 和 response 四层，让报告指出是哪一层推高了每个租户的花费。每个已解决任务的成本要从结果字段算，不从 token 总数算。实现课程里的阶梯：速率限制设为预期峰值的 2 到 3 倍，每日上限设为合同上限的 1.5 到 3 倍，租户花费相对自身基线的 z-score 超过 4 时触发 kill switch。演示滥用租户先撞上速率限制，再撞上每日上限，花费远超自身历史时最后触发 kill switch。

## Full answer

### 一份完整的提交包含什么

1. **每次调用都有成本。** 一张包含缓存输入价格的价格表，像前面缓存课程里那样构建；再加一个函数，把每次调用的 token 换算成美元。
2. **三个维度的归因。** 按租户、按任务和路由、按用户统计花费，像遥测关联器（telemetry joiner）模式那样用 trace id 关联。不做任何事后推断。
3. **四个 token 层。** 每个任务的 prompt、tool、memory 和 response 各占多少比例。用课程给出的典型区间做合理性检查：prompt 占 40% 到 60%，agent 任务中 tool 占 20% 到 40%，memory 和 response 各占 10% 到 30%。
4. **单位指标。** 对每个租户和每项功能，用花费除以已解决的任务数，任务数取自 resolution 字段。没解决的任务也花了钱，这正是这个指标的意义。
5. **执行阶梯。** 速率限制返回 429 和重试响应头。每日上限收紧速率限制并发出告警。kill switch 暂停租户并呼叫值班。
6. **注入的租户。** 一条它的花费时间线，标出每个时间点触发了哪项控制，并画出 z-score 与阈值的对比。
7. **最先做的五个看板视图。** 课程练习要求列出这五个。好的答案是：各租户花费随时间的变化、各租户花费除以已解决任务数、各任务的分层拆分、花费最高的用户，以及管控事件。

### 评审看什么

- 归因在请求创建时就打上，并用 trace id 关联，绝不从账单反推。
- 各层分开统计，报告说明每个高花费租户该修哪一层。
- 单位指标与结果挂钩。
- kill switch 以租户自身基线为参照，阈值有依据，这是课程的第一道练习。
- 解释了各项控制的先后：先施加阻力，最后才暂停。

### 报告里要论证什么

课程第三道练习：最大的租户毛利为负。按对客户的影响从小到大提出三项措施，例如先在他们最耗费的任务上做缓存和路由，其次调整配额，最后在续约时调价。然后论证事后补打标签到底行不行，这是课程最后一道练习。实事求是的答案是：它能为历史数据补上空缺，但总会漏掉一些情况。

## Follow-ups

- **Level 3:** 为什么 kill switch 要以每个租户的历史为参照，而不是一个固定金额？ Expected: 租户规模相差几个数量级。固定金额会在大租户正常的一天把它暂停，对小租户又永远不会触发。
- **Level 4:** 报告显示你们最大的租户在亏钱。你提出什么方案？ Expected: 按对客户的影响排序的三项措施，例如先在他们最耗费的任务上做缓存和路由，再调整配额，最后在续约时调价。
- **Level 4:** 你会先把哪五个视图放上看板？ Expected: 各租户花费随时间的变化、各租户花费除以已解决任务数、各任务的分层拆分、花费最高的用户，以及管控事件时间线。

## Wrong answers

- "按席位数平摊账单来归因。" 这会把高花费租户和高花费功能藏起来，而找出它们正是这道作业的目的。
- "所有 token 放进一个桶里统计。" 一个桶说不出该修哪一层、哪个租户，也承载不了按租户的上限。
- "花费到一个固定的美元金额就触发 kill switch。" 租户规模相差几个数量级。一个固定金额只可能适合其中一个租户。

## Taught in

[LLM 的 FinOps 课程](../../../phases/17-infrastructure-and-production/27-finops-llms/)定义了归因维度、token 分层和执行阶梯，[缓存与成本课程](../../../phases/11-llm-engineering/11-caching-cost/)提供了价格表和成本追踪器。
