---
id: eval-pipeline-take-home
title: 为小模型搭一条离线评测流水线
card: evaluation
kind: take-home
level: 4
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [take-home]
tags: [eval-pipeline, perplexity, exact-match, token-f1, mock-judge]
minutes: 60
lessons: [phases/19-capstone-projects/41-eval-pipeline, phases/11-llm-engineering/10-evaluation, phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/regression-gate-ci, evaluation/perplexity-padding-and-shift, evaluation/exact-match-vs-token-f1]
updated: 2026-11-03
---

带回作业（Take-home）。我们给你一个小型指令微调模型、一份留出语料、一组带标准答案的简短事实类 prompt、一组带参考答案的开放式 prompt，并且没有网络。请搭一条评测流水线：它要报告不止一个数字，并解释它的综合分；再说明等有了网络和 judge 模型之后，它如何在 CI 里运行。你交付什么？故意不做什么？

## Short answer

交付一个可直接运行的文件，包含四项评测：token 计数严谨的留出集困惑度，事实集上归一化后的精确匹配，开放式回答集上的 token F1，以及一个 1 到 5 分的确定性 mock judge，接口与将来的真实 judge 相同。报告每项评测的数字、一个权重写在配置里的加权综合分，以及供诊断用的逐样本记录。真实 judge、综合分的区间以及一切需要网络的东西都不做，并在 readme 里写明。

## Full answer

### 四项评测

每项评测覆盖其他几项看不到的维度。困惑度说明模型到底能不能拟合这门语言。精确匹配说明它能否在短答案上给出标准字符串。token F1 在开放答案上容忍改写。judge 给字符串指标看不到的质量打分。每项评测都是一个函数：输入模型和数据集，输出一个结果，包含指标、逐样本细节和名称。

### 评审会检查的细节

- **困惑度。** 只在真实目标位置上累加损失，分母里排除 pad 目标，目标错开一位，最后统一除一次。
- **归一化。** 转小写、去首尾空白、合并连续空白；如果两边只差结尾的标点，就去掉它。两边都为空时 token F1 为 1，只有一边为空时为 0。
- **mock judge。** 归一化后字符串相同给 5 分，token F1 至少 0.8 给 4 分，0.5 到 0.8 给 3 分，0.2 到 0.5 给 2 分，其余给 1 分，并附一行理由。它不是 judge。它的作用是固定接口，让以后换成真实模型只需替换一个函数。

### 综合分

把每项评测归一化到单位区间：困惑度取 1 除以（1 加困惑度的对数），精确匹配和 F1 保持原值，judge 分数除以 5。默认权重是 0.2、0.3、0.3 和 0.2。把权重放进配置并打印在报告里，因为这是产品决策，不是事实。报告用稳定的 JSON 键，并在终端输出一张表。

### CI 怎么跑

有网络后，把 mock judge 换成真实 judge，并在至少 50 个人工标注样本上校准，Spearman 相关系数至少达到 0.7 后，它的分数才能用于拦截。把评测集扩充到约 200 个用例，用 Wilson 区间和 bootstrap 区间比较两次运行，任何维度回退超过 0.3 就拦截，在 prompt 和模型路径变动时触发，并把报告作为产物上传。

### 不做什么，为什么

不做真实 judge，因为没有网络，也没有人工标签可供校准。不给综合分加区间，因为权重让它成了产品数字；区间加在各分项上。不做污染检查，因为没有提供训练语料。每一项省略都要在 readme 里写明。

## Follow-ups

- **Level 3:** 交付物里为什么还要留一个 mock judge？ Expected: 它固定了接口和聚合路径，真实 judge 只需替换一个函数，而且整个流程离线也能跑通。
- **Level 3:** 为什么加权平均是产品决策？ Expected: 权重代表产品看重什么；流水线把权重放在配置里并报告每个分项，评审人就能看到综合分掩盖了什么。
- **Level 4:** 有了网络后，你第一件要加的是什么？ Expected: 在同一个函数背后接入真实 judge，然后先用人工标签做一轮校准，之后它的分数才能用于拦截。

## Wrong answers

- "交付一个准确率数字就行。" 单一指标永远描述不了一个模型；题目要求多个数字，并解释综合分。
- "跳过困惑度，它不是任务指标。" 它是检查模型能否拟合语言的最便宜手段，而这里的计数错误正是评审要找的。
- "把权重写死在代码里。" 权重就是产品决策；把它们暴露出来，并打印在数字旁边。

## Taught in

[评测流水线综合项目](../../../phases/19-capstone-projects/41-eval-pipeline/)搭建了四项评测和聚合器，[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)加上了 CI 拦截，[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)给出了 judge 的校准规则。
