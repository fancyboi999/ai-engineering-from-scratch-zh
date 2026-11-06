---
id: hypervisor-is-the-boundary
title: agent 拥有 sudo 和 Docker Engine，隔离墙究竟在何处
card: sandboxes
kind: concept
level: 1
roles: [agentic-ai-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [sandbox, microvm, isolation, docker-engine, boundary]
minutes: 6
lessons: []
manuals: [docker-sandboxes-101#s-sbx-diagnose-and-the-microvm-boundary, docker-sandboxes-101#s-sbx-mcp-add-load-and-static-mcp]
practice: []
cheatsheet: [docker-sandboxes]
related: [protocols/roots-are-not-a-sandbox]
updated: 2026-11-03
---

在 Docker 沙箱内部，agent 作为 uid 1000 用户运行，且属于 `sudo` 和 `docker` 用户组，执行 `docker version` 能够正常返回服务端信息。某队友据此断定该沙箱并不比以 root 身份直接运行的普通容器更安全。真正的隔离墙位于何处，agent 在墙内究竟拥有什么？

## Short answer

真正的隔离墙是客户机内核之下的虚拟机监视器（hypervisor）虚拟化分界线，而非虚拟机内部的用户身份。文档对此直接指出：agent 在虚拟机内部是非 root 用户但拥有 sudo 特权，真正隔离 agent 的是虚拟机监视器边界，虚拟机内部的特权分离并不构成安全隔离。在该分界线以下的一切均归 agent 所有，包括一个独立的私有 Docker Engine（其构建的镜像不会出现在宿主机的 `docker ps` 中），且宿主机完全不对沙箱开放任何宿主机 Docker API。

## Full answer

### 从内部审视的五层架构

`sbx diagnose` 指明了底层平台：`kern.hv_support is 1` 代表硬件辅助虚拟化，客户机直接运行在宿主机的虚拟机监视器上。从沙箱内部执行 `uname`、`id`、`docker version` 以及 `mount` 可以看到：运行在 `aarch64` 上、带有 16 KiB 内存分页的客户机内核（`getconf PAGESIZE` 输出 16384）、uid 为 1000 的 `agent` 用户、带有专属 containerd 的独立 Docker Engine 服务端，以及作为 `virtiofs` 挂载在与宿主机相同绝对路径上的工作空间。

官方文档列出了五层隔离体系：虚拟机监视器、网络隔离、独立 Docker Engine、工作空间隔离以及凭据隔离。虚拟机内部的 Docker 引擎完全属于 Agent 私有。它构建的镜像仅存留在虚拟机内部，Agent 无法触碰宿主机上的守护进程。宿主机同样未向沙箱暴露任何 Moby API，因此依赖该 API 的 REST 客户端无法工作，`sbx exec` 才是进出沙箱的标准途径。

### 穿透隔离墙的门径

清点客户机环境中跨越虚拟化分界线的各个通道：

| 穿透通道 | 客户机内部对应的具体表现 |
|---|---|
| mount（挂载） | `host on <workspace> type virtiofs (rw,...)`，外加对 `/etc/resolv.conf` 的只读绑定 |
| network（网络） | `HTTPS_PROXY` 指向 `gateway.docker.internal:3128` |
| secret（机密） | 模型服务商 API 密钥环境变量被设为哨兵占位值 `proxy-managed` |
| MCP | `MCP_GATEWAY_URL` 指向 `mcp-gateway.docker.internal/mcp` |
| SSH agent | `SSH_AUTH_SOCK=/run/ssh-agent.sock` 通过 `gateway.docker.internal:3129` 转发 |

每一扇门都是宿主机安全策略强制生效的锚点。Agent 在虚拟机内部使用 sudo 执行的任何操作都无法改变这些通道的存在形态。

### 队友说对的部分

在虚拟机内部，Agent 拥有文件系统、内部 Docker 引擎以及全部进程的完全控制权。假定内存页为 4 KiB 的构建会在该客户机上失败。虚拟机自身也有资源上限：内存默认分配宿主机的一半（限制在 512 MiB 到 32 GiB 之间），而 `--cpus 0` 意味着使用全部宿主机 CPU（在 Linux arm64 上上限为 16）。这本身不是权限控制，而是一项资源配额预算。

### 一项完全不处于墙内的特例

在宿主机上通过 `--command` 注册的 MCP 服务，是以宿主机当前用户的真实身份直接在宿主机上运行的，脱离了沙箱引擎边界与网络策略的管辖。唯有 Agent 在虚拟机内部拉起的 MCP 服务才会受到沙箱安全规则的约束。

## Follow-ups

- **Level 1:** Agent 执行了 `docker build`，而宿主机的 `docker ps` 一无所获，为什么？ Expected: 引擎与其镜像存储均位于虚拟机内部；宿主机守护进程是完全独立的另一套引擎。
- **Level 2:** 编译好的二进制工具在沙箱内崩溃并提示内存页大小错误，客户机有何特殊之处？ Expected: 客户机内核使用 16 KiB 内存分页（`getconf PAGESIZE` 输出 16384），`sbx diagnose` 会据此对比 `mkfs.erofs` 的块大小。
- **Level 2:** 列出宿主机内容进入虚拟机内部的所有通道路径。 Expected: 工作空间挂载、网络代理、机密凭据哨兵占位符、MCP 网关 URL 以及转发的 SSH agent。
- **Level 3:** 哪类已注册的 MCP 服务不受该隔离墙覆盖？ Expected: 使用 `--command` 注册的服务，它作为宿主机用户直接运行在宿主机上，且脱离网络策略管辖。

## Wrong answers

- "沙箱内部拥有 sudo 意味着拿到了我笔记本电脑的 root 权限。" 虚拟机内部的用户属于客户机用户；虚拟机监视器是真正的防御控制点，文档明确指出内部特权分离不是安全边界。
- "沙箱共享了我的本地 Docker 守护进程。" 每个沙箱均运行各自专属的 Docker Engine，宿主机不对虚拟机提供任何 Docker API。
- "既然不依赖 Docker Desktop 运行，它就不需要账户登录。" `sbx` 虽独立于 Desktop 运行，但仍强制要求登录认证否则拒绝创建沙箱；常见问答对此有详细说明。

## Taught in

[微虚拟机边界章节](../../../manuals/docker-sandboxes-101/sections/3-1-sbx-diagnose-and-the-microvm-boundary.md)从内部审视了客户机并指明了五扇通道之门，[MCP 章节](../../../manuals/docker-sandboxes-101/sections/3-6-sbx-mcp-add-load-and-static-mcp.md)展示了直接运行在宿主机上的那类服务。
