---
name: oauth-scope-planner
description: Design MCP 2026-07-28 authorization with CIMD, issuer isolation, resource indicators, and step-up scopes.
version: 2.0.0
phase: 13
lesson: 16
tags: [mcp, oauth, cimd, pkce, issuer, resource-indicators]
---

给定远程 HTTP MCP server 及其 tool 列表，设计完整的授权边界。

## 必需输入

- 规范化 MCP resource URI 和受保护资源元数据位置。
- 允许的 authorization server issuer。
- Client runtime：native 或 web，以及精确的重定向 URI。
- Tool 到 scope 的映射和有重要后果的操作。
- Token、refresh 和凭据存储约束。
- 不支持 CIMD 的旧版 authorization server（如有）。

## 产出

1. Resource metadata。起草 RFC 9728 的 `resource`、`authorization_servers` 和 `scopes_supported`。保留 well-known 段之后的 resource path，例如对于 `https://notes.example.com/mcp`，使用 `https://notes.example.com/.well-known/oauth-protected-resource/mcp`。
2. Issuer policy。说明精确允许的 issuer、元数据校验、变更处理和 RFC 9207 `iss` 比较。
3. Enrollment。可用时使用预注册；否则优先使用 Client ID Metadata Document。其带 path 的 HTTPS URL 是 `client_id`；要求精确的重定向 URI，并将展示元数据视为不可信。`application_type` 在这里是可选的。
4. DCR fallback。若有必要，标明它已弃用，声明 `application_type`，并定义允许回退的精确条件。不要在泛化的 CIMD 安全失败后降级。
5. Credential keys。将预注册和 DCR 凭据按 issuer 存储，将 token 按 `(issuer, resource)` 存储。禁止跨 issuer 复用。说明自行托管的 CIMD URL 可移植，在受信 issuer 变更时不需要重新 DCR 注册。
6. PKCE flow。要求 S256、精确的重定向 URI、授权响应 issuer 校验，以及授权和 token 请求中相同的 resource。
7. Scope model。将每个 tool 映射到它的最小 scope。将当前 `WWW-Authenticate` scope challenge 视为权威信息。
8. Step-up experience。识别额外 scope、对用户的说明、同意点、新授权，以及用全新 MCP 请求 id 重试。
9. Resource-server checks。实现已声明的 `tools/list`，使用有效的对象根 schema、确定顺序、result type、server identity 和 cache hints。在分派 tool 前校验 issuer、audience、过期时间、scope、当前 MCP headers 和请求元数据。
10. Token hygiene。仅使用 bearer header，不在 query 中放 token，不做 token passthrough，机密存储 refresh token，并制定轮换计划。
11. Error contract。保留 JSON-RPC error envelope 中每个请求 id，包括 OAuth 失败。要求 header 不匹配时先返回 HTTP 400 `-32020`，再进行 HTTP 400 `-32022` 的版本支持检查；支持和请求数据必须精确；未知 method 返回 HTTP 404 `-32601`；已接受的 notification 返回空 body 的 202。
12. Transport boundary。将已解析 body 示例标记为进程内协议模型，并将它们接到第 09 课完整的 Streamable HTTP adapter，以校验 JSON Content-Type 和 JSON 加 SSE Accept。

## 硬性拒绝

- 将 DCR 表述为首选的新注册机制。
- DCR 未声明 `application_type`。
- issuer 变更后复用由 issuer 生成的注册凭据、access token 或 refresh token。自行托管的 CIMD URL 是可移植的例外，不是由 issuer 生成的 secret。
- 在比较前规范化授权响应 `iss`。
- 缺少 PKCE S256，或在授权和 token 请求中缺少 `resource`。
- 接受发给其他 audience 的 token，或向下游转发 MCP token。
- 使用 `clientInfo`、`serverInfo`、capabilities 或已移除的协议会话来认证。
- 仅为模仿远程 HTTP 而给本地 stdio 添加 OAuth。
- 构造 RFC 9728 metadata URL 时丢失受保护 resource path。
- MCP 请求错误返回纯文本或临时对象，而非带相同 id 的 JSON-RPC envelope。

## 输出格式

返回名为 Resource、Issuers、Enrollment、Credential Store、PKCE Flow、Scope Matrix、Step-Up、Server Validation、Token Hygiene 和 Compatibility 的章节。以触发 issuer 审查的精确事件结束，并说明对于由 issuer 生成的 client，何时必须重新注册。
