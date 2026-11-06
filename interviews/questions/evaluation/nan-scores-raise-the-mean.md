---
id: nan-scores-raise-the-mean
title: judge 解析失败，均值反而上涨
card: evaluation
kind: debug
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [debugging, design-review]
tags: [llm-as-judge, parse-failure, nan, aggregation]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/mean-hides-the-tail]
updated: 2026-11-03
---

你的 judge 为每个用例返回一个带分数的 JSON 对象。流水线解析它，产品没有任何改动，平均忠实度却比前一周升高了。日志显示，judge 输出解析失败的用例比例在不断增加。解释这次上涨，并修好流水线。

## Short answer

解析失败会变成缺失分数，而聚合会悄悄丢掉缺失分数。解析失败的往往是最差的输出，所以丢掉它们会抬高均值。显式捕获失败，把它记为单独的结果，计分时算作失败或在均值旁边单独报告，并在失败比例上升时告警。

## Full answer

### 机制

judge 返回的坏 JSON 变成了非数值（NaN）。对含有这种值的列求均值时，它们会被排除。课程把这列为 judge 的第二种无声失效，要求明确暴露解析失败，并为它设置独立状态。

### 为什么排除是有偏的

judge 最常在冗长、怪异或被拒答的输出上弄坏格式。这些恰好也是低分输出。所以排除它们就是切掉了分布的底部，均值因此上涨，原因与质量毫无关系。

### 修复

1. 用显式检查包住解析，给每个用例一个状态：已评分、解析失败、judge 错误。
2. 每次运行都报告解析成功的比例。失败比例上升，这次运行就判失败。
3. 用两种方式发布均值：失败算 0 分，以及失败排除。如果两者相差很大，失败就不是随机的。
4. 允许用一个修复 prompt 重试一次，记录发生过重试，并限制重试次数。
5. 保存 judge 的原始文本，方便评审人查看坏在哪里。

### 验证诊断

把上周的失败按 0 分重新计算均值。如果涨幅消失，就找到了原因。

## Follow-ups

- **Level 3:** 为什么失败的用例不是随机样本？ Expected: judge 最常在冗长、怪异或被拒答的输出上弄坏格式，而这些也正是低分输出。
- **Level 3:** 解析失败按 0 分算，还是排除？ Expected: 两种都报，并附上解析成功比例；门禁应把失败比例上升视为运行失败。
- **Level 4:** 怎么设计 judge 的输出，让这种事不再悄悄发生？ Expected: 严格的 schema，一个拒收其他任何格式的校验器，每个用例一个状态字段，再加一个运行级的解析失败指标和告警。

## Wrong answers

- "均值涨了，所以质量涨了。" 产品什么都没变；变的是分母。
- "一直重试到能解析为止。" 不留记录的重试会掩盖失败，还可能改变分数；记录每次重试，并设上限。
- "排除失败，那是 judge 的 bug。" 排除会偏向丢掉差的输出；不管原因是什么，产品数字都是错的。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)把 JSON 解析失败列为 judge 的一种无声失效，并要求显式的失败模式。
