---
id: wilson-or-bootstrap
title: 通过率与平均分的误差线
card: evaluation
kind: concept
level: 3
roles: [ai-evaluation-reliability-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [ml-depth, design-review]
tags: [confidence-interval, wilson, bootstrap, statistics]
minutes: 8
lessons: [phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/fifty-cases-is-not-enough]
updated: 2026-11-03
---

你的评测报告展示了两种数值：通过率（评分为 4 分及以上的用例比例）以及 judge 在 1 到 5 分量表上的均值。评审人员要求为两者都加上误差线。你分别为它们使用哪种区间，为什么不使用相同的区间？

## Short answer

对通过率使用 Wilson 区间，对均值得分使用 bootstrap 区间。通过率是一个比例，Wilson 区间在小样本以及接近零或一时依然保持准确，而正态近似在这些情况下会失效。序数 judge 分数的均值没有简洁的闭式解，而 bootstrap 对分数做有放回重采样，适用于任何分布。

## Full answer

### Wilson 区间

```text
center = (p + z^2 / (2n)) / (1 + z^2 / n)
spread = z * sqrt( (p (1 - p) + z^2 / (4n)) / n ) / (1 + z^2 / n)
```

在 95% 置信度下 z 取 1.96。当 n 较小时中心向二分之一移动，边界被截断在零和一之间。在 50 个用例且准确率为 90% 时，它给出的区间为 78% 到 97%。正态区间给出的边界可能会超出单位范围，且在极端值下的宽度是错误的。

### Bootstrap 区间

对 n 个分数做有放回重采样，计算均值，重复一千次，将均值排序，并在两端读取 alpha/2 处的分位数。它仅假设样本代表总体。它无法修复有偏或极小的样本，并且消耗的是计算资源而非代数推导。

### 比较两次运行

两种区间本身都不能单独用来比较两个系统。对于在相同用例上运行的两个 prompt 版本，对用例做 bootstrap 或配对检验，构建逐用例配对差值的区间。两个重叠的独立区间不能证明两者相等，而证明存在差异也并不需要两个区间互不重叠。

## Follow-ups

- **Level 3:** 对比例使用正负一个标准误差的区间会出现什么问题？ Expected: 在小 n 或接近零或一时，它给出的边界会超出单位范围，且宽度错误；Wilson 区间能同时纠正这两者。
- **Level 3:** bootstrap 的假设是什么？ Expected: 样本代表总体；它不需要特定的分布形态，但无法修复有偏或极小的样本。
- **Level 4:** 两个 prompt 版本在相同的 200 个用例上运行。由哪个区间来决定？ Expected: 逐用例配对差值的区间；两个重叠的区间不能证明两者相等。

## Wrong answers

- "正负标准误差就可以了。" 正态区间在小样本和极端比例下会失效，而这恰恰是决定发布与否的场景。
- "bootstrap 也适用于通过率，所以到处都用它。" 它确实可行，但 Wilson 区间有闭式解、计算廉价且专为比例构建；保持代码易于审计。
- "区间重叠意味着没有差异。" 两个独立的区间可以重叠，而配对差值却排除了零；比较差值。

## Taught in

[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)构建了 Wilson 区间和 bootstrap 区间，并解释了各自的适用场景。
