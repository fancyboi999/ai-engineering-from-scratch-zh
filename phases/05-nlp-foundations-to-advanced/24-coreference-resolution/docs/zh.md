# 共指消解

> "She called him. He did not answer. The doctor was at lunch." 三处指代两个人，谁都没被点名。共指消解弄清谁是谁。

**类型：** Learn
**语言：** Python
**前置要求：** Phase 5 · 06（NER）、Phase 5 · 07（词性与句法分析）
**预计时间：** ~60 分钟

## 问题背景

从一篇 300 字的文章里抽出 Apple Inc. 的每一次提及。文章说 "Apple" 时很简单。说 "the company"、"they"、"Cupertino's technology giant" 或 "Jobs's firm" 时就难了。不把这些提及消解到同一个实体上，你的 NER 流水线会漏掉 60-80% 的提及。

共指消解把所有指向同一个真实世界实体的表达，链接进一个簇。它是表层 NLP（NER、句法分析）和下游语义（IE、QA、摘要、KG）之间的黏合剂。

它在 2026 年为什么要紧：

- 摘要："The CEO announced..." vs "Tim Cook announced..."——摘要应当点出 CEO 的名字。
- 问答："Who did she call?" 需要消解 "she"。
- 信息抽取：一张知识图谱里把 "PER1 founded Apple" 和 "Jobs founded Apple" 当成两条独立条目，就错了。
- 多文档 IE：跨多篇讲同一事件的文章合并提及，就是跨文档共指。

## 核心概念

![共指聚类：提及 → 实体](../assets/coref.svg)

**任务。** 输入：一篇文档。输出：提及（span）的一个聚类，每个簇指向一个实体。

**提及类型。**

- **命名实体。** "Tim Cook"
- **名词性。** "the CEO"、"the company"
- **代词性。** "he"、"she"、"they"、"it"
- **同位语。** "Tim Cook, Apple's CEO,"

**架构。**

1. **基于规则（Hobbs，1978）。** 基于句法树、用语法规则做代词消解。好基线。在代词上出奇地难被打败。
2. **提及对分类器。** 对每一对提及 (m_i, m_j)，预测它们是否共指。按传递闭包聚类。2016 年前的标准。
3. **提及排序。** 对每个提及，给候选先行词（包括"无先行词"）排序，挑最靠前的。
4. **基于 span 的端到端（Lee et al., 2017）。** transformer 编码器。枚举所有不超过长度上限的候选 span。预测提及分数。为每个 span 预测先行词概率。贪心聚类。现代默认。
5. **生成式（2024+）。** 给 LLM 下 prompt："List every pronoun in this text and its antecedent."。在简单情况上效果好，在长文档和罕见指称上吃力。

**评估指标。** 五个标准指标（MUC、B³、CEAF、BLANC、LEA），因为没有单一指标能捕捉聚类质量。把前三个的平均报为 CoNLL F1。2026 年 CoNLL-2012 上的最前沿：~83 F1。

**已知的难例。**

- 指向几页之前引入的实体的定指描述。
- 桥接回指（"the wheels" → 前面提过的一辆车）。
- 中文、日语等语言里的零回指。
- 前指（代词在指称之前）："When **she** walked in, Mary smiled."

```figure
coref-links
```

## 动手构建

### 第 1 步：预训练的神经共指（AllenNLP / spaCy-experimental）

```python
import spacy
nlp = spacy.load("en_coreference_web_trf")   # 实验性模型
doc = nlp("Apple announced new products. The company said they would ship soon.")
for cluster in doc._.coref_clusters:
    print(cluster, "->", [m.text for m in cluster])
```

在一篇更长的文档上，你会得到类似这样的东西：
- 簇 1：[Apple, The company, they]
- 簇 2：[new products]

### 第 2 步：基于规则的代词消解器（教学）

仅标准库的实现见 `code/main.py`：

1. 抽取提及：命名实体（首字母大写的 span）、代词（查字典）、定指描述（"the X"）。
2. 对每个代词，看前面 K 个提及，按以下给它们打分：
   - 性别/数一致（启发式）
   - 就近（更近的赢）
   - 句法角色（偏好主语）
3. 链接得分最高的先行词。

比不过神经模型。但它展示了搜索空间，以及一个端到端模型必须做的那些决策。

### 第 3 步：用 LLM 做共指

```python
prompt = f"""Text: {text}

List every pronoun and noun phrase that refers to a person or company.
Cluster them by what they refer to. Output JSON:
[{{"entity": "Apple", "mentions": ["Apple", "the company", "it"]}}, ...]
"""
```

两个要盯着的翻车方式。第一，LLM 过度合并（指向两个不同人的 "him" 和 "her"）。第二，LLM 在长文档里默默丢掉提及。永远用 span 偏移检查来核验。

### 第 4 步：评估

标准的 conll-2012 脚本计算 MUC、B³、CEAF-φ4 并报告平均值。做内部评估，先从你标注测试集上的 span 级精确率和召回率起步，再加上提及链接 F1。

## 坑

- **单例爆炸。** 有些系统把每个提及都报成它自己的簇。B³ 宽容，MUC 惩罚这个。永远三个指标都查。
- **长上下文里的代词。** 在超过 2000 token 的文档上性能掉约 15 F1。小心分块。
- **性别假设。** 硬编码的性别规则在非二元指称、组织、动物上崩。用学出来的模型或中性打分。
- **LLM 在长文档上漂移。** 单次 API 调用没法可靠地跨 50+ 段聚类提及。用滑动窗口 + 合并。

## 实际使用

2026 年的栈：

| 场景 | 选择 |
|-----------|------|
| 英语、单文档 | `en_coreference_web_trf`（spaCy-experimental）或 AllenNLP 神经共指 |
| 多语言 | 在 OntoNotes 或多语言 CoNLL 上训练的 SpanBERT / XLM-R |
| 跨文档事件共指 | 专门的端到端模型（2025–26 SOTA） |
| 快速 LLM 基线 | 配结构化输出共指 prompt 的 GPT-4o / Claude |
| 生产对话系统 | 基于规则的兜底 + 神经为主 + 关键槽位人工复核 |

2026 年上线的集成模式：先跑 NER，再跑共指，把共指簇合并进 NER 实体。下游任务看到的是每簇一个实体，而非每提及一个实体。

## 拿去用

存为 `outputs/skill-coref-picker.md`：

```markdown
---
name: coref-picker
description: Pick a coreference approach, evaluation plan, and integration strategy.
version: 1.0.0
phase: 5
lesson: 24
tags: [nlp, coref, information-extraction]
---

Given a use case (single-doc / multi-doc, domain, language), output:

1. Approach. Rule-based / neural span-based / LLM-prompted / hybrid. One-sentence reason.
2. Model. Named checkpoint if neural.
3. Integration. Order of operations: tokenize → NER → coref → downstream task.
4. Evaluation. CoNLL F1 (MUC + B³ + CEAF-φ4 average) on held-out set + manual cluster review on 20 documents.

Refuse LLM-only coref for documents over 2,000 tokens without sliding-window merge. Refuse any pipeline that runs coref without a mention-level precision-recall report. Flag gender-heuristic systems deployed in demographically diverse text.
```

## 练习

1. **简单。** 在 5 个手工编写的段落上跑 `code/main.py` 里的基于规则消解器。对照标准答案测量提及链接准确率。
2. **中等。** 在一篇新闻文章上用一个预训练神经共指模型。把簇和你自己的手工标注对比。它在哪里失败了？
3. **困难。** 搭一条共指增强的 NER 流水线：先 NER，再通过共指簇合并。在 100 篇文章上测量相对纯 NER 的实体覆盖提升。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 提及（Mention） | 一处指代 | 指向某实体的一段文本（名字、代词、名词短语）。 |
| 先行词（Antecedent） | "it" 指的是什么 | 后一个提及与之共指的那个更早的提及。 |
| 簇（Cluster） | 实体的各处提及 | 全都指向同一真实世界实体的提及集合。 |
| 回指（Anaphora） | 向后指代 | 后一个提及指向更早的（"he" → "John"）。 |
| 前指（Cataphora） | 向前指代 | 更早的提及指向后面的（"When he arrived, John..."）。 |
| 桥接（Bridging） | 隐式指代 | "I bought a car. The wheels were bad."（是那辆车的轮子。） |
| CoNLL F1 | 排行榜上的那个数 | MUC、B³、CEAF-φ4 F1 分数的平均值。 |

## 延伸阅读

- [Jurafsky & Martin, SLP3 Ch. 26 — Coreference Resolution and Entity Linking](https://web.stanford.edu/~jurafsky/slp3/26.pdf) —— 经典教科书章节。
- [Lee et al. (2017). End-to-end Neural Coreference Resolution](https://arxiv.org/abs/1707.07045) —— 基于 span 的端到端。
- [Joshi et al. (2020). SpanBERT](https://arxiv.org/abs/1907.10529) —— 提升共指的预训练。
- [Pradhan et al. (2012). CoNLL-2012 Shared Task](https://aclanthology.org/W12-4501/) —— 那个基准。
- [Hobbs (1978). Resolving Pronoun References](https://www.sciencedirect.com/science/article/pii/0024384178900064) —— 基于规则的经典。
