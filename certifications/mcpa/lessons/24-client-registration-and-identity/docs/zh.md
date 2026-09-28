# 向 Authorization Server 证明 Client 身份

> MCP client 和保护新 server 的 authorization server 通常从未打过交道。因此，在授权任何操作前，authorization server 必须先判断 client 是否真如其自称。

**类型：** Reference
**语言：** Python
**前置要求：** 第 23 课
**预计时间：** 约 45 分钟

## 学习目标

- 解释为什么 MCP 的互操作承诺意味着 client 与 authorization server 往往没有既有关系，以及这如何影响注册流程
- 应用规范规定的四级注册优先级：预注册凭据、Client ID Metadata Document、Dynamic Client Registration，以及询问用户
- 按 authorization server 的要求校验 Client ID Metadata Document：`client_id` 精确匹配、带路径的 https URL，以及必需 metadata 字段
- 将持久化 client 凭据绑定到签发它们的 authorization server，并解释 authorization server 变更为何强制重新注册
- 识别静态 client id proxy 带来的 confused deputy 风险，并为无人值守或企业访问选择 OAuth Client Credentials 或 Enterprise-Managed Authorization extension

## 问题背景

MCP 的核心价值建立在一个理念上：今天编写的 client 应能使用从未见过的 server，今天编写的 server 也应能被其作者从未听说过的 client 使用。而普通 OAuth 恰恰不是为这种场景设计的。OAuth 2.1 假定 client 提前向 authorization server 注册，取得 client id，之后每次请求都复用它。如果一家公司只开发一款移动应用，并让它连接自家的 authorization server，提前注册很容易。但在 MCP 中，任何人构建的 client 都可能要连接其他人运营的任意 server，还要通过 server 运营方碰巧采用的 authorization server 完成授权，事情就没这么简单。

上一课讲了各角色：MCP server 是 OAuth resource server，MCP client 是 OAuth client，独立的 authorization server 负责签发 token。本课讨论在这些流程开始前必须完成的一步：双方可能从未协作时，client 如何取得 authorization server 愿意接受的 client id。如果这一步出错，后续授权流程根本无法启动；伪造 client 身份的攻击者会抢得冒充先机；client 若拿错误凭据去连接错误的 authorization server，还会交出本不属于对方的 token。

## 核心概念

规范为 client 规定了唯一的优先顺序。顺序很重要，因为只有上一项不可用时，下一项才成立：第一，若 client 已保存此 authorization server 的预注册信息，直接使用；第二，若 authorization server 声明支持 Client ID Metadata Document，使用该机制；第三，若它提供 registration endpoint，则回退到 Dynamic Client Registration；第四，也只有到这一步，才请 client 使用者手动输入 client 信息。

**预注册**是最简单的情况：client 开发者为特定已知 authorization server 硬编码 client id，或 server 运营方在用户手动注册后，通过配置界面发放 client id。双方已经相识时，这种方式很好用，常见于企业内部 server，却不适合 MCP 所面向的开放生态。

**Client ID Metadata Document（CIMD）**解决了 MCP 的常见情况：双方完全没有既有关系。CIMD client 使用 HTTPS URL 作为 client id，而不是 authorization server 签发的不透明字符串。例如 `https://app.example.com/oauth/client-metadata.json`，它指向 client 自行托管的 JSON 文档：

```json
{
  "client_id": "https://app.example.com/oauth/client-metadata.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "redirect_uris": ["http://127.0.0.1:3000/callback", "http://localhost:3000/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

当 authorization server 在 authorization request 中看到 URL 形式的 client id 时，会获取该 URL，并把文档视为 client 注册信息。文档至少要包含 `client_id`、`client_name` 和 `redirect_uris`；authorization server 必须确认文档内的 `client_id` 与所获取的 URL 逐字符精确匹配。正是这项相等性检查，让 URL 成为可信标识，而不是自说自话的声明：只有控制该 HTTPS 路径的人，才能在其末端放置匹配的 `client_id`。authorization server 还要根据文档中列出的 URI 校验 authorization request 中的每个 redirect URI，并应遵循普通 HTTP cache header 缓存文档，而不是每次登录都重新获取。支持此路径的 server 会在自身 metadata 中声明 `"client_id_metadata_document_supported": true`，client 正是据此判断是否尝试 CIMD 登录。

获取 client 提供的 URL 带来两项风险。首先，authorization server 会根据攻击者可影响的输入发起出站 HTTP 请求，因此必须防范 server-side request forgery：获取前校验 URL 及其解析地址、限制响应大小并设置超时。其次，CIMD client id 本身无法阻止攻击者在 `localhost` 冒充合法 client：攻击者可以声称使用真实 client 的 metadata URL，并绑定相同 loopback port。因此，规范要求 authorization server 对只含 localhost 的 redirect URI 显示额外警告，并始终在同意页面展示 redirect hostname。尽管如此，CIMD id 仍有 DCR id 不具备的真正优势：可移植。id 只是 authorization server 按需解析的 URL，所以同一个 client id 无需改动，即可用于 client 连接的每个 authorization server。

**Dynamic Client Registration（DCR）**是 CIMD 出现前 MCP 所依赖的方案。规范现已将它标为 deprecated，仅用于 client 仍需向尚未支持 CIMD 的 authorization server 注册。回退到 DCR 的 client 会把 metadata 发送到 `registration_endpoint`，得到专属于该 authorization server 的新 client id。考试还会关注一个细节：authorization server 在 DCR 之上实现 OpenID Connect 时，可以根据 client 声明的 `application_type` 执行不同的 redirect URI 规则。native application——桌面应用、移动应用、CLI 工具或通过 `localhost` 访问的本地托管应用——应声明 `application_type: "native"`。远程浏览器应用应声明 `"web"`。在 OIDC 中，省略该字段会默认采用 `"web"`，这对重定向到 loopback port 的 CLI 工具恰好是错误设置，注册可能因此遭拒。

无论通过哪条路径取得，持久化凭据只属于一个 authorization server，绝不抽象地属于某个 MCP server 或部署。规范要求 client 按签发者 issuer 为存储凭据建立 key，并禁止将一个 authorization server 的凭据用于另一个。client 通过观察目标 MCP server 的 protected resource metadata 来发现 authorization server 变更：若 metadata 现在指向不同的 authorization server，旧凭据就属于错误 issuer，client 必须重新注册，而不是悄悄试用。CIMD 凭据基本绕过了这个问题，因为同一个 URL id 到处有效；DCR 凭据则不同，每个 authorization server 都会生成自己的 id。

注册身份还会引出规范点名的一种攻击：confused deputy 问题。MCP proxy 可能用一个共享静态 client id，代表许多动态注册的下游 client 连接第三方 authorization server。攻击者可以诱骗它转发属于另一个下游 client 的 authorization code，而用户实际批准的并非该 client。缓解方式属于流程控制，不是密码学：proxy 在向前转发每个动态注册下游 client 的请求前，必须分别取得用户对该 client 的同意，不能把用户对静态 client id 的同意视为对隐藏在其后的所有 client 的同意。

到目前为止，每条路径都假定有人可以点击批准。两种官方 authorization extension 覆盖了这项假设不成立的情况。它们与其他 MCP extension 一样协商：client 在每次请求的 `io.modelcontextprotocol/clientCapabilities.extensions` 中声明支持，server 在 `server/discover` 返回的 capabilities 中声明自身支持；任何一方都不必实现。

```json
{
  "io.modelcontextprotocol/clientCapabilities": {
    "extensions": {
      "io.modelcontextprotocol/oauth-client-credentials": {}
    }
  }
}
```

**OAuth Client Credentials** 适合后台服务、CI pipeline 或需要定时调用 MCP server、却没有人可交互批准的 daemon。client 使用自身凭据直接向 authorization server 验证身份：可以使用自行签名的 JWT bearer assertion，规范推荐这种方式，因为签名密钥无需离开 client；也可以向 token endpoint 发送 client secret，后者更简单，却是一项长期凭据，任何窃取者都能借此访问。**Enterprise-Managed Authorization** 适合相反的问题：组织希望由自己的 identity provider，而不是每个 MCP server 的 authorization server，决定谁可以访问什么。员工通过常规企业 SSO session 登录 MCP client；client 从企业 identity provider 换取名为 ID-JAG 的短期 token，再用 ID-JAG 换取 MCP access token，全程无需将用户重定向到 MCP authorization server 自己的登录页面。决策集中后，管理员只需在 identity provider 撤销一次权限，不必追查员工曾逐一授权的每组 MCP client 与 server。

```figure
mcpa-24-registration-paths
```

## 交互实验

图中从上到下排列四级优先顺序。每个方框都标有 client 尝试该路径前必须满足的条件，并用标为“若不可用”的箭头连接下一项。第三个方框 Dynamic Client Registration 使用虚线边框，表示它已 deprecated，而非删除：仍然可用，只是不再是 client 的首选。阶梯旁的小清单重复列出 authorization server 实际会校验 Client ID Metadata Document 的哪些内容，以及为何凭据要按 issuer 而不是 server 建立 key。打开代码前，先顺着方框推演 client 的决策：是否已有此 authorization server 的存档信息？authorization server 自身 metadata 是否声明支持 CIMD？是否公开 registration endpoint？还是只能询问用户？

## 实践实验

打开 `code/main.py`。它模拟三个 capability 不同的 authorization server：一个声明支持 CIMD，一个只提供 DCR `registration_endpoint`，另一个两者都不提供。`choose_registration_path` 按核心概念中的相同优先顺序执行：用空的预注册存储对第一个 authorization server 运行时，选择 `cimd`；若存储中已有该 authorization server 的 issuer，再运行一次则由预注册获胜，即使 CIMD 可用也一样，因为首先检查预注册。第二个 authorization server 不支持 CIMD，所以 planner 回退到 `dcr`，并将该决策标为 deprecated。第三个两者皆无，所以 planner 返回 `ask-user`。

```bash
python3 code/main.py
```

`validate_cimd` 扮演 authorization server，处理 URL 形式 client id：检查 URL 使用 https 且带真实路径；检查文档包含 `client_id`、`client_name` 和 `redirect_uris`；检查文档的 `client_id` 与获取 URL 精确匹配；检查每个 redirect URI 使用 https 或 loopback 地址。运行演示并比较四份文档：有效文档没有任何问题；一份文档的 `client_id` 与自身 URL 不匹配；一份使用 `http` 而非 `https`；还有一份完全缺少 `redirect_uris`。接着，`CredentialStore` 强制绑定 authorization server：凭据按签发 issuer 注册，使用不同 issuer 调用 `.use()` 会抛出 `ValueError`，并明确指出凭据实际属于哪个 issuer。`ProxyConsentLedger` 将 confused deputy 缓解方案建模为静态 client id 与下游 client id 的小型 pair 集合；只有针对该精确 pair 调用 `record_consent` 后，`may_forward` 才返回 true。最后，`recommend_auth_extension` 根据场景描述在两种 authorization extension 中作出选择；演示的最后一次交互展示已注册的 `acme-ops-cli` client 如何携带 client-credentials token，在线上发送真实 `server/discover` 和 `tools/call`，token 记录在请求的 HTTP header 中，与 Streamable HTTP 请求实际携带的 header 一致。

## 交付产物

`outputs/client-registration-guide.md` 是一页式版本：包含优先顺序、authorization server 检查的 CIMD 要求、`application_type` 规则、authorization-server-binding 规则、confused deputy 缓解措施，以及对比两种 authorization extension 的表格。决定新 MCP client 如何注册时，可将它放在手边。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试检查本课各项主张：即使声明支持 CIMD，预注册凭据仍优先；CIMD 优先于 deprecated DCR 回退；两者都不支持时，client 只能询问用户；有效 Client ID Metadata Document 不产生问题；`client_id` 不匹配和使用 http scheme 都会以明确原因遭拒；缺少必填字段的文档遭拒；loopback redirect 的 `application_type` 为 native，远程 redirect 则为 web；为一个 issuer 注册的凭据不能用于另一个 issuer；confused-deputy proxy 只有在为精确 pair 记录同意后，才能转发下游 client；两种 authorization extension 会推荐给正确场景；已注册 client 的线协议交互携带 bearer token 及必需 HTTP header。仓库的线协议检查器还会按 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/24-client-registration-and-identity
```

## 综合项目关联

综合项目的端到端交互包含一次已授权调用，而该调用之所以有 token 可提交，是因为本课某条注册路径已经执行：预注册 id、获取并校验 CIMD，或者现在较少使用的 DCR 往返。无论综合项目 client 采用哪条路径，其凭据都应存放在按 issuer 建立 key 的存储中，与这里构建的 `CredentialStore` 形态一致。下一课紧接本课终点：client 证明身份后，同意机制将决定它实际获准做什么。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Client registration | MCP client 在请求 token 前，取得 authorization server 能识别的 client id 的过程 |
| Client ID Metadata Document（CIMD） | client 在自身 client_id URL 上托管的 HTTPS 文档，由 authorization server 按需获取和校验 |
| Dynamic Client Registration（DCR） | 已 deprecated 的 RFC 7591 registration-endpoint 流程，为尚未支持 CIMD 的 authorization server 保留 |
| 预注册 | 提前与 authorization server 建立的 client 信息，可以硬编码或由用户输入 |
| Authorization server binding | 按签发 issuer 为持久化 client 凭据建立 key，绝不用于其他 authorization server |
| application_type | DCR 参数 `native` 或 `web`，告诉 OIDC authorization server 应预期哪种 redirect URI |
| Confused deputy | proxy 使用一个静态 client id 代表多个下游 client，却没有逐 client 同意 |
| Authorization extension | 改变 client 获取 token 方式的可选协商机制，例如 OAuth Client Credentials 或 Enterprise-Managed Authorization |

## 延伸阅读

- [MCP specification 2026-07-28: Client Registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)
- [MCP specification 2026-07-28: Authorization Security Considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [MCP Authorization Extensions overview](https://modelcontextprotocol.io/extensions/auth/overview)
- [OAuth Client Credentials extension](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials)
- [Enterprise-Managed Authorization extension](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization)
- [SEP-991: Enable URL-based Client Registration using OAuth Client ID Metadata Documents](https://modelcontextprotocol.io/seps/991-enable-url-based-client-registration-using-oauth-c)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 12 节
