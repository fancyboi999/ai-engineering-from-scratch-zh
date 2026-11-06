---
id: aggregate-hides-tradeoffs
title: 排行榜第一名在代码任务上最差
card: evaluation
kind: tradeoff
level: 4
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [design-review, system-design]
tags: [aggregation, weights, per-category, leaderboard]
minutes: 10
lessons: [phases/19-capstone-projects/41-eval-pipeline, phases/19-capstone-projects/74-leaderboard-aggregation, phases/05-nlp-foundations-to-advanced/28-long-context-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/paired-difference-interval, evaluation/eval-pipeline-take-home]
updated: 2026-11-03
---

排行榜用一个综合分给候选模型排名，第一名以微弱优势胜出。代码团队的同事说，在他们的任务上，这个第一名是三个模型里最差的。两边看的是同一份报告。这怎么可能？综合分掩盖了什么？报告该怎么发布，才能让两类读者都看明白？

## Short answer

综合分是加权平均，所以一个模型可以总分第一，同时在某个类别上落后；微弱的领先也可能落在均值的置信区间之内。在综合分旁边发布各类别的均值和区间，并写明权重。如果排行榜还混用了不同量纲，取值范围更宽的任务会主导均值，而且没人察觉。

## Full answer

### 综合分从哪来

评测流水线把每项评测归一化到单位区间，再取加权平均。它的默认权重是：困惑度 0.2，精确匹配 0.3，token F1 0.3，judge 0.2。排行榜那节课的聚合器则对所有任务取简单平均。两种情况下，头条数字都只是对几个数的一种加权方式。换一套权重，冠军就会换人。

### 它掩盖了什么

- **类别短板。** 只有按类别拆开的列（比如数学、推理、代码、安全）才能暴露一个总体强、代码弱的模型。
- **任务不均衡和离群值。** 均值对两者都敏感；胜率不那么敏感，但会丢掉差距的幅度。
- **量纲泄漏。** 一个 0 到 100 打分的任务和一批单位区间的任务放在一起，会主导均值。所以聚合器拒收单位区间以外的分数。
- **领先幅度。** 前两名之间的小差距没有意义，除非两者逐任务差值的配对 bootstrap 区间排除了零。

长上下文评测那节课从另一个角度给出同一条规则：按类别报告准确率，因为综合分会掩盖任务之间的巨大差异。

### 怎么发布

一页三层。顶部是综合分，并打印权重。下面是每项评测或每个类别的数字，附区间和胜率。再往下是逐样本记录，供评审人追查回退。给前两名补上配对差值区间。如果某个类别对产品很关键，就给这个类别单独设一条拦截规则。

## Follow-ups

- **Level 3:** 代码团队希望代码类别按双倍权重计入。头条数字要改吗？ Expected: 不改；保留不加权的表格，如果各方同意，再加一个打印出权重的加权视图，因为综合项目把加权留成了一个显式的扩展点。
- **Level 3:** 前两名均值的差距比各自的区间还小。排行榜该展示什么？ Expected: 逐任务差值的配对 bootstrap 区间；如果它包含零，两者就是平手，排名先后等于抛硬币。
- **Level 4:** 报告里改哪一处，就能避免这场争论？ Expected: 在头条数字下方列出带区间的各类别均值，让代码短板出现在同一页上。

## Wrong answers

- "综合分就是客观答案。" 它只是一种加权方式的答案；换一套权重就是另一个冠军。
- "去掉综合分，只展示类别。" 头条数字是为了让人做决定；保留它，标明权重，把类别放在它下面。
- "改用胜率排名。" 胜率掩盖幅度；两者都要发布，再加上配对区间。

## Taught in

[评测流水线综合项目](../../../phases/19-capstone-projects/41-eval-pipeline/)展示了报告的三层结构和加权综合分，[排行榜聚合综合项目](../../../phases/19-capstone-projects/74-leaderboard-aggregation/)加入了类别和区间，[长上下文评测课](../../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/)提醒综合分会掩盖每类任务的表现。
