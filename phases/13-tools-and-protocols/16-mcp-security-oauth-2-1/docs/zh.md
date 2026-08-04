# MCP 安全 II——OAuth 2.1、Resource Indicator、增量 Scope

> 远程 MCP server 需要的是授权，不只是认证。2025-11-25 规范与 OAuth 2.1 + PKCE + resource indicator（RFC 8707）+ 受保护资源元数据（RFC 9728）对齐。SEP-835 加上了增量 scope 同意，在 403 WWW-Authenticate 时做 step-up 授权。本课把 step-up 流程实现为一个状态机，让你看清每一跳。

**类型：** Build
**语言：** Python（标准库，OAuth 状态机模拟器）
**前置要求：** 阶段 13 · 09（传输）、阶段 13 · 15（安全 I）
**预计时间：** ~75 分钟

## 学习目标

- 区分 resource server 和 authorization server 的职责。
- 走一遍 PKCE 保护的 OAuth 2.1 授权码流程。
- 用 `resource`（RFC 8707）和受保护资源元数据（RFC 9728）防止 confused-deputy 攻击。
- 实现 step-up 授权：server 用 WWW-Authenticate 响应 403，索要更高的 scope；client 重新提示用户同意并重试。

## 问题背景

早期 MCP（2025 之前）发布的远程 server 用临时 API key，甚至根本不鉴权。2025-11-25 规范用一套完整的 OAuth 2.1 profile 堵上了这道缺口。

三个真实需求：

- **普通远程 server。** 用户安装一个访问他们 Notion / GitHub / Gmail 的远程 MCP server。带 PKCE 的 OAuth 2.1 是正确的形状。
- **scope 升级。** 一个被授予 `notes:read` 的 notes server，之后某个特定动作可能需要 `notes:write`。step-up（SEP-835）不重做整个流程，而是索要那个额外 scope。
- **confused deputy 防范。** client 持有一个受众限定到 Server A 的 token。Server A 是恶意的，试图把这个 token 出示给 Server B。resource indicator（RFC 8707）把 token 钉到它意图的受众上。

OAuth 2.1 不新。新的是 MCP 的 profile：特定的必需流程（只有授权码 + PKCE；默认无 implicit、无 client credentials）、每个 token 请求上强制的 resource indicator，以及发布出来的受保护资源元数据，让 client 知道该去哪。

## 核心概念

### 角色

- **Client。** MCP client（Claude Desktop、Cursor 等）。
- **Resource server。** MCP server（notes、GitHub、Postgres，随便什么）。
- **Authorization server。** 签发 token。可以和 resource server 是同一个服务，也可以是独立的 IdP（Auth0、Keycloak、Cognito）。

在 MCP 的 profile 里，resource 和 authorization server 可以是同一个宿主，但应该用 URL 区分开。

### 授权码 + PKCE

流程：

1. client 生成 `code_verifier`（随机）和 `code_challenge`（SHA256）。
2. client 把用户重定向到 `/authorize?response_type=code&client_id=...&redirect_uri=...&scope=notes:read&code_challenge=...&resource=https://notes.example.com`。
3. 用户同意。authorization server 重定向到 `redirect_uri?code=...`。
4. client POST 到 `/token?grant_type=authorization_code&code=...&code_verifier=...&resource=...`。
5. authorization server 校验 verifier 的哈希是否对得上存好的 challenge，签发一个 access token。
6. client 用这个 token：对 resource server 的每个请求上带 `Authorization: Bearer ...`。

PKCE 防止授权码拦截攻击。resource indicator 防止 token 在别处仍有效。

### 受保护资源元数据（RFC 9728）

resource server 发布一份 `.well-known/oauth-protected-resource` 文档：

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["notes:read", "notes:write", "notes:delete"]
}
```

client 从 resource server 发现 authorization server。减少配置——client 只需要 resource URL。

### Resource indicator（RFC 8707）

token 请求里的 `resource` 参数把 token 意图的受众钉住。签发的 token 含 `aud: "https://notes.example.com"`。另一个收到这个 token 的 MCP server 检查 `aud` 并拒绝它。

### scope 模型

scope 是空格分隔的字符串。常见 MCP 约定：

- `notes:read`、`notes:write`、`notes:delete`
- `admin:*` 用于管理能力（少用）
- `profile:read` 用于身份

scope 选择应当最小权限：现在需要什么就请求什么，需要更多时再 step up。

### step-up 授权（SEP-835）

用户授予了 `notes:read`。他们之后让 agent 删一条笔记。server 响应：

```
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
    scope="notes:delete", resource="https://notes.example.com"
```

client 看到 insufficient_scope 错误，用一个针对那个额外 scope 的同意对话框提示用户，为它走一个迷你 OAuth 流程，用新 token 重试请求。

### token 受众校验

每个请求：server 检查 `token.aud == self.resource_url`。不匹配 = 401。这阻止跨 server 的 token 复用。

### 短时 token 与轮换

access token 应当是短时的（默认 1 小时）。refresh token 在每次刷新时轮换。client 在后台处理静默刷新。

### 不许 token 透传

sampling server（阶段 13 · 11）绝不能把 client 的 token 透传给其他服务。sampling 请求就是那道边界。

### confused deputy 防范

token 绑到 `aud`。client 绑到 `client_id`。每个请求都对两者校验。规范明确禁止旧的"传 token"模式——它在 MCP 之前的远程工具生态里很常见。

### Client ID 发现

每个 MCP client 在一个固定 URL 发布它的元数据。authorization server 能拉取 client 的元数据文档来发现 redirect URI 和联系信息。这省掉了手动 client 注册。

### 网关与 OAuth

阶段 13 · 17 展示一个企业网关如何处理 OAuth：网关持有上游 server 的凭证，给 client 的 token 是网关签发的，上游 token 永不离开网关。这翻转了信任模型——用户跟网关认证一次；网关处理 N 个 server 授权。

```figure
t3-scope-stepup
```

## 实际使用

`code/main.py` 把完整的 OAuth 2.1 step-up 流程模拟为一个状态机。它实现：

- PKCE code-verifier / challenge 生成。
- 带 resource indicator 的授权码流程。
- 受保护资源元数据端点。
- 带受众检查的 token 校验。
- `insufficient_scope` 上的 step-up。

本课没有 HTTP server；状态机在内存里跑，让你能追踪每一跳。阶段 13 · 17 的网关课把它接到一个真实传输上。

## 拿去用

本课产出 `outputs/skill-oauth-scope-planner.md`。给定一个带工具的远程 MCP server，这个 skill 设计 scope 集合、钉定规则和 step-up 策略。

## 练习

1. 跑 `code/main.py`。追踪那个两 scope 的 step-up 流程。注意 step-up 时哪些跳重复了。

2. 加 refresh-token 轮换：每次刷新签发一个新 refresh token 并作废旧的。模拟一个被偷的 refresh token 在轮换后被使用，确认它失败。

3. 用标准库 http.server 把受保护资源元数据端点实现为一个真实 HTTP 响应。镜像第 09 课的 /mcp 端点。

4. 为一个 GitHub MCP server 设计一个 scope 层级：read repo、write PR、approve PR、merge PR、admin。在每个层级之间用 step-up。

5. 读 RFC 8707 和 RFC 9728。找出 9728 里一个 MCP 用法与 RFC 示例不同的字段。（提示：它跟 `scopes_supported` 有关。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| OAuth 2.1 | "现代 OAuth" | 强制 PKCE、禁止 implicit 流程的整合 RFC |
| PKCE | "持有证明" | 击败授权码拦截的 code verifier + challenge |
| Resource indicator | "token 受众" | 把 token 钉到一个 server 的 RFC 8707 `resource` 参数 |
| Protected-resource metadata | "发现文档" | RFC 9728 的 `.well-known/oauth-protected-resource` |
| Step-up authorization | "增量同意" | 按需加 scope 的 SEP-835 流程 |
| `insufficient_scope` | "带 WWW-Authenticate 的 403" | server 信号，要为更大 scope 重新同意 |
| Confused deputy | "跨服务 token 复用" | 受信持有者不当转发 token 的攻击 |
| Short-lived token | "access token TTL" | 快速过期的 bearer；refresh token 续期 |
| Scope hierarchy | "最小权限栈" | 各层级间带 step-up 的分级 scope 集合 |
| Client ID metadata | "client 发现文档" | client 发布自己 OAuth 元数据的 URL |

## 延伸阅读

- [MCP — Authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization) — 权威的 MCP OAuth profile
- [den.dev — MCP November authorization spec](https://den.dev/blog/mcp-november-authorization-spec/) — 2025-11-25 变更的逐步讲解
- [RFC 8707 — Resource indicators for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc8707) — 受众钉定的 RFC
- [RFC 9728 — OAuth 2.0 protected resource metadata](https://datatracker.ietf.org/doc/html/rfc9728) — 发现文档的 RFC
- [Aembit — MCP OAuth 2.1, PKCE and the future of AI authorization](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/) — 实战的 step-up 流程讲解
