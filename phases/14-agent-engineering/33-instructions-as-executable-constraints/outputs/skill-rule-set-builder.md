---
name: rule-set-builder
description: 访谈项目负责人，把现有的散文式指令归入五个操作类别，输出带版本号的 agent-rules.md 和一个 Python 检查器桩代码。
version: 1.0.0
phase: 14
lesson: 33
tags: [rules, instructions, constraints, checker, workbench]
---

给定一个仓库和其中已有的散文式指令（`AGENTS.md`、`CONTRIBUTING.md`、入职文档），产出一套工作台可以执行的五类规则。

五个类别：

1. `startup`：开工前必须成立的条件。
2. `forbidden`：绝不能发生的事。
3. `definition_of_done`：用什么证明任务已完成。
4. `uncertainty`：agent 拿不准时该怎么做。
5. `approval`：哪些事需要人类签字确认。

产出：

1. `docs/agent-rules.md`，每条规则一个 `##` 标题。每条规则带 `category`、`check` 和一行说明。
2. `tools/rule_checker.py`，其中的 `RuleChecker` 类为每个 `check` 提供一个方法。每个方法接收一个 `TurnTrace` dataclass，返回 `bool`。
3. `tools/rule_report.py` 运行器：加载规则，在一条 trace 上运行检查器，输出 `rule_report.json`。
4. 一份迁移说明文件：哪些散文句子变成了哪条规则，哪些因为只是愿景而被删掉，以及原因。

直接否决：

- 没有 `check` 字段的规则。只表达愿景的规则应该放进入职文档，不属于工作台规则集。
- 一条笼统的"小心点"规则。要么指定类别和检查，要么删掉。
- 需要调用 LLM 的检查。规则检查必须确定且廉价，才能每一轮都跑。
- 超过 200 行的规则文件。按类别拆成 `agent-rules.{startup,forbidden,done,uncertainty,approval}.md`，再由一个父级索引做路由。

拒绝规则：

- agent 产品无法提供 `TurnTrace`（没有埋点）时，在至少记录下 `read_state_file`、`edited_files` 和 `tests_exit_code` 之前，拒绝接入检查器。
- 现有指令大部分（超过 50%）只是愿景时，先报告这一发现，再输出规则。规则集会显得单薄，这是对的。
- 某条规则因为过去的单次事故而加入时，附上事故 id，方便以后审查时判断它是否还有必要。

输出结构：

```
<repo>/
├── docs/
│   └── agent-rules.md
├── tools/
│   ├── rule_checker.py
│   └── rule_report.py
└── docs/migration-notes.md
```

最后给出"接下来读什么"，指向：

- 第 36 课：扩展 forbidden 类别的每任务范围契约。
- 第 38 课：消费规则报告的验证关卡。
- 第 39 课：给规则遵守情况打分的审查 agent。
