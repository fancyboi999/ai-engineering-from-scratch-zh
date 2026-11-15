# Actor JWT

> actor 本身不保存自己的身份令牌：出站网关签发 actor JWT，并将其放入出站规则指定的请求头中。

你的 actor 会调用你运行的某个服务，而该服务必须知道是哪一个 actor 在发起调用。通常的做法是在工作负载内部放入机密。但 actor 并不适合存放机密，因为它的内存会写入每个快照，任何编辑者都能复制它。Substrate 给 actor 提供了一种无需由 actor 自己存储的身份。不过，当服务把令牌原样返回时，actor 依然能读到它。

读完本节，你能编写附加 actor JWT 的出站规则，并列出令牌中的各项声明。你还能说出服务在信任该令牌前必须执行哪些检查。

我们的运行展示了两条实际生效的规则。一条是 kagent 为每个会话编写的规则。另一条是我们自己的规则，它把令牌发送给一个会回显请求头的服务，这样我们就能解码该令牌。末尾列出的限制来自 v1.0.0 的文档，我们会说明在运行中观察到了其中的哪些情况。

## 网关发起申请，actor 不参与 {#s-actor-jwts-the-gateway-asks-the-actor-does-not}

**Actor JWT：** 由 `ate-api-server` 签发的一个签名令牌，指明某一个 actor 以及一个或多个受众（audience）。

没有 API 允许 actor 主动索取自己的令牌。令牌只出现在出站请求上，而且仅在出站规则明确要求时才会生成 {{code}}。

```figure
id: fig-5-3
kind: sequence
title: actor JWT 如何到达 actor 调用的服务
claim: 出站网关签发令牌并用它替换请求头，使服务收到一个并非由 actor 亲手发送的身份。
caption: 从上往下读。绿色是 actor，靛蓝色是出站网关，蓝色是控制平面，紫红色是 kagent 控制器。名称和数字来自某个 kagent 会话的策略。来源：capture/lab/K-kagent/session1/egress-policy-actor.yaml。
```

具体步骤如下：

1. actor 向其出站策略允许的主机发送普通请求。
2. 出站网关找到针对该主机的规则，发现其中配置了 `actorJwt` 效果（effect）。
3. 网关调用 `ate-api-server` 上的 `MintActorJwt`，并带上规则中指定的受众和有效期。
4. 网关把令牌写入规则指定的请求头，并将请求继续转发出去。

只有出站网关被允许调用 `MintActorJwt`。全局所有者也会被拒绝，正如[按 atespace 划分的访问策略](#s-access-policies)所解释的那样。

## kagent 编写的规则 {#s-actor-jwts-the-rule-that-kagent-writes}

kagent 自身的流量需要依赖这种机制。每个会话都是一个 actor，actor 内的 harness 会向 kagent 控制器汇报。下面是我们的运行中 kagent 为某一个会话编写的出站策略的第一条规则 {{run}}。

```listing
title: 带 actor JWT 的出站规则
source: capture/lab/K-kagent/session1/egress-policy-actor.yaml
lang: yaml
note: 三条规则中的第一条。元数据和其他两条规则已省略。
---
rules:
- http:
    effects:
      replaceHeaders:
      - actorJwt:
          audiences:
          - kagent-runtime
          expirationSeconds: "300"
        header: authorization
        prefix: 'Bearer '
    hostnames:
    - kagent-controller.kagent.svc.cluster.local
    ports:
      numbers:
      - 8083
```

请从下往上读。该规则匹配发往端口 8083 上某个主机的普通 HTTP 请求。对于匹配的请求，网关将 `authorization` 请求头替换为 `Bearer ` 加上一个新签发的令牌。该令牌面向受众 `kagent-runtime`，有效期为 300 秒，这是 API 接受的最短有效期。

出站网关的日志展示了结果。harness 调用了控制器，请求带上了 `authorization` 请求头，控制器返回了 200。

```listing
title: 一次携带了令牌的请求
source: capture/lab/K-kagent/session1/atenet-egress.excerpt.log
lang: text
note: 一行日志，末尾附近已作截断。agentgateway 数据平面在调试行里将 authorization 请求头的值打印为 Sensitive。
---
2026-11-12T10:19:50.777573Z	info	request request.id=64 gateway=default/default listener=listener1 route=default/route0 endpoint=kagent-controller.kagent.svc.cluster.local:8083 src.addr=10.244.0.23:59184 http.method=POST http.host=kagent-controller.kagent.svc.cluster.local http.path=/kagent.runtime.v1.TaskStoreService/SettleTask http.version=HTTP/2.0 http.status=200 grpc.status=0 protocol=http ate.actor.name=session-01a1cf43-d760-747a-b907-5e0640126e4e ate.actor.uid=d64e21f4-05eb-49a3-a81e-69ca2d893b06 ate.atespace=kagent …
```

这条规则属于 `http` 类别，因此令牌在网关和控制器之间穿越集群网络时没有使用 TLS。对于集群外的任何服务，请使用 `https` 类别。[凭据注入](#s-credential-injection)介绍了 `replaceHeaders` 的另一种效果，即读取机密。

## 令牌包含的内容 {#s-actor-jwts-what-the-token-says}

我们为 atespace `lab-v` 中名为 `jw2` 的 actor 编写了一条类似 kagent 的规则。受众设为 `lab-echo`，有效期设为 600 秒，目标主机是集群内一个会返回请求头的服务。actor 调用了该服务，我们解码了返回的令牌。清单展示了标头和各项声明，签名部分已省略。

```listing
title: 一个 actor JWT 的标头与声明
source: capture/lab/V-validation/09-actor-jwt/24-jwt-decoded.txt
lang: text
note: 文件开头的请求头以及声明后面的两行已省略。
---
…
header: {
 "typ": "JWT",
 "alg": "ES256",
 "kid": "E38XLIprTZzZkY7RinXF7sPyw-HxHT-ysnVHFvvTCAU"
}
claims: {
 "iss": "https://idp.ate-system.svc",
 "sub": "actor/lab-v/jw2",
 "aud": [
  "lab-echo"
 ],
 "exp": 1794488570,
 "nbf": 1794487670,
 "iat": 1794487970,
 "jti": "VLZDMDBJ2UA3ME2Z5M62BADKQK",
 "actor.ate.dev": {
  "atespace": "lab-v",
  "actorName": "jw2",
  "actorUID": "93e670a4-3215-41e5-be33-4dffaca75d42"
 }
}
…
```

| 声明 | 取值 | 我们令牌中的值 |
|---|---|---|
| `iss` | 当前安装的签发方 URL | `https://idp.ate-system.svc` |
| `sub` | `actor/<atespace>/<name>` | `actor/lab-v/jw2` |
| `aud` | 来自规则的受众，始终为数组 | `["lab-echo"]` |
| `exp` | 签发时间加上 `expirationSeconds`，取值必须在 300 到 3600 之间 {{code}} | `iat` 加上 600 秒 |
| `nbf` | `iat` 之前的五分钟 | `iat` 减去 300 秒 |
| `iat` | 签发时间 | 存在 |
| `jti` | 随机 ID | 存在 |
| `actor.ate.dev` | 包含 `atespace`、`actorName` 和 `actorUID` 的对象 | 全部三个字段 |

标头指明算法为 `ES256`。它的 `kid` 与签发方发布的密钥集中的唯一密钥一致。代码中也允许 `RS256` {{code}}。

在那次运行中，我们在 x86 服务器客户机上还观察到了四件事，每件各一次：

- **网关会复用令牌。** 连续两次请求携带了同一个令牌，且 `jti` 相同。在 actor 挂起并恢复之后的某次请求也携带了该令牌。因此 `jti` 不是请求 ID，挂起也不会终止令牌。
- **actor 必须主动发送请求头。** 这个效果只会替换已有请求头，不会新增请求头。actor 发送的没有 `authorization` 请求头的请求到达服务时同样没有该请求头。我们的其他请求发送了 `Bearer placeholder`，随后网关替换了它。
- **actor 可以拿到该令牌。** 目标服务返回了它的请求头，所以 actor 在响应中读到了自己的令牌。请只把令牌发送给不会回显请求头的服务。
- **缺少了一项声明。** 发现文档中列出了一项名为 `worker-for-actor.ate.dev` 的声明，而我们的令牌中并没有它。

有两个细节改变了你使用令牌的方式：

- **`sub` 是名称。** 如果你删除一个 actor 并以相同名称重建，它会获得相同的 `sub`。如果两者的区别很重要，请绑定到 `actorUID`。
- **Substrate 不会自动添加受众。** 规则决定了 `aud`，而编写规则的人也决定了哪台主机会收到该令牌。

请在 actor 查询主机名之前创建策略。在我们的第一次尝试中，actor 在任何策略存在之前就查询了主机名。我们创建了策略，4.5 秒后该名称仍无法解析。在第二次尝试中，我们先创建策略，主机名立即就解析成功了。[DNS 中继](#s-the-dns-relay)介绍了另一处类似的延迟更新。

## 服务必须检查的内容 {#s-actor-jwts-what-the-service-must-check}

接收令牌的服务在 OpenID Connect 术语中属于依赖方（relying party）。`ate-idp-server` 在签发方下发布了位于 `/.well-known/openid-configuration` 的发现文档，以及位于 `/openid/v1/jwks` 的密钥。我们的 kagent 安装把签发方设为了 `https://idp.ate-system.svc` {{run}}。

服务必须执行五项检查 {{docs}}：

1. `iss` 等于你配置的签发方。
2. 签名使用密钥集中与令牌 `kid` 匹配的密钥验证通过。
3. `aud` 包含服务期望的受众。
4. `exp` 和 `nbf` 符合当前时间。
5. `sub` 以 `actor/` 开头。

切勿跳过最后一项检查。同一批密钥还会为第二种令牌签名，这种令牌的 `sub` 以 `worker-for-actor/` 开头。Substrate 组件使用这种令牌传输快照。如果某个服务接受了它，就会把 worker 当成 actor 对待。

默认签发方是一个 Service 名称，因此只有集群内部的验证方才能访问它。对于外部验证方，你必须把这两个路径发布在你拥有的主机上，并把签发方指向该主机。安装器不会自动创建 Ingress、DNS 记录或证书。

## 限制 {#s-actor-jwts-limits}

文档列出了以下限制 {{docs}}。我们在运行中观察到了第二项，其余各项均未作测试：

- **不支持撤销。** 令牌在 `exp` 之前始终有效，即使你删除了 actor 也是如此。除非服务需要更长时间，否则请把有效期保持在 300 秒。
- **它是 bearer 令牌。** 如果某个服务在响应中返回请求头，就会把令牌泄露给 actor。我们的请求头回显服务就是这么做的，我们在出站测试中也看到注入的凭据出现了相同的情况。
- **沿用旧名称的新 actor。** 在你重新创建 actor 之后，网关可能会发送带有旧 actor `actorUID` 的令牌。时间窗口最长可达令牌有效期的三分之二（issue 2208）{{issue #2208}}。
- **无法换取云凭据。** 云令牌服务要求将 JWT 放在请求体中，而网关只替换请求头（issue 1661）{{issue #1661}}。
- **密钥轮换需手动执行。** 密钥不会过期。你可以使用 `kubectl ate admin` 来添加、激活和移除密钥。

下一版将补充三项验证。第一项是用发布的密钥验证签名，就像服务必须做的那样。第二项是轮换密钥。第三项是配置与第二个签发方或云服务商的联合身份验证。

## 我们的判断 {#s-actor-jwts-our-position}

对于从 actor 发往由你控制的服务的调用，请使用 actor JWT。它消除了在 actor 内部存放机密的需要，而 300 秒的有效期限制了泄露带来的危害。不要把受众当作唯一的访问判定依据。每个 atespace 编辑者都能编写一条规则，把带有任意受众的令牌发送给任何主机。因此请给每个服务分配各自的受众，并让每个服务拒绝所有其他受众。每个服务还必须自行决定允许 `sub` 中的哪些 actor 访问。

```takeaways
- 在出站规则的 replaceHeaders 下配置 actorJwt 效果，以附加 actor JWT。
- 除非服务需要更长有效期的令牌，否则请将 expirationSeconds 保持为 300。
- 检查 iss、签名、aud、exp、nbf，并确认 sub 以 actor/ 开头。
- 当名称可能被复用时，请绑定到 actor.ate.dev 中的 actorUID。
- 为每个服务使用独立的受众，并拒绝其他受众的令牌。
```

来源：capture/lab/K-kagent/session1/egress-policy-actor.yaml, capture/lab/K-kagent/session1/atenet-egress.excerpt.log, capture/lab/K-kagent/inventory/kagent-configmaps.yaml, capture/lab/F-egress/envoy/20-results.txt, capture/lab/V-validation/09-actor-jwt/24-jwt-decoded.txt, capture/lab/V-validation/09-actor-jwt/20-jwt-second-try.tsv, capture/lab/V-validation/09-actor-jwt/10-jwt.tsv, capture/lab/V-validation/09-actor-jwt/12-policy-live.yaml, capture/lab/V-validation/09-actor-jwt/15-openid-configuration.json, capture/lab/V-validation/09-actor-jwt/16-jwks-key-ids.json; cmd/ateapi/internal/controlapi/actor.go (MintActorJwt), internal/actoridjwt/actoridjwt.go, api/ateapi/v1/ateapi.proto (ActorJwtSource, MintActorJwtRequest), cmd/atenet/internal/router/egress/actorjwt/actorjwt.go, cmd/ate-idp-server/internal/server/server.go at v1.0.0; docs/guides/actor-jwts.md, docs/guides/actor-jwt-federation.md, docs/guides/actor-jwt-key-rotation.md, docs/guides/authorization.md at v1.0.0; issues https://github.com/agent-substrate/substrate/issues/2208 and https://github.com/agent-substrate/substrate/issues/1661.
