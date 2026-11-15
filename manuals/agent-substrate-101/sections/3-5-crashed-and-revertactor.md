# CRASHED 与 RevertActor

> actor 崩溃后会一直保持崩溃，直到你调用 RevertActor，它把 actor 带回最近一个已完成的快照，并丢弃其后的所有调用。

你的集群有一个节点在夜里重启了。早上，有些会话返回 503，文本里提到 `AssignWorker`。有一个会话返回 503，文本里提到上游连接。`kubectl get pods` 显示每个 pod 都是 Running。Substrate 不会自己修复这些会话，新的请求也不会。

读完本节，你能根据错误文本判断 actor 处于哪种状态。你还能用 `RevertActor` 把 actor 找回来，并说出它丢失了哪些调用。

## 到达 CRASHED 的所有路径 {#s-crashed-and-revertactor-every-way-we-reached-crashed}

**ACTOR_STATE_CRASHED：** actor 的沙箱、worker 或恢复丢失时的状态。此时 actor 没有 worker。它的 `status.crash` 字段记录一个时间和一条消息。

| 我们做了什么 | 调用方收到的第一个响应 | `status.crash.message` |
|---|---|---|
| 删除运行中 actor 的 worker pod | 503，`AssignWorker prerequisite not met` | `worker pod went away while hosting the actor` |
| 上传之前删掉节点上的快照，然后发请求 | 500，`error resuming actor lab-c/x1` | `resume failed: atelet Restore: snapshot` … `has no usable local copy and no uploaded copy` |
| 上传之前重启节点，然后发请求 | 500，`error resuming actor lab-c/r1` | `resume failed: atelet Restore: worker restore failed with a retryable error 3 times in a row, giving up` |
| 让 actor 分配的内存超过上限 | 503，`upstream connect error`，随后 503，`AssignWorker prerequisite not met` | `killed for exceeding its memory limit` |
| 在 actor 运行时重启节点 | 503，`AssignWorker prerequisite not met` | 我们没有记录 |

第一行是最直接的情形。actor 对象会告诉你发生了什么。

```listing
title: 删除 worker pod 之后 my-counter-1 的状态
source: capture/lab/B-lifecycle/25-actor-crashed.yaml
lang: yaml
note: 两部分之间的快照列表已截去。
---
status:
  assignedNode: kind-control-plane
  crash:
    crashTime: "2026-11-12T10:30:11.170436971Z"
    message: worker pod went away while hosting the actor
  lastAssignedGeneration: 3
  …
  state: ACTOR_STATE_CRASHED
```

第二行和第三行是异步挂起的代价。两种情况下，最新的快照都是 `SNAPSHOT_STORAGE_STATE_PENDING`，所以唯一的副本在一个节点上。两种情况下，actor 看起来仍然正常：它的状态是 `ACTOR_STATE_SUSPENDED`。尝试恢复它的那个请求发现了丢失，并使它崩溃。

```listing
title: 待上传快照丢失，下一个请求使 actor 崩溃
source: capture/lab/D-durability/30-local-loss.tsv
lang: text
note: actor x1 的六行。两条 state 行中的快照列已截去。
---
2026-11-12T11:30:18.606Z	x1	removed-node-local-snapshot	uid 085b45fb-edb9-4523-ad30-3da55b3f34f0
2026-11-12T11:30:18.708Z	x1	call-after-loss	500	0.082402	error resuming actor lab-c/x1
2026-11-12T11:30:18.911Z	x1	state	ACTOR_STATE_CRASHED	kind-control-plane	…
2026-11-12T11:30:23.997Z	x1	call-again	503	0.063957	actor lab-c/x1 unavailable: AssignWorker prerequisite not met for Actor: lab-c/x1 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)
…
2026-11-12T11:30:25.241Z	x1	call-after-revert	200	0.416152	count=4 mb=50 fill=random sum=6296 process_age_s=0.8
2026-11-12T11:30:25.434Z	x1	state	ACTOR_STATE_RUNNING	kind-control-plane	…
```

Substrate 没有自己改用更早的、已完成的快照。这个 actor 在对象存储里有一份，请求仍然失败了。

节点重启还有一个细节，是上面的表格没有体现的。

**我们测得**一次节点重启，在 x86 服务器客户机上。Kubernetes API 在 8 秒后应答，所有 pod 在 147 秒后运行。我们在不到两秒之后发出请求。崩溃消息没有提到丢失的快照，只说恢复失败了三次，因为 worker 还没有注册。所以，节点重启之后过早到达的请求，可能使挂起的 actor 崩溃，更晚的请求我们没有测。

有一个事件没有使任何东西崩溃。我们在快照待上传时删除了 atelet pod，下一个请求返回 200，计数完好。快照在节点的磁盘上，不在 atelet 里。

## 调用方看到什么 {#s-crashed-and-revertactor-what-the-caller-sees}

有两种文本说明 actor 已崩溃。

- `error resuming actor <atespace>/<name>`，状态码 500。只有发现丢失的那个请求会得到这条文本。
- `actor <atespace>/<name> unavailable: AssignWorker prerequisite not met for Actor: <atespace>/<name> (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)`，状态码 503。之后的每个请求都得到这条文本，而且立刻返回。

`kubectl ate resume actor` 会被拒绝，文本相同，gRPC 错误码是 `FailedPrecondition`。

```listing
title: 崩溃的 actor 拒绝恢复
source: capture/lab/B-lifecycle/20-trace-ops.tsv
lang: text
note: 一行。我们的跟踪只保留了输出的前 200 个字符，所以状态名的末尾缺失。
---
2026-11-12T10:30:17.301Z	resume-while-crashed	0.207s	Error: failed to resume actor: rpc error: code = FailedPrecondition desc = AssignWorker prerequisite not met for Actor: ate-demo-counter/my-counter-1 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPEN
```

重试没有用。不要把这个 503 放进用来处理 worker 池已满时 503 的同一个重试循环里。

## 状态里在运行，沙箱里已死亡 {#s-crashed-and-revertactor-running-in-the-state-dead-in-the-sandbox}

有一种故障根本不会到达 `ACTOR_STATE_CRASHED`。我们让一个 actor 调用 `os.Exit(3)`。

```listing
title: 进程退出，actor 仍是 RUNNING
source: capture/lab/J-container-death/10-trace.tsv
lang: text
note: actor j1 的五行。文件中还有五对第二行和第三行的内容。快照列和错误的末尾已截去。
---
2026-11-12T11:30:45.229Z	j1	exit-request	200	0.065314	exiting with code 3
2026-11-12T11:30:47.441Z	j1	state	ACTOR_STATE_RUNNING	kind-control-plane	…
2026-11-12T11:30:47.518Z	j1	call	503	0.058459	upstream connect error or disconnect/reset before headers. reset reason: connection termination
…
2026-11-12T11:31:00.122Z	j1	suspend-attempt	Error: failed to suspend actor: rpc error: code = Internal desc = internal server error: workflow failed at step CallAteletSuspend: actor lab-c/j1 crashed…
2026-11-12T11:31:00.333Z	j1	state	ACTOR_STATE_CRASHED	kind-control-plane	…
```

**我们测得**每种死亡方式各一个 actor，在 x86 服务器客户机上。退出之后，14 秒内的 6 次采样里，状态 6 次都是 `ACTOR_STATE_RUNNING`，6 个请求全部收到 Envoy 返回的 503。内存被杀则不同：Substrate 在触发分配的请求之后 2.3 秒记录了崩溃。这段间隔里有一个请求收到了 Envoy 的文本。

十四秒说明不了太多问题，所以我们重做了退出测试，并观察了 20 分钟。一个 actor 没有收到请求。第二个 actor 每 60 秒收到一个请求。

```listing
title: 退出 20 分钟后，再执行一次挂起
source: capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv
lang: text
note: 没有收到请求的 actor e1 的六行。e1 之后的 80 条 state 行已截去，它们全部是 ACTOR_STATE_RUNNING。快照列和错误的末尾已截去。
---
2026-11-12T12:45:20.264Z	e1	exit-request	200	0.068987	exiting with code 3
2026-11-12T12:45:36.467Z	e1	state	ACTOR_STATE_RUNNING	kind-control-plane	…
…
2026-11-12T13:05:57.588Z	e1	call-after-watch	503	0.070948	upstream connect error or disconnect/reset before headers. reset reason: connection termination
2026-11-12T13:05:57.886Z	e1	suspend-attempt	Error: failed to suspend actor: rpc error: code = Internal desc = internal server error: workflow failed at step CallAteletSuspend: actor lab-v/e1 crashed…
2026-11-12T13:05:58.168Z	e1	state	ACTOR_STATE_CRASHED	kind-control-plane	…
2026-11-12T13:05:58.604Z	e1	after-revert	ACTOR_STATE_SUSPENDED	-	…
```

**我们测得**两个 actor，在 x86 服务器客户机上（24 vCPU、47 GB、嵌套 KVM），观察了退出之后的 20 分 36 秒。两个 actor 在每次采样中都是 `ACTOR_STATE_RUNNING`，采样间隔 15 秒，分别有 81 次和 80 次。发给第二个 actor 的 20 个请求全部返回 Envoy 的 503。观察结束后的首次挂起失败了，并把 actor 标记为崩溃。回退使它回到 `ACTOR_STATE_SUSPENDED`，下一次调用返回 200，计数是最后一个持久快照的值。

所以在 20 分钟里，无论有没有请求，Substrate 都没有自己发现进程退出。每个死掉的 actor 在这段时间里还一直占着它所在 worker 的一个 CPU，[第 4.5 节](#s-sizing-a-pool)会计入这一点。更长时间的观察和 worker 重启，留待下一版测试。

在两次运行中，都是挂起操作发现了进程退出。检查点失败，失败的挂起把 actor 标记为崩溃。

你的 harness 必须覆盖退出的情形。如果请求返回 `upstream connect error`，而状态是 `ACTOR_STATE_RUNNING`，就调用 `SuspendActor`，并预期它失败。每一轮之后都挂起的 harness，不需要额外代码就能做到这一点。

## 节点停止时的 actor {#s-crashed-and-revertactor-an-actor-on-a-node-that-stops}

节点停止并一直宕机，会产生另外三种情形，而且没有一种一开始就是 `ACTOR_STATE_CRASHED`。我们在有两个 worker 节点的集群上运行它们，并停掉其中一个。[放置](#s-placement)一节给出了时间线和调度器侧的情况。

| 节点停止时的 actor | 你看到的状态 | 请求或调用的文本 |
|---|---|---|
| 已挂起，随后有请求到达 | `ACTOR_STATE_RESUMING` 持续数分钟，然后是 `ACTOR_STATE_CRASHED` | 客户端超时后返回 504，5 到 8 秒后返回 503 `actor lab-n/u1 unavailable` |
| 运行中 | `ACTOR_STATE_RUNNING` | 503 `upstream connect error or disconnect/reset before headers. reset reason: connection termination` |
| 以上任一种，此时调用 `revert` | `ACTOR_STATE_RESUMING` 或 `ACTOR_STATE_REVERTING` | `another operation is in progress for this actor`，或 `is not in a revertable state (got: ACTOR_STATE_RESUMING`，或 `while calling atelet Terminate` |

**我们测得**这些情形，在另一台 x86 服务器客户机上（16 vCPU、23 GB），使用 gVisor，每种情形一个 actor。快照完整的挂起 actor，从第一个请求起在 `ACTOR_STATE_RESUMING` 停留了 5 分 33 秒，在停止命令之后 5 分 44 秒崩溃。快照待上传的挂起 actor，在停止命令之后 10 分 42 秒仍处于 `ACTOR_STATE_RESUMING`，最后 8 分 43 秒里它没有收到请求。运行中的 actor 在我们探测的 10 分钟和 150 个请求里一直是 `ACTOR_STATE_RUNNING`。

```listing
title: 节点宕机期间，回退被拒绝两次
source: capture/lab/L-gaps/multinode/80-stop-before-upload.tsv
lang: text
note: actor p3 的五行。请求，以及两次回退之间的 10 分钟已截去。我们的跟踪只保留了每个 CLI 错误的前 200 个字符。
---
2026-11-12T12:22:55.258Z	node-stop	docker stop multi-worker2
2026-11-12T12:23:15.930Z	first-request	504	10.054853		|	ACTOR_STATE_RESUMING	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:-,SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_PENDING:gen3:multi-worker2
2026-11-12T12:23:16.115Z	revert-attempt-1	Error: failed to revert actor: rpc error: code = Aborted desc = another operation is in progress for this actor 
…
2026-11-12T12:33:37.802Z	revert-attempt-2	Error: failed to revert actor: rpc error: code = FailedPrecondition desc = Actor lab-n/p3 is not in a revertable state (got: ACTOR_STATE_RESUMING, want one of [ACTOR_STATE_RUNNING ACTOR_STATE_CRASHED], or ACTOR_STATE_SUS
2026-11-12T12:33:38.407Z	probe-after-revert	503	0.193436	actor lab-n/p3 unavailable: AssignWorker prerequisite not met for Actor: lab-n/p3 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)	|	ACTOR_STATE_CRASHED	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:-,SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_PENDING:gen3:multi-worker2
```

这些运行得出三条规则。

- **持续的 `ACTOR_STATE_RESUMING` 是症状。** 小 actor 的恢复用不到一秒，而这个状态持续了数分钟。第一次运行中，崩溃发生在 Kubernetes 驱逐 worker pod 之后一秒，那是节点变为 `NotReady` 之后 5 分钟。如果没有请求，就没有动作会把 actor 带出这个状态。
- **停止节点上运行中的 actor 不会被标记为崩溃。** 调用方得到的是进程退出时的文本。要区分这两种情形，运行 `kubectl ate get workers`。在已停止的节点上，worker 是 `WORKER_STATE_UNAVAILABLE`，或者不在列表里。
- **节点宕机期间，回退没有帮助。** 三个 actor 上的 4 次尝试全部失败，或者没有持久的效果。运行中 actor 的回退让它停在 `ACTOR_STATE_REVERTING`。之后每个请求都收到 503，文本带 `(got: ACTOR_STATE_REVERTING, want ACTOR_STATE_SUSPENDED)`。

要走出 `ACTOR_STATE_REVERTING`，办法是再回退一次，而且只能在节点恢复之后。`RevertActor` 接受已处于该状态的 actor，并从上一次尝试停下的那一步继续 {{code}}。后来的一组节点停止场景测试了这一点。

**我们测得**一个用 `--mode sync` 挂起的 actor，在另一台 x86 服务器客户机上（16 vCPU、23 GB），一次运行，回退五次。第一次回退在停止命令后 10 秒开始，20.2 秒后失败，并把 actor 留在 `ACTOR_STATE_REVERTING`。另外三次各用 0.2 秒失败，分别在 50 秒、71 秒和 371 秒。然后我们启动节点。它的 `atelet` 在 15 秒后运行，此时 actor 已是 `ACTOR_STATE_CRASHED`。第五次回退在 0.2 秒内返回，下一个请求在另一个节点上用 0.47 秒返回 200。

```listing
title: 节点宕机期间四次回退失败，第五次成功
source: capture/lab/P-node-loss/74-second-revert.tsv
lang: text
note: actor i9 的六行。各列依次是时间、距停止命令的秒数、事件及其详情。每个错误都截到失败调用的名字为止，第五次回退的 actor 行已截去。
---
2026-11-12T14:51:05.501Z	t=30.6	revert-1-right-after-stop	20.2 s | Error: failed to revert actor: rpc error: code = Unavailable desc = while calling atelet Terminate: …
2026-11-12T14:51:24.853Z	t=50.0	revert-2-after-workers-unavailable	0.2 s | Error: failed to revert actor: rpc error: code = Unavailable desc = while calling atelet Terminate: …
…
2026-11-12T14:56:45.527Z	t=370.7	revert-4-after-eviction	0.2 s | Error: failed to revert actor: rpc error: code = Unavailable desc = while calling atelet Terminate: …
…
2026-11-12T14:57:00.955Z	t=386.1	atelet-on-node-running	atelet-gsmxg:Running atelet-tfq5g:Running 
2026-11-12T14:57:01.180Z	t=386.3	state-before-revert-5	ACTOR_STATE_CRASHED	multi-worker2	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:multi-worker2
2026-11-12T14:57:01.440Z	t=386.6	revert-5-after-node-return	0.2 s | ATESPACE   NAME   TEMPLATE      STATE                   WORKER POD   WORKER IPS   VERSION   AGE lab-n      i9     lab-n/nb-50   ACTOR_STATE_SUSPENDED   <none> …
```

所以，节点宕机期间重复回退并不能完成这件事。在其他情形中，处于 `ACTOR_STATE_REVERTING` 的 actor 又回退了 3 到 28 次，全部失败。每一次失败的回退，都是又一次对不存在的 `atelet` 的调用。

节点恢复之后的结果有一点需要补充说明。在更早的四个情形里，节点启动之后 216 到 223 秒，actor 仍显示 `ACTOR_STATE_REVERTING`，这期间我们没有发任何命令。这些情形里，worker 池的 pod 已被驱逐，节点回来时没有 worker 池 pod。我们的清理随后删除了这些 actor，没有逐个记录结果。所以，在节点返回后，有一次运行的状态自行清除了，另外四次没有。节点返回之后，先看状态，如果仍是 `ACTOR_STATE_REVERTING`，就再发一次回退。

最初几次运行留下的路径也测过了。等到 worker 显示 `WORKER_STATE_UNAVAILABLE` 再回退，只对一种 actor 有效：用 `--mode sync` 挂起，且节点停止后未收到过请求。这用了 7.1 秒，下一个请求在另一个节点上运行。[第 8.2 节](#s-when-a-dependency-is-down)有覆盖每种情形的应急手册。

**不要回退以默认模式挂起的 actor。** 它的最新快照在已停止的节点上仍是 `PENDING`，会随节点一起回来。在一次运行里，节点 81 秒后返回。不回退而直接发请求，0.36 秒返回 200，计数是 6，之前是 5。同样状态的第二个 actor 先做了回退。它的下一个回复计数是 4，所以最后一个持久快照之后的两次调用丢失了。

## RevertActor {#s-crashed-and-revertactor-revertactor}

**RevertActor：** 丢弃 actor 当前的执行状态，将它退回到最近一个已完成持久快照处的 `ACTOR_STATE_SUSPENDED` 状态的调用。它接受崩溃的 actor、运行中的 actor，以及最新快照在某个节点上的挂起 actor {{docs}}。它也接受处于 `ACTOR_STATE_REVERTING` 的 actor，这样你可以再发一次回退 {{code}}。在我们的运行里，这第二次回退只有在 actor 所在的节点回来之后才成功。

回退会停止所有沙箱，删除节点上的快照文件，并删除未完成的上传 {{docs}}。actor 回来时没有指派节点，下一个请求会从对象存储恢复它。

| 运行 | 最近一个已完成的快照 | 之后发出的调用 | 回退后的第一个回复 |
|---|---|---|---|
| 删除 worker pod | 计数 8 | 9、10、11 | 计数 9 |
| 删除节点上的快照 | 计数 3 | 4、5 | 计数 4 |
| 重启节点 | 计数 3 | 4、5 | 计数 4 |

第三列的调用已经没了。actor 的回答就像它们从未发生过。

**我们测得**计数器 actor 的一次回退，在 x86 服务器客户机上：`kubectl ate revert actor` 在 0.22 秒内返回。三次运行中，回退后的第一个请求用了 0.38 到 0.42 秒。节点重启之后，第一个请求等了 5 秒，收到 `no worker has room for the actor`，尽管所有 pod 都在运行。78 秒之后的请求返回 200。[放置](#s-placement)一节解释了这个 503：控制平面返回之后的几秒里，worker 池没有任何 worker 处于活动状态。

回退只让 actor 状态倒回。actor 在快照之后发起的工具调用已经执行了，外部卷也会保留其内容 {{docs}}。外部卷计划在下一版涉及。

```figure
id: fig-3-5
kind: decision
title: 我的 actor 返回 503 或 500
claim: 错误文本告诉你 actor 的状态，状态告诉你唯一有用的那个调用。
caption: 每一行从左往右读。玫红色的框是错误和失败的状态，最后一行是 worker 池已满而 actor 健康。秒数来自我们在 x86 服务器客户机上的运行。来源：capture/lab/D-durability/30-local-loss.tsv、capture/lab/J-container-death/10-trace.tsv、capture/lab/D-durability/10-watch-part1.tsv。
```

我们的判断：在你的 harness 里决定崩溃意味着什么，因为 Substrate 不会替你决定。我们的节点重启之后，`my-counter-1` 一直保持崩溃，直到我们手动回退它。如果 actor 最后几次调用可以重发而不产生第二次影响，自动回退就是安全的。已经执行的工具调用依然已经完成，所以工具必须忽略重复的调用。对其他 actor，请在每个不能承受丢失的时间点用 `--mode sync` 挂起。

```takeaways
- 先读错误文本：AssignWorker 在 got 之后指明了状态，upstream connect error 表示进程或节点已死。
- 对崩溃的 actor 调用 kubectl ate revert actor，因为恢复会被拒绝。
- 对返回 503 的运行中 actor 调用 SuspendActor，让 Substrate 把它标记为崩溃。
- 回退之后，把最近一个 COMPLETED 快照之后的调用算作丢失。
- 节点重启之后，等 worker 注册完再发请求。
- 不要把崩溃的 503 放进处理 worker 池已满的重试循环。
- 把一直停在 RESUMING 的 actor 当作在死节点上的 actor，并检查它的 worker。
- 只对同步挂起、之后没有请求、且 worker 不可用的已停止节点上的 actor 做回退。
- 节点返回之后，如果 actor 仍在 REVERTING，就再发一次回退。
- 节点宕机期间，绝不回退以默认模式挂起的 actor。
```

来源：capture/lab/summary/failures-x86.json, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/B-lifecycle/25-actor-crashed.yaml, capture/lab/B-lifecycle/26-actor-after-revert.yaml, capture/lab/D-durability/30-local-loss.tsv, capture/lab/D-durability/32-x1-after-loss.yaml, capture/lab/D-durability/34-x2-atelet-restart.log, capture/lab/D-durability/40-node-reboot.tsv, capture/lab/D-durability/44-r1-after-reboot.yaml, capture/lab/D-durability/46-after-reboot-followup.txt, capture/lab/D-durability/10-watch-part1.tsv, capture/lab/J-container-death/10-trace.tsv, capture/lab/J-container-death/14-j2-after-oom.yaml, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/V-validation/11-process-exit-long-watch/11-workers-end.txt, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/75-stop-after-upload-revert.tsv, capture/lab/L-gaps/multinode/80-stop-before-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/98-worker-state-rpcs.log, capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/10-a-quiet-revert.tsv, capture/lab/P-node-loss/88-pending-snapshot-node-returns.tsv, capture/lab/P-node-loss/return-b60.tsv, capture/lab/P-node-loss/return-bevict.tsv, capture/lab/P-node-loss/return-cquiet.tsv, capture/lab/P-node-loss/return-creq.tsv, capture/lab/summary/node-loss-x86.json. Agent Substrate v1.0.0: api/ateapi/v1/ateapi.proto (ActorStatus.crash, RevertActorRequest, ReportActorCrashed), cmd/ateapi/internal/controlapi/workflow_revert.go, docs/reference/api-guide.md (ResumeActor, RevertActor, Eviction).
