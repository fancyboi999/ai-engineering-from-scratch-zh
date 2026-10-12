# sbx diagnose 与 microVM 边界

> agent 以容器运行在客户机内核中，客户机位于宿主 hypervisor 上，拥有私有 Docker Engine；它的操作无法触及宿主守护进程。

你在仓库上启动 `sbx run claude`，agent 在内部执行 `docker build`。宿主的 `docker ps` 没有新内容，你想知道镜像去了哪里，以及 agent 还能访问什么。先运行 `sbx diagnose`，它列出 agent 与机器之间的每一层。

读完本节，你能解读 `sbx diagnose`，指出 agent 与宿主之间的五层隔离及穿越它们的入口。

## sbx diagnose 检查什么 {#s-sbx-diagnose-and-the-microvm-boundary-what-sbx-diagnose-checks}

**sbx diagnose：** 只读检查安装、平台、存储及守护进程连接，支持 `--output json|github-issue` 和 `--upload` {{help-sbx sbx diagnose}}。录制 Mac 执行13项检查，全部通过：

```listing
title: sbx diagnose 的平台与连接分组
source: capture/out/02-diagnose.txt
lang: text
note: Installation 与 Storage 分组已截去。录制套件将字节与块大小遮蔽为 <n>。
---
  Platform
  ✓ Virtualization — supported
      kern.hv_support is 1
  ✓ mkfs.erofs — found
      /opt/homebrew/Caskroom/sbx/0.47.0/Sbx.app/Contents/libexec/mkfs.erofs, default block size <n> bytes, guest kernel page size <n> bytes
…
  Connection
  ✓ Version match — v0.47.0
  ✓ Socket — responsive
  ✓ SSH client config — not configured
  ✓ Authentication — authenticated
…
  13 passed
```

`kern.hv_support is 1` 是 macOS 的硬件虚拟化标志。客户机运行于宿主 hypervisor：macOS 用 Hypervisor.framework，Windows 用 Windows Hypervisor Platform，Linux 用 KVM（[冲突 C3](#s-ref-sources-and-the-conflicts-register)）。`mkfs.erofs` 行给出客户机根文件系统格式与页大小，内部 `getconf PAGESIZE` 报告 `16384`（[冲突 C45](#s-ref-sources-and-the-conflicts-register)）。最后一行检查登录状态。`sbx` 无需 Docker Desktop，但没有 Docker 账户仍拒绝创建沙箱（[冲突 C15](#s-ref-sources-and-the-conflicts-register)）。

FAQ 给出 Docker 的理由：“Tie sandboxes to a real person”和“Authenticate against Docker infrastructure” {{docs-sbx FAQ}}，即关联真实用户并向 Docker 基础设施认证。它还列出产品自身的出站主机，从 `login.docker.com` 开始。

## 从内核向上的五层 {#s-sbx-diagnose-and-the-microvm-boundary-five-layers-from-the-kernel-up}

录制在 `m101-demo` 内执行 `uname`、`id`、`docker version` 和 `mount`：

```listing
title: 从 m101-demo 内看到的客户机
source: capture/out/04-guest.txt
lang: text
note: os-release 块、Docker 客户端块、df 输出及 /etc/hosts 已截去。
---
Linux m101-demo 7.0.14 #1 SMP PREEMPT Mon Sep 21 06:45:23 UTC 2026 aarch64 GNU/Linux
…
PRETTY_NAME="Ubuntu 26.04.1 LTS"
…
uid=1000(agent) gid=1000(agent) groups=1000(agent),27(sudo),1001(docker)
16384
…
Server: Docker Engine - Community
 Engine:
  Version:          29.8.1
…
 containerd:
  Version:          v2.3.5
…
bind-<id> on /etc/resolv.conf type virtiofs (ro,relatime)
host on $CAPTURE/fixtures/repo type virtiofs (rw,nosuid,nodev,relatime)
```

文档列出五层隔离：hypervisor、网络、Docker Engine、工作区与凭据 {{docs-sbx Isolation layers}}。listing 从内部展示四层。客户机在 Ubuntu 26.04.1 上运行 `aarch64` 的 `7.0.14` 内核，页大小16 KiB。假定4 KiB 页的构建会失败，一位 Docker Captain 在 2026-05-26 报告过此事 {{blog 2026-05-26 B16}}。agent 使用 `agent` 用户，uid 1000，属于 `sudo` 和 `docker` 组；文档把控制边界放在别处：

```rule
label: 隔离边界在哪里
source: docs-sbx Isolation layers
---
"The agent runs as a non-root user with sudo privileges inside the VM. The hypervisor boundary is the isolation control, not in-VM privilege separation."
```

引文释义：agent 在 VM 内以有 sudo 权限的非 root 用户运行。隔离控制点是 hypervisor 边界，不是 VM 内的权限分离。

listing 中的 Docker Engine 29.8.1、containerd v2.3.5 及 agent 构建的所有镜像都归 VM。文档一句话说明结果：“The agent has no path to your host Docker daemon.” {{docs-sbx Docker Engine isolation}}，agent 没有通往宿主 Docker 守护进程的路径。

宿主侧也没有沙箱 Docker API。Kevin Wittek 在 2026-04-23 说宿主不提供 Moby API {{talk 2026-04-23 T06}}。依赖它的 REST 客户端无法操作沙箱，入口是 `sbx exec`，见 [sbx exec、cp 与 ports](#s-sbx-exec-cp-and-ports)。

**VMM：** 启动客户机的虚拟机监控器。Docker 自行编写，并于 2026-08-10 在 Hacker News 说明它不是 Firecracker（[冲突 C4](#s-ref-sources-and-the-conflicts-register)）。基于 libkrun 的说法仍未验证。产品暴露的名称很少：`sandboxd` 是守护进程，`sbx daemon status` 输出其 socket；`containerd` 在客户机内运行，EROFS 出现在诊断行，virtiofs 出现在挂载表，`nerdbox` 出现在发布资产中。

## 穿越边界的入口 {#s-sbx-diagnose-and-the-microvm-boundary-the-doors-through-the-boundary}

Kevin Wittek 在 2026-09-04 列出四个入口：绑定挂载、网络、密钥注入和 MCP {{talk 2026-09-04 T02}}。录制在客户机各展示一行。工作区为 `host on $CAPTURE/fixtures/repo type virtiofs (rw,...)`，路径与宿主相同。`/etc/resolv.conf` 是宿主的另一个只读 virtiofs 绑定，因此使用宿主解析器。网络入口为环境中的 `HTTPS_PROXY=http://gateway.docker.internal:3128`（capture/out/04-env.txt）；密钥入口为哨兵值 `ANTHROPIC_API_KEY=proxy-managed`。

MCP 入口为 `MCP_GATEWAY_URL=http://mcp-gateway.docker.internal/mcp`。第五行 `SSH_AUTH_SOCK=/run/ssh-agent.sock` 与 `SSH_AUTH_SOCK_GATEWAY=gateway.docker.internal:3129` 表示转发的 SSH agent，这是演讲没提到的入口。文档默认开启转发 {{docs-sbx Credential isolation}}，[密钥一节](#s-sbx-secret-set-import-and-set-custom) 再讨论它。[图](#fig-3-1) 堆叠隔离层并画出入口。

VM 自身也有限制。`--memory` 默认宿主内存的50%，限制在512 MiB至32 GiB {{help-sbx sbx create}}。`--cpus 0` 表示全部宿主 CPU，Linux arm64 最多16个 {{help-sbx sbx create}}。录制 Mac 给 `m101-policy` 分配 `cpu 10` 和 `memory 32 GiB`（capture/out/09-create.txt）。

```figure
id: fig-3-1
kind: layers
title: m101-demo 的层与入口
claim: agent 位于客户机内核上的私有 Docker Engine 中；挂载、网络、密钥、MCP 和 SSH agent 五个入口跨过 hypervisor 边界。
caption: 从宿主行向下读。虚线代表 hypervisor，下方每个框都在 VM 内。右侧入口标出打开它的客户机环境行。来源为 capture/out/04-guest.txt 与 04-env.txt。
```

```takeaways
- 先运行 `sbx diagnose`，读 Virtualization、mkfs.erofs 和 Authentication 行。
- VM 边界才是控制点：agent 在内部有 sudo 和私有 Docker Engine。
- 预期16 KiB 页与独立镜像存储；内部构建不会出现在宿主。
- 打开沙箱前列出入口：挂载、网络、密钥、MCP 与 SSH agent。
```

Sources: help-sbx sbx diagnose, sbx create, sbx daemon start (research/sources/help-sbx.md); docs-sbx Security model, Isolation layers, Default security posture, Architecture, FAQ (research/sources/docs-sandboxes.md); research/conflicts-register.md rows C3, C4, C15, C45; talk T02 (2026-09-04), T06 (2026-04-23), blog B16 (2026-05-26), HN01 (2026-08-10) from research/plan.md; capture/out/02-diagnose.txt, 02-diagnose.json, 02-daemon-status.txt, 04-guest.txt, 04-env.txt, 09-create.txt
