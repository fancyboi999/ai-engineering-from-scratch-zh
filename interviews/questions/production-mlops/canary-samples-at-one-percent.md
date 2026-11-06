---
id: canary-samples-at-one-percent
title: 1% 的金丝雀能给闸门多少样本
card: production-mlops
kind: estimate
level: 2
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [screen, system-design]
tags: [canary, sample-size, release-gates, metrics-cadence]
minutes: 8
lessons: [phases/17-infrastructure-and-production/20-shadow-canary-progressive]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/canary-gates-above-noise]
updated: 2026-11-03
---

你的服务每分钟处理 1,000 个请求。金丝雀从 1% 开始，闸门每五分钟检查一次。一次闸门检查大约能看到多少个数据点？这一步你能信任哪些闸门？

## Short answer

每分钟 1,000 个请求的 1% 是每分钟 10 个请求进入金丝雀，所以五分钟窗口约有 50 个点，十五分钟窗口约有 150 个。这足以看延迟和错误率，但远不够看用户反馈。第一步只按延迟、成本、错误和输出长度设闸门，反馈闸门放到后面的步骤再用。

## Full answer

### 算一算

课程的节奏是每 5 到 15 分钟做一次闸门检查，具体取决于流量。负载为每分钟 1,000 个请求时，1% 的金丝雀每分钟收到 10 个请求，每个窗口有 50 到 150 个数据点。

### 每个闸门需要从这些点里得到什么

| 闸门 | 约 50 个点时 |
|---|---|
| 延迟 P50 和 P95 | 可以读，但区间很宽 |
| 延迟 P99 | 由一两个样本决定，所以要跨多个窗口 |
| 单请求成本 | 每个请求都上报 token 数，大的偏移能看出来 |
| 错误与拒答率 | 基线只有百分之几，只对应寥寥几次事件，所以噪声大 |
| 输出长度分布 | 粗糙，但大的偏移能看出来 |
| 用户反馈 | 只有部分用户会评价，一个窗口最多几条评分 |

### 下一步情况就变了

到 10% 时，金丝雀每个窗口看到的点约多十倍。反馈闸门在这时才可用。这就是发布每一步都要停住的原因：停留不是走形式，而是闸门收集样本需要的时间。

### 把停留规则写下来

为每一步写明：比例上调之前，必须有多少个窗口在所有闸门都是绿色的情况下通过。如果一个闸门要两个窗口才能确认越线，真实退化的暴露时间就翻倍，所以把这个取舍写在规则旁边。

## Follow-ups

- **Level 2:** 用户反馈闸门从哪一步开始可用？ Expected: 从 10% 开始，这时金丝雀每个窗口看到的点约多十倍。
- **Level 2:** 为什么拉长窗口解决不了第一步的问题？ Expected: 拉长窗口增加样本很慢，而且真实退化会在整个窗口内持续，闸门才有机会触发。
- **Level 3:** 夜间流量降到十分之一。计划怎么改？ Expected: 同样比例下每分钟只有约一个请求，所以要延长停留、从更高比例起步，或者白天再放量。
- **Level 3:** 越线必须持续两个窗口闸门才触发。代价是什么？ Expected: 真实退化会一直持续两个窗口，直到叫停；这条规则用更长的暴露时间换来更少的误报。

## Wrong answers

- "1% 很安全，所以闸门在 1% 下有效。" 这个比例对用户是安全的，但在这么小的样本量下，大多数闸门什么也看不到。
- "每分钟检查一次，检出更快。" 这一步一分钟的窗口只有约十个点，算不出分位数。
- "从 25% 起步，统计更好。" 任何闸门还没触发过一次，就已经有四分之一的用户用上了新模型。

## Taught in

[渐进式发布课程](../../../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)给出了指标检查节奏和每个窗口的样本数。
