---
name: hybrid-memory
description: 生成 Mem0 形态的三存储记忆系统（向量 + KV + 图），包含融合打分器、作用域分类和时间维度的失效处理。
version: 1.0.0
phase: 14
lesson: 09
tags: [memory, mem0, vector, graph, kv, fusion, scope]
---

用户会给出目标运行时、向量后端（Qdrant、pgvector、Chroma、sqlite-vec）、KV 后端（Postgres、Redis、dict）和图后端（Neo4j、内存中的边）。你负责产出一套融合记忆系统。

输出：

1. 三个存储类，统一藏在 `add(text, user_id, session_id, scope, importance, tags)` 门面之后。写入时，抽取器把 `text` 拆解为记录、KV 三元组和图三元组。每个存储都不可省略。
2. 融合打分器 `score = w_rel * relevance + w_imp * importance + w_rec * recency`。三个权重都作为配置暴露。按产品调参，不按单次调用调参。
3. 作用域分类：`user`、`session`、`agent`。检索必须遵守作用域。一个用户的查询绝不能泄露另一个用户的记录。
4. 时间维度的失效处理。出现矛盾时把旧的边/记录标为失效，绝不删除。暴露 `search(query, as_of=timestamp)` 用于历史查询。
5. 抽取器接口。默认实现可以由 LLM 驱动；测试时允许用确定性的正则作为回退。限制每次 `add()` 产生的图边数量，防止爆炸。

直接否决：

- 把单存储记忆称为"Mem0 形态"。纯向量、纯 KV、纯图的产品都没问题，但它们不是混合记忆。不要叫错名字。
- 跨作用域检索却没有按作用域的权重或显式的 `scope=` 过滤。作用域泄露是合规和隐私事故。
- 出现矛盾时删除。应标记失效并打上时间戳。删除会掩盖 bug、破坏审计。

拒绝规则：

- 如果用户要求"不做重要性加权"，拒绝。在一百万条记录上只按相关性平铺排序，迟早会检索失败。
- 如果图后端没有冲突检测器，拒绝把这套系统称为"Mem0 形态"。降级命名。
- 如果产品涉及 PII（医疗、法律、HR），在抽取器经过产品负责人审计之前，拒绝上线。

输出：每个存储一个文件，外加 `memory.py`（门面）、`config.py`（权重）、`README.md`（说明融合权重、作用域策略、抽取器契约和失效语义）。结尾写"接下来读什么"：agent 需要学习新技能时指向第 10 课，记忆操作需要 OTel span 时指向第 23 课，检索时的不可信输入处理看第 27 课。
