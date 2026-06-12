# 命名实体识别

> 把名字抽出来。听着简单，直到你撞上模糊的边界、嵌套实体和领域黑话。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 02（BoW + TF-IDF）、Phase 5 · 03（词嵌入）
**预计时间：** ~75 分钟

## 问题背景

"Apple sued Google over its iPhone search deal in the US." 五个实体：Apple（ORG）、Google（ORG）、iPhone（PRODUCT）、search deal（也许算）、US（GPE）。一个好的 NER 系统会把它们全抽出来，类型也对。一个差的会漏掉 iPhone，把"苹果"这种水果和苹果公司搞混，还把 "US" 标成 PERSON。

NER 是每条结构化抽取流水线底下的主力。简历解析、合规日志扫描、病历脱敏、搜索查询理解、为聊天机器人回复做事实接地、法律合同抽取。你几乎从没正眼看过它，却总在依赖它。

这节课把经典路线（基于规则、HMM、CRF）一路走到现代路线（BiLSTM-CRF，然后是 transformer）。每一步都解决前一步的某个具体局限。这个演进模式本身才是这节课的重点。

## 核心概念

**BIO 标注**（或 BILOU）把实体抽取变成一个序列标注问题。给每个 token 标上 `B-TYPE`（实体开始）、`I-TYPE`（实体内部）或 `O`（任何实体之外）。

```
Apple    B-ORG
sued     O
Google   B-ORG
over     O
its      O
iPhone   B-PRODUCT
search   O
deal     O
in       O
the      O
US       B-GPE
.        O
```

多 token 实体串起来：`New B-GPE`、`York I-GPE`、`City I-GPE`。一个理解 BIO 的模型能抽取任意片段（span）。

架构的演进：

- **基于规则。** 正则 + 词典（gazetteer）查表。对已知实体精确率高，对新实体覆盖为零。
- **HMM。** 隐马尔可夫模型。给定标签时 token 的发射概率，标签到标签的转移概率。用 Viterbi 解码。在标注数据上训练。
- **CRF。** 条件随机场。像 HMM 但是判别式的，所以你能混入任意特征（词形、大小写、相邻词）。到 2026 年，对低资源部署它仍是经典生产主力。
- **BiLSTM-CRF。** 用神经特征代替手工特征。LSTM 双向读句子，顶上加 CRF 层强制标签序列一致。
- **基于 transformer。** 用 token 分类头微调 BERT。准确率最好，算力最贵。

```figure
ner-bio-tagging
```

## 动手构建

### 第 1 步：BIO 标注辅助函数

```python
def spans_to_bio(tokens, spans):
    labels = ["O"] * len(tokens)
    for start, end, label in spans:
        labels[start] = f"B-{label}"
        for i in range(start + 1, end):
            labels[i] = f"I-{label}"
    return labels


def bio_to_spans(tokens, labels):
    spans = []
    current = None
    for i, label in enumerate(labels):
        if label.startswith("B-"):
            if current:
                spans.append(current)
            current = (i, i + 1, label[2:])
        elif label.startswith("I-") and current and current[2] == label[2:]:
            current = (current[0], i + 1, current[2])
        else:
            if current:
                spans.append(current)
                current = None
    if current:
        spans.append(current)
    return spans
```

```python
>>> tokens = ["Apple", "sued", "Google", "over", "iPhone", "sales", "."]
>>> labels = ["B-ORG", "O", "B-ORG", "O", "B-PRODUCT", "O", "O"]
>>> bio_to_spans(tokens, labels)
[(0, 1, 'ORG'), (2, 3, 'ORG'), (4, 5, 'PRODUCT')]
```

### 第 2 步：手工特征

对经典（非神经）NER 来说，特征就是胜负手。好用的有：

```python
def token_features(token, prev_token, next_token):
    return {
        "lower": token.lower(),
        "is_upper": token.isupper(),
        "is_title": token.istitle(),
        "has_digit": any(c.isdigit() for c in token),
        "suffix_3": token[-3:].lower(),
        "shape": word_shape(token),
        "prev_lower": prev_token.lower() if prev_token else "<BOS>",
        "next_lower": next_token.lower() if next_token else "<EOS>",
    }


def word_shape(word):
    out = []
    for c in word:
        if c.isupper():
            out.append("X")
        elif c.islower():
            out.append("x")
        elif c.isdigit():
            out.append("d")
        else:
            out.append(c)
    return "".join(out)
```

`word_shape("iPhone")` 返回 `xXxxxx`。`word_shape("USA-2024")` 返回 `XXX-dddd`。大小写模式对专有名词是高信号特征。

### 第 3 步：一个简单的规则 + 词典基线

```python
ORG_GAZETTEER = {"Apple", "Google", "Microsoft", "OpenAI", "Meta", "Amazon", "Netflix"}
GPE_GAZETTEER = {"US", "USA", "UK", "India", "Germany", "France"}
PRODUCT_GAZETTEER = {"iPhone", "Android", "Windows", "ChatGPT", "Claude"}


def rule_based_ner(tokens):
    labels = []
    for token in tokens:
        if token in ORG_GAZETTEER:
            labels.append("B-ORG")
        elif token in GPE_GAZETTEER:
            labels.append("B-GPE")
        elif token in PRODUCT_GAZETTEER:
            labels.append("B-PRODUCT")
        else:
            labels.append("O")
    return labels
```

生产级词典有从 Wikipedia 和 DBpedia 爬来的数百万条目。覆盖不错，但消歧（苹果公司 vs 水果）糟糕透顶。这就是为什么统计模型赢了。

### 第 4 步：CRF 这一步（只勾勒，不给完整实现）

没有概率论基础垫底，用 50 行从零写一个 CRF 并不能带来启发。改用 `sklearn-crfsuite`：

```python
import sklearn_crfsuite

def to_features(tokens):
    out = []
    for i, tok in enumerate(tokens):
        prev = tokens[i - 1] if i > 0 else ""
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        out.append({
            "word.lower()": tok.lower(),
            "word.isupper()": tok.isupper(),
            "word.istitle()": tok.istitle(),
            "word.isdigit()": tok.isdigit(),
            "word.suffix3": tok[-3:].lower(),
            "word.shape": word_shape(tok),
            "prev.word.lower()": prev.lower(),
            "next.word.lower()": nxt.lower(),
            "BOS": i == 0,
            "EOS": i == len(tokens) - 1,
        })
    return out


crf = sklearn_crfsuite.CRF(algorithm="lbfgs", c1=0.1, c2=0.1, max_iterations=100, all_possible_transitions=True)
X_train = [to_features(s) for s in sentences_tokenized]
crf.fit(X_train, bio_labels_train)
```

`c1` 和 `c2` 是 L1 和 L2 正则化。`all_possible_transitions=True` 让模型学到非法序列（比如 `O` 之后接 `I-ORG`）不太可能出现——CRF 就是这样在你没手写约束的情况下强制 BIO 一致性的。

### 第 5 步：BiLSTM-CRF 加了什么

特征变成学出来的。输入：token embedding（GloVe 或 fastText）。LSTM 从左到右、从右到左各读一遍。拼接后的隐藏状态过一个 CRF 输出层。CRF 仍然强制标签序列一致；LSTM 用学到的特征替换了手工特征。

```python
import torch
import torch.nn as nn


class BiLSTM_CRF_Head(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_labels):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, bidirectional=True, batch_first=True)
        self.fc = nn.Linear(hidden_dim * 2, n_labels)

    def forward(self, token_ids):
        e = self.embed(token_ids)
        h, _ = self.lstm(e)
        emissions = self.fc(h)
        return emissions
```

CRF 层用 `torchcrf.CRF`（pip install pytorch-crf）。相比手工特征 CRF 的增益是可测量的，但比你预期的要小——除非你有数万句标注数据。

## 实际使用

spaCy 开箱即用提供生产级 NER。

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple sued Google over its iPhone search deal in the US.")
for ent in doc.ents:
    print(f"{ent.text:20s} {ent.label_}")
```

```
Apple                ORG
Google               ORG
iPhone               ORG
US                   GPE
```

注意 `iPhone` 被标成 `ORG` 而不是 `PRODUCT`——spaCy 的小模型对产品实体覆盖很弱。大模型（`en_core_web_lg`）更好。transformer 模型（`en_core_web_trf`）更好。

用 Hugging Face 做基于 BERT 的 NER：

```python
from transformers import pipeline

ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
print(ner("Apple sued Google over its iPhone in the US."))
```

```
[{'entity_group': 'ORG', 'word': 'Apple', ...},
 {'entity_group': 'ORG', 'word': 'Google', ...},
 {'entity_group': 'MISC', 'word': 'iPhone', ...},
 {'entity_group': 'LOC', 'word': 'US', ...}]
```

`aggregation_strategy="simple"` 把连续的 B-X、I-X token 合并成一个 span。不加它的话，你拿到的是 token 级标签，得自己合并。

### 基于 LLM 的 NER（2026 年的选项）

zero-shot 和 few-shot 的 LLM NER 如今在许多领域已经能和微调模型掰手腕，而在标注数据稀缺时表现得好得多。

- **Zero-shot prompting。** 给 LLM 一个实体类型列表和一个示例 schema，让它输出 JSON。开箱即用；在新领域上准确率中等。
- **ZeroTuneBio 式 prompting。** 把任务拆成候选抽取 → 含义解释 → 判断 → 复查。一个多阶段 prompt（而非一次性的）能在生物医学 NER 上大幅提升准确率。同样的模式对法律、金融、科学领域都有效。
- **配合 RAG 的动态 prompting。** 每次推理调用时，从一个小的标注种子集里检索最相似的标注样本，即时构建 few-shot prompt。在 2026 年的基准里，这比静态 prompting 把 GPT-4 的生物医学 NER F1 提升了 11-12%。
- **按实体类型分解。** 对长文档，一次性抽取所有实体类型的单次调用，会随长度增长而损失召回。给每种实体类型跑一遍抽取。推理成本更高，准确率显著更高。这是临床笔记和法律合同的标准模式。

2026 年的生产建议：在收集训练数据之前，先用 LLM zero-shot 起一个基线。很多时候 F1 就够好，你压根不需要微调。

### 经典 NER 仍占上风的地方

哪怕有 LLM 可用，经典 NER 在以下情况胜出：

- 延迟预算在 50ms 以下。
- 你有数千个标注样本，需要 98%+ 的 F1。
- 领域有稳定的本体（ontology），预训练的 CRF 或 BiLSTM 迁移得很好。
- 监管约束要求一个本地部署、非生成式的模型。

### 它崩盘的地方

- **领域偏移。** 在 CoNLL 上训练的 NER 用到法律合同上，表现还不如词典。在你的领域上微调。
- **嵌套实体。** "Bank of America Tower" 同时是一个 ORG 和一个 FACILITY。标准 BIO 无法表示重叠片段。你需要嵌套 NER（多趟或基于 span 的模型）。
- **长实体。** "United States Federal Deposit Insurance Corporation."。token 级模型有时会把它切开。用 `aggregation_strategy` 或做后处理。
- **稀疏类型。** 医学 NER 标签如 DRUG_BRAND、ADVERSE_EVENT、DOSE。通用模型完全摸不着头脑。Scispacy 和 BioBERT 是那里的起点。

## 拿去用

存为 `outputs/skill-ner-picker.md`：

```markdown
---
name: ner-picker
description: Pick the right NER approach for a given extraction task.
version: 1.0.0
phase: 5
lesson: 06
tags: [nlp, ner, extraction]
---

Given a task description (domain, label set, language, latency, data volume), output:

1. Approach. Rule-based + gazetteer, CRF, BiLSTM-CRF, or transformer fine-tune.
2. Starting model. Name it (spaCy model ID, Hugging Face checkpoint ID, or "custom, trained from scratch").
3. Labeling strategy. BIO, BILOU, or span-based. Justify in one sentence.
4. Evaluation. Use `seqeval`. Always report entity-level F1 (not token-level).

Refuse to recommend fine-tuning a transformer for under 500 labeled examples unless the user already has a pretrained domain model. Flag nested entities as needing span-based or multi-pass models. Require a gazetteer audit if the user mentions "production scale" and labels are unchanged from CoNLL-2003.
```

## 练习

1. **简单。** 实现 `bio_to_spans`（`spans_to_bio` 的逆操作），在 10 个句子上验证来回转换的一致性。
2. **中等。** 在 CoNLL-2003 英语 NER 数据集上训练上面的 sklearn-crfsuite CRF。用 `seqeval` 报告各实体的 F1。典型结果：~84 F1。
3. **困难。** 在一个领域专用 NER 数据集（医学、法律或金融）上微调 `distilbert-base-cased`。和 spaCy 小模型对比。记录数据泄漏检查，并把让你意外的地方写下来。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| NER | 抽名字 | 给 token 片段标上类型（PERSON、ORG、GPE、DATE……）。 |
| BIO | 标注方案 | `B-X` 开始，`I-X` 延续，`O` 在外。 |
| BILOU | 更好的 BIO | 加上 `L-X`（最后）、`U-X`（单 token），边界更干净。 |
| CRF | 结构化分类器 | 不只建模发射，还建模标签间的转移。强制有效序列。 |
| 嵌套 NER | 重叠实体 | 一个片段和它的一个子片段是不同的实体。BIO 表达不了。 |
| 实体级 F1 | 正确的 NER 指标 | 预测片段必须和真实片段完全匹配。token 级 F1 会高估准确率。 |

## 延伸阅读

- [Lample et al. (2016). Neural Architectures for Named Entity Recognition](https://arxiv.org/abs/1603.01360) —— BiLSTM-CRF 论文。经典之作。
- [Devlin et al. (2018). BERT: Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805) —— 引入了后来成为标准的 token 分类模式。
- [spaCy linguistic features — named entities](https://spacy.io/usage/linguistic-features#named-entities) —— `Doc.ents` 和 `Span` 上每个属性的实用参考。
- [seqeval](https://github.com/chakki-works/seqeval) —— 正确的指标库。永远用它。
