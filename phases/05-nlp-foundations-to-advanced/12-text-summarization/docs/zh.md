# 文本摘要

> 抽取式系统告诉你文档说了什么，生成式系统告诉你作者想表达什么。不同的任务，不同的坑。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 02（BoW + TF-IDF）、Phase 5 · 11（机器翻译）
**预计时间：** ~75 分钟

## 问题背景

一篇 2000 字的新闻落进你的信息流。你需要 120 字把它讲清。你要么从文章里挑出三个最重要的句子（抽取式），要么用自己的话把内容重写一遍（生成式）。两者都叫摘要。它们是完全不同的问题。

抽取式摘要是个排序问题。给每个句子打分，返回 top-`k`。输出永远合乎语法，因为是逐字搬来的。风险在于漏掉散落在全文各处的内容。

生成式摘要是个生成问题。一个 transformer 在输入条件下产出新文本。输出流畅、压缩得好，但可能幻觉出源里没有的事实。风险在于自信地编造。

这节课把两者都搭出来，连同各自专属的翻车方式。

## 核心概念

![抽取式 TextRank vs 生成式 transformer](../assets/summarization.svg)

**抽取式。** 把文章当作一张图，节点是句子，边是相似度。在图上跑 PageRank（或类似的东西），按一个句子和其余一切的连接程度给它打分。得分最高的句子就是摘要。经典实现是 **TextRank**（Mihalcea 和 Tarau，2004）。

**生成式。** 在文档-摘要对上微调一个 transformer 编码器-解码器（BART、T5、Pegasus）。推理时模型读文档，通过交叉注意力逐 token 生成摘要。Pegasus 尤其用了一种间隔句（gap-sentence）预训练目标，使它在不太需要微调的情况下就很擅长摘要。

用 **ROUGE**（Recall-Oriented Understudy for Gisting Evaluation）评估。ROUGE-1 和 ROUGE-2 给一元组和二元组重叠打分。ROUGE-L 给最长公共子序列打分。越高越好，但 40 ROUGE-L 是"不错"，50 是"卓越"。每篇论文三个都报。用 `rouge-score` 包。

```figure
summarize-collapse
```

## 动手构建

### 第 1 步：TextRank（抽取式）

```python
import math
import re
from collections import Counter


def sentence_split(text):
    return re.split(r"(?<=[.!?])\s+", text.strip())


def similarity(s1, s2):
    w1 = Counter(s1.lower().split())
    w2 = Counter(s2.lower().split())
    intersection = sum((w1 & w2).values())
    denom = math.log(len(w1) + 1) + math.log(len(w2) + 1)
    if denom == 0:
        return 0.0
    return intersection / denom


def textrank(text, top_k=3, damping=0.85, iterations=50, epsilon=1e-4):
    sentences = sentence_split(text)
    n = len(sentences)
    if n <= top_k:
        return sentences

    sim = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                sim[i][j] = similarity(sentences[i], sentences[j])

    scores = [1.0] * n
    for _ in range(iterations):
        new_scores = [1 - damping] * n
        for i in range(n):
            total_out = sum(sim[i]) or 1e-9
            for j in range(n):
                if sim[i][j] > 0:
                    new_scores[j] += damping * sim[i][j] / total_out * scores[i]
        if max(abs(s - ns) for s, ns in zip(scores, new_scores)) < epsilon:
            scores = new_scores
            break
        scores = new_scores

    ranked = sorted(range(n), key=lambda k: scores[k], reverse=True)[:top_k]
    ranked.sort()
    return [sentences[i] for i in ranked]
```

两点值得点名。相似度函数用 log 归一化的词重叠，这是 TextRank 的原始变体。用 TF-IDF 向量的余弦也行。阻尼因子 0.85 和迭代次数都是 PageRank 的默认值。

### 第 2 步：用 BART 做生成式

```python
from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

article = """(long news article text)"""

summary = summarizer(article, max_length=120, min_length=60, do_sample=False)
print(summary[0]["summary_text"])
```

BART-large-CNN 在 CNN/DailyMail 语料上微调过。它开箱即用产出新闻风格的摘要。对其他领域（科学论文、对话、法律），用相应的 Pegasus checkpoint，或在你的目标数据上微调。

### 第 3 步：ROUGE 评估

```python
from rouge_score import rouge_scorer

scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
scores = scorer.score(reference_summary, generated_summary)
print({k: round(v.fmeasure, 3) for k, v in scores.items()})
```

永远用词干提取。不用它的话，"running" 和 "run" 算作不同的词，ROUGE 会少算。

### ROUGE 之外（2026 年的摘要评估）

ROUGE 当了二十年的主导摘要指标，但到 2026 年它单独用已经不够了。一项对 NLG 论文的大规模元分析显示：

- **BERTScore**（上下文 embedding 相似度）在 2023 年间站稳脚跟，如今大多数摘要论文都和 ROUGE 一起报它。
- **BARTScore** 把评估当作生成：给定源时，看一个预训练 BART 给这个摘要分配多大的可能性来打分。
- **MoverScore**（上下文 embedding 上的推土机距离）在 2025 年摘要基准里登顶，因为它比 ROUGE 更能捕捉语义重叠。
- **FactCC** 和**基于 QA 的忠实度**在 2021-2023 年常见，如今常被 **G-Eval**（一条 GPT-4 prompt 链，用思维链推理给连贯性、一致性、流畅性、相关性打分）取代。
- **G-Eval** 及类似的 LLM 裁判方法，在评分细则设计得好时与人类判断的一致率约 80%。

生产建议：报 ROUGE-L 用于历史对比，BERTScore 衡量语义重叠，G-Eval 衡量连贯性和事实性。拿 50-100 个人工标注摘要校准。

### 第 4 步：事实性问题

生成式摘要容易幻觉。抽取式摘要的幻觉风险低得多，因为输出是从源逐字搬来的——不过如果源句子被抽离上下文、过时、或顺序被打乱地引用，它们仍可能误导。这正是生产系统在合规相关内容上仍偏好抽取式方法的最大原因。

要点名的幻觉类型：

- **实体替换。** 源说 "John Smith"，摘要说 "John Brown"。
- **数字漂移。** 源说 "25,000"，摘要说 "25 million"。
- **极性翻转。** 源说 "rejected the offer"，摘要说 "accepted the offer"。
- **事实凭空生成。** 源没提 CEO，摘要说 CEO 批准了。

管用的评估方法：

- **FactCC。** 一个在源句子和摘要句子之间蕴含关系上训练的二分类器。预测事实/非事实。
- **基于 QA 的事实性。** 拿答案在源里的问题去问一个 QA 模型。如果摘要支持的答案不同，就标记。
- **实体级 F1。** 对比源与摘要里的命名实体。只在摘要里出现的实体可疑。

对任何事实性要紧的面向用户内容（新闻、医学、法律、金融），抽取式是更安全的默认。生成式需要在回路里加一个事实性检查。

## 实际使用

2026 年的栈：

| 用例 | 推荐 |
|---------|-------------|
| 新闻，3-5 句摘要，英语 | `facebook/bart-large-cnn` |
| 科学论文 | `google/pegasus-pubmed` 或一个调过的 T5 |
| 多文档、长篇 | 任何 32k+ 上下文的 LLM，配 prompt |
| 对话摘要 | `philschmid/bart-large-cnn-samsum` |
| 抽取式，构造上就低幻觉风险 | TextRank 或 `sumy` 的 LSA / LexRank |

2026 年，当算力不是约束时，长上下文 LLM 常胜过专用模型。代价是成本和可复现性；专用模型给出更一致的输出。

## 拿去用

存为 `outputs/skill-summary-picker.md`：

```markdown
---
name: summary-picker
description: Pick extractive or abstractive, named library, factuality check.
version: 1.0.0
phase: 5
lesson: 12
tags: [nlp, summarization]
---

Given a task (document type, compliance requirement, length, compute budget), output:

1. Approach. Extractive or abstractive. Explain in one sentence why.
2. Starting model / library. Name it. `sumy.TextRankSummarizer`, `facebook/bart-large-cnn`, `google/pegasus-pubmed`, or an LLM prompt.
3. Evaluation plan. ROUGE-1, ROUGE-2, ROUGE-L (use rouge-score with stemming). Plus factuality check if abstractive.
4. One failure mode to probe. Entity swap is the most common in abstractive news summarization; flag samples where source entities do not appear in summary.

Refuse abstractive summarization for medical, legal, financial, or regulated content without a factuality gate. Flag input over the model's context window as needing chunked map-reduce summarization (not just truncation).
```

## 练习

1. **简单。** 在 5 篇新闻上跑 TextRank。把 top-3 句子和一份参考摘要对比。测 ROUGE-L。在 CNN/DailyMail 风格的文章上你应该看到 30-45 ROUGE-L。
2. **中等。** 实现实体级事实性：从源和摘要里抽命名实体（spaCy），算源实体在摘要里的召回率、以及摘要实体相对源的精确率。高精确率低召回率意味着安全但简略；低精确率意味着幻觉出来的实体。
3. **困难。** 在 50 篇 CNN/DailyMail 文章上把 BART-large-CNN 和一个 LLM（Claude 或 GPT-4）对比。报告 ROUGE-L、事实性（用实体 F1）和每篇摘要的成本。记录各自在哪里胜出。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 抽取式（Extractive） | 挑句子 | 从源逐字返回句子。绝不幻觉。 |
| 生成式（Abstractive） | 重写 | 在源条件下生成新文本。可能幻觉。 |
| ROUGE | 摘要指标 | 系统输出和参考之间的 n-gram / LCS 重叠。 |
| TextRank | 基于图的抽取式 | 在句子相似度图上跑 PageRank。 |
| 事实性 | 对不对 | 摘要的论断是否被源支持。 |
| 幻觉 | 编出来的内容 | 摘要里源不支持的内容。 |

## 延伸阅读

- [Mihalcea and Tarau (2004). TextRank: Bringing Order into Texts](https://aclanthology.org/W04-3252/) —— 抽取式的经典论文。
- [Lewis et al. (2019). BART: Denoising Sequence-to-Sequence Pre-training](https://arxiv.org/abs/1910.13461) —— BART 论文。
- [Zhang et al. (2019). PEGASUS: Pre-training with Extracted Gap-sentences](https://arxiv.org/abs/1912.08777) —— Pegasus 和间隔句目标。
- [Lin (2004). ROUGE: A Package for Automatic Evaluation of Summaries](https://aclanthology.org/W04-1013/) —— ROUGE 论文。
- [Maynez et al. (2020). On Faithfulness and Factuality in Abstractive Summarization](https://arxiv.org/abs/2005.00661) —— 事实性全景论文。
