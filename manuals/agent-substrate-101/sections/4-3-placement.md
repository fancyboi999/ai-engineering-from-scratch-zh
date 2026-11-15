# 放置：哪个 worker 接管 actor

> `ate-api-server` 在每次恢复时挑选 worker：先过滤 worker，再随机取两个，把 actor 绑定到负载较低的那一个。

你的 actor 今天早上跑在一个 worker pod 上，午饭后又跑在另一个上。或者一个请求失败，报 `no worker has room for the actor`，而 `kubectl ate get workers` 却显示某个 worker 还有空闲 CPU。这两种情况原因相同：Substrate 在每次恢复时都会重新放置 actor，规则也并非 Kubernetes 调度器的规则。

读完本节，你能列出 worker 必须通过的过滤条件，并预测 actor 会在哪里恢复。你也能解释在 pool 未满时为何会出现 `no worker has room` 错误。

我们的大多数实测都在单节点上完成。为本节我们还搭建了一个集群，含一个控制平面节点和两个 worker 节点，并将其中一个 worker 节点停止了四次。有一项结果与代码给人的预期相反，本节会指明是哪一项。

## 两个调度器，两项工作 {#s-placement-two-schedulers-two-jobs}

Kubernetes 只在 pool 启动时把 worker pod 放到节点上一次。它完全看不到 actor。

Substrate 负责把 actor 放到 worker 上。调度器是 `ate-api-server` 内的一个函数。它在 `ResumeActor` 调用期间运行，从内存和 Postgres 读取 worker，不读取 Kubernetes API {{code}}。所以在我们的测试里，Kubernetes API server 宕机时放置仍在继续，如[依赖宕机时会怎样](#s-when-a-dependency-is-down)所示。

新 actor 没有 worker。`CreateActor` 写入一行记录，状态为 `ACTOR_STATE_SUSPENDED`，放置要等到第一个请求到来。挂起会再次释放 worker。

**放置（placement）：** 每次恢复时，为一个 actor 选定一个 worker 的过程。

## 过滤条件 {#s-placement-the-filters}

```figure
id: fig-4-3
kind: flow
title: ate-api-server 如何为一次恢复选择 worker
claim: worker 必须通过六项检查才能成为候选，之后调度器从随机两个候选中取负载较低的一个。
caption: 从左上角读起。每条横条是 worker 必须通过的一项检查。玫红色表示没有候选时的结果。青绿色是写入 Postgres 以绑定 actor。来源：cmd/ateapi/internal/scheduling/scheduling.go at v1.0.0。
```

当以下全部条件都满足时，worker 成为候选 {{code}}：

1. 它已注册，且状态为 `WORKER_STATE_ACTIVE`。
2. 它的沙箱类别与 actor 恢复所用快照的类别相同。
3. 若 actor 存在本地快照，它位于持有该本地快照的节点上。
4. 若快照包含内存，它的运行时能恢复这份内存快照。
5. 它所在 pool 的标签同时匹配模板和 actor 的 `workerSelector`。
6. 它有空位：一个空闲的 actor 名额，以及足以容纳该 actor 预订量的空闲 CPU 和内存。

没有候选时，调用失败并报 `no worker has room for the actor`。无论是哪条过滤条件剔除了最后一个 worker，返回的文案都相同。因此，该错误并不总是说明 pool 已满。它也可能意味着有空位的 worker 属于错误的沙箱类别，或者没有匹配的标签。

只有一个候选时，该 worker 直接接管 actor。有多个候选时，调度器随机抽取两个，保留负载较低的那个。worker 的负载取决于它最满的那个维度：actor 名额、CPU 或内存。

绑定是一次 Postgres 事务。它锁定 worker 的那一行，再次检查空位，然后写入分配记录。两个争夺最后一个名额的恢复调用不可能同时成功。落败的一方会换另一个 worker 重试。

## 我们的运行结果 {#s-placement-what-our-runs-showed}

我们在一个有两个 worker 的 pool 上创建了四个 actor，并逐一给每个发送一个请求。

```listing
title: 两个 worker 上的四个 actor
source: capture/lab/I-capacity/03-actors-when-full.txt
lang: text
note: 表头和前五行。其下挂起的 actor 已截去。
---
ATESPACE   NAME    TEMPLATE           STATE                   WORKER POD                       WORKER IPS    VERSION   AGE
lab-c      b0-1    lab-c/ballast-0    ACTOR_STATE_RUNNING     lab-c/ballast-65cf95d875-bzgjd   10.244.0.26   43        69s
lab-c      b0-2    lab-c/ballast-0    ACTOR_STATE_RUNNING     lab-c/ballast-65cf95d875-f65dl   10.244.0.27   3         68s
lab-c      b0-3    lab-c/ballast-0    ACTOR_STATE_RUNNING     lab-c/ballast-65cf95d875-bzgjd   10.244.0.26   3         66s
lab-c      b0-4    lab-c/ballast-0    ACTOR_STATE_RUNNING     lab-c/ballast-65cf95d875-f65dl   10.244.0.27   3         65s
lab-c      b0-5    lab-c/ballast-0    ACTOR_STATE_SUSPENDED   <none>                                         1         63s
```

actor 在两个 pod 之间交替分布。当有两个候选时，调度器每次都会比较两者，较空的那一个胜出。第五个 actor 找不到候选，因而保持挂起。

请求暂存（request parking）测试展示了规则的另一半。actor `p3` 当时正在等待 worker。当我们挂起 `p1` 时，`p3` 在 `p1` 刚刚用过的 pod 上恢复 {{run}}。actor 没有固定的常驻 worker。当时哪里有空位，它就去哪里。

### 跨两个节点 {#s-placement-across-two-nodes}

调度器比较的是 worker，不是节点。在有两个 worker 节点的集群上，pool 拥有四个 worker，每个节点各两个。我们创建了 20 个 actor，向每个发送一个请求，并让它们全部保持运行。

```listing
title: 20 个 actor 在两个节点、四个 worker 上的分布
source: capture/lab/L-gaps/multinode/52-placement-counts.txt
lang: text
---
node multi-worker 10
node multi-worker2 10
worker lab-n/ballast-5d6cf97747-xlw7d 6
worker lab-n/ballast-5d6cf97747-dpjlc 5
worker lab-n/ballast-5d6cf97747-5cmpq 5
worker lab-n/ballast-5d6cf97747-67bkm 4
```

**我们测得**这一分布，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），在 gVisor 上运行了 20 个 actor，测试一次。两个节点各分得 10 个 actor，四个 worker 分别得到 6、5、5 和 4 个。通过 CLI 完成一次创建加一次恢复耗时 0.95 到 1.19 秒，中位数为 1.00 秒。

## 上次挂起所在的节点 {#s-placement-the-node-of-the-last-suspend}

过滤条件 3 最容易让人意外。异步挂起之后，快照落在某个节点的磁盘上，actor 会记住那个节点。

```listing
title: 记住自己节点的 actor
source: capture/lab/B-lifecycle/22-actor-after-async-suspend.yaml
lang: yaml
note: status 中的两行。对象的其余部分已省略。
---
  assignedNode: kind-control-plane
  lastAssignedGeneration: 2
```

只要 `assignedNode` 不为空，就只有该节点上的 worker 能成为候选。原因是速度：从本地磁盘恢复省去了从对象存储下载。在我们的运行中，挂起后节点为 actor 保留本地快照 30 分钟，这是 `atelet` 标志 `--snapshot-detach-delay` 的默认值。超过该时间后该字段清空，任何节点都可以接管 actor。[快照保真度，以及快照存放在哪里](#s-snapshot-fidelity-and-where-a-snapshot-lives)给出了实测时间线。

在双 worker 节点的集群上，这条规则在每次恢复中都成立。

**我们测得**一个 actor 的表现，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），执行了五次异步挂起，每次之后发一次请求。全部 5 次恢复都落到了挂起所在的节点上。worker pod 在该节点的两个 worker 之间切换。随后我们对该节点执行 `kubectl cordon`。接下来的 2 次恢复依然落到该节点，耗时分别为 0.41 秒和 0.29 秒。

```listing
title: 在被 cordon 的节点上的两次恢复
source: capture/lab/L-gaps/multinode/60-sticky-cordon.tsv
lang: text
note: 跟踪记录中的六行，从执行 cordon 到第二次恢复。
---
2026-11-12T12:02:26.555Z	cordon	multi-worker2
2026-11-12T12:02:26.986Z	resume-call-while-cordoned	200	0.408920	count=8 mb=50 sum=6613 process_age_s=8.2
2026-11-12T12:02:27.433Z	resumed-on	multi-worker2 pod lab-n/ballast-5d6cf97747-xlw7d
2026-11-12T12:02:28.977Z	suspended-sync	ACTOR_STATE_SUSPENDED	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen8:multi-worker2
2026-11-12T12:02:29.292Z	resume-call-while-cordoned	200	0.293103	count=9 mb=50 sum=6613 process_age_s=9.0
2026-11-12T12:02:29.727Z	resumed-on	multi-worker2 pod lab-n/ballast-5d6cf97747-xlw7d
```

cordon 是 Kubernetes 用来限制新 pod 调度的标记，Substrate 调度器并不读取它。所以 cordon 不会把挂起的 actor 挡在节点之外。第四行还揭示了另一个事实。同步挂起后快照已经完整，而 actor 仍然指明那个节点。

当该节点已满而另一节点有空闲 worker 时，这条规则会带来代价。代码在同一次恢复调用里处理这种情形 {{code}}。`ate-api-server` 会要求该节点上的 `atelet` 上传快照并删除本地副本，然后再尝试其他节点。

**我们测得**这条路径一次，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），两个 worker 节点均在线。我们占满全部四个 worker，发往挂起 actor 的请求在 5.05 秒后返回 503，2 次请求均如此。响应体为 `no worker has room for the actor`，`ate-api-server` 日志将该步骤记为 `DetachFromFullNode`。随后我们在不持有快照的另一节点上释放了一个 worker。下一个请求在 0.61 秒内于该节点返回 200，actor 的计数接着延续。

排空（drain）走同样的路径。`kubectl drain` 之后，节点上没有 worker，但其 `atelet` 仍在运行。三个挂起的 actor 在收到各自的首个请求时于另一个节点恢复，耗时 0.49 到 1.19 秒。[依赖宕机时会怎样](#s-when-a-dependency-is-down)给出了全部五个排空案例。

## 节点停止时 {#s-placement-when-the-node-stops}

我们对代码的阅读原本认为，拥有持久快照的 actor 会忘记已宕机的节点，转而在另一个节点恢复。但我们的实测并未这样发生。我们四次停止了一个 worker 节点，每次 actor 处于不同状态。在每次运行中，另一节点上都有两个带空位的活跃 worker。

```figure
id: fig-4-3b
kind: timeline
title: 节点停止后的挂起 actor
claim: 拥有完整快照的挂起 actor 在已停止的节点上从首次请求起保持 RESUMING 状态 5 分 33 秒，随后变为 CRASHED。
caption: 从停止命令起从左向右读。各条轨道依次为节点、API 列出的两个 worker、actor u1 的状态，以及对应每个请求的色块。琥珀色表示步骤状态，玫红色表示失败。来源：capture/lab/L-gaps/multinode/70-stop-after-upload.tsv、capture/lab/L-gaps/multinode/96-controller-events.log、capture/lab/L-gaps/multinode/98-worker-state-rpcs.log。
```

首先看 Substrate 对节点的感知。

**我们测得**这一检测延迟，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），4 次停止全部如此。停止命令发出后的 43 到 51 秒内，已停止节点的 worker 依然显示为 `WORKER_STATE_ACTIVE`。之后它们才被标记为 `WORKER_STATE_UNAVAILABLE`，时间点与 Kubernetes 报告节点 `NotReady` 一致。Kubernetes 在 5 分钟后驱逐了 worker pod，Deployment 在另一节点上创建了两个新 pod。

```listing
title: ate-controller 如何得知 worker 已消失
source: capture/lab/L-gaps/multinode/96-controller-events.log
lang: json
note: 一行日志，出现在首次停止命令后 43 秒。
---
{"time":"2026-11-12T12:03:19.231654833Z","level":"INFO","msg":"Syncer: marking worker unavailable (pod not Ready)","worker":"090b9723-a53d-4e0c-a139-741942971a78","pod":"lab-n/ballast-5d6cf97747-67bkm"}
```

这行日志里的原因是 pod 未就绪（not Ready）。Substrate 是从 Kubernetes 得知节点已宕机，在我们的实测中，Substrate 内部没有任何组件能更早发现。在这 43 到 51 秒内，调度器仍可能把新的恢复分配给已消失节点上的 worker。

其次看四次运行中 actor 各自发生了什么。

| 节点停止时的 actor | 调用方看到的结果 | actor 状态 |
|---|---|---|
| 以 `--mode sync` 挂起，快照 `COMPLETED`，随后每隔数秒发一个请求 | 10 秒后收到 504（此时 Envoy 停止等待 router），之后在 5 到 8 秒后收到 503 `actor lab-n/u1 unavailable`。从停止命令发出 5 分 44 秒起，立即收到 503 `AssignWorker prerequisite not met` | 从首次请求起在已停止节点上处于 `RESUMING`，随后转为 `CRASHED` |
| 同上，但在停止命令后 31 秒且在任何请求前执行了 `revert` | `revert` 返回 `SUSPENDED` 且不关联节点。随后首次请求又将 actor 绑定到了已停止节点的 worker 上。10 秒后收到 504（此时 Envoy 停止等待），接下来的 19 次请求每次都收到 503 | 在我们探测的 2.5 分钟内一直在已停止节点上处于 `RESUMING` |
| 以默认模式挂起，快照 `PENDING`，请求持续 2 分钟后停止发送 | 收到 504，随后收到 503。首次请求后的 `revert` 失败：`another operation is in progress for this actor` | 停止命令发出 10 分 42 秒后仍处于 `RESUMING`，最后 8 分 43 秒内无请求。第二次 `revert` 失败：`not in a revertable state`。下一次请求时 actor 变为 `CRASHED`，距第二次尝试仅 0.6 秒。跟踪记录无法判断是二者中哪一个触发了变更 |
| 在节点上处于 `RUNNING` | 150 次请求全部收到 503：`upstream connect error or disconnect/reset before headers`。`revert` 失败：`while calling atelet Terminate` | 在我们探测的 10 分钟内保持 `RUNNING`，revert 失败后转为 `REVERTING` |

```listing
title: 第一次运行，从挂起到崩溃
source: capture/lab/L-gaps/multinode/70-stop-after-upload.tsv
lang: text
note: 跟踪记录中的七行。第二次请求与处于 RESUMING 状态的最后一次请求之间的 40 次请求已省略。
---
2026-11-12T12:02:36.103Z	suspended-sync	ACTOR_STATE_SUSPENDED	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:multi-worker2
2026-11-12T12:02:36.563Z	node-stop	docker stop multi-worker2
2026-11-12T12:02:46.908Z	node-stopped	multi-worker2
2026-11-12T12:02:57.202Z	probe	504	10.055616		|	ACTOR_STATE_RESUMING	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:multi-worker2
2026-11-12T12:03:07.214Z	probe	503	7.777073	actor lab-n/u1 unavailable	|	ACTOR_STATE_RESUMING	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:multi-worker2
…
2026-11-12T12:08:14.892Z	probe	503	5.051588	actor lab-n/u1 unavailable	|	ACTOR_STATE_RESUMING	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:multi-worker2
2026-11-12T12:08:20.312Z	probe	503	3.190662	actor lab-n/u1 unavailable: AssignWorker prerequisite not met for Actor: lab-n/u1 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)	|	ACTOR_STATE_CRASHED	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:multi-worker2
```

我们的客户端为每个请求设置了 12 秒超时。所以 10.06 秒出现的 504 来自数据平面，正好对应[第 4.4 节](#s-request-parking)描述的上限。我们起初误以为是自己的客户端超时。

**挂起的 actor 没有迁移到另一个节点。** 这一结果与我们对代码的阅读相反。在第一次运行中，快照已经完整保存在对象存储里，另一节点上也有两个空闲 worker。actor 依然绑定在已停止的节点上。它从首次请求起处于 `ACTOR_STATE_RESUMING` 达 5 分 33 秒，在停止命令发出 5 分 44 秒后变为 `ACTOR_STATE_CRASHED`。在我们的全部测试中，Substrate v1.0.0 从未自动将 actor 移出已宕机的节点。

`revert` 也未能解救 actor，三次运行中的 4 次尝试全部失败。第二次运行中，revert 执行得太早。已停止节点的 worker 当时仍列为活跃，下一个请求就选中了其中之一。第三次运行中，正在进行的恢复阻塞了两次尝试。第四次运行中，revert 需要调用已停止节点上的 `atelet`，actor 因此停留在 `ACTOR_STATE_REVERTING`。

这四次运行留下一个问题：如果在 worker 被标记为不可用之后再发送 `revert`，能否奏效？第二组 13 个节点停止案例回答了它：可以，但仅限一种 actor。

**我们测得**每个案例一次，环境是第二台 x86 服务器客户机（16 vCPU、23 GB）。集群拥有两个 worker 节点、Envoy 数据平面和默认计时器。第一个案例中，actor 以 `--mode sync` 挂起，且在节点停止后未收到任何请求。该节点的 worker 在 45 秒时显示为 `WORKER_STATE_UNAVAILABLE`。随后一次 `revert` 耗时 7.1 秒，返回无节点关联的 actor。下一个请求在 0.56 秒内于另一节点恢复了该 actor，计数从快照处继续。

```listing
title: 节点宕机期间唯一奏效的 revert
source: capture/lab/P-node-loss/10-a-quiet-revert.tsv
lang: text
note: 跟踪记录中的四行。各列依次为时间、距停止命令的秒数、事件及其细节。revert 打印的 actor 行已截去。
---
2026-11-12T12:53:34.330Z	t=0.7	node-stopped	multi-worker2
2026-11-12T12:54:18.228Z	t=44.6	workers-of-stopped-node-not-active	      2 WORKER_STATE_ACTIVE       2 WORKER_STATE_UNAVAILABLE 
2026-11-12T12:54:25.821Z	t=52.1	revert	7.1 s | ATESPACE   NAME   TEMPLATE           STATE                   WORKER POD   WORKER IPS   VERSION   AGE lab-n      a1     lab-n/ballast-50   ACTOR_STATE_SUSPENDED   <none>                    8         56s 
2026-11-12T12:54:26.821Z	t=53.1	first-request	200	0.560088	count=4 mb=50 sum=6613 process_age_s=4.9	|	ACTOR_STATE_RUNNING	multi-worker	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:-
```

适用条件非常苛刻。同一种 actor 若在停止命令发出 10 秒后执行 `revert`，会进入 `ACTOR_STATE_REVERTING` 并一直停在那里直到节点恢复。收到过请求的 actor 在处于 `ACTOR_STATE_RESUMING` 时被拒绝了 19 次（19 次中全部被拒）。快照处于 `PENDING` 的 actor 以及处于 `RUNNING` 的 actor，在首次 revert 时就会进入 `ACTOR_STATE_REVERTING`。在所有这些情况里，revert 都会调用已停止节点上的 `atelet`，而该调用必然失败。

有一条路径在所有状态下都奏效：在节点停止前就已经打好的标签。从该标签创建的新 actor 在创建命令发出 1.2 秒后就在另一节点上响应了首个请求，3 次救援全部成功。[依赖宕机时会怎样](#s-when-a-dependency-is-down)给出了每种情况的处置手册，[图 8.2d](#fig-8-2d)将其汇总在一页之内。如果没有标签，对于每个收到过请求的 actor，都要把节点停止视作一次服务中断。

已死节点上处于 `RUNNING` 状态的 actor 是最隐蔽的故障。它的状态在 10 分钟内毫无变化，从 actor 列表里完全看不出异常。[CRASHED 与 RevertActor](#s-crashed-and-revertactor) 列出了各种情形的错误文本。

节点恢复上线后，数秒内即变为 `Ready`。四次节点恢复中有三次，该节点上没有任何一个 pool pod，因为新 pod 已经在另一节点上跑起来了。Kubernetes 不会把它们迁回来，此后超过 3 分钟内都没有新 actor 分配到恢复后的节点。当我们手动删掉两个 pool pod 后，首个 actor 在节点启动后 23 到 35 秒落到了恢复的节点上。

第二组案例呈现出相同的分化，且覆盖了更多次节点恢复。在短于驱逐时间的宕机之后，节点保留了它的 pool pod。在五次节点恢复中，首个新 actor 于启动后 23 到 45 秒落到该节点。在更长时间的宕机之后，节点上没有任何 pool pod，七次节点恢复全部如此。在我们观察的 216 到 223 秒内，没有新 actor 落到该节点。Substrate 不会自动重平衡一个 pool。

**我们测得**另一个节点也没有空位的情形，在同一台客户机上运行了两次。`revert` 被接受，每个请求在 5 秒后收到 503，文案为 `no worker has room for the actor`，8 次请求全部如此。actor 保持在 `ACTOR_STATE_SUSPENDED`。一次运行中，我们在释放一个 worker 后 1.6 秒收到回复；另一次运行中，我们在对 pool 扩容后 1.7 秒收到回复。[依赖宕机时会怎样](#s-when-a-dependency-is-down)记录了这两次运行。

下一版将补充在第三个节点上配置备用 worker 的 pool，以及 microVM 类别下的节点丢失场景。还将补充节点存活但网络不可达的场景。

## 节点重启之后 {#s-placement-after-a-node-restart}

节点重启会一次性移走所有 worker。我们在 x86 服务器客户机的单节点上执行了两次重启测试。第一次运行在 pod 恢复后发了一个请求。第二次运行每隔 2 到 3 秒尝试一次恢复，并在每次尝试时列出 worker。

**我们测得**首次重启恢复过程，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），运行一次。Kubernetes API 在 8 秒后恢复响应，147 秒后所有 pod 均在运行。此时发给挂起 actor 的请求返回 503，文案为 `no worker has room for the actor`。约 80 秒后同样的请求返回了 200。

第二次运行解释了原因。

| 距重启命令的秒数 | 我们看到的现象 |
|---|---|
| 0 到 10 | 重启命令运行。 |
| 10 到 157 | `kubectl ate` 失败，提示 `no ready api pods in ate-system`。Kubernetes 从 18 秒起报告节点 `Ready`。 |
| 160 | `ate-api-server` 首次响应。它将全部 11 个 worker 列为 `WORKER_STATE_ACTIVE`。恢复失败，提示 `while calling atelet Restore`。 |
| 163 到 171 | 重启前的每个 worker 被标记为 `WORKER_STATE_UNAVAILABLE`。恢复失败，因为分配给 actor 的 worker `is unavailable`。 |
| 174 | 首次成功的恢复。 |
| 178 到 191 | worker 逐个恢复为 `WORKER_STATE_ACTIVE`。到 191 秒时，11 个 worker 全部变为活跃。 |

**我们测得**这一时间线，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），包含一次重启和一个挂起的 actor。每次轮询执行一次恢复尝试。

该机制分为三步。控制平面恢复后，它先返回重启前保存的 worker 列表。随后它把这些 worker 逐个标记为不可用。如 [WorkerPool](#s-workerpool) 所述，每个 worker 通过 `atelet` 注册后才重新变为活跃。在第二步和第三步之间，pool 中没有任何 worker 符合候选条件。

落在这个时间窗口内的恢复会因缺少空位或 worker 不可用而失败。在本次运行中该窗口持续了 10 到 30 秒。在第一次运行中，我们唯一的重试发生在 80 秒后，所以这个窗口看起来比实际更长。

恢复过程中耗时较长的是控制平面，而不是 worker。在总共 191 秒中，`ate-api-server` 占用了 160 秒。

节点重启后请按此规划：在 `ate-api-server` 响应前任何调用都不会成功，此后恢复调用仍可能继续失败约 30 秒。不要以“所有 pod 处于 Running 状态”作为恢复完成的信号。Kubernetes 起初显示的是旧的 pod 状态：10 秒时显示 0 个 pod 未运行，18 秒时则显示 21 个。

节点重启前正在运行的 actor 会进入 `ACTOR_STATE_CRASHED`，[CRASHED 与 RevertActor](#s-crashed-and-revertactor) 对此作了说明。节点持续宕机的情况则不同，如上表所示。我们没有在控制平面和 worker 分别位于不同节点的集群上重复这项重启测试。

## 用标签引导放置 {#s-placement-steer-placement-with-labels}

你有两个工具，两者都基于标签 {{docs}}：

- **pool 标签与选择器。** 在 `WorkerPool` 对象上设置标签，并在模板中通过 `workerSelector.matchLabels` 选中它。actor 可以加上自己的选择器，两者必须同时匹配。
- **pool 的节点规则。** pool 的 `spec.template.nodeSelector`、`tolerations` 和 `nodeAffinity` 决定 worker pod 调度到哪些节点。它们在任何 actor 存在之前就作用于 Kubernetes。

没有办法把单个 actor 固定到指定 worker，actor 之间也没有优先级。模板可以同时选中 CPU 类型不同的多个 pool，但这并不可取。一种 CPU 类型的内存快照并不总能在另一种上恢复。

```takeaways
- 把 no worker has room 读作“没有候选 worker”，然后排查类别、节点、标签和空闲容量。
- 做好心理准备：actor 在每次恢复后都可能落到不同的 worker 上。
- 在每个节点上留出空闲 worker，因为挂起的 actor 只在上次挂起所在的节点上恢复。
- 不要指望 cordon 或同步挂起能迁走挂起的 actor。
- 节点停止后，对收到过请求的每个 actor，都要按一次服务中断来处理。
- 只有当对应 worker 显示为 `WORKER_STATE_UNAVAILABLE` 后，才对静默且同步挂起的 actor 执行 revert。
- 为你无法承受丢失的每个 actor 保留一个标签，并用 `create actor --tag` 救援。
- 做好心理准备：被排空的节点会在挂起 actor 收到下一次请求时释放它们。
- 节点重启后，先等待 ate-api-server 恢复响应，再持续重试恢复操作 30 秒。
```

来源：capture/lab/summary/full-node-x86.json, capture/lab/summary/node-drain-x86.json, capture/lab/T-drain-store/70-f3-survivor-full-no-revert-request-only.tsv, capture/lab/T-drain-store/78-control-plane-events.log, capture/lab/I-capacity/03-actors-when-full.txt, capture/lab/I-capacity/14-workers-full.txt, capture/lab/I-capacity/15-actors-after.txt, capture/lab/B-lifecycle/22-actor-after-async-suspend.yaml, capture/lab/A-quickstart/60-state.log, capture/lab/D-durability/10-watch-part2.tsv, capture/lab/D-durability/40-node-reboot.tsv, capture/lab/D-durability/46-after-reboot-followup.txt, capture/lab/summary/timers-x86.json, capture/lab/summary/failures-x86.json, capture/lab/L-gaps/multinode/50-placement.tsv, capture/lab/L-gaps/multinode/52-placement-counts.txt, capture/lab/L-gaps/multinode/60-sticky-cordon.tsv, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/71-workers.txt, capture/lab/L-gaps/multinode/75-stop-after-upload-revert.tsv, capture/lab/L-gaps/multinode/80-stop-before-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/85-node-return.tsv, capture/lab/L-gaps/multinode/96-controller-events.log, capture/lab/L-gaps/multinode/97-k8s-node-events.txt, capture/lab/L-gaps/multinode/98-worker-state-rpcs.log, capture/lab/L-gaps/restart/10-poll.tsv, capture/lab/L-gaps/restart/11-workers-each-poll.txt, capture/lab/L-gaps/restart/23-ateapi.log, capture/lab/P-node-loss/10-a-quiet-revert.tsv, capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/20-b60-requests-revert-loop.tsv, capture/lab/P-node-loss/50-c-pending-snapshot.tsv, capture/lab/P-node-loss/60-d-running.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/P-node-loss/85-tag-rescue-running-and-pending.tsv, capture/lab/summary/node-loss-x86.json; cmd/ateapi/internal/scheduling/scheduling.go, cmd/ateapi/internal/controlapi/workflow_resume.go, cmd/ateapi/internal/controlapi/workflow_resume_detach.go, cmd/ateapi/internal/store/atepg/worker_assignment.go, cmd/atelet/main.go at v1.0.0; docs/reference/api-guide.md, docs/reference/sandbox-classes.md at v1.0.0.
