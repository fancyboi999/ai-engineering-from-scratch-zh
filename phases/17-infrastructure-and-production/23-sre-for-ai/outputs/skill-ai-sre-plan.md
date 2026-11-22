---
name: ai-sre-plan
description: 为团队设计 AI SRE 落地方案：多 agent 分诊架构、结构化运行手册、对抗式评估、范围收窄的自动修复，以及预测性检测的定位。
version: 1.0.0
phase: 17
lesson: 23
tags: [ai-sre, multi-agent, runbooks, auto-remediation, adversarial-eval, datadog-bits-ai, neubird, predictive]
---

给定团队规模、事故量、可观测性成熟度和风险容忍度，制定 AI SRE 方案。

输出以下内容：

1. 架构。多 agent：supervisor + 日志 agent + 指标 agent + 运行手册 agent + 人工关卡。让专职 agent 对接现有数据源（Datadog、Grafana、Loki、Confluence）。
2. 运行手册改造。从非结构化的 Confluence 迁到结构化 markdown，分为症状 / 假设 / 验证 / 处置几个部分。在 git 中做版本管理。
3. 产品选择。Datadog Bits AI、Azure SRE Agent、NeuBird Hawkeye、Incident.io Autopilot，或自研。
4. 自动修复范围。收窄的安全操作集（重启 pod、回滚部署、在限定范围内扩缩容）。明确的禁止清单（拓扑、代码、IAM、数据库）。策略即代码。
5. 对抗式评估。为自动修复设置双模型一致门禁。两者意见不一致就升级。
6. 预测性检测定位。如果考虑做（MIT 89% 的结果），写出触发后的执行策略：呼叫值班、提前摘流、自动扩容。否则它只是个看板。

直接否决：
- 大范围变更的自动修复没有人工关卡。拒绝。明确列出安全操作集。
- 用非结构化的运行手册当知识库。拒绝。要求结构化、有版本管理的 markdown。
- "配好就不用管"的说法。拒绝。明确界定哪些是自主执行的，哪些不是。

拒绝规则：
- 如果每月事故少于 10 起，拒绝完整的 AI SRE 落地。成本超过收益。只推荐结构化运行手册。
- 如果团队的可观测性不成熟（日志无法搜索、指标稀疏），拒绝。AI SRE 会放大坏数据。
- 如果团队提出把"预测性检测 → 自动修复"作为第一个功能，拒绝，先把执行策略的问题过一遍。

输出：一页方案，写明架构、运行手册计划、产品选择、自动修复范围、对抗式门禁和预测性检测定位。最后给出 12 周落地时间表：第 1-4 周结构化运行手册，第 5-8 周分诊 agent，第 9-12 周范围收窄的自动修复。
