---
id: embeddings-vector-search
title: 嵌入与向量搜索
subtitle: 编码文本、选择度量、估算向量大小、选择索引并修复低召回。使用 Python、NumPy 和 FAISS。
hue: 170
sources: phases/11-llm-engineering/04-embeddings, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword, phases/05-nlp-foundations-to-advanced/14-information-retrieval-search, phases/01-math-foundations/14-norms-and-distances, phases/02-ml-fundamentals/06-knn-and-distances, phases/04-computer-vision/20-image-retrieval-metric, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense
code: EV
---

## 先检索，再重排
type: architecture
from: phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/05-nlp-foundations-to-advanced/14-information-retrieval-search/docs/zh.md

```arch
node | docs | 1,1 | 文档 | 划分为分块
node | enc | 2,1 | 双编码器 | 文本转向量
node | norm | 3,1 | L2 归一化 | 单位长度
node | idx | 4,1 | 向量索引 | HNSW 或平面索引
node | q | 1,2 | 查询 | 相同模型，查询前缀
node | out | 2,2 | 前 10 个 | 交给阅读器
node | rerank | 3,2 | 交叉编码器 | 为文本对评分
node | topk | 4,2 | 前 100 个 | ANN 搜索
edge | docs | enc | 分块
edge | q | enc | 嵌入
edge | enc | norm |
edge | norm | idx | 添加
edge | idx | topk | 搜索
edge | topk | rerank |
edge | rerank | out | 前 10 个
```

## 编码、搜索与截断
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/14-information-retrieval-search/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md

```python
encoder = SentenceTransformer("BAAI/bge-small-en-v1.5")  # 384 维
embeddings = encoder.encode(corpus, normalize_embeddings=True)  # 单位向量
q_emb = encoder.encode([query], normalize_embeddings=True)
sims = (embeddings @ q_emb.T).flatten()  # 点积等于余弦相似度
order = np.argsort(-sims)[:top_k]        # 最佳结果在前
def truncate(vectors, dim):              # Matryoshka 截断
    out = vectors[:, :dim]
    return out / np.linalg.norm(out, axis=1, keepdims=True)  # 重新归一化
emb_256 = truncate(emb, 256)
index = faiss.IndexFlatL2(dimension)     # 精确搜索
index.add(embeddings)
distances, indices = index.search(query_vectors, k=5)
```

## 任务
type: task-table
from: phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/code/main.py, phases/11-llm-engineering/04-embeddings/code/embeddings.py, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

| 任务 | 代码 |
|---|---|
| 截断一个向量 | `truncate_matryoshka(vec, 64)` |
| 向量二值化 | `binarize(vec)` |
| 按汉明距离搜索 | `engine.index.search(query_vec, top_k=5, metric="hamming")` |
| 融合稠密与稀疏排名 | `rrf_fuse([dense_ranked[:5], sparse_scores[:5]])` |
| 加载 BGE-M3 | `BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)` |
| 执行类比 | `analogy(vocab, W, "man", "king", "woman")` |
| 获取未见词的向量 | `fasttext_vector(word, ngram_table)` |
| 在 MTEB 任务上评估 | `evaluation.run(encoder, output_folder="./mteb-results")` |

## 相似度公式
type: concepts
from: phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/11-llm-engineering/04-embeddings/code/embeddings.py, phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/code/main.py

- **余弦相似度**：$\cos(a, b) = \frac{a \cdot b}{\lVert a \rVert \, \lVert b \rVert}$。范围 -1 至 1，忽略长度。
- **余弦距离**：$1 - \cos(a, b)$，范围 0 至 2。
- **点积**：$\sum_i a_i b_i$，单位向量的点积等于余弦相似度。
- **L2**：$\sqrt{\sum_i (a_i - b_i)^2}$，越小越接近。
- **单位向量**：$\lVert a - b \rVert^2 = 2 - 2 \cos(a, b)$。
- **汉明距离**：二值化后不同比特的数量。
- **MaxSim**：为每个查询 token 取最匹配的文档 token，再求和。
- **RRF**：对各排名求和 $\sum \frac{1}{k + \text{rank} + 1}$，rank 从 0 开始。

## HNSW 搜索
type: flow
from: phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md

1. **构建**：将各向量放入多层图，连接近似邻居。
2. **顶层**：稀疏，以长边连接相距较远的簇。
3. **底层**：稠密，包含全部向量，以短边连接。
4. **进入**：查询从顶层开始。
5. **下降**：贪心移动到更近节点，再下降一层。
6. **返回**：以 $O(\log n)$ 而非 $O(n)$ 返回近似 top-k。
7. **成本**：通常召回率为 95% 至 99%，千万向量下为毫秒级。

## 选择索引
type: command-table
from: phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/02-ml-fundamentals/06-knn-and-distances/docs/zh.md

| 命令 | 作用 |
|---|---|
| `IndexFlatIP` | 精确内积，单位向量时等于余弦相似度，约 100k 向量 |
| `IndexFlatL2` | 精确 L2，无需训练，最多约 1M 向量 |
| `IndexIVFFlat` | K 个单元，只搜索最近几个，需要训练，约 10M |
| `IndexIVFPQ` | IVF 加乘积量化，适合 100M 及以上 |
| `IndexHNSW` | 图索引，大量查询时最快，索引较大 |
| LSH | 随机哈希投影，用于近重复检测 |
| KD 树、球树 | 精确搜索，仅适合低维与中维 |

## 大小与压缩
type: concepts
from: phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md

- **float32，1536 维**：每个向量 6,144 字节，千万向量约 61 GB。
- **3,072 维**：全精度时每个向量 12 KB。
- **二值化**：每个向量 192 字节，缩小 32 倍，损失约 5% 至 10% 召回率。
- **重评分**：先二值检索，再对前 1000 个结果用全精度评分。
- **Matryoshka，1536 截至 256**：存储减少 6 倍，损失约 3% 至 5%。
- **安全截断**：1,536 截至 256 通常安全，截至 64 则不安全。

## 代码默认值
type: defaults
from: phases/11-llm-engineering/04-embeddings/code/embeddings.py, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/code/main.py, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `chunk_size` | 200 | `chunk_text` 每块的单词数 |
| `overlap` | 50 | 两块共享的单词数 |
| `top_k` | 5 | 每次搜索的结果数 |
| `metric` | `"cosine"` | 也支持 dot、euclidean、hamming |
| RRF `k` | 60 | `rrf_fuse` |
| `hash_embed` 维度 | 256 | 演示用哈希嵌入器 |
| `n_min` | 3 | FastText n-gram，`n_max` 为 6 |
| `x_max` | 100 | GloVe 加权，`alpha` 为 0.75 |

## 故障排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/code/main.py, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| bge 召回率低 3 至 5 个百分点 | 缺少查询前缀 | 添加模型卡规定的前缀 |
| 截断向量排名差 | 截断后未重新归一化 | 再除以范数 |
| 截断后召回率下降 | 截得过多，或未做 Matryoshka 训练 | 用自己的评估集验证 |
| 最近邻结果变化 | 混用余弦与 L2 约定 | 与训练时的度量一致 |
| 查询与文档不匹配 | 模型为非对称模型 | 检查模型卡 |
| `cosine: dim mismatch` | 向量维度不同 | 两侧使用相同模型与维度 |
| 长文档匹配不到内容 | 单向量平均了全部主题 | 按 256 至 512 token 分块，重叠 50 |
| 未见词没有向量 | Word2Vec 和 GloVe 无回退机制 | 使用 FastText n-gram |

## 缩略语
type: glossary
from: phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md

- **ANN**：近似最近邻，用少量精度损失换取大幅加速。
- **HNSW**：分层可导航小世界，多层图索引。
- **IVF**：倒排文件索引，只搜索少量簇。
- **PQ**：乘积量化，在压缩空间中搜索。
- **LSH**：局部敏感哈希，使用随机哈希投影。
- **MTEB**：大规模文本嵌入基准，最初 56 项任务，v2 超过 100 项。
- **BEIR**：18 项零样本检索任务。
- **OOV**：词表外，训练时未出现的词。

## 问答
type: qa
from: phases/11-llm-engineering/04-embeddings/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense/docs/zh.md, phases/05-nlp-foundations-to-advanced/14-information-retrieval-search/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md

- **余弦还是点积？** 对 L2 归一化向量，两者没有区别。
- **为何使用 ANN？** 对 1M 个 1536 维向量暴力搜索，每次查询需要约 15 亿次乘加。
- **为何重排？** 交叉编码器联合读取查询与文档，较慢但更准确。
- **为何用 RRF 而非分数相加？** BM25 无界，余弦范围为 -1 至 1，排名才可比较。
- **RAG 检索器看哪个指标？** Recall@k，没有正确段落就没有答案。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/zh.md, phases/04-computer-vision/20-image-retrieval-metric/docs/zh.md, phases/05-nlp-foundations-to-advanced/14-information-retrieval-search/docs/zh.md, phases/11-llm-engineering/04-embeddings/docs/zh.md

- 始终设置 `normalize_embeddings=True`。
- 使用自己的查询做基准，排行榜名次不够。
- 仅当模型在自己的领域提升超过 3 个百分点时才替换。
- 并排报告 recall@1、@5 和 @10。
- 衡量 p99 延迟，MTEB 分数不会体现延迟。
- 对失败查询比较稀疏与稠密检索排名。
