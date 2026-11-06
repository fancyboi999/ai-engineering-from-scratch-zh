---
id: fusion-weights-per-product
title: 为三款产品调整三种存储的记忆融合权重
card: prompting-structured-output
kind: design
level: 4
roles: [agentic-ai-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design]
tags: [agent-memory, hybrid-memory, fusion-scoring, scope]
minutes: 15
lessons: [phases/14-agent-engineering/09-hybrid-memory-mem0, phases/14-agent-engineering/07-memory-virtual-context-memgpt]
manuals: []
practice: []
cheatsheet: [context-engineering]
related: [prompting-structured-output/take-home-two-tier-memory, prompting-structured-output/sleep-time-consolidation]
updated: 2026-11-03
---

你负责同一平台上三款产品的记忆层：面向消费者的聊天助手、合规审查 agent 和研究检索 agent。记忆系统并行运行向量存储、键值存储和图存储，再融合它们的结果。你怎样为每款产品配置融合？哪一种作用域错误会触发告警，需要你处理？

## Short answer

融合得分是相关性、重要性和时效性的加权和，权重按产品调：聊天助手调高时效性，合规 agent 调高重要性，检索 agent 调高相关性。每种存储都擅长处理另外两种会漏掉的一类查询，因此权重决定哪类查询占主导，而不是去掉某种存储。会让你被叫醒的错误是作用域泄漏：每次写入都要选定用户、会话或 agent 作用域，检索如果混用多个作用域却不按作用域加权，就会把一个用户的项目告诉另一个用户。

## Full answer

### 为什么要三个存储

| 查询类别 | 示例 | 胜出者 |
|---|---|---|
| 语义相似度 | 上周我们关于漂移讨论了什么 | 向量存储 |
| 事实查找 | 用户的电话号码 | 键值存储，键由用户、事实类型和实体组成 |
| 关系推理 | 哪些客户共用同一个计费主体 | 图存储，用带类型的边表示 |

单一存储对三类查询中的两类都不合适。写入时从文本中抽取事实，每条事实写入全部三个存储；搜索时三个存储都查，再融合结果。

### 融合

得分是 `w_relevance * relevance + w_importance * importance + w_recency * recency`。相关性是余弦相似度、键的精确匹配或图路径权重。重要性在写入时标注，或者学习得到。时效性随距最后一次读写的时间衰减。它是加权和而不是层级，因为层级会让三类查询中的两类去等错误的存储。

| 产品 | 调高的权重 | 原因 |
|---|---|---|
| 聊天助手 | 时效性 | 最近几轮对话最重要 |
| 合规 agent | 重要性 | 姓名、ID 和政策比闲聊重要 |
| 检索 agent | 相关性 | 由问题决定，不由时间决定 |

### 合规所需的历史事实

新事实与图中某条边矛盾时，旧边被标记为失效，永不删除。问「三月时什么是真的」，就遍历当时有效的边。合规 agent 依赖这一点。

### 作用域规则

每次写入选定一个作用域：用户记忆跨会话保留，会话记忆只在一个线程内，agent 记忆按实例划分。检索可以按作用域分配权重来跨作用域读取，但不加思考地混在一起搜索，就是助手把一个用户的项目告诉另一个用户的原因。

### 随语料增长的维护

- 语料增长后向量结果会漂移；按计划对最常用的记录重新做嵌入。
- 各团队不断加类型，键值类型集合会慢慢膨胀；每季度审计一次。
- 嘈杂的抽取器每条消息会加几十条边；限制每次添加的图写入数量，丢弃低置信度的边。

## Follow-ups

- **Level 3:** 每个存储分别赢下哪类查询？ Expected: 向量存储负责语义相似度，键值存储负责事实查找，图存储负责关系推理。
- **Level 4:** 为什么用加权和，而不是向量优先、再逐级回退？ Expected: 每个存储赢下的查询类别不同；层级结构会让三类中的两类去等错误的存储。
- **Level 4:** 合规 agent 问三月时什么是真的。哪个存储回答，怎么回答？ Expected: 图存储，遍历当时有效的边；被新事实推翻的边标记为失效并保留。
- **Level 4:** 哪种失败会随语料增长，怎么维护？ Expected: 向量存储里的嵌入漂移；定期对最常用的记录重新做嵌入，每季度审计键值类型集合，并限制每次添加的图写入数量。

## Wrong answers

- "一个向量存储就够了，嵌入能捕获一切。" 在向量存储上做事实查找很浪费，做关系查询则根本做不到。
- "整个平台设一次权重就好。" 聊天要时效性，合规要重要性，检索要相关性；一套设置对三者中的两个都是错的。
- "新事实与旧事实矛盾时，删掉旧事实。" 应标记为失效并保留，否则按时间点的查询就丢了历史。

## Taught in

[混合记忆](../../../phases/14-agent-engineering/09-hybrid-memory-mem0/)一课给出了三个存储、融合公式、作用域分类和维护清单，[虚拟上下文](../../../phases/14-agent-engineering/07-memory-virtual-context-memgpt/)一课把这种模式放进各类记忆类型中定位。
