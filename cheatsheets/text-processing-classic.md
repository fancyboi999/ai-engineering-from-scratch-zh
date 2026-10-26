---
id: text-processing-classic
title: 经典文本处理与 TF-IDF
code: CT
subtitle: 分词、词干提取、词形还原、计数、TF-IDF 加权、情感分类，以及用 LDA 或 BERTopic 发现主题。
hue: 30
sources: phases/05-nlp-foundations-to-advanced/01-text-processing, phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis, phases/05-nlp-foundations-to-advanced/15-topic-modeling
source_hash: b11605227699eb45
---

## 经典文本流水线
type: flow
from: phases/05-nlp-foundations-to-advanced/01-text-processing/docs/zh.md, phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md

1. **分词**：将字符串拆成词 token，标点保留为独立 token。
2. **提取词干或还原词形**：追求速度时提词干；重视含义时，结合词性标签还原词形。
3. **否定范围**：否定词之后、标点之前的 token 加 `NOT_` 前缀。
4. **计数**：词袋模型。每个文档一行，词表中的每个词一列。
5. **加权**：TF-IDF 降低常见词权重。按行做 L2 归一化，让余弦相似度等于点积。
6. **分类**：朴素贝叶斯作基线，逻辑回归用于生产。
7. **评估**：每类精确率与召回率、宏平均 F1、混淆矩阵。

## 代码任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/01-text-processing/code/main.py, phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/code/main.py, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/code/main.py

| 任务 | 代码 |
|---|---|
| 分词、提词干与词形还原 | `preprocess(text, pos_tagger=demo_pos_tagger)` |
| Porter 第 1a 步 | `stem_step_1a(word)` |
| 带兜底的查表词形还原 | `lemmatize(word, pos)` |
| 计数矩阵 | `bag_of_words(docs, build_vocab(docs))` |
| 单位球面上的 TF-IDF 行 | `l2_normalize(tfidf(bow))` |
| 确定否定范围 | `apply_negation(tokens)` |
| 朴素贝叶斯基线 | `train_nb(docs_by_class, vocab, alpha=1.0)` |
| 折叠 Gibbs 采样 LDA | `collapsed_gibbs_lda(docs, n_topics=3, n_iters=300, seed=42)` |

## NLTK：token、词干与词形
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/01-text-processing/docs/zh.md

```python
nltk.download("punkt_tab")
nltk.download("wordnet")
nltk.download("averaged_perceptron_tagger_eng")
tokens = word_tokenize(text)                      # 缩约形式、Unicode
stems = [PorterStemmer().stem(t) for t in tokens] # all five phases
tagged = pos_tag(tokens)                          # Penn Treebank 标签
lemmatizer = WordNetLemmatizer()
lemmas = [lemmatizer.lemmatize(t, nltk_pos_to_wordnet(tag)) for t, tag in tagged]  # V>v J>a R>r，其余为 n
```

## scikit-learn 情感基线
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md

```python
pipe = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 2),       # 二元词组，让 not_good 成为特征
        min_df=2,
        sublinear_tf=True,        # 抑制重复词的权重
        stop_words=None)),        # 保留否定词
    ("clf", LogisticRegression(C=1.0, max_iter=1000)),
])
pipe.fit(X_train, y_train)
print(pipe.score(X_test, y_test))  # 这 3 个设置在 SST-2 上达到 75% 至 85%
```

## 向量化器参数
type: command-table
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md

| 命令 | 作用 |
|---|---|
| `CountVectorizer()` | 一次完成分词、词表构建和词袋计数 |
| `TfidfVectorizer()` | 增加 IDF 加权与 L2 归一化 |
| `ngram_range=(1, 2)` | 包含二元词组，通常改善分类 |
| `min_df=2` | 丢弃出现在少于 2 篇文档中的词 |
| `max_df=0.95` | 丢弃出现在超过 95% 文档中的词 |
| `stop_words="english"` | 内置停用词表，不适合情感分析 |
| `sublinear_tf=True` | 用 `1 + log(tf)` 代替原始 `tf` |
| `get_feature_names_out()` | 按列顺序列出词表 |

## 主题模型
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/zh.md

```python
cv = CountVectorizer(max_features=max_features, stop_words="english",
                     min_df=2, max_df=0.9)   # LDA 需要原始计数
X = cv.fit_transform(documents)
lda = LatentDirichletAllocation(n_components=n_topics, random_state=42,
                                max_iter=50, learning_method="online")
doc_topic = lda.fit_transform(X)           # (n_docs, n_topics)，每行和为 1
topic_model = BERTopic(
    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
    min_topic_size=15)                     # 库默认值为 10
topics, probs = topic_model.fit_transform(documents)
info = topic_model.get_topic_info()       # 主题 -1 是离群项桶
```

## 公式
type: concepts
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/zh.md

- **TF-IDF**: $\frac{\mathrm{count}(w \text{ in } d)}{|d|} \cdot \log\frac{N}{\mathrm{df}(w)}$
- **平滑 IDF**：$\log\frac{n + 1}{d + 1} + 1$。出现在每篇文档的词仍保留 IDF 1。
- **L2 行归一化**：每行除以自身范数，避免长文档占主导。
- **朴素贝叶斯**：对数先验加 $P(\text{word} \mid \text{class})$ 的对数和，取最大值。
- **Laplace 平滑**：$(\mathrm{count} + \alpha) / (\mathrm{total} + \alpha |V|)$。避免零概率。
- **逻辑回归**：对 $Xw + b$ 取 sigmoid。达到 0.5 时预测为 1。
- **宏平均 F1**：各类 F1 等权平均。
- **c_v 一致性**：高频主题词对的 NPMI，用余弦相似度比较。越高越好。

## 默认值
type: defaults
from: phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| NB `alpha` | 1.0 | 教学默认值，实践常用 0.01 |
| LR `l2` | 0.01 | 从此开始调优；稀疏特征易过拟合 |
| LR `epochs`, `lr` | 500 | 学习率为 0.05 |
| LR `C` | 1.0 | scikit-learn 中使用 `max_iter=1000` |
| BERTopic `min_topic_size` | 10 | 超过 10,000 篇文档时用 50 或 100 |
| Gibbs `alpha`, `beta` | 0.1 | Beta 为 0.01，两者必须为正 |
| Gibbs `n_iters` | 200 | 演示运行 300 次 |
| 主题数 | `max(5, round(sqrt(n_docs)))` | 少于 40,000 篇文档时上限为 200 |

## 故障排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/01-text-processing/docs/zh.md, phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 部署后准确率下降 | 训练与推理预处理不同 | 在模型中交付同一预处理函数 |
| 升级后 token 改变 | 库版本漂移 | 固定版本，冻结 20 个样例句 |
| `ponies` 提词干后为 `poni` | 只执行第 1a 步的 `ies` 规则 | 使用含第 1b 步的完整 Porter |
| `watched` 保持为 `watched` | 词形表没有 `ed` 规则 | 使用 WordNet 或 spaCy |
| “not good”被判为正向 | 停用词表删除否定词 | 使用 `stop_words=None` 加二元词组 |
| 总分高、少数类表现差 | 不平衡时使用微平均 F1 或准确率 | 报告宏平均 F1；超过 95-5 时用 AUPRC |
| LDA 主题杂乱 | 停用词与高频词干扰 | 设置 `min_df` 和 `max_df` |
| 大量文档归入主题 -1 | HDBSCAN 离群项桶 | 检查 `min_topic_size`，阅读 -1 文档 |

## 按场景选择
type: qa
from: phases/05-nlp-foundations-to-advanced/01-text-processing/docs/zh.md, phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/zh.md

- **提词干还是词形还原？** 搜索索引用词干，用户阅读的文本用词形还原。
- **NLTK 还是 spaCy？** NLTK 用于教学与替换组件，spaCy 用于生产速度。
- **TF-IDF 还是嵌入？** 垃圾信息、日志、小数据与可解释模型选 TF-IDF。
- **何时用 transformer？** 讽刺、方面级分析、情感转折与低资源语言。
- **LDA 还是 BERTopic？** 有混合主题的长文档用 LDA，短文本用 BERTopic。
- **没有 GPU？** 使用 LDA 或 NMF。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/02-bag-of-words-tfidf/docs/zh.md, phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/zh.md, phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/zh.md

- 保持稀疏表示。100k 篇文档的稠密 TF-IDF 无法放入内存。
- 相信指标前，先阅读每类 5 条错误预测。
- 在自己的流水线上重新跑基线，不直接采用论文数字。
