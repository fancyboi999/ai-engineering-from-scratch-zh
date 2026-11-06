---
id: issuer-bound-tokens-and-jwks
title: 两个签发方，一个资源服务器，服务不中断
card: protocols
kind: design
level: 4
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [mcp, oauth, cimd, audience, jwks, issuer]
minutes: 15
lessons: [phases/13-tools-and-protocols/16-mcp-security-oauth-2-1, phases/13-tools-and-protocols/18-mcp-auth-production]
manuals: []
practice: []
cheatsheet: [mcp-security-auth]
related: [protocols/header-body-mismatch-order, protocols/descriptor-pin-rug-pull]
updated: 2026-11-03
---

你正在部署一个远程 MCP 服务端，该服务端需要接受来自两个独立授权服务器签发的 token（一个面向员工，另一个面向合作伙伴）。请为客户端注册、逐请求 token 验证以及密钥轮转设计一套方案，确保满足以下三点：为另一个 MCP 服务端签发的 token 必须拒绝、签发方的签名密钥轮转绝不引发中断，且被引诱至钓鱼 token 端点的客户端绝不会泄露其授权码。

## Short answer

发布声明了两个受支持授权服务器的 RFC 9728 受保护资源元数据文档，并将该列表作为严格的服务端签发方白名单。客户端与签发方有明确关系时使用预注册凭据，否则在签发方声明支持时使用客户端 ID 元数据文档（CIMD）；已弃用的动态注册只能作为显式备用方案，且必须提供正确的 `application_type`。在针对每个入站请求鉴权时，严格验证锁定的 `iss` 签发方、必须与本服务端规范资源 URI 严格全等的 `aud` 受众、未来的 `exp` 过期时间戳，以及当前工具所必需的权限作用域；对无效 token 统一响应 `401`，对有效但越权的 token 响应附带 `insufficient_scope` 的 `403`。服务端定期调度刷新 JWKS 密钥集且在遇到未知的 `kid` 时同步按需拉取一次，同时强制客户端在发起重定向授权前记录预期签发方，并在向 token 端点提交授权码之前严格按字符串比对授权响应中携带的 RFC 9207 `iss` 标识。

## Full answer

### 服务发现与准入

客户端从 MCP 资源 URL 开始，获取 RFC 9728 受保护资源元数据文档，从中选取一家受支持的授权服务器并拉取其 RFC 8414 元数据。在构建知名路径时必须保留原始资源路径：挂载在 `/mcp` 路径下的资源，其标准发现路径解析为同主机下的 `/.well-known/oauth-protected-resource/mcp`。在真正信任某个签发方之前，必须对其元数据执行自动化准入检查：必须显式声明支持 `S256` PKCE 算法（否则立即终止交互）、`response_types_supported` 必须为 `["code"]`，且至少存在一种客户端注册途径。

### 注册优先级

| 注册路径 | 选用条件 | 核心注意事项 |
|---|---|---|
| 预注册客户端 | 与该签发方存在明确关系 | 凭据按具体的签发方作为键名存储 |
| 客户端 ID 元数据文档（CIMD） | 目标签发方明确声明支持 CIMD | 带有路径的 HTTPS URL 本身就是 `client_id`，且文档的 `client_id` 必须与该 URL 严格一致 |
| 动态客户端注册 | 上述两项均不具备时的兜底手段 | 官方已不推荐；必须显式声明 `native` 或 `web` 类型；CIMD 校验失败时绝不允许静默降级走动态注册 |

拉取外部托管的 CIMD 文档对授权服务器而言属于潜在的 SSRF 敏感操作。客户端必须将签发方颁发的凭据以完整且精确的签发方标识为键存储，并将访问 token 按 `(issuer, resource)` 二元组隔离。如果服务发现流程从一个签发方重定向至另一个签发方，必须重新独立评估信任链，绝不可将第一家签发方的秘密凭据、注册 token 或 token 转发给第二家。CIMD 之所以具备强大的可移植性，是因为该 URL 是客户端自主托管发布的，而非依赖特定授权平台签发。

### 逐请求校验

```text
token.iss in protected_resource_metadata.authorization_servers
token.aud == canonical MCP resource URI
token.exp in the future
required scope present
```

缺少 `aud` 就拒绝，不能将其视作通配符。重放演练中，针对 `notes.example.com` 的 token 被出示给 `tasks.example.com`，它通过了签发方检查，却未通过受众检查。服务端返回 `401`，附带 `WWW-Authenticate: Bearer error="invalid_token"` 和 `resource_metadata` 指针。规范将其称为访问 token 权限限制。不要把入站 token 转发给下游 API，应获取独立的下游 token。

### 签发方轮转，服务端刷新

授权服务器在执行签名密钥轮转时，必须在正式废弃旧密钥前先将新公钥发布上线，因此在正常平稳期 JWKS 集合内同时包含新老两把公钥属于标准稳态。资源服务端自身绝不参与密钥轮转，它只负责被动刷新：通过后台定时任务周期性全量覆写 `cache[issuer] = {keys, fetched_at}`；当入站 token 携带了本地缓存未包含的全新 `kid` 时，服务端立即触发一次同步阻塞式重新拉取；若重新拉取后依然找不到该密钥，则立即拒绝该请求。不要在缓存未命中时触发密钥轮转和签发：新密钥仍然无法匹配，而攻击者选取的 `kid` 会引发不断创建密钥的拒绝服务攻击。

### 防范混淆攻击是客户端的职责

恶意钓鱼授权服务器可能会诱骗客户端将合法签发方颁发的授权码提交至攻击者的 token 兑换端点。单靠 PKCE 无法防范该风险，因为不知情的客户端会将自己的 `code_verifier` 提交给其所连接的钓鱼端点。防范混淆攻击的核心责任落在客户端：在发起重定向之前，客户端必须在本地记录预期的授权服务器标识；在收到重定向回传参数后，必须严格将响应中携带的 RFC 9207 `iss` 参数以普通字符串形式执行全等比对（绝不做任何大小写折叠、末尾斜杠裁剪或端口转换），比对无误后方可向端点提交兑换请求。

### 故障矩阵

| 异常 | 防御行为 |
|---|---|
| 定时拉取 JWKS 发生网络故障，但本地仍有已知的缓存 `kid` | 仅在声明的故障容忍过期窗口内继续放行该已存密钥 |
| 遭遇未知的 `kid` 且触发的一次同步重新拉取依然失败 | 拒绝 |
| 针对不透明 token 调用内省接口（Introspection）超时不可用 | 执行失败闭合（Fail-closed）；绝不可将网络异常误当做 `active: true` |
| 签发方公开发布的元数据发生了未预期的漂移 | 冻结所有基于该签发方的新客户端注册与 token 获取 |

## Follow-ups

- **Level 3:** 为什么仅在建立 TCP/HTTP 连接时执行一次 token 校验是不够的？ Expected: 当前协议无状态且无持久协议会话；每个请求都是独立携带 Bearer Token 的实体，必须逐请求独立鉴权。
- **Level 3:** 某个特定工具调用需要提升权限范围（Scope step-up），服务端如何响应？ Expected: 返回 `403`，附带 `WWW-Authenticate: Bearer error="insufficient_scope"`，标明所需 scope 和 `resource_metadata` URL；客户端取得同意后用新的请求 ID 重试。
- **Level 4:** 两个并发的权限提权请求产生了两个包含不同 scope 的有效 token，校验器以哪个为准？ Expected: 严格以当前具体请求所携带的 token 为准，绝不可反向查询全局用户权限，否则会引发检查时与使用时竞态。
- **Level 4:** 合作伙伴授权服务器在服务发现中突然变更了其 Issuer URL，客户端可以复用什么？ Expected: 仅可复用其自主托管的便携 CIMD URL；拒绝复用旧签发方签发的凭据、注册 token 和访问 token，客户端需要重新注册。

## Wrong answers

- "只要是经过我们公司统一身份认证平台签署的 token，就一律放行通过。" 为另一个服务端签发的 token 也能通过签发方检查；只有受众检查才能拒绝它。
- "在服务启动时拉取一次 JWKS 公钥缓存即可满足需求。" 授权平台执行正常的密钥轮转后，服务端会立刻将所有新签发的有效 token 错误拦截，直至下次重启；应定期刷新，并在未命中时重新拉取一次。
- "当 CIMD 校验失败时，自动静默降级走动态客户端注册流程。" 校验失败属于安全异常，绝不可自动向安全性更弱的注册机制妥协，必须依赖显式人工配置决策。

## Taught in

[OAuth 课程](../../../phases/13-tools-and-protocols/16-mcp-security-oauth-2-1/)构建了客户端注册与鉴权流程，[生产环境中的 MCP Auth 课程](../../../phases/13-tools-and-protocols/18-mcp-auth-production/)给出了 JWKS 缓存刷新、防受众重放及故障处置矩阵。
