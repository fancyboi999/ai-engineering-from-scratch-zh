# 来源

> 本手册按权威性给来源排序，我们自己的录制运行排在最前，本页列出每一类来源，以及各节从中取用的内容。

排序与[本手册如何编写](#s-ref-how-this-manual-was-made)一致。两个来源冲突时，以排名靠前的为准，并在对应章节里说明。所有来源都在 2026-11-12 读取或录制，距 Agent Substrate v1.0.0 发布一周。

## 来源排名 {#s-ref-sources-the-ranked-sources}

| 排名 | 来源 | 手册从中取用的内容 |
|---|---|---|
| 1 | 我们在四台机器的六个集群上录制的运行：五个运行 Agent Substrate v1.0.0，一个运行 kagent v1.0.0 的 Substrate 发行版。六个集群中有两个运行 agentgateway v1.7.0 | 每一份清单，以及每个以“我们测得”开头的段落里的每个数字 |
| 2 | 发布 tag v1.0.0 处的 Agent Substrate 源码 | 每个默认值、状态、标志和机制，以及各参考表 |
| 3 | 同一 tag 处的 Agent Substrate 文档 | 安装步骤、升级顺序，以及我们未实测的文档记载行为 |
| 4 | GitHub 上的 Agent Substrate issue 与 pull request | 已知故障、限制，以及某个功能的历史 |
| 5 | tag v1.0.0 处的 kagent 源码 | 会话如何变成 actor，以及 kagent 写入的出站策略 |
| 6 | tag v1.7.0 处的 agentgateway 源码 | agentgateway 数据平面的 Substrate 策略 |
| 7 | 某一提交处的 Agent Executor 代码与文档，先在无模型环境下构建运行，再配合 CPU 上的小型开源模型运行 | [7.5](#s-agent-executor)中任务如何变成 actor |

我们有意让运行排在源码之上。源码说明系统被设计成做什么。运行说明它在真实集群上实际做了什么，用的是发布版的计时器、镜像和安装器。运行与文档矛盾时，章节会同时报告两者。

## 第 1 级：我们的录制运行 {#s-ref-sources-rank-1-our-recorded-runs}

共 24 个实验，脚本和原始输出都在[捕获目录](manuals/agent-substrate-101/capture/lab)里。[本手册如何编写](#s-ref-how-this-manual-was-made)描述了机器和方法。

| 实验 | 录制的内容 | 用于 |
|---|---|---|
| A，从源码跑快速上手 | 每个安装步骤及其秒数，以及 buildx 失败 | 第 2 部分、[8.3](#s-symptom-cause-fix) |
| B，生命周期 | 900 秒无请求，然后挂起、恢复、崩溃和回退 | 第 1 部分、第 3 部分 |
| C，恢复与内存 | 持有 0 到 1,000 MiB 的 actor 从节点和从 bucket 恢复、挂起的时间，以及磁盘用量 | 第 3 部分、[8.1](#s-postgres-and-the-object-store) |
| D，持久性 | 快照计时、丢失的节点副本、一次 `atelet` 重启和一次节点重启 | 第 3 部分、[8.2](#s-when-a-dependency-is-down) |
| E，依赖丢失 | Postgres、`ate-api-server` 和 Kubernetes API server 不可用期间，每秒发一个请求 | [1.2](#s-one-request-from-client-to-actor)、[8.2](#s-when-a-dependency-is-down) |
| F，出站 | 两个数据平面上的默认拒绝、允许的主机、拦截、透传和凭据注入 | 第 6 部分 |
| G，数据平面 | 用发布镜像安装，以及 Envoy 与 agentgateway 的同一份清单 | 第 2 部分、第 6 部分、[7.2](#s-agentgateway) |
| I，容量 | 一个满载的池，以及请求暂存演示 | 第 4 部分 |
| J，进程在沙箱内死亡 | 一个自行退出的进程，和一个被内核因内存杀掉的进程 | [3.5](#s-crashed-and-revertactor)、[8.3](#s-symptom-cause-fix) |
| K，kagent | 文档中的 kagent 安装、98 个轮次、并行轮次，以及仅文件快照保留的内容 | [7.1](#s-kagent-on-substrate) |
| L，缺口补测 | 第一台客户机上的 microVM 类别，第二台客户机（16 vCPU、23 GB）上有两个 worker 节点的集群里的节点停机，以及节点重启后的 worker 恢复 | [4.2](#s-sandbox-classes)、[4.3](#s-placement)、[3.5](#s-crashed-and-revertactor)、[8.2](#s-when-a-dependency-is-down) |
| M，Apple silicon | 用发布镜像安装，以及笔记本上三种规格的 actor | 第 2 部分、第 3 部分 |
| N，示例 | 空闲挂起器、有状态 agent、工具沙箱和故障演练，在第二台客户机（16 vCPU、31 GB）上各自的安装里运行 | 第 9 部分 |
| P，节点停机 | 在有两个 worker 节点的集群上的 13 个用例：停机期间和停机之后的回退、从标签救援、异步挂起的 actor、运行中的 actor，以及节点恢复 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives)、[3.5](#s-crashed-and-revertactor)、[4.3](#s-placement)、[8.2](#s-when-a-dependency-is-down) |
| Q，网络检查 | 在第二台客户机（16 vCPU、23 GB）上的八项检查：agentgateway 上的依赖丢失、规则移除后复用的连接、经 TLS 出站后面的模型网关、出站日志级别、作为切断手段的挂起、被修改的 Secret、router 端口和 CPU 限制 | [4.1](#s-workerpool)、第 6 部分、[7.2](#s-agentgateway)、[8.2](#s-when-a-dependency-is-down) |
| R，Agent Executor | 在 Agent Substrate v1.0.0 上安装 Agent Executor 的最新提交，它的每个对象对应什么、生命周期耗时，以及文档与实测不一致之处 | [7.5](#s-agent-executor) |
| S，真实模型 | 一个 CPU 上的小型开源模型，用它跑的 kagent 轮次，以及 Agent Executor 的五个后续实验：一次模型调用、示例 agent 镜像、一次成功的克隆、任务下的 worker 丢失，以及发布版 v0.3.1 | [7.1](#s-kagent-on-substrate)、[7.5](#s-agent-executor) |
| T，排空与集群外的 bucket | 对一个 worker 节点的五次排空，另一个节点已满时的节点停机，以及集群外的 bucket 在加入延迟和发生中断时的表现，在第二台客户机（16 vCPU、23 GB）上 | [4.3](#s-placement)、[8.1](#s-postgres-and-the-object-store)、[8.2](#s-when-a-dependency-is-down) |
| U，Postgres、升级与规模 | 使用集群外 Postgres 的安装及其中断，一次从 v1.0.0-rc.3 到 v1.0.0 的升级，以及在一个节点上最多 10,750 行 actor 记录下的突发恢复，在第一台客户机上 | [1.1](#s-what-substrate-does-and-what-it-leaves-to-you)、[4.5](#s-sizing-a-pool)、[8.1](#s-postgres-and-the-object-store)、[8.4](#s-upgrade-and-stale-advice) |
| X，另一台机器上的 bucket 与 Postgres | 带 TLS、带限速、带延迟的 bucket 循环，在持有数据的 actor 上经历的两次 bucket 中断，在第二台客户机上安装 Postgres，以及该数据库的两次中断，在第二台客户机（16 vCPU、23 GB）上 | [4.4](#s-request-parking)、[8.1](#s-postgres-and-the-object-store)、[8.2](#s-when-a-dependency-is-down)、[8.3](#s-symptom-cause-fix) |
| W，边界与未完成的命令 | 限定一个 kagent 轮次的两项设置，以及再次测试 Agent Executor：命令未完成时的 worker 丢失，工作区的技能与 MCP 服务器，带自有提示词和仓库的示例，以及克隆和 agent 镜像的第二次运行 | [7.1](#s-kagent-on-substrate)、[7.5](#s-agent-executor) |
| Y，二次运行、回滚与 v0.6.0 | 内置 Postgres 的三次中断，`ate-api-server` 和 Kubernetes API server 各一次中断，第二次从 v1.0.0-rc.3 到 v1.0.0 的升级及一次回滚，以及安装 v0.6.0 后的直接升级、重新安装和 Agent Executor v0.3.1，在第一台客户机上 | [4.3](#s-placement)、[7.5](#s-agent-executor)、[8.2](#s-when-a-dependency-is-down)、[8.4](#s-upgrade-and-stale-advice) |
| Z，单节点突发 | 一个以 50 为步长扩到 300 个 worker 的池，150、200 和 300 个恢复的突发，每个 worker 内的还原时间，每个组件的 CPU，以及 `ate-api-server` 和 router 的 1 到 4 个副本，在第一台客户机上 | [1.1](#s-what-substrate-does-and-what-it-leaves-to-you)、[4.5](#s-sizing-a-pool)、[8.2](#s-when-a-dependency-is-down)、[8.3](#s-symptom-cause-fix) |
| V，验证 | 在第一台客户机上的十二项检查：不保存数据的内存、Python 运行时、同一时刻的恢复、保真度、模板、访问策略、actor JWT、一个预览功能、一次进程退出，以及请求期间的挂起 | 第 3 部分、[4.4](#s-request-parking)、[4.5](#s-sizing-a-pool)、第 5 部分、[8.5](#s-limits-at-v1-0-0) |

## 第 2 级：源码 {#s-ref-sources-rank-2-the-code}

| 来源 | 用于 |
|---|---|
| Agent Substrate，tag `v1.0.0`，提交 `b34fbee742906494b5eb4f1f36987176bf8770a4`，2026-11-05 发布，[github.com/agent-substrate/substrate](https://github.com/agent-substrate/substrate) | 每一节 |
| 同一仓库的 tag `v0.1.0`，用于对比新旧说明 | [8.4](#s-upgrade-and-stale-advice) |
| kagent，tag `v1.0.0`，2026-11-09 发布，[github.com/kagent-dev/kagent](https://github.com/kagent-dev/kagent) | [7.1](#s-kagent-on-substrate)、[8.1](#s-postgres-and-the-object-store) |
| agentgateway，tag `v1.7.0`，[github.com/agentgateway/agentgateway](https://github.com/agentgateway/agentgateway) | [6.6](#s-the-dataplane-choice)、[7.2](#s-agentgateway) |

手册读得最多的是 Substrate 代码的七个部分。它们是 API 定义、API server 的生命周期工作流、`atelet` 的快照跟踪器，以及 router 的请求暂存代码。其余三个是数据库迁移、安装清单和命令行插件。手册源文件记录了每一节用到的文件，审计会检查这份记录。

## 第 3 级：tag 处的文档 {#s-ref-sources-rank-3-documentation-at-the-tag}

Agent Substrate 文档的这些页面按标题引用。我们重复的每一条陈述，都对照代码核对过，有运行的地方也对照运行核对过。

项目站点 ate.dev 在 1.0 版提供同样的页面。我们在 2026-11-12 读完站点全部 48 个页面，并把其中在 tag 处有对应文件的 38 个页面与该文件逐一比较。我们只发现渲染上的差异，例如链接文字和占位符，内容上没有差异。站点首页自成一个来源，因为它陈述结果时不带条件。[Substrate 做什么，又把什么留给你](#s-what-substrate-does-and-what-it-leaves-to-you)把这些陈述逐条与我们的运行放在一起对照。

| 页面 | 用于 |
|---|---|
| 快速上手 | 第 2 部分、[8.4](#s-upgrade-and-stale-advice) |
| 架构页 | 第 1 部分 |
| API 指南 | 第 3 部分、第 4 部分、[8.1](#s-postgres-and-the-object-store) |
| 资源模型与术语表 | 第 3 部分、[术语表](#s-ref-glossary) |
| 请求暂存页 | [4.4](#s-request-parking) |
| 沙箱类别页 | [4.2](#s-sandbox-classes) |
| 认证、授权和 actor JWT 的指南 | 第 5 部分 |
| 网络出站、信任包和凭据注入的指南 | 第 6 部分 |
| PostgreSQL 指南和节点存储指南 | [8.1](#s-postgres-and-the-object-store) |
| 升级手册和版本偏差策略 | [8.4](#s-upgrade-and-stale-advice) |
| 预览功能页 | [8.5](#s-limits-at-v1-0-0)、[标志参考](#s-ref-flags-and-gates) |
| actor JWT 的密钥轮换指南 | [8.5](#s-limits-at-v1-0-0) |
| 安装器命令参考和 operator 安装指南 | 第 2 部分、[标志参考](#s-ref-flags-and-gates) |
| `kubectl ate` 参考 | [2.2](#s-kubectl-ate)、[命令参考](#s-ref-kubectl-ate) |

这些页面中有三处陈述与发布版不符。快速上手说 Substrate 会挂起空闲的 actor，而我们的运行和代码都表明它不会。升级手册给出的示例版本并不存在。一个安装器标志的帮助文字说凭据提供方需要 Envoy，而该提供方在 agentgateway 上运行正常。

## 第 4 级：issue {#s-ref-sources-rank-4-issues}

issue 是用户和维护者提交的报告。我们只在 issue 能解释某个我们没有运行过的限制时才点名它，并在正文里说明。

| Issue | 报告的内容 | 用于 |
|---|---|---|
| [#3101](https://github.com/agent-substrate/substrate/issues/3101) | 节点本地快照写满了节点磁盘，kubelet 驱逐了 worker | [8.1](#s-postgres-and-the-object-store) |
| [#3775](https://github.com/agent-substrate/substrate/issues/3775)、[#2972](https://github.com/agent-substrate/substrate/issues/2972) | 在存活的沙箱里检测死亡进程的设计 | [8.5](#s-limits-at-v1-0-0) |
| [#3441](https://github.com/agent-substrate/substrate/issues/3441) | 为每个 actor 预留少于声明上限的资源的提议 | [8.5](#s-limits-at-v1-0-0) |
| [#3589](https://github.com/agent-substrate/substrate/issues/3589) | 入站授权对每个 atespace 都相同 | [8.5](#s-limits-at-v1-0-0) |
| [#3203](https://github.com/agent-substrate/substrate/issues/3203) | 支持其他存储后端的提议，维护者在发布前已拒绝 | [8.5](#s-limits-at-v1-0-0) |
| [#3602](https://github.com/agent-substrate/substrate/issues/3602) | 持久目录没有大小限制 | [8.5](#s-limits-at-v1-0-0) |
| [#3347](https://github.com/agent-substrate/substrate/issues/3347) | 名称复用并不安全 | [8.5](#s-limits-at-v1-0-0) |
| [#3285](https://github.com/agent-substrate/substrate/issues/3285) | 出站策略的变更不会关闭已打开的连接，我们的运行已证实这一点 | [6.6](#s-the-dataplane-choice)、[8.5](#s-limits-at-v1-0-0) |

其他章节还引用了更多 issue，各自在正文里点名。

图中的项目标志属于各自的所有者，我们只用它们来标识对应的项目。

来源：front.md; manual.json (sources and pin); the Sources line and the citations of every file under sections/; capture/README.md.
