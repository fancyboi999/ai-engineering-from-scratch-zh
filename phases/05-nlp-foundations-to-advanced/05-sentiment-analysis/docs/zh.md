# 情感分析

> 最经典的 NLP 任务。关于经典文本分类你需要知道的大部分东西，都会在这里冒出来。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 02（BoW + TF-IDF）、Phase 2 · 14（朴素贝叶斯）
**预计时间：** ~75 分钟

## 问题背景

"The food was not great." 正面还是负面？

情感分析听起来很简单：评价者说了喜欢或不喜欢某样东西，给这句话打标签。它之所以成了最经典的 NLP 任务，是因为每一个看着简单的例子背后都藏着一个难的。否定会翻转含义。反讽会反转它。"Not bad at all" 是正面的，尽管里头有两个负面色彩的词。表情符号携带的信号比周围文字还多。领域词汇也有讲究（音乐评论里的 `tight` 和时尚评论里的 `tight` 不是一回事）。

情感分析是经典 NLP 的一座活实验室。如果你理解了每个朴素基线为什么各有一个特定的翻车方式，你也就理解了每个更复杂的模型为什么被发明出来。这节课从零搭一个朴素贝叶斯基线，加上逻辑回归，再点出那些让生产级情感分析变成合规级问题的陷阱。

## 核心概念

经典情感分析是一套两步配方。

1. **表示。** 把文本变成特征向量。BoW、TF-IDF 或 n-gram。
2. **分类。** 在标注样本上拟合一个线性模型（朴素贝叶斯、逻辑回归、SVM）。

朴素贝叶斯是最笨却管用的模型。假设给定标签后每个特征都相互独立。从计数里估计 `P(word | positive)` 和 `P(word | negative)`。推理时把概率相乘。那个"朴素"的独立假设错得可笑，可结果却强得惊人。原因在于：在稀疏的文本特征和中等数据量下，分类器关心的是每个词偏向哪一边，而不是偏多少。

逻辑回归修了独立假设。它给每个特征学一个权重，包括负权重。`not good` 作为一个二元组特征会得到负权重。朴素贝叶斯对从没标过的二元组做不到这一点。

```figure
sentiment-logits
```

## 动手构建

### 第 1 步：一个真实的迷你数据集

```python
POSITIVE = [
    "absolutely loved this movie",
    "beautiful cinematography and a great story",
    "one of the best films of the year",
    "brilliant acting from the lead",
    "heartwarming and funny",
]

NEGATIVE = [
    "boring and far too long",
    "not worth your time",
    "the plot made no sense",
    "terrible acting, awful script",
    "i want my two hours back",
]
```

故意做得小。真实工作用几万个样本（IMDb、SST-2、Yelp polarity）。数学是一模一样的。

### 第 2 步：从零实现多项式朴素贝叶斯

```python
import math
from collections import Counter


def train_nb(docs_by_class, vocab, alpha=1.0):
    class_priors = {}
    class_word_probs = {}
    total_docs = sum(len(d) for d in docs_by_class.values())

    for cls, docs in docs_by_class.items():
        class_priors[cls] = len(docs) / total_docs
        counts = Counter()
        for doc in docs:
            for token in doc:
                counts[token] += 1
        total = sum(counts.values()) + alpha * len(vocab)
        class_word_probs[cls] = {
            w: (counts[w] + alpha) / total for w in vocab
        }
    return class_priors, class_word_probs


def predict_nb(doc, class_priors, class_word_probs):
    scores = {}
    for cls in class_priors:
        s = math.log(class_priors[cls])
        for token in doc:
            if token in class_word_probs[cls]:
                s += math.log(class_word_probs[cls][token])
        scores[cls] = s
    return max(scores, key=scores.get)
```

加性平滑（alpha=1.0）就是拉普拉斯平滑。没有它，某个类里没见过的词概率为零，log 会爆掉。实践中常用 `alpha=0.01`。`alpha=1.0` 是教学默认值。

### 第 3 步：从零实现逻辑回归

```python
import numpy as np


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_lr(X, y, epochs=500, lr=0.05, l2=0.01):
    n_features = X.shape[1]
    w = np.zeros(n_features)
    b = 0.0
    for _ in range(epochs):
        logits = X @ w + b
        preds = sigmoid(logits)
        err = preds - y
        grad_w = X.T @ err / len(y) + l2 * w
        grad_b = err.mean()
        w -= lr * grad_w
        b -= lr * grad_b
    return w, b


def predict_lr(X, w, b):
    return (sigmoid(X @ w + b) >= 0.5).astype(int)
```

L2 正则化在这里很关键。文本特征稀疏，没有 L2 模型会死记训练样本。从 `0.01` 起步再调。

### 第 4 步：处理否定（那个翻车方式）

看 "not good" 和 "not bad"。BoW 分类器看到 `{not, good}` 和 `{not, bad}`，从训练里哪个出现得更多里学。二元组分类器看到 `not_good` 和 `not_bad`，把它们当成不同的特征学。这通常就够了。

一个在没有二元组时也管用的更糙的修法：**否定作用域**。给否定词之后、直到下一个标点之前的 token 加上 `NOT_` 前缀。

```python
NEGATION_WORDS = {"not", "no", "never", "nor", "none", "nothing", "neither"}
NEGATION_TERMINATORS = {".", "!", "?", ",", ";"}


def apply_negation(tokens):
    out = []
    negate = False
    for token in tokens:
        if token in NEGATION_TERMINATORS:
            negate = False
            out.append(token)
            continue
        if token in NEGATION_WORDS:
            negate = True
            out.append(token)
            continue
        out.append(f"NOT_{token}" if negate else token)
    return out
```

```python
>>> apply_negation(["not", "good", "at", "all", ".", "but", "funny"])
['not', 'NOT_good', 'NOT_at', 'NOT_all', '.', 'but', 'funny']
```

现在 `good` 和 `NOT_good` 是不同的特征，分类器可以给它们相反的权重。三行预处理，在情感基准上换来可测量的准确率提升。

### 第 5 步：真正重要的评估指标

如果类别不平衡，光看准确率会误导你。真实的情感语料通常 70-80% 正面或 70-80% 负面；一个恒输出多数类的分类器能拿 80% 准确率，却毫无价值。下面这些每一项都要报：

- **每类的精确率和召回率。** 每个类一对。对它们做宏平均，得到一个尊重类别平衡的单一数字。
- **Macro-F1（不平衡数据的首要指标）。** 各类 F1 的等权均值。类别不平衡时用它代替准确率。
- **Weighted-F1（备选）。** 和宏平均一样，但按类频率加权。当不平衡本身有业务含义时，和 macro-F1 一起报。
- **混淆矩阵。** 原始计数。在相信任何标量指标之前先看它；它揭示模型把哪一对类别搞混了。
- **每类的错误样本。** 每个类拉出 5 个错误预测，读一读。没有什么能替代读真实的错误。

对严重不平衡的数据（> 95-5 的比例），报 **AUROC** 和 **AUPRC**，而不是准确率。AUPRC 对少数类更敏感，而少数类往往正是你关心的（垃圾邮件、欺诈、罕见情感）。

**要避免的常见 bug。** 在不平衡数据上报 micro-F1 而不是 macro-F1，会给你一个看着很高的数字，因为它被多数类主导了。Macro-F1 逼你看到少数类的表现。

```python
def evaluate(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn, "precision": precision, "recall": recall, "f1": f1}
```

## 实际使用

scikit-learn 六行就能正确做完。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, stop_words=None)),
    ("clf", LogisticRegression(C=1.0, max_iter=1000)),
])
pipe.fit(X_train, y_train)
print(pipe.score(X_test, y_test))
```

注意三件事。`stop_words=None` 保住了否定词。`ngram_range=(1, 2)` 加上二元组，于是 `not_good` 成了一个特征。`sublinear_tf=True` 抑制重复词。在 SST-2 上，这三个开关就是 75% 准确率基线和 85% 准确率基线之间的差距。

### 什么时候该上 transformer

- 反讽检测。经典模型在这里翻车，没得商量。
- 情感在文档中途转向的长评论。
- 基于方面的情感（aspect-based）。"Camera was great but battery was terrible." 你得把情感归因到各个方面上。只能靠 transformer 或结构化输出模型。
- 非英语、低资源语言。多语言 BERT 免费给你一个 zero-shot 基线。

如果你需要上面任何一条，直接跳到 phase 7（transformer 深入）。否则，在 TF-IDF 加二元组加否定处理上的朴素贝叶斯或逻辑回归，就是你 2026 年的生产基线。

### 可复现性陷阱（又来了）

重训情感模型是家常便饭，重新评估却不是。论文里报的准确率用的是特定的划分、特定的预处理、特定的分词器。如果你拿自己的新模型和基线比，却没用完全相同的流水线，你得到的差值会误导人。永远在你自己的流水线上重新生成基线，而不是用论文里的数字。

## 拿去用

存为 `outputs/prompt-sentiment-baseline.md`：

```markdown
---
name: sentiment-baseline
description: Design a sentiment analysis baseline for a new dataset.
phase: 5
lesson: 05
---

Given a dataset description (domain, language, size, label granularity, latency budget), you output:

1. Feature extraction recipe. Specify tokenizer, n-gram range, stopword policy (usually keep), negation handling (scoped prefix or bigrams).
2. Classifier. Naive Bayes for baseline, logistic regression for production, transformer only if the domain needs sarcasm / aspects / cross-lingual.
3. Evaluation plan. Report precision, recall, F1, confusion matrix, and per-class error samples (not just scalars).
4. One failure mode to monitor post-deployment. Domain drift and sarcasm are the top two.

Refuse to recommend dropping stopwords for sentiment tasks. Refuse to report accuracy as the sole metric when classes are imbalanced (e.g., 90% positive). Flag subword-rich languages as needing FastText or transformer embeddings over word-level TF-IDF.
```

## 练习

1. **简单。** 把 `apply_negation` 作为预处理步骤加进 scikit-learn 流水线，在一个小情感数据集上测一测 F1 的变化。
2. **中等。** 实现类别加权的逻辑回归（给 scikit-learn 传 `class_weight="balanced"`，或者自己推梯度）。在一个合成的 90-10 类别不平衡上测它的效果。
3. **困难。** 在情感模型的残差上训练第二个分类器，做一个反讽检测器。记录你的实验设置。当你的准确率低于随机水平时要提醒读者（二分类反讽的随机水平约为 50%，大多数第一次尝试都落在那附近）。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 极性（Polarity） | 正面或负面 | 二元标签；有时扩展到中性或细粒度（五星）。 |
| 基于方面的情感 | 逐方面的极性 | 把情感归因到文本中提到的具体实体或属性上。 |
| 否定作用域 | 翻转邻近 token | 给 "not" 之后的 token 加 `NOT_` 前缀，直到标点。 |
| 拉普拉斯平滑 | 给计数加 1 | 避免朴素贝叶斯里出现零概率特征。 |
| L2 正则化 | 收缩权重 | 给损失加上 `lambda * sum(w^2)`。对稀疏文本特征不可或缺。 |

## 延伸阅读

- [Pang and Lee (2008). Opinion Mining and Sentiment Analysis](https://www.cs.cornell.edu/home/llee/opinion-mining-sentiment-analysis-survey.html) —— 奠基性综述。很长，但前四节涵盖了所有经典内容。
- [Wang and Manning (2012). Baselines and Bigrams: Simple, Good Sentiment and Topic Classification](https://aclanthology.org/P12-2018/) —— 证明了二元组 + 朴素贝叶斯在短文本上很难被打败的那篇论文。
- [scikit-learn text feature extraction docs](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction) —— `CountVectorizer`、`TfidfVectorizer` 以及你会调的每个旋钮的参考。
