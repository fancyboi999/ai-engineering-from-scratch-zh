---
id: rag
title: 检索增强生成（RAG）
subtitle: 分块、索引、检索、融合、重排、带引用生成，并评估每个阶段。使用课程中的 Python 实现。
hue: 100
sources: phases/11-llm-engineering/06-rag, phases/11-llm-engineering/07-advanced-rag, phases/05-nlp-foundations-to-advanced/13-question-answering, phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag, phases/19-capstone-projects/64-chunking-strategies-advanced, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense, phases/19-capstone-projects/66-reranker-cross-encoder, phases/19-capstone-projects/67-query-rewriting-hyde, phases/19-capstone-projects/68-rag-eval-precision-recall, phases/19-capstone-projects/69-end-to-end-rag-system
code: RA
source_hash: f09562a7ba3f13ac
---

## 端到端 RAG 流水线
type: architecture
from: phases/19-capstone-projects/69-end-to-end-rag-system/docs/zh.md, phases/19-capstone-projects/69-end-to-end-rag-system/code/main.py

```arch
node | docs | 1,1 | 文档 | 离线索引
node | chunk | 2,1 | 分块器 | 递归切分
node | index | 3,1 | HybridIndex | BM25 加稠密检索
node | gen | 4,1 | 生成器 | 带引用回答或拒答
node | query | 1,2 | 用户查询 |
node | rewrite | 2,2 | 改写器 | HyDE、多查询、拆解
node | retr | 3,2 | 检索器 | RRF，top_n 12
node | rerank | 4,2 | 重排器 | 交叉编码器，top_k 5
edge | docs | chunk |
edge | chunk | index | 分块
edge | query | rewrite |
edge | rewrite | retr | 改写结果
edge | index | retr | 搜索
edge | retr | rerank | top_n
edge | rerank | gen | top_k
```

## 一次查询：Pipeline.query
type: flow
from: phases/19-capstone-projects/69-end-to-end-rag-system/code/main.py, phases/19-capstone-projects/69-end-to-end-rag-system/docs/zh.md

1. **改写器**：`pick_strategy` 遇到 " and " 选 decompose，遇到 api 或 config 选 hyde，否则选 multiquery。
2. **HyDE**：BM25 搜索查询本身，稠密检索搜索假设段落。
3. **子查询**：每个改写单独搜索，由 `rrf` 融合排名列表。
4. **HybridIndex**：BM25 前 8 与稠密前 8 融合，保留 `top_n` 12。
5. **重排器**：交叉编码器分数加 0.3 倍查询重叠，保留 `top_k` 5。
6. **生成器**：最高分低于 `REFUSE_THRESHOLD` 时返回 "I do not know."。
7. **生成器**：否则从最多 2 个分块各取一句，分别附 `[doc_id:chunk_index]` 引用。

## 代码任务
type: task-table
from: phases/19-capstone-projects/64-chunking-strategies-advanced/code/main.py, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/code/main.py, phases/19-capstone-projects/67-query-rewriting-hyde/code/main.py, phases/19-capstone-projects/68-rag-eval-precision-recall/code/main.py, phases/19-capstone-projects/69-end-to-end-rag-system/code/main.py

| 任务 | 代码 |
|---|---|
| 固定窗口分块 | `fixed_window(doc_id, text, size=400, overlap=80)` |
| 按标题分块 | `structural_markdown(doc_id, text)` |
| 评估分块器 | `eval_recall(chunker, fixture, ks=(1, 3, 5))` |
| 融合排名列表 | `rrf(rankings, k=60, weights=[1.0, 1.0])` |
| 通过改写器检索 | `retrieve_with_rewriter(query, rewriter, retriever)` |
| 重排候选 | `rerank(model, query, candidates, top_k)` |
| 分级排名评分 | `ndcg_at_k(retrieved, graded, k)` |
| 运行带门控演示 | `python3 code/main.py`，出现 FAIL 时退出 1 |

## 使用 RRF 的混合检索
type: annotated-code
lang: python
from: phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/code/main.py

```python
retriever = HybridRetriever()                # BM25Index + DenseIndex
for d in CORPUS:
    retriever.add(d)                         # 同时建立两种模态的索引
result = retriever.search(q, k_each=5, k_out=5)
result["bm25"], result["dense"], result["fused"]  # 三个排名列表
bm25 = BM25Index(k1=1.5, b=0.75)             # 标题 token 计 3 次
idf = math.log((n - df + 0.5) / (df + 0.5) + 1.0)  # 保持为正
score[doc.doc_id] += w * (1.0 / (k + rank + 1))    # rank 从 0 开始
```

## 组装并查询流水线
type: annotated-code
lang: python
from: phases/19-capstone-projects/69-end-to-end-rag-system/code/main.py

```python
p = Pipeline()                        # 分块器、索引、改写器、重排器
p.ingest(CORPUS)                      # 递归切分，目标 400
p.train_reranker_on(TRAIN_TRIPLES)    # 拟合小型交叉编码器
result = p.query("<question>")
result.answer                         # 句子与引用锚点
result.citations                      # doc_id:chunk_index 列表
result.rewriter_strategy              # hyde、multiquery 或 decompose
result.latency_ms                     # 改写、检索、重排、生成
```

## 分块策略
type: command-table
from: phases/19-capstone-projects/64-chunking-strategies-advanced/docs/zh.md, phases/19-capstone-projects/64-chunking-strategies-advanced/code/main.py, phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/docs/zh.md

| 命令 | 作用 |
|---|---|
| `recursive_split` | 无结构散文，最强单一基线 |
| `structural_markdown` | Markdown、RFC 与 API 文档，按标题切分 |
| `sentence_chunks` | 较长的单主题段落，目标 500 |
| `semantic_chunks` | 较短的混合主题段落，阈值 0.6 |
| `fixed_window` | 仅作为对照，代码中会切断符号 |
| 父文档检索 | 检索小型子块，返回父文档，并对父文档去重 |
| 上下文检索 | 每块前添加 50-100 词的 LLM 上下文 |
| 延迟分块 | 先对整篇文档逐 token 嵌入，再按块池化 |

## 关键公式
type: concepts
from: phases/11-llm-engineering/06-rag/docs/zh.md, phases/11-llm-engineering/07-advanced-rag/docs/zh.md, phases/19-capstone-projects/68-rag-eval-precision-recall/docs/zh.md, phases/19-capstone-projects/68-rag-eval-precision-recall/code/main.py

- **余弦相似度**：$\cos(a, b) = \frac{a \cdot b}{\lVert a \rVert \, \lVert b \rVert}$，范围 -1 至 1。
- **BM25 项**：$\mathrm{IDF}(t) \frac{tf \, (k_1 + 1)}{tf + k_1 (1 - b + b \, |d| / \mathrm{avgdl})}$
- **RRF**: $\mathrm{RRF}(d) = \sum_R \frac{1}{k + \mathrm{rank}_R(d)}$
- **Precision@k**：前 k 个中的标准答案文档数除以 k。
- **Recall@k**：前 k 个中的标准答案文档数除以全部标准答案文档数。
- **MRR**：首个相关文档排名倒数的均值。
- **DCG 增益**：位置 $i$ 从 0 开始时为 $\frac{2^{rel} - 1}{\log_2(i + 2)}$。
- **nDCG@k**：DCG 除以理想顺序的 DCG，范围 0 至 1。

## 默认值与数值
type: defaults
from: phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/code/main.py, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/docs/zh.md, phases/11-llm-engineering/06-rag/docs/zh.md, phases/11-llm-engineering/07-advanced-rag/docs/zh.md, phases/19-capstone-projects/66-reranker-cross-encoder/docs/zh.md, phases/19-capstone-projects/69-end-to-end-rag-system/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| BM25 `k1` | 1.5 | 第 11.07 课代码使用 1.2 |
| BM25 `b` | 0.75 | 0 忽略长度，1 完全归一化 |
| RRF `k` | 60 | 排名 1 增加 1/61 |
| 分块大小 | 256-512 | token 数，重叠 50 token |
| 每查询分块数 | 5 至 10 | 上下文共 2,500-5,000 token |
| 重排池 N | 50 至 200 | 交叉编码器保留前 K 个 |
| `top_n`、`top_k` | 12 | 流水线重排后保留 5 个 |
| `REFUSE_THRESHOLD` | 0.05 | 低于此值返回 "I do not know." |

## 故障排查
type: troubleshooting
from: phases/19-capstone-projects/68-rag-eval-precision-recall/docs/zh.md, phases/11-llm-engineering/07-advanced-rag/docs/zh.md, phases/19-capstone-projects/66-reranker-cross-encoder/docs/zh.md, phases/19-capstone-projects/67-query-rewriting-hyde/docs/zh.md, phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| recall@k 与 precision@k 都低 | 分块切断答案或检索器漏检 | 修正边界或增加检索模态 |
| recall@k 高，MRR 低 | 正确块不在首位 | 添加交叉编码器重排 |
| MRR 高，忠实度低 | 生成器编造内容 | prompt 强制引用或拒答 |
| 忠实度高，相关性低 | 有依据但偏题 | 改写查询 |
| 漏掉精确代码 `E-4021` | 嵌入将其当噪声 | 增加 BM25，以 RRF 融合 |
| 重排没有提升 | N 等于 K | N 至少设为 K 的 3 倍 |
| HyDE 丢失正确文档 | 假设段落编造了标识 | 限制长度，降低 BM25 权重 |
| 出现 40 token 碎片 | 语义分块没有下限 | 强制 `min_tokens` |

## 缩略语
type: glossary
from: phases/11-llm-engineering/06-rag/docs/zh.md, phases/11-llm-engineering/07-advanced-rag/docs/zh.md, phases/19-capstone-projects/66-reranker-cross-encoder/docs/zh.md, phases/19-capstone-projects/68-rag-eval-precision-recall/docs/zh.md

- **RAG**：检索增强生成，先检索、放入 prompt，再生成。
- **BM25**：Best Matching 25，结合 IDF 与长度归一化的关键词排名。
- **RRF**：倒数排名融合，对各列表的 1/(k + rank) 求和。
- **HyDE**：假设文档嵌入，用虚构答案搜索。
- **MRR**：平均倒数排名，首个命中排名倒数的均值。
- **nDCG**：归一化折损累计增益，衡量分级排名质量。
- **Qrels**：标准标签，包含标准文档和答案的查询。
- **双编码器／交叉编码器**：分别嵌入查询与文档，或联合读取两者。

## 问答
type: qa
from: phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/docs/zh.md, phases/11-llm-engineering/07-advanced-rag/docs/zh.md, phases/19-capstone-projects/68-rag-eval-precision-recall/docs/zh.md, phases/19-capstone-projects/67-query-rewriting-hyde/docs/zh.md, phases/11-llm-engineering/06-rag/docs/zh.md

- **为何用 RRF 而非混合分数？** BM25 分数无界，排名可跨模态比较。
- **为何只重排前 N 个？** 交叉编码器比双编码器慢 100-1000 倍。
- **为何报告 recall@k？** 生成器能丢弃坏块，却无法使用从未见过的块。
- **错误的 HyDE 答案为何也有效？** 检索器使用其措辞，而非事实。
- **RAG 还是微调？** 事实用 RAG，风格、语气或推理模式用微调。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/19-capstone-projects/66-reranker-cross-encoder/docs/zh.md, phases/19-capstone-projects/68-rag-eval-precision-recall/docs/zh.md

- 从递归分块 512 token 开始，在 50 查询评估集上衡量 recall@5。
- 要求模型只依据上下文，信息不足时回答 "I don't know."。
- 同时固定双编码器、交叉编码器与 N。
- 裁判使用与生成器不同的模型家族。
- 按查询类别切分 qrels：字面、改写、多主题。
- 分层评估：CI 20 查询、每晚 200、每周 2000。
