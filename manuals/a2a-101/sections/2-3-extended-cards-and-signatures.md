# 扩展卡片与签名

> `GetExtendedAgentCard` 向已认证调用者返回更完整的卡片，`signatures` 让任何调用者确认卡片确为发布者所签。

planner 持有 bearer token，读取 `deployer` 的公开卡片。卡片带签名，`extendedAgentCard` 标志表示已认证调用者能看到更多内容。

读完本节后，你可以获取扩展卡片，并按规范签名和验证卡片。

## GetExtendedAgentCard {#s-extended-cards-and-signatures-getextendedagentcard}

**扩展卡片：** agent 通过 `GetExtendedAgentCard` 向已认证调用者返回的更完整卡片，包含公开卡片没有的额外细节或技能。 {{spec §3.1.11}}

调用需要凭据：客户端必须用公开 `AgentCard.securitySchemes` 和 `AgentCard.security` 声明的方案之一认证请求。规则仍写 `security`，1.0 已改为 `securityRequirements`（[冲突 D6](#s-ref-sources)）。[PR #2046](https://github.com/a2aproject/A2A/pull/2046)在 main 修复 §8.5 示例，§3.1.11 正文仍写 `security`。 {{spec §3.1.11}} {{proto AgentCard}}

附录 A.2.2 将 0.3 标志称为 `supportsExtendedAgentCard`，迁移指南则写 `supportsAuthenticatedExtendedCard`（[冲突 D40](#s-ref-sources)）。附录把新标志放在字段 5，proto 用的是 4（[冲突 D7](#s-ref-sources)）。 {{spec §A.2.2}} {{docs whats-new-v1}} {{spec §1.4}} {{proto AgentCapabilities}}

[此图](#fig-extended-card)显示 `deployer` 先拒绝无 token 的调用，然后返回公开卡片加第二个技能，不含 `signatures`。

```figure
id: fig-extended-card
kind: sequence
title: 获取扩展卡片
claim: 同一 `GetExtendedAgentCard` 调用无 token 时在 A2A 方法运行前返回 HTTP 401，附上 token 后返回含第二个技能的卡片。
caption: 时间向下推进。步骤 1、2 来自 capture/out/01-agent-cards.http。步骤 3、4 是 capture/out/18-extended-card.http 的第 1 次交换，步骤 6、7 是第 2 次交换。token 来自平台团队，不属于 A2A。
```

```listing
title: 带 token 的 GetExtendedAgentCard 及其新增技能
source: capture/out/18-extended-card.http
lang: http
note: 第 2 次交换，只保留 token 和第二个技能。卡片其余内容与公开卡片相同，但不含签名。
---
### 2 · GetExtendedAgentCard: with a token
…
Authorization: Bearer dpl_test_7c1e4b
…
HTTP/1.1 200 OK
…
      {
        "id": "rollback",
        "name": "Roll back a deploy",
        "description": "Return staging to the previous build. Shown only to authenticated callers.",
        "tags": [
          "deploy",
          "rollback"
        ]
      }
```

客户端 `SHOULD` 在认证会话持续期间或卡片版本变化之前，用扩展卡片替换缓存的公开卡片。此类卡片 `SHOULD NOT` 包含泄露后可被利用的敏感信息。如果标志已声明却没有配置卡片，返回 `ExtendedAgentCardNotConfiguredError`，代码 `-32007`。 {{spec §3.1.11}} {{spec §13.3}} {{spec §3.3.4}} {{spec §5.4}}

官方 SDK 将凭据检查交给宿主。下表说明宿主不添加检查时，谁能获取卡片。

| SDK | 宿主不检查时，谁能获取扩展卡片 |
|---|---|
| Python 1.2.2 | 任何调用者。`extended_card_modifier` 钩子接收调用上下文，可据此改变卡片。  {{sdk src/a2a/server/request_handlers/default_request_handler_v2.py}} |
| Go v2.6.0 | 任何调用者。`CallInterceptor` 或卡片生成器可拒绝调用。  {{sdk-go a2asrv/handler.go at v2.6.0}} |
| Java v1.4.0.Final | 核心处理器按设计允许任何调用者。Quarkus 参考服务器将路由标为 `@Authenticated`。  {{sdk-java SECURITY.md at v1.4.0.Final}}  {{sdk-java reference/jsonrpc/src/main/java/org/a2aproject/sdk/server/apps/quarkus/A2AServerRoutes.java at v1.4.0.Final}} |
| JS v1.3.0 | 卡片为静态对象时只向已认证用户提供，其他人无错误地得到公开卡片。使用 provider 函数时由函数自行决定。  {{sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0}} |
| .NET v1.0.0-preview2 | 默认无人能获取，因为方法抛出 `ExtendedAgentCardNotConfiguredError`。应用覆盖方法并添加自己的检查。  {{sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2}} |
| Rust a2a-server-lf-v0.5.1 | 任何调用者。resolver 能看到请求头，可据此改变卡片。  {{sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1}} |

## 为卡片签名 {#s-extended-cards-and-signatures-signing-a-card}

**卡片签名：** `signatures` 中可选的条目，保存按 RFC 7515 定义、覆盖卡片的 JSON Web Signature。 {{spec §8.4}}

每个条目保存 base64url 编码的 `protected` 头和 `signature`。验证者按三条规则从收到的卡片重建签名字节： {{proto AgentCardSignature}} {{spec §8.4.1}}

1. **字段是否存在。** `REQUIRED` 字段必须一直存在，即使值等于默认值。带 `optional` 关键字的字段只要设置过就保留，其他处于默认值的字段删除。 {{spec §8.4.1}}
2. **RFC 8785。** JSON Canonicalization Scheme 对对象键排序，为每个值固定一种形式，并删除空白。 {{spec §8.4.1}}
3. **排除签名。** 签名内容必须排除 `signatures` 字段自身，避免循环依赖。 {{spec §8.4.1}}

受保护头包含 `alg`、`typ`、`kid`，但 `typ` 一行在 `MUST` 标题下写 `SHOULD`（[冲突 D20](#s-ref-sources)）。可选的 `jku` 指向含公钥的 JSON Web Key Set。 {{spec §8.4.2}}

签名时，将 base64url 头与规范化负载用句点连接，使用 `kid` 指定的密钥签署该输入。 {{spec §8.4.2}}

```listing
title: deployer 卡片的规范化、签名与检查
source: capture/out/17-signed-card.txt
lang: text
note: 负载和签名输入在行内删节。步骤 2 打印带空格的头，编码后的字节不含空格。
---
# 1. canonical payload (RFC 8785): the card without signatures, keys sorted, no spaces
{"capabilities":{"extendedAgentCard":true,"streaming":true},…"version":"1.4.1"}

# 2. protected header, decoded
{"alg": "HS256", "typ": "JOSE", "kid": "deployer-key-1"}

# 3. JWS signing input: BASE64URL(header) '.' BASE64URL(payload)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpPU0UiLCJraWQiOiJkZXBsb3llci1rZXktMSJ9.eyJjYXBhYmlsaXRpZXMiOnsi…

# 4. the signature entry published in the card
{
  "protected": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpPU0UiLCJraWQiOiJkZXBsb3llci1rZXktMSJ9",
  "signature": "yPk834ji_dOVmxElhzV3yTYBT9NVp8Bx1j5K0LQmOww"
}

# 5. verify the published card: True
# 6. verify after changing the description to name production: False
```

套件用 `HS256` 签名，见[套件 README](manuals/a2a-101/capture/README.md)。真实卡片使用 `ES256` 或 `RS256`，因为 HMAC 验证者也持有签名密钥。 {{spec §8.4.2}}

## 验证卡片 {#s-extended-cards-and-signatures-verifying-a-card}

验证包含六个 `MUST` 步骤。它们获取签名，通过 `kid` 和 `jku` 或可信存储获取公钥，然后对重建的负载进行验证。 {{spec §8.4.3}}

重建时遵守规则 1，尽管签名和验证步骤都笼统地要求删除默认值属性（[冲突 D21](#s-ref-sources)，仍开放的 [issue #2249](https://github.com/a2aproject/A2A/issues/2249)）。 {{spec §8.4.2}} {{spec §8.4.3}}

套件对发布的卡片验证成功，对将描述改为生产环境的副本验证失败（`capture/run.py`），因为规范化字节改变了。[此图](#fig-card-signature)展示两次检查。

```figure
id: fig-card-signature
kind: flow
title: 签署与验证 deployer 卡片
claim: 签名覆盖排除 `signatures` 后的卡片 RFC 8785 字节，修改描述会改变字节并使验证失败。
caption: 上半部分先从左到右再向下读，下半部分从左到右读。步骤 5、6 是 capture/out/17-signed-card.txt 的最后两行。值缩短至 8 个字符。
```

客户端 `SHOULD` 在信任 Agent Card 前验证至少一个签名，绝不能使用过期或撤销的密钥。像参考 SDK 一样给验证者明确的允许算法列表，防止算法混淆攻击。[安全要求](#s-security-requirements)介绍卡片伪造。 {{spec §8.4.3}} {{sdk src/a2a/utils/signing.py}}

```takeaways
- 调用 `GetExtendedAgentCard` 时发送已声明的凭据，在服务器上先进行认证检查。
- 排除 `signatures`，用 `ES256` 或 `RS256` 签署卡片的 RFC 8785 字节，并发布公钥。
- 信任卡片之前，用明确的允许算法列表验证至少一个签名。
```

Sources: spec §1.4, §3.1.11, §3.3.4, §5.4, §8.4, §8.4.1, §8.4.2, §8.4.3, §13.3, §A.2.2 (research/sources/specification.md); proto AgentCard, AgentCapabilities, AgentCardSignature (research/sources/a2a.proto); docs/whats-new-v1.md at v1.0.1; sdk src/a2a/server/request_handlers/default_request_handler_v2.py, src/a2a/utils/signing.py; sdk-go a2asrv/handler.go at v2.6.0; sdk-java SECURITY.md, reference/jsonrpc/src/main/java/org/a2aproject/sdk/server/apps/quarkus/A2AServerRoutes.java at v1.4.0.Final; sdk-js src/server/request_handler/default_request_handler.ts at v1.3.0; sdk-dotnet src/A2A/Server/A2AServer.cs at v1.0.0-preview2; sdk-rust a2a-server/src/handler.rs at a2a-server-lf-v0.5.1; capture/README.md, capture/run.py; capture/out/01-agent-cards.http, 17-signed-card.txt, 18-extended-card.http
