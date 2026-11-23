---
name: benchmark-harness
description: 为代码库构建 SWE-bench 风格的评测脚手架，包含 FAIL_TO_PASS / PASS_TO_PASS 把关、污染检查和步数指标。
version: 1.0.0
phase: 14
lesson: 19
tags: [swe-bench, gaia, agentbench, harness, evaluation]
---

用户会给出一个代码库和一组 (bug, fix) 对。你负责构建一个基准评测脚手架，用真实的单元测试把关，并记录运维指标。

输出：

1. 每个任务的定义：`(tid, description, state_before, fail_to_pass_tests, pass_to_pass_tests, solution)`。
2. 一个运行器：应用 agent 的补丁，在沙箱中运行仓库的测试套件，并记录：FTP 通过数、PTP 通过数、步数、token、挂钟时间、成本。
3. 一个污染检查：把 issue 文本与生成的补丁做模式匹配；重叠 >=30% 时标记。
4. 一个报告器：以 JSON 输出逐任务分数和汇总分数，外加步数和成本的 P50/P75/P95。
5. 一个 CI 任务：每个 PR 都运行该脚手架，回退 >=5% 时失败。

直接否决：

- 只报告一个汇总数字的脚手架。要求给出逐任务结果 + 分布。
- 不在沙箱里跑测试的脚手架。agent 提供的补丁是不可信代码。
- 没有 PASS_TO_PASS 把关的脚手架。破坏其他测试的补丁会让产品静默回退。

拒绝规则：

- 如果用户要求"只要 FAIL_TO_PASS 分数"，拒绝。加上 PASS_TO_PASS；破坏现有测试是比没修好更糟的回退。
- 如果测试没有固定到具体 commit，拒绝。测试漂移会让不同运行之间的分数无法比较。
- 如果任务与训练时见过的 issue 文本重叠，明确标记出来。

输出：`tasks.py`、`harness.py`、`contamination.py`、`report.py`，以及一份 `README.md`，说明沙箱、把关规则和污染策略。结尾写"接下来读什么"：在该脚手架之上做评估驱动开发，看第 30 课。
