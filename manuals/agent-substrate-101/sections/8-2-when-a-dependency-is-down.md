# 依赖宕机时会怎样

> 发往运行中 actor 的请求依赖 Postgres 和 `ate-api-server`，却从不需要 Kubernetes API server，而且每种依赖中断都有各自对应的报错文本。

所有 agent 在同一分钟开始失败。worker pod 处于健康状态，actor 一刻之前还在正常运行。你有三个嫌疑对象：数据库、Substrate API server 和 Kubernetes API server。只要认得三种模式，响应体就会告诉你是哪一个。

读完本节，你能根据状态码、延迟和响应体判断是哪个依赖宕机了。你还能说出恢复需要多久，以及节点重启会对 actor 产生什么影响。

## 为什么运行中的 actor 也需要数据库 {#s-when-a-dependency-is-down-why-a-running-actor-needs-the-database}

router 不记录 actor 运行在哪里。每个请求到达时，它都会调用 `ate-api-server` 的 `ResumeActor`，而 `ate-api-server` 从 Postgres 读取 actor 行。对于运行中的 actor，返回结果就是 worker 地址，这次调用只花一次数据库读取。[第 1.2 节](#s-one-request-from-client-to-actor)跟踪了这条路径。Kubernetes API server 不在路径上。Kubernetes 把 pod 启动起来之后，请求路径不再向它询问任何事。

我们逐个移除依赖来验证这个判断，同时保持三条请求流运行。

- **running：** 每秒向处于 RUNNING 状态的 actor `e-run` 发一个请求，从带有客户端证书的 pod 发出。
- **suspended：** 每 5 秒向一个新的 SUSPENDED 状态 actor 发一个请求，因此每次请求都需要完整恢复一次。
- **proxy：** 每秒从集群外部通过 `kubectl ate proxy` 向 `e-run` 发一个请求。

**我们测得**第二台 x86 服务器客户机（16 vCPU、23 GB）、Envoy 数据平面上的结果。中断之前，running 流的中位数是 27 毫秒（n=30）。一次全新恢复的中位数是 411 毫秒（n=6）。客户端超时设为 9 秒。[图 8.2](#fig-8-2) 展示了三次中断的每一秒。

```figure
id: fig-8-2
kind: timeline
title: 三次中断，逐秒记录
claim: 没有 Postgres 和没有 ate-api-server 时请求都失败，而没有 Kubernetes API server 时，集群内的每个请求都成功。
caption: 每个面板从左往右读。零点是依赖消失的那一秒，灰色带是中断期。请求成功时柱子呈绿色，失败时呈玫红色。每行末尾的数字是失败请求的个数。来源：capture/lab/summary/dependency-loss-x86.json。
```

## Postgres 宕机：先卡住，再返回 500 {#s-when-a-dependency-is-down-postgres-down-a-hang-then-500}

我们把 Postgres StatefulSet 缩到零，持续 61 秒。running 流从下一秒起失败。每个请求都卡住等待，直到客户端在 9 秒超时放弃。Postgres 恢复时仍未结束的请求返回了 500。

```listing
title: 三次中断期间每条请求流的返回
source: capture/lab/E-dependency-loss/12-probe-incluster.tsv
lang: text
note: 每种失败一行。各列依次是开始时间、请求流、actor、状态码、耗时秒数和响应体。状态码 000 表示客户端超时。
---
1794481295	running	e-run	000	9.002294
…
1794481358	running	e-run	500	2.311091	error resuming actor lab-e/e-run
…
1794481304	suspended	e-s-009	503	5.013150	actor lab-e/e-s-009 unavailable
…
1794481454	running	e-run	503	4.539254	actor lab-e/e-run unavailable
```

**我们测得**一次中断中，running 流在 158 个请求里失败了 66 个。第一次失败出现在缩容后 1 秒。最后一次出现在 66 秒，也就是 Postgres 报告就绪后 3 秒。恢复操作复原得更慢。新的 suspended actor 一直失败到 90 秒，即 Postgres 就绪后 27 秒。它们在 5 秒后返回 503 和 `actor lab-e/e-s-009 unavailable`，或者返回 500 和 `error resuming actor`。

这 27 秒很关键。监控运行中 actor 的仪表盘，会比新会话真正能启动早半分钟报告恢复。

起初这个延迟只在一台机器的一次运行中测到，后面的运行复现了这一现象。后来的一次演练在另一台机器上进行，那是第二台 x86 服务器客户机（16 vCPU、31 GB），Postgres 离线约 30 秒。在那里，suspended actor 在 Postgres 就绪后 0.4 秒就应答了。两次运行的机器和中断时长都不同，所以我们不把这当成两者之间的实质差异。按较长的延迟做规划。[故障演练](#s-a-failure-drill)展示了短的那种情形。

**我们测得**长延迟的原因，来自 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上的第三次运行，只有一次中断。该集群使用集群外的 Postgres，数据库离线 60.6 秒。运行中的 actor 在 Postgres 就绪后 0.7 秒重新应答。suspended actor 的恢复继续失败，最后一个失败的请求发送于就绪后 28.7 秒。`ate-api-server` 日志里，有一次失败的恢复带着 `worker cache not ready` 文本。日志行 `worker cache synced` 出现在就绪后 29.5 秒。

所以 API server 能立即服务运行中的 actor，但在 worker 列表重新填满之前，它无法放置 actor。内置数据库和外部数据库的延迟差不多，分别是 27 秒和 29 秒。[第 8.1 节](#s-postgres-and-the-object-store)讲了那个数据库的安装。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上还有两次约 63 秒的中断。数据库跑在同一台服务器的另一台客户机上。第二次中断里，运行中的 actor 在 219 个请求里失败了 69 个，并在 Postgres 就绪后 5.2 秒重新应答。恢复在 44 个请求里失败了 18 个，最后一个失败的请求发送于就绪后 23.2 秒。

那次中断的日志解释了为什么延迟约为半分钟。`ate-api-server` 的 worker 缓存在 1、2、4、8 和 16 秒后重试读取 worker 列表。它的下一次尝试在 30 秒后，并且成功了，那是 Postgres 就绪后 26.9 秒。因此这段延迟是中断期间增长起来的重试定时器导致的，并非 API server 必须执行的实质工作。

**我们测得**在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上，内置数据库又有三次中断。每次约 63 秒。它们在一个新集群上依次进行，有三个运行中的 actor 和同样的请求流。worker 缓存在 Postgres 就绪后 28.1、25.8 和 29.3 秒重新同步。

| 运行 | 中断期间运行中 actor 成功的请求 | 本次运行中的失败数及类型 | 最后一次失败的恢复，发送于就绪后 |
|---|---|---|---|
| 1 | 0 / 63 | 70 / 215：61 个触及 9 秒客户端上限，9 个返回 500 | 24.4 秒 |
| 2 | 0 / 63 | 67 / 215：58 个触及客户端上限，9 个返回 500 | 24.8 秒 |
| 3 | 4 / 63 | 60 / 214：55 个返回 503 `unavailable`（中位数 3.01 秒），5 个返回 500 | 25.9 秒 |

同一个集群上，失败文本在不同运行之间会变。所以不要仅凭状态码区分数据库中断和 API 中断。到最后一次失败恢复的时间没有变。目前我们已有七次数据库中断的实测，覆盖两台客户机和三种数据库部署位置。每一次里，最后一个失败的恢复都发送于 Postgres 就绪后 23 到 29 秒。

还有两个迹象指向数据库。两个 `ate-api-server` pod 都保持 `Running`，但就绪容器降到 1/2。随后 CLI 打印出 `Error: failed to connect to ate-api-server: no ready api pods in ate-system`。这段文本点名的是 API server，原因却在 Postgres。看到它时先检查数据库。

### 一个运行中的 actor 一直停在 504，直到重启 router {#s-when-a-dependency-is-down-one-running-actor-stayed-at-504-until-the-router-restarted}

那两次中断中的第一次以另一种方式结束。**我们测得**它只出现一次。Postgres 恢复后，有一个运行中的 actor 在我们观察的 121 秒里没有服务任何请求。这次运行里，它在 232 个请求里失败了 185 个，每个都在 9 秒客户端超时处失败。调长超时后，接下来的 8 个请求都在 10.01 秒后返回 504。另外两个运行中的 actor 在 0.04 秒内应答，API 把该 actor 报告为 `ACTOR_STATE_RUNNING`。

router 为那个 actor 记录了 `ResumeActor`，但没有结果。`kubectl ate resume actor` 在 0.17 秒内返回，什么都没改变。同步挂起在 0.67 秒内成功，之后的两个请求仍然返回 504。我们在 Postgres 就绪后 357 秒重启了 `atenet-router` Deployment，重启花了 7 秒。下一个请求在 0.33 秒内返回 200，计数为 49，说明 actor 保住了状态。

我们还没找到原因，下一版会把查明原因列入计划。它出现在这 2 次中断中的 1 次。同机外部数据库的那次中断没有出现，内置数据库的四次中断也没有。后三次中断结束后，我们向六个运行中的 actor 各发三个请求，18 个请求每次都返回 200。所以 7 次数据库中断里，我们见到它 1 次。

**我们的判断：** 数据库中断之后，向每个重要的运行中 actor 发一个请求。如果某个返回 504 用了 10 秒，而其他的都正常应答，就重启 `atenet-router`。不要回退那个 actor，因为它的状态完好无损。

## ate-api-server 宕机：3 到 5 秒内返回 503 {#s-when-a-dependency-is-down-ate-api-server-down-503-in-3-to-5-seconds}

我们把 `ate-api-server` Deployment 缩到零，持续 60 秒。每条请求流都返回同样的响应体 `actor lab-e/e-run unavailable`，状态码 503。

**我们测得**一次中断中，running 流在 166 个请求里失败了 60 个。失败请求的耗时中位数是 3.01 秒，最长 5.02 秒。这 5 秒是 router 的暂存（parking）预算，[第 4.4 节](#s-request-parking)讲了它。router 会扣住请求并不断重试，直到预算耗尽。

第一次失败出现在缩容后 6 秒，最后一次出现在扩容后 5 秒。恢复不需要任何操作。router 自己会找到新 pod。

**我们测得**在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上的第二次运行，只有一次，API pod 消失了 70.1 秒。running 流在 235 个请求里失败了 75 个，全部是 503 `unavailable`，中位数 3.01 秒，最大 5.02 秒。第一次失败出现在缩容后 5 秒，最后一次出现在扩容后 5 秒。这几乎一秒不差地复现了第一次运行。

对比这次运行中运行中 actor 的两种模式。没有 Postgres 时，客户端一直等到超时。没有 `ate-api-server` 时，客户端在 5 秒内收到 503。

不要对响应体过度解读。仅包含 `unavailable` 且后面没有其他信息的 503，只说明 router 没有收到 `ate-api-server` 的应答，并不说明原因。同样的响应体也出现在 Postgres 中断里：这次运行中，十个 suspended actor 的恢复得到了它。在[第 9.4 节](#s-a-failure-drill)的演练里，Postgres 离线时，运行中的 actor 和 suspended actor 都得到了它。所以看到这个响应体时，两处都要检查：`ate-api-server` pod 是否就绪，以及 Postgres 是否在运行。

[图 8.2c](#fig-8-2c) 画出了 running 流里每个请求的延迟。

```figure
id: fig-8-2c
kind: chart
title: 三次中断期间每个请求的延迟
claim: 没有 Postgres 时失败请求耗满 9 秒的客户端超时，没有 ate-api-server 时最多耗时 5 秒。
caption: 每个玫红色圆点是发给运行中 actor 的一个失败请求，横轴是发送的那一秒。高度是等到应答的时间。绿线是返回 200 的请求。来源：capture/lab/summary/dependency-loss-x86.json。
```

## Kubernetes API server 宕机：除了代理，什么都没发生 {#s-when-a-dependency-is-down-kubernetes-api-server-down-nothing-except-the-proxy}

我们把 kube-apiserver manifest 移出节点 86 秒。`kubectl` 打印出 `Unable to connect to the server: EOF`。

**我们测得**86 秒的中断期间，running 流的 86 个请求全部得到服务，suspended actor 的 17 次恢复也全部成功。也就是集群内的 103 个请求全部成功。在更宽的时间窗口里，223 个请求全部成功，该窗口从中断前 10 秒持续到 manifest 放回后 95 秒运行结束。一次恢复需要 worker、快照、Postgres 和 `ate-api-server`，不需要 Kubernetes。

**我们测得**在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上再次测运行中的 actor，只有一次。API server 离线 90.7 秒。一个运行中的 actor 在中断期间 91 个请求全部成功，另外两个 actor 的 182 个请求全部成功。那次运行里的恢复数据无效，因为前面几轮留下的运行中 actor 已经占满了 worker 池。因此前面 17 次恢复全部成功的结论依然只来自单次运行。

proxy 流是例外。`kubectl ate proxy` 通过 port-forward 到达 router，而 port-forward 要经过 Kubernetes API server。中断期间它的 81 个请求一个都没有得到服务，API server 恢复健康后它还继续失败了 21 秒。它一共失败了 105 个请求。每个 `kubectl ate` 命令都以同样方式失败。

**我们的判断：** 永远不要通过 `kubectl ate proxy` 判断 actor 的健康状况。从集群内带客户端证书的 pod 探测，做法见[第 5.1 节](#s-client-authentication)。通过代理探测会把用户根本没感知到的 Kubernetes 中断报成故障。

## agentgateway 上的同样三次中断 {#s-when-a-dependency-is-down-the-same-three-outages-on-agentgateway}

我们在 agentgateway 数据平面上重复了这三次中断，使用同样的三条请求流。结论在两种数据平面上都成立。Postgres 和 `ate-api-server` 在每条请求路径上，Kubernetes API server 不在任何一条上。有两点不同：失败的响应体，以及运行中的 actor 重新应答所需的时间。

**我们测得**在第二台 x86 服务器客户机（16 vCPU、23 GB）上每种中断各跑一次的结果，集群有一个 kind 节点，使用 agentgateway v1.7.0。中断之前，running 流的中位数是 21 毫秒（n=29），全新恢复是 470 毫秒（n=6）。Postgres 离线 61 秒。running 流从 6 秒起失败，160 个请求里失败 81 个。失败请求耗时的中位数是 3.0 秒，最长 5.0 秒。最后一次失败出现在 Postgres 就绪后 21 秒，Envoy 上是 3 秒。

**我们测得**同一次运行里同一台客户机上的另外两条请求流，每种中断 n=1。没有 Postgres 时，新的恢复从 1 秒起失败，32 个请求里失败 19 个，一直到就绪后 26 秒。`ate-api-server` 离线 61 秒时，running 流从 17 秒起失败，166 个请求里失败 70 个。它的最后一次失败出现在 API pod 就绪后 15 秒。Kubernetes API server 离线 87 秒。在那次中断的整个窗口里，对运行中 actor 的 188 个请求和 38 个新恢复请求全部得到了服务。

```listing
title: agentgateway 上每个失败的响应体都相同
source: capture/lab/Q-network/g-dependency-loss-agw/12-probe-incluster.tsv
lang: text
note: Postgres 中断中每种状态码一行。各列依次是开始时间、请求流、actor、状态码、耗时秒数和响应体。
---
1794488149	running	e-run	500	0.043341	ingress failed
…
1794488157	running	e-run	504	3.010174	ingress failed
…
1794488178	running	e-run	503	2.009588	ingress failed
…
1794488174	suspended	e-s-013	503	5.018422	ingress failed
```

在 Envoy 上，响应体点名了 actor 并给出提示：`actor lab-e/e-run unavailable` 或 `error resuming actor`。在 agentgateway 上，每个失败的响应体都是 `ingress failed`，状态码是 500、504 或 503。客户端无法从响应体判断原因。要读状态码和延迟，并且每次都检查 Postgres 和 `ate-api-server` pod。

[图 8.2e](#fig-8-2e) 把两种数据平面的 running 流放在同一条时间轴上。

```figure
id: fig-8-2e
kind: timeline
title: 三次中断中的运行中 actor，分数据平面对比
claim: 各一次运行中，运行中的 actor 在 Envoy 上于 Postgres 就绪后 3 秒重新应答，在 agentgateway 上是 21 秒。
caption: 每对行从左往右读。零点是依赖消失的那一秒，灰色带是中断期，虚线是就绪的那一秒。请求成功时柱子呈绿色，失败时呈玫红色。来源：capture/lab/summary/dependency-loss-x86.json、capture/lab/summary/dependency-loss-agw-x86.json。
```

按较长的恢复时间做规划，但不要把它当成数据平面的规律。每种数据平面只有一次运行。在 agentgateway 那次运行中，同一台客户机上有第二个集群同时在跑节点测试。我们也没有查明，为什么 `ate-api-server` 缩容后的第一次失败在这里出现在 17 秒，在 Envoy 上却是 6 秒。

proxy 流在这里的失败方式和 Envoy 上一样。经 `kubectl ate proxy`，Kubernetes API 中断期间以及中断后 19 秒内，173 个请求失败了 103 个。

## 一个 actor 一直停在 RESUMING {#s-when-a-dependency-is-down-one-actor-stayed-in-resuming}

有一个请求在 Postgres 消失的那一秒开始了恢复。那个 actor `e-s-007` 再也没有离开当时所处的状态。

```listing
title: 没有恢复的那个 actor
source: capture/lab/E-dependency-loss/21-nonsteady-actors-after.txt
lang: text
note: 整个文件。它列出最后一次中断之后，不处于 RUNNING 也不处于 SUSPENDED 的每个 actor。
---
ATESPACE   NAME      TEMPLATE          STATE                   WORKER POD                     WORKER IPS    VERSION   AGE
lab-e      e-s-007   lab-e/e-counter   ACTOR_STATE_RESUMING    lab-e/e-pool-77cc8bf9f-p888v   10.244.0.37   2         9m54s
```

五分钟后，它仍然是 131 个 actor 里唯一处于 `ACTOR_STATE_RESUMING` 的。这段时间里它一直占着一个 worker。我们删除了它。我们没有对它试 `RevertActor` 或第二次恢复，所以还不能告诉你哪一种能修复它。任何数据库中断之后，都要列出 actor 并查找这个状态。

**我们测得**在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上，内置数据库的三次中断里出现了同样的现象。每次中断之后，都多出一个处于 `ACTOR_STATE_RESUMING` 的 actor：先是 1 个，然后 2 个，然后 3 个。随后 `ate-api-server` 和 Kubernetes API server 的中断没有再增加。我们的文件只记录每种状态的 actor 数量，没有记录名字，所以说不出是哪个请求留下了每一个。

**我们测得**在[第 4.5 节](#s-sizing-a-pool)的突发压测中还有另外两例，当时有四个 `ate-api-server` 副本，内置 Postgres 连接耗尽。两个 actor 得到 500 和 `error resuming actor`。它们在 4 秒后和 4 分 12 秒后仍处于 `ACTOR_STATE_RESUMING`。在 500 之后约 6 分钟，对它们各自的下一个请求返回了 200。

同一次运行里还有第二种卡死，没有任何中断。2,800 个突发请求中有 4 个在 90 秒客户端上限之前没有得到应答。这些 actor 在之后的突发里都返回了 200。两种卡死的原因我们都还没找到。两项排查都列在[下一版将补充](#s-next-edition)的清单里。

## 节点重启：API 8 秒后恢复，actor 却不会 {#s-when-a-dependency-is-down-a-node-restart-the-api-returns-in-8-s-the-actors-do-not}

节点重启会一次移除所有依赖，连同沙箱和 worker 注册信息。我们用 `docker restart kind-control-plane` 重启了第一个测试集群里唯一的节点。一个 actor `r1` 处于挂起状态，它的快照还没有到达 bucket。[图 8.2b](#fig-8-2b) 展示了事件的顺序。

```figure
id: fig-8-2b
kind: timeline
title: 一次节点重启及 actor r1 的响应情况
claim: Kubernetes API 在 8 秒后恢复，所有 pod 在 147 秒后恢复，而 actor 还需要一次回退和 78 秒。
caption: 从左往右读。上方轨道是节点，下方轨道是对 actor r1 的每个请求及其状态码。来源：capture/lab/D-durability/40-node-reboot.tsv、capture/lab/D-durability/46-after-reboot-followup.txt。
```

```listing
title: 节点恢复之后的请求
source: capture/lab/D-durability/40-node-reboot.tsv
lang: text
note: 重启之后的六行记录，中间的状态采样行已省略。
---
2026-11-12T11:41:39.118Z	kube-api-back	8 s
2026-11-12T11:43:58.809Z	pods-ready	147 s, not-running=0
2026-11-12T11:44:00.610Z	call-after-reboot	500	0.408692	error resuming actor lab-c/r1
…
2026-11-12T11:44:05.915Z	call-again	503	0.070858	actor lab-c/r1 unavailable: AssignWorker prerequisite not met for Actor: lab-c/r1 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)
…
2026-11-12T11:44:11.607Z	call-after-revert	503	5.060362	actor lab-c/r1 unavailable: no worker has room for the actor
```

**我们测得**这件事只出现一次，在一台 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上。节点重启引发了三件单靠 pod 重启不会遇到的情况。

1. 第一个请求在所有 pod 运行后不到 2 秒到达，它让一个已挂起的 actor 崩溃了。请求返回 500，`r1` 变成 `ACTOR_STATE_CRASHED`。下面的崩溃记录没有点名丢失快照，它说的是 worker 还没有注册。
2. `RevertActor` 把它带回最后一个持久快照。该快照之后的两次调用丢失了，原因见[第 3.5 节](#s-crashed-and-revertactor)。
3. 回退之后的请求等了 5.06 秒，返回 `no worker has room for the actor`。当时所有 pod 已经运行了 13 秒。同一个请求约 78 秒后返回了 200。

```listing
title: 为什么第一个请求让 actor 崩溃
source: capture/lab/D-durability/44-r1-after-reboot.yaml
lang: yaml
note: 第一个请求之后 actor r1 的 crash 字段。
---
  crash:
    crashTime: "2026-11-12T11:44:00.591165797Z"
    message: 'resume failed: atelet Restore: worker restore failed with a retryable
      error 3 times in a row, giving up: while calling worker RestoreWorkload: rpc
      error: code = Unavailable desc = worker has not registered yet: not accepting
      workloads'
```

运行中的 pod 并不等于已注册的 worker。worker 进程必须重新向 `ate-api-server` 注册，才会接受 actor。节点重启后过早到达的请求可能让一个已挂起的 actor 崩溃。之后回退会把它带回最后一个持久快照。

第二次重启时我们每 2 到 3 秒尝试恢复一次，由此查明了第三个现象的原因。

**我们测得**在同一台 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上，一次运行。`ate-api-server` 在重启命令后 160 秒首次应答，并把全部 11 个 worker 列为 active。从 163 到 171 秒，它把其中每个 worker 标记为 `WORKER_STATE_UNAVAILABLE`。第一次恢复在 174 秒成功，全部 11 个 worker 在 191 秒重新变为 active。

控制平面带着重启前的 worker 列表回来。然后它把其中每个 worker 标记为不可用，直到该 worker 重新注册。在这个窗口里，池中没有 active worker，所以恢复会因为没有空位而失败，或者带着 `is unavailable` 文本失败。这个窗口是 10 到 30 秒。

第一次运行里我们的重试在 78 秒后才发出，所以窗口看起来比实际更长。按这个延迟做规划，不要把这个 503 误判成池已满。[第 4.3 节](#s-placement)有完整时间线。

重启期间处于 RUNNING 的 actor `my-counter-1`，之后是 `ACTOR_STATE_CRASHED`。在回退之前，它一直返回 `AssignWorker prerequisite` 的 503。

## 节点停止后不再回来 {#s-when-a-dependency-is-down-a-node-that-stops-and-does-not-return}

重启终究会结束。节点停机且不再恢复则是另一种故障，Substrate v1.0.0 不会自动修复它。在有两个 worker 节点的集群上，我们在 13 个用例里停掉其中一个。没有任何一个用例里，actor 自己离开了被停掉的节点。本小节是运行手册，背后的放置规则见[第 4.3 节](#s-placement)。

**我们测得**每个用例各一次，在第二台 x86 服务器客户机（16 vCPU、23 GB）上，用 Envoy 数据平面、gVisor 和默认定时器。池在每个 worker 节点上有两个 worker pod，每个用例里另一个节点都有空闲 worker。测试 actor 在内存中维护一个计数器和 50 MB 数据，因此响应中的计数值能反映它恢复自哪份快照。被停节点的 worker 在停止命令后 45 到 52 秒显示 `WORKER_STATE_UNAVAILABLE`，共 5 个用例。Kubernetes 在 342 到 350 秒后驱逐了池 pod，共 2 个用例。在该节点上处于 `ACTOR_STATE_RESUMING` 的 actor，在 342 到 350 秒变成 `ACTOR_STATE_CRASHED`，共 4 个用例。

| 节点停止时的 actor | 客户端看到什么 | 有效的操作序列 | 恢复时间 | 丢失什么 |
|---|---|---|---|---|
| 以 `--mode sync` 挂起，中断期间没有请求 | 什么都没有，因为没有发请求 | 等到 `kubectl ate get worker` 把该节点的 worker 显示为 `UNAVAILABLE`。然后 `revert actor`，再发请求 | 回退 7.1 秒。首个请求在 0.56 秒内返回 200，落在另一个节点上 | 什么都不丢。计数从快照继续 |
| 同上，但在 worker 显示 `UNAVAILABLE` 之前就 `revert` | `revert` 等待 20.2 秒，在 `atelet Terminate` 上失败。actor 处于 `REVERTING`，请求立即得到 503 | 中断期间无效：4 次回退全部失败。节点及其 `atelet` 恢复后，一次 `revert`（0.2 秒），然后发请求 | 中断时长加 17 秒。请求在 0.47 秒内返回 200 | 快照中的状态不丢 |
| 已挂起，中断期间有请求到达 | 客户端在 10 秒超时，之后每个请求约 5 秒后返回 503 `actor ... unavailable`。actor 在被停节点上处于 `RESUMING`，约 345 秒时变成 `CRASHED` | 快：`create actor <new> --template <t> --tag <tag>`，用停机之前的标签，然后向新名字发请求。慢：不发回退，等节点回来，再 `revert` 并发请求 | 用标签：首个请求在 0.58 秒内返回 200，距 create 命令 1.2 秒。不用标签：中断时长，然后回退 0.3 秒，请求在 0.90 秒内返回 200 | 用标签：带标签的快照之后的所有工作丢失，且 actor 换了新名字。不用标签：什么都不丢 |
| 同上，且中断期间执行 `revert` | 在 `RESUMING` 期间回退被拒绝，19 次全部如此：`not in a revertable state`。到 `CRASHED` 时，一次回退在 `atelet Terminate` 上失败，actor 处于 `REVERTING`。144 个请求一个都没有得到服务 | 中断期间无效。在两次运行里，又有 13 次和 15 次回退失败 | 在我们观察的 579 秒和 602 秒内未恢复 | 节点回来之前，actor 不可用 |
| 以默认模式挂起，最新快照仍在节点上处于 `PENDING` | `UNAVAILABLE` 之后的 `revert` 在 0.8 秒内因 `atelet Terminate` 失败。actor 处于 `REVERTING`，请求得到 503 | 中断期间不发任何命令。节点回来后，不回退直接发请求 | worker 在节点启动后 25 秒变为 active。请求在 0.36 秒内返回 200 | 什么都不丢：计数值从 5 递增到 6。如果先 `revert`，最后一个持久快照之后的两次调用会丢失 |
| `RUNNING` | 503 `upstream connect error or disconnect/reset before headers`。状态保持 `RUNNING` | 快：用你事先做好的标签建一个新 actor。原 actor 仍是 `RUNNING` 时它也能工作。慢：等节点。actor 在节点启动后 18 秒变为 `CRASHED`。然后 `revert` 并发请求 | 用标签：在 0.48 和 0.51 秒内返回 200，距每次 create 命令 1.2 秒。不用标签：中断时长，然后回退 0.3 秒，请求在 0.48 秒内返回 200 | 你所用快照或标签之后的所有工作 |
| `RUNNING`，且中断期间执行 `revert` | 回退在 `atelet Terminate` 上失败，actor 处于 `REVERTING`。又有 27 次回退失败 | 中断期间无效 | 在 718 秒的中断期内未恢复 | 节点回来之前，actor 不可用 |
| 该节点上的任意 actor，你发送 `suspend`、`resume` 或 `delete` | `suspend`：`MarkSuspending prerequisite not met`。`resume`：`worker ... assigned to actor ... is unavailable`。`delete`：在 `atelet Terminate` 上失败，actor 处于 `DELETING` | 无 | 中断期间无效。用同名建新 actor 会报错 `AlreadyExists` | 名字，直到节点回来 |

表格背后的模式只有一个调用。每个修改被停节点上 actor 的命令，都会调用该节点上的 `atelet`：`revert`、`suspend`、`resume` 和 `delete`。节点宕机期间，这个调用会失败。失败的 `revert` 或 `delete` 还会让 actor 停在 `ACTOR_STATE_REVERTING` 或 `ACTOR_STATE_DELETING`，这个状态会一直保持到节点回来。由此得到三条规则。

**对安静的 actor，先等到 `UNAVAILABLE` 再 `revert`。** 安静的 actor 指以 `--mode sync` 挂起、且停机后没有收到请求的 actor。在停止命令后 45 秒发出的一次 `revert` 释放了这样一个 actor，它的下一个请求跑在另一个节点上。在另一次运行里，我们在停止命令后 10 秒发出回退。它在 20.2 秒后失败，actor 一直处于 `ACTOR_STATE_REVERTING`，直到节点回来。

**对中断期间收到请求的 actor，绝不要 `revert` 或 `delete`。** 第一个请求会把 actor 绑定到被停节点上的 worker，从那以后任何命令都没有用。这条规则同样适用于以默认模式挂起的 actor。它最新的状态在该节点上，会随节点一起回来，所以 `revert` 只会丢掉这份状态。

**在需要之前先做好标签。** `kubectl ate create tag <name> --actor <a>` 对已挂起的 actor 可用，返回 `Ready` 用时不到 1 秒。即使 actor 最新的快照仍处于 `PENDING`，它也能工作。`create actor --tag` 是唯一在每个用例里都有效的救援手段，3 次里成功 3 次。新 actor 在 create 命令后 1.2 秒就在另一个节点上服务了首个请求。代价是要换一个新的 actor 名字，所以你的客户端必须能改变它所调用的名字。

```listing
title: 原 actor 无法恢复时，用标签救援
source: capture/lab/P-node-loss/80-tag-rescue.tsv
lang: text
note: 停止命令后 60 秒处的三行跟踪记录。各列依次是时间、距停止命令的秒数、事件及其详情。
---
2026-11-12T14:16:17.202Z	t=60.4	tag-attempt-on-stuck-actor	state=ACTOR_STATE_RESUMING | Error: failed to create tag: rpc error: code = FailedPrecondition desc = Actor lab-n/t1 must be ACTOR_STATE_SUSPENDED to be tagged (got: ACTOR_STATE_RESUMING) 
…
2026-11-12T14:16:19.269Z	t=62.5	rescue-first-request	1.2 s after create | 200	0.581895	count=4 mb=50 sum=6613 process_age_s=4.9	|	ACTOR_STATE_RUNNING	multi-worker	SNAPSHOT_OWNER_TAG:SNAPSHOT_STORAGE_STATE_COMPLETED:gen1:-
2026-11-12T14:16:19.765Z	t=63.0	rescue-second-request	200	0.064394	count=5 mb=50 sum=6613 process_age_s=5.2	|	ACTOR_STATE_RUNNING	multi-worker	SNAPSHOT_OWNER_TAG:SNAPSHOT_STORAGE_STATE_COMPLETED:gen1:- pod lab-n/ballast-5d6cf97747-zzzdn
```

第一行是第三条规则的原因。事后无法再做标签。在原 actor 上，`create tag` 先因 `another operation is in progress for this actor` 失败，然后因清单里的那段文本失败。[图 8.2d](#fig-8-2d) 把运行手册放在了一页上。

```figure
id: fig-8-2d
kind: decision
title: 节点停止后，如何处理一个 actor
claim: 停机前做好的标签能在 1.2 秒内得到一个可用的 actor，其他路径都要等 worker 或者等节点。
caption: 每行从左往右读：节点停止时的 actor、该怎么做，以及我们测得的结果。在两个玫红色的行里，中断期间执行命令没有帮助。虚线行是这类命令留下的状态。来源：capture/lab/summary/node-loss-x86.json。
```

### 节点恢复之后 {#s-when-a-dependency-is-down-when-the-node-comes-back}

**我们测得**节点在相同用例里的恢复，在同一台客户机（16 vCPU、23 GB）上，每个用例恢复一次。Kubernetes 在启动后 2.6 到 4.7 秒报告节点 `Ready`。中断短于驱逐时间（51 到 263 秒）时，节点仍保有它的两个池 pod。4 次节点恢复中，该节点的 worker 在 24 到 31 秒后重新变为 active。5 次节点恢复中，首个新 actor 在启动后 23 到 45 秒调度到该节点上。

**我们测得**中断超过驱逐时间（372 到 718 秒）的七次恢复，在同一台客户机上。节点回来时没有任何池 pod。替代 pod 跑在另一个节点上，并且一直留在那里。在我们观察的 216 到 223 秒里，没有新 actor 落到回来的节点上。我们自己删除了 pod，让每个节点重新各有两个。

所以 Substrate 不会为池重新均衡。长时间中断之后，回来的节点会一直空着，直到有人移动 pod。被命令留在 `ACTOR_STATE_REVERTING` 的 actor，在节点回来之后还需要再 `revert` 一次，结果及其注意事项见[第 3.5 节](#s-crashed-and-revertactor)。

## 你主动排空的节点 {#s-when-a-dependency-is-down-a-node-that-you-drain}

节点排空（drain）是有计划的节点停机，结局与意外停机截然不同。`kubectl drain` 驱逐 worker pod，保留 DaemonSet pod，所以 `atelet` 留在节点上。控制平面仍然能访问那里的快照文件。[图 8.2f](#fig-8-2f) 展示了我们运行的五个用例。

```figure
id: fig-8-2f
kind: timeline
title: 对一个 worker 节点的五次排空，逐请求记录
claim: 排空让每个运行中的 actor 崩溃，却没有影响任何已挂起的 actor。
caption: 每行从左往右读。零点是排空命令。绿色标记是返回 200 的请求，玫红色标记是失败的请求。虚线是我们发出的回退。来源：capture/lab/summary/node-drain-x86.json。
```

**我们测得**每个用例各一次，在第二台 x86 服务器客户机（16 vCPU、23 GB）上，用 Envoy 和 gVisor。集群有两个 worker 节点。命令是带 `--ignore-daemonsets --delete-emptydir-data --force` 的 `kubectl drain`。五个用例里它都在 1.2 到 2.2 秒内返回。

池没有 PodDisruptionBudget。在排空期间没有请求的两个用例里，新 pod 在命令后 2.5 秒就跑在另一个节点上。

| 排空开始时的 actor | 客户端看到什么 | 它会自己迁移吗 | 什么有效 | 丢失什么 |
|---|---|---|---|---|
| `RUNNING`，约每秒一个请求 | 从 0.4 秒起 503。62 个请求里失败 46 个，大多带 `AssignWorker prerequisite not met` | 不会。它是 `ACTOR_STATE_CRASHED` | 一次 `revert`，0.2 秒。下一个请求在 0.8 秒后返回 200，落在另一个节点上 | 最后一个持久快照之后的 6 次调用 |
| 以 `--mode sync` 挂起，排空期间没有请求 | 什么都没有 | 会，在它的首个请求时 | 发请求。它在 0.58 秒内返回 200 | 什么都不丢 |
| 以 `--mode sync` 挂起，从排空后 2 秒起约每秒一个请求 | 30 个请求全部返回 200。第一个耗时 0.49 秒 | 会 | 不需要命令 | 什么都不丢 |
| 以默认模式挂起，最新快照仍在节点上处于 `PENDING` | 什么都没有 | 会，在它的首个请求时 | 发请求。它在 1.19 秒内返回 200 | 什么都不丢。计数值从 5 递增到 6 |
| `RUNNING`，有一个 120 秒的请求处于打开状态 | 打开的请求在排空命令后 0.4 秒得到 503 `connection termination`。随后 16 个请求全部得到 503 | 不会。它是 `ACTOR_STATE_CRASHED` | 一次 `revert`，0.2 秒。下一个请求在 0.7 秒后返回 200 | 打开的那个请求，以及最后一个持久快照之后的 2 次调用 |

脚本在第一个用例里于排空后 64.8 秒发出回退，在最后一个用例里于 24.8 秒发出。更早发出回退的情况留待下一版测试。

有两个结果很突出。排空不会挂起运行中的 actor，它只是结束 worker pod，而 actor 在 7 秒内就变成了 `ACTOR_STATE_CRASHED`，两个用例都是如此。worker pod 的终止宽限期是 3,600 秒，排空仍然在约 2 秒内返回。

排空不会伤害已挂起的 actor，三个用例都是如此。这与节点停止相反。停止之后，首个请求会把 actor 绑定到已死节点上的 worker。排空之后，节点上没有 worker，它的 `atelet` 仍然应答。所以恢复会把快照搬离该节点，并把 actor 放到另一个节点上。在安静的用例里，被排空的节点在请求之前保有 52 MiB 快照，请求之后是 1 MiB。

**我们的判断：** 排空之前，先用 `--mode sync` 挂起每个运行中的 actor，然后再排空。已挂起的 actor 会在下一个请求时带着状态迁移。运行中的 actor 会崩溃，需要 `revert` 把它带回最后一个持久快照。worker 升级的顺序相同，见[第 8.4 节](#s-upgrade-and-stale-advice)。

`kubectl uncordon` 之后节点一直是空的，五次恢复都是如此。它的池 pod 跑在另一个节点上，Kubernetes 没有把它们移回来。每次恢复后，我们在 86 秒里新建了 15 个 actor。75 个里没有一个落到恢复的节点上。我们又手动移动了 pod。

## 一个已停止的节点，且另一个节点没有空闲 worker {#s-when-a-dependency-is-down-a-stopped-node-and-no-free-worker-on-the-other-node}

停止节点的运行手册依赖另一个节点上有空闲 worker。我们把另一个节点填满，然后重新运行。该池的每个 worker 容量是 1,984 Mi，一个限制为 1,900 Mi 的 actor 就能把它填满。

**我们测得**另一个节点已满时的两次节点停止运行，在同一台客户机（16 vCPU、23 GB）上，各一次。`UNAVAILABLE` 之后的 `revert` 分别在 2.8 秒和 3.1 秒内被接受，actor 变成 `ACTOR_STATE_SUSPENDED`。之后每个请求都等了 5.05 到 5.07 秒，得到 503 和 `no worker has room for the actor`，8 个请求全部如此。`kubectl ate resume actor` 以 `ResourceExhausted` 失败。`create actor --tag` 被接受，发给新 actor 的请求得到同样的 503。

两次运行里都是容量结束了等待。第一次运行里，我们在已满的节点上挂起了一个 actor，用了 0.6 秒。随后请求在 0.80 秒内返回 200，距那条命令 1.6 秒。第二次运行里，我们把池从 4 个 worker 扩到 6 个。请求在 1.55 秒内返回 200，距扩容命令 1.7 秒。

从标签新建的 actor 分别在 0.64 秒和 0.63 秒内应答。两次运行都没有丢失任何内容。

所以节点满了并不会破坏运行手册。回退和从标签救援仍然会成功，只是二者随后都要等一个 worker。节点丢失之后看到 `no worker has room for the actor`，要把它当成容量问题，腾出或新增一个 worker。[第 4.3 节](#s-placement)有两个节点都在线时的同样用例。

## 对象存储离线 {#s-when-a-dependency-is-down-the-object-store-away}

从节点副本恢复不需要 bucket。同步挂起需要它，唯一副本在 bucket 里的 actor 的恢复也需要它。我们用两种方式让 bucket 离线。第一种，每个连接都被拒绝。第二种，丢弃数据包，于是每次调用都在等待。

**我们测得**每个用例各一次，在同一台客户机（16 vCPU、23 GB）上，actor 在内存里不保存数据。这些运行用的 bucket 在集群外，见[第 8.1 节](#s-postgres-and-the-object-store)。

| bucket 离线时的操作 | 连接被拒绝 | 数据包被丢弃 |
|---|---|---|
| 对运行中 actor 的请求 | 0.06 秒内返回 200 | 未记录 |
| 对唯一副本在 bucket 里的已挂起 actor 的请求 | 4.11 秒后返回 500 `error resuming actor`。actor 是 `ACTOR_STATE_CRASHED` | 10.05 秒后返回 504。actor 仍是 `ACTOR_STATE_RESUMING` |
| bucket 恢复后的同一个 actor | 22 个请求全部返回 503。一次 `revert`（0.2 秒）之后，请求在 0.33 秒内返回 200，带着它的状态 | 不用任何命令，0.63 秒内返回 200，带着它的状态。当时 bucket 已离线 137 秒 |
| 对运行中 actor 的 `suspend --mode sync` | 调用在 4.28 秒后于 `CallAteletSuspend` 步骤失败。actor 是 `ACTOR_STATE_CRASHED` | 调用在 126.3 秒后失败。actor 是 `ACTOR_STATE_CRASHED` |
| 之后的那个 actor | 503，直到 `revert`。然后从最后一个持久快照返回 200，其后的 2 次调用丢失 | 相同，最后一个持久快照之后的 2 次调用丢失 |
| 默认模式的 `suspend` | 0.31 秒。快照在节点上保持 `PENDING`，下一个请求在 0.22 秒内返回 200 | 未记录 |
| 用模板 `create actor`，然后发请求 | 0.27 秒内返回 200 | 0.24 秒内返回 200 |

要记住的是同步挂起这一行。bucket 离线时，你为保护 actor 而发出的调用反而让它崩溃。actor 在调用前健康且处于 `RUNNING`，调用后需要 `revert`。同一分钟里，默认挂起是安全的，因为它不等待上传。

前两行显示了第二个差异。连接被拒绝让已挂起的 actor 崩溃，bucket 恢复后它仍然是崩溃状态。连接被丢包则让它停在 `ACTOR_STATE_RESUMING`，bucket 回来后它自己就应答了。

**我们测得**用内存里保存 200 MiB 的 actor 重复相同用例，各一次，bucket 在另一台客户机上。bucket 停止了 57 秒。第二轮里，它的数据包被丢弃了 176 秒。

| 操作 | bucket 停止 | 数据包被丢弃 |
|---|---|---|
| 对运行中 actor 的请求 | 200，2/2 | 200，2/2 |
| 对唯一副本在 bucket 里的已挂起 actor 的请求 | 3.87 秒后返回 500 `error resuming actor`，之后是 503 | 10.05 秒后返回 504，两次 |
| bucket 恢复后的同一个 actor | 不用命令时 503。一次 `revert`（0.2 秒）之后，2.52 秒内返回 200，带着它的计数 | 不用命令时 503。一次 `revert`（0.3 秒）之后，2.74 秒内返回 200，带着它的计数 |
| 对运行中 actor 的 `suspend --mode sync` | 调用在 1.62 秒后于 `CallAteletSuspend` 步骤失败。actor 是 `ACTOR_STATE_CRASHED` | 调用在 103.05 秒后失败。actor 是 `ACTOR_STATE_CRASHED` |
| `revert` 之后的那个 actor | 2.50 秒内返回 200。它的计数在挂起前是 5，之后是 4，所以丢了 2 次调用 | 2.60 秒内返回 200，丢了 2 次调用 |
| 默认模式的 `suspend` | 0.83 秒。快照在节点上保持 `PENDING`，下一个请求在 0.39 秒内返回 200 | 0.70 秒，下一个请求在 0.49 秒内返回 200 |
| bucket 恢复后的那个 actor | 从节点副本在 0.40 秒内返回 200，带着它的计数 | 从 bucket 在 2.41 秒内返回 200，带着它的计数 |
| 用模板 `create actor`，然后发请求 | 0.60 秒内返回 200 | 0.47 秒内返回 200 |

内存里有数据时，有两个结果依然成立。同步挂起再次让健康的 actor 崩溃，并且它最后一个持久快照之后的 2 次调用丢失了，2 个用例都是如此。默认挂起什么都没丢，2 个用例都是如此。

有一个结果变了。在丢包情况下，唯一副本在 bucket 里的 actor 最终崩溃了，需要一次 `revert`。第一轮里，内存中没有数据的同样用例不用任何命令就恢复了。所以不要指望这种恢复。

**我们的判断：** 在一批同步挂起之前，先检查 bucket 是否应答，比如排空或 worker 升级之前的那一批。如果它没有应答，就让 actor 继续运行，或者用默认模式挂起并接受节点副本。

## 后续内容 {#s-when-a-dependency-is-down-coming-next}

每个节点停止用例、每个排空用例和每个 bucket 用例都只运行了一次。在 Envoy 上，Postgres 中断在四种配置下运行了七次，另外两种中断各运行两次。在 agentgateway 上，每种中断各运行一次。每次中断都在一个 kind 节点上进行。中断期间 actor 的出站流量，以及跨越中断保持打开的连接，留待下一版去跑。

节点停止的用例有四处空白。这里的停止是 `docker stop`，它会干净地结束 kubelet 和 `atelet`，所以断电或断网的结果可能不同。下一版会修改 Kubernetes 的节点定时器，加入第三个 worker 节点，并在 agentgateway 上重复这些用例。我们是按内存把另一个节点填满的。按 CPU 或 actor 数量填满节点的用例，计划放在下一版。

排空用例有三个后续步骤。池没有 PodDisruptionBudget，下一次运行会加一个。它还会排空运行 `ate-system` 的节点，并在排空后的前 20 秒内发出 `revert`。

内存里有数据的 bucket 用例每种只运行了一次，用的是 200 MiB。下一版会记录 bucket 在停止后恢复时，处于 `PENDING` 状态的快照何时上传。它还会测试丢包情形下的数据库中断。我们还没查明，为什么数据库中断之后一个运行中的 actor 会停在 504。这项排查在同一份清单上，见[下一版将补充](#s-next-edition)。

```takeaways
- 把客户端超时后跟着 `error resuming actor` 判读为数据库中断。
- 把以 `unavailable` 结尾的 503 判读为 `ate-api-server` 不可达，同时也检查 Postgres。
- 从集群内的 pod 探测 actor 健康状况，绝不要通过 `kubectl ate proxy`。
- Postgres 就绪后再等 30 秒，才相信新会话能启动。
- 数据库中断之后列出 actor，查找 `ACTOR_STATE_RESUMING`。
- 节点重启后先扣住客户端请求，直到一次测试恢复成功，因为最初的 worker 列表是过期的。
- 对每个被重启弄崩溃的 actor 运行 `kubectl ate revert actor`。
- 在 agentgateway 上读状态码和延迟，因为每个失败响应体都是 `ingress failed`。
- 节点停止之前，为每个不能丢失的已挂起 actor 做一个标签。
- 节点停止时，先等到 `WORKER_STATE_UNAVAILABLE`，再回退安静的 actor。
- 不要对中断期间收到过请求的 actor 发送 `revert` 或 `delete`。
- 长时间节点中断之后，手动把池 pod 移回恢复的节点。
- 排空之前用 `--mode sync` 挂起运行中的 actor，因为排空会让运行中的 actor 崩溃。
- 节点丢失之后，把 `no worker has room for the actor` 判读为容量不足，并腾出或新增一个 worker。
- 同步挂起之前先检查 bucket 是否应答，因为失败的同步挂起会让 actor 崩溃。
- 数据库中断之后，向每个运行中的 actor 各发一个请求，有一个返回 504 就重启 `atenet-router`。
```

来源： capture/lab/summary/dependency-reruns-x86.json, capture/lab/summary/bursts-one-node-x86.json, capture/lab/Z-bursts/10-run/40-errors/00-actors-065903.txt, capture/lab/Z-bursts/10-run/40-errors/01-actors-before-unstick.txt, capture/lab/Z-bursts/10-run/41-non-200-rows.tsv, capture/lab/summary/node-drain-x86.json, capture/lab/summary/full-node-x86.json, capture/lab/summary/object-store-x86.json, capture/lab/summary/external-postgres-x86.json, capture/lab/T-drain-store/20-b-suspended-sync-quiet.tsv, capture/lab/T-drain-store/04-pdb-and-grace.txt, capture/lab/T-drain-store/95-store-unreachable.tsv, capture/lab/T-drain-store/97-store-unreachable-recovery.tsv, capture/lab/U-pg-upgrade-scale/20-extpg-tests/34-api-server-log.excerpt.txt, capture/lab/N-demos/failure-drill/drill-run.log, capture/lab/summary/demos-x86.json, capture/lab/E-dependency-loss/10-timeline.tsv, capture/lab/E-dependency-loss/12-probe-incluster.tsv, capture/lab/E-dependency-loss/12-probe-proxy.tsv, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/E-dependency-loss/14-T1-pods-during.txt, capture/lab/E-dependency-loss/14-T1-cli-during.txt, capture/lab/E-dependency-loss/16-T3-kubectl-during.txt, capture/lab/E-dependency-loss/21-nonsteady-actors-after.txt, capture/lab/E-dependency-loss/22-actors-5min-later.txt, capture/lab/summary/dependency-loss-x86.json, capture/lab/D-durability/40-node-reboot.tsv, capture/lab/D-durability/46-after-reboot-followup.txt, capture/lab/D-durability/44-r1-after-reboot.yaml, capture/lab/summary/failures-x86.json, capture/lab/L-gaps/restart/10-poll.tsv, capture/lab/L-gaps/restart/11-workers-each-poll.txt, capture/lab/L-gaps/restart/23-ateapi.log, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/75-stop-after-upload-revert.tsv, capture/lab/L-gaps/multinode/80-stop-before-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/96-controller-events.log, capture/lab/Q-network/g-dependency-loss-agw/12-probe-incluster.tsv, capture/lab/Q-network/g-dependency-loss-agw/12-probe-proxy.tsv, capture/lab/Q-network/g-dependency-loss-agw/20-analysis.txt, capture/lab/summary/dependency-loss-agw-x86.json, capture/lab/summary/node-loss-x86.json, capture/lab/P-node-loss/10-a-quiet-revert.tsv, capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/P-node-loss/20-b60-requests-revert-loop.tsv, capture/lab/P-node-loss/30-bevict-requests-revert-after-eviction.tsv, capture/lab/P-node-loss/40-balt-suspend-resume-delete.tsv, capture/lab/P-node-loss/50-c-pending-snapshot.tsv, capture/lab/P-node-loss/55-c-pending-snapshot-with-requests.tsv, capture/lab/P-node-loss/88-pending-snapshot-node-returns.tsv, capture/lab/P-node-loss/60-d-running.tsv, capture/lab/P-node-loss/85-tag-rescue-running-and-pending.tsv, capture/lab/P-node-loss/return-tag.tsv, capture/lab/P-node-loss/return-tag2.tsv, capture/lab/P-node-loss/return-b60.tsv, capture/lab/P-node-loss/return-balt.tsv; cmd/atenet/internal/router/ingress/parking.go (the 5 s parking budget) and cmd/ateapi/internal/controlapi/workflow_resume.go at v1.0.0., capture/lab/summary/remote-store-x86.json, capture/lab/summary/remote-postgres-x86.json, capture/lab/X-remote-store-pg/30-outage-stopped.tsv, capture/lab/X-remote-store-pg/30-outage-dropped.tsv, capture/lab/X-remote-store-pg/50-pg-tests/30-timeline.tsv, capture/lab/X-remote-store-pg/50-pg-tests/30-timeline-run2.tsv, capture/lab/X-remote-store-pg/50-pg-tests/33-probe.tsv, capture/lab/X-remote-store-pg/50-pg-tests/33-probe-run2.tsv, capture/lab/X-remote-store-pg/50-pg-tests/37-follow-up.txt, capture/lab/X-remote-store-pg/50-pg-tests/41-x-run-recovery.txt, capture/lab/X-remote-store-pg/50-pg-tests/42-x-run-router-restart.txt, capture/lab/X-remote-store-pg/50-pg-tests/47-worker-cache-lines.txt
