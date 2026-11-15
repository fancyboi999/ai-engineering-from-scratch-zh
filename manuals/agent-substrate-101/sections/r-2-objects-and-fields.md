# 对象与字段

> 只有三种对象是描述 worker 容量的 Kubernetes 对象，其余所有 Substrate 对象都是只能通过 Substrate API 返回的记录。

这里的字段名与 `kubectl ate -o yaml` 的输出一致，使用驼峰写法。proto 文件里的同名字段使用蛇形写法。标为预览的字段会被拒绝，除非开启了对应的预览功能，见[标志与开关参考](#s-ref-flags-and-gates)。

## Kubernetes 类型，group 为 ate.dev/v1 {#s-ref-objects-and-fields-kubernetes-kinds-group-ate-dev-v1}

这三种对象用 `kubectl apply` 管理。

### WorkerPool（namespace 级） {#s-ref-objects-and-fields-workerpool-namespaced}

| 字段 | 含义 |
|---|---|
| `spec.replicas` | worker pod 的数量。除非有外部操作修改它，否则保持不变。 |
| `spec.workerImage` | worker 镜像，决定 pod 启动哪种沙箱运行时 |
| `spec.sandboxClasses[].name` | `gvisor` 或 `microvm` |
| `spec.sandboxClasses[].configRef.name` | 该类别的 SandboxConfig。省略时使用该类别的默认配置。 |
| `metadata.labels` | WorkerPool 对象的标签。模板用它们选择池，池中每个 worker 都会上报它们。 |
| `spec.template.labels` | 添加到 worker Deployment 及其 pod 的标签。Substrate 的任何选择器都不读取它们。 |
| `spec.template.resources` | worker 容器的 requests 和 limits。limits 会成为 worker 上报的容量。 |
| `spec.template.nodeSelector`, `tolerations`, `nodeAffinity`, `priorityClassName`, `annotations`, `serviceAccountName` | 传给 worker pod |
| `status.replicas`, `status.readyReplicas` | 观察到的 pod |
| `status.sandboxClasses[].conditions` | 每个类别一个 `Resolved` 条件，带有 `SandboxConfigNotFound` 之类的原因 |

```listing
title: 恢复实验的 WorkerPool
source: capture/lab/C-resume-vs-size/pool.yaml
lang: yaml
note: WorkerPool 文档。它前面的 Namespace 文档已截去。
---
apiVersion: ate.dev/v1
kind: WorkerPool
metadata:
  name: ballast
  namespace: lab-c
  labels:
    workload: ballast
spec:
  replicas: 2
  workerImage: localhost:5001/ateworker-gvisor@sha256:ad6957f41bccaa8bb5f3eb5b34b7812babb862f1a3187a11578c21a7d799491c
  sandboxClasses:
  - name: gvisor
  template:
    resources:
      limits:
        cpu: "2"
        memory: 3Gi
      requests:
        cpu: 500m
        memory: 3Gi
```

没有 limits 的 worker 容器会把整个节点当作自己的容量上报。[第 4.1 节](#s-workerpool)展示了这种情形。

### SandboxConfig（集群级） {#s-ref-objects-and-fields-sandboxconfig-cluster}

| 字段 | 含义 |
|---|---|
| `spec.sandboxClass` | `gvisor` 或 `microvm` |
| `spec.defaultVersion` | 新 actor 启动时使用的版本 |
| `spec.versions[].name` | 版本名称 |
| `spec.versions[].state` | `Enabled` 或 `Disabled` |
| `spec.versions[].assets` | 每种架构对应的运行时文件，含 `url` 和 `sha256` |

注解 `sandboxconfig.ate.dev/is-class-default` 标记一个类别的默认配置。

### CSIDriverConfig（集群级，供预览功能使用） {#s-ref-objects-and-fields-csidriverconfig-cluster-used-by-a-preview-feature}

| 字段 | 含义 |
|---|---|
| `spec.driverName` | CSI 驱动 |
| `spec.controllerEndpoint` | CSI 控制器的地址 |
| `spec.nodeSocketOverride` | 节点 socket 的替代路径 |
| `spec.tls.enabled`, `spec.tls.usePodIdentity`, `spec.tls.serverName` | 控制器连接使用的 TLS |

## 每个 API 对象的 metadata {#s-ref-objects-and-fields-metadata-of-every-api-object}

| 字段 | 含义 |
|---|---|
| `metadata.atespace` | 所属 atespace。worker、atespace 和访问策略此项为空。访问策略的请求在单独的字段里指明它的 atespace。 |
| `metadata.name` | 名称，在所属 atespace 内唯一 |
| `metadata.uid` | 由服务器分配。用旧名称创建的新对象会得到新的 uid。 |
| `metadata.version` | 每次写入都会增长。更新必须指明当前值。 |
| `metadata.createTime`, `updateTime`, `deleteTime` | 时间戳 |

## Actor {#s-ref-objects-and-fields-actor}

| 字段 | 含义 |
|---|---|
| `actorTemplate.atespace`, `actorTemplate.name` | actor 所用的模板 |
| `sourceTag` | actor 启动所用的标签（如果有） |
| `workerSelector.matchLabels` | 收窄模板的选择器。池必须同时匹配两个选择器（逻辑与）。修改在下一次恢复时生效。 |
| `status.state` | 七种状态之一，见[状态参考](#s-ref-states)的列表 |
| `status.workerAssignment` | worker 持有 actor 期间存在：`workerPod`, `workerPool`, `workerNamespace`, `workerPodIps`, `nodeName`, `workerEpoch`, `sandboxRuntime` |
| `status.assignedNode` | actor 运行时是 worker 所在的节点，挂起后是本地快照所在的节点。它会保留到分离（默认 30 分钟，`--snapshot-detach-delay`）或回退为止。 |
| `status.snapshots[]` | actor 的快照，详见下文 |
| `status.lastAssignedGeneration` | 最近一次挂起所分配的 generation。回退不会降低它，所以它可能高于最新保留快照的 generation。 |
| `status.crash.message`, `status.crash.crashTime` | actor 进入 `ACTOR_STATE_CRASHED` 时设置，回退时清除 |
| `status.externalVolumes` | 预览：actor 的 CSI 卷 |

### status.snapshots 的一个条目 {#s-ref-objects-and-fields-one-entry-of-status-snapshots}

| 字段 | 含义 |
|---|---|
| `uuid` | 快照地址的最后一段 |
| `generation` | 计数器。每次挂起加一。 |
| `owner` | `SNAPSHOT_OWNER_ACTOR`，或者对 actor 借用的黄金快照或带标签快照取 `SNAPSHOT_OWNER_TAG` |
| `fidelity` | `SNAPSHOT_FIDELITY_VOLUMES`、`SNAPSHOT_FIDELITY_ROOTFS` 或 `SNAPSHOT_FIDELITY_MEMORY` |
| `locality` | 持有本地副本的节点。节点上的副本被移除后此项不存在。 |
| `durableSnapshot.state` | 上传完成前是 `SNAPSHOT_STORAGE_STATE_PENDING`，之后是 `SNAPSHOT_STORAGE_STATE_COMPLETED` |
| `durableSnapshot.object.snapshotUri` | 在 bucket 中的地址 |
| `sandboxRuntime` | 类别和版本属性：`architecture`, `cpu_features`, `sandbox_bundle_hash` |
| `actorTemplateUid` | 生成该快照时所用的模板 |

异步挂起后，actor 会有两个条目：较旧的已完成条目和新的待处理条目。[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)跟踪了这一过程。

## ActorTemplate {#s-ref-objects-and-fields-actortemplate}

| 字段 | 含义 |
|---|---|
| `workerSelector.matchLabels` | 按 WorkerPool 对象的 `metadata.labels` 选择 worker 池，不限 namespace |
| `containers[]` | `name`, `image`, `command`, `args`, `env`, `volumeMounts`, `securityContext.capabilities`, `resources` |
| `containers[].wakeupProbe` | `httpGet.path`, `httpGet.port`, `timeoutSeconds`。恢复会等待一次成功。 |
| `volumes[]` | 一个 `name` 和一个来源：`durableDir`、`image.reference`、`systemInfo` 或 `external`（预览） |
| `volumes[].systemInfo` | 一个来源：`actorMetadata.items[]` 或 `trustBundle`。每个条目有 `path` 和 `field`： `ACTOR_METADATA_FIELD_NAME`、`ACTOR_METADATA_FIELD_ATESPACE` 或 `ACTOR_METADATA_FIELD_UID`。 |
| `resources.limits.cpuMillicores`, `resources.limits.memoryBytes` | 必填。actor 运行期间，worker 会预留这两项。 |
| `snapshotConfig.preferredFidelity` | 挂起可达到的最高保真度。快照实际可能更低，所以要读快照自身的保真度。 |
| `snapshotConfig.goldenSnapshotConfig.mode` | `GOLDEN_SNAPSHOT_MODE_ENABLED` 或 `GOLDEN_SNAPSHOT_MODE_DISABLED` |
| `snapshotConfig.storageLocation` | 预览：该模板的快照存放位置 |
| `goldenEgressPolicy.rules` | 预览：只针对黄金 actor 的出站规则 |
| `status.goldenSnapshotStatus` | `goldenTag`, `snapshotTime`, `errorMessage` |

```listing
title: 50 MiB 压舱 actor 的模板
source: capture/lab/C-resume-vs-size/tmpl-50.yaml
lang: yaml
note: 完整文件。
---
metadata:
  atespace: lab-c
  name: ballast-50
workerSelector:
  matchLabels:
    workload: ballast
containers:
- name: ballast
  image: localhost:5001/ballast@sha256:93dba82ad560e7fc4ccb2a33a63d64713b519a7895ba3fd98130ce789eab7fd3
  command:
  - /ballast
  - --mb=50
  wakeupProbe:
    httpGet:
      path: /readyz
      port: 80
resources:
  limits:
    cpuMillicores: 1000
    memoryBytes: 320864256
snapshotConfig:
  preferredFidelity: SNAPSHOT_FIDELITY_MEMORY
```

## EgressPolicy {#s-ref-objects-and-fields-egresspolicy}

一份策略属于一个 actor。它包含 `metadata` 和 `rules[]`。每条规则恰好取三种形式之一。

| 规则形式 | 字段 | 含义 |
|---|---|---|
| `http` | `hostnames`, `ports`, `effects` | 发往指定主机的明文 HTTP。端口默认为 80。 |
| `https` | `hostnames`, `ports`, `effects` | 网关拦截的 TLS，因此网关可以读取并修改请求 |
| `tlsPassthrough` | `hostnames`, `ports` | 网关不读取、直接转发的 TLS。`ports` 必填。 |

`ports` 要么是 `all`，要么是 `numbers` 中的一个列表。`effects.replaceHeaders[]` 含有 `header`、`prefix` 和一个来源：存储的密钥用 `credentialUri`，或者用带 `audiences` 和 `expirationSeconds` 的 `actorJwt`。[第 6.5 节](#s-credential-injection)展示了这两种来源。

## Tag、Atespace、Worker、AccessPolicy {#s-ref-objects-and-fields-tag-atespace-worker-accesspolicy}

| 对象 | 字段 | 含义 |
|---|---|---|
| Tag | `sourceActor`, `scope`, `status.snapshot` | 快照的一份命名副本。`scope` 是 `TAG_SCOPE_ATESPACE` 或 `TAG_SCOPE_PUBLISHED`。 |
| Atespace | `metadata.name` | 用于将 actor、模板、标签和一份访问策略归为一组的名称 |
| Worker | `workerNamespace`, `workerPool`, `workerPod`, `workerPodUid`, `nodeName`, `labels` | 一个已注册的 worker pod。它的名称是不透明的，所以要从 `workerPod` 和 `workerPodUid` 读取 pod。`labels` 是其 WorkerPool 的 `metadata.labels` 的副本。 |
| Worker | `status.ips` | worker pod 的 IP 地址，每个 IP 族最多一个 |
| Worker | `status.issuedEpoch`, `status.registeredEpoch`, `status.observedEpoch` | worker 进程的 epoch 计数器。`registeredEpoch` 上升表示更早的进程已退出，服务器随后会让它的 actor 崩溃。 |
| Worker | `status.state` | `WORKER_STATE_ACTIVE`、`WORKER_STATE_DRAINING` 或 `WORKER_STATE_UNAVAILABLE` |
| Worker | `status.capacity`, `status.allocated` | `cpuMillicores`、`memoryBytes` 和 `actors`，与 `kubectl ate get worker` 的输出一致 |
| Worker | `status.sandboxClasses[]` | worker 能运行和恢复的类别与运行时版本 |
| AccessPolicy | `bindings[].role`, `bindings[].members` | 把角色授予身份，作用于一个 atespace 或整个安装 |

来源：api/infra/k8s/ate/v1/workerpool_types.go, sandboxconfig_types.go and csidriverconfig_types.go, api/ateapi/v1/ateapi.proto (messages ResourceMetadata, Actor, ActorStatus, Snapshot, WorkerAssignment, ActorTemplate, Container, Volume, SnapshotConfig, EgressPolicy, EgressRule, CredentialHeader, Tag, Atespace, Worker, WorkerStatus, AccessPolicy, Binding) at v1.0.0; capture/lab/C-resume-vs-size/pool.yaml, capture/lab/C-resume-vs-size/tmpl-50.yaml, capture/lab/B-lifecycle/22-actor-after-async-suspend.yaml, capture/lab/B-lifecycle/23-actor-after-sync-suspend.yaml, capture/lab/B-lifecycle/25-actor-crashed.yaml, capture/lab/D-durability/46-after-reboot-followup.txt, capture/lab/F-egress/envoy/19b-second-run-passthrough-ports-required.txt.
