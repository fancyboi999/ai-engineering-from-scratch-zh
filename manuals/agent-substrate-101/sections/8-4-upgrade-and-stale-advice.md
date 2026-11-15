# 升级，以及已经失效的建议

> 1.0.0 之前的任何版本都不能原地升级，为这些版本写的大多数操作说明在 v1.0.0 上都会失败，本节逐条指出失败的方式。

你搜索一条报错，找到一篇三个月前的教程。它的第一条命令运行一个脚本，而你的代码检出里没有这个脚本。它的第二条命令传了一个 CLI 不认的参数。这篇教程在 v0.1.0 上是对的。Agent Substrate 在 1.0.0 之前改了安装器、API 包、状态和请求路径，而且没有保留对旧形式的兼容。

读完本节，你能把一条旧操作说明转换成 v1.0.0 的写法。你还能说清项目支持哪些升级，以及各组件按什么顺序升级。

## 旧操作说明，以及它们现在的结果 {#s-upgrade-and-stale-advice-old-instructions-and-what-they-do-now}

下表列出我们在 v0.1.0 代码树或当时的文章里找到的每条旧操作说明。中间一列是它在 v1.0.0 上的结果。每一行的依据是两个标签处的**代码**，文中说明我们运行过的除外。

| 旧操作说明 | v1.0.0 上的结果 | 该怎么做 |
|---|---|---|
| `hack/install-ate-kind.sh --deploy-ate-system` | 仓库里没有这个脚本。 | 运行 `ate-setup deploy ate-system`，见[第 2.1 节](#s-install-with-ate-setup)。 |
| `go run ./tools/setup-gcp bootstrap` | 仓库里没有这个工具。它已移到 GKE 专用的另一个仓库。 | 按[第 7.3 节](#s-substrate-on-gke)操作。 |
| `kubectl ate create actor --template-ref counter` | 没有这个参数。 | 用 `--template counter`。 |
| `kubectl port-forward svc/atenet-router 8000:80`，再带 `Host` 头 | 80 端口上没有任何监听。router 读取 `ate-target-actor` 头，并要求客户端证书。 | 用 `kubectl ate proxy actor`，见[第 2.3 节](#s-your-first-actor-and-the-proxy)。 |
| `kubectl ate pause actor`、`PauseActor`、`ACTOR_STATE_PAUSED` | 这个命令、方法和状态都不存在。 | 用 `kubectl ate suspend actor`。 |
| 存下来的状态编号，例如用 7 表示崩溃 | 编号变了。崩溃是 5，删除中是 6，回退中是 7。 | 存状态名，不要存编号。 |
| `WorkerPool` 里的 `apiVersion: ate.dev/v1alpha1` | CRD 只提供 `v1`，没有转换。apply 会失败。 | 写 `ate.dev/v1`。 |
| Go 代码导入 `pkg/proto/ateapipb` | 模块是 `go.ate.dev/substrate`，包是 `api/ateapi/v1`。 | 用 v1.0.0 的 proto 文件重新生成客户端。 |
| gRPC 调用 `/ateapi.Control/GetActor` | 服务名是 `substrate.ateapi.v1.Control`。旧方法名找不到任何服务。 | 使用基于 v1.0.0 的 proto 文件生成的客户端。 |
| 模板字段 `snapshotsConfig.onPause` 和 `sandboxConfig` | 这些字段不存在。模板里有 `snapshotConfig.preferredFidelity`，沙箱类别来自 `WorkerPool`。 | 按[第 3.1 节](#s-actortemplate-and-the-golden-snapshot)的格式编写模板。 |
| 没有资源限制的模板 | API 要求在 `resources.limits` 下提供 `cpuMillicores` 和 `memoryBytes`。 | 两个都要设。 |
| 节点标签 `ate.dev/substrate-version` | 没有任何组件读取这个标签。 | 删掉这一步。 |
| 安装器参数 `--cordon-control-plane` | 参数现在叫 `--cordon-system-infra-components`，节点标签也随之改了。 | 用新参数和标签 `ate.dev/workloadType=ate-system-infra`。 |

有两行需要展开说明。

**请求路径为了安全改了。** 在 v0.1.0，任何能访问 router Service 的 pod 都可以带一个 `Host` 头调用任意 actor。在 v1.0.0，router 要求客户端证书，并按允许列表检查证书里的身份。我们在两种数据平面上探测了旧端口。在 agentgateway 上，80 和 8081 端口拒绝连接。在 Envoy 上，这两个端口不在 Service 里，连接超时。

两种数据平面列出的端口不同。使用 Envoy 时，router Service 只有 443 和 8444 端口。agentgateway 的 overlay 把 80 和 8081 端口加进了 Service 和 NetworkPolicy {{code}}。在我们的安装里，这两个端口后面没有任何监听。`ate-setup` 安装的网关配置只声明了 8443 和 8444 端口，agentgateway 进程也只监听这两个端口 {{run}}。所以在 agentgateway 上，Service 列出了两个会拒绝所有连接的端口。

它的第五个端口情况不同：统计端口 15020 会向另一个命名空间里的 pod 返回 `/metrics`，且不需要任何凭据。[router 与入站](#s-the-router-and-ingress)一节有端口表和这条说明。

末尾用普通 `curl` 请求 router 的教程不可能跑通。不要去找能恢复旧路径的设置。

**API 重新编了状态号。** 响应里的状态名是安全的。1.0.0 之前留在数据库列、指标标签或告警规则里的编号，现在指向另一个状态。如果一条旧规则对状态 7 触发告警，现在它响应的其实是回退状态。

## 失效得更隐蔽的建议 {#s-upgrade-and-stale-advice-advice-that-is-stale-in-a-quieter-way}

有些说法不会报错。它们是错的，系统却照常运行。

| 说法 | 你在哪里读到 | 我们的发现 |
|---|---|---|
| Substrate 会挂起没有请求的 actor。 | 该标签处的快速上手，以及许多帖子 | 没有任何组件会自动挂起它。调用方必须自己调用 `SuspendActor`。 |
| 挂起在快照安全后才返回。 | v0.1.0 的教程，当时确实如此 | 默认是异步挂起。快照先落在一个节点上。 |
| agentgateway 数据平面接受任何客户端。 | 对清单的解读 | 安装器总会加上客户端证书检查。 |
| 凭据提供方要求使用 Envoy 数据平面。 | 安装器参数的帮助文本 | 安装器在 agentgateway 下接受了该提供方，凭据注入也生效了。 |
| 用 `NEW_RELEASE=v0.4.2` 升级。 | 该标签处升级页面里的示例 | 不存在 v0.4.2，而且同一页明确排除了所有 0.x 升级。 |

**我们测得**前两行的结果，环境是一台 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。一个 actor 900 秒没有请求，60 次采样里有 60 次显示 RUNNING。默认挂起之后，四个 actor 的快照都停在待上传（pending）状态。上传在挂起后 5 分 1 秒到 5 分 11 秒之间完成。[第 3.3 节](#s-suspendactor-and-resumeactor)和[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)给出了这两次运行的完整记录。

**我们的判断：** 照着任何 Substrate 操作说明做之前，先看它的日期。如果文字写于 2026-11-05 之前，先拿 v1.0.0 的帮助输出逐条核对命令。项目最大的几次破坏性改动发生在发布前的三周内。十月的文章可能和七月的一样错。

## 项目支持哪些升级 {#s-upgrade-and-stale-advice-which-upgrades-the-project-supports}

该标签处的升级页面给出五种情况。它依据的版本偏差策略从 1.0.0 开始。

| 起始与目标版本 | 是否支持 | 该怎么做 |
|---|---|---|
| 同一个次版本的后续补丁，例如 1.0.0 到 1.0.2 | 支持，可以跳过中间的补丁 | 按下面的四个步骤做。 |
| 下一个次版本，例如 1.0 到 1.1 | 支持 | 按下面的四个步骤做。 |
| 一次跨两个次版本，例如 1.0 到 1.2 | 不支持 | 先升到 1.1。 |
| 新的主版本 | 不支持 | 重新安装。 |
| 任何 0.x 版本到 1.0.0 | 不支持 | 重新安装，并使用新数据库。 |

最后一行有一个硬性原因。项目在 2026-10-23 把所有 schema 迁移合并成一个文件，而 `ate-api-server` 会拒绝没有版本号的 schema。这个日期之前的数据库无法升级。0.x 集群里的 actor 及其快照不会迁移到 1.0.0。

## 升级顺序，以及运行中的 actor 会看到什么 {#s-upgrade-and-stale-advice-the-order-and-what-running-actors-see}

各组件按固定顺序升级。一个组件可以比排在它后面的组件新一个版本，但不能比排在它前面的组件新。[图 8.4](#fig-8-4) 展示这四个步骤。

```figure
id: fig-8-4
kind: flow
title: 受支持升级的四个步骤
claim: 只有 worker 这一步会结束运行中的 actor，而 actor 只有在进程能挺过 SIGTERM 时才有 30 分钟。
caption: 从上向下读，每行是一个步骤。左侧方框是要升级的组件，右侧方框说明运行中的 actor 会看到什么。来源：v1.0.0 升级页面与版本偏差策略。
```

1. `podcertificate-controller`，它为组件之间互相出示的证书签名。运行中的 actor 什么也看不到。
2. `atelet`，一次一个节点。运行中的 actor 继续运行。在我们的两次运行里，节点上的挂起和恢复分别失败了 24 秒和 34 秒。
3. worker。你修改每个 `WorkerPool` 的 `spec.workerImage`，池每一批替换 10% 的 worker。
4. `ate-api-server` 和 `ate-idp-server`，然后是 CRD 和 `ate-controller`，然后是 router 和出站网关，然后是 `SandboxConfig`，最后是其余系统组件包。

第 3 步最费功夫。旧 worker 上的每个 actor 都会收到 `SIGTERM`。升级页面在这之后给它 30 分钟 {{docs}}，而我们的运行表明，只有进程能挺过这个信号，这段时间才存在。Substrate 不会在这段时间里替它挂起。

如果没有任何操作调用 `SuspendActor`，actor 就会变成 `ACTOR_STATE_CRASHED`，并丢掉上一次快照之后的工作。这又回到了空闲挂起那条规则：你的 harness 必须自己响应这个信号。spot 实例只给 15 秒到两分钟，从来不会给 30 分钟。

第 4 步有一个无法撤销的动作。第一个新的 `ate-api-server` pod 会迁移数据库 schema，回滚后新 schema 仍然留着。第 4 步之前先做数据库备份。你可以回滚到升级前的版本，不能再往前。

**我们的判断：** 任何 worker 升级之前，先停止新请求，等已有请求结束。然后自己用 `--mode sync` 挂起每个 actor。在 worker 替换完成前一直不放行请求，因为一个请求会恢复一个 actor。同步挂起会在返回前把快照放进 bucket。这样第 3 步就找不到运行中的 actor，那 30 分钟也就无关紧要了。

## 我们运行的两次升级：v1.0.0-rc.3 到 v1.0.0 {#s-upgrade-and-stale-advice-two-upgrades-that-we-ran-v1-0-0-rc-3-to-v1-0-0}

目前没有受支持的更早版本，因为策略从 1.0.0 开始。镜像仓库里有三个候选版本和 v1.0.0 的镜像，没有更旧的。使用发布镜像安装 v0.6.0 时，拉取第一个镜像就返回了 404。所以我们安装了 v1.0.0-rc.3，并按上面的步骤把它升到 v1.0.0，一共做了两次，每次都在新集群上。策略并不覆盖这条路径，而且这两个版本的 schema 版本相同。[图 8.4b](#fig-8-4b) 把两次运行的步骤与请求流放在一起对照。

```figure
id: fig-8-4b
kind: timeline
title: 从 v1.0.0-rc.3 到 v1.0.0 的两次升级，与请求流对照
claim: 两次运行里，挂起和恢复都在 atelet 这一步失败，而一个在 SIGTERM 时退出的运行中 actor 在 worker 镜像变更时崩溃了。
caption: 每个面板从左向右读。面板顶行显示每个步骤何时运行。下面各行显示一条请求流的每个请求，绿色是 200，玫红色是失败。第二次运行多了一个会处理 SIGTERM 的运行中 actor。来源：capture/lab/summary/upgrade-x86.json、capture/lab/summary/upgrade-rerun-x86.json。
```

**我们测得**第一次升级的结果，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）。它有一个 kind 节点和一个 8 个 worker 的池。升级期间运行了三条请求流。一条大约每 3.5 秒挂起并恢复一个 actor。一条每 2 秒列出一次 actor。一条每秒向一个 `RUNNING` actor 发一个请求。

**我们测得**第二次升级的结果，环境是同一台客户机，只做了一次，在新集群上，使用内置 Postgres 和 10 个 worker 的池。请求流相同，只是请求流发往两个 `RUNNING` actor。其中一个的进程在 `SIGTERM` 时退出，另一个的进程会处理它。

| 步骤 | 秒数，第一次运行 | 秒数，第二次运行 | 客户端看到什么 |
|---|---|---|---|
| 1，`podcertificate-controller` | 33.9 | 19.3 | 没有影响 |
| 2，`atelet` | 30.9 | 40.7 | 第一次运行里连续 7 个挂起并恢复的周期在 24 秒内失败，第二次是 10 个，历时 34 秒。挂起失败时报 `while getting atelet conn`，或者来自 `atelet` 的 `Unavailable`，请求得到 503 |
| 3，池的 worker 镜像 | patch 用了 0.4 | patch 用了 0.3 | 在 `SIGTERM` 时退出的那个 `RUNNING` actor 崩溃了。第一次运行里它在 patch 后 1.2 秒开始返回 503。第二次在 18 秒开始返回 503，patch 后 22 秒的采样里它已是 `ACTOR_STATE_CRASHED` |
| 4a，`ate-api-server` 和 `ate-idp-server` | 28.4 | 45.3 | 没有影响 |
| 4b，CRD 和 `ate-controller` | 12.3 | 19.4 | 没有影响 |
| 4c，router 和出站网关 | 21.8 | 40.7 | 没有影响 |
| 4d，`SandboxConfig` | 18.7 | 3.6 | 没有影响 |
| 4e，系统组件包 | 29.5 | 36.1 | 没有影响 |

第一次运行里，从第 1 步到第 4e 步结束共 343 秒。其中包括第 3 步观察池的 160 秒。周期流在 110 个周期里有 103 个成功，7 次失败全部出现在第 2 步。列表流 211 次请求全部得到应答。

第二次运行的总时间是 346 秒，其中 worker 这一步占 135 秒。列表流 199 次请求全部得到应答。两次运行里 schema 版本都没有变，结束时每个 Substrate pod 都运行 v1.0.0。

每次升级之前，我们各创建一个每种类型的 actor，升级之后逐个调用。

| 升级前的 actor | 第一次运行 | 第二次运行 |
|---|---|---|
| 在计数 3 处用 `--mode sync` 挂起 | 200，计数 4 | 200，计数 4 |
| 在计数 3 处用默认模式挂起 | 200，计数 4 | 200，计数 4 |
| 在计数 5 处挂起，带标签 | 200，计数 6 | 200，计数 6 |
| 已创建但从未运行 | 200，计数 1 | 200，计数 1 |
| 从候选版本生成的黄金快照创建的新 actor | 200，计数 1 | 200，计数 1 |
| 从标签创建的新 actor | 200，计数 6 | 200，计数 6 |
| 第 3 步期间 `RUNNING`，进程在 `SIGTERM` 时退出 | `ACTOR_STATE_CRASHED`。469 个请求里 368 个得到 503。一次 `revert` 用了 0.22 秒，计数回到 1 | `ACTOR_STATE_CRASHED`。441 个请求里 118 个得到 503。一次 `revert` 用了 0.22 秒，计数从黄金快照重新开始 |
| 第 3 步期间 `RUNNING`，进程会处理 `SIGTERM` | 本轮未包含 | 441 个请求全部成功处理。一次 0.62 秒的挂起把它移到了新 worker，计数保持不变 |
| 第 3 步期间处于挂起与恢复循环中 | 第 3 步的每个周期都成功 | 在 patch 后 15 秒变为 `ACTOR_STATE_CRASHED`，当时它的挂起因来自 `atelet` 的 `Unavailable` 而失败。它一直崩溃了 395 秒，直到我们执行 `revert`。丢了一次调用 |

所以在两次运行里，快照、标签和候选版本留下的黄金快照在 v1.0.0 上都能正常工作。损失出在第 3 步。在 `SIGTERM` 时退出的 actor 每次都崩溃。挂起进行到一半时 worker 消失的 actor 崩溃了一次，出现在第二次运行里。在我们发送 `revert` 之前，没有任何东西修复它。

### 这 30 分钟取决于 actor {#s-upgrade-and-stale-advice-the-30-minutes-depend-on-the-actor}

升级页面给每个运行中的 actor 先发 `SIGTERM`，再给 30 分钟 {{docs}}。我们那个运行中的 actor 没有得到 30 分钟。它的进程在 `SIGTERM` 时退出，所以 actor 在几秒内就崩溃了。

**我们测得**这一点，是在同一个池的第二次滚动里，这次在 v1.0.0 上，只做了一次。运行了两个 actor。第一个的进程在 `SIGTERM` 时退出，这个 actor 在第一次采样，也就是 patch 后 5 秒，就已是 `ACTOR_STATE_CRASHED`。第二个的进程会处理 `SIGTERM` 并继续运行。这个 actor 一直是 `RUNNING`，在 175 秒内应答了 36 个请求中的 36 个，而它的 worker pod 处于 `Terminating`。

随后我们用 `--mode sync` 挂起它，用了 0.64 秒。它在新 worker 上恢复，计数继续。

第二次升级和下面的回滚各自带着同样的两个 actor，各做了一次。在这两次里，没有处理函数的 actor 崩溃了，有处理函数的 actor 响应了每个请求，挂起之后计数也保持不变。所以这个结果在我们对池的所有滚动里都成立。没有处理函数的 actor 4 次里崩溃 4 次，有处理函数的 actor 3 次里存活 3 次。

所以这个窗口只对主进程能挺过 `SIGTERM` 的 actor 存在。程序收到这个信号就会退出，除非它有处理函数。

我们的运行还表明，挂起要比升级页面安排的更早。我们那一个节点上的 `atelet` 重启期间，挂起和恢复分别失败了 24 秒和 34 秒。所以在第 2 步之前就要停止请求并挂起每个 actor，到第 3 步之后再恢复流量。循环里崩溃的那个 actor 说明了这么做的代价，即 worker 消失时挂起尚未完成。

## 我们运行的一次回滚：v1.0.0 到 v1.0.0-rc.3 {#s-upgrade-and-stale-advice-a-rollback-that-we-ran-v1-0-0-to-v1-0-0-rc-3}

升级页面对回滚只写了一句话。做法是从旧版本出发，把同一份清单倒过来，崩溃的 actor 用 `kubectl ate revert actor` 回到它的上一个快照 {{docs}}。

**我们测得**一次回滚的结果，紧接在第二次升级之后，在同一个集群上。我们在 v1.0.0-rc.3 的检出里运行它，用升级前保存的配置，按相反的顺序执行。开始之前，我们先回退了在循环里崩溃的那个 actor。同样的三条请求流继续运行。

| 步骤 | 秒数 | 客户端看到什么 |
|---|---|---|
| 4d，`SandboxConfig` | 3.5 | 没有影响 |
| 4c，router 和出站网关 | 23.3 | 没有影响 |
| 4b，CRD 和 `ate-controller` | 5.0 | 没有影响 |
| 4a，`ate-api-server` 和 `ate-idp-server` | 25.0 | 没有影响 |
| 3，池的 worker 镜像，回到 v1.0.0-rc.3 | patch 用了 0.4 | 在 `SIGTERM` 时退出的 actor 从 patch 后 6.4 秒开始返回 503，306 个请求里 130 个失败。一次 `revert` 用了 0.21 秒，它的计数从黄金快照重新开始。有处理函数的 actor 306 个请求全部成功 |
| 2，`atelet` | 12.7 | 一个挂起并恢复周期失败 |
| 1，`podcertificate-controller` | 3.7 | 没有影响 |

我们没有反向运行第 4e 步。回滚之后每个 actor 都返回 200，每个已挂起的 actor 都保留了计数。每个 Substrate 镜像都是 v1.0.0-rc.3，schema 版本没有变。列表流 138 次请求全部得到应答。

回滚的代价与升级相同，也出在同一个步骤。这一对版本没有 schema 变更，所以我们的运行无法说明回滚遇到新 schema 时会怎样。升级页面说新 schema 会留下，这种情况需要第 4 步之前的备份。

## 从 v0.6.0 出发：无法升级，重新安装还需要两处修复 {#s-upgrade-and-stale-advice-from-v0-6-0-no-upgrade-and-a-reinstall-that-needs-two-fixes}

镜像仓库里没有 v0.6.0 的镜像，因此我们在同一台客户机的新集群上从源码标签构建安装，共测试了一次。它的 README 快速上手失败了两次。第一次部署立刻就停了。

```listing
title: v0.6.0 README 里的安装命令
source: capture/lab/Y-reruns-rollback-scale/40-v060/00-install/20-deploy-ate-system.log
lang: text
note: 输出里最后一行有用的内容。
---
Error: at least one of ATE_INGRESS_ALLOWED_SPIFFE_IDS, config.ingressAllowedSPIFFEIDs or --ingress-allowed-spiffe-ids must be set, got none
```

加上入站身份之后，部署用了 278 秒。README 里的演示命令 `deploy demo-counter` 打印了帮助并返回 0，`deploy demo counter` 才真正生效。随后 README 通过 router 的 80 端口发请求，端口转发失败了，报 `Service atenet-router does not have a service port 80`。所以按 README 的路径，没有任何请求到达我们在 v0.6.0 上创建的那四个 actor。

接着我们在那个集群上运行 v1.0.0 的安装器，作为直接升级。它在 3 秒内就停了。

```listing
title: 从 v0.6.0 直接升级到 v1.0.0
source: capture/lab/Y-reruns-rollback-scale/40-v060/20-direct-upgrade/10-deploy.log
lang: text
note: 错误行在第一句之后被截断。
---
[step]: deploy_crds
[step]: images: pre-built from ghcr.io/agent-substrate/substrate, tag v1.0.0
…
Error: while applying customresourcedefinition/csidriverconfigs.ate.dev: CustomResourceDefinition.apiextensions.k8s.io "csidriverconfigs.ate.dev" is invalid: status.storedVersions[0]: Invalid value: "v1alpha1": missing from spec.versions …
```

v0.6.0 系统继续运行。v1.0.0 的 CLI 无法与它通信：`unknown service substrate.ateapi.v1.Control`。通过 v1.0.0 的 `kubectl ate proxy` 发出的请求，仍然到达了旧系统上四个 actor 中的三个。v0.6.0 的升级页面说要重新安装，所以我们在同一个集群上这样做了。

| 步骤 | 结果 |
|---|---|
| v1.0.0 的 `ate-setup delete all` | 346 秒完成。它删除了全部 Substrate 命名空间和卷 |
| 部署 v1.0.0 | 1 秒后失败，原因是 `sandboxconfigs.ate.dev` CRD 仍残留已存储版本。该 CRD 一直卡在删除中，因为 `SandboxConfig` `gvisor-default` 还带着 finalizer `sandboxconfig.ate.dev/workerpool-protection`，而它的控制器已经不在了 |
| 删除 finalizer，再次部署 | 157 秒后失败。`atelet` 停止，报 `image cache at "/var/lib/ate/image-cache" has layout version "2" and this atelet supports "3"` |
| 删除节点上的那个文件夹，再次部署 | 30 秒完成 |

新系统里没有 actor，也没有 atespace。我们在 v0.6.0 上创建的一切都没有保留下来。

**我们的判断：** 不要把 0.x 集群迁到 1.0。在新集群上安装 1.0，重新创建模板，再迁移流量。如果一定要复用集群，要为 finalizer 和镜像缓存做好准备，并接受最后得到一个空系统。

## 后续内容 {#s-upgrade-and-stale-advice-coming-next}

我们运行了两次升级和一次回滚，每次只做一遍，只用一个节点，两次升级都从候选版本出发。从 v0.6.0 出发，我们没有找到任何能保留 actor 的路径。下一版将补充两个受支持版本之间的升级，以及跨越 schema 变更的回滚。它还会补充多节点、microVM 类别和集群外 Postgres 下的升级。

我们的 kagent 运行当天，出现了新的 kagent 版本 v1.0.1。我们所有的 kagent 结果都来自 v1.0.0。

```takeaways
- 先看 Substrate 教程的日期，对 2026-11-05 之前写的内容保持怀疑。
- 要从任何 0.x 版本迁移，就在新集群上安装 1.0，因为没有 actor 能保留下来。
- 存 actor 的状态名，不要存编号。
- 升级到 `atelet` 这一步之前，先停止请求，并用 `--mode sync` 挂起每个 actor。
- 在 actor 进程里处理 `SIGTERM`，否则每次滚动 worker 都会让 actor 崩溃。
- 升级到 API server 这一步之前，先做数据库备份。
- 每次只升一个次版本，并按文档规定的组件顺序进行。
```

来源： capture/lab/summary/upgrade-x86.json, capture/lab/summary/upgrade-rerun-x86.json, capture/lab/summary/v060-x86.json, capture/lab/U-pg-upgrade-scale/30-upgrade-v1.0.0-rc.3/20-upgrade/00-timeline-steps.tsv, capture/lab/U-pg-upgrade-scale/30-upgrade-v1.0.0-rc.3/20-upgrade/02-cycle-stream.tsv, capture/lab/U-pg-upgrade-scale/30-upgrade-v1.0.0-rc.3/30-after/10-actors-after.txt, capture/lab/U-pg-upgrade-scale/30-upgrade-v1.0.0-rc.3/40-worker-roll-on-v1.0.0/10-watch.tsv, capture/lab/U-pg-upgrade-scale/30-upgrade-v0.6.0/00-install-v0.6.0/51-ghcr-release-tags.txt, capture/lab/U-pg-upgrade-scale/30-upgrade-v0.6.0/00-install-v0.6.0/20-deploy-ate-system.log, capture/lab/Q-network/m-router-ports/agentgateway/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/envoy/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/agentgateway/11-port-probes-supplement.txt, README.md, the ActorState enum and the CLI at v0.1.0 and at v1.0.0 (the old and new commands); cmd/kubectl-ate/internal/cmd/actor.go, api/ateapi/v1/ateapi.proto, manifests/ate-install/generated/ate.dev_workerpools.yaml, cmd/ate-setup/commands.md and go.mod at v1.0.0; docs/guides/upgrade.md, docs/reference/version-skew-policy.md, docs/dev/postgresql-schema-evolution.md and docs/get-started/quickstart.md at v1.0.0; capture/lab/B-lifecycle/10-trace.tsv, capture/lab/D-durability/10-watch-part1.tsv, capture/lab/G-dataplane/envoy/ingress-auth/, capture/lab/G-dataplane/agentgateway/ingress-auth/, capture/lab/G-dataplane/02-agentgateway-without-ingress-allowlist/, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/summary/failures-x86.json, capture/lab/summary/timers-x86.json, capture/lab/G-dataplane/agentgateway/06-services.txt, capture/lab/G-dataplane/agentgateway/11-listening.txt, capture/lab/G-dataplane/agentgateway/10-atenet-router-agentgateway-config.yaml, capture/lab/G-dataplane/envoy/06-services.txt; manifests/ate-install/atenet-router.yaml and manifests/ate-install/components/agentgateway/kustomization.yaml at v1.0.0.
