---
id: canary-gates-above-noise
title: 设定不会被噪声叫停的金丝雀闸门
card: production-mlops
kind: design
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer, applied-ai-engineer]
rounds: [system-design, design-review]
tags: [canary, release-gates, non-determinism, latency-percentiles]
minutes: 12
lessons: [phases/17-infrastructure-and-production/20-shadow-canary-progressive]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/shadow-mode-is-a-smoke-test, production-mlops/canary-samples-at-one-percent, production-mlops/rollback-without-redeploy]
updated: 2026-11-03
---

你在为一个新模型跑金丝雀发布。团队想定一条规则：金丝雀和基线在任何指标上有差异，就停止发布。设计这些闸门，让它们能抓住真实的退化，也能放行健康的发布。

## Short answer

每个闸门都写成基线之上的倍数，绝不写成相等。在五个指标上设闸门：延迟分位数、单请求成本、错误与拒答率、输出长度分布、用户反馈率。每个阈值都要高于运行间的波动，课程测得相同输入下这一波动最高达 15%；每一步都要停留足够久，攒够闸门需要的样本。

## Full answer

### 为什么要求相等会失败

相同的输入会产生不同的输出。GPU 上的浮点归约在不同 batch 形状下执行顺序不同，batch size 每次运行都会变，温度高于零的采样还会带来自己的随机性。课程报告，同一评估集上两次运行的准确率相差可达 15%。因此“稳定”是指落在预期波动之内，而不是与基线完全相同。

### 五个闸门

| 指标 | 越线条件 |
|---|---|
| 延迟 P50、P95、P99 | 金丝雀 P99 超过基线的 1.5x |
| 单请求成本 | 比基线高出 20% 以上 |
| 错误与拒答率 | 达到基线的 2x |
| 输出长度，均值与 P99 | 分布发生偏移 |
| 用户反馈，点踩与工单 | 达到基线的 1.5x |

### 先测噪声底

金丝雀开始前，用同一个基线模型跑两组，记录每个指标在两组之间的差距。这个差距就是噪声底。低于它的闸门会叫停每一次发布，好的发布也不例外。课程练习问的是：评估噪声为正负 7% 时，倍数该怎么设；答案是闸门要设在这个区间之上。

### 每一步停留足够久

发布按 1、10、25、50、75、100% 推进。闸门每 5 到 15 分钟检查一次。负载为每分钟 1,000 次时，1% 的金丝雀每分钟只拿到 10 个请求，每个窗口 50 到 150 个数据点。这足以看延迟和错误，但 P99 由一两个样本决定，所以 P99 闸门必须跨多个窗口持续成立。对用户反馈来说，这点样本太少。每一步都要停住，等闸门攒够样本。

### 让退出便宜

只有回滚够快，叫停才有用。把流量比例放在策略开关里，把模型放进 registry 并固定 digest，一旦越线，几秒内就能回退。

## Follow-ups

- **Level 3:** 金丝雀开始前，怎样知道噪声有多大？ Expected: 用同一个基线跑两个金丝雀分组，记录每个指标在两组之间的差距。
- **Level 3:** 第一步的用户反馈太少，没法设闸门。怎么办？ Expected: 早期步骤只按延迟、成本、错误和长度设闸门，从样本足够的那一步起再启用反馈闸门。
- **Level 4:** 某一步闸门触发了，下次检查时指标又正常了。继续还是叫停？ Expected: 叫停并排查。来回跳的闸门要么落在噪声里，要么看到了间歇性退化；两种情况都要在更多用户看到这个模型前做出决定。

## Wrong answers

- "与基线有任何差异就停止。" 同一个模型跑两次结果也不同，这条规则会叫停每一次发布。
- "按平均延迟设闸门。" 平均值掩盖长尾。按分位数设闸门。
- "成本一点都不许涨。" 更好的模型可能更贵。课程把越线点设在 20%，收益值不值由产品决定。

## Taught in

[渐进式发布课程](../../../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)列出了五个闸门、非确定性上限和每一步的节奏。
