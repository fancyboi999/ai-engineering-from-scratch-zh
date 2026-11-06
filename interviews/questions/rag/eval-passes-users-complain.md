---
id: eval-passes-users-complain
title: 每项指标都高，某个业务单元仍拿到错误答案
card: rag
kind: design
level: 4
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [rag-eval, qrels, drift, golden-set, slicing]
minutes: 15
lessons: [phases/19-capstone-projects/68-rag-eval-precision-recall, phases/19-capstone-projects/08-production-rag-chatbot, phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag]
manuals: []
practice: []
cheatsheet: [llm-evaluation, rag-production]
related: [rag/diagnose-from-the-metric-table, rag/take-home-stratified-eval]
updated: 2026-11-03
---

RAG 评估显示召回率、MRR、忠实度和答案相关性都高，每周漂移看板也很平稳。客服却不断转来同一个业务单元的错误答案。作为负责这套系统的资深工程师，你得出什么结论？评估体系本身要改什么？

## Short answer

结论是评估集代表不了该单元的流量：在没人会问的查询上，四项指标完全可能都高。把他们的真实查询加入 qrels，按查询类别和文档类型切分所有指标，并检查他们的文档是否用了适合其格式的切分器。然后改评估体系：qrels 分层，定期复审以免过期，任何切片下降都阻断发布。

## Full answer

### 诊断表中的对应行

评估课程诊断表最后一行正是这种情况：四项都高、用户仍投诉，可能原因是评估集不具代表性，修法是用真实用户查询扩充 qrels。每周追踪同一集合的看板也会因此保持平稳。

### 平均值如何掩盖问题

90% 的平均召回率可能掩盖某类查询始终失败。课程要求按字面、改写、多主题等类别切分 qrels，分别报告。分块课程补上另一个维度：按查询类型分层的集合，因为多跳查询和事实型查询选出的最优方案不同。

### 改变评估机制

1. **加入该单元真实查询。** 由领域专家标注标准 ID 和答案，做法与生产综合项目构建 200 对带引用的标准集相同。
2. **为每个 qrel 标注查询类别和文档类型，** 所有指标按切片报告。
3. **每次运行保存逐查询记录，** 投诉来了就能查到对应的 qrel，判断评估本来能否发现它。
4. **定期复审 qrels。** 标准答案会随语料变化，课程安排每季度复审。
5. **在 qrels 头部锁定分块器，** 并检查生产中的切分器是否适合该单元的文档格式。
6. **集合分层：** CI 20 条、每晚 200 条、每周 2000 条，单切片下降阻断发布。

### 看板本应显示什么

综合项目的漂移看板每周追踪检索质量，下降 5% 就告警。它只能对已包含的流量告警。该单元查询进入集合后，同一告警才对他们有意义。

## Follow-ups

- **Level 3:** 为什么每个指标高，答案却错？ Expected: 指标只计算评估集，该集缺少实际发生故障的查询和文档。
- **Level 4:** 对 qrels 首个具体改动是什么？ Expected: 加入该单元真实查询，由专家标注标准 ID 与答案，并标注查询类别和文档类型供切片。
- **Level 4:** 如何长期保持 qrels 可信？ Expected: 定期复审，课程为每季度，因为标准答案随语料变化；同时检查 qrels 头部的分块器就是生产中用的那个。
- **Level 4:** 质量下降，看板为何不变？ Expected: 每周都追踪同一不具代表性的集合；告警无法说明未覆盖流量的情况。

## Wrong answers

- "指标高，投诉是用户使用错误。" 指标评的是评估集，而非真实流量；投诉正是缺失的数据。
- "提高阈值。" 对错误查询设更严阈值，仍是在测错误对象。
- "换更大的公开基准。" 公开集合里没有该单元的任何内容；修法是加入他们经过标注的真实查询。

## Taught in

[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程指出评估集缺乏代表性，并讲了按切片报告、qrels 过期与分层，综合项目[生产 RAG](../../../phases/19-capstone-projects/08-production-rag-chatbot/)规定标准集和漂移告警，[分块策略](../../../phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/)课程按类型对查询分层。
