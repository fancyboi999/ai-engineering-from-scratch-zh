# SuspendActor 与 ResumeActor

> Substrate 只在调用方要求时才挂起 actor，而在我们的测试服务器上，每恢复 1 MiB 有数据的内存约耗时 2 毫秒。

你下午创建了一个 actor，给它发了五个请求，然后下班回家。快速入门告诉你，Substrate 会给空闲的 actor 生成检查点。第二天早上，这个 actor 仍然是 `ACTOR_STATE_RUNNING`，还占着它 worker 上的一整个 CPU。没有任何东西坏了。Substrate v1.0.0 没有空闲计时器。

读完本节，你能决定系统里由谁来调用 `SuspendActor`，并在它的两种模式之间做出选择。你还能根据 actor 持有的内存，预测它的恢复时间。

## Substrate 不会挂起空闲的 actor {#s-suspendactor-and-resumeactor-substrate-does-not-suspend-an-idle-actor}

我们给 `my-counter-1` 发了五个请求，然后 900 秒不再发任何请求。脚本每 15 秒读一次状态。

```listing
title: 900 秒没有请求
source: capture/lab/B-lifecycle/10-trace.tsv
lang: text
note: 观察的开头和结尾。中间的 58 行 state 已截掉，它们全都是 ACTOR_STATE_RUNNING。
---
2026-11-12T10:14:22.822Z	idle-watch-start	no requests for 900 s
2026-11-12T10:14:37.832Z	state	ACTOR_STATE_RUNNING	-
…
2026-11-12T10:29:35.957Z	state	ACTOR_STATE_RUNNING	-
2026-11-12T10:29:36.168Z	idle-watch-end
2026-11-12T10:29:36.265Z	call-after-idle	200	0.080377	preserved memory count: 6 | preserved file counter: 6 | preserved rootfs counter: 6
```

60 个采样全部是 `ACTOR_STATE_RUNNING`，第六次调用在 0.08 秒内返回，并续上了前面的计数。代码也印证了这一点：v1.0.0 没有任何组件会因为 actor 空闲而挂起它 {{code}}。API 参考文档也这么说，而快速入门页面没有说 {{docs}}。

空闲的运行中 actor 不是免费的。它一直占着模板在 worker 上登记的 CPU 和内存。`my-counter-1` 运行期间，它所在 worker 显示 1,000 个 millicore 中有 1,000 个在用。[第 4.5 节](#s-sizing-a-pool)把这个数字换算成池的大小。

所以这项工作属于调用方，实际上就是 agent harness。在我们的运行里，kagent 在 98 轮中的每一轮之后都挂起了 actor。[第 7.1 节](#s-kagent-on-substrate)展示了这种模式和它的代价。

## SuspendActor：异步还是同步 {#s-suspendactor-and-resumeactor-suspendactor-asynchronous-or-synchronous}

**SuspendActor：** 给运行中的 actor 生成检查点、停止它的沙箱并释放它在 worker 上位置的调用。它有两种持久化模式。

- 异步模式是默认值。快照写到节点磁盘上，调用就返回。atelet 随后再把它上传到对象存储。
- 同步模式要等快照进入对象存储才返回。使用 `kubectl ate suspend actor --mode sync`。

actor 对象能看出两者的区别。

```listing
title: 两种挂起之后一个 actor 的快照
source: capture/lab/B-lifecycle/20-trace-ops.tsv
lang: text
note: 跟踪记录中的两行。第一行是异步挂起之后，第二行是使用 --mode sync 挂起之后。
---
2026-11-12T10:30:08.028Z	state	ACTOR_STATE_SUSPENDED	kind-control-plane	5	SNAPSHOT_OWNER_TAG:SNAPSHOT_STORAGE_STATE_COMPLETED:gen1,SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_PENDING:gen2
…
2026-11-12T10:30:09.378Z	state	ACTOR_STATE_SUSPENDED	kind-control-plane	9	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen3
```

异步挂起之后，第 2 代是 `SNAPSHOT_STORAGE_STATE_PENDING`。对象存储还没有它，所以更老的一代仍然是持久副本。同步挂起之后，第 3 代是 `SNAPSHOT_STORAGE_STATE_COMPLETED`，Substrate 已经释放了更老的几代。[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)会跟踪这样一份快照 42 分钟。

| 持有的内存 | 异步挂起，中位数 | 同步挂起，中位数 |
|---|---|---|
| 0 MiB | 0.34 秒 | 0.40 秒 |
| 50 MiB | 0.50 秒 | 1.03 秒 |
| 200 MiB | 0.79 秒 | 2.02 秒 |
| 500 MiB | 1.17 秒 | 3.59 秒 |
| 1,000 MiB | 1.95 秒 | 6.41 秒 |

**我们测得**从发出 `kubectl ate suspend actor` 到它返回的时间，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），使用 gVisor。异步列每种大小测了 10 次挂起，同步列测了 5 次。actor 持有的是随机字节，无法压缩。多出来的时间接近上传本身。在另一次运行里，atelet 记录了 500 MiB 快照的四次上传，每次耗时 2.0 到 2.1 秒。

```figure
id: fig-3-3b
kind: chart
title: 异步挂起与同步挂起
claim: 在 1,000 MiB 时，同步挂起用了 6.4 秒，默认的异步挂起用了 2.0 秒。
caption: 每个点是一次挂起，每条线连接一种模式的中位数。紫色表示快照留在节点上就返回，青色表示上传之后才返回。测于 x86 服务器客户机。来源：capture/lab/summary/suspend-x86.json。
```

## 挂起不会等待未完成的请求 {#s-suspendactor-and-resumeactor-a-suspend-does-not-wait-for-open-requests}

挂起会立刻停止沙箱，actor 正在处理请求时也一样。我们给 actor 装了一个睡眠 10 秒的处理函数，向它发一个请求，2 秒后挂起这个 actor。

```listing
title: 在 10 秒请求进行到 2 秒时挂起
source: capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv
lang: text
note: 异步运行的三行。挂起行的末尾和中间的行已截掉。
---
2026-11-12T12:52:10.848Z	async	slow-request-ended	503	2.218030	upstream connect error or disconnect/reset before headers. reset reason: connection termination
2026-11-12T12:52:10.992Z	async	suspend-2s-into-request	0.376s	ATESPACE   NAME       TEMPLATE       STATE                   WORKER POD   WORKER IPS   VERSION   AGE lab-v      sl-async   lab-v/tiny-0   ACTOR_STATE_SUSPENDED…
…
2026-11-12T12:52:11.431Z	async	next-call	200	0.228121	tag=v3 count=2 mb=0 fill=zero sum=0 rootfs=-1 data=-1 pid=1 process_age_s=2.4 child[none]
```

**我们测得**这一结果，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），每种模式各测一次。两种模式下，未完成请求的客户端都在 2.2 秒后收到了 503。挂起调用返回成功，异步模式用了 0.38 秒，同步模式用了 0.48 秒，都没有警告。下一个请求在 0.23 秒内恢复了 actor，计数接着累加到 2。

Substrate 不会重放被切断的请求。快照保存的是 actor 在处理函数中途的状态，处理函数结束时客户端已经不在了。所以 `SuspendActor` 的调用方必须知道 actor 是空闲的。每一轮之后挂起的 harness 知道这一点。按时钟挂起的定时器不知道。

## ResumeActor：谁来调用，在哪里运行 {#s-suspendactor-and-resumeactor-resumeactor-who-calls-it-and-where-it-runs}

**ResumeActor：** 把已挂起的 actor 放到某个 worker 上，并恢复它最新快照的调用。router 对每个请求都发出这个调用，所以一个普通请求就足以启动 actor。`kubectl ate resume actor` 发出同一个调用，但不带请求。

恢复先看节点。挂起之后，只要那个节点还保存着快照，actor 就一直分配在该节点上。于是 `ResumeActor` 先尝试该节点上的 worker {{docs}}。如果快照只在对象存储里，atelet 会先下载它，下载发生在调度器选中的 worker 所在的节点上。

## 恢复时间与持有的内存 {#s-suspendactor-and-resumeactor-resume-time-against-the-memory-held}

我们构建了一个 actor，它持有固定数量的随机内存，并且每次请求时在每个 MiB 里读一个字节。我们挂起它，等待，然后给下一个请求计时。

```figure
id: fig-3-3
kind: chart
title: 恢复时间与持有的内存，分别从节点和对象存储恢复
claim: 在 1,000 MiB 时，从节点恢复用了 2.2 秒，从对象存储恢复用了 4.7 秒。
caption: 每个点是一次恢复，每条线连接一条路径的中位数。紫色是恢复节点上的快照，青色是先从对象存储下载。虚线标出 0.5 秒。1,000 MiB 时从节点的第一次恢复用了 5.09 秒，其余九次最多 2.45 秒。测于 x86 服务器客户机。来源：capture/lab/summary/resume-x86.json。
```

| 持有的内存 | 从节点，中位数 | 10 次的范围 | 从对象存储，中位数 | 5 次的范围 |
|---|---|---|---|---|
| 0 MiB | 0.22 秒 | 0.22 到 0.23 秒 | 0.24 秒 | 0.24 到 0.25 秒 |
| 50 MiB | 0.24 秒 | 0.23 到 0.26 秒 | 0.41 秒 | 0.37 到 0.47 秒 |
| 200 MiB | 0.47 秒 | 0.35 到 0.54 秒 | 0.96 秒 | 0.90 到 1.01 秒 |
| 500 MiB | 1.07 秒 | 1.00 到 1.34 秒 | 2.26 秒 | 1.93 到 2.41 秒 |
| 1,000 MiB | 2.16 秒 | 1.94 到 5.09 秒 | 4.68 秒 | 4.23 到 4.97 秒 |

**我们测得**对已挂起 actor 的一次请求的耗时，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），gVisor，一个 kind 节点。时间在客户端测得，经由 `kubectl ate proxy`。在这条路径上，对运行中 actor 的请求用了 0.06 秒。对象存储那一列里，atelet 的上传延迟设为 3 秒，分离延迟设为 10 秒。那次运行的全部 55 个请求都返回了 200：5 次首次调用、25 次恢复和 25 次对运行中 actor 的调用。

atelet 的日志说明了第二列的时间花在哪里。

```listing
title: 对象存储中 500 MiB actor 的一次恢复，按 atelet 的计时
source: capture/lab/C-resume-vs-size/33-atelet-upload-detach.log
lang: text
note: 一行日志。保留了八个字段，其余已截掉。
---
{"time":"2026-11-12T11:37:01.905071369Z","level":"INFO","msg":"Restore timing breakdown",…"ate.actor.name":"o500",…"ate.snapshot.fidelity":"memory",…"ate.actor.restore.duration.download":1.171619862,…"ate.actor.restore.duration.worker_restore":0.326837467,"ate.actor.restore.duration.total":1.5049079490000001,…
```

在 atelet 统计的 1.50 秒里，下载用了 1.17 秒。worker 做恢复本身需要 0.33 秒。

我们对这台机器的经验法则有两个数字。一次恢复的固定开销是 0.2 秒，从节点恢复时每 MiB 再加约 2 毫秒。从对象存储恢复时，每 MiB 的开销大约翻倍。这条法则有四个前提，你必须逐条对照自己的情况。

- 内存是随机的，所以每个 MiB 都有数据。法则统计的是有数据的内存，下一小节会说明。
- 对象存储运行在同一个集群、同一块磁盘上。在另一台客户机上，到 bucket 的往返时间增加 20 毫秒，就让 1,000 MiB 的恢复从 4.8 秒变成 10.2 秒。[第 8.1 节](#s-postgres-and-the-object-store)有那次运行。
- 沙箱是 gVisor。在 microVM 类别上，同一个测试的固定开销是 0.3 秒，500 MiB 以内每 MiB 约 1 毫秒。[第 4.2 节](#s-sandbox-classes)有对比。
- 机器是一台 2019 年服务器 CPU 上的嵌套客户机。

项目声称恢复用时不到 500 毫秒，但没有给出 actor 大小，也没有给出机器。在我们的客户机上，从节点恢复时这个说法在约 200 MiB 以内成立，从对象存储恢复时在约 50 MiB 以内成立。

## 法则统计的是有数据的内存 {#s-suspendactor-and-resumeactor-the-rule-counts-memory-that-holds-data}

随机字节对快照来说是最坏情况。我们用三种内存，在 200 和 500 MiB 上重复了节点路径的测试。

| 持有的内存 | 全是零字节 | 一半零、一半随机 | 全是随机字节 |
|---|---|---|---|
| 200 MiB | 0.24 秒 | 0.28 秒 | 0.42 秒 |
| 500 MiB | 0.23 秒 | 0.57 秒 | 1.07 秒 |

**我们测得**每个单元格 10 次从节点的恢复，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。每个单元格是中位数，沙箱是 gVisor。全部 60 次恢复都返回了 200，每个计数都接着数下去。随机那一列与前面的表相比，误差在 12% 以内。

有 500 MiB 零页的 actor，恢复速度和空 actor 一样快。一半数据就带来大约一半的额外耗时。所以应把有数据的 MiB 数代入法则，而不是模板的上限。[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)说明快照大小也跟随同样的字节数。

## 普通运行时：占 245 MiB 的 Python {#s-suspendactor-and-resumeactor-an-ordinary-runtime-python-with-245-mib}

压舱 actor 不是真正的应用。我们用一个 Python 服务检验了这条法则，它在启动时构建一个含一百万个随机 100 字节值的 dict。它在内存里保存一个计数器，并在 `durableDir` 卷上保存一个 SQLite 文件。

```listing
title: Python actor，从启动到第一张表
source: capture/lab/V-validation/02-python-runtime/img/app.py
lang: python
note: 文件的前十一行。下面的 HTTP 处理函数已截掉。
---
import os, resource, sqlite3, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

started = time.time()
state = {"count": 0, "ready": False}
data = {i: os.urandom(100) for i in range(1_000_000)}
os.makedirs("/data", exist_ok=True)
db = sqlite3.connect("/data/app.db", check_same_thread=False)
db.execute("create table if not exists hits (n integer)")
db.commit()
state["ready"] = True
…
```

| 步骤 | 结果 |
|---|---|
| 从节点恢复 | 中位数 0.41 秒，0.37 到 0.54 秒，n=10 |
| 新 actor 的首次调用 | 中位数 0.63 秒，0.62 到 0.99 秒，n=5 |
| 异步挂起 | 中位数 0.81 秒，n=10 |
| 同步挂起 | 中位数 1.93 秒，n=3 |
| 节点上的快照 | 215.2 MiB |

**我们测得**镜像 `python:3.13-slim` 的一个 actor，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。沙箱是 gVisor，上限是 768 MiB，保真度是内存。进程报告的常驻内存峰值是 245 MiB。全部 29 个请求都返回了 200。内存计数器、SQLite 行数和 dict 在 13 次挂起之间都保持连续，进程 ID 始终是 1。

法则成立。它给出 0.2 秒加上 215 MiB 乘 2 毫秒，合计 0.63 秒，而实测中位数是 0.41 秒。解释器的堆并不全是随机数据，所以对它来说这条法则是上界估计。

有一个细节对读取时钟的代码很重要。进程在第一个请求时报告的运行年龄是 32.9 秒，13 次挂起之后的最后一个请求时是 65.1 秒。在 gVisor 下，actor 的时钟不计入它被挂起的时间。[第 4.2 节](#s-sandbox-classes)在这一点上比较了两个类别。

## 在 Apple silicon 上做同样的测试 {#s-suspendactor-and-resumeactor-the-same-test-on-apple-silicon}

**我们测得**节点路径的数据，环境是一台 Apple silicon 笔记本上的 Docker Desktop，分给 Docker 10 个 CPU 和 8 GB。每种大小测了 10 次恢复。中位数恢复在 0 MiB 时是 0.09 秒，50 MiB 时是 0.09 秒，200 MiB 时是 0.16 秒。中位数异步挂起分别是 0.10、0.15 和 0.24 秒。全部 66 个请求都返回了 200，每个计数都接着数下去。笔记本上超过 200 MiB 的情况和对象存储路径，留待下一版再测。

笔记本和服务器客户机是不同的机器。每张表只能单独读，不要在它们之间取比值。

## 我们的判断 {#s-suspendactor-and-resumeactor-our-position}

自己调用 `SuspendActor`，由知道一轮何时结束的组件来调用。正常情况用异步模式，因为在 1,000 MiB 时调用方的等待时间只有同步模式的三分之一。任何不能丢的状态都用同步模式，因为它在调用返回之前就让快照持久化了。

持久快照不会移动 actor。在我们的双节点运行里，一个同步挂起的 actor 在自己的节点被设为不可调度时，仍在本节点恢复。节点停止时，actor 的请求失败，并变成 `ACTOR_STATE_CRASHED`。排空（drain）是例外：三个已挂起的 actor 在下一个请求到来时于另一个节点上恢复了。[第 4.3 节](#s-placement)有这些运行。

只挂起没有未完成请求的 actor。恢复预算要按 actor 里有数据的内存来算，不要按宣传数字来算。

```takeaways
- 从你的 harness 调用 SuspendActor，因为 Substrate 不会挂起空闲的 actor。
- 调用方不能等上传完成时，用默认的异步模式。
- 对不能丢的状态用 --mode sync，但不要指望它移动 actor。
- 只在 actor 没有未完成请求时挂起它，否则请求会得到 503。
- 从节点恢复时，预算 0.2 秒加上每个有数据的 MiB 2 毫秒。
- 快照来自对象存储时，每 MiB 的开销翻倍。
- 测量你自己的 actor，并把这条法则当作真实堆的上界估计。
```

来源：capture/lab/summary/object-store-x86.json, capture/lab/summary/node-drain-x86.json, capture/lab/L-gaps/multinode/60-sticky-cordon.tsv, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/summary/resume-x86.json, capture/lab/summary/suspend-x86.json, capture/lab/summary/resume-mac.json, capture/lab/summary/failures-x86.json, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/B-lifecycle/13-workers.txt, capture/lab/C-resume-vs-size/10-local.tsv, capture/lab/C-resume-vs-size/32-object-store.tsv, capture/lab/C-resume-vs-size/31-atelet-args-patched.txt, capture/lab/C-resume-vs-size/33-atelet-upload-detach.log, capture/lab/C-resume-vs-size/main.go, capture/lab/M-mac-arm64/80-local.tsv, capture/lab/summary/kagent-turns-x86.json, capture/lab/summary/validation-memory-x86.json, capture/lab/V-validation/01-compressible/10-compressible.tsv, capture/lab/V-validation/02-python-runtime/10-python.tsv, capture/lab/V-validation/02-python-runtime/img/app.py, capture/lab/V-validation/02-python-runtime/tmpl-pyagent.yaml, capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv. Agent Substrate v1.0.0: api/ateapi/v1/ateapi.proto (SuspendActorRequest, DurabilityMode, ResumeActorRequest), cmd/ateapi/internal/controlapi/workflow_suspend.go, workflow_resume.go, internal/ateworker/suspend (not imported by any binary), docs/reference/api-guide.md (Eviction, ResumeActor, SuspendActor), docs/get-started/quickstart.md, README.md (the resume claim).
