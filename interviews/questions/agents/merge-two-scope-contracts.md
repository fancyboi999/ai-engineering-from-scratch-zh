---
id: merge-two-scope-contracts
title: 两个范围契约作用于同一个 diff 的合并定义
card: agents
kind: design
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, design-review]
tags: [scope-contract, least-privilege, merge-semantics, egress, time-budget]
minutes: 15
lessons: [phases/14-agent-engineering/36-scope-contracts]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops]
related: [agents/a-login-fix-touched-five-files, agents/safe-actions-harmful-trajectory]
updated: 2026-11-03
---

一个代码仓库包含一份项目级的范围契约，同时每个具体任务也会添加自己的任务级契约。当前检查器只是简单地读取先找到的任意一份文件。请为契约中的每个字段编写合并规则，使合并结果机械可执行、便于审查，且绝不比任意一份输入更宽松。

## Short answer

按最小权限原则合并。对允许的 glob 列表取交集，使路径必须同时被两份契约允许；对禁止的 glob 列表取并集，使得任意一份契约都能禁止对应路径。采用更小的时间预算，累加所需的人工审批项，并将网络出口白名单按三态逻辑处理：未设置时遵循另一方，两份列表取交集，空列表保持全阻断。将该规则固化在契约 Schema 中，使检查器与审查者执行完全相同的合并判定。

## Full answer

### 各字段合并规则

| 字段 | 合并逻辑 | 设计原因 |
|---|---|---|
| `allowed_files` | 取交集（Intersection） | 两份契约必须同时允许该写入 |
| `forbidden_files` | 取并集（Union） | 任意一份契约均有一票否决权 |
| `time_budget_minutes` | 取较小值（Minimum） | 更严格的时间限制胜出 |
| `approvals_required` | 取并集（Union） | 任意一方要求的人工核准均须满足 |
| `network_egress` | 详见下方三态规则 | 三态处理，全阻断具有吸收性 |
| `acceptance_criteria` | 取并集（Union） | 任意一方要求的验证均须运行 |
| `rollback_plan` | 两者均保留 | 运维人员需要掌握每一份预案 |

### 网络出口白名单完整规则

`network_egress` 具有三种状态。`None` 表示当前契约不做网络出口限制。`[]` 表示禁止所有网络出口访问。包含条目的列表表示显式白名单。在合并时，`None` 遵循另一方的配置；两个列表取交集；任意一方为 `[]` 则最终结果必须为 `[]`。最后一点至关重要：当项目级契约已经关闭网络出口时，具体任务契约无法擅自开放网络。

### 为什么合并规则必须写入 Schema

若合并规则仅存在于检查器的实现代码中，审批契约的代码审查者对此是完全无感知的。而当规则写入 Schema 时，检查器、审查者和 agent 都能明确读取并理解这一契约逻辑。课程的核心立论在于：契约将“保持在范围内”从空洞的愿望变成了具体的自动化检查，而未形成书面规范的合并机制则会使检查重新沦为愿望。

### 严重级别依然由契约决定

对于文档目录的越界写入通常仅报警告，而对脚本、数据库迁移或生产配置的越界写入必须直接阻断。在合并时，若两份契约都对某一路径作了分类，取更严格的严重级别。保留按任务划分的违规预算，使得细微偏差仅作为警告呈现，仅在预算超标时阻断合并。

### 特性列表（Feature List）所处的层级

特性列表约束整个项目，而契约约束单次任务。合并后的 `allowed_files` 必须完全落在当前活动特性所涵盖的范围之内。如果任务契约申请了当前特性未包含的路径，启动检查将在执行任何文件写入之前直接报错阻断。

## Follow-ups

- **Level 3:** 项目契约未配置网络出口字段，而任务契约列出了一个域名，合并后的出口权限是什么？ Expected: 包含该单个域名的白名单，因为未设置的字段会遵从另一方的明确定义。
- **Level 4:** 为什么对允许的 glob 取交集而不是取并集？ Expected: 取并集会让任务契约越权开放项目未允许的路径，而最小权限原则要求每次写入都必须经双方共同同意。
- **Level 4:** 任务确实合法需要修改项目契约之外的文件，正确的审批路径是什么？ Expected: 在 `approvals_required` 中添加条目并记录人工批准，在评审中更新项目契约，绝不放宽合并规则。
- **Level 4:** 你会如何自动化测试该合并逻辑？ Expected: 为每个字段构建输入对与预期输出的对照测试表，把空列表吸收与未设置遵从设为特定用例，并在 CI 中针对检查器执行。

## Wrong answers

- "让任务契约覆盖项目契约，因为任务契约更具体。" 具体不等于安全，允许覆盖会让任意任务都有能力开放任意路径或网络主机。
- "对允许的文件取并集，以免误阻断合法操作。" 取并集是权限最宽松的合并方式，而合并结果绝不能比任意单个输入更宽松。
- "在检查器内部写死合并逻辑，保持契约文件自身精简。" 审查者看不到的隐式合并逻辑，属于团队无法审计的规则。

## Taught in

[范围契约与任务边界](../../../phases/14-agent-engineering/36-scope-contracts/)课程给出了最小权限合并原则以及网络出口的三态规则。
