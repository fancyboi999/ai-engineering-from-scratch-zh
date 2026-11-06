---
id: split-ratio-mismatch
title: 均分实验却分成了 47 比 53
card: production-mlops
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [debugging, ml-breadth]
tags: [ab-testing, srm, randomization, assignment]
minutes: 8
lessons: [phases/17-infrastructure-and-production/21-ab-testing-llm-features, phases/11-llm-engineering/13-production-app]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/peeking-at-an-ab-test, production-mlops/hash-bucket-assignment]
updated: 2026-11-03
---

某实验把用户均分到对照组和变体组。一周后，看板显示对照组占 47%，变体组占 53%，变体的主要指标领先。你得出什么结论，接下来怎么做？

## Short answer

先不要解读结果。配置为均分，一周流量却分成 47 比 53，属于样本比例不匹配，说明分组或日志记录有问题，两组已不可比较。在分组路径中找出原因，修复后重新开始实验。

## Full answer

### 检查说明了什么

分组哈希将每个用户放入一组。一周后的实际比例应非常接近配置比例。如果不是，课程的回答很直接：某处出了问题。课程中的两类实验平台都会执行这项检查，它应放在每次结果解读之前。

### 为什么胜出结果无效

导致某组用户流失的因素，可能与结果相关。如果慢客户端在某组记录曝光前失败，这组就会显得更快、用户更满意。测得的提升来自用户流失，而非变体。事后校正无法恢复随机分组。

### 排查位置

1. **分组函数。** 生产应用综合项目对用户 ID 做确定性哈希，让同一用户始终留在同一组。按请求随机抽组，或对会变化的字段做哈希，都会破坏分流。
2. **曝光日志。** 某组可能丢失事件，例如变体路径在一个可能失败的调用之后才记日志。
3. **客户端错误。** 变体在记录日志前崩溃，会让这部分用户漏掉计数。
4. **机器人和重试。** 落入某组的机器人或重试循环会使该组计数膨胀。
5. **缓存。** 分组之前的缓存可能把某组的决策返回给许多用户。

### 接下来

修复原因，丢弃数据，重新开始。预先登记样本比例不匹配检查，让它自动阻断结果解读，团队就不必争论某个胜出的变体。

## Follow-ups

- **Level 2:** 为什么对用户 ID 做哈希，而不在每次请求时随机分组？ Expected: 同一用户每次请求都落入同一组，体验一致，曝光也按用户计数。
- **Level 3:** 举出两种让变体组用户比对照组多的原因。 Expected: 日志故障丢失对照组曝光，或变体路径对机器人和重试的处理不同。
- **Level 3:** 能否统计校正比例不匹配并保留结果？ Expected: 不能。不匹配说明两组不可比较，校正无法恢复随机分组。

## Wrong answers

- "百分之三的差距属于噪声。" 一周流量下，公平分组出现这种差距的可能性很低，比例检查正是用来标记这种情况的。
- "变体领先幅度超过比例差距，可以上线。" 比例差距可能与结果相关，提升可能就来自用户流失。
- "删掉部分变体用户，直到两组一致。" 事后删用户会在原有偏差上再加一层偏差。

## Taught in

[A/B 测试课程](../../../phases/17-infrastructure-and-production/21-ab-testing-llm-features/)定义样本比例不匹配检查，[生产应用课程](../../../phases/11-llm-engineering/13-production-app/)按用户 ID 哈希分组。
