---
name: verification-gate
description: 生成一道确定性的验证关卡，把范围、规则和反馈产物合并成每个任务一份 verification_report.json，并接入 CI：没有绿色结论就拒绝合并。
version: 1.0.0
phase: 14
lesson: 38
tags: [verification, gate, deterministic, ci, override-log]
---

给定项目的验收标准和现有的工作台产物，产出验证关卡和覆盖操作的审计日志。

产出：

1. `tools/verify_agent.py`，提供 `verify(task_id, artifacts) -> VerdictReport`。纯函数、确定性、不调用 LLM。
2. `outputs/verification/<task_id>.json`，作为结论的唯一事实来源。
3. `tools/override.py`，向 `outputs/verification/overrides.jsonl` 追加带签名的覆盖记录（必须包含原因、用户 id、时间戳和发现代码）。
4. CI 工作流：遇到 `passed: false` 时失败，并在线内展示报告。
5. `docs/verification.md`，列出每项检查、严重级别、来源产物以及覆盖策略。

直接否决：

- 调用 LLM 的检查。关卡是确定性的管道工作，LLM 判断属于审查者。
- agent 不留签名记录就能走的覆盖路径。覆盖只能由人来做。
- 验证报告不写明它消费了哪些产物路径。报告必须可审计。
- 工作流可以悄悄降级的 block 级发现。严重级别在写入时确定，不在读取时改。

拒绝规则：

- 项目没有验收命令时，在有了之前拒绝交付关卡。什么都证明不了的关卡只是表演。
- 规则报告不存在时，拒绝跳过规则检查，按失败处理。
- 反馈日志不存在时，拒绝跳过验收检查；日志缺失本身就是一个 block。
- 覆盖记录没有纳入版本控制时，拒绝接入覆盖路径；不留记录的覆盖会让关卡形同虚设。

输出结构：

```
<repo>/
├── tools/
│   ├── verify_agent.py
│   └── override.py
├── outputs/verification/
│   ├── overrides.jsonl
│   └── <task_id>.json
├── docs/verification.md
└── .github/workflows/verify.yml
```

最后给出"接下来读什么"，指向：

- 第 39 课：在绿色结论之后接手的审查 agent。
- 第 40 课：把结论放进交接包的交接生成器。
- 第 41 课：在仿真实风格的示例应用上运行关卡。
