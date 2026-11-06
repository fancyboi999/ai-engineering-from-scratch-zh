---
id: reranker-magic-in-eval
title: 重排模型离线近乎完美，生产反而变差
card: rag
kind: debug
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [reranking, cross-encoder, eval-leak, rag-eval]
minutes: 8
lessons: [phases/19-capstone-projects/66-reranker-cross-encoder, phases/19-capstone-projects/69-end-to-end-rag-system]
manuals: []
practice: []
cheatsheet: [rag-production, llm-evaluation]
related: [rag/rerank-pool-size, rag/bi-encoder-vs-cross-encoder]
updated: 2026-11-03
---

新的交叉编码器重排模型把离线测试集上的 MRR 提到接近完美。到了生产环境，同一个重排模型却让第 1 条结果比单用检索器还差。按顺序列出你要检查的原因，并说明每个原因会表现成什么样。

## Short answer

先查训练数据：人工标注训练对若包含评估查询，评估就变成记忆测试，提升是假的。再查生产中的文本对顺序，因为交叉编码器不对称，颠倒查询和文档会使召回率崩溃。然后查候选池，生产候选来自真实的双编码器，它的 recall@N 限定了重排模型能看到什么。

## Full answer

### 原因一：评估数据泄漏到训练中

重排模型课程提醒：人工标注的训练对包含评估查询时，重排看起来会有神奇效果。端到端课程给出具体例子：14 个训练三元组与评估查询相似，因此演示刻意让两者互不重叠。泄漏表现为离线测试集上近乎完美，生产结果却像换了模型。

### 原因二：文本对颠倒

查询在前、文档在后的分数，不等于文档在前、查询在后的分数。始终先输入查询。颠倒会造成崩溃而非小幅漂移，因为每个分数都按错误方向计算。

### 原因三：候选池不同于生产

离线测试集可能给重排模型一个人造候选池，里面总有标准片段。生产候选来自双编码器，重排模型的召回率无法超过它的 recall@N。课程要求将双编码器、交叉编码器和 N 一起固定；任一变化都会使原评估失效。

### 为下次排查记录什么

每次查询记录交叉编码器第 1 名的分数。第 1 名分数低于语料阈值，表示这是域外查询；发布后分数分布偏移，则可在用户反馈前暴露回退。

## Follow-ups

- **Level 2:** 怎样防止泄漏？ Expected: 严格将评估查询排除在训练三元组之外，哪怕只是测试数据也一样，端到端课程就是这样做的。
- **Level 2:** 文本对颠倒的数值表现是什么？ Expected: 是崩溃而非漂移，因为每次评分方向都错了。
- **Level 3:** 合成候选池为什么会抬高离线结果？ Expected: 它可保证每次都有标准片段，而生产受真实双编码器 recall@N 限制。
- **Level 3:** 每次查询记录哪个数值帮助发现下次回退？ Expected: 交叉编码器第 1 名的分数；低于语料阈值时表示域外查询。

## Wrong answers

- "生产模型构建版本不同。" 先查数据和输入，再查权重；泄漏和文本对颠倒都能在相同权重下复现。
- "测试集太小，结果没有意义。" 规模不会造成泄漏，训练与评估查询重叠才会。
- "把生产环境的 N 降到与测试集一致。" N 越小，召回上限越低，流水线只会更差。

## Taught in

[交叉编码器](../../../phases/19-capstone-projects/66-reranker-cross-encoder/)课程指出泄漏、不对称和候选池上限，[端到端 RAG](../../../phases/19-capstone-projects/69-end-to-end-rag-system/)课程让训练三元组与评估查询保持不重叠。
