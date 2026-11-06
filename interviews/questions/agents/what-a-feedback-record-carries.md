---
id: what-a-feedback-record-carries
title: 单条反馈记录包含的内容
card: agents
kind: concept
level: 1
roles: [agentic-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [feedback-record, exit-code, truncation, redaction, telemetry]
minutes: 5
lessons: [phases/14-agent-engineering/37-runtime-feedback-loops]
manuals: []
practice: []
cheatsheet: [agent-workbench-ops]
related: [agents/tests-passed-but-nothing-ran]
updated: 2026-11-03
---

你为 agent 运行的每条 shell 命令都封装了统一的包装器，以便下一次模型调用能够读取到底发生了什么。记录中需要包含哪些字段，哪个字段能够明确告诉你命令是否执行成功，当该字段为空时你应该怎么做？

## Short answer

记录中应包含以 argv 形式存在的精确执行命令、作为独立字段分别捕获的 stdout 与 stderr 尾部数据、命令退出状态码、执行耗时、启动时间戳，以及一行关于 agent 预期的简要说明。退出码是判断成功的信号，因为文本可以说任何话，而退出码无法伪造。如果执行器在捕获退出码前失败，记录包含 null 退出码和错误原因，循环不得在此状态下向前推进。

## Full answer

### 核心记录字段

| 字段 | 设计原因 |
|---|---|
| `command` | 精确的命令行参数（argv），避免 shell 隐式展开引发意外歧义 |
| `stdout_tail` | 标准输出的最后数行，每次都以相同方式截断 |
| `stderr_tail` | 错误输出的最后数行，与标准输出保持分离 |
| `exit_code` | 衡量命令执行成功与否的唯一无歧义权威信号 |
| `duration_ms` | 暴露出缓慢的探测命令以及失控挂起的异常进程 |
| `started_at` | 用于重放的时间戳 |
| `agent_note` | 记录 agent 在真正读取执行结果之前的单步预期 |

### 绝不丢失关键报错的截断算法

大日志会破坏循环。执行器保留固定数量的头部行与尾部行，并插入标记说明移除了多少行。相同的输出总是得到相同的记录。不需要抽样，因为最终的错误和最终的总结都在末尾。

### 写入时的敏感数据脱敏

标准输出记录可能携带密钥。执行器在追加行之前去除 bearer token、密码赋值、API key 和已知密钥格式。读取时脱敏是错误的，因为磁盘上的文件才是攻击者触及的目标。

### 运行时反馈不等于系统遥测

遥测面向跨时间审查运行情况的操作员。反馈面向本次运行的下一轮。它们共享字段，但存放在不同文件中，保留期也不同。

## Follow-ups

- **Level 1:** 为什么必须将 stderr 与 stdout 拆分为独立的字段？ Expected: 测试框架常把失败摘要打印在一个流，将漫长进度打印在另一流，合并尾部容易让进度行淹没真正的失败摘要。
- **Level 2:** 命令执行超时了，记录中会体现出什么？ Expected: 退出状态码为 null、包含超时详情的错误字段，以及已经捕获的部分日志，循环坚决拒绝继续推进。
- **Level 2:** agent_note 字段的具体作用是什么？ Expected: 记录模型在读取结果前的执行预测，使审查者看出 agent 何时预期成功却实际失败。
- **Level 3:** 一次重试最终成功了，审计流程如何追踪最初的失败？ Expected: 每条记录都拥有独立命令 ID，重试记录携带父命令 ID，使重试链清晰透明，不会将重试误判为一次性独立成功。

## Wrong answers

- "解析输出日志中是否包含 error 关键字来判定命令是否失败。" 不同语言和工具的日志文本千差万别，退出状态码才是每条命令原生提供的权威信号。
- "完整保留全部日志输出，因为截断可能会遗漏信息。" 巨大的日志记录会迅速耗尽 token 预算，确定性的尾部截断机制足以完整保留核心结论。
- "等到人类工程师打开日志排查时再执行数据脱敏。" 写入磁盘的文件本身就已经构成了安全泄露事实，脱敏操作必须在内容追加写入之前就地完成。

## Taught in

[运行时反馈循环](../../../phases/14-agent-engineering/37-runtime-feedback-loops/)课程构建了输出该标准反馈记录的底层执行器。
