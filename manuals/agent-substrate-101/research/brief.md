# Agent Substrate 101：事实简报

本简报是编写各小节的依据。它说明了我们的结论、证明各结论的运行记录，以及后续将进行的运行。录制记录存放在 `capture/lab/` 中，`capture/README.md` 描述了每个目录。

## 固定版本

| 主题 | 版本 | 日期 |
|---|---|---|
| Agent Substrate | v1.0.0，提交 `b34fbee742906494b5eb4f1f36987176bf8770a4` | 发布于 2026-11-05 |
| kagent | v1.0.0，带有自己的 Substrate v1.0.0 发行版 | 发布于 2026-11-09 |
| agentgateway | v1.7.0 | |
| Kubernetes | 1.37.0，基于 kind v0.33.0 的 `kindest/node:v1.37.0` | |

事实已于 2026-11-12 核验。

## 测试环境

- 一台 x86 服务器上的三台 KVM 客户机，每台有自己的 kind 集群。第一台有 24 vCPU 和 47 GB，用于从源码构建的上游 Substrate。第二台有 16 vCPU 和 23 GB，用于从发布镜像安装。第三台有 16 vCPU 和 31 GB，用于 kagent。
- 一台运行 Docker Desktop 的 Apple 芯片笔记本电脑，为 Docker 分配了 10 CPU 和 8 GB。
- 除实验 L 的 microVM 运行外，每次运行的沙箱类别均为 gVisor。对象存储为集群内的 rustfs。kagent 背后的模型为模拟服务，在后续两次运行中采用了运行在 CPU 上的轻量开源模型。

## 判断与证明它们的运行记录

1. **Substrate 不会挂起空闲的 actor。** 我们让一个运行中的 actor 在没有请求的情况下保持 900 秒，每 15 秒采样一次状态。每个样本都是 `ACTOR_STATE_RUNNING`。调用方必须调用 `SuspendActor`。kagent 在每个轮次后都会这样做：98 个轮次中有 98 个以挂起收尾。运行记录：B-lifecycle、K-kagent。
2. **挂起默认是异步的，快照不会立即持久。** 异步挂起后，快照在节点上保持 `PENDING` 达 5 分钟，节点副本保留 30 分钟。若在该时间窗口内移除节点副本或重启节点，下一个请求会返回 500，且 actor 变为 `CRASHED`。执行 `RevertActor` 后，actor 从最后一个持久快照恢复，后续调用随之消失。运行记录：D-durability。
3. **Postgres 和 `ate-api-server` 在每条请求路径上。Kubernetes API server 不在任何一条上。** 将 Postgres 或 `ate-api-server` 缩容到零时，发往运行中 actor 的请求在几秒内失败。在 kube-apiserver 宕机 86 秒期间，发往运行中 actor 的每个请求与每次全新恢复都得到正常响应。运行记录：E-dependency-loss。
4. **恢复时间随 actor 持有的内存增长。** 在 x86 客户机上，从节点恢复在 0 MiB 时耗时 0.22 秒，200 MiB 时耗时 0.47 秒，500 MiB 时耗时 1.07 秒，1000 MiB 时耗时 2.16 秒。从对象存储恢复大约耗时两倍。运行记录：C-resume-vs-size、M-mac-arm64。
5. **agentgateway 是 Substrate 的一个数据平面选项，并且它会认证入站客户端。** 空闲时它占用 2 个容器和约 38 MB，而 Envoy 占用 5 个容器和约 91 MB。它把拦截 CA 私钥挂载到数据平面容器中，其出站网关在 debug 级别记录请求头。运行记录：G-dataplane。
6. **出站策略允许主机和端口，拦截 TLS，并替换凭据头。** 它不选择模型或工具。删除一条规则在几秒内阻止了新请求，而已打开的连接在 20 秒后仍然可用。运行记录：F-egress、K-kagent。
7. **死亡的进程不总是崩溃的 actor。** 沙箱内的进程退出时，actor 仍保持 `RUNNING`，所有请求返回 503，直到尝试挂起。内存击杀大约在 4 秒内被检测到。运行记录：J-container-death。
8. **从发布镜像安装。** 系统安装从发布镜像耗时 162 秒，从源码耗时 266 秒。源码路径需要 Docker buildx 插件并编译一个 Rust 模块，快速上手指南两者均未提及。运行记录：A-quickstart、G-dataplane、M-mac-arm64。

## 小节可引用的数字

| 事实 | 数值 | 出处 |
|---|---|---|
| 发往新 actor 的第一个请求，小型 actor | 0.36 秒 | B-lifecycle |
| 经过 `kubectl ate proxy` 的热请求 | 0.06 到 0.09 秒 | B-lifecycle |
| 异步挂起，小型 actor | 0.40 秒 | B-lifecycle |
| 同步挂起，1000 MiB | 中位数 6.4 秒 | C-resume-vs-size |
| Worker pod 删除到变为 `CRASHED` | 0.6 秒 | B-lifecycle |
| 满载池，到返回 503 的时间 | 5.06 秒 | I-capacity |
| 暂存负载运行 | 92 个请求中响应了 90 个 | I-capacity |
| 25 个已挂起 actor，节点快照 | 8.8 GB | C-resume-vs-size |
| 25 个已挂起 actor，对象存储 | 10.8 GB | C-resume-vs-size |
| kagent 轮次，恢复部分 | 中位数 0.38 秒，n=98 | K-kagent |
| kagent 轮次，挂起部分 | 中位数 0.14 秒，n=99 | K-kagent |
| Mac，小型 actor 的恢复 | 0.09 秒 | M-mac-arm64 |

每个数值代表一台机器和一个特定日期。`capture/lab/summary/` 保存了完整统计数据。

## 运行记录对我们最初理解的修正

- 我们最初阅读代码时，以为 agentgateway 数据平面接收未经证书认证的入站客户端。实际安装的集群拒绝了这类客户端。安装器始终添加一个静态 mTLS 组件。
- 我们最初预期 kagent 安装会创建三个默认 Harness 对象。在 v1.0.0 中，它一个都没有创建。
- 我们最初预期挂起和恢复在 arm64 上会失败。在 Apple 芯片上，我们的测试 actor 在 66 次请求中 66 次成功。

## 后续内容

这些运行计划在下一版中进行。在那之前，本版未对它们进行测量。

- GKE 上的 Substrate。该小节基于文档和代码编写。
- 搭配托管模型或 GPU 模型的 kagent，以及它的 codex、claude 和自带（bring-your-own）harness。
- 云端 bucket，或带有 100 毫秒真实延迟的链路。我们的 bucket 位于集群内、同一客户机集群外，以及同一服务器的第二台客户机上。
- 保留 actor 从 v0.6.0 升级、跨 schema 变更回滚、多节点大规模运行、并发超过 300 次恢复的突发负载，以及带恢复操作的 Kubernetes API 宕机二次测试。
- gVisor 恢复内部是什么机制将单个节点限制在每秒约 37 次恢复，以及为何约 700 次突发请求中有 1 次未得到应答。
- 内存超过 1000 MiB 的 actor，以及带有 init 系统或大型根文件系统的镜像。
- 为何节点重启后约一分钟内 worker 报告没有空间。
