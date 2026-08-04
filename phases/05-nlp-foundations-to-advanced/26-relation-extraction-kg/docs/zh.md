# 关系抽取与知识图谱构建

> NER 找到了实体。实体链接把它们锚定了。关系抽取找出它们之间的边。一张知识图谱就是节点、边及其来源出处的总和。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 06（NER）、Phase 5 · 25（实体链接）
**预计时间：** ~60 分钟

## 问题背景

一位分析师读到："Tim Cook became CEO of Apple in 2011."。四个事实：

- `(Tim Cook, role, CEO)`
- `(Tim Cook, employer, Apple)`
- `(Tim Cook, start_date, 2011)`
- `(Apple, type, Organization)`

关系抽取（RE）把自由文本变成结构化三元组 `(subject, relation, object)`。跨语料聚合，你就有了一张知识图谱。聚合并查询，你就有了一个供 RAG、分析或合规审计用的推理底座。

2026 年的问题：LLM 抽关系抽得很起劲，太起劲了。它们幻觉出源文本不支持的三元组。没有出处，你就分不清真三元组和看似合理的虚构。2026 年的答案是 AEVS 式的锚定-核验流水线。

## 核心概念

![文本 → 三元组 → 知识图谱](../assets/relation-extraction.svg)

**三元组形式。** `(subject_entity, relation_type, object_entity)`。关系来自一个封闭本体（Wikidata 属性、FIBO、UMLS）或一个开放集合（OpenIE 风格，怎么都行）。

**三种抽取方法。**

1. **基于规则/模式。** Hearst 模式："X such as Y" → `(Y, isA, X)`。外加手工正则。脆弱、精确、可解释。
2. **有监督分类器。** 给定句子里的两个实体提及，从一个固定集合里预测关系。在 TACRED、ACE、KBP 上训练。2015–2022 年的标准。
3. **生成式 LLM。** 让模型吐出三元组。开箱即用。需要出处，否则幻觉出看着合理的垃圾。

**AEVS（Anchor-Extraction-Verification-Supplement，2026）。** 当前的幻觉缓解框架：

- **锚定（Anchor）。** 用精确位置标出每个实体 span 和关系短语 span。
- **抽取（Extract）。** 生成与锚定 span 关联的三元组。
- **核验（Verify）。** 把每个三元组元素对照回源文本；拒绝任何不被支持的。
- **补全（Supplement）。** 一遍覆盖检查，确保没有锚定 span 被丢掉。

幻觉急剧下降。需要更多算力，但可审计。

**开放 vs 封闭的取舍。**

- **封闭本体。** 固定的属性列表（如 Wikidata 的 11000+ 属性）。可预测，可查询，难凭空造。
- **Open IE。** 任何动词短语都成为关系。召回高，精确率低，查起来乱。

生产 KG 通常混用：用 open IE 做发现，再把关系规范化到一个封闭本体上，然后并入主图。

```figure
relation-triples
```

## 动手构建

### 第 1 步：基于模式的抽取

```python
PATTERNS = [
    (r"(?P<s>[A-Z]\w+) (?:is|was) (?:a|an|the) (?P<o>[A-Z]?\w+)", "isA"),
    (r"(?P<s>[A-Z]\w+) (?:is|was) born in (?P<o>\w+)", "bornIn"),
    (r"(?P<s>[A-Z]\w+) works? (?:at|for) (?P<o>[A-Z]\w+)", "worksAt"),
    (r"(?P<s>[A-Z]\w+) founded (?P<o>[A-Z]\w+)", "founded"),
]
```

完整的玩具抽取器见 `code/main.py`。Hearst 模式在领域专用流水线里至今还在用，因为它们可调试。

### 第 2 步：有监督关系分类

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

tok = AutoTokenizer.from_pretrained("Babelscape/rebel-large")
model = AutoModelForSequenceClassification.from_pretrained("Babelscape/rebel-large")

text = "Tim Cook was born in Alabama. He later became CEO of Apple."
encoded = tok(text, return_tensors="pt", truncation=True)
output = model.generate(**encoded, max_length=200)
triples = tok.batch_decode(output, skip_special_tokens=False)
```

REBEL 是一个 seq2seq 关系抽取器：文本进，三元组出，已经是 Wikidata 属性 id。在远监督数据上微调。标准开源权重基线。

### 第 3 步：带锚定的 LLM 提示抽取

```python
prompt = f"""Extract (subject, relation, object) triples from the text.
For each triple, include the exact character span in the source text.

Text: {text}

Output JSON:
[{{"subject": {{"text": "...", "span": [start, end]}},
   "relation": "...",
   "object": {{"text": "...", "span": [start, end]}}}}, ...]

Only include triples fully supported by the text. No inference beyond what is stated.
"""
```

把返回的每个 span 对照源核验。拒绝任何 `text[start:end] != triple_entity` 的情况。这就是 AEVS "核验"步骤的最小形式。

### 第 4 步：规范化到封闭本体

```python
RELATION_MAP = {
    "is the CEO of": "P169",       # "chief executive officer"
    "was born in":   "P19",         # "place of birth"
    "founded":        "P112",       # "founded by"（主宾倒置）
    "works at":       "P108",       # "employer"
}


def canonicalize(relation):
    rel_low = relation.lower().strip()
    if rel_low in RELATION_MAP:
        return RELATION_MAP[rel_low]
    return None   # 丢掉未映射的开放关系，或转人工复核
```

规范化往往占 60-80% 的工程量。给它留预算。

### 第 5 步：建一张小图并查询

```python
triples = extract(text)
graph = {}
for s, r, o in triples:
    graph.setdefault(s, []).append((r, o))


def neighbors(node, relation=None):
    return [(r, o) for r, o in graph.get(node, []) if relation is None or r == relation]


print(neighbors("Tim Cook", relation="P108"))    # -> [(P108, Apple)]
```

这是每个 RAG-over-KG 系统的原子。用 RDF 三元组库（Blazegraph、Virtuoso）、属性图（Neo4j）或向量增强的图存储把它扩展上去。

## 坑

- **关系抽取前先做共指。** "He founded Apple"——RE 得知道 "he" 是谁。先跑共指（第 24 课）。
- **实体规范化。** "Apple Inc" 和 "Apple" 必须解析到同一个节点。先做实体链接（第 25 课）。
- **幻觉三元组。** LLM 吐出文本不支持的三元组。强制 span 核验。
- **关系规范化漂移。** Open IE 关系不一致（"was born in"、"came from"、"is a native of"）。塌缩成规范 id，否则图没法查询。
- **时间错误。** "Tim Cook is CEO of Apple"——现在为真，2005 年为假。许多关系是有时间界限的。用限定符（Wikidata 里 `P580` 起始时间、`P582` 结束时间）。
- **领域不匹配。** REBEL 在 Wikipedia 上训练。法律、医学、科学文本常需要领域微调的 RE 模型。

## 实际使用

2026 年的栈：

| 场景 | 选择 |
|-----------|------|
| 快速生产、通用领域 | REBEL 或 LlamaPred 配 Wikidata 规范化 |
| 领域专用（生物医学、法律） | SciREX 式领域微调 + 自定义本体 |
| LLM 提示、审计输出 | AEVS 流水线：锚定 → 抽取 → 核验 → 补全 |
| 高吞吐新闻 IE | 基于模式 + 有监督混合 |
| 从零构建 KG | Open IE + 人工规范化遍 |
| 时序 KG | 带限定符抽取（起止时间、时间点） |

集成模式：NER → 共指 → 实体链接 → 关系抽取 → 本体映射 → 入图。每个阶段都是一道潜在的质量闸门。

## 拿去用

存为 `outputs/skill-re-designer.md`：

```markdown
---
name: re-designer
description: Design a relation extraction pipeline with provenance and canonicalization.
version: 1.0.0
phase: 5
lesson: 26
tags: [nlp, relation-extraction, knowledge-graph]
---

Given a corpus (domain, language, volume) and downstream use (KG-RAG, analytics, compliance), output:

1. Extractor. Pattern-based / supervised / LLM / AEVS hybrid. Reason tied to precision vs recall target.
2. Ontology. Closed property list (Wikidata / domain) or open IE with canonicalization pass.
3. Provenance. Every triple carries source char-span + doc id. Non-negotiable for audit.
4. Merge strategy. Canonical entity id + relation id + temporal qualifiers; dedup policy.
5. Evaluation. Precision / recall on 200 hand-labelled triples + hallucination-rate on LLM-extracted sample.

Refuse any LLM-based RE pipeline without span verification (source provenance). Refuse open-IE output flowing into a production graph without canonicalization. Flag pipelines with no temporal qualifier on time-bounded relations (employer, spouse, position).
```

## 练习

1. **简单。** 在 5 个新闻文章句子上跑 `code/main.py` 里的模式抽取器。手工核查精确率。
2. **中等。** 在同样的句子上用 REBEL（或一个小 LLM）。对比三元组。哪个抽取器精确率更高？召回更高？
3. **困难。** 搭起 AEVS 流水线：用 LLM 抽取 + 把 span 对照源核验。在 50 个 Wikipedia 风格句子上，测量核验步骤前后的幻觉率。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 三元组（Triple） | 主-谓-宾 | `(s, r, o)` 元组，KG 的原子单元。 |
| Open IE | 抽取一切 | 开放词汇的关系短语；召回高，精确率低。 |
| 封闭本体 | 固定 schema | 有界的关系类型集合（Wikidata、UMLS、FIBO）。 |
| 规范化 | 把一切归一 | 把表面名/关系映射到规范 id。 |
| AEVS | 有据抽取 | 锚定-抽取-核验-补全流水线（2026）。 |
| 出处（Provenance） | 真相来源链接 | 每个三元组带一个 doc id + 字符 span 指向其源。 |
| 远监督 | 廉价标签 | 把文本与现有 KG 对齐来造训练数据。 |

## 延伸阅读

- [Mintz et al. (2009). Distant supervision for relation extraction without labeled data](https://www.aclweb.org/anthology/P09-1113.pdf) —— 远监督论文。
- [Huguet Cabot, Navigli (2021). REBEL: Relation Extraction By End-to-end Language generation](https://aclanthology.org/2021.findings-emnlp.204.pdf) —— seq2seq RE 主力。
- [Wadden et al. (2019). Entity, Relation, and Event Extraction with Contextualized Span Representations (DyGIE++)](https://arxiv.org/abs/1909.03546) —— 联合 IE。
- [AEVS — Anchor-Extraction-Verification-Supplement framework](https://www.mdpi.com/2073-431X/15/3/178) —— 2026 年的幻觉缓解设计。
- [Wikidata SPARQL tutorial](https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial) —— 经典的图查询。
