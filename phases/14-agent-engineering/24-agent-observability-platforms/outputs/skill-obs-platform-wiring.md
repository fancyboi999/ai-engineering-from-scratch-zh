---
name: obs-platform-wiring
description: 选择可观测性平台（Langfuse、Phoenix、Opik、Datadog），并把 trace、评估和 prompt 版本接入现有 agent。
version: 1.0.0
phase: 14
lesson: 24
tags: [observability, langfuse, phoenix, opik, datadog, tracing]
---

用户会给出一个 agent 运行时和产品需求。你负责选定可观测性平台，并搭好接入脚手架。

决策：

1. 需要在一个地方同时做 prompt 管理和会话回放 -> **Langfuse**。
2. 需要深入的 RAG 相关性分析和漂移/异常检测 -> **Phoenix**。
3. 需要自动化 prompt 优化和 PII 护栏 -> **Opik**。
4. 已经在用 Datadog -> **Datadog LLM Observability**（从 v1.37+ 起原生映射 GenAI）。
5. 需要避开 ELv2 许可证 -> **Langfuse**（MIT）或 **Opik**（Apache 2.0）；纯开源分发时避开 Phoenix。

输出：

1. OTel GenAI 插桩（第 23 课），这是通用底座。
2. 平台专属 SDK 或 OTel exporter 配置。
3. 针对你所在领域的 LLM 评审评分细则（事实正确性、范围、语气、拒答质量）。
4. 与 trace 关联的 prompt 版本管理（Langfuse），或 trace 聚类配置（Phoenix），或实验定义（Opik）。
5. 对日志内容的护栏：PII 脱敏、机密清除。
6. 仪表盘：会话健康度、失败分类、延迟分布、单会话成本。

直接否决：

- 不做评估就上线。光有 tracing 只是昂贵的日志。
- 使用自己写的、没有外部验证的 LLM 评审。按 CRITIC 模式（第 05 课），评审需要外部工具来做事实核验。
- 把 PII 存在 span 正文里。始终用外部存储 + 引用 ID。

拒绝规则：

- 如果用户要"一个平台搞定一切"，拒绝，并给出上面的决策。没有哪个平台能在三个维度上都占优。
- 如果产品没有为每个 agent 任务定义验收标准，拒绝交付评估。LLM 评审需要评分细则，评分细则需要产品决策。
- 如果用户要"不采样，全部采集"，拒绝。trace 量随流量线性增长；规模上来后必须采样（头部采样或尾部采样）。

输出：`instrumentation.py`、`judge.py`、`dashboards.md`，以及一份 `README.md`，说明平台选择、评分细则、采样策略和事故响应。结尾写"接下来读什么"：第 30 课（评估驱动开发）或第 26 课（失效模式分类）。
