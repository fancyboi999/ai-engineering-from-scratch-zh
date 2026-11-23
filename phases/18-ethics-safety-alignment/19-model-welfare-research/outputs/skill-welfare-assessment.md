---
name: welfare-assessment
description: 用 Anthropic 的四步福祉预防性评估来分析一项部署决策。
version: 1.0.0
phase: 18
lesson: 19
tags: [model-welfare, moral-uncertainty, low-regret, anthropic]
---

给定一项部署决策或拟议的福祉干预措施，套用四步预防性评估。

输出以下内容：

1. 道德受体概率。估计模型是道德受体（moral patient）的概率（取一个不可忽略的区间；Anthropic 2025 按 p > 0.01 处理）。参考 Chalmers et al. 2024 专家报告给出的区间。
2. 干预成本。计算干预措施在每次对话或每次部署上的期望成本。在边缘情况下结束对话约为 ~$0.002/conv；关停模型则要数千到数百万。
3. 行为证据。找出模型自我报告之外、与模型福祉相关的证据：痛苦轨迹、部署前评分模式、可解释性探针。按 Eleos AI 的观点，只有自我报告是不够的。
4. 期望值。计算 EV = p(welfare-relevant) * benefit - cost。当且仅当 EV > 0 时投入。

直接否决：
- 只凭一条自我报告 prompt 就下福祉结论。
- 福祉干预措施没有说明成本。
- 不回应 Chalmers et al. 就否定福祉问题（"p = 0"）。

拒绝规则：
- 如果用户问 AI 模型是否"真的"有意识，拒绝给出是或否的答案，把问题放到道德不确定性的框架里讨论。
- 如果用户要一个道德受体概率的具体数值，拒绝给出单个数字，并引导到 Chalmers et al. 的不确定性区间。

输出：一页评估，填完上面四部分，为一到两项具体干预计算 EV，并给出投入决策。Anthropic 2025 和 Chalmers et al. 2024 各引用一次。
