# 错误

> 我们的运行记录到的每条错误文本按字母顺序列出，并注明它出现在哪里、含义是什么，以及哪一节做了解释。

在本页搜索你日志里文本的一个片段。像 `lab-c/r1` 这样的名称来自我们那次运行里的 atespace 和 actor，你的日志里会是你自己的名称。[第 8.3 节](#s-symptom-cause-fix)按症状分组，给出每一条的修复办法。所有字符串都来自 Agent Substrate v1.0.0，只有最后一张表来自 kagent v1.0.0。有一张表列出我们在代码里读到、但没有录制过的文本，表中会注明这一点。

## 从请求到 actor {#s-ref-errors-from-a-request-to-an-actor}

除非某一行写明 agentgateway，本表中的响应体都来自 Envoy 数据平面。在 agentgateway 上，请读状态码和 `ate-error-reason` 响应头，[第 8.3 节](#s-symptom-cause-fix)对此有说明。

| 文本 | 状态码 | 含义 | 章节 |
|---|---|---|---|
| `actor ate-demo-counter/does-not-exist not found` | 404，Envoy router | 该 atespace 里没有这个名称的 actor。 | [6.1](#s-the-router-and-ingress) |
| `actor lab-c/b0-5 unavailable: no worker has room for the actor` | 503，5.06 秒后 | 在暂存预算内，匹配池里没有 worker 有空闲的 CPU 和内存。 | [4.4](#s-request-parking) |
| `actor lab-c/r1 unavailable: AssignWorker prerequisite not met for Actor: lab-c/r1 (got: ACTOR_STATE_CRASHED, want ACTOR_STATE_SUSPENDED)` | 503，0.07 秒内 | actor 已崩溃，而只有已挂起的 actor 才能恢复。 | [3.5](#s-crashed-and-revertactor) |
| `actor lab-e/e-run unavailable` | 503，3 到 5 秒后 | router 没有收到 `ate-api-server` 的回答。Postgres 宕机时我们也见过这条文本，所以两处都要查。 | [8.2](#s-when-a-dependency-is-down) |
| `actor lab-n/q2 unavailable: AssignWorker prerequisite not met for Actor: lab-n/q2 (got: ACTOR_STATE_REVERTING, want ACTOR_STATE_SUSPENDED)` | 503，0.06 秒内 | actor 所在节点宕机期间开始了一次回退，但未能完成。状态会保持不变，直到节点恢复。 | [3.5](#s-crashed-and-revertactor)、[8.2](#s-when-a-dependency-is-down) |
| `actor lab-n/d2 unavailable: AssignWorker prerequisite not met for Actor: lab-n/d2 (got: ACTOR_STATE_DELETING, want ACTOR_STATE_SUSPENDED)` | 503，0.07 秒内 | actor 所在节点宕机期间开始了一次删除，但未能完成。名称会一直被占用，直到节点恢复。 | [8.2](#s-when-a-dependency-is-down) |
| `actor lab-n/u1 unavailable` | 503，5 到 8 秒后，此前有一两次在 10 秒客户端超时处返回 504 | actor 处于 `ACTOR_STATE_RESUMING`，而它所在的节点已停止。 | [4.3](#s-placement) |
| `actor xa/x2 unavailable: no worker has room for the actor` | 503，5.06 秒后 | 模板的 `workerSelector` 没有匹配任何 WorkerPool。文本与池已满时相同，而且模板没有黄金标签。 | [3.6](#s-atespaces) |
| `error resuming actor lab-c/x1` | 500，0.08 秒内 | 恢复失败，因为节点本地快照已经不在。actor 现在处于崩溃状态。 | [3.5](#s-crashed-and-revertactor) |
| `error resuming actor lab-c/r1` | 500，0.41 秒内 | 请求在节点重启后不久到达，此时 worker 还没有完成注册。actor 现在处于崩溃状态。 | [8.2](#s-when-a-dependency-is-down) |
| `error resuming actor lab-e/e-run` | 500，最多等待 9 秒后 | `ate-api-server` 无法读取 Postgres。 | [8.2](#s-when-a-dependency-is-down) |
| `ingress failed` | agentgateway router 上的任何失败状态码：我们的运行里有 404、500、503 和 504，代码里还有 401 和 403 | 除池已满之外，agentgateway 对每种入站失败返回的响应体。它不指明原因。我们在 actor 不存在、缺少路由头，以及 Postgres 或 `ate-api-server` 不可用时都得到过它。请读状态码和 `ate-error-reason` 头。 | [8.3](#s-symptom-cause-fix)、[8.2](#s-when-a-dependency-is-down)、[6.6](#s-the-dataplane-choice) |
| `method not allowed` | 405，agentgateway router，端口 8444 | 对只接受 `CONNECT` 的端口发了 `POST`。 | [6.1](#s-the-router-and-ingress) |
| `no worker has room for the actor`，前面没有其他文本 | 503，agentgateway router，来自代码 | agentgateway 上池已满的情形。响应体前面没有 `actor ... unavailable:` 文本。 | [4.4](#s-request-parking) |
| `invalid actor reference` | 404，Envoy router | `ate-target-actor` 头不是 `atespace/name` 的形式。 | [6.1](#s-the-router-and-ingress) |
| `upstream connect error or disconnect/reset before headers. reset reason: connection termination` | 503，约 0.06 秒内 | 沙箱里的进程已退出。actor 仍显示 RUNNING，在我们最长的一次观察里持续了 20 分钟。 | [8.3](#s-symptom-cause-fix)、[3.5](#s-crashed-and-revertactor) |
| 同样的文本，但延迟更长 | 503，0.50 到 5.07 秒后 | 运行中 actor 所在的节点已停止。actor 仍显示 RUNNING。我们探测的全部 150 个请求都有这个延迟。 | [8.3](#s-symptom-cause-fix)、[4.3](#s-placement) |
| 同样的文本，出现在一个未完成的请求上 | 503，2.2 秒后 | 请求期间，一次挂起停掉了 actor。actor 显示 SUSPENDED，下一个请求会恢复它。 | [3.3](#s-suspendactor-and-resumeactor) |
| 状态码 000，无响应体 | 客户端超时 | 请求挂起了。在我们的运行里，原因是 Postgres，对于经 `kubectl ate proxy` 的请求则是 Kubernetes API server。 | [8.2](#s-when-a-dependency-is-down) |

### 代码里有、但我们的运行没有记录的文本 {#s-ref-errors-texts-from-the-code-that-our-runs-did-not-record}

这些响应体在 v1.0.0 的 Envoy 数据平面 router 代码里。`X` 是 actor 的 atespace 和名称。

| 文本 | 状态码 | 含义 | 章节 |
|---|---|---|---|
| `actor "X" unavailable: router at capacity` | 503 | router 的暂存区已满，所以 router 在一次恢复尝试失败后丢弃了该请求。 | [4.4](#s-request-parking) |
| `actor X unavailable: another operation is in progress for this actor` | 503 | 另一个工作流在整个暂存预算内一直持有该 actor 的租约。 | [4.4](#s-request-parking)、[8.1](#s-postgres-and-the-object-store) |
| `actor X authentication required` | 401 | `ate-api-server` 不接受 router 的身份。 | [5.2](#s-access-policies) |
| `actor X access denied` | 403 | `ate-api-server` 拒绝了 router 的恢复调用。 | [5.2](#s-access-policies) |
| `actor X request timed out` | 504 | 恢复没有在截止时间前完成。 | [8.2](#s-when-a-dependency-is-down) |
| `request for actor X canceled by client` | 408 | router 等待期间客户端关闭了请求。客户端看不到这条回复，router 日志里能看到。 | [4.4](#s-request-parking) |

## 与 router 进行 TLS 握手时的错误 {#s-ref-errors-from-a-tls-handshake-with-the-router}

| 文本 | 数据平面 | 含义 | 章节 |
|---|---|---|---|
| `tlsv13 alert certificate required` | agentgateway | 客户端没有发送证书。 | [5.1](#s-client-authentication) |
| `certificate unknown` | Envoy | 客户端证书的身份不在允许列表里。 | [5.1](#s-client-authentication) |
| `Connection reset by peer` | agentgateway | 与上一行原因相同。 | [6.6](#s-the-dataplane-choice) |
| `SSL: no alternative certificate subject name matches target hostname 'atenet-router.ate-system.svc.cluster.local'` | 两者都有 | 客户端用了 Service 的长名称。router 证书对 `atenet-router.ate-system.svc` 有效。 | [6.1](#s-the-router-and-ingress) |

## actor 内部出站路径上的错误 {#s-ref-errors-from-inside-an-actor-on-the-way-out}

| 文本 | 数据平面 | 含义 | 章节 |
|---|---|---|---|
| `actor egress policy denied` | agentgateway，HTTP 403 | 出站策略没有任何规则允许该目的地。 | [6.2](#s-egresspolicy-and-default-deny) |
| `egress denied` | Envoy，HTTP 403 | 出站策略没有任何规则允许该目的地。 | [6.2](#s-egresspolicy-and-default-deny) |
| `status: NXDOMAIN` | 两者都有 | DNS 中继只应答规则允许的名称。 | [6.3](#s-the-dns-relay) |
| `curl: (6) Could not resolve host: drip.egress-target.svc.cluster.local` | 两者都有 | 原因相同，这是 `curl` 的报告方式。 | [6.3](#s-the-dns-relay) |
| `upstream connection failed` | agentgateway，HTTP 503 | `https` 规则的主机使用了网关不信任的证书，例如来自私有 CA 的证书。网关日志里有 `invalid peer certificate: UnknownIssuer`。 | [6.4](#s-tls-interception) |
| `upstream connect error or disconnect/reset before headers. reset reason: remote connection failure` | Envoy，HTTP 503 | 原因相同。网关日志里有 `CERTIFICATE_VERIFY_FAILED`。 | [6.4](#s-tls-interception) |

## 来自 kubectl ate 与安装器的错误 {#s-ref-errors-from-kubectl-ate-and-the-installer}

| 文本 | 含义 | 章节 |
|---|---|---|
| `actor "f-deny" in atespace "lab-f" has no egress policy` | 对没有出站策略的 actor 执行 `get egress-policy`。该 actor 处于默认拒绝。 | [6.2](#s-egresspolicy-and-default-deny) |
| `egress_policy.rules[2].tls_passthrough.ports: Required value` | 透传规则必须有 `ports`。 | [6.2](#s-egresspolicy-and-default-deny) |
| `Error: failed to connect to ate-api-server: no ready api pods in ate-system` | 没有就绪的 `ate-api-server` pod。有一次运行的原因是 Postgres。另一次是节点重启，`ate-api-server` 尚未就绪。 | [8.2](#s-when-a-dependency-is-down)、[4.3](#s-placement) |
| `Error: failed to create actor: rpc error: code = AlreadyExists desc = Actor d2 already exists` | 创建时用了一个 actor 的名称，而该 actor 因一次失败的删除停留在 `ACTOR_STATE_DELETING`。它的节点当时宕机。 | [8.2](#s-when-a-dependency-is-down) |
| `Error: failed to create actor: rpc error: code = FailedPrecondition desc = Tag not found` | `create actor --template` 所用模板的黄金标签已被删除。`get actor-templates` 仍然列出该标签 id。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| `Error: failed to create tag: rpc error: code = Aborted desc = another operation is in progress for this actor` | 对一个 actor 执行 `create tag`，而它在已停止的节点上有一次进行中的恢复。 | [8.2](#s-when-a-dependency-is-down) |
| `Error: failed to create tag: rpc error: code = FailedPrecondition desc = Actor lab-n/t1 must be ACTOR_STATE_SUSPENDED to be tagged (got: ACTOR_STATE_RESUMING)` | 对未挂起的 actor 执行 `create tag`。我们也见过 `got: ACTOR_STATE_CRASHED` 的情形。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives)、[8.2](#s-when-a-dependency-is-down) |
| `Error: failed to create actor template: rpc error: code = InvalidArgument desc = actor_template.golden_egress_policy: Forbidden` | 模板含有预览字段，但服务端或客户端缺少 `--preview` 标志。 | [8.5](#s-limits-at-v1-0-0) |
| `Error: failed to list actors: rpc error: code = PermissionDenied desc = permission denied: principal "user:system%3Aserviceaccount%3Aate-users%3Aalice" lacks "can_list_actors" on "atespace:lab-v"` | 令牌有效，但没有任何访问策略允许这次调用。同一句话在其他调用里会写出 `can_create_actor`、`can_list_workers`、`can_list_atespaces` 或 `can_create_access_policy`。 | [5.2](#s-access-policies) |
| `Error: failed to list actors: rpc error: code = Unauthenticated desc = invalid bearer token` | 令牌文件里没有受众为 `api.ate-system.svc` 的有效令牌。 | [5.1](#s-client-authentication) |
| `Error: failed to resume actor: rpc error: code = Unavailable desc = while calling atelet Restore` | 控制平面在节点重启后恢复的最初几秒里发起的恢复。worker 还没有重新注册。 | [4.3](#s-placement) |
| `Error: failed to resume actor: rpc error: code = Unavailable desc = worker b17a6492-9643-42f1-bfdb-8bb88ee46772 assigned to actor lab-c/w1 is unavailable` | 几秒之后发起的恢复。重启前的那个 worker 已被标记为不可用。对于所在节点已停止的 actor，`resume actor` 也返回过同样的文本。 | [4.3](#s-placement)、[8.2](#s-when-a-dependency-is-down) |
| `Error: failed to revert actor: rpc error: code = Aborted desc = another operation is in progress for this actor` | 在已停止的节点上有一次恢复进行时发起了回退。 | [3.5](#s-crashed-and-revertactor) |
| `Error: failed to revert actor: rpc error: code = FailedPrecondition desc = Actor lab-n/p3 is not in a revertable state (got: ACTOR_STATE_RESUMING, want one of [ACTOR_STATE_RUNNING ACTOR_STATE_CRASHED]` | 回退一个因节点停止而停留在 `ACTOR_STATE_RESUMING` 的 actor。我们的记录截掉了文本的末尾。代码里的文本以 `, or ACTOR_STATE_SUSPENDED with a node-local snapshot)` 结束，这是回退接受的第三个状态。 | [3.5](#s-crashed-and-revertactor) |
| `Error: failed to revert actor: rpc error: code = Unavailable desc = while calling atelet Terminate` | 回退一个节点已停止的 actor。actor 停留在 `ACTOR_STATE_REVERTING`，节点停机期间，此后的每次回退都以同样的文本失败。节点及其 `atelet` 恢复后，再回退一次，0.2 秒内成功。 | [3.5](#s-crashed-and-revertactor)、[8.2](#s-when-a-dependency-is-down) |
| `Error: failed to suspend actor: rpc error: code = FailedPrecondition desc = MarkSuspending prerequisite not met for Actor: lab-n/d2 (got: ACTOR_STATE_RESUMING, want ACTOR_STATE_RUNNING)` | 挂起一个未在运行的 actor。我们的 actor 在已停止的节点上处于 `ACTOR_STATE_RESUMING`。 | [8.2](#s-when-a-dependency-is-down) |
| `Error: failed to suspend actor: rpc error: code = Internal desc = internal server error: workflow failed at step CallAteletSuspend: actor lab-c/j1 crashed` | 挂起时发现沙箱已死。actor 现在处于崩溃状态。 | [8.3](#s-symptom-cause-fix) |
| `Error: failed to update actor: rpc error: code = FailedPrecondition desc = actor must be ACTOR_STATE_SUSPENDED to change its actor template (got: ACTOR_STATE_RUNNING)` | 对运行中的 actor 执行 `update actor --template`。请先挂起它。 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| `Error: manifest for actor "f-main" in atespace "lab-f" lacks the metadata.uid and metadata.version preconditions that "get egress-policy -o yaml" prints` | 更新必须写明它所替换的版本。 | [6.2](#s-egresspolicy-and-default-deny) |
| `Error: rpc error: code = Unavailable desc = while calling atelet Terminate` | 对节点已停止的 actor 执行 `delete actor`。actor 停留在 `ACTOR_STATE_DELETING`。 | [8.2](#s-when-a-dependency-is-down) |
| `Error: unknown flag "-A"` | `get workers` 没有“所有 atespace”标志。它默认列出所有命名空间。 | [2.2](#s-kubectl-ate) |
| `Error: while building the envoy-dataplane image: exit status 125` | 从源码安装需要 `docker buildx`。 | [2.1](#s-install-with-ate-setup) |
| `global has no access policy` | 在新安装上执行 `get access-policy --global`。只有引导所有者拥有全局角色。 | [5.2](#s-access-policies) |
| `Unable to connect to the server: EOF` | `kubectl` 无法连接 Kubernetes API server。actor 仍在处理请求。 | [8.2](#s-when-a-dependency-is-down) |
| `unknown flag: --platform` | Docker 没有 buildx 插件。这一行出现在上面那条构建错误之前。 | [2.1](#s-install-with-ate-setup) |
| `Warning: no --token-file given; acting as the shared identity system:serviceaccount:ate-system:ate-client rather than as yourself. Pass --token-file to act as yourself.` | 没有给出 `--token-file`，所以 CLI 使用共享身份。 | [5.1](#s-client-authentication) |

## API 返回的状态码 {#s-ref-errors-from-the-api-as-status-codes}

| 状态码 | 何时出现 | 章节 |
|---|---|---|
| `FAILED_PRECONDITION` | 在不接受的状态下发起生命周期调用，例如恢复已崩溃的 actor，或删除不为空的 atespace | [状态参考](#s-ref-states) |
| `ABORTED` | 写入时指明了旧的 `version`，或两个工作流作用于同一对象。代码里的文本有：actor 或 worker 的 `concurrent update conflict, please retry`、`EgressPolicy version conflict`，以及 `another operation is in progress for this actor`。 | [API 参考](#s-ref-api-methods) |
| `InvalidArgument` | 清单未通过校验，例如规则缺少端口 | [6.2](#s-egresspolicy-and-default-deny) |
| `Internal` | 某个工作流步骤失败。文本会指明该步骤。 | [8.3](#s-symptom-cause-fix) |

## 来自 kagent CLI 的错误 {#s-ref-errors-from-the-kagent-cli}

| 文本 | 含义 | 章节 |
|---|---|---|
| `bind: address already in use` | 两个 CLI 调用同时在端口 8083 上打开了端口转发。 | [7.1](#s-kagent-on-substrate) |
| `kubectl port-forward exited before the server became ready` | 同一次失败的第一行。 | [7.1](#s-kagent-on-substrate) |

来源：capture/lab/P-node-loss/40-balt-suspend-resume-delete.tsv, capture/lab/P-node-loss/60-d-running.tsv, capture/lab/P-node-loss/74-second-revert.tsv, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/P-node-loss/96-golden-tag-deleted.txt, capture/lab/Q-network/g-dependency-loss-agw/12-probe-incluster.tsv, capture/lab/Q-network/i-model-gateway/20-results-agentgateway.txt, capture/lab/Q-network/i-model-gateway/20-results-envoy.txt, capture/lab/Q-network/i-model-gateway/41-egress-503-line.log, capture/lab/Q-network/i-model-gateway/44-envoy-egress-503.excerpt.log, capture/lab/Q-network/m-router-ports/agentgateway/10-port-probes.tsv, capture/lab/Q-network/m-router-ports/agentgateway/11-port-probes-supplement.txt, capture/lab/V-validation/06-template-move/10-move.tsv, capture/lab/V-validation/07-cross-namespace-pool/10-cross.tsv, capture/lab/V-validation/08-access-control/10-access.tsv, capture/lab/V-validation/10-preview-feature/10-preview.tsv, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv, capture/lab/N-demos/failure-drill/drill-run.log, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/multinode/75-stop-after-upload-revert.tsv, capture/lab/L-gaps/multinode/80-stop-before-upload.tsv, capture/lab/L-gaps/multinode/90-stop-while-running.tsv, capture/lab/L-gaps/multinode/93-after-node-return.tsv, capture/lab/L-gaps/restart/10-poll.tsv, capture/lab/I-capacity/01-unplanned-full-pool-503.tsv, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/D-durability/30-local-loss.tsv, capture/lab/D-durability/40-node-reboot.tsv, capture/lab/D-durability/44-r1-after-reboot.yaml, capture/lab/J-container-death/10-trace.tsv, capture/lab/E-dependency-loss/12-probe-incluster.tsv, capture/lab/E-dependency-loss/12-probe-proxy.tsv, capture/lab/E-dependency-loss/14-T1-cli-during.txt, capture/lab/E-dependency-loss/16-T3-kubectl-during.txt, capture/lab/G-dataplane/envoy/ingress-auth/, capture/lab/G-dataplane/agentgateway/ingress-auth/, capture/lab/F-egress/envoy/20-results.txt, capture/lab/F-egress/agentgateway/20-results.txt, capture/lab/F-egress/envoy/19-first-run-update-refused.txt, capture/lab/F-egress/envoy/19b-second-run-passthrough-ports-required.txt, capture/lab/A-quickstart/20-deploy-ate-system.FAILED-no-buildx.log, capture/lab/A-quickstart/60-state.log, capture/lab/A-quickstart/50-create-actor.log, capture/lab/K-kagent/latency/D-par-5.err; api/ateapi/v1/ateapi.proto (the status codes in the method comments), cmd/atenet/internal/router/ingress/errors.go, cmd/ateapi/internal/controlapi/workflow.go, workflow_revert.go, actor.go, worker.go and egress_policy.go at v1.0.0; agentgateway v1.7.0 crates/agentgateway/src/proxy/mod.rs and crates/agentgateway/src/http/substrate/ingress.rs.
