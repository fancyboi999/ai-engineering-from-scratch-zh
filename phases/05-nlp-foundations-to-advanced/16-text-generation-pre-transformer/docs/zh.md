# transformer 之前的文本生成 —— N-gram 语言模型

> 如果一个词出人意料，模型就差。困惑度（perplexity）把"意外"变成一个数。平滑让它保持有限。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 01（文本处理）、Phase 2 · 14（朴素贝叶斯）
**预计时间：** ~45 分钟

## 问题背景

在 transformer 之前、RNN 之前、词嵌入之前，语言模型预测下一个词的方式是数它跟在前 `n-1` 个词后面的频率。数 "the cat" → "sat" 47 次，"the cat" → "jumped" 12 次，"the cat" → "refrigerator" 0 次。归一化得到一个概率分布。

那就是 n-gram 语言模型。从 1980 到 2015 年，它跑遍了每个语音识别器、每个拼写检查器、每个基于短语的机器翻译系统。在你需要便宜的端侧语言建模时，它至今还在跑。

有意思的问题是：对没见过的 n-gram 该怎么办。一个基于原始计数的模型会给任何没见过的东西分配零概率，这是灾难性的，因为句子很长，而几乎每个长句都至少含一个没见过的序列。五十年的平滑研究修了这个。Kneser-Ney 平滑是其结果，而现代深度学习继承了它的经验主义传统。

## 核心概念

![N-gram 模型：计数、平滑、生成](../assets/ngram.svg)

**N-gram 概率：** `P(w_i | w_{i-n+1}, ..., w_{i-1})`。固定 `n`（通常三元组取 3，4-gram 取 4）。从计数算：

```text
P(w | context) = count(context, w) / count(context)
```

**零计数问题。** 任何训练里没见过的 n-gram 都得概率零。2007 年一项对 Brown 语料的研究发现，即便是 4-gram 模型，留出集里也有 30% 的 4-gram 在训练里没出现过。不平滑，你没法在任何真实文本上评估。

**平滑方法，按精巧程度排列：**

1. **拉普拉斯（加一）。** 给每个计数加 1。简单，对罕见事件糟糕。
2. **Good-Turing。** 基于频率的频率，把概率质量从高频事件重新分配给没见过的事件。
3. **插值。** 用可调权重把 n-gram、(n-1)-gram 等估计组合起来。
4. **回退（Backoff）。** 如果 n-gram 计数为零，就回退到 (n-1)-gram。Katz 回退把这个归一化。
5. **绝对折扣。** 从所有计数里减去一个固定折扣 `D`，重新分配给没见过的。
6. **Kneser-Ney。** 绝对折扣，加上对低阶模型的一个巧妙选择：用*延续概率*（一个词出现在多少个上下文里）而不是原始频率。

Kneser-Ney 的洞见很深。"San Francisco" 是个常见二元组。一元组 "Francisco" 大多出现在 "San" 之后。朴素的绝对折扣给 "Francisco" 很高的一元组概率（因为计数高）。Kneser-Ney 注意到 "Francisco" 只出现在一个上下文里，相应地降低它的延续概率。结果：一个以 "Francisco" 结尾的新二元组拿到恰当的低概率。

**评估：困惑度。** 在留出测试集上，每词平均负对数似然的指数。越低越好。困惑度 100 意味着模型困惑的程度，相当于在 100 个词里均匀选一个。

```text
perplexity = exp(- (1/N) * Σ log P(w_i | context_i))
```

```figure
ngram-backoff
```

## 动手构建

### 第 1 步：三元组计数

```python
from collections import Counter, defaultdict


def train_ngram(corpus_tokens, n=3):
    ngrams = Counter()
    contexts = Counter()
    for sentence in corpus_tokens:
        padded = ["<s>"] * (n - 1) + sentence + ["</s>"]
        for i in range(len(padded) - n + 1):
            ctx = tuple(padded[i:i + n - 1])
            word = padded[i + n - 1]
            ngrams[ctx + (word,)] += 1
            contexts[ctx] += 1
    return ngrams, contexts


def raw_probability(ngrams, contexts, context, word):
    ctx = tuple(context)
    if contexts.get(ctx, 0) == 0:
        return 0.0
    return ngrams.get(ctx + (word,), 0) / contexts[ctx]
```

输入是分好词的句子列表。输出是 n-gram 计数和上下文计数。`<s>` 和 `</s>` 是句子边界。

### 第 2 步：拉普拉斯平滑

```python
def laplace_probability(ngrams, contexts, vocab_size, context, word):
    ctx = tuple(context)
    numerator = ngrams.get(ctx + (word,), 0) + 1
    denominator = contexts.get(ctx, 0) + vocab_size
    return numerator / denominator
```

给每个计数加 1。能平滑，但把太多质量分给了没见过的事件，也连累了已见的罕见事件。

### 第 3 步：Kneser-Ney（二元组，插值式）

```python
def kneser_ney_bigram_model(corpus_tokens, discount=0.75):
    unigrams = Counter()
    bigrams = Counter()
    unigram_contexts = defaultdict(set)

    for sentence in corpus_tokens:
        padded = ["<s>"] + sentence + ["</s>"]
        for i, w in enumerate(padded):
            unigrams[w] += 1
            if i > 0:
                prev = padded[i - 1]
                bigrams[(prev, w)] += 1
                unigram_contexts[w].add(prev)

    total_unique_bigrams = sum(len(ctx_set) for ctx_set in unigram_contexts.values())
    continuation_prob = {
        w: len(ctx_set) / total_unique_bigrams for w, ctx_set in unigram_contexts.items()
    }

    context_totals = Counter()
    for (prev, w), count in bigrams.items():
        context_totals[prev] += count

    unique_follow = defaultdict(set)
    for (prev, w) in bigrams:
        unique_follow[prev].add(w)

    def prob(prev, w):
        count = bigrams.get((prev, w), 0)
        denom = context_totals.get(prev, 0)
        if denom == 0:
            return continuation_prob.get(w, 1e-9)
        first_term = max(count - discount, 0) / denom
        lambda_prev = discount * len(unique_follow[prev]) / denom
        return first_term + lambda_prev * continuation_prob.get(w, 1e-9)

    return prob
```

三个活动零件。`continuation_prob` 捕捉"这个词出现在多少个不同上下文里？"（Kneser-Ney 的创新）。`lambda_prev` 是折扣释放出来的质量，用来给回退加权。最终概率是折扣后的主项加上加权的延续项。

### 第 4 步：用采样生成文本

```python
import random


def generate(prob_fn, vocab, prefix, max_len=30, seed=0):
    rng = random.Random(seed)
    tokens = list(prefix)
    for _ in range(max_len):
        candidates = [(w, prob_fn(tokens[-1], w)) for w in vocab]
        total = sum(p for _, p in candidates)
        r = rng.random() * total
        acc = 0.0
        for w, p in candidates:
            acc += p
            if r <= acc:
                tokens.append(w)
                break
        if tokens[-1] == "</s>":
            break
    return tokens
```

按概率成比例采样。每个种子总给出不同的输出。要类似 beam-search 的输出，就在每步取 argmax（贪心），再加一个小的随机性旋钮（温度）。

### 第 5 步：困惑度

```python
import math


def perplexity(prob_fn, sentences):
    total_log_prob = 0.0
    total_tokens = 0
    for sentence in sentences:
        padded = ["<s>"] + sentence + ["</s>"]
        for i in range(1, len(padded)):
            p = prob_fn(padded[i - 1], padded[i])
            total_log_prob += math.log(max(p, 1e-12))
            total_tokens += 1
    return math.exp(-total_log_prob / total_tokens)
```

越低越好。在 Brown 语料上，一个调好的 4-gram KN 模型困惑度大约 140。transformer LM 在同一测试集上是 15-30。差距约 10 倍。这个差距正是这个领域往前走的原因。

## 实际使用

- **经典 NLP 教学。** 你能拿到的对平滑、MLE 和困惑度最清晰的接触。
- **KenLM。** 生产级 n-gram 库。在低延迟要紧的语音和 MT 系统里当重打分器。
- **端侧自动补全。** 键盘里的三元组模型。至今还在。
- **基线。** 在宣布你的神经 LM 好之前，永远先算一个 n-gram LM 困惑度。如果你的 transformer 没有大幅打赢 KN，那一定有什么不对。

## 拿去用

存为 `outputs/prompt-lm-baseline.md`：

```markdown
---
name: lm-baseline
description: Build a reproducible n-gram language model baseline before training a neural LM.
phase: 5
lesson: 16
---

Given a corpus and target use (next-word prediction, rescoring, perplexity baseline), output:

1. N-gram order. Trigram for general English, 4-gram if corpus is large, 5-gram for speech rescoring.
2. Smoothing. Modified Kneser-Ney is the default; Laplace only for teaching.
3. Library. `kenlm` for production, `nltk.lm` for teaching, roll your own only to learn.
4. Evaluation. Held-out perplexity with consistent tokenization between train and test sets.

Refuse to report perplexity computed with different tokenization between systems being compared — perplexity numbers are comparable only under identical tokenization. Flag OOV rate in test set; KN handles OOV poorly unless you reserve a special <UNK> token during training.
```

## 练习

1. **简单。** 在一个 1000 句的莎士比亚语料上训练一个三元组 LM。生成 20 个句子。它们会局部合理、全局语无伦次。这是经典的演示。
2. **中等。** 在一个留出的莎士比亚划分上为你的 KN 模型实现困惑度。和拉普拉斯对比。你应该看到 KN 把困惑度降低 30-50%。
3. **困难。** 做一个三元组拼写纠正器：给定一个拼错的词及其上下文，生成候选纠正，按 LM 下的上下文概率排序。在 Birkbeck 拼写语料（公开）上评估。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| N-gram | 词序列 | `n` 个连续 token 的序列。 |
| 平滑（Smoothing） | 避免零 | 重新分配概率质量，让没见过的事件得到非零概率。 |
| 困惑度（Perplexity） | LM 质量指标 | 留出数据上的 `exp(-平均对数概率)`。越低越好。 |
| 回退（Backoff） | 退回更短的上下文 | 三元组计数为零时用二元组。Katz 回退把它形式化。 |
| Kneser-Ney | n-gram 最佳平滑 | 绝对折扣 + 对低阶模型用延续概率。 |
| 延续概率 | KN 专属 | `P(w)` 按 `w` 出现的上下文数加权，而非按原始计数。 |

## 延伸阅读

- [Jurafsky and Martin — Speech and Language Processing, Chapter 3 (2026 draft)](https://web.stanford.edu/~jurafsky/slp3/3.pdf) —— n-gram LM 与平滑的经典论述。
- [Chen and Goodman (1998). An Empirical Study of Smoothing Techniques for Language Modeling](https://dash.harvard.edu/handle/1/25104739) —— 把 Kneser-Ney 钉为最佳 n-gram 平滑器的那篇论文。
- [Kneser and Ney (1995). Improved Backing-off for M-gram Language Modeling](https://ieeexplore.ieee.org/document/479394) —— 原始 KN 论文。
- [KenLM](https://kheafield.com/code/kenlm/) —— 快速的生产级 n-gram LM，到 2026 年在延迟敏感的应用里还在用。
