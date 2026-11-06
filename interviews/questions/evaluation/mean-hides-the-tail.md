---
id: mean-hides-the-tail
title: 均值是绿的，用户却看到了失败
card: evaluation
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, ml-depth]
tags: [aggregation, pass-rate, bottom-quantile, faithfulness]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks, phases/10-llms-from-scratch/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/judge-calibration-before-trust]
updated: 2026-11-03
---

一个忠实度看板在一千个用例上报告均值 0.85，高于 0.8 的发布阈值。客服工单却说，助手在一些回答里编造政策细节。评测负责人说指标是绿的。你去哪里找问题？报告要改什么？

## Short answer

均值会掩盖尾部。均值 0.85 完全可能伴随着 5% 的灾难性失败，变成工单的正是这一小片。把用例按分数排序，读最低的 10%。然后在报告里均值的旁边，加上按阈值算的通过率和最低分位告警。

## Full answer

### 为什么看板是绿的

大多数用例得分很高，一小片得分接近零。这一片很小，所以平均值几乎不动。落在这一片里的用户拿到的是编造的政策，而平均值不会告诉他们这种情况很少见。

### 报告什么

- **通过率。** 高于阈值的用例比例。它衡量可靠性，也就是用户能感受到的东西，所以比均值更能指导行动。
- **最低分位。** 课程不接受只报告综合值、却不把最低的 10% 摆出来。每次运行都要人工读这些用例。
- **按类别的分数。** 如果尾部来自某一个类别，修复就是局部的，门禁也应该盯住这个类别。

### 怎么排查

1. 取出得分最低的用例读一遍，确认它们与工单对得上。
2. 检查缺失分数是怎么计算的。judge 返回坏掉的 JSON 会产生缺失分数，丢掉缺失分数会抬高均值。
3. 检查 judge 在低分段是否校准过。一个全是简单样本的人工标注集，对尾部什么也说明不了。

## Follow-ups

- **Level 2:** 为什么课程更看重超过某个阈值的用例比例，而不是均值？ Expected: 它数的是有多少用例足够好，所以衡量的是可靠性。
- **Level 2:** 最低分的用例全来自同一个类别。这改变什么？ Expected: 修复是局部的；按类别报告分数，并在最弱的类别上设门禁，而不是在综合值上。
- **Level 3:** 解析失败产生的缺失分数在求平均前被丢掉了。这造成了什么？ Expected: 均值被抬高，因为最差的输出往往解析失败；把它们算作失败，或者单独报告。
- **Level 3:** 你会给发布门禁加哪条告警？ Expected: 对最低 10% 设下限，再设一个通过率阈值，两者都放在均值旁边。

## Wrong answers

- "均值过了，发布就过了。" 均值 0.85 常常掩盖着 5% 的灾难性失败；门禁需要看尾部。
- "把均值阈值提高到 0.9。" 更高的均值阈值照样会掩盖一小片零分；要加一个描述分布的指标。
- "judge 在低分段噪声大，忽略这些用例吧。" 失败就藏在那里；也要在低分用例上校准 judge。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)列出了只看原始综合值的陷阱和最低分位规则，[评测课](../../../phases/10-llms-from-scratch/10-evaluation/)把通过率定义为更能指导行动的汇总指标。
