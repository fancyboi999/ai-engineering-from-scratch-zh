# 沙箱类别：gVisor 与 microVM

> 一个 pool 只运行一种沙箱类别，actor 在它的一生中始终停留在其首个快照所属的类别上。

安全评审人员会对你的 agent 平台问一个问题：每个 agent 是在容器里，还是在虚拟机里？对 Substrate 来说，诚实的回答是两者都不是，选择权在你手里。actor 运行在 gVisor 沙箱里，或者运行在一台小型虚拟机里。这个选择是 `WorkerPool` 的一个字段，之后很难更改。

读完本节，你能为一个 pool 选定类别，并检查某个节点能否运行它。你还能说出两种类别在哪些行为上不同。

本手册的大部分实测来自 `gvisor` 类别。在 x86 服务器客户机上，我们还让一个测试 actor 在两种类别下各跑了一遍，内存分别为 0、200 和 500 MiB。本节报告这次对比，并点明接下来要做的实验。

## 两种类别，一个字段 {#s-sandbox-classes-two-classes-one-field}

**沙箱类别（sandbox class）：** pool 中 worker 为每个 actor 提供的隔离类型。取值是 `gvisor` 或 `microvm`。

类别写在 [WorkerPool](#s-workerpool) 的 `spec.sandboxClasses[0].name` 里。取值集合是封闭的。API 只接受这两个名字，普通 Linux 容器不在可选之列 {{code}}。

```figure
id: fig-4-2
kind: comparison
title: 每种沙箱类别里，actor 与节点之间隔着什么
claim: gVisor 的 actor 通过用户态内核共享节点内核，microVM 的 actor 则在 KVM 之上运行自己的客户机内核。
caption: 每一列从下方的节点读到上方的 actor。紫色是 worker 一侧，绿色是 actor。每列下面的两行是你在实践中会遇到的差异。来源：docs/reference/sandbox-classes.md at v1.0.0。
```

| 维度 | `gvisor` | `microvm` |
|---|---|---|
| 隔离 | `runsc`，用户态内核 | KVM 客户机：Cloud Hypervisor 上的 Kata Containers |
| 节点要求 | 任意 Linux 节点 | 带有 `/dev/kvm` 的节点 |
| actor 看到的 CPU 数 | 至少 2 个，与 limit 无关 | limit 向上取整，至少 1 个 |
| 最小内存 limit | 无 | 128 MiB |
| 每个容器的 limit | 接受但忽略 | 在客户机内强制执行 |
| 快照里的文件 | `runsc` 检查点包 | tar 归档 |

## 节点必须提供什么 {#s-sandbox-classes-what-the-node-must-provide}

gVisor worker 可以运行在任何 Linux 节点上。所以它能在笔记本上运行。

microVM worker 需要设备 `/dev/kvm`。`atelet` 只在拥有该设备的节点上，把它作为资源 `ate.dev/kvm` 提供给 Kubernetes。控制器会给每个 microVM worker pod 加上对这个资源的 request {{code}}。因此，在没有 KVM 的集群上建 microVM pool 不会明显报错，它的 pod 只会一直处于 Pending。

创建 kind 集群的脚本会告诉你属于哪种情况。在 Docker Desktop 下的 Apple 芯片笔记本上，它打印了这些内容：

```listing
title: 笔记本上的 KVM 探测
source: capture/lab/M-mac-arm64/10-kind-cluster.log
lang: text
---
Probing for /dev/kvm in the Docker environment...
/dev/kvm not available: micro-VM support disabled (gVisor still works).
```

在支持嵌套 KVM 的 x86 服务器客户机上，同一个脚本打印了另一种结果：

```listing
title: x86 服务器客户机上的 KVM 探测
source: capture/lab/A-quickstart/10-kind-cluster.log
lang: text
---
Probing for /dev/kvm in the Docker environment...
/dev/kvm found: micro-VM (kata + cloud-hypervisor) support will be enabled.
```

在那台客户机上，`microvm` 不需要额外的安装步骤。kind 脚本已经把 `/dev/kvm` 传给了节点，安装器也已经创建了 SandboxConfig。

所以在 Docker Desktop 下的 Mac 上，你只有 `gvisor` 类别。在云虚拟机上，实例类型必须允许嵌套虚拟化。规划 `microvm` 之前，先检查节点类型。

安装器默认准备两种类别。它为每个类别创建一份 SandboxConfig，并把客户机内核和其他 microVM 文件加载到对象存储里。传入 `--sandbox-classes=gvisor` 可以跳过 microVM 部分 {{docs}}。

## limit 如何生效 {#s-sandbox-classes-how-the-limits-apply}

ActorTemplate 为 actor 声明一个 CPU limit 和一个内存 limit。两种类别会把它们变成不同的东西 {{docs}}。

**CPU：** limit 为 500 或 1000 millicores 的 gVisor actor 看到 2 个 CPU，节点内核把它限速到配额。500 millicores 的 microVM actor 以 1 个虚拟 CPU 启动，获得半个 CPU 的节点时间。按 CPU 数量确定线程池大小的程序，在两种类别上表现不同。

**内存：** 在 `gvisor` 上，limit 就是沙箱能使用的内存。在 `microvm` 上，limit 是客户机的 RAM，虚拟机监控器还需要额外的内存。worker 会把这部分开销计入自己的容量，所以同一个 pool 能容纳的 microVM actor，比单看 limit 所推测的要少。在我们的运行中，limit 为 456 MiB 的 actor 开销是 7.6 MiB。

**容器：** 一个 actor 可以有多个容器。在 `gvisor` 上，一个 Sentry 进程运行所有容器，对其中一个容器设置 limit 没有效果。在 `microvm` 上，每个容器在客户机里有自己的 cgroup。超出内存 limit 的容器会被单独杀掉，actor 的其他容器继续运行。

最后这项行为已有他人报告过代价。在 issue 3615 里，microVM actor 中的一个容器因内存被杀，而 actor 仍然是 `ACTOR_STATE_RUNNING`，没有任何日志 {{issue #3615}}。[Actor 与它的七种状态](#s-actor-states)展示了 `gvisor` 上进程退出时的同样沉默，这一点我们测过。

## 快照固定了类别 {#s-sandbox-classes-a-snapshot-pins-the-class}

类别不只是 pool 的属性。actor 的第一个快照会记录它，之后这个 actor 的每次恢复都需要同一类别的 worker {{docs}}。下面是我们的计数器 actor 在一次同步挂起之后的快照记录。

```listing
title: 快照记录中的沙箱运行时
source: capture/lab/B-lifecycle/23-actor-after-sync-suspend.yaml
lang: yaml
note: 取自 status.snapshots 中的一个条目。fidelity 之前和 attributes 之后的行已省略。
---
    fidelity: SNAPSHOT_FIDELITY_MEMORY
    generation: 3
    locality: kind-control-plane
    owner: SNAPSHOT_OWNER_ACTOR
    sandboxRuntime:
      sandboxClass: gvisor
      version:
        attributes:
        - key: architecture
          value: amd64
        - key: cpu_features
          value: 8c0000002e500800008003f70000000f00400004219c01ab178bfbfffff83203
        - key: sandbox_bundle_hash
          value: sha256:88e9809119d7fa2204897a60f8bb155add102018b4b4947e7876c9bc447312fa
```

microVM 快照记录的属性不同。下面是同一个计数器 actor 在 microVM pool 上的记录的同一部分。

```listing
title: microVM 快照记录中的沙箱运行时
source: capture/lab/L-gaps/microvm/26-actor-suspended.yaml
lang: yaml
note: 取自 status.snapshots 中的一个条目。fidelity 之前和 attributes 之后的行已省略。
---
    fidelity: SNAPSHOT_FIDELITY_MEMORY
    generation: 5
    locality: kind-control-plane
    owner: SNAPSHOT_OWNER_ACTOR
    sandboxRuntime:
      sandboxClass: microvm
      version:
        attributes:
        - key: architecture
          value: amd64
        - key: cpu_model
          value: "23:49"
        - key: cpu_vendor
          value: AuthenticAMD
        - key: sandbox_bundle_hash
          value: sha256:1d40aaaf66896731f227d4cfe129ab724721b592ff89c73df603e8e2372a67b8
```

gVisor 快照用位串记录 CPU 特性。microVM 快照记录 CPU 厂商和一个 CPU 型号。这些记录带来三个后果：

- **你无法把 actor 移到另一个类别。** 即使模板同时选中两种类别的 pool，每个 actor 仍然只有一个类别，也就是它黄金快照所属的类别。
- **内存快照绑定的不只是类别。** 它还记录 CPU 架构、CPU 特性或 CPU 型号，以及确切的沙箱构建版本。只有运行时兼容，worker 才会恢复内存。
- **不匹配的结果是冷启动。** 当没有兼容的 worker 有空位时，Substrate 会从对象存储取一份快照，只恢复其中的文件。它使用同一类别的另一个 worker。进程重新启动，actor 丢失它在内存里保存的内容。

第三点是需要提前规划的。一个混用不同 CPU 节点类型的 pool，或者一次新沙箱构建的滚动更新，都可能把恢复变成冷启动。[放置](#s-placement)展示了这个决定在哪里做出。

## 其他人报告的一致性问题 {#s-sandbox-classes-what-others-reported-about-parity}

在 v1.0.0，两种类别的行为并不相同，项目在 issue 3226 里跟踪这些差距 {{issue #3226}}。这些报告来自 issue 跟踪器。这些情况我们均未实测。

| 报告 | 类别 | 现象 |
|---|---|---|
| Issue 3615 {{issue #3615}} | `microvm` | 因内存被杀的容器让 actor 仍为 RUNNING，且没有日志 |
| Issue 3720 {{issue #3720}} | `microvm` | 文件写入计入内存 limit，写了 2 GB 的 actor 被杀 |
| Issue 3801 {{issue #3801}} | `microvm` | 恢复在 actor 的 CPU limit 之下运行，所以 limit 小会拖慢恢复 |
| Issue 3153 {{issue #3153}} | `microvm` | 每次小文件操作都要从客户机跨到节点，拖慢大量小文件的工作 |
| Issue 3408 {{issue #3408}} | `gvisor` | 单个节点上约 6,000 个 actor 时，沙箱死亡而 actor 仍为 RUNNING |

## 两种类别的实测对比 {#s-sandbox-classes-the-two-classes-measured}

我们在 microVM pool 上运行了 [SuspendActor 与 ResumeActor](#s-suspendactor-and-resumeactor) 一节里的测试 actor。机器、节点和 actor 镜像与 gVisor 数据所用的相同。这个 actor 持有固定数量的随机内存。

```figure
id: fig-4-2b
kind: chart
title: 两种沙箱类别的恢复时间与所持内存的关系
claim: 在 0 MiB 时，microVM 恢复用了 0.33 秒，gVisor 用了 0.22 秒，在 500 MiB 时分别是 0.80 秒和 1.07 秒。
caption: 每个点是一次从节点上快照恢复，每条线连接一个类别的中位数。紫色是 microvm 类别，灰色虚线是 gvisor 类别。在 x86 服务器客户机上测得。来源：capture/lab/summary/microvm-x86.json、capture/lab/summary/resume-x86.json。
```

| 所持内存 | 阶段 | `microvm` | `gvisor` |
|---|---|---|---|
| 0 MiB | 新 actor 的首次调用 | 0.45 s | 0.23 s |
| 0 MiB | 从节点恢复 | 0.33 s | 0.22 s |
| 0 MiB | 异步挂起 | 0.39 s | 0.34 s |
| 0 MiB | 同步挂起 | 0.72 s | 0.40 s |
| 200 MiB | 新 actor 的首次调用 | 0.79 s | 0.62 s |
| 200 MiB | 从节点恢复 | 0.49 s | 0.47 s |
| 200 MiB | 异步挂起 | 0.80 s | 0.79 s |
| 200 MiB | 同步挂起 | 1.89 s | 2.02 s |
| 500 MiB | 新 actor 的首次调用 | 1.39 s | 5.76 s |
| 500 MiB | 从节点恢复 | 0.80 s | 1.07 s |
| 500 MiB | 异步挂起 | 1.17 s | 1.17 s |
| 500 MiB | 同步挂起 | 3.35 s | 3.59 s |

**我们测得**两列数据都来自 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），使用一个 kind 节点和 Envoy 数据平面。每个单元格是中位数。每种大小做了 5 次首次调用、10 次恢复、10 次异步挂起和 5 次同步挂起。首次调用和恢复在客户端计时，经由 `kubectl ate proxy`。microVM 这一轮的 90 个请求全部返回 200。对运行中 actor 的请求，`microvm` 用了 0.065 秒，`gvisor` 用了 0.064 秒。

表中有四个结果：

- **小 actor 在 `microvm` 上要付一笔固定成本。** 在 0 MiB 时，恢复慢了 0.10 秒，首次调用慢了 0.22 秒。恢复要先启动一个带自己内核的客户机，actor 才能运行。
- **内存在 `microvm` 上更便宜。** 从 0 到 500 MiB，恢复时间在 `microvm` 上每 MiB 增加约 1 ms，在 `gvisor` 上增加约 2 ms。在 200 MiB 时中位数只差 0.02 秒。超过这个大小，`microvm` 是更快的类别。
- **大的新 actor 在 `microvm` 上启动快得多。** 在 500 MiB 时，五次首次调用在 `microvm` 上用了 1.26 到 2.96 秒，在 `gvisor` 上用了 1.86 到 6.76 秒。
- **异步挂起的成本相同。** 各种大小下中位数相差都不超过 0.06 秒。小 actor 的同步挂起在 `microvm` 上更慢，因为它的快照更大。

### 一个 actor 在节点上的成本 {#s-sandbox-classes-what-one-actor-costs-on-the-node}

| 项目 | `microvm` | `gvisor` |
|---|---|---|
| 一个 actor 在节点上的进程 | 一个 `cloud-hypervisor` 和两个 `virtiofsd` | 一个 `runsc-sandbox` 和一个 `runsc-gofer` |
| 持有 200 MiB 时的常驻内存 | 280 MiB | 237 MiB 和 11 MiB |
| 节点上的快照，持有 0 MiB | 58.6 MiB | 1.3 MiB |
| 节点上的快照，持有 200 MiB | 264.0 MiB | 201.9 MiB |
| 节点上的快照，持有 500 MiB | 569.7 MiB | 502.2 MiB |
| 内存快照的文件 | `memory-ranges`、`state.json`、`config.json`，以及每个容器一个 tar 归档 | `pages.img`、`checkpoint.img`、`pages_meta.img`，一个 `rootfs` 目录 |
| worker 上预订的内存 | limit 为 456 MiB 时预订 463.6 MiB | limit 为 250 MiB 时预订 250 MiB |

**我们测得**这些数值同样来自那台 x86 服务器客户机，每个单元格取一个样本。常驻内存是 `ps` 在节点上打印的值。快照大小是单个 actor 快照目录的磁盘占用。gVisor 的预订值来自第二台 x86 服务器客户机上的 pool。

microVM 快照保存整个客户机，包括它的内核和它的 agent。它比 actor 持有的内存大 59 到 70 MiB。在 [pool 定容](#s-sizing-a-pool)里为节点磁盘和 bucket 定大小时，要给每个 actor 加上这个量。文件 `memory-ranges` 是稀疏文件。它显示的大小是客户机的 RAM，实际磁盘占用是客户机碰过的部分。

### actor 内部的时钟 {#s-sandbox-classes-the-clock-inside-the-actor}

测试 actor 在每次回复里报告它的进程年龄。两种类别对这个年龄的计法不同。

**我们测得**在同一台客户机上，对每个类别的 0 MiB actor 做了三个挂起加恢复周期。一个周期用时 1.6 到 1.8 秒。在 `microvm` 上，进程年龄每个周期增加 1.8 或 1.9 秒：28.4、30.3 和 32.1 秒。在 `gvisor` 上，每个周期增加 0.2 或 0.3 秒：0.5、0.8 和 1.0 秒。

所以 microVM 的 actor 能看到它被挂起期间流逝的时间，gVisor 的 actor 只能看到它运行过的时间。actor 内部的超时、缓存有效期或 token 检查，在两种类别上会得出不同结果。我们只读了进程的流逝时间时钟，没有比较日历时间。

### 后续内容 {#s-sandbox-classes-coming-next}

以上所有数字都来自一台 x86 机器、一种 CPU 型号。下一版会在这些情形下运行 `microvm`：

- 在 arm64 上
- 使用 agentgateway 数据平面
- 从对象存储恢复
- 持有超过 500 MiB
- 节点 CPU 型号各不相同的 pool
- 丢失一个节点

上表中来自 issue 跟踪器的报告也仍然只是报告。这些情况我们均未实测。

## 我们的判断 {#s-sandbox-classes-our-position}

按你的 actor 持有的内存来选。actor 小时，从 `gvisor` 开始。它能在每个节点上运行，恢复一个小 actor 快 0.10 秒，快照与内存一样大，不会更大。它也是 kagent 安装的类别。

三种情况下选 `microvm`。评审要求租户之间使用硬件虚拟化。你需要每个容器的 limit。或者你的 actor 持有超过约 200 MiB。在第三种情况下，`microvm` 在我们的机器上恢复得一样快或更快，新的 500 MiB actor 启动快了四倍。代价是需要带 KVM 的节点类型，以及每个 actor 多出 59 到 70 MiB 的快照。

然后测试你自己的负载。上面的报告说，两种类别在最伤人的情形下表现不同：内存压力和大量小文件。

两种类别都不能让 worker pod 成为边界。两种 worker 都以 root 身份运行，带有 `SYS_ADMIN` 和 `NET_ADMIN`，Substrate 的威胁模型把这两种类别评为同等 {{docs}}。

```takeaways
- 规划 microvm pool 之前，先在节点类型上检查 /dev/kvm。
- 持有内存少于约 200 MiB 的 actor，从 gvisor 开始。
- 对更大的 actor 测一测 microvm，它在我们的机器上恢复得更快。
- 给 disk 和 bucket 定大小时，为每个 microvm 快照加上 59 到 70 MiB。
- 一个 pool 里保持同一种 CPU 类型和同一个沙箱构建，以保护内存恢复。
- 不要规划在类别之间迁移 actor，因为快照固定了类别。
- 依赖 microvm 之前，先测试内存压力和大量文件的工作。
```

来源：capture/lab/M-mac-arm64/10-kind-cluster.log, capture/lab/A-quickstart/10-kind-cluster.log, capture/lab/B-lifecycle/23-actor-after-sync-suspend.yaml, capture/lab/L-gaps/microvm/26-actor-suspended.yaml, capture/lab/L-gaps/microvm/40-microvm-local.tsv, capture/lab/L-gaps/microvm/49-summary.tsv, capture/lab/L-gaps/microvm/41-node-processes-v200-1.txt, capture/lab/L-gaps/microvm/50-gvisor-rss.txt, capture/lab/L-gaps/microvm/42-workers-v200-1.txt, capture/lab/L-gaps/multinode/71-workers.txt, capture/lab/L-gaps/multinode/32-tmpl-50.yaml, capture/lab/L-gaps/microvm/44-snapdir-v0-1.txt, capture/lab/L-gaps/microvm/44-snapdir-v200-1.txt, capture/lab/L-gaps/microvm/44-snapdir-v500-1.txt, capture/lab/L-gaps/microvm/23-node-processes-counter.txt, capture/lab/C-resume-vs-size/10-local.tsv, capture/lab/C-resume-vs-size/snapdir-b200-1.txt, capture/lab/summary/microvm-x86.json, capture/lab/summary/resume-x86.json, capture/lab/summary/suspend-x86.json, capture/lab/summary/footprint-x86.json, capture/lab/K-kagent/inventory/workerpools.yaml, capture/lab/K-kagent/inventory/worker-pod-spec.json; docs/reference/sandbox-classes.md, docs/reference/api-guide.md, docs/dev/microvm-local.md, docs/security/threat-model.md, cmd/ate-setup/commands.md at v1.0.0; cmd/atecontroller/internal/controllers/workerpool_apply.go, api/infra/k8s/ate/v1/sandboxconfig_types.go, cmd/ateapi/internal/scheduling/scheduling.go at v1.0.0; issues https://github.com/agent-substrate/substrate/issues/3226, https://github.com/agent-substrate/substrate/issues/3615, https://github.com/agent-substrate/substrate/issues/3720, https://github.com/agent-substrate/substrate/issues/3801, https://github.com/agent-substrate/substrate/issues/3153, https://github.com/agent-substrate/substrate/issues/3408.
