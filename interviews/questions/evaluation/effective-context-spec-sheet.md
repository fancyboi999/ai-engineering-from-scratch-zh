---
id: effective-context-spec-sheet
title: 每次升级模型都要重跑的长上下文测试组
card: evaluation
kind: design
level: 4
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [long-context, niah, multi-hop, regression, spec-sheet]
minutes: 12
lessons: [phases/05-nlp-foundations-to-advanced/28-long-context-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/niah-is-not-enough]
updated: 2026-11-03
---

你的团队下个季度要换新模型，需要一套长上下文评测，以后每次升级都重跑。产品要在长文档上回答问题，有时还得把几处的事实组合起来。请为它设计这套测试组：测试项、采样网格、指标、截止线和回归流程。

## Short answer

搭一个固定的自建 harness，分三部分：在你自己的文档上按深度和长度铺开的 needle 网格，在相同长度上的多跳变量追踪任务，以及一批真实的长文档问题。每个长度采样五个深度，记录通过率、首 token 时间和单次查询成本。发布两条截止线：通过率 90% 时的有效检索长度，通过率 70% 时的有效推理长度；以后每次升级都重跑同一个 harness。

## Full answer

### 测试项

1. **领域 needle。** 用你的文档拼出填充文本，把一条你领域里的事实按选定的深度比例和总长度埋进去。needle 与填充文本不能有共同的词，这样检索需要一步推理，而不是关键词匹配。
2. **多 needle。** 在不同深度埋三条事实，要求三条都答出来。单 needle 成功预测不了这一项。
3. **变量追踪。** 埋一条链：第一个值，第二个值由第一个定义，第三个值由第二个定义，然后问最后一个值。这是最先失败的任务，也正是你的产品在组合事实时做的事。
4. **真实问题。** 一个固定的长文档子集，配好答案，按类别评分。

### 网格

每个长度采样深度 0、0.25、0.5、0.75 和 1.0，因为模型对中间部分关注不足。长度取 1k、4k、16k、64k 和你的目标长度。按任务类型把通过率画成热力图。

### 指标

每个长度都记录检索通过率、推理通过率、首 token 时间和单次查询成本。一个百万 token 的 prompt 光 prefill 就可能要 30 到 120 秒，所以产品的长度预算既取决于准确率，也取决于延迟。

### 截止线

有效检索长度是 needle 网格通过率达到 90% 的最大长度。有效推理长度是变量追踪通过率达到 70% 的最大长度。预期后者只有宣传窗口的 25% 到 50%。两个数都写进规格表。

### 回归规则

harness 保持固定并做版本管理。每个候选模型都跑一遍，按任务类型发布差值。不接受模型卡作为证据，不接受供应商自报的分数，多跳负载也不接受只有 needle 的结果。

## Follow-ups

- **Level 3:** 为什么用固定的 harness，而不是每次换最新的公开基准？ Expected: 回归需要在两个模型上跑同一套测试；基准一变，模型的变化和测试的变化就搅在一起了。
- **Level 3:** 新模型在目标长度上通过了 needle 网格，变量追踪却在四分之一长度处就失败了。你上线什么？ Expected: 以有效推理长度作为产品上限；超出部分用分块或检索，并在规格表里写明。
- **Level 4:** 目标长度下 prefill 要两分钟。这会改变设计吗？ Expected: 会；长度预算取决于产品在延迟和成本上负担得起多少，而不是模型能读多长。

## Wrong answers

- "在宣传的长度上跑一遍 needle 测试就够了。" 只有 needle 说明不了多跳能力；课程不接受多跳负载只用它。
- "直接用供应商公布的长上下文分数。" 那是自报的数字；要在你的用例上独立重跑。
- "只在一个长度上测中间深度。" 模型对中间关注不足，长度一长还会退化；一个点会把两种效应都掩盖掉。

## Taught in

[长上下文评测课](../../../phases/05-nlp-foundations-to-advanced/28-long-context-evaluation/)给出了这套测试组、采样网格、两条截止线和回归规则。
