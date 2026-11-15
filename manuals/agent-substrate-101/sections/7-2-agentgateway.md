# 配合 Substrate 使用 agentgateway

> agentgateway 可以是 Substrate 的数据平面、kagent 发行版内部的数据平面，或出站规则后方的网关，且仅有第三种形态能够选择模型与工具。

有同事告诉你，所有 agent 流量都会经过 agentgateway，因此你可以限制 agent 调用哪些模型。前半句在某些集群里确实成立，后半句则取决于 agentgateway 位于调用路径上的哪一环。它可以部署在三个不同位置，每个位置裁决的事项截然不同。

读完本节，你能指出 agentgateway 在集群中所处的位置。你还能说明 Substrate 的出站策略能够表达什么，以及何时需要在它后面再放第二道网关。

```figure
id: fig-7-2
kind: flow
title: agentgateway 的三种位置
claim: 在位置 A 和 B 中 agentgateway 负责执行 Substrate 策略，只有在位置 C 中它才读取模型与工具流量。
caption: 每一行代表一条请求路径，从左往右读。靛蓝色方块是 Substrate 数据平面。每一行下方的粗线说明 agentgateway 在该处裁决什么。虚线框代表你自行部署的网关。来源：capture/lab/G-dataplane、capture/lab/K-kagent、capture/lab/summary/network-x86.json 以及 v1.7.0 的 agentgateway 源码。
```

| 位置 | 谁负责安装 | 裁决什么 | 我们的实测 |
|---|---|---|---|
| A. Substrate 的数据平面 | 由你通过一个 `ate-setup` 标志配置 | 入站身份、出站策略、凭据注入 | 与 Envoy 的完整对比 |
| B. kagent 发行版内部的数据平面 | kagent 安装器 | 与 A 相同 | 98 个 kagent 轮次均通过它 |
| C. 出站后方的模型或 MCP 网关 | 由你作为自己的工作负载部署 | 模型、工具、预算 | 带有两个模拟模型的模型网关，基于 TLS，在两种数据平面上均测过 |

## 位置 A：Substrate 的数据平面 {#s-agentgateway-place-a-the-dataplane-of-substrate}

Substrate 在每条请求路径上都有两个代理：入站的 `atenet-router` 与出站的 `atenet-egress`。两者默认的代理二进制程序均为 Envoy。向 `ate-setup` 传入 `--atenet-dataplane=agentgateway`，两者便都会运行 agentgateway{{code}}。

我们使用该标志在运行中的集群上从 Envoy 切换到了 agentgateway。命令耗时 32 秒并以状态码 0 结束，不需要新建集群。

**我们测得**在带有 16 vCPU 和 23 GB 内存的 x86 服务器客户机上测量了两种数据平面，空闲时各采集一个样本。在 agentgateway 下，router 与出站网关在 2 个容器中占用约 38 MB 内存。在 Envoy 下，它们在 5 个容器中占用约 91 MB 内存。

我们的简短结论包含四点。

- **更轻量。** 两个容器完成五个容器的工作，空闲内存占用不到原来的一半。
- **入站客户端受到认证。** 没有证书的客户端收到 TLS 告警 `certificate required`，持有允许身份的客户端收到 200。
- **拦截 CA 私钥存放在数据平面容器中。** 使用 Envoy 时，只有 sidecar 容器持有该私钥。
- **出站网关以 debug 级别记录日志。** 它会打印每个请求的请求头。注入的凭据从未在日志中出现，但 actor 自身设置的自定义请求头会以明文打印。

当每个节点的内存开销对你很重要时，选择 agentgateway。上线生产前，请调低日志级别，并确认你是否能接受私钥存放在代理容器中。[数据平面选型](#s-the-dataplane-choice)一节提供了逐行对比的完整表格。

日志级别由出站 Deployment 上的一个环境变量控制，安装器默认将其设为 `debug`。

```bash
kubectl -n ate-system set env deploy/atenet-egress RUST_LOG=info
```

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上的单次运行中，针对每个级别测试了单个 actor 发出的 100 个请求。每个请求都包含一个自定义头与一个带有测试值的 `Authorization` 头。在 `debug` 级别下，网关写入 4,380 行日志，共计 1,590,006 字节，其中 200 行记录了自定义头的值。在 `info` 级别下，它写入 100 行日志，共计 46,300 字节，没有任何一行包含请求头的值。在 `warn` 级别下没有任何输出。全部 300 个请求均返回 200。

这一修改无法持久保留。在下一次运行 `ate-setup deploy ate-system` 后，Deployment 会再次恢复为 `RUST_LOG=debug`。请在每次运行安装器后重新设置，或将其维护在应用清单的工具中。

## 位置 B：kagent 发行版内部的数据平面 {#s-agentgateway-place-b-the-dataplane-inside-the-kagent-distribution}

kagent 会安装它自己的 Substrate 发行版，正如[第 7.1 节](#s-kagent-on-substrate)所示。在那个发行版中，我们看到的唯一数据平面就是 agentgateway。我们的集群在 `atenet-router` 与 `atenet-egress` 中运行的均是 agentgateway v1.7.0{{run}}。kagent 安装器传给 Substrate chart 的配置值中没有指定数据平面{{kagent}}。由于这些 chart 本身不在 kagent 仓库中，我们无法检查它们是否提供了 Envoy 选项。

该数据平面的一个代价专门针对凭据。作为网关的 agentgateway v1.7.0 会将每个获取到的凭据保留 300 秒。因此轮转后的 Secret 最多可能需要 5 分钟才能应用到请求中{{agentgateway}}。而在 Envoy 配合内置提供方时，下一个请求就能拿到新值。

**我们测得**在位置 A 的环境下，在第二台 x86 服务器客户机（16 vCPU、23 GB）上，每种数据平面各测了三次同一个 Secret 的变更。在 agentgateway 上，上游分别在 280.5、200.9 和 100.6 秒后观察到新值。在 Envoy 上分别耗时 1.0、1.0 和 1.6 秒。两种环境下均没有请求失败。位置 B 采用的代码与之一致，因此在位置 B 中也要预留这 5 分钟的窗口。具体实测见[凭据注入](#s-credential-injection)。

我们观察到了与位置 A 相同的两个代价。出站网关运行在 `RUST_LOG=debug` 级别，3 分钟内的 4,199 行日志中有 3,376 行是 debug 日志。CA 私钥直接挂载在其容器内部。

我们也观察到了相同的入站认证表现。没有证书的普通 pod 无法访问 actor。

```listing
title: kagent 发行版的 router 拒绝没有证书的 pod
source: capture/lab/K-kagent/parallel/ingress-probe.txt
lang: text
note: 探测从 default 命名空间的一个 pod 发起。该命名空间另外三行已截去。
---
from namespace default:
http://atenet-router.ate-system.svc:80/ code=000 curl_exit=7 Failed to connect to atenet-router.ate-system.svc port 80 after 3 ms: Could not connect to server
http://atenet-router.ate-system.svc:8081/ code=000 curl_exit=7 Failed to connect to atenet-router.ate-system.svc port 8081 after 2 ms: Could not connect to server
https://atenet-router.ate-system.svc:443/ code=000 curl_exit=56 OpenSSL SSL_read: OpenSSL/3.3.2: error:0A00045C:SSL routines::tlsv13 alert certificate required, errno 0
https://atenet-router.ate-system.svc:8444/ code=000 curl_exit=56 OpenSSL SSL_read: OpenSSL/3.3.2: error:0A00045C:SSL routines::tlsv13 alert certificate required, errno 0
…
```

端口 80 与 8081 拒绝了连接，端口 443 与 8444 要求客户端出示证书。在整个探测期间，会话 actor 始终保持在 `ACTOR_STATE_SUSPENDED` 状态。

kagent 本身并不包含 agentgateway 配置。kagent 会为每个 actor 在 Substrate API 中写入一份出站策略，由数据平面负责执行该策略。因此位置 B 为 kagent 提供的策略能力与位置 A 给你的完全相同，没有额外扩展。

## 位置 C：供 actor 调用的网关 {#s-agentgateway-place-c-a-gateway-that-actors-call}

你可能会读到策略可以规定 actor 能够调用哪些模型、工具或其他 agent。在 v1.0.0 中，Substrate 的出站策略完全没有针对这些维度的字段。下表概括了该策略的全部表达能力。

| 出站策略能够做到 | 出站策略无法做到 |
|---|---|
| 放行精确的主机名，或带有单个通配符标签的主机名 | 允许或拒绝某个具体模型名称 |
| 放行该主机上的某个端口 | 允许或拒绝 MCP 服务器中的某个工具 |
| 选择 `http`、带拦截的 `https` 或 `tlsPassthrough` | 设置 Token 预算或速率限制 |
| 用 Secret 值或 Actor JWT 替换单个请求头 | 检查 Prompt 内容或模型回答 |

出站网关的配置印证了这一局限。每条路由只包含一条策略 `substrateEgress`，以及一种后端类型 `dynamic`。动态后端代表 actor 所请求的目标主机。配置文件中既没有模型后端，也没有 MCP 路由。

```listing
title: agentgateway 出站网关的请求策略
source: capture/lab/G-dataplane/agentgateway/10-atenet-egress-agentgateway-substrate-config.yaml
lang: yaml
note: 此路由上方的监听器配置以及下方的凭据提供方设置已截去。
---
…
        - backends:
          - dynamic: {}
            policies:
              backendTLS:
                root: /etc/ssl/certs/ca-certificates.crt
          policies:
            substrateEgress: &egressPolicy
…
```

作为独立产品的 agentgateway 具备其余所有功能。它的模型网关模式能将请求路由至各模型提供商，并执行配额预算、负载均衡与故障转移。它的 MCP 网关模式能够聚合来自各 MCP 服务器的工具{{agentgateway}}。但这两种模式在 Substrate 的数据平面中均未启用，无论在位置 A 还是位置 B 中。

要使用这些模式，需要将第二个 agentgateway 作为你自己的工作负载部署在出站网关后方：

1. 在集群中以模型网关或 MCP 网关模式运行 agentgateway。
2. 编写一条出站规则，仅放行该网关的主机和端口。
3. 在该规则上添加带有 [Actor JWT](#s-actor-jwts) 的 `replaceHeaders` 效果，使网关知道是哪个 actor 在调用。
4. 让该网关针对 Substrate 签发方验证该令牌，并在网关处配置模型与工具的限制规则。

这样 actor 便无法直接访问任何外部模型主机，转由第二道网关裁决每个 actor 有权调用的内容。

### 我们的实测运行 {#s-agentgateway-what-we-ran}

我们实际验证了该设计的前两个步骤，使用了一个模型网关，未连接真实模型。该网关作为普通的 agentgateway v1.7.0 Deployment 运行在自己的命名空间中。两个带有兼容 OpenAI API 的模拟后端代表两个服务提供商，每个后端都会记录收到的请求。网关通过私有 CA 签发的证书提供 TLS 服务，该私有 CA 由我们使用 `openssl` 生成。

```listing
title: 模型网关的配置
source: capture/lab/Q-network/i-model-gateway/gw-tls.yaml
lang: yaml
note: 完整文件。两个密钥变量保存的是我们构造的测试值。
---
config: {}
llm:
  port: 8443
  tls:
    cert: /tls/tls.crt
    key: /tls/tls.key
  models:
  - name: fast
    provider: openAI
    params:
      model: small-1
      hostOverride: mock-a.model-gw.svc.cluster.local:80
      apiKey: $KEY_A
  - name: smart
    provider: openAI
    params:
      model: big-1
      hostOverride: mock-b.model-gw.svc.cluster.local:80
      apiKey: $KEY_B
```

actor 配置了一条针对网关主机的 `https` 规则。规则用 Kubernetes Secret 的值替换请求头 `X-Lab`。actor 在该请求头与 `Authorization` 中发送占位符，并请求模型 `fast`。

```listing
title: actor 经由出站网关访问模型网关的单个请求
source: capture/lab/Q-network/i-model-gateway/20-results-agentgateway-private-ca-trusted.txt
lang: console
note: agentgateway 数据平面上的一个请求，以及针对网关未知模型名称的应答。中间的请求已截去。所有值均为我们构造的测试值。
---
$ curl -sS -m 15 --cacert /run/ate/egress-trust-bundle/trust-bundle.pem -w '\ncode=%{http_code} t=%{time_total} verify=%{ssl_verify_result}\n' -H 'content-type: application/json' -H 'Authorization: Bearer placeholder-from-actor' -H 'X-Lab: placeholder-from-actor' -d '{"model":"fast","messages":[{"role":"user","content":"hi"}]}' https://modelgw.model-gw.svc.cluster.local/v1/chat/completions
exit=0
{"model":"small-1","usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2},"choices":[{"message":{"content":"served_by=backend-a model=small-1 authorization=Bearer provider-key-for-backend-a x_lab=lab-gw-client-credential-1794488723","role":"assistant"},"index":0,"finish_reason":"stop"}],"id":"chatcmpl-lab","object":"chat.completion","created":1794488852}
code=200 t=0.744791 verify=0
…
{"error":{"message":"Model not found","type":"invalid_request_error","code":"model_not_found"}}
code=404
```

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上对该路径进行测量，每种数据平面各测一次。后端 `mock-a` 收到了模型标识 `small-1`、网关的提供商密钥以及 `X-Lab` 中的 Secret 值。请求 `"model":"smart"` 时，后端 `mock-b` 收到了 `big-1` 与第二个提供商密钥。后端没有任何一行日志收到过 actor 的占位符（0 行）。请求 `"model":"other"` 时，模型网关返回了带有 `model_not_found` 的 404。

因此是模型网关选择模型，出站策略并不选模型。路径中存在两个密钥，actor 两者都不需要发送。我们的模拟后端在应答中打印了这两个密钥，因此 actor 在应答里读到了它们。真实的后端绝对不能回显凭据。

出站网关注入识别调用方身份的请求头。模型网关将 `Authorization` 替换为其自身的提供商密钥。因此针对模型网关本身的凭据必须通过其他请求头传递。在模型网关上借助 Actor JWT 进行客户端身份验证，计划在下一版手册中实现。

**私有 CA 最初调用失败。** 在默认安装下，通过 `https` 规则发起的请求在两种数据平面上均返回 503。出站网关使用其容器自带的系统根证书验证上游证书，它并不认识我们的私有 CA。[TLS 拦截](#s-tls-interception)记录了两个具体的错误文本以及修复用的补丁。当安装器再次运行时，该补丁会失效。

**我们测得**在同一台客户机（16 vCPU、23 GB）上的延迟中位数，样本数为 n=30 或 n=10。请求大小为 60 字节，应答大小约为 250 字节。

| 路径 | 每次请求均新建连接 | 复用单条连接 |
|---|---|---|
| 普通 pod 直连模拟后端，不出站 | 4.2 到 4.4 ms | 未测量 |
| 普通 pod 经由 TLS 模型网关 | 14.7 到 14.9 ms | 未测量 |
| actor 经出站网关访问模拟后端，`http` 规则 | 22.8 到 27.5 ms | agentgateway 上 9.2 ms，Envoy 上 4.4 ms |
| actor 经出站网关 `https` 规则访问 TLS 模型网关 | agentgateway 上 618 与 690 ms，Envoy 上 614 ms | agentgateway 上 10.0 ms，Envoy 上 11.9 ms |

最后一行是架构设计必须考虑的关键。在 `https` 规则下，每条新建连接在两种数据平面上都要耗费约 0.6 秒。其中绝大部分时间花在与拦截端点的 TLS 握手上：在 agentgateway 上占 618 ms 中的 606 ms，在 Envoy 上占 614 ms 中的 600 ms。在复用连接时，相同的请求只需 10 到 12 ms。每次调用模型都新建 HTTPS 连接的 agent 每次都要承担 0.6 秒的开销。请在 actor 的整个生命周期内保持使用带有连接池的单一客户端。

测试期间另一集群同时在该客户机上运行节点测试，因此几毫秒的波动可视为测试噪声。我们目前尚未查明握手阶段究竟是哪一步消耗了 0.6 秒。该细节探究、真实外部模型主机、流式应答以及 MCP 网关均计划在下一版手册中补充。

出站网关的三个限制直接制约了这一架构设计，各小节对此给出了实证：

- 网关仅在请求中已包含对应头时才执行替换。没有 `authorization` 头的请求原样通过，相关实测见[凭据注入](#s-credential-injection)。
- WebSocket 升级请求返回 403，因此出站后方的网关必须使用普通的 HTTP 请求或流式 HTTP 响应，相关实测见[EgressPolicy 与默认拒绝](#s-egresspolicy-and-default-deny)。
- 被删除的规则不会主动关闭流式传输的响应或已建立的透传连接。复用的 HTTP 连接在下一次请求时才会被拒绝，相关实测见[数据平面选型](#s-the-dataplane-choice)。

```takeaways
- 在承诺策略能力之前，先弄清 agentgateway 在集群中处于哪个位置。
- 用出站策略限定主机、端口、TLS 模式以及单个凭据头。
- 在出站规则后方部署第二道网关，用来选择模型与工具。
- 上线前把 `atenet-egress` 的 `RUST_LOG` 设为 `info`，每次跑完安装器后再设一次。
- 调用模型时复用单条 HTTPS 连接，因为每次新建拦截连接耗时 0.6 秒。
- 调用私有网关前，把私有 CA 加进出站容器的根证书文件。
- 切换运行中集群的数据平面之前，先读第 6.6 节。
```

来源：capture/lab/G-dataplane/01-switch-in-place/11-timing.txt, capture/lab/G-dataplane/agentgateway/13-crictl-stats-atenet.txt, capture/lab/G-dataplane/envoy/13-crictl-stats-atenet.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt, capture/lab/G-dataplane/agentgateway/04-volumes-atenet-egress.json, capture/lab/G-dataplane/agentgateway/10-atenet-egress-agentgateway-substrate-config.yaml, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/agentgateway/50-custom-header.txt, capture/lab/F-egress/envoy/20-results.txt, capture/lab/K-kagent/inventory/images.tsv, capture/lab/K-kagent/inventory/deploy-atenet-egress.yaml, capture/lab/K-kagent/parallel/ingress-probe.txt, capture/lab/K-kagent/session1/egress-policy-actor.yaml, capture/lab/K-kagent/session1/mock.log, capture/lab/Q-network/i-model-gateway/gw-tls.yaml, capture/lab/Q-network/i-model-gateway/Pgw.yaml, capture/lab/Q-network/i-model-gateway/20-results-agentgateway-private-ca-trusted.txt, capture/lab/Q-network/i-model-gateway/20-results-envoy-private-ca-trusted.txt, capture/lab/Q-network/i-model-gateway/23-mock-a-received-agentgateway-private-ca-trusted.log, capture/lab/Q-network/i-model-gateway/24-marker-counts-agentgateway-private-ca-trusted.txt, capture/lab/Q-network/i-model-gateway/31-latency-agentgateway-private-ca-trusted.tsv, capture/lab/Q-network/i-model-gateway/31-latency-envoy-private-ca-trusted.tsv, capture/lab/Q-network/i-model-gateway/51-connection-cost-agentgateway.tsv, capture/lab/Q-network/i-model-gateway/51-connection-cost-envoy-private-ca-trusted.tsv, capture/lab/Q-network/j-log-level/10-volume.tsv, capture/lab/Q-network/00-dataplane-switch-to-agentgateway/17-after-rerun-rust-log-and-roots.json, capture/lab/Q-network/l-credential-rotation/agentgateway/20-rotations.tsv, capture/lab/Q-network/l-credential-rotation/envoy/20-rotations.tsv, capture/lab/summary/network-x86.json, capture/lab/summary/rotation-x86.json; Agent Substrate v1.0.0 source: cmd/atenet/internal/router/config.go, cmd/ate-setup/commands.md, manifests/ate-install/agentgateway; agentgateway v1.7.0 source: README.md, crates/agentgateway/src/http/substrate (README.md, egress.rs); kagent v1.0.0 Substrate distribution charts.
