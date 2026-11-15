# router 与入站

> 发给 actor 的每个请求都要经过 `atenet-router`，它要求客户端证书带有允许的 SPIFFE ID，并在转发第一个字节之前调用 `ResumeActor`。

你的 actor 通过 `kubectl ate proxy` 正常应答。随后另一个命名空间里的服务直接调用 router，调用在 TLS 握手阶段失败，没有 HTTP 状态码可读。actor 并没有问题。router 在查看请求之前就拒绝了调用方。

读完本节，你能通过 router 访问 actor，并说出 router 接受哪种身份。你还能读懂两种数据平面各用三种方式拒绝调用方的表现。

## 每个 actor 共用一个 Service {#s-the-router-and-ingress-one-service-for-every-actor}

actor 没有自己的 Service，也没有主机名。集群里所有 actor 都通过同一个 Service `atenet-router.ate-system.svc` 访问，调用方在请求头里指明目标。

**路由头：** HTTP 头 `ate-target-actor`，值为 `<atespace>/<actor>`，例如 `ate-demo-counter/my-counter-1`。`Host` 头留给你的应用使用{{docs}}。

这个 Service 有两个重要端口。端口 443 把普通 HTTPS 请求送到 actor 的 80 端口。端口 8444 接受基于 TLS 的 HTTP `CONNECT`，用于监听其他端口的 actor。路由头放在外层 `CONNECT` 上，目标端口写在它的 authority 里{{docs}}。我们的探测发送了 `CONNECT actor:80`，得到的应答与端口 443 相同。

| | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| router pod 里的容器 | `atenet-router` 和 `envoy` | 一个 `agentgateway` |
| 面向调用方的监听端口 | 8443 和 8444 | 8443 和 8444 |
| Service 端口 | 443 和 8444 | 443、8444、80、8081 和 15020 |
| 80 或 8081 上的明文 HTTP | 没有这样的 Service 端口 | 连接被拒绝 |

agentgateway 的 Service 列出了端口 80 和 8081，NetworkPolicy 也放行了它们，但没有进程监听。向任一端口发明文 HTTP 请求，3 ms 内就以连接被拒绝告终。不要把 Service 里的条目当成端口开放的证据。

```listing
title: agentgateway 数据平面上的 router Service
source: capture/lab/G-dataplane/agentgateway/06-services.txt
lang: text
note: 一行。外部 IP、存续时间和选择器三列已截去。
---
atenet-router             ClusterIP   10.96.5.247     <none>        443/TCP,8444/TCP,15020/TCP,80/TCP,8081/TCP …
```

后来的一次探测从两个 pod 尝试了每个端口。一个在其他命名空间里，没有证书。另一个在 `ate-system` 里，持有允许的身份。

| 端口 | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| Service 443，容器 8443 | TLS。没有客户端证书时连接被关闭。带允许的身份和路由头：`200`。不带路由头：`404`，`invalid actor reference` | TLS。没有客户端证书：告警 `certificate required`。带允许的身份和路由头：`200`。不带路由头：`404`，`ingress failed` |
| Service 8444 | TLS。没有客户端证书时连接被关闭。带身份的 `POST` 得到 `404` | TLS，告警相同。带身份的 `POST` 得到 `405`，`method not allowed`，因为这个监听端口只接受 `CONNECT` |
| Service 80，容器 8080 | 不在 Service 里，超时 | 在 Service 里，连接被拒绝，没有监听 |
| Service 8081 | 不在 Service 里，超时 | 在 Service 里，连接被拒绝，没有监听 |
| Service 15020，统计 | 不在 Service 里，超时 | 没有 TLS 也没有凭据，直接开放。其他命名空间的 pod 访问 `/metrics` 得到 `200` |
| Pod 端口 15021 | 超时 | 明文 HTTP 返回 `404`，这是就绪探测监听端口 |
| Pod 端口 15000 | 超时 | 超时 |

**我们测得**每个端口在每种数据平面上各测一次，在第二台 x86 服务器客户机（16 vCPU、23 GB）上进行，客户端超时 4 s。两种数据平面的端口 443 和 8444 都需要客户端证书。agentgateway 的 Service 有五个端口，容器声明了六个，渲染出的配置只为调用方绑定 8443 和 8444。端口 80 和 8081 是 Service 里的无效条目。Envoy 的 Service 只有两个端口。

```listing
title: agentgateway 数据平面上的另外三次探测
source: capture/lab/Q-network/m-router-ports/agentgateway/11-port-probes-supplement.txt
lang: text
note: 文件中的三行。第一行来自其他命名空间的 pod，另外两行使用了允许的客户端证书。状态后的字段依次是字节数、指标族数量和响应体的第一行。
---
stats 15020 /metrics from another namespace: 200|13394|58|# HELP agentgateway_substrate_request_parking_active Number of requests waiting for a Substrate actor to become routable.|
…
service 8444 with allowed client cert, POST with routing header: 405 exit=0 err=|method not allowed
service 443 with allowed client cert, no routing header: 404|ingress failed
```

**安全提示：agentgateway 的统计端口不需要凭据。** 任何能访问这个 Service 的 pod，都可以用明文 HTTP 读取端口 15020 上的 `/metrics`。我们在其他命名空间的 pod 拿到了 13,394 字节、58 个指标族，名称里包含 actor 的请求暂存（parking）。输出里没有发现 actor 名称，也没有发现请求头的值，但我们没有逐个检查每个标签的内容。在你读过自己的输出之前，先把这个端口视为集群中所有租户都能读取。给 router pod 的 15020 端口加一条 NetworkPolicy 就能关上它。

请使用 Service 的短名称。router 证书对 `atenet-router.ate-system.svc` 有效。较长的 `atenet-router.ate-system.svc.cluster.local` 在两种数据平面上都没有通过证书名称检查。

## 一个请求的完整过程 {#s-the-router-and-ingress-one-request-step-by-step}

router 不保存运行中 actor 的表。每收到一个请求，它都向 `ate-api-server` 询问 actor 在哪里，调用的正是唤醒已挂起 actor 的那个 `ResumeActor`。应答带有状态、worker IP 和 worker 身份。随后 router 向该 worker 打开一条双向 TLS 隧道，转发请求。

```figure
id: fig-6-1
kind: sequence
title: 一个请求经过 router 的过程
claim: router 对每个请求都调用 ResumeActor，即使 actor 已在运行，之后才向 worker 打开隧道。
caption: 从上往下读。第 2 步在每个请求里都会发生，因此 ate-api-server 和 Postgres 位于每个请求的路径上。括号标出本次请求从第 2 步到第 4 步的耗时，取自 router 日志。来源：capture/lab/G-dataplane/envoy/ingress-auth/51-rightid-results.txt、capture/lab/G-dataplane/envoy/ingress-auth/52-router-log-atenet-router.log。
```

router 日志里能看到对一个已处于 `ACTOR_STATE_RUNNING` 的 actor 的调用。我们的探测器每秒发一个请求，每个请求都产生这样一对日志。

```listing
title: router 向运行中的 actor 询问位置
source: capture/lab/E-dependency-loss/15-T2-router-during.log
lang: text
note: 一个请求对应的两行。每行末尾的 trace 字段已截去。
---
{"time":"2026-11-12T11:04:04.204261373Z","level":"INFO","msg":"ResumeActor","actor":{"type":"*ateapi.Actor","atespace":"lab-e","name":"e-run"},…
{"time":"2026-11-12T11:04:04.208776711Z","level":"INFO","msg":"ResumeActor result","actor":{"type":"*ateapi.Actor","atespace":"lab-e","name":"e-run"},"state":"ACTOR_STATE_RUNNING","workerIP":"10.244.0.36","workerSPIFFEID":"spiffe://cluster.local/ns/lab-e/sa/ateworker",…
```

这个设计让热路径付出了代价。运行中的 actor 只有 `ate-api-server` 和 Postgres 那么可用。我们把 `ate-api-server` 缩到零副本 60 秒，运行中的 actor 连续 60 个请求返回 `503`，响应体是 `actor lab-e/e-run unavailable`。完整时间线见[第 8.2 节](#s-when-a-dependency-is-down)。

**我们测得**放行路径在第二台 x86 服务器客户机（16 vCPU、23 GB，Envoy 数据平面）上各发一个请求。端口 443 上对运行中 actor 的请求耗时 0.037 s，其中 `ResumeActor` 调用占 9.2 ms，数字来自 router 日志。同一个请求通过端口 8444 的 `CONNECT` 耗时 0.032 s。在 agentgateway 数据平面上，两个请求分别耗时 0.035 s 和 0.029 s。

没有 worker 有空位时，router 会暂存请求并重试。这段等待见[第 4.4 节](#s-request-parking)。

## router 放行谁 {#s-the-router-and-ingress-who-the-router-lets-in}

router 只提供 TLS 服务。它要求客户端出示由集群 pod 身份签发器签发的证书，然后把证书里的 SPIFFE ID 与一份固定列表比对。

**入站允许列表：** router 接受的 SPIFFE ID 列表，安装时通过 `--ingress-allowed-spiffe-ids` 设置。这个标志没有默认值。列表上的身份可以访问每个 atespace 里的每个 actor{{docs}}。

最后一句最值得记住。router 只认证调用方，不检查这个调用方是否有权访问这个 actor。如果调用方只应看到自己的 actor，就在 router 前面放一个你自己的服务。客户端一侧见[第 5.1 节](#s-client-authentication)。

我们从三个 pod 发出同一个请求。第一个没有客户端证书。第二个持有 `spiffe://cluster.local/ns/probe/sa/default` 的有效证书，这个身份不在列表上。第三个持有允许的身份。

| 调用方 | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| 没有客户端证书 | 连接被切断，curl 报 `Broken pipe` | TLS 告警 `certificate required` |
| 证书有效，身份不在列表上 | TLS 告警 `certificate unknown` | 连接被重置 |
| 允许的身份 | 443 上和经 8444 都是 `200` | 443 上和经 8444 都是 `200` |
| 允许的身份，actor 不存在 | `404`，`actor ate-demo-counter/does-not-exist not found` | `404`，`ingress failed` |
| 允许的身份，没有路由头 | `404`，`invalid actor reference` | `404`，`ingress failed` |

```figure
id: fig-6-1b
kind: decision
title: 调用方在两种数据平面上看到的结果
claim: 两种数据平面都在 TLS 层拒绝没有证书或 SPIFFE ID 不对的调用方，所以调用方拿不到 HTTP 状态码。
caption: 每一行从请求读到它在两种数据平面上的结果。虚线玫红框是没有 HTTP 状态码的拒绝。实线玫红框是带响应体的 404。绿框是到达了 actor 的请求，标注调用方测得的耗时。来源：capture/lab/G-dataplane/envoy/ingress-auth/10-results.txt、capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt、capture/lab/G-dataplane/envoy/ingress-auth/51-rightid-results.txt、capture/lab/G-dataplane/agentgateway/ingress-auth/51-rightid-results.txt。
```

```listing
title: 没有客户端证书，agentgateway 数据平面
source: capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt
lang: text
note: 三行 curl 输出。前面的 TLS 建立过程已截去。
---
* TLSv1.3 (IN), TLS alert, unknown (628):
curl: (56) OpenSSL SSL_read: OpenSSL/3.3.2: error:0A00045C:SSL routines::tlsv13 alert certificate required, errno 0
exit=56
```

所有拒绝都不带 HTTP 状态码，所以客户端库只会报传输错误。调试调用方时，先找 TLS 告警。agentgateway 的错误响应体在认证之后也没什么用：actor 不存在和缺少请求头，它都只说 `ingress failed`。

旧资料里有一个说法对已安装的集群并不成立。agentgateway 的 router 确实会认证调用方。安装器为它做的每次 agentgateway 安装都加入了客户端证书检查和允许列表。我们还试过用空的允许列表安装。router 配置里的规则变成了 `source.spiffeId in []`，我们尝试的两个调用方都被拒绝了。

## 快速上手里的身份并不存在 {#s-the-router-and-ingress-the-identity-in-the-quickstart-does-not-exist}

快速上手给安装器传了一个身份：`spiffe://cluster.local/ns/ate-system/sa/atenet-client`。安装完成后，命名空间 `ate-system` 里没有叫这个名字的 ServiceAccount。

```listing
title: 安装后 ate-system 里的 ServiceAccount
source: capture/lab/G-dataplane/envoy/ingress-auth/00-serviceaccounts.txt
lang: text
note: 完整列表，取自安装完成约三分钟后。
---
NAME                      AGE
ate-api-server            3m33s
ate-client                3m31s
ate-controller            3m31s
ate-idp-server            3m32s
atelet                    3m30s
atenet-egress             3m20s
atenet-router             3m28s
default                   4m18s
k8s-credential-provider   3m21s
```

`kubectl ate proxy` 仍然可用，因为它不是以 pod 的身份运行。它向集群申请带这个身份的证书，用的是一个不存在的 pod 和 ServiceAccount 的名字{{docs}}。你自己的 pod 做不到这一点。要让 pod 用快速上手的身份调用 router，我们先运行了 `kubectl create serviceaccount atenet-client -n ate-system`，再从 pod 身份签发器挂载一份 pod 证书。

不要把这个做法照搬到生产环境。快速上手的身份是一个所有 `kubectl ate proxy` 用户共用的名字。请给每个调用服务单独建一个 ServiceAccount，并把每个 SPIFFE ID 都列进 `--ingress-allowed-spiffe-ids`。要把在 `ate-system` 申请证书的权限，看作成为那里任何组件的权限{{docs}}。

```takeaways
- 向端口 443 上的 `atenet-router.ate-system.svc` 发送 `ate-target-actor: <atespace>/<actor>`。
- 只有 actor 端口不是 80 时，才在端口 8444 上使用 `CONNECT`。
- 在 agentgateway 上，用 NetworkPolicy 限制 router 的 15020 端口，因为 `/metrics` 不需要凭据。
- 把 router 处的握手失败，读作缺少客户端身份或身份不在列表上。
- 给每个调用服务单独建一个 ServiceAccount，并把它的 SPIFFE ID 加进允许列表。
- 调用方不该访问全部 actor 时，在 router 前面放你自己的授权服务。
- 让 `ate-api-server` 和 Postgres 与 actor 一样可用，因为每个请求都要用到两者。
```

来源：capture/lab/Q-network/m-router-ports/agentgateway/00-service.yaml, capture/lab/Q-network/m-router-ports/agentgateway/02-router-containers.json, capture/lab/Q-network/m-router-ports/agentgateway/06-config-binds.txt, capture/lab/Q-network/m-router-ports/agentgateway/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/agentgateway/11-port-probes-supplement.txt, capture/lab/Q-network/m-router-ports/envoy/00-service.yaml, capture/lab/Q-network/m-router-ports/envoy/02-router-containers.json, capture/lab/Q-network/m-router-ports/envoy/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/envoy/11-port-probes-supplement.txt, capture/lab/summary/network-x86.json, capture/lab/G-dataplane/envoy/ingress-auth/10-results.txt, capture/lab/G-dataplane/envoy/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/envoy/ingress-auth/52-router-log-atenet-router.log, capture/lab/G-dataplane/envoy/ingress-auth/00-serviceaccounts.txt, capture/lab/G-dataplane/envoy/ingress-auth/50-create-sa.log, capture/lab/G-dataplane/envoy/06-services.txt, capture/lab/G-dataplane/envoy/03-containers-atenet-router.tsv, capture/lab/G-dataplane/envoy/11-listening.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/agentgateway/06-services.txt, capture/lab/G-dataplane/agentgateway/11-listening.txt, capture/lab/G-dataplane/agentgateway/10-atenet-router-agentgateway-config.yaml, capture/lab/G-dataplane/02-agentgateway-without-ingress-allowlist/14-probe-no-allowlist.txt, capture/lab/G-dataplane/02-agentgateway-without-ingress-allowlist/30-config-diff.txt, capture/lab/E-dependency-loss/15-T2-router-during.log, capture/lab/E-dependency-loss/20-analysis.txt, cmd/atenet/internal/router/README.md, cmd/atenet/internal/router/ingress/ingress.go, docs/reference/api-guide.md and docs/get-started/quickstart.md at v1.0.0.
