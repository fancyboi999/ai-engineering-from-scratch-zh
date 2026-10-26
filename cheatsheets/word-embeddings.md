---
id: word-embeddings
title: Word2Vec、GloVe 与 FastText
code: WG
subtitle: 统计词频、用 TF-IDF 加权、训练稠密向量并将罕见词拆为子词。使用课程中的 Python。
hue: 25
sources: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword
source_hash: 1707ae389b02c48a
---

## 带负采样的 Skip-gram
type: architecture
from: phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md

```arch
node | in | 1,1 | one-hot(center) | 词表大小 | client
node | w | 2,1 | W | 中心词表，保留 | store
node | h | 3,1 | 隐藏层 | d 维，无非线性 | process
node | wp | 2,2 | W' | 上下文词表 | store
node | out | 4,1 | sigmoid 分数 | 1 个正样本，k 个负样本 | model
edge | in | w |
edge | w | h | 查表
edge | h | out | 点积
edge | wp | out | u_pos, u_negs
```

## 一次训练步骤：train_pair
type: flow
from: phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/code/main.py, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md

1. **词对**：`skipgram_pairs` 输出 `window` 内的每个 (center, context) 对。
2. **负样本**：随机抽取 `k_neg` 个标识，排除中心词和上下文词标识。
3. **分数**：`sigmoid(v_c @ u_pos)` 应接近 1，`sigmoid(u_negs @ v_c)` 接近 0。
4. **误差**：`pos_err` 为正样本分数减 1.0，`neg_errs` 为负样本分数。
5. **更新 W'**：每个上下文行减去 `lr` 乘误差乘 `v_c`。
6. **更新 W**：中心词行减去 `lr * grad_center`。

## 代码任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/code/main.py, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

| 任务 | 代码 |
|---|---|
| 计数矩阵 | `bag_of_words(docs, vocab)` |
| 单位长度 TF-IDF 行 | `l2_normalize(tfidf(bow))` |
| 从零训练 skip-gram | `train(docs, dim=16, window=2, k_neg=5, epochs=100, lr=0.05, seed=0)` |
| 类比查询 | `analogy(vocab, W, "man", "king", "woman")` |
| 共现计数 | `build_cooccurrence(docs, window=5)` |
| 训练 GloVe | `glove_train(vocab, pair_counts, dim=16, epochs=100, lr=0.05, x_max=100, alpha=0.75, seed=0)` |
| FastText n-gram | `char_ngrams(word, n_min=3, n_max=6)` |
| 学习并应用 BPE | `apply_bpe("lowest", learn_bpe(corpus, k_merges=10))` |

## 生产环境中的库
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

```python
tfidf = TfidfVectorizer().fit_transform(docs)  # IDF 权重加 L2 归一化
model = Word2Vec(sentences, vector_size=100, window=5,
                 min_count=1, sg=1, negative=5, workers=4, epochs=30)
model.wv.most_similar("cat", topn=3)           # 最近邻
fasttext.util.download_model("en", if_exists="ignore")
ft = fasttext.load_model("cc.en.300.bin")
ft.get_word_vector("zoomerapproved")           # 词表外单词仍能获得向量
tok = AutoTokenizer.from_pretrained("gpt2")
tok.tokenize("unbelievably tokenized")         # Ġ 标记词边界
```

## 公式
type: concepts
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

- **TF-IDF**：$\frac{\mathrm{count}(w \text{ in } d)}{|d|} \cdot \log\frac{N}{\mathrm{df}(w)}$
- **平滑 IDF**：$\log\frac{n+1}{d+1} + 1$。每篇文档都出现的词仍保留 IDF 1。
- **余弦**：L2 归一化行的点积。1 表示相同，0 表示正交。
- **GloVe 拟合**：$v_i \cdot v_j + b_i + b_j \approx \log X_{ij}$
- **GloVe 权重**：低于 `x_max` 时为 $f(x) = (x / x_{max})^{\alpha}$，否则为 1.0。
- **GloVe 输出**：`W + W_tilde`，两表之和胜过单表。
- **FastText 向量**：该词所有字符 n-gram 向量的和。
- **BPE 词表**：`k` 次合并后有 `k + 256` 个 token。

## 向量化器参数
type: command-table
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md

| 命令 | 作用 |
|---|---|
| `ngram_range=(1, 2)` | 加入二元词组，通常有助于分类 |
| `min_df=2` | 丢弃出现于少于 2 篇文档的词 |
| `max_df=0.95` | 丢弃出现于超过 95% 文档的词 |
| `stop_words="english"` | 内置停用词表，不适用于情感分析 |
| `sublinear_tf=True` | 重复词项使用 `1 + log(tf)` |
| `get_feature_names_out` | 列出词表列 |

## 默认值与数字
type: defaults
from: phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| gensim `vector_size` | 100 | 稠密向量通常为 100-300 维 |
| gensim `window` | 5 | 从零实现代码使用 2 |
| `negative`, `k_neg` | 5 | 每个正样本对的负样本数 |
| `sg` | 1 | Skip-gram，更适合罕见词 |
| 初始化标准差 | 0.1 | `rng.normal(0, 0.1, size=(vocab_size, dim))` |
| GloVe `x_max` | 100 | 达到或高于该值的词对权重为 1.0 |
| GloVe `alpha` | 0.75 | 降低高频词对的权重 |
| FastText n-gram 长度 | 3 至 6 | 字符数，带 `<` 与 `>` 标记 |

## 故障排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| "not good" 与 "excellent" 看起来相似 | BoW 丢失词序 | 加入二元词组或使用嵌入 |
| `Zoomer-approved` 没有向量 | 对 BoW 与 Word2Vec 而言是词表外单词 | 使用 FastText 或 BPE |
| `bank` 的两个词义共用一个向量 | 静态嵌入 | 使用上下文嵌入 |
| 长文档主导相似度 | 行未归一化 | 应用 `l2_normalize` |
| 否定信号丢失 | 移除了停用词 | 情感分析保留停用词 |
| 范数低于 0.01 或高于 100 | 训练错误 | 标记该模型 |
| 生产输出悄然出错 | 分词器与模型不匹配 | 使用模型配套分词器 |
| 100k 文档稠密矩阵装不下 | 过早转为稠密形式 | 保持稀疏 |

## 缩写
type: glossary
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

- **BoW**：词袋。统计词表中各词次数，丢失顺序。
- **TF / DF**：文档内词频，以及包含该词的文档数。
- **IDF**：逆文档频率，降低处处出现的词的权重。
- **CBOW**：连续词袋，从上下文预测中心词。
- **Skip-gram**：从中心词预测上下文，默认选择。
- **GloVe**：Global Vectors，分解共现矩阵。
- **OOV**：词表外。Word2Vec 与 GloVe 无法处理。
- **BPE**：字节对编码，反复合并出现最多的相邻对。

## 问答
type: qa
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

- **TF-IDF 何时仍占优？** 垃圾邮件、主题、日志、小数据、严格延迟、可解释输出。
- **为何使用负采样？** 对 100k 词做 softmax 太慢，用二分类任务替代。
- **类比为何有效？** `(king - man)` 包含“王室”方向，将其加到 `woman` 上。
- **GloVe 还是 FastText？** 拼写错误、新词和丰富词形变化使用 FastText。
- **微调时要训练分词器吗？** 不要。使用预训练模型的分词器。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/zh.md, phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/zh.md

- 标注样本少于 500 时，从 TF-IDF 基线开始。
- 标签少于约 50k 时，尝试 TF-IDF 加权嵌入。
- 不要仅凭类比准确率评价嵌入。加入下游测试。
- 下载预训练向量。你几乎无需自己训练 Word2Vec。
- GPT、BERT 与 T5 分词器学习 30k-100k 次合并。
