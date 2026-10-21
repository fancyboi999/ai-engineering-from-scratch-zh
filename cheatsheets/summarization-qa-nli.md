---
id: summarization-qa-nli
title: 摘要、问答、NLI 与多语言 NLP
code: SQ
subtitle: 生成摘要、回答问题、检查蕴含并跨语言迁移，涵盖模型、指标、默认值与故障。
hue: 285
sources: phases/05-nlp-foundations-to-advanced/12-text-summarization, phases/05-nlp-foundations-to-advanced/13-question-answering, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment
source_hash: 3bae9181202bff94
---

## 带 NLI 闸门的有据问答
type: architecture
from: phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

```arch
node | q | 1,1 | 问题 | | client
node | retr | 2,1 | 检索器 | 前 k 个段落 | process
node | read | 3,1 | 阅读器 | 文本区间或 LLM 答案 | model
node | nli | 4,1 | NLI 检查 | 上下文蕴含答案？ | model
node | corpus | 2,2 | 语料库 | BM25、稠密或混合 | store
node | out | 4,2 | 答案 | 或“我不知道” | client
edge | q | retr |
edge | corpus | retr | 搜索
edge | retr | read | 段落
edge | read | nli | 答案
edge | nli | out | 蕴含
```

## 代码中的任务
type: task-table
span: 2
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/code/main.py, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

| 任务 | 代码 |
|---|---|
| 抽取式摘要 | `textrank(text, top_k=3, damping=0.85, iterations=50, epsilon=1e-4)` |
| 生成式摘要 | `pipeline("summarization", model="facebook/bart-large-cnn")` |
| 生成摘要 | `summarizer(article, max_length=120, min_length=60, do_sample=False)` |
| 带词干提取的 ROUGE | `rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)` |
| 抽取式问答 | `pipeline("question-answering", model="deepset/roberta-base-squad2")` |
| 允许空答案 | 向 pipeline 调用传入 `handle_impossible_answer=True` |
| SQuAD 指标 | `exact_match(pred, gold)` 和 `token_f1(pred, gold)` |
| 零样本主题标签 | `zs(text, candidate_labels=labels)` |

## SQuAD 规范化
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/13-question-answering/code/main.py

```python
def normalize(text):
    text = text.lower()
    text = re.sub(r"\b(a|an|the)\b", " ", text)  # 移除冠词
    text = re.sub(r"[^\w\s]", " ", text)         # 移除标点
    return " ".join(text.split())

exact_match("June 29th, 2007", "June 29, 2007")  # 0.0
token_f1("June 29th, 2007", "June 29, 2007")     # 0.67
token_f1("29 June 2007", "June 29, 2007")        # 1.00，EM 为 0
refusal_from_score(top_retrieval_score, threshold=0.3)  # True 表示拒答
```

## TextRank 逐步流程
type: flow
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/code/main.py, phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md

1. **切分**：`sentence_split` 在 `.`、`!` 或 `?` 后切分，句子太少时全部返回。
2. **构图**：`similarity` 为词重叠量除以两个长度的对数之和。
3. **迭代**：每个得分为 `1 - damping` 加阻尼后的邻居得分。
4. **停止**：变化小于 `epsilon`，或完成 `iterations` 轮。
5. **输出**：按文档顺序输出得分最高的 `top_k` 个句子。

## 指标
type: concepts
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/code/main.py

- **ROUGE-1、ROUGE-2**：与参考文本的一元和二元词组重叠。
- **ROUGE-L**：最长公共子序列。40 表示较好，50 表示出色。
- **EM**：规范化后精确匹配，否则得分为 0。
- **Token F1**：在 token 重叠上计算 $F_1 = \frac{2PR}{P + R}$，允许部分得分。
- **BERTScore**：上下文嵌入相似度，与 ROUGE 一起报告。
- **G-Eval**：带思维链的 LLM 评审，与人类约有 80% 的一致率。
- **实体级 F1**：只在摘要中出现的实体值得怀疑。
- **RAGAS**：忠实度、答案相关性、上下文精确率、上下文召回率。

## 问答
type: qa
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

- **抽取式还是生成式？** 新闻、医疗、法律和金融文本使用抽取式；生成式需要事实性检查。
- **零样本分类如何工作？** 将每个标签变成一个假设，选择蕴含得分最高的标签。
- **迁移用哪种源语言？** 先尝试关系近的高资源语言，印度语族目标可选印地语。
- **为什么逐语言报告准确率？** 汇总值会掩盖长尾。
- **RAGAS 需要标准答案吗？** 不需要，它无需参考答案就能为四个维度评分。

## 提示
type: tips
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

- ROUGE 始终启用词干提取，否则 "running" 与 "run" 不匹配。
- 报告 ROUGE-L、BERTScore 和 G-Eval，在 50-100 个人工标注摘要上校准。
- 要求模型只使用上下文，不知道时说“我不知道”。
- 始终检查问答 pipeline 的 `score` 字段。
- 发布零样本分类前，先做 100 个带标签样例的基本检查。
- 输入超过上下文窗口时，使用分块 map-reduce，不要截断。

## NLI 与忠实度
type: annotated-code
lang: python
from: phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

```python
nli = pipeline("text-classification",
               model="facebook/bart-large-mnli",
               top_k=None)                       # 返回全部三种标签
result = nli({"text": premise, "text_pair": hypothesis})[0]
zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
result = zs(text, candidate_labels=labels)       # 标签按得分排序

def is_faithful(answer, context, threshold=0.5):
    result = nli({"text": context, "text_pair": answer})[0]
    entail = next(s for s in result if s["label"] == "entailment")
    return entail["score"] > threshold           # 上下文支持该主张
```

## 故障排查
type: troubleshooting
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 摘要出现 "John Brown" | 生成式输出替换了实体 | 标记源文中不存在的实体 |
| "25,000" 变成 "25 million" | 数值漂移 | 使用抽取式或事实性闸门 |
| 不可回答的问题仍返回文本区间 | 默认忽略空答案得分 | 设置 `handle_impossible_answer=True` |
| 阅读器效果差 | 检索器漏掉相关段落 | 衡量前 `k` 项的检索召回率 |
| 仅凭假设就达到约 60% | "not"、"never" 泄漏标签 | 使用仅假设基线与 ANLI |
| 长前提上 F1 下降超过 20 | 使用句子级 NLI 模型 | 使用 DocNLI 训练的模型 |
| 零样本得分波动超过 10 个百分点 | 模板敏感性 | 调整 `hypothesis_template` |
| 印地语输出有细微错误 | 每词 token 数增加 3-5 倍 | 检查切词膨胀率，使用 `byte_fallback=True` |

## 默认值与数值
type: defaults
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/code/main.py, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| TextRank `damping` | 0.85 | PageRank 默认值 |
| TextRank `iterations` | 50 | 变化低于 `epsilon` 1e-4 时提前停止 |
| BART `max_length` | 120 | 配合 `min_length=60` |
| 拒答 `threshold` | 0.3 | 最高检索得分低于该值时拒答 |
| `is_faithful` 阈值 | 0.5 | 蕴含得分必须超过该值 |
| 少样本示例 | 100-500 | 目标语言，达到英语基线的 95-98% |
| `learning_rate` | 2e-5 | 更高学习率会破坏对齐 |
| `num_train_epochs` | 5 | 对 100-500 个样例较稳妥 |

## 缩写
type: glossary
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

- **ROUGE**：Recall-Oriented Understudy for Gisting Evaluation，衡量 N-gram 与最长公共子序列重叠。
- **SQuAD**：Stanford Question Answering Dataset，使用 EM 与 F1 指标。
- **NLI**：自然语言推断，分为蕴含、矛盾或中立。
- **RTE**：识别文本蕴含，NLI 的旧称。
- **MultiNLI**：跨 10 种文体的 433k 对文本，是标准 NLI 训练语料。
- **ANLI**：对抗式 NLI，由人类编写能让模型出错的文本对。
- **XLM-R**：在 CommonCrawl 上训练的 100 种语言 RoBERTa，Base 为 270M，Large 为 550M。
- **NLLB**：No Language Left Behind，涵盖 200 种语言，其中 55 种为低资源语言。

## 选择模型
type: command-table
from: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/zh.md, phases/05-nlp-foundations-to-advanced/13-question-answering/docs/zh.md, phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/zh.md, phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/zh.md

| 命令 | 作用 |
|---|---|
| `facebook/bart-large-cnn` | 3 至 5 句的英语新闻摘要 |
| `google/pegasus-pubmed` | 科学论文摘要 |
| `philschmid/bart-large-cnn-samsum` | 对话摘要 |
| `deepset/roberta-base-squad2` | 从给定段落中抽取答案区间 |
| `facebook/bart-large-mnli` | 轻量零样本分类 |
| `cross-encoder/nli-deberta-v3-base` | 用于边缘端的快速 NLI |
| `joeddav/xlm-roberta-large-xnli` | 多语言零样本分类 |
| `facebook/nllb-200-distilled-600M` | 200 种语言翻译 |
