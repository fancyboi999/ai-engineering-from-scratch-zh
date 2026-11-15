# Substrate 做什么，留给你什么

> Substrate 用少数 worker pod 运行大量有状态 actor，并在请求到达时按需恢复其中一个，而挂起调用、池大小与 GPU 工作则留给你自己处理。

你为每个 agent 会话运行一个 pod。大多数会话都在等人或等模型响应，而等待中的 pod 仍然占着 CPU 和内存。删掉 pod，会话就会丢失内存状态。留着 pod，你就要为空转的进程付费。

读完本节，你能说出 Agent Substrate 如何解决这个问题，并列出它留给你的工作。你还能找到证明我们八个判断的对应小节。

## 机制：actor、worker 与快照 {#s-what-substrate-does-and-what-it-leaves-to-you-the-mechanism-actors-workers-and-snapshots}

Substrate 把会话和运行它的 pod 分开。

**Actor：** 带有名字的有状态工作负载，例如 `my-counter-1`。actor 拥有内存、文件和根文件系统。它是 Postgres 里的一行记录，而不是 Kubernetes 对象。

**Worker：** 能在沙箱里运行 actor 的 pod。`WorkerPool` 是创建 worker pod 的 Kubernetes 对象，池中 worker 的数量固定。

**快照（snapshot）：** 单个 actor 保存下来的状态。Substrate 在 actor 挂起时写入它，在 actor 恢复时读取它。

**Atespace：** actor、它的模板和它的策略所属的命名分组。寻址 actor 时，总是同时使用它的 atespace 和名称。

挂起的 actor 不占用任何 worker。它只是一个快照加一行记录。请求到达时，Substrate 选一个有空位的 worker，在那里恢复快照，再把请求转过去。当调用方再次挂起这个 actor 时，Substrate 写入新快照并释放 worker。[图 1.1](#fig-1-1) 展示了我们示例池里的三个 worker pod，其中一个 actor 正在运行。

```figure
id: fig-1-1
kind: flow
title: Substrate 做什么，留给你什么
claim: 请求到达时 Substrate 把 actor 恢复到一个 worker 上，而再次挂起它的调用必须由你发出。
caption: 顶行是 counter 示例的 WorkerPool，虚线 pod 没有运行 actor。琥珀色箭头是恢复，由 Substrate 完成。粗青绿色箭头是挂起，由你调用。底部两个列表划分了分工，并附上我们运行中的秒数。来源：capture/lab/A-quickstart/60-state.log、capture/lab/B-lifecycle/13-workers.txt、capture/lab/B-lifecycle/10-trace.tsv、capture/lab/B-lifecycle/20-trace-ops.tsv。
```

因此只要同时运行的会话很少，三个 worker 的池就能容纳数百个会话。这就是它提供的全部价值。代价是恢复所需的时间，[第 3.3 节](#s-suspendactor-and-resumeactor)会按 actor 内存中保有的数据量来测量它。

## Substrate 标准化了什么 {#s-what-substrate-does-and-what-it-leaves-to-you-what-substrate-standardizes}

Substrate 给了你五样名称固定的东西。

- **一套 API。** `ate-api-server` 提供 `Control` gRPC 服务，管理 atespace、模板、actor、快照、worker 和策略。`kubectl ate` 插件是它的客户端 {{code}}。另一个服务 `WorkerService` 只供 `atelet` 使用。
- **一套生命周期。** actor 有七种状态，五个操作在状态间转换：创建、恢复、挂起、回退和删除。[第 3.2 节](#s-actor-states)会画出它们。
- **一种触达 actor 的方式。** 客户端携带 `ate-target-actor` 头和客户端证书，向 `atenet-router` 发请求。router 负责找到 worker {{docs}}。
- **两种沙箱类别。** actor 运行在 gVisor 下或 microVM 里，由 `WorkerPool` 决定用哪一种 {{docs}}。我们在同一台机器上运行了两种，[第 4.2 节](#s-sandbox-classes)对它们做了比较。
- **一条出站规则。** 在出站策略点名某个主机之前，actor 访问不了任何主机。[第 6.2 节](#s-egresspolicy-and-default-deny)展示了拒绝的过程。

项目声明，从 v1.0.0 起保持这套 API 兼容 {{docs}}。这个承诺只覆盖 API，不覆盖下面这些工作。

## 留给你的工作 {#s-what-substrate-does-and-what-it-leaves-to-you-what-it-leaves-to-you}

### 挂起调用 {#s-what-substrate-does-and-what-it-leaves-to-you-the-suspend-call}

Substrate 不会挂起空闲的 actor。它没有空闲计时器。只要收到过一个请求，actor 就会一直处于 `ACTOR_STATE_RUNNING` 并占着它的 worker，直到调用方发送 `SuspendActor`。

**我们测得**这一行为，在一台有 24 vCPU 和 47 GB 的 x86 服务器客户机上运行了一次。我们向 `my-counter-1` 发了五个请求，随后 900 秒不再发送任何请求。我们每 15 秒读一次状态，60 个样本全部是 `ACTOR_STATE_RUNNING`。

该项目的快速入门页说空闲的 actor 会自动挂起，同一项目的 API 指南则说不会 {{docs}}。我们的实测结果与 API 指南一致。如果你按快速入门页的那句话规划容量，你的池会被空闲 actor 占满。

驱动 actor 的程序负责这项工作。kagent 接下了它：在我们的 kagent 运行中，98 个轮次里有 98 个以挂起收尾。[第 7.1 节](#s-kagent-on-substrate)展示了这次运行。如果你自己写 harness，挂起调用就是你 harness 的一部分。

### 池大小 {#s-what-substrate-does-and-what-it-leaves-to-you-the-pool-size}

Substrate 没有自动伸缩器 {{code}}。`WorkerPool` 有 `spec.replicas` 字段和 scale 子资源，所以 Kubernetes 的自动伸缩器可以修改它，但 Substrate 自己不会改。当每个 worker 都满了，再请求一个新 actor 就会先等待，然后失败。

**我们测得**这种失败，在同一台客户机上，对一次运行中的四个 actor 发出了八个请求。每个请求的等待时间中位数是 5.06 秒（n=8），随后返回 503，文本为 `no worker has room for the actor`。[第 4.4 节](#s-request-parking)解释这段等待，[第 4.5 节](#s-sizing-a-pool)说明如何确定池的大小。

### GPU 工作 {#s-what-substrate-does-and-what-it-leaves-to-you-gpu-work}

Substrate v1.0.0 不给 actor 分配 GPU。API 指南把设备标为暂不支持 {{docs}}，所以本版没有 GPU 运行记录。请把模型推理留在推理服务系统上，让 actor 通过出站策略去调用它。

### 恢复 {#s-what-substrate-does-and-what-it-leaves-to-you-recovery}

Substrate 会把 actor 标记为崩溃，然后等你处理。崩溃的 actor 对每个请求都返回 503，直到调用方发送 `RevertActor`。还有一种情况根本不会被标记：进程退出后，actor 仍然停在 `ACTOR_STATE_RUNNING`。[第 3.5 节](#s-crashed-and-revertactor)展示了这两种情况。

**我们测得**进程退出的情况，在 24 vCPU、47 GB、嵌套 KVM 的 x86 服务器客户机上测试了两个 actor。退出之后，两个 actor 都显示 `ACTOR_STATE_RUNNING` 达 20 分钟，直到我们调用挂起。其中一个在这段时间收到 20 个请求，全部返回 503。每个死掉的 actor 在整段时间里都占着 worker 上的 CPU。

Substrate 也不会把 actor 从停止的节点上挪走。

**我们测得**这一点，在第二台 x86 服务器客户机（16 vCPU、23 GB）的双 worker 节点集群上，每种情况运行一次。一个已挂起的 actor，它的快照在对象存储里。从收到第一个请求算起，它在停止的节点上停在 `ACTOR_STATE_RESUMING` 达 5 分 33 秒。从发出停止命令算起，它在 5 分 44 秒后被标记为崩溃。一个运行中的 actor 在我们探测的 10 分钟里一直显示 `ACTOR_STATE_RUNNING`。另一个节点全程有空闲 worker，[第 4.3 节](#s-placement)列出了这四种情况。

**我们测得**另外 13 种情况，在同一台客户机（16 vCPU、23 GB）上各运行一次，目的是弄清运维人员能做什么。没有任何 actor 自己离开停止的节点。一次 `revert` 在 7.1 秒内释放了一个 actor，而且只对用 `--mode sync` 挂起且没有收到请求的 actor 有效。在其他情况下，故障期间的 `revert` 会让 actor 停在 `ACTOR_STATE_REVERTING`，直到节点恢复。用停止前做好的标签创建的新 actor，在创建命令之后 1.2 秒就响应了请求。因此节点丢失后的恢复由你负责，[第 8.2 节](#s-when-a-dependency-is-down)有运行手册。

Substrate 对 agent 也没有任何预设。它不选择模型，不运行工具，不保存对话。这些都属于 harness。

## 我们的八个判断 {#s-what-substrate-does-and-what-it-leaves-to-you-our-eight-positions}

每个判断都来自我们自己集群上的实测。这张表是本手册的导航图。

**我们测得**这张表里的每个数字，在两台 x86 服务器客户机上，除非对应小节另有说明，每项运行一次。最后一列的小节会写明机器和次数。两台客户机是不同的机器，不要拿一行的数字去对比另一行的数字。

| 判断 | 背后的数字 | 小节 |
|---|---|---|
| Substrate 不会挂起空闲的 actor | 900 秒内 60 个样本全部是 `RUNNING` | [3.3](#s-suspendactor-and-resumeactor)、[7.1](#s-kagent-on-substrate) |
| 挂起是异步的，它的快照不会立即持久 | 在一个节点上保持 `PENDING` 达 5 分钟 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives)、[3.5](#s-crashed-and-revertactor) |
| Postgres 和 `ate-api-server` 在每条请求路径上，Kubernetes API server 不在任何一条上 | 在 Envoy 上 kube-apiserver 宕机 86 秒期间，来自 pod 的 103 个请求中 103 个得到响应。在 agentgateway 上 87 秒内 106 个请求中 106 个得到响应 | [1.2](#s-one-request-from-client-to-actor)、[8.2](#s-when-a-dependency-is-down) |
| 恢复时间随 actor 内存中保有的数据量增长 | 0 MiB 时 0.22 秒，1000 MiB 随机字节时 2.16 秒，500 MiB 零字节时 0.23 秒 | [3.3](#s-suspendactor-and-resumeactor) |
| agentgateway 是 Substrate 的数据平面选项，并且它会认证入站客户端 | 空闲时 38 MB 对 91 MB | [6.6](#s-the-dataplane-choice)、[7.2](#s-agentgateway) |
| 出站策略允许主机和端口，而删除一条规则不会关闭已打开的连接 | 规则删除 20 秒后，已打开的透传连接上第二个请求仍然通过。挂起在 1.3 到 2.2 秒内关闭了已打开的连接 | [6.2](#s-egresspolicy-and-default-deny) 讲策略，[6.6](#s-the-dataplane-choice) 讲已打开的连接 |
| 崩溃的 actor 不一定会被标记为崩溃 | 进程退出后保持 `RUNNING` 达 20 分钟，81 个样本全部如此 | [3.5](#s-crashed-and-revertactor) |
| 从发布镜像安装 | 第二台客户机（16 vCPU、23 GB）上 162 秒。源码构建在第一台客户机（24 vCPU、47 GB）上用了 266 秒，此前有一个步骤失败过。两台机器不同，因此这些秒数只供参考。 | [2.1](#s-install-with-ate-setup) |

请把这些判断当作一份清单，到你自己的集群上逐项检查。你的秒数会不同。状态、错误文本和事件顺序不应该不同。

## 项目网站怎么说，我们测得什么 {#s-what-substrate-does-and-what-it-leaves-to-you-what-the-project-site-says-and-what-we-measured}

项目网站 ate.dev 随发布到达 1.0 版。我们在 2026-11-12 阅读了它。它的文档页面与发布标签用同一批文件构建，我们没有发现内容差异 {{docs}}。它的首页给出一些简短的陈述，有些带数字，但没有一条附带前提条件。下表把每条陈述和我们的实测结果并排放在一起。

**我们测得**这张表里的每个结果，在 x86 服务器客户机上，除非对应小节另有说明，每项运行一次。最后一列的小节会写明机器和次数。

| 网站说 | 我们的结果 | 小节 |
|---|---|---|
| 空闲 agent 会挂起 | 未复现。空闲 actor 在 900 秒内一直是 `RUNNING`。架构页也说明由调用方请求挂起。 | [3.3](#s-suspendactor-and-resumeactor)、[9.1](#s-an-idle-suspender) |
| actor 在 `500ms` 内恢复 | 对单次恢复和同时 10 次恢复均成立，条件是在 gVisor 上、从节点恢复、数据量在约 200 MiB 以内。1,000 MiB 时为 2.16 秒。从对象存储恢复 200 MiB 为 0.96 秒。在一个节点上同时恢复 50 次，中位数为 1.2 到 1.3 秒，同时 300 次为 7.3 到 7.4 秒。 | [3.3](#s-suspendactor-and-resumeactor)、[4.2](#s-sandbox-classes)、[4.5](#s-sizing-a-pool) |
| actor 在任意就绪的 worker 上恢复 | 对停止的节点未复现。5 次恢复中 5 次留在持有快照的节点上。17 种情况里，没有任何 actor 自己离开停止的节点。在恰当时刻的一次 `revert` 在 7.1 秒内释放了一个安静的 actor。排空节点之后，3 个已挂起的 actor 中 3 个在另一个节点上恢复了。 | [4.3](#s-placement)、[8.2](#s-when-a-dependency-is-down) |
| Kubernetes API 不在请求路径上 | 在两种数据平面上都得到确认。kube-apiserver 宕机期间，来自 pod 的请求在 Envoy 上 86 秒内 103 个中 103 个得到响应，在 agentgateway 上 87 秒内 106 个中 106 个得到响应。 | [8.2](#s-when-a-dependency-is-down) |
| Kubernetes 负责恢复 | 对节点和 pod 成立。停止节点上的 actor 需要运维人员介入：打标签、在恰当时刻 revert，或让节点恢复上线。驱逐之后，回归的节点一直是空的，直到我们手动挪动 pod。 | [8.2](#s-when-a-dependency-is-down)、[3.5](#s-crashed-and-revertactor) |
| 内存和文件在挂起后保留 | 在内存保真度下得到确认。在另外两种保真度下，进程会重新启动。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| 没有认证就没有入站访问 | 两种数据平面上的两个 actor 端口均得到确认。agentgateway router 的统计端口无需凭据即响应了 `/metrics`。 | [6.1](#s-the-router-and-ingress) |
| 没有策略就没有出站访问 | 得到确认。域名得到 `NXDOMAIN`，IP 得到连接重置或 403。 | [6.2](#s-egresspolicy-and-default-deny) |
| actor 不持有密钥 | 对占位符替换得到确认。会回显请求头的上游会把密钥传回给 actor。 | [6.5](#s-credential-injection) |
| 每秒 `500+` 次挂起和恢复激活 | 在单节点上未复现。一个 24 vCPU 的节点在两次运行中，并发 50 到 300 次时，每秒完成 32 到 39 次恢复。瓶颈不在控制平面，我们的分析把限制定位在节点上的 gVisor 恢复。多节点上的运行计划在下一版进行，因此对更大的集群尚无结论。 | [4.5](#s-sizing-a-pool) |
| 容器运行时 `10×` 的密度 | 下一版计划进行。目前：挂起的 actor 不占 worker，占 12.9 MB 节点磁盘，空闲 worker 占 16.7 MB 内存。我们未与其他容器运行时做比较。 | [4.5](#s-sizing-a-pool) |
| 数百万个 agent | 下一版计划在多节点上进行。目前：一个节点上有 10,750 个 actor 行时，数据库为 20 MB，单次恢复仍是同样的 0.36 秒。 | [4.5](#s-sizing-a-pool) |
| 运行之间会清除 worker 状态 | 下一版计划进行。安全页把这项保证列为进行中。 | 无对应小节 |
| JWT 可以与每个云提供方联合 | 我们解码了一个令牌。联合认证计划在下一版进行。 | [5.3](#s-actor-jwts) |

三条陈述与我们的运行完全一致。四条在网站没有说明的条件下成立。两条与我们看到的不符。一条在单节点上未复现，四条计划在下一版进行。不符的那两条是要重点规划的：你必须自己发送挂起，节点停止时你必须出手处理。

## 什么时候它是错误的工具 {#s-what-substrate-does-and-what-it-leaves-to-you-when-this-is-the-wrong-tool}

Substrate 适合保持状态、大部分时间空闲的会话。它不适合全天运行的 agent，因为那样的 actor 永远不会释放它的 worker。它也不适合沙箱里需要 GPU 的工作负载。[第 7.4 节](#s-when-to-choose-substrate)比较了各种选择，[第 8.5 节](#s-limits-at-v1-0-0)列出了 v1.0.0 的限制。

```takeaways
- 先数清有多少会话同时运行，再去确定任何规模。
- 把 SuspendActor 调用放进你的 harness，或使用会发送它的 harness。
- 自己规划 WorkerPool 的大小，因为 Substrate 不会改它。
- 在 v1.0.0 下，把 GPU 推理留在 actor 之外。
- 依赖每个判断之前，先在你自己的集群上逐一核验这八个判断。
```

来源：capture/lab/summary/scale-x86.json, capture/lab/summary/bursts-one-node-x86.json, capture/lab/summary/restore-limit-x86.json, capture/lab/summary/node-drain-x86.json, capture/lab/summary/node-loss-x86.json, capture/lab/summary/dependency-loss-agw-x86.json, capture/lab/summary/network-x86.json, capture/lab/P-node-loss/10-a-quiet-revert.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/Q-network/m-router-ports/agentgateway/11-port-probes-supplement.txt, capture/lab/summary/failures-x86.json, capture/lab/summary/validation-memory-x86.json, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/B-lifecycle/13-workers.txt, capture/lab/A-quickstart/60-state.log, capture/lab/I-capacity/01-unplanned-full-pool-503.tsv, capture/lab/summary/parking-x86.json, capture/lab/summary/kagent-turns-x86.json, capture/lab/summary/resume-x86.json, capture/lab/summary/install-steps.json, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/J-container-death/10-trace.tsv, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/summary/microvm-x86.json; api/ateapi/v1/ateapi.proto, docs/reference/api-guide.md, docs/get-started/quickstart.md, docs/reference/sandbox-classes.md, docs/concepts/architecture.md, docs/get-started/overview.md, docs/security/security.md, docs/guides/benchmarking.md, site/layouts/_shortcodes/home.html, and README.md at v1.0.0; the project site ate.dev, read 2026-11-12.
