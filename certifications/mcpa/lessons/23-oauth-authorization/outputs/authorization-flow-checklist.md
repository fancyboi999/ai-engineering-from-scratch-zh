# OAuth 授权流程检查清单

面向基于 HTTP 的 MCP server 授权的一页式参考资料，与 MCP 2026-07-28 对齐。

## 三个角色

- MCP server：OAuth 2.1 resource server，接受或拒绝 bearer token。
- MCP client：OAuth 2.1 client，驱动流程并在请求中附上 token。
- Authorization server：验证用户身份并签发 token 的独立服务。
- stdio server 根本不应运行此流程，而应从环境变量读取凭据。

## Protected Resource Metadata discovery（401 之后）

1. 解析 `WWW-Authenticate` 中的 `resource_metadata="..."`。若存在，获取该 URL 并停止。
2. 否则按顺序回退到 well-known URI：
   - `https://<host>/.well-known/oauth-protected-resource<path>`（路径专用）
   - `https://<host>/.well-known/oauth-protected-resource`（根位置）

文档会列出 `resource`，以及 `authorization_servers` 中至少一个条目。

## Authorization server metadata discovery

对于带路径的 issuer（`https://auth.example.com/tenant1`）：

1. `https://auth.example.com/.well-known/oauth-authorization-server/tenant1`
2. `https://auth.example.com/.well-known/openid-configuration/tenant1`
3. `https://auth.example.com/tenant1/.well-known/openid-configuration`

对于不带路径的 issuer（`https://auth.example.com`）：

1. `https://auth.example.com/.well-known/oauth-authorization-server`
2. `https://auth.example.com/.well-known/openid-configuration`

获取到的文档中，`issuer` 字段必须等于构造 URL 时使用的 issuer 标识。否则，即使获取成功也要拒绝文档。

## PKCE

- PKCE 为强制要求；技术可行时使用 `S256`。
- 如果 authorization server metadata 中缺少 `code_challenge_methods_supported`，拒绝继续。没有其他方法可以确认其支持 PKCE。
- `code_challenge = base64url(sha256(code_verifier))`，使用标准库的 `hashlib` 和 `base64` 计算。

## Resource indicator（RFC 8707）

- authorization request 和 token request 都必须发送 `resource`，即使 authorization server 会忽略它。
- 值为 MCP server 的规范 URI：scheme 和 host 使用小写、不带 fragment，除非斜杠有实际含义，否则末尾不带斜杠。
- 示例：`https://mcp.example.com/mcp`。

## iss 校验（RFC 9207）：四行表

| Server 声明 `authorization_response_iss_parameter_supported` | 响应中的 `iss` | Client 操作 |
|---|---|---|
| true | 存在 | 与记录的 issuer 精确比较 |
| true | 缺失 | 拒绝响应 |
| false 或缺失 | 存在 | 与记录的 issuer 精确比较 |
| false 或缺失 | 缺失 | 继续 |

redirect 前记录预期 issuer。错误响应也要应用此检查。

## Token 使用

- 每个 HTTP 请求都带 `Authorization: Bearer <token>`，绝不放入 query string。
- server 必须根据自身规范 URI 校验 token audience，拒绝其他一切 audience。
- 禁止向上游 API 透传 token；调用上游时使用独立 token。
- refresh token 从无保证；public client 的 refresh token 会轮换。

## 状态码

| 状态码 | 含义 | 适用情况 |
|---|---|---|
| 401 | Unauthorized | 没有 token、token 无效、过期或 audience 错误 |
| 403 | Forbidden | token 有效，但缺少所需 scope |
| 400 | Bad Request | 授权请求本身格式错误 |

## 考试要点

- 缺少 token 或 token 无效时，在 HTTP 层拒绝：没有 JSON-RPC error body。
- 未声明支持 `S256` 的 PKCE 是硬性拒绝，不是警告。
- audience 错误的 token 即使格式正确且未过期，仍以 401 拒绝。
- Client registration（如何取得 `client_id`）和运行时 scope step-up 属于后续独立课程。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 12 节。
