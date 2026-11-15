# 术语表

> 下列每个术语在全手册中只有一个含义，最后一列给出解释它的章节。

这些含义来自 v1.0.0 的 Agent Substrate 源码和文档，也来自我们自己的运行。代码字体的术语是你要输入、或在输出中读到的字面名称。

| 术语 | 本手册中的含义 | 说明章节 |
|---|---|---|
| 访问策略（access policy） | 一组绑定，在 API 上授予角色，作用于一个 atespace 或整个安装 | [5.2](#s-access-policies) |
| actor | 一个隔离的工作负载，带有身份和状态。Substrate 可以把它挂起成快照，再在合适的 worker 上恢复。只要某个节点还保存着它的最新快照，它就在该节点上恢复 | [1.1](#s-what-substrate-does-and-what-it-leaves-to-you) |
| actor JWT | 一个签名令牌，声明某个 actor 的身份。出站网关可以把它附加到出站请求上 | [5.3](#s-actor-jwts) |
| `ACTOR_STATE_CRASHED` | 沙箱、worker 或恢复过程丢失的 actor 所处的状态。只有回退或删除才能让它离开这个状态。 | [3.5](#s-crashed-and-revertactor) |
| `ActorTemplate` | 描述容器、资源限制和快照保真度的记录，由它创建的 actor 都遵循这些设置 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| agent（kagent） | 一个 `AgentTemplate` 和一个 harness 的组合，kagent 把它编译成一个 `ActorTemplate` | [7.1](#s-kagent-on-substrate) |
| agentgateway | 一个开源代理。Substrate 可以用它代替 Envoy 作为数据平面 | [6.6](#s-the-dataplane-choice) |
| `AgentTemplate` | kagent 的对象，保存 agent 的模型、提示词和工具 | [7.1](#s-kagent-on-substrate) |
| 异步挂起（asynchronous suspend） | 快照写到节点上就返回，不等上传到 bucket。这是默认方式。 | [3.3](#s-suspendactor-and-resumeactor) |
| `ate-api-server` | Substrate API 服务器。它提供两个 gRPC 服务，也是唯一读写 Postgres 的组件。 | [1.2](#s-one-request-from-client-to-actor) |
| `ate-controller` | 把每个 `WorkerPool` 变成 worker pod，并把它们注册为 worker 的组件 | [2.4](#s-what-the-install-created) |
| `ate-idp-server` | 发布 actor JWT 公钥的组件 | [5.3](#s-actor-jwts) |
| `ate-setup` | Substrate 仓库里的安装器程序 | [2.1](#s-install-with-ate-setup) |
| `atelet` | 每个节点上的 Substrate agent。它驱动本节点的 worker，并在 bucket 与节点之间搬运快照。 | [2.4](#s-what-the-install-created) |
| `atenet-egress` | 出站网关：actor 的每个出站连接都要经过的数据平面 pod | [6.2](#s-egresspolicy-and-default-deny) |
| `atenet-router` | 路由器：接收发往 actor 的每个请求并转发给 worker 的数据平面 pod | [6.1](#s-the-router-and-ingress) |
| atespace | 用来对 actor、模板和标签分组的名称，并带有一份访问策略。它是 Substrate 的记录，与 Kubernetes namespace 无关。 | [3.6](#s-atespaces) |
| 压舱 actor（ballast actor） | 我们的测试 actor。它持有指定 MiB 数量的随机字节，收到请求时读取每个 MiB 中的一个字节。 | [3.3](#s-suspendactor-and-resumeactor) |
| 绑定（binding） | 访问策略里的一条记录：一个角色，加上持有该角色的身份 | [5.2](#s-access-policies) |
| 引导所有者（bootstrap owner） | 来自服务器 flag `--authz-bootstrap-owners` 的主体，始终持有全局 owner 角色 | [5.2](#s-access-policies) |
| bucket | 保存持久快照的对象存储位置。在我们的集群里是 rustfs 上的 `ate-snapshots`。 | [8.1](#s-postgres-and-the-object-store) |
| 崩溃（crashed） | 沙箱或 worker 丢失后，或恢复失败后，actor 所处的状态。只有回退或删除才能让它离开这个状态。 | [3.5](#s-crashed-and-revertactor) |
| 凭据注入（credential injection） | 出站网关把出站请求的某个头替换成一个 actor 自己从不持有的密钥 | [6.5](#s-credential-injection) |
| 凭据提供方（credential provider） | 把该密钥返回给出站网关的服务 | [6.5](#s-credential-injection) |
| 数据平面（dataplane） | 路由器和出站网关的合称，基于 Envoy 或 agentgateway 构建 | [6.6](#s-the-dataplane-choice) |
| 默认拒绝（default deny） | 没有匹配出站规则的 actor 不能访问任何主机，也不能解析任何名称 | [6.2](#s-egresspolicy-and-default-deny) |
| DNS 中继（DNS relay） | 沙箱网络内的解析器，只回答出站策略允许的名称 | [6.3](#s-the-dns-relay) |
| 持久快照（durable snapshot） | 文件已在 bucket 中、存储状态已完成的快照 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| `EgressPolicy` | 某个 actor 的规则：写明它可以访问的主机和端口，以及网关要替换的头 | [6.2](#s-egresspolicy-and-default-deny) |
| epoch | worker 进程启动时获得的一个编号。来自同一个 worker 旧 epoch 的 actor 会进入崩溃状态。 | [API 参考](#s-ref-api-methods) |
| 仅文件快照（files-only snapshot） | volumes 保真度的快照。它保留持久目录，恢复时进程重新启动。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| 首次调用（first call） | 对新 actor 的第一个请求，其中包含从黄金快照的恢复 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| 黄金快照（golden snapshot） | Substrate 为每个模板对一个已启动的 actor 拍下的快照，新 actor 从它恢复 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| 黄金标签（golden tag） | Substrate 用来存放某个模板黄金快照的标签 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| gVisor | 让 actor 在用户态内核下运行的沙箱类别。API 没有默认类别：每个 `WorkerPool` 只指定一个。计数器示例的池指定 gVisor。 | [4.2](#s-sandbox-classes) |
| harness | 执行 agent 并决定何时挂起其 actor 的运行时。在 kagent 中，它也是指定 `WorkerPool` 和快照位置的对象。 | [7.1](#s-kagent-on-substrate) |
| 入站允许列表（ingress allowlist） | 路由器接受的客户端身份列表 | [5.1](#s-client-authentication) |
| 安装器（installer） | 程序 `ate-setup`，从某个标签的检出目录安装和卸载 Agent Substrate | [2.1](#s-install-with-ate-setup) |
| 拦截 CA（interception CA） | 证书颁发机构。出站网关对 `https` 规则向 actor 出示的证书，由它的密钥签发 | [6.4](#s-tls-interception) |
| kagent | 面向 Kubernetes 的开源 agent 框架。1.0.0 版会安装它自己的 Substrate 发行版。 | [7.1](#s-kagent-on-substrate) |
| `kubectl ate` | Substrate API 的命令行插件 | [2.2](#s-kubectl-ate) |
| 租约（lease） | Postgres 中的一行记录，赋予一个工作流修改一个对象的权利。工作流负责续约，最后一次续约 30 秒后到期。 | [8.1](#s-postgres-and-the-object-store) |
| microVM | 让 actor 在小型虚拟机中运行的沙箱类别。节点上需要 KVM。 | [4.2](#s-sandbox-classes) |
| 模拟模型（mock model） | 我们 kagent 集群里的服务器，用固定回复应答模型调用，从而使模型耗时接近于零 | [7.1](#s-kagent-on-substrate) |
| 模型网关（model gateway） | agentgateway 的一种模式，把请求路由到模型提供方，并应用预算和故障转移。它与 Substrate 数据平面是分开的。 | [7.2](#s-agentgateway) |
| 节点本地快照（node-local snapshot） | 快照在节点磁盘上的副本。异步挂起之后、上传之前，它是唯一的副本。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| 对象存储（object store） | 保存 bucket 的服务：我们的集群用 rustfs，文档里用 Google Cloud Storage 或 S3 | [8.1](#s-postgres-and-the-object-store) |
| 暂存的请求（parked request） | 路由器保持打开、同时重试恢复 actor 的请求 | [4.4](#s-request-parking) |
| 暂存预算（parking budget） | 路由器在没有可用 worker 时保持请求等待的最长时间，超时后返回 503。默认是 5 秒。 | [4.4](#s-request-parking) |
| 占位头（placeholder header） | actor 发送的请求头，其值并非真实密钥，而是用于指示网关进行替换 | [6.5](#s-credential-injection) |
| 放置（placement） | 为要恢复的 actor 选择 worker | [4.3](#s-placement) |
| 插件（plugin） | 二进制 `kubectl-ate`，`kubectl` 对每个以 `kubectl ate` 开头的命令都会运行它 | [2.2](#s-kubectl-ate) |
| 预览功能（preview feature） | 默认关闭的功能，只有服务器 flag `--preview` 和客户端头都允许时才会开启 | [flag 参考](#s-ref-flags-and-gates) |
| 主体（principal） | `ate-api-server` 从凭据中得出的身份，也是访问策略授予角色的对象名称 | [5.1](#s-client-authentication) |
| 代理（proxy） | `kubectl ate proxy actor`：本地监听端口，通过路由器把 TCP 流量转发给一个 actor | [2.3](#s-your-first-actor-and-the-proxy) |
| 请求暂存（request parking） | 没有 worker 有空位时，路由器持有请求并再次尝试 | [4.4](#s-request-parking) |
| 恢复（resume） | 在 worker 上从最新快照还原 actor。路由器对每个请求都会请求恢复。 | [3.3](#s-suspendactor-and-resumeactor) |
| `ResumeActor` | 把挂起的 actor 放到某个 worker 上并还原其最新快照的调用 | [3.3](#s-suspendactor-and-resumeactor) |
| 回退（revert） | 让 actor 回到最近一次持久快照，并丢弃之后的内容 | [3.5](#s-crashed-and-revertactor) |
| `RevertActor` | 丢弃 actor 当前的运行，让它回到最近一次完成的持久快照并处于挂起状态的调用 | [3.5](#s-crashed-and-revertactor) |
| 路由头（routing header） | HTTP 头 `ate-target-actor`，值为 `<atespace>/<actor>`，告诉路由器请求发往哪里 | [6.1](#s-the-router-and-ingress) |
| 沙箱（sandbox） | worker 为一个 actor 启动的隔离环境 | [4.2](#s-sandbox-classes) |
| 沙箱类别（sandbox class） | 沙箱的种类：`gvisor` 或 `microvm` | [4.2](#s-sandbox-classes) |
| `SandboxConfig` | Kubernetes 对象，写明某个沙箱类别的运行时版本及其文件 | [4.2](#s-sandbox-classes) |
| 会话（session） | 在 kagent 中指一次对话。kagent 把每个会话映射到一个 actor。 | [7.1](#s-kagent-on-substrate) |
| 共享身份（shared identity） | `ate-system` 中的 ServiceAccount `ate-client`。不提供令牌时，`kubectl ate` 使用它 | [5.1](#s-client-authentication) |
| 快照（snapshot） | actor 在一次挂起时保存的状态 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| 快照缓存（snapshot cache） | 节点上的目录，保存已下载的快照文件，供之后的恢复使用 | [8.1](#s-postgres-and-the-object-store) |
| 快照保真度（snapshot fidelity） | 快照保存多少内容：只有 volumes，加上根文件系统，或再加上进程内存 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| SPIFFE ID | 客户端证书中的身份，例如 `spiffe://cluster.local/ns/ate-system/sa/atenet-client` | [5.1](#s-client-authentication) |
| 常驻端口转发（standing port-forward） | 你一直保持打开的 `kubectl port-forward`，使并行的 CLI 调用不必各自重复建立端口转发 | [7.1](#s-kagent-on-substrate) |
| 挂起（suspend） | 为运行中的 actor 写下快照，并释放它的 worker | [3.3](#s-suspendactor-and-resumeactor) |
| `SuspendActor` | 为运行中的 actor 生成检查点、停止其沙箱并腾出它在 worker 上位置的调用 | [3.3](#s-suspendactor-and-resumeactor) |
| 同步挂起（synchronous suspend） | 快照进入 bucket 之后才返回的挂起 | [3.3](#s-suspendactor-and-resumeactor) |
| 标签（tag） | 挂起 actor 的快照的命名副本，新 actor 可以从它启动 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives), [API 参考](#s-ref-api-methods) |
| TLS 拦截（TLS interception） | 出站网关终止 actor 的 TLS 连接，并自己向主机打开一条连接，以便读取请求 | [6.4](#s-tls-interception) |
| TLS 透传（TLS pass-through） | 出站网关检查服务器名称后，不读取内容，直接转发 TLS 连接 | [6.4](#s-tls-interception) |
| 信任包（trust bundle） | 保存拦截 CA 证书的文件，让 actor 能够验证被拦截的连接。只有当模板挂载了以 `trustBundle` 为来源的 `systemInfo` 卷时，沙箱里才有它。actor 里的代码也必须配置为信任它。 | [6.4](#s-tls-interception) |
| 轮次（turn） | 在 kagent 中指一条用户消息和对它的回复。kagent 在轮次之前恢复 actor，轮次之后挂起它。 | [7.1](#s-kagent-on-substrate) |
| 唤醒探测（wakeup probe） | 模板里的 HTTP 检查，恢复要等它通过，actor 才算运行中 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| 热调用（warm call） | 对已在运行的 actor 的请求 | [3.3](#s-suspendactor-and-resumeactor) |
| worker | `WorkerPool` 中向 API 注册过的一个 pod。它最多托管容量上限数量的 actor。 | [4.1](#s-workerpool) |
| worker 选择器（worker selector） | 模板或 actor 中的标签，用来选择哪些池可以托管它 | [4.3](#s-placement) |
| `WorkerPool` | Kubernetes 对象，请求一定数量使用同一镜像、同一资源规格的 worker pod | [4.1](#s-workerpool) |

来源：api/ateapi/v1/ateapi.proto, api/infra/k8s/ate/v1/, docs/reference/glossary.md and docs/reference/api-guide.md at v1.0.0; the definitions in every file under sections/; capture/lab/C-resume-vs-size/main.go (the ballast actor), capture/lab/K-kagent/agent/ (the mock model).
