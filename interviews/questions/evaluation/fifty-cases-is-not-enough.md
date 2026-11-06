---
id: fifty-cases-is-not-enough
title: 50 个用例上的 4 分领先
card: evaluation
kind: estimate
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, ai-data-engineer]
rounds: [screen, ml-depth]
tags: [sample-size, confidence-interval, wilson, regression]
minutes: 8
lessons: [phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/mean-hides-the-tail]
updated: 2026-11-03
---

一次 prompt 修改在你 50 个用例的黄金集上得了 90%，基线在同一集合上是 86%。作者想把它当作 4 分的提升上线。你能有多大把握？要做这个判断需要多大的样本量？

## Short answer

50 个用例、观测准确率 90% 时，95% 置信区间是 78% 到 97%，宽 19 个百分点。4 分的差距完全落在这个范围里，分不清是提升还是噪声。要检测 5% 的变化大约需要 200 个用例，两个系统很接近时至少需要 500 个。

## Full answer

### 对照表

| 用例数 | 观测准确率 | 95% 区间宽度 | 能否检测 5% 的回退 |
|---|---|---|---|
| 50 | 90% | 19 个点 | 不能 |
| 100 | 90% | 12 个点 | 勉强 |
| 200 | 90% | 9 个点 | 能 |
| 500 | 90% | 5 个点 | 有把握 |
| 1000 | 90% | 3 个点 | 精确 |

宽度大致与样本量的平方根成反比。用例数变成 4 倍，宽度大约减半。

### 区间

对通过率，课程用 Wilson 区间。它在小样本和比例接近 0 或 1 时都保持正确。正态区间在这两种情况下都会失效，而发布决定恰恰就落在这两种情况里。

### 配对

两个版本跑的是同样的 50 个用例，所以要成对比较。对逐用例差值做配对检验或配对 bootstrap，结果比两个独立区间更紧。它仍然救不了 50 个用例上的 4 分差距，但集合足够大之后，这才是正确的检验。

### 怎么凑到 200

课程把评测集分成三部分：50 到 100 个精选的黄金核心用例，20 到 50 个对抗用例，100 到 200 个真实流量样本。给评测集做版本管理，只在同一版本上比较两次运行。

## Follow-ups

- **Level 2:** 为什么加用例时区间缩得这么慢？ Expected: 宽度与样本量的平方根成反比，所以用例数翻 4 倍，宽度才减半。
- **Level 2:** 两次运行用的是完全相同的用例。这有帮助吗？ Expected: 有；对逐用例差值做配对比较，比两个独立区间更紧。
- **Level 3:** 课程对通过率用哪种区间，为什么？ Expected: Wilson 区间，因为在小样本和极端比例下它表现正确，正态近似则会失效。
- **Level 3:** 每次运行的预算只够调用 200 次 judge。怎么分配？ Expected: 黄金核心、对抗切片和生产流量样本，做版本管理，并在要比较的两次运行之间保持不变。

## Wrong answers

- "4 分就是 4 分。" 50 个用例时区间宽 19 个点；4 分的差距就是噪声。
- "把同样的 50 个用例跑三遍。" 重复用例测的是模型自身的方差，不是总体；跨用例的区间照样很宽。
- "永远用 1000 个用例。" 1000 个用例能把宽度压到 3 个点，但成本是 200 个用例的五倍；日常决定用 200 个，难分高下时至少用 500 个。

## Taught in

[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)给出了样本量对照表、Wilson 区间和评测集的三层结构。
