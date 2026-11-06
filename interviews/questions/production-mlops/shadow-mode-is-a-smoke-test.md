---
id: shadow-mode-is-a-smoke-test
title: 一周影子运行能证明什么
card: production-mlops
kind: concept
level: 1
roles: [ai-evaluation-reliability-engineer, inference-engineer, applied-ai-engineer]
rounds: [screen, ml-breadth]
tags: [shadow-mode, canary, rollout, release-gates]
minutes: 5
lessons: [phases/17-infrastructure-and-production/20-shadow-canary-progressive]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/canary-gates-above-noise, production-mlops/rollback-without-redeploy]
updated: 2026-11-03
---

同事想跳过金丝雀。新模型在影子模式下运行了一周，没有错误，账单也没变，所以他认为已经验证过了。这一周证明了什么，还有什么没确定？

## Short answer

影子模式将生产请求复制给候选模型并记录输出，用户看不到这些输出。它表明候选模型不会崩溃、拒答不会更多、成本不会更高、答案不会更长。它无法证明用户更喜欢这些回答，因为没有用户读过。影子模式是冒烟测试，金丝雀才是首次质量测试。

## Full answer

### 影子模式记录什么

每个请求的候选输出都与生产输出并排记录：

- 输出文本，用于与生产版本比较差异；
- token 数，用于计算成本差；
- 延迟；
- 拒答和硬错误。

### 能发现什么

成本激增、长度退化、拒答率变化和硬错误。这些故障会让发布变得昂贵或难堪，影子模式能在不影响用户的情况下发现它们。

### 会漏掉什么

用户能感知到的质量变化。候选输出从未到达用户，因此没有点踩、工单或留存信号。答案更短、更便宜却错误的模型，也能通过影子测试。

### 下一步是什么

金丝雀逐步扩大接触候选模型的用户比例，每步都设闸门。课程使用五项指标：延迟分位数、单请求成本、错误与拒答率、输出长度分布、用户反馈率。比例从 1% 到 10%、25%、50%、75% 和 100%。首次用户反馈出现在这里，而非影子模式。

## Follow-ups

- **Level 1:** 影子模式能提供离线评估没有的什么信号？ Expected: 候选模型在真实请求组合下的行为，包括每请求成本和输出长度。
- **Level 2:** 影子模式显示单请求成本比生产高 40%，怎么办？ Expected: 进入金丝雀前叫停。成本比基线高出 20% 以上就是闸门越线，破坏单位经济效益的模型应回滚。
- **Level 2:** 为什么影子模式不能衡量用户反馈？ Expected: 用户看不到候选输出，因此无从评价或反馈问题。
- **Level 3:** 影子模式让模型服务负载翻倍，如何控制成本？ Expected: 只将固定比例的请求发送给候选模型，而不是全部，并为这部分请求记录相同指标。

## Wrong answers

- "影子模式通过，质量就没问题。" 影子模式没有用户参与，只测成本、长度、错误和拒答。
- "影子模式是零流量的金丝雀。" 金丝雀将候选输出返回真实用户，并根据反馈设闸门。影子模式从不将输出返回给用户。
- "影子模式跑一周就能代替离线评估。" 评估在标注集上判断正确性，影子模式记录真实流量下的行为，两者回答不同的问题。

## Taught in

[渐进式发布课程](../../../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)定义影子模式、五个金丝雀闸门及回滚路径。
