---
id: cot-when-it-hurts
title: 分步思考提示在哪里有用，在哪里增加成本
card: prompting-structured-output
kind: concept
level: 1
roles: [applied-ai-engineer, agentic-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-breadth]
tags: [chain-of-thought, reasoning, latency, cost]
minutes: 7
lessons: [phases/11-llm-engineering/02-few-shot-cot]
manuals: []
practice: []
cheatsheet: [prompt-engineering]
related: [prompting-structured-output/self-consistency-at-temperature-zero, prompting-structured-output/few-shot-example-count]
updated: 2026-11-03
---

你的团队在产品的每个 prompt 里都加上了 "think step by step"，包括一个调用量很大的分类器，以及对推理模型的调用。这句话在哪里有用，在哪里有害，为什么？

## Short answer

它对多步问题有用：每个推理 token 都成为下一个 token 的上下文，模型一步步算出答案。它对简单的事实回忆和单步分类有害，每条查询多出 50 到 200 个推理 token，却没有收益；对推理模型也有害，这类模型内部已经在跑思维链，多加这句指令反而可能变差。按任务选技术，依据是准确率要求、延迟预算和成本。

## Full answer

### 为什么有效

没有可见推理链的 transformer 只能把全部推理压进一次前向传播的隐状态里。有了推理链，中间步骤就是 token，每个 token 都为下一个扩展上下文。在小学数学基准上，课程展示了一个模型的准确率从零样本的 78% 升到只加这句话的 91%，再升到加上带解题过程示例的 95%。

### 哪些场景不划算

- **简单的事实回忆和单步分类。** 没有需要推理的东西，推理链纯属开销。
- **高吞吐、低复杂度的任务。** 每次调用多出的 50 到 200 个 token 就是成本和延迟。
- **推理模型。** 它们回答前会在内部跑推理链；这句指令是多余的，有时还会起反作用。
- **需要大范围搜索的问题。** 在课程的算术谜题上，标准 prompt 解出 7.3% 的情况，单条推理链解出 4.0%，在分支上做树搜索解出 74%。

### 按任务选择

| 技术 | 调用次数 | 额外 token | 适合 |
|---|---|---|---|
| 零样本 | 1 | 无 | 简单任务 |
| 少样本 | 1 | 200 到 500 个 token | 匹配格式 |
| 零样本思维链 | 1 | 50 到 200 个 token | 快速提升推理 |
| 少样本思维链 | 1 | 300 到 600 个 token | 单次调用的最佳效果 |
| 5 个样本的自洽性（self-consistency） | 5 | 五倍 token | 高风险推理 |

## Follow-ups

- **Level 1:** 为什么把步骤写出来能提高准确率？ Expected: 每个推理 token 都成为下一个 token 的上下文，模型分步算出答案，而不是一次算完。
- **Level 2:** 分类器为这句话付出了什么？ Expected: 每条查询多 50 到 200 个推理 token，调用量大时这就是成本和延迟，准确率却没有提高。
- **Level 2:** 为什么调用推理模型时不加这句话？ Expected: 它在回答前已经在内部跑推理链，这句指令多余，有时还会起反作用。
- **Level 3:** 有没有单条推理链比直接回答更差的任务？ Expected: 有，就是课程里的搜索谜题，推理链解出的情况比标准 prompt 少，而树搜索解出了大多数。

## Wrong answers

- "它永远不会有害，最差也就是没效果。" 它每次调用都消耗 token，而且在大范围搜索谜题和推理模型上降低了准确率。
- "少样本和思维链是一回事。" 少样本展示示例，思维链展示推理过程；两者结合就是少样本思维链。
- "一律用温度零运行。" 单条推理链用零没问题，但要采样多条推理链投票，温度必须大于零，否则每次采样都一样。

## Taught in

[少样本与思维链](../../../phases/11-llm-engineering/02-few-shot-cot/)一课给出了机制、基准表、推理链有害的场景和技术对比。
