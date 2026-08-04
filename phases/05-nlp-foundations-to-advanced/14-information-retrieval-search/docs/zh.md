# 信息检索与搜索

> BM25 精确但脆弱。稠密撒得开但漏关键词。混合是 2026 年的默认。其余的都是调参。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 02（BoW + TF-IDF）、Phase 5 · 04（GloVe、FastText、子词）
**预计时间：** ~75 分钟

## 问题背景

用户敲下 "what happens if someone lies to get money"，期待找到真正涵盖这个的法条："Section 420 IPC"。关键词搜索完全错过它（没有共享词汇）。语义搜索也会错过它，如果 embedding 没在法律文本上训练过的话。真实的搜索两者都得应付。

IR 是每个 RAG 系统、每个搜索框、每个文档站模糊查找底下的那条流水线。2026 年在生产里能跑的架构不是单一方法，而是一串互补方法的链条，每一环都接住前一环的失败。

这节课把每一块都搭出来，点明每一块接住的是哪种失败。

## 核心概念

![混合检索：BM25 + 稠密 + RRF + cross-encoder 重排](../assets/retrieval.svg)

四层。挑你需要的。

1. **稀疏检索（BM25）。** 快，在精确匹配上准，在语义上糟糕。跑在倒排索引上。百万级文档时每查询不到 10ms。能把法条引用、产品代号、错误信息、命名实体搞对。
2. **稠密检索。** 把查询和文档编码成向量，做最近邻搜索。捕捉复述和语义相似。会漏掉差一个字符的精确关键词匹配。用 FAISS 或向量数据库时每查询 50-200ms。
3. **融合。** 把稀疏和稠密的排序列表合并。倒数排名融合（RRF）是省事的默认，因为它忽略原始分数（那些分数活在不同量纲里），只用排名位置。当你知道某个信号在你的领域里占主导时，加权融合是个选项。
4. **Cross-encoder 重排。** 取融合后的 top-30。跑一个 cross-encoder（查询 + 文档一起，给每一对打分）。留下 top-5。Cross-encoder 每对比 bi-encoder 慢，但准得多。靠只在 top-30 上跑它来摊薄成本。

三路检索（BM25 + 稠密 + 像 SPLADE 那样的学习式稀疏）在 2026 年基准里胜过两路，但需要为学习式稀疏索引准备基础设施。对大多数团队，两路加 cross-encoder 重排是最佳平衡点。

```figure
gx-hybrid-retrieval
```

## 动手构建

### 第 1 步：从零实现 BM25

```python
import math
import re
from collections import Counter

TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text):
    return TOKEN_RE.findall(text.lower())


class BM25:
    def __init__(self, corpus, k1=1.5, b=0.75):
        if not corpus:
            raise ValueError("corpus must not be empty")
        self.corpus = [tokenize(d) for d in corpus]
        self.k1 = k1
        self.b = b
        self.n_docs = len(self.corpus)
        self.avg_dl = sum(len(d) for d in self.corpus) / self.n_docs
        self.df = Counter()
        for doc in self.corpus:
            for term in set(doc):
                self.df[term] += 1

    def idf(self, term):
        n = self.df.get(term, 0)
        return math.log(1 + (self.n_docs - n + 0.5) / (n + 0.5))

    def score(self, query, doc_idx):
        q_tokens = tokenize(query)
        doc = self.corpus[doc_idx]
        dl = len(doc)
        freq = Counter(doc)
        score = 0.0
        for term in q_tokens:
            f = freq.get(term, 0)
            if f == 0:
                continue
            numerator = f * (self.k1 + 1)
            denominator = f + self.k1 * (1 - self.b + self.b * dl / self.avg_dl)
            score += self.idf(term) * numerator / denominator
        return score

    def rank(self, query, top_k=10):
        scored = [(self.score(query, i), i) for i in range(self.n_docs)]
        scored.sort(reverse=True)
        return scored[:top_k]
```

两个值得知道的参数。`k1=1.5` 控制词频饱和；越高意味着越看重词的重复。`b=0.75` 控制长度归一化；0 忽略文档长度，1 完全归一化。默认值是 Robertson 在原论文里的推荐，很少需要调。

### 第 2 步：用 bi-encoder 做稠密检索

```python
from sentence_transformers import SentenceTransformer
import numpy as np


def build_dense_index(corpus, model_id="sentence-transformers/all-MiniLM-L6-v2"):
    encoder = SentenceTransformer(model_id)
    embeddings = encoder.encode(corpus, normalize_embeddings=True)
    return encoder, embeddings


def dense_search(encoder, embeddings, query, top_k=10):
    q_emb = encoder.encode([query], normalize_embeddings=True)
    sims = (embeddings @ q_emb.T).flatten()
    order = np.argsort(-sims)[:top_k]
    return [(float(sims[i]), int(i)) for i in order]
```

L2 归一化 embedding，让点积等于余弦。`all-MiniLM-L6-v2` 是 384 维，快，对多数英语检索够强。多语言工作用 `paraphrase-multilingual-MiniLM-L12-v2`。追求最高准确率用 `bge-large-en-v1.5` 或 `e5-large-v2`。

### 第 3 步：倒数排名融合

```python
def reciprocal_rank_fusion(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, (_, doc_idx) in enumerate(ranking):
            scores[doc_idx] = scores.get(doc_idx, 0.0) + 1.0 / (k + rank + 1)
    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [(score, doc_idx) for doc_idx, score in fused]
```

那个 `k=60` 常数来自原始 RRF 论文。`k` 越高，排名差异的贡献越被抹平；越低，靠前的排名越占主导。60 是发表时的默认值，很少需要调。

### 第 4 步：混合搜索 + 重排

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def hybrid_search(query, bm25, encoder, dense_embeddings, corpus, top_k=5, pool_size=30, reranker=reranker):
    sparse_ranking = bm25.rank(query, top_k=pool_size)
    dense_ranking = dense_search(encoder, dense_embeddings, query, top_k=pool_size)
    fused = reciprocal_rank_fusion([sparse_ranking, dense_ranking])[:pool_size]

    pairs = [(query, corpus[doc_idx]) for _, doc_idx in fused]
    scores = reranker.predict(pairs)
    reranked = sorted(zip(scores, [doc_idx for _, doc_idx in fused]), reverse=True)
    return reranked[:top_k]
```

三个阶段组合起来。BM25 找词面匹配。稠密找语义匹配。RRF 在不需要分数校准的情况下合并两个排序。Cross-encoder 用查询-文档对一起重新打分 top-30，捕捉 bi-encoder 漏掉的细粒度相关性。留 top-5。

### 第 5 步：评估

| 指标 | 含义 |
|--------|---------|
| Recall@k | 在正确文档存在的那些查询里，它出现在 top-k 的频率有多高？ |
| MRR（平均倒数排名） | 第一个相关文档 1/rank 的平均值。 |
| nDCG@k | 考虑相关性的分级，而不只是二元的相关/不相关。 |

具体到 RAG，检索器的 **Recall@k** 是最重要的数字。如果正确段落不在检索集里，你的阅读器答不出来。

调试提示：对失败的查询，比对稀疏和稠密的排序。如果一个找到了正确文档而另一个没有，你就有了词汇不匹配（修法：补上缺的那一半）或语义歧义（修法：更好的 embedding 或一个重排器）。

## 实际使用

2026 年的栈：

| 规模 | 栈 |
|-------|-------|
| 1k-100k 文档 | 内存里的 BM25 + `all-MiniLM-L6-v2` embedding + RRF。不用单独的数据库。 |
| 100k-10M 文档 | 稠密用 FAISS 或 pgvector + BM25 用 Elasticsearch / OpenSearch。并行跑。 |
| 10M+ 文档 | 支持混合的 Qdrant / Weaviate / Vespa / Milvus。在 top-30 上做 cross-encoder 重排。 |
| 最佳质量前沿 | 三路（BM25 + 稠密 + SPLADE）+ ColBERT 后期交互重排 |

无论你挑哪个，都给评估留预算。在基准测试端到端 RAG 准确率之前，先基准测试检索召回。阅读器修不了检索器漏掉的东西。

### 2026 年生产 RAG 的血泪教训

- **80% 的 RAG 失败追溯到摄取和分块，而不是模型。** 团队花几周换 LLM、调 prompt，而检索每隔三个查询就悄悄返回错误的上下文。先修分块。
- **分块策略比分块大小更重要。** 定长切分会切坏表格、代码和嵌套标题。句子感知是默认；语义或基于 LLM 的分块对技术文档和产品手册有回报。
- **父文档模式。** 检索小的"子"块以保精度。当同一父章节的多个子块出现时，换成父块以保住上下文。这能稳定提升答案质量，且不需要重训。
- **k_rerank=3 通常最优。** 超过它的每个额外块都增加 token 成本和生成延迟，却不提升答案质量。如果对你而言 k=8 仍好过 k=3，那是重排器表现不佳。
- **HyDE / 查询扩展。** 从查询生成一个假设性答案，给它做 embedding，再检索。弥合短问题和长文档之间的措辞鸿沟。无需训练的免费精度提升。
- **上下文预算控制在 8K token 以下。** 在那个上限反复触顶，意味着重排器阈值太松。
- **给一切打版本。** prompt、分块规则、embedding 模型、重排器。任何漂移都会悄悄破坏答案质量。在忠实度、上下文精确率、未答问题率上设 CI 闸门，在用户看到之前拦住回归。
- **三路检索（BM25 + 稠密 + 像 SPLADE 的学习式稀疏）在 2026 年基准上胜过两路**，尤其是对混合了专有名词和语义的查询。基础设施支持 SPLADE 索引时就上它。

按 2026 年的行业测量，恰当的检索设计能把幻觉减少 70-90%。RAG 大部分性能增益来自更好的检索，而不是模型微调。

## 拿去用

存为 `outputs/skill-retrieval-picker.md`：

```markdown
---
name: retrieval-picker
description: Pick a retrieval stack for a given corpus and query pattern.
version: 1.0.0
phase: 5
lesson: 14
tags: [nlp, retrieval, rag, search]
---

Given requirements (corpus size, query pattern, latency budget, quality bar, infra constraints), output:

1. Stack. BM25 only, dense only, hybrid (BM25 + dense + RRF), hybrid + cross-encoder rerank, or three-way (BM25 + dense + learned-sparse).
2. Dense encoder. Name the specific model. Match to language(s), domain, and context length.
3. Reranker. Name the specific cross-encoder model if used. Flag that rerank adds 30-100ms latency on top-30.
4. Evaluation plan. Recall@10 is the primary retriever metric. MRR for multi-answer. Baseline first, incremental improvements measured against it.

Refuse to recommend dense-only for corpora with named entities, error codes, or product SKUs unless the user has evidence dense handles exact matches. Refuse to skip reranking for high-stakes retrieval (legal, medical) where the final top-5 decides the user's answer.
```

## 练习

1. **简单。** 在一个 500 文档语料上实现上面的 `hybrid_search`。测 20 个查询。对比纯 BM25、纯稠密、混合三者在 5 处的召回。
2. **中等。** 加上 MRR 计算。对每个有已知正确文档的测试查询，找出正确文档在 BM25、稠密、混合排序里的排名。报告各自的 MRR。
3. **困难。** 用 MultipleNegativesRankingLoss（Sentence Transformers）在你的领域上微调一个稠密编码器。从 500 个查询-文档对构建训练集。对比微调前后的召回。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| BM25 | 关键词搜索 | Okapi BM25。按词频、IDF 和长度给文档打分。 |
| 稠密检索 | 向量搜索 | 把查询 + 文档编码成向量，找最近邻。 |
| Bi-encoder | embedding 模型 | 独立编码查询和文档。查询时快。 |
| Cross-encoder | 重排模型 | 把查询 + 文档一起编码。慢但准。 |
| RRF | 排名融合 | 把两个排序按 `1/(k + rank)` 求和合并。 |
| Recall@k | 检索指标 | 相关文档落在 top-k 的查询所占比例。 |

## 延伸阅读

- [Robertson and Zaragoza (2009). The Probabilistic Relevance Framework: BM25 and Beyond](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf) —— BM25 的权威论述。
- [Karpukhin et al. (2020). Dense Passage Retrieval for Open-Domain QA](https://arxiv.org/abs/2004.04906) —— DPR，经典的 bi-encoder。
- [Formal et al. (2021). SPLADE: Sparse Lexical and Expansion Model](https://arxiv.org/abs/2107.05720) —— 缩小与稠密差距的学习式稀疏检索器。
- [Cormack, Clarke, Büttcher (2009). Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) —— RRF 论文。
- [Khattab and Zaharia (2020). ColBERT: Efficient and Effective Passage Search](https://arxiv.org/abs/2004.12832) —— 后期交互检索。
