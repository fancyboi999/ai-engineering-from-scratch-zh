# 混合记忆：向量 + 图 + KV

> 混合记忆并行运行三个存储：向量做语义相似、KV 做快速事实查找、图做实体关系推理，再由打分层在检索时融合三者。这是外部记忆中广泛使用的生产模式；Mem0（Chhikara 等人，2025）是其中一个参考实现。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 07（MemGPT）、阶段 14 · 08（Letta 块）
**预计时间：** ~75 分钟

## 学习目标

- 解释为什么单一存储（只用向量、只用图、只用 KV）对 agent 记忆来说不够。
- 说出 Mem0 的三个并行存储，以及每个为什么而优化。
- 描述 Mem0 的融合打分 —— 相关性、重要性、新鲜度 —— 以及为什么它是加权和，而不是层级。
- 用标准库实现一个玩具三存储记忆，`add()` 写进全部三个，`search()` 融合结果。

## 问题背景

对三类查询里的某一类来说，单一存储是错的：

- **语义相似** —— 「上周我们讨论 agent 漂移时说了啥？」向量赢；KV 和图错过。
- **事实查找** —— 「用户的电话号码是多少？」KV 赢；向量浪费，图大材小用。
- **关系推理** —— 「哪些客户共用同一个计费实体？」图赢；向量和 KV 答不了。

生产 agent 在一个会话里这三类都会发出来。单一存储记忆对其中两类总是错的。Mem0 的贡献是把三者都接在一个 `add`/`search` 接触面后面，用一个把它们融合起来的打分函数。

## 核心概念

### 三个并行存储

Mem0（arXiv:2504.19413，2025 年 4 月）在 `add(text, user_id, metadata)` 上：

1. 从文本里抽取候选事实（一个 LLM 驱动的步骤）。
2. 把每个事实写进向量存储（embedding）供语义搜索。
3. 把每个事实写进 KV 存储，键为 (user_id, fact_type, entity)，供 O(1) 查找。
4. 把每个事实作为带类型的边写进图存储（Mem0g），供关系查询。

在 `search(query, user_id)` 上：

1. 向量存储按 embedding 余弦返回 top-k。
2. KV 存储返回按查询导出的 (user_id, type, entity) 命中的直接结果。
3. 图存储返回从查询实体可达的子图。
4. 一个打分层融合三者。

### 融合打分

```
score = w_relevance * relevance(q, record)
      + w_importance * importance(record)
      + w_recency * recency(record)
```

- **相关性** —— 向量余弦、KV 精确匹配、图路径权重。
- **重要性** —— 写入时打标或学习得到（有些事实更重要：名字、ID、政策）。
- **新鲜度** —— 自上次写入或读取以来按时间指数衰减。

权重按产品调。聊天 agent 调高 `w_recency`；合规 agent 调高 `w_importance`；检索 agent 调高 `w_relevance`。

### Mem0g 与时序推理

Mem0g 加了一个冲突检测器。当一个新事实与现有边矛盾时，现有边被标记为无效但不删除。时序查询（「用户三月份在哪个城市？」）遍历「在该时间有效」的子图。

这是 Letta 的失效模式所一般化的合规级行为。

### 基准数字

Mem0 论文报告（2025）：

- **LoCoMo**（长篇对话记忆）：91.6
- **LongMemEval**（长跨度情景记忆）：93.4
- **BEAM 1M**（1M-token 记忆基准）：64.1

对比基线（全上下文 128k LLM、扁平向量存储、扁平 KV）都落后 10+ 分。光靠基准不能定选型 —— 运维形态才行 —— 但这些数字表明融合设计不是个舍入误差。

### 范围分类

Mem0 按范围拆分记忆：

- **User memory** —— 跨会话持久，键为 `user_id`。
- **Session memory** —— 在一个 thread 内持久。
- **Agent memory** —— 每个 agent 实例的状态。

每次写入挑一个范围。检索可以跨范围查询，每个范围有自己的权重。不加思考地混用范围，就是你会碰上「助手把 Bob 的项目告诉了 Alice」这类事故的原因。

### 这个模式在哪里会出错

- **embedding 漂移。** 前一百次查询看着对的向量结果，会随语料增长而退化。加上对使用最频繁的 top-N 记录的周期性重嵌入。
- **KV schema 蔓延。** `(user_id, type, entity)` 看着简单，直到每个团队都加上自己的 `type`。每季度审计一次 type 集合。
- **图爆炸。** 一个有噪声的抽取器每条消息加 50 条边。给每次 `add` 调用的图写入封顶；丢掉低置信度的边。

```figure
ae-memory-fusion
```

## 动手构建

`code/main.py` 用标准库实现三存储模式：

- `VectorStore` —— 用朴素的 token 重叠相似度顶替 embedding。
- `KVStore` —— 键为 `(user_id, fact_type, entity)` 的字典。
- `GraphStore` —— 带类型的边（subject, relation, object, valid）。
- `Mem0` —— 顶层门面，带 `add()`、`search()`、融合打分和范围感知检索。
- 在一段多用户、多会话对话上的一条完整轨迹。

运行它：

```
python3 code/main.py
```

输出展示三条独立的召回路径，外加融合后的 top-k。在 `main()` 顶部翻转打分权重，看排名变化。

## 实际使用

- **Mem0（Apache 2.0）** —— 生产就绪。用 Postgres + Qdrant + Neo4j 自托管，或用托管云。
- **Letta** —— 三层 core/recall/archival；自带向量和图后端。
- **Zep** —— 商业替代品，带时序 KG 和事实抽取。
- **自定义构建** —— 当你需要对抽取器（合规）或融合权重（新鲜度主导的语音 agent）做精确控制时。

## 拿去用

`outputs/skill-hybrid-memory.md` 生成一个三存储记忆脚手架，融合打分器、范围分类和时序失效都接好。

## 练习

1. 把玩具向量相似度换成一个真实的 embedding 模型（sentence-transformers、Ollama、OpenAI embeddings）。在一段合成的长对话上度量 recall@10。排名在 1000 次写入后会漂移吗？
2. 加一个时序查询：`search(query, as_of=timestamp)`。只返回在那个时间或之前有效的记录。哪个存储要改最多？
3. 实现一个冲突检测器：如果一个进来的事实与某条图边矛盾，失效旧边并把两者都记录下来。在「用户住柏林」-> 「用户住里斯本」上测试。
4. 把融合打分器移植成包含一个 `user_feedback` 维度（对检索到的记录点赞）。你怎么防止刷分（agent 只返回它已经喜欢的记录）？
5. 读 Mem0 文档（`docs.mem0.ai`）。把玩具移植到 `mem0` 客户端调用。在同样的 20 个测试查询上对比检索质量。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Hybrid memory | 「向量加图加 KV」 | 三个存储并行写入，检索时融合 |
| Fact extraction | 「记忆摄入」 | 把文本拆成 (entity, relation, fact) 三元组的 LLM 步骤 |
| Fusion scoring | 「相关性排名」 | 相关性、重要性、新鲜度的加权和 |
| Scope | 「记忆命名空间」 | user / session / agent —— 决定谁看到什么 |
| Mem0g | 「记忆图」 | 带时序有效性、用于关系查询的带类型边 |
| Temporal invalidation | 「软删除」 | 把被推翻的边标记为无效；绝不删除 |
| Embedding drift | 「检索腐烂」 | 向量质量随语料增长退化；周期性重嵌入 |

## 延伸阅读

- [Chhikara et al., Mem0 (arXiv:2504.19413)](https://arxiv.org/abs/2504.19413) —— 原论文
- [Mem0 docs](https://docs.mem0.ai/platform/overview) —— 生产 API、SDK、托管云
- [Packer et al., MemGPT (arXiv:2310.08560)](https://arxiv.org/abs/2310.08560) —— 虚拟上下文的前身
- [Letta, Memory Blocks blog](https://www.letta.com/blog/memory-blocks) —— 三层的兄弟设计
