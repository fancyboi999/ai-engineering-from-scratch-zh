# MCP 授权：CIMD、签发方绑定、PKCE 与权限升级

> 远程 MCP 请求是无状态的，但其授权并不匿名。每份凭据都要绑定到签发它的签发方，每个 token 都要绑定到接收它的资源。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 13 · 09（传输）、阶段 13 · 15（安全）
**预计时间：** ~90 分钟

## 学习目标

- 通过受保护资源元数据发现授权服务器。
- 优先使用 Client ID Metadata Documents，而非已弃用的 Dynamic Client Registration。
- 在不得不走 DCR 兼容路径时声明正确的 `application_type`。
- 校验授权响应中的 `iss`，并按签发方隔离凭据。
- 使用 PKCE、资源指示符、受众校验和渐进式 scope。
- 在没有协议会话的情况下发送已授权的 MCP 2026-07-28 请求。

## 问题背景

远程 MCP server 可能读取私有记录、写入外部系统，或触发昂贵的任务。认证告诉它是谁提交了凭据；授权还必须回答：

- 是哪个授权服务器签发了这份凭据？
- token 是发给哪个 MCP 资源的？
- 哪个 client 和重定向 URI 完成了流程？
- 用户批准了哪些操作？
- 这一次具体请求仍在该批准范围内吗？

2026-07-28 授权 profile 强化了 client 注册和签发方处理。它优先使用 Client ID Metadata Documents，弃用 Dynamic Client Registration，要求 DCR 使用正确的 `application_type`，校验 RFC 9207 签发方响应，并禁止跨签发方复用凭据。

这些规则补充了无状态的核心协议；它们不会恢复核心握手或 `Mcp-Session-Id`。

## 核心概念

### 认识三个角色

- **MCP client：** 代表资源所有者发送请求。
- **MCP resource server：** 接收 access token 并提供 MCP endpoint。
- **Authorization server：** 对资源所有者进行认证、收集同意并签发 token。

resource server 和 authorization server 可以一起运行，但要将它们的标识符和校验职责分开。

### 授权适用于 HTTP

MCP 授权规范适用于基于 HTTP 的传输。本地 stdio server 运行在进程和操作系统的信任边界内，不要仅为对称性就给 stdio 加一套伪造的浏览器 OAuth 流程。

对于远程 Streamable HTTP，每个请求都在 `Authorization` header 中发送 bearer token，绝不能把它放在 URL 里。

### 从受保护资源元数据开始

resource server 发布 RFC 9728 元数据：

```json
{
  "resource": "https://notes.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["notes:delete", "notes:read", "notes:write"]
}
```

client 从 MCP resource URL 出发，获取该文档，选择其中声明的授权服务器，然后获取该服务器的 OAuth 或 OpenID Connect 元数据。

构造 RFC 9728 well-known URL 时必须保留 resource path。对于资源 `https://notes.example.com/mcp`，本课使用 `https://notes.example.com/.well-known/oauth-protected-resource/mcp`。漏掉 `/mcp` 后缀可能会选中同一 origin 上另一个受保护资源的元数据。

不要根据 hostname 猜测授权服务器，也不要跟随未经校验的错误响应体中发现的签发方。client 应有一项策略，规定愿意信任哪些签发方。

### 校验授权服务器元数据

元数据应公开 endpoint 和支持的控制项：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "code_challenge_methods_supported": ["S256"],
  "authorization_response_iss_parameter_supported": true,
  "client_id_metadata_document_supported": true
}
```

PKCE 必须使用 S256。记录精确的 issuer 字符串；这个精确值将成为注册和 token 存储的键。

### 遵循注册优先级

如果 client 已与选定的签发方建立明确关系，使用预注册的 client 信息。否则，当授权服务器声明支持时，优先使用 Client ID Metadata Documents。仅在已弃用的兼容性回退中使用 DCR；如果这些机制都不可用，再提示填写 client 信息。

### 优先使用 Client ID Metadata Documents

Client ID Metadata Document 为授权服务器提供一个 HTTPS URL：它既是 client 标识符，也是其元数据位置：

```json
{
  "client_id": "https://client.example.com/oauth/metadata.json",
  "client_name": "Notes desktop client",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"]
}
```

授权服务器获取并校验该文档。`client_id` 必须是带 path 的 HTTPS URL，且文档内的值必须与该 URL 完全相等。必填字段为 `client_id`、`client_name` 和 `redirect_uris`。本例展示了 `application_type`，但它不是 CIMD 的要求；它新近成为必填项，特指 DCR 路径。

获取该文档是对 SSRF 敏感的操作。解析并校验目标地址，拒绝 loopback、私有、link-local 及其他不允许的地址；在重定向和 DNS 变更后重新检查；限制重定向次数、字节数和时间；要求 JSON；并且仅按已校验的 HTTP cache controls 缓存。把 `client_name` 和其他展示字段视为不可信文本。

CIMD 免除了每次首次连接都要生成新的动态标识符的需要，但它并不免除重定向 URI 校验、签发方策略或用户同意。

### DCR 是兼容路径

Dynamic Client Registration 仍可用于旧版授权服务器，但对于新的 MCP 实现，它已被弃用。

使用 DCR 时，必须声明 `application_type`：

```json
{
  "client_name": "Notes desktop client",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"]
}
```

- 桌面、移动端、命令行和 loopback client 使用 `native`。
- 远程托管的浏览器应用使用 `web` 和远程 HTTPS 重定向。

省略该字段时，OpenID Connect 注册实现可能默认使用 `web`，从而让本应合法的 loopback 重定向失败。

将 DCR 代码置于明确的回退决策之后。不要在任意 CIMD 校验失败后静默回退，否则可能把安全失败变成更弱的注册路径。

### 将凭据绑定到签发方

将由签发方生成的注册材料存储在精确的 issuer 键下：

```text
issuer_credentials[issuer] = pre_registered_or_dcr_client
tokens[(issuer, resource)] = access_token
```

如果受保护资源发现结果从 `https://auth-one.example` 变成 `https://auth-two.example`，要重新评估信任关系。绝不能把第一个签发方的 client secret、DCR client id、registration access token、refresh token 或 access token 发送给第二个签发方。预注册和 DCR client 必须使用由新签发方签发的凭据。

CIMD client id 则不同：它是自行托管的 HTTPS URL，而不是授权服务器签发的凭据。同一个 CIMD URL 可以移植：新的受信签发方无需重新 DCR 注册即可获取并校验该文档。授权响应和 token 仍会在新签发方下被校验和存储。

### 使用 PKCE 的授权码流程

交互式流程如下：

1. 生成高熵 `code_verifier`。
2. 派生 S256 `code_challenge`。
3. 使用精确的 `client_id`、`redirect_uri`、`scope`、`code_challenge` 和 `resource` 发送授权请求。
4. 接收包含 `code` 以及（如有提供）`iss` 的授权响应。
5. 在使用响应中任何字段前，将 `iss` 与已记录的精确 issuer 校验。
6. 使用 `code_verifier`、相同的重定向 URI 和相同的 `resource` 交换 code。
7. 将得到的 token 存在 `(issuer, resource)` 键下。

RFC 8707 的 `resource` 参数同时出现在授权请求和 token 请求中，它标识规范化的 MCP server URI。

### 精确校验 `iss`

RFC 9207 防止一个签发方的授权响应与另一个签发方的响应混淆。

当 `iss` 存在时，直接与已记录的 issuer 比较，不进行大小写折叠、尾部斜杠改写、默认端口删除或 percent-encoding 规范化。如果不匹配，不要使用 code，甚至不要展示来自该响应的、由攻击者控制的错误详情。

带有 `iss` 的授权服务器会声明 `authorization_response_iss_parameter_supported: true`。即使缺少这项声明，当前 client 仍要校验存在的 `iss`。

### 在 MCP server 校验受众

resource server 只接受签发给自身的 token：

```text
token.issuer == configured_authorization_server
token.audience == canonical_mcp_resource
```

无效、过期、签发方错误或受众错误的 token 都返回 401。MCP server 不得接收或转发原本发给其他服务的 token。

### 请求当前所需的最小 scope

先申请现在所需的 scope。如果之后某个 tool 需要更多权限，server 会带着权威 scope challenge 返回 403：

```text
WWW-Authenticate: Bearer error="insufficient_scope",
  scope="notes:delete",
  resource_metadata="https://notes.example.com/.well-known/oauth-protected-resource/mcp"
```

client 解释新增的权限，取得同意，使用合并后的 scope 集合执行新的授权流程，然后以新的 JSON-RPC id 重试 MCP 请求。

不要假定 challenge 中的 scope 是 `scopes_supported` 的子集；对于当前操作，challenge 才是权威信息。

### 授权与无状态 MCP wire

已授权的 tool 调用仍需携带完整的当前请求 envelope：

```text
POST /mcp
Authorization: Bearer <access-token>
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.delete
```

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "notes.delete",
    "arguments": {"id": "note-7"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "oauth-lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

token 授权主体；请求元数据协商协议行为。二者彼此不能替代。

按固定顺序校验 wire：JSON-RPC 和元数据类型、header 与 body 是否相等，最后才是协议支持情况。路由或版本 header 不匹配时，返回 HTTP 400 和 `-32020`。如果 header 与 body 一致但版本不受支持，返回 HTTP 400 和 `-32022`，且 `data` 必须严格为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知 method 返回 HTTP 404 和 `-32601`。

每个请求错误，包括 401 无效 token 和 403 scope 不足，都是带原始请求 `id` 的 JSON-RPC error envelope。结构化的恢复信息属于可选 error `data`；`WWW-Authenticate` 仍是 HTTP response header。notification 没有 `id`，因此不接收 JSON-RPC body。已接受的 HTTP notification 返回空 body 的 202。

server 实现 `server/discover` 并声明 tools，因此也会实现强制性的 `tools/list` method。其 tool descriptors 有稳定的名称、描述和对象根级 `inputSchema` 值。列表是确定性的，并返回 `resultType`、server identity 元数据、有界的 `ttlMs` 和 `cacheScope`。授权前可以提供 discovery 和与用户无关的 tool list；如果其中任一项随主体变化，则应用常规策略并使用私有缓存。

### 禁止 token passthrough

MCP server 不得把 client 的 MCP access token 转发给下游 API。应获取具有正确 audience 的独立下游 token，或使用显式的 token-exchange 设计。只有服务拒绝并非为自己签发的 token，受众校验才有效。

### Refresh token

Refresh token 是可选的。若签发，须以机密方式存储，并按签发方和资源作为键。不要假设它一定存在。授权服务器支持轮换时应轮换它们，并检测已失效值的复用。

```figure
t3-scope-stepup
```

## 动手构建

`code/main.py` 是一个进程内协议和授权模拟器。它实现受保护资源发现、授权服务器元数据、CIMD 注册、由版本控制的 DCR 回退、应用类型检查、PKCE、签发方校验、资源绑定 token、scope 权限升级、`server/discover`、`tools/list` 和无状态 tool 请求。

模型接收已解析的请求 body 和路由 header。它不是完整的 HTTP adapter，也不解析 `Content-Type` 或 `Accept`。将它接入第 09 课的 Streamable HTTP adapter；后者要求 `Content-Type: application/json`，并且 `Accept` 值同时包含 `application/json` 和 `text/event-stream`。

运行它：

```bash
cd phases/13-tools-and-protocols/16-mcp-security-oauth-2-1
python3 code/main.py
python3 -m unittest discover code/tests -v
```

输出先展示 discovery，随后是 CIMD 注册、一次普通读取、两次独立的 scope 权限升级，以及按签发方分键的凭据存储。

## 实际使用

将模拟器对象映射到生产组件：

- `ResourceServer.protected_resource_metadata` 对应 RFC 9728 endpoint。
- `AuthorizationServer.metadata` 对应 RFC 8414 或 OpenID Connect discovery。
- `Client.enroll` 对应 CIMD 解析加上明确的 DCR 兼容分支。
- 由签发方生成的 client 凭据和 `tokens_by_issuer_resource` 对应加密记录。CIMD URL 可以继续移植，但其授权结果仍绑定到签发方。
- `ResourceServer.handle` 对应在分派前校验当前 MCP headers、token 和 tool scope 的 middleware，同时让每个请求错误保持在匹配的 JSON-RPC envelope 中。

## 拿去用

本课交付 `outputs/skill-oauth-scope-planner.md`。它现在可设计注册优先级、签发方绑定的凭据存储、应用类型、PKCE、资源指示符、scope challenge 以及当前无状态请求边界。

## 练习

1. 添加 refresh-token 轮换，并拒绝复用上一个 refresh token。
2. 添加签发方 allowlist。签发方变更时，只复用可移植的 CIMD URL；拒绝全部先前由签发方生成的凭据和 token。
3. 为授权 code 添加过期时间，并确认延迟交换会失败。
4. 构建一个使用远程 HTTPS 重定向的 web client 变体，并将其 DCR 元数据与 native client 比较。
5. 在同一签发方下添加第二个资源。确认它的 access token 不能在第一个资源使用。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Protected-resource metadata | 标识资源和授权服务器的 RFC 9728 文档 |
| CIMD | URL 是 OAuth client 标识符的 HTTPS 元数据文档 |
| DCR | 为兼容性保留的、已弃用的动态 client 注册 |
| `application_type` | `native` 或 `web`，用于校验重定向 URI 规则 |
| PKCE | 用于保护被拦截授权 code 的 verifier 和 S256 challenge |
| `iss` | RFC 9207 的授权响应签发方标识符 |
| Resource indicator | 将 token 请求绑定到 MCP 资源的 RFC 8707 参数 |
| Audience | token 有效的资源 |
| Step-up | 为额外的当前操作 scope 重新取得同意并签发 token |
| Issuer-bound credentials | 按精确授权服务器 issuer 隔离的注册和 token 记录 |

## 延伸阅读

- [MCP 2026-07-28 authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [RFC 9728: OAuth 2.0 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728)
- [RFC 8707: Resource Indicators for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc8707)
- [RFC 9207: OAuth 2.0 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207)
- [OAuth Client ID Metadata Document draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/)
