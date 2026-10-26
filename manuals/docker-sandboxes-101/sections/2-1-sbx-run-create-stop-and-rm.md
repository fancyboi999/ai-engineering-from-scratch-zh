# sbx run、sbx create、sbx stop 与 sbx rm

> `sbx run` 在沙箱不存在时创建并连接它；`sbx create` 只创建；`stop`、`rm` 和 `prune` 用三种不同方式结束沙箱。

仓库中有两个提交和一个 README，你想让 shell agent 只操作它，不接触其他文件。录制用 `sbx create shell $CAPTURE/fixtures/repo --name m101-demo` 完成此事，`$CAPTURE` 代表录制目录，本部分随后复用这个沙箱。读完本节后，你能选出创建、连接、停止、移除和清理沙箱的命令，并知道各自保留什么。

## agent 与工作区 {#s-sbx-run-create-stop-and-rm-the-agent-and-the-workspace}

**agent：** `sbx run` 和 `sbx create` 的第一个位置参数，原文为{{help-sbx sbx run}}，即内置 agent 名称或沙箱 kit 引用。内置名称为 claude、codex、copilot、cursor、devin、docker-agent、droid、gemini、kiro、opencode 和 shell。kit 引用可以是目录、ZIP 文件、git 仓库或 OCI 引用；相对路径{{help-sbx sbx run}}，必须明确写出路径。因此 `sbx run my-kit` 查找名为 `my-kit` 的 agent，`sbx run ./my-kit` 则读取 kit，[kit 描述文件](#s-syntax-docker-sandbox-kit-3-and-kit-yaml) 会详解。

**工作区：** agent 后面的目录，以相同绝对路径挂载进 microVM。`m101-demo` 内，`pwd` 输出 `$CAPTURE/fixtures/repo`，`mount` 将它列为 `virtiofs` 挂载。不传路径时，`sbx run` 挂载当前目录，而 `sbx create` 创建不带挂载的沙箱，此时{{help-sbx sbx create}}，agent 操作容器自身文件系统，而非你的文件。额外路径放在第一个路径后，`:ro` 表示只读挂载。只读参数可指定单个文件，{{help-sbx sbx run}}，让可写工作区中的这条路径不可写。

```listing
title: create 命令及其摘要
source: capture/out/04-create.txt
lang: text
note: 未截去任何内容。镜像层遮蔽为 <layers>。
---
$ sbx create shell $CAPTURE/fixtures/repo --name m101-demo

sandbox    m101-demo
agent      shell
workspace  $CAPTURE/fixtures/repo (rw)
image      docker/sandbox-templates:shell-docker
cpu        10
memory     32 GiB

Pulling image
  <layers>
✓ Image ready
✓ Created sandbox m101-demo

To connect to this sandbox, run:
  sbx run --name m101-demo
[exit 0]
```

```listing
title: 从内部看到的工作区
source: capture/out/04-workspace.txt
lang: text
note: 目录列表与 README 文本已截去。
---
$ sbx exec m101-demo sh -c 'pwd; echo; ls -la; echo; cat README.md; echo; git log --oneline'
$CAPTURE/fixtures/repo
…
c7dfd56 second
086df68 first
[exit 0]
```

## 名称与重新连接 {#s-sbx-run-create-stop-and-rm-names-and-re-attach}

**名称：** 后续命令中识别沙箱的键，默认是 `<agent>-<workdir>`，由 agent 名称和工作区目录名组成。规则原文为{{help-sbx sbx create}}：至少两字符，以字母或数字开头，仅含字母、数字、连字符和句点；`--cloud` 不接受句点，`default` 保留。自 v0.43.0 起，守护进程还拒绝{{rel-sbx v0.43.0}}，即超过63字符或以连字符、句点结尾的名称。2025 插件允许 `_` 与 `+`，[冲突 C25](#s-ref-sources-and-the-conflicts-register) 记录此变化。

两个沙箱可以共用工作区。录制在同一个 `fixtures/repo` 上创建 `m101-demo-2`，`sbx ls --json` 显示两者都在运行。2026-03-11 的博客说 Docker 强制一个工作区只有一个沙箱 {{blog 2026-03-11}}；2026-08-13 的演讲却在两个终端中对同一工作区运行 claude 和 codex {{talk 2026-08-13}}。[S27](#s-ref-sources-and-the-conflicts-register) 裁定由名称区分。

`sbx run` 的 `--name` 重新连接已有沙箱，此时{{help-sbx sbx run}}，agent 位置参数可省略，从已有 spec 读取。如果也给出 agent，`sbx run` 会与存储值核对。`sbx create` 在输出结尾打印重新连接命令。

```listing
title: 一个工作区上的两个沙箱
source: capture/out/04-second-sandbox.json
lang: json
note: 仅保留各记录的名称、状态与工作区。m101-demo 的端口在下一节讨论。
---
{
  "sandboxes": [
    {
      "name": "m101-demo",
      …
      "status": "running",
      …
      "workspaces": [
        "$CAPTURE/fixtures/repo"
      ],
      …
    },
    {
      "name": "m101-demo-2",
      …
      "status": "running",
      …
      "workspaces": [
        "$CAPTURE/fixtures/repo"
      ],
      …
    }
  ]
}
```

## 创建时固定的设置 {#s-sbx-run-create-stop-and-rm-what-is-fixed-at-creation}

有些 flags 每次连接都生效，多数只在创建时生效。重新连接时换 `-p` 或 `--skills` 不会改变设置，帮助文本逐项说明了这一点。

| Flag | 生效时间 | 帮助页 |
|---|---|---|
| `-e KEY=VALUE`、`--env-file FILE` | 每次连接的 agent 会话；本次创建沙箱时也会存入沙箱 | `sbx run` |
| `--cpus N`、`-m SIZE` | 创建时；内存默认宿主的一半，限制在 512 MiB 至 32 GiB | `sbx create` |
| `-p PORT`、`--deny-network HOST` | 创建时；重新连接会忽略 `-p` | `sbx run` |
| `--skills MODE`、`--static-mcp NAMES`、`--profile NAME` | 仅创建时 | `sbx run` |
| `-t IMAGE`、`--pull POLICY` | 创建时；`--pull` 为 `always`、`missing` 或 `never`，默认 `always` | `sbx run` |
| `-d` | 输出沙箱 id 后退出，不创建会话 | `sbx run` |
| `--rm` | agent 会话退出后移除沙箱，v0.47.0 新增 | `sbx run` |

录制 Mac 给 `m101-demo` 分配 `cpu 10` 和 `memory 32 GiB`，达到内存上限。`--rm` {{rel-sbx v0.47.0}}，不能与分离运行同时使用，因为分离运行没有会话可结束。

## stop、rm 与 prune {#s-sbx-run-create-stop-and-rm-stop-rm-and-prune}

`sbx stop` 保留沙箱，结束其 microVM。录制输出 `state preserved` 及重启命令。文档列出持久内容{{docs-sbx usage}}，即安装包、Docker 镜像、配置变更、命令历史与无挂载工作区文件都跨停止和重启保留。守护进程也会自行停止沙箱。录制关闭最后一个会话并等待后，`sbx ls` 显示 `m101-demo` 为 `stopped`，`daemon.log` 给出原因。

```listing
title: 守护进程停止空闲沙箱
source: capture/out/04-auto-stop.txt
lang: text
note: 仅保留日志查询及两行结果。时间戳遮蔽为 <ts>。
---
$ grep auto-stop daemon.log | grep m101-demo | tail -2
{"time":"<ts>","level":"INFO","msg":"auto-stop grace period expired, stopping runtime","version":"v0.47.0 0411f50ee4700fe7bd37e6e7e3aced563e850ca9","runtime":"m101-demo"}
{"time":"<ts>","level":"INFO","msg":"auto-stopped runtime after last session disconnected","version":"v0.47.0 0411f50ee4700fe7bd37e6e7e3aced563e850ca9","runtime":"m101-demo"}
```

对已有沙箱执行 `sbx run -d` 会{{docs-sbx release-notes}}，让它在会话断开后持续运行，直到手动停止或移除。kit 可声明 `com.docker.sandbox/long-running@1` 达到相同效果，见[能力一节](#s-com-docker-sandbox-capabilities)。

`sbx rm` 与 stop 相反。本地沙箱会{{help-sbx sbx rm}}：停止沙箱、移除容器、清理 Git worktree、删除状态及各沙箱作用域内的密钥。`--force` 跳过提示，连有 SSH 连接的沙箱也移除；`--all` 移除所有本地沙箱。

`sbx prune` 只移除已停止的沙箱，因为{{help-sbx sbx prune}}，绝不移除运行中的沙箱。`--filter until=168h` 保留最近一周内停止的沙箱；守护进程无法报告停止时间的沙箱也不处理。执行前用 `--dry-run --json` 查看两组对象。

```listing
title: 停止一个沙箱后的试运行
source: capture/out/04-prune-dry-run.json
lang: json
note: 未截去任何内容。m101-demo 此时仍在运行。
---
{
  "would_remove": [
    {
      "name": "m101-demo-2",
      "agent": "shell",
      "stopped_at": "<ts>",
      "workspaces": [
        "$CAPTURE/fixtures/repo"
      ]
    }
  ],
  "skipped_unknown_stop": []
}
```

```listing
title: 结束本部分的 prune
source: capture/out/04-prune.txt
lang: text
note: prune 之前停止 m101-demo 的操作已截去。
---
$ sbx prune --force
Deleting sandbox m101-demo...
Sandbox 'm101-demo' removed
Deleting sandbox m101-demo-2...
Sandbox 'm101-demo-2' removed
[exit 0]

$ sbx ls --json
{
  "sandboxes": []
}
[exit 0]
```

`rm` 与 `prune` 都会删除沙箱作用域内的密钥，见 [sbx secret](#s-sbx-secret-set-import-and-set-custom)。[图](#fig-2-1) 把这些命令放在同一状态机的边上。

```figure
id: fig-2-1
kind: state
title: 本地沙箱的四种状态
claim: 沙箱处于不存在、运行、停止或已移除状态，本节每个 sbx 动词都使它沿一条边迁移。
caption: 从左到右读。琥珀色虚线箭头表示状态变化，名称来自录制中的两个沙箱，虚线框内没有运行的 microVM。来源为 capture/out/04-create.txt、04-stop.txt、04-auto-stop.txt 和 04-prune.txt。
```

```takeaways
- 用 `--name` 为每个沙箱命名，以区分同一目录上的两个 agent。
- 创建时设置内存、端口、skills 与静态 MCP 服务器；重新连接会忽略它们。
- `sbx stop` 保留状态，`sbx rm` 删除状态；先运行 `sbx prune --dry-run`。
```

Sources: help-sbx sbx run, sbx create, sbx stop, sbx rm, sbx prune (research/sources/help-sbx.md); rel-sbx v0.43.0 and v0.47.0 (research/sources/sbx-releases.md); docs-sbx usage and release-notes (research/sources/docs-sandboxes.md); conflicts C25, S27 (research/conflicts-register.md); capture/out/04-create.txt, 04-workspace.txt, 04-guest.txt, 04-ls.json, 04-second-sandbox.txt, 04-second-sandbox.json, 04-stop.txt, 04-auto-stop.txt, 04-prune-dry-run.json, 04-prune.txt
