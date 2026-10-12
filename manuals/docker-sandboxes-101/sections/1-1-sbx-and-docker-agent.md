# sbx 与 docker-agent

> 两个程序各管一件事：sbx 管 microVM、代理和密钥存储；docker-agent 管模型、工具与子 agent 之间的循环。

你希望编程 agent 操作仓库，却不想让它读取 SSH 密钥或随意访问主机。Docker 提供了两个命令行程序：`sbx` 与 `docker-agent`。装有 Docker Desktop 的 Mac 还有第三个名字 `docker agent`。本节说明三者的边界。

读完本节，你能指出沙箱运行中各部分的归属，选择启动路径，并区分同一台机器上的两个 agent 程序。

## sbx 管什么 {#s-sbx-and-docker-agent-what-sbx-owns}

**沙箱：** `sbx` 为一个 agent 创建的 microVM。原文说：“Every sandbox runs inside a lightweight microVM with its own Linux kernel” {{docs-sbx Isolation layers}}，即每个沙箱都有独立 Linux 内核和私有 Docker Engine。录制中，`m101-demo` 内运行 Ubuntu 26.04.1 上的 Linux 7.0.14，以及 Docker Engine 29.8.1（capture/out/04-guest.txt）。工作区使用与宿主相同的绝对路径；“containers started by the agent never appear in your host's `docker ps`” {{docs-sbx Develop and test locally}}，即 agent 启动的容器不会出现在宿主的 `docker ps` 中。

**sandboxd：** 所有本地 `sbx` 命令背后的宿主守护进程，通过 `$HOME/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/sandboxd.sock` 访问（capture/out/02-daemon-status.txt）。官方说明：“You don't need Docker Desktop or Docker Engine to use `sbx`” {{docs-sbx Install Docker Sandboxes}}，使用 `sbx` 无需 Docker Desktop 或 Docker Engine。但必须用 `sbx login` 登录 Docker，`sbx diagnose` 会显示 `Authentication — authenticated`（capture/out/02-diagnose.txt）。[冲突 C15](#s-ref-sources-and-the-conflicts-register) 解释了这两点为何同时成立。

守护进程也运行代理，其两种日志类别之一是 `proxy` {{help-sbx sbx daemon log-level set}}。官方说明：“All outbound TCP traffic from the sandbox routes through a proxy on your host” {{docs-sbx Architecture}}，沙箱所有出站 TCP 流量都经过宿主代理。macOS 上，`sbx secret set` 把各密钥存入系统钥匙串 {{docs-sbx Where secrets are stored}}。请求离开 VM 后，代理才把密钥加入请求，因此 VM 只能看到占位值 `proxy-managed`（capture/out/04-env.txt）。[代理](#s-sbx-policy-log-and-the-proxy) 与[密钥](#s-sbx-secret-set-import-and-set-custom) 两节分别详解，[图](#fig-1-1) 展示各自的归属。

```figure
id: fig-1-1
kind: layers
title: sbx 与 docker-agent 各管什么
claim: 从守护进程到客户机内核，各层归 sbx；客户机内的 docker-agent 程序、文件与循环归 docker-agent。
caption: 每列从宿主区域向下读，穿过表示 hypervisor 的虚线。内核与引擎来自 capture/out/04-guest.txt 和 04-env.txt 中的 m101-demo；docker-agent 一列来自 27-sandbox-run.txt 与 27-inside.txt 的运行记录。
```

```listing
title: sbx 的命令分组
source: capture/out/01-help-sbx.txt
lang: text
note: 每组仅保留本部分提到的命令；其余分组及 flags 均已截去。
---
$ sbx --help
Docker Sandboxes creates isolated sandbox environments for AI agents, powered by Docker.
…
Sandbox Commands:
…
  create      Create a sandbox for an agent
  exec        Execute a command inside a sandbox
…
  run         Run an agent in a sandbox
…
Management Commands:
  daemon      Manage sandboxd daemon
  diagnose    Diagnose common issues with your sbx installation
  mcp         Manage MCP servers
  policy      Manage sandbox policies
…
  secret      Manage stored secrets
…
```

## sbx 运行哪些 agent {#s-sbx-and-docker-agent-the-agents-sbx-runs}

`sbx run` 接受十一种 agent 名称：claude、codex、copilot、cursor、devin、docker-agent、droid、gemini、kiro、opencode 和 shell {{help-sbx sbx run}}。`sbx create` 只为其中八种提供子命令，没有 copilot、droid 和 kiro。这三种已迁移到公共 kit，自 v0.43.0 起“can be launched by name again” {{rel-sbx v0.43.0}}，即又能按名称启动。`sbx create docker-agent` 还接受别名 `cagent` {{help-sbx sbx create docker-agent}}。`shell` 提供“a Bash login shell inside a sandbox with no pre-installed agent binary” {{docs-sbx Shell}}，即没有预装 agent 程序的沙箱 Bash 登录 shell。[冲突 C9](#s-ref-sources-and-the-conflicts-register) 列出旧文章中较短的 agent 清单。

## docker-agent 管什么 {#s-sbx-and-docker-agent-what-docker-agent-owns}

**agent 文件：** 指定 agent、模型、工具集以及彼此规则的 YAML 文件。Docker Agent 是“an open-source framework for building teams of specialized AI agents” {{docs-agent Docker Agent}}，即构建专用 AI agent 团队的开源框架。`run` 命令驱动循环：调用模型，执行模型要求的工具调用，再委派给子 agent。[agent 循环课程](phases/14-agent-engineering/01-the-agent-loop) 解释这个循环，[第6部分](#p-6) 则用同一文件提供服务和分享。

`docker-agent` 程序本身不提供隔离。在宿主上，`shell` 工具集“in the user's environment” 执行命令，即使用用户的环境（capture/out/16-toolsets.txt）。

```listing
title: docker-agent 的命令分组
source: capture/out/01-help-docker-agent.txt
lang: text
note: 仅保留核心分组及四个高级命令。诊断分组、其余命令与 flags 已截去。
---
$ docker-agent --help
Docker AI Agent Runner.
…
Core Commands:
  getting-started Learn docker agent with a hands-on interactive tour
  run             Run an agent
  setup           Interactively set up a model (built-in provider, local, custom endpoint, or Claude Code)
  share           Share agents
…
Advanced Commands:
…
  eval            Run evaluations for an agent
…
  sandbox         Manage docker-agent sandbox settings
  serve           Start an agent as a server
  sessions        Inspect recorded sessions
…
```

## 两条启动路径 {#s-sbx-and-docker-agent-two-launch-paths}

`sbx run docker-agent ~/my-project` 从 sbx 启动。沙箱使用 `docker/sandbox-templates:docker-agent`，不传参数时执行 `docker-agent run --yolo` {{docs-sbx Docker Agent}}。它只能拿到工作区内的项目级配置。

`docker-agent run --sandbox agent.yaml` 从 agent 文件启动。这里的 `docker-agent` 会“orchestrates the installed `sbx` CLI” {{docs-agent Sandbox Mode}}，即协调已安装的 `sbx` CLI；`--template` 默认为 `docker/docker-agent-sbx-templates:latest` {{help-agent docker-agent run}}。两条路径使用两种镜像，[冲突 C61](#s-ref-sources-and-the-conflicts-register) 据此裁定。录制套件只录制了第二条路径，[下一节](#s-docker-agent-run-sandbox-end-to-end) 会跟踪它。

```figure
id: fig-1-2
kind: comparison
title: 在沙箱中启动 docker-agent 的两种方式
claim: 两条路径最终都在 microVM 中运行 docker-agent，但 sbx run 从模板镜像开始，docker-agent run --sandbox 从 agent 文件开始。
caption: 按行横向阅读。路径 A 来自 docs-sbx 中的 Docker Agent 文档页，没有录制；路径 B 来自 capture/out/27-sandbox-run.txt 与 27-inside.txt。
```

## 同一台机器上的两个 agent 程序 {#s-sbx-and-docker-agent-two-agent-binaries-on-one-machine}

Docker Desktop 4.94.0 把“Docker Agent v1.144.0” {{docs-desktop 4.94.0}} 作为 CLI 插件 `docker agent` 内置。Homebrew 则将 v1.149.0 安装为 `docker-agent`，文档说它“can be used as a standalone binary” {{docs-agent Docker Agent}}，可以作为独立程序使用。

```listing
title: 录制 Mac 上的两个 agent 程序
source: capture/out/29-docker-agent-plugin.txt
lang: text
note: 未截去任何内容。
---
$ docker agent version
docker agent version v1.144.0
Commit: 3873760f47ecf22f72f65bd776c056a337d6f35c
[exit 0]

$ docker-agent version
docker-agent version v1.149.0
Commit: Homebrew
[exit 0]
```

v1.149.0 输出的提示仍然写 `docker agent sandbox allow <host>`（capture/out/16-sandbox-list.txt），在这台 Mac 上却会运行 v1.144.0。本手册所有命令均写 `docker-agent`，固定为 v1.149.0，遵循[冲突 C48](#s-ref-sources-and-the-conflicts-register) 的裁定。沙箱模板内还运行第三个构建版本，[下一节](#s-docker-agent-run-sandbox-end-to-end) 会展示。

同一插件列表中有 `sandbox v0.13.0`，`docker sandbox` 只输出移除通知（capture/out/29-docker-sandbox.txt）。[迁移一节](#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent) 给出命令映射。列表还有 `ai v1.31.0`，它是 `docker ai` 背后的插件，文档称其为 Gordon：“Docker's built-in AI assistant” {{docs-agent Docker Agent}}，即 Docker 内置 AI 助手。Gordon 不在本手册范围内。

```takeaways
- 安装 `sbx`，用 `sbx login` 登录；不装 Docker Desktop 也能运行沙箱。
- 输入 `docker-agent`；按带有 `docker agent` 的提示操作前，先检查 `docker agent version`。
- 模板运行从 `sbx run docker-agent` 开始；自己的 agent 文件从 `docker-agent run --sandbox` 开始。
```

Sources: help-sbx sbx run, sbx create, sbx create docker-agent, sbx daemon log-level set (research/sources/help-sbx.md); help-agent docker-agent run (research/sources/help-docker-agent.md); docs-sbx Isolation layers, Develop and test locally, Install Docker Sandboxes, Architecture, Where secrets are stored, Shell, Docker Agent (research/sources/docs-sandboxes.md); docs-agent Docker Agent, Sandbox Mode (research/sources/docs-docker-agent.md); docs-desktop 4.94.0 (research/sources/docs-desktop-release-notes.md); rel-sbx v0.43.0 (research/sources/sbx-releases.md); research/conflicts-register.md rows C9, C15, C48, C61, C72; capture/out/01-help-sbx.txt, 01-help-docker-agent.txt, 02-daemon-status.txt, 02-diagnose.txt, 04-env.txt, 04-guest.txt, 16-sandbox-list.txt, 16-toolsets.txt, 27-sandbox-run.txt, 27-inside.txt, 29-docker-agent-plugin.txt, 29-docker-plugins.txt, 29-docker-sandbox.txt
