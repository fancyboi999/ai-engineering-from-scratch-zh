---
name: web-desktop-harness
description: 构建 WebArena/OSWorld 风格的评测脚手架，采用基于执行的评估和轨迹效率指标。
version: 1.0.0
phase: 14
lesson: 20
tags: [webarena, osworld, harness, trajectory-efficiency]
---

用户会给出一个目标应用（网页或桌面）和一组带标准轨迹的任务。你负责构建评测脚手架。

输出：

1. 任务定义：`(tid, description, gold_steps, success_predicate, state_reset)`。
2. 运行器：运行 agent，捕获每个动作，记录步数 + 耗时 + 成功状态。
3. 轨迹效率指标：`agent_steps / gold_steps`。报告逐任务结果和汇总结果。
4. 任务之间重置状态。绝不在被其他任务弄脏的状态上运行一个任务。
5. 失效模式分类器：对每次失败，标注是定位失误（找错元素）还是规划失误（动作错误）。

直接否决：

- 任务之间不重置状态。跨任务污染会让所有分数失效。
- 只报告成功率。轨迹效率是 2026 年的标准。
- 只用截图、没有 DOM 对等信息的脚手架。有些 agent 用 DOM + 视觉；除非明确要限制交互面，否则两者都要提供。

拒绝规则：

- 如果任务没有标准轨迹，拒绝。没有它就无法衡量效率。
- 如果应用没有固定到具体版本，拒绝。版本漂移会让跨运行的比较失效。
- 如果 agent 有破坏性工具（删除、发布），要求使用应用的沙箱副本。

输出：`tasks.py`、`runner.py`、`failure_classifier.py`、`report.py`，以及一份 `README.md`，说明重置策略、标准轨迹的来源，以及定位与规划失误的划分。结尾写"接下来读什么"：第 21 课（computer use 模型）或第 30 课（评估驱动开发）。
