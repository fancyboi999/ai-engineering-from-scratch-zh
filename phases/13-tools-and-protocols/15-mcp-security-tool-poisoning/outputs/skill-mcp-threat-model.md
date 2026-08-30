---
name: mcp-threat-model
description: Threat-model an MCP 2026-07-28 deployment across metadata, routing, authorization, MRTR, and compatibility boundaries.
version: 2.0.0
phase: 13
lesson: 15
tags: [mcp, security, stateless, tool-poisoning, mrtr]
---

给定一个 MCP 部署，产出一份基于证据的威胁模型。假设任何 server、包、缓存、注册表条目或 gateway 路由都可能被攻陷。

## 必需输入

- Client、gateway、server、authorization server 和 registry 的信任边界。
- 完整的规范化工具 descriptor 与已批准的 digest。
- 认证 principal、issuer、audience、scope 和工具策略。
- 当前及可接受的旧版协议 revision。
- MRTR 操作、输入 schema、状态保护和重放策略。
- 缓存 scope、TTL、subscription route 和审计保留策略。

## 产出内容

1. 连线验证。验证逐请求版本和 capability，然后在检查版本支持之前验证路由 header 相等。对于不匹配，要求 HTTP 400 `-32020`；对于不受支持的版本，要求 HTTP 400 `-32022` 并提供精确的 supported 和 requested data；对于未知 method，要求 HTTP 404 `-32601`；对于已接受的 notification，要求空 body 的 202。
2. Descriptor 审查。报告投毒指标、完整 descriptor digest 变更、未知工具以及 schema 或 annotation 变更。
3. 命名空间映射。为每个 backend 工具提供一个限定的公开名称，并拒绝静默的冲突解决。
4. 授权矩阵。将经过认证的 principal 和 issuer 映射到资源、工具、参数约束和 scope。不要将 `clientInfo` 或 `serverInfo` 用作身份。
5. MRTR 审查。确认每个 `inputRequests` 条目都是由 client 声明 capability 支持的完整嵌入式请求。将 `elicitation: {}` 视为隐式 form 支持，将 `elicitation: {form: {}}` 视为显式 form 支持。对于仅 URL 的 elicitation，以 HTTP 400 `-32021` 及 `data.requiredCapabilities.elicitation.form` 拒绝。将受保护的 `requestState` 绑定到 method、工具、精确参数、principal、目的、过期时间和 nonce。在有界、TTL 修剪、由所有 handler 实例共享的重放存储中，以原子方式消耗 nonce 前，按 key 匹配并验证每个 `inputResponses` 条目。
6. 风险轴审查。标记任何同时组合不可信输入、敏感数据和有后果操作的自动化步骤。
7. 缓存和 subscription 审查。确保依赖用户的结果为私有，长期 notification 使用 `subscriptions/listen`。
8. 兼容性边界。将任何较旧的握手、session、GET stream、server callback 或实验性 task 行为隔离在明确的版本控制之后。
9. Transport 边界。识别该实现是完整 HTTP adapter 还是进程内协议模型。将模型接入第 09 课，以验证 JSON `Content-Type` 和 JSON 加 SSE `Accept`。
10. 修复优先级。给出三项杠杆最高的修复，以及负责人和验收证据。

## 强制拒绝

- 静默工具覆盖，或按发现顺序选择路由。
- 未经人工或策略重新批准就更新 descriptor digest。
- 将对端自行声明的 client 或 server 信息视为认证。
- 将声明的 capability 视为权限。
- 对有后果操作信任明文或未签名的 `requestState`。
- 仅将重放 ledger 保留在一个 gateway 或 server 实例中。
- 只按 `Mcp-Session-Id` 键控限流或批准状态。
- 将已废弃的 Sampling、Roots、Logging 或旧版 HTTP 加 SSE 描述为新的实现路径。

## 输出格式

返回名为“信任边界”“连线发现”“Descriptor 发现”“路由映射”“授权矩阵”“MRTR 发现”“兼容性发现”和“修复”的章节。将已确认的证据与假设分开。最后以当前跨越最多边界的单一攻击路径收尾。
