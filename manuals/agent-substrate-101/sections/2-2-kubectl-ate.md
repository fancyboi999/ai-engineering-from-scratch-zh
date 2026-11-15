# kubectl ate

> `kubectl ate` 与 `ate-api-server` 通信并读取 Postgres，不带 `--token-file` 时，每个调用方都以同一个共享身份操作。

你在运行 Agent Substrate 的集群上输入 `kubectl get actors`，Kubernetes 回答没有这种资源。actor 确实存在，只是你问错了服务器。actor、模板和 worker 都是 Substrate 数据库里的记录行，只有一个插件能读取它们。

读完本节，你能安装 `kubectl ate`，并说清每条命令如何到达控制平面。你还能解释它每次调用都会打印的那条警告。

## 安装插件 {#s-kubectl-ate-install-the-plugin}

**插件：** `kubectl-ate` 是一个独立二进制文件。当它位于你的 `PATH` 中时，`kubectl` 会用它来执行每条以 `kubectl ate` 开头的命令。

发布版提供 Linux 和 macOS 的二进制文件，支持 amd64 和 arm64 架构，不提供 Windows 版本 {{docs}}。下载文件和校验和文件，核对无误后再安装：

```bash
BASE=https://github.com/agent-substrate/substrate/releases/download/v1.0.0
curl -LO $BASE/kubectl-ate-linux-amd64
curl -LO $BASE/kubectl-ate-linux-amd64.sha256
shasum -a 256 -c kubectl-ate-linux-amd64.sha256
mkdir -p ~/.local/bin
install -m 0755 kubectl-ate-linux-amd64 ~/.local/bin/kubectl-ate
```

在搭载 Apple 芯片的 Mac 上，文件名是 `kubectl-ate-darwin-arm64`。如果你有检出的代码和 Go，也可以直接从该标签构建插件：

```bash
go install ./cmd/kubectl-ate
```

`kubectl` 只会在你的 `PATH` 里查找插件。请确保 `~/.local/bin` 在 `PATH` 中，用 `go install` 时则确保 `$(go env GOPATH)/bin` 在 `PATH` 中。

**我们测得**这次构建在一台 16 vCPU、23 GB 的 x86 服务器客户机上跑了一次。控制平面装好之后，`go install` 用了 5 秒，因为 Go 模块已经在磁盘上。在我们的测试运行中，我们始终从该标签构建插件。我们确认了两个发布文件均存在，但未对下载过程计时。

继续之前，先检查版本：

```bash
kubectl ate --version
```

## 命令如何到达控制平面 {#s-kubectl-ate-how-a-command-reaches-the-control-plane}

`kubectl ate` 不会向 Kubernetes API 查询 actor。它使用你的 kubeconfig，对命名空间 `ate-system` 里的 Service `api` 打开一个端口转发。不带 `--token-file` 时，它还会用 kubeconfig 为共享的 `ate-client` ServiceAccount 申请一个令牌。随后它通过该端口转发向 `ate-api-server` 发送 gRPC 请求，`ate-api-server` 从 Postgres 读取数据并返回响应 {{code}}。[图 2.2](#fig-2-2) 把这条路径和普通 `kubectl` 命令的路径放在一起对比。

```figure
id: fig-2-2
kind: flow
title: kubectl ate 与 kubectl 各从哪里读取
claim: kubectl ate 通过 ate-api-server 从 Postgres 读取 atespace、模板、actor 和 worker，而 kubectl 只从 etcd 读取三种自定义资源。
caption: 上面一行是除 proxy 之外的所有 kubectl ate 命令。下面一行是普通 kubectl。虚线框是上面一行默认使用的身份。来源：capture/lab/A-quickstart/50-create-actor.log、capture/lab/A-quickstart/60-state.log。
```

从图中可以得出两个结论。

第一，每条命令都会打开自己的端口转发。因此 `kubectl ate` 依赖可用的 Kubernetes API server，而且你的账号需要有权对 `ate-system` 做端口转发。kube-apiserver 宕机时，命令会这样失败：

```listing
title: kube-apiserver 宕机期间的 kubectl ate 命令
source: capture/lab/E-dependency-loss/16-T3-cli-during.txt
lang: text
---
Error: failed to connect to ate-api-server: getting api service: Get "https://127.0.0.1:44015/api/v1/namespaces/ate-system/services/api": EOF
```

那次故障期间，actor 仍在正常响应请求，失败的只有 CLI 和代理。具体数字见[第 2.3 节](#s-your-first-actor-and-the-proxy)。

第二，参数 `--endpoint` 会跳过端口转发。集群内的程序传入 `ate-api-server` 的地址直接建立连接。它的 pod 必须位于带有标签 `ate.dev/api-access=true` 的命名空间中 {{docs}}。我们自己没有手动设置过这个标签，但我们在 kagent 的运行中见到了它背后的网络规则：`default` 里的 pod 访问不到 API，而 `kagent` 里的 pod 可以。[第 5.1 节](#s-client-authentication)记录了这次探测。

## 共享身份警告 {#s-kubectl-ate-the-shared-identity-warning}

我们录制中的每条命令，输出开头都是同一行：

```listing
title: 不带令牌文件时创建的第一个 actor
source: capture/lab/A-quickstart/50-create-actor.log
lang: text
---
Warning: no --token-file given; acting as the shared identity system:serviceaccount:ate-system:ate-client rather than as yourself. Pass --token-file to act as yourself.
ATESPACE           NAME           TEMPLATE                   STATE                   WORKER POD   WORKER IPS   VERSION   AGE
ate-demo-counter   my-counter-1   ate-demo-counter/counter   ACTOR_STATE_SUSPENDED   <none>                    1         0s
```

**共享身份：** `ate-system` 命名空间里的 ServiceAccount `ate-client`。当你不传令牌时，插件会向 Kubernetes 申请这个 ServiceAccount 的令牌，并把它发给 `ate-api-server` {{code}}。

这条警告说得很准确，在共享集群上你绝不能忽略它。每个能对 `ate-system` 做端口转发的人和脚本，在 Substrate 看来都是同一个调用方。访问策略无法区分他们，因为策略看到的只有一个名称。

在你自己机器上的 kind 集群里，使用共享身份没有问题。但在多团队共用的集群里，必须给每个调用方分配独立令牌，并通过 `--token-file` 传入。[第 5.1 节](#s-client-authentication)说明该用哪种令牌，[第 5.2 节](#s-access-policies)限制调用方在 atespace 里能做什么。

我们的脚本用 `grep -v '^Warning: no --token-file'` 把这一行从输出里滤掉了。解析表格的脚本可以这样做，但面向人工阅读的输出不要这样做。

## 第一天用的命令 {#s-kubectl-ate-the-commands-of-the-first-day}

actor 由它的 atespace 和名称共同寻址，因此大多数命令都要用 `-a` 指定 atespace。不存在默认 atespace {{docs}}。

| 命令 | 作用 |
|---|---|
| `kubectl ate get actors -a ate-demo-counter` | 列出一个 atespace 里的 actor |
| `kubectl ate get actors -A` | 列出所有 atespace 的 actor |
| `kubectl ate get actor my-counter-1 -a ate-demo-counter -o yaml` | 打印单个 actor 及其快照 |
| `kubectl ate create actor my-counter-1 -a ate-demo-counter --template counter` | 基于模板创建 actor |
| `kubectl ate suspend actor my-counter-1 -a ate-demo-counter` | 写入快照并释放 worker |
| `kubectl ate resume actor my-counter-1 -a ate-demo-counter` | 将 actor 恢复到某个 worker 上 |
| `kubectl ate revert actor my-counter-1 -a ate-demo-counter` | 让崩溃的 actor 回退到最近的持久快照 |
| `kubectl ate logs actor my-counter-1 -a ate-demo-counter` | 打印 actor 在其 worker 上的日志 |
| `kubectl ate get workers` | 列出 worker 及其已用的 CPU 和内存 |
| `kubectl ate proxy actor my-counter-1 -a ate-demo-counter` | 将本地端口转发到 actor |

`-o json` 和 `-o yaml` 会打印完整对象。调试时请用这两个选项，因为表格视图会隐藏快照信息。下面是以 JSON 形式输出的新 actor：

```listing
title: 新 actor 的状态
source: capture/lab/B-lifecycle/00-actor-before.json
lang: json
note: 截取自 actor 对象。元数据和沙箱版本属性已截去。
---
  "status": {
    "lastAssignedGeneration": 1,
    "snapshots": [
      {
…
        "durableSnapshot": {
…
          "state": "SNAPSHOT_STORAGE_STATE_COMPLETED"
        },
        "fidelity": "SNAPSHOT_FIDELITY_MEMORY",
        "generation": 1,
        "owner": "SNAPSHOT_OWNER_TAG",
…
    "state": "ACTOR_STATE_SUSPENDED"
```

这个 actor 从未运行过，却已经拥有一个快照。它的所有者是一个标签，而标签属于模板。[第 3.1 节](#s-actortemplate-and-the-golden-snapshot)解释了这个快照。[命令参考](#s-ref-kubectl-ate)列出了全部命令和参数。

## 我们犯过的三个错误 {#s-kubectl-ate-three-mistakes-we-made}

**对 worker 用 `-A`。** worker 属于 Kubernetes 命名空间，不属于 atespace。对 actor 有效的参数，对 worker 会报错：

```listing
title: -A 不是 get worker 的参数
source: capture/lab/A-quickstart/60-state.log
lang: text
note: 其余用法说明已截去。
---
Error: unknown flag "-A"
…
  -a, --atespace string        filter worker pods hosting actors in a specific atespace
…
  -n, --namespace string       scope output to a specific Kubernetes namespace
```

要查看全部 worker，运行不带参数的 `kubectl ate get workers`。

**对 actor 用 `kubectl get`。** `kubectl get actor` 和 `kubectl get actortemplate` 什么都不会返回，因为这些对象不是 Kubernetes 自定义资源。`kubectl get workerpool` 可以工作，因为 `WorkerPool` 是自定义资源 {{docs}}。

**沿用旧指南里的参数。** v0.x 的指南用 `--template-ref` 创建 actor。在 v1.0.0 中，这个参数已变为 `--template` {{code}}。[第 8.4 节](#s-upgrade-and-stale-advice)列出了其他变化。

```takeaways
- 安装 kubectl-ate 发布版二进制文件并核对校验和，或者从该标签构建。
- 管理 actor、模板和 worker 时用 kubectl ate，管理 WorkerPool 时用普通 kubectl。
- 每条 actor 命令都用 -a 指定 atespace。
- 在多人共用的集群上，一律传入 --token-file。
- 调试 actor 时用 -o yaml，因为表格视图会隐藏它的快照。
```

来源：capture/lab/A-quickstart/50-create-actor.log, capture/lab/A-quickstart/60-state.log, capture/lab/A-quickstart/02-steps.tsv, capture/lab/summary/install-steps.json, capture/lab/B-lifecycle/00-actor-before.json, capture/lab/E-dependency-loss/16-T3-cli-during.txt, capture/lab/_scripts/g6-switch-agw.sh, capture/lab/_scripts/m1-crossbuild.sh; docs/reference/kubectl-ate.md, docs/dev/releasing.md, docs/guides/authentication.md, cmd/kubectl-ate/internal/cmd, and internal/ateclient/builder.go at v1.0.0.
