---
id: diagnose-from-the-metric-table
title: 召回率不变、MRR 下降，检索器却没改过
card: rag
kind: debug
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [rag-eval, mrr, recall, reranking, regression]
minutes: 10
lessons: [phases/19-capstone-projects/68-rag-eval-precision-recall]
manuals: []
practice: []
cheatsheet: [llm-evaluation, rag-production]
related: [rag/recall-at-k-first, rag/judge-grades-its-own-work]
updated: 2026-11-03
---

发布后，每晚 RAG 评估显示 recall@5 仍高且未变，MRR 比上周下降，忠实度不变。检索器没有改动。你怀疑哪个阶段，如何确认，其他指标组合又意味着什么？

## Short answer

首先怀疑重排模型。平均而言，标准片段仍在前 5 个结果中，所以召回率不变，但排名降低使 MRR 下降；生成器仍忠于所收到的上下文。用逐查询记录确认：比较发布前后标准片段的排名，再看重排模型改了什么，例如权重、候选池大小，或文本对中查询与文档的顺序。

## Full answer

### 为什么指向重排阶段

MRR 是各查询第一个相关文档排名倒数的平均值。第 1 名贡献 1.0，第 2 名贡献 0.5，第 10 名贡献 0.1，因此主要受列表头部影响。recall@5 不关注前 5 个内部的位置。召回率不变而 MRR 改变，说明正确片段可能在窗口内后移，而重排模型决定窗口内顺序。不过平均值不变不能证明这一点：某个查询的标准块可能掉出前 5，另一个查询恰好补进一个。逐查询排名记录能区分重排变化和检索损失。

### 完整诊断表

| 现象 | 可能原因 | 修正对象 |
|---|---|---|
| recall@k、precision@k 都低 | 分块器切断了答案，或检索器找不到答案 | 分块边界或检索方式 |
| recall@k 尚可、MRR 低 | 正确片段在前 k 个中，却不在首位 | 重排模型 |
| MRR 高、忠实度低 | 上下文正确，生成器仍编造 | 生成 prompt，强制引用或拒答 |
| 忠实度高、相关性低 | 答案有依据却偏题 | 查询改写器或 prompt |
| 四项都高、用户仍投诉 | 评估集不具代表性 | 向 qrels 添加真实用户查询 |

### 确认，不猜测

每次 CI 运行都持久保存逐查询指标记录。问题就从“哪个数下降”变成“哪些查询下降，降到第几名”。按查询类别切片。只有某类查询（例如包含字面符号的查询）下降，与所有类别都下降，指向的改动不同。

## Follow-ups

- **Level 3:** 记录显示，只有字面标识符查询的标准片段排在第 3 名，说明什么？ Expected: 某项变化损害了这类查询在候选池中的词法信号；应按类别排查，不能用平均值掩盖。
- **Level 3:** 哪些发布变化会让 MRR 改变而 recall@5 不变？ Expected: 重排模型的新权重、缩小的候选池，或文本对中的查询与文档顺序颠倒。
- **Level 4:** recall 和 MRR 正常，忠实度也下降了，应查哪里？ Expected: 生成 prompt，以及 judge 本身，因为同一模型家族的 judge 给自家输出打分偏宽；人工抽样评分。
- **Level 4:** 为什么保存逐查询记录，而不只留平均值？ Expected: 90% 的平均值会掩盖始终失败的类别；用户投诉时还可找到对应 qrel，判断评估是否原本能发现它。

## Wrong answers

- "检索器回退了。" 检索器没改且 recall@5 不变；但平均值仍可能掩盖个别查询丢失标准块，应先看逐查询排名记录再归因。
- "模型开始出现幻觉。" 忠实度未变，生成器仍忠于收到的内容。
- "再跑一次，可能是噪声。" 这个评估离线运行，在固定测试数据上结果确定；其他指标不变而一个下降，指向某个具体阶段。

## Taught in

[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程定义 MRR 并给出症状诊断表。
