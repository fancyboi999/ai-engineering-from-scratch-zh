# 自然语言推理 —— 文本蕴含

> "t 蕴含 h" 意思是读到 t 的人会得出 h 为真的结论。NLI 就是预测蕴含 / 矛盾 / 中性的任务。表面无聊，生产里却是承重墙。

**类型：** Learn
**语言：** Python
**前置要求：** Phase 5 · 05（情感分析）、Phase 5 · 13（问答）
**预计时间：** ~60 分钟

## 问题背景

你做了个摘要器。它产出了一份摘要。你怎么知道摘要里没有幻觉？

你做了个聊天机器人。它答了 "yes"。你怎么知道这个答案被检索到的段落支持？

你要给 10000 篇新闻按主题分类。你没有训练标签。能复用一个模型吗？

这三个问题都归约成自然语言推理。NLI 问：给定前提 `t` 和假设 `h`，`h` 是被 `t` 蕴含、矛盾，还是中性（无关）？

- **幻觉检查：** `t` = 源文档，`h` = 摘要论断。非蕴含 = 幻觉。
- **接地 QA：** `t` = 检索到的段落，`h` = 生成的答案。非蕴含 = 编造。
- **Zero-shot 分类：** `t` = 文档，`h` = 措辞化的标签（"This is about sports"）。蕴含 = 预测标签。

一个任务，三种生产用途。这就是为什么每个 RAG 评估框架底下都藏着一个 NLI 模型。

## 核心概念

![NLI：三分类，前提 vs 假设](../assets/nli.svg)

**三个标签。**

- **蕴含（Entailment）。** `t` → `h`。"The cat is on the mat" 蕴含 "There is a cat"。
- **矛盾（Contradiction）。** `t` → ¬`h`。"The cat is on the mat" 与 "There is no cat" 矛盾。
- **中性（Neutral）。** 两个方向都推不出。"The cat is on the mat" 对 "The cat is hungry" 是中性的。

**不是逻辑蕴含。** NLI 是*自然*语言推理——一个典型的人类读者会推出什么，而非严格逻辑。在 NLI 里，"John walked his dog" 蕴含 "John has a dog"，但严格的一阶逻辑只有在你把"拥有"公理化之后才承认它。

**数据集。**

- **SNLI**（2015）。57 万人工标注的对，以图片说明为前提。领域窄。
- **MultiNLI**（2017）。跨 10 种体裁的 43.3 万对。2026 年的标准训练语料。
- **ANLI**（2019）。对抗式 NLI。人类专门写出设计来打破现有模型的例子。更难。
- **DocNLI、ConTRoL**（2020–21）。文档长度的前提。测试多跳和长程推理。

**架构。** 一个 transformer 编码器（BERT、RoBERTa、DeBERTa）读 `[CLS] premise [SEP] hypothesis [SEP]`。`[CLS]` 表示喂给一个 3 路 softmax。在 MNLI 上训练，在留出基准上评估，在分布内的对上拿到 90%+ 的准确率。

**通过 NLI 做 zero-shot。** 给定文档和候选标签，把每个标签变成一个假设（"This text is about sports"）。算每个的蕴含概率。取最大的。这就是 Hugging Face 的 `zero-shot-classification` 流水线背后的机制。

```figure
nli-router
```

## 动手构建

### 第 1 步：跑一个预训练 NLI 模型

```python
from transformers import pipeline

nli = pipeline("text-classification",
               model="facebook/bart-large-mnli",
               top_k=None)  # 返回所有标签；替代已弃用的 return_all_scores=True

premise = "The cat is sleeping on the couch."
hypothesis = "There is a cat in the room."

result = nli({"text": premise, "text_pair": hypothesis})[0]
print(result)
# [{'label': 'entailment', 'score': 0.97},
#  {'label': 'neutral', 'score': 0.02},
#  {'label': 'contradiction', 'score': 0.01}]
```

做生产 NLI，`facebook/bart-large-mnli` 和 `microsoft/deberta-v3-large-mnli` 是开源默认。DeBERTa-v3 居榜首。

### 第 2 步：zero-shot 分类

```python
zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

text = "The stock market rallied after the central bank cut interest rates."
labels = ["finance", "sports", "politics", "technology"]

result = zs(text, candidate_labels=labels)
print(result)
# {'labels': ['finance', 'politics', 'technology', 'sports'],
#  'scores': [0.92, 0.05, 0.02, 0.01]}
```

模板默认是 "This example is about {label}."。用 `hypothesis_template` 自定义。不需要训练数据。不需要微调。开箱即用。

### 第 3 步：RAG 的忠实度检查

```python
def is_faithful(answer, context, threshold=0.5):
    result = nli({"text": context, "text_pair": answer})[0]
    entail = next(s for s in result if s["label"] == "entailment")
    return entail["score"] > threshold
```

这就是 RAGAS 忠实度的核心。把生成的答案拆成原子论断。拿每个论断对照检索到的上下文检查。报告蕴含的比例。

### 第 4 步：手搓 NLI 分类器（概念性）

仅标准库的玩具实现见 `code/main.py`：前提和假设通过词面重叠 + 否定检测来比较。比不过 transformer 模型——但它展示了任务的形状：两段文本进，3 路标签出，损失 = 在 `{entail, contradict, neutral}` 上的交叉熵。

## 坑

- **只看假设的捷径。** 模型能仅凭假设就在 SNLI 上以约 60% 预测标签，因为 "not"、"nobody"、"never" 和矛盾相关。这是检测标签泄漏的强基线。
- **词面重叠启发式。** 子序列启发式（"每个子序列都被蕴含"）能过 SNLI，却在 HANS/ANLI 上翻车。用对抗式基准。
- **文档长度退化。** 单句 NLI 模型在文档长度的前提上掉 20+ F1。长上下文用 DocNLI 训练的模型。
- **zero-shot 模板敏感。** "This example is about {label}" vs "{label}" vs "The topic is {label}" 能把准确率摆动 10+ 个点。调模板。
- **领域不匹配。** MNLI 在通用英语上训练。法律、医学、科学文本需要领域专用 NLI 模型（如 SciNLI、MedNLI）。

## 实际使用

2026 年的栈：

| 用例 | 模型 |
|---------|-------|
| 通用 NLI | `microsoft/deberta-v3-large-mnli` |
| 快 / 边缘 | `cross-encoder/nli-deberta-v3-base` |
| zero-shot 分类（轻量） | `facebook/bart-large-mnli` |
| 文档级 NLI | `MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli` |
| 多语言 | `MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli` |
| RAG 里的幻觉检测 | RAGAS / DeepEval 里的 NLI 层 |

2026 年的元模式：NLI 是文本理解的强力胶带。每当你需要"A 支持 B 吗？"或"A 与 B 矛盾吗？"——在伸手再发一次 LLM 调用之前，先伸手抓 NLI。

## 拿去用

存为 `outputs/skill-nli-picker.md`：

```markdown
---
name: nli-picker
description: Pick an NLI model, label template, and evaluation setup for a classification / faithfulness / zero-shot task.
version: 1.0.0
phase: 5
lesson: 21
tags: [nlp, nli, zero-shot]
---

Given a use case (faithfulness check, zero-shot classification, document-level inference), output:

1. Model. Named NLI checkpoint. Reason tied to domain, length, language.
2. Template (if zero-shot). Verbalization pattern. Example.
3. Threshold. Entailment cutoff for the decision rule. Reason based on calibration.
4. Evaluation. Accuracy on held-out labeled set, hypothesis-only baseline, adversarial subset.

Refuse to ship zero-shot classification without a 100-example labeled sanity check. Refuse to use a sentence-level NLI model on document-length premises. Flag any claim that NLI solves hallucination — it reduces it; it does not eliminate it.
```

## 练习

1. **简单。** 在 20 个手工编写、覆盖全部三类的 (premise, hypothesis, label) 三元组上跑 `facebook/bart-large-mnli`。测准确率。加上对抗式的"子序列启发式"陷阱（"I did not eat the cake" vs "I ate the cake"），看它会不会翻车。
2. **中等。** 在 100 条 AG News 标题上，把 zero-shot 模板 `"This text is about {label}"` 和 `"The topic is {label}"`、`"{label}"` 对比。报告准确率摆动。
3. **困难。** 做一个 RAG 忠实度检查器：原子论断分解 + 逐论断 NLI。在 50 条带金标准上下文的 RAG 生成答案上评估。测量相对人工标签的假阳性率和假阴性率。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| NLI | 自然语言推理 | 对前提-假设关系的 3 路分类。 |
| RTE | 识别文本蕴含 | NLI 的旧名；同一个任务。 |
| 蕴含 | "t 推出 h" | 给定 t，典型读者会得出 h 为真。 |
| 矛盾 | "t 排除 h" | 给定 t，典型读者会得出 h 为假。 |
| 中性 | "未定" | 从 t 到 h 两个方向都推不出。 |
| zero-shot 分类 | 把 NLI 当分类器 | 把标签措辞化为假设，取最大蕴含。 |
| 忠实度 | 答案被支持吗？ | 在（检索上下文，生成答案）上做 NLI。 |

## 延伸阅读

- [Bowman et al. (2015). A large annotated corpus for learning natural language inference](https://arxiv.org/abs/1508.05326) —— SNLI。
- [Williams, Nangia, Bowman (2017). A Broad-Coverage Challenge Corpus for Sentence Understanding through Inference](https://arxiv.org/abs/1704.05426) —— MultiNLI。
- [Nie et al. (2019). Adversarial NLI](https://arxiv.org/abs/1910.14599) —— ANLI 基准。
- [Yin, Hay, Roth (2019). Benchmarking Zero-shot Text Classification](https://arxiv.org/abs/1909.00161) —— 把 NLI 当分类器。
- [He et al. (2021). DeBERTa: Decoding-enhanced BERT with Disentangled Attention](https://arxiv.org/abs/2006.03654) —— 2026 年的 NLI 主力。
