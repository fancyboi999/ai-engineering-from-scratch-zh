---
id: rollout-plan-take-home
title: 模拟影子、金丝雀与回滚方案
card: production-mlops
kind: take-home
level: 4
roles: [ai-evaluation-reliability-engineer, inference-engineer, applied-ai-engineer]
rounds: [take-home, system-design]
tags: [canary, simulation, release-gates, rollback]
minutes: 60
lessons: [phases/17-infrastructure-and-production/20-shadow-canary-progressive]
manuals: []
practice: []
cheatsheet: [progressive-delivery]
related: [production-mlops/canary-gates-above-noise, production-mlops/canary-samples-at-one-percent, production-mlops/rollback-without-redeploy]
updated: 2026-11-03
---

课外作业。你拿到一个候选模型、一个基线模型，以及一周生产请求日志，包含每次请求的延迟、token 数和用户反馈。交付发布方案和执行它的模拟器：包括影子阶段、带闸门的金丝雀放量和回滚。至少注入两种退化，展示方案分别在哪里叫停。日志只有用户实际见过的响应的反馈，请说明模拟器如何生成候选模型的反馈。

## Short answer

构建模拟器，向两个模型回放日志，逐步计算五项闸门指标，只有每个闸门在所需数量的窗口内都通过，才能继续放量。先将基线与自身回放比较，测出运行间波动，再将各阈值设在它之上。注入成本退化和质量退化，展示各自叫停的步骤及后续回滚。

## Full answer

### 完整交付包含什么

1. **噪声底。** 将基线与自身回放比较，报告各指标的波动范围。这是每个闸门阈值的下限。
2. **闸门。** 延迟分位数、单请求成本、错误与拒答率、输出长度分布、用户反馈率。用高于噪声底的倍数定义闸门。课程默认值为 P99 超过基线 1.5 倍、成本比基线高出 20% 以上、错误率达到 2 倍、长度分布偏移，以及反馈率达到 1.5 倍。
3. **影子阶段。** 候选模型接收每个请求，但不向用户返回结果。与基线比较，报告成本差、长度分布、拒答和硬错误。
4. **放量。** 按 1%、10%、25%、50%、75% 和 100% 推进。根据每窗口样本量计算各步停留时间，避免闸门只凭几个数据点就做决定。
5. **回滚。** 按课程描述建模：开关归零，固定指针指回上一个摘要。模拟器显示发生的步骤和所需时间。
6. **两种退化。** 课程练习注入了 25% 的成本退化，好的交付会展示它在第一步就被叫停。第二种退化仅反映在反馈指标上，交付要展示它在第一步不可见，只有样本足够时才叫停。
7. **书面决策。** 课程第二项练习的候选模型准确率提高 3%，成本比基线高 18%。写出上线和不上线两种策略路径，说明由谁决定。

### 评审关注什么

- 噪声底经过实测，不是猜测。
- 闸门使用倍数，阈值高于噪声底。
- 停留时间根据样本计算，不只看时钟。
- 展示第一步发现不了的退化，不掩盖它。
- 在模拟中演练回滚。

### 哪些保留到生产环境

闸门评估代码和噪声底测量会成为真实金丝雀控制器的检查项。回放工具会成为今后每个候选模型的发布前测试。

## Follow-ups

- **Level 3:** 反馈退化发现得晚，说明方案有问题吗？ Expected: 不是。它展示了反馈闸门的局限，修正方法是在反馈首次有足够样本的步骤延长停留，或改用数据量更大的代理指标。
- **Level 4:** 候选模型与基线的成本和语气相同，方案怎么变？ Expected: 金丝雀之后跳过 A/B 阶段；课程将这一阶段设为可选，适用于同一行为的改进版。
- **Level 4:** 模拟器的什么内容会保留到生产？ Expected: 闸门评估代码和噪声底测量，它们会成为金丝雀控制器的检查项。

## Wrong answers

- "照搬课程阈值。" 课程数字是默认值，噪声底来自自己的基线。
- "按固定时间表放量。" 只按时钟推进，忽略了闸门是否有足够样本。
- "把回滚模拟成重新部署。" 模拟器应该模拟实际采用的机制，而重新部署正是课程要求移除的机制。

## Taught in

[渐进式发布课程](../../../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)给出闸门、放量步骤，以及这项课外作业所扩展的练习。
