# 词嵌入 —— 从零实现 Word2Vec

> 一个词由它的伙伴定义。把这个想法塞进一个浅层网络去训练，几何结构自己就长出来了。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 02（BoW + TF-IDF）、Phase 3 · 03（从零实现反向传播）
**预计时间：** ~75 分钟

## 问题背景

TF-IDF 知道 `dog` 和 `puppy` 是两个不同的词，却不知道它们意思几乎一样。在 `dog` 上训练的分类器没法泛化到一篇讲 `puppy` 的评论上。你可以靠列同义词来糊弄过去，但碰到罕见词、领域黑话，以及任何你没预料到的语言，它就崩了。

你想要的是这样一种表示：`dog` 和 `puppy` 在空间里落得很近；`king - man + woman` 落在 `queen` 附近；一个在 `dog` 上训练的模型，能把一些信号免费迁移给 `puppy`。

Word2Vec 给了我们这个空间。两层神经网络，万亿 token 级别的训练，2013 年发表。这个架构简单得几乎让人不好意思，结果却重塑了 NLP 整整十年。

## 核心概念

**分布假设**（Firth，1957）："看一个词，要看它结交的伙伴。"如果两个词出现在相似的上下文里，它们大概意思也相似。

Word2Vec 有两种口味，都吃这个想法。

- **Skip-gram。** 给定中心词，预测周围的词。窗口大小为 2 时，`cat -> (the, sat, on)`。
- **CBOW（连续词袋）。** 给定周围的词，预测中心词。`(the, sat, on) -> cat`。

Skip-gram 训练更慢，但对罕见词处理得更好。它成了默认选择。

这个网络只有一个隐藏层，没有非线性。输入是词表上的 one-hot 向量，输出是词表上的 softmax。训练完成后，扔掉输出层。隐藏层的权重就是 embedding。

```
one-hot(center) ── W ──▶ hidden (d-dim) ── W' ──▶ softmax(vocab)
                          ^
                          this is the embedding
```

诀窍在这里：对 10 万个词做 softmax 贵得离谱。Word2Vec 用**负采样**把它变成一个二分类任务——预测"这个上下文词是否出现在这个中心词附近，是还是否"。每个训练对采样少量负（不共现）词，而不是在整个词表上算 softmax。

```figure
word-vector-arithmetic
```

## 动手构建

### 第 1 步：从语料生成训练对

```python
def skipgram_pairs(docs, window=2):
    pairs = []
    for doc in docs:
        for i, center in enumerate(doc):
            for j in range(max(0, i - window), min(len(doc), i + window + 1)):
                if i == j:
                    continue
                pairs.append((center, doc[j]))
    return pairs
```

```python
>>> skipgram_pairs([["the", "cat", "sat", "on", "mat"]], window=2)
[('the', 'cat'), ('the', 'sat'),
 ('cat', 'the'), ('cat', 'sat'), ('cat', 'on'),
 ('sat', 'the'), ('sat', 'cat'), ('sat', 'on'), ('sat', 'mat'),
 ...]
```

窗口内每一对 (center, context) 都是一个正训练样本。

### 第 2 步：embedding 表

两个矩阵。`W` 是中心词 embedding 表（你要留下的那个）。`W'` 是上下文词表（通常丢弃，有时和 `W` 取平均）。

```python
import numpy as np


def init_embeddings(vocab_size, dim, seed=0):
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(vocab_size, dim))
    W_prime = rng.normal(0, 0.1, size=(vocab_size, dim))
    return W, W_prime
```

小幅随机初始化。词表 1 万、维度 100 是接近真实的设置；教学的话，50 词 x 16 维就足以看到几何结构。

### 第 3 步：负采样目标

对每个正对 `(center, context)`，从词表里随机采 `k` 个词作为负样本。训练模型，让点积 `W[center] · W'[context]` 对正样本高、对负样本低。

```python
def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_pair(W, W_prime, center_idx, context_idx, negative_indices, lr):
    v_c = W[center_idx]
    u_pos = W_prime[context_idx]
    u_negs = W_prime[negative_indices]

    pos_score = sigmoid(v_c @ u_pos)
    neg_scores = sigmoid(u_negs @ v_c)

    grad_center = (pos_score - 1) * u_pos
    for i, u in enumerate(u_negs):
        grad_center += neg_scores[i] * u

    W[context_idx] = W[context_idx]
    W_prime[context_idx] -= lr * (pos_score - 1) * v_c
    for i, neg_idx in enumerate(negative_indices):
        W_prime[neg_idx] -= lr * neg_scores[i] * v_c
    W[center_idx] -= lr * grad_center
```

那个魔法公式：正对上的 logistic 损失（想让 sigmoid 接近 1）加上负对上的 logistic 损失（想让 sigmoid 接近 0）。梯度流向两张表。完整推导在原论文里；想让它真正记住，就拿纸笔从头推一遍。

### 第 4 步：在玩具语料上训练

```python
def train(docs, dim=16, window=2, k_neg=5, epochs=100, lr=0.05, seed=0):
    vocab = build_vocab(docs)
    vocab_size = len(vocab)
    rng = np.random.default_rng(seed)
    W, W_prime = init_embeddings(vocab_size, dim, seed=seed)
    pairs = skipgram_pairs(docs, window=window)

    for epoch in range(epochs):
        rng.shuffle(pairs)
        for center, context in pairs:
            c_idx = vocab[center]
            ctx_idx = vocab[context]
            negs = rng.integers(0, vocab_size, size=k_neg)
            negs = [n for n in negs if n != ctx_idx and n != c_idx]
            train_pair(W, W_prime, c_idx, ctx_idx, negs, lr)
    return vocab, W
```

在大语料上跑够多轮之后，共享上下文的词会有相似的中心 embedding。在玩具语料上，你能隐约看到这个效果。在数十亿 token 上，效果就很惊人了。

### 第 5 步：类比戏法

```python
def nearest(vocab, W, target_vec, topk=5, exclude=None):
    exclude = exclude or set()
    inv_vocab = {i: w for w, i in vocab.items()}
    norms = np.linalg.norm(W, axis=1, keepdims=True) + 1e-9
    W_norm = W / norms
    target = target_vec / (np.linalg.norm(target_vec) + 1e-9)
    sims = W_norm @ target
    order = np.argsort(-sims)
    out = []
    for i in order:
        if i in exclude:
            continue
        out.append((inv_vocab[i], float(sims[i])))
        if len(out) == topk:
            break
    return out


def analogy(vocab, W, a, b, c, topk=5):
    v = W[vocab[b]] - W[vocab[a]] + W[vocab[c]]
    return nearest(vocab, W, v, topk=topk, exclude={vocab[a], vocab[b], vocab[c]})
```

在预训练的 300 维 Google News 向量上：

```python
>>> analogy(vocab, W, "man", "king", "woman")
[('queen', 0.71), ('monarch', 0.62), ('princess', 0.59), ...]
```

`king - man + woman = queen`。不是因为模型懂什么是王室，而是因为向量 `(king - man)` 捕捉到了类似"皇家"的东西，把它加到 `woman` 上，就落到了皇家女性那片区域附近。

## 实际使用

从零写 Word2Vec 是为了教学。生产级 NLP 用 `gensim`。

```python
from gensim.models import Word2Vec

sentences = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "ran", "across", "the", "room"],
]

model = Word2Vec(
    sentences,
    vector_size=100,
    window=5,
    min_count=1,
    sg=1,
    negative=5,
    workers=4,
    epochs=30,
)

print(model.wv["cat"])
print(model.wv.most_similar("cat", topn=3))
```

真实工作里，你几乎从不自己训练 Word2Vec，而是下载预训练向量。

- **GloVe** —— 斯坦福的共现矩阵分解方法。有 50d、100d、200d、300d 多个 checkpoint。通用覆盖不错。第 04 课专门讲 GloVe。
- **fastText** —— Facebook 对 Word2Vec 的扩展，把字符 n-gram 也嵌入进来。靠组合子词来处理词表外的词。第 04 课讲。
- **Google News 上的预训练 Word2Vec** —— 300d，300 万词的词表，2013 年发布。至今每天还有人下载。

### Word2Vec 在 2026 年仍占上风的场景

- 轻量的领域专用检索。在笔记本上花一小时在医学摘要上训练，就能得到通用模型抓不到的专门向量。
- 类比式特征工程。`gender_vector = mean(man - woman pairs)`。把它从别的词里减掉，得到一个性别中立的坐标轴。公平性研究里还在用。
- 可解释性。100d 小到可以用 PCA 或 t-SNE 画出来，真的能看到簇成形。
- 任何推理必须在无 GPU 设备上跑的地方。Word2Vec 查表就是取一行。

### Word2Vec 翻车的地方

一词多义这堵墙。`bank` 只有一个向量，`river bank`（河岸）和 `financial bank`（银行）共用它，`table`（电子表格 vs 家具）也共用它。下游分类器从这个向量里区分不出词义。

上下文 embedding（ELMo、BERT，以及之后的每一个 transformer）解决了这个问题：它根据周围上下文，为词的每一次出现产出一个不同的向量。这就是从 Word2Vec 到 BERT 的跨越——从静态到上下文。Phase 7 讲 transformer 那一半。

另一个翻车是词表外问题。如果训练数据里没有 `Zoomer-approved`，Word2Vec 就从没见过它，没有兜底。fastText 用子词组合修了这个（第 04 课）。

## 拿去用

存为 `outputs/skill-embedding-probe.md`：

```markdown
---
name: embedding-probe
description: Inspect a word2vec model. Run analogies, find neighbors, diagnose quality.
version: 1.0.0
phase: 5
lesson: 03
tags: [nlp, embeddings, debugging]
---

You probe trained word embeddings to verify they are working. Given a `gensim.models.KeyedVectors` object and a vocabulary, you run:

1. Three canonical analogy tests. `king : man :: queen : woman`. `paris : france :: tokyo : japan`. `walking : walked :: swimming : ?`. Report the top-1 result and its cosine.
2. Five nearest-neighbor tests on domain-specific words the user supplies. Print top-5 neighbors with cosines.
3. One symmetry check. `similarity(a, b) == similarity(b, a)` to within float precision.
4. One degenerate check. If any embedding has a norm below 0.01 or above 100, the model has a training bug. Flag it.

Refuse to declare a model good on analogy accuracy alone. Analogy benchmarks are gameable and do not transfer to downstream tasks. Recommend intrinsic + downstream evaluation together.
```

## 练习

1. **简单。** 在一个很小的语料（20 句关于猫和狗的话）上跑训练循环。跑 200 轮后，验证 `nearest(vocab, W, W[vocab["cat"]])` 在前 3 名里返回 `dog`。如果没有，就增加轮数或词表。
2. **中等。** 加上高频词下采样。词频高于 `10^-5` 的词，按与其频率成正比的概率从训练对里丢掉。测一测它对罕见词相似度的影响。
3. **困难。** 在 20 Newsgroups 语料上训练一个模型。算出两条偏见坐标轴：`he - she` 和 `doctor - nurse`。把职业词投影到这两条轴上。报告哪些职业的偏见差距最大。这正是公平性研究者会用的那种探针。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 词嵌入（Word embedding） | 词作为向量 | 从上下文学到的稠密、低维（通常 100-300）表示。 |
| Skip-gram | Word2Vec 戏法 | 从中心词预测上下文词。比 CBOW 慢，但对罕见词更好。 |
| 负采样（Negative sampling） | 训练捷径 | 用对 `k` 个随机词的二分类，取代在整个词表上的 softmax。 |
| 静态 embedding | 每个词一个向量 | 不管上下文都是同一个向量。在一词多义上翻车。 |
| 上下文 embedding | 随上下文变化的向量 | 根据周围词，为每一次出现给一个不同的向量。transformer 产出的就是这个。 |
| OOV | 词表外（Out of vocabulary） | 训练里没见过的词。Word2Vec 没法给它们产出向量。 |

## 延伸阅读

- [Mikolov et al. (2013). Distributed Representations of Words and Phrases and their Compositionality](https://arxiv.org/abs/1310.4546) —— 负采样那篇论文。短而好读。
- [Rong, X. (2014). word2vec Parameter Learning Explained](https://arxiv.org/abs/1411.2738) —— 梯度推导得最清楚的一篇，如果你觉得原论文的数学太密的话。
- [gensim Word2Vec tutorial](https://radimrehurek.com/gensim/models/word2vec.html) —— 真正管用的生产训练配置。
