# Actor 与它的七种状态

> actor 任何时刻都处于七种状态之一，这个状态决定了请求、恢复和挂起各自的结果。

向你的 actor 发请求，返回了 503。`kubectl get pods` 显示每个 pod 都是 Running，worker pod 的日志里也没有提到你的 actor。Kubernetes 给不出更多线索，因为 actor 不是 pod。它的状态是 Postgres 里的一行记录，`kubectl ate get actors` 读的就是这一行。

读完本节，你能读出 actor 的状态，并说出触发它转换的调用。你还能预测请求在每种状态下的结果。

## Actor 对象 {#s-actor-states-the-actor-object}

**Actor：** ActorTemplate 的一个实例，名称在它的 atespace 内唯一。actor 是 Substrate 挂起和恢复的单位。每次恢复之后，它都可能运行在不同的 worker 上。

下面是快速入门里的计数器 actor 在运行时的样子。

```listing
title: 处于 ACTOR_STATE_RUNNING 的 actor my-counter-1
source: capture/lab/B-lifecycle/26-actor-after-revert.yaml
lang: yaml
note: 已截掉快照列表和运行时属性。
---
actorTemplate:
  atespace: ate-demo-counter
  name: counter
metadata:
  atespace: ate-demo-counter
  createTime: "2026-11-12T10:13:40.987568669Z"
  name: my-counter-1
  uid: 6f80f612-7547-4f5b-b3ab-831595621806
  updateTime: "2026-11-12T10:30:18.103768100Z"
  version: "16"
status:
  assignedNode: kind-control-plane
  lastAssignedGeneration: 3
  snapshots:
  …
  state: ACTOR_STATE_RUNNING
  workerAssignment:
    nodeName: kind-control-plane
    …
    workerPod: counter-7cc7dcd596-fps97
    …
    workerPodUid: c572e96d-dd9b-4500-b0e3-880a98d9f61d
    workerPool: counter
```

| 字段 | 它告诉你什么 |
|---|---|
| `metadata.version` | 计数器，actor 每变化一次就加一。这个 actor 在 17 分钟内涨到了 16。 |
| `status.state` | 七种状态之一。 |
| `status.workerAssignment` | 托管沙箱的 worker pod。只有 worker 持有该 actor 时才会设置。 |
| `status.assignedNode` | actor 运行时是 worker 所在的节点，挂起之后是磁盘上保存最新快照的节点。 |
| `status.snapshots` | actor 可以从中恢复的快照，最多 16 个 {{code}}。 |
| `status.crash` | 时间戳与消息文本。actor 进入 `ACTOR_STATE_CRASHED` 时设置，回退会清除它 {{code}}。 |

`workerAssignment` 和 `assignedNode` 回答的是不同的问题。前者说明 actor 现在哪里运行。后者还指出挂起之后最新快照所在的节点，而[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)说明这份快照能保留多久。

## 七种状态 {#s-actor-states-the-seven-states}

枚举 `ActorState` 在 v1.0.0 有七个值 {{code}}。项目架构页上的状态图只画了其中四个，所以以枚举为准。

| 状态 | actor 拥有什么 | 请求会怎样 |
|---|---|---|
| `ACTOR_STATE_SUSPENDED` | 没有沙箱，有零个或多个快照 | router 先恢复 actor，然后 actor 应答 |
| `ACTOR_STATE_RESUMING` | 一个 worker，以及尚未完成的恢复 | 请求等待同一次恢复 {{code}} |
| `ACTOR_STATE_RUNNING` | worker 上的一个沙箱 | actor 应答 |
| `ACTOR_STATE_SUSPENDING` | 一个 worker，以及尚未完成的检查点 | 挂起开始时仍然打开的请求会得到 503。我们没有测试在这个状态下才到达的请求 |
| `ACTOR_STATE_CRASHED` | 没有沙箱，有一条 `crash` 记录 | 立即返回 503，文本里带有状态 |
| `ACTOR_STATE_REVERTING` | 尚未完成的回退 | 立即返回 503，文本里带有状态 |
| `ACTOR_STATE_DELETING` | 尚未完成的删除 | 立即返回 503，文本里带有状态 |

其中三个状态是稳定的。`ACTOR_STATE_SUSPENDED` 持续到请求或恢复调用到来为止。`ACTOR_STATE_CRASHED` 持续到回退或删除为止，请求不能结束它。`ACTOR_STATE_RUNNING` 持续到调用方挂起 actor，或 Substrate 把它标记为崩溃为止。[第 3.3 节](#s-suspendactor-and-resumeactor)证明了 Substrate 不会自己挂起它。另外四个状态则是某项操作的过渡步骤。

`ACTOR_STATE_RUNNING` 不能证明进程还活着。两个进程已经退出的 actor，在我们 20 分钟的观察里一直显示 `ACTOR_STATE_RUNNING`。[第 3.5 节](#s-crashed-and-revertactor)展示了那次运行。

旧教程里有一个叫 `ACTOR_STATE_PAUSED` 的状态和一个 `kubectl ate pause actor` 命令。两者在 v1.0.0 都已不存在 {{code}}。

```figure
id: fig-3-2
kind: state
title: actor 的七种状态
claim: actor 只能通过 RevertActor 或 DeleteActor 离开 ACTOR_STATE_CRASHED，任何请求都不能恢复它。
caption: 恢复请从上面一行从左往右读，挂起请沿右边缘向下读。粗箭头是唯一离开玫瑰色状态的箭头。琥珀色和玫瑰色箭头是我们在跟踪记录里见到的转换，灰色虚线箭头只来自代码。两个时间是 kagent 客户机上的中位数。来源：capture/lab/B-lifecycle/20-trace-ops.tsv、capture/lab/D-durability/30-local-loss.tsv、capture/lab/J-container-death/10-trace.tsv、capture/lab/K-kagent/logs/actor-state-changes.tsv、capture/lab/summary/kagent-turns-x86.json。
```

## 我们见过的状态转换 {#s-actor-states-the-transitions-we-saw}

我们让 `my-counter-1` 在 13 秒内依次经历挂起、恢复、崩溃和回退。脚本在每一步之后读取状态。

```listing
title: 一个 actor 从挂起到崩溃再回来
source: capture/lab/B-lifecycle/20-trace-ops.tsv
lang: text
note: 跟踪记录中的五行。各列依次是时间、事件、状态、已分配节点、版本和快照。
---
2026-11-12T10:30:09.378Z	state	ACTOR_STATE_SUSPENDED	kind-control-plane	9	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen3
2026-11-12T10:30:10.310Z	state	ACTOR_STATE_RUNNING	kind-control-plane	11	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen3
…
2026-11-12T10:30:11.590Z	state-after-crash	ACTOR_STATE_CRASHED	kind-control-plane	12	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen3
…
2026-11-12T10:30:17.724Z	state	ACTOR_STATE_SUSPENDED	-	14	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen3
…
2026-11-12T10:30:18.333Z	state	ACTOR_STATE_RUNNING	kind-control-plane	16	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen3
```

看版本这一列。一次恢复把它从 9 推到 11，回退把它从 12 推到 14。每个操作会写两次 actor：一次写入过渡状态，一次写入稳定状态。我们的脚本在每条命令返回之后才读状态，所以从没见到中间那个状态。

`ate-api-server` 的日志确实显示了这些状态。[第 3.1 节](#s-actortemplate-and-the-golden-snapshot)的清单里，`resuming` 在 `running` 之前，`suspending` 在 `suspended` 之前，`deleting` 在 `deleted` 之前。

**我们测得** kagent 运行里的过渡状态耗时，环境是第二台 x86 服务器客户机（16 vCPU、31 GB）。在那里 harness 每一轮都恢复并挂起一次 actor。98 轮里，actor 在 `ACTOR_STATE_RESUMING` 停留的中位数是 0.38 秒。99 次挂起里，它在 `ACTOR_STATE_SUSPENDING` 停留的中位数是 0.14 秒。这些 actor 只保存文件，所以耗时很低。

过渡状态也可能持续很久。在依赖故障测试里，有一个 actor 在 Postgres 恢复五分钟之后仍处于 `ACTOR_STATE_RESUMING`。[第 8.2 节](#s-when-a-dependency-is-down)讲了这个案例。

## 谁来变更 actor 的状态 {#s-actor-states-who-moves-an-actor}

| 调用 | 接受的起始状态 | 结果 | 谁来调用 |
|---|---|---|---|
| `CreateActor` | 没有 actor | `SUSPENDED` | 你，或你的 harness |
| `ResumeActor` | `SUSPENDED`、`RESUMING`（调用会接续这次恢复）和 `RUNNING`（无变化） | `RESUMING`，然后 `RUNNING` | router 为每个请求调用，或 `kubectl ate resume actor` |
| `SuspendActor` | `RUNNING` | `SUSPENDING`，然后 `SUSPENDED` | 你，或你的 harness |
| `RevertActor` | `CRASHED`、`RUNNING`、节点上有快照的 `SUSPENDED`，以及 `REVERTING`（调用会接续这次回退） | `REVERTING`，然后 `SUSPENDED` | 你，或你的 harness |
| `DeleteActor` | 每个状态 | `DELETING`，然后 actor 消失 | 你，或你的 harness |

Substrate 自己只做一种状态转换：沙箱、worker 或一次恢复丢失时，它把 actor 标记为 `ACTOR_STATE_CRASHED`。[第 3.5 节](#s-crashed-and-revertactor)列出了我们到达这个状态的每一种方式。

状态不对时发出的调用不会等待。对崩溃的 actor 调用 `ResumeActor`，会立即返回 `FailedPrecondition`，请求则得到同样文本的 503。对已挂起的 actor 调用 `SuspendActor`，会原样返回 actor，不做任何改变 {{docs}}。

router 对每个请求都调用 `ResumeActor`，actor 在运行时也一样。对运行中的 actor，这个调用成功，不改变任何东西，并返回 `resumed=false` {{code}}。所以一个普通的 HTTP 请求就足以启动已挂起的 actor。[第 1.2 节](#s-one-request-from-client-to-actor)跟踪了这样一个请求。

我们的判断：先读状态，再去调试网络。`kubectl ate get actors -a <atespace>` 只要一次调用。它能把崩溃的 actor、已满的 worker 池和死掉的进程区分开，而这三者的修复方法各不相同。

```takeaways
- 先用 kubectl ate get actors 读状态，再读 pod 日志。
- 以 proto 里的枚举作为状态列表，不要以文档里的图为准。
- 观察 metadata.version，判断 actor 在两次读取之间是否变化。
- 发一个请求来启动已挂起的 actor，因为 router 会调用 ResumeActor。
- 只有你自己的调用能结束 CRASHED，也只有调用或崩溃能结束 RUNNING。
```

来源：capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/93-after-node-return.tsv, capture/lab/summary/kagent-turns-x86.json, capture/lab/B-lifecycle/26-actor-after-revert.yaml, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/B-lifecycle/00-actor-before.json, capture/lab/B-lifecycle/25-actor-crashed.yaml, capture/lab/D-durability/30-local-loss.tsv, capture/lab/J-container-death/10-trace.tsv, capture/lab/K-kagent/logs/actor-state-changes.tsv, capture/lab/E-dependency-loss/21-nonsteady-actors-after.txt, capture/lab/summary/failures-x86.json. Agent Substrate v1.0.0: api/ateapi/v1/ateapi.proto (ActorState, ActorStatus, Actor), cmd/ateapi/internal/controlapi/workflow_resume.go, workflow_suspend.go, workflow_revert.go, docs/reference/api-guide.md (ResumeActor, SuspendActor, RevertActor, DeleteActor), docs/concepts/architecture.md (the state diagram).
