---
id: headless-coordinator-loops-to-death
title: 连续五次相同调用，五次被拒，退出码 1
card: sandboxes
kind: debug
level: 4
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, coding]
tags: [agent-runtime, headless, sub-agents, permissions, regression]
minutes: 12
lessons: []
manuals: [docker-sandboxes-101#s-sub-agents-transfer-task-and-background-agents, docker-sandboxes-101#s-permissions-safety-and-hooks, docker-sandboxes-101#s-session-db-sessions-diff-and-eval]
practice: []
cheatsheet: [agent-harness, agent-failure-modes]
related: [sandboxes/permissions-are-not-a-boundary]
updated: 2026-11-03
---

协调者 agent 在 CI 环境下以 `--exec --json` 参数运行。事件流显示其连续发起了五次相同的 `run_background_agent` 调用，每一次均收到回复 `The user rejected the tool call.`（用户拒绝了工具调用），随后抛出 `Error: Agent terminated: detected 5 consecutive identical calls to run_background_agent`（错误：检测到连续 5 次对 run_background_agent 的相同调用，Agent 已终止）。完全相同的 Agent 配置文件在当天上午的笔记本电脑上却能正常执行。解释该调用链路、修复其以支持无人值守自动运行，并补充在 CI 之前即可提早发现该变动的防回归检查。

## Short answer

无头（headless）模式意味着无人应答 `tool_call_confirmation` 提示，因此运行时自动将该确认请求转变为拒绝结果；`run_background_agent` 之所以弹窗是因为其标签为 `unknown`、配置文件未指定安全模式，且没有 `allow` 模式放行它，而模型盲目重复发起调用直到达到默认阈值为 5 的 `max_consecutive_tool_calls`，以退出码 1 中断运行。修复方案是指定 `--safety restricted` 模式，并为 `run_background_agent` 以及后台子 Agent 本身所调用的各类工具配置显式 `allow` 放行规则，因为在后台运行的任务中需要弹窗询问的调用会被自动拒绝；而 `transfer_task` 则无需任何配置，因为它是唯一无需弹窗默认自动批准的工具。使用两组录制的会话以及 `docker-agent sessions diff --fail-on-divergence -- -1 -2` 命令做防回归守卫，该命令仅比对工具调用序列、忽略散文表述，并在发现首处行为分歧时立即报错中断。

## Full answer

### 调度其他 Agent 协作的三种机制

| 机制名称 | 引入途径 | 具体运作表现 |
|---|---|---|
| `transfer_task` | `sub_agents` 配置 | 子 Agent 在干净的子会话中运行，系统消息承载该任务，将其回答作为工具返回值返回，且完全看不到主会话历史 |
| `handoff` | `handoffs` 配置 | 被指定的 Agent 在该对话后续轮次中完全接管成为主活动 Agent，且能看到完整历史 |
| `run_background_agent` | `background_agents` 工具集 | 启动异步后台任务并立即返回任务 ID；后续配套使用 `list`、`view` 和 `stop` |

`transfer_task` 在设计上无需任何弹窗确认即默认批准。向调用链中已存在的上级 Agent 反向委派会报错失败，且最大嵌套层级上限为 10。如果 `sub_agents` 中的条目是对注册表的镜像标签引用，则每次运行都会重新解析该标签（除非明确锁定 digest 哈希），这是导致笔记本环境与 CI 环境表现不同的第二种隐蔽诱因。

### 笔记本电脑能够顺利通过的原因

笔记本电脑运行在交互式终端中。当时弹出了相同的工具确认弹窗并有人工点击了批准，或者当时为会话显式指定了放行模式。完全未指定安全模式的会话沿用旧版默认行为：仅有只读工具能够免弹窗运行，其他所有工具均会弹窗询问。在 CI 环境中无人响应询问，拒绝结果作为工具响应返回给大模型，模型并未调整其执行计划，循环检测器随即强行掐断进程。`session.db` 在每个会话中持久化记录了 `safety_policy`，因此事后可直接查阅每次失败运行具体处于何种安全模式。

### 完整的按序修复步骤

1. 启用 `--safety restricted`，使得未明确匹配的 `safe` 级别调用直接放行，而 `destructive`（破坏性）和 `unknown`（未知）调用直接安全阻断（fail closed）而非挂起弹窗。
2. 为 `run_background_agent` 以及后台子 Agent 所使用的各类工具配置 `allow` 放行模式，因为在后台任务执行过程中，任何原本需要弹窗询问的调用都会被系统自动直接拒绝。
3. 对所有破坏性操作保持 `deny` 显式拒绝；任何安全模式或钩子放行规则均无法覆盖显式 deny。
4. 将外部子 Agent 的引用锁定为具体的 digest 哈希。
5. 将 Agent 放入隔离沙箱中运行，因为权限控制机制仅仅是由客户端在应用层执行的。

### 防回归比对检查

使用 `--record=PATH` 与 `--models-gateway` 录制标准运行，使用 `--fake` 重放，并使用 `sessions diff` 对比两个会话。帮助文档自带的示例由于参数解析器将 `-1` 误判为短选项标志而会报错失败；正确的语法必须在引用前加上 `--` 隔断。一对完全相同的重放会话会报告全轮次行为一致，而首个调用了不同工具的异常运行会在第 0 轮立即报出分歧，并在带有 `--fail-on-divergence` 时直接退出码 1 报错。在录制时应要求模型每条消息仅发起一个工具调用，因为单个轮次若包含两个并发调用，结果会按完成先后顺序异步追加，导致回放时抛出 `requested interaction not found`（未找到请求的交互）。

## Follow-ups

- **Level 3:** 为什么 `transfer_task` 不需要配置 `allow` 而 `run_background_agent` 却必须配置？ Expected: 任务委派在架构设计上默认自动批准，而后端任务拉起属于受安全模式与模式匹配规则裁决的常规工具调用。
- **Level 3:** `sessions diff -1 -2` 报错提示未知的短选项标志，为什么，正确命令是什么？ Expected: 参数解析器将 `-1` 误判为命令行选项；应执行 `sessions diff -- -1 -2`。
- **Level 4:** 编写代码的子 Agent 是通过注册表标签拉取而非直接从本地文件读取，笔记本与 CI 之间可能发生什么漂移？ Expected: 镜像标签在每次运行时都会重新向远端解析拉取，可能拉到更新版本，因此必须锁定固定 digest。
- **Level 4:** 为什么比对工具调用序列而非比对助手的文本回复？ Expected: 大模型每次生成文本的遣词造句均存在随机差异，而工具调用序列才是交付并直接产生业务行为的确定性核心。

## Wrong answers

- "在 CI 中使用 `--yolo` 关掉所有弹窗。" 那对应 `autonomous` 模式，会导致破坏性操作也一并被放行；`restricted` 模式能对破坏性操作执行安全阻断。
- "调大 `max_consecutive_tool_calls` 的阈值。" 这只是掩耳盗铃地延后了死循环报错；被拒绝才是根因，循环检测器忠实履行了职责。
- "直接 diff 输出转储文本。" 自然语言在各次运行中存在随机波动；`sessions diff` 专门精准比对工具调用链并在首处分歧处中断。

## Taught in

[子 Agent 章节](../../../manuals/docker-sandboxes-101/sections/5-4-sub-agents-transfer-task-and-background-agents.md)记录了被拒绝的后台调用与死循环检测器，[权限章节](../../../manuals/docker-sandboxes-101/sections/5-5-permissions-safety-and-hooks.md)给出了模式映射表与裁决顺序，而[会话章节](../../../manuals/docker-sandboxes-101/sections/5-6-session-db-sessions-diff-and-eval.md)展示了 `sessions diff` 与重放规则。
