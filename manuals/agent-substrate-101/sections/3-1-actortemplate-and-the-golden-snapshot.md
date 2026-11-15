# ActorTemplate 与黄金快照

> Substrate 对每个 ActorTemplate 只做一次快照，之后创建的 actor 从该快照以挂起状态起步，所以它的首次调用要付出一次恢复的代价。

你的 agent 镜像要花几秒导入库、加载工具。用 Deployment 时，每个新 pod 都要再付一遍这几秒。Substrate 把这笔开销移到了模板上：它只启动一次镜像，生成一份快照，之后每个新 actor 都从这份快照创建。开销并没有消失：新 actor 的第一个请求要恢复快照，恢复时间随快照里的内存增长。

读完本节，你能写出 ActorTemplate，确认它的黄金快照已经存在，并预测新 actor 的首次调用耗时。

## 我们用的模板 {#s-actortemplate-and-the-golden-snapshot-the-template-we-used}

**ActorTemplate：** 对 actor 的描述，包含容器、资源上限、卷、可运行它的 worker 池以及快照设置。模板属于一个 atespace，由 `ate-api-server` 存进 Postgres。它不是 Kubernetes 对象，所以 `kubectl get` 列不出它。

下面是我们恢复测试用的五个模板之一。这个 actor 是一个小型 Go 服务，持有 200 MiB 随机字节，并统计自己收到的请求数。

```listing
title: 一个持有 200 MiB 的 ActorTemplate
source: capture/lab/C-resume-vs-size/tmpl-200.yaml
lang: yaml
note: 完整文件。我们用 kubectl ate create actor-template -f 创建了它。
---
metadata:
  atespace: lab-c
  name: ballast-200
workerSelector:
  matchLabels:
    workload: ballast
containers:
- name: ballast
  image: localhost:5001/ballast@sha256:93dba82ad560e7fc4ccb2a33a63d64713b519a7895ba3fd98130ce789eab7fd3
  command:
  - /ballast
  - --mb=200
  wakeupProbe:
    httpGet:
      path: /readyz
      port: 80
resources:
  limits:
    cpuMillicores: 1000
    memoryBytes: 478150656
snapshotConfig:
  preferredFidelity: SNAPSHOT_FIDELITY_MEMORY
```

五个字段决定 actor 的行为。

- `image` 必须写明 digest，只写标签会被拒绝 {{code}}。我们的镜像是用普通 `docker build` 构建的 `scratch` 镜像，没有为 Substrate 做任何改动。
- `resources.limits` 两个值都要填 {{code}}。调度器按 worker 的容量来记这两个值，[第 4.1 节](#s-workerpool)有详细说明。
- `workerSelector` 匹配的是 `WorkerPool` 对象的标签。[第 3.6 节](#s-atespaces)说明了为什么池所在的 namespace 不起作用。
- `wakeupProbe` 是每次恢复时都会运行的就绪检查。探测通过之后，actor 才会变成 `ACTOR_STATE_RUNNING` {{docs}}。
- `preferredFidelity` 决定快照保留多少状态。[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)比较了三个级别。

模板不可变，API 里没有更新模板的调用 {{code}}。要换新代码，就创建一个新模板，再用 `kubectl ate update actor --template` 把每个已挂起的 actor 迁过去 {{docs}}。

我们用两个只有镜像不同的模板做了这次迁移。对正在运行的 actor，更新会被拒绝。

```listing
title: 对运行中 actor 更换模板
source: capture/lab/V-validation/06-template-move/10-move.tsv
lang: text
note: 跟踪记录中的一行。行首的时间和事件名已截掉。
---
…Error: failed to update actor: rpc error: code = FailedPrecondition desc = actor must be ACTOR_STATE_SUSPENDED to change its actor template (got: ACTOR_STATE_RUNNING) 
```

对已挂起的 actor，更新被接受，下一次调用运行的是新镜像。内存里的计数从 1 重新开始，根文件系统上的计数也一样。`durableDir` 卷上的计数则接着数到 4。所以这次迁移保留了 `durableDir` 卷，丢掉了旧的内存快照。带外部卷的迁移要留到下一版再测。先挂起，并预期下一次调用会冷启动新镜像。

## 黄金快照只构建一次 {#s-actortemplate-and-the-golden-snapshot-the-golden-snapshot-is-built-once}

**黄金快照（golden snapshot）：** Substrate 从新模板启动一个临时 actor，并给它生成的快照。Substrate 把它存在一个标签下，即黄金标签，该模板的每个新 actor 都从这个标签启动。

`ate-api-server` 分四步构建黄金快照 {{docs}}。

1. 在模板所在的 atespace 里创建一个临时的黄金 actor，并恢复它。
2. 等到 actor 就绪。如果某个容器没有 `wakeupProbe`，还要再多等 20 秒 {{code}}。
3. 按模板的 `preferredFidelity` 挂起 actor，并把快照复制到一个发布标签。
4. 删除黄金 actor，并把标签写进模板的 status。

我们 kagent 集群上 `ate-api-server` 的日志，展示了一个模板的这四步。

```listing
title: 一个模板的黄金 actor，从创建到删除
source: capture/lab/K-kagent/logs/actor-state-changes.tsv
lang: text
note: 该文件的前七行。各列依次是时间、actor 的 uid、操作和新状态。
---
2026-11-12T10:16:44.165402326Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	create	suspended
2026-11-12T10:16:44.178659651Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	resume	resuming
2026-11-12T10:16:54.017864285Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	resume	running
2026-11-12T10:16:54.03004179Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	suspend	suspending
2026-11-12T10:16:54.180722259Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	suspend	suspended
2026-11-12T10:16:54.238242923Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	delete	deleting
2026-11-12T10:16:54.328177186Z	dd7b8625-0d96-4d7d-89da-4ec9cc3b914a	delete	deleted
```

时间戳显示这次恢复用了 9.84 秒，因为黄金 actor 是唯一一个从零启动镜像的 actor。挂起用了 0.15 秒。这个模板的保真度是仅文件，所以快照里没有内存。

构建过程只付一次应用完整启动的代价。

**我们测得**一个 Python 服务模板的数据，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），n=1。这个服务在启动时构建一个含一百万个值的 dict。黄金标签在 `create actor-template` 之后 39.3 秒就绪。进程在处理第一个请求时已运行 32.9 秒，所以大部分时间花在 gVisor 下的应用启动上。之后，该模板的新 actor 首次调用的中位数是 0.63 秒，共测了五个新 actor。[第 3.3 节](#s-suspendactor-and-resumeactor)展示了这个服务。

模板建好的那一刻，黄金标签还不存在。在恢复测试里，我们在创建五个模板 21 秒后列出了它们。

```listing
title: 创建 21 秒后的五个模板
source: capture/lab/C-resume-vs-size/02-templates.txt
lang: text
note: 完整文件。1,000 MiB 的模板还没有黄金标签。
---
ATESPACE   NAME           GOLDEN TAG                             ERROR   AGE
lab-c      ballast-0      e32029d7-3d9b-4212-8953-e88d7cede5b4           21s
lab-c      ballast-1000                                                  20s
lab-c      ballast-200    b9f97b82-b187-419d-8789-6c8c7b8a6c8c           20s
lab-c      ballast-50     0382e2fc-99db-461a-8845-a90d93484443           21s
lab-c      ballast-500    2fa7aaf9-1fe8-4076-9350-af27ba338a6b           20s
```

我们在 118 秒时再看，五个模板都有了标签。创建 actor 之前，先等 `GOLDEN TAG` 这一列出现。更早创建的 actor 不会记录快照。它在首次调用时从镜像启动，并在自己第一次挂起前一直保持这次冷启动的状态 {{docs}}。

我们复现了这个竞态。我们在模板之后立刻创建了一个 actor，`create actor` 成功了。

```listing
title: 黄金快照出现之前创建的 actor
source: capture/lab/V-validation/05-golden-race/10-race.tsv
lang: text
note: 跟踪记录中的四行。actor rc1 创建得早，actor rc2 在黄金标签出现之后创建。两者之间的行已截掉。
---
2026-11-12T12:49:47.365Z	rc1-state	ACTOR_STATE_SUSPENDED	-	
2026-11-12T12:49:48.542Z	rc1-first-call	200	0.983729	tag=v3 count=1 mb=200 fill=random sum=26936 rootfs=-1 data=-1 pid=1 process_age_s=0.8 child[none]
…
2026-11-12T12:50:00.900Z	golden-ready	waited 11.137 s more
2026-11-12T12:50:01.888Z	rc2-state-new	ACTOR_STATE_SUSPENDED	-	SNAPSHOT_OWNER_TAG:SNAPSHOT_FIDELITY_MEMORY:SNAPSHOT_STORAGE_STATE_COMPLETED:gen1
```

**我们测得**这一次的数据，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），actor 为 200 MiB。早创建的 actor 处于 `ACTOR_STATE_SUSPENDED`，快照列表为空。它的首次调用是冷启动，用了 0.98 秒。黄金标签 11 秒后就绪，在那之后创建的 actor 首次调用用了 0.93 秒。另一个模板的五个早创建 actor，25 秒后仍然没有快照。

所以早创建的 actor 永远不会采用黄金快照。它在第一次挂起时得到自己的快照。我们的 actor 启动不到一秒，所以两次首次调用耗时相同。如果应用需要 30 秒启动，早创建的 actor 在首次调用时就要付 30 秒。

你可以用 `snapshotConfig.goldenSnapshotConfig.mode: GOLDEN_SNAPSHOT_MODE_DISABLED` 关掉黄金快照 {{code}}。之后每个新 actor 都从镜像启动。

## 新 actor 以挂起状态起步 {#s-actortemplate-and-the-golden-snapshot-a-new-actor-starts-suspended}

`kubectl ate create actor` 在 Postgres 里写一行，不碰任何 worker，所以它的耗时与模板无关。新 actor 处于挂起状态。如果此刻模板已经有黄金标签，它就已经带着一份快照。

```listing
title: 刚创建完的 actor my-counter-1
source: capture/lab/B-lifecycle/00-actor-before.json
lang: json
note: 已截掉 sandboxRuntime 块和文件末尾。
---
{
  "actorTemplate": {
    "atespace": "ate-demo-counter",
    "name": "counter"
  },
  "metadata": {
    "atespace": "ate-demo-counter",
    "createTime": "2026-11-12T10:13:40.987568669Z",
    "name": "my-counter-1",
    "uid": "6f80f612-7547-4f5b-b3ab-831595621806",
    "updateTime": "2026-11-12T10:13:40.987568669Z",
    "version": "1"
  },
  "status": {
    "lastAssignedGeneration": 1,
    "snapshots": [
      {
        "actorTemplateUid": "71a3a39c-5f37-4d6e-937f-9c314fea7668",
        "durableSnapshot": {
          "object": {
            "snapshotUri": "gs://ate-snapshots/atespaces/ate-demo-counter/tags/ad19ee28-1519-432a-bcc5-40cf99cce3ca"
          },
          "state": "SNAPSHOT_STORAGE_STATE_COMPLETED"
        },
        "fidelity": "SNAPSHOT_FIDELITY_MEMORY",
        "generation": 1,
        "owner": "SNAPSHOT_OWNER_TAG",
        …
    "state": "ACTOR_STATE_SUSPENDED"
  }
}
```

重点看三个字段。`state` 是 `ACTOR_STATE_SUSPENDED`，说明还没有沙箱存在。`owner` 是 `SNAPSHOT_OWNER_TAG`，说明这个 actor 借用黄金标签的快照，自己不拥有快照。URI 里有 `tags` 段，不含 actor 的 uid。actor 在第一次挂起时才会写出自己的快照。

```figure
id: fig-3-1
kind: flow
title: 从 ActorTemplate 到首次调用
claim: Substrate 为每个模板构建一份黄金快照，之后创建的 actor 都从它以挂起状态起步。
caption: 上面一行对每个模板执行一次，下面一行对每个 actor 执行一次。编号与图例对应。名称和秒数来自我们在 x86 服务器客户机上的恢复测试。来源：capture/lab/C-resume-vs-size/10-local.tsv、capture/lab/C-resume-vs-size/02-templates.txt。
```

## 首次调用要付恢复的代价 {#s-actortemplate-and-the-golden-snapshot-the-first-call-pays-for-the-restore}

新 actor 的第一个请求会恢复黄金快照。小 actor 几乎感觉不到。对大 actor 来说，这是它一生中最慢的一次请求。

| 模板中的内存 | 新 actor 的首次调用，中位数 | 5 次中的最快与最慢 | 同一 actor 之后的恢复，中位数 |
|---|---|---|---|
| 0 MiB | 0.23 秒 | 0.22 到 0.24 秒 | 0.22 秒 |
| 50 MiB | 0.25 秒 | 0.24 到 0.40 秒 | 0.24 秒 |
| 200 MiB | 0.62 秒 | 0.56 到 0.86 秒 | 0.47 秒 |
| 500 MiB | 5.76 秒 | 1.86 到 6.76 秒 | 1.07 秒 |
| 1,000 MiB | 6.60 秒 | 3.46 到 12.75 秒 | 2.16 秒 |

**我们测得**这些耗时，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），gVisor，每种大小各五个新 actor。每个耗时是经 `kubectl ate proxy` 发出的一次请求，在客户端计时。在同一路径上，对一个已在运行的 actor 发请求用了 0.06 秒。“之后的恢复”是从节点上的快照恢复 10 次的中位数。`kubectl ate create actor` 对全部 25 个 actor 的返回时间是 0.20 到 0.26 秒。

```figure
id: fig-3-1b
kind: chart
title: 新 actor 的首次调用与内存的关系
claim: 在 1,000 MiB 时，新 actor 的首次调用用了 3.5 到 12.7 秒，之后的恢复用了 2.2 秒。
caption: 每个青色点是一个新 actor 的首次调用，每种大小五个，青色线连接各中位数。紫色线是同一 actor 从节点恢复十次的中位数。测于 x86 服务器客户机。来源：capture/lab/summary/resume-x86.json。
```

到 200 MiB 为止，首次调用与之后的恢复耗时差不多。到 500 MiB 及以上，首次调用耗时达到三到五倍，而且波动很大。我们没有找到波动的原因。我们能确定的是节点把数据放在哪里：它的 `snapshot-cache` 目录占了 1,765 MiB，而我们五个模板的快照大小总和是 1,760 MiB。

我们的判断：黄金快照适合放启动慢的代码，不适合放大内存。如果你的模板持有超过约 200 MiB 的内存，就在用户访问前先给每个新 actor 发一次请求。用不改变状态的请求，比如我们的计数器每次调用都会加一，之后再挂起它。之后从节点上的副本恢复，耗时就会落在较低的那条线上。

```takeaways
- 用 digest 固定模板的镜像，并设置两个资源上限。
- 给每个容器配 wakeupProbe，这样黄金快照不用多等 20 秒。
- 创建第一个 actor 之前，先等 GOLDEN TAG 列出现。
- 换新代码就创建新模板，先挂起每个 actor，再迁移。
- 在用户请求到达前，先向内存较大的新 actor 发一次不改变状态的请求。
```

来源：capture/lab/summary/resume-x86.json, capture/lab/C-resume-vs-size/tmpl-200.yaml, capture/lab/C-resume-vs-size/02-templates.txt, capture/lab/C-resume-vs-size/09-templates-at-start.txt, capture/lab/C-resume-vs-size/10-local.tsv, capture/lab/C-resume-vs-size/20-storage-footprint.txt, capture/lab/C-resume-vs-size/00-image.txt, capture/lab/B-lifecycle/00-actor-before.json, capture/lab/K-kagent/logs/actor-state-changes.tsv, capture/lab/summary/kagent-turns-x86.json, capture/lab/summary/footprint-x86.json, capture/lab/summary/validation-memory-x86.json, capture/lab/V-validation/02-python-runtime/10-python.tsv, capture/lab/V-validation/05-golden-race/10-race.tsv, capture/lab/V-validation/06-template-move/10-move.tsv. Agent Substrate v1.0.0: api/ateapi/v1/ateapi.proto (ActorTemplate, GoldenSnapshotMode, Snapshot, SnapshotOwner), cmd/ateapi/internal/controlapi/template_reconciler.go (goldenSnapshotWarmup), docs/reference/api-guide.md (The Golden Snapshot, Container Wakeup Probe, UpdateActor).
