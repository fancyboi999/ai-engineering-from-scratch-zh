# GKE 上的 Substrate

> GKE 上的 Agent Substrate 是由你在自己的 GKE Standard 集群中运维的系统及其安装器和文档，Google 并不运行其控制平面。

你的团队使用 GKE，而且你读到 Agent Substrate 已经在那里正式商用（GA）。你打开集群管理页面寻找勾选项，却一无所获，`gcloud` 也没有提供对应命令。本版手册并未在 GKE 上实际运行 Substrate。本节内容源自 Google 官方文档与安装器代码，两者均查阅于 2026-11-12，凡涉及处均已注明。带有实测数据的 GKE 运行是下一版手册规划的第一项内容，已列在[下一版将补充](#s-next-edition)。

读完本节，你能说出 GKE 安装器创建了什么、留下了哪些需要你自行运维的组件。你还能对照要求检查集群，并找出限制恢复速率的关键配额。

## “在 GKE 上”意味着什么 {#s-substrate-on-gke-what-on-gke-means}

GKE 上的 Agent Substrate 是一套开源软件，由你自行部署到自己的 GKE Standard 集群中{{docs}}。Google 提供的是安装器、文档与监控看板。Google 并不负责运维控制平面或数据库。两者都作为 pod 运行在你的集群里，由你的团队承担运维值班职责。

| Google 提供 | 由你运维 |
|---|---|
| 位于仓库 `ai-on-gke/substrate-gke` 的安装器 | `ate-api-server`、`ate-controller` 与 `ate-idp-server` |
| 官方文档与容量规划指引 | PostgreSQL 实例及其底层磁盘 |
| Cloud Monitoring 监控看板 | 数据平面以及每个节点上的 `atelet` |
| GKE 集群的 Kubernetes 控制平面 | 挂起、弹性伸缩、系统升级以及所有 `WorkerPool` |

该产品不收取额外费用。你只需按照常规 GKE 定价，为安装器创建的集群、磁盘、bucket 以及镜像仓库付费{{docs}}。

因此，如果有人声称 Substrate 是 Google Cloud 的全托管能力，这显然超出了官方文档的陈述范围。[当依赖组件宕机时](#s-when-a-dependency-is-down)中讨论的控制平面故障模式，在 GKE 上同样需要由你承担。

## 安装器创建了什么 {#s-substrate-on-gke-what-the-installer-creates}

安装器是一个运行在本地机器上的交互式程序。它依赖 `git`、Go、`make`、`kubectl`、`gcloud` CLI 以及 `gke-gcloud-auth-plugin`。它还需要带有 buildx 插件的 Docker，因为它要从源码构建 Substrate 镜像并推送到你的 GCP 项目。它无法在 Cloud Shell 中运行，因为那里的磁盘空间不足{{docs}}。

```figure
id: fig-7-3
kind: tree
title: GKE 安装器创建的资源
claim: 安装器在你的项目中创建云端资源，并在集群中安装与 ate-setup 在 kind 上相同的控制平面。
caption: 从上往下读。左列是 setup-gcp 工具创建的内容。右列是 ate-setup 工具安装的内容，全部由你自行运维。来源：Google Cloud 的 Agent Substrate on GKE 官方文档，以及 v1.0.0-gke.0 的安装器仓库。
```

安装器会提示输入镜像源、GCP 项目、集群、bucket 名称以及入站客户端列表。随后它运行两个工具。`setup-gcp` 负责创建云端资源。`ate-setup` 负责安装集群组件，它与[使用 ate-setup 安装](#s-install-with-ate-setup)在 kind 上使用的是同一个工具。

在安装过程中，有四个细节极易疏漏并浪费时间：

- **明确指定版本号。** 文档有一处称安装器会构建最新版本，后文段落又写着 v1.0.0。请输入标签 `v1.0.0`。
- **列出入站客户端身份。** 安装器会索取有权调用 router 的客户端 SPIFFE ID。在这样的集群上，Counter 示例的端口转发步骤无法生效，因为你的笔记本电脑不在被允许的客户端之列。
- **现有集群需要预留控制平面更新时间。** 安装器会启用 `podcertificaterequests` 与 `clustertrustbundles` API。官方文档指出该更新大约需要 10 分钟。
- **手动删除数据库磁盘。** 清理命令不会删除 PostgreSQL 的 500 GiB 磁盘。在手动删除之前，你需要持续为此磁盘付费。

## 运行环境要求 {#s-substrate-on-gke-requirements}

| 项目 | 要求 |
|---|---|
| 集群模式 | GKE Standard，不支持 Autopilot。 |
| 版本要求 | 控制平面与所有节点池版本为 1.37 或更高，不支持 Extended 发布通道。 |
| 集群特性 | Dataplane V2、Workload Identity Federation for GKE 以及托管的 OpenTelemetry。新创建的集群由安装器自动开启，现有集群必须已经在使用 Dataplane V2。 |
| Worker 节点 | 仅限 x86 架构，规格为 `c3-standard-4` 或更高，不支持 E2 机型。 |
| GKE Sandbox | 承载 worker 的节点池必须关闭 GKE Sandbox。 |
| microVM 类别 | 需支持嵌套虚拟化（nested virtualization），或选用 x86 裸金属机型。嵌套虚拟化仅能在创建节点池时设置。 |
| 加速卡 | actor 内部不支持 GPU，也不支持 TPU。 |
| 单节点运行超过约 800 个沙箱 | 需调高内核的 inotify 上限与邻居表（neighbour table）上限，安装器仅针对其新建的集群执行此优化。 |
| 操作账号权限 | 需具备七个 IAM 角色，涵盖 Service Usage Admin 到 Monitoring Editor。 |

有两行值得特别说明。关于 x86 的要求来自 GKE 官方文档。早期一篇 Google 博客曾提及 Arm 机器，该表述与官方文档冲突，我们以官方文档为准。在搭载 Apple 芯片的笔记本电脑上，上游发布的镜像可以在 arm64 上运行，但这并不能代表 GKE 的情况。

关于 GPU 的限制属于 Substrate 本身的局限，GKE 无法打破这一限制。详见[v1.0.0 的限制](#s-limits-at-v1-0-0)。

## 决定扩展规模的配额与上限 {#s-substrate-on-gke-the-quotas-and-limits-that-bound-your-scale}

官方文档给出了下列关键数字{{docs}}。后续规划的 GKE 实际测试将对它们进行验证。

| 限制项 | 数值 | 关注原因 |
|---|---|---|
| Security Token Service 令牌交换 | 项目默认每分钟 6,000 次请求 | 每个 actor 的快照都需要令牌，应按峰值每秒恢复次数的 60 倍进行规划。 |
| 单个 worker 上的 actor 数量 | 默认 1,000 个，对应 `--max-actors` 标志 | 当 CPU 或内存率先耗尽时，实际承载量会更低。 |
| PostgreSQL | 单实例 | 仅能通过垂直扩容机器配置来扩展。 |
| 节点引导磁盘 | 100 GiB，3,600 IOPS，每秒 290 MiB | 除非挂载其他磁盘，否则快照的节点副本使用此磁盘。 |
| 快照上传延迟，节点副本 | 5 分钟，30 分钟 | 默认值与我们在 kind 上实测的一致。 |

令牌配额极易被忽视。该配额由项目内所有使用 Workload Identity Federation 的工作负载共享。在每秒 200 次恢复的峰值下，仅 Substrate 一项就需要每分钟 12,000 次请求，达到了默认配额的两倍。再加上其他工作负载的峰值用量，在进行压力测试前必须提前申请提高配额。

microVM worker 池还存在一个特殊限制。microVM worker pod 会请求资源 `ate.dev/kvm`，而节点自动置备功能在节点数为零的池上无法识别该资源。因此这类池无法从零自动扩容。官方文档给出了三种保留就绪节点或就绪缓冲区的应对模式。

GKE 官方文档还明确指出，Substrate 不会自动挂起处于空闲状态的 actor。这与我们在 kind 上的实测一致：空闲 actor 保持 `ACTOR_STATE_RUNNING` 达 900 秒之久。

## 关键时间线 {#s-substrate-on-gke-the-dates}

| 日期 | 事件 |
|---|---|
| 2026-05-20 | Google 发布 Agent Substrate。 |
| 2026-09-11 | GKE 发布说明：开放评估与非生产环境使用，生产使用需加白名单。 |
| 2026-11-05 | Agent Substrate v1.0.0 发布。 |
| 2026-11-06 | GKE 安装器发布其唯一版本 v1.0.0-gke.0。 |
| 2026-11-09 | GKE 发布说明：面向 1.37 或更高版本的 GKE Standard 集群正式商用（GA）。 |

2026 年 9 月将 GKE 上的 Substrate 称为非生产特性的资料已经过时。Google 在 2026-11-05 发布的一篇博客提前四天提到了正式商用，应以发布说明记载的日期为准。

## 我们的实测对 GKE 说明了什么，又有哪些局限 {#s-substrate-on-gke-what-our-runs-say-about-gke-and-what-they-do-not}

GKE 上的控制平面与我们在 kind 上运行的属于同一套软件。我们的三项实测结论属于该软件本身的固有特性，因此在 GKE 上也成立。Substrate 不会自动挂起空闲 actor。快照只有在上传之后才具备持久性。PostgreSQL 位于每条请求的路径上。

但我们在耗时方面的测试数据不能直接套用。我们当时使用的对象存储位于集群内部，与节点共享磁盘。Cloud Storage bucket 是远端存储，在 GKE 上从对象存储恢复需要进行专门测量。在对外承诺任何指标之前，请先在自己的集群上运行[SuspendActor 与 ResumeActor](#s-suspendactor-and-resumeactor)中的恢复测试。

```takeaways
- 为控制平面与 PostgreSQL 安排值班运维人力，因为 Google 并不代管它们。
- 运行安装器前对照要求清单核对集群配置。
- 安装器提示输入版本时明确输入标签 `v1.0.0`。
- 将令牌交换配额提升至峰值每秒恢复次数的 60 倍，并叠加其他工作负载的开销。
- 资源清理后自行手动删除 PostgreSQL 磁盘。
- 使用你自己的 bucket，在自己的集群上实测恢复时间。
```

来源：Google Cloud documentation, read 2026-11-12: "About Agent Substrate on GKE", "Install Agent Substrate on GKE", "Plan and design Agent Substrate on GKE", "Plan an architecture for AI agent workloads on GKE", and the GKE release notes of 2026-09-11 and 2026-11-09; the repository ai-on-gke/substrate-gke at v1.0.0-gke.0 (README and install.sh); Google Cloud blog posts of 2026-05-20, 2026-09-15 and 2026-11-05; Agent Substrate v1.0.0 release notes; capture/lab/B-lifecycle/10-trace.tsv, capture/lab/M-mac-arm64/80-local.tsv.
