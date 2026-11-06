# RAG

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

分块、混合检索、重排，以及怎样测量检索流水线。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [检索模型与重排模型](bi-encoder-vs-cross-encoder.md) | 概念 | 1 基础 | 6 |
| [向量搜索为什么默认按余弦排序](cosine-is-the-default.md) | 概念 | 1 基础 | 5 |
| [内部政策知识库该用检索还是微调](rag-or-fine-tune.md) | 概念 | 1 基础 | 6 |
| [答案出错后首先该看哪个指标](recall-at-k-first.md) | 概念 | 1 基础 | 6 |
| [首次建索引前评审分块方案](chunk-size-by-query-type.md) | 权衡 | 2 应用 | 10 |
| [估算重排模型扫描整个索引的工作量](cross-encoder-passes-per-query.md) | 估算 | 2 应用 | 8 |
| [向量搜索漏掉包含精确错误码的文章](error-code-query-misses.md) | 排障 | 2 应用 | 8 |
| [忠实度与答案相关性评的是两回事](faithfulness-vs-relevance.md) | 概念 | 2 应用 | 7 |
| [在向量搜索前按元数据过滤](filter-before-search.md) | 设计 | 2 应用 | 8 |
| [用一次消融实验了结分块重叠之争](overlap-measure-first.md) | 权衡 | 2 应用 | 8 |
| [读懂父文档检索函数](parent-child-dedupe.md) | 代码阅读 | 2 应用 | 8 |
| [双主题问题该用哪种查询改写](pick-the-query-rewriter.md) | 权衡 | 2 应用 | 9 |
| [读懂排名融合函数](read-the-rrf-function.md) | 代码阅读 | 2 应用 | 8 |
| [重排模型离线近乎完美，生产反而变差](reranker-magic-in-eval.md) | 排障 | 2 应用 | 8 |
| [混合检索为什么融合排名而非分数](rrf-beats-score-sum.md) | 概念 | 2 应用 | 8 |
| [读懂给 BM25 词项打分的四行代码](bm25-idf-plus-one.md) | 代码阅读 | 3 高级 | 10 |
| [设计企业内部文档问答服务](design-rag-over-company-docs.md) | 设计 | 3 高级 | 30 |
| [召回率不变、MRR 下降，检索器却没改过](diagnose-from-the-metric-table.md) | 排障 | 3 高级 | 10 |
| [编造的段落让代码搜索变差了](hyde-invents-a-symbol.md) | 排障 | 3 高级 | 10 |
| [人工评审发现编造事实，忠实度却一直很高](judge-grades-its-own-work.md) | 排障 | 3 高级 | 10 |
| [让助手在证据不足时说不知道](refuse-when-confidence-is-low.md) | 设计 | 3 高级 | 10 |
| [选择重排模型的候选数量](rerank-pool-size.md) | 权衡 | 3 高级 | 10 |
| [构建用来选定检索配置的评估](take-home-stratified-eval.md) | 课后任务 | 3 高级 | 60 |
| [设计跨十个仓库并保持最新的代码搜索](design-cross-repo-code-search.md) | 设计 | 4 架构与规模 | 30 |
| [每项指标都高，某个业务单元仍拿到错误答案](eval-passes-users-complain.md) | 设计 | 4 架构与规模 | 15 |
| [另一司法管辖区的条款进入了答案](jurisdiction-leak-in-shared-index.md) | 设计 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
