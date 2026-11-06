---
id: two-provider-minimum
title: 发生提供商故障时无需重新部署的容灾设计
card: cost-capacity
kind: design
level: 4
roles: [applied-ai-engineer, forward-deployed-ai-engineer, inference-engineer]
rounds: [system-design, design-review]
tags: [failover, gateway, model-alias, lock-in]
minutes: 18
lessons: [phases/17-infrastructure-and-production/01-managed-llm-platforms, phases/13-tools-and-protocols/21-llm-routing-layer, phases/17-infrastructure-and-production/19-ai-gateways, phases/11-llm-engineering/15-prompt-caching]
manuals: []
practice: []
cheatsheet: [llm-routing-gateways, managed-llm-platforms]
related: [cost-capacity/gateway-latency-budget, cost-capacity/cache-break-even]
updated: 2026-11-03
---

CTO 要求所有产品核心模型调用必须能够在一个提供商完全故障停机时幸存，且无需重新部署，同时不能让账单翻倍。设计这套架构：第二家提供商置于何处？请求如何在两家之间流转？双侧必须保持哪些绝对一致？该架构的实际代价是什么？

## Short answer

在应用程序前端部署一个统一网关，为每个业务用例分配一个抽象模型别名，在每个别名后配置两家提供商的优先级列表，并在遇到服务端错误和速率限制时触发带重试预算上限的故障转移策略。在两家提供商上严格保持可缓存前缀结构、工具声明顺序和输出 schema 完全一致，从而确保故障转移后的请求在前缀写入后依然能命中第二家的缓存且能被应用层正常解析。稳态运行时的额外成本微乎其微，因为网关在绝大多数时间内将流量导向首选提供商；真正的代价在于每次都需要运行双份的评测与 prompt 回归测试。

## Full answer

### 为什么必须至少接入两家

托管平台课程指出：绑定在单一家平台上会让你错失前沿大模型的大部分红利，因为最强模型的桂冠每隔几个月就在各大厂商之间易主；且单一平台的区域性故障会直接演变为自身产品的全面停摆。因此，课程对任何产品关键调用提出“双提供商底线”（two-provider minimum）原则。稳态下的增量开销几乎可以忽略不计，因为网关在日常平稳运行时始终路由给更优选项，而在灾难故障时所获得的可用性收益则是决定性的。

### 前置网关架构

路由层课程展示了其技术架构。各方统一遵循同一种 API 规范，网关对外暴露统一端点并在背后做协议转换。业务代码仅需引用抽象别名（如 `our_smart_model`），由网关将该别名映射到具体提供商的具体模型。每个别名后配置一个优先级列表：优先主提供商，遇到服务端错误或速率限制时转向第二家，再不行就拒绝请求。重试次数受到严格预算限制，防止主提供商故障导致调用成本成倍放大。AI 网关课程补充了该层统管的其余职责：单租户限流、运行时从密钥库动态拉取凭证、统一可观测性以及安全护栏。

### 双侧必须严格保持一致的四项要素

1. **可缓存的前缀结构（Prefix Layout）。** prompt 缓存课程中跨提供商故障转移的铁律是保持布局完全一致，以便任何命中都能在任意一侧生效。不变的稳定内容置于最前，动态用户消息置于最后。
2. **工具列表的序列化顺序。** 任何工具顺序的随机变动都会导致后续每次请求的缓存全量失效。
3. **输出 Schema 与解析器。** 故障转移返回了业务程序无法解析的异构格式，等同于服务依然中断。
4. **评测测试集（Eval Set）。** 每次修改 prompt 时，两家提供商都必须运行相同的回归测试套件，否则备用链路会在无人察觉的情况下发生能力漂移。

### 架构付出的真实代价

- 每次版本发布均需运行双份的评测与 prompt 回归测试。
- 刚发生故障转移时第二家提供商的前缀缓存处于冷状态。首批请求必须支付写入溢价，且两侧都必须满足各自的最小可缓存阈值。
- 网关自身的网络跳数延迟，视网关类型在数毫秒至数十毫秒不等。
- 每次调用必须记录实际提供服务的提供商标识日志行，以便精确拆解账单并监控故障转移发生率。

### 故障前的常态化演练验证

在预发环境中注入主提供商返回的限流错误，观察流量转移情况。测量切换至第二家提供商首次返回成功响应的耗时，并将故障转移期间的首 token 延迟与缓存读取情况与平稳稳态做对比。

## Follow-ups

- **Level 3:** 为什么第二家提供商在稳态平稳运行时成本极低？ Expected: 网关在绝大多数时间内将全部流量导向首选的主提供商；第二家提供商只在故障和演练时承接流量。
- **Level 4:** 如果没有保持相同的可缓存前缀结构，发生故障转移时什么会最先崩溃？ Expected: 第二家提供商上的缓存每次请求都将全量未命中，导致故障期间的一小时全部按全额原价计费，且首 token 延迟大幅激增。
- **Level 4:** 哪些故障应当触发自动故障转移，哪些故障不应触发？ Expected: 服务端错误、速率限制及超时应触发；而护栏拦截或格式错误的响应不应触发，因为第二家提供商也会以同样的方式失败。

## Wrong answers

- "接入两家提供商会让账单翻倍。" 第二家提供商仅在主链路故障时才承接流量；其余时间网关始终将流量路由给首选提供商。
- "为每家提供商单独调优专属的 prompt。" 这会导致每次变更都需要维护两套 prompt，且备用路径会悄然漂移失真；必须保持一套统一结构与评测集。
- "遇到任何错误都触发故障转移。" 护栏拦截或 schema 解析错误在第二家上同样会复现，这只会让本该快速失败的请求白白花费两倍的成本。

## Taught in

[托管大模型平台课程](../../../phases/17-infrastructure-and-production/01-managed-llm-platforms/)确立了双提供商底线原则，[路由层课程](../../../phases/13-tools-and-protocols/21-llm-routing-layer/)给出了模型别名与备选回退链，[AI 网关课程](../../../phases/17-infrastructure-and-production/19-ai-gateways/)列举了网关功能，[prompt 缓存课程](../../../phases/11-llm-engineering/15-prompt-caching/)保持了跨提供商的可缓存布局一致性。
