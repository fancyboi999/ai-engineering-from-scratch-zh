# 故障演练

> 一个脚本在测试集群上引发六种故障，并输出每种故障的症状、状态、修复方式以及恢复耗时。

你的第一个崩溃 actor 总会在最糟糕的时刻出现。用户报告了 503，而你看到的是从未见过的错误文本。今天你花上大约一分钟，就能在一个无人依赖的集群上看到所有这些文本。

读完本节，你能在自己的集群上运行本手册中的这六种故障。你还能将自己的恢复耗时与我们的数据进行对比，并清楚哪种修复方式对应哪种症状。

## 演练做些什么 {#s-a-failure-drill-what-the-drill-does}

**故障演练（failure drill）：** 一个在一个可以随时丢弃的集群上有意引发每种已知故障，并记录客户端所见情况的脚本。

该演练使用一个很小的 actor。它对请求计数，并有两个额外路径。向 `/exit` 发送请求会终止进程。向 `/oom` 发送请求会不断申请内存，直到沙箱将其停止。pool 中有两个 worker，每个只容纳一个 actor，因此 pool 很容易被填满。

```figure
id: fig-9-4
kind: timeline
title: 六种故障，从症状到首次正常应答
claim: 在执行修复后，六种故障全部在不到一秒内给出了正常应答，并且只有一种故障需要执行两条命令。
caption: 每行从左向右读。玫瑰色标记第一个失败的请求，标签标出修复方式，绿色标记修复后的第一个正常应答。来源：capture/lab/summary/demos-x86.json。
```

对于每种情况，脚本都会打印同样的五个事实。症状是第一个失败请求的状态码、耗时和响应体。状态是 `kubectl ate get actor` 报告的内容。修复方式是我们运行的命令。恢复行是修复后第一个返回 200 的请求。

```bash
export REGISTRY=localhost:5001
export KIND_NODE=kind-control-plane
./drill.sh setup
./drill.sh run | tee my-drill.log
```

该脚本大约有 200 行 shell 代码，actor 包含 45 行 Python 代码。两者都在[故障演练目录](manuals/agent-substrate-101/capture/demos/failure-drill)。每种情况的核心代码都很短，以下是第一种情况。

```bash
actor d1 8701
call 8701 / > /dev/null
pod=$(K get actor d1 -a "$SPACE" | awk 'NR == 2 { print $5 }' | cut -d/ -f2)
kubectl -n "$SPACE" delete pod "$pod" --grace-period=0 --force
report detect "CRASHED after $(wait_state d1 ACTOR_STATE_CRASHED)"
report symptom "$(call 8701 /)"
K revert actor d1 -a "$SPACE"
report recover "$(call 8701 /)"
```

## 录制的运行过程 {#s-a-failure-drill-the-recorded-run}

**我们测得**在第二台 x86 服务器客户机（16 vCPU、31 GB）上的完整运行。Substrate 来自正式发布镜像，搭配 Envoy 数据平面。六种情况的总耗时为 70 秒。

有三种情况在没有外部干预的情况下直接以 `ACTOR_STATE_CRASHED` 告终，并且一条命令就能修复它们中的每一种。

```listing
title: 被删除的 worker pod、丢失的快照以及超出内存限制的 actor
source: capture/lab/N-demos/failure-drill/drill-run.log
lang: text
note: 情况 1、2 和 4。长行在标记处截断。
---
== 1 worker pod deleted under a running actor
  detect    CRASHED after 0.2 s
  symptom   503 in 0.073744 s: actor demo-drill/d1 unavailable: AssignWorker prerequisite not met for Actor: demo-dril …
  state     ACTOR_STATE_CRASHED
  fix       kubectl ate revert actor d1 -a demo-drill (0.2 s)
  recover   200 in 0.327434 s: count=1 process_age_s=27.9
== 2 node-local snapshot removed before the upload
  symptom   500 in 0.078639 s: error resuming actor demo-drill/d2
  state     ACTOR_STATE_CRASHED
  fix       kubectl ate revert actor d2 -a demo-drill (0.2 s)
  recover   200 in 0.413543 s: count=4 process_age_s=32.3 (durable snapshot held count=3)
…
== 4 the actor uses more memory than its limit
  detect    CRASHED after 2.9 s
  symptom   503 in 0.062056 s: actor demo-drill/d4 unavailable: AssignWorker prerequisite not met for Actor: demo-dril …
  state     ACTOR_STATE_CRASHED
  fix       kubectl ate revert actor d4 -a demo-drill (0.2 s)
  recover   200 in 0.364615 s: count=1 process_age_s=47.3 (new actor from the golden snapshot)
```

请仔细阅读这三条恢复行，因为每个 actor 回到的是不同的时间点。情况 1 中的 actor 没有自己的快照，因此它从黄金快照重启，计数为 1。情况 2 中的 actor 在计数为 3 时拥有一个持久快照，因此它应答时计数为 4。故障发生前的第 4 次和第 5 次调用丢失了。[CRASHED 与 RevertActor](#s-crashed-and-revertactor) 解释了这一规则。

第三种情况是值得专门练习的情况。沙箱内部的进程退出了，而 Substrate 并没有察觉。

```listing
title: 进程退出导致 actor 仍留在 running 状态
source: capture/lab/N-demos/failure-drill/drill-run.log
lang: text
note: 情况 3。长行在标记处截断。
---
== 3 the actor process exits inside the sandbox
  symptom   503 in 0.055202 s: upstream connect error or disconnect/reset before headers. reset reason: connection ter …
  state     ACTOR_STATE_RUNNING (5 s after the exit)
  detect    suspend fails, state ACTOR_STATE_CRASHED
  fix       kubectl ate suspend actor d3, then kubectl ate revert actor d3 (0.7 s)
  recover   200 in 0.408503 s: count=2 process_age_s=41.6 (durable snapshot held count=1)
```

进程退出 5 秒后，状态依然是 `ACTOR_STATE_RUNNING`，并且每个请求都从代理处收到 503。演练调用 `SuspendActor` 促使 Substrate 检查。该调用失败，状态变为崩溃，随后的回退随即生效。两条命令加在一起耗时 0.7 秒。

最后两种情况并非崩溃。没有 actor 需要执行回退。

```listing
title: pool 已满，以及没有 Postgres 的 30 秒
source: capture/lab/N-demos/failure-drill/drill-run.log
lang: text
note: 情况 5 和 6。长行在标记处截断。
---
== 5 more running actors than the pool has room for
  symptom   503 in 5.050146 s: actor demo-drill/d5c unavailable: no worker has room for the actor
  state     d5a ACTOR_STATE_RUNNING, d5b ACTOR_STATE_RUNNING, d5c ACTOR_STATE_SUSPENDED
  fix       kubectl ate suspend actor d5a -a demo-drill (0.4 s)
  recover   200 in 0.321061 s: count=1 process_age_s=58.1
== 6 Postgres is away for 30 s
  symptom   running actor: 503 in 5.055445 s: actor demo-drill/d6 unavailable
  symptom   suspended actor: 503 in 5.053930 s: actor demo-drill/d6s unavailable
  state     kubectl ate get actor fails: Error: failed to connect to ate-api-server: no ready api pods in ate-system
  fix       kubectl -n ate-system scale statefulset postgres --replicas=1 (ready after 2.1 s)
  recover   running actor answers after 0.9 s
  recover   suspended actor answers after 0.4 s
  state     d6 ACTOR_STATE_RUNNING, d6s ACTOR_STATE_RUNNING
total 70 s
```

pool 满时，请求在 5 秒的暂存预算用尽后返回 503，挂起另一个 actor 即可释放空间。在没有 Postgres 的情况下，运行中的 actor 和挂起的 actor 都在 5 秒后返回 503。CLI 同样报错，因为它无法为其端口转发找到处于 Ready 状态的 `ate-api-server` pod。

## 我们的实测为前文补充了什么 {#s-a-failure-drill-what-our-run-adds-to-the-earlier-sections}

本次演练运行在与第 3 部分和第 8 部分不同的客户机以及不同安装上。六种情况中有五种的症状文本和状态相符。Postgres 的情况不相符，而你需要掌握这两组症状。

| | 本节中的演练 | [依赖宕机时会怎样](#s-when-a-dependency-is-down)中的依赖测试 |
|---|---|---|
| 机器 | 第二台 x86 服务器客户机（16 vCPU、31 GB） | 第二台 x86 服务器客户机（16 vCPU、23 GB） |
| Postgres 中断时长 | 约 30 秒 | 61 秒 |
| 运行中的 actor | 5.06 秒后返回 503，`actor demo-drill/d6 unavailable` | 直到客户端超时 9 秒前无应答，随后返回 500 `error resuming actor`，没有 503 |
| 挂起的 actor | 5.05 秒后返回 503，`actor demo-drill/d6s unavailable` | 5 秒后返回 503 并带有同样的 `unavailable` 文本，或者返回 500 `error resuming actor` |
| 首次恢复成功的耗时 | Postgres 就绪后 0.4 秒 | Postgres 就绪后 27 秒 |

因此，对于运行中的 actor，Postgres 停机可能表现为上述两种模式之一。一种是卡住然后返回 500。另一种是在 5 秒后返回带有 `unavailable` 的 503，这也是 `ate-api-server` 停机时的文本。当你看到其中任何一种时，请同时检查数据库和 `ate-api-server` pod。

两次运行在机器、安装方式以及停机时长上均有差异。我们没有对比它们的秒数，也没有查明是哪种条件改变了症状。请按较长的恢复时间进行规划。

## 演练的局限 {#s-a-failure-drill-limits-of-the-drill}

- 它需要 kind 集群，因为情况 2 会删除节点容器内的一个目录。
- 它不会重启节点，也不会停止 `ate-api-server` 或 Kubernetes API server。第 8 部分包含这些运行。
- 它使用的是很小的 actor。拥有更多内存的 actor 在每次恢复时需要更多时间。
- 它通过缩容到零来停止 Postgres。网络故障或慢速磁盘在客户端看来可能有所不同。

## 上生产前要改什么 {#s-a-failure-drill-what-to-change-for-production}

不要在有真实用户的集群上运行演练。在每次 Substrate 升级后在预发集群上运行它，并保留日志。如果日志里的症状文本变了或出现了新状态，就说明你的告警和运维手册需要更新。

把你自己的 actor 加入演练。将模板中的镜像替换为你自己的镜像，并检查应用程序在回退到较早快照后的行为。

```takeaways
- 在第一次故障发生前在测试集群上运行演练，并保留日志。
- 将错误文本与修复方式对应起来：回退崩溃的 actor，在 pool 满时挂起另一个 actor。
- 对一个状态显示为 running、Postgres 正常却仍返回上游连接错误的 actor，先挂起再回退。
- 每次升级后重新运行演练，并对比症状文本。
```

来源：capture/lab/N-demos/failure-drill/drill-run.log, capture/lab/summary/demos-x86.json, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/summary/dependency-loss-x86.json, capture/demos/failure-drill/drill.sh, capture/demos/failure-drill/drill_actor.py, capture/lab/N-demos/install/steps.tsv
