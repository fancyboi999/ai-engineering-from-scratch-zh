# flag 与预览功能

> 真正改变 actor 行为的 flag 很少：`atelet` 上的两个快照计时器、路由器上的暂存预算，以及安装器里的数据平面和镜像选择。

每张表给出字面 flag，以及 v1.0.0 代码设置的默认值。如果某份录制的参数列表里有这个 flag，表中也会给出我们安装所用的值。每个组件的 flag 比这里更多。这些表只收录本手册用到的 flag，以及会改变可观察行为的 flag。

## 安装器 ate-setup {#s-ref-flags-and-gates-the-installer-ate-setup}

`ate-setup` 读取每项设置的顺序是：先 flag，再配置文件，再环境变量，最后是默认值。

| Flag | 默认值 | 作用 | 章节 |
|---|---|---|---|
| `--image-repo`, `--image-tag` | 无 | 安装已发布的镜像。不带它们时，安装器从检出目录构建每一个镜像。两个 flag 必须同时给出。 | [2.1](#s-install-with-ate-setup) |
| `--kind` | `false`（环境变量 `ATE_INSTALL_KIND`） | 使用 kind overlay：自带的 Postgres、rustfs 和本地 registry。 | [2.1](#s-install-with-ate-setup) |
| `--namespace` | `ate-system` | 控制平面的 namespace。 | [2.4](#s-what-the-install-created) |
| `--credential-provider` | 无，必填 | 一个 JSON 对象。`{"name":"k8s.io"}` 安装读取 Kubernetes Secret 的提供方。`{"enabled":false}` 关闭注入。 | [6.5](#s-credential-injection) |
| `--ingress-allowed-spiffe-ids` | 无 | 路由器接受的客户端身份。不给值时，没有任何客户端能访问 actor。 | [5.1](#s-client-authentication) |
| `--atenet-dataplane` | `envoy` | `envoy` 或 `agentgateway`。换成另一个值再运行一次，就能切换正在运行的集群。 | [6.6](#s-the-dataplane-choice) |
| `--sandbox-classes` | `gvisor,microvm` | 要准备的沙箱类别。kind 上的默认值相同。 | [4.2](#s-sandbox-classes) |
| `--preview` | 空 | 在每个组件中开启的预览功能。 | 本页 |
| `--cluster-size` | `size0` | `size10` 假定你提供一个 PostgreSQL 节点。它让自带的 Postgres 请求 80 个 CPU 和 140 GiB 内存，并据此调整数据库参数。它不会创建或预留这个节点。不要在 kind 或小集群上使用它。 | [8.1](#s-postgres-and-the-object-store) |
| `--rollout-timeout` | `60s` | 安装器等待每个工作负载的时间。 | [2.1](#s-install-with-ate-setup) |
| `--cordon-system-infra-components` | 关闭 | 让系统组件不落在 worker 节点上。使用 `size10` 时，正是这个 flag 让 Postgres 独占一个节点。 | [8.4](#s-upgrade-and-stale-advice) |
| `--ateapi-log-level` | 无：保持已安装的级别，否则为 `info` | `ate-api-server` 的日志级别。 | - |
| `--snapshot-location` | 无。kind 配置集设为 `gs://ate-snapshots/`。 | `ate-api-server` 的 `--snapshot-location`。除非开启了 `PerTemplateSnapshotLocation`，否则必填。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| `--actor-jwt-issuer` | `https://idp.<namespace>.svc` | 每个 actor JWT 中的签发者。 | [5.3](#s-actor-jwts) |
| `--actor-jwt-algorithm` | `ES256` | 新 actor JWT 密钥的签名算法：`ES256` 或 `RS256`。 | [5.3](#s-actor-jwts) |
| `--ateapi-authz-bootstrap-owners` | `system:serviceaccount:<namespace>:ate-client` | `ate-api-server` 的 `--authz-bootstrap-owners`。 | [5.2](#s-access-policies) |
| `--e2e-tuning` | `false` | 把 `atelet` 的计时器设为上传延迟 2 秒、分离延迟 30 秒。用于测试运行。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| `--setup-csi` | `none` | 同时安装 CSI 驱动：`nfs`、`hostpath` 或 `both`。 | - |
| `--record-dir` | 当前用户的缓存目录 | 安装器写入每次安装记录的位置。 | [2.4](#s-what-the-install-created) |

`--credential-provider` 的帮助文本说，凭据提供方需要 Envoy。在我们的运行中，安装器在 agentgateway 下接受了 `{"name":"k8s.io"}`，注入也正常工作。

## atelet：快照何时变为持久 {#s-ref-flags-and-gates-atelet-when-a-snapshot-becomes-durable}

| Flag | 默认值 | 作用 |
|---|---|---|
| `--snapshot-upload-delay` | `5m` | 异步挂起之后，快照在节点上等多久才开始上传。 |
| `--snapshot-detach-delay` | `30m` | 挂起的 actor 在多长时间内仍分配给它的节点，并保留节点上的副本。不得短于上传延迟。 |
| `--snapshot-upload-timeout` | `2m` | 一次上传尝试的时限，不含体积余量。连续每失败一次，下一次尝试的时限翻倍，最多到第一次的 8 倍。 |
| `--snapshot-upload-est-throughput-mib` | `100` | 体积余量。每次尝试在超时之外，再获得快照按这个速率（单位 MiB 每秒）所需的时间。 |
| `--snapshot-upload-workers` | `2` | 一个节点上同时进行的上传数。 |
| `--snapshot-detach-workers` | `2` | 一个节点上同时进行的分离数。 |
| `--snapshot-report-workers` | `1` | 同时向 `ate-api-server` 发送的快照状态报告数。 |
| `--snapshot-report-give-up-after` | `10m` | `atelet` 对失败的状态报告重试多久。 |
| `--snapshot-cache-min-age` | `10m` | 存在时间短于此值的缓存快照文件永远不会被删除。 |
| `--snapshot-cache-fetch-timeout` | `10m` | 下载一个缓存快照文件的时限。等待一次卡住的下载的恢复，会等这么久。 |
| `--actor-stats-poll-interval` | `1m` | `atelet` 多久采样一次 actor 的资源使用。 |
| `--drain-delay` | `0` | 收到 `SIGTERM` 后，`atelet` 还接受新调用多久。 |
| `--drain-timeout` | `5m` | 停止时，`atelet` 等待其工作结束的时间。 |
| `--log-level` | `info` | 我们的源码安装使用 `debug`。 |

```listing
title: 我们安装的 atelet 参数，默认计时器
source: capture/lab/D-durability/00-atelet-args.txt
lang: text
note: 整个文件。其中没有计时器 flag，所以适用 5 分钟和 30 分钟的默认值。
---
atelet --localhost-registry-replacement=kind-registry:5000 --grpc-server-cred-bundle=/run/podidentity.podcert.ate.dev/credential-bundle.pem --client-ca-certs=/run/podidentity.podcert.ate.dev/trust-bundle.pem --log-level=debug --preview=
```

在一个实验里，我们缩短了两个计时器，让从 bucket 恢复在几秒内就能准备好。[第 3.3 节](#s-suspendactor-and-resumeactor)使用了这次运行。

```listing
title: 带短计时器的 atelet 参数
source: capture/lab/C-resume-vs-size/31-atelet-args-patched.txt
lang: text
note: 文件中那一行的末尾。前四个 flag 与上面相同。
---
… --log-level=debug --preview= --snapshot-upload-delay=3s --snapshot-detach-delay=10s
```

短计时器让快照更早进入 bucket。分离延迟之后的恢复会从 bucket 读取，速度较慢。分离延迟之前的恢复仍使用节点上的副本。不要把 3 秒这个值照搬到服务用户的集群中。

## 路由器：暂存与端口 {#s-ref-flags-and-gates-the-router-parking-and-ports}

| Flag | 默认值 | 作用 |
|---|---|---|
| `--parked-request-budget` | `5s` | 路由器对尚无 worker 的请求保持多久。 |
| `--parked-request-max` | `1024` | 路由器同时保持多少个请求。`0` 关闭暂存。 |
| `--parked-request-retry-interval` | `100ms` | 对暂存的请求，两次尝试之间的首次等待。 |
| `--parked-request-retry-factor` | `1.1` | 这个等待时间的增长倍数。 |
| `--parked-request-retry-jitter` | `0.1` | 每次等待中的随机部分，取 0 到 1 之间的小数。 |
| `--extproc-max-requests` | `0` | Envoy 到路由器进程这条连接的请求上限。`0` 表示 `--parked-request-max` 的两倍，且至少为 1024。 |
| `--drain-delay` | `13s` | 收到 `SIGTERM` 后，路由器在开始排空前继续服务多久。 |
| `--drain-timeout` | `0` | 排空的时限。`0` 表示暂存预算加 10 秒，再加 5 秒余量，默认值下是 20 秒。显式给出的值不得小于暂存预算。暂存的请求在这个时限内结束。 |
| `--route-timeout` | `5m` | 一个完整请求的时限。 |
| `--ingress-allowed-spiffe-ids` | 无 | 由安装器 flag 设置的允许列表。 |
| `--port-https` | `8443` | 带 `ate-target-actor` 头的请求所用的监听端口。 |
| `--port-connect-tls` | `8444` | `CONNECT` 隧道的监听端口，`kubectl ate proxy` 使用它。 |
| `--upstream-connect` | `true` | 路由器用 `CONNECT` 连接 worker。 |
| `--egress-policy-cache-ttl` | `10s` | 出站网关把读到的策略保留多久。 |

```listing
title: 我们安装的路由器参数
source: capture/lab/I-capacity/17-router-args.txt
lang: text
note: 第一行的几个部分。其中没有暂存 flag，所以预算是 5 秒的默认值。
---
atenet-router router --mode=ingress --namespace=ate-system … --port-https=8443 … --port-connect-tls=8444 … --drain-delay=13s --ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client --preview=
```

我们每次运行中，每个 `no worker has room` 响应里的 5.05 到 5.16 秒，就是这个预算加上请求耗时。[第 4.4 节](#s-request-parking)解释了这个机制。

## ate-api-server 与 ate-controller {#s-ref-flags-and-gates-ate-api-server-and-ate-controller}

| 组件 | Flag | 默认值 | 作用 |
|---|---|---|---|
| `ate-api-server` | `--snapshot-location` | 无。除非开启了 `PerTemplateSnapshotLocation`，否则必填。 | 持久快照的地址前缀，例如 `gs://ate-snapshots/`。既不给它也不开启该功能时，服务器无法启动。 |
| `ate-api-server` | `--postgres-schema` | `substrate` | 存放所有表的 schema。 |
| `ate-api-server` | `--postgres-pool-max-conns` | `0` | 读写连接池的大小，授权器与它共用。`0` 保持连接字符串或驱动的默认值。owner、watch 和就绪检查所用的池不受它影响。 |
| `ate-api-server` | `--template-resync-interval` | `20s` | 调谐器多久检查一次模板及其黄金快照。 |
| `ate-api-server` | `--authz-bootstrap-owners` | 无。必填，至少一个。`ate-setup` 设为 `ate-client`。 | 只要该 flag 列出它们，这些身份就是全局 owner，不论存储的全局访问策略怎么写。 |
| `ate-api-server` | `--actor-jwt-issuer` | 无。必填。`ate-setup` 设为 `https://idp.ate-system.svc`。 | 每个 actor JWT 中的签发者。必须是不带 query 和 fragment 的 `https` 地址。 |
| `ate-api-server` | `--drain-delay`, `--drain-timeout` | `13s`, `15s` | 副本停止之前和停止期间的等待时间。 |
| `ate-controller` | `--dns-egress-policy` | 空 | 安装清单设为 `enforce-in-atunnel`，让 DNS 中继执行出站策略。 |
| `ate-controller` | `--worker-sync-concurrency` | `2` | 控制器同时把多少个 worker pod 注册为 Worker 记录。 |

有两个限制写死在代码里，没有 flag。worker 在收到 `SIGTERM` 后给它的 actor 30 分钟。`ate-api-server` 在 10 分钟后结束任何调用。

## 预览功能 {#s-ref-flags-and-gates-preview-features}

预览功能默认关闭，只有两个开关同时放行时才会开启。

1. 服务器开关。每个组件都接受 `--preview`，值是名称列表或 `ALL`。安装器 flag 把同一个值传给所有组件。
2. 客户端开关。请求必须带头 `Ate-Preview-Allowed: true`。`kubectl ate --preview` 会发送它。

| 名称 | 它允许的字段 | 默认值 |
|---|---|---|
| `ExternalVolumes` | 模板中的 `volumes[].external`，配合 CSIDriverConfig | 关闭 |
| `GoldenEgressPolicy` | 模板中的 `goldenEgressPolicy` | 关闭 |
| `PerTemplateSnapshotLocation` | 模板中的 `snapshotConfig.storageLocation` | 关闭 |

文档说，功能开启期间创建的对象，在功能关闭后仍可使用 {{docs}}。这只对校验成立：服务器不会重新检查未改动的值。代码里还有两处文档未提及的运行时影响 {{code}}。

| 关闭的功能 | 已经使用它的对象会怎样 |
|---|---|
| `ExternalVolumes` | 恢复带外部卷的 actor 会失败。错误是 `external volumes are not supported unless the ExternalVolumes preview gate is enabled`。 |
| `PerTemplateSnapshotLocation` | 服务器忽略模板的 `snapshotConfig.storageLocation`。新快照写到 `--snapshot-location`。 |
| `GoldenEgressPolicy` | 我们没有找到运行时检查。 |

这两种情况我们没有实际运行过。只有在移除所有使用某个功能的对象之后，才能关闭该功能。

我们在 x86 服务器客户机上，把两个开关的四种组合各试了一次。请求是 `kubectl ate create actor-template`，所用文件带有 `goldenEgressPolicy` 字段。

| `ate-api-server` 上的 `--preview` | `kubectl ate` 上的 `--preview` | 结果 |
|---|---|---|
| 空 | 未传 | `Error: failed to create actor template: rpc error: code = InvalidArgument desc = actor_template.golden_egress_policy: Forbidden` |
| 空 | 已传 | 同样的错误 |
| `GoldenEgressPolicy` | 未传 | 同样的错误 |
| `GoldenEgressPolicy` | 已传 | 被接受，30 秒内生成黄金标签 |

错误里写的是字段名，不是功能名。用 `kubectl ate get` 读取新模板不需要带客户端 flag。这次测试中只有 `ate-api-server` 有服务器开关，事后我们已恢复它的参数。我们记录的其他每份参数列表里都是不带值的 `--preview=`，所以在其他所有运行中三个功能都是关闭的。

## 集群必须具备的 Kubernetes 特性 {#s-ref-flags-and-gates-kubernetes-features-that-the-cluster-must-have}

Substrate 用 Kubernetes pod 证书签发自己的证书。kind 的集群脚本为此开启三个 Kubernetes 特性和一个 API 组。

| 名称 | 类型 |
|---|---|
| `ClusterTrustBundle` | Kubernetes 特性 |
| `ClusterTrustBundleProjection` | Kubernetes 特性 |
| `PodCertificateRequest` | Kubernetes 特性 |
| `certificates.k8s.io/v1beta1` | API 组和版本 |

没有这些特性的集群无法启动 Substrate 组件。我们在每次测试中都运行 Kubernetes 1.37.0。

来源：cmd/ate-setup/commands.md and docs/guides/operator-install.md (installer settings), cmd/atelet/main.go, cmd/atelet/snapshotcache.go and cmd/atelet/internal/snapshottracker/background.go (atelet flags and timer defaults), cmd/atenet/internal/router/cmd.go, cmd/atenet/internal/router/ingress/parking.go, cmd/atenet/internal/router/xds.go and cmd/atenet/internal/router/egress/policycache.go (router flags and defaults), cmd/atenet/internal/router/config.go (the drain timeout), cmd/ateapi/main.go, cmd/ateapi/internal/controlapi/workflow_resume.go and snapshot_helpers.go (the runtime checks of preview features), cmd/ate-setup/internal/config/setting.go and load.go, cmd/ate-setup/internal/cmd/deploy.go, cmd/ate-setup/internal/steps/postgres.go and microvm.go, manifests/ate-install/components/e2e/kustomization.yaml, cmd/atelet/internal/snapshottracker/report.go, cmd/atecontroller/, internal/preview/preview.go, docs/dev/preview-gates.md and hack/create-kind-cluster.sh at v1.0.0; capture/lab/D-durability/00-atelet-args.txt, capture/lab/C-resume-vs-size/31-atelet-args-patched.txt, capture/lab/I-capacity/17-router-args.txt, capture/lab/G-dataplane/00-install/steps.tsv, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/V-validation/10-preview-feature/10-preview.tsv, capture/lab/V-validation/10-preview-feature/tmpl-gep.yaml, capture/lab/V-validation/10-preview-feature/11-patch-on.log.
