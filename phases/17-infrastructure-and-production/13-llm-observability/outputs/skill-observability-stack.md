---
name: observability-stack
description: 根据技术栈、规模、预算和许可证要求，选择 LLM 可观测性方案（开发平台 + 网关 + 可选的规模层），并定义 OpenTelemetry GenAI 属性集。
version: 1.0.0
phase: 17
lesson: 13
tags: [observability, langfuse, langsmith, phoenix, arize, helicone, opik, opentelemetry, genai-conventions]
---

给定技术栈（LangChain / DSPy / 原生 SDK）、规模（每天的 trace 数）、预算、许可证要求（只能用 MIT 还是可以用商业产品）和自托管需求，制定可观测性方案。

输出以下内容：

1. 开发平台选择。Langfuse（开源）、LangSmith（LangChain 优先的商业产品）、Opik（Comet 开源）或不用。用技术栈和许可证说明理由。
2. 网关/遥测选择。Helicone（代理 + 网关）、SigNoz（完整 APM）、OpenLLMetry（纯 OTel）。如果已经在用 AI 网关（阶段 17 · 19），写明集成方式。
3. 规模/数据湖层。可选；长期分析用 Arize AX 或原始 Iceberg，RAG 漂移用 Phoenix。
4. OTel GenAI 规范。写明最小属性集：`gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens`、`gen_ai.request.temperature`、`gen_ai.response.finish_reasons`，再加上组织自己的字段（tenant_id、user_id、task）。
5. 采样策略。错误 100% 采样，高成本调用（>$0.10/次）100% 采样，成功请求按 N% 采样。原始数据保留窗口（14 天 / 30 天 / 90 天）。聚合数据保留更久。
6. 告警。必须配告警的五个指标：错误率、P99 TTFT、单请求成本、prompt 缓存命中率、拒答率。

直接否决：
- 在特定框架的 SDK 里埋点却没有 OTel 兜底。拒绝。这会被框架锁定。
- 对不受监管的负载，以 Datadog 级别、每月超过 $500 的价格保留 100% trace。拒绝，建议采样。
- 忽略 OpenTelemetry GenAI 规范。拒绝。2026 年的互通性离不开它。

拒绝规则：
- 如果每天 trace 数 > 5M，团队还坚持在 Datadog 全量保留，没有成本预测就拒绝。
- 如果团队只能用 MIT 许可却选了 LangSmith，拒绝。Langfuse 是对应的 MIT 方案。
- 如果团队没有 AI 网关，并选 Helicone 同时当网关和可观测性工具，可以接受。在约 500 RPS 以内，这个代理可以兼做网关（网关扩展见阶段 17 · 19）。

输出：一页方案，写明开发平台、网关、规模层（如有）、OTel 属性集、采样规则和五个告警。最后给出唯一的方案漂移信号指标：最近 7 天内带完整 OTel GenAI 属性的 LLM 调用占比。
