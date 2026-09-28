# Client 注册指南

面向 MCPA“安全与治理”领域的一页式参考资料，与 MCP 2026-07-28 对齐。

## 注册优先顺序

1. 已保存的此 authorization server 预注册凭据。
2. 若 authorization server 声明 `client_id_metadata_document_supported`，使用 Client ID Metadata Document（CIMD）。
3. Dynamic Client Registration（DCR）：已 deprecated，仅当存在 `registration_endpoint` 且 CIMD 不可用时采用。
4. 请 client 使用者手动输入 client 信息。

## Authorization server 对 CIMD 的检查

| 检查项 | 要求 |
|-------|-------------|
| Scheme 与路径 | client_id 是带真实路径组件的 https URL |
| 精确匹配 | 文档自身的 client_id 字段与获取 URL 完全相等 |
| 必填字段 | client_id、client_name 和 redirect_uris 全部存在 |
| Redirect URI | 每一项都使用 https 或 localhost 上的 http，并与 authorization request 匹配 |
| 获取安全 | 防范 SSRF；按 HTTP cache header 缓存；对只有 localhost 的 redirect 显示更强警告 |

## DCR application_type

- `native`：桌面应用、移动应用、CLI 工具以及通过 localhost 访问的本地托管应用。
- `web`：远程、基于浏览器的应用。
- OIDC 中省略会默认为 `web`，可能导致 localhost redirect URI 遭拒。

## Authorization server binding

- 按签发 issuer 为持久化凭据建立 key。
- 通过更新后的 protected resource metadata 检测 authorization server 变更。
- 绝不将一个 authorization server 的凭据用于另一个；应重新注册。
- CIMD id 可跨 authorization server 移植；DCR id 不行。

## Confused deputy

proxy 使用一个静态 client id，代表许多动态注册下游 client 连接第三方 authorization server 时，必须在转发每个下游 client 的请求前，分别取得用户对该 client 的同意。

## Authorization extension

| Extension | 适用场景 | 工作方式 |
|-----------|------|---------------|
| OAuth Client Credentials | CI pipeline、daemon、后台服务，没有交互用户 | client 使用 JWT bearer assertion（推荐）或 client secret 验证身份 |
| Enterprise-Managed Authorization | 使用企业 identity provider 的员工 | client 将 SSO identity assertion 换成 ID-JAG，再用 ID-JAG 换取 MCP access token |

两种 extension 都需要显式选择，在 `clientCapabilities.extensions` 中声明，绝不会默认启用。

## 考试要点

- Dynamic Client Registration 已 deprecated；预注册之后，首选 Client ID Metadata Document。
- CIMD 的 client_id 必须与获取它的 URL 精确相等，否则 authorization server 必须拒绝。
- 凭据按 issuer 建立 key，绝不能跨 authorization server 共享。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 12 节。
