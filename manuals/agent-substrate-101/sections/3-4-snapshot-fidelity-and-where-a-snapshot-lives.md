# 快照保真度，以及快照存在哪里

> 快照只保留其保真度所指明的内容，大小取决于存有数据的内存，而且在头五分钟里只存在于一个节点上。

你的 agent 往 `/tmp` 写了一个文件，启动了一个后台进程，然后结束了这一轮。下一轮开始时，文件不见了，进程也不存在。没有任何东西失败。模板要求的是仅文件快照，而 `/tmp` 不在这些文件之内。节点上还有第二个意外：你一分钟前生成的快照，此时还没有进入对象存储。

读完本节，你能为模板选定保真度，并估算挂起的 actor 需要多少磁盘。你还能说出挂起之后每一分钟快照所在的位置。

## 三种保真度 {#s-snapshot-fidelity-and-where-a-snapshot-lives-three-fidelities}

**快照保真度（snapshot fidelity）：** 快照所包含的状态层的集合。模板在 `snapshotConfig.preferredFidelity` 中写出它想要的最高级别，每个级别都包含比它低的所有级别 {{code}}。

| 保真度 | 快照包含 | 恢复时 |
|---|---|---|
| `SNAPSHOT_FIDELITY_VOLUMES` | `durableDir` 卷 | 按镜像启动容器，卷的内容回到原处 |
| `SNAPSHOT_FIDELITY_ROOTFS` | 卷，以及启动后对根文件系统的写入 | 按镜像启动容器，这些写入回到原处 |
| `SNAPSHOT_FIDELITY_MEMORY` | 卷、根文件系统的写入，以及进程内存 | 继续运行同一批进程 |

kagent 使用第一个级别。它的模板在 `/data` 挂载一个 `durableDir` 卷，并设置 `SNAPSHOT_FIDELITY_VOLUMES`。在一个会话的第一轮里，我们让 agent 往三个位置写入内容，并启动一个进程。

```listing
title: 第 1 轮写入了什么
source: capture/lab/K-kagent/session1/turn1.txt
lang: text
note: 文件的第一行。命令末尾只打印数值的部分已截去。
---
RUN: mkdir -p /data/workspace && echo hello-from-turn1 > /data/workspace/note.txt; echo scratch-turn1 > /tmp/scratch.txt; echo rootfs-turn1 > /root-marker.txt 2>/dev/null; (nohup sleep 100000 >/dev/null 2>&1 &) ;…
```

kagent 在这一轮之后挂起了 actor。第二轮读取同样的几个位置。

```listing
title: 第 2 轮读到了什么
source: capture/lab/K-kagent/session1/turn2.out
lang: text
note: 文件的前四行。
---
note=hello-from-turn1
scratch=cat: can't open '/tmp/scratch.txt': No such file or directory
bg=
uptime=0.74
```

`/data` 下的笔记还在。`/tmp` 里的文件没了，`sleep` 进程没了，沙箱才启动 0.74 秒。第 1 轮对 `/` 的写入失败了，因为 harness 不以 root 运行。

另一端是 `SNAPSHOT_FIDELITY_MEMORY`，我们的计数器和内存测试用的就是它。为了比较三个级别，我们在每个级别下各跑一个 actor。这个 actor 持有 50 MiB 随机字节，并启动一个子进程。它在内存里记一个计数，在根文件系统的文件里记一个，在 `durableDir` 卷的文件里再记一个。

| 保真度 | 内存计数 | 根文件系统计数 | 卷计数 | 恢复后的进程 | 节点上的快照 | 恢复，10 次的中位数 |
|---|---|---|---|---|---|---|
| `SNAPSHOT_FIDELITY_VOLUMES` | 回到 1 | 回到 1 | 继续到 25 | 新进程，已运行 0.2 到 0.4 秒 | 44 KiB | 0.52 秒 |
| `SNAPSHOT_FIDELITY_ROOTFS` | 回到 1 | 继续到 25 | 继续到 25 | 新进程，已运行 0.2 到 0.3 秒 | 72 KiB | 0.50 秒 |
| `SNAPSHOT_FIDELITY_MEMORY` | 继续到 25 | 继续到 25 | 继续到 25 | 原进程，子进程也是原来的 | 56.9 MiB | 0.25 秒 |

**我们测得**这三个 actor 运行在 x86 服务器客户机上（24 vCPU、47 GB、嵌套 KVM），使用 gVisor，每个级别一个 actor。每个 actor 收到 25 个请求，期间挂起 13 次，75 个请求全部返回 200。“恢复”一列是对已挂起 actor 发出的单次请求，快照在节点上，在客户端计时。异步挂起在两个较低级别的中位数是 0.32 秒，在内存级别是 0.54 秒，各 10 次挂起。

较低两个级别的恢复，相当于容器的一次冷启动。快照只有几 KiB，所以代价就是你的应用的启动时间。我们的 Go actor 启动要 0.3 秒，它的恢复用了 0.5 秒，是内存级别恢复的两倍。kagent 的运行在另一台 x86 服务器客户机上（16 vCPU、31 GB）。在那里，harness 镜像在 `SNAPSHOT_FIDELITY_VOLUMES` 下的恢复中位数是 0.38 秒。

Python agent 启动更慢。我们在同一台客户机上第 9 部分示例所用的集群里跑了一个，每个级别跑三轮。挂起之后的一轮，在 `SNAPSHOT_FIDELITY_VOLUMES` 下用了 4.5 到 5.1 秒，在 `SNAPSHOT_FIDELITY_MEMORY` 下用了 0.30 到 0.32 秒。[有状态 agent actor](#s-a-stateful-agent-actor)展示了这次运行。

```figure
id: fig-3-4b
kind: comparison
title: 各保真度保留什么
claim: 只有 SNAPSHOT_FIDELITY_MEMORY 保留进程，较低的两个级别在每次恢复时都启动新进程。
caption: 每一列从上往下读。青色的层在快照里，灰色的层在挂起时丢失。最后几行给出每个级别的恢复中位数，以及一个 actor 的三个计数，数据测自 x86 服务器客户机。来源：capture/lab/summary/validation-fidelity-x86.json。
```

`preferredFidelity` 是上限，内存快照恢复时可能降级。内存快照会记录生成它的 worker 的 CPU 架构、CPU 特性和沙箱构建版本，只能在匹配的 worker 上恢复。如果没有匹配的 worker 有空位，Substrate 会在另一个 worker 上恢复文件，并重新启动进程 {{docs}}。我们在所有运行中都没有见到这种降级。请确保你的 actor 能经得起从文件重新启动，哪怕设置了内存级别也一样。

## 快照的大小取决于存有数据的内存 {#s-snapshot-fidelity-and-where-a-snapshot-lives-a-snapshot-is-as-large-as-the-memory-that-holds-data}

先看最坏情况：内存全是随机字节的 actor。

| actor 持有的内存 | 节点上的快照 |
|---|---|
| 0 MiB | 1.3 MiB |
| 50 MiB | 51.7 MiB |
| 200 MiB | 201.9 MiB |
| 500 MiB | 502.2 MiB |
| 1,000 MiB | 1,002.7 MiB |

几乎全部内容都在一个文件里。

```listing
title: 200 MiB actor 的快照中最大的文件
source: capture/lab/C-resume-vs-size/snapdir-b200-1.txt
lang: text
note: 文件的最后一行。第一个数字是以字节计的大小，检查点文件夹的名字已截去。
---
211574784 /var/lib/ate/snapshots/a77c2723-c524-46d0-9a7e-caa97f36ab9c/local-checkpoint/…/pages.img
```

**我们测得**这些大小，用的是 x86 服务器客户机上 kind 节点里的 `du`，每个大小一个 actor。内存是随机字节。actor 的快照文件夹以 actor 的 uid 命名。

随机字节是这个大小的 actor 能有的最大快照。我们又用全零字节、以及一半零一半随机字节，把同一个 actor 各跑了一遍。

```figure
id: fig-3-4d
kind: chart
title: 三种内存在节点上的快照大小
claim: 持有 500 MiB 零字节的 actor，快照是 4.6 MiB，同一个 actor 持有随机字节时是 504.1 MiB。
caption: 每个点是一个 actor 在节点上的快照，每条线连接同一种内存的两个大小。虚线标出与所持内存一样大的快照。紫色文字是从节点恢复十次的中位数。数据测自 x86 服务器客户机。来源：capture/lab/summary/validation-memory-x86.json。
```

| actor 持有的内存 | 节点上的快照 | 对象存储中的副本 | 从节点恢复，中位数 | 异步挂起，中位数 |
|---|---|---|---|---|
| 200 MiB 零字节 | 4.0 MiB | 1.1 MiB | 0.24 秒 | 0.35 秒 |
| 500 MiB 零字节 | 4.6 MiB | 1.1 MiB | 0.23 秒 | 0.35 秒 |
| 200 MiB，一半零一半随机 | 103.8 MiB | 101.1 MiB | 0.28 秒 | 0.66 秒 |
| 500 MiB，一半零一半随机 | 254.4 MiB | 251.2 MiB | 0.57 秒 | 0.79 秒 |
| 200 MiB 随机字节 | 203.8 MiB | 201.2 MiB | 0.42 秒 | 0.80 秒 |
| 500 MiB 随机字节 | 504.1 MiB | 501.3 MiB | 1.07 秒 | 1.07 秒 |

**我们测得**六个 actor，运行在 x86 服务器客户机上（24 vCPU、47 GB、嵌套 KVM），每行一个。每个 actor 恢复 10 次、异步挂起 10 次。60 次恢复全部返回 200，所有计数都继续了。每个大小都是对节点和对象存储数据文件夹各做一次 `du` 的读数。

所以快照大小跟着存有数据的内存走，恢复时间跟着同样的字节数走。500 MiB 零页的 actor 恢复用了 0.23 秒，和什么都不持有的 actor 一样快。不要指望真实的堆也能这样。一个 Python 进程里有一个含一百万个随机值的 dict，报告的峰值是 245 MiB，它在节点上的快照是 215.2 MiB。它的恢复时间见[第 3.3 节](#s-suspendactor-and-resumeactor)。

对象存储没有让随机字节的快照变小。Substrate 在上传前会压缩每个对象 {{code}}，而随机字节无法压缩。那个 Python actor 的副本在对象存储里是 110.1 MiB，约为节点副本的一半。我们还没查出是哪一步让它变小的，这项调查留待下一版。

| 位置 | 25 个挂起的 actor 时 | 删除它们之后 |
|---|---|---|
| 节点上的快照 | 8,801 MiB | 1 MiB |
| 节点上的快照缓存 | 1,765 MiB | 1,765 MiB |
| 对象存储 | 10,824 MiB | 2,064 MiB |

**我们测得**这份占用，运行在 x86 服务器客户机上（24 vCPU、47 GB、嵌套 KVM）。节点上有五种大小，每种五个 actor，合计持有 8,750 MiB。每个 actor 创建于 3 到 8 分钟前。留在对象存储里的 2,064 MiB 属于黄金快照。模板会保留它的黄金快照，直到你删除这个模板。

```figure
id: fig-3-4c
kind: chart
title: 25 个挂起 actor 的磁盘占用，以及删除之后
claim: 25 个挂起的 actor 持有 8,750 MiB 内存，在节点上占用 8,801 MiB，在对象存储中占用 10,824 MiB。
caption: 每一对柱子是一个位置。实心柱是 25 个挂起 actor 时的大小，描边柱是删除它们之后的大小。虚线标出这些 actor 合计持有的内存。数据测自 x86 服务器客户机。来源：capture/lab/summary/footprint-x86.json。
```

一个 actor 在对象存储里拥有一份快照，异步挂起之后是两份。同步挂起会删除更早的快照。异步挂起会保留它，因为新快照尚未持久化。新快照持久化之后的下一次挂起会删除旧快照，删除 actor 则两份都会清除 {{docs}}。

所以，对象存储要按全部挂起 actor 中存有数据的内存的最多两倍来规划。每个模板再加一份黄金快照。节点磁盘按最近 30 分钟内挂起的 actor 来规划，再加上快照缓存：这里删除全部 25 个 actor 之后，缓存里仍有 1,765 MiB。

## 两个计时器决定快照在哪里 {#s-snapshot-fidelity-and-where-a-snapshot-lives-two-timers-decide-where-the-snapshot-is}

**节点本地快照（node-local snapshot）：** worker 在挂起时写到所在节点磁盘上的副本，归 atelet 所有。

**持久快照（durable snapshot）：** 对象存储中的副本。上传完成之前，它的状态是 `SNAPSHOT_STORAGE_STATE_PENDING`，完成之后是 `SNAPSHOT_STORAGE_STATE_COMPLETED`。

异步挂起之后，atelet 为每个快照运行两个计时器 {{code}}。

- `--snapshot-upload-delay`，默认 5 分钟：上传到对象存储之前的等待时间。
- `--snapshot-detach-delay`，默认 30 分钟：atelet 删除节点上的副本并清除 actor 的节点指派之前的时间。

我们挂起了五个 actor，每 10 秒读一次状态，共读了 42 分钟。第五个 actor 是 1,000 MiB，因为 worker 池没有空位，它始终没有分到 worker。它没有生成自己的快照，所以下面的数字只针对四个 actor。

```listing
title: 挂起五分钟后的上传
source: capture/lab/D-durability/10-watch-part1.tsv
lang: text
note: actor d0 的三行。每行中的第一个快照，即黄金快照，已截去。
---
2026-11-12T10:31:10.270Z	d0	suspended-async	ACTOR_STATE_SUSPENDED	kind-control-plane	…SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_PENDING:gen2:kind-control-plane
…
2026-11-12T10:36:01.379Z	d0	state	ACTOR_STATE_SUSPENDED	kind-control-plane	…SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_PENDING:gen2:kind-control-plane
2026-11-12T10:36:12.367Z	d0	state	ACTOR_STATE_SUSPENDED	kind-control-plane	…SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:kind-control-plane
```

```listing
title: 挂起三十分钟后的分离
source: capture/lab/D-durability/10-watch-part2.tsv
lang: text
note: actor d0 的两行。第五列和快照末尾的节点名变成了短横线。
---
2026-11-12T11:01:02.649Z	d0	state	ACTOR_STATE_SUSPENDED	kind-control-plane	…SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:kind-control-plane
2026-11-12T11:01:13.670Z	d0	state	ACTOR_STATE_SUSPENDED	-	…SNAPSHOT_OWNER_ACTOR:SNAPSHOT_STORAGE_STATE_COMPLETED:gen2:-
```

**我们测得**四个 actor，运行在 x86 服务器客户机上（24 vCPU、47 GB、嵌套 KVM），使用默认计时器。它们分别持有 0、50、200 和 500 MiB。上传在挂起后 301 到 311 秒完成。节点副本在挂起后 1,801 到 1,803 秒消失。那一刻，节点上的快照从 758 MiB 缩到 1 MiB。每个时间最多可能晚 10 秒，因为这是我们的采样间隔。

```figure
id: fig-3-4
kind: timeline
title: 异步挂起之后快照在哪里
claim: 异步挂起之后的头五分钟里，新快照的唯一副本在一个节点上。
caption: 每一行是一个 actor，标注它的内存（MiB）。玫瑰色是只有一份副本的时间，紫色是有两份的时间，青色是只剩对象存储副本的时间。琥珀色圆点是结束我们观察的那次恢复，标注客户端测得的时间。行下方的圆点是节点磁盘上快照的大小。来源：capture/lab/summary/timers-x86.json、capture/lab/summary/resume-x86.json。
```

这三个时期对你意味着三件不同的事。

1. 头 5 分钟，节点持有唯一的副本。如果这份副本丢了，actor 就是 `ACTOR_STATE_CRASHED`，最后一个持久快照之后的工作也随之消失。[第 3.5 节](#s-crashed-and-revertactor)展示了这种丢失。
2. 5 到 30 分钟，两份副本都在。恢复使用节点上的副本，走[第 3.3 节](#s-suspendactor-and-resumeactor)中较低的那条线。
3. 30 分钟之后，只有对象存储有这个快照。恢复要先下载，每 MiB 用时约为前者的两倍。这个数字对应集群内的 bucket，[第 8.1 节](#s-postgres-and-the-object-store)展示了一个相距 20 ms 的 bucket。

文档既不承诺上传何时开始，也不承诺何时结束 {{docs}}。请把 5 分钟当作最短的暴露时间，而不是上限。

我们的判断：对重要的状态，不要容忍第一个窗口期。同步挂起能对单个 actor 消除这个窗口期。在 atelet 上设置更短的 `--snapshot-upload-delay`，能为整个集群缩短这个窗口期，但无法消除它。我们在一次测试里让 atelet 使用 3 秒和 10 秒，该测试的 55 个请求全部成功。分离延迟设短能节省节点磁盘，代价是每次恢复都变成下载。

## 标签是不依赖节点的副本 {#s-snapshot-fidelity-and-where-a-snapshot-lives-a-tag-is-a-copy-that-does-not-depend-on-the-node}

**标签（tag）：** 挂起 actor 的持久快照的一份具名副本。`kubectl ate create tag <name> --actor <actor>` 会创建一个。如果快照还没上传，这个调用会先上传 {{code}}。`kubectl ate create actor <new> --tag <name>` 会创建一个从该副本启动的新 actor。

标签在对象存储里有自己的对象，位于 atespace 之下、actor 的文件夹之外。所以它不需要 actor 所在的节点，actor 继续运行也不会改变它。因此，标签是将 actor 状态从已停止节点上迁出的唯一办法。

```listing
title: 一个 atespace 的标签
source: capture/lab/P-node-loss/86-tags.txt
lang: text
note: 完整的文件。前两个标签是两个模板的黄金标签，其余三个是我们为两个 actor 创建的标签。
---
ATESPACE   NAME                                   SCOPE                 STATE   SNAPSHOT                                                                       FIDELITY                   AGE
lab-n      09fee120-cd19-4121-8bae-5623fcbe70eb   TAG_SCOPE_PUBLISHED   Ready   gs://ate-snapshots/atespaces/lab-n/tags/1010ca2e-25b0-44d6-864f-a31a80da48c2   SNAPSHOT_FIDELITY_MEMORY   147m
lab-n      d8328610-2fdb-4974-a6ab-7c8671586d37   TAG_SCOPE_PUBLISHED   Ready   gs://ate-snapshots/atespaces/lab-n/tags/8d60620d-653e-469f-9dd1-9f11a89ce7e0   SNAPSHOT_FIDELITY_MEMORY   147m
lab-n      keep-t1                                TAG_SCOPE_ATESPACE    Ready   gs://ate-snapshots/atespaces/lab-n/tags/aca8c8e0-6dfd-4ee5-9e55-ced17f7c346e   SNAPSHOT_FIDELITY_MEMORY   12m
lab-n      keep-u1                                TAG_SCOPE_ATESPACE    Ready   gs://ate-snapshots/atespaces/lab-n/tags/13e4dabd-ad64-417f-95a5-ec1d5909c786   SNAPSHOT_FIDELITY_MEMORY   72s
lab-n      pend-u1                                TAG_SCOPE_ATESPACE    Ready   gs://ate-snapshots/atespaces/lab-n/tags/cfefcc57-5a75-418c-ae29-424958706266   SNAPSHOT_FIDELITY_MEMORY   69s
```

**我们测得**节点停止场景中的三个标签，运行在另一台 x86 服务器客户机上（16 vCPU、23 GB），每种情况跑一次。用 `--mode sync` 挂起的 actor，它的标签在不到 1 秒内就是 `Ready`。最新快照在节点上仍是 `PENDING` 的 actor 也一样，而且标签里带着那份最新状态。然后我们停掉节点。从每个标签创建的新 actor，在 create 命令发出 1.2 秒后就在另一个节点上处理了第一个请求。这第一个请求用了 0.48 到 0.58 秒。

标签有三个限制。它只包含被复制的那次挂起时的状态，之后的工作不在其中。你从它创建的 actor 有新的名字。你也无法事后再做：对留在已停止节点上的 actor 执行 `create tag`，会失败并报 `must be ACTOR_STATE_SUSPENDED to be tagged`。[第 8.2 节](#s-when-a-dependency-is-down)在节点停止的应急手册里用到了标签。

### 不要删除黄金标签 {#s-snapshot-fidelity-and-where-a-snapshot-lives-do-not-delete-a-golden-tag}

模板的黄金标签就在同一个列表里。它的范围是 `TAG_SCOPE_PUBLISHED`，名字是一个 uid。`kubectl ate delete tag` 会接受它，我们自己的清理就犯了这个错：它删除了这个 atespace 的所有标签，两个模板的黄金标签也一起没了。

```listing
title: 黄金标签被删除之后的模板
source: capture/lab/P-node-loss/96-golden-tag-deleted.txt
lang: text
note: 文件的八行。创建两个新模板的几行已截去。
---
## get actor-templates
ATESPACE   NAME         GOLDEN TAG                             ERROR   AGE
lab-n      ballast-0    d8328610-2fdb-4974-a6ab-7c8671586d37           170m
lab-n      ballast-50   09fee120-cd19-4121-8bae-5623fcbe70eb           170m
## get tags
ATESPACE   NAME   SCOPE   STATE   SNAPSHOT   FIDELITY   AGE
## create actor from template ballast-50
Error: failed to create actor: rpc error: code = FailedPrecondition desc = Tag not found
…
```

这个模板看起来健康，其实已经坏了。`get actor-templates` 仍然列出旧的黄金标签 id，`ERROR` 列是空的。每次 `create actor --template` 都会以 `Tag not found` 失败。我们只见到一次，在同一台客户机上。我们新建了模板来继续测试。黄金标签能否恢复，是留给下一版的测试。

```takeaways
- 只有进程必须继续运行时，才选 SNAPSHOT_FIDELITY_MEMORY。
- 在两个较低级别下，把必须保留的文件放进 durableDir 卷。
- 写好 actor，让它能从文件启动，内存级别也一样。
- 按 actor 中存有数据的内存，规划节点磁盘和对象存储空间。
- 在两个较低级别下，预期每次恢复都要完整启动应用。
- 把 PENDING 快照当作一个节点上的唯一副本。
- 对不能丢的状态，调低 --snapshot-upload-delay，或用 --mode sync 挂起。
- 对必须能搬离节点的状态，为挂起的 actor 创建标签。
- 按名字删除标签，绝不删除模板所列出的 TAG_SCOPE_PUBLISHED 标签。
```

来源：capture/lab/summary/timers-x86.json, capture/lab/summary/footprint-x86.json, capture/lab/summary/validation-memory-x86.json, capture/lab/summary/validation-fidelity-x86.json, capture/lab/summary/demos-x86.json, capture/lab/summary/kagent-turns-x86.json, capture/lab/V-validation/01-compressible/10-compressible.tsv, capture/lab/V-validation/02-python-runtime/10-python.tsv, capture/lab/V-validation/04-fidelity/10-fidelity.tsv, capture/lab/D-durability/10-watch-part1.tsv, capture/lab/D-durability/10-watch-part2.tsv, capture/lab/D-durability/00-atelet-args.txt, capture/lab/C-resume-vs-size/20-storage-footprint.txt, capture/lab/C-resume-vs-size/23-storage-after-delete.txt, capture/lab/C-resume-vs-size/snapdir-b200-1.txt, capture/lab/C-resume-vs-size/31-atelet-args-patched.txt, capture/lab/C-resume-vs-size/32-object-store.tsv, capture/lab/K-kagent/session1/turn1.txt, capture/lab/K-kagent/session1/turn2.out, capture/lab/K-kagent/session1/actor-template.yaml, capture/lab/B-lifecycle/20-trace-ops.tsv, capture/lab/B-lifecycle/22-actor-after-async-suspend.yaml, capture/lab/P-node-loss/86-tags.txt, capture/lab/P-node-loss/80-tag-rescue.tsv, capture/lab/P-node-loss/85-tag-rescue-running-and-pending.tsv, capture/lab/P-node-loss/96-golden-tag-deleted.txt, capture/lab/summary/node-loss-x86.json. Agent Substrate v1.0.0: cmd/ateapi/internal/controlapi (CreateTag, DeleteTag), api/ateapi/v1/ateapi.proto (SnapshotFidelity, Snapshot, SnapshotStorageState), cmd/atelet/internal/snapshottracker/background.go (the two delays), internal/objectstoreplugin/node.go (compressed objects), docs/reference/api-guide.md (Snapshot Storage Layout, Snapshot lifetime, Eviction).
