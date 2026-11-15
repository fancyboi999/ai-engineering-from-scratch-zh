# Atespace 与命名

> atespace 在 Substrate API 里把 actor、模板和标签归为一组，它不是 Kubernetes namespace，尽管两者常常同名。

你运行 `kubectl get ns`，想找到 actor 所在的位置。你找到一个与示例同名的 namespace，里面有 worker pod，却没有 actor。接着你为新团队创建了第二个 atespace，它的模板却仍然跑在第一个团队的 worker 池上。这两个结果出自同一个事实：Substrate 维护两份名称列表，只用标签把它们连起来。

读完本节，你能创建一个 atespace，并在其中命名 actor 和模板。你还能让模板选中一个 worker 池，并根据 URI 在对象存储里找到快照。

## atespace 不是 namespace {#s-atespaces-an-atespace-is-not-a-namespace}

**Atespace：** 在 Substrate API 里，actor、`ActorTemplate` 和标签所属的分组。atespace 是 Postgres 里的一行记录。在其中创建任何东西之前，它必须已经存在，并且只有在它为空时才能删除 {{docs}}。

| 对象 | 所在位置 | 列出方式 |
|---|---|---|
| Atespace | Substrate API，全局 | `kubectl ate get atespaces` |
| Actor | Substrate API，属于一个 atespace | `kubectl ate get actors -a <atespace>` |
| ActorTemplate | Substrate API，属于一个 atespace | `kubectl ate get actor-templates -a <atespace>` |
| 标签 | Substrate API，属于一个 atespace | `kubectl ate get tags -a <atespace>` |
| 访问策略 | Substrate API，每个 atespace 一份 | [第 5.2 节](#s-access-policies) |
| WorkerPool、worker pod | Kubernetes，属于一个 namespace | `kubectl get workerpools -n <namespace>` |
| Worker 记录 | Substrate API，全局 | `kubectl ate get workers` |

我们的测试环境用同一个名称创建了这两类对象。这是我们的选择，Substrate 并不要求这样做。

```listing
title: 一个 namespace、一个 WorkerPool 和一个 atespace，全由我们命名
source: capture/lab/_scripts/c1-ballast-setup.sh
lang: bash
note: 取自准备恢复测试的脚本。池的 spec 以及三部分之间的行已省略。
---
kind: Namespace
metadata:
  name: lab-c
…
kind: WorkerPool
metadata:
  name: ballast
  namespace: lab-c
  labels:
    workload: ballast
…
kubectl apply -f pool.yaml
kubectl ate create atespace lab-c 2>&1 | tail -1
```

`kubectl apply` 把 namespace 和池写进 Kubernetes。`kubectl ate create atespace` 通过 `ate-api-server` 写入一行记录。快速上手示例用名称 `ate-demo-counter` 做了同样的事，所以新用户看到一个名称，就以为只有一个对象。

```figure
id: fig-3-6
kind: tree
title: atespace 与 Kubernetes namespace 的对照
claim: atespace 容纳模板、actor 和标签，namespace 容纳 worker 池，两者只靠一个标签选择器相连。
caption: 每棵树从上往下读。左边的树在 Postgres 里，右边的树在 Kubernetes 里。虚线箭头是模板的 workerSelector。名称取自我们的恢复测试。来源：capture/lab/_scripts/c1-ballast-setup.sh、capture/lab/C-resume-vs-size/tmpl-200.yaml。
```

atespace 是访问边界。atespace 内的一个角色覆盖其中所有 actor 和所有模板，不存在只授予单个 actor 的权限 {{docs}}。不要重用已删除 atespace 的名称。文档警告说，针对旧 atespace 授权的请求可能到达新的同名 atespace {{docs}}。

## 池选择会跨 namespace {#s-atespaces-pool-selection-crosses-namespaces}

模板用 `workerSelector.matchLabels` 选择 worker。调度器拿这些标签去比对 WorkerPool 对象上的标签。它不读 pod 的标签，也不读池所在的 namespace {{code}}。每个 worker 带着其 WorkerPool 对象标签的一份副本，调度器与这份副本做匹配。

从代码和文档可以推出三条规则。

- 只有相等的标签才算匹配，不支持集合表达式 {{code}}。
- actor 可以加上自己的选择器。调度器把两个选择器同时应用，所以 actor 的选择器只会缩小范围。改动在下一次恢复时生效 {{code}}。
- 没有选择器的模板可以跑在每个池上 {{docs}}。

所以池所在的 namespace 并不是围栏。任何 atespace 里的模板都可以写出任意池的标签，该 namespace 上的 Kubernetes RBAC 拦不住它 {{code}}。v1.0.0 的文档没有写明这条规则。它来自代码，下面的运行结果也印证了它。

我们实际运行了一次。我们创建了 atespace `xa`，没有创建同名的 Kubernetes namespace。`xa` 里的一个模板选择了 `workload: vpool`，这是 namespace `lab-v` 中一个池的标签。

```listing
title: atespace xa 的 actor 跑在 namespace lab-v 的 worker pod 上
source: capture/lab/V-validation/07-cross-namespace-pool/13-actors.txt
lang: text
note: 文件的两行全部列出。最后三列已省略。
---
ATESPACE   NAME   TEMPLATE     STATE                 WORKER POD                     …
xa         x1     xa/cross-0   ACTOR_STATE_RUNNING   lab-v/vpool-69595c64bf-p4slt   …
```

模板在那个池上生成了黄金快照，actor 则跑在 `lab-v` 的一个 worker pod 上。

选择器匹配不到任何池是相反的错误，Substrate 也不会拒绝它。我们在 `xa` 里创建了第二个模板，标签是 `workload: no-such-pool`。创建调用成功了。这个模板始终没有得到黄金标签，它的 `ERROR` 列一直是空的。发往该模板 actor 的请求失败了。

```listing
title: 发往模板匹配不到任何池的 actor 的请求
source: capture/lab/V-validation/07-cross-namespace-pool/10-cross.tsv
lang: text
note: 跟踪记录中的一行。
---
2026-11-12T12:51:40.304Z	call-unmatched-selector	503	5.060180	actor xa/x2 unavailable: no worker has room for the actor
```

**我们测得**两个模板各一次，环境是 x86 服务器客户机（24 vCPU，47 GB，嵌套 KVM）。发往 `lab-v` 池上 actor 的第一次请求在 0.26 秒内返回 200。选择器写错的那次请求等了 5.06 秒才得到 503。

这与 worker 池已满时的报错文本一字不差。`ate-api-server` 在 40 秒的日志里为这个模板记录了 8 次相同的原因，而模板本身没有显示任何错误。看到 `no worker has room for the actor` 时，先拿选择器去比对 worker 池的标签，再考虑增加 worker。[第 8.3 节](#s-symptom-cause-fix)有对应的行。

kagent 展示了填补这一空缺的约定。它把池的名称和 namespace 写进两个标签，它的模板同时选择这两个标签。

```listing
title: kagent 写入模板的选择器
source: capture/lab/K-kagent/session1/actor-template.yaml
lang: yaml
note: 文件的最后四行。
---
workerSelector:
  matchLabels:
    kagent.dev/worker-pool-name: kagent-default
    kagent.dev/worker-pool-namespace: kagent
```

第二个标签看起来像 namespace 检查，实际上它和其他标签一样只是一个标签。另一个 namespace 里带有同样两个标签的池也会匹配。

worker 列表为每份名称列表各提供一个过滤器。

```listing
title: kubectl ate get workers 的过滤器
source: capture/lab/A-quickstart/60-state.log
lang: text
note: 该命令打印的帮助文本中的四行。
---
-a, --atespace string        filter worker pods hosting actors in a specific atespace
…
-n, --namespace string       scope output to a specific Kubernetes namespace
--sandbox-class string   filter by sandbox class (e.g. gvisor, microvm)
-l, --selector string        filter by worker pool labels
```

## 命名 {#s-atespaces-names}

Substrate API 里的每个名称都是 DNS 标签：小写字母、数字和连字符，最长 63 个字符 {{code}}。名称在创建时就固定了。

| 对象 | 形式 | 我们运行中的示例 |
|---|---|---|
| Actor 地址 | `<atespace>/<name>` | `ate-demo-counter/my-counter-1` |
| 模板引用 | `<atespace>/<name>` | `lab-c/ballast-200` |
| Actor uid | 由服务器分配 | `6f80f612-7547-4f5b-b3ab-831595621806` |
| Worker 名称 | worker pod 的 uid | `c572e96d-dd9b-4500-b0e3-880a98d9f61d` |
| 黄金标签名称 | 模板的 uid | `b9f97b82-b187-419d-8789-6c8c7b8a6c8c` |
| kagent actor | `session-<session id>` | `session-01a1cf43-d760-747a-b907-5e0640126e4e` |

actor 地址是你读得最多的形式。错误文本使用它，`kubectl ate` 用 `-a` 和名称两个参数分别接收它，router 则从请求头里读取它。[第 6.1 节](#s-the-router-and-ingress)会讲这个请求头。

删除 actor 后用同一个名称重新创建时，uid 就很重要。新 actor 会得到新的 uid。快照路径使用 uid，所以新 actor 无法从旧 actor 的状态恢复 {{docs}}。

## 我们看到的快照 URI 布局 {#s-atespaces-the-snapshot-uri-layout-we-saw}

actor 对象里的每个快照都有一个 `snapshotUri`。atespace 和所有者都是路径的一部分。

```listing
title: my-counter-1 首次挂起后的两个快照 URI
source: capture/lab/B-lifecycle/22-actor-after-async-suspend.yaml
lang: yaml
note: 文件中的两行。第一行是黄金快照，第二行是 actor 的快照。
---
snapshotUri: gs://ate-snapshots/atespaces/ate-demo-counter/tags/ad19ee28-1519-432a-bcc5-40cf99cce3ca
…
snapshotUri: gs://ate-snapshots/atespaces/ate-demo-counter/actors/6f80f612-7547-4f5b-b3ab-831595621806/snapshots/8faccdff-15cc-493d-8474-5ebcb1c18d56
```

| 所有者 | 布局 |
|---|---|
| 标签 | `<location>/atespaces/<atespace>/tags/<tag uid>` |
| Actor | `<location>/atespaces/<atespace>/actors/<actor uid>/snapshots/<snapshot uuid>` |
| 节点上的 actor | `/var/lib/ate/snapshots/<actor uid>/local-checkpoint/<snapshot uuid>` |

我们看到三个布局本身没有说明的细节。

- 在 kind 安装里，位置是 `gs://ate-snapshots/`，尽管存储实际上是集群里的 rustfs pod。
- kagent 为每个模板设置一个位置，它的 URI 以 `s3://ate-snapshots/kagent/` 开头。这个字段在上游项目里是预览功能 {{docs}}。
- 黄金 URI 的最后一段是标签的 uid，不是标签的名称，标签的名称是模板的 uid。

atespace 出现在路径里是有原因的。对象存储可以按路径前缀授权，所以你可以让某个团队只读访问某一个 atespace 的快照 {{docs}}。我们没有测试这种授权。

我们的判断：当一个团队同时拥有 atespace 和 namespace 时，两者用同一个名称，就像示例那样。然后把 worker 池的标签当作放置手段，而不是围栏。任何 atespace 都可以写出这些标签，我们在 v1.0.0 里没有找到把池限制在单个 atespace 的设置。慎重选定标签，并检查哪些模板用到了它们。

```takeaways
- 在第一个模板之前，用 kubectl ate create atespace 创建 atespace。
- 用 kubectl ate 列出 actor，因为 kubectl get 只显示池和 pod。
- 慎重地给每个 WorkerPool 打标签，因为任何模板都能按标签选中它。
- 给每个模板写上 workerSelector，避免它跑在所有池上。
- 新模板拿不到黄金标签时，先拿选择器比对池的标签。
- 从快照的 URI 读出 atespace、所有者和 uid。
- 不要重用已删除 atespace 的名称。
```

来源：capture/lab/_scripts/c1-ballast-setup.sh, capture/lab/C-resume-vs-size/tmpl-200.yaml, capture/lab/C-resume-vs-size/pool.yaml, capture/lab/C-resume-vs-size/02-templates.txt, capture/lab/C-resume-vs-size/actor-b200-1-suspended.json, capture/lab/C-resume-vs-size/snapdir-b200-1.txt, capture/lab/A-quickstart/60-state.log, capture/lab/A-quickstart/50-create-actor.log, capture/lab/B-lifecycle/22-actor-after-async-suspend.yaml, capture/lab/B-lifecycle/26-actor-after-revert.yaml, capture/lab/K-kagent/session1/actor-template.yaml, capture/lab/K-kagent/session1/actors-after-turn1.json, capture/lab/D-durability/46-after-reboot-followup.txt, capture/lab/V-validation/07-cross-namespace-pool/10-cross.tsv, capture/lab/V-validation/07-cross-namespace-pool/12-kubernetes-namespace-xa.txt, capture/lab/V-validation/07-cross-namespace-pool/13-actors.txt, capture/lab/V-validation/07-cross-namespace-pool/15-templates-with-unmatched-selector.txt, capture/lab/V-validation/07-cross-namespace-pool/tmpl-cross-none.yaml, capture/lab/V-validation/10-preview-feature/13-ateapi-lines.log. Agent Substrate v1.0.0: api/ateapi/v1/ateapi.proto (ResourceMetadata, Selector, Actor.worker_selector, Worker), docs/reference/glossary.md (Atespace), docs/reference/resource-model.md, docs/reference/api-guide.md (Snapshot Storage Layout, Best Practices), docs/guides/authorization.md (roles and limits), cmd/atecontroller/internal/workersync/syncer.go (worker labels are the labels of the WorkerPool object).
