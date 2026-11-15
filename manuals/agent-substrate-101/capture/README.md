# Agent Substrate 101 录制套件

本目录保存了撰写本手册所依据的录制数据，以及将它们转换成各图中数字的脚本。

Agent Substrate 需要 Kubernetes 集群，因此这些录制无法在 CI 中运行。我们在 2026-11-12 于自己的机器上完成了录制，并将输出保存在 `lab/` 中。脚本 `run.py` 不需要网络，也不需要密钥。它读取 `lab/` 并重新生成 `lab/summary/`。

```bash
python3 capture/run.py
python3 capture/run.py --check
```

检查会在临时目录中重新生成摘要，并与已提交的文件进行比对。它会为录制输出一行 `skipped:`，因为它不会启动集群。

## 测试环境

| 手册中的名称 | 机器 | 软件 |
|---|---|---|
| x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM） | x86 服务器上的 KVM 客户机，24 vCPU、47 GB、嵌套 KVM、Ubuntu 24.04 | Docker 29.1.3、Go 1.27.3、kind v0.33.0、Kubernetes 1.37.0、从源码构建的 Agent Substrate v1.0.0、Envoy 数据平面、gVisor，以及用于 `L-gaps/microvm` 的 microVM 类别。对于 `U-pg-upgrade-scale`，使用基于发布镜像的新 kind 集群 |
| 第二台 x86 服务器客户机（16 vCPU、23 GB） | 16 vCPU、23 GB，同一台宿主机 | 来自发布镜像的 Agent Substrate v1.0.0，Envoy 随后换成 agentgateway v1.7.0。对于 `L-gaps/multinode` 和 `P-node-loss`，使用带有一个控制平面节点和两个 worker 节点的第二个 kind 集群。`P-node-loss` 与 `Q-network` 同时运行，各自在独立的集群上。`T-drain-store` 稍后在带有两个 worker 节点的集群上运行 |
| 第二台 x86 服务器客户机（16 vCPU、31 GB） | 16 vCPU、31 GB，同一台宿主机 | 先后使用两个集群。对于 `K-kagent`：kagent v1.0.0 配合其自带的 Substrate 发行版，集群内运行模拟模型服务器。对于 `N-demos`：来自发布镜像的 Agent Substrate v1.0.0、Envoy 数据平面、gVisor。对于 `R-agent-executor`：在 `N-demos` 集群上从源码运行 Agent Executor。对于 `S-ax-model`：客户机上容器内跑在 CPU 上的小型开源模型，供两个集群使用 |
| Mac | Docker Desktop 下的 Apple 芯片笔记本，分配给 Docker 10 个 CPU 和 8 GB 内存 | 来自发布镜像的 Agent Substrate v1.0.0，仅 gVisor |

各客户机与 Mac 是不同的机器。切勿拿其中一台机器上的数字与另一台机器相比。有两台客户机拥有 16 vCPU，因此手册用内存大小来区分：23 GB 用于 `E`、`F`、`G`、`L-gaps/multinode`、`P-node-loss`、`Q-network` 和 `T-drain-store`，31 GB 用于 `K-kagent`、`N-demos`、`R-agent-executor` 和 `S-ax-model`。

| 目录 | 机器 |
|---|---|
| `A-quickstart`、`B-lifecycle`、`C-resume-vs-size`、`D-durability`、`I-capacity`、`J-container-death`、`V-validation`、`L-gaps/microvm`、`L-gaps/restart`、`U-pg-upgrade-scale`、`Y-reruns-rollback-scale`、`Z-bursts` | x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM） |
| `E-dependency-loss`、`F-egress`、`G-dataplane`、`L-gaps/multinode`、`P-node-loss`、`Q-network`、`T-drain-store`、`X-remote-store-pg` | 第二台 x86 服务器客户机（16 vCPU、23 GB） |
| `K-kagent`、`N-demos`、`R-agent-executor`、`S-ax-model`、`W-ax-kagent-2` | 第二台 x86 服务器客户机（16 vCPU、31 GB） |
| `M-mac-arm64` | Mac |

每台客户机将磁盘放在内存中，并通过用户态 NAT 访问网络。除 `L-gaps/multinode`、`P-node-loss` 和 `T-drain-store` 的集群外，所有集群都只有一个 kind 节点。对象存储为同一集群内的 rustfs。在 `T-drain-store` 的一部分中，它是同一客户机上集群外容器里的 rustfs。在 `X-remote-store-pg` 中，bucket 和 Postgres 是 31 GB 客户机上的容器，通过用户态网络访问。

## 各目录证明了什么

### A-quickstart：文档中记录的源码快速入门

| 文件 | 说明内容 |
|---|---|
| `02-steps.tsv` | 每个快速入门步骤的步骤名称、退出码、秒数 |
| `20-deploy-ate-system.FAILED-no-buildx.log` | 没有 buildx 插件时的失败：`unknown flag: --platform` |
| `22-deploy-ate-system-retry.log` | 安装 `docker-buildx` 后的同一步骤 |
| `60-state.log` | 安装后的节点、pod、CRD 与新 actor |

### B-lifecycle：无空闲挂起，随后的挂起、恢复、崩溃、回退

| 文件 | 说明内容 |
|---|---|
| `10-trace.tsv` | 首次调用，随后 900 秒无请求且每 15 秒记录一次状态 |
| `20-trace-ops.tsv` | 异步挂起、同步挂起、恢复、worker pod 被删除、CRASHED、回退 |
| `22-actor-after-async-suspend.yaml`、`23-actor-after-sync-suspend.yaml` | 带有 PENDING 与 COMPLETED 快照的 actor 对象 |
| `25-actor-crashed.yaml`、`26-actor-after-revert.yaml` | 崩溃时与回退后的 actor 对象 |
| `27-lifecycle.log` | actor 的生命周期日志 |

### C-resume-vs-size：恢复时间与 actor 占用内存的关系

| 文件 | 说明内容 |
|---|---|
| `main.go`、`Dockerfile`、`pool.yaml`、`tmpl-*.yaml` | 压舱 actor、其 WorkerPool 及其五个模板 |
| `10-local.tsv` | 按内存大小分类的创建、首次调用、热调用、异步挂起、从节点恢复、同步挂起 |
| `32-object-store.tsv` | 从对象存储恢复，每个内存大小 5 轮循环，缩短了 atelet 计时器 |
| `31-atelet-args-patched.txt` | 该次运行的 atelet 参数 |
| `snapdir-b*-1.txt` | 每个内存大小对应的节点本地快照大小 |
| `20-storage-footprint.txt`、`23-storage-after-delete.txt` | 存在 25 个挂起 actor 时的磁盘占用，以及删除它们后的磁盘占用 |
| `lifecycle-*.log` | worker 所报告的恢复与检查点时间 |

### D-durability：快照何时安全

| 文件 | 说明内容 |
|---|---|
| `10-watch-part1.tsv`、`10-watch-part2.tsv` | 默认计时器下异步挂起后的五个 actor，每 10 秒记录一次状态持续 42 分钟，随后各恢复一次。actor `d1000` 从未获得 worker，因此四个 actor 拥有自己的快照 |
| `30-local-loss.tsv` | 上传前节点本地快照被删除，以及上传前 atelet 重启 |
| `40-node-reboot.tsv`、`46-after-reboot-followup.txt` | 上传前 kind 节点重启 |
| `32-x1-after-loss.yaml`、`44-r1-after-reboot.yaml` | 每次丢失后的 actor 对象 |

### E-dependency-loss：依赖下线时哪些请求会失败

| 文件 | 说明内容 |
|---|---|
| `10-timeline.tsv` | Postgres、ate-api-server 与 kube-apiserver 何时下线与恢复 |
| `12-probe-incluster.tsv`、`12-probe-proxy.tsv` | 每秒一个请求，记录状态码、秒数和响应体 |
| `20-analysis.txt` | 请求计数与恢复时间 |
| `21-nonsteady-actors-after.txt`、`22-actors-5min-later.txt` | 停留在 RESUMING 状态的 actor |

`20-analysis.txt` 的流统计总量大于 `summary/dependency-loss-x86.json`（对 kube-apiserver 而言分别为 186 与 37 对比 141 与 28），因为分析从每次故障前 10 秒开始统计直到运行结束，而摘要在依赖就绪 40 秒后停止。

### F-egress：两种数据平面上的出站策略

| 文件 | 说明内容 |
|---|---|
| `envoy/20-results.txt`、`agentgateway/20-results.txt` | 默认拒绝、允许的主机、TLS 拦截、透传、凭据注入 |
| `envoy/40-supplement.txt`、`agentgateway/40-supplement.txt` | 连接已打开时规则被移除 |
| `agentgateway/50-custom-header.txt` | 调试日志为自定义头打印的内容 |
| `*/policy-*-live.yaml` | 测试所用的每个 EgressPolicy |
| `envoy/19-first-run-update-refused.txt`、`envoy/19b-second-run-passthrough-ports-required.txt` | 我们最初犯下的两个 CLI 错误 |

本目录中的凭据值为我们虚构的测试值：`sk-mock-not-a-real-key` 与 `lab-granted-marker-...`。

### G-dataplane：Envoy 对比 agentgateway

| 文件 | 说明内容 |
|---|---|
| `00-install/steps.tsv` | 逐步使用发布镜像安装 |
| `01-switch-in-place/` | 在运行中集群上就地切换到 agentgateway |
| `envoy/`、`agentgateway/` | 针对两种数据平面的相同清单：pod、容器、Service、卷、入站探测、空闲内存 |
| `02-agentgateway-without-ingress-allowlist/` | 带与不带入站允许列表时的 router 配置 |

### I-capacity：满载池与请求暂存

| 文件 | 说明内容 |
|---|---|
| `01-unplanned-full-pool-503.tsv` | 容纳 4 个 actor 的池上的第 5 个 actor |
| `13-parking-trace.tsv` | 暂存请求失败，以及当 worker 空闲时得到服务的暂存请求 |
| `16-load-30s.log` | 暂存演示的压测脚本，30 秒，2 个 worker 上跑 4 个 actor |
| `17-router-args.txt` | router 参数，包含暂存预算 |

### J-container-death：沙箱内进程死亡

| 文件 | 说明内容 |
|---|---|
| `10-trace.tsv` | 进程退出的 actor，以及内存耗尽的 actor |
| `11-j1-after-exit.yaml`、`14-j2-after-oom.yaml` | 每次死亡后的 actor 对象 |

### K-kagent：基于自身 Substrate 发行版的 kagent 1.0

| 文件 | 说明内容 |
|---|---|
| `install/steps.tsv`、`install/40-kagent-install.log` | 文档中记录的安装过程 |
| `inventory/` | 镜像、Helm release、CRD、worker pod、数据平面 |
| `agent/` | Harness、AgentTemplate、Agent 与模拟模型服务器 |
| `session1/` | 单次会话：actor、kagent 编写的出站策略、两个轮次、快照保留的内容 |
| `latency/timings.tsv`、`latency/server-times.tsv` | 间隔轮次、无间隔轮次与首轮的时间 |
| `logs/actor-state-changes.tsv` | 来自 ate-api 日志的每个 actor 的每次状态变化 |
| `parallel/` | 单个 worker 上同时运行 8 与 24 个轮次 |
| `probes/` | 入站探测、出站拒绝、对象存储使用 |

### L-gaps：microVM 类别、两个 worker 节点与 worker 恢复

| 文件 | 说明内容 |
|---|---|
| `microvm/40-microvm-local.tsv`、`microvm/49-summary.tsv` | 占用 0、200 和 500 MiB 的 microVM actor 的创建、首次调用、热调用、两种挂起模式，以及从节点恢复 |
| `microvm/20-counter-trace.tsv`、`microvm/24-lifecycle-counter.log` | microVM 池上的 counter 演示 |
| `microvm/30-pool.yaml`、`microvm/32-tmpl-*.yaml` | microVM WorkerPool 及其三个模板 |
| `microvm/26-actor-suspended.yaml`、`microvm/43-actor-v*-1-suspended.json` | 带有 microVM 快照运行时属性的 actor 对象 |
| `microvm/41-node-processes-v*-1.txt`、`microvm/23-node-processes-counter.txt`、`microvm/50-gvisor-rss.txt` | 两种类别单个 actor 在节点上的进程及其常驻内存 |
| `microvm/44-snapdir-v*-1.txt` | 节点本地 microVM 快照的大小与文件 |
| `microvm/42-workers-v*-1.txt` | worker 为单个 microVM actor 预订的内存 |
| `multinode/01-kind-multi.yaml`、`multinode/02-steps.tsv`、`multinode/11-nodes.txt` | 带有两个 worker 节点的集群及其安装时间 |
| `multinode/50-placement.tsv`、`multinode/52-placement-counts.txt` | 20 个 actor 的放置位置 |
| `multinode/60-sticky-cordon.tsv` | 上次挂起所在节点上的恢复，以及节点被隔离期间的恢复 |
| `multinode/70-stop-after-upload.tsv`、`multinode/71-workers.txt` | 带有 COMPLETED 快照的 actor 下方节点停止，每隔数秒发送一个请求 |
| `multinode/75-stop-after-upload-revert.tsv` | 同上，但在第一个请求前先执行回退 |
| `multinode/80-stop-before-upload.tsv` | 带有 PENDING 快照的 actor 下方节点停止，以及两次被拒绝的回退 |
| `multinode/90-stop-while-running.tsv` | RUNNING actor 下方节点停止，150 个请求，以及一次回退 |
| `multinode/85-node-return.tsv`、`multinode/93-after-node-return.tsv` | 节点重新启动后的表现 |
| `multinode/96-controller-events.log`、`multinode/98-worker-state-rpcs.log`、`multinode/97-k8s-node-events.txt` | worker 何时被标记为不可用，以及 Kubernetes 何时驱逐它们的 pod |
| `_scripts/` | 生成这些录制的六个脚本 |
| `restart/10-poll.tsv`、`restart/11-workers-each-poll.txt` | 一次节点重启，每 2 到 3 秒尝试恢复并获取 worker 列表 |
| `restart/23-ateapi.log`、`restart/25-events.txt` | 该次重启的 `ate-api-server` 日志与 Kubernetes 事件 |

### M-mac-arm64：Apple 芯片

| 文件 | 说明内容 |
|---|---|
| `02-steps.tsv`、`20-deploy-ate-system.log` | 来自发布镜像的安装 |
| `80-local.tsv` | 占用 0、50 和 200 MiB 时的创建、首次调用、异步挂起、恢复 |
| `82-actor-m*.yaml`、`83-lifecycle-m*.log` | actor 对象及其生命周期日志 |

### N-demos：第 9 部分的四个演示

全部四个演示均在第二台 x86 服务器客户机（16 vCPU、31 GB）上的独立集群中运行，使用发布镜像安装，采用 Envoy 数据平面。演示程序位于 `capture/demos/`。

| 目录 | 说明内容 |
|---|---|
| `install/steps.tsv` | 该集群的逐步安装 |
| `idle-suspender/suspender.tsv`、`idle-suspender/requests-*.tsv`、`idle-suspender/capacity-requests-*.tsv` | 挂起器的每个决策，以及有无挂起器时的每个请求 |
| `stateful-agent/session-*.tsv`、`stateful-agent/history-*.json`、`stateful-agent/egress-policy-*-live.yaml` | 两种保真度各自的单次会话、每次挂起后的历史记录，以及包含凭据置换的出站策略 |
| `tool-sandbox/tasks.tsv`、`tool-sandbox/egress-policy-live.yaml`、`tool-sandbox/lifecycle.log` | 单个 actor 中的六条命令，每次命令后执行回退 |
| `failure-drill/drill-run.log` | 六种故障及其各自的现象、修复与恢复 |

### R-agent-executor：在 Substrate v1.0.0 上固定 commit 的 Agent Executor

所有步骤均在第二台 x86 服务器客户机（16 vCPU、31 GB）上运行，位于 `N-demos` 演示之后的同一个集群中。Agent Executor 在 commit `a72b8ca46cb5` 从源码构建。没有任务使用模型，每个任务运行 `sleep infinity`。此处未运行 worker 丢失测试，因为任务位于其他实验的池上。`S-ax-model` 随后运行了该测试。

| 目录 | 说明内容 |
|---|---|
| `00-source/refs-and-pins.txt` | 各模块文件所需的 commit、tag 和 Substrate 版本 |
| `10-install/steps.tsv`、`10-install/51-apply-before-grant.log`、`10-install/62-ax-pool.yaml` | 每个安装步骤的退出码与秒数、Substrate 授权前的失败，以及我们创建的 WorkerPool |
| `20-inventory/` | 集群的 CRD、Agent Executor 数据库的五张表、镜像，以及空闲时的内存 |
| `30-concept-map/` | `ax` 展示的单项任务，及其背后的 actor、模板、标签和缺失的出站策略 |
| `40-lifecycle/20-survive-before.txt`、`40-lifecycle/25-survive-after.txt`、`40-lifecycle/30-cycles.tsv`、`40-lifecycle/11-state-changes.tsv` | 一次挂起与恢复保留的内容、10 次计时的循环，以及 actor 的每次状态变化 |
| `50-idle/10-idle-watch.tsv` | 600 秒无请求，且每 15 秒记录一次 actor 状态 |
| `60-gateway-model/`、`98-model/` | 被保存的 Gateway、带有 `spec.gateway` 且被拒绝的任务，以及带有不存在的 Secret 的 Model |
| `70-workspace/` | 包含一个内联文件与一个 Git 仓库的工作区、被阻止的 clone，以及将其报告为就绪的条件 |
| `80-networking/` | router Service 的端口、80 端口上的纯 HTTP，以及 `ax ssh` 使用的隧道 |
| `90-nodebug/`、`99-delete/` | 不带 `debug: true` 的 `ax ssh`、每次删除及其秒数，以及 Substrate 上保留的内容 |
| `95-failure/04-SKIPPED.txt` | 为何未删除 worker pod |

### S-ax-model：小型真实模型、结合该模型的 kagent，以及 Agent Executor 的五个遗留项

所有步骤均在第二台 x86 服务器客户机（16 vCPU、31 GB）上运行，位于 `R-agent-executor` 之后。模型服务器为客户机上容器内的 Ollama 0.40.16，分配 12 个 CPU，一次处理一个请求，无 GPU。模型为 `qwen2.5:3b`（1.9 GB）与 `qwen2.5:1.5b`（986 MB）。它们是 CPU 上的小型模型，因此这些文件中的模型秒数不代表 GPU 或托管模型的模型秒数。

| 目录 | 说明内容 |
|---|---|
| `10-model/10-bench.tsv`、`10-model/06-list.txt` | 每个模型在 5 次请求与 10 次工具调用中的每秒 token 数，以及每个模型的大小 |
| `20-kagent/01-real-model.yaml` | 将 kagent 指向模型服务器的 ModelConfig、AgentTemplate 与 Agent 对象 |
| `20-kagent/loop/per-turn.tsv`、`timings.tsv`、`summary.txt` | 50 轮 kagent 调用：每轮在客户端耗费的时间、其模型请求的秒数，以及来自 `ate-api-server` 日志的恢复和挂起秒数。`per-turn.tsv` 由 `_scripts/s12-kagent-analyze.py` 综合 `timings.tsv`、模型服务器日志和 `ate-api.log` 生成 |
| `20-kagent/loop/stuck-turn-*`、`C-1p5b-first-3.err` | 未结束的轮次：actor 状态、模型服务器的 token 计数、客户端错误与重启说明 |
| `30-ax-clone/` | 无规则、有 `https` 规则、有无端口的 `tlsPassthrough` 规则，以及有生效规则的工作区 clone |
| `40-ax-worker-loss/`、`41-ax-worker-loss-durable/` | 任务下方 worker pod 在最后一次挂起 8.7 秒和 307 秒后被删除，以及任务在 `ax resume task` 后找到的文件 |
| `50-ax-v031/` | 在 Substrate v1.0.0 上安装的发布版 v0.3.1，及其控制器的两个错误 |
| `60-ax-model/` | 任务旁边的 `Model` 对象、任务的环境变量，以及通过 actor 上的 `http` 规则进行的 20 次模型调用 |
| `70-agent-image/` | 针对本地模型服务器的 Claude Code 示例镜像：构建、任务、actor 日志，以及运行后的工作区 |

在 `per-turn.tsv` 中，恢复或挂起为 0 意味着保存的日志窗口没有该轮次的记录。行 `C-1p5b-first-4` 包含了其排队等待的请求的模型秒数，因此其模型秒数大于自然流逝秒数。`run.py` 在统计中排除了这两种情况。

### W-ax-kagent-2：kagent 轮次上限，以及 Agent Executor 的另外四个遗留项

所有步骤均在第二台 x86 服务器客户机（16 vCPU、31 GB）上运行，在客户机重启后，于 `S-ax-model` 的两个集群上使用同一个模型服务器进行。kagent 使用 `qwen2.5:1.5b`，Agent Executor 使用 `qwen2.5:3b`。同一客户机上还运行着另一个实验的两个容器，因此请将秒数视为参考。这些文件中模型写出或决策的内容，是关于该小型模型的结果。

| 目录 | 说明内容 |
|---|---|
| `10-kagent-bound/00-explain-*.txt`、`01-bounded.yaml` | 集群描述的三个 ModelConfig 字段，以及各包含一个上限的两个 ModelConfig 对象 |
| `10-kagent-bound/events.log` | 每个轮次开始与结束的单行记录：7 轮提示词由模型自行结束，各上限下 10 轮工具调用，以及无上限的 10 轮首次调用 |
| `11-long-prompt/results.tsv` | 直接发送给模型服务器的三个提示词，用于找出能让模型持续输出的提示词 |
| `12-kagent-bound-long/events.log`、`timings.tsv`、`ollama-gin.log`、`*.after.log` | 计数提示词在 `maxTokens: 128`、`timeout: 20` 及无上限下的情况：每轮结果、模型服务器端的请求秒数，以及轮次后 actor 状态与模型服务器 CPU |
| `20-ax-flight/w-fl1/`、`w-fl2/` | 运行两条 `ax ssh` 命令期间 worker pod 在最后一次挂起 12 秒与 329 秒后被删除：打开的命令打印的每一行、两个客户端错误、actor 状态变化，以及 `ax resume task` 后的工作区 |
| `30-ax-mcp-skills/` | 带有 skills 路径、registry 和四个 MCP 服务器条目的 Workspace：`ax` 接受的内容、agent 收到的命令行、runner 的警告、skills 目录，以及 MCP 服务器日志 |
| `31-ax-mcp-call/w-mcp2/`、`w-mcp3/` | 提示词指名 MCP 工具的两项任务，伴随 MCP 服务器日志中的工具调用 |
| `40-ax-example/` | 仓库自带提示词与仓库的 Claude Code 示例：三个修改的值、4Gi 下恢复失败、拒绝第二次 apply、1536Mi 下的运行、报告，以及检出代码的状态 |
| `40-ax-example-attempt1/` | 删除并重新创建后恢复失败一次的情况，附带 worker 列表 |
| `50-ax-clone-2/`、`51-ax-agent-image-2/` | 恢复时 clone 与简短 agent 提示词的第二次运行 |

在 `20-ax-flight/` 中，`20-inflight-sleep.end` 中的退出码在错误文本旁边为 0。我们不信任该值，因此 `run.py` 不读取它。在 `40-ax-example/26b-egress-hosts.log` 中，有一行折行在主机名内部。

### T-drain-store：drain、节点满载与集群外的 bucket

所有运行均在第二台 x86 服务器客户机（16 vCPU、23 GB）上，于带有两个 worker 节点的集群中进行，采用 Envoy 数据平面与 gVisor。每种用例运行一次。测试 actor 在内存中保存一个计数器与 50 MB。列 `t` 为从 drain 命令、stop 命令或 bucket 下线时刻算起的秒数。

| 文件 | 说明内容 |
|---|---|
| `00-run.log`、`09-start.txt`、`04-pdb-and-grace.txt`、`05-atelet-args.txt` | 运行顺序、开始时的状态、中断预算、pool pod 的宽限期，以及 atelet 参数 |
| `10-a-running.tsv`、`40-d-mid-request.tsv` | 运行中 actor 下方的 drain，每秒一个请求，以及有一个持续 120 秒请求未完成时的 drain |
| `20-b-suspended-sync-quiet.tsv`、`25-b2-suspended-sync-requests-during-drain.tsv` | 使用 `--mode sync` 挂起的 actor 下方的 drain，分为无请求和有请求两种情况 |
| `30-c-suspended-async-pending.tsv` | 最新快照在节点上处于 PENDING 的 actor 下方的 drain |
| `drain-*.log`、`return-*.tsv`、`workers-*.txt` | 每次 drain 的输出、每次解除隔离后带有 15 个新 actor 放置情况的节点，以及 worker 列表 |
| `52-f1b-survivor-full-then-free-a-worker.tsv`、`62-f2b-survivor-full-then-scale-pool.tsv` | 另一节点满载时的节点停止，分别通过释放 worker 和扩容 pool 来结束 |
| `70-f3-survivor-full-no-revert-request-only.tsv`、`78-control-plane-events.log` | 两个节点均在线且四个 worker 全部满载，附带步骤 `DetachFromFullNode` 的日志行 |
| `80-store-run.log`、`81-patches.log`、`82-atelet-args-patched.txt`、`86-store-container.log` | 集群外的 bucket 与缩短后的 atelet 计时器 |
| `83-netem-rtt.txt` | 每次增加延迟时节点到 bucket 的连接时间 |
| `90-store-cycles.tsv` | 同步挂起与从 bucket 恢复的每轮循环 |
| `95-store-unreachable.tsv`、`96-store-unreachable-logs.log`、`97-store-unreachable-recovery.tsv` | bucket 离线伴随拒绝连接与丢包，以及恢复过程 |
| `98-atelet-args-restored.txt`、`99-state-left.txt` | 运行结束后的集群 |
| `_scripts/` | 生成这些录制的脚本 |

这些文件中有三个部分无效，`summary/object-store-x86.json` 没有使用它们。在 `95-store-unreachable.tsv` 中，16:50:45 UTC 之后状态码为 `000` 的请求行来自客户端错误。该文件中状态码为 200 的 `blackhole-request-new-actor` 行有效并被采用。在 `97-store-unreachable-recovery.tsv` 中，从 `refused-prepared` 到末尾的各行无效，因为 bucket 离线不足 1 秒。最初的尝试 `50-f1` 与 `60-f2` 向端口 0 发送了请求，不在本目录中。

集群外的 bucket 运行在同一台客户机上。`tc netem` 的延迟设置在一个方向上，因此该值代表增加的往返时间。

### X-remote-store-pg：另一台机器上的 bucket 与 Postgres

所有运行均在第二台 x86 服务器客户机（16 vCPU、23 GB）上进行，采用 Envoy 数据平面与 gVisor。bucket 循环与 bucket 故障在带有两个 worker 节点的集群上运行。数据库运行使用单节点的新 kind 集群。bucket 与 Postgres 运行在 31 GB 客户机上的容器中。两台客户机通过虚拟机监控器的用户态网络互通，`13-path.txt` 记录了该路径的连接时间与复制时间。

| 文件 | 说明内容 |
|---|---|
| `00-health.txt`、`01-health-after-wait.txt`、`00-run.log` | 客户机重启后的集群状态，以及运行顺序 |
| `10-store-run.log`、`11-patches.log`、`12-atelet-args-*.txt`、`_scripts/x1-store.sh` | 端点与计时器变更，以及为对象存储插件提供 CA 的 patch |
| `13-path.txt` | 每个路径和限制下，来自节点的 5 次连接和一次 300 MiB 复制 |
| `19-tls-store-check.txt` | 基于 TLS 的 bucket，分为带与不带 CA |
| `22-store-cycles.tsv` | 每次循环：同步挂起、首次响应、请求数，以及到首个 200 的秒数 |
| `30-outage-stopped.tsv`、`30-outage-dropped.tsv`、`31-outage-*-logs.log` | 带有 200 MiB actor 时的 bucket 离线，分为停止服务和丢包 |
| `40-pg-install/` | 针对另一台客户机上 Postgres 的安装 |
| `50-pg-tests/05-pg-round-trip.txt`、`10-lifecycle-delay*.txt`、`11-cycles-delay*.tsv`、`12-running-requests-delay*.tsv` | 查询往返与生命周期，分为无延迟与 20 毫秒延迟 |
| `50-pg-tests/30-timeline*.tsv`、`33-probe*.tsv`、`34-api-server-log*.excerpt.txt`、`47-worker-cache-lines.txt` | 数据库的两次故障，每秒一个请求，以及 worker 缓存的重试 |
| `50-pg-tests/37-follow-up.txt`、`38-x-run-diagnosis.txt`、`39-x-run-diagnosis-2.txt`、`41-x-run-recovery.txt`、`42-x-run-router-restart.txt` | 第一次故障后停留在 504 的运行中 actor，以及终结该状态的 router 重启 |
| `99-state-left.txt` | 运行结束后的集群 |

这些部分无效，摘要中未采用。`20-store-cycles.tsv` 是一次最初尝试，其中 504 导致了回退；`22-store-cycles.tsv` 替代了它。在 `13-path.txt` 中，两个速率限制下的下载时间未经整形，且 20 Mbit/s 下的一组探测显示状态码 `000`。在 `30-outage-*.tsv` 中，行 `async-state-after-wait` 是一次采样而非等待。在 `50-pg-tests/33-probe.tsv` 中，唯一一条状态码为 404 的行来自耗尽的 actor 列表。在 `50-pg-tests/05-pg-round-trip.txt` 中，第一个标题下以 `qdisc` 开头的行显示的是针对另一地址的规则。

两台客户机之间路径上增加 100 毫秒延迟的各行仅对该路径有效。bucket 的访问密钥显示为 `<store-key>`，连接字符串显示 `<user>` 与 `<password>`。

### Z-bursts：单节点上最多 300 次并发恢复的突发，以及决定速率的因素

所有运行均在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上进行，基于单节点、上限 700 pod 的新 kind 集群，使用发布镜像，采用 Envoy 数据平面、gVisor 及内置 Postgres。每个 worker 的上限为 1 CPU 和 512Mi。actor 为 Python 计数器，带有 500 毫核与 128 MiB 上限，保真度为内存。

| 文件 | 说明内容 |
|---|---|
| `00-setup/02-kind-script-change.diff`、`21-node.json`、`pool.yaml`、`template.yaml` | kind 脚本针对 700 pod 的改动、节点、pool 与模板 |
| `00-setup/20-growth.tsv` | pool 从 50 逐步扩容到 300 worker（步长 50），每个阶段的就绪时间与 Kubernetes API 响应时间 |
| `10-run/10-first-activation.tsv`、`21-sequential.tsv` | 300 个新 actor 的首次启动（每次 150 个），以及 20 次单次恢复 |
| `10-run/20-concurrency.tsv`、`10-run/bursts/` | 每次突发，以及每次突发的每个请求：actor、状态码与秒数 |
| `10-run/cpu/`、`sampler.py` | 节点与每个指名进程在每次突发期间每秒的 CPU |
| `10-run/50-atelet-restore-timing.excerpt.log`、`51-restore-concurrency.txt` | `atelet` 的恢复日志，以及每次突发中同时恢复的数量 |
| `10-run/40-errors/`、`41-non-200-rows.tsv`、`42-postgres-max-connections.txt`、`43-ateapi-pool-settings.json` | 四个 `ate-api-server` 副本下的突发：日志、actor 列表、Postgres 连接数上限与服务器参数 |
| `10-run/00-run.log`、`30-scale.log` | 运行顺序、副本变更，以及我们手动执行的步骤 |

目录的 README 说明了哪些部分无效。API server 日志中的证书链替换为标记。

### Y-reruns-rollback-scale：故障与升级的复跑、回滚与 v0.6.0

所有运行均在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上进行，基于单节点的新 kind 集群。故障与升级使用发布镜像、Envoy 数据平面、gVisor 与内置 Postgres。v0.6.0 的运行使用该 tag 下的源码构建。每次故障、升级与回滚各运行一次。

| 文件 | 说明内容 |
|---|---|
| `10-outages/00-install/`、`01-setup/` | 安装、60 个 worker 的 pool、模板，以及带有客户端上限的探测循环 |
| `10-outages/1*-pg-run*/`、`20-api-run1/`、`30-k8s-run1/` | Postgres 的三次故障、`ate-api-server` 的一次故障，以及 Kubernetes API server 的一次故障，依次在同一个集群上发生 |
| `10-outages/*/00-timeline.tsv`、`10-probe.tsv` | 每次故障的时刻，以及三个流的每个请求 |
| `10-outages/*/11-running-after.txt`、`12-stuck.txt` | 每次运行后向六个运行中 actor 各发三个请求，以及未响应的 actor 列表 |
| `10-outages/*/14-ateapi-worker-cache.log`、`17-states-after.txt` | worker 缓存的重试，以及每次运行后处于各状态的 actor 数量 |
| `20-upgrade/00-install-rc3/`、`10-before/` | v1.0.0-rc.3 的安装，以及升级前创建的 actor |
| `20-upgrade/20-upgrade/`、`20-upgrade/40-rollback/` | 升级与回滚，各自的时间线、三个流、pool 滚动的观察，以及之后的单次请求 |
| `40-v060/00-install/`、`10-before/` | 按照 README 进行的 v0.6.0 安装，以及其上创建的四个 actor |
| `40-v060/20-direct-upgrade/` | 在 v0.6.0 集群上运行 v1.0.0 安装器，以及旧系统和新 CLI 在其之后的表现 |
| `40-v060/30-reinstall/` | 删除、三次部署、卡住的 CRD、镜像缓存错误，以及最终清空后的系统 |
| `40-v060/40-ax031/` | 全新 v0.6.0 上的 Agent Executor v0.3.1 发布版 |
| `30-scale/` | 未产生数据的突发运行环境准备 |

这些部分无效，摘要中未采用。在 `10-outages/30-k8s-run1/10-probe.tsv` 中，流 `suspended` 失败是因为前面运行留下的运行中 actor 填满了 pool。`10-outages/*/19-summary.txt` 统计了整段运行窗口。`10-outages/*/18-states-after-cleanup.txt` 重复了 `17-states-after.txt`，因为清理步骤未执行。在 `30-scale/` 中，集群的 Kubernetes API server 停止响应，突发没有记录到任何行。

### U-pg-upgrade-scale：集群外的 Postgres、一次升级与单节点上的突发

所有运行均在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上进行，基于单节点的新 kind 集群，使用发布镜像，采用 Envoy 数据平面与 gVisor。此前实验的集群在同一台客户机上处于空闲状态。每次安装、故障与升级步骤各运行一次。

| 文件 | 说明内容 |
|---|---|
| `10-extpg-install/steps.tsv`、`10-extpg-install/30-deploy-*.log` | 针对集群外 Postgres 的三次安装尝试 |
| `10-extpg-install/20-pg-setup-attempt2-no-transaction.log`、`10-extpg-install/20-pg-setup.log` | 不带与带单次事务的数据库脚本 |
| `10-extpg-install/29-deploy-diff.txt`、`41-ate-system-objects.txt`、`43-pg-connections-and-tables.txt`、`45-install-record.yaml` | 不同的设置、安装的对象、TLS 连接与安装记录 |
| `20-extpg-tests/10-lifecycle.txt`、`20-extpg-tests/11-cycles.tsv` | 创建、请求、两种挂起模式，以及 10 轮挂起与恢复循环 |
| `20-extpg-tests/30-timeline.tsv`、`33-probe.tsv`、`34-api-server-log.excerpt.txt` | 数据库停止 60.6 秒、每秒一个请求，以及 worker 缓存的日志行 |
| `30-upgrade-v0.6.0/` | 使用发布镜像安装 v0.6.0（报 404 失败），以及镜像仓库中持有的发布 tag |
| `30-upgrade-v1.0.0-rc.3/00-install-v1.0.0-rc.3/`、`10-before/` | 发布候选版的安装，以及升级前每种类型的一个 actor |
| `30-upgrade-v1.0.0-rc.3/20-upgrade/00-timeline-steps.tsv` | 每个升级步骤的开始、结束与秒数 |
| `30-upgrade-v1.0.0-rc.3/20-upgrade/02-cycle-stream.tsv`、`03-api-stream.tsv`、`05-running-stream.tsv` | 升级期间的三个流 |
| `30-upgrade-v1.0.0-rc.3/30-after/10-actors-after.txt` | 升级后对每个 actor 发送一次请求 |
| `30-upgrade-v1.0.0-rc.3/40-worker-roll-on-v1.0.0/` | pool 的第二次滚动，一个 actor 在收到 SIGTERM 时退出，另一个处理了该信号 |
| `40-scale/00-setup/` | 限制 250 pod 的单节点与 200 worker 的 pool |
| `40-scale/10-run/20-concurrency.tsv`、`40-scale/10-run/bursts/c*-r*.tsv` | 1 到 150 次并发恢复的突发（每个规模 3 次），以及每次突发的每个请求 |
| `40-scale/10-run/10-waves.tsv`、`40-scale/10-run/30-rows.tsv`、`31-resume-with-rows.tsv` | 150 个新 actor 的三波请求，以及在 1,750 到 10,750 个 actor 数据行下的恢复 |
| `40-scale/05-first-attempt-client-error/` | 突发因客户端设置失败的首次尝试。它留下了 300 个从未运行的 actor |

这些文件中的连接字符串显示 `<user>` 与 `<password>`。实验数据库的密码与 CA 密钥从未复制。`10-run/33-pg-tables-at-stop.txt` 仅包含我们自己的一次 SQL 错误。

### P-node-loss：停止并保持下线的 worker 节点

所有用例均在第二台 x86 服务器客户机（16 vCPU、23 GB）上运行，基于带有两个 worker 节点的集群，采用 Envoy 数据平面与默认 atelet 计时器。每个用例运行一次。pool `ballast` 在每个 worker 节点上有两个 worker pod。列 `t` 为从节点 `multi-worker2` 的 `docker stop` 命令算起的秒数。测试 actor 持有计数器与 50 MB，因此响应中的 `count` 能表明 actor 来自哪个快照。

| 文件 | 说明内容 |
|---|---|
| `00-run.log`、`01-atelet-args.txt`、`02-start.txt` | 运行顺序、atelet 参数，以及每次启动时的节点、pod 与 worker |
| `10-a-quiet-revert.tsv`、`11-a-actor.yaml` | 无请求的同步挂起 actor，以及 worker 不可用后的一次回退 |
| `74-second-revert.tsv`、`75-second-revert-actor.yaml` | 单个 actor 的五次回退：四次在节点下线期间，一次在其 atelet 恢复后 |
| `20-b60-requests-revert-loop.tsv`、`30-bevict-requests-revert-after-eviction.tsv` | 接收请求的挂起 actor，分为从 60 秒开始回退和驱逐后回退 |
| `40-balt-suspend-resume-delete.tsv` | 绑定在停止节点上的 actor 上的 `suspend`、`resume` 与 `delete` |
| `50-c-pending-snapshot.tsv`、`55-c-pending-snapshot-with-requests.tsv` | 带有 PENDING 快照的异步挂起 actor，分为静默回退和带请求回退 |
| `88-pending-snapshot-node-returns.tsv`、`89-v-actor.yaml`、`89-w-actor.yaml` | 节点恢复后的两个异步挂起 actor：一个不带回退发送请求，另一个先执行回退 |
| `60-d-running.tsv`、`61-d-actor.yaml` | 运行中 actor，在故障期间经历了回退、挂起与删除 |
| `80-tag-rescue.tsv`、`81-tags.txt`、`82-rescued-actor.yaml` | 停机前生成的标签、卡住 actor 上的打标签尝试，以及从标签创建的新 actor |
| `85-tag-rescue-running-and-pending.tsv`、`86-tags.txt` | 通过两个标签救援运行中 actor，其中一个标签在快照 PENDING 时生成 |
| `70-e-no-spare-then-scale.tsv`、`72-e2-survivor-full-then-scale.tsv` | 填满另一节点的两次尝试。两次都留有空余，因此回退成功 |
| `72-e2.FAILED-no-golden-tag.tsv`、`74-second-revert.FAILED-no-golden-tag.tsv`、`96-golden-tag-deleted.txt`、`97-tmpl-nb-*.yaml` | 因我们的清理删除了黄金标签而失败的两个用例、证据以及新模板 |
| `return-*.tsv` | 每次启动后的节点：何时 Ready、其 pool pod、其活跃 worker，以及新 actor 的放置位置 |
| `workers-*.txt` | 每个用例在关键时刻的 worker 列表 |
| `91-k8s-node-events.txt`、`92-control-plane-events.log`、`90-final.txt`、`95-final.txt` | Kubernetes 的节点事件、控制平面日志行以及最终状态 |
| `_scripts/` | 生成这些录制的脚本 |

在 `return-a.tsv` 中，计数器 `pool-pods-running-on-node` 与 `workers-active-on-node` 在第一个采样点后读数为 0，而新 actor 已放置到该节点。请参考该文件的 placement 列，不要看计数器。在 `return-pend.tsv` 与 `return-rev.tsv` 中，跟踪在节点启动后才开始，因此故障记录在用例文件中。

### Q-network：两种数据平面上的八项网络与限制检查

所有检查均在第二台 x86 服务器客户机（16 vCPU、23 GB）上，于单个 kind 节点的集群中进行。集群初始采用 agentgateway v1.7.0，随后在运行中就地切换到 Envoy 并切回两次。`P-node-loss` 的节点停止用例在同一时间运行在同一台客户机上，因此几毫秒的差异属于噪声。

| 目录 | 说明内容 |
|---|---|
| `00-dataplane-switch-to-envoy/`、`00-dataplane-switch-to-agentgateway/` | 两个方向上的第二次切换：安装器日志、秒数、pod，以及我们对 `atenet-egress` 手工修改的残留 |
| `g-dependency-loss-agw/` | agentgateway 上的 `E-dependency-loss` 三次故障，文件名相同 |
| `h-keepalive/<dataplane>/results.txt` | 单个连接上的 20 次请求，约 13 秒后规则被移除，分别针对 HTTP/1.1 和 HTTP/2 |
| `i-model-gateway/gw-tls.yaml`、`gw-plain.yaml`、`workloads.yaml`、`mock.py`、`Pgw.yaml` | 带有两个模拟后端的模型网关，以及 actor 的出站策略 |
| `i-model-gateway/20-results-*.txt`、`23-mock-*-received-*.log`、`24-marker-counts-*.txt` | 每个请求以及每个后端收到的内容。文件名含 `private-ca-trusted` 的文件在信任 patch 之后生成 |
| `i-model-gateway/31-latency-*.tsv`、`51-connection-cost-*.tsv` | 每个请求新建连接以及单连接复用下各路径的延迟 |
| `i-model-gateway/40-egress-agentgateway-config.yaml`、`41-egress-503-line.log`、`44-envoy-egress-503.excerpt.log` | 网关从哪里读取上游根证书，以及两种数据平面上 503 的日志行 |
| `i-model-gateway/43-trust-patch.json`、`43-trust-patch.log`、`45-trust-patch-envoy.log` | 为出站网关添加私有 CA 的 patch |
| `j-log-level/10-volume.tsv`、`log-*-marker-lines.txt`、`set-*.log` | agentgateway 出站日志在 `debug`、`info` 与 `warn` 级别下处理 100 个请求的行数与字节数 |
| `k-suspend-cutoff/<dataplane>/10-events.tsv`、`12-drip-server-after-suspend.log` | actor 保持开放响应时的挂起，以及上游何时发现连接中断 |
| `l-credential-rotation/<dataplane>/20-rotations.tsv`、`10-probe.tsv` | Kubernetes Secret 的三次变更，以及上游在每次请求中看到的值 |
| `m-router-ports/<dataplane>/` | router Service、容器端口、渲染出的监听器，以及从两个 pod 对每个端口的探测 |
| `n-cpu-limit/40-work.tsv`、`42-cgroup-after.txt`、`22-cgroup-*.txt`、`41-info-*.json` | 四种 CPU 限制下的固定工作量、节点上每个 actor 的 cgroup，以及程序在内部看到的情况 |
| `n-cpu-limit/10-burn.tsv` | 无效的首次测试。它根据沙箱内部读取的 CPU 时间来停止运行 |
| `_scripts/` | 生成这些录制的脚本 |

在 `m-router-ports/envoy/10-port-probes.tsv` 与 `11-port-probes-supplement.txt` 中，状态码为 `000` 的行上 `|` 之后的文本来自前一个请求的残留。对于这些行，请仅阅读状态码、退出码和错误信息。

本目录中的凭据值为我们虚构的测试值：`placeholder-from-actor`、`provider-key-for-backend-a`、`provider-key-for-backend-b`、`lab-gw-client-credential-...`、`lab-header-marker-123`、`lab-auth-marker-456` 与 `rot-value-...`。

### V-validation：初稿未能证明的十二项论述的验证

全部十二项验证均在 x86 服务器客户机上运行，位于实验 A 到 D 的集群中，采用可容纳 16 个单核 actor 的双 worker 池 `vpool`。

| 目录 | 说明内容 |
|---|---|
| `00-setup/` | 压舱 v3 actor（`ballast3-main.go`）与 pool |
| `01-compressible/10-compressible.tsv` | 针对 200 和 500 MiB 全零字节、半零半随机字节以及随机字节的快照大小、恢复与两种挂起模式 |
| `02-python-runtime/10-python.tsv`、`img/app.py`、`tmpl-pyagent.yaml` | 带有包含一百万个值字典的 Python 服务器：黄金快照构建、首次调用、恢复、挂起与快照大小 |
| `03-parallel-resume/20-parallel.tsv`、`24-summary.tsv` | 同时发起 1、2、4、8 与 16 次恢复，各进行五轮 |
| `03-parallel-resume/10-parallel-first-run-n16-n32.tsv`、`11-workers-before-32.txt` | 拥有 14 个空余位置的较早运行：同时 16 次、同时 32 次，以及同时 32 次并在等待中挂起 16 个 actor |
| `04-fidelity/10-fidelity.tsv`、`tmpl-fid-*.yaml` | 每种保真度各一个 actor，记录内存中、根文件系统上以及卷中的计数，附带子进程 |
| `05-golden-race/10-race.tsv` | 在模板的黄金快照就绪前创建 actor |
| `06-template-move/10-move.tsv` | 在运行中和挂起的 actor 上执行 `update actor --template` |
| `07-cross-namespace-pool/` | 位于无命名空间 atespace 的模板，绑定到另一命名空间的 pool 上，以及未匹配到任何 pool 的选择器 |
| `08-access-control/10-access.tsv`、`policy-viewer.yaml`、`15-policy-lab-v-editor.yaml` | 单个 ServiceAccount 无角色、作为 viewer 以及作为 editor，非令牌文本，以及受众错误的令牌 |
| `09-actor-jwt/24-jwt-decoded.txt`、`20-jwt-second-try.tsv`、`12-policy-live.yaml` | 单个 actor JWT 的头部与声明（不含签名），以及单个令牌在多次请求中的复用 |
| `09-actor-jwt/10-jwt.tsv`、`14-jwt-decoded.txt` | 主机名无法解析时的首次尝试 |
| `10-preview-feature/10-preview.tsv`、`tmpl-gep.yaml` | `GoldenEgressPolicy` 的服务端参数与客户端参数的四种组合 |
| `10-preview-feature/13-ateapi-lines.log` | 该次测试的 `ate-api-server` 日志，附带选择器未匹配到 pool 的模板的调谐错误 |
| `11-process-exit-long-watch/10-watch.tsv`、`11-workers-end.txt` | 进程退出的两个 actor，每 15 秒记录一次状态持续 20 分钟，随后挂起与回退 |
| `12-suspend-during-request/10-inflight.tsv` | 在持续 10 秒的请求进行到第 2 秒时挂起，包含两种模式 |
| `_scripts/` | 生成这些录制的脚本 |

JWT 文件仅包含解码后的声明。本目录中没有任何文件包含签名后的令牌。

### _scripts

生成录制的 shell 脚本。每个脚本在客户机内运行，`m2-install.sh` 与 `m3-actors.sh` 在 Mac 上运行。

## 摘要文件

除两幅图外，`lab/summary/*.json` 是手册各图表的输入数据。图 1.2b 读取 `B-lifecycle/10-trace.tsv`，图 6.6 读取 `G-dataplane/` 中的容器统计。`run.py` 不重新生成也不检查这两幅图的数字。每个文件包含 `machine` 和 `sources`。统计数据是一个形如 `{median, min, max, n}` 的对象，单位为秒。

| 文件 | 字段 |
|---|---|
| `resume-x86.json` | `node_local`、`object_store`、`object_store_default_timers`、`new_actor_first_call`、`warm_call`、`create_actor`、`detach_wait`。每个字段包含 `points`：`[{x, seconds, runs, failed}]`，其中 `x` 为持有的 MiB，`runs` 列出每次运行的秒数 |
| `resume-mac.json` | `node_local`、`new_actor_first_call`、`suspend_async`、`warm_call`，相同的 `points` 结构 |
| `suspend-x86.json` | `async`、`sync`，相同的 `points` 结构 |
| `footprint-x86.json` | `local_snapshot_per_actor`：`[{x, kib, mib}]`。`with_25_suspended_actors` 与 `after_delete`：`node_snapshots_mib`、`node_snapshot_cache_mib`、`object_store_mib` |
| `timers-x86.json` | `actors`：`[{actor, mib, suspended_at, uploaded_at, detached_at, seconds_to_upload, seconds_to_detach}]`。`node_local_snapshots`：`[{t, mib}]` |
| `failures-x86.json` | `idle_watch`：`{seconds, samples_after_last_request, states}`，仅统计观察开始到结束之间的样本。`lifecycle_ops`、`local_snapshot_loss`、`node_restart`、`death_inside_sandbox`：`[{t, case, event, fields}]` |
| `parking-x86.json` | `load_run`：`{requests, ok, shed_503, ok_average_seconds, ok_slowest_seconds, actors, workers, seconds}`。`parking_trace`。`full_pool_503`：`{seconds, body}` |
| `dependency-loss-x86.json` | `outages.postgres`、`outages.ate-api-server`、`outages.kube-apiserver`。每个字段包含 `outage_seconds`、`dependency_ready_t`、`summary.<stream>` 与 `per_second.<stream>`：`[{t, code, seconds, ok}]`。流包括 `running`、`suspended` 和 `proxy` |
| `dependency-loss-agw-x86.json` | 与 `dependency-loss-x86.json` 相同的字段，对应 agentgateway 上的运行 |
| `node-loss-x86.json` | `detection`：`workers_unavailable_t`、`pods_evicted_t`、`actor_crashed_t_while_down`，各包含 `{median, min, max, n, runs}`。`cases`：每个用例一个条目，包含 `probes`（`requests`、`ok`、`codes`、`actor_states`）、`commands`（`total`、`ok`、`errors`、`runs`）与 `served`。`tag_rescue`、`second_revert`、`node_return`（`before_eviction`、`after_eviction`、`runs`）以及 `golden_tag_deleted` |
| `node-drain-x86.json` | `cases`：五个 drain 用例各一个条目，包含 `drain_returned_seconds`、`requests_after_drain`、`failed_after_drain`、`actor_crashed_seen_t`、`revert`、`first_ok_seconds`、`calls_lost`、`probes`：`[{t, code, seconds}]` 与 `return`。`after_uncordon` |
| `full-node-x86.json` | `node_stopped_other_node_full`：包含 `revert`、`blocked_requests`、`resume_command_error`、`unblock`、`served_after_unblock` 的两次运行。`both_nodes_up_all_workers_full` |
| `object-store-x86.json` | `cycles`：`[{store, added_round_trip_ms, mib, suspend_sync_seconds, resume_from_store_seconds}]`，各包含 `{median, min, max, n, runs}`。`delay_check`。`store_unreachable.refused` 与 `store_unreachable.packets_dropped`。`not_recorded` |
| `external-postgres-x86.json` | `install`、`lifecycle`、`cycles`，以及包含 `summary.<stream>` 与 `per_second.<stream>`（`[{t, code, seconds}]`）的 `outage` |
| `remote-store-x86.json` | `path`：每个路径和限制一个条目，包含 `connect_ms` 与 `copy_300_mib_seconds`。`cycles`：`[{store, added_round_trip_ms, rate_mbit, mib, suspend_sync_seconds, first_answer_codes, first_answer_seconds, requests_until_200, seconds_to_first_200}]`。`bucket_unreachable.stopped` 与 `bucket_unreachable.packets_dropped` |
| `remote-postgres-x86.json` | `install`、`round_trip`、`lifecycle.<delay>`，包含 `summary.<stream>` 的 `outages.run_1` 与 `outages.run_2`，`stuck_actor_run_1`，`worker_cache_run_2` |
| `upgrade-x86.json` | `steps`：`[{step, begin_t, end_t, seconds, exit}]`。`suspend_resume_stream`、`list_actors_stream`、`running_actor`、`actors_after_upgrade`、`worker_roll_on_v1_0_0`、`release_tags_in_registry` |
| `scale-x86.json` | `bursts`：每个突发规模一个条目，包含 `runs`：`[{requests, ok, wall_seconds, per_second, median_seconds, max_seconds, request_seconds}]`。`single_resume_seconds`、`waves`、`rows`、`idle_worker_memory_mb` |
| `rotation-x86.json` | `dataplanes.agentgateway` 与 `dataplanes.envoy`。各自包含 `changes`：`[{change, seconds, requests_with_old_value}]`、`seconds`、`probe_requests`、`values_seen` 以及 `seconds_between_first_seen` |
| `cpu-limit-x86.json` | `points`：`[{x, threads, wall_seconds, host_cpu_seconds, host_cores_used, cpu_seconds_reported_inside, throttled_periods, runs}]`，其中 `x` 为以毫核为单位的限制。`seen_inside_the_actor`、`cgroup_cpu_max_of_actor`、`worker_pod_limits` 与 `superseded_first_test` |
| `network-x86.json` | `keepalive_after_rule_removal`、`suspend_cutoff`、`egress_log_level`、`model_gateway`、`router_ports`，各包含每个数据平面的一个条目，以及 `dataplane_switch`。`model_gateway` 的延迟以毫秒为单位 |
| `kagent-turns-x86.json` | `client_seconds.<series>`、`server_turn_seconds.<series>`、`resume_seconds.turns_only`、`resume_seconds.all`、`suspend_seconds` |
| `kagent-model-x86.json` | `models.<name>`：`size`、`tokens_per_second`、`tool_call`。`series.<name>`：`n`、`completed`、`clean`，以及以 `{median, min, max, n}` 呈现的 `wall_seconds`、`model_seconds`、`model_share`、`resume_seconds`、`suspend_seconds`。`runs.<name>`：每个轮次一个条目。`turn_that_did_not_end` |
| `agent-executor-followups-x86.json` | `clone`、`worker_loss.snapshot_pending`、`worker_loss.snapshot_durable`、`model_call`、`agent_image`、`release_v0_3_1` |
| `kagent-bound-x86.json` | `modelconfig_fields`、`settings`、`prompts`、`direct_requests_to_the_model`。`series.<name>`：`bound`、`prompt`、`n`、`completed`、`exit_codes`，以 `{median, min, max, n}` 呈现的 `wall_seconds`，以及每个轮次一个条目的 `runs`。`timeout_failure`、`unbounded_turn` |
| `agent-executor-second-x86.json` | `worker_loss_in_flight.snapshot_pending` 与 `snapshot_durable`、`skills`、`mcp`、`example`、`clone_second_run`、`agent_image_second_run` |
| `install-steps.json` | `source_build`、`release_images`、`release_images_mac`、`kagent`。各自包含 `machine` 与 `steps`：`[{step, exit, seconds}]` |
| `microvm-x86.json` | `node_local`、`new_actor_first_call`、`suspend_async`、`suspend_sync`、`warm_call`、`create_actor`，采用 `resume-x86.json` 的 `points` 结构。`local_snapshot_per_actor`：`[{x, kib, mib}]`。`resident_memory`：`microvm` 与 `gvisor_same_node`，各自为 `{process, kib, mib}` 列表 |
| `validation-memory-x86.json` | `actors`：六个模板各一个条目，包含 `fill`（`zero`、`mixed`、`rand`）、以 MiB 为单位的 `x`，以 `{kib, mib}` 呈现的 `node_snapshot` 与 `object_store_copy`，以及各自为 `{seconds, runs, failed}` 的 `resume_node`、`resume_after_sync`、`suspend_async`、`suspend_sync`、`new_actor_first_call`、`warm_call`。`python`：Python actor 的相同字段，附带 `template_to_golden_ready`、`peak_rss_mib`、`image_bytes` 以及在首次和末次请求时的进程存活时间 |
| `validation-parallel-x86.json` | `points`：`[{x, requests, ok, refused_503, seconds, p90, runs}]`，其中 `x` 为同一瞬间恢复的数量。`first_run.levels`：较早运行的相同内容，包含 `refused_seconds`、`refused_runs` 与 `refused_body`。`workers_before` 与 `first_run.workers_before`：pool 预订的和总共的毫核数 |
| `validation-fidelity-x86.json` | `levels`：每种保真度一个条目，包含 `after_last_resume`（`memory_count`、`rootfs_count`、`volume_count`、`process_age_s`）、`process_age_after_resume_s`、`node_snapshot`、`object_store_copy`，以及 `validation-memory-x86.json` 的计时字段 |

## 剔除的内容

`lab/REDACTIONS.txt` 列出了所有被遗漏、截取为摘录或修改的文件及原因。超过 200 KB 的文件保留为 `<name>.excerpt.log`。摘录中的每一行都是原始文件的完整一行。

## 在你的集群上重新录制

1. 使用 Agent Substrate 检出代码 v1.0.0 中的 `hack/create-kind-cluster.sh` 创建 kind 集群。
2. 按照手册第 2.1 节的说明使用 `ate-setup` 进行安装。
3. 从 `lab/_scripts/` 运行对应实验的脚本。脚本写入 `~/evidence/<folder>/`。
4. 将输出覆盖复制到 `lab/` 下的对应目录，然后运行 `python3 capture/run.py`。

你的耗时秒数会与我们的不同。状态、错误文本和事件顺序必须相同。
