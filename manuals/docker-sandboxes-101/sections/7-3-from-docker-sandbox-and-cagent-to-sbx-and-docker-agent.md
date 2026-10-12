# 从 docker sandbox、cagent 到 sbx、docker-agent

> 两次改名与一次 CLI 重组改变了2025和2026年初材料的全部命令；本节逐项映射到当前形式。

2026-02-23 博客让你运行 `docker sandbox run claude`，代理指向 `host.docker.internal:3128`。2025-09-24 演讲展示 `cagent run agent.yaml` 和 `cagent push`。Docker Desktop 4.94.0、sbx 0.47.0、docker-agent 1.149.0 的机器上，这些旧命令已不存在。读完本节，你能将材料中的命令映射到当前形式，并指出改变它的版本。

## 两条产品线与三次移除 {#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent-two-tracks-and-three-removals}

沙箱产品经历四个阶段。计划时间线将基于容器的 `docker sandbox run` 定于 2025-11-06 的 Desktop 4.50.0；预览博客随后于 2025-11-25 发布 {{blog 2025-11-25}}。Desktop 4.58.0 在 2026-01-26 换为 microVM {{docs-desktop 4.58.0}}，4.61.0 在 2026-02-18 内置插件 v0.12.0 {{docs-desktop 4.61.0}}，本节引用其帮助。独立 `sbx` 首个公共 tag v0.21.0 在 2026-03-31 发布 {{rel-sbx v0.21.0}}。Desktop 4.80.0 在 2026-06-29 终止插件：

```rule
label: 移除说明
source: docs-desktop 4.80.0
---
"The experimental `docker sandbox` plugin has been removed. Migrate to `docker sbx`."
```

引文释义：实验性 docker sandbox 插件已移除；原说明让用户迁移到 docker sbx。下文核对这个名称是否实际存在。

任何帮助树都没有 `docker sbx`，程序名为 `sbx`（[冲突 C1](#s-ref-sources-and-the-conflicts-register)）。

agent 产品有三个名称。2025-09-18 博客以 cagent 发布 {{blog 2025-09-18}}，Desktop 4.49.0 在 2025-10-23 内置。4.49.0 的说明现在用现名写“Docker Agent is now available through Docker Desktop.” {{docs-desktop 4.49.0}}。文档说“In Docker Desktop versions 4.49 through 4.62, this feature was called cagent.” {{docs-agent Installation}}，这几版叫 cagent；`docker agent` 插件随 2026-02-16 的 v1.23.3 到来 {{rel-agent v1.23.3}}。

三天后 v1.23.4 重组命令，v1.30.0 在 2026-03-09 完成改名 {{rel-agent v1.30.0}}。文档说 Desktop 4.63 开始叫 Docker Agent，首个指名发布说明却是含 v1.27.1 的4.64.0（[冲突 C49](#s-ref-sources-and-the-conflicts-register)）。Desktop 4.81.0 在 2026-07-06 移除弃用 `cagent` 程序 {{docs-desktop 4.81.0}}。4.94.0 内置 v1.144.0 {{docs-desktop 4.94.0}}，比本手册固定 v1.149.0 落后五版。许多 Desktop 说明根本不写内置版本（[冲突 C50](#s-ref-sources-and-the-conflicts-register)）。

```figure
id: fig-7-3
kind: timeline
title: 2025-09 至 2026-10 的两条产品线
claim: 旧名在继任者出现后仍存续数月；Desktop 于2026-06-29和2026-07-06相隔一周移除两者。
caption: 同一日期轴从左到右读。灰条是旧名，蓝/紫条是现名，玫红线标三次移除。下方编号说明逐事件列版本。来源为 research/sources/docs-desktop-release-notes.md、sbx-releases.md 和 docker-agent-CHANGELOG.md。
```

## 旧命令树 {#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent-the-old-command-trees}

```listing
title: docker sandbox 插件 v0.12.0
source: research/sources/help-legacy-docker-sandbox.md
lang: text
note: 根帮助与代理 flags 于2026-10-08从 Desktop 4.61.0 内置插件录制。create、exec、save 部分已截去。
---
Management Commands:
  create      Create a sandbox for an agent
  network     Manage sandbox networking

Commands:
  exec        Execute a command inside a sandbox
  ls          List VMs
  reset       Reset all VM sandboxes and clean up state
  rm          Remove one or more sandboxes
  run         Run an agent in a sandbox
  save        Save a snapshot of the sandbox as a template
  stop        Stop one or more sandboxes without removing them
  version     Show sandbox version information
…
      --bypass-cidr string   Bypass MITM proxy for an IP range in CIDR
                             notation (can be specified multiple times)
      --bypass-host string   Bypass MITM proxy for a domain or IP (can be
                             specified multiple times)
…
      --policy allow|deny    Set the default policy
```

```listing
title: docker agent 插件 v1.32.4
source: research/sources/help-legacy-docker-agent.md
lang: text
note: 根帮助与三个 run flags，于2026-10-08录制。全局 flags 已指向 cagent 目录。
---
Core Commands:
  new         Create a new agent configuration
  run         Run an agent
  share       Share agents

Advanced Commands:
  alias       Manage aliases
  eval        Run evaluations for an agent
  serve       Start an agent as a server
…
      --sandbox                   Run the agent inside a Docker sandbox (requires Docker Desktop with sandbox support)
…
      --template string           Template image for the sandbox (passed to docker sandbox create -t)
…
      --yolo                      Automatically approve all tool calls without prompting
```

对比之下，`capture/out/01-help-sbx.txt` 的 v0.47.0 将 `policy`、`secret`、`template`、`mcp` 分在 Management Commands，`network` 与 `save` 已移除。`capture/out/01-help-docker-agent.txt` 的 v1.149.0 增加 `setup`、`doctor`、`models`、`toolsets`、`sessions`、`debug`、`sandbox` 与 `serve chat`，见[第5部分](#s-docker-agent-run-new-and-doctor)。

## 命令映射 {#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent-the-command-map}

| 旧命令或习惯 | 出处 | 失效版本/时间 | 现在怎么做 |
|---|---|---|---|
| `docker sandbox run <agent>` | Desktop 文档、博客、视频 | Desktop 4.80.0，2026-06-29 | `sbx run <agent>` |
| `docker sandbox run --mount-docker-socket kiro` | re:Invent 博客，2025-12-12 | Desktop 4.58.0，2026-01-26 | 无需替代：每个沙箱已有私有 Docker Engine |
| `--load-local-template` | Desktop 4.58至4.60 | Desktop 4.61，2026-02-18 | `sbx template load FILE`，再 `--pull never -t TAG` |
| 默认 `--pull-template missing` | 插件 v0.12.0 | v0.21.0，2026-03-31 | `--pull always`、`missing` 或 `never`，默认 `always` |
| `docker sandbox create cagent .` | 插件 v0.12.0、2026-03-11博客 | Desktop 4.80.0 | `sbx create docker-agent .`；`cagent` 仍是别名 |
| `docker sandbox network proxy S --allow-host api.example.com` | 旧文档、2026-02-23博客 | Desktop 4.80.0 | `sbx policy allow network api.example.com --sandbox S` |
| `--bypass-host`、`--bypass-cidr` | 插件 v0.12.0 | Desktop 4.80.0 | v0.47.0 帮助无替代，见 `capture/out/09-bypass-grep.txt` |
| `docker sandbox network log --json` | 旧文档 | Desktop 4.80.0 | `sbx policy log S --json` |
| `docker sandbox save S TAG` 存宿主 Docker | 插件 v0.12.0、2026-02-23博客 | Desktop 4.80.0 | `sbx template save S TAG -o FILE` 存沙箱运行时 |
| `docker sandbox exec -d` | 插件 v0.12.0 | sbx | `sbx exec -d` 为 "not supported" |
| 名称含 `_`、`+` 或 `.` | 插件 v0.12.0 | v0.43.0，2026-09-15 | 2至63字符，字母、数字、连字符、句点；`--cloud` 不允许句点 |
| 手动设代理 `host.docker.internal:3128` | 2026-02-23、2026-05-26博客 | sbx | 无需设置：守护进程设 `gateway.docker.internal:3128`，见 `capture/out/04-env.txt` |
| `~/.zshrc` 的 API key，再重启 Desktop | 2026-07前教程 | v0.35.0，2026-07-10 | `sbx secret set SERVICE` 或 `sbx secret import` |
| `sbx run claude --branch` | 2026-05-26博客、视频 | v0.31.0，2026-05-28 | `sbx run claude --clone` |
| kit v1 语法、`schemaVersion: "1"`、`network.allowedDomains` | 2026-08-03博客 | v2 于2026-09-09，v3 于2026-09-24 | `sbx kit` 用 v2 `spec.yaml`；v3 用带 `# syntax=docker/sandbox-kit:3` 的 `kit.yaml` |
| `sbx mcp catalog` | 0.45.0前文档 | v0.45.0，2026-09-21 | `sbx mcp add --url URL` |
| `sbx mcp enable github-official` | 产品页，2026-10-07 | 从未存在 | `sbx mcp add`，再 `--static-mcp` 或 `sbx mcp load` |
| `-p 3000:8080` 绑定 IPv4/IPv6 | v0.42.0前 | v0.42.0，2026-09-07 | 默认 tcp4，双栈写 `3000:8080/tcp` |
| 任意 registry 的 kit | v0.34.0前 | v0.34.0，2026-06-26 | 将前缀加入 `kit.allowedSources` |
| 相对 `--command ./helper` 密钥来源 | v0.46.0前文档 | v0.46.0，2026-09-28 | 使用沙箱可写挂载之外的绝对路径 |
| Windows 10 | 2026年初 | v0.35.0，2026-07-10 | Windows 11 加 Windows Hypervisor Platform |
| `host.docker.internal:8811` 的 Toolkit 网关，五步手动配置 | re:Invent 博客，2025-12-12 | v0.38.0，2026-08-06 | `sbx mcp add` 与 `sbx mcp load`；Toolkit 网关独立 |
| "one sandbox per workspace" | 2026-03-11博客 | sbx 默认名为 `<agent>-<workdir>` | 同目录第二沙箱用 `--name`，见 `capture/out/04-second-sandbox.txt` |
| `cagent run agent.yaml`、`cagent new`、`cagent exec` | 2025博客、演讲 | v1.23.4，2026-02-19及 Desktop 4.81.0 | `docker agent run`、`docker agent new`、`docker agent run --exec` |
| `cagent push`、`cagent pull`、`cagent acp`、`api`、`mcp`、`a2a` | 2025博客 | v1.23.4 | `docker agent share push` 和 `pull`；`docker agent serve acp`、`api`、`mcp`、`a2a` |
| `cagent config`、`feedback`、`build`、`catalog` | 2025至2026年初 | v1.23.4 | 已移除，catalog 是 Hub namespace `agentcatalog/*` |
| `cagent version`、`brew install cagent` | 2025-11-13博客 | v1.30.0及 Desktop 4.81.0 | `docker agent version`、`brew install docker-agent`、`winget install Docker.Agent` |
| "Docker Agent v2.x renamed the CLI" | 第三方教程 | 从未正确 | 最新 tag 为 v1.149.0 |
| `docs.docker.com/ai/cagent/` | 2026-03-11博客、旧链接 | v1.30.0 | `docs.docker.com/ai/docker-agent/` |
| `CAGENT_MODELS_GATEWAY`、`CAGENT_CONFIG_DIR`、`CAGENT_PPROF_ADDR` | 旧文档、issue | v1.30.0，仍接受 | `DOCKER_AGENT_MODELS_GATEWAY`、`DOCKER_AGENT_CONFIG_DIR`、`DOCKER_AGENT_PPROF_ADDR` |
| `docker/sandbox-templates:cagent` | 旧 agent 页 | 改名时 | `docker/sandbox-templates:docker-agent` |
| `docker cp` agent 程序进沙箱，再内部 `agent run dev-team.yaml` | 2026-03-11博客 | `docker-agent` 模板 | `sbx run docker-agent .` 或 `docker agent run --sandbox agent.yaml` |
| `--yolo` | 各处 | 仍接受 | `--safety autonomous`，`--yolo` 是别名 |
| eval judge 是付费 Anthropic 模型 | v1.32.4帮助 | v1.147.0，2026-10-05 | 默认 `openai/gpt-5.6-terra` 或任意 `provider/model` |
| `--sandbox` "requires Docker Desktop with sandbox support" | v1.32.4帮助 | sbx | `--sbx` 默认 true；Desktop 4.80.0后 `--sbx=false` 无目标 |
| GitHub Action 中 mcp-gateway v0.22.0 | action 默认值 | 仓库已到 v0.44.1 | 自行固定网关版本 |

各行重述过时建议 S1至S30 与插件 C107至C112，[来源一节](#s-ref-sources-and-the-conflicts-register) 完整列出。

## 哪些仍保留旧名 {#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent-what-kept-the-old-name}

改名没动目录。`docker-agent --help` 仍默认 `--data-dir` 为 `~/.cagent`、`--config-dir` 为 `~/.config/cagent`、`--cache-dir` 为 `~/Library/Caches/cagent` {{help-agent docker-agent}}。v1.32.4 插件相同，调试日志仍在 `~/.cagent/cagent.debug.log`（[冲突 C54](#s-ref-sources-and-the-conflicts-register)）。`CAGENT_*` 与 `DOCKER_AGENT_*` 都仍读取 {{rel-agent v1.30.0}}。

OCI 注解改为 `io.docker.agent.version`，保留旧名 {{rel-agent v1.23.3}}。Hub 镜像由 `docker/cagent` 改为 `docker/docker-agent`，镜像保留 `cagent` 符号链接 {{rel-agent v1.30.0}}。`sbx` 中 `cagent` 仍为 `docker-agent` create 子命令别名 {{help-sbx sbx create docker-agent}}。

沙箱状态没有迁移。插件的 reset 帮助说明，VM 状态在 `~/.docker/sandboxes/vm/`，镜像缓存在 `~/.docker/sandboxes/image-cache/`。`sbx` socket 与日志在 `~/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/`（capture/out/02-daemon-status.txt），没有页面说明迁移（[冲突 C17](#s-ref-sources-and-the-conflicts-register)）。未录制残留目录列表。

Desktop 4.94.0 的 `docker info` 仍列 `sandbox v0.13.0`（`29-docker-plugins.txt`），每个命令都输出移除通知：

```listing
title: Docker Desktop 4.94.0 上的 docker sandbox
source: capture/out/29-docker-sandbox.txt
lang: text
note: docker sandbox version 输出相同通知，已截去。
---
$ docker sandbox --help
"docker sandbox" is deprecated and has been removed.

Please migrate to Docker Sandboxes: https://www.docker.com/products/docker-sandboxes
[exit 1]
```

通知指向产品页，不是4.80.0说明中的 `docker sbx`。同宿主内置 `docker agent version` 输出 v1.144.0，Homebrew 的 `docker-agent version` 输出 v1.149.0（`29-docker-agent-plugin.txt`）。

```takeaways
- 跟随2025或2026年初文章前，把 `docker sandbox` 换为 `sbx`，`cagent` 换为 `docker agent`。
- 输入命令前，按版本列核对文章日期。
- Desktop 4.80.0后检查 `~/.docker/sandboxes/`，删除前复制备份，没有自动迁移。
- 保留 `~/.cagent` 与 `~/.config/cagent` 原位置，改名未动它们。
```

Sources: docs-desktop 4.49.0, 4.58.0, 4.61.0, 4.64.0, 4.80.0, 4.81.0, 4.94.0 (research/sources/docs-desktop-release-notes.md); rel-agent v1.23.3, v1.23.4, v1.30.0, v1.147.0 (research/sources/docker-agent-CHANGELOG.md); rel-sbx v0.21.0, v0.31.0, v0.35.0, v0.42.0, v0.43.0, v0.45.0 (research/sources/sbx-releases.md); docs-agent Installation (research/sources/docs-docker-agent.md); help-sbx sbx create docker-agent (research/sources/help-sbx.md); help-agent docker-agent (research/sources/help-docker-agent.md); research/sources/help-legacy-docker-sandbox.md; research/sources/help-legacy-docker-agent.md; blog 2025-09-18, 2025-11-25, and research/conflicts-register.md rows C1, C17, C49, C50, C54, C107 to C112, S1 to S30; research/plan.md (the timeline); capture/out/01-help-sbx.txt, 01-help-docker-agent.txt, 02-daemon-status.txt, 04-env.txt, 04-second-sandbox.txt, 09-bypass-grep.txt, 29-docker-sandbox.txt, 29-docker-plugins.txt, 29-docker-agent-plugin.txt
