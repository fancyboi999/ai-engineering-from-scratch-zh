---
name: minimal-workbench
description: 为任意仓库铺设三文件的最小可用 agent 工作台：简短的 AGENTS.md 路由、持久的 agent_state.json，以及对应项目当前待办的 JSON 格式 task_board.json。
version: 1.0.0
phase: 14
lesson: 32
tags: [workbench, agents-md, state, task-board, scaffold]
---

给定一个仓库路径和一份简短的待办清单，搭建最小可用的 agent 工作台。

产出：

1. `AGENTS.md`，不超过 80 行。它必须指向：状态文件、任务看板、更深层的规则文档（哪怕是空的），以及验证命令。这个文件里不写教程式散文。
2. `agent_state.json`，包含这些键：`active_task_id`、`touched_files`、`assumptions`、`blockers`、`next_action`。所有可选字段默认为空数组或空字符串，数组字段绝不用 `null`。
3. `task_board.json`，是一个任务组成的 JSON 数组。每个任务有 `id`、`goal`、`owner`（`builder` | `reviewer` | `human`）、`acceptance`（字符串列表）和 `status`（`todo` | `in_progress` | `done` | `blocked`）。
4. `docs/agent-rules.md` 占位文件，每个面一个 H2，留给后续课程填充。

直接否决：

- `AGENTS.md` 超过 80 行或少于 10 行。太长 agent 会跳过，太短又起不到路由作用。
- 状态文件引用聊天记录而不是仓库。仓库才是唯一的事实来源。
- 任务看板没有 `acceptance`。没有验收标准的任务最后只会变成一句"看起来没问题"的橡皮图章。
- 任务的 `owner` 是 `agent` 或 `model`。owner 是角色，不是实体。

拒绝规则：

- 仓库没有验证命令时，在用户提供或先打桩之前，拒绝编写 `AGENTS.md`。路由指向一道不存在的关卡，比没有路由更糟。
- 待办清单里未完成任务超过 12 个时，拒绝执行，请用户先拆分。超过一屏的看板会沦为规划表演。
- 项目的受跟踪文件里带着密钥时，拒绝编写状态文件，先把密钥泄露列为阻塞性发现。

输出结构：

```
<repo>/
├── AGENTS.md
├── agent_state.json
├── task_board.json
└── docs/
    └── agent-rules.md
```

最后给出"接下来读什么"，指向：

- 第 33 课：把规则占位文件变成可执行约束。
- 第 34 课：持久状态的 schema。
- 第 36 课：每个任务的范围契约。
