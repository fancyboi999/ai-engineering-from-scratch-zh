# 为 pool 规划容量

> 你声明的 limit 决定同一时刻能运行多少 actor，而磁盘决定你能保留多少挂起的 actor。

有人问你的集群能容纳多少 agent。这个问题有两个答案，两者相差数个数量级。一个答案是同一时刻运行的 actor 数量。另一个是已经存在、处于挂起状态等待的 actor 数量。

读完本节，你能为一个 pool 计算出这两个数字，并选定 worker 的 limit。你还能说出哪种资源会最先耗尽。

## 运行中的 actor：声明 limit 的算术规则 {#s-sizing-a-pool-running-actors-the-arithmetic-of-declared-limits}

worker 会上报容量，每个运行中的 actor 预订其中的一部分。[WorkerPool](#s-workerpool) 展示了容量的来源。预订量等于 ActorTemplate 声明的 limit，加上沙箱运行时上报的内存开销 {{code}}。调度器从不看 actor 实际用了多少。

单个 worker 能运行的 actor 数量是以下三个值中的最小值：

- worker 的 CPU limit 除以 actor 的 CPU limit
- worker 的内存 limit 减去 64 MiB，再除以 actor 的内存预订量
- 1,000，即 `--max-actors` 的默认值

```figure
id: fig-4-5
kind: comparison
title: 每个 worker 运行的 actor 数取决于 worker 上报的 CPU
claim: 两个 CPU limit 为 2 的 worker 运行了四个单 CPU actor，而一个无 limit 的 worker 在 16 vCPU 节点上运行了十六个。
caption: 每个绿色方块代表一个声明 1 CPU 的运行中 actor。玫红色方块代表未找到空位的 actor。琥珀色方块代表经历等待的轮次。两列分别对应两台不同的测试机器。来源：capture/lab/I-capacity/02-workers-when-full.txt、capture/lab/K-kagent/parallel/workers-during.txt。
```

**我们测得**左侧一列的数据，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。pool 包含两个 worker，limit 为 2 个 CPU 和 3 GiB。每个 actor 声明 1 个 CPU 和 256 MiB。四个 actor 运行起来，每个 worker 上两个。需要第五个运行中 actor 的八个请求全部返回 503。瓶颈在于 CPU：每个 worker 只预订了 3008Mi 中的 512Mi。

**我们测得**右侧一列的数据，环境是第二台 x86 服务器客户机（16 vCPU、31 GB），来自 kagent 运行。kagent 的 pool 未设置 limit，每个 actor 声明 1 个 CPU 和 1 GiB。我们同时启动了 24 个轮次，运行一次。worker 达到了 16 个运行中 actor 以及 16000/16000 millicores，其余 8 个轮次进入等待。全部 24 个轮次最终完成，耗时 4.3 到 7.8 秒。同时启动 8 个轮次时，全部 8 个在 2.5 到 3.6 秒内完成。

[第 7.1 节的并发轮次图表](#fig-7-1c)展示了两次运行中每个轮次的耗时。

第二个结果看起来像是白得的容量，实则相反。那个 worker 把节点的全部 CPU 都许诺给了 actor，而控制平面也跑在同一个节点上。请像 [WorkerPool](#s-workerpool) 解释的那样设置 limit。

模板中的 CPU 值用于放置时的资源预订，worker 也会将其作为 CPU 配额写入沙箱 {{code}}。该配额是硬上限。

**我们测得**四种 limit 下的固定工作量，环境是第二台 x86 服务器客户机（16 vCPU、23 GB）。八行数据中每行运行三次。在 250、500 和 1000 millicores 下，无论 1 个线程还是 4 个线程，actor 分别使用了 0.25、0.50 和 1.01 个宿主机核心。在 2000 millicores 下，1 个线程使用 1.12 个核心，4 个线程使用 1.96 到 2.01 个核心。同一份工作在 250 millicores 下耗时 27.1 到 27.6 秒，在 1000 millicores 下耗时 4.9 到 5.4 秒。

[WorkerPool](#s-workerpool) 中有完整的表格和图表。

因此较低的 limit 能在一个 worker 上塞进更多 actor，但每个 actor 忙碌时也会等比例变慢。应按单轮所需的 CPU 来定这个值，而不是按平均值。actor 在任何 limit 下都依然看到 2 个 CPU，因此需要在模板里自行设置线程数。同一 worker 上同时运行多个繁忙 actor 的测试留待下一版补充。

在 pool 容量范围内的突发恢复成本很低。

**我们测得**同一瞬间的 16 次恢复，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），五轮共 80 个请求。中位数耗时为 0.37 秒，而单独一次恢复为 0.23 秒，全部 80 个请求均返回 200。[请求暂存](#s-request-parking)中附有该图表。

已死亡的 actor 仍算作运行中。进程已经退出的 actor 会停留在 `ACTOR_STATE_RUNNING`，并继续保留其资源预订。在我们观察的 20 分钟内，两个这样的 actor 各自占着 worker 的 1,000 millicores。随后 32 次突发恢复在容量为 16 的 pool 中只找到了 14 个空位。[CRASHED 与 RevertActor](#s-crashed-and-revertactor) 说明了如何发现并释放它们。

其他人的两份报告有助于确定 actor 的 CPU limit。这两项测试我们均未重复运行。

一位贡献者在 issue 3441 中测量了满额预订的 worker 上的真实 CPU 用量 {{issue #3441}}。七个各声明 1 CPU 的 actor 合计使用的中位数在 0.55 到 0.8 个核心之间。因此过于宽裕的 limit 会浪费 worker 的大部分容量，因为 Substrate v1.0.0 不支持超配。

一位用户在 v1.0.0 候选发布版上测量了恢复时间与 actor CPU limit 的关系，见 issue 3431 {{issue #3431}}。在 50 millicores 下中位数为 0.46 秒，100 millicores 下为 0.23 秒，250 millicores 及以上约为 0.15 秒。低于 250 millicores 的 limit 能省出容量，代价是拖慢恢复时间。

## 挂起的 actor：分布在三处的磁盘占用 {#s-sizing-a-pool-suspended-actors-disk-in-three-places}

挂起的 actor 在 worker 上不预订任何资源。你能保留的挂起 actor 数量远多于运行中数量。它们每一个都消耗磁盘。

[第 3.4 节的占用空间图表](#fig-3-4c)以条形图展示了这些大小。

**我们测得** 25 个挂起 actor 的磁盘占用，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），取样一次。这些 actor 共持有 8,750 MiB 内存。节点持有 8,801 MiB 快照，对象存储持有 10,824 MiB。删除这些 actor 后，节点持有 1 MiB 快照，对象存储持有 2,064 MiB。两次采样中节点上都保留了 1,765 MiB 的缓存。

从这些数字里可以得出三条规则：

- **内存快照的大小等于存有数据的内存大小。** 持有 200 MiB 随机字节的 actor 生成了 201.9 MiB 的快照。随机字节是最坏情况。同一个 actor 若持有 200 MiB 全零字节，快照仅为 4.0 MiB；若各占一半，则为 103.8 MiB。在 microVM 类别下，快照还包含客户机本身，体积大出 59 到 70 MiB，见[沙箱类别](#s-sandbox-classes)。
- **有 30 分钟你需要付出两倍空间。** 在默认计时器下，节点在挂起后将本地副本保留 30 分钟。对象存储在 5 分钟后拥有第二份副本。[快照保真度，以及快照存放在哪里](#s-snapshot-fidelity-and-where-a-snapshot-lives)给出了时间线。
- **黄金快照会留存下来。** 余下的 2,064 MiB 属于那五个模板。删除 actor 不会释放这部分空间。

因此，单节点为快照所需的磁盘空间，等于 30 分钟内的挂起次数乘以快照大小。一个每半小时挂起 200 个各占 200 MiB 的 actor 的节点，单是快照就需要 40 GiB。快照目录是节点上的一个路径，Kubernetes 不会将其计入任何 pod 的配额。

对于跨节点的 pool，请逐个节点单独规划容量。在默认计时器下，挂起的 actor 在 30 分钟内只在上次挂起所在的节点上恢复。在我们的双 worker 节点测试中，没有任何 actor 迁离停止的节点。当节点恢复上线时，Kubernetes 把新的 worker pod 留在了另一节点上。[放置](#s-placement)记录了这些运行。

## 同一时刻的大量恢复 {#s-sizing-a-pool-many-resumes-at-one-time}

即使 pool 中有空闲 worker，它启动 actor 的速率仍有上限。我们向单个节点发送了突发恢复并记录了每个请求的耗时。[图 4.5b](#fig-4-5b)展示了两次运行中的全部请求。

```figure
id: fig-4-5b
kind: chart
title: 单节点上同一时刻的恢复
claim: 单节点处理同一时刻 50 到 300 次恢复时，每秒完成 32 到 39 次，等待时间随突发规模线性增长。
caption: 左图中每条线代表一次突发，请求按首个响应到最后一个响应排序。每条线穿过其中 31 个请求。横轴上的规模未按比例绘制。右图给出每次突发的速率与突发规模的关系。虚线是项目网站宣称的 0.5 秒。第二次运行中有四个请求在 90 秒内未收到应答，未在图中绘出。来源：capture/lab/summary/scale-x86.json、capture/lab/summary/bursts-one-node-x86.json。
```

**我们测得**第一次运行，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。集群有一个 kind 节点和一个包含 200 个 gVisor worker 的 pool。actor 是一个 limit 为 128 MiB 的 Python 计数器，每个 actor 在节点上都有自己的快照。pod 内的单个客户端进程通过一到两条 HTTP/2 连接向 router 发送每次突发。每个突发规模运行三次，全部 933 个请求均返回 200。

| 同一时刻恢复数 | 每次突发的中位数 | 最慢请求 | 每秒恢复数 |
|---|---|---|---|
| 1，连续 30 次 | 0.36 s (0.33 到 0.40) | 0.40 s | 非突发 |
| 10 | 0.38 到 0.40 s | 0.43 s | 23 到 24 |
| 50 | 1.16 到 1.34 s | 1.38 s | 36 到 38 |
| 100 | 2.21 到 2.26 s | 2.73 s | 36 到 39 |
| 150 | 3.16 到 3.42 s | 4.14 s | 36 到 38 |

速率在大约每秒 37 次恢复时停止上升。超过这一点后，更大的突发只会排队等待更久，两倍规模的突发需要两倍时间。从黄金快照首次启动处于相同速率：分三波启动 150 个新 actor 时，每秒完成 34 到 38 次。

**我们测得**在同一台客户机上的第二次运行，使用 pod 上限为 700 的全新 kind 节点。pool 以每次 50 个的步长从 50 个 worker 扩到 300 个，每一步都在 17 到 21 秒内就绪。每一步中，Kubernetes API 响应 `/readyz` 的中位数为 105 到 108 毫秒，可见 300 个 worker 并没有拖慢它。actor 仍是同一个计数器，每个请求各自建立一条连接。单次恢复的中位数耗时为 0.35 秒（共 20 次恢复）。

| 同一时刻恢复数 | 突发次数 | 每次突发的中位数 | 95 分位值 | 每秒恢复数 |
|---|---|---|---|---|
| 150 | 3 | 3.15 到 3.55 s | 3.83 到 4.09 s | 35 到 39 |
| 200 | 2 | 4.33 和 4.55 s | 5.42 和 5.61 s | 35 和 36 |
| 300 | 2 | 7.29 和 7.42 s | 9.10 和 9.17 s | 32 和 32 |

在这些突发的 1,450 个请求中，有 1,448 个返回 200。其余两个在 90 秒内未收到应答，速率按截至最慢应答时已完成的请求数计算。分批首次启动 300 个新 actor（每批 150 个）的速率为每秒 30 和 34 次。因此从同一时刻 50 到 300 个恢复，速率稳定在每秒 32 到 39 次，在 300 时略有回落。

## 是什么决定了该速率 {#s-sizing-a-pool-what-sets-that-rate}

[图 4.5c](#fig-4-5c)展示了 worker 内部的恢复过程，这是单次恢复中耗时最长的步骤。

```figure
id: fig-4-5c
kind: chart
title: 每个 actor 单独恢复与突发中恢复时的 worker 内部恢复耗时
claim: 在突发中大约 100 次恢复同时运行，每次耗时约为单独恢复时的十倍。
caption: 第一列是逐个发送的 20 次恢复，每次一个点。其余各列是 134 到 150 次恢复的突发，箱线图展示其恢复耗时。箱线上方的数字是同一时刻进行中的恢复数量中位数。200 和 300 的突发未录入日志。来源：capture/lab/summary/restore-limit-x86.json。
```

**我们测得**第二次运行中的这一数据，取自 `atelet` 的恢复日志和每秒采样的各进程 CPU。单独执行时，worker 内部恢复的中位数耗时为 0.27 秒（共 20 次恢复）。在八次突发中，同一时刻正在进行的恢复数量中位数达到 75 到 116 次。每次恢复在 worker 内部的中位数耗时升至 2.1 到 2.9 秒，每次突发每秒完成 35 到 41 次恢复。可见没有任何机制限制同时启动多少次恢复，而当大约 100 个恢复并发运行时，每一个都会变慢。

在 13 次没有挂死请求的突发中，我们逐一排除了可以调整或观测的组件：

- `ate-api-server`：在 1、2 和 4 个副本下，速率分别为每秒 36 到 37、35 到 39 以及 32 到 36 次。突发期间它平均使用 0.24 到 0.39 个核心，没有任何线程超过 0.06 个核心。
- router：在 1 个 `atenet-router` 副本下速率为 35 到 39，在 4 个副本下为 35.5 和 36.3。
- Postgres、`kube-apiserver` 和 etcd：各自平均使用不到 0.25 个核心，没有任何线程超过 0.07 个核心。
- 客户端：一个或四个 curl 进程给出的速率相同。每个请求单独建连与第一次运行中的一两条连接对比也一样。
- 节点：突发期间 24 个核心中平均有 9.5 到 11.4 个核心忙碌，峰值为 14 到 16 个。在记录了 I/O 等待的突发中，平均 I/O 等待为 0.02 到 0.12 个核心。

最繁忙的进程是 gVisor 沙箱（平均 2.1 到 2.9 个核心）和 worker 进程（1.5 到 2.2 个核心）。因此瓶颈出在节点上，就在并发运行的 gVisor 恢复内部。纯 CPU 算力、磁盘等待和 Substrate 控制平面都已排除。本版未测量其根因，下一版会补测。客户机内核或 gVisor 内部的锁竞争，以及嵌套虚拟化的开销，都是可能的原因。我们确定瓶颈不在哪里，但还不太确定它具体在哪里。

## ate-api-server 的更多副本 {#s-sizing-a-pool-more-replicas-of-ate-api-server}

**我们测得**在四个 `ate-api-server` 副本下的两次 150 并发突发，属于第二次运行。300 个请求中有 33 个返回 500，3 个返回 503。内置 Postgres 只允许 100 个连接，四个副本耗尽了连接数。API server 记录了 `FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute (SQLSTATE 53300)` 和 `FATAL: sorry, too many clients already`。它的参数里没有设置连接池大小的标志。

八个 actor 最终处于 `ACTOR_STATE_CRASHED`，一次 `revert` 在 0.33 到 0.38 秒内把它们各自拉回。另有两个 actor 停留在 `ACTOR_STATE_RESUMING` 至少 4 分钟，见[第 8.2 节](#s-when-a-dependency-is-down)。

**我们的判断：** 使用内置 Postgres 时，请保留安装器默认的两个 `ate-api-server` 副本。更多副本既没提高单节点速率，四个副本还导致恢复失败和 actor 崩溃。如果为了高可用需要更多副本，请先调高 Postgres 的连接上限。下一版计划补测这一改动。

## 存储的 actor 数量 {#s-sizing-a-pool-the-count-of-stored-actors}

存储的 actor 数量并未改变这些数字。在第一次运行中，我们将 Postgres 中的 actor 行数增加到了 10,750 行。在四种规模下（各测试 10 次恢复），单次恢复的中位数耗时都在 0.36 到 0.38 秒。10,750 行时数据库大小为 20 MB，`kubectl ate get actors` 耗时 0.86 秒。创建速率为每秒 76 到 86 个，10,000 次创建无一失败。

**我们的判断：** 按突发流量规划 pool，而不要只按峰值总数规划。如果在我们这样的单节点上同一秒唤醒 100 个会话，最后一个大概要等 2.7 秒。如果是 300 个，大概要等 9 秒。请在客户端把大量 actor 的唤醒时间错开。增加节点是另一种办法。在下一版实测之前，请自行测量该速率。

两个上限让测试停了下来。这种挂起 actor 每个在节点磁盘上保留 12.9 MB，450 个之后客户机就只剩 3.9 GB 可用空间。我们也停在了 10,750 行，低于原计划的 20,000 行。在第二次运行中，300 个快照的延迟上传在一分钟内把客户机磁盘从 4.9 GB 压到了 4.0 GB。因此同一时刻 200 和 300 的突发各只跑了两次，而不是三次。空闲 worker 的内存占用中位数为 16.7 MB（在 200 个 worker 中测得）。

## 没有自动扩缩器 {#s-sizing-a-pool-no-autoscaler}

Substrate v1.0.0 中没有任何修改 `spec.replicas` 的代码 {{code}}。`WorkerPool` 拥有 `scale` 子资源，因此 HorizontalPodAutoscaler 或你自己的控制器可以修改副本数。控制器为此发布了 `ate.workerpool.desired_workers` 和 `ate.workerpool.ready_workers` 指标 {{docs}}。下一版计划补测使用自动扩缩器的运行情况。

请按没有自动扩缩器来规划。[请求暂存](#s-request-parking)只保留请求 5 秒。不要指望新的 worker pod 能在这段时间内启动并完成注册。

**我们测得**两次这样的启动，各一次。在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上，包含 200 个 worker 的新 pool 在 75 秒后就绪。在第二台 x86 服务器客户机（16 vCPU、23 GB）上，当一个请求正在等待空位时，我们将 pool 从 4 个 worker 扩容到 6 个。该请求用时 1.55 秒返回 200，时间点就在扩容命令发出后的 1.7 秒。两个集群的节点上都已提前缓存了 worker 镜像，所以这些数字不含首次拉取镜像的耗时。

按运行中 actor 的峰值来定 pool 的大小，并留出余量。

## 他人在大规模下的报告 {#s-sizing-a-pool-what-others-reported-at-scale}

我们最大的集群有两个 worker 节点。我们最大的测试量是在单节点上存入 10,750 行 actor，其中 150 个拥有自己的快照。项目网站宣称密度是容器运行时的 `10×`。文档给出了基准测试方法，但未给出结果。我们测量了该宣称的两个侧面，未与容器运行时作对比。挂起 actor 不占用 worker 且消耗 12.9 MB 节点磁盘，空闲 worker 消耗 16.7 MB 内存。

以下报告来自 Substrate 的 issue 跟踪器。由各作者自行运行，我们未做验证。

| 报告 | 条件 | 结果 |
|---|---|---|
| Issue 3479，无 limit 的 pool {{issue #3479}} | 320 个 worker，每台 8 vCPU 节点 8 个，pool 无 limit | 每个 worker 都注册了整个节点，因此放置从未拒绝过任何 actor |
| Issue 3408，单节点密度 {{issue #3408}} | 单节点 192 vCPU 和 503 GiB，gVisor，开发构建版 | 到 6,200 个 actor 时，1,187 个沙箱死亡而所有 actor 仍为 RUNNING。换用更新的 gVisor 构建版后，5,600 个 actor 运行无死亡，到 6,000 个时节点内存耗尽 |
| Issue 3702，高负载下的 Postgres {{issue #3702}} | 9,000 个 actor 处于创建与删除循环，900 个 worker，v1.0.0-rc.1 | Postgres 占用了 64 核中的 53 到 60 核。首个命令在创建后 4 到 18 秒到达。扩到 2,700 个 worker 后等待消失 |
| Issue 3101，异步挂起后的磁盘占用 {{issue #3101}} | 50 GB 节点磁盘，10 次各 512 MB 的挂起 | kubelet 先后驱逐了两个 worker pod 和 `atelet`，节点在 34 分钟以上处于磁盘压力状态 |

把上表读作四个相互独立的瓶颈：缺少 limit、节点内存、Postgres 行锁和节点磁盘。每一个都在 CPU 耗尽之前率先出现。Postgres 报告还多了一条设计提示：在该规模下，许多较小的 worker 比少数较大的 worker 表现更好，大约每个 worker 3 个 actor，而不是 10 个。

## 操作步骤 {#s-sizing-a-pool-a-procedure}

1. 测量单个 actor 的峰值内存，并将模板 limit 设得略高于该值。
2. 将 actor 的 CPU limit 设为 250 millicores 或更高。
3. 选定每个 worker 承载的 actor 数量。将 worker limit 设为该数量乘以单个 actor 的预订量，再加 64 MiB。在 `microvm` 上，内存预订量是 limit 加上额外开销，我们的运行中为 7.6 MiB。
4. 将 `replicas` 设为运行中 actor 峰值除以该数量，再加上备用 worker。
5. 按 30 分钟的快照量规划节点磁盘，并持续监控它。

```takeaways
- 按声明的 limit 计算每个 worker 运行的 actor 数量，绝不按实际用量算。
- 把进程已死亡的 actor 算作运行中，直到挂起把它标记为崩溃。
- 将 actor CPU limit 保持在 250 millicores 或以上，以保障恢复时间。
- 按 30 分钟内的挂起次数乘以快照大小来定节点磁盘容量。
- 按峰值来定 pool 的大小，因为 Substrate 没有自动扩缩器。
- 按单节点每秒约 37 次恢复来规划，并在时间上错开更大规模的唤醒。
- 使用内置 Postgres 时保持两个 ate-api-server 副本，因为四个副本耗尽了连接。
- 先紧盯节点内存、节点磁盘和 Postgres，再考虑增加 CPU。
```

来源：capture/lab/summary/scale-x86.json, capture/lab/summary/bursts-one-node-x86.json, capture/lab/summary/restore-limit-x86.json, capture/lab/Z-bursts/10-run/20-concurrency.tsv, capture/lab/Z-bursts/00-setup/20-growth.tsv, capture/lab/Z-bursts/10-run/51-restore-concurrency.txt, capture/lab/Z-bursts/10-run/40-errors/40-postgres.log, capture/lab/Z-bursts/10-run/43-ateapi-pool-settings.json, capture/lab/summary/full-node-x86.json, capture/lab/U-pg-upgrade-scale/40-scale/10-run/20-concurrency.tsv, capture/lab/U-pg-upgrade-scale/40-scale/10-run/30-rows.tsv, capture/lab/U-pg-upgrade-scale/40-scale/00-setup/30-setup.log, capture/lab/summary/microvm-x86.json, capture/lab/summary/validation-parallel-x86.json, capture/lab/summary/validation-memory-x86.json, capture/lab/summary/demos-x86.json, capture/lab/summary/cpu-limit-x86.json, capture/lab/Q-network/n-cpu-limit/40-work.tsv, capture/lab/V-validation/03-parallel-resume/11-workers-before-32.txt, capture/lab/V-validation/11-process-exit-long-watch/11-workers-end.txt, capture/lab/N-demos/tool-sandbox/tasks.tsv, capture/lab/L-gaps/multinode/52-placement-counts.txt, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/85-node-return.tsv, capture/lab/I-capacity/01-unplanned-full-pool-503.tsv, capture/lab/I-capacity/02-workers-when-full.txt, capture/lab/I-capacity/03-actors-when-full.txt, capture/lab/C-resume-vs-size/pool.yaml, capture/lab/C-resume-vs-size/tmpl-0.yaml, capture/lab/C-resume-vs-size/20-storage-footprint.txt, capture/lab/C-resume-vs-size/23-storage-after-delete.txt, capture/lab/summary/footprint-x86.json, capture/lab/summary/parking-x86.json, capture/lab/K-kagent/parallel/workers-during.txt, capture/lab/K-kagent/parallel/states-during.txt, capture/lab/K-kagent/parallel/timings.tsv, capture/lab/K-kagent/inventory/workers-end.txt, capture/lab/D-durability/10-watch-part1.tsv, capture/lab/E-dependency-loss/00-setup.log, capture/lab/E-dependency-loss/22-actors-5min-later.txt; cmd/ateapi/internal/scheduling/scheduling.go, cmd/ateworker-gvisor/memory.go, cmd/ateworker-gvisor/main.go, api/infra/k8s/ate/v1/workerpool_types.go, cmd/atelet/main.go at v1.0.0; docs/reference/api-guide.md, docs/guides/observability.md, docs/guides/node-storage.md, docs/guides/benchmarking.md, site/layouts/_shortcodes/home.html at v1.0.0; issues https://github.com/agent-substrate/substrate/issues/3479, https://github.com/agent-substrate/substrate/issues/3408, https://github.com/agent-substrate/substrate/issues/3702, https://github.com/agent-substrate/substrate/issues/3101, https://github.com/agent-substrate/substrate/issues/3441, https://github.com/agent-substrate/substrate/issues/3431.
