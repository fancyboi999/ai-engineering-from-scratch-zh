# 多语言 NLP

> 一个模型，100+ 种语言，其中大多数没有训练数据。跨语言迁移是 2020 年代的实用奇迹。

**类型：** Learn
**语言：** Python
**前置要求：** Phase 5 · 04（GloVe、FastText、子词）、Phase 5 · 11（机器翻译）
**预计时间：** ~45 分钟

## 问题背景

英语有数十亿标注样本。乌尔都语有几千。迈蒂利语几乎没有。任何服务全球受众的实用 NLP 系统，都得在那条没有任务专属训练数据的语言长尾上工作。

多语言模型靠在多种语言上同时训练一个模型来解决这个。共享表示让模型把在高资源语言里学到的技能迁移到低资源语言上。在英语情感分析上微调它，它开箱就能对乌尔都语产出出奇地好的情感预测。这就是 zero-shot 跨语言迁移，它重塑了 NLP 走向世界的方式。

这节课点明各种取舍、经典模型，以及一个让多语言新手栽跟头的决策：为迁移挑一个源语言。

## 核心概念

![通过共享多语言 embedding 空间做跨语言迁移](../assets/multilingual.svg)

**共享词表。** 多语言模型用一个在所有目标语言文本上训练的 SentencePiece 或 WordPiece 分词器。词表是共享的：同一个子词单元在相关语言之间代表同一个词素。英语和意大利语里的 `anti-` 拿到同一个 token。

**共享表示。** 一个跨多种语言做掩码语言建模预训练的 transformer，学到不同语言里语义相似的句子会产出相似的隐藏状态。mBERT、XLM-R、NLLB 都表现出这一点。英语 "cat" 的 embedding 聚在法语 "chat" 和西班牙语 "gato" 附近，整句 embedding 也是如此。

**Zero-shot 迁移。** 在一种语言（通常是英语）的标注数据上微调模型。推理时，在模型支持的任何其他语言上跑它。不需要目标语言的标签。对类型学上相关的语言效果强，对疏远的语言较弱。

**Few-shot 微调。** 加 100-500 个目标语言标注样本。在分类任务上，准确率跃升到英语基线的 95-98%。这是多语言 NLP 里性价比最高的那根杠杆。

## 模型

| 模型 | 年份 | 覆盖 | 备注 |
|-------|------|----------|-------|
| mBERT | 2018 | 104 种语言 | 在 Wikipedia 上训练。第一个实用的多语言 LM。低资源上弱。 |
| XLM-R | 2019 | 100 种语言 | 在 CommonCrawl（远大于 Wikipedia）上训练。立下了跨语言基线。Base 270M，Large 550M。 |
| XLM-V | 2023 | 100 种语言 | 词表为 100 万 token（对比 25 万）的 XLM-R。低资源上更好。 |
| mT5 | 2020 | 101 种语言 | 用于多语言生成的 T5 架构。 |
| NLLB-200 | 2022 | 200 种语言 | Meta 的翻译模型；含 55 种低资源语言。 |
| BLOOM | 2022 | 46 种语言 + 13 种编程语言 | 多语言训练的开源 176B LLM。 |
| Aya-23 | 2024 | 23 种语言 | Cohere 的多语言 LLM。在阿拉伯语、印地语、斯瓦希里语上强。 |

按用例挑。分类用 XLM-R-base 当合理默认就很好。生成任务看是翻译还是开放生成，叫 mT5 或 NLLB。LLM 式的工作配 Aya-23，或用显式多语言 prompting 的 Claude。

## 源语言决策（2026 年研究）

大多数团队默认用英语当微调源。近期研究（2026）显示这往往是错的。

语言相似度对迁移质量的预测，比原始语料大小更准。对斯拉夫语目标，德语或俄语常打赢英语。对印度语目标，印地语常打赢英语。**qWALS** 相似度指标（2026，基于世界语言结构图谱特征）把这量化了。**LANGRANK**（Lin et al., ACL 2019）是一个独立的、更早的方法，它综合语言相似度、语料大小和谱系亲缘关系来给候选源语言排序。

实用规则：如果你的目标语言有一个类型学上接近的高资源亲戚，先试着在那个上面微调，再和英语微调对比。

```figure
n5-crosslingual-bridge
```

## 动手构建

### 第 1 步：zero-shot 跨语言分类

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

tok = AutoTokenizer.from_pretrained("joeddav/xlm-roberta-large-xnli")
model = AutoModelForSequenceClassification.from_pretrained("joeddav/xlm-roberta-large-xnli")


def classify(text, candidate_labels, hypothesis_template="This text is about {}."):
    scores = {}
    for label in candidate_labels:
        hypothesis = hypothesis_template.format(label)
        inputs = tok(text, hypothesis, return_tensors="pt", truncation=True)
        with torch.no_grad():
            logits = model(**inputs).logits[0]
        entail_score = torch.softmax(logits, dim=-1)[2].item()
        scores[label] = entail_score
    return dict(sorted(scores.items(), key=lambda x: -x[1]))


print(classify("I love this product!", ["positive", "negative", "neutral"]))
print(classify("मुझे यह उत्पाद पसंद है!", ["positive", "negative", "neutral"]))
print(classify("J'adore ce produit !", ["positive", "negative", "neutral"]))
```

一个模型，三种语言，同一个 API。在 NLI 数据上训练的 XLM-R 通过蕴含戏法很好地迁移到分类。

### 第 2 步：多语言 embedding 空间

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

pairs = [
    ("The cat is sleeping.", "Le chat dort."),
    ("The cat is sleeping.", "El gato está durmiendo."),
    ("The cat is sleeping.", "Die Katze schläft."),
    ("The cat is sleeping.", "The dog is barking."),
]

for eng, other in pairs:
    emb_eng = model.encode([eng], normalize_embeddings=True)[0]
    emb_other = model.encode([other], normalize_embeddings=True)[0]
    sim = float(np.dot(emb_eng, emb_other))
    print(f"  {eng!r} <-> {other!r}: cos={sim:.3f}")
```

译文在 embedding 空间里落得很近。一个不同的英语句子落得更远。正是这一点让跨语言检索、聚类和相似度成为可能。

### 第 3 步：few-shot 微调策略

```python
from transformers import TrainingArguments, Trainer
from datasets import Dataset


def few_shot_finetune(base_model, base_tokenizer, examples):
    ds = Dataset.from_list(examples)

    def tokenize_fn(ex):
        out = base_tokenizer(ex["text"], truncation=True, max_length=128)
        out["labels"] = ex["label"]
        return out

    ds = ds.map(tokenize_fn)
    args = TrainingArguments(
        output_dir="out",
        per_device_train_batch_size=8,
        num_train_epochs=5,
        learning_rate=2e-5,
        save_strategy="no",
    )
    trainer = Trainer(model=base_model, args=args, train_dataset=ds)
    trainer.train()
    return base_model
```

对 100-500 个目标语言样本，`num_train_epochs=5` 和 `learning_rate=2e-5` 是安全默认。学习率更高会让多语言对齐塌掉，你就得到一个只会英语的模型。

## 真正管用的评估

- **留出集上的逐语言准确率。** 不要聚合。聚合会藏住长尾。
- **对照单语言基线。** 对数据足够的语言，从零训练的单语言模型有时打赢多语言模型。测一测。
- **实体级测试。** 目标语言里的命名实体。多语言模型对远离拉丁文字的字符，分词往往很弱。
- **跨语言一致性。** 两种语言里的同一含义应当产出同样的预测。测量这个差距。

## 实际使用

2026 年的栈：

| 任务 | 推荐 |
|-----|-------------|
| 分类，100 种语言 | 微调的 XLM-R-base（~270M） |
| zero-shot 文本分类 | `joeddav/xlm-roberta-large-xnli` |
| 多语言句子 embedding | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| 翻译，200 种语言 | `facebook/nllb-200-distilled-600M`（见第 11 课） |
| 生成式多语言 | Claude、GPT-4、Aya-23、mT5-XXL |
| 低资源语言 NLP | XLM-V，或在相关高资源语言上做领域专用微调 |

性能要紧时，永远给目标语言的微调留预算。zero-shot 是起点，不是终点。

### 分词税（低资源语言会出什么问题）

多语言模型在所有语言间共享一个分词器。那个词表是在以英语、法语、西班牙语、中文、德语为主的语料上训练的。对主导集合之外的任何语言，三种税悄悄叠加：

- **碎裂税（fertility tax）。** 低资源语言文本分出来的每词 token 数远多于英语。一个印地语句子可能需要等价英语句子 3-5 倍的 token。这 3-5 倍吃掉你的上下文窗口、训练效率和延迟。
- **变体恢复税。** 每个拼写错误、变音符号变体、Unicode 归一化不匹配或大小写变化，都在 embedding 空间里变成一个冷启动、不相关的序列。模型学不到母语者觉得理所当然的拼写对应关系。
- **容量溢出税。** 税 1 和税 2 消耗上下文位置、层深和 embedding 维度。剩给真正推理用的，系统性地少于高资源语言从同一模型里拿到的。

实际症状：你的模型在印地语上正常训练，损失曲线看着对，评估困惑度看着合理，而生产输出却微妙地错。词法在句子中途崩掉。罕见屈折形式始终无法恢复。**你没法靠堆数据绕过一个坏掉的分词器。**

缓解：为你的目标语言挑一个覆盖好的分词器（XLM-V 的 100 万 token 词表是直接的修法）；训练前在留出的目标文本上验证分词碎裂度；对真正长尾的文字用字节级回退（SentencePiece `byte_fallback=True`、GPT-2 式字节级 BPE），让任何东西都不会 OOV。

## 拿去用

存为 `outputs/skill-multilingual-picker.md`：

```markdown
---
name: multilingual-picker
description: Pick source language, target model, and evaluation plan for a multilingual NLP task.
version: 1.0.0
phase: 5
lesson: 18
tags: [nlp, multilingual, cross-lingual]
---

Given requirements (target languages, task type, available labeled data per language), output:

1. Source language for fine-tuning. Default English; check LANGRANK or qWALS if target language has a typologically close high-resource language.
2. Base model. XLM-R (classification), mT5 (generation), NLLB (translation), Aya-23 (generative LLM).
3. Few-shot budget. Start with 100-500 target-language examples if available. Zero-shot only if labeling is infeasible.
4. Evaluation plan. Per-language accuracy (not aggregate), cross-lingual consistency, entity-level F1 on non-Latin scripts.

Refuse to ship a multilingual model without per-language evaluation — aggregate metrics hide long-tail failures. Flag scripts with low tokenization coverage (Amharic, Tigrinya, many African languages) as needing a model with byte-fallback (SentencePiece with byte_fallback=True, or byte-level tokenizer like GPT-2).
```

## 练习

1. **简单。** 在英语、法语、印地语、阿拉伯语上各跑 10 句的 zero-shot 分类流水线。报告每种语言的准确率。你应该看到法语强、印地语尚可、阿拉伯语起伏。
2. **中等。** 用 `paraphrase-multilingual-MiniLM-L12-v2` 在一个小型混合语言语料上搭一个跨语言检索器。用英语查询，检索任意语言的文档。测 recall@5。
3. **困难。** 为一个印地语分类任务，对比英语源和印地语源的微调。两种方案都用 500 个目标语言样本做 few-shot 微调。报告哪个源产出更好的印地语准确率、好多少。这是 LANGRANK 论点的缩影。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 多语言模型 | 一个模型，多种语言 | 跨语言共享词表和参数。 |
| 跨语言迁移 | 在一种语言上训练，在另一种上跑 | 在源上微调，在目标上评估而无需目标语言标签。 |
| Zero-shot | 无目标语言标签 | 不在目标语言上微调就迁移。 |
| Few-shot | 少量目标标签 | 用于微调的 100-500 个目标语言样本。 |
| mBERT | 第一个多语言 LM | 在 Wikipedia 上预训练的 104 语言 BERT。 |
| XLM-R | 标准跨语言基线 | 在 CommonCrawl 上预训练的 100 语言 RoBERTa。 |
| NLLB | Meta 的 200 语言 MT | No Language Left Behind。含 55 种低资源语言。 |

## 延伸阅读

- [Conneau et al. (2019). Unsupervised Cross-lingual Representation Learning at Scale](https://arxiv.org/abs/1911.02116) —— XLM-R 论文。
- [Pires, Schlinger, Garrette (2019). How Multilingual is Multilingual BERT?](https://arxiv.org/abs/1906.01502) —— 开启跨语言迁移研究线的那篇分析论文。
- [Costa-jussà et al. (2022). No Language Left Behind](https://arxiv.org/abs/2207.04672) —— NLLB-200 论文。
- [Üstün et al. (2024). Aya Model: An Instruction Finetuned Open-Access Multilingual Language Model](https://arxiv.org/abs/2402.07827) —— Aya，Cohere 的多语言 LLM。
- [Language Similarity Predicts Cross-Lingual Transfer Learning Performance (2026)](https://www.mdpi.com/2504-4990/8/3/65) —— qWALS / LANGRANK 源语言论文。
