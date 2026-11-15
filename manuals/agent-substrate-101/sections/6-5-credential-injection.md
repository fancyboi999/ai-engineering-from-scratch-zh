# 凭据注入

> 网关用 actor 绝不持有的 Secret 替换占位头，而返回请求头的上游服务会把这个 Secret 送回给 actor。

agent 调用模型或代码托管服务时需要 API 密钥。agent 还会运行由模型编写的代码。Substrate 可以在每次挂起时把沙箱的内存与文件复制到对象存储。你不希望把密钥放进沙箱、环境变量或它的快照中。

读完本节，你能编写注入凭据的规则，并为 atespace 授予访问 Kubernetes Secret 的权限。你还能指出替换失败的各种情况，以及 Secret 流入 actor 的唯一场景。

## 单个请求中的替换过程 {#s-credential-injection-the-swap-in-one-request}

凭据注入是配置在 `http` 或 `https` 规则上的一种效果。规则声明请求头和 Secret。actor 发送带有任意值的该请求头，网关在请求离开集群之前将其值覆盖。

**占位头（placeholder header）：** actor 发送的带有非敏感值的请求头，例如 `Authorization: placeholder-from-actor`。它的存在表明需要进行替换，其原本的值会被丢弃。

这是我们测试中的规则文件。它配置了三个请求头，以便一个请求测试全部可能的结果。

```listing
title: 带三个凭据头的单条规则
source: capture/lab/F-egress/envoy/P4.yaml
lang: yaml
note: 完整的规则文件。只有第一个请求头指向已授权命名空间中存在的 Secret。
---
rules:
- http:
    hostnames: ["whoami.egress-target.svc.cluster.local"]
    effects:
      replaceHeaders:
      - header: Authorization
        prefix: "Bearer "
        credentialUri: ate-secret://k8s.io/default/cred-ns/api-token/token
      - header: X-Other-Token
        credentialUri: ate-secret://k8s.io/default/cred-ns-not-granted/api-token/token
      - header: X-Missing-Token
        credentialUri: ate-secret://k8s.io/default/cred-ns/does-not-exist/token
```

每个条目包含一个 `header`、一个可选的 `prefix`，以及一个来源（`credentialUri` 或[第 5.3 节](#s-actor-jwts)介绍的 `actorJwt`）。一条规则最多接受 16 个条目{{code}}。

我们测试中的上游服务会打印收到的每个请求。actor 发送了占位头，实际送达的内容如下。

```listing
title: 上游服务收到的请求
source: capture/lab/F-egress/envoy/20-results.txt
lang: console
note: actor 内部的命令及响应中的匹配行。上游是一台回显所接收请求的服务器。
---
$ curl -sS -m 8 -i -H 'Authorization: placeholder-from-actor' http://whoami.egress-target.svc.cluster.local/ | grep -i -E 'HTTP/|authorization|x-forwarded|RemoteAddr|egress'
…
HTTP/1.1 200 OK
RemoteAddr: 10.244.0.22:36554
GET / HTTP/1.1
Host: whoami.egress-target.svc.cluster.local
Authorization: Bearer lab-granted-marker-1794480266
```

```figure
id: fig-6-5
kind: sequence
title: 带有占位头的单个请求
claim: Secret 从 Kubernetes Secret 传递到 atenet-egress 并送往上游，仅当上游将其回传时才会进入 actor。
caption: 从上往下读。第 2 步和第 3 步在每个带有该请求头的请求中都会执行。第 6 步是我们的测试上游产生的泄漏。来源：capture/lab/F-egress/envoy/20-results.txt、capture/lab/F-egress/envoy/P4.yaml。
```

actor 的环境变量中没有任何 Secret。我们检查了环境变量列表，并在 `/run`、`/etc` 和 `/tmp` 中搜索了该凭据值，均未匹配到任何内容。从未进入沙箱的 Secret 绝不会出现在沙箱快照中。

我们的测试使用了指向集群内 Service 的 `http` 规则。在 `http` 规则下，凭据离开网关后以明文传输{{code}}。针对真实的外部 API，请把该效果配置在 `https` 规则上。

## `ate-secret://` 引用与内置提供方 {#s-credential-injection-the-ate-secret-reference-and-the-bundled-provider}

**凭据提供方（credential provider）：** 将引用解析为 Secret 值的 gRPC 服务。网关根据引用中的主机部分选择提供方，并向其发送引用与 actor 的身份{{code}}。提供方据此决定该 actor 是否有权获取该 Secret。

在安装时传入 `--credential-provider='{"name":"k8s.io"}'`，Substrate v1.0.0 就会安装一个提供方。它以 Deployment `k8s-credential-provider` 运行在 `ate-system` 中，负责读取 Kubernetes Secret。它的引用格式如下：

```text
ate-secret://k8s.io/default/<namespace>/<secret>/<key>
```

提供方每次收到调用都会读取 Secret，自身不留副本{{code}}。轮转后的 Secret 多快生效取决于数据平面，因为网关决定多久调用一次提供方。

| 数据平面 | 网关的处理方式 | 轮转后的 Secret 生效时间 |
|---|---|---|
| Envoy | 对每个带有该请求头的请求都调用提供方，不保留副本{{code}}。 | 在下一个请求或其后的请求生效，我们的实测为 1.0 到 1.6 秒 |
| agentgateway v1.7.0 | 对同一个 actor 和同一个引用，将获取到的凭据保留 300 秒。`ate-setup` 没有配置其他值{{agentgateway}}。 | 在这 300 秒剩余的时间之后生效，我们的实测为 100.6 到 280.5 秒 |

agentgateway 这一行涵盖所有 kagent 安装，因为该发行版运行 agentgateway。我们先在代码中核实了这两行行为，随后进行了实际测量。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上，每种数据平面各测试三次 Secret 变更。一个运行中的 actor 配置了一条带有该效果的 `http` 规则。它大约每秒向集群内的回显服务发送一次请求。我们记录了该服务首次观察到每个新值的时刻。

**我们测得**在同一台客户机（16 vCPU、23 GB）的该次运行中，每种数据平面各经历 n=3 次变更后的延迟。在 agentgateway 上延迟分别为 280.5、200.9 和 100.6 秒。在这些时段内，分别有 233、168 和 84 个请求仍携带旧值。在 Envoy 上延迟分别为 1.0、1.0 和 1.6 秒，总共只有 1 个请求携带旧值。在 759 次与 275 次请求中，两种数据平面均未出现请求失败。

```listing
title: agentgateway 上的三次 Secret 变更
source: capture/lab/Q-network/l-credential-rotation/agentgateway/20-rotations.tsv
lang: text
note: 文件的完整表格。前三列分别是轮换序号、轮换前等待时间和变更发生时间。第四列是上游首次观察到新值的时间。最后两列是延迟秒数和变更后仍携带旧值的请求数。
---
rotation	wait_before_s	secret_changed_epoch	first_seen_epoch	lag_s	old_values_after_change
1	5	1794493351.752	1794493632.272	280.5	233
2	100	1794493732.380	1794493933.328	200.9	168
3	200	1794494133.509	1794494234.122	100.6	84
```

```figure
id: fig-6-5b
kind: chart
title: 上游观察到凭据变更所耗费的秒数
claim: 变更后的 Secret 在 Envoy 上用时 1.0 到 1.6 秒到达上游，在 agentgateway 上用时 100.6 到 280.5 秒。
caption: 从左往右沿三次变更阅读每条曲线。时间轴采用对数刻度。实线代表 agentgateway，虚线代表 Envoy，玫红色线条标出 300 秒。来源：capture/lab/summary/rotation-x86.json。
```

agentgateway 上的三次延迟并非随机数值。上游首次观察到新值的三个时刻之间恰好相隔 301 秒。这说明网关在本地副本达到 300 秒时才会重新获取凭据。变更发生后的延迟就是距离下一次刷新的剩余时间，介于 0 到约 300 秒之间。在 Envoy 上我们的探测器每秒发送一次请求，因此无法给出 1 秒以下的延迟数字。

在变更期间，上游看到的要么是旧值要么是新值。它从未收到过空请求头，也从未收到过 actor 的占位值。这就是没有请求失败的原因。这也意味着一旦吊销某个 Secret，在 agentgateway 上它仍可能继续被使用长达 5 分钟。若必须立即终止其使用，请直接在上游吊销旧值。在非紧急的常规轮转中，变更后请保持旧值在上游继续有效 5 分钟。

我们测试了一个 Secret 和一个 actor。重启 `atenet-egress` 是否会强制重新获取凭据，留待下一版测试。

在 Envoy 上，每个携带该请求头的请求都要付出一次调用提供方和一次读取 Kubernetes API 的代价。在 agentgateway 上，绝大多数请求无需调用提供方。

提供方初始状态下没有任何权限。ConfigMap `k8s-credential-provider-namespace-policy` 将每个 atespace 映射到其 actor 可以使用的 Secret 所在的命名空间。安装完成后该配置为空。

```listing
title: 单个 atespace 的授权配置
source: capture/lab/F-egress/envoy/provider-policy.yaml
lang: yaml
note: ConfigMap 中 namespace-policy.yaml 键的内容。
---
policies:
- atespace: lab-f
  allowedNamespaces:
  - cred-ns
```

提供方在启动时读取一次该文件{{docs}}。编辑后我们重启了 Deployment，授权随之生效。该授权范围较广：atespace 里的每个 actor 都可以引用该命名空间里的每个 Secret。请专门保留一个只存放允许 agent 使用的 Secret 的命名空间。

安装器的帮助文本称凭据提供方需要 Envoy 数据平面。在我们的实际运行中，安装器在使用 agentgateway 时也接受了 `k8s.io`，注入效果在两种数据平面上完全相同。

## 替换未发生的情况 {#s-credential-injection-when-the-swap-does-not-happen}

| actor 发送的内容 | 引用指向的目标 | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|---|
| 带占位头的 `Authorization` | 已授权命名空间中存在的 Secret | `200`，上游获得 Secret | `200`，上游获得 Secret |
| 带占位头的 `X-Other-Token` | 未授权命名空间中的 Secret | `403`，`egress denied` | `403`，`actor egress policy denied` |
| 带占位头的 `X-Missing-Token` | 不存在的 Secret | `403`，`egress denied` | `403`，`actor egress policy denied` |
| 无凭据请求头 | 任意 | `200`，请求原样通过 | `200`，请求原样通过 |

两种 `403` 场景特意返回了相同的响应体。调用方无法通过响应推断哪些 Secret 存在{{code}}。你也无法推断，因此需要手动核对授权配置与 Secret 名称。

最后一行需要格外注意。替换效果仅在请求头存在时触发。缺少该请求头时，网关不获取任何凭据，并按原样转发请求。主机本身依然被允许访问，因此请求会在不带凭据的情况下送达上游。

```listing
title: 不带凭据头的相同请求
source: capture/lab/F-egress/envoy/20-results.txt
lang: console
note: 命令与匹配行。由于没有向上游发送凭据，因此没有 Authorization 行返回。
---
$ curl -sS -m 8 -i http://whoami.egress-target.svc.cluster.local/ | grep -i -E 'HTTP/|authorization'
…
HTTP/1.1 200 OK
GET / HTTP/1.1
```

在实际使用中，这种情况的表象通常是 API 返回 `401`，而不是网关报错。自己拼装请求的工具（例如 shell 里的原生 `wget`）不会发送占位头，也就拿不到凭据。我们在 kagent 的运行中观察到了这点：actor 发出的 `wget` 到达模型主机时携带了三个头，唯独缺少 `authorization`。

## 回传请求头的上游服务 {#s-credential-injection-the-upstream-that-returns-headers}

再看一眼本节的第二个清单。actor 执行了该 `curl` 命令，响应体中包含了 `Authorization: Bearer lab-granted-marker-1794480266`。我们的测试上游把收到的每个请求原样回传给发送者，使得 actor 读到了原本从未交给它的 Secret。

网关无法阻止这一行为。它控制的是请求本身，无法控制上游对请求的处理。这引出了一条必须遵守的规则：凭据的安全程度取决于规则中所允许的主机。

- 指明拥有该凭据的精确主机，绝不要把凭据挂在主机名含 `*` 的规则上。
- 不要把凭据挂在 actor 能让它回传请求头的主机上，例如调试端点或请求检查服务。
- 只给 agent 申请 API 提供的最小权限凭据，并按 agent 已知晓该凭据来设防。

在我们的运行中日志记录非常干净。在两种数据平面上，注入的值都没有出现在网关或提供方的任何日志行中。agentgateway 的出站 pod 运行在 `RUST_LOG=debug` 级别，会打印每个请求的请求头，其中 `authorization` 被打印为 `Sensitive`。对于注入的 `X-Api-Key`，它打印的是 actor 发送的占位值，从不打印真实的 Secret。而 actor 自己在自定义头中发送的值，在此处会以明文记录。

## kagent 如何使用凭据注入 {#s-credential-injection-what-kagent-does-with-it}

kagent 将此功能用于模型密钥，因此无需手动编写规则。每次会话中，kagent 都会生成一份策略，其中包含一条指向 ModelConfig 中模型主机的规则。

```listing
title: kagent 生成的模型规则
source: capture/lab/K-kagent/session1/egress-policy-actor.yaml
lang: yaml
note: 单个会话 actor 策略中三条规则里的第二条。
---
- http:
    effects:
      replaceHeaders:
      - credentialUri: ate-secret://k8s.io/default/kagent/kagent-openai/OPENAI_API_KEY
        header: authorization
        prefix: 'Bearer '
    hostnames:
    - mock-llm.kagent.svc.cluster.local
    ports:
      numbers:
      - 8080
```

kagent 还在 actor 的环境中设置了 `OPENAI_API_KEY=kagent-credential-injected`。模型客户端读取该变量并将其作为 `authorization` 请求头发送，这正是占位头。我们的模拟模型服务器在 10 次调用中全部收到了 `Bearer sk-mock-not-a-real-key`，这是我们自己编造的测试值。

我们在集群内通过 HTTP 对模拟模型运行了 kagent。通过 HTTPS 访问真实模型主机计划在下一版测试。该策略的其余部分见[第 7.1 节](#s-kagent-on-substrate)。

```takeaways
- 对集群外的任何主机，都将凭据效果配置在 `https` 规则上。
- 为每个 atespace 分配一个专属命名空间，且其中只存放 agent 使用的 Secret。
- 修改命名空间授权后重启 `k8s-credential-provider`。
- 当数据平面是 agentgateway 时，轮换后保持旧 Secret 在上游继续有效 5 分钟。
- 泄露的 Secret 也必须在上游吊销，因为 agentgateway 可能会继续发送 5 分钟。
- 确保每个客户端都发送占位头，若收到 `401` 应首先排查是否遗漏占位头。
- 在携带凭据的规则中必须指明确切主机，切勿使用 `*`。
- 如果上游会回传请求头，就假定 agent 已经能够获悉该凭据。
```

来源：capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/envoy/P4.yaml, capture/lab/F-egress/envoy/policy-f-main-P4-live.yaml, capture/lab/F-egress/envoy/provider-policy.yaml, capture/lab/F-egress/envoy/04-provider-policy-apply.log, capture/lab/F-egress/envoy/32-marker-in-logs.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/agentgateway/32-marker-in-logs.txt, capture/lab/F-egress/agentgateway/50-custom-header.txt, capture/lab/G-dataplane/agentgateway/03-containers-atenet-egress.tsv, capture/lab/K-kagent/session1/egress-policy-actor.yaml, capture/lab/K-kagent/session1/mock.log, capture/lab/K-kagent/session1/turn2.out, capture/lab/K-kagent/session1/actor-template.yaml, capture/lab/Q-network/l-credential-rotation/agentgateway/20-rotations.tsv, capture/lab/Q-network/l-credential-rotation/envoy/20-rotations.tsv, capture/lab/Q-network/l-credential-rotation/agentgateway/10-probe.tsv, capture/lab/Q-network/l-credential-rotation/envoy/10-probe.tsv, capture/lab/Q-network/l-credential-rotation/agentgateway/01-policy-live.yaml, capture/lab/summary/rotation-x86.json, api/ateapi/v1/ateapi.proto (HttpRuleEffects, CredentialHeader), cmd/atenet/internal/router/egress/credentials.go, cmd/credential-provider/kubernetes-secrets/kubeprovider.go, cmd/ate-setup/internal/steps/overlay.go, docs/guides/egress-credential-injection.md at v1.0.0; agentgateway v1.7.0 crates/agentgateway/src/http/substrate/egress.rs (the credential cache of 300 seconds).
