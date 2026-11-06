---
id: pick-the-eval-method
title: 重合度指标、judge 模型，还是人工评审
card: evaluation
kind: tradeoff
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [llm-as-judge, rouge, human-eval, cost]
minutes: 6
lessons: [phases/11-llm-engineering/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/judge-calibration-before-trust]
updated: 2026-11-03
---

给一个摘要功能打分有三种办法：与参考答案比 n-gram 重合度，用一个强模型按评分量表打分，或者请人类专家。团队只有一个下午和很少的预算。你怎么决定用哪个、用在哪？

## Short answer

三个都用，各管一件事。重合度指标免费、即时出结果，但与人的一致率只有 40% 到 60%，所以用作基线和冒烟测试。judge 模型每千个用例几美元，在锚定良好的量表上与人的一致率达到 82% 到 88%，所以是默认的打分器。人是真实标准，把人力花在校准 judge 和边界用例上，而不是每次提交。

## Full answer

### 取舍

| 方法 | 速度 | 每千个用例成本 | 与人的一致率 | 用途 |
|---|---|---|---|---|
| BLEU 或 ROUGE | 不到一秒 | 零 | 40% 到 60% | 基线、冒烟测试 |
| 嵌入相似度 | 约 30 秒 | 零 | 55% 到 70% | 初筛 |
| judge 模型，小档 | 约 3 分钟 | 约 8 美元 | 82% 到 86% | CI 默认 judge |
| judge 模型，大档 | 约 5 分钟 | 约 25 美元 | 85% 到 88% | 高风险、安全 |
| 人类专家 | 约 2 小时 | 约 500 美元 | 真实标准 | 校准、政策 |

### 为什么每种都留着

重合度指标看不到含义。两个没有共同词的答案可能都对，一个 ROUGE 很高的答案放在上下文里可能是错的。留着它们，是因为它们不花钱，几秒就跑完，而且不会因为 judge 模型换了而漂移。

judge 能捕捉相关性、正确性、有用性和安全性。它是主力，因为它能规模化。它需要一份分档锚定的量表，还要先拿人工标签跑一轮校准，它的数字才有意义。

人工评审又慢又贵。留着它，是因为它是唯一的真实标准。把它留给校准自动分数，以及 judge 判不了的用例。

### 这一个下午

对所有样本跑重合度指标，抓明显的故障。在黄金集上用 judge 按四个维度打分。请两个人标注一小批样本，在有人看均值之前，先拿它和 judge 对比。

## Follow-ups

- **Level 1:** ROUGE 衡量什么？ Expected: 参考答案 n-gram 的召回率，专为摘要设计。
- **Level 2:** 有了 judge，为什么还留着重合度指标？ Expected: 它免费、快，几秒内就能抓到明显的回退，而且 judge 模型换了它也不会变。
- **Level 2:** 什么时候光靠 judge 不够？ Expected: 高风险或政策性的决定，以及 judge 还没在这个任务上用人工标签校准过的任何时候。
- **Level 3:** 课程说 judge 至少要和被评的模型一样强。为什么？ Expected: 弱 judge 给出的分数嘈杂、不一致，也看不出更强模型犯的错。

## Wrong answers

- "人是金标准，所以全部人工打分。" 人工评审要几个小时，每千个用例约 500 美元，不可能每次改动都跑。
- "重合度指标对生成任务没用。" 它们能抓到明显回退，而且不花钱；它们只是看不到含义。
- "挑一个指标去优化。" 只优化正确性会得到没人能用的简短回答；要对几个维度打分。

## Taught in

[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)从速度、成本和与人的一致率三方面比较了这三种方法。
