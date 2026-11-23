---
name: llm-observability
description: 构建自托管的 LLM 可观测性看板：摄取 OpenTelemetry GenAI span、运行评估，并在五分钟内发现注入的回归。
version: 1.0.0
phase: 19
lesson: 11
tags: [capstone, observability, otel, langfuse, phoenix, evals, drift, clickhouse]
---

给定覆盖至少六类 SDK（OpenAI、Anthropic、Google GenAI、LangChain、LlamaIndex、vLLM）的生产 LLM 流量，部署一套自托管的可观测性平台：摄取符合 OTLP GenAI 语义约定的 span、运行评估、检测漂移并发出告警。

构建计划：

1. OpenTelemetry Collector：配置 OTLP HTTP 接收器、尾部采样处理器（错误保留 100%，成功保留 10%，高毒性/含 PII 的保留 100%），导出到 ClickHouse + S3。
2. ClickHouse 的 span schema 对齐 GenAI 语义约定：gen_ai.system、gen_ai.request.model、usage.input/output_tokens、latency_ms、user_id、app_id，另加一个存放 prompt/补全内容的 JSON 字段。
3. 用 Postgres 存元数据：应用、用户、会话、标注队列。
4. 在每类 SDK 的客户端应用上接入 OpenLLMetry 自动埋点；确认标准 span 能正确落库。
5. 在采样后的 trace 上定时运行 DeepEval + RAGAS + Phoenix 评估器组合；为 PII 和偏离策略的情况定制 LLM 裁判。
6. 每周在汇总的 prompt 嵌入上运行 PSI / KL 漂移检测；告警阈值 0.2。
7. Prometheus exporter 导出评估分数汇总和延迟分位数；Alertmanager 把 warning 发到 Slack，critical 发到 PagerDuty。
8. 用 Next.js 15 App Router 做看板：总览、trace 搜索 + 瀑布图、评估趋势、漂移图、告警。
9. 回归探针：注入一种有 1% 概率泄漏假 SSN 的回复模式；测量 MTTD（从部署到告警触发的时间）。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | trace schema 覆盖 | 产出标准 GenAI span 的 SDK 类别数（目标 6+） |
| 20 | 评估正确性 | DeepEval / RAGAS 分数与人工标注集对比 |
| 20 | 看板体验 | 注入回归的 MTTD（目标 5 分钟以内） |
| 20 | 成本 / 规模 | 持续每秒 1k span 摄取且无积压 |
| 15 | 告警 + 漂移检测 | Prometheus/Alertmanager 链路端到端跑通 |

直接否决：

- span schema 自创了 OpenTelemetry GenAI 语义约定里没有的属性名。
- 尾部采样策略丢弃错误（众所周知的反模式）。
- 评估按摄取速率全量运行，不做采样（成本不可接受）。
- 看板显示"延迟"却不区分 p50/p95/p99。

拒绝规则：

- 没有 PII 脱敏策略时，拒绝持久化 prompt 或补全内容。
- 没有逐个 SDK 的标准 span 回归测试，拒绝声称"支持多 SDK"。
- 没有基线窗口时，拒绝交付漂移检测；没有基线的漂移检测毫无用处。

输出：一个仓库，包含 collector 配置、ClickHouse schema、Next.js 15 看板、评估任务、漂移检测器、告警链路、一份带回归标注的 1 万条 trace 演示数据集，以及一份说明文档，记录注入 PII 回归的 MTTD，以及在迭代中让 MTTD 降下来的前三项看板体验改进。
