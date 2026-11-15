# 状态

> 一个 actor 有七种状态，一个快照有两种存储状态，一个 worker 有三种状态，每种状态都会改变请求返回的结果。

下面的名称与编号来自 v1.0.0 的 proto 文件。存储与比较时请使用名称。这些编号在 1.0.0 之前发生过变化，详见[第 8.4 节](#s-upgrade-and-stale-advice)。

“请求实测返回”一列来自我们通过 `kubectl ate proxy` 发起的实测运行。多数行来自 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。停机节点和数据库中断的各行来自第二台 x86 服务器客户机（16 vCPU、23 GB）。这些是第一张表里的 `ACTOR_STATE_RESUMING` 和 `ACTOR_STATE_REVERTING`，以及第二张表里停机节点的各行。

## actor 状态 {#s-ref-states-actor-states}

| 编号 | 状态 | 含义 | 请求实测返回 |
|---|---|---|---|
| 1 | `ACTOR_STATE_RESUMING` | 已绑定 worker，沙箱正在恢复。 | 停机节点上的 actor 在客户端超时时返回 504，随后返回 503 `actor lab-n/u1 unavailable`。另一个 actor 在数据库中断后一直停留在该状态。 |
| 2 | `ACTOR_STATE_RUNNING` | actor 持有 worker，API 将其计为运行中。该状态不能证明其进程有应答。 | 0.06 到 0.09 秒内返回 200。进程已退出的 actor 会保持该状态并返回 503。 |
| 3 | `ACTOR_STATE_SUSPENDING` | worker 正在写入检查点。 | 挂起开始时仍未结束的请求收到 503。处于该状态下的新请求未测。 |
| 4 | `ACTOR_STATE_SUSPENDED` | actor 未持有 worker。它持有快照，或者从未运行过。 | 恢复后在 0.36 秒内返回 200 |
| 5 | `ACTOR_STATE_CRASHED` | 沙箱或其 worker 丢失，或者恢复失败。 | 0.06 秒内返回 503，`AssignWorker prerequisite not met` |
| 6 | `ACTOR_STATE_DELETING` | 工作负载正在停止，随后记录被删除。 | 0.06 到 0.08 秒内返回 503，`AssignWorker prerequisite not met` |
| 7 | `ACTOR_STATE_REVERTING` | actor 正在回到其持久快照。 | 在回退无法触达节点之后，0.06 秒内返回 503，`AssignWorker prerequisite not met` |

编号 0 是 `ACTOR_STATE_UNSPECIFIED`，任何已存储的 actor 都不会处于该状态。没有代表 idle、paused 或 created 的状态。新建 actor 默认处于挂起状态。

```figure
id: fig-r-3
kind: state
title: 七种 actor 状态、全部转移路径以及请求返回的结果
claim: 崩溃的 actor 只能通过 RevertActor 恢复服务，且通向 RUNNING 的每条路径都经过 ResumeActor。
caption: 从左侧的 SUSPENDED 开始阅读。每个方框内的数字是枚举值。每条箭头标有触发它的调用或事件。玫红箭头表示失败。灰色虚线箭头仅来自代码。来源：ActorState 枚举与 v1.0.0 的生命周期工作流、capture/lab/B-lifecycle/20-trace-ops.tsv 以及 capture/lab/J-container-death/10-trace.tsv。
```

## 状态转移 {#s-ref-states-transitions}

| 起始状态 | 目标状态 | 触发条件 | 实测情况 |
|---|---|---|---|
| 无 | SUSPENDED | `CreateActor` | 是，耗时不到 1 秒 |
| SUSPENDED | RESUMING，随后 RUNNING | `ResumeActor`，router 对每个请求都会调用 | 是 |
| RESUMING | CRASHED | 恢复失败。在我们的运行中，原因是节点本地快照缺失，或节点重启后 worker 尚未注册。文档还指出唤醒探测超时也会触发。 | 是，返回 500 `error resuming actor` |
| RUNNING | SUSPENDING，随后 SUSPENDED | `SuspendActor` | 是 |
| SUSPENDED | SUSPENDED | 对已挂起的 actor 执行 `SuspendActor` 会将其原样返回。 | 见于代码 |
| SUSPENDING | CRASHED | 挂起操作无法记录其快照。 | 见于代码 |
| RUNNING | CRASHED | worker pod 被删除。 | 是，在 0.6 秒内 |
| RUNNING | CRASHED | 内核因内存超限杀死了 actor。 | 是，耗时在 2 到 4 秒之间 |
| RUNNING | CRASHED | 节点重启。 | 是 |
| RUNNING | RUNNING | 进程已退出但沙箱仍在。不发生状态转移。 | 是，持续至少 20 分钟 |
| RUNNING | RUNNING | actor 所在的节点停止。不发生状态转移。 | 是，持续至少 10 分钟 |
| RESUMING | CRASHED | actor 所在的节点在恢复之前或期间停止。 | 是，在发出停止命令后 5 分 44 秒发生，此前带着请求在 RESUMING 状态下停留了 5 分 33 秒 |
| RUNNING 或 CRASHED | REVERTING，随后 SUSPENDED | `RevertActor` | 是，从 CRASHED 状态开始耗时 0.22 秒 |
| 带有节点本地快照的 SUSPENDED | REVERTING，随后 SUSPENDED | `RevertActor`，丢弃节点上的副本。只有当上传尚未完成时，快照本身才会丢失。 | 是，在 actor 所在节点恢复之后：下一次回复的计数为 4，随后的两次调用丢失。节点停机期间，actor 一直停留在 REVERTING |
| REVERTING | REVERTING，随后 SUSPENDED | 第二次 `RevertActor`，继续进行中途停止的回退 | 是，耗时 0.2 秒，在节点及其 `atelet` 恢复之后发生。在节点停机期间，4 次回退全部失败，状态保持为 REVERTING |
| REVERTING | CRASHED | actor 所在的节点恢复，且我们未发送任何命令。 | 是，在一次运行中于节点启动后 15 秒观察到。在四次运行中，actor 在 216 到 223 秒后仍处于 REVERTING |
| RUNNING | RUNNING | 对运行中的 actor 执行 `ResumeActor` 会将其原样返回，并带 `resumed=false`。router 对每个请求都依赖这一机制。 | 是，在发往运行中 actor 的每个请求上均观察到 |
| 任意状态 | DELETING，随后被移除 | `DeleteActor` | 是 |

由该表可得出四条规则。

- `ResumeActor` 接受已挂起的 actor、已处于恢复中的 actor 以及运行中的 actor（将其原样返回）。对崩溃的 actor 调用时返回 `FAILED_PRECONDITION`。
- `RevertActor` 接受已处于回退中的 actor，因此第二次回退是完成中断回退的手段。
- 崩溃的 actor 绝不会自行脱离该状态。必须有调用方调用 `RevertActor` 或 `DeleteActor`。
- 回退会使 actor 回到其最后一个已完成的持久快照。在该快照之后发生的调用都将丢失。

## 快照存储状态 {#s-ref-states-snapshot-storage-states}

| 状态 | 含义 | 实测耗时 |
|---|---|---|
| `SNAPSHOT_STORAGE_STATE_PENDING` | 快照位于单个节点上，尚未进入 bucket。 | 在默认定时器下，四个 actor 在异步挂起后持续 5 分 1 秒到 5 分 11 秒 |
| `SNAPSHOT_STORAGE_STATE_COMPLETED` | 快照已进入 bucket。 | 在同步挂起返回前达成 |

快照的 `locality` 字段标明仍持有本地副本的节点。在我们的运行中，它在挂起后保留了 30 分钟，之后消失。`owner` 字段在快照属于 actor 自身时为 `SNAPSHOT_OWNER_ACTOR`，在快照为黄金快照或带标签快照时为 `SNAPSHOT_OWNER_TAG`。

## 快照保真度 {#s-ref-states-snapshot-fidelity}

| 取值 | 恢复时带回的内容 |
|---|---|
| `SNAPSHOT_FIDELITY_VOLUMES` | 持久目录。各进程重新启动。 |
| `SNAPSHOT_FIDELITY_ROOTFS` | 持久目录以及对根文件系统的修改。各进程重新启动。 |
| `SNAPSHOT_FIDELITY_MEMORY` | 以上全部内容加上各进程的内存，进程继续运行。 |

## worker 状态 {#s-ref-states-worker-states}

| 状态 | 含义 |
|---|---|
| `WORKER_STATE_UNAVAILABLE` | 已注册，且调度器不向其放置任何 actor。新 worker 从该状态开始。 |
| `WORKER_STATE_ACTIVE` | 调度器在其仍有空间时向其放置 actor。 |
| `WORKER_STATE_DRAINING` | 终止中。不再放置新 actor，已绑定的 actor 保留直到被挂起。单向不可逆。 |

`kubectl ate get worker` 会输出该状态，以及对照容量预留的 actor 数量、CPU 和内存。

## 挂起的持久性模式 {#s-ref-states-durability-modes-of-a-suspend}

| 取值 | CLI | 调用何时返回 |
|---|---|---|
| `DURABILITY_MODE_ASYNCHRONOUS` | `--mode async`（默认值） | 快照到达节点时 |
| `DURABILITY_MODE_SYNCHRONOUS` | `--mode sync` | 新快照进入 bucket 后。已处于挂起状态的 actor 会被原样返回，其快照在节点上可能仍处于 pending 状态。 |

来源：capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/88-pending-snapshot-node-returns.tsv, capture/lab/P-node-loss/return-b60.tsv, capture/lab/summary/node-loss-x86.json, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, api/ateapi/v1/ateapi.proto (enums ActorState, SnapshotStorageState, SnapshotOwner, SnapshotFidelity, WorkerState, DurabilityMode, and the comments on RevertActor and SuspendActor), cmd/ateapi/internal/controlapi/workflow_resume.go, workflow_suspend.go and workflow_revert.go, and docs/reference/api-guide.md at v1.0.0; capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/93-after-node-return.tsv, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/D-durability/10-watch-part1.tsv, capture/lab/D-durability/10-watch-part2.tsv, capture/lab/D-durability/30-local-loss.tsv, capture/lab/D-durability/46-after-reboot-followup.txt, capture/lab/J-container-death/10-trace.tsv, capture/lab/E-dependency-loss/21-nonsteady-actors-after.txt, capture/lab/summary/failures-x86.json.
