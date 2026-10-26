# sandboxd、sbx diagnose 与 sbx reset

> 一个守护进程管理所有沙箱，其 socket 与日志位于同一状态目录；两个命令分别检查它和清空它。

`sbx ls` 卡住，或命令报 `ensure daemon: daemon exited unexpectedly`，你需要知道哪个进程响应、写到哪里，以及如何重置。本部分每个命令都通过 Unix socket 与宿主守护进程 `sandboxd` 通信。读完本节后，你能找到 socket 和日志，读懂 `sbx diagnose` 的十三项检查，并说出 `sbx reset` 删除什么。

## sandboxd {#s-sandboxd-diagnose-and-reset-sandboxd}

**sandboxd：** 所有本地 `sbx` 动词背后的宿主守护进程，由 `sbx daemon start`、`stop`、`restart`、`status` 和 `log-level set` 管理。设置命令{{help-sbx sbx settings}}，通过本地守护进程读取求值结果和管理覆盖值，必要时启动它。首次探测 `sbx settings list` 时，表格前打印 `Starting sandboxd daemon...`。`sbx daemon start -d` 后台运行；`--policy allow-all`、`balanced` 或 `deny-all` 同时初始化全局网络策略，见 [sbx policy init](#s-sbx-policy-init-allow-deny-and-check-network)。`sbx daemon log-level set TARGET LEVEL` 修改日志类别 `proxy`、`general` 或 `all`。

`sbx daemon status --json` 给出 socket 和日志位置，录制 Mac 上都在 `~/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/` 下；`$HOME` 是录制遮蔽标记。

```listing
title: 守护进程的监听与写入位置
source: capture/out/02-daemon-status.json
lang: json
note: 未截去任何内容。
---
{
  "status": "running",
  "socket": "$HOME/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/sandboxd.sock",
  "logs": "$HOME/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/daemon.log"
}
```

日志为 JSON lines，含 `time`、`level`、`msg`、`version`，还常有表示沙箱名称的 `runtime`；[生命周期一节](#s-sbx-run-create-stop-and-rm) 解读其中两行。自 v0.43.0 起，{{rel-sbx v0.43.0}}，守护进程验证 Unix socket 和 Windows 命名管道的连接用户；自 v0.46.0 起，{{docs-sbx release-notes}}，对已用状态目录启动第二个守护进程会报错，而非破坏正在运行的进程。

## 状态目录 {#s-sandboxd-diagnose-and-reset-the-state-directory}

**状态目录：** sandboxd 保存沙箱、镜像、策略和 socket 的目录树。macOS 为 `~/Library/Application Support/com.docker.sandboxes/`，Windows 为 `%LOCALAPPDATA%\DockerSandboxes`；Linux 状态{{docs-sbx Removing all state}}，分散在 `~/.local/state/sandboxes/`、`~/.cache/sandboxes/` 和 `~/.config/sandboxes/`。v0.29.0 加入 `SANDBOXES_STORAGE_ROOT` 覆盖项 {{rel-sbx v0.29.0}}；v0.31.0 将{{rel-sbx v0.31.0}}，把状态目录符号链接从 /tmp 移到 ~/.sbx/run/。守护进程在链接下绑定 containerd socket。无法绑定 socket 的 shell 捕获到的 `sbx kit builder history` 帮助页以{{help-sbx sbx kit builder history}} 结束。

另有两棵目录树：状态目录下 `sandboxes/agent-skills` 的共享 skills 存储 {{docs-sbx agent-skills}}，以及 `~/Library/Logs/com.docker.sandboxes/sandboxes/auditkit/` 下的审计日志，文件名规则为{{docs-sbx audit}}。2025 插件把 VM 存在 `~/.docker/sandboxes/vm/`，镜像存在 `~/.docker/sandboxes/image-cache/`，见[迁移一节](#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent)。[图](#fig-2-3) 展示 macOS 目录树，[设置表](#s-ref-settings-keys-environment-variables-and-paths) 列出三种系统的全部路径。

```figure
id: fig-2-3
kind: tree
title: macOS 上的 sandboxd 状态目录
claim: macOS 上 sandboxd 管理的内容都在一个 Application Support 目录下，审计日志在 Logs 下，~/.sbx/run 处有符号链接。
caption: 从上向下读。实线是包含关系，虚线是符号链接；灰色虚线框是 2025 插件的目录树，由 docker sandbox reset 删除。来源为 capture/out/02-daemon-status.json、research/sources/docs-sandboxes.md、help-sbx.md 和 sbx-releases.md。
```

## sbx diagnose {#s-sandboxd-diagnose-and-reset-sbx-diagnose}

`sbx diagnose` 分四组执行十三项检查，分别显示通过、warning 或失败。安装组检查程序、版本、守护进程与诊断包。平台组确认 `kern.hv_support is 1`，查找 `mkfs.erofs`、默认块大小及客户机内核页大小。存储组检查状态目录、权限与可用空间。连接组检查版本匹配、socket、SSH 客户端配置与登录状态。

页大小检查来自 v0.43.0 的改动：当{{rel-sbx v0.43.0}}，即默认块大小超过沙箱内核页大小时发出 warning。录制 Mac 的块大小为4096字节，客户机页大小16384字节，`m101-demo` 内的 `getconf PAGESIZE` 也确认了这一点。

```listing
title: 两项平台检查及汇总
source: capture/out/02-diagnose.json
lang: json
note: 仅保留 Virtualization、mkfs.erofs 检查与汇总。字节数遮蔽为 <n>。
---
{
  "version": "1.0",
  "checks": [
    …
    {
      "name": "Virtualization",
      "status": "pass",
      "message": "supported",
      "detail": "kern.hv_support is 1",
      "hint": ""
    },
    {
      "name": "mkfs.erofs",
      "status": "pass",
      "message": "found",
      "detail": "/opt/homebrew/Caskroom/sbx/0.47.0/Sbx.app/Contents/libexec/mkfs.erofs, default block size <n> bytes, guest kernel page size <n> bytes",
      "hint": ""
    },
    …
  ],
  "summary": {
    "pass": 13,
    "warn": 0,
    "fail": 0,
    "skip": 0
  }
}
```

`--json` 输出 `version`、含 `name`、`status`、`message`、`detail` 和 `hint` 的 `checks` 数组，以及带 `pass`、`warn`、`fail` 和 `skip` 计数的 `summary`。`-o github-issue` 将同一报告格式化为 bug 报告；`--upload` 将诊断包发给 Docker 支持。[sbx settings list](#s-sbx-settings-list) 中的 `diagnostics.autoUpload` 控制自动上传许可。

## sbx reset {#s-sandboxd-diagnose-and-reset-sbx-reset}

`sbx reset` 将安装恢复到全新状态；帮助列出步骤 {{help-sbx sbx reset}}：

- 停止运行中的沙箱，超时30秒
- 清空镜像缓存与内部 registry
- 删除所有沙箱状态与所有策略
- 移除受管理的 SSH 配置
- 清空 Gordon 助手的会话与历史记录 {{help-sbx sbx reset}}
- 删除已存储密钥，除非使用 `--preserve-secrets`
- 退出登录、停止守护进程，移除状态、缓存和配置目录

文档没说明 Gordon 在沙箱中的作用，所以本手册只引用该行，不作更多断言，见[冲突 C33](#s-ref-sources-and-the-conflicts-register)。文档在升级后建议此命令{{docs-sbx sbx reset}}，新版升级了本地数据库 schema，旧程序无法理解。`--preserve-secrets` 可保留密钥。最后手段是在 `sbx reset` 后手动删除状态目录。工作区仍留在原处：文档说移除沙箱时宿主工作区文件“remain on your host”，而 `sbx reset` 只列出状态、缓存和配置目录。帮助文本提到却不在帮助树中的命令，如 `sbx mount`，汇总于 [sbx settings list](#s-sbx-settings-list)。

```takeaways
- 先运行 `sbx daemon status --json`，打开其中指向的 `daemon.log`。
- 提交 issue 前读 `sbx diagnose --json`，附上 `-o github-issue` 输出。
- schema 升级后运行 `sbx reset --preserve-secrets`；所有沙箱和策略都将删除。
```

Sources: help-sbx sbx daemon, sbx daemon start, sbx daemon log-level set, sbx diagnose, sbx reset, sbx settings, sbx kit builder history (research/sources/help-sbx.md); rel-sbx v0.29.0, v0.31.0, v0.43.0 (research/sources/sbx-releases.md); docs-sbx release-notes, Removing all state, agent-skills, audit, usage (research/sources/docs-sandboxes.md); research/sources/probes/sbx-diagnose.txt, sbx-settings-list.txt; help-legacy-docker-sandbox.md (docker sandbox reset); conflict C33 (research/conflicts-register.md); capture/out/02-daemon-status.json, 02-daemon-status.txt, 02-diagnose.json, 02-diagnose.txt, 04-auto-stop.txt, 04-guest.txt
