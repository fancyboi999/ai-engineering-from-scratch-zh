---
id: dev-platform-or-telemetry-tool
title: 选一套不被锁定的可观测技术栈
card: production-mlops
kind: tradeoff
level: 3
roles: [ai-evaluation-reliability-engineer, inference-engineer, ai-data-engineer]
rounds: [system-design, design-review]
tags: [observability, opentelemetry, evals, vendor-lock-in]
minutes: 12
lessons: [phases/17-infrastructure-and-production/13-llm-observability, phases/14-agent-engineering/24-agent-observability-platforms]
manuals: []
practice: []
cheatsheet: [genai-observability]
related: [production-mlops/keep-every-error-trace, production-mlops/five-minute-detection]
updated: 2026-11-03
---

团队要为一个新的模型服务选可观测技术栈。一半人想要一站式平台，带评估、prompt 版本和会话回放。另一半人想要一个薄网关，只记录每次调用，别的什么都不做。你怎样决定？哪种模式能让你不必二选一？

## Short answer

按四个维度决定：你用的框架、你能接受的许可证、预算，以及是否必须自托管。打包式开发平台适合频繁迭代 prompt、需要评估与 trace 绑定的团队。网关或遥测工具适合需要可移植、不依赖框架的埋点的团队。不必二选一的模式是：每次调用都按 GenAI 规范输出 OpenTelemetry span，并发往不止一个地方：网关看日常，评估平台查回归，归档做长期分析。

## Full answer

### 两类工具

开发平台把可观测性和评估、prompt 管理、数据集版本、会话回放打包在一起。你可以跑实验、比较 prompt，并让新 prompt 与以前胜出的版本做回归测试。网关和遥测工具记录 prompt、回复、token、延迟、模型和成本，到此为止。

### 四个维度

| 维度 | 问题 |
|---|---|
| 技术栈 | 一个框架、直接用 SDK，还是多家供应商 |
| 许可证 | 只用开源、源码可用许可证，还是商业许可 |
| 预算 | 免费额度、团队套餐，还是企业合同 |
| 自托管 | 必须、欢迎，还是绝不 |

### 陷阱

在 agent 框架内部埋点，trace 就和这个框架绑在一起。在 HTTP 或 SDK 层埋点是可移植的，换框架或加第二个框架都不会丢失历史。

### 粘合模式

1. 每次模型调用都按 GenAI 规范输出 OpenTelemetry span。
2. 把它们路由到网关或遥测工具，用于日常查看。
3. 复制一份发给评估平台，用于查回归。
4. 归档到数据湖，用于长期分析。

所有读得懂这套规范的工具都能读同一批 span，所以技术栈只是一个路由决定，而不是一次重写。

### 无论选哪条路都要坚持的事

- prompt 版本与 trace 绑定。生产退化时，你必须能二分定位到引发它的那次 prompt 改动。
- 有评估策略。没有评估的 tracing 只是昂贵的日志。
- 规模上来后要有采样策略，因为大流量下全量保留比它记录的调用本身还贵。

## Follow-ups

- **Level 3:** 为什么在 SDK 层埋点，而不是在框架内部？ Expected: 框架钩子把你绑在框架上。SDK 层在你换框架或加第二个框架时照样能用。
- **Level 3:** prompt 版本不与 trace 绑定，会坏在哪里？ Expected: 生产退化时，你无法二分定位到引发它的那次 prompt 改动。
- **Level 4:** 你把同一批 span 发给两个后端。要检查什么才能让两边一致？ Expected: 规范版本相同，两个 exporter 的采样规则相同，成本归属只有一个事实来源，这样两个看板不会显示两份账单。

## Wrong answers

- "选功能最多的工具。" 用不上的功能既花钱又带来耦合。按技术栈、许可证、预算和托管方式来选。
- "有 tracing 就够了，评估以后再说。" 没有评估的 trace 就是标了价的日志。退化藏在里面，直到用户报告才被发现。
- "网关记录了每次调用，所以不需要平台。" 代理看到的是调用，看不到 agent 的步骤和会话。agent 退化需要的多步 trace，它会漏掉。

## Taught in

[可观测技术栈课程](../../../phases/17-infrastructure-and-production/13-llm-observability/)给出两类工具、四个维度和粘合模式，[agent 可观测性课程](../../../phases/14-agent-engineering/24-agent-observability-platforms/)警告不要只做 tracing 不做评估。
