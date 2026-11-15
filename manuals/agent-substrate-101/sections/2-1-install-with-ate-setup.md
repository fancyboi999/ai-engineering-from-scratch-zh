# 用 ate-setup 安装

> 从发布镜像安装：这条路径省去了镜像构建、Rust 编译，还绕开了上游快速入门未提及的一个失败。

你在一台干净的机器上照着快速入门操作。第三条命令跑了将近三分钟，随后 Docker 报错退出，提示一个你从未输入过的参数无效。我们第一次安装时就踩中了这个错误，你没必要重蹈覆辙。

读完本节，你能在 kind 集群上用发布镜像安装 Agent Substrate v1.0.0。你还能说出从源码构建需要什么，并修复我们遇到过的安装错误。

## 你需要什么 {#s-install-with-ate-setup-what-you-need}

- 装有 Docker 的 Linux 或 macOS。在 Apple 芯片上，我们用的是分配了 10 个 CPU 和 8 GB 内存的 Docker Desktop。
- Go 1.27。检出的代码指定工具链 `go1.27.3`，kind 由 Go 替你下载 {{code}}。
- `git` 和 `kubectl`。
- 约 13 GB 磁盘空间。这次安装完成后，我们的客户机连同操作系统一共占用 13 GB。

**安装器：** `ate-setup` 是检出代码中的 Go 程序，负责安装与移除 Agent Substrate。发布版不附带 `ate-setup` 二进制文件，因此你要在目标标签的检出目录里用 `go run` 运行它 {{docs}}。资源清单（manifest）也来自这份检出，所以务必检出你要安装的标签。

在 Linux 上，我们在安装前调高了两个 inotify 上限，因为单节点上运行的 pod 很多，占用的 watch 数量也多：

```bash
sudo sysctl -w fs.inotify.max_user_instances=8192 fs.inotify.max_user_watches=1048576
```

## 创建 kind 集群 {#s-install-with-ate-setup-create-the-kind-cluster}

克隆该标签，然后在仓库根目录运行集群脚本：

```bash
git clone --branch v1.0.0 https://github.com/agent-substrate/substrate.git
cd substrate
hack/create-kind-cluster.sh
```

这个脚本做的不止 `kind create cluster`。Substrate 需要三项普通 kind 集群没有的设置 {{code}}：

- 它在 `127.0.0.1:5001` 上启动一个名为 `kind-registry` 的本地镜像仓库。
- 它启用三个 Kubernetes 预览功能：`ClusterTrustBundle`、`ClusterTrustBundleProjection` 和 `PodCertificateRequest`。Substrate 通过它们给每个 pod 签发证书。
- 它会检查 `/dev/kvm`。有 KVM，节点就能运行 microVM 沙箱类别。没有 KVM，只能运行 gVisor。

脚本会先删除同名的已有 kind 集群，再创建新集群。默认集群名称是 `kind`。如果你已经有一个同名集群，请设置 `KIND_CLUSTER_NAME`。

## 用发布镜像安装控制平面 {#s-install-with-ate-setup-install-the-control-plane-from-the-release-images}

告诉 `ate-setup` 目标环境是 kind，然后部署：

```bash
export ATE_INSTALL_KIND=true
go run ./cmd/ate-setup deploy ate-system \
  --credential-provider='{"name":"k8s.io"}' \
  --ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client \
  --image-repo ghcr.io/agent-substrate/substrate --image-tag v1.0.0
```

每个参数都有其用意 {{docs}}：

- `ATE_INSTALL_KIND=true` 选择 kind 配置档，包含 kind 的 overlay、本地镜像仓库以及集群内的对象存储。每个运行 `ate-setup` 的 shell 都需要导出它。
- `--credential-provider` 必填。值 `{"name":"k8s.io"}` 部署读取 Kubernetes Secret 的内置凭据提供方。[第 6.5 节](#s-credential-injection)会用到它。
- `--ingress-allowed-spiffe-ids` 列出 router 放行的客户端。不填值，就没有客户端能访问任何 actor。这条命令里的身份，就是 `kubectl ate proxy` 出示的身份。
- `--image-repo` 和 `--image-tag` 用于安装已发布的镜像。两者必须同时传入。

安装器先打印每项设置，再为每个步骤打印一行。下面这些行表明镜像来自镜像仓库，且安装已经完成：

```listing
title: 用发布镜像安装
source: capture/lab/G-dataplane/00-install/20-deploy-ate-system-prebuilt.log
lang: text
note: 从第 142 行起的七行。设置表、密钥和其他 rollout 行已截去。
---
>> Downloading kata-static 4.3.1 (amd64)...
>> Downloading cloud-hypervisor v53.0 (cloud-hypervisor-static)...
…
[step]: images: pre-built from ghcr.io/agent-substrate/substrate, tag v1.0.0
…
[step]: Waiting for ATE system components to be ready...
  (rollout status deployment/ate-api-server took 0.005s)
…
  (rollout status daemonset/atelet took 0.003s)
  (rollout status deployment/k8s-credential-provider took 0.003s)
```

前两行显示了一次发布镜像也省不掉的下载。目录里首次安装时，安装器会从 GitHub 下载 microVM 类别的客户机文件，并保存在 `bin/microvm-assets` 下。同一目录里再次安装时，只要文件和版本戳都在，就会跳过下载 {{code}}。安装器文档说明 `--sandbox-classes=gvisor` 可用于仅安装 gVisor {{docs}}。我们在第二台 x86 服务器客户机（16 vCPU、23 GB）上，对一个三节点的 kind 集群带着该参数跑过一次安装，系统安装步骤用了 114 秒。

## 部署 counter 演示 {#s-install-with-ate-setup-deploy-the-counter-demo}

演示会为你创建一个 `WorkerPool`、一个模板和一个 atespace 供测试使用：

```bash
go run ./cmd/ate-setup deploy demo counter
```

这一步用 ko 构建两个镜像并推送到 `kind-registry`，即便走发布镜像路径也是如此。发布镜像不包含演示 {{docs}}。当 `counter` 模板的黄金快照就绪后，这一步结束。

## 实测结果 {#s-install-with-ate-setup-what-we-measured}

[图 2.1](#fig-2-1) 展示了两次 x86 安装的各个步骤。

```figure
id: fig-2-1
kind: chart
title: 发布镜像安装与源码安装的步骤
claim: 用发布镜像时，部署 ate-system 在一台客户机上用了 162 秒，而从源码安装在一台更大的客户机上先失败，之后用了 266 秒。
caption: 每根条代表一次安装中的一个步骤，横轴单位为秒。两次安装跑在两台配置不同的 x86 客户机上，所以每组要单独看。玫红色条代表失败的步骤。来源：capture/lab/summary/install-steps.json。
```

**我们测得**发布镜像安装在第二台 x86 服务器客户机（16 vCPU、23 GB）上跑了一次。kind 集群耗时 55 秒，`deploy ate-system` 耗时 162 秒，`deploy demo counter` 耗时 94 秒。完成后磁盘占用 13 GB。

**我们测得**源码构建在 x86 服务器客户机（24 vCPU、47 GB、嵌套 KVM）上跑了一次。第一次 `deploy ate-system` 在 163 秒后失败。安装好缺失的软件包之后，同一条命令用了 266 秒，演示用了 47 秒。完成后磁盘占用 18 GB。

**我们测得**发布镜像安装在 Docker Desktop 下的一台 Apple 芯片笔记本电脑上跑了一次。kind 集群耗时 119 秒，`deploy ate-system` 耗时 702 秒。日志里最长的一次等待是 178 秒，在等对象存储 pod 就绪。安装后 kind 节点占用 2.7 GiB 内存。

两次 x86 安装跑在不同配置的客户机上，因此 162 秒与 266 秒之间 104 秒的差距仅供参考，不是严格对照实验。不看数字也能说清的，是每条路径做了什么。发布镜像路径省去了镜像构建和 Rust 编译，下一小节的源码日志会展示这两步。笔记本是处于另一网络中的第三台机器，其秒数应与服务器客户机分开看。

## 从源码构建的代价 {#s-install-with-ate-setup-what-the-build-from-source-costs}

去掉 `--image-repo` 和 `--image-tag`，`ate-setup` 就会从检出代码构建每一个镜像。上游快速入门展示的就是这种做法。它把 Go、`kubectl` 和 Docker 列为你需要的工具 {{docs}}。在装着官方 Docker 软件包的 Ubuntu 24.04 上，这份清单少了一项：

```listing
title: 缺少 Docker buildx 插件时的源码安装
source: capture/lab/A-quickstart/20-deploy-ate-system.FAILED-no-buildx.log
lang: text
note: 两行之间的 docker 用法文本已截去。
---
unknown flag: --platform
…
Error: while building the envoy-dataplane image: exit status 125
```

Envoy 数据平面镜像由 Dockerfile 通过 `docker buildx` 构建，其余镜像则用 ko 构建。在 Ubuntu 上安装一个软件包就能解决：

```bash
sudo apt-get install -y docker-buildx
```

第二项代价是一次 Rust 编译。Envoy 镜像包含一个负责出站策略的 Rust 模块。构建时会克隆 Envoy 仓库并编译这个模块：

```listing
title: 源码构建中的 Rust 模块
source: capture/lab/A-quickstart/22-deploy-ate-system-retry.log
lang: text
note: 来自 Envoy 数据平面镜像构建的四行。约 90 行依赖输出已截去。
---
#11 0.323     Updating git repository `https://github.com/envoyproxy/envoy`
…
#11 53.04    Compiling proc-macro2 v1.0.107
…
#11 91.89     Finished `release` profile [optimized] target(s) in 1m 31s
…
#11 DONE 92.2s
```

这一个构建步骤就占了 266 秒里的 92 秒。构建缓存为空时，你还要再花一次这个时间。只有在需要修改 Substrate 本身时才从源码构建，其余情况请一律使用发布镜像。

## 之后切换数据平面 {#s-install-with-ate-setup-change-the-dataplane-later}

同一条命令可以把运行中的集群从 Envoy 切到 agentgateway。加一个参数再运行一次即可：

```bash
go run ./cmd/ate-setup deploy ate-system \
  --credential-provider='{"name":"k8s.io"}' \
  --ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client \
  --image-repo ghcr.io/agent-substrate/substrate --image-tag v1.0.0 \
  --atenet-dataplane=agentgateway
```

**我们测得**这次切换在第二台 x86 服务器客户机（16 vCPU、23 GB）上跑了一次。它耗时 32 秒，不需要重建集群。[第 6.6 节](#s-the-dataplane-choice)对比了这两种数据平面。

## 安装失败时 {#s-install-with-ate-setup-if-the-install-fails}

| 你看到的现象 | 原因 | 修复 |
|---|---|---|
| `unknown flag: --platform`，随后是 `exit status 125` | 从源码构建，但缺少 Docker buildx 插件 | 安装该插件，或改用发布镜像安装 |
| 安装器停止，并打印 `retry with: ate-setup deploy ate-system --config` 和一个文件路径 | 某个步骤失败，安装器保存了这次运行的配置 | 先修复原因，再运行打印出的命令。命令要以 `go run ./cmd/ate-setup` 开头，因为发布版没有 `ate-setup` 二进制文件 |
| `kubectl` 显示你不认识的 pod | kubeconfig 上下文不是你的 kind 集群 | 运行 `kubectl config use-context kind-kind`。如果用了自定义的 `KIND_CLUSTER_NAME`，上下文名称为 `kind-` 拼接该名称 |

最后一行是在笔记本电脑上碰到的。重启 Docker Desktop 之后，`kubectl` 指回了 Docker Desktop 自带的集群，我们的第一次测试就跑在了那里。

要彻底清理环境，删除集群和本地镜像仓库：

```bash
./hack/delete-kind-cluster.sh
```

v0.x 的旧指南使用的安装脚本已经不存在。[第 8.4 节](#s-upgrade-and-stale-advice)列出了发生了哪些变化。

```takeaways
- 运行 ate-setup 前先检出 v1.0.0 标签，因为资源清单来自这份检出。
- 同时传入 --image-repo 和 --image-tag，才会使用发布镜像安装。
- 在每个运行 ate-setup 的 shell 里导出 ATE_INSTALL_KIND=true。
- 从源码构建前，先安装 Docker buildx 插件。
- 测试前，把 kubectl 上下文固定为 kind-kind。
```

来源：capture/lab/L-gaps/multinode/02-steps.tsv, capture/lab/L-gaps/_scripts/g2a-multi-setup.sh, capture/lab/summary/install-steps.json, capture/lab/G-dataplane/00-install/steps.tsv, capture/lab/G-dataplane/00-install/20-deploy-ate-system-prebuilt.log, capture/lab/G-dataplane/00-install/60-state.log, capture/lab/G-dataplane/01-switch-in-place/11-timing.txt, capture/lab/A-quickstart/02-steps.tsv, capture/lab/A-quickstart/20-deploy-ate-system.FAILED-no-buildx.log, capture/lab/A-quickstart/21-install-buildx.log, capture/lab/A-quickstart/22-deploy-ate-system-retry.log, capture/lab/A-quickstart/30-deploy-counter.log, capture/lab/A-quickstart/60-state.log, capture/lab/M-mac-arm64/02-steps.tsv, capture/lab/M-mac-arm64/20-deploy-ate-system.log, capture/lab/M-mac-arm64/60-state.log, capture/lab/_scripts/a1-provision.sh, capture/lab/_scripts/a2-quickstart.sh, capture/lab/_scripts/a3-retry.sh, capture/lab/_scripts/g2-install-envoy.sh, capture/lab/_scripts/g6-switch-agw.sh, capture/lab/_scripts/m2-install.sh; docs/get-started/quickstart.md, cmd/ate-setup/README.md, cmd/ate-setup/commands.md, hack/create-kind-cluster.sh, and go.mod at v1.0.0.
