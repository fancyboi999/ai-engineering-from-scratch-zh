---
id: tokenizer-is-the-benchmark
title: 一篇论文的 BLEU 是 28.3，另一篇是 0.283
card: evaluation
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [bleu, rouge-l, tokenizer, reproducibility]
minutes: 8
lessons: [phases/19-capstone-projects/71-classical-metrics]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/exact-match-vs-token-f1]
updated: 2026-11-03
---

两篇论文报告了同一个测试集上的 BLEU。一篇是 28.3，另一篇是 0.283。第三个团队在同样的输出上报告的 ROUGE-L 比你的低十个点。你的经理问哪个数字对。你怎么回答？

## Short answer

在不同的指标设置下，它们可能都对。BLEU 是一个比例，其中一篇论文把它乘了一百。一个库转小写、另一个不转，或者两者分词方式不同，ROUGE-L 就会差十个点。比较之前先读指标设置；在你自己的 harness 里固定一个分词器和一条平滑规则，并用测试把它们钉住。

## Full answer

### 尺度差异

两个 BLEU 数字是同一个分数的两种尺度。没什么要调试的；在你发布的每个数字旁边写明尺度。

### 分词器是一项契约

综合项目对所有指标用同一个分词器：文本转小写，保留连续的单词字符。每个指标读到的是同样的 token。换掉分词器，你跑的就是另一个基准。十个点的 ROUGE-L 差距，正是一边保留大小写、一边不保留时，这种替换的样子。

### 数字里还藏着什么

- **BLEU-4** 计算 n 从 1 到 4 的修正 n-gram 精确率。每个候选 n-gram 的计数会被截断到它在任一参考答案中出现的最大次数，所以候选文本不能靠重复一个短语取胜。简短惩罚会降低比参考答案短的候选文本的分数。对计数做加一平滑，可以避免没有 4-gram 匹配时对零取对数；在长候选文本上，它与不平滑的值很接近。
- **ROUGE-L** 找最长公共子序列。召回率是子序列长度除以参考长度，精确率是子序列长度除以候选长度，分数是两者的 F1。

### 在你的 harness 里怎么做

自己写这些指标，让同事能审查。用手算示例得出的参考向量把它们钉住，而不是用第三方库的输出。测试边界情况：空预测、空参考、没有共同 token、完全匹配，以及重复短语。

## Follow-ups

- **Level 2:** BLEU 里的截断为什么重要？ Expected: 重复一个匹配短语的候选文本会抬高 n-gram 精确率；截断把计数限制在参考答案中的次数以内。
- **Level 2:** 简短惩罚做什么？ Expected: 它降低比参考答案短的候选文本的分数，这样短输出不能只靠精确率取胜。
- **Level 3:** 为什么要给 n-gram 计数加一？ Expected: 没有任何 4-gram 匹配的一对会导致对零取对数，分数变成零；平滑让几何平均保持有限，对长候选文本几乎没有影响。
- **Level 3:** 怎么让一年里各次运行的指标数字保持可比？ Expected: 在代码里固定分词器和平滑方式，在测试里保留参考向量，并在每个排行榜上记录指标版本。

## Wrong answers

- "用大家都在用的那个库。" 两个库在同样的输出上差十个点；你仍然需要知道各自用了什么分词器和大小写处理。
- "BLEU 过时了，扔掉。" 大多数已发表的数字仍然基于它；先学会读它，再在上面叠加基于模型的指标。
- "转小写不可能让分数差十个点。" 综合项目报告了两个库在 ROUGE-L 上确实差了这么多；大小写决定了哪些 token 能匹配上。

## Taught in

[经典指标综合项目](../../../phases/19-capstone-projects/71-classical-metrics/)解释了为什么分词器是一份契约，以及 BLEU 和 ROUGE-L 怎么计算。
