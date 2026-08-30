---
name: gateway-bootstrap
description: 设计具有注册表准入、策略、路由和兼容性边界的无状态 MCP 2026-07-28 网关。
version: 2.0.0
phase: 13
lesson: 17
tags: [mcp, gateway, stateless, registry, rbac, subscriptions, tasks]
---

给定 client、后端、授权要求和合规约束，产出一份网关设计。

## 必需输入

- 公开网关 resource URI、接受的协议修订版和传输方式。
- 已认证的主体和角色模型。
- 后端端点、issuer、resource、注册表记录、发布者证据和已批准描述符。
- 工具可见性、参数策略、成本类别和数据敏感度。
- 流、变更通知、MRTR 和 Tasks 要求。
- 审计、保留、追踪和脱敏要求。

## 产出

1. 无状态入口。一个 POST 端点、逐请求版本和能力、匹配的方法和名称头、JSON 或请求范围内的 SSE，以及现代 GET 和 DELETE 的 405。先校验头部相等性，再校验版本支持。指定 HTTP 400 `-32020`、携带精确 supported 和 requested data 的 HTTP 400 `-32022`、HTTP 404 `-32601`、可选错误 data 的序列化，以及 202 空 body notification 处理。
2. 发现计划。实现网关 `server/discover`，发现每个后端，只暴露安全的端到端能力交集，并包含当前 `resultType`、`ttlMs`、`cacheScope` 和 server 身份元数据。
3. 准入表。分别校验官方 Registry `server.json` 的发布形状与 `com.example/*` 风格名称，不把它们等同于安全准入。对每个后端，将记录关联到外部已验证的发布者命名空间、溯源来源、端点、版本策略、描述符摘要、issuer、resource、批准和过期状态。
4. 命名空间映射。为每个后端工具分配稳定的限定公开名称，并在每个 `tools/list` 描述符上保留有效的对象根级别 `inputSchema`。拒绝按顺序解决碰撞。
5. 授权矩阵。将主体和角色映射到公开工具、resource、参数和 scope。外层与后端凭证保持分离，并与 issuer 绑定。
6. 转发契约。构建全新的自包含后端请求，仅声明经调解的 client 能力，校验后端结果，并保留 trace 关联。
7. 缓存计划。将依赖主体的发现和列表设为私有。设置有界 TTL 和失效行为。
8. 限流和审计策略。以主体、issuer、resource、工具、成本类别和时间为键。脱敏凭证和不必要的敏感参数。
9. 交互路由。描述请求范围内的 SSE、`subscriptions/listen` 确认和重新连接行为、逐字节转发 MRTR 状态，以及通过 `Mcp-Name` 中的任务 id 进行 Tasks 路由。
10. 传输 adapter。如果网关接收已解析的请求和头部，则将其标记为进程内协议模型，并连接到第 09 课，实施 JSON `Content-Type` 以及 JSON 加 SSE `Accept` 要求。
11. 兼容 adapter。把旧版初始化、会话 id、GET 流、资源订阅和实验性任务方法隔离在现代网关核心之外。

## 必须拒绝

- 将会话亲和性、会话存储或重写 session id 表述为 2026-07-28 的必需项。
- 没有准入证据就相信注册表存在或展示名称。
- 静默处理工具碰撞，或在未经重新批准时更新描述符钉定。
- 在后端复用外层 bearer token，或在另一 issuer 或 resource 上复用后端 token。
- 公开缓存按主体过滤的列表。
- 独立的现代 GET event stream、`Last-Event-ID` 重放或资源订阅方法。
- 新增 `tasks/list` 或 `tasks/result` 行为。
- 限流只以已移除的协议会话为键。
- 在 `server.json` 内虚构安全验证，而非使用独立且已验证的准入与溯源状态。
- 省略 `inputSchema` 的命名空间工具描述符。

## 输出格式

返回名为 Ingress、Discovery、Admission、Namespace Map、Authorization、Forwarding、Cache、Rate Limits、Audit、Interactions 和 Legacy Adapter 的章节。以需要最强验收测试的一条路由结尾。
