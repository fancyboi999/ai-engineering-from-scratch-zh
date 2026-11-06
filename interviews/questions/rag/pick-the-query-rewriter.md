---
id: pick-the-query-rewriter
title: 双主题问题该用哪种查询改写
card: rag
kind: tradeoff
level: 2
roles: [applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [ml-depth, system-design]
tags: [query-rewriting, hyde, multi-query, decomposition]
minutes: 9
lessons: [phases/19-capstone-projects/67-query-rewriting-hyde, phases/11-llm-engineering/07-advanced-rag]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/hyde-invents-a-symbol]
updated: 2026-11-03
---

流水线提供三种查询改写：生成假设答案并用它搜索；生成多个同义表达后融合；拆成子问题后融合。用户问“上传失败而且预算用完时，我们团队应该怎么做？”哪种适合？另外两种分别适合什么情况？

## Short answer

拆成子问题，因为问题用连接词组合了上传失败和预算耗尽两个主题，没有单个文本块同时包含两者。假设答案适用于术语很多、措辞与语料词汇不匹配的问题。同义改写适合可以用多种同样合理的方式表达的简短问题。

## Full answer

### 三种方法比较

| 改写器 | 行为 | 适用条件 | 失败条件 |
|---|---|---|---|
| 假设答案 | 模型用语料风格写一个片段，以其嵌入替代查询向量 | 查询与语料用词不同 | 模型编造索引中不存在的标识符 |
| 同义改写 | 模型生成 N 个改写，分别检索，再按排名融合 | 多种表达都可能比原问题更好 | 改写趋同，融合等于一次检索 |
| 子问题 | 模型拆分问题，分别检索后融合 | 问题包含连接词或两个无关主题 | 原子问题被强行拆分 |

### 成本

每种改写都在检索前增加一次模型调用。进阶 RAG 课程给出的假设答案额外延迟为 500 到 2000 ms。调用后的各次检索可以并行，因此模型调用决定最低延迟。按查询哈希缓存改写结果，因为很多查询会重复。

### 保护措施

- 将假设答案限制为两三句；过长会引入噪声，过短则丢失词法信号。
- 在同义改写 prompt 中明确要求多样性，按 Jaccard 重叠删除近似重复项。
- 并行分发前检查子问题是否不同，让原子问题保持原样。

### 按查询选择

端到端课程根据查询长度、连接词和术语比例启发式选择策略。另一种选择是三种策略并行，再融合三组结果，代价为三次模型调用与一次融合。

## Follow-ups

- **Level 2:** 改写增加多少延迟？ Expected: 检索前一次模型调用；进阶 RAG 中假设答案为 500 到 2000 ms，之后各检索并行。
- **Level 2:** 同义改写几乎相同会怎样，如何修正？ Expected: 融合结果等于一次检索；增加多样性指令，并按 Jaccard 重叠去重。
- **Level 3:** 原子问题被拆成三部分，有什么损害与保护措施？ Expected: 相同文档以更低排名返回三次，融合反而更差；分发前检查各部分是否不同。
- **Level 3:** 端到端系统如何自动选择？ Expected: 按长度、连接词和术语比例启发式选择，或三种都运行后融合。

## Wrong answers

- "总用假设答案，它最强。" 它弥合词汇差距，对双主题问题没有直接帮助；编造标识符还会损害词法检索。
- "查询改写能修复弱检索器。" 它只是让查询更接近语料表达；分块器若切断答案，仍会失败。
- "每个查询都拆成子问题。" 原子问题会被过度拆分，结果比原查询更差。

## Taught in

[查询改写](../../../phases/19-capstone-projects/67-query-rewriting-hyde/)课程构建三种改写器及其失败模式，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程说明延迟成本。
