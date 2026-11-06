---
id: regression-gate-ci
title: 每个 pull request 都要过的评测门禁
card: evaluation
kind: design
level: 3
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [system-design, design-review]
tags: [ci, regression, llm-as-judge, cost, golden-set]
minutes: 12
lessons: [phases/11-llm-engineering/10-evaluation, phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks]
manuals: []
practice: []
cheatsheet: [llm-evaluation]
related: [evaluation/fifty-cases-is-not-enough, evaluation/judge-upgrade-moved-every-score, evaluation/anchored-rubric]
updated: 2026-11-03
---

为一个客服助手设计评测门禁：凡是改动 prompt 或模型代码的 pull request 都要跑它。说明它跑什么、什么情况拦下合并、每月花多少钱，以及怎么避免它被噪声误拦。

## Short answer

在 prompt 和模型路径有改动时触发，让新 prompt 跑一套约 200 个用例的固定版本化评测集，用一个冻结且校准过的 judge 按四个锚定维度打分，再与已存的上一个已知良好基线的分数比较。当任何维度下降超过阈值、且差值的区间排除零时拦下合并，并把结果存为产物。用小档 judge 时，一次 200 个用例的运行约 4 美元，每周十次合并每月约 160 美元。

## Full answer

### 跑什么

- **触发。** 对 prompt 目录和模型代码设路径过滤，这样改文档的提交不用为一次运行买单。
- **评测集。** 50 到 100 个精选的黄金核心用例，20 到 50 个对抗用例（如注入、领域外问题、有害请求），以及 100 到 200 个真实流量样本。给评测集做版本管理，每次改动都打标签。
- **打分。** 先跑确定性断言，比如包含检查或正则，因为它们免费。再让 judge 按相关性、正确性、有用性和安全性打分，每项都是 1 到 5 分的锚定量表；judge 的模型和版本冻结，并用人工标签校准过。

### 什么情况拦下

基线只在它成为上一个已知良好版本时打一次分，并存下分数。每个 pull request 只在同一版本的评测集上给新 prompt 打分。对每个维度，计算均值差，以及 4 分及以上的通过率和它的 Wilson 区间。课程的代码在任何均值下降超过 0.3 时拦截。它给每次运行分别算 bootstrap 区间，而不是给差值算区间，所以一次噪声造成的下降也可能拦下合并。它写下的工作流要求做统计检验，即配对 t 检验或 bootstrap。在代码里加上对逐用例差值的配对 bootstrap，只有两个条件同时成立才拦截：下降超过 0.3，且差值区间排除零。报告列出变差的用例，让作者去读。

### 成本

| 评测集 | 小档 judge | 时间 |
|---|---|---|
| 100 个用例，4 个维度 | 约 2 美元 | 约 2 分钟 |
| 200 个用例，4 个维度 | 约 4 美元 | 约 4 分钟 |
| 500 个用例，4 个维度 | 约 10 美元 | 约 10 分钟 |
| 1000 个用例，4 个维度 | 约 20 美元 | 约 20 分钟 |

每周十个 pull request、每次 200 个用例，每月约 160 美元，因为每个 pull request 只付一次运行的钱，基线分数直接复用。如果每个 pull request 都重新给基线打分，成本翻倍。课程里的反例是：一次 prompt 改动让回答完整度下降了 34%，11 天都没人发现。

### 怎么挡住噪声

50 个用例时区间宽 19 个点，5% 的回退看不出来，所以评测集需要约 200 个用例。冻结 judge，因为 judge 一升级，所有分数都会变。评测集做版本管理，绝不在让它失败的那个 pull request 里改它。加上最低分位告警和按类别拆分，因为一个 prompt 可能总体变好，却在安全上回退。

## Follow-ups

- **Level 3:** 触发条件为什么要加路径过滤？ Expected: 评测要花钱和时间；在 prompt 或模型代码变化时才跑，不是每次提交都跑。
- **Level 3:** 某个维度变了 0.1，作者说这是回退。 Expected: 阈值是均值下降 0.3 并看区间；200 个用例时 0.1 在噪声范围内，报告出来但不拦截。
- **Level 4:** 门禁拦下了合并，作者说评测集过时了。流程是什么？ Expected: 改评测集是一个单独的、经过评审和版本管理的改动；评测集版本变了就重跑基线，绝不在失败的 pull request 里改评测集。
- **Level 4:** 总体变好、某个类别却回退了，怎么抓到？ Expected: 按类别分层的报告，附区间，并对任何类别设拦截规则。

## Wrong answers

- "改成每晚跑一次。" 每晚跑是在合并之后才发现回退；课程里的故事就是一次下降上线后 11 天才被发现。要在合并前跑。
- "50 个黄金用例够做门禁了。" 50 个用例时区间宽 19 个点，检测不到 5% 的回退。
- "每次运行都用最新的 judge 模型。" judge 一变，所有分数都变；冻结 judge，只在并行跑过基线后再换。

## Taught in

[评测与测试课](../../../phases/11-llm-engineering/10-evaluation/)给出了流水线、阈值和成本表，[LLM 评测框架课](../../../phases/05-nlp-foundations-to-advanced/27-llm-evaluation-frameworks/)给出了测试门禁模式和校准规则。
