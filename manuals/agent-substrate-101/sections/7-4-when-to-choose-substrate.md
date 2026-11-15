# 何时选择 Substrate

> 当大量纯 CPU 的 agent 在大多数时间空闲且必须保留状态，同时你又能自行运维 Postgres 并调用挂起时，选择 Substrate。

你每天运行 400 个 agent 会话，每个会话一个 pod。大部分 pod 都在等待人类输入。随着会话数量增加，节点账单不断攀升，有人询问 Agent Substrate 是否能降低成本。真实的答案取决于有关你的 agent 和团队的五个事实。

读完本节，你能在 Substrate、单 agent 单 pod、单会话单沙箱以及托管沙箱之间做出抉择。你还能说出 Substrate 需要你付出的各项代价，以及支撑每项代价背后的具体数据。

本节需要首先说明一个局限。我们实测了 Substrate 与 kagent，并未实际运行其他备选方案。因此其他方案在此处的行为描述均来自它们各自的官方文档，我们未给出对应的实测耗时。

## Substrate 能为你带来什么 {#s-when-to-choose-substrate-what-substrate-gives-you}

**极少 worker pod 承载海量有状态 actor。** 处于挂起状态的 actor 不占用 worker 的 CPU 和内存，只消耗其快照占用的存储字节。在我们的 kagent 测试中，单个 worker pod 服务了集群中的所有会话，并一度同时运行了 16 个 actor。

**快照与恢复。** actor 可以在空闲期间保持其内存或文件状态，空闲后的首次请求会自动触发恢复。客户端不需要为此请求编写特殊代码，只需稍作等待。

**为每个 actor 提供出站策略与凭据注入。** 每个 actor 拥有独立的主机放行列表。网关直接把 API 密钥填入请求，密钥从不进入沙箱。单 agent 单 pod 的方案只能提供 NetworkPolicy 和挂载的 Secret，两者都不具备上述特性。

**请求路径无需 Kubernetes API 参与。** 在 kube-apiserver 停机 86 秒期间，发送给运行中 actor 的所有请求均得到正常服务。

## Substrate 需要你付出什么代价 {#s-when-to-choose-substrate-what-substrate-costs-you}

**Postgres 与 `ate-api-server` 位于每条请求路径上。** 两者中任何一个宕机，发送给 actor 的请求都会失败，即使该 actor 正在运行。[当依赖组件宕机时](#s-when-a-dependency-is-down)记录了详细的时间线。

**我们测得**在带有 16 vCPU 和 23 GB 内存的 x86 服务器客户机上，每秒发送一个请求进行测量。当 Postgres 宕机 61 秒时，从第 1 秒起发送给运行中 actor 的请求便全部失败。当 `ate-api-server` 宕机 60 秒时，从第 6 秒起请求开始失败。

**你需要自行负责挂起与扩缩容。** 在我们的测试中，Substrate 从未主动挂起过空闲 actor。在 900 秒等待期间采集的每个样本中，actor 始终保持 `ACTOR_STATE_RUNNING`。必须由你运行的外部程序调用 `SuspendActor`，且必须有机制在 worker 池满时补充 worker。在满载的 worker 池上，请求等待 5.06 秒后收到了 503 错误。

**恢复时间随内存体积增长。** 官方宣称的低于 500 ms 恢复时间并未指明 actor 的内存规模。在我们的测试机上，该指标仅在 200 MiB 左右成立。

**我们测得**在一台具备 24 vCPU 和 47 GB 内存的 x86 服务器客户机上，测量了恢复时间随 actor 所持内存的变化。从节点副本恢复时，10 次测量的中位数在 0 MiB 时为 0.22 秒，在 200 MiB 时为 0.47 秒，在 1000 MiB 时增至 2.16 秒。从对象存储恢复时，5 次测量的中位数在 200 MiB 时为 0.96 秒，在 1000 MiB 时增至 4.68 秒。

**快照不会立即成为持久快照。** 默认挂起后，快照在单个节点上保留 5 分钟才会上传。一旦丢失该节点副本，actor 会变为 `ACTOR_STATE_CRASHED`，直到你对其执行回退。上次上传快照之后的所有调用状态都会丢失。

**你需要自行负责节点故障后的恢复。** Substrate 不会自动把 actor 从故障节点迁移出来，也不会把 worker 池的 pod 自动调度回恢复后的节点。你的运维手册必须涵盖这些操作，而在故障期间执行错误的命令会使情况恶化。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上的双 worker 节点集群中，对 13 种节点停止场景各进行了一次测试。没有 actor 能够自发离开已停止的节点。利用停机前已存在的标签创建新 actor，在 3 次救援测试中首次请求均在 1.2 秒后获得应答。一次 `revert` 命令在 7.1 秒内解救了静默的 actor，而在其他情况下执行 `revert` 会使 actor 滞留在 `ACTOR_STATE_REVERTING`。节点中断超过 6 分钟后重新上线，7 次测试中该节点上均未再出现 worker 池 pod。[当依赖组件宕机时](#s-when-a-dependency-is-down)提供了完整运维手册。

单 agent 单 pod 的架构在形式上不承担这种代价。使用 Deployment 或 StatefulSet 时，Kubernetes 会在另一节点上拉起新 pod，内存状态随旧 pod 一同丢失。使用 Substrate 时，如果你预先打好标签或执行了同步挂起，并且运维人员严格按照手册操作，状态是可以存活的。

**不支持 GPU。** 在 v1.0.0 版本中，actor 无法使用 GPU。

**特权 worker 容器。** 在我们的 kagent 安装中，worker pod 以 root 用户运行，并拥有 `SYS_ADMIN` 与 `NET_ADMIN` capability。采用严格 Pod 安全策略的命名空间会拒绝此类 pod。

## 选型决策 {#s-when-to-choose-substrate-the-decision}

```figure
id: fig-7-4
kind: decision
title: 决定是否选用 Substrate 的五个问题
claim: 只有当五个问题的回答全部为肯定时才适合选择 Substrate，任一否定回答都指向更契合的简单方案。
caption: 从上往下读。每个问题下方的文字是支撑该判断的事实或实测依据。否定回答引向右侧列出的更简单方案。连续五个肯定回答最终指向 Agent Substrate。来源：capture/lab/summary/resume-x86.json、capture/lab/summary/dependency-loss-x86.json、capture/lab/summary/failures-x86.json、capture/lab/summary/kagent-turns-x86.json 以及各备选方案的官方文档。
```

1. **agent 是否仅依赖 CPU 运行？** 如果需要 GPU，Substrate 无法运行它。
2. **agent 是否大部分时间处于空闲？** 始终处于忙碌状态的 actor 会全天占用 worker 容量，无法带来资源节省。
3. **状态是否必须跨越空闲期持久保留？** 如果每次会话都可以从零启动，你并不需要快照功能。
4. **你是否具备运维 Postgres 的能力？** 这一考量还包括对象存储、控制平面以及特权 DaemonSet。
5. **是否有程序负责调用 `SuspendActor`？** 若缺少调用方，所有 actor 会一直运行直至撑满 worker 池。

## 更简单的替代选择 {#s-when-to-choose-substrate-the-simpler-choices}

| 行为特性 | Substrate | 单 agent 单 pod | 单会话单沙箱 | 托管沙箱 |
|---|---|---|---|---|
| 空闲 agent 的成本 | 仅快照占用的存储字节 | 其 pod 占用的 CPU 与内存 | pod 删除后无额外成本 | 对应云服务的账单价格 |
| 跨空闲期的状态保留 | 内存或文件 | pod 存活期间保留全部状态 | 卷（volume）上的持久文件 | 由托管服务决定 |
| 空闲后的首个请求 | 经历一次恢复（resume） | 零额外延迟 | 经历一次 pod 启动过程 | 由托管服务决定 |
| 请求路径上的依赖 | Postgres 与 `ate-api-server` | 无额外外部依赖 | 无额外外部依赖 | 托管服务本身 |
| 谁负责执行挂起 | 你自行负责，或依赖 harness | 无需挂起 | 你自行负责，或控制器处理 | 托管服务本身 |
| 凭据管理 | 在出站网关处动态注入 | 直接挂载进 pod 内部 | 直接挂载进 pod 内部 | 由托管服务决定 |
| GPU 支持 | 否 | 是 | 是 | 由托管服务决定 |

**单 agent 单 pod** 适用于绝大部分时间都在处理任务或需要 GPU 的 agent。它同样适用于需要完整 pod 声明及 sidecar 的 agent 架构。规模较小的集群是第三种适合的场景。在我们的 kind 安装中，尚未运行第一个 actor 就已经跑起了大约两打 pod，只有几十个 agent 并不划算。

**不带快照的单会话单沙箱** 适用于将会话状态保存在文件或沙箱外部的短会话。开源项目 `kubernetes-sigs/agent-sandbox` 采用了这种模式。它利用原生 Kubernetes 资源为每个沙箱创建一个 pod，并维护一个预热 pod 池。该项目中的暂停机制会直接删除 pod 但保留底层磁盘，进程内存随之释放。它支持 GPU pod 与完整的 pod 规格，而这两点 Substrate 均不支持。

**托管沙箱** 适合希望通过纯 API 交互、不愿运维底层集群的团队。你放弃了对控制平面的直接掌控，同时也无需承担 Postgres 的运维压力。Google 于 2026-10-22 发布了此类服务 Agent Compute Engine，截至 2026-11-12 该服务尚未开放公开使用。

还有两个开源项目与 Substrate 并存而非相互替代。NVIDIA OpenShell 通过内核级控制与出站策略检查限制单个 agent 能够接触的资源范围，其 README 未涉及内存快照能力。kagent 则是构建在 Substrate 之上的 harness，[Substrate 上的 kagent 1.0](#s-kagent-on-substrate)展示了它所补充的编排能力。Substrate 官方站点还提到了第二个基于其构建的系统，即 Google 的 Agent Executor。它将单个任务作为一个 actor 运行且不代发挂起命令，我们在 Substrate v1.0.0 上测试了其某个无模型的提交版本，具体测试见[Substrate 上的 Agent Executor](#s-agent-executor)。

## 针对不同场景的选型建议 {#s-when-to-choose-substrate-our-recommendation-for-each-situation}

| 你的实际业务场景 | 建议选择 | 决策原因 |
|---|---|---|
| 数百个聊天或编码 agent，仅用 CPU，全天大部分时间空闲 | 带有 harness（例如 kagent）的 Substrate | 在我们的测试中单 worker 服务了全部会话。每个轮次只需承担约 0.5 秒的恢复与挂起开销。 |
| 上述相同 agent 业务，但目前尚未引入 harness | 编写完负责调用挂起的外部程序后，选用 Substrate | 系统绝不会主动替你挂起空闲 actor。 |
| agent 占用 1 GiB 内存，且要求在空闲后 1 秒内给出应答 | 普通 pod，或仅文件快照 | 在 1000 MiB 内存下，从节点恢复耗时 2.16 秒，从对象存储恢复耗时 4.68 秒。 |
| 需要使用 GPU 的 agent | 单 agent 单 pod | v1.0.0 版本的 Substrate 不支持 GPU。 |
| agent 总规模少于几十个 | 单 agent 单 pod | 控制平面的体量甚至超过了业务本身。 |
| 无需保留状态的简短代码执行会话 | 单会话单沙箱 | 无需快照支持，因而无需引入对象存储。 |
| 缺乏运维 Postgres 与控制平面的工程团队 | 托管沙箱 | 两者均横亘在每条请求的关键路径上。 |
| 需要针对具体模型或工具细化规则 | Substrate 叠加第二道网关 | 出站策略最多只能管到主机、端口和单个请求头，详见[配合 Substrate 使用 agentgateway](#s-agentgateway)。 |
| 不能丢失最近 5 分钟状态的数据 | 搭配同步挂起的 Substrate | 默认挂起上传存在延迟，同步挂起能够确保快照即刻落盘持久化，详见[SuspendActor 与 ResumeActor](#s-suspendactor-and-resumeactor)。 |

最后一行涉及的是数据完整性，而非服务可用性。同步挂起能确保在调用返回前将快照推入对象存储。但它无法在节点宕机或被 cordon 后保证 actor 仍能正常服务。此外它保护的仅仅是挂起时刻 actor 所持有的状态。后续恢复并继续运行产生的工作仍暴露在风险中，直至下一次同步挂起执行，因此应根据业务可承受的数据丢失上限安排挂起频率。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）的双 worker 节点集群上，针对每种情况各进行了一次测试。通过 `--mode sync` 挂起的 actor 依然绑定在其原节点上。该节点被 cordon 时，actor 依然在该节点上恢复。当节点停止时，发往该 actor 的请求全部失败，并在停止命令发出 5 分 44 秒后转变为 `ACTOR_STATE_CRASHED`。在此期间，另一台节点始终拥有充裕的空闲 worker。

节点排空（drain）是唯一例外。执行 `kubectl drain` 后，3 个挂起的 actor 全部在下一次请求时成功在另一节点恢复，2 个运行中的 actor 则发生了崩溃。[放置机制](#s-placement)详细记录了这些案例，[当依赖组件宕机时](#s-when-a-dependency-is-down)提供了运维人员在此类故障中必须遵循的步骤。

跑完这些测试后，我们的看法是：v1.0.0 的 Substrate 对体量小、经常空闲、纯 CPU 的 actor 确实名副其实。配合 kagent，你甚至不需要自己编写挂起控制代码。但它本质上是一套自备独立数据库的第二控制平面。只有当你通过释放空闲算力节省的成本，足以覆盖运维该控制平面的精力时，才值得引入它。

```takeaways
- 在对比方案成本之前，先统计空闲 agent 的数量及其内存占用。
- 当 agent 需要 GPU 或全天持续忙碌时，选用单 agent 单 pod。
- 在部署 Substrate 之前，先确定由谁来负责调用 SuspendActor。
- 按照你实际 agent 的真实内存大小，实测其恢复时间。
- 提前规划好由谁运维 Postgres，因为每个请求都重度依赖它。
- 使用同步挂起确保快照持久化，并为节点故障准备好明确的运维应急预案。
- 把节点故障应急手册以及关键 actor 的标签机制，作为选用 Substrate 必须支付的运维成本。
```

来源：capture/lab/summary/node-drain-x86.json, capture/lab/summary/node-loss-x86.json, capture/lab/P-node-loss/10-a-quiet-revert.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/summary/resume-x86.json, capture/lab/summary/dependency-loss-x86.json, capture/lab/summary/failures-x86.json, capture/lab/summary/parking-x86.json, capture/lab/summary/kagent-turns-x86.json, capture/lab/summary/timers-x86.json, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/D-durability/30-local-loss.tsv, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/I-capacity/01-unplanned-full-pool-503.tsv, capture/lab/A-quickstart/60-state.log, capture/lab/K-kagent/inventory/worker-pod-spec.json, capture/lab/K-kagent/parallel/workers-during.txt, capture/lab/L-gaps/multinode/60-sticky-cordon.tsv, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv; Agent Substrate v1.0.0 documentation (architecture, API guide); Google Cloud documentation "Plan an architecture for AI agent workloads on GKE", read 2026-11-12; kubernetes-sigs/agent-sandbox v1.0.10 README and roadmap; NVIDIA OpenShell v0.1.8 README; Google Cloud blog posts on Agent Compute Engine, 2026-10-22 and 2026-10-23.
