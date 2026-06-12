# 朴素贝叶斯

> 那个"朴素"假设是错的，但它照样管用。这正是它的妙处。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 2 第 01-07 课（分类、贝叶斯定理）
**预计时间：** ~75 分钟

## 学习目标

- 用拉普拉斯平滑从零实现多项式朴素贝叶斯，用于文本分类
- 解释朴素独立假设为什么在数学上是错的，却在实践中产出正确的类别排序
- 对比多项式、伯努利和高斯朴素贝叶斯三个变体，为给定特征类型选对那个
- 在高维稀疏数据上把朴素贝叶斯和逻辑回归对比，解释背后起作用的偏差-方差权衡

## 问题背景

你需要给文本分类。把邮件分成垃圾或非垃圾。把客户评价分成正面或负面。把工单分到各个类别。你有数千个特征（每个词一个）和有限的训练数据。

大多数分类器在这里就卡壳了。逻辑回归需要足够多的样本来可靠地估计数千个权重。决策树一次只在一个词上分裂，过拟合得一塌糊涂。10000 维里的 KNN 毫无意义，因为每个点离其他每个点都一样远。

朴素贝叶斯能搞定这个。它做了一个数学上错误的假设（给定类别后，每个特征都独立于其他每个特征），却仍然在文本分类上胜过那些"更聪明"的模型，尤其在训练集小的时候。它对数据扫一遍就训练完。它能扩展到数百万特征。它产出概率估计（不过由于独立假设，往往校准得不好）。

理解一个错误假设为什么能带来好预测，会教给你机器学习里一些根本的东西：最好的模型不是最正确的那个，而是对你的数据有最佳偏差-方差权衡的那个。

## 核心概念

### 贝叶斯定理（快速回顾）

贝叶斯定理把条件概率翻转过来：

```
P(class | features) = P(features | class) * P(class) / P(features)
```

我们想要 `P(class | features)` —— 给定文档里的词，它属于某个类的概率。我们能从下面这些算出它：
- `P(features | class)` —— 在这个类的文档里看到这些词的似然
- `P(class)` —— 类的先验概率（垃圾邮件总体上有多常见？）
- `P(features)` —— 证据，对所有类都一样，所以比较时可以忽略

`P(class | features)` 最高的那个类胜出。

### 朴素独立假设

精确计算 `P(features | class)` 需要估计所有特征联合的概率。词表有 10000 个词，你得估计一个 2^10000 种可能组合上的分布。不可能。

朴素假设：给定类别后，每个特征都条件独立。

```
P(w1, w2, ..., wn | class) = P(w1 | class) * P(w2 | class) * ... * P(wn | class)
```

你不再估一个不可能的联合分布，而是估 n 个简单的逐特征分布。每个只需要一个计数。

这个假设显然是错的。在任何文档里，"machine" 和 "learning" 这两个词都不独立。但分类器不需要正确的概率估计，它需要正确的排序 —— 哪个类概率最高。独立假设引入系统性误差，但这些误差对所有类的影响相似，所以排序还是对的。

### 它为什么仍然管用

三个原因：

1. **排序而非校准。** 分类只需要排第一的类正确。哪怕 P(spam) = 0.99999 而真实概率是 0.7，分类器还是正确地挑了 spam。我们不需要正确的概率，我们需要正确的赢家。

2. **高偏差，低方差。** 独立假设是个强先验。它狠狠约束了模型，从而防止过拟合。训练数据有限时，一个略错但稳定的模型，胜过一个理论正确但极不稳定的模型。这就是偏差-方差权衡在起作用。

3. **特征冗余相互抵消。** 相关特征提供冗余证据。分类器重复计了这份证据，但它也是为正确的类重复计的。如果 "machine" 和 "learning" 总是一起出现，两者都为 "tech" 类提供证据。NB 把它们数了两遍，但它是为正确的类数了两遍。

第四个实用原因：朴素贝叶斯极快。训练就是对数据扫一遍数频率。预测就是一次矩阵乘法。你能在几秒内对一百万篇文档训练。这个速度意味着你能迭代更快、试更多特征集、跑比慢模型更多的实验。

### 逐步推演数学

我们走一个具体例子。假设有两个类：spam 和 not-spam。我们的词表有三个词："free"、"money"、"meeting"。

训练数据：
- 垃圾邮件提到 "free" 80 次、"money" 60 次、"meeting" 10 次（共 150 个词）
- 非垃圾邮件提到 "free" 5 次、"money" 10 次、"meeting" 100 次（共 115 个词）
- 40% 的邮件是垃圾，60% 是非垃圾

用拉普拉斯平滑（alpha=1）：

```
P(free | spam)    = (80 + 1) / (150 + 3) = 81/153 = 0.529
P(money | spam)   = (60 + 1) / (150 + 3) = 61/153 = 0.399
P(meeting | spam) = (10 + 1) / (150 + 3) = 11/153 = 0.072

P(free | not-spam)    = (5 + 1) / (115 + 3) = 6/118 = 0.051
P(money | not-spam)   = (10 + 1) / (115 + 3) = 11/118 = 0.093
P(meeting | not-spam) = (100 + 1) / (115 + 3) = 101/118 = 0.856
```

新邮件含有："free"（2 次）、"money"（1 次）、"meeting"（0 次）。

```
log P(spam | email) = log(0.4) + 2*log(0.529) + 1*log(0.399) + 0*log(0.072)
                    = -0.916 + 2*(-0.637) + (-0.919) + 0
                    = -3.109

log P(not-spam | email) = log(0.6) + 2*log(0.051) + 1*log(0.093) + 0*log(0.856)
                        = -0.511 + 2*(-2.976) + (-2.375) + 0
                        = -8.838
```

Spam 以大比分胜出。"free" 出现两次是 spam 的强证据。注意 "meeting" 没出现对两个对数和都贡献零（0 * log(P)）—— 在多项式 NB 里，缺席的词没有影响。是伯努利 NB 才显式地建模词的缺席。

### 三个变体

朴素贝叶斯有三种口味。每种对 `P(feature | class)` 建模的方式不同。

#### 多项式朴素贝叶斯

把每个特征建模为计数。最适合特征是词频或 TF-IDF 值的文本数据。

```
P(word_i | class) = (count of word_i in class + alpha) / (total words in class + alpha * vocab_size)
```

`alpha` 是拉普拉斯平滑（下面解释）。这个变体是文本分类的主力。

#### 高斯朴素贝叶斯

把每个特征建模为正态分布。最适合连续特征。

```
P(x_i | class) = (1 / sqrt(2 * pi * var)) * exp(-(x_i - mean)^2 / (2 * var))
```

每个类对每个特征都有自己的均值和方差。当特征在每个类内真的服从钟形曲线时它很好用。

#### 伯努利朴素贝叶斯

把每个特征建模为二元（出现或缺席）。最适合短文本或二元特征向量。

```
P(word_i | class) = (docs in class containing word_i + alpha) / (total docs in class + 2 * alpha)
```

和多项式不同，伯努利显式地惩罚词的缺席。如果 "free" 通常出现在垃圾邮件里却没出现在这封邮件里，伯努利会把它当作反对 spam 的证据。

### 何时用哪个变体

| 变体 | 特征类型 | 最适合 | 例子 |
|---------|-------------|----------|---------|
| 多项式 | 计数或频率 | 文本分类、词袋 | 邮件垃圾、主题分类 |
| 高斯 | 连续值 | 特征接近正态的表格数据 | 鸢尾花分类、传感器数据 |
| 伯努利 | 二元（0/1） | 短文本、二元特征向量 | 短信垃圾、出现/缺席特征 |

### 拉普拉斯平滑

当一个词出现在测试数据里，却在某个类的训练数据里从没出现过时，会怎样？

不平滑的话：`P(word | class) = 0/N = 0`。一个零乘穿整个乘积，让 `P(class | features) = 0`，不管其他证据如何。一个没见过的词就摧毁了整个预测，无论多少其他证据支持它。

拉普拉斯平滑给每个特征计数加一个小计数 `alpha`（通常 1）：

```
P(word_i | class) = (count(word_i, class) + alpha) / (total_words_in_class + alpha * vocab_size)
```

alpha=1 时，每个词至少有一丁点概率。测试邮件里出现的 "discombobulate" 不再杀死 spam 概率了。这个平滑有贝叶斯解释：它等价于在词分布上放一个均匀的狄利克雷先验。

alpha 越高意味着平滑越强（分布越均匀）。alpha 越低意味着模型越信任数据。alpha 是你要调的超参数。

alpha 的效果：

| Alpha | 效果 | 何时用 |
|-------|--------|-------------|
| 0.001 | 几乎不平滑，信任数据 | 训练集非常大，不预期有未见特征 |
| 0.1 | 轻度平滑 | 大训练集 |
| 1.0 | 标准拉普拉斯平滑 | 默认起点 |
| 10.0 | 重度平滑，压平分布 | 训练集非常小，预期有许多未见特征 |

### 对数空间计算

把数百个概率（每个都小于 1）相乘会导致浮点下溢。乘积在浮点里变成零，尽管真实值是个很小的正数。

解法：在对数空间里工作。不乘概率，而是加它们的对数：

```
log P(class | x1, x2, ..., xn) = log P(class) + sum_i log P(xi | class)
```

这把预测变成一个点积：

```
log_scores = X @ log_feature_probs.T + log_class_priors
prediction = argmax(log_scores)
```

矩阵乘法。这就是为什么朴素贝叶斯预测这么快 —— 它和单层线性模型是同一个操作。

### 朴素贝叶斯 vs 逻辑回归

两者都是文本的线性分类器。区别在于它们建模什么。

| 维度 | 朴素贝叶斯 | 逻辑回归 |
|--------|------------|-------------------|
| 类型 | 生成式（建模 P(X\|Y)） | 判别式（建模 P(Y\|X)） |
| 训练 | 数频率 | 优化损失函数 |
| 小数据 | 更好（强先验有帮助） | 更差（不够估权重） |
| 大数据 | 更差（错误假设拖后腿） | 更好（灵活边界） |
| 特征 | 假设独立 | 处理相关性 |
| 速度 | 单遍，非常快 | 迭代优化 |
| 校准 | 概率差 | 概率更好 |

经验法则：从朴素贝叶斯开始。如果数据够多且 NB 到了平台期，就换逻辑回归。

### 分类流水线

```mermaid
flowchart LR
    A[原始文本] --> B[分词]
    B --> C[构建词表]
    C --> D[统计词频]
    D --> E[应用平滑]
    E --> F[计算对数概率]
    F --> G[预测：argmax 给定词时的 P class]

    style A fill:#f9f,stroke:#333
    style G fill:#9f9,stroke:#333
```

实践中，我们在对数空间里工作以避免浮点下溢。不乘许多小概率，而是加它们的对数：

```
log P(class | features) = log P(class) + sum_i log P(feature_i | class)
```

```figure
naive-bayes
```

## 动手构建

`code/naive_bayes.py` 里的代码从零实现了 MultinomialNB 和 GaussianNB。

### MultinomialNB

从零实现：

1. **fit(X, y)**：对每个类，统计每个特征的频率。加拉普拉斯平滑。计算对数概率。存储类先验（类频率的对数）。

2. **predict_log_proba(X)**：对每个样本，为所有类计算 log P(class) + sum of log P(feature_i | class)。这是一次矩阵乘法：X @ log_probs.T + log_priors。

3. **predict(X)**：返回对数概率最高的类。

```python
class MultinomialNB:
    def __init__(self, alpha=1.0):
        self.alpha = alpha

    def fit(self, X, y):
        classes = np.unique(y)
        n_classes = len(classes)
        n_features = X.shape[1]

        self.classes_ = classes
        self.class_log_prior_ = np.zeros(n_classes)
        self.feature_log_prob_ = np.zeros((n_classes, n_features))

        for i, c in enumerate(classes):
            X_c = X[y == c]
            self.class_log_prior_[i] = np.log(X_c.shape[0] / X.shape[0])
            counts = X_c.sum(axis=0) + self.alpha
            self.feature_log_prob_[i] = np.log(counts / counts.sum())

        return self
```

关键洞察：拟合之后，预测就是矩阵乘法加一个偏置。这就是朴素贝叶斯为什么这么快。

### GaussianNB

对连续特征，我们为每个类每个特征估计均值和方差：

```python
class GaussianNB:
    def __init__(self):
        pass

    def fit(self, X, y):
        classes = np.unique(y)
        self.classes_ = classes
        self.means_ = np.zeros((len(classes), X.shape[1]))
        self.vars_ = np.zeros((len(classes), X.shape[1]))
        self.priors_ = np.zeros(len(classes))

        for i, c in enumerate(classes):
            X_c = X[y == c]
            self.means_[i] = X_c.mean(axis=0)
            self.vars_[i] = X_c.var(axis=0) + 1e-9
            self.priors_[i] = X_c.shape[0] / X.shape[0]

        return self
```

预测用每个特征的高斯 PDF，跨特征相乘（在对数空间里相加）。

### 演示：文本分类

代码生成模拟两个类（科技文章 vs 体育文章）的合成词袋数据。每个类有不同的词频分布。MultinomialNB 用词计数给它们分类。

合成数据这样工作：我们造 200 个"词"（特征列）。词 0-39 在科技文章里高频、在体育里低频。词 80-119 在体育里高频、在科技里低频。词 40-79 在两者里都中频。这造出一个真实场景，其中一些词是强类别指示器、另一些是噪声。

### 演示：连续特征

代码生成类似鸢尾花的数据（3 个类、4 个特征、高斯簇）。GaussianNB 用每个类的均值和方差分类。每个类有不同的中心（均值向量）和不同的散度（方差），模仿真实数据中各类别测量值系统性差异的情况。

代码还演示：
- **平滑对比：** 用不同 alpha 值训练 MultinomialNB，展示平滑强度对准确率的影响。
- **训练规模实验：** NB 准确率如何随训练数据从 20 增长到 1600 个样本而提升。NB 即使样本极少也能达到不错的准确率 —— 这是它的主要优势。
- **混淆矩阵：** 每个类的精确率、召回率和 F1 分数，展示 NB 在哪里犯错。

### 预测速度

朴素贝叶斯预测是一次矩阵乘法。对 n 个样本、d 个特征、k 个类：
- MultinomialNB：一次矩阵乘法 (n x d) @ (d x k) = O(n * d * k)
- GaussianNB：n * k 次高斯 PDF 计算，每次跨 d 个特征 = O(n * d * k)

两者在每个维度上都是线性的。和 KNN（需要计算到所有训练点的距离）或带 RBF 核的 SVM（需要对所有支持向量做核计算）相比，NB 在预测时快好几个数量级。

## 实际使用

用 sklearn，两个变体都是一行：

```python
from sklearn.naive_bayes import GaussianNB, MultinomialNB

gnb = GaussianNB()
gnb.fit(X_train, y_train)
print(f"GaussianNB accuracy: {gnb.score(X_test, y_test):.3f}")

mnb = MultinomialNB(alpha=1.0)
mnb.fit(X_train_counts, y_train)
print(f"MultinomialNB accuracy: {mnb.score(X_test_counts, y_test):.3f}")
```

用 sklearn 做文本分类：

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

text_clf = Pipeline([
    ("vectorizer", CountVectorizer()),
    ("classifier", MultinomialNB(alpha=1.0)),
])

text_clf.fit(train_texts, train_labels)
accuracy = text_clf.score(test_texts, test_labels)
```

`naive_bayes.py` 里的代码在同一数据上把从零实现和 sklearn 对比以验证正确性。

### TF-IDF 配朴素贝叶斯

原始词计数给每个词每次出现都赋相同权重。但像 "the" 和 "is" 这样的常见词在每个类里都频繁出现 —— 它们不带信息。TF-IDF（词频 - 逆文档频率）给常见词降权、给罕见且有辨识度的词升权。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

text_clf = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("classifier", MultinomialNB(alpha=0.1)),
])
```

TF-IDF 值是非负的，所以能配 MultinomialNB。TF-IDF + MultinomialNB 的组合是文本分类最强的基线之一。在少于 10000 个训练样本的数据集上，它经常打败更复杂的模型。

### BernoulliNB 用于短文本

对短文本（推文、短信、聊天消息），BernoulliNB 能胜过 MultinomialNB。短文本词计数低，所以 MultinomialNB 依赖的频率信息有噪声。BernoulliNB 只关心出现或缺席，这对短文本更可靠。

```python
from sklearn.naive_bayes import BernoulliNB
from sklearn.feature_extraction.text import CountVectorizer

text_clf = Pipeline([
    ("vectorizer", CountVectorizer(binary=True)),
    ("classifier", BernoulliNB(alpha=1.0)),
])
```

CountVectorizer 里的 `binary=True` 标志把所有计数转成 0/1。没有它，BernoulliNB 仍能跑，但它看到的是它本不该处理的计数。

### 校准 NB 概率

NB 概率校准得不好。当 NB 说 P(spam) = 0.95 时，真实概率可能是 0.7。如果你需要可靠的概率估计（比如要设阈值或要和其他模型组合），用 sklearn 的 CalibratedClassifierCV：

```python
from sklearn.calibration import CalibratedClassifierCV

calibrated_nb = CalibratedClassifierCV(MultinomialNB(), cv=5, method="sigmoid")
calibrated_nb.fit(X_train, y_train)
proba = calibrated_nb.predict_proba(X_test)
```

这用交叉验证在 NB 的原始分数之上拟合一个逻辑回归。得到的概率更接近真实的类频率。

### 常见坑

1. **负特征值。** MultinomialNB 要求特征非负。如果你有负值（比如某些设置下的 TF-IDF 或标准化后的特征），改用 GaussianNB，或把特征平移成正的。

2. **零方差特征。** GaussianNB 要除以方差。如果某个特征对某个类方差为零（所有值相同），概率计算就崩。代码给所有方差加一个小平滑项（1e-9）来防止这个。

3. **类别不平衡。** 如果 99% 的邮件是非垃圾，先验 P(not-spam) = 0.99 强到压过似然证据。你可以手动设类先验，或用 sklearn 里的 class_prior 参数。

4. **特征缩放。** MultinomialNB 不需要缩放（它在计数上工作）。GaussianNB 也不需要缩放（它估计逐特征统计量）。这相比对特征尺度敏感的逻辑回归和 SVM 是个优势。

## 拿去用

本节课产出：
- `outputs/skill-naive-bayes-chooser.md` -- 一个挑选正确 NB 变体的决策 skill
- `code/naive_bayes.py` -- 从零实现的 MultinomialNB 和 GaussianNB，附 sklearn 对比

### 朴素贝叶斯何时失败

NB 在独立假设导致排序错误（而不只是概率错误）时失败。这发生在：

1. **强特征交互。** 如果类别取决于两个特征的组合而非单独任一个（类似 XOR 的模式），NB 会完全错过它。每个特征单独都不提供证据，而 NB 没法非线性地组合它们。

2. **高度相关且证据相反的特征。** 如果特征 A 说 "spam"、特征 B 说 "not-spam"，但 A 和 B 完全相关（现实中它们总是一致），NB 会在本无冲突的地方看到冲突的证据。

3. **非常大的训练集。** 数据足够时，逻辑回归这类判别式模型学到真实决策边界并胜过 NB。曾在小数据上帮忙的独立假设，现在拖了模型后腿。

实践中，这些失败模式在文本分类里很少见。文本特征数量多、单个都很弱，独立假设的误差往往相互抵消。对于只有少数强相关特征的表格数据，优先考虑逻辑回归或树模型。

## 练习

1. **平滑实验。** 在文本数据上用 alpha 值 0.01、0.1、1.0、10.0、100.0 训练 MultinomialNB。把准确率对 alpha 画出来。性能在哪里达峰？为什么非常高的 alpha 有害？

2. **特征独立性检验。** 拿一个真实文本数据集。挑两个明显相关的词（"machine" 和 "learning"）。计算 P(word1 | class) * P(word2 | class)，和 P(word1 AND word2 | class) 对比。独立假设错得多离谱？它影响分类准确率吗？

3. **伯努利实现。** 给代码扩展一个 BernoulliNB 类。把词袋转成二元（出现/缺席），在文本数据上和 MultinomialNB 对比准确率。伯努利什么时候赢？

4. **NB vs 逻辑回归。** 在文本数据上训练两者。从 100 个训练样本开始增加到 10000。把两者的准确率对训练集大小画出来。逻辑回归在哪一点反超朴素贝叶斯？

5. **垃圾邮件过滤器。** 构建一个完整的垃圾邮件分类器：给原始邮件文本分词、构建词表、创建词袋特征、训练 MultinomialNB、用精确率和召回率评估（不只是准确率 —— 为什么？）。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|----------------------|
| 朴素贝叶斯 | "简单的概率分类器" | 应用贝叶斯定理、并假设给定类别后特征条件独立的分类器 |
| 条件独立 | "特征互不影响" | P(A, B \| C) = P(A \| C) * P(B \| C) —— 一旦你知道 C，知道 B 不会告诉你关于 A 的任何新东西 |
| 拉普拉斯平滑 | "加一平滑" | 给每个特征加一个小计数，防止零概率主导预测 |
| 先验 | "看到数据之前你信什么" | P(class) —— 观测任何特征之前每个类的概率 |
| 似然 | "数据拟合得有多好" | P(features \| class) —— 已知类别时观测到这些特征的概率 |
| 后验 | "看到数据之后你信什么" | P(class \| features) —— 观测特征之后类别的更新概率 |
| 生成式模型 | "建模数据如何生成" | 学习 P(X \| Y) 和 P(Y)，再用贝叶斯定理得到 P(Y \| X) 的模型 |
| 判别式模型 | "建模决策边界" | 直接学习 P(Y \| X)、不建模 X 如何生成的模型 |
| 对数概率 | "避免下溢" | 用 log P 代替 P，防止许多小数的乘积在浮点里变成零 |

## 延伸阅读

- [scikit-learn Naive Bayes docs](https://scikit-learn.org/stable/modules/naive_bayes.html) -- 三个变体及数学细节
- [McCallum and Nigam, A Comparison of Event Models for Naive Bayes Text Classification (1998)](https://www.cs.cmu.edu/~knigam/papers/multinomial-aaaiws98.pdf) -- 多项式 vs 伯努利用于文本的经典对比
- [Rennie et al., Tackling the Poor Assumptions of Naive Bayes Text Classifiers (2003)](https://people.csail.mit.edu/jrennie/papers/icml03-nb.pdf) -- NB 用于文本的改进
- [Ng and Jordan, On Discriminative vs. Generative Classifiers (2001)](https://ai.stanford.edu/~ang/papers/nips01-discriminativegenerative.pdf) -- 证明 NB 在数据更少时比 LR 收敛更快
