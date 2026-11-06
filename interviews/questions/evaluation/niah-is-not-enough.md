---
id: niah-is-not-enough
title: needle 测试满分，面对的却是一份长合同
card: evaluation
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [ml-breadth, system-design]
tags: [long-context, niah, ruler, effective-context]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/28-long-context-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/effective-context-spec-sheet]
updated: 2026-11-03
---

一张模型卡宣称上下文窗口有 100 万 token，并且在这个长度上的大海捞针（needle in a haystack）测试拿了满分。你的产品要求模型核对一份长合同里分散在多处的数字。这张模型卡回答了你的问题吗？你改测什么？

## Short answer

不能。单针测试衡量的是对单个植入事实的检索，前沿模型对此已经饱和。你的任务是多跳聚合，在大多数模型上超过约 128k token 就会急剧退化。应在目标长度上运行多跳测试，并汇报两个数值：有效检索长度和有效推理长度。

## Full answer

### 大海捞针测试衡量了什么

在填充文本里按受控的深度放一个事实，然后提问。扫遍不同的深度和长度。它是基线：必要，但不充分。单针成功预测不了多针成功，两者都预测不了对分散事实的推理，而推理正是最先失败的任务。

### 更难的基准测试补充了什么

- 一个多任务套件，13 种任务类型，覆盖检索、多跳追踪、聚合和问答。它首次发布时，17 个宣称支持 32k 上下文的模型里，只有一半在 32k 时保持住了质量。
- 一个多轮共指测试，放 8、24 或 100 根针，显示模型能同时记住多少事实。在一个宣传 10M token 的模型上，8 针版本在 1M token 时降到了 26.3%。
- 与查询没有共同词汇的非字面针，让检索需要一步推理。

### 规格表上的两个数

1. **有效检索长度**：needle 测试仍能达到某个阈值（如 90%）的最长上下文。
2. **有效推理长度**：多跳或聚合任务仍能达到某个阈值（如 70%）的最长上下文。它通常只有宣传窗口的 25% 到 50%。

### 为你的合同搭测试

在填充文本里埋三条相互关联的赋值：一个值，第二个值由第一个定义，第三个值由第二个定义，然后问最后一个。每个长度测 0、0.25、0.5、0.75 和 1.0 五个深度。针不能与填充文本共享关键词。每次运行都记录首 token 时间；一个百万 token 的 prompt 光 prefill 就可能要 30 到 120 秒。

## Follow-ups

- **Level 2:** 为什么单针通过预测不了三针通过？ Expected: 几个事实需要同时关注几个位置；多针测试衡量的是同时兼顾，不是检索。
- **Level 2:** 你测哪些深度？ Expected: 0、0.25、0.5、0.75 和 1.0，因为模型对输入中间部分关注不足。
- **Level 3:** 埋进去的事实用的是与周围文本相同的词。会出什么问题？ Expected: 检索变成了简单的字面匹配；改用没有字面重叠的针。
- **Level 3:** 在目标长度上，除了准确率你还测什么？ Expected: 首 token 时间和单次查询成本；一个百万 token 的 prompt 光 prefill 就可能要 30 到 120 秒。

## Wrong answers

- "供应商的分数是独立证据。" 供应商发布的是自己测的分数；在你的任务和你的长度上重跑。
- "一百万 token 能通过，就说明每个更短的长度、每种任务都能通过。" 按任务类型报告曲线；综合分会掩盖任务之间的巨大差异。
- "只测中间深度。" 很多实现确实只测中间；而中间恰恰是模型关注不足的地方，所以要测五个深度。

## Taught in

[长上下文评测课](../../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/)介绍了这些基准，以及规格表上的两个数。
