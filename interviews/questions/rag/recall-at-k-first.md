---
id: recall-at-k-first
title: 答案出错后首先该看哪个指标
card: rag
kind: concept
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [screen, ml-breadth]
tags: [rag-eval, recall, precision, qrels]
minutes: 6
lessons: [phases/19-capstone-projects/68-rag-eval-precision-recall, phases/05-nlp-foundations-to-advanced/13-question-answering]
manuals: []
practice: []
cheatsheet: [llm-evaluation, rag-production]
related: [rag/diagnose-from-the-metric-table, rag/rag-or-fine-tune]
updated: 2026-11-03
---

用户反馈文档助手答错了。流水线包括分块器、检索器、重排模型和生成器。如果只能先看一个指标，你选什么？为什么？

## Short answer

先看检索阶段的 recall@k。若标准答案文本块不在前 k 个结果中，重排模型无法把它找回来，生成器通常也缺少正确回答所需的证据，除非另一个文本块恰好包含这些证据，因此后续指标很难解释。召回率只是检查顺序的第一项，并非阻断后续排查的门槛：召回正常或其他片段包含证据时，应继续检查排名和生成文本，否则下游故障仍会被掩盖。

## Full answer

### 两个检索指标

precision@k 表示前 k 个结果中标准相关文档的比例。如果标准集合有三篇文档，前 3 个结果包含其中两篇及一篇错误文档，precision@3 就是 2 / 3。recall@k 表示标准集合中有多少出现在前 k 个结果中。如果前 5 个结果包含全部三篇标准文档，recall@5 就是 1.0。

生产团队报的是召回率。生成器可以轻松忽略多余的片段，却无法根据从未见过的片段得出答案。

### 检查顺序

| 现象 | 可能原因 | 修正对象 |
|---|---|---|
| 召回率和精确率都低 | 分块器切断答案，或检索器找不到答案 | 分块边界或检索方式 |
| 召回率尚可，MRR 低 | 正确片段在前 k 个结果中，但不在首位 | 重排模型 |
| MRR 高，忠实度低 | 上下文正确，生成器仍编造内容 | 生成 prompt、引用或拒答 |
| 忠实度高，相关性低 | 答案有依据，但偏离问题 | 查询改写器或 prompt |
| 四项都高，用户仍投诉 | 评估集不能代表真实查询 | 向 qrels 添加真实用户查询 |

### 控制评估成本

对 qrels 分层：20 条查询的冒烟集在 CI 中运行，200 条的回归集每晚运行，2000 条的深度集每周运行。把召回率回退当作测试失败处理。

## Follow-ups

- **Level 1:** 召回率正常后，precision@k 还能说明什么？ Expected: 返回列表中噪声的比例；错误片段会污染答案或浪费 token，因此该指标仍然重要。
- **Level 2:** recall@5 正常，但标准片段排在第 4 或第 5 位。哪个指标能反映问题，应修哪个阶段？ Expected: MRR，应修重排模型。
- **Level 3:** 平均召回率为 90%，一个团队却每天投诉，可能隐藏了什么？ Expected: 某一类查询始终失败；按字面匹配、改写、多主题等查询类别划分 qrels，分别报告。
- **Level 3:** 如何让评估足够快，能在每次修改后运行？ Expected: 分层，CI 运行 20 条冒烟查询，每晚 200 条，每周 2000 条。

## Wrong answers

- "直接阅读答案并评分。" 单看答案无法判断四个阶段中哪个出了问题。
- "看 precision@k，因为噪声导致答案错误。" 正确片段存在时精确率才有意义；首先应排除片段缺失。
- "看忠实度，因为模型出现幻觉。" 忠于错误片段的答案仍然错误；忠实度只评价生成器是否忠于它看到的内容。

## Taught in

[RAG 评估](../../../phases/19-capstone-projects/68-rag-eval-precision-recall/)课程定义指标和诊断表，[问答](../../../phases/05-nlp-foundations-to-advanced/13-question-answering/)课程要求先评估检索器，再评估阅读器。
