---
id: faithfulness-vs-relevance
title: 忠实度与答案相关性评的是两回事
card: rag
kind: concept
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-breadth]
tags: [faithfulness, answer-relevance, rag-eval, llm-judge]
minutes: 7
lessons: [phases/19-capstone-projects/68-rag-eval-precision-recall, phases/05-nlp-foundations-to-advanced/13-question-answering]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [rag/judge-grades-its-own-work, rag/recall-at-k-first]
updated: 2026-11-03
---

RAG 评估报告中有忠实度和答案相关性两个指标。同事认为两者相同，想删掉一个。说明两者各评什么，再举一个在其中一项得高分、另一项得低分的答案。

## Short answer

忠实度检查答案中的每项论断是否得到检索上下文支持。答案相关性检查答案是否回答了问题。忠于检索片段却始终没有回答问题的摘要，忠实度高而相关性低；模型凭自身记忆给出的简短直接回答，相关性高而忠实度低。

## Full answer

### 两个指标怎样计算

| 指标 | judge 的输入 | 输出 |
|---|---|---|
| 忠实度 | 答案中的一项论断与检索上下文 | 是或否，再汇总为通过的论断比例 |
| 答案相关性 | 问题与答案 | 答案是否回应问题 |

评估先把答案拆成句子形式的论断。忠实度也称 groundedness、support 或 attribution。问答课程在生产实现中将它描述为论断与上下文之间的蕴含关系；相关性则是从答案生成假设问题，再与真实问题比较。

### 为什么两个都保留

两者分别发现另一指标看不到的故障：

- 忠实度发现编造的事实，因为上下文不支持它。
- 相关性发现偏题答案，因为 judge 从不看上下文，只检查问题是否得到回答。

评估课程的诊断表同时使用两者。MRR 高而忠实度低，指向生成 prompt；忠实度高而相关性低，指向查询改写器或 prompt。

### 不需要标准答案

两者都依据上下文和问题评分，而不是参考答案。因此可对没有标签的真实流量评分，并与检索侧的上下文精确率、上下文召回率一起使用。

### 离线替代实现

课程自带一个确定性 judge，按 token 重叠是否超过阈值打分，评估无需任何网络调用。它读不懂语义，所以生产环境换成模型 judge，且与生成器来自不同模型家族。

## Follow-ups

- **Level 2:** 哪个指标能发现幻觉？ Expected: 忠实度，因为编造事实得不到检索上下文支持。
- **Level 2:** 忠实度高而相关性低，指向哪个阶段？ Expected: 查询改写器或生成 prompt；上下文本身偏题，或答案偏离问题。
- **Level 3:** 为什么两个指标都不需要参考答案？ Expected: 它们根据上下文和问题评分，因此适用于真实流量。
- **Level 3:** 课程离线 judge 的局限是什么？ Expected: 它只检查 token 重叠是否超过阈值，无法理解语义；生产中使用模型 judge，且与生成器来自不同模型家族。

## Wrong answers

- "两者相同，忠实的答案一定相关。" 答案可以忠实概括上下文，却完全不回答问题。
- "检索效果好时只看相关性就够了。" 相关性不看上下文；模型凭记忆作答也可能相关，却没有依据。
- "忠实度需要标准答案。" 它依据检索上下文评分，因此能用于真实流量。

## Taught in

[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程定义两个指标与替代 judge，[问答](../../../phases/05-nlp-foundations-to-advanced/13-question-answering/)课程给出生产实现形式。
