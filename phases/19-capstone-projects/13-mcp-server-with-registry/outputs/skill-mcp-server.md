---
name: mcp-server-platform
description: 设计一台面向 MCP 2026-07-28 的无状态服务器，具备 Registry 元数据、实时发现、授权、策略、审计和扩展性证据。
version: 2.0.0
phase: 19
lesson: 13
tags: [capstone, mcp, stateless, streamable-http, oauth, registry, governance]
---

面对内部平台需求，设计一台以协议修订版 `2026-07-28` 为目标的无状态 MCP 服务器和治理边界。

构建计划：

1. 一个 schema 有效的 `server.json`，其反向 DNS 名称符合发布者已经认证的命名空间。
2. 强制实现 `server/discover`，用于实时版本、capabilities、扩展和服务器身份。
3. 每个请求的 `_meta` 都带版本和 client capabilities；每个结果都带 `resultType` 和服务器身份。
4. 确定性的 `tools/list`，带 `ttlMs` 与 `cacheScope`。
5. 只接受 POST 的 Streamable HTTP，具备必需的版本、method 和 name headers；没有协议 sessions、GET stream、session DELETE 或 replay header。
6. 授权在每次调用时校验 issuer、audience、expiry 和 scopes。
7. 针对 actor、工具、目标和规范化 arguments 的策略。将高风险审批绑定到精确动作与 expiry，然后证明改动一个 argument 会拒绝重放。
8. 位于模型可见 context 之外的脱敏 audit 和 trace 证据。
9. 一个验证 `server.json`、probe `server/discover` 并报告元数据/运行时漂移的 Registry adapter。
10. 两个可互换副本和一个无需 session affinity 的并发负载 probe。

评估量表：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 协议正确性 | 无状态信封、发现、结果、headers 和负向场景 |
| 20 | 授权 | issuer、audience、expiry、scope 和精确动作审批场景 |
| 15 | Registry 完整性 | 有效 `server.json`、实时 probe 和漂移报告 |
| 15 | 策略和安全 | 允许、拒绝、畸形、过期审批和敏感数据场景 |
| 15 | 规模 | 两个副本，无 affinity 依赖，另加取消和恢复 |
| 10 | 可审计性 | 脱敏的接收端 audit 和 trace 证据 |

硬性拒绝：

- 使用 `initialize`、`notifications/initialized` 或 `Mcp-Session-Id` 的当前 MCP 设计。
- 将 `server.json` 当作实时能力发现，或虚构 `.well-known/mcp-capabilities` 是 MCP 要求。
- 发布名称位于该发布者认证命名空间之外的服务器。
- 接受未校验 issuer 和 audience 或 resource 的 token。
- 将工具注释或聊天审批当作授权。
- 持久化 secrets 或原始敏感数据的 audit 记录。

拒绝规则：

- 拒绝仅凭本地模拟就声称生产就绪。
- 拒绝暴露没有策略和动作绑定审批证据的会改变状态工具。
- 拒绝发布指向无法验证实时发现的 endpoint 的元数据。

输出：一份构建计划和证据矩阵，覆盖发布元数据、实时发现、无状态 transport、工具 schemas、授权、策略、审批、审计和规模。以风险最高的边界，以及证明它会 fail closed 的精确失败测试结尾。
