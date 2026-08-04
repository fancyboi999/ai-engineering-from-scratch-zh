# LLM 评估 —— RAGAS、DeepEval、G-Eval

> 精确匹配和 F1 抓不到语义等价。人工复核又不扩展。LLM 当裁判是生产里的答案——前提是校准到位、能信那个数。

**类型：** Build
**语言：** Python
**前置要求：** Phase 5 · 13（问答）、Phase 5 · 14（信息检索）
**预计时间：** ~75 分钟

## 问题背景

你的 RAG 系统答："June 29th, 2007."。
金标准参考是："June 29, 2007."。
精确匹配得 0。F1 约 75%。人类会打 100%。

现在乘以 10000 个测试用例。再乘以检索器、分块、prompt 或模型的每一次改动。你需要一个评估器：懂含义、规模化时跑得便宜、不在回归上撒谎、还能浮现出正确的翻车方式。

2026 年有三个框架掌管这个问题。

- **RAGAS。** Retrieval-Augmented Generation ASsessment。四个 RAG 指标（忠实度、答案相关性、上下文精确率、上下文召回率），后端用 NLI + LLM 裁判。有研究背书，轻量。
- **DeepEval。** LLM 版的 pytest。G-Eval、任务完成度、幻觉、偏见等指标。CI/CD 原生。
- **G-Eval。** 一个方法（也是 DeepEval 的一个指标）：带思维链的 LLM 当裁判，自定义标准，0-1 分。

三者都倚重 LLM 当裁判。这节课为这个方法及其周围的信任层建立直觉。

## 核心概念

![四个评估维度，LLM 当裁判的架构](../assets/llm-evaluation.svg)

**LLM 当裁判。** 用一个按评分细则给输出打分的 LLM 替换静态指标。给定 `(query, context, answer)`，给裁判 LLM 下 prompt："Score 0-1 on faithfulness."。返回分数。

它为什么有效：LLM 以微小的成本逼近人类判断。GPT-4o-mini 每个评分用例约 0.003 美元，让 1000 样本的回归评估跑一轮不到 5 美元。

它为什么默默失败：

1. **裁判偏见。** 裁判偏好更长的答案、来自自己模型家族的答案、匹配 prompt 风格的答案。
2. **JSON 解析失败。** 坏 JSON → NaN 分数 → 默默从聚合里被排除。RAGAS 用户深知这份痛。用 try/except + 显式失败模式来兜住。
3. **跨模型版本漂移。** 升级裁判会改变每个指标。冻死裁判模型 + 版本。

**RAG 四件套。**

| 指标 | 问题 | 后端 |
|--------|----------|---------|
| 忠实度 | 答案里的每个论断是否来自检索到的上下文？ | 基于 NLI 的蕴含 |
| 答案相关性 | 答案是否回应了问题？ | 从答案生成假设性问题；和真实问题对比 |
| 上下文精确率 | 检索到的块里，相关的占多少？ | LLM 裁判 |
| 上下文召回率 | 检索是否返回了所需的一切？ | LLM 裁判，对照金标准答案 |

**G-Eval。** 定义一个自定义标准："答案是否引用了正确的来源？"。框架自动展开成思维链评估步骤，再打 0-1 分。适合 RAGAS 没覆盖的领域专用质量维度。

**校准。** 在你拿裁判分数和人工标签做相关性对比之前，永远别信原始裁判分数。跑 100 个手工标注样本。画裁判 vs 人类。算 Spearman rho。如果 rho < 0.7，你的裁判评分细则需要打磨。

```figure
n5-judge-gauge
```

## 动手构建

### 第 1 步：用 NLI 做忠实度（RAGAS 风格）

```python
from typing import Callable
from transformers import pipeline

nli = pipeline("text-classification",
               model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
               top_k=None)

# `llm` 是任意可调对象：prompt str -> 生成的 str。
# 例如：llm = lambda p: client.messages.create(model="claude-haiku-4-5", ...).content[0].text
LLM = Callable[[str], str]


def atomic_claims(answer: str, llm: LLM) -> list[str]:
    prompt = f"""Break this answer into simple factual claims (one per line):
{answer}
"""
    return llm(prompt).splitlines()


def faithfulness(answer: str, context: str, llm: LLM) -> float:
    claims = atomic_claims(answer, llm)
    if not claims:
        return 0.0
    supported = 0
    for claim in claims:
        result = nli({"text": context, "text_pair": claim})[0]
        entail = next((s for s in result if s["label"] == "entailment"), None)
        if entail and entail["score"] > 0.5:
            supported += 1
    return supported / len(claims)
```

把答案拆成原子论断。拿每个论断对照检索到的上下文做 NLI 检查。忠实度 = 被支持的比例。

### 第 2 步：答案相关性

```python
import numpy as np
from sentence_transformers import SentenceTransformer

# encoder：任意实现了 .encode(texts, normalize_embeddings=True) -> ndarray 的模型
# 例如 encoder = SentenceTransformer("BAAI/bge-small-en-v1.5")

def answer_relevance(question: str, answer: str, encoder, llm: LLM, n: int = 3) -> float:
    prompt = f"Write {n} questions this answer could be the answer to:\n{answer}"
    generated = [line for line in llm(prompt).splitlines() if line.strip()][:n]
    if not generated:
        return 0.0
    q_emb = np.asarray(encoder.encode([question], normalize_embeddings=True)[0])
    g_embs = np.asarray(encoder.encode(generated, normalize_embeddings=True))
    sims = [float(q_emb @ g_emb) for g_emb in g_embs]
    return sum(sims) / len(sims)
```

如果答案暗示的问题和被问的不一样，相关性就掉。

### 第 3 步：G-Eval 自定义指标

```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase

metric = GEval(
    name="Correctness",
    criteria="The answer should be factually accurate and match the expected output.",
    evaluation_steps=[
        "Read the expected output.",
        "Read the actual output.",
        "List factual claims in the actual output.",
        "For each claim, mark supported or unsupported by the expected output.",
        "Return score = fraction supported.",
    ],
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
)

test = LLMTestCase(input="When was the first iPhone released?",
                   actual_output="June 29th, 2007.",
                   expected_output="June 29, 2007.")
metric.measure(test)
print(metric.score, metric.reason)
```

那些评估步骤就是评分细则。显式步骤比隐式的"打 0-1 分"prompt 更稳定。

### 第 4 步：CI 闸门

```python
import deepeval
from deepeval.metrics import FaithfulnessMetric, ContextualRelevancyMetric


def test_rag_system():
    cases = load_regression_cases()
    faith = FaithfulnessMetric(threshold=0.85)
    rel = ContextualRelevancyMetric(threshold=0.7)
    for case in cases:
        faith.measure(case)
        assert faith.score >= 0.85, f"faithfulness regression on {case.id}"
        rel.measure(case)
        assert rel.score >= 0.7, f"relevancy regression on {case.id}"
```

作为一个 pytest 文件出货。每个 PR 上跑。在回归时拦住合并。

### 第 5 步：从零做玩具评估

见 `code/main.py`。仅标准库地近似忠实度（答案论断与上下文的重叠）和相关性（答案 token 与问题 token 的重叠）。非生产。展示形状。

## 坑

- **不校准。** 一个和人工标签相关性只有 0.3 的裁判就是噪声。出货前要求一次校准跑。
- **自评估。** 用同一个 LLM 既生成又评判，会把分数抬高 10-20%。裁判用不同的模型家族。
- **成对评判里的位置偏见。** 裁判偏好呈现的第一个选项。永远随机顺序，两边都跑。
- **原始聚合藏住失败。** 均分 0.85 常常藏着 5% 的灾难性失败。永远检查最低分位。
- **黄金数据集腐烂。** 没版本、随时间漂移的评估集会破坏纵向对比。每次改动都给数据集打标签。
- **LLM 成本。** 规模化时裁判调用主导成本。用满足校准阈值的最便宜模型。GPT-4o-mini、Claude Haiku、Mistral-small。

## 实际使用

2026 年的栈：

| 用例 | 框架 |
|---------|-----------|
| RAG 质量监控 | RAGAS（4 个指标） |
| CI/CD 回归闸门 | DeepEval + pytest |
| 自定义领域标准 | DeepEval 里的 G-Eval |
| 在线实时流量监控 | 无参考模式的 RAGAS |
| 人在回路抽检 | 带标注 UI 的 LangSmith 或 Phoenix |
| 红队 / 安全评估 | Promptfoo + DeepEval |

典型栈：RAGAS 做监控，DeepEval 做 CI，G-Eval 做新维度。三个都跑；它们的分歧有用。

## 拿去用

存为 `outputs/skill-eval-architect.md`：

```markdown
---
name: eval-architect
description: Design an LLM evaluation plan with calibrated judge and CI gates.
version: 1.0.0
phase: 5
lesson: 27
tags: [nlp, evaluation, rag]
---

Given a use case (RAG / agent / generative task), output:

1. Metrics. Faithfulness / relevance / context-precision / context-recall + any custom G-Eval metrics with criteria.
2. Judge model. Named model + version, rationale for cost vs accuracy.
3. Calibration. Hand-labeled set size, target Spearman rho vs human > 0.7.
4. Dataset versioning. Tag strategy, change log, stratification.
5. CI gate. Thresholds per metric, regression-window logic, bottom-quantile alert.

Refuse to rely on a judge untested against ≥50 human-labeled examples. Refuse self-evaluation (same model generates + judges). Refuse aggregate-only reporting without bottom-10% surfacing. Flag any pipeline where judge upgrade lands without parallel baseline eval.
```

## 练习

1. **简单。** 在 10 个含已知幻觉的 RAG 样本上用 RAGAS。验证忠实度指标逐一抓出它们。
2. **中等。** 手工给 50 个 QA 答案按正确性打 0-1。用 G-Eval 打分。测裁判和人类之间的 Spearman rho。
3. **困难。** 用 DeepEval 搭一个 pytest CI 闸门。故意把检索器搞退步。验证闸门挂掉。通过对最低 10% 的阈值检查加上最低分位告警。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|-----------------------|
| LLM 当裁判 | 用 LLM 打分 | 让一个裁判模型按评分细则给输出打 0-1 分。 |
| RAGAS | 那个 RAG 指标库 | 带 4 个无参考 RAG 指标的开源评估框架。 |
| 忠实度 | 答案有据吗？ | 答案论断被检索上下文蕴含的比例。 |
| 上下文精确率 | 检索到的块相关吗？ | top-K 块里真正有用的比例。 |
| 上下文召回率 | 检索找全了吗？ | 金标准答案论断被检索块支持的比例。 |
| G-Eval | 自定义 LLM 裁判 | 评分细则 + 思维链评估步骤 + 0-1 分。 |
| 校准 | 信任但要核实 | 裁判分数和人类分数之间的 Spearman 相关性。 |

## 延伸阅读

- [Es et al. (2023). RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://arxiv.org/abs/2309.15217) —— RAGAS 论文。
- [Liu et al. (2023). G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment](https://arxiv.org/abs/2303.16634) —— G-Eval 论文。
- [DeepEval docs](https://deepeval.com/docs/metrics-introduction) —— 开源生产栈。
- [Zheng et al. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) —— 偏见、校准、限度。
- [MLflow GenAI Scorer](https://mlflow.org/blog/third-party-scorers) —— 整合 RAGAS、DeepEval、Phoenix 的统一框架。
