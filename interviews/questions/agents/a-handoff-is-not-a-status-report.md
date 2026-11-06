---
id: a-handoff-is-not-a-status-report
title: 交接包包含而状态报告不包含的内容
card: agents
kind: concept
level: 1
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-developer-relations-engineer]
rounds: [screen, ml-breadth]
tags: [handoff, next-action, multi-session, clean-state, state-file]
minutes: 6
lessons: [phases/14-agent-engineering/40-multi-session-handoff]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops]
related: [agents/seven-surfaces-one-symptom-each]
updated: 2026-11-03
---

每次会话结束时，你的 agent 都会写一段话说明自己做了什么。然而下一次会话仍要花前半个小时搞清楚当前进展。会话结束产物中缺少了什么？应该如何生成它才能确保绝不会被跳过？

## Short answer

那段话只是状态报告，而交接需要七个字段：摘要、变更文件、已执行命令、失败尝试、未结风险、下一步行动，以及指向验证与审查报告的指针。下一步行动是最关键的字段，它让下一次会话的第一步具有确定性。应直接从工作台产物自动生成交接包，而不是让 agent 自己写，并且要先执行清理检查，确保交接包描述的是下一次会话可以信任的工作树。

## Full answer

### 七个字段

| 字段 | 回答的问题 |
|---|---|
| `summary` | 用一段话概括做了什么 |
| `changed_files` | 一眼看清 diff |
| `commands_run` | 根据反馈记录列出执行了哪些命令 |
| `failed_attempts` | 尝试了什么以及为何行不通 |
| `open_risks` | 哪些因素可能影响下一次会话，附带严重级别 |
| `next_action` | 下一次会话要采取的第一个具体步骤 |
| `verdict_pointer` | 指向验证与审查报告的路径 |

如果一个数据包除了 `next_action` 之外包含所有字段，它就只是一份状态报告。它虽然有用，但下一次会话仍必须自行决定第一步该做什么。

### 自动生成而非手工撰写

工作不顺时，手写交接最容易被省略。生成器读取状态文件、验证报告、审查报告和反馈日志，以两种形式输出交接包。`handoff.md` 供人类阅读，`handoff.json` 供下一个 agent 读取。如果两者不一致，以 JSON 为准。Agent 的职责是将工作台维持在生成器可以总结的状态。

### 裁剪日志

反馈日志可能包含数百条记录。交接包只携带最后 K 条记录以及所有退出码非零的记录。下一次会话若需要，可以加载完整日志。

### 留下干净状态

如果下一次会话打开时面对的是应用了一半的 diff、残留的临时文件、错误的分支以及在运行前就报错的测试，那么再完美的交接包也毫无用处。清理本身是一个独立的阶段，它是一项检查，而不是一种习惯。工作树的改动已提交，或已 stash 并附上说明。没有遗留的临时产物。测试已通过；如果失败，未结风险中要注明失败项。功能看板与实际情况相符。当前分支符合预期。清理阶段输出阻塞问题列表，生成器写入交接包前必须断言该列表为空。

## Follow-ups

- **Level 1:** 为什么当两种形式不一致时以 JSON 为准？ Expected: 下一个 agent 加载的是 JSON，因此机器可读的形式才是驱动下一次会话的数据源。
- **Level 2:** 哪些失败尝试应该收入交接包？ Expected: 所有退出码非零的记录，并保持重试链清晰可见，这样下一次会话就不会重复已知的死胡同。
- **Level 2:** 交接包与状态文件有什么区别？ Expected: 状态文件在每轮都会被读取并记录 agent 当前所处的位置，而交接包仅在会话结束时生成一次，用于告知下一次会话从何处开始。
- **Level 3:** 两个分支上的两次会话各自写了一份交接包，下一次会话如何选取？ Expected: 每个交接包都携带分支名、最后已知良好提交以及 active、superseded 或 archived 状态，只有当前分支处于 active 状态的交接包才能驱动会话。

## Wrong answers

- "让 agent 在结束时写一份详细摘要。" 当会话以糟糕状态结束时，手写摘要往往会被跳过，而恰恰是失败的会话最需要交接。
- "聊天记录就是交接。" 历史记录会被裁剪或丢失，下一次会话不可能在第一分钟内重放一小时的聊天内容。
- "绿色的验证报告就足以恢复工作。" 报告只能证明任务状态，不能证明工作树状态，不干净的工作树会让下一次会话白白浪费前十分钟。

## Taught in

[多会话交接](../../../phases/14-agent-engineering/40-multi-session-handoff/)课程从工作台文件构建交接包并添加清理检查。
