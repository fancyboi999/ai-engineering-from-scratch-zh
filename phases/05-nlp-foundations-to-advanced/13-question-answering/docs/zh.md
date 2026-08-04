# 问答系统

> 三种系统塑造了现代 QA。抽取式找片段，检索增强把答案锚在文档里，生成式产出答案。每个现代 AI 助手都是这三者的混合。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 11（机器翻译）、Phase 5 · 10（注意力机制）
**预计时间：** ~75 分钟

## 问题背景

用户敲下 "When did the first iPhone launch?"，期待的是 "June 29, 2007"。不是 "Apple's history is long and varied."，也不是孤零零一个没头没尾的 "2007"。要的是直接、有依据、正确的答案。

过去十年里，三种架构主导了 QA。

- **抽取式 QA。** 给定一个问题和一段已知含答案的文字，找出答案片段在文中的起止下标。SQuAD 是经典基准。
- **开放域 QA。** 不给文字段落。先检索出相关段落，再抽取或生成答案。这是当今每条 RAG 流水线的基石。
- **生成式 / 闭卷 QA。** 一个大语言模型从它的参数记忆里答题。不检索。推理最快，事实上最不可靠。

2026 年的趋势是混合：检索出最好的几段，再让一个生成模型在这几段的基础上有据地作答。这就是 RAG，第 14 课会深入讲检索那一半。这节课搭 QA 那一半。

## 核心概念

![QA 架构：抽取式、检索增强、生成式](../assets/qa.svg)

**抽取式。** 用一个 transformer（BERT 家族）把问题和段落一起编码。训练两个头，预测答案的起、止 token 下标。损失是在有效位置上的交叉熵。输出是段落里的一个片段。绝不幻觉（构造使然），也绝不处理段落答不出的问题（构造使然）。

**检索增强（RAG）。** 两个阶段。先由检索器从语料里找出 top-`k` 段。再由阅读器（抽取式或生成式）用这些段产出答案。检索器-阅读器的拆分让两者能各自独立训练和评估。现代 RAG 常在两者之间加一个重排器（reranker）。

**生成式。** 一个仅解码器的 LLM（GPT、Claude、Llama）从学到的权重里答题。没有检索步骤。在常识上很出色，在罕见或近期事实上灾难性地差。幻觉率与事实在预训练数据里的出现频率成反比。

```figure
qa-span
```

## 动手构建

### 第 1 步：用预训练模型做抽取式 QA

```python
from transformers import pipeline

qa = pipeline("question-answering", model="deepset/roberta-base-squad2")

passage = (
    "Apple Inc. released the first iPhone on June 29, 2007. "
    "The device was announced by Steve Jobs at Macworld in January 2007."
)
question = "When was the first iPhone released?"

answer = qa(question=question, context=passage)
print(answer)
```

```python
{'score': 0.98, 'start': 57, 'end': 70, 'answer': 'June 29, 2007'}
```

`deepset/roberta-base-squad2` 在 SQuAD 2.0 上训练，那里面包含无法回答的问题。默认情况下，`question-answering` 流水线即便在模型的空答（null）得分胜出时，也返回得分最高的片段——它*不会*自动返回空答。要拿到显式的"无答案"行为，给流水线调用传 `handle_impossible_answer=True`：这时只有当空答得分超过所有片段得分时，流水线才返回空答。无论哪种方式，都要检查 `score` 字段。

### 第 2 步：一条检索增强流水线（勾勒）

```python
from sentence_transformers import SentenceTransformer
import numpy as np

encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

corpus = [
    "Apple Inc. released the first iPhone on June 29, 2007.",
    "Macworld 2007 featured the iPhone announcement by Steve Jobs.",
    "Android launched in 2008 as Google's mobile operating system.",
    "The first iPod was released in 2001.",
]
corpus_embeddings = encoder.encode(corpus, normalize_embeddings=True)


def retrieve(question, top_k=2):
    q_emb = encoder.encode([question], normalize_embeddings=True)
    sims = (corpus_embeddings @ q_emb.T).squeeze()
    order = np.argsort(-sims)[:top_k]
    return [corpus[i] for i in order]


def answer(question):
    passages = retrieve(question, top_k=2)
    combined = " ".join(passages)
    return qa(question=question, context=combined)


print(answer("When was the first iPhone released?"))
```

两阶段流水线。稠密检索器（Sentence-BERT）按语义相似度找相关段。抽取式阅读器（RoBERTa-SQuAD）从合并后的 top 段里抽出答案片段。在小语料上能用。百万级文档语料，用 FAISS 或向量数据库。

### 第 3 步：用 RAG 做生成式

```python
def rag_generate(question, llm):
    passages = retrieve(question, top_k=3)
    prompt = f"""Context:
{chr(10).join('- ' + p for p in passages)}

Question: {question}

Answer using only the context above. If the context does not contain the answer, say "I don't know."
"""
    return llm(prompt)
```

prompt 模式很要紧。明确告诉模型要锚在上下文里、上下文不足时返回 "I don't know"，相比朴素 prompting，能把幻觉率削减 40-60%。更精细的模式还会加上引用、置信度分数和结构化抽取。

### 第 4 步：能反映真实世界的评估

SQuAD 用 **精确匹配（EM）** 和 **token 级 F1**。EM 是归一化（小写、去标点、去冠词）后的严格匹配——要么预测完全吻合，要么得 0。F1 在预测和参考的 token 重叠上计算，给部分分。两者都对复述给分不足："June 29, 2007" vs "June 29th, 2007" 通常得 0 EM（序数词破坏了归一化），但仍能从重叠 token 里挣到可观的 F1。

生产级 QA：

- **答案准确率**（LLM 判或人判，因为指标捕捉不到语义等价）。
- **引用准确率。** 被引用的段落是否真的支持答案？拿生成的引用和检索到的段落做字符串匹配，自动检查起来很简单。
- **拒答校准。** 当答案不在检索到的段里时，系统是否正确地说 "I don't know"？测量虚假自信率。
- **检索召回。** 在评估阅读器之前，先测检索器是否把正确段放进了 top-`k`。阅读器修不了一段缺失的内容。

### RAGAS：2026 年的生产评估框架

`RAGAS` 是专为 RAG 系统打造的，是 2026 年的交付默认。它在不需要金标准参考的情况下给四个维度打分：

- **忠实度。** 答案里的每个论断是否都来自检索到的上下文？用基于 NLI 的蕴含来衡量。你的首要幻觉指标。
- **答案相关性。** 答案是否回应了问题？方法是从答案里生成假设性问题，再和真实问题对比。
- **上下文精确率。** 检索到的块里，真正相关的占多少？精确率低 = prompt 里有噪声。
- **上下文召回率。** 检索集是否包含了所有需要的信息？召回率低 = 阅读器没法成功。

无参考打分让你能在真实生产流量上评估，而不需要精挑细选的金标准答案。对开放式问题，再叠一层 LLM 当裁判——那些问题上精确匹配指标毫无用处。

`pip install ragas`。接上你的检索器 + 阅读器。每个查询得到四个标量。在回归时告警。

## 实际使用

2026 年的栈。

| 用例 | 推荐 |
|---------|-------------|
| 给定段落，找答案片段 | `deepset/roberta-base-squad2` |
| 在固定语料上，不接受闭卷 | RAG：稠密检索器 + LLM 阅读器 |
| 在文档存储上实时查询 | 配混合（BM25 + 稠密）检索器 + 重排器的 RAG（第 14 课） |
| 对话式 QA（追问） | 带对话历史的 LLM + 每轮做 RAG |
| 高度依赖事实的受监管领域 | 在权威语料上做抽取式；绝不单独用生成式 |

2026 年抽取式 QA 不入时了，因为配 LLM 的 RAG 能处理更多情况。它仍然在需要原文引用的场景里出现：法律检索、监管合规、审计工具。

## 拿去用

存为 `outputs/skill-qa-architect.md`：

```markdown
---
name: qa-architect
description: Choose QA architecture, retrieval strategy, and evaluation plan.
version: 1.0.0
phase: 5
lesson: 13
tags: [nlp, qa, rag]
---

Given requirements (corpus size, question type, factuality constraint, latency budget), output:

1. Architecture. Extractive, RAG with extractive reader, RAG with generative reader, or closed-book LLM. One-sentence reason.
2. Retriever. None, BM25, dense (name the encoder), or hybrid.
3. Reader. SQuAD-tuned model, LLM by name, or "domain-fine-tuned DistilBERT."
4. Evaluation. EM + F1 for extractive benchmarks; answer accuracy + citation accuracy + refusal calibration for production. Name what you are measuring and how you are measuring it.

Refuse closed-book LLM answers for regulatory or compliance-sensitive questions. Refuse any QA system without a retrieval-recall baseline (you cannot evaluate the reader without knowing the retriever surfaced the right passage). Flag questions that require multi-hop reasoning as needing specialized multi-hop retrievers like HotpotQA-trained systems.
```

## 练习

1. **简单。** 在 10 段维基百科文字上搭起上面的 SQuAD 抽取式流水线。手工编 10 个问题。测答案对的频率。如果段落和问题都干净，你应该看到 7-9 个正确。
2. **中等。** 加一个拒答分类器。当最高检索得分低于阈值（比如 0.3 余弦）时，返回 "I don't know" 而不去调阅读器。在留出集上调阈值。
3. **困难。** 在你选的一个 10000 文档语料上搭一条 RAG 流水线。实现带 RRF 融合的混合检索（BM25 + 稠密，见第 14 课）。测量加与不加混合步骤的答案准确率。记录哪类问题受益最大。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| 抽取式 QA | 找答案片段 | 预测答案在给定段落里的起止下标。 |
| 开放域 QA | 在语料上 QA | 不给段落；必须先检索再作答。 |
| RAG | 先检索再生成 | 检索增强生成。检索器 + 阅读器流水线。 |
| SQuAD | 经典基准 | 斯坦福问答数据集。EM + F1 指标。 |
| 幻觉 | 编出来的答案 | 阅读器输出不被检索上下文支持。 |
| 拒答校准 | 知道何时闭嘴 | 系统在答不出时正确地说 "I don't know"。 |

## 延伸阅读

- [Rajpurkar et al. (2016). SQuAD: 100,000+ Questions for Machine Comprehension of Text](https://arxiv.org/abs/1606.05250) —— 基准论文。
- [Karpukhin et al. (2020). Dense Passage Retrieval for Open-Domain QA](https://arxiv.org/abs/2004.04906) —— DPR，QA 的经典稠密检索器。
- [Lewis et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) —— 给 RAG 命名的那篇论文。
- [Gao et al. (2023). Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997) —— 全面的 RAG 综述。
