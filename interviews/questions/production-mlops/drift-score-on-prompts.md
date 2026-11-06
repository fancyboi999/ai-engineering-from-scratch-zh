---
id: drift-score-on-prompts
title: 评估分数未变时，如何发现用户的问题变了
card: production-mlops
kind: concept
level: 2
roles: [ai-evaluation-reliability-engineer, ai-data-engineer, applied-ai-engineer]
rounds: [ml-breadth, system-design]
tags: [drift, psi, embeddings, monitoring]
minutes: 8
lessons: [phases/19-capstone-projects/11-llm-observability-dashboard]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/five-minute-detection, production-mlops/evals-or-ab-test]
updated: 2026-11-03
---

你的评估分数一整年都很平稳。产品负责人告诉你，从春天开始，用户问的东西已经变了很多。怎样从遥测数据里发现这种变化？发现之后怎么处理？

## Short answer

把 prompt 做成嵌入，按周汇总，用群体稳定性指数（PSI）或 KL 散度把这一周和滚动基线比较。分数上升说明输入分布变了，即使固定评估集上的分数没变。超过阈值就告警，然后从新分布中抽样并标注 prompt，刷新评估集，再用它重新检查路由和 prompt。

## Full answer

### 为什么评估看不到

评估让模型在一个固定的标注集上运行。它衡量的是模型在去年春天那批问题上的表现。问题变了，评估集没变，所以分数保持平稳，而产品已经在默默服务另一批人群。

### 检测器

综合项目每周跑一个任务。它把这一周的 prompt 嵌入汇总起来，计算相对于过去 4 周滚动基线的 PSI。关键术语表给出常用的解读：PSI 超过 0.2 表示有意义的偏移。示例输出里一个平静的周是 0.08，低于这个阈值。同一个任务也可以在同样的嵌入上算 KL 散度。把评估分数的趋势放在旁边，让两种视角出现在同一页上。

### 按应用算，不只算全局

全局分数会把漂移平均掉。综合项目的练习按应用 id 计算 PSI，能看出是哪个应用入口的输入分布变了。客服机器人和代码助手很少一起漂移。

### 确实发生偏移时怎么做

1. 从新分布中抽样 prompt，标注它们，刷新评估集。
2. 在刷新后的集合上重跑评估。旧集合上的平稳分数说明不了新集合上的任何情况。
3. 重新检查所有在旧分布上训练或调优过的东西：路由分类器、prompt 模板、缓存阈值。

### 它放在哪里

放在可观测面：span 落入 span 存储，每周任务读取它们、写出一个指标，告警链路接收这个指标。

## Follow-ups

- **Level 2:** prompt 上的 PSI 和评估分数下降有什么区别？ Expected: PSI 衡量输入，评估衡量模型在固定输入上的表现；前者可以变化，而后者保持平稳。
- **Level 2:** 为什么按应用 id 运行检测器？ Expected: 全局分数会把漂移平均掉，按应用看能知道是哪个应用入口的输入分布变了。
- **Level 3:** 只用一周做基线会出什么问题？ Expected: 每周的周期性看起来像漂移，而且基线会跟着它本该衡量的输入一起变。
- **Level 3:** 一次营销活动之后，PSI 越过了阈值。这是问题吗？ Expected: 这是输入的真实偏移。要问的是在这些输入上质量是否守住了，所以要抽样、标注、评估。

## Wrong answers

- "评估分数平稳说明没有漂移。" 评估集是固定的，看不到输入的变化。
- "直接比较原始 prompt 字符串。" 每个请求的措辞都不同。嵌入能捕捉主题分布。
- "分数大于零就告警。" 小数值是噪声。综合项目的阈值是 0.2。

## Taught in

[可观测看板综合项目](../../../phases/19-capstone-projects/11-llm-observability-dashboard/)在 prompt 嵌入上运行每周 PSI 任务，并搭建告警链路。
