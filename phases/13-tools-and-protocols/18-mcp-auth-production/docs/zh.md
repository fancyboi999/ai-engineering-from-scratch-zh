# 生产环境的 MCP Auth——入册、JWKS 刷新、受众钉定的 token

> 第 16 课在内存里立起了 OAuth 2.1 状态机。到 2026 年，你交付给真实组织的每个 MCP server 都坐在生产鉴权之后：要支撑无上限增长的 client 群体的 client 入册（首选 Client ID Metadata Documents，dynamic client registration 作为向后兼容的兜底）、authorization-server 元数据 discovery（RFC 8414 *或* OpenID Connect Discovery）、不会在凌晨三点把 token 校验搞崩的 JWKS 缓存刷新，以及拒绝跨 resource 重放的受众钉定 token。本课用三个角色把整个表面建模出来——一个 authorization server、一个 resource server（也就是 MCP server）、一个 client——这样你就能追踪从 discovery 到一次校验通过的工具调用之间的每一跳。
>
> **规范说明（2025-11-25）：** 2025 年 11 月的 MCP 授权规范把 Dynamic Client Registration 从 `SHOULD` 降级到了 `MAY`，并把 **Client ID Metadata Documents（CIMD）** 确立为推荐的默认入册机制。本课两种都讲，按规范的优先级顺序来；代码里仍保留 DCR 作演示，因为它在单个进程里完全自洽。

**类型：** Build
**语言：** Python（标准库）
**前置要求：** 阶段 13 · 16（OAuth 2.1 状态机）、阶段 13 · 17（网关）
**预计时间：** ~90 分钟

## 学习目标

- 经由 RFC 8414 元数据 discovery 一个 authorization server，并核实契约。
- 实现 RFC 7591 dynamic client registration，让 MCP client 无需管理员介入就能入册。
- 按计划缓存并刷新 JWKS 密钥，让签名校验挺过密钥轮转。
- 用 RFC 8707 resource indicator 把 token 钉到单个 MCP resource 上，拒绝 confused-deputy 复用。
- 把三个角色干净地分开——authorization server、resource server、client——让每个角色只执行属于自己的那些检查。
- 读一份 IdP 能力矩阵，当 IdP 满足不了 MCP 的鉴权 profile 时拒绝部署。

## 问题背景

第 16 课的模拟器在内存里跑 OAuth 2.1。生产有三个纯内存模拟器看不到的运维缺口。

第一个缺口是入册。一个真实组织跑着几百个 MCP server 和几千个 MCP client。运维不会把每个 Cursor 用户都手动注册成 OAuth client。2025-11-25 规范给了 client 一个解决这件事的优先级顺序：如果你有一个预注册好的 `client_id` 就用它，否则用 **Client ID Metadata Document**（client 用一个它自己掌控的 HTTPS URL 来标识自己，由 authorization server *主动拉取* 元数据），再否则退回到 **RFC 7591 dynamic client registration**（client *主动推送* 一个 `POST /register`，当场拿到一个 `client_id`），最后再退回到提示用户。CIMD 是推荐的默认做法，因为它在保留一套以 DNS 为根的信任模型的同时，彻底去掉了逐 server 的注册；DCR 则为向后兼容而保留。两者都从 authorization server 的元数据里发现自己的入口：CIMD 看 `client_id_metadata_document_supported`，DCR 看 `registration_endpoint`。

第二个缺口是密钥轮换。JWT 校验依赖 authorization server 的签名密钥，以一个 JSON Web Key Set（JWKS）发布。authorization server 按计划轮换它们（常常每小时，事件响应时有时更快）。一个在启动时取一次 JWKS 的 MCP server，在轮换窗口之前都校验正常——然后每个请求都失败，直到重启。生产把 JWKS 串成一个带缓存的值，配一个刷新作业，在上一批密钥过期前覆盖缓存，外加一个缓存未命中时的兜底拉取，应对一个由比缓存更新的密钥签名的 token 到来的情况。

第三个缺口是受众绑定。第 16 课引入了 RFC 8707 resource indicator。在生产里，那个 indicator 变成每个请求上的一道硬性 claim 检查。MCP server 把 `token.aud` 和自己的规范 resource URL 对比，不匹配就用 HTTP 401 拒绝。这是唯一一道防御，挡住一个上游 MCP server（或一个持有本属于某 server 的 token 的恶意 client）把那个 token 重放给同一信任网格里另一个 server。

本课把这每一个缺口都映射到表面的一块具体东西上。元数据文档是一个 HTTP 端点。JWKS 缓存刷新是一个计划作业加一个键值缓存。JWT 校验是 resource server 在分发任何工具之前跑的一个例程。把三个角色分开，每个角色就只执行属于它的那些检查：authorization server 签发并轮换密钥，resource server 缓存并校验，client 做 discovery 和入册。

## 核心概念

### RFC 8414——OAuth Authorization Server Metadata

`/.well-known/oauth-authorization-server` 上的一份文档描述了 client 需要的一切：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "registration_endpoint": "https://auth.example.com/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
  "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"]
}
```

拿到一个 MCP resource URL 的 client 会把 discovery 串起来：RFC 9728 里的 `oauth-protected-resource`（resource server 的文档）给出 issuer，然后 `oauth-authorization-server`（也就是本 RFC）给出每一个端点。client 从不硬编码 authorization URL。

在信任某个 IdP 跑 MCP 之前，你要核实的契约：

- `code_challenge_methods_supported` 里包含 `S256`（即 RFC 7636 的 PKCE）。规范说得很明确：如果这个字段 **缺失**，authorization server 就不支持 PKCE，client **必须** 拒绝继续。
- `grant_types_supported` 里包含 `authorization_code`，并且拒绝 `password` 和 `implicit`。
- 至少广告了一条入册路径：`client_id_metadata_document_supported: true`（CIMD，首选）**或** `registration_endpoint`（RFC 7591 DCR，兜底）。任一满足契约即可；你不再硬性要求 DCR。
- 对 OAuth 2.1 来说，`response_types_supported` 恰好是 `["code"]`。

如果 `S256` 缺失，MCP server 就拒绝在这个 IdP 上部署——PKCE 没有降级模式。如果 *两条* 入册路径都没广告，而你又没有预注册的 `client_id`，那你也没法入册；这时是部署清单写错了，不是代码错了。

### RFC 9728（回顾）——Protected Resource Metadata

第 16 课讲过 RFC 9728。在生产里的差异是：这份文档是 client 唯一会去查的地方，用来找出 *这个* MCP server 信任的 authorization server。一个 MCP server 可能接受来自多个 IdP 的 token（一个给员工，一个给合作伙伴）。RFC 9728 声明这个集合；RFC 8414 记录每个 IdP 支持什么。

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com", "https://partners.example.com"],
  "scopes_supported": ["mcp:tools.invoke"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://notes.example.com/docs"
}
```

### Client ID Metadata Documents（推荐的默认做法）

CIMD 把注册从 *推送* 反转成了 *拉取*。client 不再请求 authorization server 铸一个 `client_id`，而是用一个它自己掌控的 HTTPS URL **作为** 它的 `client_id`。这个 URL 解析到一份 JSON 元数据文档；authorization server 在 OAuth 流程中按需拉取它。信任以 DNS 为根：如果 server 运营方信任 `app.example.com`，它就信任从 `https://app.example.com/client.json` 提供的那个 client。没有注册往返，没有会被耗尽的 `client_id` 命名空间，也没有要逐 server 保持同步的状态。

client 托管的元数据文档：

```json
{
  "client_id": "https://app.example.com/oauth/client.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "redirect_uris": ["http://127.0.0.1:7333/callback", "http://localhost:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

文档里的 `client_id` 值 **必须** 等于它被提供出来的那个 URL（authorization server 会校验这点；不匹配就拒绝）。authorization server 在它的 RFC 8414 元数据里用 `client_id_metadata_document_supported: true` 来广告支持。

规范对两个安全事实直言不讳：

- **SSRF。** authorization server 会去拉取一个攻击者提供的 URL。它必须防御 server-side request forgery（不要拉取内部/管理端点）。
- **localhost 冒充。** 单凭 CIMD 拦不住一个本地攻击者宣称一个合法 client 的元数据 URL、再绑定任意 `localhost` redirect。authorization server **必须** 在 consent 阶段清楚地展示 redirect URI 的主机名，并 **应当** 对只用 `localhost` 的 redirect 发出警告。

因为 CIMD 不需要 server 端状态，所以没有像 DCR 那样要立起来的注册器。client 端是只读的：从一个静态 HTTPS 端点提供你的元数据文档，让 authorization server 来拉取就行。

### RFC 7591——Dynamic Client Registration（兜底 / 向后兼容）

DCR 现在是个 `MAY`，为向后兼容 2025-11-25 之前的部署、以及还不支持 CIMD 的 IdP 而保留。没有它（也没有 CIMD 或预注册）的话，每个 MCP client（Cursor、Claude Desktop、一个自研 agent）都需要和 IdP 管理员做一次带外交换。有了 DCR，client 这样 post：

```json
POST /register
Content-Type: application/json

{
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "mcp:tools.invoke",
  "client_name": "Cursor",
  "software_id": "com.cursor.cursor",
  "software_version": "0.42.0"
}
```

server 回应一个 `client_id` 和一个供后续更新用的 `registration_access_token`：

```json
{
  "client_id": "c_3e7f1a",
  "client_id_issued_at": 1769472000,
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "registration_access_token": "regt_b2...",
  "registration_client_uri": "https://auth.example.com/register/c_3e7f1a"
}
```

对运行在用户设备上的 MCP client 来说，`token_endpoint_auth_method: none` 是正确的默认值。它们只拿到一个 `client_id`——没有 `client_secret` 可被窃取。PKCE 提供了 public client 所需的 proof-of-possession。

三个生产坑：

- 注册端点必须按来源 IP 做限流。没有这个，一个敌对方就能脚本化几百万次假注册，把 `client_id` 命名空间耗尽。在注册器处理请求之前先跑一道限流检查。
- 有些企业 IdP 要求 `software_statement`（一个为 client 背书的已签名 JWT）。本课的 mock 跳过了它；生产要串一个校验步骤，拒绝任何非 localhost redirect URI 的未签名注册。
- `registration_access_token` 必须以哈希形式存储，而不是明文。这个 token 被偷意味着攻击者能改写 client 的 redirect URI。

### RFC 8707（回顾）——Resource Indicators

第 16 课确立了形态。生产规则：每个 token 请求都带上 `resource=<canonical-mcp-url>`，并且 MCP server 在每次调用时都校验 `token.aud` 和自己的 resource URL 匹配。规范 URI 是这个 server *最具体的* 标识符：用小写的 scheme 和 host，不带 fragment，并且按惯例不带末尾斜杠。path 部分 **不会** 被规则剥掉——当需要它来标识某个单独的 MCP server 时，规范会保留它。`https://mcp.example.com`、`https://mcp.example.com/mcp`、`https://mcp.example.com:8443`、`https://mcp.example.com/server/mcp` 都是合法的规范 URI。每个 server 挑一个，并把 `aud` 精确钉到那个值。（本课的 mock 为了简洁用了像 `https://notes.example.com` 这样的裸主机受众；一个在同一 origin 下共置好几个 MCP server 的部署，会用 path 来区分它们。）

### RFC 7636（回顾）——PKCE

PKCE 在 OAuth 2.1 里是强制的。本课的 authorization-code 流程总是带着 `code_challenge` 和 `code_verifier`。server 拒绝任何没有 verifier、或 verifier 哈希后对不上所存 challenge 的 token 请求。

### MCP Spec 2025-11-25 鉴权 Profile

MCP 规范（2025-11-25）对一个 MCP server 的授权层必须做什么讲得很精确：

- 实现 RFC 9728 protected-resource 元数据，并通过 401 上的 `WWW-Authenticate: Bearer resource_metadata="..."` 头 **或** well-known URI `/.well-known/oauth-protected-resource` 提供它的位置（SEP-985 把这个头改成了可选，配一个 well-known 兜底）。元数据的 `authorization_servers` 字段 **必须** 至少给出一个 server。
- 只通过 **每个** 请求上的 `Authorization: Bearer ...` 接受 token——绝不放在 query string 里，绝不只在 session 开始时校验。
- 每个请求校验 `aud`、`iss`、`exp` 和所需的 scope。server **必须** 校验这个 token 是专门为它签发的（受众）；缺失或不匹配的 `aud` 一律拒绝，绝不当成通配。
- 在 401/403 时，返回带 `error=...` 的 `WWW-Authenticate: Bearer`、`resource_metadata="<PRM-URL>"` 参数（元数据文档的 URL，*而不是* 裸 resource），以及在 `insufficient_scope`（403）时带上 `scope="..."`。注意：参数是 `resource_metadata`，一个 discovery 指针——challenge 里没有 `resource` 参数。
- authorization-server discovery **既** 接受 RFC 8414 OAuth 元数据 **也** 接受 OpenID Connect Discovery 1.0；client 必须按优先级顺序把两个 well-known 后缀都试一遍。
- 防御 **mix-up 攻击** 的是 client（不是 server）：它在重定向之前记下预期的 `issuer`，并在兑换 code 之前校验 `iss` 授权响应参数（RFC 9207）。单凭 PKCE 拦不住 mix-up，因为 client 会把自己的 `code_verifier` 交给被引导去的那个 token 端点。

OAuth 2.1 草案是底料；RFC 8414/7591/8707/9728/9207 + RFC 7636 + CIMD 是表面；MCP 规范是 profile。

### IdP 能力矩阵

并非每个 IdP 都支持完整的 MCP profile。下面的矩阵记录的是截至 2025-11-25 规范的客观能力陈述。它是一道 *部署门禁*，不是推荐。

CIMD 在 2025-11-25 规范里才落地，而底层的 OAuth 草案直到 2025 年 10 月才被采纳，所以厂商支持还在陆续到来——把下面的 "CIMD" 当成"它今天的现状，请在你自己的 tenant 里核实"，而不是一个永久陈述。

| IdP 类别 | AS 元数据（8414/OIDC） | CIMD | RFC 7591 DCR | RFC 8707 resource | RFC 7636 S256 PKCE | 说明 |
|---|---|---|---|---|---|---|
| 自托管（Keycloak） | 支持 | 正在出现 | 支持 | 支持（24.x 起） | 支持 | 本课中 MCP profile 的参考 IdP；DCR 路径全程端到端打通，CIMD 跟进新规范。 |
| 企业 SSO（Microsoft Entra ID） | 支持 | 正在出现 | 支持（高级套餐） | 支持 | 支持 | DCR 可用性因 tenant 套餐而异；部署前在目标 tenant 里核实。 |
| 企业 SSO（Okta） | 支持 | 正在出现 | 支持（Okta CIC / Auth0） | 支持 | 支持 | DCR 在 Auth0（现为 Okta CIC）上可用；经典 Okta 组织需要管理员预注册。 |
| 社交登录 IdP（通用） | 视情况而定 | 不支持 | 罕见 | 罕见 | 支持 | 大多数社交 IdP 把 client 当成静态合作伙伴；没有自助入册。仅作身份来源用，在其上叠一层你自己的、懂 MCP 的 authorization server。 |
| 自定义 / 自研 | 取决于实现 | 取决于实现 | 取决于实现 | 取决于实现 | 取决于实现 | 如果你自己交付，就交付完整 profile 并优先用 CIMD。跳过 PKCE 或受众绑定会破坏 MCP 鉴权契约。 |

部署清单的拒绝规则：如果所选 IdP 的 `code_challenge_methods_supported` 里没列 `S256`，MCP server 拒绝启动——PKCE 没有降级模式。入册是道更软的门禁：你需要 *一条* 能用的路径（一个预注册的 `client_id`、`client_id_metadata_document_supported: true`，或一个 `registration_endpoint`）。单单缺 DCR 不再是触发拒绝的理由，因为 CIMD 或预注册可以顶上。

### JWKS 刷新模式（在 AS 处轮换，在 resource server 处刷新）

把两个动词分清楚，因为把它们混为一谈是一个真实的生产 bug：

- **轮换（Rotate）** 是 *authorization server* 干的事：铸一个新签名密钥，发布到 JWKS 里，之后再退役旧的。resource server 在这件事里没有份，也干不了——它没有 IdP 的私钥。
- **刷新（Refresh）** 是 *resource server* 干的事：重新 `GET` 已发布的 JWKS 进自己的缓存。这是 resource server 唯一会做的 JWKS 动作。

生产里的失效模式是缓存陈旧。用一个计划刷新作业加一个键值缓存来解决它。resource server 跑一个作业（cron、timer，你的 runtime 提供什么都行），按固定间隔拉取 `<issuer>/.well-known/jwks.json` 并覆盖 `cache[issuer] = {keys, fetched_at}`。校验器从那个缓存读。一个 `kid` 不在缓存里的 token，会触发 **一次** 同步刷新作为兜底，然后重新检查。这一下同时处理两种情况：计划刷新，以及密钥重叠窗口——一个由全新密钥签名的 token 在下一次计划刷新之前就到了。

兜底 **必须是重新拉取，绝不是轮换**。如果你把缓存未命中路径接到一个"轮换并铸新"，会坏两件事：（1）铸一个新密钥产生的 `kid` *仍然* 对不上那个 token，所以查找照样失败；以及（2）一个用随机 `kid` 喷射 token 的攻击者会逼出一连串无上限的密钥创建——一个自找的 DoS。重新拉取是幂等的，所以一个伪造的 `kid` 顶多浪费一次拉取。

缓存形态：

```json
{
  "https://auth.example.com": {
    "keys": [
      {"kid": "k_2026_03", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"},
      {"kid": "k_2026_04", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"}
    ],
    "fetched_at": 1772668800
  }
}
```

同时存在两个密钥是稳态。authorization server 通过先引入下一个密钥（`k_2026_04`）、再退役上一个（`k_2026_03`）来轮换，这样在旧密钥下签发的 token 在过期之前都保持有效。缓存持有这个并集；校验器按 `kid` 来挑。

### 校验例程

MCP server 在分发任何工具之前先跑校验。`code/main.py` 用的形态：

```python
result = server.validate(bearer_token, required_scope="mcp:tools.invoke")
if not result["valid"]:
    return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
```

`validate` 解码 JWT，从 JWKS 缓存里解析出签名密钥（未命中时刷新一次），校验签名，然后对照 allow-list 检查 `iss`、对照本 server 的规范 resource 检查 `aud`、检查 `exp` 和所需 scope——在第一个失败处返回一个 `WWW-Authenticate` challenge。把它做成 resource server 上的单一例程，意味着每个入口（每次工具调用、每条 transport）都走同一套检查；没有一条路径能在不先校验的情况下到达工具。

### 受众重放演练（access-token 权限收窄）

Server A（`notes.example.com`）和 Server B（`tasks.example.com`）都向同一个 authorization server 注册。Server A 被攻陷了。攻击者拿走一个用户的 notes token，把它重放给 Server B。

Server B 的校验器：

1. 解码 JWT，按 `kid` 取 JWKS，校验签名。
2. 对照它的 protected-resource 元数据里的 `authorization_servers` 检查 `iss`。（通过——同一个 IdP。）
3. 检查 `aud == "https://tasks.example.com"`。（失败——token 的 `aud` 是 `https://notes.example.com`。）
4. 返回 401，带 `WWW-Authenticate: Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="https://tasks.example.com/.well-known/oauth-protected-resource"`。

受众 claim 是协议层面对这种攻击唯一的防御。为了性能跳过它是最常见的生产错误；校验器必须在每个请求上跑，而不是只在 session 开始时跑。规范把这叫 **access-token 权限收窄（access-token privilege restriction）**：一个 MCP server `MUST` 拒绝任何不在受众里指名它的 token。

> **命名说明。** 规范把 *confused deputy* 这个词留给一个相关但不同的问题：一个 MCP server 充当通往第三方 API 的 OAuth **proxy**，用一个静态 client ID，在没有取得逐 client 用户 consent 的情况下转发一个 token。受众绑定修复的是上面那个重放；而 confused-deputy 的修复是逐 client consent **加上** 绝不把入站 token 透传给上游 API（MCP server `MUST` 拿自己一个单独的上游 token）。

### Mix-up 攻击（一个 server 提供不了的 client 端防御）

一个 client 一生中会和很多 authorization server 打交道。一个恶意 AS 可以试着让 client 把一个诚实 AS 的 authorization code 拿到攻击者的 token 端点去兑换。受众绑定在这里帮不上忙——攻击发生在任何 token 存在之前。防御活在 client 里（RFC 9207）：

1. 在重定向之前，client 从已校验的 AS 元数据里记下预期的 `issuer`。
2. 在 authorization 响应上，client 把返回的 `iss` 参数和那个记下的 issuer 对比（简单的字符串比较，不做归一化），然后才把 code 发往任何地方。
3. 不匹配（或 AS 广告了 `authorization_response_iss_parameter_supported` 却 `iss` 缺失）→ 拒绝，连 `error` 字段都不展示。

单凭 PKCE 拦不住 mix-up，因为 client 会把自己的 `code_verifier` 交给被引导去的那个 token 端点。这正是为什么规范要把 issuer 连同 PKCE verifier 和 `state` 一起逐请求记录下来。

### 失效模式

- **JWKS 陈旧。** AS 轮换一个密钥后，校验器拒绝有效的 token。修复办法是上面那个 cron 刷新 + 缓存未命中重新拉取的模式。绝不要在没有刷新作业的情况下缓存 JWKS。
- **拿轮换当兜底。** 把缓存未命中路径接到一个"轮换并铸新"而不是重新拉取，是个真实的 bug：它永远产生不出那个缺失的 `kid`，还会把攻击者掌控的 `kid` 值变成一个密钥创建 DoS。兜底必须是幂等的 `refresh-jwks`。
- **缺失 `aud` claim。** 有些 IdP 默认会省略 `aud`，除非 token 请求里带了 `resource`。校验器必须拒绝缺失 `aud` 的 token，而不是把缺失当成通配。
- **因缺 `iss` 检查导致的 mix-up。** 一个不校验 RFC 9207 `iss` 授权响应参数（对照它在重定向前记下的 issuer）的 client，会被引导去把一个诚实 AS 的 code 拿到攻击者的 token 端点兑换。这是 client 端的失效；resource server 没法替它补偿。
- **scope 升级竞态。** 同一个用户的两个并发 step-up 流程可能都成功，产生两个 scope 不同的 access token。校验器必须用请求上呈递的那个 token，而不是去查"用户当前的 scope"——那会制造一个 TOCTOU 窗口。
- **注册 token 失窃。** 一个泄漏的 `registration_access_token` 让攻击者能改写 redirect URI。把它们静态哈希存储；要求 client 在每次更新时呈递明文；有怀疑就轮换。
- **`iss` 未钉定。** 一个接受任意 `iss` 的校验器，让攻击者能立起自己的 authorization server、为目标受众注册一个 client、再签发 token。protected-resource 元数据里的 `authorization_servers` 列表就是 allow-list；强制执行它。

```figure
t3-jwks-rotate
```

## 实际使用

`code/main.py` 用标准库 Python 和三个角色——`AuthorizationServer`、`ResourceServer`、`Client`——走完整个生产流程。流程如下：

1. authorization server 在 `/.well-known/oauth-authorization-server` 发布 RFC 8414 元数据。
2. MCP client 调元数据端点，检查它的入册选项（CIMD 看 `client_id_metadata_document_supported`，DCR 看 `registration_endpoint`）和 `S256` PKCE 支持。
3. 演练走 DCR 兜底路径：client 向 `/register`（RFC 7591）post，拿到一个 `client_id`。（一个 CIMD client 会改为呈递它自己的 HTTPS `client_id` URL，跳过这一步。）
4. MCP client 跑带 `resource` indicator（RFC 8707）的、受 PKCE 保护的 authorization code 流程（RFC 7636）。
5. MCP client 用 `Authorization: Bearer ...` 在 MCP server 上调一个工具。
6. MCP server 跑 `validate`，从 JWKS 缓存里解析出签名密钥。
7. IdP 轮换一个密钥；计划刷新把 JWKS 重新拉进缓存。
8. 下一次调用无需重启就对照刷新后的密钥校验通过，且上一个 token 在重叠窗口期间仍然校验通过。
9. 一次针对不同 MCP resource 的受众重放尝试，拿到 401，带 `audience mismatch` 和一个 `resource_metadata` 指针。

这里的 JWT 用 HS256 加一个共享 secret（这样本课只靠标准库就能跑）。生产用 RS256 或 EdDSA 配上面那个 JWKS 模式；除此之外校验逻辑完全一样。因为 IdP 和 resource server 活在同一个进程里，`refresh_jwks` 直接读 authorization server 的密钥列表；放到线上它是一次对 `jwks_uri` 的 HTTP `GET`。

## 拿去用

本课产出 `outputs/skill-mcp-auth.md`。给定一个 MCP server 配置和一组 IdP 能力，这个 skill 输出要立起来的鉴权表面——protected-resource 元数据、要用的入册路径（CIMD、预注册，或 DCR 兜底）、JWKS 刷新计划、scope 映射，以及当 IdP 不支持完整 RFC profile 时要施加的拒绝规则。

## 练习

1. 跑 `code/main.py`。追踪流程。注意 IdP 在第 6 步轮换一个密钥、计划 `refresh_jwks` 重新拉取已发布的密钥集，然后旧 token（重叠窗口）和一个新 token 都无需重启就校验通过。

2. 往 protected-resource 元数据的 `authorization_servers` 列表里加一个新 IdP。签发一个由新 IdP 签名的 token，确认校验器接受它。再签发一个由未列入的 IdP 签名的 token，确认校验器用 `WWW-Authenticate: Bearer error="invalid_token", error_description="iss not allowed"` 拒绝。

3. 往 `register_client` 里加一道限流检查，在注册器接受请求之前跑。用一个按来源 IP 的 token-bucket，存在一个以 IP 为键的小 dict 里。

4. 读 RFC 7591，找出本课的 `/register` 处理器没校验的两个字段。把校验加上。（提示：`software_statement` 和 `redirect_uris` 的 URI scheme。）

5. 加一条 Client ID Metadata Document 路径。提供一个 `client.json`，它的 `client_id` 等于它自己的 URL，并让 authorization server 拉取并校验它（如果 `client_id` ≠ URL 就拒绝）。确认一个 CIMD client 在不调 `register_client` 的情况下入册。

6. 证明那个 DoS 修复。给校验器发一个带随机 `kid` 的 token，确认 `refresh_jwks` 最多跑一次、且 authorization server 的密钥数不增长。然后故意把兜底重接成一个"轮换并铸新"，看着密钥数随每个伪造 token 往上爬——之后把重新拉取恢复回去。

7. 实现 mix-up 章节里那个 client 端的 RFC 9207 `iss` 检查：在 authorization 请求之前记下预期的 issuer，然后拒绝一个 `iss` 对不上的 authorization 响应。

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| ASM | "OAuth 元数据文档" | RFC 8414 `/.well-known/oauth-authorization-server` JSON |
| CIMD | "client 元数据 URL" | Client ID Metadata Document——一个被用作 `client_id` 的 HTTPS URL；AS 拉取那份 JSON。自 2025-11-25 起是推荐的默认做法 |
| DCR | "自助 client 注册" | RFC 7591 `POST /register` 流程；在 2025-11-25 被降级为一个 `MAY` 兜底 |
| JWKS | "用于 JWT 校验的公钥" | JSON Web Key Set，从 `jwks_uri` 拉取，按 `kid` 索引 |
| Rotate vs refresh | "更新密钥" | *Rotate* = AS 铸/退役签名密钥；*refresh* = resource server 重新拉取已发布的密钥集。resource server 只会 refresh |
| Resource indicator | "受众参数" | RFC 8707 `resource` 参数，把 token 钉到一个 server |
| `aud` claim | "受众" | 校验器拿来和规范 resource URL 对比的 JWT claim |
| Audience replay | "token 重放" | 为 Server A 签发的 token 被呈递给 Server B；靠受众校验防御（规范：access-token 权限收窄） |
| Confused deputy | "proxy token 滥用" | 一个用静态 client ID 的 MCP proxy，在没有逐 client consent 的情况下转发一个 token；和受众重放是两回事 |
| Mix-up attack | "错误的 token 端点" | client 被引导去把一个诚实 AS 的 code 拿到攻击者的端点兑换；靠 client 端 RFC 9207 `iss` 防御 |
| `iss` allow-list | "受信任的 authorization server" | protected-resource 元数据里 `authorization_servers` 给出的那个集合 |
| `resource_metadata` | "去哪找 PRM 文档" | 401/403 上指明 RFC 9728 元数据 URL 的 `WWW-Authenticate` 参数 |
| Public client | "原生或浏览器 client" | 没有 `client_secret` 的 OAuth client；由 PKCE 来补偿 |
| `WWW-Authenticate` | "401/403 响应头" | 携带驱动 client 恢复的 `Bearer error=...` 指令 |

## 延伸阅读

- [MCP——Authorization spec（2025-11-25）](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)——本课实现的 MCP 鉴权 profile
- [MCP 博客——One Year of MCP: November 2025 Spec Release](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)——2025-11-25 里变了什么（CIMD、XAA、DCR 降级）
- [Aaron Parecki——Client Registration in the November 2025 MCP Authorization Spec](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update)——CIMD 优先于 DCR 的理由
- [OAuth Client ID Metadata Document（draft-ietf-oauth-client-id-metadata-document-00）](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00)——CIMD
- [RFC 8414——OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)——discovery 契约
- [RFC 7591——OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)——DCR（兜底路径）
- [RFC 7636——Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)——public-client 的 proof-of-possession
- [RFC 8707——Resource Indicators for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc8707)——受众钉定
- [RFC 9728——OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)——resource server discovery
- [RFC 9207——OAuth 2.0 Authorization Server Issuer Identification](https://datatracker.ietf.org/doc/html/rfc9207)——防御 mix-up 攻击的那个 `iss` 参数
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)——整合后的 OAuth 底料
