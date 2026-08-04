# GloVe、FastText 与子词嵌入

> Word2Vec 给每个词训一个 embedding。GloVe 直接分解共现矩阵。FastText 嵌入词的零件。BPE 搭起了通往 transformer 的桥。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 03（从零实现 Word2Vec）
**预计时间：** ~45 分钟

## 问题背景

Word2Vec 留下了两个悬而未决的问题。

第一，当时有一条平行的研究路线，是直接分解共现矩阵（LSA、HAL），而不是做在线的 skip-gram 更新。Word2Vec 的迭代方法是本质上更好，还是两种方法处理计数的方式不同造成的假象？**GloVe** 回答了这个问题：用一个精心挑选的损失做矩阵分解，能追平甚至打赢 Word2Vec，训练成本还更低。

第二，两种方法对从没见过的词都讲不出故事。`Zoomer-approved`、`dogecoin`、上周才造出来的任何专有名词、罕见词根的每一种屈折形式。**FastText** 靠嵌入字符 n-gram 修了这个：一个词是它各部分（包括词素）之和，所以哪怕是词表外的词也能得到一个合理的向量。

第三，transformer 一来，问题又变了。词级词表上限大概一百万条，真实语言比这开放得多。**字节对编码（BPE）**及其同类解决了这个：学一个由高频子词单元组成的词表，覆盖一切。每个现代 LLM 的每个现代分词器，都是子词分词器。

这节课把三者都走一遍，再讲清楚什么时候该抓哪个。

## 核心概念

**GloVe（Global Vectors）。** 构建词-词共现矩阵 `X`，其中 `X[i][j]` 是词 `j` 出现在词 `i` 上下文里的频次。训练向量，使 `v_i · v_j + b_i + b_j ≈ log(X[i][j])`。给损失加权，让高频对不至于主导。完事。

**FastText。** 一个词是它字符 n-gram 之和，再加上词本身。`where` 拆成 `<wh, whe, her, ere, re>, <where>`。词向量是这些零件向量之和。像 Word2Vec 一样训练。好处：没见过的词（`whereupon`）能由已知 n-gram 拼出来。

**BPE（字节对编码）。** 从单个字节（或字符）的词表开始。数语料里每一对相邻 token。把出现最频繁的那对合并成一个新 token。重复 `k` 次。结果是一个 `k + 256` 个 token 的词表，高频序列（`ing`、`tion`、`the`）是单个 token，罕见词被拆成熟悉的零件。每个句子都能分出点什么来。

```figure
n5-subword-merge
```

## 动手构建

### GloVe：分解共现矩阵

```python
import numpy as np
from collections import Counter


def build_cooccurrence(docs, window=5):
    pair_counts = Counter()
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    for doc in docs:
        indexed = [vocab[t] for t in doc]
        for i, center in enumerate(indexed):
            for j in range(max(0, i - window), min(len(indexed), i + window + 1)):
                if i != j:
                    distance = abs(i - j)
                    pair_counts[(center, indexed[j])] += 1.0 / distance
    return vocab, pair_counts


def glove_train(vocab, pair_counts, dim=16, epochs=100, lr=0.05, x_max=100, alpha=0.75, seed=0):
    n = len(vocab)
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(n, dim))
    W_tilde = rng.normal(0, 0.1, size=(n, dim))
    b = np.zeros(n)
    b_tilde = np.zeros(n)

    for epoch in range(epochs):
        for (i, j), x_ij in pair_counts.items():
            weight = (x_ij / x_max) ** alpha if x_ij < x_max else 1.0
            diff = W[i] @ W_tilde[j] + b[i] + b_tilde[j] - np.log(x_ij)
            coef = weight * diff

            grad_W_i = coef * W_tilde[j]
            grad_W_tilde_j = coef * W[i]
            W[i] -= lr * grad_W_i
            W_tilde[j] -= lr * grad_W_tilde_j
            b[i] -= lr * coef
            b_tilde[j] -= lr * coef

    return W + W_tilde
```

两个值得点名的活动零件。加权函数 `f(x) = (x/x_max)^alpha` 给非常高频的对（比如 `(the, and)`）降权，让它们不主导损失。最终 embedding 是 `W`（中心）和 `W_tilde`（上下文）两张表之和。把两者相加是一个已发表的技巧，往往比只用其中一个表现更好。

### FastText：感知子词的 embedding

```python
def char_ngrams(word, n_min=3, n_max=6):
    wrapped = f"<{word}>"
    grams = {wrapped}
    for n in range(n_min, n_max + 1):
        for i in range(len(wrapped) - n + 1):
            grams.add(wrapped[i:i + n])
    return grams
```

```python
>>> char_ngrams("where")
{'<where>', '<wh', 'whe', 'her', 'ere', 're>', '<whe', 'wher', 'here', 'ere>', '<wher', 'where', 'here>'}
```

每个词由它的 n-gram 集合（通常 3 到 6 个字符）表示。词 embedding 是它各 n-gram embedding 之和。做 skip-gram 训练时，把这个塞到 Word2Vec 原本用单个向量的地方。

```python
def fasttext_vector(word, ngram_table):
    grams = char_ngrams(word)
    vecs = [ngram_table[g] for g in grams if g in ngram_table]
    if not vecs:
        return None
    return np.sum(vecs, axis=0)
```

对一个没见过的词，只要它的部分 n-gram 是已知的，你照样能得到向量。`whereupon` 和 `where` 共享 `<wh`、`her`、`ere`、`<where`，所以两者落得很近。

### BPE：学出来的子词词表

```python
def learn_bpe(corpus, k_merges):
    vocab = Counter()
    for word, freq in corpus.items():
        tokens = tuple(word) + ("</w>",)
        vocab[tokens] = freq

    merges = []
    for _ in range(k_merges):
        pair_freq = Counter()
        for tokens, freq in vocab.items():
            for a, b in zip(tokens, tokens[1:]):
                pair_freq[(a, b)] += freq
        if not pair_freq:
            break
        best = pair_freq.most_common(1)[0][0]
        merges.append(best)

        new_vocab = Counter()
        for tokens, freq in vocab.items():
            new_tokens = []
            i = 0
            while i < len(tokens):
                if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == best:
                    new_tokens.append(tokens[i] + tokens[i + 1])
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            new_vocab[tuple(new_tokens)] = freq
        vocab = new_vocab
    return merges


def apply_bpe(word, merges):
    tokens = list(word) + ["</w>"]
    for a, b in merges:
        new_tokens = []
        i = 0
        while i < len(tokens):
            if i + 1 < len(tokens) and tokens[i] == a and tokens[i + 1] == b:
                new_tokens.append(a + b)
                i += 2
            else:
                new_tokens.append(tokens[i])
                i += 1
        tokens = new_tokens
    return tokens
```

```python
>>> corpus = Counter({"low": 5, "lower": 2, "newest": 6, "widest": 3})
>>> merges = learn_bpe(corpus, k_merges=10)
>>> apply_bpe("lowest", merges)
['low', 'est</w>']
```

第一轮合并最常见的相邻对。跑够多轮后，高频子串（`low`、`est`、`tion`）变成单个 token，罕见词被干净地拆开。

真实的 GPT / BERT / T5 分词器会学 3 万到 10 万次合并。结果是：任何文本都分成长度有界的已知 ID 序列，永远不会有 OOV。

## 实际使用

实践中你很少自己训这些，而是加载预训练 checkpoint。

```python
import fasttext.util
fasttext.util.download_model("en", if_exists="ignore")
ft = fasttext.load_model("cc.en.300.bin")
print(ft.get_word_vector("whereupon").shape)
print(ft.get_word_vector("zoomerapproved").shape)
```

transformer 时代的 BPE 式子词分词：

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
print(tok.tokenize("unbelievably tokenized"))
```

```
['un', 'bel', 'iev', 'ably', 'Ġtoken', 'ized']
```

`Ġ` 前缀标记词边界（GPT-2 的约定）。每个现代分词器要么是 BPE 变体、WordPiece（BERT），要么是 SentencePiece（T5、LLaMA）。

### 该选哪个

| 场景 | 选择 |
|-----------|------|
| 预训练通用词向量，不需要容忍 OOV | GloVe 300d |
| 预训练通用词向量，必须处理拼写错误 / 新造词 / 形态丰富的语言 | FastText |
| 任何要进 transformer 的东西（训练或推理） | 模型自带的那个分词器。永远别换。 |
| 从零训练你自己的语言模型 | 先在你的语料上训一个 BPE 或 SentencePiece 分词器 |
| 用线性模型做生产级文本分类 | 还是 TF-IDF。见第 02 课。 |

## 拿去用

存为 `outputs/skill-embeddings-picker.md`：

```markdown
---
name: tokenizer-picker
description: Pick a tokenization approach for a new language model or text pipeline.
version: 1.0.0
phase: 5
lesson: 04
tags: [nlp, tokenization, embeddings]
---

Given a task and dataset description, you output:

1. Tokenization strategy (word-level, BPE, WordPiece, SentencePiece, byte-level). One-sentence reason.
2. Vocabulary size target (e.g., 32k for an English-only LM, 64k-100k for multilingual).
3. Library call with the exact training command. Name the library. Quote the arguments.
4. One reproducibility pitfall. Tokenizer-model mismatch is the single most common silent production bug; call out which pair must be used together.

Refuse to recommend training a custom tokenizer when the user is fine-tuning a pretrained LLM. Refuse to recommend word-level tokenization for any model targeting production inference. Flag non-English / multi-script corpora as needing SentencePiece with byte fallback.
```

## 练习

1. **简单。** 跑一下 `char_ngrams("playing")` 和 `char_ngrams("played")`。算这两个 n-gram 集合的 Jaccard 重叠度。你应该能看到大量共享零件（`pla`、`lay`、`play`），这正是 FastText 能在形态变体之间良好迁移的原因。
2. **中等。** 扩展 `learn_bpe`，跟踪词表的增长。把"每语料字符的 token 数"画成"合并次数"的函数。你应该看到开头快速压缩，然后渐近到每 token 约 2-3 个字符。
3. **困难。** 在莎士比亚全集上训练一个 1k 次合并的 BPE。对比常见词和罕见专有名词的分词结果。测一测处理前后每词的平均 token 数。把让你意外的地方写下来。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 共现矩阵 | 词-词频率表 | `X[i][j]` = 词 `j` 出现在词 `i` 周围窗口里的频次。 |
| 子词（Subword） | 词的一块 | 一个字符 n-gram（FastText）或学出来的 token（BPE/WordPiece/SentencePiece）。 |
| BPE | 字节对编码 | 迭代合并最高频的相邻对，直到词表达到目标大小。 |
| OOV | 词表外 | 模型从没见过的词。Word2Vec/GloVe 翻车，FastText 和 BPE 能处理。 |
| 字节级 BPE | 在原始字节上的 BPE | GPT-2 的方案。词表从 256 个字节开始，所以永远不会有 OOV。 |

## 延伸阅读

- [Pennington, Socher, Manning (2014). GloVe: Global Vectors for Word Representation](https://nlp.stanford.edu/pubs/glove.pdf) —— GloVe 论文，七页，至今仍是损失推导讲得最好的一篇。
- [Bojanowski et al. (2017). Enriching Word Vectors with Subword Information](https://arxiv.org/abs/1607.04606) —— FastText。
- [Sennrich, Haddow, Birch (2016). Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909) —— 把 BPE 引入现代 NLP 的那篇论文。
- [Hugging Face tokenizer summary](https://huggingface.co/docs/transformers/tokenizer_summary) —— BPE、WordPiece、SentencePiece 在实践中究竟差在哪。
