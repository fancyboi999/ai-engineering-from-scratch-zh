---
id: design-rag-over-company-docs
title: 设计企业内部文档问答服务
card: rag
kind: design
level: 3
roles: [applied-ai-engineer, forward-deployed-ai-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design]
tags: [rag, system-design, hybrid-search, access-control, evaluation]
minutes: 30
lessons: [phases/11-llm-engineering/06-rag, phases/11-llm-engineering/07-advanced-rag, phases/19-capstone-projects/69-end-to-end-rag-system, phases/19-capstone-projects/08-production-rag-chatbot, phases/19-capstone-projects/68-rag-eval-precision-recall]
manuals: []
practice: []
cheatsheet: [rag, rag-production]
related: [rag/filter-before-search, rag/refuse-when-confidence-is-low, rag/take-home-stratified-eval]
updated: 2026-11-03
---

为企业内部文档设计问答服务：包含知识库、政策、合同和客服文章，共几十万页，每周更新。员工有不同访问权限。讲清流水线、评估，以及上线后你最先测量的三件事。

## Short answer

分摄取与查询两侧构建。摄取侧解析每篇文档，按文档用结构感知切分器分块，生成嵌入，同时建立稠密向量与 BM25 索引，每个块携带元数据和访问标签。查询侧先按权限过滤，再混合检索、融合排名，用交叉编码器重排候选，生成带引用且可拒答的答案。用领域专家标注的标准集和按查询类别报告 recall@k 的检索评估验证，再每周测检索质量、逐轮测忠实度与引用正确率，并测生产查询成本。

## Full answer

### 先明确要求

- **时效。** 每周更新意味着重新索引变更文档，而非重新训练模型。
- **访问。** 不同权限需要逐块标签与检索前过滤。
- **审计。** 答案必须指向来源片段。
- **规模。** 几十万页放不进 prompt，检索决定模型能看到什么。

### 摄取

1. 将每篇文档解析为文本与结构。
2. 按文档分块。先用 512-token 递归切分、零重叠；Markdown 用标题切分器；所有块设大小上下限，绝不跨文档。
3. 附加元数据：来源、日期、版本、类别、作者、岗位标签、司法管辖区或业务单元标签。
4. 为每块生成嵌入，把向量连同载荷一起写入。旁边再建一个带字段权重的 BM25 索引，让标题或代码命中比正文命中分量更重。

### 查询

1. 搜索前按调用者岗位标签过滤候选空间。
2. 并行运行稠密检索和 BM25，按排名融合。
3. 取前 20 个送交叉编码器，保留前 5 个，这是生产综合项目用的漏斗。
4. prompt 先放稳定内容：系统 prompt、静态政策，再放重排上下文，最后放问题。综合项目目标是前缀缓存命中率 60 到 80%，每次查询成本降低 3 到 5 倍。
5. 生成时要求每条论断都带引用，片段答不了就拒答；生成前用重排模型第 1 名的分数设门槛，生成后删除没有引用的论断。

### 上线前评估

- 按综合项目要求，由领域专家标注 200 对问答及引用作为标准集。
- qrels 分层：CI 运行 20 条冒烟查询，每晚 200 条回归查询，每周 2000 条深度查询。
- 按查询类别评估检索：先 recall@k，再 MRR，有分级相关性标签时加 nDCG。
- 答案指标为忠实度与相关性，由另一模型家族的 judge 评分。
- 用 50 个对抗 prompt 做红队：越狱、数据提取、域外问题和跨业务单元泄漏。

### 首先测量的三项生产指标

1. **每周在标准集上测检索质量。** 综合项目在下降 5% 时告警，按文档类型与业务单元切片。
2. **逐轮测忠实度和引用正确率。** 检索正常时，仍可发现生成器编造或引用错误。
3. **按阶段测每次查询成本与延迟。** 包括缓存命中率、token 数，以及检索与生成耗时；课程范围分别为 50 到 200 ms、500 到 3000 ms。

## Follow-ups

- **Level 3:** 访问控制放在哪里？ Expected: 放在检索过滤器，文本块岗位标签在相似度搜索前应用，绝不能依赖 prompt 文本。
- **Level 3:** 周二文档变化，什么会过期，持续多久？ Expected: 对应块在下次重建索引前过期；只重新嵌入变更文档，在元数据保存版本，并监控源更新到索引更新的间隔。
- **Level 4:** 这种流量下如何控制模型成本？ Expected: 使用利于缓存的 prompt 顺序，系统 prompt 与政策在前、重排上下文其次、问题最后；综合项目目标命中率 60 到 80%，成本降低 3 到 5 倍。
- **Level 4:** 标准集通过，但某部门仍反馈答案差，怎么办？ Expected: 把评估按文档类型和查询类别切片，把该部门的真实查询加入 qrels，并检查他们的文档是否用了适合其格式的切分器。

## Wrong answers

- "所有文档放进一个长 prompt。" 几十万页放不下；课程把每次查询的检索文本预算定在 2,500 到 5,000 个 token，是有原因的。
- "每周用文档微调。" 它给不出引用，两次训练之间会过期，也无法强制执行访问权限。
- "只用向量搜索足够。" 精确标识符、错误码和名称需要词法侧，应并行运行并融合。
- "不建标注集直接上线，演示效果不错。" 十篇文档的演示说明不了几十万页的情况；先标注标准集。

## Taught in

[RAG](../../../phases/11-llm-engineering/06-rag/)课程构建两个阶段，[进阶 RAG](../../../phases/11-llm-engineering/07-advanced-rag/)课程加入混合检索、重排和元数据过滤，[端到端 RAG](../../../phases/19-capstone-projects/69-end-to-end-rag-system/)课程把各阶段与带引用的生成器组合起来，综合项目[生产 RAG](../../../phases/19-capstone-projects/08-production-rag-chatbot/)规定标准集、红队和缓存目标，[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程对 qrels 分层。
