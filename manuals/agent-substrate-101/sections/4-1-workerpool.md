# WorkerPool

> WorkerPool 是一组由你定大小的 worker pod，每个 pod 按自己的 CPU 和内存 limit 上报容量。

你创建一个 actor，给它发一个请求，然后去找它的 pod。集群里没有以 actor 命名的 pod。actor 运行在一个 worker pod 里，这个 pod 在 actor 出现之前就已存在，还同时承载其他 actor。创建这个 pod 的对象就是 `WorkerPool`。

读完本节，你能写出一个 `WorkerPool`，读懂 `kubectl ate get workers` 的输出，并说清每个容量数字的来源。

## 三个 CRD，其中没有 Actor {#s-workerpool-three-crds-and-no-actor-among-them}

**WorkerPool：** 一个带命名空间的 Kubernetes 对象，用来申请若干个同一沙箱类别的 worker pod。

Substrate 向集群添加三个 CRD，都在 `ate.dev` 组、`v1` 版本下。你经常要写的只有 `WorkerPool`。`SandboxConfig` 为一个沙箱类别指定沙箱二进制文件，安装时会为每个类别创建一份默认配置。`CSIDriverConfig` 属于外部卷的预览功能。

```listing
title: 安装后的 CRD
source: capture/lab/A-quickstart/60-state.log
lang: text
note: 快速上手之后我们导出了状态，这里取其中三行。
---
csidriverconfigs.ate.dev   Cluster      v1(storage)   2026-11-12T10:05:33Z
sandboxconfigs.ate.dev     Cluster      v1(storage)   2026-11-12T10:05:33Z
workerpools.ate.dev        Namespaced   v1(storage)   2026-11-12T10:05:33Z
```

列表里没有 Actor、ActorTemplate 和 atespace。它们是 `ate-api-server` 提供服务的 Postgres 行，所以 `kubectl get` 看不到 {{run}}。用 `kubectl` 管理 pool，用 `kubectl ate` 管理运行在 pool 上的一切。

## 我们使用的 pool {#s-workerpool-the-pool-we-used}

本手册大部分实测都基于这个 pool。它申请两个 gVisor worker，每个 2 个 CPU、3 GiB 内存。

```listing
title: 带两个 worker 的 WorkerPool
source: capture/lab/C-resume-vs-size/pool.yaml
lang: yaml
note: pool 上方的 Namespace 对象已省略。
---
apiVersion: ate.dev/v1
kind: WorkerPool
metadata:
  name: ballast
  namespace: lab-c
  labels:
    workload: ballast
spec:
  replicas: 2
  workerImage: localhost:5001/ateworker-gvisor@sha256:ad6957f41bccaa8bb5f3eb5b34b7812babb862f1a3187a11578c21a7d799491c
  sandboxClasses:
  - name: gvisor
  template:
    resources:
      limits:
        cpu: "2"
        memory: 3Gi
      requests:
        cpu: 500m
        memory: 3Gi
```

四个字段承载了主要含义 {{code}}：

- `spec.replicas` 是 worker pod 的数量。pool 有 `scale` 子资源，所以 `kubectl scale` 和自动扩缩器都能修改它。
- `spec.workerImage` 是该类别的 worker 二进制镜像。`gvisor` 用 `ateworker-gvisor`，`microvm` 用 `ateworker-microvm`。
- `spec.sandboxClasses` 在 v1.0.0 只接受一个条目，之后不能改它的 `name`。[沙箱类别](#s-sandbox-classes)对比了这两种类别。
- `spec.template.resources.limits` 是每个 worker 的容量。它是这个对象里最重要的字段。

标签 `workload: ballast` 写在 pool 对象上，位于 `metadata.labels` 下。ActorTemplate 用 `workerSelector.matchLabels` 选择 pool，匹配读取的是 pool 对象的标签。`spec.template.labels` 下的标签会落到 Deployment 及其 pod 上，不影响 pool 接受哪些 actor {{code}}。

选择器是模板与 pool 之间唯一的连接。pool 所在的命名空间和 Kubernetes RBAC 都不限制哪些模板能选中它 {{code}}。actor 可以加上自己的 `workerSelector`，它会收窄模板的选择器，并在下一次恢复时生效。给每个 pool 打一个只有目标模板才会使用的标签。

## 从 pool 到已注册的 worker {#s-workerpool-from-the-pool-to-a-registered-worker}

```figure
id: fig-4-1
kind: flow
title: 从 WorkerPool 到两个已注册的 worker
claim: WorkerPool 变成由 worker pod 组成的 Deployment，每个 pod 又变成一条 Worker 记录，并把 pod 的 limit 作为容量上报。
caption: 从左往右读。灰色是 Kubernetes，蓝色是 Substrate 控制平面，紫色是 worker 一侧。每个 worker 下方的数字是 kubectl ate get workers 的一行。来源：capture/lab/C-resume-vs-size/pool.yaml、capture/lab/I-capacity/02-workers-when-full.txt。
```

从你的 YAML 到一个能接收 actor 的 worker，要经过四步 {{code}}：

1. `ate-controller` 读取 `WorkerPool`，写出副本数相同的 Deployment。每个 pod 带有标签 `ate.dev/worker-pool`。
2. `ate-controller` 监视这些 pod，并在 `ate-api-server` 中为每个 pod 创建一条 Worker 记录。记录的名字是 pod 的 UID。
3. 节点上的 `atelet` 注册 worker，并上报它能运行哪些沙箱运行时。
4. pod 变为 Ready 后，Worker 进入 `WORKER_STATE_ACTIVE`。只有活跃的 worker 才会收到 actor。

**Worker：** `ate-api-server` 中对应一个 worker pod 的记录，包含它的状态、容量，以及 actor 已在它上面预订的资源。

Worker 有三种状态。`WORKER_STATE_UNAVAILABLE` 表示已注册但未 Ready。`WORKER_STATE_ACTIVE` 表示可以接收 actor。`WORKER_STATE_DRAINING` 表示 pod 正在终止，worker 一旦进入该状态就不会离开。

终止中的 worker pod 故意很慢。控制器把它的终止宽限期设为 3,600 秒，worker 最多给它的 actor 30 分钟来停止 {{code}}。对带有运行中 actor 的 pool 做滚动更新，可能要等这么久。

## `kubectl ate get workers` 显示什么 {#s-workerpool-what-kubectl-ate-get-workers-shows}

我们在 pool 上运行着四个 actor、每个占 1 个 CPU 时执行了这条命令。

```listing
title: 两个 worker 都已满
source: capture/lab/I-capacity/02-workers-when-full.txt
lang: text
---
NAME                                   POOL      STATE                 ACTORS   CPU(MILLICORES)   MEMORY         POD                              AGE
b17a6492-9643-42f1-bfdb-8bb88ee46772   ballast   WORKER_STATE_ACTIVE   2/1000   2000/2000         512Mi/3008Mi   lab-c/ballast-65cf95d875-bzgjd   114s
ee4ba8b4-dbfa-4555-a621-7cf7662c1091   ballast   WORKER_STATE_ACTIVE   2/1000   2000/2000         512Mi/3008Mi   lab-c/ballast-65cf95d875-f65dl   114s
```

中间三列都是一对数字：先是已预订量，再是容量。

| 列 | 容量来源 | 我们的 pool |
|---|---|---|
| `ACTORS` | worker 标志 `--max-actors`，默认 1000 | 1000 中的 2 |
| `CPU(MILLICORES)` | worker 容器的 CPU limit | 2000 中的 2000 |
| `MEMORY` | 内存 limit 减去 worker 自留的部分 | 3008Mi 中的 512Mi |

worker 从 3 GiB 的 limit 里自留了 64 MiB，所以上报 3008Mi。内存 limit 为 1 GiB 的示例 pool 上报 960Mi，同样少了 64 MiB {{run}}。

已预订部分，是每个运行中的 actor 在 ActorTemplate 里声明的 limit 之和。这里每个 actor 声明了 1000 millicores 和 256 MiB。两个 actor 订满了全部 CPU 容量和六分之一的内存。worker 已满，原因是 CPU。

`cpuMillicores` 有两个作用。worker 用它做放置时的预订，同时把它作为每 100 ms 周期的 CPU 配额写入沙箱 {{code}}。文档说节点内核会把 actor 限速到这个配额 {{docs}}。

这个配额是硬上限。我们用一个按固定循环步数运行的程序来测试，在一个空闲核心上大约要 5 秒。它分别用 1 个线程和 4 个线程运行，覆盖四个模板。每次运行前后，我们都从节点上的 cgroup 读取 actor 的 CPU 时间。

**我们测得**每一行各三次运行，环境是第二台 x86 服务器客户机（16 vCPU、23 GB）。pool 只有一个 worker pod，Kubernetes limit 为 6 CPU。

| `cpuMillicores` | 线程数 | 墙钟时间（秒） | 使用的宿主机核心数 |
|---|---|---|---|
| 250 | 1 | 27.1 到 27.6 | 0.25 |
| 250 | 4 | 26.5 到 27.9 | 0.25 |
| 500 | 1 | 12.7 到 13.1 | 0.50 到 0.51 |
| 500 | 4 | 12.4 到 12.8 | 0.50 |
| 1000 | 1 | 4.9 到 5.4 | 1.01 |
| 1000 | 4 | 5.3 到 5.5 | 1.00 到 1.01 |
| 2000 | 1 | 4.1 到 4.5 | 1.12 |
| 2000 | 4 | 1.38 到 1.42 | 1.96 到 2.01 |

```figure
id: fig-4-1b
kind: chart
title: actor 在四个 CPU limit 下使用的宿主机核心数
claim: 在 250、500、1000 millicores 的 limit 下，actor 分别用了 0.25、0.50 和 1.0 个宿主机核心，到 2000 时需要四个线程才用满 2.0 个核心。
caption: 纵轴是核心数，横轴是模板的 limit。实线是 1 个线程，虚线是 4 个线程，每次运行一个点。细虚线是 limit 本身。来源：capture/lab/summary/cpu-limit-x86.json。
```

actor 使用的宿主机核心数从未超过它的 limit。在 1000 millicores 以内，四个线程并不比一个线程拿到更多 CPU。同样的工作量，250 millicores 比 1000 millicores 慢 5.4 倍。有一行里 limit 不是瓶颈：2000 millicores 下的一个线程只用了 1.12 个核心，因为一个线程只能占满一个核心。四个线程在那里用满了整个 limit。

这个上限是每个 actor 一个 cgroup，嵌在 worker pod 的 cgroup 里。worker pod 的 `cpu.max=600000 100000`，即它的 Kubernetes limit 6 CPU。在它里面，我们找到每个 actor 一个 cgroup，名字是 actor 的 uid 加后缀 `_sandbox`。它的 `cpu.max` 就是模板的 limit，actor 的 gVisor 进程都在其中运行。

```listing
title: 节点报告的四个 actor 的 CPU 配额
source: capture/lab/Q-network/n-cpu-limit/42-cgroup-after.txt
lang: text
note: 完整文件，在运行结束后读取。各列依次是 millicores 为单位的 limit、以微秒计的配额与周期，以及 cgroup 的计数器。
---
250 25000/100000 usage_usec 41467478 nr_periods 1672 nr_throttled 1649 throttled_usec 428931388 
500 50000/100000 usage_usec 38723256 nr_periods 793 nr_throttled 765 throttled_usec 157096786 
1000 100000/100000 usage_usec 31895780 nr_periods 345 nr_throttled 312 throttled_usec 30529410 
2000 200000/100000 usage_usec 23220151 nr_periods 204 nr_throttled 38 throttled_usec 854079 
```

沙箱内部有两个事实，都可能误导你。

- **actor 看不到自己的 limit。** 程序在四种 limit 下都数出 2 个 CPU，而且读不到 cgroup 文件。按 CPU 数量确定线程池大小的运行时，在 250 millicores 下也会得到 2。
- **在被限速的沙箱里读到的 CPU 时间是错的。** 在 250 millicores、1 个线程下，程序报告了 22 到 24 秒的 CPU 时间。同一次运行在宿主机上只用了 6.9 秒。不要在 actor 里用 `getrusage` 或 `/proc` 来测 CPU 用量，要读节点上的 cgroup。

第二个事实解释了我们早先的一次读数。一条示例命令在 500 millicores 下报告了 2.38 秒里有 2.0 秒的 CPU 时间，看起来像是没有限速。那段 CPU 时间来自沙箱内部，所以不能算数。[工具沙箱](#s-a-tool-sandbox)里有那次运行和更正。

我们一次只测了一个 actor。内存 limit，以及一个 worker 上多个繁忙 actor 的 CPU limit，将在下一版补充。有一行没有得到解释。在 2000 millicores 下，四个线程用了 2.8 秒宿主机 CPU，而同样的工作 1 个线程用了 4.6 到 5.1 秒。

挂起的 actor 不预订任何资源。该命令只统计运行中的 actor。

`kubectl` 的两个习惯在这里不适用。这条命令没有 `-A` 标志，默认列出所有命名空间的 worker。它有四个过滤器：`-n` 过滤一个 Kubernetes 命名空间，`-l` 过滤 pool 标签，`-a` 过滤承载某个 atespace 的 actor 的 worker，还有 `--sandbox-class`。

## 没有 limit 的 pool 会上报整个节点 {#s-workerpool-a-pool-without-limits-reports-the-whole-node}

kagent v1.0.0 安装了一个名为 `kagent-default` 的 pool，完全没有 `resources`。我们在一台 16 vCPU、31 GiB 的客户机上列出了它的 worker。

```listing
title: 没有 limit 的 pool 的 worker
source: capture/lab/K-kagent/inventory/workers-end.txt
lang: text
---
NAME                                   POOL             STATE                 ACTORS   CPU(MILLICORES)   MEMORY         POD                                      AGE
6dfb9d1d-cce7-4e42-af53-799a4132fa5d   kagent-default   WORKER_STATE_ACTIVE   0/1000   0/16000           0/32797744Ki   kagent/kagent-default-679c58c6cb-pljdk   19m
```

这个 worker 声称拥有节点的全部 16 个 CPU 和全部内存。Substrate 文档说，没有 limit 的 worker 上报 0 且没有上界。我们的运行结果与此不符：worker 读取了节点的大小并上报了它。有用户在更大的集群上报告过同样的现象 {{issue #3479}}。

结果是一个没有任何东西支撑的容量。pod 没有 limit，所以 Kubernetes 不为它预留任何资源。同一节点上的第二个 pool 会再次声称同样的 16 个 CPU。控制平面、数据平面和 Postgres 也运行在这个节点上。[Substrate 上的 kagent 1.0](#s-kagent-on-substrate) 展示了这个 worker 在负载下的表现。

我们的判断：始终给 pool 设置 `limits`，并让内存 request 等于内存 limit。这样 worker 上报的内存就是 Kubernetes 已预留的内存。Kubernetes 只在 CPU request 的范围内预留 CPU。上面的例子 request 了 500 millicores，却上报 2 个 CPU。如果 actor 必须拿到它们预订的 CPU，就让 CPU request 等于 limit。[pool 定容](#s-sizing-a-pool)把这条规则换算成了具体数字。

把 pool 交给团队之前，还有一个事实要知道。worker pod 以 root 身份运行，带有 `SYS_ADMIN` 和 `NET_ADMIN`，seccomp 配置为 unconfined {{run}}。pod 内的沙箱隔离 actor。pod 本身并不把 worker 与节点隔离，所以请把 pool 运行在你信任的节点上。

```takeaways
- 用 kubectl 管理 WorkerPool，用 kubectl ate 管理 worker、actor 和模板。
- 把选择器标签放在 pool 的 metadata.labels 下，模板在那里匹配。
- 给每个 pool 设置 CPU 和内存 limit，并让内存 request 等于 limit。
- 把 kubectl ate get workers 里的每一对数字读作“已预订，然后是容量”。
- 把 cpuMillicores 当作每个 actor 的硬上限，线程数要在模板里自己设置。
- 从节点上的 cgroup 测量 actor 的 CPU 用量，不要在沙箱里测。
- 预期 pool 滚动更新会为运行中的 actor 等待最长 30 分钟。
```

来源：capture/lab/summary/demos-x86.json, capture/lab/N-demos/tool-sandbox/tasks.tsv, capture/lab/summary/cpu-limit-x86.json, capture/lab/Q-network/n-cpu-limit/40-work.tsv, capture/lab/Q-network/n-cpu-limit/42-cgroup-after.txt, capture/lab/Q-network/n-cpu-limit/22-cgroup-250.txt, capture/lab/Q-network/n-cpu-limit/41-info-250.json, capture/lab/Q-network/n-cpu-limit/03-worker-pod-resources.json, capture/lab/Q-network/n-cpu-limit/10-burn.tsv, capture/lab/A-quickstart/60-state.log, capture/lab/C-resume-vs-size/pool.yaml, capture/lab/C-resume-vs-size/tmpl-0.yaml, capture/lab/I-capacity/02-workers-when-full.txt, capture/lab/I-capacity/03-actors-when-full.txt, capture/lab/I-capacity/14-workers-full.txt, capture/lab/K-kagent/inventory/workers-end.txt, capture/lab/K-kagent/inventory/workerpools.yaml, capture/lab/K-kagent/inventory/worker-pod-spec.json; api/infra/k8s/ate/v1/workerpool_types.go, cmd/atecontroller/internal/controllers/workerpool_apply.go, cmd/atecontroller/internal/workersync/syncer.go, cmd/ateworker-gvisor/main.go, cmd/ateworker-gvisor/memory.go, api/ateapi/v1/ateapi.proto (Worker, WorkerStatus, WorkerState), cmd/kubectl-ate/internal/cmd/worker.go at v1.0.0; docs/reference/api-guide.md at v1.0.0; issue https://github.com/agent-substrate/substrate/issues/3479.
