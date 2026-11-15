# Postgres 与对象存储

> 每个 actor、模板和 worker 都是 Postgres 里的一行，每个持久快照都是 bucket 里的一个对象，想保住一个 actor 就必须同时保护这两处。

你在新装好的集群上运行 `kubectl get crd`，想找到 actor。结果只有三种类型，没有一种是 actor。可你一分钟前创建的 actor 明明在响应请求，它一定存在于某个地方。它存在于安装器替你启动的数据库里，它的内存则是 bucket 里的一组文件。

读完本节，你能说出 actor 的每一部分存放在哪个存储里。你能读懂快照地址，也能估算挂起的 actor 在节点和 bucket 上占用多少磁盘。

## actor 是 Postgres 里的行 {#s-postgres-and-the-object-store-actors-are-rows-in-postgres}

安装会创建三个 CustomResourceDefinition。它们只描述 worker 容量，别无其他。

```listing
title: Kubernetes 知道的三种类型
source: capture/lab/A-quickstart/60-state.log
lang: text
note: 安装后状态转储里连续的四行。
---
NAME                       SCOPE        VERSIONS      CREATED AT
csidriverconfigs.ate.dev   Cluster      v1(storage)   2026-11-12T10:05:33Z
sandboxconfigs.ate.dev     Cluster      v1(storage)   2026-11-12T10:05:33Z
workerpools.ate.dev        Namespaced   v1(storage)   2026-11-12T10:05:33Z
```

其余一切都是行。**代码**会创建一个 schema，默认名为 `substrate`，其中有下面这些表。

| 表 | 一行代表什么 | 谁来写 |
|---|---|---|
| `atespaces` | 一个 atespace | `ate-api-server`，在 `CreateAtespace` 时 |
| `actors` | 一个 actor，含它的状态和快照列表 | 每一次生命周期调用 |
| `actor_egress_policies` | 一个 actor 的出站策略 | 出站策略相关调用 |
| `actor_templates` | 一个 `ActorTemplate` | `CreateActorTemplate` |
| `tags` | 一个快照的一份具名副本 | `CreateTag`，以及每个模板的黄金快照 |
| `workers` | 一个已注册的 worker pod | `ate-controller` 和 `atelet` |
| `worker_assignments` | 哪个 actor 占用哪个 worker | 恢复、挂起和崩溃上报 |
| `worker_outbox` | worker 行的变更流 | 与每次 worker 变更在同一个事务里 |
| `worker_outbox_trim` | 变更流中旧行已被清理到的位置标记 | 变更流的维护任务 |
| `leases` | 对某个 actor、标签、模板或 worker 的一把锁 | 每个工作流，运行期间持续续期 |
| `global_access_policy`、`atespace_access_policies` | 角色绑定 | 访问策略相关调用 |

同一个 schema 里还有五张表，属于运行在 `ate-api-server` 内部的 OpenFGA 授权器。授权和 actor 在同一个数据库里，所以一份备份就能同时包含两者。

**租约（lease）：** `leases` 中的一行，它让某个工作流有权修改某个资源。工作流要不断续期，租约在最后一次续期 30 秒后过期。丢失租约的工作流会停止。

这个设计会带来三个后果，你迟早会遇到。

- `kubectl get`、`kubectl describe` 和 Kubernetes watch 都看不到 actor。请使用 `kubectl ate get actor`，见[第 2.2 节](#s-kubectl-ate)。
- 备份 etcd 不会带上任何一个 actor。只备份集群而跳过 Postgres，恢复出来的是 worker 池，没有工作负载。
- 每一行都有 `uid` 和 `version`。写入时如果指定了旧版本，就会失败。所以更新出站策略时，需要从一次新的 `get` 里取这两个值，见[第 6.2 节](#s-egresspolicy-and-default-deny)。

## 内置 Postgres 只有一个副本 {#s-postgres-and-the-object-store-the-bundled-postgres-has-one-replica}

在 kind 上，`ate-setup` 会替你安装 Postgres。**代码**把它部署为 `replicas: 1` 的 StatefulSet，镜像是 `postgres:18-alpine`，卷声明为 500 GiB，kind 的 overlay 会把它改小。我们的安装里它是一个 pod，`postgres-0`，含两个容器。

`ate-api-server` 用两个登录身份连接。owner 登录执行 schema 迁移，读写登录处理请求。两者都使用客户端证书，所以内置数据库里没有密码。

kagent 发行版在这里不同。我们的 kagent 集群在 `ate-system` 里没有 Postgres。它在 `kagent` 命名空间里运行一个 PostgreSQL 18.4 Deployment，名为 `kagent-postgresql`。kagent 安装清单给它设置了 `POSTGRES_HOST_AUTH_METHOD=trust`，只要客户端能连到它，就接受不带密码的登录。[第 7.1 节](#s-kagent-on-substrate)会讲这种安装。

清单没有给内置数据库配副本，也没有配故障转移。`ate-api-server` 运行两个副本，两个副本都依赖这一个 pod。[第 8.2 节](#s-when-a-dependency-is-down)展示了我们把它撤掉 61 秒期间，客户端看到了什么。

**我们的判断：** 把内置 Postgres 当作测试夹具。只要集群有人依赖，就把 `ate-api-server` 指向一个带备库和备份的数据库。

## 使用外部 Postgres {#s-postgres-and-the-object-store-use-an-external-postgres}

我们对一个集群外的 Postgres 做了一次安装。这次运行之后的要点来自该 tag 下的代码和文档。

**我们测得**这一次的结果，环境是 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），用发布镜像新建了一个 kind 集群。Postgres 18 运行在客户机上的一个容器里，位于 kind 网络之外，使用 TLS 和密码登录。安装用了三次。第一次是我们自己把安装器变量设错了。第二次在数据库步骤失败，随后 `ate-setup deploy ate-system` 在 198 秒后失败。第三次部署用了 29 秒。

```listing
title: 不在事务里运行的数据库脚本
source: capture/lab/U-pg-upgrade-scale/10-extpg-install/20-pg-setup-attempt2-no-transaction.log
lang: text
note: psql 输出的五行。脚本用一个已经消失的设置拼出了角色名。
---
ERROR:  zero-length delimited identifier at or near """"
LINE 1: CREATE ROLE "" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE N...
                    ^
QUERY:  CREATE ROLE "" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
CONTEXT:  PL/pgSQL function inline_code_block line 28 at EXECUTE
```

数据库指南让你用管理员连接运行 `setup.sql` {{docs}}。脚本用 `set_config` 保存输入，保存的形式只在一个事务内有效 {{code}}。从管道里运行时，每条语句都是独立的事务，所以脚本用到角色名时它是空的。用 `psql --single-transaction` 运行同一个文件，就没有报错。对于内置数据库，安装器会把脚本包在 `BEGIN` 和 `COMMIT` 里 {{code}}。指南没有说你必须照做。

角色缺失期间，`ate-api-server` 每 2 秒记录一次 `password authentication failed`。请把这行日志读作数据库从未初始化，不要只当成密码错了。

与内置安装相比，有四点不同：

- 两个环境变量携带连接串：`ATE_API_POSTGRES_READ_WRITE_CONNECTION_STRING` 和 `ATE_API_POSTGRES_OWNER_CONNECTION_STRING`。标志 `--ateapi-postgres-server-ca-file` 提供服务器的 CA。
- 服务器证书里带 IP 地址时，`sslmode=verify-full` 可以工作。`ate-api-server` 的 14 个连接全部使用 TLS 1.3。
- 安装没有部署 `postgres` StatefulSet，却仍然部署了 `postgres` NetworkPolicy，它此时不选中任何 pod。
- 磁盘上的安装记录里没有连接串，重试时安装器会再次要求你提供这两个连接串。

**我们测得**该集群上的生命周期。`create actor` 用了 0.24 秒，首次请求用了 0.48 秒，各一次。同步挂起的中位数是 0.86 秒（0.59 到 1.16），其后的恢复是 0.31 秒（0.25 到 0.74），共 10 个周期。那几分钟里客户机上还在运行另一个安装，所以请把这些时间当作上限。计数在每一次挂起之后都保持连续。

**我们测得**这个数据库的一次中断，时长 60.6 秒。一个运行中的 actor 在 211 个请求里失败了 62 个：54 个是 9 秒的客户端超时，8 个返回 500。数据库就绪 0.7 秒后，它重新响应。新的恢复请求在 43 个里失败了 19 个，最后一个失败的请求发送于就绪后 28.7 秒。内置数据库给出了同样的规律，158 个请求里失败 66 个，持续 27 秒，见[第 8.2 节](#s-when-a-dependency-is-down)。所以外部 Postgres 消除了单个 pod 的隐患，但它本身不会缩短中断。

### 把 Postgres 放到另一台机器上的同一次安装 {#s-postgres-and-the-object-store-the-same-install-with-postgres-on-another-machine}

**我们测得**第二次安装，数据库放在另一台机器上，只做了一次。集群是第二台 x86 服务器客户机（16 vCPU、23 GB）上新建的 kind 集群。Postgres 18 运行在同一台服务器的另一台客户机上的容器里，走 TLS 1.3，`sslmode=verify-full`。`setup.sql` 通过这条网络用 `psql --single-transaction` 运行，返回 0。部署用了 173 秒，期间同一台客户机上还在跑 bucket 周期。同样的三个设置就够了，安装也同样没有部署 `postgres` StatefulSet。

两台客户机通过虚拟机管理程序的用户态网络互通。这条路径上一次查询的中位数是 0.56 毫秒。随后我们用 `tc netem` 往数据库方向加了 20 毫秒，一次查询变成 26.5 毫秒。

| 往 Postgres 方向加的延迟 | 一次查询，中位数，n=20 | 同步挂起，中位数（范围），n=10 | 恢复，中位数（范围），n=10 | 对运行中 actor 的请求，中位数，n=10 |
|---|---|---|---|---|
| 无 | 0.56 毫秒 | 0.64 秒（0.61 到 0.70） | 0.32 秒（0.30 到 0.36） | 0.03 秒 |
| 20 毫秒 | 26.5 毫秒 | 1.13 秒（1.01 到 1.81） | 0.82 秒（0.71 到 1.20） | 0.08 秒 |

所以到数据库的 20 毫秒往返，让一次挂起和一次恢复各多出约 0.5 秒。对运行中 actor 的请求只多付出 0.05 秒。一次挂起或恢复会连续发起好几次数据库调用，每次调用都要付一次往返。[第 8.2 节](#s-when-a-dependency-is-down)有这个数据库的两次中断。

本部分余下的内容来自该 tag 下的代码和文档。

- `ate-api-server` 接受两个连接串：`--postgres-owner-connection-string` 和 `--postgres-read-write-connection-string`。owner 角色执行迁移，读写角色处理请求。默认角色名是 `substrate_owner` 和 `substrate_readwrite`。
- 仓库里带有一个经由代理连接 Cloud SQL 的 overlay。其他 PostgreSQL 服务需要你自己接。
- 项目的 Cloud SQL 扩展指南说，事务模式的连接池不能用。它给出的原因是有一个会话在监听 worker 变化 {{docs}}。该 tag 下的代码与这个原因不符。worker watch 每 50 毫秒读一次 `worker_outbox` 表，咨询锁只持续一个事务 {{code}}。带连接池的运行计划放在下一版。在那之前，请使用会话模式，或者自己测试事务模式。
- 新版本的第一个副本会迁移 schema，任何迁移都不会回滚。升级前先做备份，见[第 8.4 节](#s-upgrade-and-stale-advice)。
- 公开的最大负载报告把 Postgres 指为瓶颈。在 9,000 个沙箱同时使用时，数据库跑到 53 到 60 个核（共 64 个），而 API 服务器是空闲的。这个数字来自针对一个候选发布版的 issue，不是我们的结果。

## 快照地址里有 atespace 和 actor uid {#s-postgres-and-the-object-store-a-snapshot-address-has-the-atespace-and-the-actor-uid-in-it}

持久快照是同一个前缀下的一个对象目录。actor 行里存的是这个地址。

```listing
title: my-counter-1 的快照存放位置
source: capture/lab/B-lifecycle/23-actor-after-sync-suspend.yaml
lang: yaml
note: 同步挂起之后的快照条目。沙箱运行时的属性已省略。
---
  snapshots:
  - actorTemplateUid: 71a3a39c-5f37-4d6e-937f-9c314fea7668
    durableSnapshot:
      object:
        snapshotUri: gs://ate-snapshots/atespaces/ate-demo-counter/actors/6f80f612-7547-4f5b-b3ab-831595621806/snapshots/13e256c4-7067-424f-a106-2cfe9ea38578
      state: SNAPSHOT_STORAGE_STATE_COMPLETED
    fidelity: SNAPSHOT_FIDELITY_MEMORY
    generation: 3
    locality: kind-control-plane
    owner: SNAPSHOT_OWNER_ACTOR
…
  state: ACTOR_STATE_SUSPENDED
```

从左往右读这个地址：快照位置、`atespaces`、atespace、`actors`、actor uid、`snapshots`、快照 uuid。标签有自己的前缀，用 `tags` 和标签 uid 取代 actor 那一段。路径使用 uid，所以与旧 actor 同名的新 actor 永远不会读到已删除 actor 的快照。

在 kind 上，bucket 是 rustfs，一个兼容 S3 的服务器，在 `ate-system` 里以一个 pod 运行。地址仍然以 `gs://` 开头。这个 scheme 表示安装器设置的位置，真正接收字节的服务由对象存储插件决定。不要把这个 scheme 当作数据去了 Google Cloud 的证据。

还有两个事实来自该 tag 下的代码和文档。一个 actor 同一时间只拥有一个持久快照，下一次成功的挂起会释放前一个。`ate-api-server` 先删除对象，再删除行。如果失败发生在两步之间，行会停在 `ACTOR_STATE_DELETING`，对象已经没了，重复删除即可完成收尾。它不会留下没有行的对象。

[图 8.1](#fig-8-1) 把这三个位置放在一起。

```figure
id: fig-8-1
kind: structure
title: 保存一个 actor 的三个位置
claim: Postgres 保存每个 actor 的记录，bucket 保存它的持久快照，节点磁盘在 30 分钟内再存一份副本。
caption: 圆柱是 Postgres，bucket 是对象存储，节点上的托盘是节点磁盘。每个存储的标签给出它的名称，以及我们用 25 个挂起的 actor 测得的大小。来源：capture/lab/C-resume-vs-size/20-storage-footprint.txt、capture/lab/C-resume-vs-size/23-storage-after-delete.txt、v1.0.0 的 schema 迁移。
```

## 25 个挂起的 actor 占多少磁盘 {#s-postgres-and-the-object-store-what-25-suspended-actors-cost-in-disk}

内存保真度的快照，和 actor 里存有数据的内存一样大。我们的压舱 actor 保存随机字节，所以每 MiB 都有数据，这是最坏情况。同样的 actor 如果有 500 MiB 的零字节，它在节点上的快照只有 4.6 MiB，见[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)。

**我们测得**磁盘占用，环境是一台 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM），只运行一次，共 25 个挂起的 actor。五个 actor 分别持有 0、50、200、500 和 1,000 MiB，合计 8,750 MiB。

| 位置 | 25 个 actor 挂起时 | 25 个 actor 删除后 |
|---|---|---|
| 节点，`/var/lib/ate/snapshots` | 8,801 MiB | 1 MiB |
| 节点，`/var/lib/ate/snapshot-cache` | 1,765 MiB | 1,765 MiB |
| Bucket，`ate-snapshots` | 10,824 MiB | 2,064 MiB |

[第 3.4 节的占用图](#fig-3-4c)用柱状图展示了同样的数字。

节点上每个快照存一份，8,750 MiB 的 actor 内存对应 8,801 MiB。bucket 里是同样的数据，外加 2,064 MiB 的黄金快照，只要模板还在，黄金快照就会一直保留。actor 消失后，快照缓存没有缩小。`atelet` 按自己的节奏清理它。

节点上的那份副本最容易被忘记。异步挂起之后，`atelet` 会在节点上保留这些文件 30 分钟，见[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)。这些文件在宿主机目录里，Kubernetes 不把它们算到任何 pod 头上。一个公开 issue 报告了一个节点因此越过磁盘压力阈值，随后 kubelet 驱逐了 worker pod。

**我们的判断：** 节点磁盘要按这个节点上 30 分钟内可能挂起的每个 actor 的内存来估算，再加上快照缓存。bucket 要按每个挂起 actor 的内存来估算，再为每个模板加一份黄金快照。对于内存保真度，统计存有数据的内存，再加约 1%：我们的节点用了 8,801 MiB，对应 8,750 MiB。空闲空间要保持在这两个数字之上。仅文件快照小得多。一个 actor 的卷里只有一个小文件时，它在节点上是 44 KiB，在 bucket 里是 48 KiB。

## 集群外的 bucket，以及距离的代价 {#s-postgres-and-the-object-store-a-bucket-outside-the-cluster-and-what-distance-costs}

本手册其他运行用的都是集群内的 bucket。这一部分我们把 bucket 搬到集群外，并加上网络延迟。[图 8.1b](#fig-8-1b) 展示了每一个周期。

```figure
id: fig-8-1b
kind: chart
title: 集群外的 bucket，附加 20 和 100 毫秒往返
claim: 附加 20 毫秒往返后，从 bucket 恢复 1,000 MiB 用了 10.2 秒，而不是 4.8 秒。
caption: 每个面板从左往右读，从集群内的 bucket 读到延迟更高的集群外 bucket。每个点是一个周期，一条线连接同一大小的中位数。横轴的间隔不按比例。来源：capture/lab/summary/object-store-x86.json。
```

**我们测得**这些结果，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），除非表中另有说明，每个单元格跑五个周期。一个周期包括：用 `--mode sync` 挂起、等待节点副本消失、再发一个请求。这些运行中，`atelet` 只在这几次使用了 3 秒的上传延迟和 10 秒的分离延迟。集群外的 bucket 是同一台客户机上、kind 网络之外的容器里的 rustfs。我们用 `tc netem` 加延迟，此时从节点发起的一次连接用了 20.3 毫秒和 100.4 毫秒。49 个请求全部返回 200。

| Bucket | 附加往返 | 内存中的数据 | 同步挂起，中位数（范围） | 从 bucket 恢复，中位数（范围） |
|---|---|---|---|---|
| 集群内 | 无 | 0 MiB | 0.52 秒（0.44 到 0.55） | 0.25 秒（0.22 到 0.28） |
| 集群内 | 无 | 200 MiB | 2.07 秒（1.83 到 2.21） | 1.04 秒（0.91 到 1.09） |
| 集群内 | 无 | 1,000 MiB | 6.44 秒（5.32 到 7.11） | 4.50 秒（4.49 到 4.84） |
| 集群外 | 无 | 0 MiB | 0.47 秒（0.45 到 0.55） | 0.25 秒（0.22 到 0.34） |
| 集群外 | 无 | 200 MiB | 2.14 秒（1.84 到 2.31） | 1.08 秒（1.03 到 1.10） |
| 集群外 | 无 | 1,000 MiB | 7.09 秒（5.80 到 7.23） | 4.79 秒（4.54 到 4.95） |
| 集群外 | 20 ms | 0 MiB | 0.66 秒（0.61 到 0.76） | 0.37 秒（0.35 到 0.45） |
| 集群外 | 20 ms | 200 MiB | 2.70 秒（2.44 到 2.81） | 2.50 秒（2.49 到 2.71） |
| 集群外 | 20 ms | 1,000 MiB，4 个周期 | 8.39 秒（7.17 到 8.90） | 10.24 秒（9.62 到 10.87） |
| 集群外 | 100 ms | 0 MiB | 1.53 秒（1.41 到 1.59） | 0.94 秒（0.86 到 1.06） |

从表里能读出三个结果。把 bucket 搬出集群、不加延迟，变化很小。20 毫秒的往返让 200 MiB 和 1,000 MiB 的恢复时间翻了一倍多，挂起的增幅较小。到了 100 毫秒，连没有数据的 actor 也要付出代价：它的恢复从 0.25 秒涨到 0.94 秒。

使用这些数字之前，先看限制。bucket 运行在同一台客户机上，所以延迟是模拟的，而且 bucket 与节点共用一块磁盘和一个 CPU。带宽没有限制。那次运行里缺了 100 毫秒的两个单元格，下一部分补上了它们。20 毫秒下 1,000 MiB 的第五个周期仍然缺失。下一部分还把 bucket 搬到了另一台机器上。

**我们的判断：** 在承诺恢复时间之前，先测量从你的节点到 bucket 的往返。让 bucket 与集群处于同一个区域。需要快速唤醒的 actor 要保住它的节点副本。把分离延迟设为该 actor 最长的空闲时间，见[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives)。

## 另一台机器上的 bucket {#s-postgres-and-the-object-store-a-bucket-on-another-machine}

随后我们把 bucket 放到另一台机器上。[图 8.1c](#fig-8-1c) 展示了每一个周期。

```figure
id: fig-8-1c
kind: chart
title: 另一台客户机上的 bucket，附带 TLS、限速和附加延迟
claim: bucket 在另一台客户机上时，对 1,000 MiB actor 的请求在 10 秒后得到 504，12 秒后才得到第一个 200。
caption: 每个面板从左往右读，从普通路径读到带限制的路径。每个点是一个周期，短线是一组的中位数，一组上方的数字是数据的 MiB 数。纵轴每一级放大十倍。来源：capture/lab/summary/remote-store-x86.json。
```

**我们测得**这些结果，环境是第二台 x86 服务器客户机（16 vCPU、23 GB），除非表中另有说明，每个单元格跑五个周期。bucket 是同一台服务器上另一台客户机的容器里的 rustfs。

方法与上文相同，只改了一处。请求返回 504 时，客户端每秒重发一次，直到得到第一个 200，并且不发送 `revert`。所以最后一列是上限，精度约 1 秒。全部 51 个周期都以 200 和正确的计数结束。

这里的每个数字都由路径决定。两台客户机通过虚拟机管理程序的用户态网络互通。从节点发起的连接，五次尝试用了 0.7 到 1.8 毫秒。复制 300 MiB 上传用了 3.9 秒，下载用了 4.5 秒，其中包含约 1 秒的客户端启动时间。这大约是每秒 100 MiB。

| 到 bucket 的路径 | 内存中的数据 | 同步挂起，中位数（范围） | 第一次响应 | 从请求到第一个 200，中位数（范围） |
|---|---|---|---|---|
| 明文 HTTP | 0 MiB | 0.49 秒（0.47 到 0.56） | 200 | 0.28 秒（0.26 到 0.30） |
| 明文 HTTP | 200 MiB | 3.07 秒（3.00 到 3.15） | 200 | 2.64 秒（2.63 到 2.68） |
| 明文 HTTP | 1,000 MiB | 13.10 秒（11.73 到 14.06） | 10.05 秒后 504，5/5 | 12.15 秒（11.44 到 12.45） |
| TLS | 0 MiB | 0.48 秒（0.46 到 0.52） | 200 | 0.26 秒（0.25 到 0.32） |
| TLS | 200 MiB | 4.96 秒（4.64 到 5.01） | 200 | 2.54 秒（2.48 到 2.61） |
| TLS | 1,000 MiB | 20.78 秒（20.12 到 22.35） | 504，5/5 | 12.45 秒（12.24 到 12.72） |
| 明文 HTTP，限速 100 Mbit/s | 200 MiB | 18.63 秒（18.42 到 18.90） | 504，5/5 | 18.06 秒（17.90 到 18.20） |
| 明文 HTTP，限速 20 Mbit/s | 200 MiB | 88.50 秒（88.32 到 88.55） | 504，5/5 | 87.80 秒（87.79 到 87.86） |
| 明文 HTTP，附加 100 ms | 0 MiB | 1.54 秒（1.35 到 1.79） | 200 | 1.98 秒（1.46 到 2.15） |
| 明文 HTTP，附加 100 ms | 200 MiB | 107.4 秒（106.8 到 107.6） | 504，5/5 | 55.1 秒（54.7 到 55.2） |
| 明文 HTTP，附加 100 ms | 1,000 MiB，1 个周期 | 424.2 秒 | 504 | 213.4 秒 |

从表里能读出四个结果。

- **另一台机器比另一个容器代价更高。** 不做任何整形时，200 MiB 的恢复用了 2.64 秒，bucket 在同一台客户机上时是 1.08 秒。1,000 MiB 用了 12.15 秒，对比 4.79 秒。
- **恢复超过 10 秒，会先返回 504。** 这 51 个周期里有 26 个，第一次响应是 10.05 秒后的 504。恢复仍在继续，之后的请求返回了 200 和状态。[第 4.4 节](#s-request-parking)解释了这个限制。
- **快照变大以后，带宽决定时间。** 在 20 Mbit/s 下，200 MiB 每个方向用了 88 秒，接近大小除以速率的结果。
- **只要数据还在传输，同步挂起就没有固定上限。** 有一次挂起运行了 424 秒，并且成功了。

不要把 100 毫秒的那几行当成真实链路的结果。在这条路径上，同样的 300 MiB 复制，加了延迟之后每个方向用了 55 秒，大约是每秒 5.5 MiB。用户态网络把每个连接交给宿主机上的一个进程转发，延迟使它的速率下降了约 18 倍。我们没有测过真实的 100 毫秒链路，所以给不出它的数字。

**我们测得**前一次运行缺失的两个单元格，方法与那次运行相同，各跑五个周期。bucket 在同一台客户机的容器里，附加 100 毫秒。200 MiB 时，同步挂起的中位数是 7.17 秒（5.26 到 8.43），请求到第一个 200 用了 8.74 秒（6.98 到 12.83）。1,000 MiB 时，挂起用了 14.17 秒（12.89 到 14.66），请求用了 16.16 秒（16.05 到 16.47）。这十个请求里有六个先得到 504。

所以同样的 200 MiB、同样的延迟，在一条路径上用了 8.74 秒，在另一条上用了 55.1 秒。

### 到 bucket 的 TLS {#s-postgres-and-the-object-store-tls-to-the-bucket}

Substrate v1.0.0 没有为 bucket 的 CA 提供安装设置。**代码**用 AWS SDK 的默认配置来构建对象存储插件的客户端 {{code}}。该 SDK 会读取变量 `AWS_CA_BUNDLE`。所以我们用一个补丁给插件提供了 CA。

```listing
title: 给对象存储插件提供 CA 的补丁
source: capture/lab/X-remote-store-pg/_scripts/x1-store.sh
lang: bash
note: 运行脚本中的四行。省略了一行，补丁那行从中间截断。补丁给插件容器加了一个卷、一个挂载和一个变量。
---
  kc -n ate-system create configmap x-store-ca --from-file=ca.crt=$HOME/x/tls/ca.crt --dry-run=client -o yaml | kc apply -f - >> 11-patches.log 2>&1
  for w in ds/atelet deploy/ate-api-server; do
    i=$(idx $w objectstore-plugin initContainers)
…
    kc -n ate-system patch $w --type=json -p "[{\"op\":\"add\",\"path\":\"/spec/template/spec/volumes/-\",\"value\":{\"name\":\"x-store-ca\",\"configMap\":{\"name\":\"x-store-ca\"}}},…{\"op\":\"add\",\"path\":\"/spec/template/spec/initContainers/$i/env/-\",\"value\":{\"name\":\"AWS_CA_BUNDLE\",\"value\":\"/x-store-ca/ca.crt\"}}]" >> 11-patches.log 2>&1
```

脚本里的 `kc` 是带着集群 kubeconfig 的 `kubectl`。插件同时运行在 `atelet` 和 `ate-api-server` 里，所以补丁要打到两处。

**我们测得**同一台客户机上的结果。带 CA 的客户端完成了 TLS 1.3 握手，没有 CA 的 `curl` 以退出码 60 停止。从表里看，TLS 只在挂起上增加了时间。200 MiB 的挂起用了 4.96 秒，对比 3.07 秒，1,000 MiB 的用了 20.78 秒，对比 13.10 秒。恢复时间仍在明文路径的范围之内。

**我们的判断：** 把这个补丁当作你自己的改动，每次 `ate-setup deploy` 和每次升级之后都要检查。安装器不认识这个变量，所以新的部署可能写出不带它的容器。

## 后续内容 {#s-postgres-and-the-object-store-coming-next}

我们的对象存储在每次运行中都是 rustfs。它先后运行在集群里、同一台客户机的容器里，以及同一台服务器的另一台客户机上。我们的外部 Postgres 运行在同一台客户机和另一台客户机上。下一版会加入 Google Cloud Storage、Amazon S3，以及延迟 100 毫秒的真实链路。还会加入托管数据库、Postgres 恢复和 bucket 恢复。完整清单见[下一版将补充](#s-next-edition)。

在做完这些运行之前，我们不提供经过测试的备份流程。同一时钟时刻的两份备份不是一份一致的备份。两者之间发生的挂起或删除，会让行和对象彼此错位。

```takeaways
- 用 `kubectl ate get actor` 列出 actor，因为 Kubernetes 里没有 actor 对象。
- 一起备份 Postgres 和 bucket，也一起恢复。
- 在有人依赖集群之前，替换内置的单副本 Postgres。
- 在 bucket 里找快照时，从 `snapshotUri` 读出 atespace 和 actor uid。
- 按 30 分钟内会在该节点挂起的所有 actor 的内存来估算节点磁盘。
- 准备外部 Postgres 时，在一个事务里运行 `setup.sql`。
- 承诺恢复时间之前，先测量从节点到 bucket 的往返。
- 从远端 bucket 恢复收到 504 后，重发请求，不要发送 revert。
- 用 `AWS_CA_BUNDLE` 给对象存储插件提供 CA，因为安装没有这个设置。
```

来源：capture/lab/summary/external-postgres-x86.json, capture/lab/summary/object-store-x86.json, capture/lab/U-pg-upgrade-scale/10-extpg-install/steps.tsv, capture/lab/U-pg-upgrade-scale/10-extpg-install/20-pg-setup-attempt2-no-transaction.log, capture/lab/U-pg-upgrade-scale/10-extpg-install/20-pg-setup.log, capture/lab/U-pg-upgrade-scale/10-extpg-install/29-deploy-diff.txt, capture/lab/U-pg-upgrade-scale/10-extpg-install/31-api-server-log-db-not-provisioned.txt, capture/lab/U-pg-upgrade-scale/10-extpg-install/30-deploy-attempt2-db-not-provisioned.log, capture/lab/U-pg-upgrade-scale/10-extpg-install/41-ate-system-objects.txt, capture/lab/U-pg-upgrade-scale/10-extpg-install/43-pg-connections-and-tables.txt, capture/lab/T-drain-store/90-store-cycles.tsv, capture/lab/T-drain-store/83-netem-rtt.txt, capture/lab/T-drain-store/82-atelet-args-patched.txt, capture/lab/summary/validation-memory-x86.json, capture/lab/summary/validation-fidelity-x86.json, capture/lab/A-quickstart/60-state.log, capture/lab/B-lifecycle/23-actor-after-sync-suspend.yaml, capture/lab/C-resume-vs-size/20-storage-footprint.txt, capture/lab/C-resume-vs-size/23-storage-after-delete.txt, capture/lab/summary/footprint-x86.json, capture/lab/K-kagent/inventory/workloads.txt (the PostgreSQL Deployment); go/core/pkg/install/bundled_postgres.yaml at kagent v1.0.0 (the trust setting); cmd/ateapi/main.go (the Postgres flags), docs/dev/cloud-sql-scaling-guide.md and issue #3702 (the load report); cmd/ateapi/internal/store/atepg/migrations/000001_initial.sql (the tables), cmd/ateapi/internal/store/atepg/lease.go (the lease), manifests/ate-install/postgres/postgres.yaml (replicas, image, volume claim), manifests/ate-install/ate-api-server.yaml (replicas) and manifests/ate-install/kind/ at v1.0.0; docs/guides/postgres.md, docs/guides/node-storage.md and docs/reference/api-guide.md (snapshot layout, delete order) at v1.0.0; issue #3101 (disk pressure from node-local snapshots)., capture/lab/summary/remote-store-x86.json, capture/lab/summary/remote-postgres-x86.json, capture/lab/X-remote-store-pg/22-store-cycles.tsv, capture/lab/X-remote-store-pg/13-path.txt, capture/lab/X-remote-store-pg/19-tls-store-check.txt, capture/lab/X-remote-store-pg/_scripts/x1-store.sh, capture/lab/X-remote-store-pg/40-pg-install/steps.tsv, capture/lab/X-remote-store-pg/40-pg-install/30-pg-setup.log, capture/lab/X-remote-store-pg/40-pg-install/10-pg-reach.txt, capture/lab/X-remote-store-pg/40-pg-install/51-ate-system-objects.txt, capture/lab/X-remote-store-pg/50-pg-tests/05-pg-round-trip.txt, capture/lab/X-remote-store-pg/50-pg-tests/11-cycles-delay0.tsv, capture/lab/X-remote-store-pg/50-pg-tests/11-cycles-delay20.tsv, capture/lab/X-remote-store-pg/50-pg-tests/12-running-requests-delay0.tsv, capture/lab/X-remote-store-pg/50-pg-tests/12-running-requests-delay20.tsv
