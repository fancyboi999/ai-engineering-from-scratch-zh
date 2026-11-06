---
id: span-kind-client-or-internal
title: 哪些 agent span 是 CLIENT，哪些是 INTERNAL
card: production-mlops
kind: concept
level: 1
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [screen, ml-breadth]
tags: [opentelemetry, tracing, spans, genai-conventions]
minutes: 5
lessons: [phases/13-tools-and-protocols/20-opentelemetry-genai, phases/14-agent-engineering/23-otel-genai-conventions]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/read-this-span, production-mlops/trace-context-over-stdio]
updated: 2026-11-03
---

你正在给一个 agent 添加追踪。在一次运行中，它调用了两次模型 API，在自己的进程内运行了两个工具，并向另一台机器上的工具服务器发送了一次请求。这些操作中，哪些获得 CLIENT span，哪些获得 INTERNAL span，为什么这很重要？

## Short answer

离开进程的调用获得 CLIENT span：两次模型 API 调用，以及发往远程工具服务器的请求。agent 循环步骤和在自己进程内运行的工具获得 INTERNAL span。类型向后端说明每次调用的方向，以便显示哪些操作离开了进程，哪些没有。

## Full answer

### 这一次运行的树状结构

```text
invoke_agent            INTERNAL
 ├── chat               CLIENT
 ├── execute_tool       INTERNAL
 │    └── remote call   CLIENT
 ├── execute_tool       INTERNAL
 └── chat               CLIENT
```

每个 span 共享同一个 trace ID。每个子节点都携带其父节点的 ID。这让整批操作成为一棵树，而不是六条分散的记录。

### 规则

CLIENT 标记跨越进程边界的调用：模型服务商、工具服务器、托管的 agent 服务。INTERNAL 标记 agent 自身的循环步骤，以及在同一进程内运行的所有工具。规范对 agent span 本身也应用相同规则：作为远程服务运行的 agent，从调用方看是 CLIENT；进程内的 agent 框架则是 INTERNAL。

### 各类 span 附带的属性

| Span | 属性 |
|---|---|
| 模型调用 | `gen_ai.operation.name`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.response.model`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens`、`gen_ai.response.id` |
| 工具调用 | `gen_ai.tool.name`、`gen_ai.tool.call.id` |
| agent 运行 | `gen_ai.agent.name`、`gen_ai.agent.id` |

### 为什么重要

后端根据类型和父级关联绘制瀑布图。缺少响应 ID 的 CLIENT span 无法与服务商日志匹配。没有父级的工具 span 是孤立节点，你无法再看出是哪个 agent 步骤引发了调用。

## Follow-ups

- **Level 1:** 是什么把多个 span 连成一棵树？ Expected: 一个共享的 trace ID，以及每个子节点上的父 span ID。
- **Level 2:** agent 调用了托管的 agent 服务而非本地服务，该 span 是什么类型？ Expected: CLIENT，因为该 agent 在另一个进程中运行。
- **Level 2:** 哪个属性让看板能按服务商切分成本？ Expected: `gen_ai.provider.name`；缺少它时，多服务商看板就会失效。
- **Level 3:** 同一进程内运行的子 agent，会开启新 trace 吗？ Expected: 不会。它是父 agent span 下的子 span，整套运行保留在同一个 trace 中。

## Wrong answers

- "每个工具调用都是 CLIENT span。" 在你进程内运行的工具是 INTERNAL，只有离开进程的调用才是 CLIENT。
- "类型只是装饰。" 后端读取类型来展示方向，规范也按 span 类别规定了类型。
- "为了隔离，为每个工具调用开启新 trace。" 分开的 trace 会丢失父级关联，让你无法看出哪一步引发了调用。

## Taught in

[OpenTelemetry GenAI 课程](../../../phases/13-tools-and-protocols/20-opentelemetry-genai/)绘制了 span 层级结构，[语义规范课程](../../../phases/14-agent-engineering/23-otel-genai-conventions/)列出了 span 类别及其类型。
