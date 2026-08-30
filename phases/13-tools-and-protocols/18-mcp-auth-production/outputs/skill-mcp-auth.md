---
name: mcp-auth-wiring
description: 设计 MCP 2026-07-28 授权：与 issuer 绑定的入册、CIMD、protected-resource metadata、JWKS 刷新、受众钉定和逐请求校验。
version: 2.0.0
phase: 13
lesson: 18
tags: [mcp, oauth, cimd, dcr, jwks, rfc8414, rfc7591, rfc8707, rfc7636, rfc9728, rfc9207]
---

给定一个 MCP server 配置和一组 IdP 能力，输出构成一个生产级 MCP 授权层的鉴权表面和拒绝规则。

输入：

- `mcp_resource_url`——规范 resource URL（最具体的标识符；仅当用来区分共置的 server 时才保留 path），用作 `aud`，也用作 protected-resource 元数据的 `resource` 值。
- `idp_metadata_url`——IdP 的 `/.well-known/oauth-authorization-server`（或 OpenID Connect Discovery）URL。
- `idp_capabilities`——观察到的 `issuer`、`code_challenge_methods_supported`、`grant_types_supported`、`client_id_metadata_document_supported`、已废弃的 `registration_endpoint`、`response_types_supported` 和 `authorization_response_iss_parameter_supported` 值。
- `pre_registered_client_ids`——由 authorization-server operator 预配的可选 issuer 到 client ID 映射。优先使用这个按 issuer 范围划分的身份，再使用 CIMD，最后才将已废弃 DCR 用作兼容路径。
- `application_type`——`native` 或 `web`，选择已废弃 DCR 兼容方案时必填。
- `credential_store`——按 authorization-server issuer 键控的 client ID 和注册凭据；access token 按 `(issuer, mcp_resource_url)` 键控。
- `tools`——MCP 工具列表，以及每个工具所需的 scope。

产出：

1. **拒绝门禁。** 任一硬性条件不满足就拒绝接线并停止：
   - `code_challenge_methods_supported` 里缺 `S256`（PKCE 没有降级模式）。
   - `grant_types_supported` 里缺 `authorization_code`。
   - `response_types_supported` 不是恰好 `["code"]`。
   - 不存在任何入册路径：预注册的 `client_id`、`client_id_metadata_document_supported: true`（CIMD）、已废弃 DCR 兼容 endpoint 三者一个都没有。
   - 选择 CIMD，但其 `client_id` 不是带路径的绝对 HTTPS 文档 URL、不匹配文档 URL，或文档缺少非空 `client_name` 或 `redirect_uris` 数组。CIMD 中 `application_type` 可选。
   - 返回的 RFC 9207 `iss` 不同于 redirect 前记录的 issuer，或 server 声明支持时该值缺失。
   - 已废弃 DCR 缺少 `application_type`，或其 redirect URI 策略与 `native` 或 `web` 冲突。

2. **Protected-resource metadata document**（RFC 9728）供 MCP server 使用。带路径的 resource 要在该路径前插入 well-known 段：`https://host/team/mcp` 映射到 `https://host/.well-known/oauth-protected-resource/team/mcp`。包含 `resource`、`authorization_servers`（issuer allow-list）、`scopes_supported` 和 `bearer_methods_supported: ["header"]`。

3. **HTTP 端点。**
   - `GET /.well-known/oauth-protected-resource`——返回 (2) 里的文档。
   - `POST /mcp`（无状态 MCP transport）——在任何工具分发之前校验本请求的 bearer token。
   - 仅 DCR 兼容方案：`POST /register`，其前要有 application-type 检查和限流检查。

4. **后台作业 + 例程。**
   - 一个计划 JWKS 刷新，把 `jwks_uri` 重新拉进缓存 `{keys, fetched_at}`。幂等；绝不铸密钥。AS 轮换；resource server 只刷新。默认 `0 */6 * * *`；对高轮换 IdP 收紧到 `*/15 * * * *`。
   - 一个 `validate` 例程——检查 `iss` allow-list、对照缓存的 JWKS 校验签名、`aud == mcp_resource_url`、`exp`、所需 scope。
   - 一条 step-up 签发路径——仅当工具列表里包含被某个用户起初未授予的 scope 把守的操作时才需要。

5. **缓存方案。** 每个被接受的 issuer 一条、以 `issuer` 为键的条目，持有 `{keys, fetched_at}`。记录读取模式：校验器读缓存，在 `kid` 未命中时兜底一次同步刷新（重新拉取，不是轮换——重新拉取是幂等的，无法被变成一个密钥创建 DoS）。

6. **Scope 映射。** 把每个工具映射到它所需的 scope。输出一张表：
   `| tool | required_scope | rationale |`。把破坏性工具归到它们自己的 scope 下；绝不把读 scope 重用给写工具。

7. **运行时拒绝规则**（校验器必须把这些编码进去）：
   - 当 `aud != mcp_resource_url` 时拒绝 → 401 `Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="<prm_url>"`。
   - 当 `iss not in authorization_servers` 时拒绝。
   - 当兜底重新拉取一次后 `kid` 仍不在缓存的 JWKS 里时拒绝。
   - 当所需 scope 缺失时拒绝 → 403 `Bearer error="insufficient_scope", scope="<required>", resource_metadata="<prm_url>"`。
   - 拒绝任何没有 S256 `code_challenge` 的 authorization request，也拒绝其 `code_verifier`、client、redirect URI 或 `resource` 与一次性 authorization-code 记录不匹配的 token request。
   - 拒绝 issuer 与 credential-store key 不匹配的任意凭据或 token。issuer 变化要求重新入册。

硬性拒绝（下列一律不接线——拒绝请求并写明原因）：

- 以明文存储 `client_secret`。public client 用 `token_endpoint_auth_method: none`；confidential client 用 `private_key_jwt`。静态存储里和注册响应日志里都不留明文共享 secret。
- 在校验器上跳过 `aud` 检查。受众绑定（access-token 权限收窄）正是 RFC 8707 + RFC 9728 存在的全部理由。
- 把 JWKS 缓存未命中兜底接到一个"轮换并铸新"而不是重新拉取。它永远产生不出那个缺失的 `kid`，还会让攻击者掌控的 `kid` 值逼出无上限的密钥创建。兜底必须是幂等的刷新。
- 允许无 PKCE 的 authorization code 请求。OAuth 2.1 禁止它；校验器必须拒绝任何所存 authorization-code 记录里缺 `code_challenge` 的 `/token` 交换。
- 在没有刷新作业的情况下缓存 JWKS。要么计划刷新一起交付，要么这套鉴权表面不部署。
- 在没有 allow-list 的情况下信任 `iss` claim。任何接受来自任意 `iss` 的 token 的校验器，都让攻击者能立起自己的 IdP 并伪造 token。
- 把入站的 MCP token 转发给上游 API（token 透传）。如果 MCP server 调上游 API，它必须拿自己一个单独的 token；透传会制造 confused-deputy 问题。
- 以明文存储 `registration_access_token`。静态哈希存储；每次更新时要求呈递明文。
- 将 MCP request metadata 或已移除的 protocol session 视为授权状态。2026-07-28 transport 是无状态的；每个请求都要认证并授权。

输出：一页纸的方案，含 protected-resource 文档、以 issuer 为键的入册布局、以 issuer 加 resource 为键的 token 布局、所选入册路径、HTTP 端点、JWKS 刷新作业、scope 映射和运行时拒绝规则。最后给出 authorization server 实际 metadata 中发现的第一个未满足部署 gate。
