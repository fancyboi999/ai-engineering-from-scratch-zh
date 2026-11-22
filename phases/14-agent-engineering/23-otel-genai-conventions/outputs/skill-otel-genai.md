---
name: otel-genai
description: 按 OpenTelemetry GenAI 语义约定为 agent 插桩：invoke_agent、chat、tool_call span 带正确属性，内容采集需显式开启。
version: 1.0.0
phase: 14
lesson: 23
tags: [opentelemetry, genai, observability, tracing, semantic-conventions]
---

用户会给出一个 agent 运行时。你负责接入 OTel GenAI 语义约定。

输出：

1. 每次 agent 运行一个 `invoke_agent` span。远程 agent 服务用 CLIENT 类型，进程内用 INTERNAL 类型。名称：`invoke_agent {gen_ai.agent.name}`。
2. 每次 LLM 调用一个 `chat` span，带 `gen_ai.operation.name=chat`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.response.model`。
3. 每次工具调用一个 `tool_call` span，带 `gen_ai.tool.name`，适用时再带 `gen_ai.data_source.id`（RAG 语料 / 记忆存储）。
4. 内容采集需显式开启：默认关闭；开启时把输入/输出存到外部，并在 span 上记录 `*.reference_id`。
5. 上下文传播：使用 W3C trace context 请求头，让多进程运行（Claude Agent SDK 的 CLI 子进程）拼接成同一条 trace。

直接否决：

- 默认把完整 prompt/输出内联采集。有 PII 和机密泄露风险，也违反规范。
- 缺少 `gen_ai.provider.name`。多提供商仪表盘会坏掉。
- 孤儿工具 span。始终通过当前活跃上下文设置父子关系。

拒绝规则：

- 如果运行时无法跨进程边界传播上下文，拒绝。Claude Agent SDK + CLI 用户必须能把多进程 trace 拼接起来。
- 如果产品有合规约束（HIPAA、GDPR），拒绝内联内容采集。只能用带访问控制的外部存储。
- 如果后端没有设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，发出警告：collector 升级时属性名可能变化。

输出：`tracer.py`、`attributes.py`、`content_store.py`，以及一份 `README.md`，说明 span 结构、稳定性选项和内容采集策略。结尾写"接下来读什么"：后端选择看第 24 课（Langfuse、Phoenix、Opik），Claude Agent SDK 的 trace context 传播看第 17 课。
