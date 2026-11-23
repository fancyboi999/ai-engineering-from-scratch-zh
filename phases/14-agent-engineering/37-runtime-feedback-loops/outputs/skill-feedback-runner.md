---
name: feedback-runner
description: 包装 shell 命令，确定性地捕获 stdout、stderr、退出码和耗时，每条命令持久化一条 JSONL 记录；反馈缺失时拒绝推进 agent 循环。
version: 1.0.0
phase: 14
lesson: 37
tags: [feedback, subprocess, runner, jsonl, loop-control]
---

给定一个在 agent 循环里执行 shell 命令的项目，产出一个反馈运行器以及它写入的 JSONL。

产出：

1. `tools/run_with_feedback.py`，提供 `run_with_feedback(command: list[str], agent_note: str, timeout_s: float) -> FeedbackRecord`。
2. 工作台下 `feedback_record.jsonl` 的存放位置，每行一条记录。
3. `tools/feedback_loader.py`，返回当前任务最近的 N 条记录。
4. 一个 `loop_can_advance(record) -> bool` 辅助函数，agent 循环在宣布成功前调用它。
5. 测试覆盖：成功路径、非零退出、超时、可执行文件不存在、确定性的首尾截断。

直接否决：

- 运行器里任何地方出现 `shell=True`。只用 argv。
- 截断逻辑依赖墙钟时间或随机采样。相同输入必须产出相同记录。
- 记录里没有 `duration_ms`。探针变慢是工作台卡死的第一个信号。
- 返回无上限列表的加载器。只取最近 N 条，或者分页。

拒绝规则：

- 项目通过 stdout 输出密钥时，没有脱敏步骤就拒绝交付运行器。把本会被捕获的那些行指出来。
- 项目有可能无限挂起的命令时，没有默认超时和显式的覆盖清单就拒绝交付。
- 运行器跑在共享状态的 worker 里时，拒绝省掉追加 JSONL 时的文件锁。多个写入者会把文件写坏。

输出结构：

```
<repo>/
├── feedback_record.jsonl
└── tools/
    ├── run_with_feedback.py
    ├── feedback_loader.py
    └── test_feedback_runner.py
```

最后给出"接下来读什么"，指向：

- 第 38 课：消费这些记录的验证关卡。
- 第 39 课：给一次运行打分时读取反馈的审查 agent。
- 第 23 课：反馈稳定后，在遥测侧补上 OTel GenAI 约定。
