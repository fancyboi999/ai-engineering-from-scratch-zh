# 如何阅读本手册

> 从发布镜像在 kind 集群上安装 Agent Substrate，用一次请求唤醒一个 actor，再结合我们的实测数据逐一掌握各个部分。

本手册面向在 Kubernetes 上运行 agent、需要判断 Agent Substrate 是否适合自身的工程师。手册从一个能响应请求的集群讲起，一直讲到根据错误文本反查故障根因的对照表。

以下命令创建一个 kind 集群，从发布镜像安装 Agent Substrate v1.0.0，并创建一个 actor：

```bash
git clone --branch v1.0.0 https://github.com/agent-substrate/substrate.git
cd substrate
hack/create-kind-cluster.sh
export ATE_INSTALL_KIND=true
go run ./cmd/ate-setup deploy ate-system \
  --credential-provider='{"name":"k8s.io"}' \
  --ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client \
  --image-repo ghcr.io/agent-substrate/substrate --image-tag v1.0.0
go run ./cmd/ate-setup deploy demo counter
go install ./cmd/kubectl-ate
export PATH="$(go env GOPATH)/bin:$PATH"
kubectl ate create actor my-counter-1 -a ate-demo-counter --template counter
kubectl ate proxy actor my-counter-1 -a ate-demo-counter
```

最后一条命令留在前台运行并监听 8000 端口。打开第二个终端向该 actor 发送请求：

```bash
curl -X POST http://localhost:8000/
```

actor 返回当前计数值，每次新请求都会加一。[第 2.1 节](#s-install-with-ate-setup)逐步运行整套安装流程，列出预期输出与我们遇到的每处报错修复方法。[第 2.3 节](#s-your-first-actor-and-the-proxy)解释这个 actor 和代理的工作方式。

你需要 Go 1.27、Docker、`git` 和 `kubectl`。发布产物不包含 `ate-setup` 二进制文件，所以安装器需要在代码仓库中通过 `go run` 启动。发布产物提供了 `kubectl-ate` 二进制文件，[第 2.2 节](#s-kubectl-ate)演示如何在不安装 Go 的情况下直接使用它。

**我们测得**在另一台 x86 服务器客户机（16 vCPU、23 GB）上跑完这套安装一次：创建 kind 集群耗时 55 秒，`deploy ate-system` 耗时 162 秒，`deploy demo counter` 耗时 94 秒，全流程约五分钟。

**我们测得**在一台运行 Docker Desktop（分配 10 CPU 与 8 GB 内存）的 Apple silicon 笔记本上执行同一安装一次：创建 kind 集群耗时 119 秒，`deploy ate-system` 耗时 702 秒，gVisor 沙箱类别下的挂起与恢复工作正常。笔记本与服务器客户机是不同机器，不要横向比较两者的秒数。

首次安装不要从源码构建。不带 `--image-repo` 和 `--image-tag` 的命令会现场编译全部镜像，需要 Docker buildx 插件与 Rust 编译环境。在那台 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上，源码构建先失败了一次，重试耗时 266 秒。这台客户机与上面的机器也不同，秒数差异仅供参考。

## 读完本手册后你能做什么 {#s-front-what-you-can-do-after-this-manual}

- 从发布镜像在 kind 集群上安装 Agent Substrate，创建一个 actor 并向它发送请求。
- 根据 actor 持有的内存数据量预测恢复耗时，并在异步挂起与同步挂起之间做出选择。
- 为 `WorkerPool` 规划容量，并说明池满时客户端会看到什么响应。
- 编写出站策略、注入凭据，并在 Envoy 与 agentgateway 数据平面之间选型。
- 根据报错文本查明 500 或 503 的成因，并用 `RevertActor` 将崩溃的 actor 恢复上线。

## 本手册适合谁 {#s-front-who-this-manual-is-for}

你正在或计划在 Kubernetes 上运行 agent。你熟悉 pod、Service 与 `kubectl`。你还没用过 Agent Substrate，希望在把业务建立在它之上前弄清它的能力与代价。

Agent Substrate 官方文档描述每个对象和每个标志的用途，本手册则记录我们真实运行它们时发生的事。我们在自有集群上安装 v1.0.0，故意制造故障并测量耗时。只要实测结果与文档页面不符，我们都会明确指出并附上原始录制。

我们提出八条核心判断，每一条都来自实测运行，[第 1.1 节](#s-what-substrate-does-and-what-it-leaves-to-you)列出了各条判断及其背后的数字。第一条最关键：Substrate 不会自动挂起空闲的 actor，你必须自己运行程序来做这件事。

## 下一版将补充 {#s-front-coming-in-the-next-edition}

除一个集群外，我们的测试集群都是单节点 kind，第 1 部分和第 2 部分背后的每次运行都使用 gVisor 沙箱类别。集群外的对象存储运行在同一台客户机或同一台宿主机上的另一台客户机中。规模测试在单节点上进行，最多同时运行 300 个 worker 并触发 300 次并发恢复。下一版将补充 GKE、云端 bucket 以及多节点规模实测。

实测中唯一接入的真实模型是在 CPU 上运行的小型开源模型，挂在 kagent 和 Agent Executor 后端。因此本手册中的模型耗时都不是 GPU 或托管模型服务的耗时。托管模型与 GPU 上的实测已列入下一版计划。

凡受上述范围限制的章节都会当场注明。[本手册是如何写成的](#s-ref-how-this-manual-was-made)介绍测试机器与实验方法，[下一版将补充](#s-next-edition)列出全部计划补测项目。

## 各部分的编排顺序 {#s-front-how-the-parts-are-ordered}

第 1 部分用一页篇幅讲清 Substrate：它负责什么，以及一次请求如何从客户端到达 actor。第 2 部分完成安装并创建第一个 actor。第 3 部分深入 actor：模板、状态、挂起、恢复以及快照保留的内容。

第 4 部分讨论容量：worker 池、沙箱类别与池满行为。第 5 部分讲身份，第 6 部分讲入站与出站双向网络。第 7 部分接入 kagent 与 agentgateway，并说明何时不该选用 Substrate。第 8 部分覆盖集群运维与排障，参考部分汇总速查表：

```parts
```

每节末尾都有一组简短的行动要点。急需结论时先读要点，想查清原因时再读正文。

课程中有四节课深入展开了本手册应用的基础原理。[生产级运行时课程](phases/14-agent-engineering/29-production-runtimes)对比生产环境运行 agent 的不同架构。[持久化执行课程](phases/15-autonomous-systems/12-durable-execution)与[检查点与回滚课程](phases/15-autonomous-systems/16-checkpoints-rollback)从零推导挂起、恢复与回退背后的思想。[AI 网关课程](phases/17-infrastructure-and-production/19-ai-gateways)讲解模型前置网关。本手册则始终聚焦 Agent Substrate 本身。

## 图表配色约定 {#s-front-colour-in-figures}

每种色相在全部图表中固定代表同一类对象：

```palette
```

[图 0.1](#fig-0-1) 用实测录制中的真实交互演示箭头样式。实线箭头表示调用，同色虚线箭头表示回复。其余六种样式各自标识一类事件，箭头颜色与上表一致。

```figure
id: fig-0-1
kind: sequence
title: 如何阅读本手册的时序图
claim: 每种箭头样式对应一类交互，每个标签都是实测录制中的真实名称、消息或数值。
caption: 按编号从箭尾读向箭头，每个标签下方的注释说明该箭头样式。来源：capture/lab/B-lifecycle/10-trace.tsv、capture/lab/I-capacity/01-unplanned-full-pool-503.tsv、capture/lab/F-egress/envoy/20-results.txt、capture/lab/K-kagent/session1/egress-policy-actor.yaml。
```

来源：manual.json; capture/lab/summary/install-steps.json, capture/lab/G-dataplane/00-install/steps.tsv, capture/lab/M-mac-arm64/02-steps.tsv, capture/lab/A-quickstart/02-steps.tsv, capture/lab/A-quickstart/20-deploy-ate-system.FAILED-no-buildx.log, capture/lab/_scripts/g2-install-envoy.sh, capture/lab/_scripts/m2-install.sh, capture/lab/B-lifecycle/10-trace.tsv; docs/get-started/quickstart.md, cmd/ate-setup/README.md, and cmd/ate-setup/commands.md at v1.0.0.
