# kubectl ate 命令

> v1.0.0 的 `kubectl ate` 插件包含针对七类资源的 11 个动词，且多数命令只向 Substrate API 发起一次调用。

该插件是二进制文件 `kubectl-ate`。它通过你的 kubeconfig 找到 `ate-api-server`，并在每个命令执行时开启一次端口转发，除非你传入了 `--endpoint`。[第 2.2 节](#s-kubectl-ate)展示了如何安装与使用它。在我们的运行中，我们从代码库检出目录执行 `go install ./cmd/kubectl-ate` 构建了它。

有三类命令的调用次数不是恰好一次。`logs actor` 还会通过 Kubernetes API 读取 worker pod 的日志。`proxy actor` 将流量经由 `atenet-router` 发送，而不是经由 `ate-api-server`。`admin` 类命令直接写入 Kubernetes Secret，不调用 Substrate API。

## 全局标志 {#s-ref-kubectl-ate-global-flags}

```listing
title: 某个命令的帮助文本，包含全局标志
source: capture/lab/A-quickstart/60-state.log
lang: text
note: 我们在首次运行中执行错误命令 kubectl ate get worker -A 的输出。CLI 先打印错误，随后打印这份帮助文本。
---
Error: unknown flag "-A"

Usage:
  kubectl-ate get worker [worker-name ...] [flags]

Aliases:
  worker, workers

Flags:
  -a, --atespace string        filter worker pods hosting actors in a specific atespace
  -h, --help                   help for worker
  -n, --namespace string       scope output to a specific Kubernetes namespace
      --sandbox-class string   filter by sandbox class (e.g. gvisor, microvm)
  -l, --selector string        filter by worker pool labels

Global Flags:
      --context string      kubeconfig context to use
      --endpoint string     manual override for the gRPC target (e.g., localhost:8080); if omitted, automatically port-forwards
      --kubeconfig string   path to the kubeconfig file
  -o, --output string       output format: table, json, or yaml (default "table")
      --preview             allow the use of preview features enabled on the server
      --token-file string   path to a bearer token for ate-api authentication, or - for stdin (defaults to a Kubernetes ServiceAccount token)
      --trace               enable tracing for the request
  -v, --verbose count       output verbosity; may be repeated (e.g. -v, -vv, -vvvvv)
```

| 标志 | 适用场景 |
|---|---|
| `--context` | 机器上有多个集群。上下文错误会将命令发往未部署 Substrate 的集群。 |
| `--endpoint` | 需要保持一个端口转发开启并连续执行多条命令 |
| `--token-file` | 需要以自身身份操作。若不指定，CLI 会使用共享 ServiceAccount 并打印警告，见[第 5.1 节](#s-client-authentication)。 |
| `-o yaml` | 你需要对象的 `uid`、`version` 或快照列表 |
| `--preview` | 服务器开启了某项预览功能且你想使用它 |
| `--version` | 你想查看插件版本。它仅为根命令的标志，因此上面子命令的帮助文本未列出它。它没有 `-v` 简写，因为 `-v` 表示 `--verbose`。 |

## Actor {#s-ref-kubectl-ate-actors}

| 命令 | 标志 | 作用 |
|---|---|---|
| `get actor [name ...]` | `-a`, `-A` | 列出一个 atespace 或全部 atespace 中的 actor，或打印指定名称的 actor。 |
| `create actor <name>` | `--template`, `-a`, `--tag` | 从模板或标签创建已挂起的 actor。`--template` 接受 `atespace/name` 或单独的名称。 |
| `update actor <name>` | `-a`, `--template`, `--worker-selector` | 将 actor 指向另一个模板，或修改其 worker 选择器。 |
| `suspend actor <name>` | `-a`, `--mode` | 挂起 actor。`--mode` 默认为 `async`，也可为 `sync`。 |
| `resume actor <name>` | `-a` | 不经由请求直接恢复。 |
| `revert actor <name>` | `-a` | 使 actor 回到其持久快照。 |
| `delete actor <name>` | `-a` | 删除处于任何状态的 actor。 |
| `logs actor <name>` | `-a`, `-f`, `-c`, `--source` | 打印日志。`--source` 为 `all`、`containers` 或 `lifecycle`。`-c _sandbox` 打印沙箱运行时日志。 |
| `proxy actor <name> [[local:]remote ...]` | `-a`, `--address` | 打开本地端口，通过 router 转发到 actor。默认监听 `127.0.0.1`。 |

## 模板、标签与 atespace {#s-ref-kubectl-ate-templates-tags-and-atespaces}

| 命令 | 标志 | 作用 |
|---|---|---|
| `get actor-template [name ...]` | `-a`, `-A` | 列出或打印模板。 |
| `create actor-template -f <manifest>` | `-f` | 从 JSON 或 YAML 文件创建模板，指定 `-` 时从标准输入读取。 |
| `delete actor-template <name>` | `-a` | 删除模板及其黄金快照。 |
| `get tag [name ...]` | `-a`, `-A` | 列出或打印标签。 |
| `create tag <name>` | `-a`, `--actor`, `--scope` | 为已挂起 actor 的快照打上标签。`--scope` 为 `atespace` 或 `published`。 |
| `update tag <name>` | `-a`, `--scope` | 修改作用域。 |
| `delete tag <name>` | `-a` | 删除标签及其快照。 |
| `get atespace [name ...]` | 无 | 列出或打印 atespace。 |
| `create atespace <name>` | 无 | 创建 atespace。 |
| `delete atespace <name>` | 无 | 删除空的 atespace。 |

CLI 没有更新模板的命令。要修改模板，需使用新名称创建模板，并通过 `update actor --template` 将 actor 指向新模板。

## 出站策略与访问策略 {#s-ref-kubectl-ate-egress-policies-and-access-policies}

| 命令 | 标志 | 作用 |
|---|---|---|
| `get egress-policy <actor>` | `-a` | 打印单个 actor 的策略。 |
| `create egress-policy <actor> -f <manifest>` | `-a`, `-f` | 创建策略。 |
| `update egress-policy <actor> -f <manifest>` | `-a`, `-f` | 替换策略。清单必须携带 `metadata.uid` 和 `metadata.version`。 |
| `delete egress-policy <actor>` | `-a`, `--uid`, `--version` | 删除策略，支持可选的前置条件。 |
| `get access-policy` | `-a` 或 `--global` | 打印某个 atespace 的访问策略，或打印全局策略。 |
| `create access-policy -f <manifest>` | `-a` 或 `--global`, `-f` | 创建访问策略。 |
| `update access-policy -f <manifest>` | `-a` 或 `--global`, `-f` | 替换访问策略。 |
| `delete access-policy` | `-a`, `--uid`, `--version` | 删除某个 atespace 的策略。全局策略不可删除。 |

## Worker {#s-ref-kubectl-ate-workers}

| 命令 | 标志 | 作用 |
|---|---|---|
| `get worker [name ...]` | `-n`, `-a`, `-l`, `--sandbox-class` | 列出 worker，展示状态以及对照容量的 actor 数量、CPU 和内存。 |
| `top worker` | `-n`, `-a`, `-l`, `--sandbox-class` | 打印 worker 的 CPU 和内存使用情况。 |

Worker 不属于任何 atespace。`get workers` 默认列出所有 Kubernetes namespace 的 worker，而 `get workers -A` 会失败并报错 `unknown flag "-A"`。`-n` 和 `-l` 标志可用于收窄列表，`-a` 仅保留承载该 atespace 内 actor 的 worker。

## 管理命令 {#s-ref-kubectl-ate-admin-commands}

这些命令直接读取和写入 Kubernetes Secret。它们接受 `--name` 和 `--secret-namespace`。

| 命令 | 标志 | 作用 |
|---|---|---|
| `admin make-ca-pool` | `--ca-id`, `--key-type`, `--validity` | 创建包含一个 CA 的池。密钥类型默认为 `ECDSAP256`，有效期为 365 天。 |
| `admin make-jwt-pool` | `--alg`, `--key-id` | 创建为 actor JWT 签名的池。算法默认为 `ES256`，也可为 `RS256`。 |
| `admin list-jwt-keys` | 无 | 列出池中的密钥。 |
| `admin add-jwt-key` | `--alg`, `--key-id` | 添加一个用于验签、暂不用于签名的密钥。 |
| `admin activate-jwt-key` | `--key-id` | 将某个密钥设为签名密钥。 |
| `admin remove-jwt-key` | `--key-id` | 移除密钥。 |

[第 5.3 节](#s-actor-jwts)解释了这些令牌，[第 8.5 节](#s-limits-at-v1-0-0)指出轮换需要手动操作。

## 早期文档提及但 v1.0.0 中不存在的命令 {#s-ref-kubectl-ate-commands-that-older-text-names-and-v1-0-0-does-not-have}

`kubectl ate pause actor` 与标志 `--template-ref` 在 v1.0.0 中并不存在。[第 8.4 节](#s-upgrade-and-stale-advice)列出了替代方案。

来源：cmd/kubectl-ate/internal/cmd/root.go, verbs.go, actor.go, revert_actor.go, proxy.go, actortemplate.go, tag.go, atespace.go, egress_policy.go, access_policy.go, worker.go and admin.go, and docs/reference/kubectl-ate.md at v1.0.0; capture/lab/A-quickstart/60-state.log (the captured help text), capture/lab/B-lifecycle/20-trace-ops.tsv (suspend, resume, revert as run).
