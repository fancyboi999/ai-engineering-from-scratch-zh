---
id: judge-grades-its-own-work
title: 人工评审发现编造事实，忠实度却一直很高
card: rag
kind: debug
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [faithfulness, llm-judge, rag-eval, bias]
minutes: 10
lessons: [phases/19-capstone-projects/68-rag-eval-precision-recall, phases/05-nlp-foundations-to-advanced/13-question-answering]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [rag/diagnose-from-the-metric-table, rag/faithfulness-vs-relevance]
updated: 2026-11-03
---

忠实度分数来自一个模型：它把每条论断和检索上下文放在一起读，回答是或否。这个分数一个月来一直接近满分，人工评审却在抽样答案中不断发现编造的事实。生成器和 judge 是同一个模型。原因是什么，应该改什么？

## Short answer

与生成器同一家族的 judge 会高估自家输出的忠实度，所以分数居高不下，抽样却暴露了真相。把 judge 换成另一个模型家族，或人工抽样评分，再加上整条样本级别的评审，因为逐句检查都通过时，整个答案仍可能误导。

## Full answer

### 指标怎样构建

评估把答案拆成句子形式的论断，让 judge 判断每项是否得到检索上下文支持，报告通过比例。课程提供基于 token 重叠的确定性替代 judge，以便离线运行，生产则换成模型调用。问答课程将生产形式描述为论断与上下文之间的蕴含关系，无需标准答案。

### 两个盲点

1. **judge 偏差。** 模型高估自身家族输出的忠实度。课程的规则是 judge 与生成器来自不同模型家族，或人工抽样评分。
2. **局部检查漏掉整体论断。** 每句都可能有依据，但整个答案得出上下文不支持的结论。自动指标之外，要加整条样本的定性评审。

### 改什么

- 更换 judge 的模型家族，然后在同一份测试数据上测新旧 judge 的分歧。课程练习在模拟 judge 和真实模型之间做的也是这件事。
- 每周人工评审固定样本，用作自动评分的校准集。
- 考虑将忠实度分为不支持、部分支持、完全支持三级，而非只有是或否。
- 忠实度旁保留答案相关性。有依据却答非所问的答案，会一个指标高、另一个低。

## Follow-ups

- **Level 3:** 修改前怎样量化 judge 的偏差？ Expected: 人工标注部分论断，测 judge 与人工标签的分歧。
- **Level 3:** 每句通过，整体却误导，用什么发现？ Expected: 逐项指标之外，增加整条样本定性评审。
- **Level 4:** 为什么高忠实度答案仍可能没用？ Expected: 忠实度比较答案与上下文，不比较问题；有依据但偏题的答案忠实度高、相关性低。
- **Level 4:** 最强模型同时也是生成器，团队坚持用它作 judge，你怎么说？ Expected: 选 judge 先看独立性；同家族的 judge 再强也有偏差，所以换另一个家族，并保留人工评分的校准样本。

## Wrong answers

- "分数很高，所以人工评审错了。" 分数只是一个模型对自家输出的看法，抽查的答案才是真实情况。
- "让 judge 严格一点就解决了。" 更严 prompt 或阈值不能消除家族偏差；需另一家族或人工样本。
- "用答案相关性替换忠实度。" 两者衡量不同问题；相关性只问是否回答问题，不说明是否有依据。

## Taught in

[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程指出 judge 偏差与整体论断盲点，[问答](../../../phases/05-nlp-foundations-to-advanced/13-question-answering/)课程说明生产中基于蕴含的忠实度。
