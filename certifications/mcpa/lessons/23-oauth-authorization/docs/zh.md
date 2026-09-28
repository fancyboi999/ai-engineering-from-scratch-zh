# 为 MCP Server 授权访问

> Bearer token 只能证明 client 获得了访问此 server 的凭据，不代表 server 应信任 token 持有者提出的一切要求。因此，协议要求 client 每次都证明 token、audience 和 issuer。

**类型：** Reference
**语言：** Python
**前置要求：** 第 22 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释为什么 MCP server 扮演 OAuth 2.1 resource server、MCP client 扮演 OAuth client，而独立的 authorization server 负责签发 token；并说明为什么 stdio server 应完全跳过此流程
- 从 401 响应的 WWW-Authenticate header 开始，追踪 Protected Resource Metadata 发现过程，包括 header 没有提供信息时 client 使用的 well-known 回退顺序
- 追踪带路径 issuer 和根 issuer 的 authorization server metadata 发现过程，并解释为什么返回的 issuer 值必须与构造请求时使用的值一致
- 使用标准库从 code verifier 生成 PKCE S256 code challenge，并解释 authorization server 未声明 code_challenge_methods_supported 时 client 为何必须拒绝继续
- 应用 RFC 8707 的 resource 参数，将 token 请求绑定到一个规范 server URI，并根据同一 URI 校验传入 token 的 audience
- 应用 RFC 9207 的四行 iss 校验表来防御 mix-up 攻击，并区分 MCP server 授权响应中的 401、403 和 400

## 问题背景

目前为止，本路线的大部分内容都假定：请求只要格式正确——带有正确的 `_meta`、已知工具和有效参数——就是合法的。可一旦 MCP server 掌握了值得保护的东西，例如客户记录数据库、密钥轮换工具或计费系统，这项假设就失效了。公开此类 primitive 的 server 不能放行每个语法正确的 `tools/call`。在执行任何调用方无法撤销的操作前，它必须知道是谁提出请求、依据谁的授权，以及要做什么。

MCP 在协议层将授权设为可选：本地 stdio server 不需要它，因为进程边界和用户自己的环境已经建立了信任；这里的实现根本不应运行 OAuth 流程，而应从环境变量读取凭据。但当 server 转为远程 HTTP 部署，这条边界便消失了，规范建议 HTTP 实现遵循本课讲解的授权流程。难点不在加密或传输，这些已经由下层处理。真正困难的是，在没有 session 可依赖的情况下，每次请求都要证明：手中的 token 确实由 client 信任的 authorization server 针对此 server 签发，并且用户确实同意了授权。

## 核心概念

整个流程由三个角色承担。术语必须准确，因为规范严格按这些名称表达。MCP server 是 **OAuth 2.1 resource server**：它持有受保护的 primitive，负责接受或拒绝 bearer token。MCP client 是 **OAuth 2.1 client**：它代表用户驱动基于浏览器的授权流程，并在请求中附上 token。**Authorization server** 是第三个角色，通常是完全独立的服务，例如托管身份提供商，负责验证用户身份并生成 token。三个角色都不是模型：授权发生在传输层，完全位于模型可见范围之下。上一课的信任区域图将第三个角色完全放在 host 边界之外：client 直接与其通信，而 MCP server 可能永远看不到用户原始凭据，只看到流程末端产生的 token。

流程从拒绝开始。client 发送不带 token 的普通 `tools/call`，server 返回纯 HTTP `401 Unauthorized`，而不是 JSON-RPC 错误。此时请求尚未进入协议消息解析阶段，因此没有 `result` 或 `error` body，只有 HTTP 层自己的状态和 header。server 应在 `WWW-Authenticate` header 中指出到哪里获取更多信息：

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp"
```

这个 URL 指向 **Protected Resource Metadata** 文档（RFC 9728），每个 MCP server 都必须实现它。如果 client 在 header 中找到 `resource_metadata`，就精确获取该 URL。如果没有——header 可能因基础设施原因缺失，也可能只是没有该参数——则必须自行按顺序构造 well-known URI：先尝试路径专用位置，即 `/.well-known/oauth-protected-resource` 加 MCP endpoint 自身路径；再尝试根位置，即不带任何路径的 `/.well-known/oauth-protected-resource`。对于 endpoint `https://mcp.example.com/mcp`，若没有 header 可读，正好要依次尝试这两个 URL，路径专用位置在前。返回的文档会列出该资源背后的 authorization server：

```json
{
  "resource": "https://mcp.example.com/mcp",
  "authorization_servers": ["https://auth.example.com/tenant-a"],
  "scopes_supported": ["vault:rotate"]
}
```

识别 authorization server 后，client 继续发现其 endpoint。MCP 复用 RFC 8414 默认的 `oauth-authorization-server` well-known suffix，而不是自创新格式。issuer 既可能带路径，也可能不带，所以 client 必须尝试多种形式。对于带路径 issuer `https://auth.example.com/tenant-a`，顺序为：先尝试把路径插入 `.well-known` 后的 OAuth metadata，再尝试以相同方式插入路径的 OpenID Connect discovery，最后尝试把路径放在 `.well-known` 前的 OpenID Connect discovery。不带路径的 issuer 则直接尝试前两种形式，无需插入路径。无论哪个 URL 返回结果，文档自身的 `issuer` 字段都必须逐字符等于构造该 URL 时使用的 issuer 标识。若从 `https://attacker.example/.well-known/oauth-authorization-server` 获取的文档声称 `"issuer": "https://honest.example"`，必须直接拒绝；否则，只控制一个 hostname 的攻击者就能替完全不同的 authorization server 身份背书。

在把用户浏览器重定向到任何地方前，client 会生成 PKCE pair。MCP 无条件要求 PKCE，并要求 client 在技术可行时使用 `S256` 方法。OAuth 2.1 和 PKCE 都没有定义用于询问 authorization server 是否支持 PKCE 的机制，因此 MCP client 从 metadata 文档读取 `code_challenge_methods_supported`：如果缺少该字段，client 必须彻底拒绝继续，因为没有其他办法确认 PKCE 会生效。verifier 是 client 私下保存的随机字符串，challenge 则会在线上传输：

```python
import base64
import hashlib
import secrets

verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode("ascii")
digest = hashlib.sha256(verifier.encode("ascii")).digest()
challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
```

另外两个值会同时出现在 authorization request 和后续 token request 中。`resource` 参数（RFC 8707）指定 client 真正想用 token 访问的 MCP server 规范 URI：scheme 和 host 使用小写、不带 fragment，除非结尾斜杠有实际含义，否则不保留。即使 authorization server 忽略该参数，也必须发送它，因为谨慎的 authorization server 正是借此把 token 限定到单个资源，而不是自己签发过的所有资源。`state` 参数则为每次请求重新生成并在返回时校验，用来阻止攻击者将其他 authorization response 偷换成 client 实际发起请求的响应。

Authorization server 签发 code 并通过 redirect 返回。client 在信任 redirect 中的任何内容前，先应用 RFC 9207 的 `iss` 检查。否则，控制了 client 恰好信任的某个 authorization server 的攻击者，可以诱骗 client 将本应交给一个 issuer 的 authorization code 发给完全不同的 issuer，这就是 mix-up 攻击。重定向前记录的 issuer 与返回的 `iss` 按以下四项规则比较：

| Server 声明 `authorization_response_iss_parameter_supported` | 响应中的 `iss` | Client 操作 |
|---|---|---|
| true | 存在 | 与记录的 issuer 精确比较 |
| true | 缺失 | 拒绝响应 |
| false 或缺失 | 存在 | 与记录的 issuer 精确比较 |
| false 或缺失 | 缺失 | 继续 |

只有精确匹配才能继续；比较前不折叠大小写、不省略端口，也不规范化结尾斜杠。错误响应同样要检查：若不匹配，client 不得处理或显示 `error`、`error_description` 或 `error_uri`，因为它们来自 client 从未选择的 issuer。code 通过校验后，client 在 token endpoint 交换 token，同时发送同一个 `resource` 参数和 PKCE `code_verifier`，供 authorization server 与先前收到的 `code_challenge` 比对。最终得到 bearer token。

使用 token 时，要重复本路线已经建立的纪律：凭据随每次请求重新附在 header 中，就像 `_meta` 在每次请求中携带协议版本和 capability，而不是只在连接开始时发送一次，这与前面课程的无状态核心一致。具体来说，每个发往 server 的 HTTP 请求都要带 `Authorization: Bearer <token>`；access token 绝不能放在 URI query string 中，否则会泄露到日志、proxy 和浏览器历史。收到 token 不等于可以信任它。resource server 必须验证 token 的 audience 明确指向此 server，也就是 `resource` 参数中的同一个规范 URI；其他 token 一律拒绝，包括由另一个 MCP server 为自身签发、形式完全有效的 token。如果此 server 代表用户进一步调用上游 API，它在该链路上要充当自己的 OAuth client，并使用独立 token；严禁直接转发刚收到的 token，也就是 token passthrough，因为这会让上游 API 把此 server 的权限误认成原调用方权限，绕过上游原本授予的 scope。

三种 HTTP 状态码表示不同结果，考试常会混淆它们：`401 Unauthorized` 表示没有 token 或 token 无效，例如缺失、过期、无法解析或 audience 错误；`403 Forbidden` 表示 token 验证通过，但缺少所需 scope；`400 Bad Request` 表示授权请求本身格式错误，此时甚至还没有 token 参与。client 注册（最初如何取得 `client_id`）以及 token 已存在后如何请求更多 scope，都足够复杂，将在接下来的独立课程中讲解。

```figure
mcpa-23-oauth-flow
```

## 交互实验

图中沿三条泳道追踪一次凭据轮换调用。顶部泳道里，client 首次尝试完全不带 token；server 只返回带 `WWW-Authenticate` header 的 HTTP 401，没有 JSON-RPC body，因为请求在解析为协议消息前就遭拒绝。中间泳道里，client 根据 header 获取 Protected Resource Metadata，再按路径 issuer 顺序获取 authorization server metadata，生成 PKCE pair，并从 authorization server 带着 code 和 `iss` 返回；它会把 `iss` 与跳转前记录的值比较。底部泳道里，client 重复同一个 `tools/call`，这次设置 `Authorization: Bearer`；server 的 resource server 层因 token audience 是自身规范 URI 而接受请求，之后请求才进入本路线前面课程一直构建的普通工具处理代码。

## 实践实验

打开 `code/main.py`。`simulate_authorization_flow` 完全使用 Python 数据构建 metadata discovery、PKCE、resource indicator 和 issuer 检查，与 client 实际计算方式一致。这部分没有 JSON-RPC：Protected Resource Metadata 和 authorization server metadata 分别使用一个 `dict`，两个 OAuth 请求则使用 `AuthorizationRequest` 和 `TokenRequest` dataclass。另一边，`McpServer` 和 `McpClient` 只模拟 MCP 侧：唯一工具 `rotate_credential` 由 `ResourceServer` 保护；后者持有两个已签发 token，一个 audience 与此 server 的规范 URI 匹配，另一个则签发给完全不同的 server。在课程目录运行：

```bash
python3 code/main.py
```

先对照核心概念阅读打印出的发现顺序：两个 Protected Resource Metadata URL，路径专用在前、根位置在后；三个 authorization server metadata URL，因为演示中的 issuer 带有路径。再看两条 transcript 记录。第一条是未经授权的 `tools/call`，外层包含真正承载它的 HTTP 状态和 header：`401`，没有 `result`、没有 `error`，这正是请求在 JSON-RPC 层以下遭拒时的规范形式。第二组是使用有效 bearer token 重试的同一调用：包装后的请求带有 `Authorization: Bearer tok_valid_abc` 和状态 `200`，随后是普通的 `resultType: "complete"` 结果及新 request id。将 `foreign_token` 的值改成有效调用使用的值并重新运行，即可观察为 `https://other-server.example.com/mcp` 签发的 token 如何因 audience 检查被本 server 拒绝，即使 token 本身格式完全正确。

## 交付产物

`outputs/authorization-flow-checklist.md` 是一页式版本：包含 Protected Resource Metadata 和 authorization server metadata 的发现顺序、PKCE 拒绝规则、`resource` 参数格式、`iss` 决策表，以及三种状态码的真实含义。第一次为远程 MCP server 配置授权时，可将它放在手边。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试检查本课各项主张：Protected Resource Metadata discovery 优先采用 `WWW-Authenticate` header 中的 `resource_metadata`，否则按路径专用、根位置的顺序回退到 well-known URL；authorization server metadata discovery 对带路径 issuer 排列三个 URL，对根 issuer 排列两个 URL；metadata 文档的 `issuer` 与请求值不符时遭拒；PKCE `S256` challenge 等于独立计算的 `base64url(sha256(verifier))`；缺少 `code_challenge_methods_supported` 的 authorization server 会在任何 redirect 前遭拒；`resource` 参数经过规范化，并同时出现在 authorization request 和 token request；四行 `iss` 表双向生效；为其他 server audience 签发的 token 即使其他方面有效，仍以 `401` 拒绝；token 永远不会放入 URL。仓库的线协议检查器还会按 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/23-oauth-authorization
```

## 综合项目关联

综合项目的端到端交互包含一个 resource server，它会校验 audience 并拒绝为其他 server 签发的 token，这正是本课构建的检查。综合项目对此步骤的全部假设——bearer token 的可信度取决于其绑定的 audience、HTTP 层拒绝不会生成 JSON-RPC body、token 实际绑定到规范 resource URI——都直接来自本课。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Resource server | MCP server 在 OAuth 2.1 中扮演的角色：接受或拒绝 bearer token |
| Authorization server | 验证用户身份并签发 token 的独立服务 |
| Protected Resource Metadata | RFC 9728 文档，列出 resource server 背后的一个或多个 authorization server |
| PKCE | 一对 verifier 和 challenge，用于防止被盗 authorization code 在其他位置兑换 |
| S256 | 强制使用的 PKCE 方法：challenge 等于 base64url(sha256(verifier)) |
| Resource indicator | RFC 8707 的 resource 参数，将 token 请求绑定到一个规范 server URI |
| iss 校验 | 根据 RFC 9207，将 authorization response 的 issuer 与 redirect 前记录的值比较 |
| Audience 校验 | resource server 在接受 token 前，确认 token 专门为自己签发 |
| Token passthrough | 把 client token 转发给上游 API，而不使用独立 token；此做法被禁止 |
| 401、403 与 400 | 分别表示没有或 token 无效、scope 不足，以及授权请求格式错误 |

## 延伸阅读

- [MCP 2026-07-28 规范：授权](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP 2026-07-28 规范：授权服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)
- [MCP 2026-07-28 规范：授权安全注意事项](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [MCP 教程：理解授权](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/authorization)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 12 节
- `phases/13-tools-and-protocols/16-mcp-security-oauth-2-1` 和 `phases/13-tools-and-protocols/18-mcp-auth-production`，深入构建 OAuth 流程及其生产加固方案
