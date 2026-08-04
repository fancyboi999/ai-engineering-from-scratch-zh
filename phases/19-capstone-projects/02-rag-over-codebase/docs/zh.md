# 顶点项目 02 —— 代码库之上的 RAG（跨仓库语义搜索）

> 2026 年，每个像样的工程组织内部都跑着一套理解含义、而不只是字符串的代码搜索。Sourcegraph Amp、Cursor 的代码库问答、Augment 的企业图谱、Aider 的 repomap、Pinterest 的内部 MCP——同一套形态。摄入很多个仓库，用 tree-sitter 解析，对函数级和类级的 chunk 做 embedding，混合搜索，重排，带引用作答。这个顶点项目要求你做一个能扛住跨 10 个仓库、200 万行代码，并且在每次 git push 时都能挺过增量重建索引的系统。

**类型：** Capstone
**语言：** Python（摄入）、TypeScript（API + UI）
**前置要求：** 第 5 阶段（NLP 基础）、第 7 阶段（transformer）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 17 阶段（基础设施）
**涉及阶段：** P5 · P7 · P11 · P13 · P17
**预计时间：** 30 小时

## 问题背景

到 2026 年，每个前沿编码 agent 都带着一层代码库检索，因为光靠上下文窗口解决不了跨仓库的问题。Claude 的 100 万 token 上下文有帮助，但它消除不了对排序检索的需求。在原始 chunk 上做朴素的余弦搜索，会在生成的代码、monorepo 的重复内容、以及很少被 import 的符号的长尾上把结果搞坏。生产上的答案是：在 AST 感知的 chunk 上做混合搜索（dense + BM25），加一个重排器，背后再有一张符号引用的图。

你通过给一支真实的仓库舰队建索引来学这件事——不是某个教程里的单仓库——并衡量 MRR@10、引用忠实度和增量新鲜度。失败模式都是基础设施层面的：一个 10 万文件的 monorepo、一次改动了半数文件的 push、一个要跨四个仓库才能正确作答的查询。

## 核心概念

一条 AST 感知的摄入流水线用 tree-sitter 解析每个文件，抽出函数和类节点，按节点边界而不是固定的 token 窗口来切 chunk。每个 chunk 拿到三种表示：一个 dense embedding（Voyage-code-3 或 nomic-embed-code）、稀疏的 BM25 词项，以及一段简短的自然语言摘要。摘要加上了第三种可检索的模态——用户问“X 是怎么做鉴权的”，哪怕代码里只有 `check_permission`，摘要里也会提到 “authz”。

检索是混合式的。一个查询同时触发 dense 和 BM25 搜索，合并 top-k，把并集交给一个 cross-encoder 重排器（Cohere rerank-3 或 bge-reranker-v2-gemma-2b）。重排后的列表送给一个长上下文合成器（带 prompt caching 的 Claude Sonnet 4.7，或自托管的 Llama 3.3 70B），指示它每一条断言都要按文件和行号区间给出引用。没有引用的答案会被一个后置过滤器拒掉。

增量新鲜度是那个基础设施难题。Git push 触发一个 diff：哪些文件变了，哪些符号变了。只有受影响的 chunk 重新 embedding。受影响的跨文件符号边（import、方法调用）被重新计算。索引保持一致，不必每次提交都重新处理 200 万行。

## 架构

```
git push --> webhook --> ingest worker (LlamaIndex Workflow)
                           |
                           v
             tree-sitter parse + AST chunk
                           |
            +--------------+----------------+
            v              v                v
          dense        BM25 index       summary (LLM)
        (Voyage / bge)  (Tantivy)        (Haiku 4.5)
            |              |                |
            +------> Qdrant / pgvector <----+
                            |
                            v
                      symbol graph (Neo4j / kuzu)
                            |
  query --> LangGraph agent (retrieve -> rerank -> synth)
                            |
                            v
                 Claude Sonnet 4.7 1M context
                            |
                            v
                 answer + file:line citations
```

## 技术栈

- 解析：带 17 种语言文法的 tree-sitter（Python、TS、Rust、Go、Java、C++ 等）
- Dense embedding：Voyage-code-3（托管）或 nomic-embed-code-v1.5（自托管），bge-code-v1 作兜底
- 稀疏索引：Tantivy（Rust）配 BM25F，对符号名和函数体做字段加权
- 向量库：带混合搜索的 Qdrant 1.12，或给向量数低于 5000 万的团队用 pgvector + pgvectorscale
- chunk 摘要模型：Claude Haiku 4.5 或 Gemini 2.5 Flash，做 prompt cache
- 重排器：Cohere rerank-3 或自托管的 bge-reranker-v2-gemma-2b
- 编排：摄入用 LlamaIndex Workflows，查询 agent 用 LangGraph
- 合成器：带 prompt caching 的 Claude Sonnet 4.7（100 万上下文）
- 符号图：Neo4j（托管）或 kuzu（嵌入式），存 import 和调用边
- 可观测性：每个检索 + 合成步骤一个 Langfuse span

```figure
ce-hybrid-retrieval
```

## 动手构建

1. **摄入遍历器。** 在每个 push hook 上遍历 git 历史。收集变更的文件。对每个文件，用 tree-sitter 解析，连同完整源码区间抽出函数和类节点。产出 chunk 记录 `{repo, path, start_line, end_line, symbol, body}`。

2. **chunk 摘要器。** 把 chunk 批量塞进 Haiku 4.5 调用，对 system 前导做 prompt caching。prompt：“用一句话总结这个函数，点出它的公开契约和副作用。”把摘要跟 chunk 一起存。

3. **embedding 池。** 两条并行队列：dense（Voyage-code-3，批大小 128）和 summary（同一个模型，但跑在摘要字符串上）。把向量写进 Qdrant，payload 为 `{repo, path, start_line, end_line, symbol, kind}`。

4. **BM25 索引。** 字段加权的 Tantivy 索引：符号名权重 4、函数体权重 1、摘要权重 2。让“找到名叫 X 的函数”这类查询能跟“找到做 X 的那个函数”并存。

5. **符号图。** 对每个 chunk，记录边：import（这个文件用了仓库 Z 里的符号 Y）、调用（这个函数调用了类 C 上的方法 M）、继承。存进 kuzu。查询时用来跨仓库边界扩展检索。

6. **查询 agent。** 带三个节点的 LangGraph。`retrieve` 并行触发 dense + BM25，按 (repo, path, symbol) 去重。`rerank` 在 top-50 上跑 cross-encoder，保留 top-10。`synth` 把重排后的 chunk 放进上下文调用 Claude Sonnet 4.7，缓存 system prompt，要求 file:line 引用。

7. **引用强制。** 解析模型输出；任何没有 `(repo/path:start-end)` 锚点的断言都被标记，要么重问要么丢弃。把只含已引用内容的答案返回给用户。

8. **增量重建索引。** 每个 webhook 上，计算符号级 diff。只对文本变了的 chunk 重新 embedding。对 import 变了的 chunk 重新计算符号边。指标：在一支 200 万行的舰队上，一次 50 文件的 push 在 60 秒内完成重建索引。

9. **评测。** 给 100 个跨仓库问题标注金标准 file:line 答案。衡量 MRR@10、nDCG@10、引用忠实度（断言中带可验证锚点的占比），以及 p50/p99 延迟。

## 实际使用

```
$ code-rag ask "how is S3 multipart abort wired into our retry budget?"
[retrieve]  12 chunks dense + 7 chunks bm25, 16 unique after dedup
[rerank]    top-5 kept (cohere rerank-3)
[synth]     claude-sonnet-4.7, cache hit rate 68%, 2.1s
answer:
  Multipart aborts are triggered by `AbortMultipartOnFail` in
  services/uploader/retry.go:122-148, which decrements the per-bucket
  retry budget defined in config/budgets.yaml:34-51 ...
  citations: [services/uploader/retry.go:122-148, config/budgets.yaml:34-51,
              libs/s3client/multipart.ts:44-61]
```

## 拿去用

可交付 skill `outputs/skill-codebase-rag.md`。给定一组仓库语料，它会立起摄入流水线、混合索引和查询 agent，对任何跨仓库问题返回一个带引用的答案。评分标准：

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 检索质量 | 在 100 个问题的留出集上的 MRR@10 和 nDCG@10 |
| 20 | 引用忠实度 | 答案断言中带可验证 file:line 锚点的占比 |
| 20 | 延迟与规模 | 在所建索引的语料规模上、10k QPS 下的 p95 查询延迟 |
| 20 | 增量索引正确性 | 一次 50 文件提交从 git push 到可搜索的耗时 |
| 15 | 体验与答案排版 | 引用可点击、片段预览、追问的可操作性 |
| **100** | | |

## 练习

1. 把 Voyage-code-3 换成自托管的 nomic-embed-code。衡量 MRR@10 的差值。报告在开启重排后这个差距会不会缩小。

2. 往语料里注入 20% 的生成代码（LLM 产出的样板代码）并重新评测。观察检索被污染的现象。给 payload 加一个 “generated” 标记，并给这些命中降权。

3. 在你的语料规模上，给 Qdrant 混合搜索 vs pgvector + pgvectorscale 跑基准。报告批大小为 1 时的 p99。

4. 加一个基于采样的漂移检查：每周重跑那 100 个问题的评测。MRR@10 跌幅 > 5% 时告警。

5. 扩展到跨语言符号解析：一个 Python 函数通过 gRPC 调用一个 Go 服务。用符号图把它们连起来。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| AST-aware chunking（AST 感知切块） | “函数级切分” | 在 tree-sitter 节点边界处切代码，而不是用固定的 token 窗口 |
| Hybrid search（混合搜索） | “dense + 稀疏” | 并行跑 BM25 和向量搜索，合并 top-k，再重排 |
| Cross-encoder rerank（cross-encoder 重排） | “第二阶段排序” | 把 (query, candidate) 一对一起打分的模型，比余弦更准 |
| Prompt caching | “缓存的 system prompt” | 2026 年 Claude / OpenAI 的特性，对重复的前缀 token 最多打到一折 |
| Symbol graph（符号图） | “代码图” | 跨文件、跨仓库的 import、调用、继承边 |
| Citation faithfulness（引用忠实度） | “有据可循的答案率” | 用户点开锚点、读引用的区间就能核实的断言占比 |
| Incremental re-index（增量重建索引） | “push 到可搜索的时间” | 从 git push 到变更符号变得可查询的墙钟时间 |

## 延伸阅读

- [Sourcegraph Amp](https://ampcode.com) —— 生产级跨仓库代码智能
- [Sourcegraph Cody RAG architecture](https://sourcegraph.com/blog/how-cody-understands-your-codebase) —— 这个顶点项目的参考深度解析
- [Aider repo-map](https://aider.chat/docs/repomap.html) —— tree-sitter 排序的仓库视图
- [Augment Code enterprise graph](https://www.augmentcode.com) —— 商业化的符号图 RAG
- [Qdrant hybrid search docs](https://qdrant.tech/documentation/concepts/hybrid-queries/) —— 参考实现
- [Voyage AI code embeddings](https://docs.voyageai.com/docs/embeddings) —— Voyage-code-3 细节
- [Cohere rerank-3](https://docs.cohere.com/reference/rerank) —— cross-encoder 参考
- [Pinterest MCP internal search](https://medium.com/pinterest-engineering) —— 内部平台参考
