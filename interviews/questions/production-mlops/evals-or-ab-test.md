---
id: evals-or-ab-test
title: 评估分数更高，为什么还要做实验
card: production-mlops
kind: concept
level: 1
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [screen, ml-breadth]
tags: [evals, ab-testing, experiments, product-metrics]
minutes: 5
lessons: [phases/17-infrastructure-and-production/21-ab-testing-llm-features, phases/17-infrastructure-and-production/20-shadow-canary-progressive]
manuals: []
practice: []
cheatsheet: [progressive-delivery, llm-evaluation]
related: [production-mlops/peeking-at-an-ab-test, production-mlops/shadow-mode-is-a-smoke-test]
updated: 2026-11-03
---

新 prompt 在你的标注集上得分比旧的高。产品经理问：全量上线之前，你为什么还要做一次随机化的线上测试？给出两分钟版本的回答。

## Short answer

评估告诉你，在一个固定的标注分布上，模型能不能完成任务。面向真实用户的随机化测试告诉你，用户会不会注意到、在不在乎。一个 prompt 可以在标注集上胜出，却不改变任何产品指标，甚至让指标变差。两者都需要：评估在任何用户看到之前拦住退化，实验在之后确认产品效果。

## Full answer

### 两个不同的问题

评估在离线环境中、在标注集上运行，由一个 judge 打分，judge 可以是评分细则、模型或人。它回答：在这个分布上，输出是否正确、有用、安全？

A/B 测试在线上运行，对真实用户随机分组。它回答：这个变体是否改变了重要的用户级指标，例如留存或任务完成率？

### 为什么只做一个不够

每个资深工程师都能举出一个没做实验、只因为感觉更好就上线的功能。其中很多让某个产品指标退化了，几个月都没人注意。评估看不到用户偏好。实验没法在用户接触之前抓住退化。两者各自覆盖对方的盲区。

### 线上测什么

课程列出三个可测试的方向：

1. prompt 的措辞和结构。指标：任务成功率、留存、单请求成本。
2. 模型选择。指标：任务准确率、单请求成本和延迟 P99 一起看。
3. 生成参数，例如 temperature 和 top-p。指标：视任务而定。

### 顺序

先做评估。然后用影子模式和金丝雀证明变体是稳定的。如果变体是一个独立的替代方案，再做 50% 分流的 A/B 测试。如果它只是同一行为的改进版，金丝雀可以直接到 100%，不做 A/B 这一步。改进版是指评估已经显示了收益。金丝雀闸门不衡量任务完成率，所以跳过这一步，就是在这件事上信任评估。

## Follow-ups

- **Level 1:** 举一个实验能产出、评估产出不了的指标。 Expected: 用户级指标，例如留存、转化或点踩率。
- **Level 2:** 金丝雀通过了，实验显示转化率小幅下降。上线吗？ Expected: 默认不上线。测试开始前就写好升级标准，主要指标为负就当作停止信号。
- **Level 2:** 金丝雀之后什么时候可以跳过实验？ Expected: 新版本是同一行为的改进，而不是一个成本曲线或语气不同的替代方案时。
- **Level 3:** 为什么模型的非确定性会改变样本量？ Expected: 相同输入产生不同输出，所以有效样本小于名义样本。课程把所需样本乘以约 1.3 到 1.5。

## Wrong answers

- "评估集更大，所以更可靠。" 评估集是固定的、标注好的，它衡量的是正确性，而不是用户偏好。
- "只做实验、跳过评估，能省一周。" 没有评估，退化会在任何人看到之前就到达用户。
- "评估和实验结论不一致时，是实验错了。" 两者衡量的东西不同。用户不喜欢的正确答案，也是真实的结果。

## Taught in

[A/B 测试课程](../../../phases/17-infrastructure-and-production/21-ab-testing-llm-features/)区分了评估和实验，[渐进式发布课程](../../../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)把实验放在金丝雀之后。
