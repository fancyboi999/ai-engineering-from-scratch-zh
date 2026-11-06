---
id: pairwise-position-bias
title: 调换顺序后，赢家变了
card: evaluation
kind: debug
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [llm-as-judge, pairwise, position-bias, win-rate]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks, phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/judge-calibration-before-trust]
updated: 2026-11-03
---

你比较两个 prompt 版本的方式是：把两份输出都给 judge 模型看，问哪个更好。版本 B 赢了 70% 的对比。然后你把两份输出的顺序对调，版本 A 赢了大多数。哪里出了问题？这种比较该怎么跑？

## Short answer

judge 有位置偏见：它偏好先读到的那个选项。你第一次运行测的是顺序，不是 prompt。每一对都按两种顺序各打一次分，同一个版本两次都赢才算赢，结果随顺序翻转的算平局。然后报告胜率及其置信区间。

## Full answer

### 为什么要成对比较

成对比较的 judge 不用判断一个输出在量表上是 3 分还是 4 分。它只挑赢家，因此避开了单独打分时的量表校准问题。这让它很适合拿来对比两个 prompt 版本。

### 偏见

judge 偏好第一个出现的选项。课程的规则很简短：永远随机打乱顺序，两种顺序都跑。只跑一种顺序，得到的数字反映的是 prompt 的排版。

### 流程

1. 对每个输入，按两种顺序给这一对打分。
2. 一个版本只有在两种顺序下都赢，才算赢下这一对。
3. 结果随顺序翻转的一对算平局。
4. 报告胜率和置信区间。胜率接近一半，说明 judge 分不出这两个版本。

还要检查长度。如果版本 B 更长，judge 可能是在奖励啰嗦。对长度做归一化，或在量表里写明长度不计分，再看偏好是否还在。

## Follow-ups

- **Level 2:** 为什么成对比较能避开量表校准的问题？ Expected: judge 只挑赢家，从不把输出放到数值刻度上。
- **Level 2:** 版本 B 还更长。你还要控制什么？ Expected: 冗长偏见；对长度做归一化或在量表里排除长度，再检查偏好是否仍然存在。
- **Level 3:** 两种顺序都跑完后，40% 的对比随顺序翻转。这说明什么？ Expected: 在这些对上 judge 分不出两个版本；算作平局，预计胜率会接近一半。
- **Level 3:** 要多少对，55% 的胜率才算真的？ Expected: 多到区间排除一半为止；用 Wilson 或 bootstrap 区间，预计需要几百对。

## Wrong answers

- "judge 是随机的，换一个 judge。" 位置偏见是系统性的，不是随机的；换一个 judge 也有，要修的是流程。
- "永远把基线放在前面。" 这只是把偏见固定在一个方向上，把它藏了起来；两种顺序都要跑。
- "成对比较只适用于人工评审。" 只要随机打乱顺序并两种顺序都打分，judge 也能做好成对比较。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)点出了位置偏见和两种顺序都跑的规则，[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)解释了成对比较为什么能避开量表校准。
