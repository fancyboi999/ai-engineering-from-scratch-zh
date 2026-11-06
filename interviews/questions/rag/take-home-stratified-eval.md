---
id: take-home-stratified-eval
title: 构建用来选定检索配置的评估
card: rag
kind: take-home
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [take-home]
tags: [rag-eval, qrels, recall, stratified, take-home]
minutes: 60
lessons: [phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag, phases/19-capstone-projects/68-rag-eval-precision-recall, phases/19-capstone-projects/64-chunking-strategies-advanced]
manuals: []
practice: []
cheatsheet: [llm-evaluation, rag]
related: [rag/chunk-size-by-query-type, rag/recall-at-k-first]
updated: 2026-11-03
---

带回家的作业题。你拿到几百篇内部文档组成的语料，以及一条检索流水线，两种分块器和两种检索器可用开关切换。构建评估，告诉团队该上线哪种配置，并写清这些数字说明什么。你有一个晚上。

## Short answer

先建立按查询类型分层的标注集，每条查询包含标准文档 ID 与标准答案文本。所有配置运行同一集合，按切片报告 recall@5、MRR，以及前 5 个块包含标准答案文本的查询比例，并比较配置差异。按文档标注使标签适用于不同分块器；若按块标注，必须在 qrels 记录分块器，分块器变化后重新标注。

## Full answer

### 交付物

1. **qrels 文件。** 每查询一条记录，含查询文本、标准文档 ID、分级相关性映射和标准答案子串。按文档而非块标注，才能跨分块器复用。
2. **分层集合。** 分块课程使用 50 条查询，覆盖事实、分析与多跳问题。多跳查询和事实型查询选出的最优方案不同，一个平均值会掩盖落败的类别。
3. **运行矩阵。** 两分块器乘两检索器，每格使用同一 qrels 与相同 k 值。
4. **指标。** 主指标 recall@5，旁列 precision@k、首个命中位置的 MRR，分级标签时加 nDCG；另测答案命中@5：只有前五块中某块含标准答案子串，该查询才算命中。两分块器都返回标准文档但只有一个返回答案所在块时，文档级召回无法区分。答案命中只测精确片段覆盖：多跳答案可能散在多块，即使前五块足够支持答案，也会未命中，因此须与召回率一起解读，不能当作完整检索分数。
5. **报告。** 每配置一行、每切片一列，随后给建议及理由，再说明下一步测什么。

### 预期现象

分块比较课程展示：结构化标题切分在 Markdown 上胜出，语义聚类在普通散文上胜出，递归切分在混合语料上不落下风；混合检索召回率超过词法基线。自己的语料决定这些现象是否成立。

### 阅卷人会看的防护措施

- qrels 头部记录标注层级，块级标准 ID 标明生成它的分块器。
- 重排模型训练对与评估查询不重叠。
- 保存逐查询结果，不只保存平均值。
- 报告写明这套评估判断不了什么：答案质量。答案质量要靠忠实度和相关性，由另一家族的模型 judge 或人工评定。

## Follow-ups

- **Level 3:** 为什么按查询类型切分？ Expected: 事实型查询和多跳查询选出的最优方案不同，一个平均值会掩盖落败的类别。
- **Level 3:** 分块器 A 生成的标签能否用于 B？ Expected: 只有文档级或片段跨度级标签可以；块 ID 随边界变化，否则须记录分块器并重标注。
- **Level 4:** 怎样说明查询数量的依据？ Expected: 首次决策用 50 条分层查询，之后 CI 20 条、每晚 200 条、每周 2000 条，并说明各层能与不能发现什么。
- **Level 4:** 一个晚上后拒绝得出什么结论？ Expected: 答案质量结论，因为这里评估检索；忠实度与相关性需要 judge，而与生成器同家族的 judge 有偏差。

## Wrong answers

- "我自己写了十个问题，每种配置都跑了一遍。" 同类十个问题无法区分四种配置，也不能揭示始终失败的类别。
- "这是每种配置的平均召回率。" 平均值掩盖各切片的最优配置和失败类别。
- "我换了分块器，沿用了块级标签。" 块 ID 已对不上新的块；应按文档标注，或者重新标注并在 qrels 头部记录分块器。

## Taught in

[分块策略](../../../phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/)课程设定 50 条查询的分层集合，[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程定义 qrels 和分层，[分块比较](../../../phases/19-capstone-projects/64-chunking-strategies-advanced/)课程展示哪种切分器在哪种语料上胜出。
