---
id: template-or-kit-for-the-toolchain
title: 将耗时一小时的安装共享为模板还是工具包
card: sandboxes
kind: tradeoff
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [sandbox, template, kit, snapshot, secrets]
minutes: 8
lessons: []
manuals: [docker-sandboxes-101#s-sbx-template-save-and-load, docker-sandboxes-101#s-sbx-cloud-run-move-and-ttl]
practice: []
cheatsheet: [docker-sandboxes]
related: [sandboxes/sentinel-is-not-the-key]
updated: 2026-11-03
---

队友花了一个小时在沙箱内完成了一套工具链的安装，并希望明天大家都能直接基于该环境开展工作。一种方案是使用 `sbx template save` 保存为模板并导出 tar 包；另一种方案是编写一个声明式声明安装步骤的工具包（kit）。对比这两种方案，并指出模板携带着哪项工具包所没有的关键内容。

## Short answer

模板是作为镜像存储的容器文件系统快照，可通过 `sbx run --pull never -t TAG AGENT` 直接复用，并通过 `sbx template load` 导出为 OCI tar 包分发到其他机器；它快速且完全精确，但本质上是没人能做代码审查的二进制字节块。工具包则声明安装命令、文件、允许的主机和所需凭据，因此它是文本可读、支持数字签名且在每次创建时动态解析的，而模板完全不具备这些运行时安全设置。但模板确实完整包含了 Agent 在沙箱内部写入的每一个物理文件（包括任何落盘的密钥），这也正是敏感凭据必须存储在 `sbx secret` 中而不是直接留在保存沙箱内的核心原因。

## Full answer

### 模板所包含与排除的内容

外部挂载的文件系统不会包含在模板中：宿主机工作空间与沙箱内部 Docker 引擎的存储目录均被排除在外，因此保存的模板不是整个沙箱的完整备份。容器自身文件系统中的所有其他文件则全部被打包进去。agent 的配置文件（如 agent 的 settings 文件）在每次创建新沙箱时都会被系统重新生成覆盖，因此在沙箱内对其做出的修改同样无法存留。运行时安全设置、机密凭据和网络策略依然由工具包提供；模板仅仅提供镜像内部的文件内容。

### 容易踩坑的操作机制

执行 `sbx template save SANDBOX TAG` 要求沙箱必须先处于停止状态；实测在运行中直接执行该命令会报错打印 `cannot save a running sandbox`（无法保存运行中的沙箱）。镜像保存在沙箱运行时专属的镜像存储库中，与宿主机守护进程的镜像存储完全物理隔离，因此在宿主机上执行 `docker image inspect` 一无所获，唯有使用 `sbx template ls` 才能查阅。导出的 tar 包在 OCI 布局下包含 24 个目录项，在另一台机器上执行 `sbx template load FILE` 即可直接导入，全程无需任何外部镜像注册中心介入。在复用模板时务必明确指定该模板最初适配的 Agent 名称；将针对某 Agent 构建的模板交由另一 Agent 运行会触发警告并可能导致沙箱无法启动。

### 在 `sbx move` 中体现的相同权衡

将本地沙箱迁移至云端时，系统会将本地文件系统打包为模板镜像并上传。工具包网络规则与本地环境变量会随镜像一同迁移。而宿主机绑定挂载、凭据库中的密钥、本地策略规则、宿主机端口映射以及运行中的进程均会留在本地。通过交互式登录写入的凭据文件属于普通磁盘文件，因此除非在迁移前主动将其删除，否则它们会随镜像一同上传至云端。从云端迁回本地时，宿主机的临时目录可能会承载高达 32 GiB 的暂存数据。

### 决策权衡矩阵

| 业务诉求 | 推荐选型 |
|---|---|
| 团队今天内需要完全一致的物理环境 | 选用模板（template），前提是确保没有任何密钥落盘 |
| 需要同行审查、防篡改签名、动态版本解析与统一策略 | 选用工具包（kit） |
| 需要定义安全策略或注入凭据 | 选用工具包（kit），因为模板根本无法表达策略 |

## Follow-ups

- **Level 2:** 在运行中的沙箱上执行 `sbx template save` 报错失败，正确的操作顺序是什么？ Expected: 首先执行 `sbx stop`，随后通过带有 `--output` 的 save 命令导出 tar 包，最后使用带有相同 agent 参数的 `sbx run --pull never -t TAG AGENT` 复用。
- **Level 2:** 宿主机上的 `docker image ls` 未列出该模板，它存放在哪里？ Expected: 保存在沙箱运行时独立的专属镜像存储中，宿主机 Docker 守护进程无法共享该存储；应使用 `sbx template ls` 查阅。
- **Level 3:** Agent 在沙箱内部通过交互式流程登录了某服务，在执行 `sbx move` 或 `template save` 时该凭据会发生什么？ Expected: 它属于容器文件系统中的普通文件，除非在操作前主动删除，否则会随镜像一同被打包分发。
- **Level 3:** 同事希望获得与模板作者完全一致的放行主机列表，模板能提供给他们吗？ Expected: 不能；网络规则来自工具包或安全策略，而模板仅仅承载容器镜像的物理文件内容。

## Wrong answers

- "模板就是沙箱的完整备份。" 宿主机挂载的工作区以及内部 Docker 引擎的存储目录均被显式排除在外。
- "模板携带了放行的网络白名单。" 运行时设置由工具包承载；模板只承载文件系统字节。
- "环境变量显示为 `proxy-managed` 所以密钥是安全的。" 占位符环境变量本身是安全的；但 Agent 若将真实数值写入了磁盘文件，该文件就会被模板连带复制。

## Taught in

[模板章节](../../../manuals/docker-sandboxes-101/sections/2-3-sbx-template-save-and-load.md)记录了被拒绝的保存、独立存储与导出的 tar 包，[云端章节](../../../manuals/docker-sandboxes-101/sections/7-1-sbx-cloud-run-move-and-ttl.md)列出了 `sbx move` 所携带的内容。
