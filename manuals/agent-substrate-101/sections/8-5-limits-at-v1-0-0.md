# v1.0.0 的局限

> 在 v1.0.0 中，Substrate 按请求运行、挂起和恢复 actor，而挂起时机、池大小、故障切换和密钥轮换都留给你自己。

你在规划上线时，会写下平台将替你做的事：停掉空闲会话，在负载上升时自动扩容，扛住单个 pod 故障。对 Agent Substrate v1.0.0 来说，这三条都不成立，而且发布说明没有在一处讲清楚。

读完本节，你能列出 Substrate 在 v1.0.0 中不做的事。你还能说清，我们的哪些论断有实测运行支撑，哪些运行留到下一版。

## Substrate 留给你的事 {#s-limits-at-v1-0-0-what-substrate-leaves-to-you}

[图 8.5](#fig-8-5) 把平台团队期望的每项工作，与 v1.0.0 中实际承担它的一方逐行对照。

```figure
id: fig-8-5
kind: comparison
title: v1.0.0 中每项工作由谁承担
claim: Substrate 执行你请求的生命周期操作，而何时发出请求必须由你的 harness 或平台团队决定。
caption: 每行从左往右读。左列是 Substrate 做的事，右列是你或你的 harness 必须补上的事。来源：v1.0.0 的代码、capture/lab/B-lifecycle/10-trace.tsv、capture/lab/J-container-death/10-trace.tsv。
```

### 没有空闲挂起 {#s-limits-at-v1-0-0-no-idle-suspend}

Substrate 中没有任何机制会因为 actor 没有请求而挂起它。**代码**里，`ate-api-server`、`atelet` 和两种 worker 都没有空闲计时器。worker API 有一个让 worker 请求挂起的方法 `RequestActorSuspend`。`atelet` 会转发这个调用，仓库里也有对应的客户端库。但 v1.0.0 中没有任何 worker 使用这个库，所以没有任何组件发出这个调用。

**我们测得**，在一台 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上，一个 actor 连续 900 秒没有收到请求，60 次采样中有 60 次读到 RUNNING。运行中的 actor 在整段时间里，都在 worker 上占用其完整的 CPU 和内存上限。

必须由 harness 调用 `SuspendActor`。kagent 在每一轮之后都会调用，我们的运行中 98 轮全部如此，见[第 7.1 节](#s-kagent-on-substrate)。如果你自己写 harness，挂起调用是第一件要做的事。

### 没有自动扩缩容，也没有超卖 {#s-limits-at-v1-0-0-no-autoscaler-and-no-overcommit}

`WorkerPool` 的 `replicas` 数是固定的，安装过程不会改动它。`WorkerPool` 类型有 scale 子资源，所以外部自动扩缩器可以改这个数。带自动扩缩器的运行已列入下一版计划。CPU 和内存使用率不是好的扩缩信号，因为 actor 运行期间不管有没有干活，都会占住它的上限。

Substrate 还按每个运行中 actor 声明的完整上限记账。公开 issue 里有一个按低于上限记账的提案，维护者把它推迟到了发布之后。

**我们测得**这一效应，是在 kagent 运行中，用的是第二台 x86 服务器客户机（16 vCPU、31 GB）。一次运行同时启动了 24 轮。单个 worker 报告 16,000 millicore，每个 actor 占 1,000。worker 在 16 个运行中的 actor 处停住，其余 8 轮在等待。

池满时，请求最多等 5 秒，然后得到 503。池的计算方法见[第 4.5 节](#s-sizing-a-pool)。

### 没有 GPU {#s-limits-at-v1-0-0-no-gpu}

v1.0.0 的 `ActorTemplate` 只能声明两种资源：`cpuMillicores` 和 `memoryBytes`。API 里没有 GPU 或其他设备的字段，所以我们没有做 GPU 测试。

### 单副本组件 {#s-limits-at-v1-0-0-single-replica-components}

**代码**在安装清单里设置了这些副本数。

| 组件 | 副本数 | 唯一的 pod 不在时，什么会停 |
|---|---|---|
| `ate-api-server` | 2 | 只要还剩一个副本，就没有影响 |
| `ate-idp-server` | 2 | 只要还剩一个副本，就没有影响 |
| `atenet-router` | 1 | 发往所有 actor 的所有请求 |
| `atenet-egress` | 1 | actor 发起的每个新出站连接 |
| `ate-controller` | 1 | 对 worker 池的变更 |
| `podcertificate-controller` | 1 | 新证书和证书续期 |
| 内置 Postgres | 1 | 所有请求，见[第 8.2 节](#s-when-a-dependency-is-down)的实测 |

右列是我们对请求路径的解读，Postgres 一行除外，那一行我们实际跑过。router 把暂存的请求放在内存里，而优雅关闭不会丢掉它们。收到停止信号后，router 会保留这些暂存的请求，直到每个请求用完完整预算并得到正常响应 {{docs}}。标志 `--drain-timeout` 设定这个上限，它的默认值比暂存预算更长 {{code}}。只有崩溃、强制杀死，或排空超过 `--drain-timeout`，才会丢掉暂存的请求。

我们重启过一次 router，作为[第 8.2 节](#s-when-a-dependency-is-down)的修复手段。重启对暂存请求的影响，以及出站网关的重启，是留给下一版的运行。

### 崩溃检测有缺口 {#s-limits-at-v1-0-0-crash-detection-has-a-gap}

actor 的沙箱死亡，或内核因内存不足杀掉它时，Substrate 会把它标为崩溃。但沙箱仍在运行、里面的进程已经退出时，Substrate 发现不了。[第 8.3 节](#s-symptom-cause-fix)展示了这样的 actor。公开 issue 里有一个针对这种检测的设计，尚未落地。

**我们测得**两个这样的 actor，在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上。退出之后 20 分 36 秒里，两者都读到 RUNNING，分别是 81 次和 80 次采样。发往其中一个的 20 个请求全部返回 503。在整段时间里，每个 actor 都占着所在 worker 的 1,000 millicore。第一次挂起调用失败，并把 actor 标为崩溃。更长时间的观察和 worker 重启，已列入下一版的计划。

它同样不会标记所在节点已停止的运行中 actor。在一个有两个 worker 节点的集群上，这样的 actor 在我们 10 分钟的探测里一直读到 RUNNING。150 个请求每一个都得到 503。

### actor 不会自己离开已死的节点 {#s-limits-at-v1-0-0-an-actor-does-not-leave-a-dead-node-by-itself}

挂起的 actor 绑定在它上次挂起所在的节点上，节点停止时，Substrate v1.0.0 不会释放它。

**我们测得**这一点，是在第二台 x86 服务器客户机（16 vCPU、23 GB）上，两个 worker 节点，四种情形各一个 actor。其中一个 actor 在对象存储里有完整快照。从它的第一个请求算起，它在已停止的节点上停在 RESUMING 状态 5 分 33 秒。从停止命令算起，5 分 44 秒后它变成崩溃。另一个节点有两个空闲 worker。故障期间的 `revert`，在三个 actor 上的 4 次尝试里全部失败，或没有持久效果。

停止命令之后 43 到 51 秒，已停止节点上的 worker 仍被列为 active。这段时间里，新的恢复可能被送到已死的节点。5 分钟后 Kubernetes 把 worker pod 移到了另一个节点，之后没有再移回来。时间线见[第 4.3 节](#s-placement)。

**我们测得**另外 13 种节点停止的情形，用的是第二台 x86 服务器客户机（16 vCPU、23 GB），每种一次，计时器都用默认值。没有任何一种情形里，actor 自己离开了已停止的节点。只有一种情形下，一次 `revert` 释放了 actor：用 `--mode sync` 挂起，停止之后没有请求，worker 已被标为不可用。这次 revert 用了 7.1 秒。其他所有情形里，`revert` 都让 actor 停在 REVERTING，直到节点恢复。在停止之前就存在的标签上新建 actor，首个请求在 1.2 秒后得到响应，3 次救援全部如此。

所以，节点丢失后的恢复要你自己搭。Substrate 不会迁移 actor，节点恢复后也不会把池里的 pod 移回去。运行手册见[第 8.2 节](#s-when-a-dependency-is-down)。

### router 处的访问控制很粗 {#s-limits-at-v1-0-0-access-is-coarse-at-the-router}

入站允许列表里放的是客户端身份，列表中的每个客户端都能访问每个 atespace 里的每个 actor。各 atespace 的访问策略管的是 API 调用，见[第 5.2 节](#s-access-policies)。在 v1.0.0 中，它们不管经由 router 的请求。

### 手动轮换密钥 {#s-limits-at-v1-0-0-manual-key-rotation}

给 actor JWT 签名的密钥放在一个由运维人员编辑的池里。CLI 有 `kubectl ate admin add-jwt-key`、`activate-jwt-key` 和 `remove-jwt-key`，文档给出了它们之间要等待的时间。没有任何组件按计划轮换密钥。令牌的内容见[第 5.3 节](#s-actor-jwts)。我们的安装里只有一个密钥，解码后的令牌也指向它。密钥轮换留待下一版实测。

### 挂起不会等待请求 {#s-limits-at-v1-0-0-a-suspend-does-not-wait-for-requests}

`SuspendActor` 会立即停掉沙箱。此刻还开着的请求会得到 503，而挂起调用仍然报告成功。两种挂起模式下我们都看到了这一点，见[第 3.3 节](#s-suspendactor-and-resumeactor)。发起挂起的一方必须知道 actor 已经空闲。

### 预览功能默认关闭 {#s-limits-at-v1-0-0-preview-features-are-off}

有三个功能藏在服务端标志和客户端标志之后，三个默认都是关闭的。

| 预览名称 | 它增加了什么 |
|---|---|
| `ExternalVolumes` | actor 挂载的 CSI 卷，快照不包含这些卷 |
| `GoldenEgressPolicy` | 为构建黄金快照的 actor 设置的出站策略 |
| `PerTemplateSnapshotLocation` | 每个模板各自的快照位置，取代整个集群共用的一个位置 |

要使用其中一个，需用 `--preview` 加上它的名称启动每个组件，并给 `kubectl ate` 也传 `--preview`。没有客户端标志的请求，行为就像该功能关闭一样。我们用一个带 `goldenEgressPolicy` 字段的模板，试了全部四种组合。

| 服务端 `--preview` | `kubectl ate --preview` | `create actor-template` 的结果 |
|---|---|---|
| 空 | 否 | `InvalidArgument desc = actor_template.golden_egress_policy: Forbidden` |
| 空 | 是 | 同样的错误 |
| `GoldenEgressPolicy` | 否 | 同样的错误 |
| `GoldenEgressPolicy` | 是 | 被接受，黄金标签在 30 秒内就绪 |

```listing
title: 两个开关缺一个时的错误
source: capture/lab/V-validation/10-preview-feature/10-preview.tsv
lang: text
note: 追踪记录中的一行：服务端标志已开，客户端标志缺失。
---
2026-11-12T13:06:36.842Z	on	no-flag	Error: failed to create actor template: rpc error: code = InvalidArgument desc = actor_template.golden_egress_policy: Forbidden 
```

每种组合我们都在 x86 服务器客户机上跑了一次。错误信息没有指出预览功能或标志的名称，所以你必须自己知道这个字段属于预览字段。模板建好之后，`kubectl ate get` 不带客户端标志也能读到它。

我们的测试有两点局限。我们只在 `ate-api-server` 上设了标志，方法是编辑它的 Deployment，而文档给出的方式是通过 `ate-setup` 在每个组件上设置。验证黄金 actor 的出站规则是否生效，已列入下一版计划。其余所有实验都在 `--preview=` 为空的条件下运行，所以本手册没有描述这三个功能的实际使用。

### 会影响到你的小局限 {#s-limits-at-v1-0-0-smaller-limits-that-will-reach-you}

- 已打开的响应或透传连接，比它的出站规则活得更久。删除规则后，请求会在 9 秒内停止，复用的连接也一样。只有挂起能切断其余连接，见[第 6.6 节](#s-the-dataplane-choice)。
- 在 agentgateway 上，改过的 Secret 最长要 5 分钟才会作用到请求上。我们在那里测得 100.6 到 280.5 秒，在 Envoy 上是 1.0 到 1.6 秒。运行记录见[第 6.5 节](#s-credential-injection)。
- 出站网关只信任公共根证书。使用私有 CA 证书的主机会返回 503，直到我们替换了代理容器里的根证书文件。安装器会撤销这个补丁。详见[第 6.4 节](#s-tls-interception)。
- 在 agentgateway 上，router 的统计端口 15020 无需凭据就会响应 `/metrics`，而且每次运行安装器之后，出站网关都以 `debug` 级别记日志。两者分别见[第 6.1 节](#s-the-router-and-ingress)和[第 6.6 节](#s-the-dataplane-choice)。
- `kubectl ate delete tag` 会接受模板的黄金标签。之后模板列出一个已不存在的标签，`create actor` 会以 `Tag not found` 失败。这个错误见[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)。
- 无论 CPU 上限设多少，actor 看到的都是 2 个 CPU，而且该上限是硬上限。测量见[第 4.1 节](#s-workerpool)。
- 名称就是身份。文档告诉你，永远不要复用已删除 atespace 的名称。曾经对旧 atespace 放行的请求，可能适用于新的那个。
- Postgres 是唯一的存储。维护者在发布前拒绝了存储插件。
- API 对持久目录没有大小限制，所以一个 actor 可能写满节点磁盘。这来自一个未关闭的 issue，针对它的运行已列入下一版计划。
- gVisor 类别接受每个容器的上限，但只强制执行 actor 的上限。

**我们的判断：** 这些局限没有一条让 v1.0.0 不可用。合在一起，它们说明 Substrate 只是平台的一层。要为四件事预留工程时间：会挂起的 harness、读取空闲 worker 槽位的自动扩缩器、带故障切换的数据库，以及探测死进程的探针。[第 7.4 节](#s-when-to-choose-substrate)会把这笔成本与其他方案对比。

## 下一版将补充 {#s-next-edition}

本版在我们自己机器上的 kind 集群里测量了 Substrate。下一版会加入下面这些运行。在此之前，把每一项都当作未测量。

这里的大多数数字来自只有一个 kind 节点的集群，另有一个集群有两个 worker 节点。每个集群只运行两种数据平面中的一种。对象存储在集群内，只有两个实验例外：一次在同一台客户机上的集群外，一次在第二台客户机上。

| 领域 | 计划中的运行 |
|---|---|
| 云 | 先做 GKE，再做其他托管 Kubernetes 服务 |
| 存储 | Google Cloud Storage、Amazon S3、到 bucket 带 100 ms 延迟的真实链路、两台客户机之间路径增加 100 ms 延迟下多轮 1,000 MiB 测试、托管 Postgres、带丢包的 Postgres 故障、连接池、任一存储的恢复。还有一个运行中的 actor 在 Postgres 故障后停在 504 的原因：我们只见过一次，还没有找到原因 |
| 规模 | 单个集群里超过 10,750 个 actor 行、超过 450 个各有独立快照的 actor、超过 300 个同时恢复、单个节点上超过 300 个 worker、跨多个节点的突发、对快照只在 bucket 里的 actor 的突发、gVisor 恢复内部究竟是什么把每秒恢复数限制在约 37 次、更多 `ate-api-server` 副本配合更高的 Postgres 连接上限、同时 200 和 300 的第三次运行、超过 24 个并行轮次、超过两个 worker 节点、跨节点超过 20 个 actor，以及官网上关于百万 agent 和 10 倍密度的宣称 |
| 沙箱 | arm64 上的 microVM 类别、搭配 agentgateway、从对象存储恢复、超过 500 MiB，以及跨 CPU 型号。还有带 init 系统的镜像、非 root 镜像、大型根文件系统 |
| Agent | 托管模型、GPU 上的模型、规模足以在 kagent 背后承担真实 agent 工作的模型、模型网关后面的任何真实模型、设定了上界时失控的 kagent 轮次、ModelConfig 的 `maxCompletionTokens` 字段、经模型网关的流式模型回复、模型网关处的客户端认证、codex 和 claude 这两种 harness、经出站网关的 MCP 服务器 |
| 生命周期 | 保留 actor 的 v0.6.0 升级、两个受支持版本之间的升级、跨 schema 变更的回滚、多节点或使用 microVM 类别时的升级、升级步骤的第三次运行、池上带 PodDisruptionBudget 的排空、运行 `ate-system` 的节点的排空、排空后最初 20 秒内的 revert、已删除黄金标签的恢复、在这台客户机上针对启动缓慢的应用测试较低两档保真度的恢复 |
| 网络 | 把挂起当作 `tlsPassthrough` 连接的切断手段、被拦截的握手中耗时 0.6 秒的那一步、`atenet-router` 的日志级别、把重启 `atenet-egress` 当作刷新凭据的手段、agentgateway 统计端口上每个指标标签的内容、Envoy 容器的 9902 端口 |
| 上限 | 负载下的内存上限、一个 worker 上多个繁忙 actor 时的 CPU 上限、池上的外部自动扩缩器、写满节点磁盘的持久目录 |
| 身份 | 用公开密钥校验 actor JWT 的签名、密钥轮换、与第二个签发方或云提供方的联邦、给客户端用的第二个令牌签发方 |
| 快照 | 为什么 Python actor 在对象存储里的副本只有节点副本的一半，而随机字节的两份一样大 |
| 故障 | 死进程停在 `RUNNING` 超过 20 分钟或跨过 worker 重启、多节点上的三类故障、故障期间的出站、router 重启期间暂存的请求、出站网关重启、节点存活但不可达、节点断电或断网、microVM 类别或 agentgateway 上的节点丢失、节点按 CPU 或 actor 数量占满、在有恢复请求和空闲 worker 的条件下重测 Kubernetes API 故障、第三个节点上有备用 worker 的池、Kubernetes 的其他节点计时器。还有我们见过但没找到原因的两件事：一个突发请求 90 秒内没有响应，以及数据库故障后停在 `ACTOR_STATE_RESUMING` 的 actor |
| Agent Executor | 任务中的托管模型或大模型、配上能完成其工作的模型的示例 agent、任务中的节点丢失、大型或私有的 clone、由镜像以命令方式启动的 MCP 服务器、列有服务器的 MCP registry、集群外的 MCP 服务器、它所指定的 Substrate 提交上的 v0.3.1 发布 |
| Apple silicon | 超过 200 MiB 的 actor、从对象存储恢复 |
| 预览 | 上游 Substrate 上的 `ExternalVolumes` 和 `PerTemplateSnapshotLocation`、每个组件上都设标志，以及黄金出站策略的行为 |

在此之前，凡是陈述这些领域事实的小节，都取自对应标签处的代码或文档。正文会写明这一点。

```takeaways
- 先把挂起调用做进你的 harness，因为 Substrate 从不挂起空闲的 actor。
- 按空闲 worker 槽位扩缩 `WorkerPool`，不要按 CPU 使用率。
- 依赖集群之前，先运行多个 router 副本并测试它。
- 留意 `upstream connect error` 的 503，用它发现死进程或死节点。
- 把节点停止当作故障来规划，因为没有任何 actor 自己离开过已死的节点。
- 照着第 8.2 节写你自己的节点丢失运行手册，并为必须迁移的 actor 保留标签。
- 保持预览功能关闭，除非你接受本手册只验证过如何开启它们。
- 只挂起空闲的 actor，因为挂起会切断打开的请求。
- 把 GKE 和云 bucket 的说法当作文档说明，把我们的升级结果当作候选版本上的两次运行。
```

来源： capture/lab/summary/upgrade-x86.json, capture/lab/summary/scale-x86.json, capture/lab/summary/bursts-one-node-x86.json, capture/lab/summary/restore-limit-x86.json, capture/lab/summary/object-store-x86.json, capture/lab/summary/node-drain-x86.json, api/ateapi/v1/ateapi.proto (Resources, RequestActorSuspend, AccessPolicy), internal/preview/preview.go, api/infra/k8s/ate/v1/workerpool_types.go (replicas and the scale subresource), manifests/ate-install/ate-api-server.yaml, ate-idp-server.yaml, atenet-router.yaml, atenet-egress.yaml, ate-controller.yaml, pod-certificate-controller.yaml and postgres/postgres.yaml (replica counts), cmd/kubectl-ate/internal/cmd/admin.go, cmd/ate-setup/commands.md (the ingress allowlist) at v1.0.0; docs/guides/actor-jwt-key-rotation.md, docs/dev/preview-gates.md, docs/reference/api-guide.md and docs/reference/sandbox-classes.md at v1.0.0; issues #3775 and #2972 (dead process detection), #3441 (overcommit), #3589 (ingress authorization), #3203 (storage plugins), #3602 (durable directory size), #3347 (name reuse), #3285 (open connections); capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/75-stop-after-upload-revert.tsv, capture/lab/L-gaps/multinode/80-stop-before-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/96-controller-events.log, capture/lab/L-gaps/multinode/85-node-return.tsv, capture/lab/summary/node-loss-x86.json, capture/lab/P-node-loss/10-a-quiet-revert.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/P-node-loss/96-golden-tag-deleted.txt, capture/lab/summary/rotation-x86.json, capture/lab/summary/network-x86.json, capture/lab/summary/cpu-limit-x86.json, capture/lab/summary/microvm-x86.json, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/J-container-death/10-trace.tsv, capture/lab/K-kagent/parallel/, capture/lab/K-kagent/logs/actor-state-changes.tsv, capture/lab/C-resume-vs-size/31-atelet-args-patched.txt, capture/lab/I-capacity/17-router-args.txt, capture/lab/summary/failures-x86.json, capture/lab/summary/kagent-turns-x86.json, capture/lab/V-validation/10-preview-feature/10-preview.tsv, capture/lab/V-validation/10-preview-feature/tmpl-gep.yaml, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/V-validation/11-process-exit-long-watch/11-workers-end.txt, capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv, capture/lab/V-validation/09-actor-jwt/16-jwks-key-ids.json, capture/lab/V-validation/03-parallel-resume/24-summary.tsv., capture/lab/summary/remote-store-x86.json, capture/lab/summary/remote-postgres-x86.json
