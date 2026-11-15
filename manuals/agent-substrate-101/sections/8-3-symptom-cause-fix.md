# 症状、原因、修复

> 我们记录到的每个 Substrate 故障都有固定的错误文本，文本、状态码和耗时合起来能指向唯一的原因和修复办法。

一个 agent 失败了，你的客户端日志里记录着 503。Substrate 在池满、actor 崩溃、进程退出和 API server 不可用这四种情况下都返回 503。这四种情况需要四种不同的处置。状态码分不开它们，响应体和耗时可以。

读完本节，你能从日志里取出一条错误字符串，在这里找到对应的行并实施修复。表里的每条字符串都来自我们的实测运行，每行都标明了解释其机制的小节。[错误参考](#s-ref-errors)按字母顺序列出了同一批字符串。

## 从状态码和耗时入手 {#s-symptom-cause-fix-start-from-the-status-code-and-the-delay}

[图 8.3](#fig-8-3) 对发往 actor 的一次请求的各种失败做了分类。先看失败请求花了多久，再读响应体。不到 0.1 秒就失败，说明是控制逻辑直接拒绝了请求。刚好在 5 秒失败，说明是一次等待超时了。

```figure
id: fig-8-3
kind: decision
title: 从失败的请求到它的原因
claim: 失败请求的耗时和响应体能把共用状态码 500 和 503 的六种原因区分开。
caption: 自上而下阅读。每一行依次是客户端看到的失败现象、我们证实的原因，以及修复它的命令。来源：capture/lab/I-capacity/01-unplanned-full-pool-503.tsv、capture/lab/B-lifecycle/20-trace-ops.tsv、capture/lab/D-durability/30-local-loss.tsv、capture/lab/J-container-death/10-trace.tsv、capture/lab/E-dependency-loss/20-analysis.txt。
```

## 发往 actor 的请求失败 {#s-symptom-cause-fix-a-request-to-an-actor-fails}

除非某一行另有说明，本手册记录的错误响应体都来自 Envoy 数据平面。在 agentgateway 上，状态码相同，响应体不同，表后的小节会说明原因。

| 症状 | 状态码和耗时 | 我们证实的原因 | 修复 | 小节 |
|---|---|---|---|---|
| `actor lab-c/b0-5 unavailable: no worker has room for the actor` | 5.06 秒后返回 503 | 池里每个 worker 的 CPU 都被运行中的 actor 占满了。router 扣住请求，用满了 5 秒的暂存预算。 | 挂起空闲的 actor，或者增加 worker。重试：在等待进行到 2 秒时空出了一台 worker，请求随即得到处理。 | [4.4](#s-request-parking)、[4.5](#s-sizing-a-pool) |
| 同样的文本，出现在节点重启后不久 | 5.06 秒后返回 503 | 控制平面把重启前的每个 worker 都标成了不可用，而这些 worker 还没有重新注册。第二次运行里这个窗口是 10 到 30 秒。 | 先重试一分钟，再考虑增加 worker。 | [4.3](#s-placement)、[8.2](#s-when-a-dependency-is-down) |
| `actor xa/x2 unavailable: no worker has room for the actor`，actor 来自一个没有黄金标签的新模板 | 5.06 秒后返回 503 | 模板的 `workerSelector` 没有匹配到任何 `WorkerPool`。Substrate 接受了这个模板，而这段文本和池满时的文本相同。 | 把选择器和池的标签对照一下。用正确的标签新建模板，因为模板不能修改。 | [3.6](#s-atespaces) |
| 504 且响应体为空，5 到 8 秒后变成 `actor lab-n/u1 unavailable`，actor 处于 `ACTOR_STATE_RESUMING` | 10 秒后返回 504，随后是 503 | 已挂起 actor 所在的节点停了。actor 仍绑定在那个节点上，从第一个请求起在 `ACTOR_STATE_RESUMING` 停留了 5 分 33 秒，在停止命令发出 5 分 44 秒后转为崩溃。它没有迁移到其他节点。 | 故障期间不要发 `revert`：19 次尝试全部被拒绝，或者把 actor 留在 `ACTOR_STATE_REVERTING`。用停机前做好的标签新建 actor，耗时 1.2 秒。或者先把节点恢复，再回退。 | [8.2](#s-when-a-dependency-is-down)、[4.3](#s-placement) |
| 对已挂起 actor 的第一个请求返回 504 且响应体为空，actor 处于 `ACTOR_STATE_RESUMING`，节点正常 | 10.05 秒后返回 504 | 恢复花了超过 10 秒，因为快照很大，且 bucket 远或慢。Envoy 放弃等待 router，而恢复仍在继续。 | 停一会儿再重发请求，不要发 `revert`。在 32 次周期中，后续请求 32 次全部返回 200 且状态完好。 | [4.4](#s-request-parking)、[8.1](#s-postgres-and-the-object-store) |
| Postgres 故障后，对某个运行中 actor 的每个请求都返回 504 且响应体为空，其他 actor 正常应答 | 10.01 秒后返回 504 | 原因未查明。router 记录了该 actor 的 `ResumeActor`，但没有结果。在另一台机器上数据库的 2 次故障里，我们遇到了 1 次。 | 对 `atenet-router` Deployment 执行 `kubectl rollout restart`。下一个请求在 0.33 秒内返回 200 且状态完好。恢复命令和挂起都没有用。 | [8.2](#s-when-a-dependency-is-down) |
| `AssignWorker prerequisite not met for Actor: lab-c/r1 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)` | 0.07 秒内返回 503 | actor 已崩溃。Substrate 只恢复已挂起的 actor。 | 执行 `kubectl ate revert actor`，然后重发请求。 | [3.5](#s-crashed-and-revertactor) |
| `error resuming actor lab-c/x1` | 0.08 秒内返回 500 | 快照只在一个节点上，而节点上的副本丢了。这次请求使 actor 转入了崩溃状态。 | 执行 `kubectl ate revert actor`。自上一个持久快照以来的调用都丢失了。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives)、[3.5](#s-crashed-and-revertactor) |
| `error resuming actor lab-c/r1`，出现在节点重启后不久 | 0.41 秒内返回 500 | 请求到达时 worker 还没有重新注册。它使一个已挂起的 actor 转入了崩溃状态。 | 执行 `kubectl ate revert actor`。等 worker 处于 active 状态再放请求进来。 | [8.2](#s-when-a-dependency-is-down) |
| `error resuming actor lab-e/e-run`，之前有客户端超时 | 0.3 到 8.3 秒后返回 500 | Postgres 不可用。`ate-api-server` 读不到 actor。 | 恢复数据库。对运行中 actor 的请求在几秒内恢复，挂起恢复操作需等半分钟。 | [8.2](#s-when-a-dependency-is-down) |
| `error resuming actor sc-lab/t-128`，突发流量中出现，发生在 `ate-api-server` 扩到四个副本之后 | 0.66 到 1.35 秒后返回 500 | 内置 Postgres 用完了它的 100 个连接。API server 日志里有 `FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute (SQLSTATE 53300)` 或 `FATAL: sorry, too many clients already`。有些 actor 崩溃了。 | 把 `ate-api-server` 缩回两个副本，并回退已崩溃的 actor。调高连接上限留待下一版去测。 | [4.5](#s-sizing-a-pool) |
| `actor lab-e/e-run unavailable`，后面没有别的文字 | 3 到 5 秒后返回 503 | router 没有得到 `ate-api-server` 的应答。`ate-api-server` 不可用时我们见过这段文本，Postgres 不可用时也见过，运行中和已挂起的 actor 都一样。 | 两处都查：`ate-api-server` 的 pod 是否就绪，Postgres 是否在运行。这段文本分不开这两种情况。 | [8.2](#s-when-a-dependency-is-down) |
| `upstream connect error or disconnect/reset before headers. reset reason: connection termination` | 约 0.06 秒内返回 503 | 沙箱里的进程退出了。actor 仍显示 `ACTOR_STATE_RUNNING`。 | 用 `--mode sync` 挂起，它会失败并把 actor 标成崩溃。然后回退。 | [3.5](#s-crashed-and-revertactor) |
| 同样的文本，出现在一个进行中的请求上，之后 actor 是 `ACTOR_STATE_SUSPENDED` | 挂起发生的瞬间，2.2 秒后返回 503 | 请求进行期间有外部操作挂起了 actor。挂起不会等待进行中的请求，挂起调用还会报告成功。 | 重发请求，它会恢复 actor。只挂起空闲的 actor。 | [3.3](#s-suspendactor-and-resumeactor) |
| 同样的文本，且 actor 所在 worker 是 `WORKER_STATE_UNAVAILABLE` | 0.50 到 5.07 秒后返回 503 | 运行中 actor 所在的节点停了。耗时把这一行和进程退出区分开。在我们 10 分钟的探测期间，actor 一直显示为 `ACTOR_STATE_RUNNING`。 | 不要发 `revert`，也不要发 `delete`。`revert` 失败并报 `while calling atelet Terminate`，把 actor 留在 `ACTOR_STATE_REVERTING`。用更早的标签新建 actor，或者先恢复节点再回退。 | [8.2](#s-when-a-dependency-is-down)、[3.5](#s-crashed-and-revertactor) |
| `AssignWorker prerequisite not met for Actor: lab-n/q2 (got: ACTOR_STATE_REVERTING, want ACTOR_STATE_SUSPENDED)` | 0.06 秒内返回 503 | actor 所在节点宕机时发起了回退，回退没有完成。 | 恢复节点，等它的 `atelet` 就绪，再重发回退。有一次运行里这样做 0.2 秒就成功了。故障期间再发的回退全部失败，五次运行里每次有 3 到 28 个。 | [3.5](#s-crashed-and-revertactor)、[8.2](#s-when-a-dependency-is-down) |
| 同样的文本，但带 `got: ACTOR_STATE_DELETING` | 0.07 秒内返回 503 | actor 所在节点宕机时执行了 `delete`，删除没有完成。同名的新 actor 会得到 `AlreadyExists`。 | 恢复节点。在此之前这个名字一直被占着。 | [8.2](#s-when-a-dependency-is-down) |
| agentgateway 上的 `ingress failed`，状态码是 500、504 或 503 | 0.04 到 5.0 秒 | Postgres 或 `ate-api-server` 不可用。在 agentgateway 上，两种情况以及未知 actor 的响应体都一样。 | 查 `ate-api-server` 的 pod 是否就绪，Postgres 是否在运行。Postgres 就绪 21 秒后，运行中的 actor 又能应答了。 | [8.2](#s-when-a-dependency-is-down) |
| Envoy 上是 `actor ate-demo-counter/does-not-exist not found`，agentgateway 上是 `ingress failed` | 0.02 秒内返回 404 | 该 atespace 里没有叫这个名字的 actor。 | 检查 `ate-target-actor` 头。 | [6.1](#s-the-router-and-ingress) |

### 在 agentgateway 上，读状态码和响应头 {#s-symptom-cause-fix-on-agentgateway-read-the-status-code-and-the-header}

在 agentgateway 数据平面上，响应体不会点明原因。Substrate 的每个入站失败都返回响应体 `ingress failed`，只有一个例外 {{agentgateway}}。池满时返回 `no worker has room for the actor`，前面没有 `actor ... unavailable:` 这段文字。

| 你在 agentgateway 上能看到什么 | 去哪里读 | 它告诉你什么 |
|---|---|---|
| 状态码 | 响应 | 状态码与上表相同：404、503、504、500、401 和 403。 |
| 响应头 `ate-error-reason` | 响应 | 网关有原因码时给出原因码。v1.7.0 的代码在暂存区满时设置 `LOT_FULL`，在 `ate-api-server` 没有应答时设置 `API_UNAVAILABLE`。 |
| 日志行 `substrate ResumeActor failed` | `atenet-router` 的日志 | `ate-api-server` 的 gRPC 码和完整消息，例如 `Actor ate-demo-counter/does-not-exist not found`。 |
| actor 状态 | `kubectl ate get actors` | 和 Envoy 上一样，它能把崩溃的 actor 和池满区分开。 |

响应头的规则来自代码。我们在 agentgateway 上的记录保留了状态码和响应体，没有保留响应头。日志行来自我们的运行：对于返回 `ingress failed` 的 404，网关在日志里记录了完整报错消息。所以在 agentgateway 上，按状态码和响应头匹配，不要按响应体匹配。

有三行共用文本 `error resuming actor`。用 actor 状态把它们分开。节点副本丢失，或者重启后请求来得太早，actor 会是 `ACTOR_STATE_CRASHED`。数据库故障后，运行中的 actor 仍是 `ACTOR_STATE_RUNNING`，下一个请求会成功。

进程退出是最久才暴露的情况。状态一直是 RUNNING，所以 actor 列表里看不出任何问题。

```listing
title: 进程已退出的 actor
source: capture/lab/J-container-death/10-trace.tsv
lang: text
note: 连续三行。actor j1 收到一个请求，让它的进程以退出码 3 退出。
---
2026-11-12T11:30:45.229Z	j1	exit-request	200	0.065314	exiting with code 3
2026-11-12T11:30:47.441Z	j1	state	ACTOR_STATE_RUNNING	kind-control-plane	SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:kind-control-plane
2026-11-12T11:30:47.518Z	j1	call	503	0.058459	upstream connect error or disconnect/reset before headers. reset reason: connection termination
```

**我们测得**这个现象的数据来自 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），共三个 actor。第一个在 14 秒内的 6 次采样里全部是 RUNNING，每个请求都返回这个 503。另外两个在 20 分 36 秒内一直读作 RUNNING（分别采样 81 次和 80 次），发出的 20 个请求全部返回这个 503。每种情况下，随后的挂起都失败了，报错为 `workflow failed at step CallAteletSuspend: actor lab-c/j1 crashed`（另一个 actor 报错文本相同），直到这时状态才发生改变。每个已死亡的 actor 在这次挂起之前一直占着它所在 worker 的一个 CPU。

被内核因内存不足杀掉的进程则不同。那个 actor 在进程被杀 4 秒后的第二次采样中就读作 `ACTOR_STATE_CRASHED`。

**我们的判断：** 别等 Substrate 来报告进程已死。让你的 harness 在看到这个 503 响应体时检查两件事：actor 显示 `ACTOR_STATE_RUNNING`，并且它的 worker 是 active 的。然后由 harness 自己执行挂起和回退。如果 worker 是 `WORKER_STATE_UNAVAILABLE`，说明节点宕机了，这时回退只会让情况更糟。

## 安装失败 {#s-symptom-cause-fix-the-install-fails}

| 症状 | 我们证实的原因 | 修复 | 小节 |
|---|---|---|---|
| `unknown flag: --platform`，接着是 `Error: while building the envoy-dataplane image: exit status 125` | 从源码安装会用 `docker buildx` 构建 Envoy 镜像。Ubuntu 24.04 自带的 Docker 软件包没有 buildx 插件。 | 用发布的镜像安装。要从源码构建，先安装 `docker-buildx`。 | [2.1](#s-install-with-ate-setup) |
| `kubectl ate get workers -A` 报 `Error: unknown flag "-A"` | worker 不按 atespace 划分范围。这条命令默认列出所有 namespace 的 worker。它的过滤参数有 `-n`、`-l`、`-a`（列出承载指定 atespace 中 actor 的 worker）和 `--sandbox-class`。 | 运行 `kubectl ate get workers`，不带任何参数。 | [2.2](#s-kubectl-ate) |

```listing
title: 没有 buildx 的源码安装
source: capture/lab/A-quickstart/20-deploy-ate-system.FAILED-no-buildx.log
lang: text
note: 日志末尾的两行。两行之间的 Docker 用法文本已省略。
---
unknown flag: --platform
…
Error: while building the envoy-dataplane image: exit status 125
```

这一步在 163 秒后才失败，所以错误来得很晚。文档里列出的工具是 Go、kubectl 和 Docker，没有提到 buildx。

## actor 访问不到某个主机 {#s-symptom-cause-fix-the-actor-cannot-reach-a-host}

| 症状 | 数据平面 | 我们证实的原因 | 修复 | 小节 |
|---|---|---|---|---|
| 每个名字都是 `status: NXDOMAIN` | 两者 | 出站策略里没有规则点名这个主机。DNS 中继只对允许的名字应答。 | 添加一条带完整主机名的规则。 | [6.3](#s-the-dns-relay) |
| HTTP 403，`egress denied` | Envoy | 请求发往了没有任何规则允许的地址。 | 把主机加进策略，并用名字去调用它。 | [6.2](#s-egresspolicy-and-default-deny) |
| HTTP 403，`actor egress policy denied` | agentgateway | 原因相同。两个数据平面用的文本不同。 | 修复办法相同。 | [6.2](#s-egresspolicy-and-default-deny) |
| 连接被重置，没有 HTTP 响应 | Envoy | actor 根本没有出站策略。 | 为这个 actor 创建一个策略。 | [6.2](#s-egresspolicy-and-default-deny) |
| `egress_policy.rules[2].tls_passthrough.ports: Required value` | CLI | TLS 透传规则没有默认端口。 | 给这条规则加上 `ports`。 | [6.2](#s-egresspolicy-and-default-deny) |
| `lacks the metadata.uid and metadata.version preconditions` | CLI | 更新必须写明它要替换的版本。 | 从 `get egress-policy -o yaml` 里复制这两个字段。 | [6.2](#s-egresspolicy-and-default-deny) |
| 对 `https` 规则下的主机返回 HTTP 503，`upstream connection failed` | agentgateway | 该主机的证书来自私有 CA。网关记录了 `invalid peer certificate: UnknownIssuer`。 | 将包含你自有 CA 的根证书文件覆盖挂载到代理容器的根证书文件上。每次运行安装器后都要重新应用。 | [6.4](#s-tls-interception) |
| HTTP 503，`upstream connect error or disconnect/reset before headers. reset reason: remote connection failure` | Envoy | 原因相同。Envoy 日志里有 `CERTIFICATE_VERIFY_FAILED`。 | 修复办法相同。 | [6.4](#s-tls-interception) |
| 刚才还能用的连接上返回 HTTP 403 | 两者 | 一条规则被移除了。复用连接上的下一个请求被拒绝，agentgateway 上约 1 秒后，Envoy 上 5 到 9 秒后。 | 把规则加回来，或者接受这个拒绝。 | [6.6](#s-the-dataplane-choice) |
| 改了 Kubernetes Secret 之后，上游仍收到旧的密钥 | agentgateway | 网关把取到的凭据保留 300 秒。三次修改里，新值分别在 100.6 到 280.5 秒后生效。 | 等 5 分钟，并在这段时间里让旧值在上游继续有效。 | [6.5](#s-credential-injection) |
| 一次模型调用比从 pod 发出的同一调用多花 0.6 秒 | 两者 | 客户端在 `https` 规则下打开了新的 HTTPS 连接。与拦截端点的握手约花 0.6 秒。 | 复用连接。同一个请求在已打开的连接上只用 10 到 12 毫秒。 | [6.4](#s-tls-interception)、[7.2](#s-agentgateway) |

被拦截的主机看上去像 DNS 故障，这会把人引到错误的团队。在 kagent 的运行里，短 Service 名 `mock-llm.kagent:8080` 返回 403，而同一个 Service 的完整名字返回 200。策略匹配的是 actor 实际请求的主机名，因此调用时必须与规则中写明的名称完全一致。

## 客户端连不上，或命令被拒绝 {#s-symptom-cause-fix-a-client-cannot-connect-or-a-command-is-refused}

| 症状 | 我们证实的原因 | 修复 | 小节 |
|---|---|---|---|
| `tlsv13 alert certificate required` | 客户端没有向 agentgateway router 出示证书。 | 给客户端一张由集群签发机构签发的证书。 | [5.1](#s-client-authentication) |
| Envoy 上是 `certificate unknown`，agentgateway 上是连接重置 | 客户端身份不在入站允许列表里。 | 用 `--ingress-allowed-spiffe-ids` 添加 SPIFFE ID。 | [5.1](#s-client-authentication) |
| `Error: failed to connect to ate-api-server: no ready api pods in ate-system` | 没有 API pod 处于就绪状态。有一次运行是 Postgres 不可用。另一次是节点重启了，CLI 在重启后 18 到 157 秒内打印了这段文本。 | 先查 Postgres，再查 API server。节点重启后，等 API pod 就绪。 | [8.2](#s-when-a-dependency-is-down) |
| `Unauthenticated desc = invalid bearer token` | `--token-file` 指向的文件里放的不是 token，或者是一个没有 audience `api.ate-system.svc` 的 Kubernetes token。 | 用 `--audience api.ate-system.svc` 创建 token。 | [5.1](#s-client-authentication) |
| `PermissionDenied desc = permission denied: principal "user:system%3Aserviceaccount%3Aate-users%3Aalice" lacks "can_list_actors" on "atespace:lab-v"` | token 有效，但没有任何访问策略给这个主体一个允许该调用的角色。 | 把该主体加进这个 atespace 的访问策略。范围为 `global:root` 时需要全局角色。 | [5.2](#s-access-policies) |
| `FailedPrecondition desc = actor must be ACTOR_STATE_SUSPENDED to change its actor template (got: ACTOR_STATE_RUNNING)` | `kubectl ate update actor --template` 作用在了运行中的 actor 上。 | 先挂起 actor，再更新。 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| `InvalidArgument desc = actor_template.golden_egress_policy: Forbidden` | 模板用了预览功能，而服务端参数或客户端参数缺了一个。错误信息没有点出是哪个功能。 | 在服务端用 `--preview` 加上功能名，并给 `kubectl ate` 也传 `--preview`。 | [8.5](#s-limits-at-v1-0-0) |
| `create actor --template` 报 `FailedPrecondition desc = Tag not found` | 模板的黄金标签被 `kubectl ate delete tag` 删掉了。`get actor-templates` 仍然列出这个标签 id，`ERROR` 列为空。 | 新建一个模板。不要删除模板所列的、范围为 `TAG_SCOPE_PUBLISHED` 的标签。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| `failed to create tag: ... must be ACTOR_STATE_SUSPENDED to be tagged (got: ACTOR_STATE_RESUMING)` | actor 绑定在一个已停止的节点上。事后无法再做标签。 | 在 actor 已挂起且节点正常时做标签。 | [8.2](#s-when-a-dependency-is-down) |
| `failed to revert actor: ... while calling atelet Terminate` | actor 所在的节点宕机了。回退需要那个节点上的 `atelet`，而 actor 现在是 `ACTOR_STATE_REVERTING`。 | 不要再发回退。恢复节点，然后回退一次。 | [3.5](#s-crashed-and-revertactor)、[8.2](#s-when-a-dependency-is-down) |
| `failed to suspend actor: ... MarkSuspending prerequisite not met ... (got: ACTOR_STATE_RESUMING, want ACTOR_STATE_RUNNING)`，或者 `failed to resume actor: ... worker ... assigned to actor ... is unavailable` | actor 绑定在一个已停止节点上的 worker。 | 故障期间没有哪条命令有用。用标签，或者等节点恢复。 | [8.2](#s-when-a-dependency-is-down) |
| `SSL: no alternative certificate subject name matches target hostname 'atenet-router.ate-system.svc.cluster.local'` | 客户端用长名字调用了 router。router 证书只对短名字有效。 | 调用 `atenet-router.ate-system.svc`。 | [6.1](#s-the-router-and-ingress) |
| `Unable to connect to the server: EOF` | Kubernetes API server 不可用。actor 仍在处理请求。 | 等待，并从集群内部探测 actor。 | [8.2](#s-when-a-dependency-is-down) |
| kagent CLI 报 `bind: address already in use` | 每次 CLI 调用都会在 8083 端口开一个自己的 port-forward。同时启动的调用会冲突。 | 保持一个常驻 port-forward，让 CLI 指向它。 | [7.1](#s-kagent-on-substrate) |

```listing
title: 几个调用同时启动时的 kagent CLI
source: capture/lab/K-kagent/latency/D-par-5.err
lang: text
note: 错误的第一行只保留了结尾部分。同时启动的八个调用里，有五个出现了同样的错误。
---
… Error listen tcp4 127.0.0.1:8083: bind: address already in use unable to create listener: Error listen tcp6 [::1]:8083: bind: address already in use]
error: unable to listen on any of the requested ports: [{8083 8083}]): exit status 1
```

**我们测得**kagent CLI 在 kagent 运行里的表现，环境是 x86 服务器客户机（16 vCPU、31 GB）。用一个常驻 port-forward 时，没有调用失败。创建会话（Session）的中位耗时是 0.17 秒（n=32），而每次调用各开一个 port-forward 时是 0.39 秒（n=20）。

## 没有匹配的行时 {#s-symptom-cause-fix-when-no-row-matches}

求助或提 issue 之前，先收集四样东西。收集失败请求的状态码、耗时秒数和响应体。用 `kubectl ate get actor -o yaml` 获取 actor 详情，其中包含状态和各个快照。用 `kubectl ate logs actor --source lifecycle` 收集生命周期日志。用 `kubectl ate get worker` 获取 worker 列表，它会显示每个池的可用空间。

```takeaways
- 记下每个失败请求的耗时和响应体，因为同一个状态码对应多种原因。
- 响应体里出现 `ACTOR_STATE_CRASHED` 时，运行 `kubectl ate revert actor`。
- 把 `upstream connect error` 响应体当作进程已死，先挂起再回退 actor。
- 先查 worker 状态，节点已停止时不要发挂起或回退。
- 遇到 `no worker has room` 响应先重试，再考虑增加 worker。
- actor 内出现 NXDOMAIN 时，先当作缺少出站规则，再怀疑 DNS。
- 在有多个集群的机器上，给 `kubectl ate` 传 `--context`。
```

来源： capture/lab/summary/node-loss-x86.json, capture/lab/summary/bursts-one-node-x86.json, capture/lab/Z-bursts/10-run/40-errors/10-ate-api-server-59dcf8d6bf-srn4n.log, capture/lab/Z-bursts/10-run/37-router-errors.log, capture/lab/summary/network-x86.json, capture/lab/summary/rotation-x86.json, capture/lab/summary/dependency-loss-agw-x86.json, capture/lab/P-node-loss/40-balt-suspend-resume-delete.tsv, capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/P-node-loss/96-golden-tag-deleted.txt, capture/lab/Q-network/g-dependency-loss-agw/12-probe-incluster.tsv, capture/lab/Q-network/i-model-gateway/20-results-agentgateway.txt, capture/lab/Q-network/i-model-gateway/20-results-envoy.txt, capture/lab/Q-network/m-router-ports/agentgateway/10-port-probes.tsv, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/75-stop-after-upload-revert.tsv, capture/lab/L-gaps/multinode/80-stop-before-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/restart/10-poll.tsv, capture/lab/I-capacity/01-unplanned-full-pool-503.tsv, capture/lab/I-capacity/13-parking-trace.tsv, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/D-durability/30-local-loss.tsv, capture/lab/D-durability/40-node-reboot.tsv, capture/lab/D-durability/44-r1-after-reboot.yaml, capture/lab/J-container-death/10-trace.tsv, capture/lab/E-dependency-loss/20-analysis.txt, capture/lab/E-dependency-loss/14-T1-cli-during.txt, capture/lab/E-dependency-loss/16-T3-kubectl-during.txt, capture/lab/A-quickstart/20-deploy-ate-system.FAILED-no-buildx.log, capture/lab/A-quickstart/02-steps.tsv, capture/lab/A-quickstart/60-state.log, capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/envoy/19-first-run-update-refused.txt, capture/lab/F-egress/envoy/19b-second-run-passthrough-ports-required.txt, capture/lab/G-dataplane/envoy/ingress-auth/, capture/lab/G-dataplane/agentgateway/ingress-auth/, capture/lab/K-kagent/latency/D-par-5.err, capture/lab/K-kagent/latency/timings.tsv, capture/lab/K-kagent/probes/egress-errors-sample.txt, capture/lab/summary/failures-x86.json, capture/lab/summary/parking-x86.json, capture/lab/V-validation/06-template-move/10-move.tsv, capture/lab/V-validation/07-cross-namespace-pool/10-cross.tsv, capture/lab/V-validation/08-access-control/10-access.tsv, capture/lab/V-validation/10-preview-feature/10-preview.tsv, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv, capture/lab/N-demos/failure-drill/drill-run.log; cmd/kubectl-ate/internal/cmd/worker.go, cmd/kubectl-ate/internal/cmd/actor.go, cmd/atenet/internal/router/ingress/errors.go and cmd/ateapi/internal/controlapi/workflow_revert.go at v1.0.0; agentgateway v1.7.0 crates/agentgateway/src/proxy/mod.rs and crates/agentgateway/src/http/substrate/ingress.rs (the `ingress failed` body and the `ate-error-reason` header); capture/lab/G-dataplane/agentgateway/ingress-auth/51-rightid-results.txt, capture/lab/G-dataplane/agentgateway/ingress-auth/52-router-log-agentgateway.log., capture/lab/summary/remote-store-x86.json, capture/lab/summary/remote-postgres-x86.json, capture/lab/X-remote-store-pg/50-pg-tests/37-follow-up.txt, capture/lab/X-remote-store-pg/50-pg-tests/42-x-run-router-restart.txt
