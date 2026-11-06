---
id: judge-calibration-before-trust
title: judge 分数用来拦截发布之前
card: evaluation
kind: concept
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [ml-depth, design-review]
tags: [llm-as-judge, calibration, spearman, rubric]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks]
manuals: []
practice: []
cheatsheet: [llm-evaluation, generative-evaluation]
related: [evaluation/pick-the-eval-method]
updated: 2026-11-03
---

你写好了评分量表，现在由一个 judge 模型给检索系统的忠实度打分。看板上的均值很高，团队想从下周一起用它当发布门禁。在这个数字能拦下或放行一次发布之前，必须先做什么？

## Short answer

先拿人的判断校准 judge。人工标注约 100 个样本，让 judge 给它们打分，计算两组排名之间的 Spearman 相关系数。低于 0.7 说明量表还要改，这个数字只是噪声。然后冻结 judge 模型和版本，除了均值，也要看最低的那些分数。

## Full answer

### 为什么 judge 的原始分数会骗人

judge 有三种无声的失效方式。它有偏见：偏好更长的回答、来自自己模型家族的回答，以及与 prompt 风格一致的回答。它可能返回坏掉的 JSON，变成缺失分数后从聚合里掉出去，均值反而升高。它会漂移：换一个 judge 版本，所有指标一起变。

### 校准流程

1. 人工标注至少 50 个样本，课程用的是 100 个。要覆盖分布的底部，不能只挑简单样本。
2. 让 judge 给同样的样本打分。
3. 画出 judge 与人工的对比图，计算 Spearman 秩相关系数。
4. 相关系数低于 0.7，说明量表还要改。相关系数 0.3 的 judge 就是噪声。

judge 要和生成器来自不同的模型家族。给自己家族打分的模型会把分数抬高约 10% 到 20%。

### 校准之后

- 冻结 judge 模型和版本。升级时，先让新旧 judge 在同一份基线上各跑一遍，再比较其他东西。
- 查看最低分位。0.85 的均值可能掩盖 5% 的灾难性失败。
- 给评测集做版本管理，每次改动都打标签，这样本月的分数和上月的分数含义相同。

## Follow-ups

- **Level 2:** 为什么用 Spearman，而不是 judge 分数与人工分数的均值差？ Expected: Spearman 比较的是排名，所以一个打分偏严、但排序与人一致的 judge 也能通过。
- **Level 2:** 课程能接受的最小人工标注集是多大？ Expected: 少于 50 个人工标注样本测过的 judge，课程不接受。
- **Level 3:** judge 就是写答案的那个模型。校准大概会显示什么？ Expected: 分数被抬高约 10% 到 20%；把 judge 换成另一个模型家族。
- **Level 3:** 相关系数达标了，但最低的十分之一里有一些很自信的错误打分。你会上线吗？ Expected: 不会；整体相关性可能掩盖灾难性失败，所以在这个数字用于拦截之前，要先检查最低的 10%。

## Wrong answers

- "量表写得很清楚，所以 judge 是对的。" 长度偏见和家族偏见在清晰的量表下照样存在；只有与人工标签的相关性才能显示它们有多大。
- "它和我们的旧指标一致，所以已经校准过了。" 旧指标可能有同样的偏见；要拿人的判断来校准。
- "校准一次，然后不断升级 judge。" 每个 judge 版本都会改变所有分数；冻结版本，或者并行重跑基线。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)给出了校准方法和 judge 的三种无声失效。
