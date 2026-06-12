# 文本处理 —— 分词、词干提取、词形还原

> 语言是连续的，模型是离散的。预处理就是中间那座桥。

**类型：** Build
**语言：** Python
**前置要求：** Phase 2 · 14（朴素贝叶斯）
**预计时间：** ~45 分钟

## 问题背景

模型读不懂 "The cats were running."，它读的是整数。

每一个 NLP 系统开篇都得回答同样的三个问题：一个词从哪里开始？这个词的词根是什么？什么时候该把 "run"、"running"、"ran" 当成同一个东西，什么时候又该把它们当成不同的东西？

分词搞错，模型就在垃圾上学习。如果你的分词器把 `don't` 当成一个 token，却把 `do n't` 当成两个，训练分布就会裂开。如果你的词干提取器把 `organization` 和 `organ` 归到同一个词干，主题建模就完了。如果你的词形还原器需要词性上下文，你却没传进去，动词就会被当成名词处理。

这节课从零实现这三个预处理步骤，然后展示 NLTK 和 spaCy 是怎么做同样的事的，让你看清其中的取舍。

## 核心概念

三个操作，每个都有它的任务，也有它的翻车方式。

**分词（Tokenization）** 把字符串切成一个个 token。"token" 这个词故意说得含糊，因为合适的粒度取决于任务：经典 NLP 用词级，transformer 用子词级，没有空格分隔的语言用字符级。

**词干提取（Stemming）** 用规则砍掉后缀。快、狠、笨。`running -> run`，`organization -> organ`。后面这个就是它的翻车方式。

**词形还原（Lemmatization）** 借助语法知识把词还原成字典里的形态。慢、准，需要一张查找表或形态分析器。`ran -> run`（得知道 "ran" 是 "run" 的过去式），`better -> good`（得懂比较级）。

经验法则：看重速度、能容忍噪声时用词干提取（搜索索引、粗糙分类）。看重语义时用词形还原（问答、语义搜索，以及任何会被用户读到的东西）。

```figure
edit-distance
```

## 动手构建

### 第 1 步：一个正则分词器

最简单又好用的分词器，按非字母数字字符切分，同时把标点单独保留成 token。不完美，也不是最终版，但一行就能跑。

```python
import re

def tokenize(text):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]", text)
```

三个模式，按优先级排列：带可选内部撇号的词（`don't`、`it's`），纯数字，任意单个非空白且非字母数字的字符作为独立 token（标点）。

```python
>>> tokenize("The cats weren't running at 3pm.")
['The', 'cats', "weren't", 'running', 'at', '3', 'pm', '.']
```

注意它的翻车方式：`3pm` 被切成 `['3', 'pm']`，因为我们在字母段和数字段之间交替匹配。对大多数任务来说够用了。URL、邮箱、话题标签全都会被切坏。要上生产，就在通用模式之前加上专门的模式。

### 第 2 步：一个 Porter 词干提取器（只做 step 1a）

完整的 Porter 算法有五个阶段的规则。光是 step 1a 就覆盖了英语里最常见的后缀，也足以讲清楚套路。

```python
def stem_step_1a(word):
    if word.endswith("sses"):
        return word[:-2]
    if word.endswith("ies"):
        return word[:-2]
    if word.endswith("ss"):
        return word
    if word.endswith("s") and len(word) > 1:
        return word[:-1]
    return word
```

```python
>>> [stem_step_1a(w) for w in ["caresses", "ponies", "caress", "cats"]]
['caress', 'poni', 'caress', 'cat']
```

规则自上而下读。`ies -> i` 这条规则就是为什么 `ponies -> poni` 而不是 `pony`。真正的 Porter 有 step 1b 会把它修好。规则之间会竞争，靠前的规则赢。顺序比任何单条规则都重要。

### 第 3 步：一个基于查表的词形还原器

真正的词形还原需要形态学。一个适合教学、又跑得动的版本，用一张小小的 lemma 表加一个兜底逻辑。

```python
LEMMA_TABLE = {
    ("running", "VERB"): "run",
    ("ran", "VERB"): "run",
    ("runs", "VERB"): "run",
    ("better", "ADJ"): "good",
    ("best", "ADJ"): "good",
    ("cats", "NOUN"): "cat",
    ("cat", "NOUN"): "cat",
    ("were", "VERB"): "be",
    ("was", "VERB"): "be",
    ("is", "VERB"): "be",
}

def lemmatize(word, pos):
    key = (word.lower(), pos)
    if key in LEMMA_TABLE:
        return LEMMA_TABLE[key]
    if pos == "VERB" and word.endswith("ing"):
        return word[:-3]
    if pos == "NOUN" and word.endswith("s"):
        return word[:-1]
    return word.lower()
```

```python
>>> lemmatize("running", "VERB")
'run'
>>> lemmatize("cats", "NOUN")
'cat'
>>> lemmatize("better", "ADJ")
'good'
>>> lemmatize("watched", "VERB")
'watched'
```

最后一个例子才是关键的教学点。`watched` 不在我们表里，而兜底逻辑只处理 `ing`。真正的词形还原要覆盖 `ed`、不规则动词、形容词比较级、带读音变化的复数（`children -> child`）。这就是为什么生产系统会用 WordNet、spaCy 的形态分析器，或者一个完整的形态分析器。

### 第 4 步：把它们串起来

```python
def preprocess(text, pos_tagger=None):
    tokens = tokenize(text)
    stems = [stem_step_1a(t.lower()) for t in tokens]
    tags = pos_tagger(tokens) if pos_tagger else [(t, "NOUN") for t in tokens]
    lemmas = [lemmatize(word, pos) for word, pos in tags]
    return {"tokens": tokens, "stems": stems, "lemmas": lemmas}
```

缺的那块拼图是一个词性标注器。Phase 5 · 07（词性标注）会做一个。眼下先把所有词都默认成 `NOUN`，并承认这个局限。

## 实际使用

NLTK 和 spaCy 自带生产级版本，各自几行代码搞定。

### NLTK

```python
import nltk
nltk.download("punkt_tab")
nltk.download("wordnet")
nltk.download("averaged_perceptron_tagger_eng")

from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk import pos_tag

text = "The cats were running."
tokens = word_tokenize(text)
stems = [PorterStemmer().stem(t) for t in tokens]
lemmatizer = WordNetLemmatizer()
tagged = pos_tag(tokens)


def nltk_pos_to_wordnet(tag):
    if tag.startswith("V"):
        return "v"
    if tag.startswith("J"):
        return "a"
    if tag.startswith("R"):
        return "r"
    return "n"


lemmas = [lemmatizer.lemmatize(t, nltk_pos_to_wordnet(tag)) for t, tag in tagged]
```

`word_tokenize` 能处理缩写、Unicode，以及你的正则会漏掉的各种边界情况。`PorterStemmer` 跑完全部五个阶段。`WordNetLemmatizer` 需要把词性标签从 NLTK 用的 Penn Treebank 体系翻译成 WordNet 的缩写集合。上面这段翻译接线，正是大多数教程会跳过的那一段。

### spaCy

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running.")

for token in doc:
    print(token.text, token.lemma_, token.pos_)
```

```
The      the     DET
cats     cat     NOUN
were     be      AUX
running  run     VERB
.        .       PUNCT
```

spaCy 把整条流水线藏在 `nlp(text)` 后面，分词、词性标注、词形还原一次跑完。规模上比 NLTK 快，开箱即用也更准。代价是你没法轻易替换单个组件。

### 该选哪个

| 场景 | 选择 |
|-----------|------|
| 教学、研究、需要替换组件 | NLTK |
| 生产、多语言、看重速度 | spaCy |
| transformer 流水线（反正你要用模型自带的分词器分词） | 用 `tokenizers` / `transformers`，跳过经典预处理 |

### 没人提醒你的两种翻车方式

大多数教程教完算法就停了。有两件事会咬到真实的预处理流水线，而它们几乎从不被提及。

**可复现性漂移。** NLTK 和 spaCy 会在不同版本之间改变分词和词形还原的行为。在 spaCy 2.x 里产出 `['do', "n't"]` 的输入，到了 3.x 里可能变成 `["don't"]`。你的模型是在一种分布上训练的，现在推理跑在另一种分布上。准确率悄悄下滑，没人知道为什么。在 `requirements.txt` 里钉死库版本。写一个预处理回归测试，冻结住 20 个样本句子的预期分词结果。每次升级都跑一遍。

**训练 / 推理不一致。** 训练时用了激进的预处理（小写化、去停用词、词干提取），部署时却喂原始用户输入，然后眼看性能崩盘。这是生产环境里最常见的 NLP 翻车方式，没有之一。如果训练时做了预处理，推理时就必须跑完全相同的函数。把预处理作为一个函数打包进模型包里，而不是当成一个 notebook 单元、让服务团队重写一遍。

## 拿去用

一个可复用的 prompt，帮工程师不必啃三本教科书就能挑出预处理策略。

存为 `outputs/prompt-preprocessing-advisor.md`：

```markdown
---
name: preprocessing-advisor
description: Recommends a tokenization, stemming, and lemmatization setup for an NLP task.
phase: 5
lesson: 01
---

You advise on classical NLP preprocessing. Given a task description, you output:

1. Tokenization choice (regex, NLTK word_tokenize, spaCy, or transformer tokenizer). Explain why.
2. Whether to stem, lemmatize, both, or neither. Explain why.
3. Specific library calls. Name the functions. Quote the POS-tag translation if NLTK is involved.
4. One failure mode the user should test for.

Refuse to recommend stemming for user-visible text. Refuse to recommend lemmatization without POS tags. Flag non-English input as needing a different pipeline.
```

## 练习

1. **简单。** 扩展 `tokenize`，把 URL 保留成单个 token。测试：`tokenize("Visit https://example.com today.")` 应当产出一个 URL token。
2. **中等。** 实现 Porter 的 step 1b。如果一个词含有元音、且以 `ed` 或 `ing` 结尾，就把后缀去掉。处理好双辅音规则（`hopping -> hop`，不是 `hopp`）。
3. **困难。** 做一个词形还原器，用 WordNet 当查找表，但在 WordNet 没有条目时回退到你的 Porter 词干提取器。在一个带标注的语料上，把它的准确率和纯 WordNet、纯 Porter 做对比。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| Token | 一个词 | 模型消费的任意单位，可以是词、子词、字符或字节。 |
| 词干（Stem） | 词的词根 | 基于规则去后缀的结果，不一定是真实存在的词。 |
| 词元（Lemma） | 字典形态 | 你查字典会查的那个形态，要算对它需要语法上下文。 |
| 词性标签（POS tag） | 词性 | 像 NOUN、VERB、ADJ 这样的类别，准确还原词形需要它。 |
| 形态学（Morphology） | 词形规则 | 一个词如何随时态、数、格而改变形态。词形还原依赖它。 |

## 延伸阅读

- [Porter, M. F. (1980). An algorithm for suffix stripping](https://tartarus.org/martin/PorterStemmer/def.txt) —— 原始论文，五页，至今仍是最清晰的讲解。
- [spaCy 101 — linguistic features](https://spacy.io/usage/linguistic-features) —— 真实流水线是怎么接起来的。
- [NLTK book, chapter 3](https://www.nltk.org/book/ch03.html) —— 你还没想到过的分词边界情况。
