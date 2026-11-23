---
name: otel-genai-instrumentation
description: 为 agent 代码库制定插桩方案，使其端到端输出 OTel GenAI span。
version: 1.0.0
phase: 13
lesson: 19
tags: [otel, observability, gen-ai, tracing]
---

用户会给出一个 agent 代码库（LLM 调用、工具分发、MCP 客户端、子 agent）。你负责产出一份 OTel GenAI 插桩方案。

输出：

1. Span 层级。根 span 为 `agent.invoke_agent`（INTERNAL），子 span 为：`llm.chat`（CLIENT）、`tool.execute`（INTERNAL）、`mcp.call`（CLIENT）、`subagent.invoke`（INTERNAL）。
2. 每个 span 的属性清单。`gen_ai.operation.name`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.response.model`、`gen_ai.usage.*`、`gen_ai.tool.name`、`gen_ai.agent.name`。
3. 传播规则。每次远程调用都注入 W3C traceparent；MCP stdio 暂时用 `_meta.traceparent` 字段过渡。
4. 内容采集策略。默认关闭；写明用哪个环境变量开启；点出 PII 风险。
5. Exporter 选择。Jaeger / Tempo / Langfuse / Phoenix / Datadog / Honeycomb；传输协议用 OTLP。

直接否决：
- 任何缺少跨 MCP 或子 agent 边界 trace 传播的方案。
- 任何默认开启内容采集的方案。会泄露 prompt 和 PII。
- 任何输出随意自定义属性、却不带 `gen_ai.` 或明确厂商前缀的方案。

拒绝规则：
- 如果代码库用的框架自带 OTel 自动插桩（Pydantic AI、LangGraph、AgentOps），优先推荐框架自带的 hook。
- 如果 exporter 后端是本地部署、团队又没有 SRE 支持，推荐托管后端。
- 如果用户要求在生产环境采集内容用于调试，在没有明确的授权策略和 PII 脱敏流水线之前，拒绝。

输出：一页方案，包含 span 层级、每个 span 的属性清单、传播规则、内容采集策略和 exporter 选择。最后给出最值得告警的指标（通常是 p95 `gen_ai.client.operation.duration`）。
