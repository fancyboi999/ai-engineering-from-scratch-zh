---
id: judge-upgrade-moved-every-score
title: 所有指标都变了，产品却没变
card: evaluation
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [debugging, design-review]
tags: [llm-as-judge, drift, versioning, baseline]
minutes: 7
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/judge-calibration-before-trust]
updated: 2026-11-03
---

一夜之间，评测看板上每个指标都变了好几分，有的维度涨，有的维度跌，而产品既没改 prompt，也没换模型。最近合并的一个改动把 judge 切到了它所用模型的最新版本。发生了什么？这种改动应该怎么做？

## Short answer

judge 是测量的一部分，所以产品不动，换一个 judge 版本也会让所有指标同时变化。在流水线里冻结 judge 的模型和版本。升级时，让新旧 judge 在同一份基线上并行打分，用人工标注集校准新 judge，并在比较任何新东西之前重置基线。

## Full answer

### 为什么全都变了

judge 分数是输出和 judge 两者的函数。换了 judge，已存的每个分数就都换了单位。课程把 judge 版本漂移列为三种无声失效之一，并要求标记出任何没有并行基线评测就升级了 judge 的流水线。

### 升级流程

1. 固定 judge 的模型和版本，每次运行都把两者记录下来。
2. 切换之前，用新旧 judge 分别给一份冻结的基线集打分。
3. 校准新 judge：它与人工标注集的 Spearman 相关系数至少要达到 0.7。
4. 如果新 judge 校准得更好，就采用它，并用它重新给已存的基线打分，让历史数据和新的运行用同一个 judge。
5. 在每张图上标出切换点。

### 其他会让所有分数一起变的事

评测集改了却没打版本标签。缺失分数的计算方式变了。某次运行漏掉了一些任务。每次改动都给数据集打标签，并记录任务数量。

## Follow-ups

- **Level 2:** 产品没变时，还有什么会让所有分数一起变？ Expected: 评测集改动了却没打版本标签，或者缺失分数的计算方式变了。
- **Level 2:** 下次怎么分辨是 judge 变了还是产品回退了？ Expected: 运行元数据里记录了 judge 的模型和版本，对比一下元数据就知道。
- **Level 3:** 新 judge 与人工标签的相关性更高。要采用吗？ Expected: 要，但先用它重新给已存的基线打分，让新旧数字出自同一个 judge。
- **Level 3:** 你必须让趋势线跨过这次切换保持连续。怎么做？ Expected: 用两个 judge 给一份固定的冻结集打分，发布每个维度的偏移量，并在图上标出切换点。

## Wrong answers

- "新 judge 分数更高，直接上线。" 产品没变，变的是数字。换 judge 需要并行的基线对照。
- "让 judge 自动跟随最新版本。" 自动升级会让每条趋势线都失去意义；固定版本。
- "小版本不需要重新校准。" 任何版本变化都可能改变分数；重新算一遍相关性。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)点出了 judge 版本间的漂移，并要求任何升级落地前先在冻结基线上并排跑一遍。
