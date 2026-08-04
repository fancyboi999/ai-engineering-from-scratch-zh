# OpenTelemetry GenAI——端到端追踪工具调用

> 一个 agent 调用五个工具、三个 MCP server 和两个子 agent。你需要贯穿这一切的一条 trace。OpenTelemetry GenAI 语义约定（属性自 v1.37 起稳定）是 2026 年的标准，被 Datadog、Langfuse、Arize Phoenix、OpenLLMetry 和 AgentOps 原生支持。本课点名必需属性、走一遍 span 层级（agent → LLM → tool），并交付一个能接进任意 OTel exporter 的标准库 span 发射器。

**类型：** Build
**语言：** Python（标准库，OTel span 发射器）
**前置要求：** 阶段 13 · 07（MCP server）、阶段 13 · 08（MCP client）
**预计时间：** ~75 分钟

## 学习目标

- 点名一个 LLM span 和一个工具执行 span 的必需 OTel GenAI 属性。
- 构建一个覆盖 agent 循环、LLM 调用、工具调用和 MCP client 分发的 trace 层级。
- 决定捕获什么内容（选择加入）vs 脱敏什么（默认）。
- 不重写工具代码就把 span 发到一个本地 collector（Jaeger、Langfuse）。

## 问题背景

2026 年 2 月的一次调试：用户报告"我的 agent 有时要 30 秒才响应；其他时候 3 秒"。没有 trace。日志显示了 LLM 调用，但没有工具分发、没有 MCP server 来回、没有子 agent。你猜。最终你查到：一个 MCP server 偶尔在冷启动上卡住。

没有端到端追踪，你找不到这个。OTel GenAI 修掉它。

这些约定在 2025-2026 年于 OpenTelemetry 语义约定组下定型。它们定义稳定的属性名，让 Datadog、Langfuse、Phoenix、OpenLLMetry 和 AgentOps 都解析同样的 span。埋点一次；发往任意后端。

## 核心概念

### span 层级

```
agent.invoke_agent  (顶层, INTERNAL span)
 ├── llm.chat       (CLIENT span)
 ├── tool.execute   (INTERNAL)
 │    └── mcp.call  (CLIENT span)
 ├── llm.chat       (CLIENT span)
 └── subagent.invoke (INTERNAL)
```

整个东西嵌套在一个 trace id 下。span id 链起父子关系。

### 必需属性

按 2025-2026 的 semconv：

- `gen_ai.operation.name`——`"chat"`、`"text_completion"`、`"embeddings"`、`"execute_tool"`、`"invoke_agent"`。
- `gen_ai.provider.name`——`"openai"`、`"anthropic"`、`"google"`、`"azure_openai"`。
- `gen_ai.request.model`——请求的模型字符串（如 `"gpt-4o-2024-08-06"`）。
- `gen_ai.response.model`——实际服务的模型。
- `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens`。
- `gen_ai.response.id`——供关联的 provider 响应 id。

对工具 span：

- `gen_ai.tool.name`——工具标识符。
- `gen_ai.tool.call.id`——那个特定的调用 id。
- `gen_ai.tool.description`——工具描述（可选）。

对 agent span：

- `gen_ai.agent.name` / `gen_ai.agent.id` / `gen_ai.agent.description`。

### span 种类

- 跨进程边界的调用（LLM provider、MCP server）用 `SpanKind.CLIENT`。
- agent 自己的循环步骤和工具执行用 `SpanKind.INTERNAL`。

### 选择加入的内容捕获

默认情况下，span 携带的是度量和计时——不是 prompt 或补全。大载荷和 PII 默认关闭。设 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 和特定的内容捕获环境变量来纳入内容。在生产里启用前仔细审查。

### span 上的事件

token 级事件可作为 span 事件加上：

- `gen_ai.content.prompt`——输入消息。
- `gen_ai.content.completion`——输出消息。
- `gen_ai.content.tool_call`——记录下来的工具调用。

事件在一个 span 内按时间排序，供详细重放。

### exporter

OTel span 导出到：

- **Jaeger / Tempo。** 开源，本地部署。
- **Langfuse。** LLM 可观测性专用；可视化 token 用量。
- **Arize Phoenix。** evals + 追踪合一。
- **Datadog。** 商业；原生解析 `gen_ai.*` 属性。
- **Honeycomb。** 列式；查询友好。

都说 OTLP 这个线上格式。你的代码不在乎。

### 跨 MCP 的传播

当一个 MCP client 调一个 server 时，把 W3C traceparent 头注入请求。Streamable HTTP 支持标准头。stdio 原生不携带 HTTP 头；规范的 2026 路线图讨论在 JSON-RPC 调用上加一个 `_meta.traceparent` 字段。

在那个落地之前：手动把 traceparent 放进每个请求的 `_meta` 里。server 记录 trace id。

### 度量

在 span 之外，GenAI semconv 定义了度量：

- `gen_ai.client.token.usage`——直方图。
- `gen_ai.client.operation.duration`——直方图。
- `gen_ai.tool.execution.duration`——直方图。

把这些用于不需要每调用细节的仪表盘。

### AgentOps 层

AgentOps（2024 年创立）专注于 GenAI 可观测性。它包住流行框架（LangGraph、Pydantic AI、CrewAI），自动发出 OTel span。如果你的栈用一个受支持框架就有用；否则用手动埋点。

```figure
t3-span-waterfall
```

## 实际使用

`code/main.py` 为一个调用一个 LLM、分发两个工具、做一次 MCP 来回的 agent，往 stdout 发出 OTel 形状的 span（以类 OTLP-JSON 的格式）。没有真实 exporter——本课聚焦于 span 形状和属性集。把输出粘进一个 OTLP 兼容查看器，或者就直接读它。

要看什么：

- trace id 在所有 span 间共享。
- 父子链接经由 `parentSpanId` 编码。
- 必需的 `gen_ai.*` 属性都填了。
- 内容捕获默认关闭；一个场景经由环境变量把它打开。

## 拿去用

本课产出 `outputs/skill-otel-genai-instrumentation.md`。给定一个 agent 代码库，这个 skill 产出一份埋点计划：在哪里加 span、填哪些属性，以及瞄准哪些 exporter。

## 练习

1. 跑 `code/main.py`。数 span，识别哪个是 CLIENT、哪个是 INTERNAL。

2. 打开内容捕获（环境变量），确认 `gen_ai.content.prompt` 和 `gen_ai.content.completion` 事件出现。注意对 PII 的影响。

3. 加上工具执行度量 `gen_ai.tool.execution.duration`，每个调用发出一个直方图样本。

4. 把一个 traceparent 从父 agent span 传播到一个 MCP 请求的 `_meta.traceparent` 字段。验证 MCP server 会看到同一个 trace id。

5. 读 OTel GenAI semconv 规范。找出 semconv 里列了、而本课代码没发出的一个属性。把它加上。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| OTel | "OpenTelemetry" | trace、metric、log 的开放标准 |
| GenAI semconv | "GenAI 语义约定" | LLM / tool / agent span 的稳定属性名 |
| `gen_ai.*` | "属性命名空间" | 所有 GenAI 属性共享这个前缀 |
| Span | "计时操作" | 一个带起、止和属性的工作单位 |
| Trace | "跨 span 的谱系" | 共享一个 trace id 的 span 树 |
| SpanKind | "CLIENT / SERVER / INTERNAL" | 关于 span 方向的提示 |
| OTLP | "OpenTelemetry Line Protocol" | exporter 的线上格式 |
| Opt-in content | "prompt / 补全捕获" | 默认关闭；环境变量启用 |
| traceparent | "W3C 头" | 跨服务传播 trace 上下文 |
| Exporter | "后端特定的投递器" | 把 span 发到 Jaeger / Datadog 等的组件 |

## 延伸阅读

- [OpenTelemetry — GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — GenAI span、metric 和 event 的权威约定
- [OpenTelemetry — GenAI spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) — LLM 和工具执行 span 的属性列表
- [OpenTelemetry — GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) — agent 层的 `invoke_agent` span
- [open-telemetry/semantic-conventions — GenAI spans](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md) — GitHub 托管的事实标准
- [Datadog — LLM OTel semantic convention](https://www.datadoghq.com/blog/llm-otel-semantic-convention/) — 生产集成讲解
