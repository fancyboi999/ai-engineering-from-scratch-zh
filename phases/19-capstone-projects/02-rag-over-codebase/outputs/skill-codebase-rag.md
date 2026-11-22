---
name: codebase-rag
description: 构建跨仓库的语义搜索系统，支持 AST 感知分块、混合检索、增量重建索引和带引用的回答。
version: 1.0.0
phase: 19
lesson: 02
tags: [capstone, rag, code-search, tree-sitter, qdrant, bm25, hybrid-retrieval]
---

给定 10 个以上、合计至少 2M 行代码的仓库，构建一条摄取流水线、一个混合索引，以及一个强制引用的查询 agent，用可验证的 file:line 锚点回答跨仓库问题。

构建计划：

1. 用 tree-sitter 解析每个文件。按函数和类节点边界分块。存储 `{repo, path, start_line, end_line, symbol, body}`。
2. 用 Claude Haiku 4.5 或 Gemini 2.5 Flash 为每个分块生成摘要，system prompt 走 prompt 缓存。把一句话摘要和分块存在一起。
3. 建立三种索引结构：Qdrant（稠密向量，Voyage-code-3 或 nomic-embed-code）、Tantivy（带字段权重的 BM25），以及 kuzu（import、调用、继承关系的符号图边）。
4. 用 LangGraph 构建查询 agent，包含三个节点：retrieve（稠密检索与 BM25 并行）、rerank（Cohere rerank-3 或 bge-reranker-v2-gemma-2b）、synth（Claude Sonnet 4.7，开启 prompt 缓存，强制 file:line 引用）。
5. 后置过滤：任何没有可验证 `(repo/path:start-end)` 锚点的论断都要拒掉；重新提问或直接丢弃。
6. 接入 git push webhook，计算符号级 diff，只对改动过的分块重新生成嵌入。目标：在 2M 行代码规模下，50 个文件的提交在 60 秒内可被搜到。
7. 用 100 道题的留出集评估。报告 MRR@10、nDCG@10、引用忠实度和延迟分位数。
8. 每周跑一次漂移任务，重新执行评估；MRR@10 下降超过 5% 时告警。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 检索质量 | 100 道题留出集上的 MRR@10 和 nDCG@10 |
| 20 | 引用忠实度 | 回答中带可验证 file:line 锚点的论断比例 |
| 20 | 延迟与规模 | 在已索引语料规模下，10k QPS 时的 p95 查询延迟 |
| 20 | 增量索引正确性 | 50 个文件的提交从 git push 到可被搜到的时间 |
| 15 | 体验与回答格式 | 引用可点击、代码片段预览、便于追问 |

直接否决：

- 用固定长度的 token 分块，而不是 AST 感知分块。这会污染生成代码占比高的语料。
- 只用余弦相似度检索，没有 BM25 或 rerank。已知在精确符号名查询上会失败。
- 回答没有强制的 file:line 引用。
- 每次 git push 都对全量语料重新生成嵌入；必须是增量的。

拒绝规则：

- 没读过仓库的许可证之前，拒绝建立索引。有些许可证禁止嵌入到第三方向量库。
- 如果回答声称引用了索引从未见过的文件，拒绝返回；返回前一律校验锚点。
- p95 超过 4 秒时拒绝给出完整回答；改为返回部分结果和一个后续追问的句柄。

输出：一个仓库，包含摄取流水线、LangGraph 查询 agent、100 道题的带标注评估集、一个 Langfuse 看板链接，以及一份说明文档，写清你修复的三种检索失败模式（生成代码污染、长尾符号召回、跨仓库符号解析）和修复每一种的具体改动。
