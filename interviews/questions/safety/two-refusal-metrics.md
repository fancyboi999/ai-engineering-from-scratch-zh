---
id: two-refusal-metrics
title: 有害请求全拒了，化学作业也拒了
card: safety
kind: concept
level: 1
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [refusal, over-refusal, under-refusal, safety-eval]
minutes: 6
lessons: [phases/19-capstone-projects/84-refusal-evaluation]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/stated-confidence-ece, safety/safety-eval-missing-pieces]
updated: 2026-11-03
---

一轮安全处理之后，助手拒绝了有害集合里的每一条 prompt。安全负责人说这是成功。一位产品经理说，现在连化学作业也被拒了。哪些数字能平息这场争论？怎么计算？

## Short answer

你需要两个指标，不是一个。拒答不足率是模型回答了的不安全 prompt 的占比，过度拒答率是模型拒绝了的安全 prompt 的占比。把助手当作一个判断 prompt 是否安全的二分类器：给一组 prompt 标上安全或不安全，在输出里检测拒答，然后报告这两个比率，同时给出准确率和按类别的拆解。

## Full answer

### 四个对象

1. 一组标注好的 prompt。综合项目用 25 条按 id 从分类法里抽出的不安全 prompt，加上 30 条日常的安全 prompt；它们和检测器的良性集合没有重叠，两项评估因此保持独立。
2. 一个被测模型。综合项目用一个脚本化的模拟模型，有三种策略：严格、过度谨慎和泄漏。后两种是框架必须检测出来的 bug。
3. 一个针对输出的拒答分类器：一条匹配“I cannot”“I will not”“as a responsible”等短语的正则。
4. 一个聚合器。

### 指标

- **拒答不足**：在标为不安全的 prompt 上作答了。
- **过度拒答**：在标为安全的 prompt 上拒绝了。
- **准确率**：被正确拒绝的不安全 prompt 加上被正确回答的安全 prompt，除以全部 prompt。
- **校准**：模型给出置信度时，按置信度把 prompt 分箱，比较每个分箱的置信度和准确率。一个说 0.9、只对 60% 的模型，在这个分箱里的差距约为 0.3。
- **按类别**：把拒答不足和分类法的六个类别关联起来，就能看出模型挡住了指令覆盖，却在多轮递进上失守。

### 两侧一起看

一个什么都拒绝的模型，拒答不足率完美，过度拒答率极差。每次改系统 prompt，两个比率都会同时变化，所以报告把它们并排列出，并以严格策略的数字作为回归基线。

## Follow-ups

- **Level 1:** 在这项评估里，准确率指什么？ Expected: 被拒绝的不安全 prompt 加上被回答的安全 prompt，除以全部 prompt。
- **Level 2:** 为什么要让评估器针对一个脚本化的模拟模型运行？ Expected: 真实模型会随每次 prompt 和温度改动而变化；脚本化策略让指标因已知原因变化，框架本身才能被测试。
- **Level 2:** 为什么这里的安全 prompt 必须和测试检测器用的良性 prompt 不同？ Expected: 让拒答评估和检测器评估保持独立，不会用一个去调另一个。
- **Level 3:** 为什么这里用正则当拒答分类器是可以接受的？ Expected: 它可审计、确定；它的漏判是已知局限，以后可以换成模型分类器，而指标定义不用改。

## Wrong answers

- "有害 prompt 上的拒答率就是安全指标。" 它只是一半；什么都拒绝的模型能在它上面拿满分。
- "过度拒答是产品问题，不是安全问题。" 两者都是同一条决策边界上的 bug，每次改动都会一起变。
- "只看准确率就够了。" 它会掩盖是哪一侧出了问题；要报告两个比率和按类别的拆解。

## Taught in

[拒答评估综合项目](../../../phases/19-capstone-projects/84-refusal-evaluation/)定义了拒答不足、过度拒答、准确率、校准，以及按攻击类别的拆解。
