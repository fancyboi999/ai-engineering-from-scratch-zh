---
name: workbench-pack
description: 生成一套按项目调校、即装即用的 agent 工作台套件：规则按团队历史打磨，范围 glob 匹配仓库结构，评分标准额外加入一个领域专属维度。
version: 1.0.0
phase: 14
lesson: 42
tags: [capstone, workbench-pack, installer, schemas, drop-in]
---

给定一个仓库、团队的事故历史和在其中运行的 agent 产品，输出一套调校过的 agent-workbench-pack 和安装器。

产出：

1. `agent-workbench-pack/` 目录，符合标准布局：AGENTS.md、docs/、schemas/、scripts/、bin/、README.md、VERSION。
2. `bin/install.sh`：没有 `--force` 时拒绝覆盖已有套件，并向目标仓库写入 `.workbench-version`。
3. 按项目调校的 `agent-rules.md`（每个类别至少一条规则，来自团队最近六次事故）、`reviewer-rubric.md`（加入第六个领域维度）和 `scope_contract.schema.json`（使用项目专属的 glob）。
4. `lint_pack.py` 脚本：脚本与 schema 不一致，或 VERSION 与 schema 中的 `schema_version` 不一致时失败。
5. 可选的 CI 集成：在演示分支上安装套件，并针对一个已知正确的任务运行验证关卡。

直接否决：

- 套件里包含项目专属任务。任务放在目标仓库的看板上。
- 绑定单一厂商 SDK 的套件。只做框架无关的部分，SDK 接线是目标仓库的事。
- 会修改状态文件的安装器。安装器幂等，只动工作台各个面；状态归 agent 和人类管。
- 没有对应检查函数的规则。只表达愿景的规则放进入职文档，不进套件。

拒绝规则：

- 事故历史为空时，拒绝交付调校版 `agent-rules.md`。改用标准默认版本，并报告这个缺口。
- 目标仓库的 CI 与安装方式不兼容（没有 `.github/workflows/`，也没有等价物）时，拒绝执行可选的 CI 步骤，改为记录手动安装路径。
- 团队使用套件的私有 fork 时，拒绝编写公开安装器。私有安装器带有私有的不变量。

输出结构：

```
agent-workbench-pack/
├── AGENTS.md
├── docs/
├── schemas/
├── scripts/
├── bin/install.sh
├── lint_pack.py
├── VERSION
└── README.md
```

最后给出"接下来读什么"，指向：

- 第 41 课：本套件所改进的前后对比基准测试。
- 第 30 课（评测驱动的 agent 开发）：消费套件结论的评测循环。
- [SkillKit](https://github.com/rohitg00/skillkit)：把套件分发到 32 个 AI agent。
