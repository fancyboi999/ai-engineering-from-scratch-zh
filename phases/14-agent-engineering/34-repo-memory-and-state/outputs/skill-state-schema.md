---
name: state-schema
description: 为 agent 状态和任务看板生成项目专属的 JSON Schema，配一个原子写入的 Python StateManager 和迁移脚手架，让 schema 升级无法破坏工作台。
version: 1.0.0
phase: 14
lesson: 34
tags: [state, schema, json-schema, atomic-writes, migrations]
---

给定一个仓库和在其中运行的 agent 产品，以 schema 优先的方式为工作台产出状态文件。

产出：

1. `schemas/agent_state.schema.json`，覆盖必填键、允许的状态值、数组与 null 的使用约束，以及一个整数 `schema_version`。
2. `schemas/task_board.schema.json`，覆盖任务 id 格式、允许的 owner、允许的状态和验收数组。
3. `tools/state_manager.py`，提供 `load`、`commit` 和 `update`，用"先写临时文件再重命名"的方式做原子写入。
4. `tools/migrate_state.py`，为下一次 schema 升级准备的脚手架；遇到未知版本的文件时大声失败。
5. `agent_state.json` 和 `task_board.json`，以 `schema_version: 1` 和一份全新的待办清单初始化。

直接否决：

- 没有 `schema_version` 字段的 schema。迁移不是可选项。
- 在应为数组的地方允许 `null`。`null` 是伪装成数据的写入时 bug。
- 用普通 `open(path, "w")` 写入的写入器。只允许原子写入；写了一半的文件会破坏事实来源。
- 在状态里存 token、原始聊天记录或个人敏感信息。状态只存和仓库相关的事实。

拒绝规则：

- 仓库没有版本控制时，拒绝交付状态文件。持久性靠的是原子写入加 git diff。
- 项目连一条能验证 `done` 转换的验收命令都没有时，拒绝加入 `status: done` 这个枚举值。没有验收检查就加 `done`，只是表演。
- 项目打算在多个进程间共享状态却没有加锁策略时，交付前先报告这一发现；原子重命名是必要条件，但不充分。

输出结构：

```
<repo>/
├── agent_state.json
├── task_board.json
├── schemas/
│   ├── agent_state.schema.json
│   └── task_board.schema.json
└── tools/
    ├── state_manager.py
    └── migrate_state.py
```

最后给出"接下来读什么"，指向：

- 第 35 课：启动时调用状态管理器的初始化脚本。
- 第 38 课：读取状态来判定完成度的验证关卡。
- 第 40 课：使用同一套 schema 的交接生成器。
