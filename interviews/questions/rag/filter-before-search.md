---
id: filter-before-search
title: 在向量搜索前按元数据过滤
card: rag
kind: design
level: 2
roles: [applied-ai-engineer, forward-deployed-ai-engineer, ai-data-engineer]
rounds: [system-design, design-review]
tags: [metadata-filtering, access-control, hybrid-search, pre-filter]
minutes: 8
lessons: [phases/11-llm-engineering/07-advanced-rag, phases/19-capstone-projects/08-production-rag-chatbot]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/jurisdiction-leak-in-shared-index, rag/design-rag-over-company-docs]
updated: 2026-11-03
---

问题问的是上个月安全政策的变化，向量搜索却因语义相近返回两年前的安全文档。设计检索步骤，避免这种情况，并说明同一机制对受监管部署还有什么帮助。

## Short answer

每个文本块都保存来源、创建日期、类别、作者和版本等元数据，在相似度搜索之前过滤。本题应限定安全类别和最近 30 天，让旧文档无法进入候选集。在受监管场景中，同一个预过滤器还带上岗位标签和司法管辖区标签，用户只能检索到自己有权查看的文本块。

## Full answer

### 先过滤，再检索

取前 k 个结果后再过滤，可能一个结果都不剩：若前 k 个位置全由旧文档占据，正确文档就从未有机会入选。搜索前过滤会缩小相似度搜索空间；进阶 RAG 课程指出，这对大规模性能至关重要，也能防止排除在外的文档占用候选名额。向量数据库以元数据预过滤的形式支持这一点。

### 保存哪些字段

| 字段 | 用途 |
|---|---|
| 来源文档 | 引用和按文档去重 |
| 创建日期与版本 | 时间窗口与过期文档控制 |
| 类别 | 限定安全、计费等范围 |
| 作者 | 来源追溯 |
| 岗位标签 | 确定谁能看到文本块 |
| 司法管辖区标签 | 确定文本块所属监管范围 |

### 受监管流水线

生产综合项目按以下顺序处理查询：先按岗位与司法管辖区过滤，再并行执行稠密检索与 BM25，随后融合排名，将前 20 个结果送入重排模型，前 5 个送入生成器。标签在摄取阶段随文本块摘要生成，下游无需猜测。

### 如何证明有效

没测试过的访问控制只是一厢情愿。综合项目在发布前执行包含跨司法管辖区泄漏探测的红队测试；练习另建一个属于其他司法管辖区的语料切片，运行 20 个跨区问题，以通过或失败评分。

## Follow-ups

- **Level 2:** 为什么搜索前过滤，而不是搜索后？ Expected: 可以缩小搜索空间，改善大规模性能，而且排除在外的文档永远不能占用前 k 个位置。
- **Level 2:** 每个文本块应保存哪些字段？ Expected: 来源、日期、类别、作者、版本；受监管场景还需岗位和司法管辖区标签。
- **Level 3:** 如何测试岗位过滤有效？ Expected: 使用跨司法管辖区问题探测集；综合项目以 20 个问题检查，并按通过或失败评分。
- **Level 3:** 过滤相对于重排模型和生成器处于什么位置？ Expected: 在检索之前；综合项目先过滤，再混合检索，随后重排模型接收前 20 个，生成器接收前 5 个。

## Wrong answers

- "把日期写进查询，让嵌入反映时间。" 嵌入无法强制日期约束；语义接近的旧文档仍会得高分。
- "取得前 k 个结果后再过滤。" 如果全部是旧文档，过滤后将为空，正确文档从未有机会入选。
- "告诉模型不要使用其他司法管辖区的文档。" 访问控制应在检索阶段完成，在文本进入 prompt 之前实施。

## Taught in

[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程说明元数据预过滤，[生产 RAG](../../../phases/19-capstone-projects/08-production-rag-chatbot/)综合项目在检索前应用访问过滤，并用红队测试验证。
