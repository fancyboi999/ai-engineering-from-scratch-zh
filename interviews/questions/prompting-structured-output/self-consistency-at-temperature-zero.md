---
id: self-consistency-at-temperature-zero
title: 五票同一条路径，账单却是五倍
card: prompting-structured-output
kind: debug
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer]
rounds: [debugging, ml-depth]
tags: [self-consistency, temperature, chain-of-thought, cost]
minutes: 8
lessons: [phases/11-llm-engineering/02-few-shot-cot]
manuals: []
practice: []
cheatsheet: [prompt-engineering]
related: [prompting-structured-output/cot-when-it-hurts, prompting-structured-output/escalation-pipeline-cost]
updated: 2026-11-03
---

某个数学助手每个问题采样五条推理路径，再做多数投票。准确率与单条路径相比没有变化，账单却是原来的五倍。团队为了可复现，把温度设成了零。发生了什么？在保留投票之前，你还要检查什么？

## Short answer

温度为零时，各次采样本应完全相同，只有非确定性的推理服务栈会让它们略有差异，所以五条路径接近于同一条路径数了五遍，投票几乎改变不了什么。课程用 0.7 采样，让路径差异足够大，各自的错误才能相互抵消。然后检查最终答案是否以固定格式输出，因为没有像 "The answer is" 后跟数字这样的一行，票就没法比较；再检查单条路径的准确率是否落在投票有效的区间，大约 60% 到 85%。

## Full answer

### 投票需要什么

自洽性（self-consistency）有效，是因为单条推理链可能含有推理错误，而相互独立的推理链很少犯同一个错。独立性来自采样。课程的求解器用温度 0.7 把同一个 prompt 跑 N 次，从每次结果里取出最终数字，选出现最多的那个。得票占比就是置信度。

### 提升出现在哪里

在最初针对一个 540B 模型的实验里，投票把小学数学成绩从单链的 56.5% 提高到 40 个样本时的 74.4%。在已经得 97% 的模型上，投票只多出大约一个百分点。单链准确率在 60% 到 85% 之间时这项技术最划算：错误频繁，但不是系统性的。

### 采样多少次

五个样本就能拿到大部分收益。三个是有意义投票的最小规模。超过十个收益递减，而每个样本都是一次完整调用。推理模型在内部自己做采样，所以投票对它们帮助不大。

### 格式约束

system prompt 要求把最终答案以固定格式写在最后一行。没有它，抽取器就没有可比较的东西，对自由文本投票只是噪声。

## Follow-ups

- **Level 2:** 为什么是 0.7，而不是高得多的值？ Expected: 随机性足以产生多样的路径，又不至于让模型输出胡言乱语。
- **Level 2:** 五个答案怎么比较？ Expected: prompt 强制最后一行用固定格式，代码从中取出数字；没有这一步，投票就没有东西可数。
- **Level 3:** 什么时候投票值得花五倍的成本？ Expected: 单链准确率在 60% 到 85% 之间时；模型已经到 97% 时，提升只有大约一个百分点。
- **Level 3:** 课程怎样把投票变成决策？ Expected: 得票占比就是置信度；五票中四票一致（置信度 0.8）且与确定性答案相同就接受，否则升级到树搜索。

## Wrong answers

- "温度零让投票更可靠。" 它让各个样本相同或几乎相同，根本没有真正的投票。
- "像论文一样用 40 个样本。" 五个就能拿到大部分收益，超过十个就收益递减；40 个让成本成倍增加，收益却很少。
- "投票能修正系统性错误。" 如果大多数路径犯同一个错，多数答案就会以高置信度出错；投票只能抵消相互独立的错误。

## Taught in

[少样本与思维链](../../../phases/11-llm-engineering/02-few-shot-cot/)一课搭建了自洽性求解器，设定了温度和格式约束，并给出了样本数量。
