---
id: a-login-fix-touched-five-files
title: 修复一个登录问题却改了五个文件
card: agents
kind: debug
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [scope-contract, scope-creep, diff-check, forbidden-files, globs]
minutes: 10
lessons: [phases/14-agent-engineering/36-scope-contracts]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops]
related: [agents/tests-passed-but-nothing-ran]
updated: 2026-11-03
---

交给 agent 的任务是修复一个登录 bug。产生的 diff 修改了登录路由、邮件辅助函数、数据库驱动、README 和发布脚本。运行记录为每次改动都给出了看似合理的理由。审查者拒绝了拉取请求，并问你哪里出了问题以及如何制止。你会怎么回答？

## Short answer

这是范围蔓延，且难以察觉，因为 agent 善意地解释了每一步。解决办法不是写更严格的 prompt。而是在磁盘上建立一份契约，列出任务可以修改的文件与绝不可触碰的文件，并加入将最终 diff 与该契约比对的检查。该检查在关卡之前运行，向禁止路径写入会阻断任务。

## Full answer

### 为什么 prompt 无法约束范围

每次改动都有局部合理的原因。模型不知道任务在何处结束，因此每当发现相关内容时就会扩展任务边界。在 prompt 中写“保持在范围内”只是一种祈愿。而在文件中明确规定何为在范围内则是一项检查。

### 范围契约

| 字段 | 用途 |
|---|---|
| `task_id` | 指向看板上的对应任务 |
| `goal` | 审查者可以验证的一句话目标 |
| `allowed_files` | 允许 agent 写入的 glob 模式 |
| `forbidden_files` | agent 绝不可触碰的 glob 模式，即使误触也不允许 |
| `acceptance_criteria` | 证明任务完成的命令或断言行 |
| `rollback_plan` | 任务必须中止时操作员可以执行的一段回滚说明 |
| `approvals_required` | 范围之外需要人工核准的操作 |

关于字段的两条规则。第一，缺少 `forbidden_files` 的契约是不完整的，因为明确禁止的范围占了契约的一半。第二，使用 glob 模式而非原始具体路径，这样会话间的文件移动就不会使契约失效。

### 范围检查

检查器读取 diff、允许的 glob 列表与禁止的 glob 列表，并返回违规项、范围内文件与范围外文件。针对此拉取请求，它将发布脚本报告为禁止写入，并将 README、邮件辅助函数和驱动报告为范围外写入。不同路径类别的严重级别不同：`docs/**` 下的范围外写入为警告，而 `scripts/**`、`migrations/**` 或生产配置下的写入始终会阻断。这种非对称性体现在契约中，因为每个项目和每个任务的要求各不相同。

### 确保契约经得起团队实际检验

每次遇到微小偏差都报错阻断的关卡最终会被人关掉。为每个任务设置违规预算，使次要偏差作为警告呈现，仅在预算超标时阻断合并。一位在每次运行前编写范围契约的工程师报告称，在同一个 agent 上，偏离任务、越挖越深的比例在三周内从 52% 降到了 21%。

### 第二个维度

契约约束的是单个任务，而不是整个项目。Agent 可以在遵守登录契约的同时，在下一轮自行启动一个设置页面的开发。维护一个最多只允许一个特性处于 `in_progress` 的 `feature_list.json` 可以堵住这个漏洞。任务契约中允许的文件必须限定在当前活动特性所涉及的范围之内。

## Follow-ups

- **Level 2:** Agent 需要在邮件辅助函数中修改一行代码来修复该 bug，此时应该发生什么？ Expected: 检查器标记出该范围外写入，agent 发起提问，由人工决定是扩充契约还是要求 agent 放弃该修改。
- **Level 3:** 代码重构移动了登录代码位置时，如何保持契约有效？ Expected: 使用诸如 `app/**/login*.py` 等模式而非精确路径编写 glob，并在任务结束时归档契约。
- **Level 3:** 两个契约同时作用于一个 diff，一个属于项目，一个属于任务，合并规则是什么？ Expected: 遵循最小权限原则，对允许的 glob 取交集，对禁止的 glob 取并集，并采用最严格的时间预算。
- **Level 4:** 文件 glob 并不是唯一的范围维度，契约中还应包含什么？ Expected: 实际耗时预算与网络出口白名单，因为 agent 即使留在限定文件内，也可能调用并非任务组成部分的服务。

## Wrong answers

- "在 prompt 中加一句话要求保持在任务范围内。" Agent 在每一步都已经认为自己在范围内，缺少检查的情况下这句话不会带来任何改变。
- "人工更仔细地审查 diff。" 这次正是人工审查在 agent 消耗完预算后发现了问题，而核心目标是在拉取请求产生之前就拦截它。
- "阻断任务文件之外的所有写入。" 对 README 修改的硬性阻断会导致团队为了省事而禁用关卡，因此对低风险路径应使用警告，对脚本与迁移脚本使用阻断。

## Taught in

[范围契约与任务边界](../../../phases/14-agent-engineering/36-scope-contracts/)课程构建了契约、diff 检查器以及特性列表。
