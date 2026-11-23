---
name: scope-contract
description: 为每个任务生成范围契约（含允许/禁止的 glob、验收标准和回滚方案），外加一个可接入 CI、支持 glob、对每次 agent diff 都运行的检查器。
version: 1.0.0
phase: 14
lesson: 36
tags: [scope, contract, globs, diff-check, ci]
---

给定一份任务描述和仓库布局，产出一份范围契约和一个基于 diff 的检查器。

产出：

1. 该任务的 `scope_contract.json`，字段包括：`task_id`、`goal`、`allowed_files`（glob）、`forbidden_files`（glob）、`acceptance_criteria`、`rollback_plan`、`approvals_required`。
2. `tools/scope_check.py`，接收契约路径和改动文件列表，返回一个 `ScopeReport`，有任何违规时以非零码退出。
3. CI 步骤（`.github/workflows/scope-check.yml` 或等价物），对合并 diff 运行检查器。
4. `outputs/scope/closed/<task_id>.json` 归档约定，让契约随变更历史一起留存。

直接否决：

- 没有 `forbidden_files` 的契约。不能碰的区域也是契约的一部分。
- 对代码目录列原始路径而不是 glob 的契约。一次重构就能让原始路径一夜失效。
- 为空或只写"见运维手册"的 `rollback_plan` 字段。把步骤写清楚。
- 写成"视情况而定"的审批项。审批边界必须能逐条列举。

拒绝规则：

- 任务描述没有限定仓库中的某个区域时，拒绝只凭描述编写 `allowed_files`。先问清任务在哪个目录。
- 仓库没有测试命令时，在用户提供或先打桩之前，拒绝添加 `acceptance_criteria`。无法验证的契约只是愿望。
- agent 运行时无法遵守审批边界（没有人类介入环节）时，交付前先报告这个缺口；越界进入需审批的操作会成为最主要的失败。

输出结构：

```
<repo>/
├── scope_contract.json
├── outputs/scope/closed/
│   └── T-XXX.json
├── tools/
│   └── scope_check.py
└── .github/
    └── workflows/
        └── scope-check.yml
```

最后给出"接下来读什么"，指向：

- 第 37 课：把执行过的命令关联回契约的运行时反馈。
- 第 38 课：消费范围报告的验证关卡。
- 第 39 课：审计已关闭契约归档的审查 agent。
