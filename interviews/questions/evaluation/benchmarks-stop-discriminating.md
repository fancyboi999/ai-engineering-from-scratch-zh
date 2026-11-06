---
id: benchmarks-stop-discriminating
title: 饱和基准上的两分差距
card: evaluation
kind: concept
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-breadth, customer]
tags: [benchmarks, contamination, saturation, model-selection]
minutes: 6
lessons: [phases/10-llms-from-scratch/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/benchmark-jump-capability-or-leak]
updated: 2026-11-03
---

一家供应商给你看数据：他们的新模型在一个公开选择题基准上得 89%，你现在用的模型得 87%。他们说这个差距证明新模型更聪明。你为什么不信？你会改要什么？

## Short answer

当所有前沿模型都挤在接近满分的窄带里，公开基准就分不出模型的高下了。原因有三个：训练数据里含有测试题；训练配比针对测试格式调过；还有饱和，即剩下的题目本身有歧义或标错了。在这个窄带里，两分差距是噪声或记忆。要求对方用你的数据、在你的任务上跑一遍。

## Full answer

### 分数的压缩

课程里的这个基准有 15,908 道题，覆盖 57 个学科。不到三年，前沿模型就全部挤进了顶端 3 分的区间。一个在上面得 88.7% 的模型，数不清一个短单词里有几个字母，而这件事不需要任何世界知识。分数衡量的是这个基准，不是你的工作。

### 三大机制

1. **数据污染。** 训练语料来自网页爬取，题目也在网上。不需要谁作弊，答案就会进入训练数据。
2. **应试训练。** 实验室会让训练配比向测试格式倾斜。在四选一的选择题上，模型学会答案的分布，不知道答案也能多拿分。
3. **饱和。** 当所有模型都在 85% 到 90% 之间，剩下 10% 到 15% 的题往往有歧义、标错或很冷僻。从 87 涨到 89，可能只是多记住了两道题。

### 该要什么

- 针对你任务的自定义评测：原型至少 50 个用例，生产决策至少 200 个，包含边界情况和对抗输入。
- 按类别拆开的结果，而不是一个综合分。
- 污染检查：在训练语料里搜索评测题目及其近似改写。

基准仍可用于粗选模型。最终决定要靠你自己的评测。

## Follow-ups

- **Level 1:** 说出评测的三个类别。 Expected: 公开基准、在自己数据上的自定义评测，以及人工评测。
- **Level 2:** 模型不知道答案，测试格式怎么还能帮它？ Expected: 测试有四个选项，答案分布接近均匀，光懂格式就能提分。
- **Level 2:** 基准还有什么用？ Expected: 在你搭建自定义评测之前，用来粗选模型。
- **Level 3:** 怎么检验一个基准是否泄漏进了训练数据？ Expected: 在训练语料里搜索评测题目及其近似改写，报告出现的比例。

## Wrong answers

- "标准基准上差两分就是真实差距。" 在饱和基准的顶端，剩下的题往往有歧义或很冷僻，两分可能只是多记住的两道题。
- "实验室在测试题上训练，是作弊。" 网页规模的爬取会无意中把题目带进来；效果一样，但该做的是污染审计，不是指控。
- "那就改用代码基准。" 一个 164 道题的函数补全基准只覆盖孤立的函数生成，对跨文件的调试或重构什么也说明不了。

## Taught in

[从零构建 LLM 阶段的评测课](../../../phases/10-llms-from-scratch/10-evaluation/)讲解了数据污染、应试训练和饱和。
