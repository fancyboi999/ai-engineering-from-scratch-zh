---
id: cost-per-outcome
title: 该交给财务的指标，而不是 token 单价
card: cost-capacity
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer, forward-deployed-ai-engineer]
rounds: [screen, customer]
tags: [finops, unit-economics, attribution, cost-per-request]
minutes: 5
lessons: [phases/17-infrastructure-and-production/27-finops-llms]
manuals: []
practice: []
cheatsheet: [llm-cost-caching]
related: [cost-capacity/batch-lane-triage]
updated: 2026-11-03
---

财务要求把每百万 token 的成本作为模型服务的核心指标。你不同意。你建议改用什么指标？为了算出它，每次调用必须记录什么？

## Short answer

建议用每个产品结果的成本：每个已解决的工单、每篇生成的文章、每个成功的 agent 任务，或者每会话分钟。每百万 token 的价格是供应商的计价单位，它完全说明不了这笔花费有没有产出任何东西。要算出结果指标，每次调用在创建时就要打上用户 ID、任务 ID 及其路由、租户 ID，把 token 拆成 prompt、tool、memory 和 response 四层，再把成本与结果事件关联起来。

## Full answer

### 为什么 token 单价会误导

一个更便宜的模型，如果每个任务要用两倍的 token，单个任务反而更贵。一次 prompt 改动减少了 token，却降低了解决率，于是每个已解决工单的成本上升了，token 看板却是一片绿。课程的规则是把成本和产品结果挂钩，因为没有这个锚点，优化就没有方向。

### 三个归因维度

| 维度 | 键 | 回答什么问题 |
|---|---|---|
| 按用户 | `user_id` | 谁花了多少，用于席位定价和发现滥用 |
| 按任务 | `task_id` 和 `route` | 哪个产品界面花了多少 |
| 按租户 | `tenant_id` | 哪个客户是盈利的 |

第一天就在调用点把三个维度都埋好。提供商的账单明细里一个都没有，事后补标签总会漏掉一些情况。

### 四个 token 层

| 层 | 典型占比 |
|---|---|
| prompt：系统文本和用户输入 | 40% 到 60% |
| tool：回填到上下文里的工具结果 | agent 负载中占 20% 到 40% |
| memory：之前的轮次和检索到的文档 | 10% 到 30% |
| response：模型输出 | 10% 到 30% |

只用一个桶，就看不出是哪一层推高了花费，也就选不出该拉哪根杠杆。

### 每次调用的记录

trace 里包含 trace id、三个维度的键、四个层的 token 数、成本，以及两个标记：一个表示输入命中缓存，一个表示这是 batch 调用。最准确的归因模式是用 trace id 把这些 trace 和账单导出关联起来，课程把它叫作遥测关联器（telemetry joiner）。

## Follow-ups

- **Level 1:** 为什么只看 token 价格会误导？ Expected: 它说明不了每个结果用了多少 token。一个更便宜的模型如果每个任务要两倍的 token，单个任务反而更贵。
- **Level 2:** 为什么要把 token 拆成四层？ Expected: 一个桶会掩盖推高花费的到底是 prompt 膨胀、工具结果、memory 还是输出，你就选不出正确的修法。
- **Level 2:** 为什么要在调用创建时打标记，而不是事后给账单打标签？ Expected: 提供商的账单条目上没有用户、任务或租户，事后归因总会漏掉一些情况。
- **Level 3:** 哪种归因模式最准确？它需要什么？ Expected: 遥测关联器，它把 trace id 和账单关联起来。它要求每次调用都带 trace id，账单导出里也有同一个键。

## Wrong answers

- "我们付钱买的是 token，所以 token 就是指标。" token 是供应商的计价单位。业务买的是结果，更便宜的 token 可能意味着更贵的任务。
- "像其他资源一样，按团队给云账单打标签。" 一次模型调用是一笔交易，不是一项资产。除非调用时打上了团队，否则账单明细里没有团队。
- "只看每个租户的成本就够了。" 按任务能看出该修哪个功能，按用户能发现滥用。课程把三个维度都埋了点。

## Taught in

[LLM 的 FinOps 课程](../../../phases/17-infrastructure-and-production/27-finops-llms/)用每个结果的成本取代 token 单价，并定义了归因维度和分层。
