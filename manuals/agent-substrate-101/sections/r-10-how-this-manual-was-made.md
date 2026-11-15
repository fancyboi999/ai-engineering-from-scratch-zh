# 本手册如何编写

> 本页记录了本手册每一项事实背后的版本、机器、实验方法与捕获套件，以及后续计划执行的运行。

## 版本 {#s-ref-how-this-manual-was-made-the-version}

本手册固定针对 Agent Substrate v1.0.0，发布于 2026-11-05，对应 commit `b34fbee742906494b5eb4f1f36987176bf8770a4`。集成章节固定采用 kagent v1.0.0 和 agentgateway v1.7.0。所有集群均在 kind v0.33.0 上运行 Kubernetes 1.37.0。我们在 2026-11-12 记录了运行结果并完成事实核验。

在 1.0.0 发布前的几周内，Agent Substrate 修改了安装器、API 名称以及状态定义。本手册的所有陈述仅适用于 v1.0.0。[第 8.4 节](#s-upgrade-and-stale-advice)列出了早期文档中的差异。

## 四类证据 {#s-ref-how-this-manual-was-made-four-kinds-of-evidence}

每项事实带有四类标签之一，[来源页面](#s-ref-sources) 对它们进行了权威性排序。

**我们测得：** 数值来自我们记录的某次运行。段落注明了机器和样本数。你可以重新运行脚本并进行对比。

**代码：** 默认值或机制来自发布标签对应的源码。我们只阅读了源码而未运行，除非同一段落中另有说明。

**文档：** 该陈述来自对应标签的项目文档。我们只将其用于本版尚未实测的路径，例如在 GKE 上的安装，正文对此会明确说明。

**Issue：** 用户或维护者在公开 issue 追踪器中报告了该行为。我们会指明 issue 编号，不将其作为自己的实测结果。

我们的实测排在首位。当实测结果与文档不一致时，手册如实报告实测结果并指出分歧。最明确的例子是空闲 actor。快速入门文档称 Substrate 会挂起空闲 actor，而我们的 actor 在 900 秒内的 60 次采样中，全部 60 次均显示为 RUNNING。

## 四个测试环境 {#s-ref-how-this-manual-was-made-the-four-test-beds}

| 手册中的名称 | 机器 | 上面运行了什么 |
|---|---|---|
| 一台 x86 服务器客户机（24 vCPU，47 GB，嵌套 KVM） | 共享 x86 服务器上的 KVM 客户机，Ubuntu 24.04，Docker 29.1.3，Go 1.27.3 | 从源码构建的 Agent Substrate、Envoy 数据平面、gVisor：实验 A、B、C、D、I、J 和 V。还有 microVM 类别以及实验 L 的第二次节点重启。最后是基于发布镜像新建的 kind 集群，用于实验 U、Y 和 Z，以及一个从 v0.6.0 源码构建用于实验 Y 的集群 |
| 第二台 x86 服务器客户机（16 vCPU，23 GB） | 同一台服务器上的客户机 | 基于发布镜像的 Agent Substrate、Envoy 以及后来的 agentgateway v1.7.0：实验 E、F 和 G。还有用于实验 L 的包含三个 kind 节点的第二个集群。之后在同一时间，三节点集群运行实验 P，单节点集群运行实验 Q。最后在三节点集群上运行实验 T |
| 另一台 x86 服务器客户机（16 vCPU，31 GB） | 同一台服务器上的客户机 | 两个集群依次运行。先是 kagent v1.0.0 配套其自身的 Substrate 发行版与模拟模型：实验 K。随后是基于发布镜像单独安装的 Agent Substrate（搭配 Envoy 数据平面），用于第 9 部分的四个示例：实验 N。接着在该第二个集群上运行某个 commit 的 Agent Executor：实验 R。最后在该客户机容器内仅用 CPU 运行小型开源模型，供两个集群上的 kagent 与 Agent Executor 调用：实验 S。重启客户机后，沿用相同的两个集群和相同的模型运行实验 W |
| Docker Desktop 下的 Apple 芯片笔记本电脑 | 分配给 Docker 10 个 CPU 和 8 GB 内存 | 基于发布镜像的 Agent Substrate，仅 gVisor：实验 M |

这四台是不同的机器。其中两台同为 16 vCPU，因此每个实测段落都会同时注明内存容量。绝不要将不同机器上的数值当作受控对比。

三个小节并排展示了两台机器上的数值。[第 2.1 节](#s-install-with-ate-setup) 给出了两次安装的数据。[第 8.2 节](#s-when-a-dependency-is-down) 和 [第 9.4 节](#s-a-failure-drill) 给出了两次 Postgres 恢复的数据。每个小节都指明了两台机器，并说明差异仅供参考。

## 实验方法 {#s-ref-how-this-manual-was-made-the-lab-method}

- **每条工作线使用独立的客户机。** 每条工作线拥有独立的虚拟机，使某条线中的破坏性测试不会影响另一条线的数值。宿主机本身未安装任何组件。
- **磁盘置于内存中。** 每台客户机都将其磁盘存放在服务器的内存里。磁盘写入速度远快于云盘卷，因此我们的挂起与上传耗时是真实磁盘耗时的下限。
- **单节点，仅有一处例外。** 除一个集群外，其余集群均只有一个 kind 节点。该例外集群包含一个控制平面节点和两个 worker 节点。它提供了[第 4.3 节](#s-placement)的放置与节点停机结果，以及[第 8.2 节](#s-when-a-dependency-is-down)的故障处理手册。
- **两项实验共享一台客户机。** 实验 P 和 Q 同时在同一台客户机上运行，各自运行在独立的集群上。CPU 是共享的，因此这些运行中几毫秒的差异应视为测量噪声。
- **同一台机器上的对象存储。** 快照存储到同一节点同一磁盘上的 rustfs 中。在实验 T 中，bucket 运行在集群外部同一台客户机上，带有模拟延迟。在实验 X 中，它运行在同一服务器的第二台客户机上。没有任何 bucket 部署在云端，两台客户机之间的通信路径也不是真实的物理网络链路。
- **两种安装路径。** 我们按照快速入门文档从源码安装了一次，并使用发布镜像在另一台客户机上安装了一次。这两种路径为我们带来了 buildx 失败记录以及 [第 2.1 节](#s-install-with-ate-setup) 的安装耗时。
- **模拟模型，随后是真实小型模型。** 在实验 K 中，集群内的一个小型服务器以固定响应应答每次模型调用。[第 7.1 节](#s-kagent-on-substrate)中这些轮次的耗时几乎不含模型推理时间。在实验 S 中，模型为 `qwen2.5`，这是一个 1 到 2 GB 的开源模型。它在 12 个 CPU 上运行，没有使用 GPU，速度为每秒 7 到 14 个 token。当时服务器的两张显卡正由另一个团队使用。GPU 上的模型或托管模型会带来不同的模型耗时。
- **客户端视角耗时。** 除非小节另有说明，耗时均为客户端观察到的耗时，通过 `kubectl ate proxy` 或集群内的 pod 测得。经由代理发起的热调用在第一台客户机上耗时 0.058 到 0.068 秒，这项开销已包含在每个代理数值中。
- **小样本。** 大多数数据点有 5 或 10 个样本，部分事件仅记录了一次。每个段落均给出了具体样本数。单次运行的结果应视为一次观察。

## 实验 {#s-ref-how-this-manual-was-made-the-experiments}

| 字母 | 问题 | 主要结果 |
|---|---|---|
| A | 源码快速入门能否按文档说明运行？ | 仅在安装 `docker-buildx` 后才能运行。system 步骤耗时 266 秒。 |
| B | Substrate 是否会挂起空闲 actor？挂起、恢复、崩溃与回退会返回什么？ | 不会挂起。各项操作见 [第 3.3 节](#s-suspendactor-and-resumeactor) 与 [第 3.5 节](#s-crashed-and-revertactor)。 |
| C | 恢复耗时如何随 actor 占用的内存增长？ | 从节点加载随机字节约为每 MiB 2 毫秒，从 bucket 加载耗时约翻倍。 |
| D | 快照何时安全？ | 当其持久副本显示为 `COMPLETED` 时，默认在挂起后约 5 分钟。单凭计时器不能作为证明。在此之前，丢失节点副本会在下一次请求时使 actor 崩溃。 |
| E | 依赖不可用时哪些请求会失败？ | 缺少 Postgres 或 `ate-api-server` 时所有请求都会失败。缺少 Kubernetes API server 时没有请求失败。 |
| F | 出站策略在两种数据平面上表现如何？ | 默认拒绝、拦截、透传与凭据注入在两者上均生效，错误文本不同。 |
| G | 两种数据平面有何差异？ | agentgateway 使用更少的容器和更少的内存，且将拦截密钥保存在数据平面容器中。 |
| I | worker 池占满时客户端会看到什么？ | 约 5 秒后返回 503，或若在此期间有 worker 腾出空间则正常响应。 |
| J | Substrate 能否感知沙箱内退出的进程？ | 因内存超限被杀在约 4 秒内感知。正常退出则始终不会感知，直到有组件调用挂起。 |
| K | kagent 1.0 如何使用 Substrate？ | 每个会话对应一个 actor，每轮次均执行恢复与挂起，98 轮中有 98 轮如此。 |
| L | microVM 类别与 gVisor 相比如何？两个 worker 节点中一个停止时会发生什么？节点重启后 worker 如何恢复？ | microVM 恢复耗时约为每 MiB 1 毫秒，gVisor 约为 2 毫秒。没有 actor 会自行离开已停止的节点。节点重启后，控制平面恢复之后的 10 到 30 秒内恢复请求会失败。 |
| M | v1.0.0 能否在 Apple 芯片上运行？ | 适用于 200 MiB 以内的 gVisor actor。无 KVM，因此不支持 microVM 类别。 |
| N | 第 9 部分的模式能否在基于发布镜像的新安装上运行？ | 运行了四个示例：空闲挂起器、有状态 agent、工具沙箱和故障演练。第 9.1 至 9.4 节对此进行了报告。 |
| P | 当 worker 节点停止并保持离线时，运维人员能做什么？ | 在 13 个用例中，没有任何 actor 自行离开节点。一次 `revert` 在一种情况下有所帮助，在其他情况下则使 actor 停留在 REVERTING。利用停机前打的标签在 1.2 秒内重建出可用 actor。故障处理手册见[第 8.2 节](#s-when-a-dependency-is-down)。 |
| Q | 关于网络与 CPU 限制的八项待核实陈述在实测中是否成立？ | 下方第二张表按行给出了结果。 |
| R | Agent Executor 能否像其文档所述那样在 Substrate v1.0.0 上运行？ | 某个 commit 安装后在无模型情况下运行了任务。无请求时任务保持 RUNNING 达 600 秒。任务尚无法绑定网关，因此工作区克隆失败。[第 7.5 节](#s-agent-executor) 对此进行了报告。 |
| S | 使用真实模型会发生什么变化，以及关于 Agent Executor 的五项待核实陈述在实测中是否成立？ | 在 CPU 上运行小型模型时，模型耗时约占 kagent 轮次的十分之九，50 轮中有 1 轮未结束。下方第三张表按行给出了 Agent Executor 各项结果。 |
| T | 排空（drain）、节点占满以及集群外部 bucket 对 actor 有何影响？ | 排空会使正在运行的 actor 崩溃，且不干扰已挂起的 actor。下方第四张表按行给出了结果。 |
| U | 集群外 Postgres、升级以及更大规模的 actor 数量能否按文档所述工作？ | 安装需要一处修复，升级使正在运行的 actor 崩溃，单节点每秒完成约 37 次恢复。下方第四张表给出了对应结果。 |
| V | 初稿中标记为未测试的十二项陈述在实测中是否成立？ | 下方第一张表按行给出了结果。 |
| W | kagent 轮次能否施加边界限制，以及关于 Agent Executor 的另外四项待核实陈述在实测中是否成立？ | ModelConfig 的两项设置可对轮次施加边界限制。下方第五张表按行给出了结果。 |
| X | 另一台机器上的 bucket 与 Postgres 开销如何，以及各依赖不可用时会发生什么？ | 超过 10 秒的恢复首先返回 504，后续请求成功。数据库故障后，一个正在运行的 actor 持续返回 504，直到 router 重启。下方第四张表给出了对应结果。 |
| Y | 故障与升级能否复现，以及回滚和从 v0.6.0 升级是否可行？ | 故障与升级均可复现，且回滚使升级时崩溃的同一 actor 再次崩溃。在 v0.6.0 上创建的内容均未保留。下方第六张表给出了对应结果。 |
| Z | 单节点上超过 150 次恢复的突发能否工作，是什么决定了速率？ | 单次并发最高达 300 次，速率为每秒 32 到 39 次。gVisor worker 内部的 restore 决定了速率，控制平面并非瓶颈。下方第七张表给出了对应结果。 |

表格中没有字母 H 和 O。H 是一项单独的检查，用于验证纯 `scratch` 镜像能否作为 actor 运行，我们没有使用字母 O。实验 L 弥补了早期运行中的三处空白，第 4 部分各节对此作了报告。

实验 V 在第一台客户机上运行，使用包含两个 worker 的 pool，可容纳 16 个单 CPU actor。它针对初稿中说明我们未测试某项内容的十二句话，逐一进行了测试。

| 实验 V 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| 1 | 内存不包含数据时快照是否会缩小？ | 是。500 MiB 全零内存产生了 4.6 MiB 快照，恢复耗时 0.23 秒。大小与恢复时间取决于包含数据的内存量。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives)、[3.3](#s-suspendactor-and-resumeactor) |
| 2 | 恢复规律是否适用于常规运行时？ | 峰值内存为 245 MiB 的 Python 服务器在 0.41 秒内恢复。其黄金快照构建耗时 39.3 秒。 | [3.3](#s-suspendactor-and-resumeactor)、[3.1](#s-actortemplate-and-the-golden-snapshot) |
| 3 | 同一时刻并发恢复的开销如何？ | 16 次同时恢复时单次耗时 0.37 秒，单独恢复为 0.23 秒，155 次请求全部成功响应。在 14 个空闲位置上突发 32 次请求：14 次得到服务，18 次在 5.1 秒后被拒绝。 | [4.4](#s-request-parking)、[4.5](#s-sizing-a-pool) |
| 4 | 三种保真度各保留了什么？ | 根文件系统级别保留了文件并启动新进程。两个较低级别在恢复时均表现为冷启动。 | [3.4](#s-snapshot-fidelity-and-where-a-snapshot-lives) |
| 5 | 在黄金快照生成前创建的 actor 会如何？ | 它没有快照，首次调用为冷启动，且永远不会采纳黄金快照。 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| 6 | actor 能否迁移到另一个模板？ | 仅在挂起时可以。卷会保留，内存与根文件系统则全新启动。 | [3.1](#s-actortemplate-and-the-golden-snapshot) |
| 7 | 模板能否使用另一个命名空间中的 pool？ | 可以。未匹配任何 pool 的选择器会被接受，且表现如同 pool 已满。 | [3.6](#s-atespaces) |
| 8 | 访问策略与令牌文件能否按文档正常工作？ | 可以。各个角色均在文档说明的位置被拒绝，变更在 2 秒内生效。 | [5.1](#s-client-authentication)、[5.2](#s-access-policies) |
| 9 | actor JWT 中包含什么？ | 包含文档记载的声明，使用 ES256 签名。网关在跨挂起的多次请求中复用了同一个令牌。 | [5.3](#s-actor-jwts) |
| 10 | 预览功能需要什么？ | 需要服务端标志与客户端标志。如果缺少任一标志，错误中仅指明该字段。 | [8.5](#s-limits-at-v1-0-0)、[R.5](#s-ref-flags-and-gates) |
| 11 | Substrate 是否曾发现过已退出的进程？ | 20 分钟内未发现。死亡的 actor 仍保留其 CPU 预留配额，直到某次挂起将其标记为崩溃。 | [3.5](#s-crashed-and-revertactor) |
| 12 | 挂起是否会等待进行中的请求？ | 不会。请求在 2.2 秒后收到 503，挂起报告成功。 | [3.3](#s-suspendactor-and-resumeactor) |

项目 3 的第一次运行在 1 到 8 次恢复时使用了错误的端口号，我们废弃了该数据。[第 4.4 节](#s-request-parking) 的表格来自第二次运行。32 次突发数据来自第一次运行。项目 9 的第一次尝试失败，原因是 actor 在策略建立前请求了主机名，[第 5.3 节](#s-actor-jwts) 对此进行了报告。

实验 P 和 Q 在 V 之后于第二台客户机（16 vCPU，23 GB）上运行。P 中的每个节点停机用例各运行了一次。Q 选取了初稿中仅从代码推断或标为未测试的八项陈述。在数据平面起作用的场景下，两套数据平面都测了一遍。

| 实验 Q 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| g | 三项依赖故障在 agentgateway 上是否得到相同结果？ | 是。每个失败响应体均为 `ingress failed`，正在运行的 actor 在 Postgres 就绪后 21 秒再次响应，Envoy 上为 3 秒。 | [8.2](#s-when-a-dependency-is-down) |
| h | 复用连接是否会使已移除的规则保持有效？ | 否。下一个请求收到 403，在 agentgateway 上约 1 秒后生效，在 Envoy 上为 5 到 9 秒后。 | [6.6](#s-the-dataplane-choice) |
| i | 模型网关能否在出站规则之后通过 TLS 正常工作？ | 可以，且网关负责选择模型。私有 CA 初始失败，直到我们替换了出站容器的根证书文件。新建拦截连接耗时约 0.6 秒。 | [7.2](#s-agentgateway)、[6.4](#s-tls-interception) |
| j | 调低日志级别能否从 agentgateway 出站日志中移除请求头数值？ | 能。`RUST_LOG=info` 对 100 次请求输出了 100 行日志，且不包含请求头数值。安装器会重新将其设为 `debug`。 | [6.6](#s-the-dataplane-choice) |
| k | 挂起是否会切断打开的连接？ | 会，在 1.3 到 2.2 秒内切断，且恢复后连接不会重新建立。 | [6.6](#s-the-dataplane-choice) |
| l | 变更后的 Secret 多久能同步到上游？ | 在 Envoy 上为 1.0 到 1.6 秒后，在 agentgateway 上为 100.6 到 280.5 秒后。没有请求失败。 | [6.5](#s-credential-injection) |
| m | 两种数据平面上 router 各开放了哪些端口？ | 443 和 8444 在两者上均需要客户端证书。agentgateway 还包含一个无需凭据的 stats 端口，以及两个无监听器的 Service 端口。 | [6.1](#s-the-router-and-ingress) |
| n | actor 的 CPU 限制是否属于硬性上限？ | 是，来自针对每个 actor 的 cgroup 硬性上限。actor 在每个限制下均看到 2 个 CPU，上限下在其内部读取的 CPU 时间并不准确。 | [4.1](#s-workerpool) |

项目 n 的首次测试在沙箱内的 CPU 时间达到 10 秒时停止了每次运行。该 CPU 时间在上限限制下并不有效。我们保留了该文件作为错误记录，并使用固定工作量重新运行了测试。实验 P 的清理删除了两个模板的黄金标签，[第 3.4 节](#s-snapshot-fidelity-and-where-a-snapshot-lives) 报告了该操作导致的破坏。

实验 S 在 P 和 Q 之后于 31 GB 的客户机上运行。它选取了 [第 7.5 节](#s-agent-executor) 列为未运行的五项内容，并将实验 K 的模拟模型替换为真实模型。

| 实验 S 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| kagent | 使用真实模型时一轮的耗时是多少？ | 在 CPU 上运行小型模型时中位数为 11 到 17 秒，其中恢复与挂起约占 0.7 秒。50 轮中有 1 轮未结束，且在客户端 300 秒超时前没有任何机制限制其边界。 | [7.1](#s-kagent-on-substrate) |
| model | 任务能否通过 `Model` 对象调用模型？ | 不能。任务的任何字段均未指明 `Model`。在 actor 上配置 `http` 规则后，20 次调用全部返回 200。 | [7.5](#s-agent-executor) |
| agent | 示例 agent 镜像能否运行？ | 能，在单次运行中使用了一条简短 prompt，未使用厂商密钥。agent 结束后任务仍停留在 `Running`。 | [7.5](#s-agent-executor) |
| clone | 工作区能否克隆？ | 仅靠 Agent Executor 无法克隆。在 actor 上针对端口 443 配置 `tlsPassthrough` 规则后，克隆在 9.57 秒的恢复中完成。`https` 规则因证书问题失败。 | [7.5](#s-agent-executor) |
| loss | 任务运行期间 worker 消失会发生什么？ | actor 在约 1 秒内变为 `CRASHED`。`ax resume task` 在 0.3 秒内完成了修复。挂起在 worker 丢失前 8.7 秒保存的文件已经丢失。 | [7.5](#s-agent-executor) |
| release | 发布版本 v0.3.1 能否在 Substrate v1.0.0 上运行？ | 不能。它调用的 gRPC 服务名称在 v1.0.0 中未提供。 | [7.5](#s-agent-executor) |

实验 T 和 U 在 S 之后在两台客户机上同时运行。T 在第二台客户机（16 vCPU，23 GB）的双 worker 节点集群上运行。U 在第一台客户机上基于发布镜像的新建 kind 集群上运行。它们选取了本页列为未测试的六项内容。每个用例、每项故障以及每个升级步骤各运行了一次。

| 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| T，drain | `kubectl drain` 对 actor 会产生什么影响？ | 它使 2 个正在运行的 actor 全部崩溃，且通过一次 `revert` 分别修复。3 个已挂起的 actor 无需任何命令便在另一个节点上恢复。 | [8.2](#s-when-a-dependency-is-down) |
| T，节点占满 | 当另一个节点没有空闲 worker 时操作手册是否有效？ | revert 与标签抢救均被接受，在 worker 空闲前请求在 5 秒后收到 503。 | [8.2](#s-when-a-dependency-is-down)、[4.3](#s-placement) |
| T，bucket | 集群外部的 bucket 开销如何，以及它不可用时会发生什么？ | 无额外延迟时开销很小。往返延迟 20 毫秒时，恢复 1,000 MiB 耗时 10.2 秒。bucket 不可用时，同步挂起使正在运行的 actor 崩溃。bucket 运行在同一台客户机上，带有模拟延迟。 | [8.1](#s-postgres-and-the-object-store)、[8.2](#s-when-a-dependency-is-down) |
| U，Postgres | 使用集群外部的 Postgres 安装能否成功？ | 能，在第三次尝试时成功。文档记载的数据库脚本除非在单一事务中运行，否则会失败。故障现象与内置数据库一致。 | [8.1](#s-postgres-and-the-object-store) |
| U，升级 | 升级期间客户端会看到什么？ | 从 v1.0.0-rc.3 升级到 v1.0.0 时：在 `atelet` 步骤中挂起与恢复失败持续 24 秒，在 worker 步骤中正在运行的 actor 发生崩溃。更早的发布版本未提供镜像。 | [8.4](#s-upgrade-and-stale-advice) |
| U，规模 | 项目网站关于规模的陈述在单节点上是否成立？ | 单次恢复在 actor 记录达到 10,750 行时仍维持在 0.36 秒。单节点每秒完成 36 到 39 次恢复。扩容上限受制于客户机磁盘。 | [4.5](#s-sizing-a-pool)、[1.1](#s-what-substrate-does-and-what-it-leaves-to-you) |
| X，bucket | 另一台机器上的 bucket 在有 TLS、速率限制和延迟时开销如何？ | 无流量整形时，恢复 200 MiB 耗时 2.64 秒，恢复 1,000 MiB 耗时 12.15 秒。在 51 个周期中的 26 个周期里，首次响应在 10 秒后返回 504，后续请求返回 200。在 20 Mbit/s 下，恢复 200 MiB 耗时 88 秒。TLS 需要补丁。 | [8.1](#s-postgres-and-the-object-store)、[4.4](#s-request-parking) |
| X，bucket 故障 | 内存中有数据时 bucket 故障现象是否相同？ | 是。同步挂起使正在运行的 actor 崩溃并丢失了 2 次调用，在 2 种情况下均如此。默认挂起未丢失任何内容。 | [8.2](#s-when-a-dependency-is-down) |
| X，Postgres | 在另一台机器上使用 Postgres 安装能否成功，故障会产生什么影响？ | 能。往返延迟 20 毫秒使挂起与恢复分别增加约 0.5 秒。在 2 次故障中的 1 次之后，一个正在运行的 actor 持续返回 504，直到 router 重启。 | [8.1](#s-postgres-and-the-object-store)、[8.2](#s-when-a-dependency-is-down) |

T 中两个用例的首次尝试将请求发送到了错误端口，我们重新运行了这两项测试。bucket 故障中的一次运行存在包含客户端错误的记录，汇总中剔除了这些记录。捕获套件注明了我们未使用的每个文件。

实验 X 在重启 23 GB 客户机后与 W 同时运行。bucket 和数据库运行在 31 GB 客户机上的容器内。两台客户机通过虚拟机监控器的用户态网络互通，速率约为每秒 100 MiB。bucket 循环的首次尝试在 504 后发送了 `revert`，我们在未发送该命令的情况下重新运行了循环。

实验 W 在该客户机重启后于 31 GB 的客户机上运行。它选取了本页与 [第 7.5 节](#s-agent-executor) 列为未运行的四项内容。使用的模型同样为 CPU 上的两个小型模型。

| 实验 W 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| bound | kagent 的某项设置能否对轮次施加边界限制？ | 能，ModelConfig 上有两项设置。在 `maxTokens: 128` 时，3 轮中有 3 轮以截断回答完成。在 `timeout: 20` 时，3 轮中有 3 轮在大约 21 秒后失败且 actor 被挂起。仅靠客户端超时会使 actor 保持 `RUNNING` 且模型繁忙达 10 分钟。 | [7.1](#s-kagent-on-substrate) |
| open command | 当 worker 消失时打开的 `ax ssh` 命令会发生什么？ | 在 2 次运行中均在 0.2 秒内以错误结束，且没有任何机制再次发送。`ax resume task` 修复了任务。 | [7.5](#s-agent-executor) |
| skills, MCP | 工作区的 skills 和 MCP 字段中的哪些内容能到达 agent？ | 一个空的 skills 目录。四个 MCP 服务器中的两个作为 agent 命令的标志传入。在配置了我们在 actor 上设置的出站规则后，agent 在 3 个任务中均访问到了 HTTP MCP 服务器。 | [7.5](#s-agent-executor) |
| example | 文档记载的示例能否使用其自带的 prompt 和仓库运行？ | 可以，在两处修复之后：更小的内存限制，以及一次删除（因为任务无法修改）。随后该 3B 模型编写了一份与事实不符的报告。 | [7.5](#s-agent-executor) |
| second runs | S 中仅运行一次的两项结果能否复现？ | 克隆复现了，耗时 5.47 秒。agent 镜像在第二次运行中未写入其文件，因此 2 次运行中有 1 次写入。 | [7.5](#s-agent-executor) |

在 W 中，worker 丢失的前两次尝试在删除前停止，因为任务不在测试所用的 pool 上。我们重新运行了这两次尝试。示例的首次尝试停留在一次未解释的恢复失败上。捕获套件注明了我们遗漏的每个文件。

实验 Y 在 W 和 X 之后于第一台客户机（24 vCPU，47 GB）上的新建 kind 集群上运行。它选取了本页列为未测试的五项内容。每项故障、升级和回滚各运行了一次。

| 实验 Y 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| outages | 三项故障能否复现？ | 能。在内置数据库的三次故障中，最后一次失败恢复在就绪后 24 到 26 秒发出，其中一次运行中的失败文本有所不同。X 中停留在 504 的正在运行的 actor 未能恢复。缺少 `ate-api-server` 时 503 再次在 3 到 5 秒内出现，缺少 Kubernetes API server 时正在运行的 actor 服务了每个请求。 | [8.2](#s-when-a-dependency-is-down) |
| upgrade | 升级能否复现？ | 能。`atelet` 步骤使挂起与恢复失败持续 34 秒，在 SIGTERM 下退出的 actor 在 worker 步骤中崩溃。处于挂起循环中的 actor 也在该步骤崩溃，且一直保持崩溃直到执行 `revert`。 | [8.4](#s-upgrade-and-stale-advice) |
| rollback | 逆序回滚是否可行？ | 可行，在 worker 步骤中出现了相同的崩溃。每个已挂起的 actor 都保留了其状态计数。 | [8.4](#s-upgrade-and-stale-advice) |
| v0.6.0 | v0.6.0 集群能否迁移到 v1.0.0？ | 不能。安装器在 CRD 的存储版本处停止。在同一集群上重新安装需要两处修复，且未保留任何 actor。 | [8.4](#s-upgrade-and-stale-advice) |
| release v0.3.1 | 该发布版本能否在 Substrate v0.6.0 上运行？ | 不能。它创建了没有模板的 actor，v0.6.0 拒绝了该请求。 | [7.5](#s-agent-executor) |

在 Y 中，Kubernetes API 故障期间的恢复并不有效，因为早期运行中正在运行的 actor 已经占满了 pool。Y 中 200 到 500 次恢复的突发没有产生数据，因为该集群的 `kube-apiserver` 在 520 个 worker 中的 443 个启动时停止了响应。

实验 Z 最后在第一台客户机（24 vCPU，47 GB）上针对限制为 700 个 pod 的新建 kind 集群运行。它执行了 Y 无法运行的突发测试，pool 每次扩容 50 个 worker，直至 300 个。

| 实验 Z 项目 | 问题 | 结果 | 小节 |
|---|---|---|---|
| pool | 单个节点能否容纳 300 个 worker？ | 能。每扩容 50 个的步骤在 17 到 21 秒内就绪，Kubernetes API 在每个步骤中均在 105 到 108 毫秒内响应。 | [4.5](#s-sizing-a-pool) |
| bursts | 150、200 和 300 次并发恢复开销如何？ | 中位数分别为 3.2 到 3.6 秒、4.3 到 4.6 秒以及 7.3 到 7.4 秒，速率为每秒 32 到 39 次。2,800 个请求中有 4 个在 90 秒内未收到应答。 | [4.5](#s-sizing-a-pool)、[1.1](#s-what-substrate-does-and-what-it-leaves-to-you) |
| limit | 是什么决定了每秒约 37 次恢复的上限？ | 瓶颈不在 `ate-api-server`、router、Postgres、客户端、纯 CPU 或磁盘等待，而在于约 100 次恢复同时在 gVisor worker 内部并发执行，单次耗时比单独执行慢了约十倍。 | [4.5](#s-sizing-a-pool) |
| replicas | 增加 `ate-api-server` 副本数是否有帮助？ | 没有。4 个副本耗尽了内置 Postgres 的 100 个连接限制，导致 300 个请求中有 36 个失败，并使 8 个 actor 崩溃。 | [4.5](#s-sizing-a-pool)、[8.3](#s-symptom-cause-fix) |

在 Z 中，worker 的首次计数使用了错误的过滤器并读取为 0，我们重新扩容了 pool。300 个快照的上传迅速占满了客户机磁盘，因此我们删除了 150 个 actor，并将 200 和 300 次并发测试各重新运行了两次。在 router 测试之前，我们删除了一个被错误认为停留在 `ACTOR_STATE_RESUMING` 的 actor。其后续两次请求收到 404，捕获套件对此进行了标注。

## 捕获套件 {#s-ref-how-this-manual-was-made-the-capture-kit}

[捕获套件](manuals/agent-substrate-101/capture) 包含录制产物和一个脚本。Agent Substrate 需要 Kubernetes 集群，因此录制操作无法在仓库的 CI 中运行。我们在自己的机器上完成了录制，并将输出保存在 [实验目录](manuals/agent-substrate-101/capture/lab) 中。

```bash
cd manuals/agent-substrate-101
python3 capture/run.py
python3 capture/run.py --check
```

第一个命令读取录制产物并写入 [汇总文件](manuals/agent-substrate-101/capture/lab/summary)，这些汇总文件是图表的唯一输入。第二个命令在临时目录中重新构建汇总并与已保存的文件进行对比。它不需要网络，也不需要密钥。由于它不启动集群，因此会为录制部分输出一行 `skipped`。

大型日志以节选形式保存，其中每一行都是原始日志的完整行。实验目录中的清单列出了被省略或截断的每个文件及其原因。出站与网络录制中的凭据值为我们虚构的测试值。

## 在你的集群上重新录制 {#s-ref-how-this-manual-was-made-record-it-again-on-your-cluster}

1. 使用 Agent Substrate v1.0.0 代码检出目录中的集群脚本创建一个 kind 集群。
2. 如 [第 2.1 节](#s-install-with-ate-setup) 所示，使用 `ate-setup` 进行安装。
3. 从 [脚本目录](manuals/agent-substrate-101/capture/lab/_scripts) 运行某个实验的脚本。每个脚本都会写入一个以其实验命名的目录。
4. 将输出覆盖复制到实验目录下的相同目录中，然后在 `manuals/agent-substrate-101/` 下运行 `python3 capture/run.py`。

你测得的耗时秒数会与我们不同，但状态、错误文本和事件顺序必须一致。如果在 v1.0.0 上其中某项不同，我们希望知悉，因为这意味着本手册中的某项断言依赖于我们的特定机器。

## 我们测得的内容，以及我们仅阅读的内容 {#s-ref-how-this-manual-was-made-what-we-measured-and-what-we-read}

| 主题 | 在实际运行中测得 | 仅在代码或文档中阅读 |
|---|---|---|
| 安装 | 源码构建、发布镜像、切换到 agentgateway、kagent 安装、Apple 芯片 | GKE、大型集群的配置设置 |
| 生命周期 | 创建、恢复、两种挂起模式、请求期间的挂起、回退、删除、因 pod 丢失导致的崩溃、节点重启、17 个用例中双 worker 节点失去其一、该丢失期间与之后的初次回退与二次回退、从标签抢救、另一个节点占满时的节点丢失、5 个用例中单个 worker 节点的排空、因内存超限被杀、观察达 20 分钟的进程退出、在其黄金快照生成前创建的 actor、迁移到另一个模板 | 配置了 PodDisruptionBudget 的排空、唤醒探测超时、标签作用域的变更 |
| 快照 | gVisor 上全部三种保真度以及 microVM 类别上内存保真度的时间与大小、零字节、半随机与全随机字节的内存、Python 运行时、两个计时器 | 跨运行时版本的恢复 |
| 容量 | 满载 pool、请求暂存、同一时刻 1 到 16 次恢复、32 次突发、单节点 200 和 300 个 worker 下 10 到 300 次恢复的突发、突发期间 worker 内部的恢复耗时、突发期间各组件的 CPU、突发期间 `ate-api-server` 与 router 的 1 到 4 个副本、包含 1,750 到 10,750 行 actor 记录时的单次恢复、另一个命名空间中的 pool、两个 worker 节点上 20 个 actor 的放置、8 与 24 并行 kagent 轮次 | 自动扩缩容、低于上限时的资源预留 |
| 网络 | 默认拒绝、DNS 中继、拦截、透传、凭据注入、在保持打开和复用连接下已移除的规则、作为切断手段的挂起、变更后的 Secret、私有上游 CA、位于 `https` 规则背后的模型网关、agentgateway 出站网关的日志级别、router 的每个端口 | 外部出站处理器、MCP 网关 |
| 身份 | 两种数据平面上的入站证书检查、共享身份告警、令牌文件、包含三种角色的访问策略、actor JWT 的请求头与声明 | actor JWT 的签名检查、密钥轮换、actor JWT 的联合身份 |
| 预览功能 | `ate-api-server` 上针对 `GoldenEgressPolicy` 的两个开关 | 另外两个功能、每个组件上的标志 |
| 依赖 | Envoy 与 agentgateway 上 Postgres、`ate-api-server` 以及 Kubernetes API server 的丢失，以及 Envoy 上各项的第二次运行。还有集群外部的 Postgres 及其丢失，集群外部增加 20 和 100 毫秒往返延迟的 bucket 及其丢失，全部在同一台客户机上。还有同一服务器第二台客户机上的 bucket 与 Postgres，带有 TLS、速率限制、额外延迟以及各自的丢失 | 云端 bucket、托管 Postgres、具备 100 毫秒延迟的真实链路 |
| 升级 | 单节点上从 v1.0.0-rc.3 到 v1.0.0 的两次升级、worker pool 的第二次轮换、一次回滚，以及 v0.6.0 的安装、直接升级与重新安装 | 保留 actor 的旧版本升级、跨 schema 变更的回滚、官方支持的路径 |

[下一版将补充](#s-next-edition)（位于第 8.5 节）包含了计划运行的完整清单。

来源：capture/lab/summary/bursts-one-node-x86.json, capture/lab/summary/restore-limit-x86.json, capture/lab/summary/dependency-reruns-x86.json, capture/lab/summary/upgrade-rerun-x86.json, capture/lab/summary/v060-x86.json, capture/lab/summary/node-drain-x86.json, capture/lab/summary/full-node-x86.json, capture/lab/summary/object-store-x86.json, capture/lab/summary/external-postgres-x86.json, capture/lab/summary/upgrade-x86.json, capture/lab/summary/scale-x86.json, manual.json (pin, sources); capture/lab/summary/node-loss-x86.json, capture/lab/summary/network-x86.json, capture/lab/summary/rotation-x86.json, capture/lab/summary/cpu-limit-x86.json, capture/lab/summary/dependency-loss-agw-x86.json, capture/lab/Q-network/n-cpu-limit/10-burn.tsv, capture/lab/P-node-loss/96-golden-tag-deleted.txt, capture/lab/summary/microvm-x86.json, capture/lab/L-gaps/microvm/49-summary.tsv, capture/lab/L-gaps/multinode/52-placement-counts.txt, capture/lab/L-gaps/multinode/70-stop-after-upload.tsv, capture/lab/L-gaps/restart/10-poll.tsv, capture/lab/summary/kagent-model-x86.json, capture/lab/summary/agent-executor-followups-x86.json, capture/README.md, capture/run.py, capture/lab/REDACTIONS.txt, capture/lab/summary/install-steps.json, capture/lab/summary/resume-x86.json, capture/lab/summary/resume-mac.json, capture/lab/summary/failures-x86.json, capture/lab/summary/dependency-loss-x86.json, capture/lab/summary/kagent-turns-x86.json, capture/lab/A-quickstart/02-steps.tsv, capture/lab/B-lifecycle/10-trace.tsv, capture/lab/G-dataplane/00-install/steps.tsv, capture/lab/M-mac-arm64/02-steps.tsv, capture/lab/K-kagent/install/steps.tsv, capture/lab/summary/validation-memory-x86.json, capture/lab/summary/validation-parallel-x86.json, capture/lab/summary/validation-fidelity-x86.json, capture/lab/V-validation/00-setup/pool.yaml, capture/lab/V-validation/03-parallel-resume/24-summary.tsv, capture/lab/V-validation/05-golden-race/10-race.tsv, capture/lab/V-validation/06-template-move/10-move.tsv, capture/lab/V-validation/07-cross-namespace-pool/10-cross.tsv, capture/lab/V-validation/08-access-control/10-access.tsv, capture/lab/V-validation/09-actor-jwt/24-jwt-decoded.txt, capture/lab/V-validation/10-preview-feature/10-preview.tsv, capture/lab/V-validation/11-process-exit-long-watch/10-watch.tsv, capture/lab/V-validation/12-suspend-during-request/10-inflight.tsv; docs/get-started/quickstart.md at v1.0.0., capture/lab/summary/remote-store-x86.json, capture/lab/summary/remote-postgres-x86.json
