# 词袋、TF-IDF 与文本表示

> 先数数，再思考。在定义清晰的任务上，到 2026 年 TF-IDF 仍然能打赢 embedding。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 01（文本处理）、Phase 2 · 02（从零实现线性回归）
**预计时间：** ~75 分钟

## 问题背景

模型要的是数字，你手上是字符串。

每一条 NLP 流水线都得回答同一个问题：怎么把一段变长的 token 流，变成分类器能消费的定长向量？这个领域最早落地的答案，是最笨却管用的那个——数词，做成向量。

这个向量扛起的生产级 NLP，比任何 embedding 模型都多。垃圾邮件过滤、主题分类、日志异常检测、搜索排序（BM25 之前）、第一波情感分析、学术 NLP 基准测试的头十年。到 2026 年，做窄分类任务时从业者还是先抓它。它快、可解释，而且在"词是否出现"才是关键的任务上，往往和一个 4 亿参数的 embedding 模型难分高下。

这节课从零构建词袋、再到 TF-IDF。然后展示 scikit-learn 三行代码做同样的事。最后点出那个会逼你转向 embedding 的翻车场景。

## 核心概念

**词袋（Bag of Words，BoW）** 扔掉顺序。对每篇文档，数一数词表里每个词出现了多少次。向量长度就是词表大小，第 `i` 位是第 `i` 个词的计数。

**TF-IDF** 给 BoW 重新加权。一个在每篇文档里都出现的词没有信息量，把它的权重调小。一个在全语料里罕见、却在某一篇里频繁出现的词是信号，把它的权重调大。

```
TF-IDF(w, d) = TF(w, d) * IDF(w)
             = count(w in d) / |d| * log(N / df(w))
```

其中 `TF` 是词在该文档里的词频，`df` 是文档频率（多少篇文档含这个词），`N` 是文档总数。那个 `log` 把无处不在的词的权重压在有界范围内。

关键性质：两者都产出坐标轴可解释的稀疏向量。你能看一个训练好的分类器的权重，读出哪些词把文档推向哪个类别。换成 768 维的 BERT embedding，你做不到这一点。

```figure
bow-tfidf
```

## 动手构建

### 第 1 步：构建词表

```python
def build_vocab(docs):
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    return vocab
```

输入：分好词的文档列表（任何词级分词器都行；本课的 `code/main.py` 用了一个简化的小写变体）。输出：`{word: index}` 字典。稳定的插入顺序意味着词索引 0 是第一篇文档里第一个见到的词。约定各家不同，scikit-learn 按字母序排。

### 第 2 步：词袋

```python
def bag_of_words(docs, vocab):
    matrix = [[0] * len(vocab) for _ in docs]
    for i, doc in enumerate(docs):
        for token in doc:
            if token in vocab:
                matrix[i][vocab[token]] += 1
    return matrix
```

```python
>>> docs = [["cat", "sat", "on", "mat"], ["cat", "cat", "ran"]]
>>> vocab = build_vocab(docs)
>>> bag_of_words(docs, vocab)
[[1, 1, 1, 1, 0], [2, 0, 0, 0, 1]]
```

行是文档，列是词表索引。`[i][j]` 项是"词 `j` 在文档 `i` 里出现了几次"。文档 1 里 `cat` 出现两次，因为它确实出现了两次。文档 0 里 `ran` 出现零次，因为它确实没出现。

### 第 3 步：词频与文档频率

```python
import math


def term_frequency(doc_bow, doc_length):
    return [c / doc_length if doc_length else 0 for c in doc_bow]


def document_frequency(bow_matrix):
    df = [0] * len(bow_matrix[0])
    for row in bow_matrix:
        for j, count in enumerate(row):
            if count > 0:
                df[j] += 1
    return df


def inverse_document_frequency(df, n_docs):
    return [math.log((n_docs + 1) / (d + 1)) + 1 for d in df]
```

两个值得点名的平滑技巧。`(n+1)/(d+1)` 避免了 `log(x/0)`。末尾的 `+1` 保证一个出现在每篇文档里的词 IDF 仍是 1（而非 0），和 scikit-learn 的默认行为一致。别的实现用原始的 `log(N/df)`。两者都行，平滑版更友好。

### 第 4 步：TF-IDF

```python
def tfidf(bow_matrix):
    n_docs = len(bow_matrix)
    df = document_frequency(bow_matrix)
    idf = inverse_document_frequency(df, n_docs)
    out = []
    for row in bow_matrix:
        length = sum(row)
        tf = term_frequency(row, length)
        out.append([tf_j * idf_j for tf_j, idf_j in zip(tf, idf)])
    return out
```

```python
>>> docs = [
...     ["the", "cat", "sat"],
...     ["the", "dog", "sat"],
...     ["the", "cat", "ran"],
... ]
>>> vocab = build_vocab(docs)
>>> bow = bag_of_words(docs, vocab)
>>> tfidf(bow)
```

三篇文档，五个词表词（`the`、`cat`、`sat`、`dog`、`ran`）。`the` 三篇都出现，所以 IDF 低。`dog` 只在一篇里出现，所以 IDF 高。向量是稀疏的（大部分项很小），有区分度的词冒出来。

### 第 5 步：对行做 L2 归一化

```python
def l2_normalize(matrix):
    out = []
    for row in matrix:
        norm = math.sqrt(sum(x * x for x in row))
        out.append([x / norm if norm else 0 for x in row])
    return out
```

不归一化的话，更长的文档会得到更大的向量，进而主导相似度分数。L2 归一化把每篇文档都放到单位超球面上。这样行与行之间的余弦相似度就只是一次点积。

## 实际使用

scikit-learn 自带生产版本。

```python
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

docs = ["the cat sat on the mat", "the dog sat on the mat", "the cat ran"]

bow_vectorizer = CountVectorizer()
bow = bow_vectorizer.fit_transform(docs)
print(bow_vectorizer.get_feature_names_out())
print(bow.toarray())

tfidf_vectorizer = TfidfVectorizer()
tfidf = tfidf_vectorizer.fit_transform(docs)
print(tfidf.toarray().round(3))
```

`CountVectorizer` 一次调用里完成分词、建词表、词袋。`TfidfVectorizer` 再加上 IDF 加权和 L2 归一化。两者都返回稀疏矩阵。10 万篇文档时，稠密版本塞不进内存；在分类器要求稠密之前，一直保持稀疏。

会改变一切的旋钮：

| 参数 | 效果 |
|-----|--------|
| `ngram_range=(1, 2)` | 纳入二元组（bigram）。通常能提升分类。 |
| `min_df=2` | 丢掉出现在少于 2 篇文档里的词。在噪声数据上修剪词表。 |
| `max_df=0.95` | 丢掉出现在超过 95% 文档里的词。不靠硬编码列表就近似去掉停用词。 |
| `stop_words="english"` | scikit-learn 内置的英语停用词表。看任务而定——情感分析**不该**丢掉否定词。 |
| `sublinear_tf=True` | 用 `1 + log(tf)` 代替原始 `tf`。当某个词在一篇文档里重复很多次时有帮助。 |

### TF-IDF 至今仍占上风的场景（截至 2026 年）

- 垃圾邮件检测、主题打标、日志异常标记。词是否出现才是关键，语义细微差别不重要。
- 低数据场景（几百个标注样本）。TF-IDF 加逻辑回归没有预训练成本。
- 任何看重延迟的地方。TF-IDF 加线性模型在微秒级出结果。把一篇文档过一遍 transformer 做 embedding 要 10-100ms。
- 必须解释自身预测的系统。看分类器的系数，排在最前的正向词就是理由。

### TF-IDF 翻车的场景

语义盲区翻车。看这两篇文档：

- "The movie was not good at all."
- "The movie was excellent."

一篇是负面评价，一篇是正面。它们的 TF-IDF 重叠恰好是 `{the, movie, was}`。词袋分类器只能死记硬背：`good` 附近的 `not` 会翻转标签。数据够多它能学会，但永远不如一个理解句法的模型那么从容。

另一个翻车：推理时遇到词表外的词。一个在 IMDb 评论上训练的 BoW 模型，碰到训练里从没出现过的 `Zoomer-approved` 这个 token，完全不知道该怎么办。子词 embedding（第 04 课）能处理这个，TF-IDF 不行。

### 混合方案：TF-IDF 加权的 embedding

2026 年做中等数据量分类时务实的默认选择：把 TF-IDF 权重当作词 embedding 上的注意力。

```python
def tfidf_weighted_embedding(doc, tfidf_scores, embedding_table, dim):
    vec = [0.0] * dim
    total_weight = 0.0
    for token in doc:
        if token not in embedding_table or token not in tfidf_scores:
            continue
        weight = tfidf_scores[token]
        emb = embedding_table[token]
        for i in range(dim):
            vec[i] += weight * emb[i]
        total_weight += weight
    if total_weight == 0:
        return vec
    return [v / total_weight for v in vec]
```

你从 embedding 拿到语义能力，从 TF-IDF 拿到对罕见词的强调。分类器在池化后的向量上训练。在约 5 万标注样本以下的情感、主题、意图分类任务上，它的表现胜过单独用任何一种。

## 拿去用

存为 `outputs/prompt-vectorization-picker.md`：

```markdown
---
name: vectorization-picker
description: Given a text-classification task, recommend BoW, TF-IDF, embeddings, or a hybrid.
phase: 5
lesson: 02
---

You recommend a text-vectorization strategy. Given a task description, output:

1. Representation (BoW, TF-IDF, transformer embeddings, or a hybrid). Explain why in one sentence.
2. Specific vectorizer configuration. Name the library. Quote the arguments (`ngram_range`, `min_df`, `max_df`, `sublinear_tf`, `stop_words`).
3. One failure mode to test before shipping.

Refuse to recommend embeddings when the user has under 500 labeled examples unless they show evidence of semantic failure in a TF-IDF baseline. Refuse to remove stopwords for sentiment analysis (negations carry signal). Flag class imbalance as needing more than a vectorizer change.

Example input: "Classifying 30k customer support tickets into 12 categories. Most tickets are 2-3 sentences. English only. Need explainability for audit logs."

Example output:

- Representation: TF-IDF. 30k examples is not small; explainability requirement rules out dense embeddings.
- Config: `TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_df=0.95, sublinear_tf=True, stop_words=None)`. Keep stopwords because category keywords sometimes are stopwords ("not working" vs "working").
- Failure to test: verify `min_df=3` does not drop rare category keywords. Run `get_feature_names_out` filtered by class and eyeball.
```

## 练习

1. **简单。** 在 L2 归一化后的 TF-IDF 输出上实现 `cosine_similarity(doc_vec_a, doc_vec_b)`。验证完全相同的文档得 1.0，词表不相交的文档得 0.0。
2. **中等。** 给 `bag_of_words` 加上 `n-gram` 支持。参数 `n` 产出对 `n`-gram 的计数。测试 `n=2` 作用于 `["the", "cat", "sat"]` 时，会为 `["the cat", "cat sat"]` 产出二元组计数。
3. **困难。** 用 GloVe 100 维向量（下载一次并缓存）搭出上面那个 TF-IDF 加权 embedding 混合方案。在 20 Newsgroups 数据集上，把它的分类准确率和纯 TF-IDF、纯均值池化 embedding 做对比。报告各自在哪类场景胜出。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| BoW | 词频向量 | 词表里各词在一篇文档中的计数。扔掉顺序。 |
| TF | 词频 | 一个词在文档里的计数，可选地按文档长度归一化。 |
| DF | 文档频率 | 至少包含该词一次的文档数。 |
| IDF | 逆文档频率 | 平滑后的 `log(N / df)`。给到处都出现的词降权。 |
| 稀疏向量 | 大部分是零 | 词表通常 1 万到 10 万个词；对任一给定文档而言，大多数都不出现。 |
| 余弦相似度 | 向量夹角 | L2 归一化向量的点积。1 表示完全相同，0 表示正交。 |

## 延伸阅读

- [scikit-learn — feature extraction from text](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction) —— 权威 API 参考，外加对每个旋钮的说明。
- [Salton, G., & Buckley, C. (1988). Term-weighting approaches in automatic text retrieval](https://www.sciencedirect.com/science/article/pii/0306457388900210) —— 让 TF-IDF 当了十年默认选择的那篇论文。
- ["Why TF-IDF Still Beats Embeddings" — Ashfaque Thonikkadavan (Medium)](https://medium.com/@cmtwskb/why-tf-idf-still-beats-embeddings-ad85c123e1b2) —— 2026 年视角：老方法何时胜出、为什么胜出。
