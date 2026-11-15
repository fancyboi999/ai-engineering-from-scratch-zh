# API 方法

> v1.0.0 的 Substrate API 由两个 gRPC 服务和 50 个方法组成，另有四个可由第三方实现的插件服务。

`ate-api-server` 在同一个端口上提供这两个服务：`ate-system` 中名为 `api` 的 Service 的 443 端口。proto 包是 `substrate.ateapi.v1`，所以方法的全名形如 `/substrate.ateapi.v1.Control/GetActor`。Go 包是 `go.ate.dev/substrate/api/ateapi/v1`。客户端按[第 5.1 节](#s-client-authentication)的方式认证，每个 `Control` 方法都要按[第 5.2 节](#s-access-policies)的访问策略检查。

下面的表格列出每个方法、它在 v1.0.0 中的作用，以及调用它的 `kubectl ate` 命令。表中的 `-` 表示 CLI 没有对应命令。我们的运行调用了每个 actor 方法、出站策略方法，以及模板、atespace 和 worker 的 create、get、list 方法。`UpdateActor` 在[第 3.1 节](#s-actortemplate-and-the-golden-snapshot)的模板迁移中运行过。我们的运行还在[第 5.2 节](#s-access-policies)创建、替换并删除了一个 atespace 访问策略，并读取了全局策略。

我们的运行在[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)创建了三个标签，用它们启动了三个 actor，并删除了标签。运行没有改动标签的作用域。

## Control：actors {#s-ref-api-methods-control-actors}

| 方法 | 作用 | `kubectl ate` |
|---|---|---|
| `CreateActor` | 从模板或标签创建 actor。新 actor 处于 `ACTOR_STATE_SUSPENDED`。 | `create actor` |
| `GetActor` | 返回一个 actor 及其状态和快照。 | `get actor <name>` |
| `ListActors` | 列出一个 atespace 或全部 atespace 中的 actor。 | `get actor` |
| `UpdateActor` | 修改 actor 的模板或 worker 选择器。需要 `uid` 和 `version`。 | `update actor` |
| `SuspendActor` | 把运行中的 actor 检查点到一个新快照。已挂起的 actor 原样返回。`options.mode` 默认是异步。 | `suspend actor` |
| `ResumeActor` | 从最新快照恢复已挂起的 actor。运行中的 actor 原样返回，并带 `resumed=false`。router 对每个请求都调用它，并依赖这个回复。 | `resume actor` |
| `RevertActor` | 把 actor 回退到其持久快照对应的 `ACTOR_STATE_SUSPENDED` 状态。接受崩溃的 actor、运行中的 actor，以及只有节点本地快照的已挂起 actor。也接受已处于 `ACTOR_STATE_REVERTING` 的 actor，用于重试。在我们的运行中，这种重试只有等 actor 所在节点恢复后才成功。回退会调用 actor 所分配节点上的 `atelet`。仅当已挂起 actor 的最新快照已经持久时，才会在没有 `atelet` 的情况下继续执行 {{code}}。 | `revert actor` |
| `DeleteActor` | 停止工作负载，释放 worker，并删除记录。接受任何状态。 | `delete actor` |
| `MintActorJwt` | 签发一个声明 actor 身份的令牌。只允许出站网关调用。 | - |

## Control：出站策略 {#s-ref-api-methods-control-egress-policies}

出站策略是从属于单个 actor 的对象。它的规则见[第 6.2 节](#s-egresspolicy-and-default-deny)。

| 方法 | 作用 | `kubectl ate` |
|---|---|---|
| `CreateActorEgressPolicy` | 创建 actor 的策略。 | `create egress-policy <actor> -f` |
| `GetActorEgressPolicy` | 返回该策略。 | `get egress-policy <actor>` |
| `UpdateActorEgressPolicy` | 替换该策略。需要 `metadata.uid` 和 `metadata.version`。 | `update egress-policy <actor> -f` |
| `DeleteActorEgressPolicy` | 删除该策略。actor 回到默认拒绝。 | `delete egress-policy <actor>` |

## Control：模板、标签与 atespace {#s-ref-api-methods-control-templates-tags-and-atespaces}

| 方法 | 作用 | `kubectl ate` |
|---|---|---|
| `CreateActorTemplate` | 创建模板。随后由一个调谐器（reconciler）构建它的黄金快照。 | `create actor-template -f` |
| `GetActorTemplate` | 返回一个模板及其黄金快照的状态。 | `get actor-template <name>` |
| `ListActorTemplates` | 列出模板。 | `get actor-template` |
| `DeleteActorTemplate` | 删除模板、它的黄金 actor 和它的黄金标签。 | `delete actor-template` |
| `CreateTag` | 为已挂起 actor 持久快照的一份副本命名。如果快照尚未上传，先上传。 | `create tag --actor` |
| `GetTag` | 返回一个标签。 | `get tag <name>` |
| `ListTags` | 列出标签。 | `get tag` |
| `UpdateTag` | 在 `atespace` 与 `published` 之间修改标签的作用域。 | `update tag --scope` |
| `DeleteTag` | 删除标签及其快照。仍从该标签启动的 actor 此后将无法恢复。它也接受模板的黄金标签，删掉之后对该模板执行 `create actor` 会失败并报 `Tag not found`。 | `delete tag` |
| `CreateAtespace` | 创建 atespace。 | `create atespace` |
| `GetAtespace` | 返回一个 atespace。 | `get atespace <name>` |
| `ListAtespaces` | 列出 atespace。 | `get atespace` |
| `DeleteAtespace` | 删除空的 atespace。只要还剩 actor 或标签就会失败。 | `delete atespace` |

## Control：workers {#s-ref-api-methods-control-workers}

这些方法大多由 `ate-controller` 和 `atelet` 调用。运维人员读取 worker，很少写入。

| 方法 | 作用 | `kubectl ate` |
|---|---|---|
| `ListWorkers` | 列出 worker 及其容量和已预留资源。 | `get worker`、`top worker` |
| `GetWorker` | 返回一个 worker。 | `get worker <name>` |
| `ListWorkerActorAssignments` | 列出一个 worker 上的 actor。 | - |
| `CreateWorker` | 在 worker 的 pod 有地址后注册它。worker 起初为不可用。 | - |
| `UpdateWorker` | 更新控制器观察到的池状态。 | - |
| `DeleteWorker` | 删除 worker 记录。 | - |
| `DrainWorker` | 把 worker 标记为终止中。调度器不再向它放置新 actor。单向不可逆。 | - |
| `MarkWorkerAvailable` | 把不可用的 worker 改为活跃。 | - |
| `MarkWorkerUnavailable` | 把活跃的 worker 改为不可用，例如在它的 pod 未就绪时。 | - |

## Control：访问策略 {#s-ref-api-methods-control-access-policies}

| 方法 | 作用 | `kubectl ate` |
|---|---|---|
| `GetGlobalAccessPolicy` | 返回整个安装唯一的那份策略。 | `get access-policy --global` |
| `CreateGlobalAccessPolicy` | 创建它。安装时指定的所有者始终可以执行此操作。 | `create access-policy --global -f` |
| `UpdateGlobalAccessPolicy` | 替换它。绑定为空时，除安装所有者的授权外，所有授权都会被移除。 | `update access-policy --global -f` |
| `GetAtespaceAccessPolicy` | 返回一个 atespace 的策略。 | `get access-policy -a` |
| `CreateAtespaceAccessPolicy` | 创建它。 | `create access-policy -a -f` |
| `UpdateAtespaceAccessPolicy` | 替换它。 | `update access-policy -a -f` |
| `DeleteAtespaceAccessPolicy` | 删除它。 | `delete access-policy -a` |

全局策略没有删除方法。

## WorkerService：仅供 atelet 使用 {#s-ref-api-methods-workerservice-for-atelet-only}

每个节点上的 `atelet` 调用这八个方法。你的客户端从不调用它们。它们能解释你看到的日志行和状态。

| 方法 | 作用 |
|---|---|
| `AcquireWorkerEpoch` | 在 worker 进程启动时，给它一个新的 epoch 编号。 |
| `RegisterWorker` | 记录该 worker 进程在这个 epoch 下运行。来自旧 epoch 的 actor 会变为崩溃。 |
| `SetWorkerSandboxRuntimes` | 报告 worker 能运行和恢复哪些沙箱类别及版本。 |
| `MintWorkerActorCertificate` | 为代表某个 actor 行事的 worker 签发证书。它的 SPIFFE 路径以 `worker-for-actor` 开头，所以它不是 actor 自身的身份。 |
| `MintWorkerActorJwt` | 为代表某个 actor 行事的 worker 签发令牌。它的 subject 是 `worker-for-actor/<atespace>/<name>`，代表的是 worker。 |
| `RequestActorSuspend` | 代表 worker 请求控制平面挂起一个 actor。`atelet` 转发来自 worker 侧库的调用，而 v1.0.0 中没有任何二进制导入该库。所以没有东西会触发它。 |
| `ReportActorSnapshotState` | 报告待处理快照已到达 bucket，或 actor 已离开该节点。 |
| `ReportActorCrashed` | 报告沙箱已死亡。actor 从运行变为崩溃。 |

## 插件服务 {#s-ref-api-methods-plugin-services}

Substrate 通过 gRPC 调用这些服务。仓库为每个服务带了一个实现，其他方也可以提供自己的实现。

| 服务 | 方法 | 调用方 | 用途 |
|---|---|---|---|
| `NodeProvider` | `FetchSnapshot`、`UploadSnapshot` | `atelet` | 在节点与 bucket 之间搬运快照文件 |
| `ControlProvider` | `CleanupSnapshot`、`CopySnapshot` | `ate-api-server` | 删除快照，并为标签复制快照 |
| `AssetProvider` | `FetchAsset` | `atelet` | 下载沙箱运行时文件 |
| `CredentialProvider` | `FetchSecret` | 出站网关 | 返回用来替换请求头的密钥，见[第 6.5 节](#s-credential-injection) |

## 所有方法共有的约定 {#s-ref-api-methods-conventions-that-every-method-shares}

- **名称：** 对象由 atespace 和名称共同定位。worker 和 atespace 只有名称。
- **前置条件：** 每个对象都有 `metadata.uid` 和 `metadata.version`。更新或带保护的删除如果指定了旧版本，会以 `ABORTED` 失败。
- **状态错误：** 从某个生命周期调用不接受的状态发起该调用，会以 `FAILED_PRECONDITION` 失败。我们记录到的情形是恢复一个崩溃的 actor。
- **列表：** list 方法接受 `page_size` 和 `page_token`。
- **期限：** 服务器会在 10 分钟后终止任何调用。
- **预览字段：** 预览功能背后的字段会被拒绝，除非服务器启用了它，且客户端发送请求头 `Ate-Preview-Allowed: true`。

来源：capture/lab/P-node-loss/86-tags.txt, capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/96-golden-tag-deleted.txt, api/ateapi/v1/ateapi.proto (services Control and WorkerService, and the request messages), api/objectstore/v1/objectstore.proto, api/credprovider/v1/credprovider.proto, cmd/ateapi/main.go (the port and the deadline), cmd/kubectl-ate/internal/cmd/ (the command for each method) and docs/dev/preview-gates.md at v1.0.0; capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/F-egress/envoy/20-results.txt, capture/lab/A-quickstart/60-state.log, capture/lab/K-kagent/session1/ (the methods that our runs called).
