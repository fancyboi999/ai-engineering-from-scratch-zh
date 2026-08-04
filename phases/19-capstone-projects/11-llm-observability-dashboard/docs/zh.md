# 顶点项目 11 —— LLM 可观测性与评测看板

> Langfuse 走了 open-core。Arize Phoenix 发布了 2026 GenAI semconv 映射。Helicone 和 Braintrust 都在逐用户成本归因上加注。Traceloop 的 OpenLLMetry 成了事实上的 SDK 埋点。生产形态是 trace 用 ClickHouse、元数据用 Postgres、UI 用 Next.js，再加一小队跑在采样 trace 上的评测作业（DeepEval、RAGAS、LLM-judge）。自托管做一个出来，从至少四个 SDK 家族摄入，并演示在五分钟内抓到一个注入的回归。

**类型：** Capstone
**语言：** TypeScript（UI）、Python / TypeScript（摄入 + 评测）、SQL（ClickHouse）
**前置要求：** 第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 17 阶段（基础设施）、第 18 阶段（安全）
**涉及阶段：** P11 · P13 · P17 · P18
**预计时间：** 25 小时

## 问题背景

2026 年每个跑生产流量的 AI 团队都在模型旁边备着一个可观测性平面。成本归因。幻觉检测。漂移监控。越狱信号。SLO 看板。PII 泄漏告警。开源参考——Langfuse、Phoenix、OpenLLMetry——都收敛到了把 OpenTelemetry GenAI 语义约定当作摄入 schema。你现在能用一个 SDK 给 OpenAI、Anthropic、Google、LangChain、LlamaIndex、vLLM 埋点，并发出兼容的 span。

你将做一个自托管看板，从至少四个 SDK 家族摄入，在采样 trace 上跑一小组评测作业，检测漂移并告警。衡量线：给定一个故意注入的回归（一个开始产出 PII 的 prompt），看板要在五分钟内抓到它并发出告警。

## 核心概念

摄入走 OTLP HTTP。SDK 产出 GenAI-semconv 的 span：`gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`、`gen_ai.response.id`、`llm.prompts`、`llm.completions`。span 落进 ClickHouse 做列式分析；元数据（用户、会话、应用）落进 Postgres。

评测以批作业的形式跑在采样 trace 上。DeepEval 给忠实度、毒性、答案相关性打分。当 trace 带检索上下文时，RAGAS 给检索指标打分。自定义的 LLM-judge 跑领域专属检查（PII 泄漏、违策略响应）。评测运行写回同一个 ClickHouse，作为链到父 trace 的评测 span。

漂移检测随时间盯 embedding 空间分布（prompt embedding 上的 PSI 或 KL 散度）加评测分趋势。告警喂给 Prometheus Alertmanager，再到 Slack / PagerDuty。UI 是 Next.js 15 配 Recharts。

## 架构

```
production apps:
  OpenAI SDK  +  Anthropic SDK  +  Google GenAI SDK
  LangChain + LlamaIndex + vLLM
       |
       v
  OpenTelemetry SDK with GenAI semconv
       |
       v  OTLP HTTP
  collector (ingest, sample, fan-out)
       |
       +-------------+-----------+
       v             v           v
   ClickHouse    Postgres    S3 archive
   (spans)       (metadata)  (raw events)
       |
       +---> eval jobs (DeepEval, RAGAS, LLM-judge)
       |     sampled or all-trace
       |     write eval spans back
       |
       +---> drift detector (PSI / KL on prompt embeddings)
       |
       +---> Prometheus metrics -> Alertmanager -> Slack / PagerDuty
       |
       v
   Next.js 15 dashboard (Recharts)
```

## 技术栈

- 摄入：OpenTelemetry SDK + GenAI 语义约定；OTLP HTTP 传输
- 收集器：带 tail-sampling 处理器的 OpenTelemetry Collector（用于成本控制）
- 存储：span 用 ClickHouse，元数据用 Postgres，原始事件归档用 S3
- 评测：DeepEval、RAGAS 0.2、Arize Phoenix 评测器包、自定义 LLM-judge
- 漂移：每周在池化 prompt embedding（sentence-transformers）上算 PSI / KL
- 告警：Prometheus Alertmanager -> Slack / PagerDuty
- UI：Next.js 15 App Router + Recharts + server actions
- 开箱支持的 SDK：OpenAI、Anthropic、Google GenAI、LangChain、LlamaIndex、vLLM

```figure
ce-otel-drift
```

## 动手构建

1. **收集器配置。** OpenTelemetry Collector，带 OTLP HTTP receiver、一个保留 100% 出错 trace 和 10% 成功 trace 的 tail-sampler，以及到 ClickHouse 和 S3 的 exporter。

2. **ClickHouse schema。** 表 `spans`，列对应 GenAI semconv：`gen_ai_system`、`gen_ai_request_model`、`input_tokens`、`output_tokens`、`latency_ms`、`prompt_hash`、`trace_id`、`parent_span_id`，外加给长 payload 的 JSON 袋。加按 user_id 和 app_id 的二级索引。

3. **SDK 覆盖测试。** 用每个 SDK（OpenAI、Anthropic、Google、LangChain、LlamaIndex、vLLM）写一个小客户端应用，带 OpenLLMetry 自动埋点。验证每个都产出落进 ClickHouse 的标准 GenAI span。

4. **评测作业。** 一个定时作业读最近 15 分钟的采样 trace，跑 DeepEval 的忠实度、毒性、答案相关性。输出是链到父 trace 的评测 span。

5. **自定义 LLM-judge。** 一个 PII 泄漏评委：给定一个响应，调一个 guard LLM 给 PII 泄漏的可能性打分。高分响应落进一个分诊队列。

6. **漂移检测。** 每周作业算本周池化 prompt embedding 跟前 4 周基线之间的 PSI。若 PSI 超阈值，告警。

7. **看板。** Next.js 15，页面有：总览（spans/秒、成本/用户、p95 延迟）、trace（搜索 + 瀑布图）、评测（忠实度趋势、毒性）、漂移（PSI 随时间）、告警。

8. **告警链。** Prometheus exporter 读评测分聚合和延迟百分位；Alertmanager 把警告路由到 Slack、把严重违例路由到 PagerDuty。

9. **回归探针。** 注入一个 bug：被评测的聊天机器人开始 1% 的概率泄漏假 SSN。衡量 MTTR：从 bug 部署到 Slack 告警。

## 实际使用

```
$ curl -X POST https://my-otel-collector/v1/traces -d @trace.json
[collector]  accepted 1 trace, 3 spans
[clickhouse] inserted 3 spans (app=chat, user=u_42)
[eval]       DeepEval faithfulness 0.82, toxicity 0.03
[drift]      weekly PSI 0.08 (below 0.2 threshold)
[ui]         live at https://obs.example.com
```

## 拿去用

`outputs/skill-llm-observability.md` 是交付物。给定一个 LLM 应用，看板摄入它的 trace、跑评测、对漂移告警，并在 Next.js 里呈现成本/用户拆分。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | trace schema 覆盖 | 产出标准 GenAI span 的 SDK 家族数（目标：6+） |
| 20 | 评测正确性 | DeepEval / RAGAS 分数 vs 手工标注集 |
| 20 | 看板体验 | 注入回归上的 MTTR（目标 5 分钟以内） |
| 20 | 成本 / 规模 | 1k spans/秒下持续摄入且不积压 |
| 15 | 告警 + 漂移检测 | Prometheus/Alertmanager 链端到端跑通 |
| **100** | | |

## 练习

1. 给 Haystack 框架加自定义埋点。验证标准 span 带忠实的 `gen_ai.*` 属性落进 ClickHouse。

2. 在同一批 trace 上把 DeepEval 换成 Phoenix 评测器。衡量两个评测引擎之间的分数漂移。

3. 把漂移检测器磨锋利：按 app-id 而不是全局算 PSI。展示逐应用的漂移轨迹。

4. 加一个“用户影响”页面：带迷你折线图的逐用户成本和逐用户失败率。

5. 搭一个 tail-sampling 策略，保留 100% 毒性 > 0.5 的 trace 加其余的 10% 分层采样。衡量引入的采样偏差。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| GenAI semconv | “OTel LLM 属性” | 2025 OpenTelemetry 关于 LLM span 属性的规范（system、model、tokens） |
| Tail sampling（尾采样） | “事后采样” | 收集器在 trace 完成后再决定保留还是丢弃（能偷看错误） |
| PSI | “群体稳定性指数” | 比较两个分布的漂移指标；> 0.2 通常意味着有意义的漂移 |
| LLM-judge | “模型即评测” | 一个 LLM 按某套标准给另一个 LLM 的输出打分（忠实度、毒性、PII） |
| Tail-sampling policy（尾采样策略） | “保留规则” | 决定哪些 trace 留、哪些丢的规则；出错 + 采样率 |
| Eval span（评测 span） | “链接的评测 trace” | 携带评测分、链到原始 LLM 调用 span 的子 span |
| Cost per user（每用户成本） | “单位经济” | 在一个时间窗内归因到某 user_id 的美元成本；关键产品指标 |

## 延伸阅读

- [Langfuse](https://github.com/langfuse/langfuse) —— 参考级 open-core 可观测性平台
- [Arize Phoenix](https://github.com/Arize-ai/phoenix) —— 漂移支持很强的备选参考
- [OpenLLMetry (Traceloop)](https://github.com/traceloop/openllmetry) —— 自动埋点 SDK 家族
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) —— 摄入 schema
- [Helicone](https://www.helicone.ai) —— 备选托管可观测性
- [Braintrust](https://www.braintrust.dev) —— 备选的评测优先平台
- [ClickHouse documentation](https://clickhouse.com/docs) —— 列式 span 存储
- [DeepEval](https://github.com/confident-ai/deepeval) —— 评测器库
