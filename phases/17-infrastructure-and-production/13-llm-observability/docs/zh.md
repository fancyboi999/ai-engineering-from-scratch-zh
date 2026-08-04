# LLM 可观测性栈选型

> 2026 年的可观测性市场分成两类。开发平台（LangSmith、Langfuse、Comet Opik）把监控和 eval、prompt 管理、会话回放捆在一起。网关/埋点工具（Helicone、SigNoz、OpenLLMetry、Phoenix）专注遥测。Langfuse 内核是 MIT 许可、OSS 平衡很强（云端每月免费 50K 事件）。Phoenix 是 OpenTelemetry 原生、采用 Elastic License 2.0 —— 在漂移/RAG 可视化上很出色，但不是个持久化的生产后端。Arize AX 用零拷贝的 Iceberg/Parquet 集成，宣称比单体式可观测性便宜 100 倍。LangSmith 对 LangChain/LangGraph 领先，$39/用户/月，仅企业版可自托管。Helicone 基于代理，15-30 分钟接入，每月免费 100K 请求，但对 agent trace 的深度较弱。常见生产模式：网关（Helicone/Portkey）+ eval 平台（Phoenix/TruLens），用 OpenTelemetry 粘在一起。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 trace 采样模拟器）
**前置要求：** 阶段 17 · 08（推理指标）、阶段 14（Agent 工程）
**预计时间：** ~60 分钟

## 学习目标

- 区分开发平台（捆绑式：eval + prompt + 会话）和网关/遥测工具（只有 trace + 指标）。
- 把六个主要工具（Langfuse、LangSmith、Phoenix、Arize AX、Helicone、Opik）对应到它们的许可、定价和最佳适用用例。
- 解释那个让你能把一个网关工具和一个独立 eval 平台组合起来的 OpenTelemetry 粘合模式。
- 说出 2026 年的成本差异点（Arize AX 的零拷贝方式 vs 单体式摄入），并给出大致的 100 倍乘数。

## 问题背景

你交付了一个 LLM 特性。它能用。你对 prompt 失败、工具死循环、延迟回退、成本尖峰或 prompt 缓存命中率毫无可见性。你 Google "LLM observability"，得到八个工具，全都声称在三个不同价位上解决同一个问题。

它们不解决同一个问题。LangSmith 回答"这次 LangGraph 跑为什么失败？"Phoenix 回答"我的 RAG 流水线在漂移吗？"Helicone 回答"哪个应用在烧 token？"Langfuse 回答"我能不能把整套自托管？"不同的工具，不同的受众。

挑选涉及四个维度：栈（LangChain？裸 SDK？多厂商？）、许可容忍度（只接受 MIT？Elastic 可以？商用没问题？）、预算（免费档？$100/月？$1000/月？）、自托管（必须？锦上添花？永不？）。

## 核心概念

### 两类

**开发平台** 把可观测性和 eval、prompt 管理、数据集版本化、会话回放捆在一起。你跑实验、看哪个 prompt 起了作用、用新 prompt 对老赢家做数据集回归。LangSmith、Langfuse、Comet Opik。

**网关/遥测工具** 给推理调用埋点 —— prompt、响应、token、延迟、模型、成本。Helicone、SigNoz、OpenLLMetry、Phoenix。极简。可以经由 OpenTelemetry 和一个独立 eval 工具组合。

### Langfuse —— OSS 平衡

- 内核 Apache / MIT 许可；经由 Docker 自托管。
- 云端免费档：每月 50K 事件。付费：团队版 $29/月。
- eval、prompt 管理、trace、数据集。四项开发平台特性都覆盖得还算合理。
- 最佳适用点：你想要 LangSmith 级特性，但必须自托管或留在 OSS 许可上。

### Phoenix（Arize）—— 遥测优先、OpenTelemetry 原生

- Elastic License 2.0；自托管很简单。
- 在 RAG 和漂移可视化上很出色。嵌入空间散点图作为一等特性发布。
- 不是设计成持久化生产后端 —— 主要是开发期可观测性。
- 最佳适用点：RAG 流水线开发、漂移调试，生产上配一个独立网关。

### Arize AX —— 规模化打法

- 商用。经由 Iceberg/Parquet 的零拷贝数据湖集成。
- 宣称在规模上比单体式可观测性（Datadog 级）便宜约 100 倍。账是这么算的：你把 trace 存在自己 S3 上的 Parquet 里；Arize 直接读。
- 最佳适用点：每天 >1000 万 trace、已有数据湖、想要 LLM 专属仪表盘但不想要 Datadog 的价格。

### LangSmith —— LangChain/LangGraph 优先

- 商用，$39/用户/月。仅企业版可自托管。
- 对 LangChain 和 LangGraph 栈是同类最佳。如果你不在这两者上，它就没那么有吸引力。
- 最佳适用点：团队押注 LangChain、愿意付费。

### Helicone —— 基于代理的最小可用

- 把你的 `OPENAI_API_BASE` 换成 Helicone 代理，15-30 分钟接入。
- MIT 许可；每月免费 100K 请求，付费 $20/月起。
- 含故障转移、缓存、限流 —— 也充当网关。
- 对 agent / 多步 trace 的深度较弱。
- 最佳适用点：快速起步、单栈应用、想要网关 + 可观测性二合一。

### Opik（Comet）—— OSS 开发平台

- Apache 2.0，完全 OSS。
- 特性集类似 Langfuse，带 Comet 血统。
- 最佳适用点：已经在用 Comet 的 ML 团队，想在同一个面板里看 LLM 可观测性。

### SigNoz —— OpenTelemetry 优先的全功能 APM

- Apache 2.0。处理通用 APM 外加经由 OpenTelemetry 的 LLM。
- 最佳适用点：跨服务和 LLM 调用的统一可观测性。

### 粘合剂：OpenTelemetry + GenAI 语义约定

OpenTelemetry 在 2025 年底发布了 GenAI 语义约定（`gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`）。消费 OTel 的工具可以互操作。正在涌现的生产模式：

1. 从每个 LLM 调用发出带 GenAI 约定的 OTel。
2. 路由到网关（Helicone / Portkey）做日常。
3. 双发到 eval 平台（Phoenix / Langfuse）做回归。
4. 归档到数据湖（Iceberg），经 Arize AX 或 DuckDB 做长期分析。

### 陷阱：在错误的层埋点

在你的 agent 框架内部埋点（比如加 LangSmith trace）把你和那个框架耦死。在 HTTP/OpenAI-SDK 层埋点（经由 OpenLLMetry 或你的网关）是可移植的。

### 采样 —— 你没法全留

在每天 >100 万请求时，全 trace 留存的成本比 LLM 调用还贵。按规则采样：错误 100%、高成本 100%、成功 5%。永远留聚合值；为长尾留原始数据。

### 你该记住的数字

- Langfuse 免费云端：每月 50K 事件。
- LangSmith：$39/用户/月。
- Helicone 免费：每月 100K 请求。
- Arize AX 宣称：规模上比单体式便宜约 100 倍。
- OpenTelemetry GenAI 约定：2025 年发布，2026 年广泛采用。

```figure
i4-otel-glue
```

## 实际使用

`code/main.py` 跨多种留存策略（100% 摄入、采样、采样 + 错误）模拟一个 100 万 trace 的日子。报告存储成本以及每种策略下丢了什么。

## 拿去用

这一课产出 `outputs/skill-observability-stack.md`。给定栈、规模、预算、许可态度，挑出工具。

## 练习

1. 你在 LangChain 上的团队想要 OSS 自托管的可观测性。在 Langfuse 和 Opik 之间挑一个并论证。
2. 在每天 500 万 trace、Datadog 报价 $150K/月时，算 Arize AX 的盈亏平衡。
3. 设计一套你组织指南应该在每个 LLM 调用上强制的 OpenTelemetry GenAI 属性集。
4. 论证 Phoenix 单独是否足以应对生产。它什么时候不够用？
5. Helicone 是 20ms 的代理开销。在 P99 TTFT 300 ms 时，这可接受吗？如果 SLA 是 100 ms 呢？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| OpenLLMetry | "给 LLM 的 OTel" | 给 LLM 用的开源 OpenTelemetry 埋点 |
| GenAI 约定 | "OTel 属性" | LLM 调用的标准 OTel 属性名 |
| LangSmith | "LangChain 可观测性" | 与 LangChain 生态捆绑的商用平台 |
| Langfuse | "OSS 版 LangSmith" | 特性集类似的 MIT OSS |
| Phoenix | "Arize 开发工具" | OpenTelemetry 原生的开发/eval 平台 |
| Arize AX | "规模化可观测性" | 商用的零拷贝 Iceberg/Parquet 可观测性 |
| Helicone | "代理式可观测性" | 收集 LLM 遥测 + 网关特性的 HTTP 代理 |
| Opik | "Comet LLM" | Comet 出品的 Apache 2.0 OSS 开发平台 |
| 会话回放 | "trace 重跑" | 带工具调用地重放一个完整 agent 会话 |
| Eval | "离线测试" | 在带标注的数据集上跑候选模型/prompt |

## 延伸阅读

- [SigNoz — Top LLM Observability Tools 2026](https://signoz.io/comparisons/llm-observability-tools/)
- [Langfuse — Arize AX Alternative analysis](https://langfuse.com/faq/all/best-phoenix-arize-alternatives)
- [PremAI — Setting Up Langfuse, LangSmith, Helicone, Phoenix](https://blog.premai.io/llm-observability-setting-up-langfuse-langsmith-helicone-phoenix/)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [Arize Phoenix docs](https://docs.arize.com/phoenix)
- [Helicone docs](https://docs.helicone.ai/)
