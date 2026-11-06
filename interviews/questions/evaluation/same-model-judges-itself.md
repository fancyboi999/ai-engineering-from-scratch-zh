---
id: same-model-judges-itself
title: 写答案的模型也给答案打分
card: evaluation
kind: tradeoff
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, agentic-ai-engineer]
rounds: [ml-depth, design-review]
tags: [llm-as-judge, self-preference, bias, calibration]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks, phases/10-llms-from-scratch/10-evaluation]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/judge-calibration-before-trust]
updated: 2026-11-03
---

你的产品用一个模型生成回答，评测流水线用同一个模型加一份量表给这些回答打分。上次发布后分数涨了，团队很满意。一位评审人问，为什么这次提升可能是假的。风险在哪？你要改什么？

## Short answer

给自己家族打分的模型偏爱自己的风格，所以自我评估会把分数抬高约 10% 到 20%。分数上涨可能只说明 judge 更喜欢新的输出，而不是用户更喜欢。把 judge 换成另一个模型家族，用人工标签校准它，再在这个 judge 下重新给基线和新版本打分。

## Full answer

### 偏见从哪来

judge 是一个有偏好的模型。它偏爱更长的回答、来自自己模型家族的回答，以及与 prompt 风格一致的回答。当 judge 与生成器同属一个家族时，每次让输出更合 judge 口味的发布，看起来都像改进。课程把这叫作自我偏好，测得的虚高约为 10% 到 20%。

### 为什么这次发布看起来更好

一次发布除了改内容，还会改语气、长度和结构。judge 会奖励后面三样。没有一个独立的信号，你分不清提升里哪部分来自内容。

### 改什么

1. 选一个来自不同模型家族的 judge。在仍能达到校准阈值的模型里选最便宜的。
2. 校准它：人工标注至少 50 个样本（课程用的是 100 个），要求与人工排名的 Spearman 相关系数至少达到 0.7。
3. 在同一个 judge 下给旧版本和新版本打分，报告差值，而不是绝对分数。
4. 对长度做归一化，或在量表里写明长度不计分。

## Follow-ups

- **Level 2:** 除了自我偏好，课程还点了 judge 的哪两种偏见？ Expected: 成对比较中的位置偏见，以及偏爱长回答的冗长偏见。
- **Level 2:** 另一个家族的 judge 更便宜，但与人的相关性更低。选哪个？ Expected: 仍能达到校准阈值的最便宜的 judge；低于阈值，不管哪个家族，数字都是噪声。
- **Level 3:** 这个季度你换不了 judge 的家族。怎么控制损害？ Expected: 用人工标签校准并公布相关系数，对长度做归一化，并且在冻结的 judge 下只看相对变化。
- **Level 3:** 换了 judge 之后，怎么区分真实提升和 judge 偏好？ Expected: 两个版本都由新 judge 打分，差值附置信区间，再对变化最大的那批用例做人工标注。

## Wrong answers

- "judge 有量表，所以它是哪个家族无所谓。" 量表消除不了它对自己风格的偏爱；课程测得的虚高是 10% 到 20%。
- "用我们最强的模型当 judge，也就是我们上线的那个。" 强不能消除自我偏好；换一个能力相近的其他家族模型才是办法。
- "分数涨了，质量就涨了。" 分数是代理指标；输出可能只是向 judge 奖励的东西靠拢了，比如长度和语气。

## Taught in

[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)把自我评估列为一个陷阱，[评测课](../../../phases/10-llms-from-scratch/10-evaluation/)把自我偏好列为 judge 的失效模式之一。
