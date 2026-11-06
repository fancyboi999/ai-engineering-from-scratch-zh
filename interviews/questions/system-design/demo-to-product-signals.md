---
id: demo-to-product-signals
title: 标志着 Demo 演变为产品的核心信号
card: system-design
kind: concept
level: 1
roles: [applied-ai-engineer, ai-developer-relations-engineer, forward-deployed-ai-engineer]
rounds: [system-design, screen]
tags: [demo, product, availability, cost-control]
minutes: 6
lessons: [phases/17-infrastructure-and-production/29-model-demo-interfaces, phases/11-llm-engineering/13-production-app]
manuals: []
practice: []
cheatsheet: [production-llm-app]
related: [system-design/public-demo-controls, system-design/batched-inference-api-budget]
updated: 2026-11-03
---

你为一个模型构建了一个供评审人员体验的轻量 Web Demo。三个月后，一位同事问你它是否已经算得上是“生产级产品”。你如何界定？当答案为“是”时，系统又会发生哪些改变？

## Short answer

Demo 依赖单进程运行，仅在短时间内服务少数熟知的人员。当团队外部成员每周都在使用它、有人提出在线率要求或上报故障中断、用户希望登录或查看历史记录、每周模型调用成本在预算中占有一行，或者输入数据受合同或法律约束时，它就已经演变成了产品。此时，Demo 必须迁移至生产技术栈上，配备用户鉴权、备用模型降级链、分布式链路追踪以及细分到单用户的成本管控。

## Full answer

### 五个信号

- 团队外部人员每周都在持续使用它。
- 有人向你提出服务在线率要求，或者主动上报故障停机。
- 用户提出希望登录账户、保存生成结果或查看历史记录。
- 每周的模型成本成为预算中的一个项目。
- 输入包含受合同或法律约束的数据。

### 演进前后对比

| 属性 | Demo 演示 | 正式产品 |
|---|---|---|
| 用户群体 | 彼此熟知的人员，短时间体验 | 不认识的用户，每天使用 |
| 状态持久化 | 无持久状态 | 账户体系、历史记录、保存的产物 |
| 可用性保证 | 尽力而为，单进程运行 | 书面承诺目标、多副本容灾、值班负责人 |
| 成本管控 | 设置一个每日总消耗上限 | 按用户维度分配配额并核算账单 |
| 可观测性 | 每次请求记录一条简单日志 | 分布式链路追踪、聚合指标与报警联动 |

### Demo 本身已具备的基础能力

一个优秀的 Demo 本就该具备轻量级的控制机制：输入长度限制、按客户端维度的访问限流、全天用量封顶，以及仅记录输入长度、不记录文本的日志。演进为产品级技术栈后，需要在网关处引入真正的鉴权认证、应对模型供应商宕机的备用模型降级链、贯穿各组件的链路追踪，以及细化至单次请求和单用户的成本核算。而输入长度限制和日志隐私策略则平滑继承、保持不变。

### 为什么这一界定至关重要

最危险的状态正是夹在中间的灰色地带：承担着真实业务流量，却依然运行在 Demo 级别的防护手段下。单一的每日总消耗上限无法阻止某个单一租户用光全天预算；单进程服务一旦崩溃，没有任何备用副本可以自动接管。

## Follow-ups

- **Level 1:** 五个信号中哪单项信号说服力最强？ Expected: 收到系统停机故障报告；因为这明确意味着有人已经依赖这个 Demo，并期待它可用。
- **Level 2:** 每周模型成本被正式列入财务预算，哪项机制将取代每日总封顶？ Expected: 按租户或用户维度的细分配额与计费归因，使得整体开销能够按租户独立限制和分摊。
- **Level 2:** 受监管的合规敏感数据开始进入输入端，日志系统必须怎么做？ Expected: 绝不持久化任何输入原始文本与客户端真实 IP 地址，并对审计记录配置严格的保留期限与访问控制。

## Wrong answers

- "跑在服务器上而非个人笔记本上就算生产级产品。" 运行在什么物理设备上不具备决定权；谁在业务上依赖它才是关键。
- "挂一个声明这只是 Demo 的免责横幅即可。" 免责声明阻挡不了真实流量的涌入、成本账单的消耗以及突发故障的发生。
- "先留着 Demo 跑着，以后再单独全新构建正式产品。" 上述信号意味着该 Demo 在当下就已经真实承担了生产级别的系统风险。

## Taught in

[模型演示界面课程](../../../phases/17-infrastructure-and-production/29-model-demo-interfaces/)列出了五大信号与从 Demo 到产品的对比表，[生产级 LLM 应用课程](../../../phases/11-llm-engineering/13-production-app/)描述了 Demo 迁移的目标生产技术栈。
