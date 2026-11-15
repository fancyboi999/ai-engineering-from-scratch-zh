# 按 atespace 划分的访问策略

> 访问策略在单个 atespace 上授予三种角色之一，而 atespace 是 Substrate 能够保护的最小单元。

两个团队共用一个集群。A 团队绝不能挂起、读取或复制 B 团队的 actor。你想找办法给单个 actor 或单个模板授权，却发现 API 根本不支持。访问的单位是 atespace，这个事实决定了你如何划分工作。

读完本节，你能编写一份访问策略，说出每种角色允许的操作，并指出访问策略无法隔离的内容。

我们的绝大多数运行都使用默认所有者。在本节的测试中，我们使用了单个 ServiceAccount（`alice`）和 atespace `lab-v`。我们先是不给它任何角色，然后给它观察者（viewer）角色，接着给它编辑者（editor）角色，并记录下 API 允许的操作。下面的拒绝文本和策略清单均来自该次运行。我们没有实际运行的规则标注为来自代码或文档。

## 如何检查一次调用 {#s-access-policies-how-a-call-is-checked}

`ate-api-server` 分两步检查每一次调用 {{docs}}。首先认证将凭据转为主体，正如[客户端认证](#s-client-authentication)所述。然后授权在以下三种情况之一放行调用：

- 主体是引导所有者（bootstrap owner）
- 某份访问策略授予了该主体允许此调用的角色
- 调用方是拥有该调用所需系统角色的 Substrate 组件

在其他所有情况下，调用都会失败并返回 `PermissionDenied`。授权无法关闭。该模型运行在 `ate-api-server` 内部嵌入的 OpenFGA 引擎上，其数据保存在与 actor 相同的 Postgres 数据库中。

**访问策略（access policy）：** 针对某个范围的角色绑定列表。每个范围最多只有一份策略，其名称固定为 `default`。

```figure
id: fig-5-2
kind: tree
title: 访问策略的两个范围及其各自的角色
claim: 全局范围上的角色在每个 atespace 都有效，而单个 atespace 上的角色只在该 atespace 内有效。
caption: 从上往下读。蓝色框是策略可以覆盖的范围。虚线框包含来自 pod 证书的系统角色。atespace 名称是示例。来源：docs/guides/authorization.md、cmd/ateapi/internal/authz/model.fga at v1.0.0。
```

## 两个范围，五种角色 {#s-access-policies-two-scopes-five-roles}

策略覆盖全局范围或单个 atespace。全局范围有两种角色，单个 atespace 有三种。角色具有继承性：所有者（owner）同时也是编辑者（editor），而编辑者同时也是观察者（viewer）。

| 角色 | 能做的事 | 不能做的事 |
|---|---|---|
| 全局所有者（global owner） | 下表所有操作，创建 atespace，管理 worker | 签发 actor JWT |
| 全局观察者（global viewer） | 读取所有 atespace，列出 worker | 修改任何内容 |
| atespace 所有者（atespace owner） | 编辑者能做的一切，编写该 atespace 的策略，删除该 atespace | 操作其他 atespace |
| atespace 编辑者（atespace editor） | 创建、恢复、挂起、回退和删除 actor，编写模板、出站策略和标签 | 修改策略 |
| atespace 观察者（atespace viewer） | 读取 actor、模板、标签、出站策略和策略本身 | 修改任何内容 |

worker 不属于任何 atespace。只有全局角色才能列出它们，因此拥有 atespace 角色的团队无法运行 `kubectl ate get workers`。

## 引导所有者 {#s-access-policies-bootstrap-owners}

**引导所有者（bootstrap owner）：** 来自服务器标志 `--authz-bootstrap-owners` 的主体，无论策略如何规定，它始终拥有全局所有者角色。

服务器在启动时读取该列表，且列表不能为空 {{docs}}。使用 `ate-setup` 时，默认值是共享的 ServiceAccount `ate-client`，安装器对此打印了警告。Substrate 的 kagent 发行版把自己的控制器也加进了该列表。我们在 kagent 集群的 `ate-api-server` Deployment 中读到了这个参数 {{run}}：

```listing
title: kagent 安装中的引导所有者
source: capture/lab/K-kagent/inventory/deploy-ate-api-server.yaml
lang: yaml
note: ate-api-server 容器的一个参数。
---
        - --authz-bootstrap-owners=spiffe://cluster.local/ns/kagent/sa/kagent-controller,system:serviceaccount:ate-system:ate-client
```

那套安装环境由两个主体拥有。第一个是 kagent 控制器的 pod 证书。第二个依然是 `ate-client`，所以[客户端认证](#s-client-authentication)里的警告同样适用于 kagent 安装。

对于共享集群，请把列表设为运维人员的主体并保持精简。在全局策略中为日常管理员授予全局所有者角色。你可以通过 API 移除策略中的角色。要移除引导所有者，只能重启服务器。

## 编写策略 {#s-access-policies-write-a-policy}

策略是一份简短的清单。下面这个文件授予了 ServiceAccount `alice` 在 `lab-v` 上的观察者角色。

```listing
title: 我们创建的策略文件
source: capture/lab/V-validation/08-access-control/policy-viewer.yaml
lang: yaml
note: 完整文件。
---
metadata:
  name: default
bindings:
- role: viewer
  members:
  - user:system:serviceaccount:ate-users:alice
```

成员是带有前缀 `user:` 的主体。有三条命令用于创建、读取和修改策略。它们遵循其他 `kubectl ate` 对象的模式：

```bash
kubectl ate create access-policy -a lab-v -f policy-viewer.yaml
kubectl ate get access-policy -a lab-v -o yaml > current.yaml
kubectl ate update access-policy -a lab-v -f current.yaml
```

第四条命令会删除该范围内的所有绑定。只有在确定要这么做时才运行它：

```bash
kubectl ate delete access-policy -a lab-v
```

对于编辑者角色，我们在 `get -o yaml` 的输出中修改了一个词，然后用 `update` 发送了该文件。下面是更新后存储在系统中的策略。

```listing
title: 更新为编辑者后存储的策略
source: capture/lab/V-validation/08-access-control/15-policy-lab-v-editor.yaml
lang: yaml
note: 完整文件。服务器添加了 uid、时间戳和版本。
---
bindings:
- members:
  - user:system:serviceaccount:ate-users:alice
  role: editor
metadata:
  createTime: "2026-11-12T12:51:47.968679335Z"
  name: default
  uid: a06fc82d-e269-4ce3-8471-00c1b537adff
  updateTime: "2026-11-12T12:51:51.605795572Z"
  version: "2"
```

若针对全局策略，把 `-a` 替换为 `--global`。四条规则能帮你避免命令失败 {{code}}：

- 全局策略接受 `owner` 和 `viewer`。atespace 策略还接受 `editor`。
- `update` 会替换整份策略。它需要 `get -o yaml` 打印出的 `metadata.uid` 和 `metadata.version`，如果在你执行 `get` 之后策略发生过改变，更新就会失败。
- 你不能删除全局策略。可以把所有绑定清空后再更新它。
- 改动对下一次调用生效。

出站策略也遵循同样的 `update` 规则。我们的第一次 `update egress-policy` 失败了，直到清单同时包含这两个字段才成功 {{run}}。

## 各角色被拒绝的操作 {#s-access-policies-what-each-role-was-refused}

我们让同一个 ServiceAccount 经历了四个阶段。每次拒绝都会返回 gRPC 状态码 `PermissionDenied` 和相同的句式，并指明缺失的权限和所在范围。

```listing
title: 观察者尝试创建 actor
source: capture/lab/V-validation/08-access-control/10-access.tsv
lang: text
note: 跟踪记录中的一行。行首的时间和步骤名称已省略。
---
…Error: failed to create actor: rpc error: code = PermissionDenied desc = permission denied: principal "user:system%3Aserviceaccount%3Aate-users%3Aalice" lacks "can_create_actor" on "atespace:lab-v" 
```

| `alice` 在 `lab-v` 上的角色 | 调用 | 结果 |
|---|---|---|
| 无 | 列出 `lab-v` 中的 actor | 拒绝：在 `"atespace:lab-v"` 上缺少 `"can_list_actors"` |
| 无 | 列出 atespace | 拒绝：在 `"global:root"` 上缺少 `"can_list_atespaces"` |
| 观察者 | 列出 `lab-v` 中的 actor 和模板 | 允许 |
| 观察者 | 在 `lab-v` 中创建 actor | 拒绝：在 `"atespace:lab-v"` 上缺少 `"can_create_actor"` |
| 观察者 | 列出 atespace `lab-c` 中的 actor | 拒绝：在 `"atespace:lab-c"` 上缺少 `"can_list_actors"` |
| 观察者 | 列出 worker | 拒绝：在 `"global:root"` 上缺少 `"can_list_workers"` |
| 编辑者 | 在 `lab-v` 中创建、挂起和删除 actor | 允许 |
| 编辑者 | 在 `lab-c` 中创建 actor | 拒绝：在 `"atespace:lab-c"` 上缺少 `"can_create_actor"` |
| 编辑者 | 在 `lab-c` 上创建访问策略 | 拒绝：在 `"atespace:lab-c"` 上缺少 `"can_create_access_policy"` |
| 无（所有者删除策略之后） | 列出 `lab-v` 中的 actor | 拒绝：在 `"atespace:lab-v"` 上缺少 `"can_list_actors"` |

**我们测得**角色变更的延迟，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），每种变更各测一次。创建 2 秒后的第一次调用被允许，更新 2 秒后的第一次调用也被允许。删除 0.2 秒后的调用被拒绝。所以变更在 2 秒内生效，删除在 0.2 秒内生效。

拒绝信息里的两个细节对你有帮助。错误中指明主体时把每个冒号写成了 `%3A`，在复制到策略之前要先解码。而拒绝信息中的范围 `global:root` 意味着没有任何 atespace 角色可以放行这次调用。

安装完成后，全局范围根本没有任何策略：`kubectl ate get access-policy --global` 返回 `global has no access policy`。共享的 `ate-client` 身份依然拥有所有权限，因为它是引导所有者。

## 策略无法隔离的内容 {#s-access-policies-what-a-policy-cannot-separate}

atespace 是唯一的边界。由此带来五条限制，你在设计时必须逐一绕开 {{docs}}。

- **不能针对单个 actor 或单个模板授权。** 一个 atespace 的编辑者可以修改其中的每个 actor。
- **不支持用户组。** 一个成员就是一个主体。十人团队需要配置十个成员。
- **编辑者可以复制 actor。** 标签是 actor 内存和磁盘的副本，包含其中的所有机密。任何编辑者都能创建标签，并基于它启动新的 actor。
- **名称承载授权。** 如果你删除一个 atespace 并用相同名称新建一个，发往旧 atespace 的延迟请求可能会落到新 atespace 上。绝不要重复使用 atespace 名称。[Atespace 与命名](#s-atespaces)解释了命名规则。
- **router 不读取策略。** 在 router 列表上的客户端可以访问每个 atespace 中的 actor。

我们的 kagent 运行补充了一个实际案例 {{run}}。kagent 把每个 agent 的每个会话都放进名为 `kagent` 的同一个 atespace 中。在那次安装里，Substrate 策略无法将两个 kagent 用户隔开。这项职责属于 kagent 本身。

## 系统角色 {#s-access-policies-system-roles}

Substrate 组件拥有任何策略都无法授予的角色。每个角色都通过 `ate-api-server` 的一个标志绑定到对应组件的 pod 证书上 {{docs}}。

| 角色 | 持有者 | 允许的操作 |
|---|---|---|
| `ingress_router` | `atenet-router` | 恢复任意 actor，列出所有 atespace 中的 actor |
| `egress_gateway` | `atenet-egress`，以及你通过可重复标志 `--egress-gateway-spiffe-id` 指定的任何其他身份 | 读取 actor 和出站策略，签发 actor JWT |
| `atelet` | 每个节点上的 `atelet` | 读取任意 actor 的出站策略 |
| `controller` | `ate-controller` | 创建、获取、列出、更新、删除和排空 worker |
| `api_server_sidecar` | `ate-api-server` pod（各 sidecar 共享） | 读取 actor，以便对象存储插件将存储凭据限制在单个 actor {{code}} |

其中两行值得多看一眼。router 可以恢复任何 actor，这就是为什么[客户端认证](#s-client-authentication)里 router 的列表如此关键。而且只有出站网关能够签发 actor JWT。全局所有者也不能签发，因为持有该令牌就可以冒充该 actor 行事。[actor JWT](#s-actor-jwts)一节将追踪这个令牌。

## 我们的判断 {#s-access-policies-our-position}

需要彼此隔离 actor 的每组人员，各自使用一个单独的 atespace，并接受这就是你能拿到的唯一隔离边界。在第二个人使用集群之前，替换掉默认的引导所有者。不要指望 Substrate 来隔离你产品的最终用户。你自己的服务必须在 API 和 router 入口处承担起这个职责。

```takeaways
- 按 atespace 划分团队，因为不存在更细粒度的授权。
- 在共享集群之前，替换掉作为引导所有者的 ate-client。
- 每次更新前先运行 get -o yaml，并保留 metadata.uid 和 metadata.version。
- 只把编辑者角色授予被允许复制该 atespace 内所有 actor 的人员。
- 绝不要用以前用过的名称创建 atespace。
```

来源：capture/lab/V-validation/08-access-control/10-access.tsv, capture/lab/V-validation/08-access-control/policy-viewer.yaml, capture/lab/V-validation/08-access-control/14-policy-lab-v-viewer.yaml, capture/lab/V-validation/08-access-control/15-policy-lab-v-editor.yaml, capture/lab/V-validation/_scripts/v4-items-5-12.sh, capture/lab/K-kagent/inventory/deploy-ate-api-server.yaml, capture/lab/K-kagent/session1/actors-after-create.json, capture/lab/A-quickstart/22-deploy-ate-system-retry.log, capture/lab/F-egress/envoy/19-first-run-update-refused.txt; docs/guides/authorization.md, docs/guides/authentication.md at v1.0.0; cmd/kubectl-ate/internal/cmd/access_policy.go, cmd/ateapi/internal/authz/registry.go, cmd/ateapi/internal/authz/model.fga, api/ateapi/v1/ateapi.proto (AccessPolicy) at v1.0.0.
