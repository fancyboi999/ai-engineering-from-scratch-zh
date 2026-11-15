# 一个请求，从客户端到 actor 再返回

> 发往已挂起 actor 的请求会依次经过代理、`atenet-router`、`ate-api-server` 和 Postgres，worker 才恢复 actor，而发往运行中 actor 的请求仍然要询问这四个组件。

你发送 `curl -X POST http://localhost:8000/`，请求便返回了一个计数值。六个程序参与了这次处理，其中一个在 actor 运行前就向数据库写入了记录。之后请求若失败，错误文本会点出其中某个程序，因此你需要清楚它们的顺序。

读完本节，你能说出一个请求的每一跳，并指出运行中的 actor 会跳过哪几跳。你还能说出集群里哪些部分必须在线，请求才能通过。

## 录制记录 {#s-one-request-from-client-to-actor-the-recording}

我们在 atespace `ate-demo-counter` 里创建了 `my-counter-1`，并启动了 `kubectl ate proxy`。随后我们依次发了五个请求。这是录制记录的开头。各列依次是时间、事件、HTTP 状态、客户端耗时的秒数和响应体。

```listing
title: 发往新 actor 的五个请求
source: capture/lab/B-lifecycle/10-trace.tsv
lang: text
note: 追踪记录的前八行。第一个请求之前和第五个请求之后都读取了 actor 状态。
---
ts	event	detail
2026-11-12T10:14:21.286Z	state	ACTOR_STATE_SUSPENDED	-
2026-11-12T10:14:21.837Z	call-1	200	0.358379	preserved memory count: 1 | preserved file counter: 1 | preserved rootfs counter: 1
2026-11-12T10:14:21.944Z	call-2	200	0.090770	preserved memory count: 2 | preserved file counter: 2 | preserved rootfs counter: 2
2026-11-12T10:14:22.030Z	call-3	200	0.066903	preserved memory count: 3 | preserved file counter: 3 | preserved rootfs counter: 3
2026-11-12T10:14:22.109Z	call-4	200	0.061842	preserved memory count: 4 | preserved file counter: 4 | preserved rootfs counter: 4
2026-11-12T10:14:22.196Z	call-5	200	0.068053	preserved memory count: 5 | preserved file counter: 5 | preserved rootfs counter: 5
2026-11-12T10:14:22.203Z	state	ACTOR_STATE_RUNNING	-
```

**我们测得**这些请求，在一台 24 vCPU、47 GB 的 x86 服务器客户机上，通过 `kubectl ate proxy` 运行了一次。第一个请求用了 0.358 秒。接下来四个分别用了 0.091 秒、0.067 秒、0.062 秒和 0.068 秒。

第一个请求之前，actor 处于 `ACTOR_STATE_SUSPENDED`，第五个请求之后处于 `ACTOR_STATE_RUNNING`。没有任何命令主动恢复它，是第一个请求触发了恢复。

## 逐跳解读 {#s-one-request-from-client-to-actor-hop-by-hop}

[图 1.2](#fig-1-2) 画出了第一个请求。下面列表里的编号与图中的行对应。

```figure
id: fig-1-2
kind: sequence
title: 发往 my-counter-1 的第一个请求
claim: 对已挂起 actor 的第一个请求会让 router 调用 ResumeActor，由 ate-api-server 在请求到达之前恢复 actor。
caption: 从上到下读每一行。每条生命线上方的图形代表对应的参与方，并带有所属项目的标记。第 2 行是唯一经过 kube-apiserver 的一行。第 5 行和第 6 行的编号是琥珀色，因为发往运行中 actor 的请求会跳过它们。第 6 行下方的注释是同一个 actor 之后一次恢复的恢复时间。来源：capture/lab/B-lifecycle/10-trace.tsv、capture/lab/B-lifecycle/12-actor-running.json、capture/lab/B-lifecycle/27-lifecycle.log。
```

1. `curl` 把请求发到 `127.0.0.1:8000`，`kubectl ate proxy` 在那里监听。
2. 代理通过 Kubernetes API server 打开一条到 `atenet-router` 的端口转发。在这条端口转发内部，它携带客户端证书，向 router 的 8444 端口打开一条 mTLS CONNECT 隧道 {{code}}。
3. router 读出目标 actor，对 `ate-api-server` 调用 `ResumeActor`。每个请求它都这样做，因为它不记录 actor 在哪里运行 {{code}}。同时到达、发往同一个 actor 的请求共用一次调用。
4. `ate-api-server` 从 Postgres 读出 actor 的记录行。状态是 `ACTOR_STATE_SUSPENDED`。
5. `ate-api-server` 对 actor 加租约，选一个有空位的 worker，并在一个事务里把分配结果写入 Postgres {{code}}。
6. `ate-api-server` 通知那个节点上的 `atelet` 恢复快照。worker 用它启动沙箱，actor 状态变成 `ACTOR_STATE_RUNNING`。
7. `ate-api-server` 把 actor 返回给 router，同时带上 worker pod 的 IP 地址和 worker 的身份。
8. router 向 worker pod 的 8443 端口打开一条隧道，并校验这个身份。worker 将请求转发至 actor 的 80 端口 {{code}}。
9. 响应沿原路返回。

新 actor 从未运行过，所以第 6 步里的快照不是它自己的。它是它所用模板的黄金快照，[第 3.1 节](#s-actortemplate-and-the-golden-snapshot)会解释。第 7 步之后，actor 对象带上了分配结果：

```listing
title: 第一个请求之后的 actor
source: capture/lab/B-lifecycle/12-actor-running.json
lang: json
note: 截自 actor 对象。元数据、快照列表和沙箱版本属性已截去。
---
    "state": "ACTOR_STATE_RUNNING",
    "workerAssignment": {
      "nodeName": "kind-control-plane",
…
      "workerEpoch": "1",
      "workerNamespace": "ate-demo-counter",
      "workerPod": "counter-7cc7dcd596-ffxwt",
      "workerPodIps": [
        "10.244.0.23"
      ],
…
      "workerPool": "counter",
      "workerSpiffeId": "spiffe://cluster.local/ns/ate-demo-counter/sa/ateworker"
```

## 0.36 秒花在哪里 {#s-one-request-from-client-to-actor-where-the-0-36-s-goes}

第一个请求为恢复付了代价，之后的四个没有。在这台客户机上，对一个几乎不占内存的 actor，差值约为 0.29 秒。

worker 在恢复开始时写一行日志，结束时再写一行。我们没有保存第一个请求的那份日志，保存的是同一个 actor 之后一次恢复的日志：

```listing
title: 生命周期日志里的一次恢复
source: capture/lab/B-lifecycle/27-lifecycle.log
lang: text
note: 每行的 span 和 trace 字段已截去。
---
{"time":"2026-11-12T10:30:17.846333794Z","message":"Actor restoring",…
{"time":"2026-11-12T10:30:18.098955499Z","message":"Actor restored",…
```

**我们测得**那次恢复，在同一台客户机上运行了一次。两行日志相隔 0.253 秒，而触发这次恢复的请求在客户端用了 0.382 秒。因此首次请求大约有三分之二的时间花在恢复本身。

这个占比会随 actor 增大。恢复要读取 actor 持有的内存，[第 3.3 节](#s-suspendactor-and-resumeactor)展示了 1000 MiB 的 actor 需要 2.16 秒。

## 对运行中 actor 的请求 {#s-one-request-from-client-to-actor-a-request-to-a-running-actor}

对运行中 actor 的请求仍然要走第 1 到 4 步。`ate-api-server` 读出这一行，发现是 `ACTOR_STATE_RUNNING`，立即返回 {{code}}。第 5 步和第 6 步不会发生。所以即使什么都不用恢复，一个请求也要付出一次对 `ate-api-server` 的调用和一次对 Postgres 的读取。同时到达、发往同一个 actor 的请求共用这次调用。

我们录制中的 0.06 秒，大部分是代理的耗时，不是 Substrate 的。

**我们测得**两条路径的性能，在第二台 x86 客户机（16 vCPU、23 GB）上取一次测试前的 30 秒。集群内直接请求 router 的 pod，在 30 个请求中应答时间中位数是 0.027 秒。通过 `kubectl ate proxy` 访问同一个 actor，在 28 个请求中应答时间中位数是 0.067 秒。

规划延迟时，请用 pod 里测得的数字。代理是给你自己机器用的工具，[第 2.3 节](#s-your-first-actor-and-the-proxy)说明了为什么它不能承载真实流量。

## 哪些必须在线 {#s-one-request-from-client-to-actor-what-must-be-up}

这条路径带来三点结论。

- **Postgres 和 `ate-api-server` 在每条请求路径上。** 一个不需要恢复的运行中 actor，在二者任一宕机时仍然会失败。在我们的第二台客户机上，每次故障后几秒内，发往运行中 actor 的请求就失败了。[第 8.2 节](#s-when-a-dependency-is-down)有时间线。
- **Kubernetes API server 不在任何请求路径上。** 只有图中的第 2 行经过它，而那一行属于代理。在同一次测试里，kube-apiserver 宕机了 86 秒。这段时间里，来自 pod 的 103 个请求中有 103 个得到了响应：86 个发往运行中的 actor，17 个触发了恢复。
- **只有快照不在节点上时，对象存储才在路径上。** [第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)说明了什么时候会这样。

安装会运行一个 `atenet-router` pod 和一个 Postgres pod。每个 actor 的每个请求都要经过这两者。[第 8.1 节](#s-postgres-and-the-object-store)说明了 Postgres 该怎么处理。

## actor 保持运行 {#s-one-request-from-client-to-actor-the-actor-stays-up}

第五个请求之后，我们 900 秒没有发送任何请求。[图 1.2b](#fig-1-2b) 展示了录制中的全部六个请求，以及最后两个请求之间的每个状态样本。

```figure
id: fig-1-2b
kind: chart
title: 发往 my-counter-1 的六个请求，以及它在 900 秒空闲期间的状态
claim: 只有第一个请求为恢复付出了代价，空闲 900 秒之后的请求和其他请求一样快，因为 actor 从未停止过。
caption: 每根柱子是一个请求在客户端的耗时。琥珀色柱子包含从黄金快照恢复的时间，虚线是第 2 到 5 个请求的中位数。下半部分的每个点是 900 秒无请求期间的一个状态样本。来源：capture/lab/B-lifecycle/10-trace.tsv。
```

第六个请求用了 0.080 秒，返回计数 6。一次恢复大约会花 0.36 秒。这个 actor 从未被挂起，在整整 15 分钟里一直占着它的 worker。[第 1.1 节](#s-what-substrate-does-and-what-it-leaves-to-you)把这一点列为 Substrate 留给你的第一项工作。

```takeaways
- 把来自 router 的错误当作 ate-api-server 的回复来读，因为 router 每个请求都要问它。
- 根据调用 router 的 pod 来规划延迟，不要用 kubectl ate proxy。
- 优先让 Postgres 和 ate-api-server 保持健康，因为每个请求都需要两者。
- 预期对已挂起 actor 的第一个请求要付出一次恢复的代价。
- actor 的工作完成后，自己去挂起它。
```

来源：capture/lab/B-lifecycle/10-trace.tsv, capture/lab/B-lifecycle/12-actor-running.json, capture/lab/B-lifecycle/27-lifecycle.log, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/B-lifecycle/01-proxy.log, capture/lab/summary/dependency-loss-x86.json, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/E-dependency-loss/12-probe-proxy.tsv, capture/lab/E-dependency-loss/12-probe-incluster.tsv, capture/lab/summary/resume-x86.json; cmd/atenet/internal/router/ingress, cmd/ateapi workflow_resume.go, internal/ateclient/router.go, cmd/kubectl-ate/internal/cmd/proxy.go, and docs/concepts/architecture.md at v1.0.0.
