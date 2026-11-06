---
id: paired-difference-interval
title: 三个模型、五十个任务、一个排行榜
card: evaluation
kind: design
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [system-design, design-review]
tags: [leaderboard, bootstrap, win-rate, paired-comparison]
minutes: 10
lessons: [phases/19-capstone-projects/74-leaderboard-aggregation, phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/wilson-or-bootstrap]
updated: 2026-11-03
---

你在同样的五十个任务上跑了三个候选模型，必须发布一个有冠军的排行榜。三个均值分别是 0.78、0.75 和 0.10。第二名的团队说他们的模型和第一名打平。设计能了结这个争议的聚合方法和统计量。

## Short answer

报告带 bootstrap 区间的均值、胜率，以及每对模型差值的配对区间。对任务做有放回重采样，得到每个均值的区间。对于打平的说法，对前两名的逐任务差值做 bootstrap；如果这个区间包含零，排行榜就显示两者打平。

## Full answer

### 输入格式

每个模型、每个任务一条记录：模型 id、任务 id、指标名称、单位区间内的分数，以及类别。聚合器拒收单位区间以外的分数，因为一个报 0 到 100 的任务会悄悄主导均值。归一化是上游指标的事。

### 两种排名体系

- **平均分**是头条数字。它对离群值和任务不均衡都敏感。
- **胜率**统计模型拿到最高分的任务数；平局时每个并列模型都算赢一整次。它对离群值和量纲不那么敏感，但会丢掉幅度信息。

两个都报。默认按均值排名，并保留胜率这一列。

### 区间

对任务 id 做 bootstrap：从五十个任务里有放回地重采样，算均值，重复多次，在 0.05 水平上取百分位区间。底层辅助函数默认重采样 1000 次，对外的聚合器默认 500 次。对一对模型，对逐任务差值做 bootstrap，看区间是否排除零。这就是检验打平说法的方法；因为两个模型跑的是同一批任务，所以它是配对的。

### 类别和展示

如果每个任务带有类别，就报告每个类别的均值。一个总体好、代码弱的模型只会在这里露出来。输出一张按均值排序的表，列出排名、模型、均值、保留两位小数的区间、胜率和任务数。

### 它没有处理什么

任务加权：每个任务的分量一样。还有独立性：十道共享同一种错误模式的算术题，并不构成五十个独立样本。下一步是分层 bootstrap，先对任务族重采样，再对任务重采样。

## Follow-ups

- **Level 3:** 为什么对任务做 bootstrap，而不是对任务内部的预测做？ Expected: 重复的单位是任务；在任务内部重采样会低估跨任务的方差。
- **Level 3:** 胜率什么时候会和均值排出不同的名次？ Expected: 一个模型在很多任务上小胜、在少数任务上大败时；均值惩罚大败，胜率只数赢的次数。
- **Level 4:** 任务按族划分，同一族共享错误模式。什么会出问题？ Expected: 任务不独立，区间就太窄了；先对族重采样，再对任务重采样。
- **Level 4:** 某个任务的指标返回 0 到 100，而不是 0 到 1。聚合器该怎么做？ Expected: 拒绝这次运行；悄悄换算会掩盖 bug，指标必须返回比例。

## Wrong answers

- "两个均值的区间有重叠，就是打平。" 要看配对差值；两个单独的区间可以重叠，而差值的区间却排除了零。
- "按胜率排名，它更稳健。" 它丢掉了幅度；一个每个任务都险胜、却在一个任务上惨败的模型看起来完美无缺。两个都报。
- "现在就按重要性给任务加权。" 综合项目对每个任务一视同仁；只有在写明理由时才加权重，并保留不加权的表。

## Taught in

[排行榜聚合综合项目](../../../phases/19-capstone-projects/74-leaderboard-aggregation/)实现了均值、胜率和 bootstrap 区间，[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)解释了为什么由配对比较来定胜负。
