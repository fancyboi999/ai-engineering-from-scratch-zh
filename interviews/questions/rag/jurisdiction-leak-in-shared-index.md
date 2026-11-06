---
id: jurisdiction-leak-in-shared-index
title: 另一司法管辖区的条款进入了答案
card: rag
kind: design
level: 4
roles: [forward-deployed-ai-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, design-review]
tags: [access-control, jurisdiction, red-team, pre-filter]
minutes: 15
lessons: [phases/19-capstone-projects/08-production-rag-chatbot, phases/11-llm-engineering/07-advanced-rag]
manuals: []
practice: []
cheatsheet: [rag-production]
related: [rag/filter-before-search, rag/design-rag-over-company-docs]
updated: 2026-11-03
---

受监管领域助手用同一索引服务两个司法管辖区的分析师。一次红队探测中，按一个管辖区提出的问题返回了属于另一个管辖区的合同条款。重排模型和生成器行为均符合设计。泄漏在哪里，怎样封堵，如何证明持续有效？

## Short answer

泄漏发生在检索：相似度搜索前没有应用司法管辖区预过滤，语义接近的另一区文本块因此进入候选池，下游没有哪个阶段是为删除它而设计的。摄取时为每块标注岗位与司法管辖区，在混合检索前同时过滤两者。把跨区探测集放进每次发布前的红队套件，按通过或失败及严重度评分，证明隔离有效。

## Full answer

### 下游为什么救不了

重排模型按相关性排列收到的候选，泄漏条款确实相关。生成器引用给到它的内容。输出保护器清除个人数据、拦截禁止话题，却不知道条款属于哪个司法管辖区。访问控制必须在文本进入 prompt 前完成，而唯一能看到整个语料的阶段是检索。

### 综合项目的处理顺序

先按岗位和司法管辖区过滤，再并行执行稠密和 BM25 检索、按排名融合、前 20 个送重排模型、前 5 个送生成器，然后经过保护器、带引用返回。标签来自摄取阶段，每块获得摘要、岗位标签和司法管辖区标签。

### 封堵步骤

1. 摄取时标注，没有标签的块拒绝接收。
2. 检索前过滤，不能先取 top k 再过滤；后过滤可能使结果为空，且仍可能放过无标签块。
3. 将调用者司法管辖区作为请求参数处理，绝不能只当作 prompt 提示。

### 证明有效

综合项目发布前运行 50 个对抗 prompt 的红队，包含跨区泄漏探测，按通过或失败及严重度评分。练习再加入另一区语料切片，运行 20 个跨区问题。将探测纳入每次摄取或检索变更的发布门槛，漂移看板上的泄漏数必须严格为零。

## Follow-ups

- **Level 3:** 重排模型为什么抓不住泄漏条款？ Expected: 它只排列收到的候选，错误管辖区的条款仍与问题相关。
- **Level 3:** 为什么输出保护器不是修复位置？ Expected: 它清除个人信息、拦截禁止话题，无法判断条款属于哪个管辖区。
- **Level 4:** 标签已有却仍泄漏，查什么？ Expected: 过滤是在检索前还是 top k 之后，以及摄取是否允许无标签块进入。
- **Level 4:** 如何让验证证据持续有效？ Expected: 每次摄取或检索变更都运行红队探测，在漂移看板显示泄漏数，阈值设为零。

## Wrong answers

- "在系统 prompt 增加用户管辖区说明。" 模型不能验证文本块属于哪个管辖区；访问控制应在检索中实施。
- "拆成独立索引就解决，不再需要标签。" 岗位过滤仍需标签，共享文档会重复，且仍需探测证明拆分有效。
- "红队通过一次，就封堵完成。" 一次通过只证明一个构建，每次摄取或检索变化都要重跑。

## Taught in

[生产 RAG](../../../phases/19-capstone-projects/08-production-rag-chatbot/)综合项目在检索前应用访问过滤并用红队探测，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程说明元数据预过滤。
