---
id: empty-list-is-not-absence
title: callers 为空且 coverage 报告 complete
card: evidence-reverse-engineering
kind: concept
level: 1
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [screen, debugging]
tags: [reverse-engineering, evidence, coverage, unknowns, call-graph]
minutes: 6
lessons: [phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns]
manuals: [reverse-engineering-101#s-residual-unknowns-and-coverage, reverse-engineering-101#s-an-agent-investigation]
practice: []
cheatsheet: [reverse-engineering]
related: [evidence-reverse-engineering/observed-derived-inferred]
updated: 2026-11-03
---

在记录中，函数 `_grade` 的卷宗列出 `callers: []` 与 `callees: []`，其 `relationship_coverage.status` 显示为 `complete`。Agent 在报告中写道“没有任何内容调用 grade”。该记录实际上支持什么结论，又需要什么条件才能使 Agent 的这句话成立？

## Short answer

`complete` 仅表示分析引擎在没有已知读取限制的情况下返回了所有已解析的调用引用，其旁的诊断信息明确指出未解析的计算调用或间接调用仍属未知。记录中唯一的入向引用是来自函数起始位置表的一个 `DATA` 数据引用，而非调用指令，因此该记录仅支持“在此构建中没有已解析的调用指令以此函数为目标”。设计规则明确指出覆盖缺失属于未知而非不存在，Agent 的断言需要实际运行或者能够覆盖间接调用的分析论证，因此诚实的做法是记录一个带有可消除它的探测方法的残留未知项。

## Full answer

### 三种取值与空值

`relationship_coverage` 说明调用方与被调用方集合的完备程度：`complete`（完全）；`partial`（部分）附带其局限性与受限方向；或 `unknown`（未知）附带原因；对于不报告调用关系的操作则为 `null`。分析工具的警告声明保存在 `limitations` 中，并不会导致覆盖状态变为 partial。卷宗中确实有一部分用数字声明了其覆盖率：值流分析报告其是否被截断，以及省略了多少操作、输入和边。那里的零是工具有据可依的明确计数，而其他地方的空数组则是没有任何此类声明的计数。

### 另外两处空列表中的相同教训

跨越两个构建版本的证据包比对列出了仅存在于单个证据包中的 10 条记录，并将每一条都归类为 `unknown`、类型为 `unresolved_branch`，因为证据包并没有声明自身完整的标记。一个包含 6 个应用文件的汇总视图报告了 `semantic_unknowns: 118`，并将其覆盖范围标记为 `unknown`。这两处每一项都证明了未观察到任何内容，而不是证明什么都不存在。

### 针对未决事项的专门记录

残留未知项是一条持久化记录，带有 `unk_` 前缀的 ID、修订链、状态以及能够解决该项的证据。ID 是分析领域、去除多余空格的问题以及目标作用域摘要的哈希值，因此两位分析人员针对同一文件提出相同问题将得到相同的 ID，第二次调用 `record_unknown` 将返回 `already-exists`。每次变更都是一条指明前一版本摘要的新修订，每次修改本身都是一条权威度为 `analyst-inference` 的证据记录，且仅有具备所需权威度的已观察记录才能将解决方案标记为 `verified`。针对此卷宗的未知项询问在运行时是否有任何内容调用 `_grade`，其探测手段是运行程序或读取计算出的跳转目标。

## Follow-ups

- **Level 1:** 该卷宗确实列出了一个单独的入向引用，它是什么？ Expected: 来自函数起始条目的 `DATA` 引用，由展开器和崩溃报告器使用，并非分支跳转指令。
- **Level 2:** 为什么值流计数中的零比空的 callers 数组更具分量？ Expected: 该计数是工具以明确保证背书的截断声明，而数组除了已解析引用之外没有任何完整性保证。
- **Level 2:** 如何将悬而未决的问题记录下来以使其在会话结束后仍然存留？ Expected: 使用 `record_unknown` 记录问题、所需权威度与置信度，以及推荐的探测方法；ID 由问题派生。
- **Level 3:** 两位分析人员更新同一个未知项，什么机制防止第二位覆盖第一位？ Expected: `update_unknown` 接收 `expected_revision`，若版本过期则返回 `revision-conflict`，促使第二位重新读取最新版本并重新决策。

## Wrong answers

- "`complete` 意味着可能发生的所有调用。" 它仅表示返回了所有已解析的引用；间接调用和计算调用仍保持未知。
- "空列表意味着不存在。" 它仅意味着未观察到；系统设计规则规定覆盖缺失属于未知。
- "在报告中用一句话结清未知项。" 结清需要具备所需置信度与权威度的证据 ID，而不是文字描述。

## Taught in

[覆盖范围章节](../../../manuals/reverse-engineering-101/sections/5-2-residual-unknowns-and-coverage.md)定义了该字段与未知项记录，[Agent 调查章节](../../../manuals/reverse-engineering-101/sections/8-2-an-agent-investigation.md)展示了 `DATA` 引用陷阱，而[证据课程](../../../phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/)构建了修订链。
