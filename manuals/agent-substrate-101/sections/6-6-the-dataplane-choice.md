# 数据平面选型：Envoy 还是 agentgateway

> agentgateway 只用 38 MB 内存和两个容器就完成了 Envoy 数据平面的工作，但它将拦截 CA 私钥保存在与 actor 直接通信的进程中。

安装器提供了一个标志 `--atenet-dataplane`，包含两个可选值且没有给出选型建议。如果你安装 kagent，选型其实已经替你定好了：它运行 agentgateway。无论哪种方式，你现在都需要运维这两种代理之一。在请求被拒绝或规则被删除时，它们的表现并不一致。

读完本节，你能为集群选择合适的数据平面并给出依据。你还能说明删除规则后已建立的开放连接会发生什么。

## 一个标志改变两个网关 {#s-the-dataplane-choice-one-flag-changes-both-gateways}

**数据平面（dataplane）：** pod `atenet-router` 与 `atenet-egress` 内部运行的代理软件。标志 `--atenet-dataplane` 接受默认值 `envoy` 或 `agentgateway`。一个设置同时作用于两个 pod。

Substrate API 并不会随该标志发生改变。actor、策略与 `kubectl ate` 的用法保持一致。改变的是执行策略的底层代码。

在 Envoy 数据平面上，策略由两段 Substrate 代码裁决。Envoy 旁边的一个 Substrate 进程负责认证 actor、裁决每个 HTTP 请求并提供规则。Envoy 加载到自身进程里的一个 Substrate 模块，则根据服务器名称裁决 TLS 连接。在 agentgateway 数据平面上，所有策略均由 agentgateway v1.7.0 内部的代码完成{{code}}。同一份策略的两种实现，解释了本节中的所有差异。

你可以在运行中的集群上切换数据平面。只需带着相同的标志与新参数值再次运行 `deploy ate-system`。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上从 Envoy 切换到 agentgateway 一次。命令耗时 32 秒并以状态码 0 退出。切换过程中，两个运行中的 actor 在其 worker 上始终保持 `ACTOR_STATE_RUNNING`。在这 32 秒内我们没有发送请求，因此无法断言有多少请求会失败。

## 完整对比 {#s-the-dataplane-choice-the-full-comparison}

我们在同一个集群上，为每种数据平面采集了相同的资源清单，并运行了相同的探测。

| | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| `atenet-router` 包含的容器 | `atenet-router`、`envoy` | `agentgateway` |
| `atenet-egress` 包含的容器 | `envoy`、`ext-proc`、`sdsmint` | `agentgateway` |
| router 监听端口 | 8443、8444 | 8443、8444 |
| router Service 端口 | 443、8444 | 443、8444、80、8081、15020 |
| 没有客户端证书的调用方 | 连接被切断 | TLS 告警 `certificate required` |
| 身份不在列表上的调用方 | TLS 告警 `certificate unknown` | 连接被重置 |
| 拥有允许身份的调用方 | 443 和 8444 均返回 `200` | 443 和 8444 均返回 `200` |
| 未知 actor 或缺少路由头 | `404`，响应体中包含具体原因 | `404`，`ingress failed` |
| 无策略 actor 发送 HTTP | 连接被重置 | `403`，`actor egress policy denied` |
| 向策略外主机发送 HTTP | `403`，`egress denied` | `403`，`actor egress policy denied` |
| 签发的证书 | 20 分钟有效期，主题为空 | 1975 到 4096 年，证书链包含 CA |
| 拦截 CA 私钥位置 | 仅在 `sdsmint` 中 | 在 `agentgateway` 容器内 |
| 容器的 `securityContext` | 丢弃全部 capability | 未设置 |
| 出站日志级别 | 默认级别 | `RUST_LOG=debug` |
| 相同测试脚本后的出站日志行数 | 1,369 行 | 6,477 行 |
| router 与 egress 的空闲内存 | 5 个容器约 91 MB | 2 个容器约 38 MB |
| 规则删除后新请求被拒绝的时间 | 3 到 6 秒后拒绝 | 1 到 2 秒内拒绝 |

```figure
id: fig-6-6
kind: chart
title: 两种数据平面的空闲内存逐容器对比
claim: Envoy 数据平面将工作分摊在五个容器和 91 MB 内存中，agentgateway 则使用两个容器和 38 MB 内存且其中一个容器包含 CA 私钥。
caption: 每根柱条代表一种数据平面，每个方块代表一个容器，每个括号代表一个 pod。方块宽度代表该容器启动后不久采集到的空闲内存 MB 数。粗黑边框标出持有 CA 私钥的容器。来源：capture/lab/G-dataplane/envoy/13-crictl-stats-atenet.txt、capture/lab/G-dataplane/agentgateway/13-crictl-stats-atenet.txt。
```

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上，启动后不久对每个容器采集了一次空闲内存样本。Envoy 数据平面的五个容器占用分别为 25.6、21.6、22.8、12.0 和 8.9 MB。agentgateway 的两个容器占用分别为 19.9 和 17.8 MB。在高达 300 次并发恢复的突发负载下，router 的 Envoy 进程平均占用 0.12 到 0.19 个 CPU 核心。正如[第 4.5 节](#s-sizing-a-pool)所示，它并没有成为瓶颈速率的限制因素。我们未对 agentgateway 进行压力测试，也未在负载下对比两种数据平面。

其中有三行值得补充说明。

日志这一行关系到日志体量与内容。在 debug 级别下，agentgateway 会打印每个请求的请求头。在我们的运行中，它遮蔽了 `authorization`，且从未打印过注入的 Secret。但它确实以明文打印了 actor 发送的自定义请求头的值。请像对待请求头一样妥善保管这些日志。

`securityContext` 行完全取自安装器的生成结果。我们没有尝试为 agentgateway 容器手动添加该配置。

最后一行有利于 agentgateway，下一小节将结合上下文深入分析。

## 开放连接比其规则存活更久 {#s-the-dataplane-choice-an-open-connection-outlives-its-rule}

你从策略中删除某个主机，目的是让 actor 停止与其通信。网关只把新策略应用到新的连接或请求上。这是 v1.0.0 的已知行为{{issue #3285}}，两种数据平面都存在。

背后有两个机制。网关将 actor 的策略保存在缓存中，Envoy 默认缓存 10 秒，因此变更生效存在滞后{{code}}。此外已作出的裁决不会被重新评估：`http` 或 `https` 裁决对当前请求有效，`tlsPassthrough` 裁决对整条连接有效{{docs}}。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上，每种数据平面各测一次上述每种情况，大约每 2 秒轮询一次。时间零点代表更新命令返回的时刻。

| 规则删除后 | Envoy 数据平面 | agentgateway 数据平面 |
|---|---|---|
| 该主机发起的新 DNS 查询 | 首个样本即为 `NXDOMAIN`，2 秒内 | 3 秒内变为 `NXDOMAIN` |
| 向已知 IP 发起的新 HTTP 请求 | 1 秒和 3 秒时为 `200`，6 秒起为 `403` | 首个样本即为 `403`，2 秒内 |
| 新的透传连接 | 首个样本即被拒绝，2 秒内 | 首个样本即被拒绝，2 秒内 |
| 已经开始传输的 HTTP 响应 | 完整传输至结束，删除后持续 39 秒 | 完整传输至结束，删除后持续 18 秒 |
| 开放透传连接上的第二个请求，20 秒后 | `200` | `200` |
| `http` 规则复用 HTTP/1.1 连接上的下一个请求 | 6.5 秒时为 `200`，8.5 秒起为 `403` | 首个请求起即为 `403`，0.8 秒时 |
| `https` 规则复用 HTTP/2 连接上的下一个请求 | 4.6 秒时为 `200`，6.6 秒起为 `403` | 首个请求起即为 `403`，0.7 秒时 |

**我们测得**在同一台客户机（16 vCPU、23 GB）的后续运行中，针对每种数据平面和每种协议各测试了一次最后两行的情况。actor 内的一个 curl 进程在单条连接上发送 20 个请求，每 2 秒发送一次。我们在启动约 13 秒后删除了规则。每次运行的起始时间精度为 1 秒，因此这几行里的时间最多可能延后 1 秒。

```figure
id: fig-6-6b
kind: timeline
title: 规则删除后的行为时序
claim: 两种数据平面都在 9 秒内拒绝了新请求以及复用连接上的请求，且均未切断正在传输的响应或已建立的透传连接。
caption: 从左往右沿时间线阅读每条轨道，删除时刻设为零点。每个圆点代表一个样本，绿色代表正常响应，玫红色代表被拒绝。矩形条代表在删除前已建立且仍在传输数据的连接。39 秒与 18 秒是测试响应结束的时间，并非网关设定的上限。来源：capture/lab/F-egress/envoy/20-results.txt、capture/lab/F-egress/envoy/40-supplement.txt、capture/lab/F-egress/agentgateway/40-supplement.txt、capture/lab/summary/network-x86.json。
```

```listing
title: 规则删除期间保持开放的透传连接，Envoy 数据平面
source: capture/lab/F-egress/envoy/40-supplement.txt
lang: text
note: example.org 的规则在 10:57:53 被删除。两个响应均来自同一条 TLS 连接。
---
HTTP/1.1 200 OK
Date: Thu, 12 Nov 2026 10:57:50 GMT
HTTP/1.1 200 OK
Date: Thu, 12 Nov 2026 10:58:13 GMT
end=10:58:17
```

39 秒和 18 秒代表我们测试响应结束的时刻。在所有测试运行中，网关从未主动关闭开放的连接，因此我们无法给出时间上限。保持透传连接打开的 actor 会一直保有访问权限。

复用连接则是另一回事，它无法使已删除的规则继续生效。在 `http` 或 `https` 规则下，两种数据平面都会对每个请求重新检查策略。开放连接上的后续请求无论通过 HTTP/1.1 还是 HTTP/2 均收到 `403`。其生效延迟与新请求相同：agentgateway 上约为 1 秒，Envoy 上为 5 到 9 秒。删除后发起的全新连接则更早失败，因为域名已无法解析。

```listing
title: 规则删除期间单条 HTTP/1.1 连接上的请求，agentgateway 数据平面
source: capture/lab/Q-network/h-keepalive/agentgateway/results.txt
lang: text
note: 单条连接上 20 个请求中的第 6 到第 9 个。new_conns=0 字段和相同的本地端口表明 curl 复用了连接。其他请求已截去。
---
200 http=1.1 new_conns=0 lport=50509 t=0.012208
200 http=1.1 new_conns=0 lport=50509 t=0.008836
403 http=1.1 new_conns=0 lport=50509 t=0.007677
403 http=1.1 new_conns=0 lport=50509 t=0.009808
…
```

所以规律很明确：删除规则能拦截后续请求，但不会中断流式响应或透传连接。仅靠删除规则无法立即切断 actor 的通信。对于 `http` 规则，正确的做法是删除规则后紧接着挂起该 actor。

**我们测得**在同一台客户机（16 vCPU、23 GB）上对每种数据平面测试了一次强制切断。actor 正保持着一条来自某主机的未完成 HTTP 响应，该主机每秒写入一个数据块。异步的 `suspend actor` 在 agentgateway 上用时 0.64 秒返回，在 Envoy 上用时 0.54 秒返回。上游在挂起调用发起后 2.2 秒和 1.3 秒检测到连接断开。由于上游每秒写入一次，真实的关闭时间最多可能提前 1 秒。

断开的连接不会自动恢复。在 actor 恢复后，新的数据块无法送达 actor。curl 进程依然停留在 actor 的进程列表中，它们是从内存中恢复出来的，但底层的套接字已失效。被挂起的应用必须具备断线重连能力。我们在本次测试中使用了 `http` 规则。使用 `tlsPassthrough` 连接的重复测试留待下一版手册。

## 我们的判断 {#s-the-dataplane-choice-our-verdict}

对于 actor 运行不可信代码且策略包含 `https` 规则的集群，选择默认的 Envoy。核心原因在于 CA 私钥。Envoy 将私钥与解析 actor 流量的进程彻底隔离开，[第 6.4 节](#s-tls-interception)详细分析了该私钥所拥有的能力。Envoy 在 router 处也提供了更清晰的错误响应体。它也是唯一支持额外出站过滤实验性钩子的数据平面{{code}}。

在三种情况下选择 agentgateway。第一种是你运行自带该数据平面的 kagent。第二种是你运行小型集群，每集群省下 53 MB 内存很关键。第三种是你已经在运维 agentgateway，希望只维护一种代理。[第 7.2 节](#s-agentgateway)涵盖了最后一种情况。

如果你选择 agentgateway，请做好三件事。严格限制谁能读取 `ate-system` 中的 Secret 以及谁能在 `atenet-egress` 中开启 shell。把出站日志送到带有访问控制规则的存储里。在出站 Deployment 上配置 `RUST_LOG=info`。

**我们测得**在同一台客户机（16 vCPU、23 GB）上的单次运行中，针对每个日志级别测试了 100 个请求。在安装器默认的 `debug` 级别下，网关输出了 4,380 行日志，共计 1,590,006 字节，其中有 200 行打印了 actor 发送的自定义请求头的值。在 `info` 级别下，它输出了 100 行日志，共计 46,300 字节，每个请求一行且不打印任何请求头的值。在 `warn` 级别下没有任何日志输出。在所有级别下所有请求均返回 200。

```bash
kubectl -n ate-system set env deploy/atenet-egress RUST_LOG=info
```

这条命令会重启出站 pod。安装器下次运行时会重新写回 `debug`，因此这个配置得靠你自行保留。`atenet-router` 的日志级别，以及 `info` 是否足以排查被拒请求，留待下一版手册检验。

不要只凭速度做选型。在我们的探测中，放行的单个请求在 Envoy 上耗时 0.037 秒，在 agentgateway 上耗时 0.035 秒，各一次请求证明不了高负载下的表现。

```takeaways
- 当 actor 运行不可信代码且策略需要拦截 TLS 时，选择 Envoy。
- 在搭配 kagent，或每个集群节省 53 MB 内存具有实际意义时，选择 agentgateway。
- 把 agentgateway 的出站日志视为敏感信息，因为其中记录了请求头。
- 当工具报告请求被拒绝时，同时检索两套错误文本。
- 切勿指望删除规则能够立即切断流式响应或透传连接。
- 当必须立即切断 actor 与主机的通信时挂起 actor，并做好恢复后套接字失效的准备。
- 使用 agentgateway 时在 `atenet-egress` 上设置 `RUST_LOG=info`，并在每次运行安装器后重新设置。
```

来源：capture/lab/summary/restore-limit-x86.json, capture/lab/G-dataplane/envoy/01-pods.txt, capture/lab/G-dataplane/envoy/03-containers-atenet-router.tsv, capture/lab/G-dataplane/envoy/03-containers-atenet-egress.tsv, capture/lab/G-dataplane/envoy/05-sec-res-atenet-router.json, capture/lab/G-dataplane/envoy/05-sec-res-atenet-egress.json, capture/lab/G-dataplane/envoy/06-services.txt, capture/lab/G-dataplane/envoy/13-crictl-stats-atenet.txt, capture/lab/G-dataplane/envoy/ingress-auth/10-results.txt, capture/lab/G-dataplane/envoy/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/agentgateway/01-pods.txt, capture/lab/G-dataplane/agentgateway/03-containers-atenet-router.tsv, capture/lab/G-dataplane/agentgateway/03-containers-atenet-egress.tsv, capture/lab/G-dataplane/agentgateway/05-sec-res-atenet-router.json, capture/lab/G-dataplane/agentgateway/05-sec-res-atenet-egress.json, capture/lab/G-dataplane/agentgateway/06-services.txt, capture/lab/G-dataplane/agentgateway/13-crictl-stats-atenet.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/10-results.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/01-switch-in-place/11-timing.txt, capture/lab/G-dataplane/01-switch-in-place/10-deploy-agentgateway-in-place.log, capture/lab/F-egress/agentgateway/00-actors-after-switch.txt, capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/envoy/40-supplement.txt, capture/lab/F-egress/envoy/32-marker-in-logs.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/agentgateway/40-supplement.txt, capture/lab/F-egress/agentgateway/32-marker-in-logs.txt, capture/lab/F-egress/agentgateway/50-custom-header.txt, capture/lab/Q-network/h-keepalive/agentgateway/results.txt, capture/lab/Q-network/h-keepalive/envoy/results.txt, capture/lab/Q-network/k-suspend-cutoff/agentgateway/10-events.tsv, capture/lab/Q-network/k-suspend-cutoff/envoy/10-events.tsv, capture/lab/Q-network/k-suspend-cutoff/agentgateway/results.txt, capture/lab/Q-network/k-suspend-cutoff/envoy/results.txt, capture/lab/Q-network/k-suspend-cutoff/agentgateway/12-drip-server-after-suspend.log, capture/lab/Q-network/j-log-level/10-volume.tsv, capture/lab/Q-network/j-log-level/set-info.log, capture/lab/Q-network/00-dataplane-switch-to-agentgateway/17-after-rerun-rust-log-and-roots.json, capture/lab/summary/network-x86.json, cmd/atenet/internal/router/cmd.go, cmd/atenet/internal/router/egress/policycache.go, cmd/ate-setup/internal/config/load.go, manifests/ate-install/components/agentgateway/kustomization.yaml, docs/guides/network-egress.md at v1.0.0, issue #3285.
