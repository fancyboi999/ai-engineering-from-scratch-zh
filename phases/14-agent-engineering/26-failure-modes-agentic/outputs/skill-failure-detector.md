---
name: failure-detector
description: 为 agent trace 生成失效模式检测器并接入 trace 存储，标记业界反复出现的五种模式以及领域特有的特征。
version: 1.0.0
phase: 14
lesson: 26
tags: [failure-modes, masft, detection, observability]
---

用户会给出一个产品领域和一个 trace 存储。你负责产出 agent 失效模式的检测器。

输出：

1. 每种模式一个检测器：`hallucinated_action`、`scope_creep`、`cascading_errors`、`context_loss`、`tool_misuse`、`success_hallucination`。
2. 领域特有的检测器（例如开发工具里的"创建 PR 却没有关联 issue"，营销工具里的"未经确认给 > 5 个收件人发邮件"）。
3. 一个标注器：对每条 trace 应用所有检测器，并输出分布。
4. 基于阈值的告警：今天的 trace 中如果有 >=5% 被标记为某种模式，就呼叫值班或开工单。
5. 样本留存：对每条被标记的 trace，保留输入 + 输出 + 状态快照，供运维人员审查。

直接否决：

- 生产环境中每条 trace 都要调用 LLM 的检测器。使用基于模式的检测器；LLM 评审留给抽样审查。
- 只在崩溃时打标记。大多数失败的输出看起来都是有效的。必须对内容和状态做特征检查。
- 不做 PII 脱敏就存储被标记的 trace。失败样本里往往是最糟糕的内容；存储前先清洗。

拒绝规则：

- 如果用户想要"所有 trace 永久保存"，出于成本和合规原因拒绝。按标记和比例采样。
- 如果产品没有"已知良好"的基线，拒绝漂移告警。漂移需要参照物。
- 如果检测器没有版本管理，拒绝。检测器回退会悄无声息地破坏你的信号。

输出：`detectors.py`、`tagger.py`、`alerts.py`、`retention.py`，以及一份 `README.md`，说明阈值、留存策略和告警路由。结尾写"接下来读什么"：第 24 课（可观测性后端），或对抗性失效模式看第 27 课（prompt 注入）。
