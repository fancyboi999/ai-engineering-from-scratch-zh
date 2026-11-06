---
id: trace-context-over-stdio
title: 用同一条 trace 串起 HTTP 与 stdio 工具服务器
card: production-mlops
kind: design
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer]
rounds: [system-design, debugging]
tags: [tracing, mcp, traceparent, propagation]
minutes: 12
lessons: [phases/13-tools-and-protocols/20-opentelemetry-genai]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/span-kind-client-or-internal, production-mlops/read-this-span]
updated: 2026-11-03
---

agent 通过 MCP 协议使用三个工具服务器。其中两个使用可流式传输的 HTTP，另一个作为本地子进程通过 stdio 通信。设计如何让同一个 trace ID 到达三者，并说明各服务器收到后要做什么。

## Short answer

对 HTTP 服务器，像其他带追踪的 HTTP 客户端一样，在每个请求中注入 W3C `traceparent` 头。stdio 传输没有请求头，在协议加入标准字段之前，把相同的值放入每个 JSON-RPC 请求的 `_meta` 字段。各服务器读取该值，以该上下文的子节点身份创建自己的 span，在日志中写入 trace ID；若还会调用其他服务，则继续传播上下文。

## Full answer

### 为什么值得做

课程开篇介绍了生产中的一份报告：agent 有时 3 秒回答，有时却要 30 秒。日志只有模型调用，没有别的信息。原因是一个工具服务器在冷启动时卡住了，只有端到端追踪才能显示出来。

### HTTP 服务器

可流式传输的 HTTP 支持标准请求头。客户端注入 `traceparent`，服务器在该父级下创建 span。客户端的调用是在 `execute_tool` span 下的 CLIENT span，服务器的工作也属于同一 trace。两者的时间间隙是传输耗时。

### stdio 服务器

stdio 不携带 HTTP 请求头。协议路线图讨论了 JSON-RPC 调用上的 `_meta.traceparent` 字段。正式提供前，自行在每个请求的 `_meta` 中加入 `traceparent` 值，让服务器从中读取。服务器记录 trace ID，便于日后关联日志行与 span。

### 各服务器如何处理上下文

1. 从请求头或 `_meta` 解析上下文。
2. 在该上下文下创建子 span，而不是新 trace。
3. 在该请求的每条日志中写入 trace ID。
4. 调用其他服务时继续传播上下文。

### 最终能看到什么

一张瀑布图串起 agent 步骤、工具调用和服务器工作。卡顿会显示为长 client span 下的长 server span。除了 span，还要按工具输出执行时长直方图，不必查具体 trace 就能回答看板上的问题。

## Follow-ups

- **Level 3:** 服务器忽略 `_meta` 字段，trace 中会看到什么？ Expected: 服务器工作单独成为一条 trace，或完全不可见。client span 显示耗时，却显示不了时间花在哪。
- **Level 3:** 哪个 span 记录卡顿，client 还是 server？ Expected: 两者都记录。client span 显示 agent 一侧的等待，server span 显示服务器所做的事，两者的间隙是传输耗时。
- **Level 4:** 某工具服务器由另一团队运维，你要求他们承诺什么？ Expected: 从请求头或 `_meta` 接收上下文，延续 trace 而不新建，记录 trace ID，并将 span 导出到双方可读的后端。

## Wrong answers

- "记录请求 ID，之后再拼接日志。" 请求 ID 没有父子结构，也没有耗时信息，trace 两者都有。
- "stdio 服务器在本地，不需要追踪。" 课程中的卡顿就发生在本地服务器冷启动时。本地不等于快。
- "将 trace ID 放进 prompt，让模型传递。" 模型不是传输通道，prompt 中变化的值还会破坏前缀缓存。

## Taught in

[OpenTelemetry GenAI 课程](../../../phases/13-tools-and-protocols/20-opentelemetry-genai/)讲解 MCP 各传输方式的上下文传播及工具耗时指标。
