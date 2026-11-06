---
id: read-a-benchmark-claim
title: 采信多 Agent 基准测试宣称前先读懂它
card: multi-agent
kind: concept
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, ai-developer-relations-engineer]
rounds: [ml-breadth, screen]
tags: [benchmarks, contamination, baseline, cost-disclosure, topology]
minutes: 8
lessons: [phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks]
manuals: []
practice: []
cheatsheet: [agent-benchmarks, multi-agent]
related: [multi-agent/five-agents-and-a-vote]
updated: 2026-11-03
---

某篇论文报告其多 agent 编程系统在知名软件工程基准测试上大幅击败了单 agent。你的团队希望采纳该架构。在相信该数字之前，你会问什么？

## Short answer

询问具体是哪一个基准测试以及哪一个切片（split）、该基准是否在该模型训练截止日期之后发布、对比基线是什么、运行了多少次试验、覆盖了多少种任务类型，以及该结果在 token 和真实耗时上付出了多少成本。切片最为关键：前沿模型在该基准未受污染的切片上得分约为 23 percent，而在较旧切片上得分超过 70 percent，因此脱离切片的数据毫无意义。

## Full answer

### 清单

| 问题 | 为什么重要 |
|---|---|
| 哪个基准，哪个切片 | 较新的切片旨在抵抗污染，且切片之间的得分可能相差三倍 |
| 污染情况 | 在模型截止日期之前发布的基准可能已泄漏到训练中，因此分数可能虚高 |
| 基线 | 与单 agent 基线、随机基线和先前的多 agent 工作对比，而不是与同一系统的未调优版本对比 |
| 显著性 | 试验次数和置信区间，因为前沿模型具有高方差，单次运行会产生误导 |
| 任务多样性 | 单项任务还是多项任务，因为生产需要泛化能力 |
| 成本披露 | 每个任务的 token 数和真实耗时，因为以 20 倍成本获得强劲结果属于商业决策 |

### 其他基准测试带来的启示

课程调研了五个基准测试家族，其中两个是警告。在具有非对称信息的多模态协调基准上，前沿模型难以击败随机基线。在具有四个任务类别的医疗基准上，多 agent 系统在大多数类别上并未超越单个模型；在子任务可分离的地方拆解带来了帮助，而在协调成本超过专业化收益的地方拆解造成了损害。拓扑基准发现全连接图最适合研究、链式适合分步编码、星型适合快速事实工作，且超过约 4 个 agent 就会产生协调税；认知规划增加了约 3 percent 的里程碑达成率。

### 题目中数字的可能含义

如果它是在未受污染的切片上测得的，agent 团队脚手架确实产生了可衡量的增益（在 30 到 40 个百分点范围内），这是支持协调的较强经验证据之一。如果它是在较旧的切片上测得的，该结果便不再是能力的证据。

### 没有基准能很好衡量的维度

长达数天的长周期协调、对恶意 agent 的弹性、部署下的漂移，以及成本归一化表现。对于你关心的轴向，根据生产分布构建内部基准，在每次对比中包含随机基线，在准确率旁边报告成本，并按季度重建它。

## Follow-ups

- **Level 2:** 为什么要拿协调系统与随机猜测做对比？ Expected: 如果系统无法大幅击败随机基线，该任务可能定义不良，如多模态协调结果所示。
- **Level 2:** 里程碑达成率衡量了最终成功无法衡量的什么？ Expected: 部分进展，从而将取得大部分进展的系统与一开始就失败的系统区分开来。
- **Level 3:** 你自己如何检查污染？ Expected: 比较基准的发布日期与模型的训练截止日期，并在自己的评估中从任何调优集中扣留一部分任务。
- **Level 3:** 论文的得分未附带模型厂商的一手来源，你如何看待？ Expected: 视为初步结果，在独立运行复现它之前，不据此做出生产决策。

## Wrong answers

- "在知名基准上大幅领先就足以采纳。" 没有切片、基线、试验和成本，这种优势只是新闻标题，不是证据。
- "多 agent 在编程任务上总是能带来帮助。" 医疗和多模态结果显示了不起作用的领域，且编程增益取决于切片和脚手架。
- "我们的内部基准不如公开基准严格。" 公开基准提供信息，而只有内部基准反映你的生产分布和成本约束。

## Taught in

[评估与协调基准课程](../../../phases/16-multi-agent-and-swarms/24-evaluation-coordination-benchmarks/)列出了五个基准家族和审查清单。
