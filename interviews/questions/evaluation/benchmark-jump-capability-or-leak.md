---
id: benchmark-jump-capability-or-leak
title: 加入新训练语料后，基准分涨了 8 分
card: evaluation
kind: design
level: 4
roles: [ai-evaluation-reliability-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [design-review, ml-depth]
tags: [contamination, benchmarks, model-diff, custom-eval]
minutes: 12
lessons: [phases/10-llms-from-scratch/10-evaluation, phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/benchmarks-stop-discriminating]
updated: 2026-11-03
---

你往训练数据里加了一份新的网页爬取语料，之后微调出的模型在一个公开基准上涨了 8 分。管理层想对外宣布。请设计一套审计，判断这次上涨是能力提升还是数据泄漏；如果是泄漏，说明你改为发布什么。

## Short answer

在任何人对外宣布之前，先做污染审计。在新语料里搜索基准题目及其近似改写，报告命中比例；然后在一套这份语料不可能包含的版本化自定义评测上重跑模型，逐个用例与上一版模型做 diff。如果重叠比例不小、自定义评测却没动，这次上涨就是记忆，你应发布自定义评测结果和污染比例。

## Full answer

### 为什么这次提升值得怀疑

训练语料来自网页爬取，基准题目也在网上。不需要谁故意这么做。新爬的语料是测试题进入训练最可能的路径，而饱和的基准会用大幅上涨来奖励记忆。同一节课还列出了另外两种只动分数、不动能力的机制：应试训练和基准饱和。

### 审计步骤

1. **污染搜索。** 检查评测题目或其近似改写在新语料中出现的比例。精确匹配和近似匹配分开报告，并写明方法。
2. **模型 diff。** 逐个用例比较两个模型版本：哪些变好，哪些回退，哪些不变。如果变好的用例集中在搜索命中的题目上，diff 就指出了泄漏点。
3. **自定义评测。** 让两个模型都跑你自己的版本化评测集：至少 200 个用例，包含边界情况，与所有训练样本和 prompt 示例隔离。真实提升会在这里体现，并有区间支撑；泄漏不会。
4. **隔离检查。** 确认没有评测用例与 prompt 示例或微调数据重叠，因为同时充当训练样本的测试用例测的是记忆。

### 应当对外发布的内容

发布带区间的自定义评测数字、污染比例和检测方法，以及附上这条说明的基准分。永远不要只发一个光秃秃的基准数字。再在训练流水线里加上去重步骤，让下一份语料在训练开始前与每个评测集比对一遍。

## Follow-ups

- **Level 3:** 搜索发现一小部分题目精确命中，近似改写命中的更多。哪些要算？ Expected: 都算；改写同样泄漏答案，所以精确匹配和近似匹配分开报告，并写明方法。
- **Level 3:** 自定义评测的分数也涨了。这次上涨是真的吗？ Expected: 可能性更大，前提是这套评测有版本管理、与训练数据分开，并且规模足够大，涨幅超出了它的区间。
- **Level 4:** 下次怎么避免出现这个疑问？ Expected: 训练前把训练语料与每个评测集去重，不让评测数据进入 prompt 和微调数据，并把这项检查记进训练报告。

## Wrong answers

- "我们没有故意放进这个基准，所以数据是干净的。" 网页规模的爬取会无意中把它带进来；课程说这正是污染的常见途径。
- "8 分太大了，不可能是噪声。" 要排除的不是噪声，而是记忆，记忆恰恰会带来大幅上涨。
- "先宣布基准分，说明以后再补。" 应发布带区间的自定义评测和污染比例；光秃秃的基准数字是你没法辩护的说法。

## Taught in

[评测课](../../../phases/10-llms-from-scratch/10-evaluation/)解释了数据污染，并布置了污染检测和模型 diff 两个练习；[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)提醒不要在训练样本上做测试。
