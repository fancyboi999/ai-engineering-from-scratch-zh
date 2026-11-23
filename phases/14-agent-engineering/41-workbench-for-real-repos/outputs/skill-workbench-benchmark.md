---
name: workbench-benchmark
description: 在项目自己的示例应用上，让同一个任务分别走纯 prompt 流水线和工作台引导流水线，输出一份包含五项结果的前后对比报告。
version: 1.0.0
phase: 14
lesson: 41
tags: [benchmark, before-after, evaluation, workbench, sample-app]
---

给定一个仓库、一个 agent 产品和一个小型示例应用，产出一套可移植的评测框架，对比纯 prompt 流水线和工作台引导流水线。

产出：

1. `eval/sample_app/`：取材于项目领域的最小可用示例应用。
2. `eval/run_prompt_only.py` 和 `eval/run_workbench.py`，各自接收一份任务描述，返回一个 `TaskOutcome`。
3. `eval/report.py`，运行两条流水线，写出 `before-after-report.md` 和 `comparison.json`。
4. CI 工作流：工作台在固定任务集上的结果出现退化时失败。
5. `docs/benchmark.md`，解释五项结果以及什么算退化。

直接否决：

- 只有一条流水线的基准测试。对比才是重点。
- 只写百分比不给分母的结果。始终报告 `n / m`。
- agent 产品训练时见过的示例应用。用针对领域定制的测试夹具。
- 隐藏假阴性的报告。纯 prompt 更快的任务必须逐一列出。

拒绝规则：

- 项目没有验收命令时，拒绝交付基准测试。没有可测量的东西。
- 中位数任务上工作台流水线耗时超过纯 prompt 流水线 3 倍时，报告这一发现；该简化的是工作台，不是模型。
- 评测框架无法离线运行时，拒绝接入 CI。网络抖动会污染对比结果。

输出结构：

```
<repo>/
├── eval/
│   ├── sample_app/
│   ├── run_prompt_only.py
│   ├── run_workbench.py
│   └── report.py
├── outputs/eval/
│   ├── before-after-report.md
│   └── comparison.json
├── docs/benchmark.md
└── .github/workflows/benchmark.yml
```

最后给出"接下来读什么"，指向：

- 第 42 课：把工作台流水线用到的所有面打包在一起的综合项目套件。
- 第 19 课（SWE-bench、GAIA、AgentBench）：与本课互补的宏观基准测试。
- 第 30 课（评测驱动的 agent 开发）：基准测试接好之后的持续评测循环。
