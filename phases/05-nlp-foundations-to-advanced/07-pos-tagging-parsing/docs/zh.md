# 词性标注与句法分析

> 语法曾一度不入时。后来每条 LLM 流水线都得校验结构化抽取，它就回来了。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 01（文本处理）、Phase 2 · 14（朴素贝叶斯）
**预计时间：** ~45 分钟

## 问题背景

第 01 课许诺过：词形还原需要词性标签。不知道 `running` 是动词，词形还原器就没法把它还原成 `run`。不知道 `better` 是形容词，就没法还原成 `good`。

那个许诺背后藏着一整个子领域。词性标注给词分配语法类别。句法分析恢复句子的树状结构：哪个词修饰哪个，哪个动词支配哪些论元。经典 NLP 花了二十年打磨这两件事。然后深度学习把它们塌缩成预训练 transformer 之上的一个 token 分类任务，研究界就往前走了。

但应用界没走。每条结构化抽取流水线底下仍然用着词性和依存树。LLM 生成的 JSON 要拿语法约束去校验。问答系统用依存分析拆解查询。机器翻译质量评估器检查分析树之间的对齐。

值得懂。这节课介绍标签集、各种基线，以及你该在哪个点停止从零实现、转而调用 spaCy。

## 核心概念

**词性标注** 给每个 token 标一个语法类别。**Penn Treebank（PTB）** 标签集是英语的默认选择。36 个标签，有些区分在随意的读者看来很挑剔：`NN` 单数名词、`NNS` 复数名词、`NNP` 单数专有名词、`VBD` 动词过去式、`VBZ` 动词第三人称单数现在时，等等。**Universal Dependencies（UD）** 标签集更粗（17 个标签）、与语言无关；它成了跨语言工作的默认选择。

```
The/DET cats/NOUN were/AUX running/VERB at/ADP 3pm/NOUN ./PUNCT
```

**句法分析** 产出一棵树。两大流派：

- **成分句法分析（Constituency）。** 名词短语、动词短语、介词短语相互嵌套。输出是一棵非终结符类别（NP、VP、PP）的树，词作为叶子。
- **依存句法分析（Dependency）。** 每个词有唯一一个它所依赖的中心词（head），并标上语法关系。输出是一棵树，每条边都是一个 (head, dependent, relation) 三元组。

依存分析在 2010 年代胜出，因为它能干净地跨语言泛化，尤其是自由语序的语言。

```
running is ROOT
cats is nsubj of running
were is aux of running
at is prep of running
3pm is pobj of at
```

```figure
pos-tagger
```

```figure
dependency-arcs
```

## 动手构建

### 第 1 步：最频繁标签基线

最笨却管用的词性标注器。对每个词，预测它在训练里出现最频繁的那个标签。

```python
from collections import Counter, defaultdict


def train_mft(train_examples):
    word_tag_counts = defaultdict(Counter)
    all_tags = Counter()
    for tokens, tags in train_examples:
        for token, tag in zip(tokens, tags):
            word_tag_counts[token.lower()][tag] += 1
            all_tags[tag] += 1
    word_best = {w: c.most_common(1)[0][0] for w, c in word_tag_counts.items()}
    default_tag = all_tags.most_common(1)[0][0]
    return word_best, default_tag


def predict_mft(tokens, word_best, default_tag):
    return [word_best.get(t.lower(), default_tag) for t in tokens]
```

在 Brown 语料上，这个基线命中约 85% 准确率。不算好，但任何严肃模型都不该跌破这条地板线。

### 第 2 步：二元 HMM 标注器

建模序列的联合概率：

```
P(tags, words) = prod P(tag_i | tag_{i-1}) * P(word_i | tag_i)
```

两张表：转移概率（给定前一个标签时的标签），发射概率（给定标签时的词）。两者都用拉普拉斯平滑从计数里估计。用 Viterbi 解码（在标签网格上做动态规划）。

```python
import math


def train_hmm(train_examples, alpha=0.01):
    transitions = defaultdict(Counter)
    emissions = defaultdict(Counter)
    tags = set()
    vocab = set()

    for tokens, ts in train_examples:
        prev = "<BOS>"
        for token, tag in zip(tokens, ts):
            transitions[prev][tag] += 1
            emissions[tag][token.lower()] += 1
            tags.add(tag)
            vocab.add(token.lower())
            prev = tag
        transitions[prev]["<EOS>"] += 1

    return transitions, emissions, tags, vocab


def log_prob(table, given, key, smooth_denom, alpha):
    return math.log((table[given].get(key, 0) + alpha) / smooth_denom)


def viterbi(tokens, transitions, emissions, tags, vocab, alpha=0.01):
    tags_list = list(tags)
    n = len(tokens)
    V = [[0.0] * len(tags_list) for _ in range(n)]
    back = [[0] * len(tags_list) for _ in range(n)]

    for j, tag in enumerate(tags_list):
        em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
        tr_denom = sum(transitions["<BOS>"].values()) + alpha * (len(tags_list) + 1)
        tr = log_prob(transitions, "<BOS>", tag, tr_denom, alpha)
        em = log_prob(emissions, tag, tokens[0].lower(), em_denom, alpha)
        V[0][j] = tr + em
        back[0][j] = 0

    for i in range(1, n):
        for j, tag in enumerate(tags_list):
            em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
            em = log_prob(emissions, tag, tokens[i].lower(), em_denom, alpha)
            best_prev = 0
            best_score = -1e30
            for k, prev_tag in enumerate(tags_list):
                tr_denom = sum(transitions[prev_tag].values()) + alpha * (len(tags_list) + 1)
                tr = log_prob(transitions, prev_tag, tag, tr_denom, alpha)
                score = V[i - 1][k] + tr + em
                if score > best_score:
                    best_score = score
                    best_prev = k
            V[i][j] = best_score
            back[i][j] = best_prev

    last_best = max(range(len(tags_list)), key=lambda j: V[n - 1][j])
    path = [last_best]
    for i in range(n - 1, 0, -1):
        path.append(back[i][path[-1]])
    return [tags_list[j] for j in reversed(path)]
```

Brown 上的二元 HMM 命中约 93% 准确率。从 85% 到 93% 的跃升大部分来自转移概率——模型学到 `DET NOUN` 很常见，`NOUN DET` 很罕见。

### 第 3 步：现代标注器为什么打得过它

转移 + 发射概率是局部的。它们捕捉不到 `saw` 在 "I bought a saw" 里是名词、在 "I saw the movie" 里是动词。一个带任意特征（后缀、词形、前后词、词本身）的 CRF 命中约 97%。BiLSTM-CRF 或 transformer 命中约 98%+。

这个任务的上限由标注者分歧决定。人类标注者在 Penn Treebank 上约有 97% 的一致率。超过 98% 的模型多半是在过拟合测试集。

### 第 4 步：依存句法分析的勾勒

从零做完整的依存分析超出范围；经典教科书的处理见 Jurafsky 和 Martin。两个要知道的经典流派：

- **基于转移的（transition-based）** 分析器（arc-eager、arc-standard）像移进-归约分析器：读 token，把它们移进一个栈，再施加创建弧的归约动作。贪心解码很快。经典实现是 MaltParser。现代神经版：Chen 和 Manning 的基于转移的分析器。
- **基于图的（graph-based）** 分析器（Eisner 算法、Dozat-Manning biaffine）给每一条可能的 head-dependent 边打分，挑出最大生成树。更慢但更准。

大多数应用工作里，调 spaCy 就行：

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running at 3pm.")
for token in doc:
    print(f"{token.text:10s} tag={token.tag_:5s} pos={token.pos_:6s} dep={token.dep_:10s} head={token.head.text}")
```

```
The        tag=DT    pos=DET    dep=det        head=cats
cats       tag=NNS   pos=NOUN   dep=nsubj      head=running
were       tag=VBD   pos=AUX    dep=aux        head=running
running    tag=VBG   pos=VERB   dep=ROOT       head=running
at         tag=IN    pos=ADP    dep=prep       head=running
3pm        tag=NN    pos=NOUN   dep=pobj       head=at
.          tag=.     pos=PUNCT  dep=punct      head=running
```

把 `dep` 列从下往上读，句子的语法结构就浮出来了。

## 实际使用

每个生产级 NLP 库都把词性和依存分析器作为标准流水线的一部分提供。

- **spaCy**（`en_core_web_sm` / `md` / `lg` / `trf`）。快、准，和分词 + NER + 词形还原集成在一起。`token.tag_`（Penn）、`token.pos_`（UD）、`token.dep_`（依存关系）。
- **Stanford NLP（stanza）**。斯坦福对 CoreNLP 的继任者。在 60+ 种语言上处于最前沿。
- **trankit**。基于 transformer，UD 准确率不错。
- **NLTK**。`pos_tag`。能用，慢，较旧。教学够用。

### 它在 2026 年仍然重要的地方

- **词形还原。** 第 01 课需要词性才能正确还原。永远如此。
- **从 LLM 输出做结构化抽取。** 校验生成的句子是否遵守语法约束（比如主谓一致、必需的修饰语）。
- **基于方面的情感。** 依存分析告诉你哪个形容词修饰哪个名词。
- **查询理解。** "movies directed by Wes Anderson starring Bill Murray" 通过分析拆解成结构化约束。
- **跨语言迁移。** UD 标签和依存关系与语言无关，使得对新语言做 zero-shot 结构分析成为可能。
- **低算力流水线。** 如果你没法上 transformer，词性 + 依存分析 + 词典能带你走得出奇地远。

## 拿去用

存为 `outputs/skill-grammar-pipeline.md`：

```markdown
---
name: grammar-pipeline
description: Design a classical POS + dependency pipeline for a downstream NLP task.
version: 1.0.0
phase: 5
lesson: 07
tags: [nlp, pos, parsing]
---

Given a downstream task (information extraction, rewrite validation, query decomposition, lemmatization), you output:

1. Tagset to use. Penn Treebank for English-only legacy pipelines, Universal Dependencies for multilingual or cross-lingual.
2. Library. spaCy for most production, stanza for academic-grade multilingual, trankit for highest UD accuracy. Name the specific model ID.
3. Integration pattern. Show the 3-5 lines that call the library and consume the needed attributes (`.pos_`, `.dep_`, `.head`).
4. Failure mode to test. Noun-verb ambiguity (`saw`, `book`, `can`) and PP-attachment ambiguity are the classical traps. Sample 20 outputs and eyeball.

Refuse to recommend rolling your own parser. Building parsers from scratch is a research project, not an application task. Flag any pipeline that consumes POS tags without handling lowercase/uppercase variants as fragile.
```

## 练习

1. **简单。** 在一个小型带标注语料（比如 NLTK 的 Brown 子集）上用最频繁标签基线，在留出句子上测准确率。验证那个约 85% 的结果。
2. **中等。** 训练上面的二元 HMM，报告各标签的精确率/召回率。HMM 把哪些标签搞混得最多？
3. **困难。** 用 spaCy 的依存分析从一个 1000 句的样本里抽取主-谓-宾三元组。在 50 个手工标注的三元组上评估。记录抽取在哪里失败（往往是被动语态、并列结构和省略主语）。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 词性标签（POS tag） | 词的类型 | 语法类别。PTB 有 36 个；UD 有 17 个。 |
| Penn Treebank | 标准标签集 | 英语专用。动词时态和名词数都很细。 |
| Universal Dependencies | 多语言标签集 | 比 PTB 粗；与语言无关；跨语言工作的默认选择。 |
| 依存分析 | 句子树 | 每个词有一个 head，每条边有一个语法关系。 |
| Viterbi | 动态规划 | 给定发射和转移，找出概率最高的标签序列。 |

## 延伸阅读

- [Jurafsky and Martin — Speech and Language Processing, chapters 8 and 18](https://web.stanford.edu/~jurafsky/slp3/) —— 词性与句法分析的经典教科书处理。
- [Universal Dependencies project](https://universaldependencies.org/) —— 每个多语言分析器都在用的跨语言标签集与树库合集。
- [spaCy linguistic features guide](https://spacy.io/usage/linguistic-features) —— `Token` 上每个属性的实用参考。
- [Chen and Manning (2014). A Fast and Accurate Dependency Parser using Neural Networks](https://nlp.stanford.edu/pubs/emnlp2014-depparser.pdf) —— 把神经分析器带入主流的那篇论文。
