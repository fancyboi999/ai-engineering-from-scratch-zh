# 安装创建了什么

> 系统安装创建了三个命名空间里的 15 个运行中 pod 和三个自定义资源，并把每个 atespace、模板、actor 和 worker 都存进了 Postgres，`kubectl` 看不到它们。

安装顺利结束，没有报错，而 `kubectl get pods -A` 打印出了一整页你从未取过的 pod 名称。下周其中某个名字就可能出现在报错信息里。你想弄清每个 pod 负责什么、哪些有第二个副本，以及你的 actor 究竟存放在哪里。

读完本节，你能说出安装所创建的每个 pod 的职责。你还能说清哪些对象存在 etcd 里、哪些存在 Postgres 里，以及哪些 pod 只运行单个副本。

## pod {#s-what-the-install-created-the-pods}

这是我们从源码安装之后的命名空间 `ate-system`。用发布镜像安装会创建同样的 pod。

```listing
title: ate-system 里的 pod
source: capture/lab/A-quickstart/60-state.log
lang: text
note: kubectl get pods -A -o wide 输出中的十二行。每行的 IP 列和节点列已截去。
---
NAMESPACE                          NAME                                         READY   STATUS      RESTARTS   AGE …
ate-system                         ate-api-server-696d95dd66-9q7f8              2/2     Running     0          117s …
ate-system                         ate-api-server-696d95dd66-t85dd              2/2     Running     0          117s …
ate-system                         ate-controller-7479ff54f-jrrtc               1/1     Running     0          114s …
ate-system                         ate-idp-server-7c46c85d94-66sf2              1/1     Running     0          116s …
ate-system                         ate-idp-server-7c46c85d94-cfbt4              1/1     Running     0          116s …
ate-system                         atelet-sqzvr                                 2/2     Running     0          113s …
ate-system                         atenet-egress-78f759fcb8-74d4m               3/3     Running     0          76s …
ate-system                         atenet-router-86454b57f5-7vtp5               2/2     Running     0          112s …
ate-system                         k8s-credential-provider-8df9859f8-jcfll      1/1     Running     0          89s …
ate-system                         postgres-0                                   2/2     Running     0          7m13s …
ate-system                         rustfs-54c86945fb-w9pnn                      1/1     Running     0          109s …
ate-system                         rustfs-bucket-init-bvq6z                     0/1     Completed   0          109s …
```

[图 2.4](#fig-2-4) 把所有 pod 按命名空间分组，并按职责给每个 pod 配上对应颜色。

```figure
id: fig-2-4
kind: layers
title: 安装在 kind-control-plane 上创建了什么
claim: 安装把控制平面、数据平面、节点代理、Postgres 和对象存储放进了同一个节点上的同一个命名空间。
caption: 每个框代表我们这次安装中的一个工作负载。蓝色是控制平面，靛蓝是数据平面，紫色是 worker 和沙箱，青色是持久状态，灰色在 Substrate 之外。来源：capture/lab/A-quickstart/60-state.log。
```

每个工作负载各司其职：

| 工作负载 | pod 数 | 职责 |
|---|---|---|
| `ate-api-server` | 2 | API 与调度器。它为 `kubectl ate` 和 router 提供服务，并把全部状态保存在 Postgres 里 {{code}} |
| `ate-controller` | 1 | 把每个 `WorkerPool` 转化为管理 worker pod 的 Deployment，并把每个 worker pod 注册到 `ate-api-server` {{code}} |
| `ate-idp-server` | 2 | 发布用于验证 actor JWT 的密钥。[第 5.3 节](#s-actor-jwts)会用到它 |
| `atelet` | 每个节点 1 个 | 节点代理。它拉取镜像，恢复沙箱并为沙箱生成检查点，在节点上保存快照，并上传快照 {{code}} |
| `atenet-router` | 1 | 入站。它校验客户端证书，向 `ate-api-server` 询问 actor 所在位置，然后转发请求 |
| `atenet-egress` | 1 | 出站。每个 actor 的每一条出站连接都经过它 |
| `k8s-credential-provider` | 1 | 读取 Kubernetes Secret，用于凭据注入 |
| `postgres-0` | 1 | Substrate 的数据库 |
| `rustfs` | 1 | kind 上用于存放快照的对象存储。云上安装使用 bucket |
| `rustfs-bucket-init` | 一个已完成的 Job | 一次性创建了 bucket `ate-snapshots` |

还有一个 pod 运行在它自己的命名空间里。`podcertificate-controller` 负责签发 pod 用来证明身份的证书。它依赖集群脚本启用的那三个 Kubernetes 预览功能 {{code}}。

## 哪些只有一个副本 {#s-what-the-install-created-what-has-one-replica}

数一数清单里的 pod。`ate-api-server` 和 `ate-idp-server` 有两个副本，其余全部只有一个。

```figure
id: fig-2-4b
kind: layers
title: ate-system 里的 pod，每个 pod 一个对象
claim: 在 ate-system 中，只有 ate-api-server 和 ate-idp-server 各运行两个 pod，其余每个工作负载，包括 router 和 Postgres，都只运行一个。
caption: 每个对象代表我们这次安装中的一个 pod，放在所属命名空间的方块和所在节点的平板上。塔形是服务器，带端口的矮单元是网关。圆柱是 Postgres，桶形是对象存储，虚线轮廓是已完成的 Job。标记指明程序来自哪个项目。来源：capture/lab/A-quickstart/60-state.log。
```

这对其中三个工作负载至关重要。每个 actor 的每个请求都要经过 `atenet-router`，而 `ate-api-server` 对每个请求都会读一次 Postgres。[第 1.2 节](#s-one-request-from-client-to-actor)展示了这条路径。所以你所有 actor 的前方，只有一个 router pod 和一个 Postgres pod。内置的 Postgres 没有第二个副本，也没有故障转移 {{code}}。

对你机器上的 kind 集群来说，这没问题。但对任何有人依赖的环境，继续之前请先读[第 8.1 节](#s-postgres-and-the-object-store)。它讲外部数据库，以及 Postgres 故障会对请求造成什么影响。

## 三个自定义资源 {#s-what-the-install-created-three-custom-resources}

安装给 Kubernetes 添加了三个自定义资源：

```listing
title: Agent Substrate 的自定义资源
source: capture/lab/A-quickstart/60-state.log
lang: text
---
NAME                       SCOPE        VERSIONS      CREATED AT
csidriverconfigs.ate.dev   Cluster      v1(storage)   2026-11-12T10:05:33Z
sandboxconfigs.ate.dev     Cluster      v1(storage)   2026-11-12T10:05:33Z
workerpools.ate.dev        Namespaced   v1(storage)   2026-11-12T10:05:33Z
```

**WorkerPool：** 一个命名空间作用域的对象，用来申请一定数量、属于同一种沙箱类别的 worker pod。它是日常唯一用普通 `kubectl` 管理的 Substrate 对象。[第 4.1 节](#s-workerpool)会详讲它。

`SandboxConfig` 描述整个集群可用的沙箱类别。安装创建了两个：`gvisor-default` 和 `microvm` {{docs}}。`CSIDriverConfig` 属于一项卷管理的预览功能，相关实测计划在下一版补充。

其余一切都是 Postgres 里的记录行：atespace、模板、actor、标签、worker、出站策略和访问策略。因此 `kubectl get` 列不出它们，etcd 的备份里没有它们，也没有任何 Kubernetes RBAC 规则能指名它们。要备份 actor，就得备份 Postgres 和对象存储。默认挂起产生的快照大约 5 分钟后才上传到对象存储，所以更早完成的备份里不会包含它。[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)有各个计时器。[第 3.6 节](#s-atespaces)和[第 5.2 节](#s-access-policies)讲命名和访问控制。

## 演示命名空间 {#s-what-the-install-created-the-demo-namespace}

`deploy demo counter` 创建了命名空间 `ate-demo-counter`，里面有一个名为 `counter` 的 `WorkerPool`。`ate-controller` 把它变成了三个 worker pod。每个 pod 运行镜像 `ateworker-gvisor`，其中包含 gVisor 沙箱。

演示还创建了两样 `kubectl` 显示不出来的东西：atespace `ate-demo-counter` 和模板 `counter`。用插件来读取它们：

```bash
kubectl get workerpools -A
kubectl ate get atespaces
kubectl ate get actor-templates -a ate-demo-counter
```

这里的 atespace 和 Kubernetes 命名空间同名，但它们是两个完全独立的对象。atespace 只是 Substrate 的命名分组，没有任何东西把它和某个命名空间绑在一起。

worker pod 不是普通 pod。它以 root 身份运行，并带有 `SYS_ADMIN` 和 `NET_ADMIN` 权能，因为它要启动沙箱 {{docs}}。请只把 `WorkerPool` 放在你信任并愿意赋予这些权限的节点上。[第 4.2 节](#s-sandbox-classes)讲沙箱类别。

## 遥测命名空间 {#s-what-the-install-created-the-telemetry-namespace}

kind 配置档还会安装 `otel-system`，里面有三个 pod：OpenTelemetry collector、Prometheus 和 Jaeger {{docs}}。它们不属于 Substrate，只负责接收它的指标和追踪数据。

它们第一天就能派上用场。给任何 `kubectl ate` 命令加上 `--trace`，转发 Jaeger 端口，就可以打开链路追踪：

```bash
kubectl port-forward -n otel-system svc/jaeger 16686:16686 &
kubectl ate get actor my-counter-1 -a ate-demo-counter --trace
```

## 单机上的成本 {#s-what-the-install-created-what-it-costs-on-one-machine}

**我们测得**发布镜像安装的大小，在一台 16 vCPU、23 GB 的 x86 服务器客户机上测了一次。Docker 占用了 2.1 GB 镜像和 4.8 GB 卷。客户机连同操作系统和 Go 缓存在内，一共占用了 13 GB 磁盘。

**我们测得**内存占用，在 Docker Desktop 下的一台 Apple 芯片笔记本电脑上测了一次。安装刚结束、还没有任何 actor 时，kind 节点占用 2.7 GiB。

安装还在集群外留下了两样东西。第一样是第二个容器，即本地镜像仓库：

```listing
title: 宿主机上的容器
source: capture/lab/A-quickstart/60-state.log
lang: text
---
kind-control-plane kindest/node:v1.37.0
kind-registry registry:3
```

第二样是一个文件。`ate-setup` 把每次安装的设置记录在当前用户的缓存目录里，每个 kubeconfig 上下文对应一个文件。Linux 上是 `~/.cache/ate-setup/installs/`，macOS 上是 `~/Library/Caches/ate-setup/installs/`，参数 `--record-dir` 可以指定其他目录 {{code}}。请妥善保留这个文件，以后你要核对运行中的集群当初是用哪些参数安装的，全靠它。

```takeaways
- WorkerPool 用 kubectl，其他一切用 kubectl ate。
- 备份 Postgres 和对象存储，因为 Kubernetes 备份里没有你的 actor。
- 在默认安装里，把 atenet-router 和 postgres-0 当作单点故障。
- 只在你信任其 root 和 SYS_ADMIN 权限的节点上运行 worker pod。
- 保留 ate-setup 为你的集群写下的设置文件。
```

来源：capture/lab/summary/install-steps.json, capture/lab/A-quickstart/60-state.log, capture/lab/A-quickstart/22-deploy-ate-system-retry.log, capture/lab/A-quickstart/30-deploy-counter.log, capture/lab/G-dataplane/00-install/60-state.log, capture/lab/G-dataplane/00-install/20-deploy-ate-system-prebuilt.log, capture/lab/G-dataplane/envoy/15-all-images.tsv, capture/lab/M-mac-arm64/60-state.log, capture/lab/B-lifecycle/13-workers.txt; manifests/ate-install, cmd/atecontroller, cmd/atelet, cmd/ateapi, docs/concepts/architecture.md, docs/reference/api-guide.md, docs/reference/kubectl-ate.md, and hack/create-kind-cluster.sh at v1.0.0.
