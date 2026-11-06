---
id: peeking-at-an-ab-test
title: 在首个表现良好的早晨终止 A/B 实验的隐患
card: production-mlops
kind: tradeoff
level: 3
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-depth, system-design]
tags: [ab-testing, sequential-testing, multiple-comparisons, cuped]
minutes: 12
lessons: [phases/17-infrastructure-and-production/21-ab-testing-llm-features]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/evals-or-ab-test, production-mlops/split-ratio-mismatch]
updated: 2026-11-03
---

某位产品经理每天早上查看实验看板，希望在变体首次达到统计显著的那天就结束测试。本季度还有二十个实验也按同样的方案运行。这样做有什么问题？你提供什么替代方案？

## Short answer

固定样本量检验假设只在预先选定的样本量下检查一次结果。每天查看并在首次显著时停止，会给噪声多次越过阈值的机会，导致假阳性率上升。应改用序贯检验，它在反复查看时仍然有效，也允许在胜出结果明确时提前结束。多个实验之间要做多重比较校正，并用实验前数据降低方差，减少每次测试需要的样本。

## Full answer

### 反复查看结果的问题

经典 A/B 分析假设样本量在测试前固定。每多看一次就是多做一次检验，首次显著时就停止，选中的可能只是噪声。经理的方案错不在于经常查看，而在于用不适合反复决策的方法做决策。

### 序贯检验

始终有效的序贯方法，例如混合序贯概率比检验和置信序列，能在反复查看时控制假阳性率。你可以每天检查，胜出结果明确时提前停止，错误率仍保持在设定水平。课程模拟器并排展示了固定样本量检验和序贯检验的边界。

### 二十个实验

在 95% 置信度下，20 个实验仅凭偶然就会产生约一个假阳性。有两种校正方法。Bonferroni 将错误率除以检验次数，比较严格。Benjamini-Hochberg 控制错误发现率，相对不那么保守。选择取决于一次错误上线的代价与错过真实改进的代价。

### 降低方差

CUPED 用回归剔除实验前数据能解释的方差。课程给出的典型降幅是 30% 到 70%，无需增加流量就能提高有效样本量。这才是合理缩短测试的方法。

### 另外两项检查

解读任何结果之前，样本比例不匹配检查能发现分组故障。模型输出的非确定性会降低有效样本量，因此课程将所需样本量乘以约 1.3 到 1.5。

## Follow-ups

- **Level 3:** 本季度该选 Bonferroni 还是 Benjamini-Hochberg？ Expected: 任何一次错误上线代价都高时，选 Bonferroni；愿意接受受控比例的错误发现以换取更高检验功效时，选 Benjamini-Hochberg。
- **Level 3:** CUPED 需要什么，能得到什么？ Expected: 每个实验单元的实验前指标，能用相同流量得到更精确的估计。
- **Level 4:** 新模型所需样本量超过本季度能提供的数量，怎么办？ Expected: 选择方差更低的主要指标、应用 CUPED，或延长测试。不要在固定样本量方法下靠提前停止来缩短测试。

## Wrong answers

- "p 值小就可以提前停止。" 固定样本量检验下，第一天的小 p 值有一部分来自挑选出的噪声。只有序贯方法能让这种停止决策保持有效。
- "所有测试都按 95% 置信度运行，胜出的就上线。" 约一个胜出结果会是偶然产生的假阳性，应做多重比较校正。
- "测试越长就越可靠。" 只有分组没有问题时，延长测试才有帮助。先检查样本比例。

## Taught in

[A/B 测试课程](../../../phases/17-infrastructure-and-production/21-ab-testing-llm-features/)涵盖序贯检验、CUPED、SRM 检查和多重比较校正。
